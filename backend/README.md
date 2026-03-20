# Backend Design and Build

FastAPI service that subscribes to a ROS 2 topic and streams data to the frontend over WebSocket.

## Getting Started

### Local development

Requires Python, FastAPI, and ROS 2 Humble. Run from the backend directory:

```
pip install -r requirements.txt
source /opt/ros/humble/setup.bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend must run in an environment where ROS 2 can discover the `spi_data` topic (same discovery server).

### Docker (recommended)

From the project root:

```
docker compose up --build
```

The backend runs alongside Tailscale and shares its network stack (`network_mode: service:tailscale`), so it can reach the ROS publisher over Tailscale. The API is exposed on port 8000 via the Tailscale container.

## Data Pipeline

```
ROS 2 topic (spi_data)  →  DataSubscriber  →  History (deque)  →  Broadcaster  →  WebSocket clients
```

1. **DataSubscriber** (`subscriber.py`) — ROS 2 node subscribing to `std_msgs/String` on topic `spi_data`. Expects JSON payloads.
2. **History** — Bounded deque (maxlen=1000) holds the latest snapshots from the ROS thread.
3. **Broadcaster** — Sends each new message to all connected WebSocket clients.

## API

- `GET /` — Health check. Returns `{"message": "Race Telemetry API", "status": "running"}`
- `POST /bag/start` — Proxy to remote rosbag service (via Tailscale)
- `POST /bag/stop` — Proxy to remote rosbag service (via Tailscale)
- `GET /bag/status` — Proxy to remote rosbag service (via Tailscale)
- `GET /healthz` — Proxy to remote rosbag service (via Tailscale)
- `WS /ws/stream` — WebSocket stream. Clients receive JSON following the format in [UC26 Sensor Reader](https://github.com/cornellev/uc26_sensor_reader).
- `POST /racegpt` — RaceGPT serial communication endpoint. Response should give `{"verdict": string}`

## Environment

- `ROS_DOMAIN_ID` (default: 14) — ROS 2 DDS domain ID; must match publisher
- `ROS_LOCALHOST_ONLY` (default: 0) — Allow non-localhost ROS discovery
- `RMW_IMPLEMENTATION` — Set to `rmw_fastrtps_cpp` for FastDDS (must match publisher)
- `ROS_DISCOVERY_SERVER` — Publisher's Tailscale IP and port (e.g. `100.73.23.79:11811`) for cross-network discovery; required when publisher is on a different machine
- `TAILSCALE_IP` — Tailscale IP for the remote rosbag API (expects port 8080)

## Customizations

In `main.py` there are two main global values that can be adjusted.

- `DEQUE_SIZE` sets the amount of snapshots kept in history/memory and set to RaceGPT
- `SAMPLE_RATE_HZ` sets the frequency with which snapshots are sent to Websocket clients
