"""
Chat 聊天模型
"""

from tortoise import fields
from tortoise.models import Model


class ChatMessage(Model):
    """聊天消息"""
    id = fields.IntField(pk=True)
    role = fields.CharField(max_length=32)  # system/user/assistant/tool
    content = fields.TextField()
    name = fields.CharField(max_length=255, null=True)  # tool name
    tool_call_id = fields.CharField(max_length=128, null=True)
    tool_calls = fields.JSONField(null=True)  # for assistant messages
    session_id = fields.CharField(max_length=64, index=True, default="default")
    created_at = fields.DatetimeField(auto_now_add=True)
