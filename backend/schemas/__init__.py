from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MessagePayload(BaseModel):
    role: str = Field(default="user")
    content: str


class ChatRequest(BaseModel):
    messages: List[MessagePayload]
    session_id: Optional[str] = Field(default="default")


class ChatResponse(BaseModel):
    content: str


class WorkflowRunRequest(BaseModel):
    input: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    graph: Optional[Dict[str, Any]] = None  # 支持直接传入图配置
    response_mode: str = "streaming"
    user: Optional[str] = None


class WorkflowRunResponse(BaseModel):
    run_id: int
    output: str


class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    enabled_tools: List[str] = Field(default_factory=list)


class AgentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    enabled_tools: List[str] = Field(default_factory=list)


class AgentSessionCreateRequest(BaseModel):
    title: Optional[str] = None


class AgentSessionResponse(BaseModel):
    session_id: str


class KnowledgeSettings(BaseModel):
    """知识库检索设置"""
    top_k: int = 3
    retrieval_mode: str = "hybrid"  # semantic, keyword, hybrid
    score_threshold: float = 0.0
    rerank_enabled: bool = False
    rerank_provider: Optional[str] = None  # 重排序模型供应商（覆盖知识库默认配置）
    rerank_model: Optional[str] = None  # 重排序模型名称（覆盖知识库默认配置）
    rerank_top_k: int = 3  # 重排序返回数量
    fallback_to_model: bool = True


class AgentChatRequest(BaseModel):
    session_id: Optional[str] = None
    input: str
    instructions: Optional[str] = None
    enabled_tools: Optional[List[str]] = None
    llm_config: Optional[Dict[str, Any]] = None
    mcp_servers: Optional[List[Dict[str, Any]]] = None
    knowledge_base_ids: Optional[List[int]] = None  # 关联的知识库 ID 列表
    knowledge_settings: Optional[KnowledgeSettings] = None  # 知识库检索设置
    inputs: Dict[str, Any] = Field(default_factory=dict)


class AgentToolTrace(BaseModel):
    id: str
    name: Optional[str] = None
    args: Dict[str, Any] = Field(default_factory=dict)
    result: str


class AgentChatResponse(BaseModel):
    session_id: str
    content: str
    tool_traces: List[AgentToolTrace] = Field(default_factory=list)


class AgentMessageResponse(BaseModel):
    role: str
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None


class AppCreateRequest(BaseModel):
    name: str
    mode: str = Field(default="workflow")  # workflow/chatflow/agent


class AppResponse(BaseModel):
    id: int
    name: str
    mode: str


class WorkflowDefResponse(BaseModel):
    app_id: int
    graph: Dict[str, Any] = Field(default_factory=dict)


class WorkflowDefUpdateRequest(BaseModel):
    graph: Dict[str, Any]


# ============== 工作流节点配置相关 ==============

class NodeTypeInfo(BaseModel):
    """节点类型信息"""
    type: str
    label: str
    icon: str
    color: str
    description: Optional[str] = None


class NodeTypesResponse(BaseModel):
    """节点类型列表响应"""
    nodes: List[NodeTypeInfo]


class ModelInfo(BaseModel):
    """模型信息"""
    id: str
    name: str
    provider: str
    max_tokens: Optional[int] = None


class ModelsResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelInfo]


class ToolInfo(BaseModel):
    """工具信息"""
    name: str
    label: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolsResponse(BaseModel):
    """工具列表响应"""
    tools: List[ToolInfo]


class VariableTypeInfo(BaseModel):
    """变量类型信息"""
    type: str
    label: str
    color: str


class VariableTypesResponse(BaseModel):
    """变量类型列表响应"""
    types: List[VariableTypeInfo]
