import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

""""""""""""""""""""""""""""""""""""""""""""""""""
"""TODO: Implement the ROS subscriber data here"""
""""""""""""""""""""""""""""""""""""""""""""""""""
async def fetch_race_data():
    return 1

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
