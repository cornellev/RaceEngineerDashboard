# Backend Design and Build

FastAPI service that subscribes to the ROS 2 `spi_data` topic and streams snapshots to the frontend over WebSocket. It also proxies rosbag control requests and forwards RaceGPT requests to a websocket-based RaceGPT service.

## Getting Started

### Local development

Requires Python and ROS 2 Humble. Run from the `backend/` directory:

```bash
pip install -r requirements.txt
source /opt/ros/humble/setup.bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend must run in an environment where ROS 2 can discover the `spi_data` topic. If you are using a Fast DDS discovery server outside Docker, configure the appropriate ROS/Fast DDS environment variables before starting the app.

### Docker (recommended)

From the project root:

```bash
docker compose up --build
```

The backend shares the Tailscale container's network stack (`network_mode: service:tailscale`), so the API is exposed on port `8000` through the Tailscale service. On startup, the backend entrypoint generates a Fast DDS client profile from `super_client.example.xml`, sets `FASTRTPS_DEFAULT_PROFILES_FILE`, and exports `ROS_DISCOVERY_SERVER=${DISCOVERY_SERVER_IP}:11811`.

## Data Pipeline

```text
ROS 2 topic (spi_data) -> DataSubscriber -> History (deque) -> Broadcaster -> WebSocket clients
```

1. **DataSubscriber** (`subscriber.py`) subscribes to `std_msgs/String` on topic `spi_data`. Expects JSON payloads.
2. **History** stores the latest snapshots from the ROS thread in a bounded deque.
3. **Broadcaster** pushes the newest snapshot to every connected WebSocket client.

## API

- `GET /` returns `{"message": "Race Telemetry API", "status": "running"}`.
- `POST /bag/start` proxies a start request to the remote rosbag service.
- `POST /bag/stop` proxies a stop request to the remote rosbag service.
- `GET /bag/status` proxies a status request to the remote rosbag service.
- `GET /healthz` returns backend health in the form `{"local": "ok", "bag_service": "ok" | "error" | "unreachable"}`.
- `WS /ws/stream` sends messages shaped like `{"seq": number, "data": <latest ROS JSON>, "stamp_ns": number}`.
- `POST /racegpt` forwards the posted JSON body to the RaceGPT websocket service and returns the JSON response.

## Environment

### ROS and network configuration

- `ROS_DOMAIN_ID` (default: `14`) must match the publisher's DDS domain.
- `ROS_LOCALHOST_ONLY` (default: `0`) allows non-localhost ROS discovery.
- `DISCOVERY_SERVER_IP` is used by the Docker entrypoint to build the Fast DDS client profile and set `ROS_DISCOVERY_SERVER=<DISCOVERY_SERVER_IP>:11811`.
- `TAILSCALE_IP` is used for remote rosbag API requests at `http://<TAILSCALE_IP>:8080`.

### RaceGPT configuration

- `RACEGPT_WS_URI` (default: `ws://192.168.55.1:8000/ws/analyze`) is the websocket endpoint used for RaceGPT requests.
- `RACEGPT_CONNECT_TIMEOUT_SEC` (default: `15`) controls how long the backend waits to establish a RaceGPT websocket connection.
- `RACEGPT_RESPONSE_TIMEOUT_SEC` (default: `18`) controls websocket send/receive timeouts inside the RaceGPT client.
- `RACEGPT_REQUEST_TIMEOUT_SEC` (default: `20`) controls the overall timeout for the `/racegpt` HTTP endpoint.

## Customizations

The main runtime tuning constants live in `main.py`:

- `DEQUE_SIZE` controls how many snapshots are retained in backend memory.
- `SAMPLE_RATE_HZ` controls how often snapshots are added to history and broadcast to WebSocket clients.
