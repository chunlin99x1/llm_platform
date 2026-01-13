"""
App 应用模型
"""

from tortoise import fields
from tortoise.models import Model

from core.enums import AppMode


class App(Model):
    """
    应用：对标 Dify 的 App 概念（workflow/chatflow/agent 等）。
    """
    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255, unique=True)
    description = fields.TextField(default="")
    mode = fields.CharField(max_length=32, default=AppMode.WORKFLOW.value)  # workflow/chatflow/agent
    icon = fields.CharField(max_length=255, null=True)
    icon_background = fields.CharField(max_length=32, null=True)
    published = fields.BooleanField(default=False)  # 是否已发布
    api_key = fields.CharField(max_length=128, null=True)  # 发布的 API Key
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    @property
    def app_mode(self) -> AppMode:
        """获取 AppMode 枚举值"""
        return AppMode.value_of(self.mode)

    @property
    def is_workflow(self) -> bool:
        """是否为 Workflow 应用"""
        return self.mode == AppMode.WORKFLOW.value

    @property
    def is_chatflow(self) -> bool:
        """是否为 Chatflow 应用"""
        return self.mode == AppMode.CHATFLOW.value

    @property
    def is_agent(self) -> bool:
        """是否为 Agent 应用"""
        return self.mode == AppMode.AGENT.value

    class Meta:
        table = "apps"
