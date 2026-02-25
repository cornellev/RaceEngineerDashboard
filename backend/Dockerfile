# Uses ROS 2 Humble (supports arm64 for Raspberry Pi)
FROM ros:humble-ros-base-jammy

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file (build context is backend/, so path is subscriber/requirements.txt)
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

COPY . .

# Source ROS 2 setup and run subscriber
# Note: ROS 2 needs to be sourced in each command
# ROS_DOMAIN_ID is set via environment variable from docker-compose
CMD ["/bin/bash", "-c", "source /opt/ros/humble/setup.bash", "&&", "export ROS_DOMAIN_ID=${ROS_DOMAIN_ID:-14}", "cd /app", "python3 subscriber.py"]

#EXPOSE 8000

#CMD ["python3", "main.py"]
