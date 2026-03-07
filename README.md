# Race Engineer Dashboard

**Donte and Adi**

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

Create a `.env` file in the in the root directory (not under `/backend` or `/frontend`).
See `.env.example` for more info.

Make sure Docker containers and volumes for this project are not running already.
Then, run `docker compose up --build` to get all containers running.

The frontend client UI should be running on port 3000 along with a backend
healthcheck endpoint on the root of port 8000.

Integration with RaceGPT is done via serial connection.
