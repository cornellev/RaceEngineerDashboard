#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import psycopg2
import json


class TelemetryLogger(Node):
    def __init__(self):
        super().__init__('telemetry_logger')
        
        # Connect to PostgreSQL database
        self.get_logger().info('Connecting to PostgreSQL database...')
        self.conn = psycopg2.connect(
            host='localhost',
            user='postgres',
            database='telemetry_db'
        )
        self.cursor = self.conn.cursor()
        self.get_logger().info('Connected to PostgreSQL database')
        
        # Create table if not exists
        self.get_logger().info('Creating race_data table if not exists...')
        create_table_query = """
        CREATE TABLE IF NOT EXISTS race_data (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            payload JSONB
        );
        """
        self.cursor.execute(create_table_query)
        self.conn.commit()
        self.get_logger().info('Table race_data ready')
        
        # Subscribe to telemetry topic
        self.subscription = self.create_subscription(
            String,
            '/car/telemetry',
            self.telemetry_callback,
            10
        )
        self.get_logger().info('Subscribed to /car/telemetry topic')
    
    def telemetry_callback(self, msg):
        try:
            # Parse incoming message data as JSON
            json_data = json.loads(msg.data)
            
            # Insert into database
            insert_query = "INSERT INTO race_data (payload) VALUES (%s::jsonb);"
            self.cursor.execute(insert_query, (json.dumps(json_data),))
            self.conn.commit()
            
            self.get_logger().debug(f'Inserted telemetry data: {msg.data}')
        except json.JSONDecodeError as e:
            self.get_logger().error(f'Failed to parse JSON: {e}')
        except psycopg2.Error as e:
            self.get_logger().error(f'Database error: {e}')
            self.conn.rollback()
        except Exception as e:
            self.get_logger().error(f'Unexpected error: {e}')
    
    def destroy_node(self):
        # Clean up database connection
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        self.get_logger().info('Database connection closed')
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    
    telemetry_logger = TelemetryLogger()
    
    try:
        rclpy.spin(telemetry_logger)
    except KeyboardInterrupt:
        pass
    finally:
        telemetry_logger.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()

