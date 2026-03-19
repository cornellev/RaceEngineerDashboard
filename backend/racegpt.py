import asyncio
import json
import websockets

async def get_response(data: dict):
    uri = "ws://192.168.55.1:8000/ws/analyze"

    async with websockets.connect(uri) as websocket:
        print(data, flush=True)
        await websocket.send(json.dumps(data))

        response = await websocket.recv()
        response = json.loads(response)

        print("Server response:", response, flush=True)

        return response