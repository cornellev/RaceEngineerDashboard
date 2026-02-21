#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
from rclpy.qos import QoSProfile

class DataSubscriber(Node):
    def __init__(self, topic):
        super().__init__('data_subscriber')
        
        self.get_logger().info(f'Subscribing to ROS topic: {topic}')

        self._latest_raw = None          # latest raw JSON string
        self._latest_data = None         # latest decoded dict
        self._latest_stamp_ns = None     # time received (node clock)

        qos = QoSProfile(depth=1)  # keep only the newest message
        
        self.subscription = self.create_subscription(
            String,
            topic,
            self.listener_callback,
            qos
        )
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg: String):
        self._latest_raw = msg.data
        self._latest_stamp_ns = self.get_clock().now().nanoseconds

        try:
            self._latest_data = json.loads(msg.data)
        except json.JSONDecodeError as e:
            self._latest_data = None
            self.get_logger().error(f"Failed to decode message: {msg.data}, error: {e}")
            return
        except Exception as e:
            self._latest_data = None
            self.get_logger().error(f"Unexpected error in callback: {e}")
            return

        # Prob comment this out lol
        self.get_logger().info(f"Received data: {self._latest_data}")

    # Returns (data_dict_or_None, recv_time_ns_or_None)
    def get_latest(self):
        return self._latest_data, self._latest_stamp_ns
    
    def destroy_node(self):
        super().destroy_node()

def main(args=None):
    rclpy.init(args=args)
    node = DataSubscriber("spi_data")
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
