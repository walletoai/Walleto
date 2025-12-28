import json
import redis
import os

# Redis connection
REDIS_URL = os.getenv("REDIS_URL")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Default cache TTL (seconds)
CACHE_TTL_SECONDS = 60

def get_cache_value(key: str):
    raw = redis_client.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None

def set_cache_value(key: str, value, ttl: int = CACHE_TTL_SECONDS):
    redis_client.setex(key, ttl, json.dumps(value))
