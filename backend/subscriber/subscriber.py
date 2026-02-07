#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
from utils.config import settings
from utils.database import get_db_connection, return_db_connection
from utils.redis_client import get_redis_client

class SpiSubscriber(Node):
    def __init__(self):
        super().__init__('spi_subscriber')
        
        # Subscribe to SPI data topic
        self.get_logger().info('Subscribing to ROS topic: spi_data')
        
        self.subscription = self.create_subscription(
            String,
            'spi_data',
            self.listener_callback,
            10
        )
        self.subscription  # prevent unused variable warning
        
        # Initialize database connections
        self.init_databases()

    def init_databases(self):
        """Initialize PostgreSQL and Redis connections."""
        # PostgreSQL - initialize connection pool and create table
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Create table if not exists
            create_table_query = """
            CREATE TABLE IF NOT EXISTS race_data (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payload JSONB
            );
            """
            cursor.execute(create_table_query)
            conn.commit()
            cursor.close()
            return_db_connection(conn)
            self.get_logger().info('PostgreSQL connection pool initialized and table created')
        except Exception as e:
            self.get_logger().error(f'Failed to initialize PostgreSQL: {e}')
        
        # Redis connection - using shared utility
        try:
            self.redis_client = get_redis_client()
            self.get_logger().info('Connected to Redis')
        except Exception as e:
            self.get_logger().error(f'Failed to connect to Redis: {e}')
            self.redis_client = None

    def listener_callback(self, msg):
        try:
            data = json.loads(msg.data)  # convert JSON string back to dict
            self.get_logger().info(f"Received SPI data: {data}")
            
            # Write to PostgreSQL using connection pool
            conn = None
            cursor = None
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                insert_query = "INSERT INTO race_data (payload) VALUES (%s::jsonb);"
                cursor.execute(insert_query, (json.dumps(data),))
                conn.commit()
                self.get_logger().info('Inserted data into PostgreSQL')
            except Exception as e:
                self.get_logger().error(f'PostgreSQL insert error: {e}')
                if conn:
                    conn.rollback()
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    return_db_connection(conn)
            
            # Write to Redis (latest value)
            if self.redis_client:
                try:
                    self.redis_client.set('latest_telemetry', json.dumps(data))
                    self.get_logger().info('Updated Redis with latest data')
                except Exception as e:
                    self.get_logger().error(f'Redis update error: {e}')
            else:
                self.get_logger().warn('Redis connection not available')
                    
        except json.JSONDecodeError as e:
            self.get_logger().error(f"Failed to decode message: {msg.data}, error: {e}")
        except Exception as e:
            self.get_logger().error(f"Unexpected error in callback: {e}")
    
    def destroy_node(self):
        """Clean up database connections."""
        # Redis connection cleanup
        if self.redis_client:
            self.redis_client.close()
        # PostgreSQL connection pool is managed globally, will be cleaned up on process exit
        self.get_logger().info('Database connections closed')
        super().destroy_node()

def main(args=None):
    rclpy.init(args=args)
    node = SpiSubscriber()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()