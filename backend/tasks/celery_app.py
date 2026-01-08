"""
Celery 配置

使用 Redis 作为消息队列。
统一管理 Worker 进程的资源初始化（数据库 + 向量库）。

Author: chunlin
"""
from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
import asyncio
from configs import get_settings
from core.rag.db_conn import get_weaviate_client, close_weaviate_client

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

# ============================================================
# 全局资源管理 (Database + Weaviate)
# ============================================================

@worker_process_init.connect
def init_worker_resources(**kwargs):
    """
    Worker 进程启动时初始化所有资源
    """
    print(f"[Celery Worker] Initializing resources for PID: {kwargs.get('pid')}")

    # Weaviate 是单例且跨 Loop 安全（通常），可以全局初始化
    try:
        get_weaviate_client()
        print("[Celery Worker] Weaviate connection initialized.")
    except Exception as e:
        print(f"[Celery Worker] Weaviate init failed: {e}")


@worker_process_shutdown.connect
def close_worker_resources(**kwargs):
    """
    Worker 进程关闭时清理所有资源
    """
    print("[Celery Worker] Shutting down resources...")

    # 关闭 Weaviate
    try:
        close_weaviate_client()
        print("[Celery Worker] Weaviate connection closed.")
    except Exception as e:
        print(f"[Celery Worker] Weaviate close failed: {e}")
