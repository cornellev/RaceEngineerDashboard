import asyncio
import threading
import queue
import contextlib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import rclpy
from rclpy.executors import SingleThreadedExecutor
from subscriber import DataSubscriber
from contextlib import asynccontextmanager
import math

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

def ros_spin_loop(node: DataSubscriber, stop_evt: threading.Event, q: queue.Queue):
    ex = SingleThreadedExecutor()
    ex.add_node(node)
    last_stamp = None
    try:
        i = 0
        while rclpy.ok() and not stop_evt.is_set():
            ex.spin_once(timeout_sec=0.1)
            i += 1
            if i % 50 == 0:
                print("[ROS] spinning...")

            data, stamp = node.get_latest()
            if data is None or stamp is None:
                continue

            if last_stamp is not None and stamp <= last_stamp:
                continue
            last_stamp = stamp

            # keep only the newest message (avoid unbounded queue growth)
            try:
                q.put_nowait((data, stamp))
            except queue.Full:
                try:
                    q.get_nowait()
                except queue.Empty:
                    pass
                q.put_nowait((data, stamp))
    finally:
        ex.remove_node(node)

# broadcasts new messages to all clients without re-collecting ROS message per client
# use a single producer to wait for next snapshot and then broadcast to all active sockets
async def broadcaster(app: FastAPI):
    seq = 0
    last_stamp = None

    while True:
        # run queue.get() in a thread since it is blocking
        data, stamp = await asyncio.to_thread(app.state.msg_queue.get)

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

    # bounded queue so newest snapshot always wins
    app.state.msg_queue = queue.Queue(maxsize=1)

    app.state.ros_thread = threading.Thread(
        target=ros_spin_loop,
        args=(app.state.node, app.state.stop_evt, app.state.msg_queue),
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

@app.get("/racegpt")
def racegpt():
    """Test endpoint for RaceGPT."""
    return {"message": "Hello from RaceGPT!", "data": ""}

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
