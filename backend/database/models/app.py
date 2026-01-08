"""
App 应用模型
"""

from tortoise import fields
from tortoise.models import Model


class App(Model):
    """
    应用：对标 Dify 的 App 概念（workflow/chatflow/agent 等）。
    """
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    mode = fields.CharField(max_length=32, default="workflow")  # workflow/chatflow/agent
    published = fields.BooleanField(default=False)  # 是否已发布
    api_key = fields.CharField(max_length=128, null=True)  # 发布的 API Key
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
