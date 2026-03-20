# 📊 Race Engineer Dashboard

🛠️ **Donte and Adi** ⚙️

![Live Dashboard Image](frontend/public/dashboard.png)

---

## ✅ Specifications

**Sensor Data** displays  
Implement a Kalman filter for accurate location data, and a low pass filter for denoising timeseries sensors.

- **Speed** time series, live, and max value
- **Power** time series (calculated from current and voltage data)
- **GPS** location display with Google Maps
- Live **Steering** angle, **Brake** pressure, **Throttle**, and **RPM** on all wheels

**Calculated Data** displays for relevant metrics

- **Distance** calculated from aggregating GPS data
- **Energy Usage** calculated from power
- **Efficiency** instantaneous and average over a run

**RaceGPT Integration** via a sidebar allowing two modes.

- Manually request LLM responses (5s buffer between responses)
- Automatically request and display LLM responses based on set frequency >5s

Timestamping and stopwatch features for tracking lap and race time  
Implement automatic mode switching between ROS subscriber and cellular modem sensor
data channels for reliable data pipeline.

## 🚀 Getting Started

1. **Running the Project**

   Create a `.env` file in the the root directory (not under `/backend` or `/frontend`).
   See `.env.example` for more info. The format for the `.env` is also listed below here for reference.

   ```env
    VITE_GOOGLE_MAPS_API_KEY=Your_Google_Maps_API_Key
    VITE_GOOGLE_MAP_ID=Your_Google_Map_ID

    TS_CLIENT_ID=your tailscale client id
    TS_CLIENT_SECRET=your tailscale client secret

    # Tailscale IP of the DAQ machine (ros-tailscale-service)
    TAILSCALE_IP=100.110.98.26
    # Port the rosbag API listens on (on the DAQ machine)
    ROSBAG_API_PORT=8080
   ```

   Make sure Docker containers and volumes for this project are not running already.
   Then, run `docker compose up --build` to get all containers running.

   The frontend client UI should be running on `port 3000` along with a backend
   healthcheck endpoint on the root of `port 8000`.

   Integration with RaceGPT is done via serial connection. Connect your machine to a
   machine running RaceGPT with a USB, and the dashboard should connect when built.

2. **Frontend Testing**

   Refer to `frontend/README.md` for more information.  
   **[Bun Installation](https://bun.com/docs/installation)**: The frontend uses **Bun** instead of **NodeJS** as a package manager
   and runtime. The installation is linked [here](https://bun.com/docs/installation). Then, run the following commands in the
   terminal to test/run the frontend in isolation.  
   This will start the frontend development environment with HMR and Vite at `port 5173`.

   ```bash
   cd frontend
   bun dev
   ```

   **Google Maps**: To get location data and Google Maps properly displaying while
   running only the frontend with `bun dev`,
   create a `.env` file in the `/frontend` directory. Follow the `.env.example` in the
   `/frontend` and create the environment variables below.

   ```env
   VITE_GOOGLE_MAPS_API_KEY=<Your Google Maps API Key here>
   VITE_GOOGLE_MAP_ID=<Your Google Maps Map ID from Google Cloud console>
   ```

   Instructions for getting your own `API_KEY` and `MAP_ID` are in `frontend/README.md`.

3. **Backend Troubleshooting**

   Refer to `backend/README.md`.

## 🤖 ROS Subscriber Data

For the ROS2 subscriber, first get the ROS2 publisher IP address from:

```sh
ssh cev@<daq tailscale ip> "docker exec ts-authkey-container tailscale ip" | head -n1)
```

Make sure this matches the ip in the `docker-compose.yml` file.

We set it manually, not via env var, because the publisher IP should not change.

## 💬 RaceGPT Integration

Plug your machine into another machine running **RaceGPT** via USB.
The Race Engineer Dashboard should be connected and able to request
custom LLM responses on the live data snapshots with analysis.

As mentioned above, there are two modes for requesting responses on the sidebar.

- Manually request LLM responses (5s buffer between responses)
- Automatically request and display LLM responses based on a set frequency >5s
