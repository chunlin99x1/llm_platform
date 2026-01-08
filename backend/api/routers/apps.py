"""
应用路由模块

提供应用管理、工作流配置、Agent 聊天等 API 接口。

Author: chunlin
"""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from tortoise.exceptions import IntegrityError

from services import AppService, ChatService, WorkflowService
from schemas import (
    AgentChatRequest,
    AppCreateRequest,
    AppResponse,
    WorkflowDefResponse,
    WorkflowDefUpdateRequest,
)

router = APIRouter(prefix="/apps", tags=["apps"])


@router.post("", response_model=AppResponse)
async def create_app(payload: AppCreateRequest):
    """Create a new application."""
    try:
        return await AppService.create_app(payload)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="应用名称已存在")


@router.get("", response_model=list[AppResponse])
async def list_apps(name: str = None, mode: str = None):
    """List all applications with optional filtering."""
    return await AppService.list_apps(name, mode)


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(app_id: int):
    """Get application by ID."""
    app_response = await AppService.get_app_response(app_id)
    if not app_response:
        raise HTTPException(status_code=404, detail="应用不存在")
    return app_response


@router.get("/{app_id}/workflow", response_model=WorkflowDefResponse)
async def get_workflow(app_id: int):
    """Get workflow definition for an application."""
    workflow_response = await WorkflowService.get_workflow_response(app_id)
    if not workflow_response:
        raise HTTPException(status_code=404, detail="编排不存在")
    return workflow_response


@router.put("/{app_id}/workflow", response_model=WorkflowDefResponse)
async def update_workflow(app_id: int, payload: WorkflowDefUpdateRequest):
    """Update workflow definition."""
    workflow_response = await WorkflowService.update_workflow_definition(app_id, payload)
    if not workflow_response:
        raise HTTPException(status_code=404, detail="编排不存在")
    return workflow_response


@router.post("/{app_id}/chat")
async def app_chat(app_id: int, payload: AgentChatRequest):
    """
    App Chat endpoint - Developer testing console.
    
    Supports flexible configuration and can chat with unpublished drafts.
    Currently only supports Agent mode.
    """
    app = await AppService.get_app(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")

    # Only Agent mode is supported for this endpoint
    if app.mode != "agent":
        raise HTTPException(status_code=400, detail="该应用模式不支持对话接口")

    # Get workflow configuration
    wf = await WorkflowService.get_workflow_definition(app_id)
    if not wf or not wf.graph:
        raise HTTPException(status_code=404, detail="应用编排定义不存在")

    # Use provided configuration or fall back to saved configuration
    instructions = payload.instructions if payload.instructions is not None else wf.graph.get("instructions", "")
    enabled_tools = payload.enabled_tools if payload.enabled_tools is not None else wf.graph.get("enabled_tools", [])
    mcp_servers = payload.mcp_servers if payload.mcp_servers is not None else wf.graph.get("mcp_servers", [])

    # Load chat history
    session_id = payload.session_id or "preview_default"
    history = await ChatService.load_chat_history(session_id)

    async def stream_generator():
        """Generate SSE stream for chat response."""
        async for item in ChatService.process_agent_chat(
            session_id=session_id,
            user_input=payload.input,
            instructions=instructions,
            enabled_tools=enabled_tools,
            history=history,
            inputs=payload.inputs,
            mcp_servers=mcp_servers
        ):
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
