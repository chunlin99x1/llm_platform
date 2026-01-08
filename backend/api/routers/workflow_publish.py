"""
工作流发布 API

将工作流发布为独立的 API 端点。

Author: chunlin
"""

import json
import secrets
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.models import App, WorkflowDef
from api.routers.workflow_stream import stream_workflow_execution

router = APIRouter(prefix="/published", tags=["workflow-publish"])


class PublishRequest(BaseModel):
    """发布请求"""
    api_key_enabled: bool = True


class PublishResponse(BaseModel):
    """发布响应"""
    published: bool
    api_endpoint: str
    api_key: Optional[str] = None


class RunPublishedRequest(BaseModel):
    """运行已发布工作流请求"""
    input: str
    variables: dict = {}


@router.post("/apps/{app_id}/publish", response_model=PublishResponse)
async def publish_workflow(app_id: int, payload: PublishRequest):
    """
    发布工作流为 API 端点。
    """
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    workflow_def = await WorkflowDef.get_or_none(app_id=app_id)
    if not workflow_def:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # 生成 API Key（如果启用）
    api_key = None
    if payload.api_key_enabled:
        api_key = f"wf-{secrets.token_urlsafe(32)}"
    
    # 更新发布状态
    app.published = True
    app.api_key = api_key
    await app.save()
    
    return PublishResponse(
        published=True,
        api_endpoint=f"/api/published/apps/{app_id}/run",
        api_key=api_key
    )


@router.post("/apps/{app_id}/unpublish")
async def unpublish_workflow(app_id: int):
    """
    取消发布工作流。
    """
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    app.published = False
    app.api_key = None
    await app.save()
    
    return {"unpublished": True}


async def verify_api_key(
    app_id: int,
    authorization: Optional[str] = Header(None)
) -> App:
    """验证 API Key"""
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    if not app.published:
        raise HTTPException(status_code=403, detail="Workflow not published")
    
    if app.api_key:
        if not authorization:
            raise HTTPException(status_code=401, detail="API key required")
        
        # 支持 Bearer token 格式
        token = authorization.replace("Bearer ", "")
        if token != app.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
    
    return app


@router.post("/apps/{app_id}/run")
async def run_published_workflow(
    app_id: int,
    payload: RunPublishedRequest,
    authorization: Optional[str] = Header(None)
):
    """
    运行已发布的工作流。
    """
    # 验证 API Key
    app = await verify_api_key(app_id, authorization)
    
    # 构建上下文
    context = {"app_id": app_id, **payload.variables}
    
    return StreamingResponse(
        stream_workflow_execution(app_id, payload.input, context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/apps/{app_id}/status")
async def get_publish_status(app_id: int):
    """
    获取工作流发布状态。
    """
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    return {
        "app_id": app_id,
        "published": getattr(app, 'published', False),
        "api_endpoint": f"/api/published/apps/{app_id}/run" if getattr(app, 'published', False) else None,
        "api_key_enabled": bool(getattr(app, 'api_key', None))
    }
