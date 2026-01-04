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
    input: str
    context: Dict[str, Any] = Field(default_factory=dict)


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


class AgentChatRequest(BaseModel):
    session_id: Optional[str] = None
    input: str


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
