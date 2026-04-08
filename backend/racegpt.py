import asyncio
import os
import time
from urllib.parse import urlsplit, urlunsplit

import httpx


def _normalize_racegpt_url() -> str:
    configured = os.getenv("RACEGPT_URL") or os.getenv(
        "RACEGPT_WS_URL", "http://100.110.39.54:8000/analyze"
        # Ollama Jetson URL: 100.94.168.56
        # vLLM Thor URL: 100.94.168.56
    )
    parts = urlsplit(configured)

    if parts.scheme in {"ws", "wss"}:
        http_scheme = "https" if parts.scheme == "wss" else "http"
        path = parts.path
        if path == "/ws/analyze":
            path = "/analyze"
        return urlunsplit((http_scheme, parts.netloc, path, parts.query, parts.fragment))

    return configured


RACEGPT_URL = _normalize_racegpt_url()
CONNECT_TIMEOUT_SEC = float(os.getenv("RACEGPT_CONNECT_TIMEOUT_SEC", "3"))
RESPONSE_TIMEOUT_SEC = float(os.getenv("RACEGPT_RESPONSE_TIMEOUT_SEC", "10"))
CONNECT_RETRIES = int(os.getenv("RACEGPT_CONNECT_RETRIES", "3"))
CONNECT_RETRY_DELAY_SEC = float(os.getenv("RACEGPT_CONNECT_RETRY_DELAY_SEC", "0.2"))


class RaceGPTClient:
    def __init__(self, url: str):
        self.url = url
        self._request_lock = asyncio.Lock()
        self._request_seq = 0

    async def _post_once(self, payload: dict):
        timeout = httpx.Timeout(RESPONSE_TIMEOUT_SEC, connect=CONNECT_TIMEOUT_SEC)
        headers = {"Connection": "close"}
        async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
            print(f"[RaceGPT] HTTP client ready for {self.url}", flush=True)
            response = await client.post(self.url, json=payload)
            response.raise_for_status()
            return response.json()

    def _normalize_payload(self, data: dict) -> dict:
        if not isinstance(data, dict):
            return {"json": data}

        if "csv" in data:
            return {"csv": data["csv"]}

        if "json" in data:
            return {"json": data["json"]}

        if "data" in data:
            return {"json": data["data"]}

        return {"json": data}

    async def get_response(self, data: dict):
        normalized_data = self._normalize_payload(data)
        self._request_seq += 1
        request_id = self._request_seq
        sample_count = (
            len(normalized_data.get("json", []))
            if isinstance(normalized_data.get("json"), list)
            else -1
        )
        start = time.monotonic()

        async with self._request_lock:
            last_error = None

            for attempt in range(CONNECT_RETRIES):
                try:
                    print(
                        (
                            f"[RaceGPT] HTTP request {request_id} attempt {attempt + 1}/"
                            f"{CONNECT_RETRIES}: samples={sample_count}"
                        ),
                        flush=True,
                    )
                    decoded = await self._post_once(normalized_data)
                    elapsed = time.monotonic() - start
                    print(
                        f"[RaceGPT] HTTP request {request_id} response received in {elapsed:.2f}s",
                        flush=True,
                    )
                    return decoded
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_error = exc
                    print(
                        (
                            f"[RaceGPT] HTTP request {request_id} transport failure on "
                            f"attempt {attempt + 1}: {type(exc).__name__}: {exc}"
                        ),
                        flush=True,
                    )
                    if attempt + 1 < CONNECT_RETRIES:
                        await asyncio.sleep(CONNECT_RETRY_DELAY_SEC)
                except httpx.HTTPStatusError as exc:
                    print(
                        (
                            f"[RaceGPT] HTTP request {request_id} upstream returned "
                            f"{exc.response.status_code}"
                        ),
                        flush=True,
                    )
                    raise RuntimeError("RaceGPT HTTP request failed") from exc
                except ValueError as exc:
                    print(
                        f"[RaceGPT] HTTP request {request_id} invalid JSON response: {exc}",
                        flush=True,
                    )
                    raise RuntimeError("RaceGPT returned invalid JSON") from exc

            raise RuntimeError("RaceGPT HTTP connection failed") from last_error

    async def close(self):
        print("[RaceGPT] HTTP client closed", flush=True)


client = RaceGPTClient(RACEGPT_URL)


async def get_response(data: dict):
    return await client.get_response(data)


async def close():
    await client.close()
