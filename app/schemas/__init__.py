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
