import asyncio
import json
import os

import websockets
from websockets.exceptions import WebSocketException


RACEGPT_WS_URI = os.getenv("RACEGPT_WS_URI", "ws://192.168.55.1:8000/ws/analyze")
CONNECT_TIMEOUT_SEC = float(os.getenv("RACEGPT_CONNECT_TIMEOUT_SEC", "15"))
RESPONSE_TIMEOUT_SEC = float(os.getenv("RACEGPT_RESPONSE_TIMEOUT_SEC", "18"))


class RaceGPTClient:
    def __init__(self, uri: str):
        self.uri = uri
        self._websocket = None
        self._connect_lock = asyncio.Lock()
        self._request_lock = asyncio.Lock()

    def _is_connected(self):
        websocket = self._websocket
        if websocket is None:
            return False

        closed = getattr(websocket, "closed", None)
        if isinstance(closed, bool):
            return not closed

        state = getattr(websocket, "state", None)
        state_name = getattr(state, "name", None)
        if state_name is not None:
            return state_name == "OPEN"

        return True

    async def _open(self):
        return await websockets.connect(
            self.uri,
            open_timeout=CONNECT_TIMEOUT_SEC,
            ping_interval=20,
            ping_timeout=20,
            max_queue=1,
        )

    async def _ensure_connected(self):
        if self._is_connected():
            return self._websocket

        async with self._connect_lock:
            if self._is_connected():
                return self._websocket

            if self._websocket is not None:
                await self._safe_close()

            self._websocket = await self._open()
            print(f"[RaceGPT] connected to {self.uri}", flush=True)
            return self._websocket

    async def _safe_close(self):
        websocket = self._websocket
        self._websocket = None
        if websocket is None:
            return

        try:
            await websocket.close()
        except Exception:
            pass

    async def get_response(self, data: dict):
        payload = json.dumps(data)

        async with self._request_lock:
            last_error = None

            for attempt in range(2):
                websocket = await self._ensure_connected()
                try:
                    await asyncio.wait_for(
                        websocket.send(payload),
                        timeout=RESPONSE_TIMEOUT_SEC,
                    )
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=RESPONSE_TIMEOUT_SEC,
                    )
                    decoded = json.loads(response)
                    print("[RaceGPT] response received", flush=True)
                    return decoded
                except asyncio.CancelledError:
                    print("[RaceGPT] request cancelled; resetting websocket", flush=True)
                    await self._safe_close()
                    raise
                except (
                    ConnectionError,
                    asyncio.TimeoutError,
                    WebSocketException,
                    OSError,
                    json.JSONDecodeError,
                ) as exc:
                    last_error = exc
                    print(
                        f"[RaceGPT] request failed on attempt {attempt + 1}: {exc}",
                        flush=True,
                    )
                    await self._safe_close()

            raise RuntimeError("RaceGPT websocket request failed") from last_error

    async def close(self):
        async with self._connect_lock:
            await self._safe_close()
            print("[RaceGPT] connection closed", flush=True)


client = RaceGPTClient(RACEGPT_WS_URI)


async def get_response(data: dict):
    return await client.get_response(data)


async def close():
    await client.close()
