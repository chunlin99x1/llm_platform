"""
会话管理 API 路由

提供 Conversation 的 CRUD 功能。

Author: chunlin
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.chat_service import ChatService
from database.models import Conversation, Message


router = APIRouter(prefix="/conversations", tags=["conversations"])


# ============== 请求/响应模型 ==============

class ConversationCreate(BaseModel):
    app_id: int
    name: Optional[str] = None
    user_id: Optional[str] = None


class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    app_id: int
    name: Optional[str]
    user_id: Optional[str]
    status: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    created_at: datetime


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int


# ============== 会话 API ==============

@router.post("", response_model=ConversationResponse)
async def create_conversation(payload: ConversationCreate):
    """创建新会话"""
    conversation = await ChatService.get_or_create_conversation(
        app_id=payload.app_id,
        user_id=payload.user_id,
        name=payload.name
    )
    
    return ConversationResponse(
        id=str(conversation.id),
        app_id=conversation.app_id,
        name=conversation.name,
        user_id=conversation.user_id,
        status=conversation.status,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at
    )


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    app_id: int,
    user_id: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0
):
    """获取会话列表"""
    conversations = await ChatService.list_conversations(
        app_id=app_id,
        user_id=user_id,
        limit=limit
    )
    
    # 简化：暂不计算 total
    result = [
        ConversationResponse(
            id=str(c.id),
            app_id=c.app_id,
            name=c.name,
            user_id=c.user_id,
            status=c.status,
            message_count=c.message_count,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in conversations
    ]
    
    return ConversationListResponse(conversations=result, total=len(result))


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str):
    """获取会话详情"""
    conversation = await ChatService.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    return ConversationResponse(
        id=str(conversation.id),
        app_id=conversation.app_id,
        name=conversation.name,
        user_id=conversation.user_id,
        status=conversation.status,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at
    )


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(conversation_id: str, payload: ConversationUpdate):
    """更新会话"""
    conversation = await Conversation.get_or_none(id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    if payload.name is not None:
        conversation.name = payload.name
    if payload.status is not None:
        conversation.status = payload.status
    
    await conversation.save()
    
    return ConversationResponse(
        id=str(conversation.id),
        app_id=conversation.app_id,
        name=conversation.name,
        user_id=conversation.user_id,
        status=conversation.status,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at
    )


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除会话（及其消息）"""
    conversation = await Conversation.get_or_none(id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # 删除相关消息
    await Message.filter(conversation_id=conversation_id).delete()
    # 删除会话
    await conversation.delete()
    
    return {"message": "删除成功"}


# ============== 消息 API ==============

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    conversation_id: str,
    limit: int = Query(default=50, le=200),
    before_id: Optional[int] = None
):
    """获取会话消息列表"""
    conversation = await Conversation.get_or_none(id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    query = Message.filter(conversation_id=conversation_id)
    if before_id:
        query = query.filter(id__lt=before_id)
    
    messages = await query.order_by("-id").limit(limit)
    # 反转为时间正序
    messages = list(reversed(messages))
    
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            name=m.name,
            tool_call_id=m.tool_call_id,
            created_at=m.created_at
        )
        for m in messages
    ]
