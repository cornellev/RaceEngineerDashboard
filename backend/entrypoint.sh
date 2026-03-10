#!/usr/bin/env bash
set -e

source /opt/ros/humble/setup.bash

# Generate CLIENT profile from template
TEMPLATE="/app/super_client.example.xml"
PROFILE="/tmp/client.xml"
sed "s/DISCOVERY_SERVER_IP/${DISCOVERY_SERVER_IP}/" "$TEMPLATE" > "$PROFILE"
export FASTRTPS_DEFAULT_PROFILES_FILE="$PROFILE"
export ROS_DISCOVERY_SERVER="${DISCOVERY_SERVER_IP}:11811"

echo "Using discovery server at ${DISCOVERY_SERVER_IP}:11811"

exec uvicorn main:app --host 0.0.0.0 --port 8000
