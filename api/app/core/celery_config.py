from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "openmemoryx",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.services.memory_queue"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    
    timezone="UTC",
    enable_utc=True,
    
    worker_concurrency=2,
    worker_prefetch_multiplier=1,
    
    task_time_limit=300,
    task_soft_time_limit=240,
    
    task_max_retries=3,
    task_default_retry_delay=10,
    
    result_expires=3600,
    
    task_default_queue="memory_free",
)

celery_app.conf.task_queues = {
    "memory_pro": {
        "exchange": "memory_pro",
        "routing_key": "memory_pro",
    },
    "memory_free": {
        "exchange": "memory_free",
        "routing_key": "memory_free",
    },
}
