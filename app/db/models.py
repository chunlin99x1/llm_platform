from tortoise import fields
from tortoise.models import Model


class WorkflowRun(Model):
    id = fields.IntField(pk=True)
    workflow_name = fields.CharField(max_length=255)
    status = fields.CharField(max_length=32, default="pending")
    input_text = fields.TextField(null=True)
    output_text = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class NodeRun(Model):
    id = fields.IntField(pk=True)
    workflow_run: fields.ForeignKeyRelation[WorkflowRun] = fields.ForeignKeyField(
        "models.WorkflowRun", related_name="nodes"
    )
    node_name = fields.CharField(max_length=255)
    status = fields.CharField(max_length=32, default="pending")
    payload = fields.JSONField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class ChatMessage(Model):
    id = fields.IntField(pk=True)
    role = fields.CharField(max_length=32)
    content = fields.TextField()
    session_id = fields.CharField(max_length=64, index=True, default="default")
    created_at = fields.DatetimeField(auto_now_add=True)
