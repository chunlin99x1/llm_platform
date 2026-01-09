"""
Workflow 相关模型
"""

from tortoise import fields
from tortoise.models import Model

from .app import App


class WorkflowDef(Model):
    """工作流定义（图结构 JSON）"""
    id = fields.IntField(primary_key=True)
    app: fields.OneToOneRelation[App] = fields.OneToOneField(
        "models.App", related_name="workflow_def"
    )
    graph = fields.JSONField(null=True)  # {nodes:[], edges:[], ...}
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class WorkflowRun(Model):
    """工作流运行记录"""
    id = fields.IntField(primary_key=True)
    workflow_name = fields.CharField(max_length=255)
    status = fields.CharField(max_length=32, default="pending")
    input_text = fields.TextField(null=True)
    output_text = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class NodeRun(Model):
    """节点运行记录"""
    id = fields.IntField(primary_key=True)
    workflow_run: fields.ForeignKeyRelation[WorkflowRun] = fields.ForeignKeyField(
        "models.WorkflowRun", related_name="nodes"
    )
    node_name = fields.CharField(max_length=255)
    status = fields.CharField(max_length=32, default="pending")
    payload = fields.JSONField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
