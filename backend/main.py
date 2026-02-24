import asyncio
import threading
import queue
import contextlib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import rclpy
from rclpy.wait_for_message import wait_for_message
from std_msgs.msg import String
from subscriber import DataSubscriber
from contextlib import asynccontextmanager

def ros_wait_loop(node: DataSubscriber, topic: str, stop_evt: threading.Event, q: queue.Queue):
    while not stop_evt.is_set():
        msg = wait_for_message(String, node, topic, timeout_sec=0.05) # at 200Hz should be 10x faster
        if msg is None:
            continue

        node.listener_callback(msg) # manually give node message (not using rclpy.spin_once)
        data, stamp = node.get_latest()
        if data is None or stamp is None:
            continue
        q.put((data, stamp))

        # warning that queue is growing too fast for websocket to keep up sending to frontend
        # warns every 500 messages over 2000
        qs  = q.qsize()
        if qs >= 2000 and (qs - 2000) % 500 == 0:
            print(f"[WARNING] msg_queue backlog = {qs} items. "
                  f"Producer is outpacing broadcaster; memory may grow.")

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
        seq += 1

        dead = []
        for ws in list(app.state.clients):
            try:
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
    app.state.msg_queue = queue.Queue()

    app.state.ros_thread = threading.Thread(
        target=ros_wait_loop, 
        args=(app.state.node, topic, app.state.stop_evt, app.state.msg_queue), 
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

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    app.state.clients.add(websocket)
    
    try:
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        pass
    finally: 
        app.state.clients.discard(websocket)