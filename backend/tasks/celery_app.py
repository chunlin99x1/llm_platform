"""
Celery 配置

使用 Redis 作为消息队列。

Author: chunlin
"""

from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
from configs import get_settings


# 获取配置
settings = get_settings()
# Celery 实例
celery_app = Celery(
    "llmops",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.indexing"]
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


# ============== 数据库连接管理 ==============
from celery.signals import worker_process_init, worker_process_shutdown
import asyncio
from database.connection import init_db, close_db

@worker_process_init.connect
def init_worker_db(**kwargs):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(init_db())

@worker_process_shutdown.connect
def close_worker_db(**kwargs):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(close_db())
