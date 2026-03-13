import asyncio
import threading
import contextlib
import collections
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import rclpy
from rclpy.executors import SingleThreadedExecutor
from subscriber import DataSubscriber
from contextlib import asynccontextmanager
import math
import racegpt as racegpt_module
from rosbag_api import router as rosbag_router

DEQUE_SIZE = 1000 # for snapshot

def sanitize_json(x):
    if isinstance(x, float):
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    if isinstance(x, dict):
        return {k: sanitize_json(v) for k, v in x.items()}
    if isinstance(x, list):
        return [sanitize_json(v) for v in x]
    if isinstance(x, tuple):
        return [sanitize_json(v) for v in x]
    return x

def ros_spin_loop(node: DataSubscriber, stop_evt: threading.Event, history: collections.deque, data_ready: threading.Event):
    ex = SingleThreadedExecutor()
    ex.add_node(node)
    last_stamp = None
    last_data_time = time.monotonic()
    DATA_TIMEOUT_SEC = 5.0
    warned = False
    try:
        i = 0
        while rclpy.ok() and not stop_evt.is_set():
            try:
                ex.spin_once(timeout_sec=0.1)
            except Exception as e:
                print(f"[ROS] ERROR: exception during spin: {e}", flush=True)
            i += 1
            if i % 50 == 0:
                print("[ROS] spinning...")

            data, stamp = node.get_latest()
            if data is None or stamp is None:
                if not warned and time.monotonic() - last_data_time > DATA_TIMEOUT_SEC:
                    print(f"[ROS] WARN: no data received for >{DATA_TIMEOUT_SEC}s", flush=True)
                    warned = True
                continue

            last_data_time = time.monotonic()
            warned = False

            if last_stamp is not None and stamp <= last_stamp:
                continue
            last_stamp = stamp

            history.append((data, stamp))
            data_ready.set()
    except Exception as e:
        print(f"[ROS] ERROR: exception in spin loop: {e}", flush=True)
    finally:
        ex.remove_node(node)
        print("[ROS] spin loop exited", flush=True)

# broadcasts new messages to all clients without re-collecting ROS message per client
# use a single producer to wait for next snapshot and then broadcast to all active sockets
async def broadcaster(app: FastAPI):
    seq = 0
    last_stamp = None

    while True:
        await asyncio.to_thread(app.state.data_ready.wait, 1.0)
        app.state.data_ready.clear()
        if not app.state.history:
            continue
        data, stamp = app.state.history[-1]

        # only send new data
        if last_stamp is not None and stamp <= last_stamp:
            continue
        last_stamp = stamp
        
        # also send ROS timestamp for debugging purposes
        payload = {"seq": seq, "data": data, "stamp_ns": stamp}
        payload = sanitize_json(payload)
        seq += 1

        dead = []
        for ws in list(app.state.clients):
            try:
                print(payload)
                await ws.send_json(payload)
            except WebSocketDisconnect:
                dead.append(ws)
            # treat all send failures as dead (optional)
            except Exception:
                dead.append(ws)
            
        for ws in dead:
            app.state.clients.discard(ws)

# need to run ROS and FastAPI concurrently; ROS doesn't block FastAPI's event loop               
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        rclpy.init()
        print("[ROS] rclpy initialized", flush=True)
    except Exception as e:
        print(f"[ROS] ERROR: failed to initialize rclpy: {e}", flush=True)
        raise

    topic = "spi_data"
    try:
        app.state.node = DataSubscriber(topic)
    except Exception as e:
        print(f"[ROS] ERROR: failed to create subscriber for '{topic}': {e}", flush=True)
        raise

    # create stop signal before starting ROS thread
    app.state.stop_evt = threading.Event()

    app.state.clients = set()

    # deque: history for snapshot; [-1] is latest for frontend
    app.state.history = collections.deque(maxlen=DEQUE_SIZE)
    app.state.data_ready = threading.Event()

    app.state.ros_thread = threading.Thread(
        target=ros_spin_loop,
        args=(app.state.node, app.state.stop_evt, app.state.history, app.state.data_ready),
        daemon=True
    )
    # start ROS thread
    app.state.ros_thread.start()

    app.state.broadcaster_task = asyncio.create_task(broadcaster(app))
    try:
        yield
    finally:
        app.state.stop_evt.set()
        app.state.ros_thread.join(timeout=5.0)

        app.state.broadcaster_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await app.state.broadcaster_task
        
        app.state.node.destroy_node()
        rclpy.shutdown()

app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rosbag_router)

@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Race Telemetry API", "status": "running"}

racegpt_lock = asyncio.Lock()

@app.post("/racegpt")
async def racegpt(data: dict):
    async with racegpt_lock:
        try:
            response = await asyncio.wait_for(
                racegpt_module.get_response(data),
                timeout=20
            )
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="RaceGPT device did not respond")

    return response

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    app.state.clients.add(websocket)
    
    try:
        # keep socket alive; data is pushed from broadcaster
        while True:
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        pass
    finally: 
        app.state.clients.discard(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
