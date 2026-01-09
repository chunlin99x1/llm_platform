"""
设置相关数据模型

包含模型提供商配置和用户管理。

Author: chunlin
"""

from tortoise import fields
from tortoise.models import Model


class ModelProvider(Model):
    """模型提供商配置"""
    
    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=50, unique=True)  # e.g. openai, dashscope
    description = fields.CharField(max_length=255, null=True)
    # provider_type 移除，改为由关联的 ProviderModel 定义
    api_key = fields.CharField(max_length=256)  # 加密存储
    api_base = fields.CharField(max_length=256, null=True)  # 自定义 API 地址
    enabled = fields.BooleanField(default=True)
    config = fields.JSONField(default=dict)  # 额外配置
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    models: fields.ReverseRelation["ProviderModel"]
    
    class Meta:
        table = "model_providers"


class ProviderModel(Model):
    """具体的模型配置"""
    
    id = fields.IntField(primary_key=True)
    provider = fields.ForeignKeyField("models.ModelProvider", related_name="models", on_delete=fields.CASCADE)
    name = fields.CharField(max_length=100)  # e.g. gpt-4, text-embedding-ada-002
    description = fields.CharField(max_length=255, null=True)
    model_type = fields.CharField(max_length=20)  # llm, embedding, rerank, tts
    enabled = fields.BooleanField(default=True)
    config = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    class Meta:
        table = "provider_models"
        unique_together = (("provider", "name", "model_type"),)


class User(Model):
    """用户"""
    
    id = fields.IntField(primary_key=True)
    email = fields.CharField(max_length=128, unique=True)
    password_hash = fields.CharField(max_length=256)  # bcrypt hash
    name = fields.CharField(max_length=64, null=True)
    role = fields.CharField(max_length=20, default="user")  # admin, user
    is_active = fields.BooleanField(default=True)
    last_login_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    class Meta:
        table = "users"
