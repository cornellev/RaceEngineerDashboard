"""PostgreSQL database connection utilities."""
import psycopg2
from psycopg2 import pool, Error
from typing import Optional
from api.config import settings


# Connection pool (will be initialized on first use)
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_connection_pool() -> pool.ThreadedConnectionPool:
    """Get or create PostgreSQL connection pool."""
    global _connection_pool
    
    if _connection_pool is None:
        try:
            _connection_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                database=settings.POSTGRES_DB,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD
            )
        except Error as e:
            raise ConnectionError(f"Failed to create connection pool: {e}")
    
    return _connection_pool


def get_db_connection():
    """Get a PostgreSQL database connection from the pool.
    
    Returns:
        psycopg2.connection: Database connection object
        
    Raises:
        ConnectionError: If connection cannot be established
    """
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
        if conn is None:
            raise ConnectionError("Failed to get connection from pool")
        return conn
    except Error as e:
        raise ConnectionError(f"Database connection error: {e}")


def return_db_connection(conn):
    """Return a database connection to the pool.
    
    Args:
        conn: Database connection to return
    """
    if conn and _connection_pool:
        try:
            _connection_pool.putconn(conn)
        except Exception as e:
            print(f"Error returning connection to pool: {e}")


def close_all_connections():
    """Close all connections in the pool."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None

