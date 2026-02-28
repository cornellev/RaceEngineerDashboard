# Backend Design and Build

FastAPI service that subscribes to a ROS 2 topic and streams data to the frontend over WebSocket.

## Getting Started

This project uses Python with FastAPI and ROS 2 Humble. Run the following commands in the backend directory to start a dev environment.

```
pip install -r requirements.txt
source /opt/ros/humble/setup.bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend must run in an environment where ROS 2 can see the `spi_data` topic.

To build and run the backend as a Docker container. Run the following two commands from the project root.

```
docker compose build backend
docker compose up backend
```

The container uses `ros:humble-ros-base-jammy` and exposes the API on port 8000. `ROS_DOMAIN_ID` defaults to 14 (overridable via env).

## Data Pipeline

```
ROS 2 topic (spi_data)  →  DataSubscriber  →  Queue  →  Broadcaster  →  WebSocket clients
```

1. **DataSubscriber** (`subscriber.py`) — ROS 2 node subscribing to `std_msgs/String` on topic `spi_data`. Expects JSON payloads.
2. **Queue** — Bounded queue (maxsize=1) passes the latest snapshot from the ROS thread to the FastAPI event loop.
3. **Broadcaster** — Sends each new message to all connected WebSocket clients.

## API

- `GET /` — Health check. Returns `{"message": "Race Telemetry API", "status": "running"}`
- `WS /ws/stream` — WebSocket stream. Clients receive JSON: `{"seq": int, "data": {...}, "stamp_ns": int}`

## Environment

- `ROS_DOMAIN_ID` (default: 14) — ROS 2 DDS domain ID; must match publisher
- `ROS_LOCALHOST_ONLY` (default: 0) — Allow non-localhost ROS discovery
