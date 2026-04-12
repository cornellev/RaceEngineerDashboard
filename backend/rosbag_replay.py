from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from rosbags.highlevel import AnyReader
from rosbags.typesys import Stores, get_typestore


_TYPESTORE = get_typestore(Stores.ROS2_HUMBLE)


def flatten_dict(data: dict[str, Any], parent_key: str = "") -> dict[str, Any]:
    flattened: dict[str, Any] = {}

    for key, value in data.items():
        next_key = f"{parent_key}.{key}" if parent_key else key
        if isinstance(value, dict):
            flattened.update(flatten_dict(value, next_key))
            continue

        flattened[next_key] = value

    return flattened


def parse_rosbag_to_csv_rows(bag_path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    skipped_messages = 0

    with AnyReader([bag_path], default_typestore=_TYPESTORE) as reader:
        for connection, timestamp, rawdata in reader.messages():
            message = reader.deserialize(rawdata, connection.msgtype)
            message_data = getattr(message, "data", None)

            if not isinstance(message_data, str):
                skipped_messages += 1
                continue

            try:
                parsed_json = json.loads(message_data)
            except json.JSONDecodeError:
                skipped_messages += 1
                continue

            if not isinstance(parsed_json, dict):
                skipped_messages += 1
                continue

            flattened = flatten_dict(parsed_json)
            flattened["timestamp"] = timestamp
            rows.append(flattened)

    if skipped_messages > 0:
        warnings.append(
            "Some ROS bag messages were skipped because they could not be converted into JSON telemetry rows."
        )

    return rows, warnings
