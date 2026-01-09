"""
Agent 相关模型
"""

from tortoise import fields
from tortoise.models import Model


class Agent(Model):
    """智能体"""
    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255, unique=True)
    description = fields.TextField(null=True)
    system_prompt = fields.TextField(null=True)
    enabled_tools = fields.JSONField(null=True)  # list[str]
    created_at = fields.DatetimeField(auto_now_add=True)


class AgentSession(Model):
    """智能体会话"""
    id = fields.UUIDField(primary_key=True)
    agent: fields.ForeignKeyRelation["Agent"] = fields.ForeignKeyField(
        "models.Agent", related_name="sessions"
    )
    title = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class AgentMessage(Model):
    """智能体消息"""
    id = fields.IntField(primary_key=True)
    session: fields.ForeignKeyRelation["AgentSession"] = fields.ForeignKeyField(
        "models.AgentSession", related_name="messages"
    )
    role = fields.CharField(max_length=32)  # system/user/assistant/tool
    content = fields.TextField()
    name = fields.CharField(max_length=255, null=True)  # tool name
    tool_call_id = fields.CharField(max_length=128, null=True)
    tool_calls = fields.JSONField(null=True)  # for assistant messages
    created_at = fields.DatetimeField(auto_now_add=True)
