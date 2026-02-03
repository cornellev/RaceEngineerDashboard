from fastapi import FastAPI

app = FastAPI()

"""TODO
- Implement actual data retrieval logic for snapshot and history endpoints.
- Integrate with database or data source to fetch real sensor data.
- Add error handling and validation as needed.
- Consider pagination for history endpoint if data size is large.
"""

# API router modules
@app.get("/snapshot")
async def get_snapshot():
    """
    Get the latest snapshot of all sensor data.
    """
    return {
    "seq": int,               # read_snapshot()[0]
    "power": {
        "ts": int,            # read_snapshot()[1][0]
        "current": float,     # read_snapshot()[1][1]
        "voltage": float,     # read_snapshot()[1][2]
    },
    "motor": {
        "ts": int,            # read_snapshot()[1][3]
        "throttle": float,    # read_snapshot()[1][4]
        "velocity": float,    # read_snapshot()[1][5]
    },
    "rpm_front": {
        "ts": int,            # read_snapshot()[1][6]
        "rpm_left": float,    # read_snapshot()[1][7]
        "rpm_right": float,   # read_snapshot()[1][8]
    },
    "rpm_back": {
        "ts": int,            # read_snapshot()[1][9]
        "rpm_left": float,    # read_snapshot()[1][10]
        "rpm_right": float,   # read_snapshot()[1][11]
    },
    "gps": {                  # Currently Unimplemented
        "ts": int,            # read_snapshot()[1][12]
        "lat": float,         # read_snapshot()[1][13]
        "long": float,        # read_snapshot()[1][14]
    },
}

@app.get("/snapshot/{category}")
async def get_snapshot_category(category: str):
    """
    Get the latest snapshot of a specific sensor data category.
    `category` can be one of: power, motor, rpm_front, rpm_back, gps
    """
    # This is a placeholder implementation. Replace with actual data retrieval logic.
    if category == "power":
        return {
            "ts": int,
            "current": float,
            "voltage": float,
        }
    elif category == "motor":
        return {
            "ts": int,
            "throttle": float,
            "velocity": float,
        }
    elif category == "rpm_front":
        return {
            "ts": int,
            "rpm_left": float,
            "rpm_right": float,
        }
    elif category == "rpm_back":
        return {
            "ts": int,
            "rpm_left": float,
            "rpm_right": float,
        }
    elif category == "gps":
        return {
            "ts": int,
            "lat": float,
            "long": float,
        }
    else:
        return {"error": "Invalid category"}

@app.get("/history/")
async def get_history(num_entries: int = 1):
    """
    Get the historical sensor data for the last `num_entries` entries.
    `num_entries` is specified as a query parameter i.e. ?num_entries=10
    after the URL
    """
    # This is a placeholder implementation. Replace with actual data retrieval logic.
    history_data = []
    for _ in range(num_entries):
        history_data.append({
            "seq": int,
            "power": {
                "ts": int,
                "current": float,
                "voltage": float,
            },
            "motor": {
                "ts": int,
                "throttle": float,
                "velocity": float,
            },
            "rpm_front": {
                "ts": int,
                "rpm_left": float,
                "rpm_right": float,
            },
            "rpm_back": {
                "ts": int,
                "rpm_left": float,
                "rpm_right": float,
            },
            "gps": {
                "ts": int,
                "lat": float,
                "long": float,
            },
        })
    return history_data