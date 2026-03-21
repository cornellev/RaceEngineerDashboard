# Race Engineer Dashboard

## Team Members
Donte & Adi

---

![Live Dashboard Image](frontend/public/dashboard.png)

---

## Summary

Live telemetry and analysis for the car: sensor streams (with filtering), derived run metrics, and optional **RaceGPT** insights in a sidebar.

**Filtering & sensor views**

- **Kalman filtering** for more reliable GPS position; **low-pass filtering** to denoise time-series channels
- **Speed** time series, live, and max value
- **Power** time series (calculated from current and voltage data)
- **GPS** location display with Google Maps
- Live **Steering** angle, **Brake** pressure, **Throttle**, and **RPM** on all wheels
- Timestamps and stopwatch for lap and race timing


**Derived metrics**

- **Distance** calculated from aggregating GPS data
- **Energy Use** calculated from power
- **Efficiency** instantaneous and average over a run

**RaceGPT**

- Configurable manual or automatic LLM requests **that analyze recent telemetry data and return verdicts on improving performance**

---

## Getting Started

1. **Running the Project**

   Create a `.env` file in the the root directory (not under `/backend` or `/frontend`).
   See `.env.example` for more info. 

   Make sure Docker containers and volumes for this project are not running already.
   Then, run `docker compose up --build` to get all containers running.

   The frontend client UI should be running on `port 3000`.  
   The backend healthcheck endpoint is on the root of `port 8000`.

   Integration with RaceGPT is done via serial connection. Connect your machine to a
   machine running RaceGPT with a USB, and the dashboard should connect when built.

3. **Frontend Testing**

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

4. **Backend Troubleshooting**

   Refer to `backend/README.md`.

---

## ROS Subscriber Data

For the ROS2 subscriber, first get the ROS2 publisher IP address from:

```sh
ssh cev@<daq tailscale ip> "docker exec ts-authkey-container tailscale ip" | head -n1
```

Make sure this matches the ip in the `docker-compose.yml` file.

We set it manually, not via env var, because the publisher IP should not change.

## RaceGPT Integration

Plug your machine into another machine running **RaceGPT** via USB.
The Race Engineer Dashboard should be connected and able to request
custom LLM responses on the live data snapshots with analysis.

As mentioned above, there are two modes for requesting responses on the sidebar.

- Manually request LLM responses (5s buffer between responses)
- Automatically request and display LLM responses based on a set frequency >5s

---

## System Overview

```
ROS2 Sensors → Backend (Python + ROS2) → WebSocket Stream → Frontend (React + TypeScript + Bun)
                                          ↓
                                  RaceGPT Integration
```

---

## RaceGPT Integration Flow

RaceGPT is integrated as an **on-demand analysis layer**.

1. The frontend sends telemetry history to the backend via a POST request
2. The backend forwards this data over a **USB WebSocket connection** to the RaceGPT machine (`/ws/analyze`)
3. RaceGPT processes the data and returns a **verdict/analysis**
4. The backend relays the response back to the frontend
5. The frontend displays the result in the sidebar (manual or automatic modes)

---

## ROSbag + Remote Data Handling

- The frontend can trigger ROSbag recording via `/bag` endpoints
- The backend communicates with the DAQ machine through **Tailscale**
- ROSbag files are stored remotely for later analysis and replay
