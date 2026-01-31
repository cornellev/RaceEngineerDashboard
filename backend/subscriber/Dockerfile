# Dockerfile for ROS 2 Subscriber
# Uses ROS 2 Humble (supports arm64 for Raspberry Pi)
FROM osrf/ros:humble-desktop-full

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file (build context is backend/, so path is subscriber/requirements.txt)
COPY subscriber/requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy subscriber code (build context is backend/, so path is subscriber/subscriber.py)
COPY subscriber/subscriber.py ./subscriber.py

# Source ROS 2 setup and run subscriber
# Note: ROS 2 needs to be sourced in each command
CMD ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash && cd /app && python3 subscriber.py"]

