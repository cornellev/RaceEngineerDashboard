# ROS 2 Subscriber Container

This subscriber runs in a Docker container with ROS 2 Humble pre-installed, allowing it to run on a Raspberry Pi without requiring ROS to be installed on the host system.

## Features

- **ROS 2 Humble**: Pre-installed in container (supports arm64 for Raspberry Pi)
- **Database Integration**: Connects to PostgreSQL and Redis via Docker network
- **Configurable**: ROS topic name via environment variable

## Requirements

- Docker and Docker Compose
- ROS 2 topics available on the network (or host network access)

## ROS 2 Network Configuration

For ROS 2 discovery to work, the subscriber needs to be able to discover ROS topics. You have two options:

### Option 1: Host Network (Recommended for Raspberry Pi)
Uncomment `network_mode: "host"` in docker-compose.yml. This allows the container to access ROS topics on the host network directly.

### Option 2: Docker Network with ROS_DOMAIN_ID
Keep the Docker network and ensure:
- ROS nodes use the same `ROS_DOMAIN_ID` (default: 14)
- Network connectivity allows ROS discovery

## Environment Variables

- `POSTGRES_HOST`: PostgreSQL host (default: `postgres`)
- `POSTGRES_PORT`: PostgreSQL port (default: `5432`)
- `POSTGRES_DB`: Database name (default: `telemetry_db`)
- `POSTGRES_USER`: Database user (default: `postgres`)
- `POSTGRES_PASSWORD`: Database password (default: `password`)
- `REDIS_HOST`: Redis host (default: `redis`)
- `REDIS_PORT`: Redis port (default: `6379`)
- `REDIS_DB`: Redis database number (default: `0`)
- `ROS_DOMAIN_ID`: ROS 2 domain ID (default: `14`)

**Note:** The ROS topic is hardcoded to `spi_data` in the subscriber code.

## Usage

### Start with docker-compose
```bash
cd backend
docker-compose up subscriber
```

### Run standalone
```bash
cd backend
docker build -f subscriber/Dockerfile -t subscriber .
docker run --network backend_redis-network \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PASSWORD=password \
  -e REDIS_HOST=redis \
  subscriber
```

## Development

The subscriber code is mounted as a volume for development hot-reload. Changes to `subscriber.py` will be reflected after container restart.

## Raspberry Pi Notes

- The ROS 2 Humble image supports arm64 architecture
- Ensure Docker is installed on your Raspberry Pi
- For ROS topic discovery, use `network_mode: "host"` in docker-compose.yml

