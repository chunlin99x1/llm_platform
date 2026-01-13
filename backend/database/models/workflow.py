"""
Workflow 相关模型
"""
import json
from typing import Any

from tortoise import fields
from tortoise.models import Model

from .app import App
from core.enums import WorkflowType


class WorkflowDef(Model):
    """工作流定义（图结构 JSON）"""
    id = fields.IntField(primary_key=True)
    app: fields.OneToOneRelation[App] = fields.OneToOneField(
        "models.App", related_name="workflow_def"
    )
    type = fields.CharField(max_length=32, default=WorkflowType.WORKFLOW.value)  # workflow/chat
    version = fields.CharField(max_length=32, default="draft")  # draft 或版本号
    graph = fields.JSONField(null=True)  # {nodes:[], edges:[], ...}
    features = fields.JSONField(null=True)  # 功能配置
    environment_variables = fields.JSONField(default=dict)  # 环境变量
    conversation_variables = fields.JSONField(default=dict)  # 会话变量定义（仅 Chatflow）
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    @property
    def workflow_type(self) -> WorkflowType:
        """获取 WorkflowType 枚举值"""
        return WorkflowType(self.type)

    @property
    def is_chat_workflow(self) -> bool:
        """是否为对话型工作流（Chatflow）"""
        return self.type == WorkflowType.CHATFLOW.value

    @property
    def graph_dict(self) -> dict:
        """获取图结构字典"""
        return self.graph or {}

    @property
    def nodes(self) -> list[dict]:
        """获取节点列表"""
        return self.graph_dict.get("nodes", [])

    @property
    def edges(self) -> list[dict]:
        """获取边列表"""
        return self.graph_dict.get("edges", [])

    class Meta:
        table = "workflow_defs"


class WorkflowRun(Model):
    """工作流运行记录"""
    id = fields.IntField(primary_key=True)
    app: fields.ForeignKeyRelation[App] = fields.ForeignKeyField(
        "models.App", related_name="workflow_runs", null=True
    )
    workflow_def: fields.ForeignKeyRelation[WorkflowDef] = fields.ForeignKeyField(
        "models.WorkflowDef", related_name="runs", null=True
    )
    type = fields.CharField(max_length=32, default=WorkflowType.WORKFLOW.value)
    triggered_from = fields.CharField(max_length=32, default="app-run")  # debugging/app-run
    version = fields.CharField(max_length=32, null=True)
    graph = fields.JSONField(null=True)  # 运行时的图快照
    inputs = fields.JSONField(null=True)  # 输入参数
    outputs = fields.JSONField(null=True)  # 输出结果
    status = fields.CharField(max_length=32, default="pending")  # pending/running/succeeded/failed/stopped
    error = fields.TextField(null=True)
    elapsed_time = fields.FloatField(default=0)  # 执行时间(秒)
    total_tokens = fields.IntField(default=0)
    total_steps = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)
    finished_at = fields.DatetimeField(null=True)

    class Meta:
        table = "workflow_runs"


class NodeRun(Model):
    """节点运行记录"""
    id = fields.IntField(primary_key=True)
    workflow_run: fields.ForeignKeyRelation[WorkflowRun] = fields.ForeignKeyField(
        "models.WorkflowRun", related_name="node_runs"
    )
    node_id = fields.CharField(max_length=64)  # 节点 ID
    node_type = fields.CharField(max_length=64)  # 节点类型
    title = fields.CharField(max_length=255, null=True)
    index = fields.IntField(default=0)  # 执行顺序
    predecessor_node_id = fields.CharField(max_length=64, null=True)  # 前置节点 ID
    inputs = fields.JSONField(null=True)
    outputs = fields.JSONField(null=True)
    process_data = fields.JSONField(null=True)  # 处理过程数据
    status = fields.CharField(max_length=32, default="pending")
    error = fields.TextField(null=True)
    elapsed_time = fields.FloatField(default=0)
    execution_metadata = fields.JSONField(null=True)  # 元数据（tokens、cost 等）
    created_at = fields.DatetimeField(auto_now_add=True)
    finished_at = fields.DatetimeField(null=True)

    class Meta:
        table = "node_runs"


class ConversationVariable(Model):
    """
    会话变量 - 仅 Chatflow 使用
    用于在多轮对话中持久化变量状态
    """
    id = fields.IntField(primary_key=True)
    app: fields.ForeignKeyRelation[App] = fields.ForeignKeyField(
        "models.App", related_name="conversation_variables"
    )
    conversation_id = fields.CharField(max_length=64, index=True)
    variable_id = fields.CharField(max_length=64)  # 变量 ID
    variable_name = fields.CharField(max_length=255)  # 变量名
    variable_type = fields.CharField(max_length=32)  # string/number/object/array
    value = fields.JSONField(null=True)  # 变量值
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "conversation_variables"
        unique_together = (("app_id", "conversation_id", "variable_id"),)
