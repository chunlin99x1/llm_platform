"""
Knowledge 知识库相关模型
"""

from tortoise import fields
from tortoise.models import Model


class KnowledgeBase(Model):
    """知识库"""
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    embedding_provider = fields.CharField(max_length=32, default="openai")
    embedding_model = fields.CharField(max_length=128, null=True)
    retrieval_mode = fields.CharField(max_length=32, default="hybrid")
    indexing_config = fields.JSONField(null=True)  # 默认索引配置：chunk_size, overlap 等
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Document(Model):
    """文档"""
    id = fields.IntField(pk=True)
    knowledge_base_id = fields.IntField(index=True)
    name = fields.CharField(max_length=255)
    content = fields.TextField()
    metadata = fields.JSONField(null=True)
    # 索引状态: pending, indexing, completed, error
    status = fields.CharField(max_length=32, default="pending")
    enabled = fields.BooleanField(default=True)  # 是否启用
    archived = fields.BooleanField(default=False)  # 是否归档（软删除）
    word_count = fields.IntField(default=0)  # 字符数
    segment_count = fields.IntField(default=0)  # 分段数
    error_message = fields.TextField(null=True)  # 错误信息
    indexing_task_id = fields.CharField(max_length=128, null=True)  # Celery 任务 ID
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class DocumentSegment(Model):
    """文档片段"""
    id = fields.IntField(pk=True)
    document_id = fields.IntField(index=True)
    content = fields.TextField()
    position = fields.IntField(default=0)
    tokens = fields.IntField(default=0)
    keywords = fields.JSONField(null=True)  # 关键词列表
    hit_count = fields.IntField(default=0)  # 命中次数
    enabled = fields.BooleanField(default=True)  # 是否启用
    created_at = fields.DatetimeField(auto_now_add=True)
