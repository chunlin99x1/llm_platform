"""
Celery 配置

使用 Redis 作为消息队列。

Author: chunlin
"""

from celery import Celery
from app.configs import get_settings

# 获取配置
settings = get_settings()

# Celery 实例
celery_app = Celery(
    "llmops",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.indexing"]
)

# 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,  # 结果过期时间 1 小时
)
