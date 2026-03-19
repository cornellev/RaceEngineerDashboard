# Race Engineer Dashboard

**Donte and Adi**

<img width="720" height="379" alt="img_0368_720" src="https://github.com/user-attachments/assets/fdf21e5b-6bb1-46a8-bd15-c7683db6cf0a" />

---

### Specifications

- Display power (calculated from current and voltage data), gps,
  lap time data, rpm (rear and front), battery efficiency, steering,
  and motor data to a live telemetry dashboard
- Timeseries charts of the last 10 seconds of live data for applicable sensors
- Implementing a Kalman filter for accurate location data, and a low pass filter
  for denoising timeseries sensors.
- Max values for applicable sensors such as power and battery efficiency
- Timestamping and stopwatch features for tracking lap and race time
- Implement automatic mode switching between ROS subscriber and cellular modem
  sensor data channels

## Getting Started

**Create a `.env` file in the the root directory (not under `/backend` or `/frontend`).
See `.env.example` for more info.**

**Google Maps**: To get location data and Google Maps properly displaying,
create a `.env` file in the `/frontend` directory. Follow the `.env.example` in the
`/frontend` and create the environment variable VITE_GOOGLE_MAPS_API_KEY with your
Google Maps API Key and a VITE_GOOGLE_MAP_ID with a Map ID from Google Cloud console.

Make sure Docker containers and volumes for this project are not running already.
Then, run `docker compose up --build` to get all containers running.

The frontend client UI should be running on port 3000 along with a backend
healthcheck endpoint on the root of port 8000.

Integration with RaceGPT is done via serial connection.

# ros subscriber

For the ROS2 subscriber, first get the ROS2 publisher IP address from:

```sh
ssh cev@<daq tailscale ip> "docker exec ts-authkey-container tailscale ip" | head -n1)
```

Make sure this matches the ip in the `docker-compose.yml` file.

We set it manually, not via env var, because the publisher IP should not change.


