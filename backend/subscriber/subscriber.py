#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import os
import psycopg2
import redis

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
        
        # Database connection settings from environment variables
        self.postgres_host = os.getenv('POSTGRES_HOST', 'postgres')
        self.postgres_port = int(os.getenv('POSTGRES_PORT', '5432'))
        self.postgres_db = os.getenv('POSTGRES_DB', 'telemetry_db')
        self.postgres_user = os.getenv('POSTGRES_USER', 'postgres')
        self.postgres_password = os.getenv('POSTGRES_PASSWORD', 'password')
        
        self.redis_host = os.getenv('REDIS_HOST', 'redis')
        self.redis_port = int(os.getenv('REDIS_PORT', '6379'))
        self.redis_db = int(os.getenv('REDIS_DB', '0'))
        
        # Initialize database connections
        self.init_databases()

    def init_databases(self):
        """Initialize PostgreSQL and Redis connections."""
        # PostgreSQL connection
        try:
            self.pg_conn = psycopg2.connect(
                host=self.postgres_host,
                port=self.postgres_port,
                database=self.postgres_db,
                user=self.postgres_user,
                password=self.postgres_password
            )
            self.pg_cursor = self.pg_conn.cursor()
            
            # Create table if not exists
            create_table_query = """
            CREATE TABLE IF NOT EXISTS race_data (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payload JSONB
            );
            """
            self.pg_cursor.execute(create_table_query)
            self.pg_conn.commit()
            self.get_logger().info('Connected to PostgreSQL and created table')
        except Exception as e:
            self.get_logger().error(f'Failed to connect to PostgreSQL: {e}')
            self.pg_conn = None
            self.pg_cursor = None
        
        # Redis connection
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                decode_responses=True
            )
            self.redis_client.ping()
            self.get_logger().info('Connected to Redis')
        except Exception as e:
            self.get_logger().error(f'Failed to connect to Redis: {e}')
            self.redis_client = None

    def listener_callback(self, msg):
        try:
            data = json.loads(msg.data)  # convert JSON string back to dict
            self.get_logger().debug(f"Received SPI data: {data}")
            
            # Write to PostgreSQL
            if self.pg_cursor and self.pg_conn:
                try:
                    insert_query = "INSERT INTO race_data (payload) VALUES (%s::jsonb);"
                    self.pg_cursor.execute(insert_query, (json.dumps(data),))
                    self.pg_conn.commit()
                    self.get_logger().debug('Inserted data into PostgreSQL')
                except Exception as e:
                    self.get_logger().error(f'PostgreSQL insert error: {e}')
                    self.pg_conn.rollback()
            
            # Write to Redis (latest value)
            if self.redis_client:
                try:
                    self.redis_client.set('latest_telemetry', json.dumps(data))
                    self.get_logger().debug('Updated Redis with latest data')
                except Exception as e:
                    self.get_logger().error(f'Redis update error: {e}')
                    
        except json.JSONDecodeError:
            self.get_logger().warn(f"Failed to decode message: {msg.data}")
    
    def destroy_node(self):
        """Clean up database connections."""
        if self.pg_cursor:
            self.pg_cursor.close()
        if self.pg_conn:
            self.pg_conn.close()
        if self.redis_client:
            self.redis_client.close()
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