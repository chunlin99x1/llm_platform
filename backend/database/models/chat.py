"""
会话与消息模型

提供统一的会话管理和消息存储，支持 Agent 和 Chatflow 应用。
"""

from tortoise import fields
from tortoise.models import Model

from .app import App


class Conversation(Model):
    """
    会话模型
    
    用于管理 Agent 和 Chatflow 应用的对话会话。
    """
    id = fields.UUIDField(primary_key=True)
    app: fields.ForeignKeyRelation[App] = fields.ForeignKeyField(
        "models.App", related_name="conversations"
    )
    name = fields.CharField(max_length=255, null=True)  # 会话标题
    user_id = fields.CharField(max_length=64, null=True, index=True)  # 用户 ID
    status = fields.CharField(max_length=32, default="active")  # active/archived
    
    # 会话级变量（用于 Chatflow 会话变量传递）
    variables = fields.JSONField(default=dict)
    
    # 会话统计
    message_count = fields.IntField(default=0)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "conversations"
        indexes = [("app_id", "user_id")]


class Message(Model):
    """
    消息模型
    
    存储会话中的所有消息，包括用户输入、AI 回复、工具调用等。
    """
    id = fields.IntField(primary_key=True)
    conversation: fields.ForeignKeyRelation[Conversation] = fields.ForeignKeyField(
        "models.Conversation", related_name="messages"
    )
    
    # 消息基本信息
    role = fields.CharField(max_length=32)  # system/user/assistant/tool
    content = fields.TextField()
    
    # 工具调用相关
    name = fields.CharField(max_length=255, null=True)  # 工具名称
    tool_call_id = fields.CharField(max_length=128, null=True)  # 工具调用 ID
    tool_calls = fields.JSONField(null=True)  # assistant 消息的工具调用列表
    
    # 消息元数据
    metadata = fields.JSONField(default=dict)  # 额外元数据（tokens、model 等）
    
    # 关联的 workflow run（如果是 Chatflow/Workflow 执行产生的消息）
    workflow_run_id = fields.IntField(null=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "messages"
        ordering = ["id"]
