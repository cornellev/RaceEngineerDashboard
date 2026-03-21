# Backend

FastAPI service that subscribes to the ROS 2 `spi_data` topic, streams telemetry to the frontend over WebSocket, proxies rosbag control requests, and forwards RaceGPT requests to a websocket-based RaceGPT service.

## Running the backend

### Local development

Run from the `backend/` directory:

```bash
pip install -r requirements.txt
source /opt/ros/humble/setup.bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend needs access to the ROS 2 `spi_data` topic and the correct discovery configuration.

### Docker

From the project root:

```bash
docker compose up --build
```

The backend shares the Tailscale service network and is exposed on port `8000`.

## Main endpoints

- `GET /` basic health response
- `WS /ws/stream` live telemetry stream for the frontend
- `POST /racegpt` forwards telemetry to RaceGPT and returns the response
- `POST /bag/start`, `POST /bag/stop`, and `GET /bag/status` proxy rosbag controls
- `GET /healthz` reports backend and remote bag-service health

## Environment

- `ROS_DOMAIN_ID` must match the publisher's DDS domain
- `ROS_LOCALHOST_ONLY` controls whether ROS discovery is localhost-only
- `DISCOVERY_SERVER_IP` is used for Fast DDS discovery setup in Docker
- `TAILSCALE_IP` is used for remote rosbag API requests
- `RACEGPT_WS_URI` is the websocket endpoint for RaceGPT
- `RACEGPT_CONNECT_TIMEOUT_SEC`, `RACEGPT_RESPONSE_TIMEOUT_SEC`, and `RACEGPT_REQUEST_TIMEOUT_SEC` control RaceGPT timeouts
