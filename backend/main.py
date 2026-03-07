import asyncio
import threading
import contextlib
import collections
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import rclpy
from rclpy.executors import SingleThreadedExecutor
from subscriber import DataSubscriber
from contextlib import asynccontextmanager
import math
import racegpt as racegpt_module

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
    try:
        i = 0
        while rclpy.ok() and not stop_evt.is_set():
            ex.spin_once(timeout_sec=0.1)
            i += 1
            if i % 50 == 0:
                print("[ROS] spinning, waiting for data on spi_data...", flush=True)

            data, stamp = node.get_latest()
            if data is None or stamp is None:
                continue

            if last_stamp is not None and stamp <= last_stamp:
                continue
            last_stamp = stamp

            entry = (data, stamp)
            print(entry)
            history.append(entry)
            data_ready.set()
    finally:
        ex.remove_node(node)

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
    rclpy.init()

    topic = "spi_data"
    app.state.node = DataSubscriber(topic)

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

@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Race Telemetry API", "status": "running"}

racegpt_lock = asyncio.Lock()

@app.post("/racegpt")
async def racegpt(data: dict = Body(...)):
    async with racegpt_lock:
        await asyncio.to_thread(racegpt_module.send_serial_data, data)
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(racegpt_module.receive_serial_data),
                timeout=5.0,  # adjust as needed
            )
        except asyncio.TimeoutError:
            response = None

    if response is None:
        raise HTTPException(status_code=504, detail="RaceGPT device did not respond")
    return {"message": "Hello from RaceGPT!", "data": response}

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
