from tortoise import fields
from tortoise.models import Model


class Agent(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    description = fields.TextField(null=True)
    system_prompt = fields.TextField(null=True)
    enabled_tools = fields.JSONField(null=True)  # list[str]
    created_at = fields.DatetimeField(auto_now_add=True)


class AgentSession(Model):
    id = fields.UUIDField(pk=True)
    agent: fields.ForeignKeyRelation[Agent] = fields.ForeignKeyField("models.Agent", related_name="sessions")
    title = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)


class AgentMessage(Model):
    id = fields.IntField(pk=True)
    session: fields.ForeignKeyRelation[AgentSession] = fields.ForeignKeyField("models.AgentSession", related_name="messages")
    role = fields.CharField(max_length=32)  # system/user/assistant/tool
    content = fields.TextField()
    name = fields.CharField(max_length=255, null=True)  # tool name, etc.
    tool_call_id = fields.CharField(max_length=128, null=True)
    tool_calls = fields.JSONField(null=True)  # for assistant messages
    created_at = fields.DatetimeField(auto_now_add=True)


class App(Model):
    """
    应用：对标 Dify 的 App 概念（workflow/chatflow/agent 等）。
    这里先做最小可用：name + mode。
    """

    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    mode = fields.CharField(max_length=32, default="workflow")  # workflow/chatflow/agent
    published = fields.BooleanField(default=False)  # 是否已发布
    api_key = fields.CharField(max_length=128, null=True)  # 发布的 API Key
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class WorkflowDef(Model):
    """
    应用的编排定义（图结构 JSON）。
    """

    id = fields.IntField(pk=True)
    app: fields.OneToOneRelation[App] = fields.OneToOneField("models.App", related_name="workflow_def")
    graph = fields.JSONField(null=True)  # {nodes:[], edges:[], ...}
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


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
    role = fields.CharField(max_length=32)  # system/user/assistant/tool
    content = fields.TextField()
    name = fields.CharField(max_length=255, null=True)  # tool name
    tool_call_id = fields.CharField(max_length=128, null=True)
    tool_calls = fields.JSONField(null=True)  # for assistant messages
    session_id = fields.CharField(max_length=64, index=True, default="default")
    created_at = fields.DatetimeField(auto_now_add=True)
