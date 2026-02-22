import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import rclpy
from subscriber.subscriber import DataSubscriber
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    rclpy.init()
    app.state.node = DataSubscriber("spi_data")
    yield
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

async def fetch_race_data():
    rclpy.spin_once(app.state.node, timeout_sec=0.05)
    data, stamp = app.state.node.get_latest()
    return data

@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Race Telemetry API", "status": "running"}

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    last_seen_id = 0

    while True:
        # Example: Fetch new data from DB (pseudo-code)
        new_data = await fetch_race_data() # Returns list of dicts
        
        if new_data:
            json_payload = {
                "seq": last_seen_id,               # read_snapshot()[0]
                "data" : new_data
            }
            
            # Option 1: Auto-serialize dict to JSON (recommended)
            await websocket.send_json(json_payload)
            
            # Option 2: Manual JSON string
            # json_str = json.dumps(json_payload)
            # await websocket.send_text(json_str)
            
            last_seen_id += 1
        
        await asyncio.sleep(0.1)  # Poll interval; replace with DB trigger if possible
