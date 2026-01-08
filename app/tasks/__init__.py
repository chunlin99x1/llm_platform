"""
Celery 任务模块
"""

from .celery_app import celery_app
from .indexing import index_document_task

__all__ = ["celery_app", "index_document_task"]
