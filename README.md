#Race Engineer Dashboard
**Donte and Adi**

---

### Specifications

- Display power (calculated from current and voltage data), location,
  lap time data, rpm (rear and front), battery efficiency and health, and
  strain gauge data to a live telemetry dashboard.
- Implement automatic mode switching between ROS subscriber and cellular modem
  sensor data channels

## Getting Started

Create .env files for DB connections, Tailscale, etc.

Make sure Docker containers and volumes for this project are not running already.
Then, run `docker compose up` to get all containers running.

The frontend client UI should be running on port 3000.
