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
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class Document(Model):
    """文档"""
    id = fields.IntField(pk=True)
    knowledge_base_id = fields.IntField(index=True)
    name = fields.CharField(max_length=255)
    content = fields.TextField()
    metadata = fields.JSONField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class DocumentSegment(Model):
    """文档片段"""
    id = fields.IntField(pk=True)
    document_id = fields.IntField(index=True)
    content = fields.TextField()
    position = fields.IntField(default=0)
    tokens = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)
