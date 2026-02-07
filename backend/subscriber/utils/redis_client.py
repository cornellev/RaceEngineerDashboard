"""Redis client connection utilities."""
import redis
from typing import Optional
from utils.config import settings


# Global Redis client instance
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client connection.
    
    Returns:
        redis.Redis: Redis client instance
        
    Raises:
        ConnectionError: If connection cannot be established
    """
    global _redis_client
    
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            _redis_client.ping()
        except redis.ConnectionError as e:
            raise ConnectionError(f"Failed to connect to Redis: {e}")
        except Exception as e:
            raise ConnectionError(f"Redis connection error: {e}")
    
    return _redis_client

