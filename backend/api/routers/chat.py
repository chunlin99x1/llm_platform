import json
from typing import Dict, Any, Optional
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from tortoise.transactions import in_transaction
from pydantic import BaseModel, Field

from core.llm import create_llm_instance, to_langchain_messages
from database.models import ChatMessage
from schemas import ChatRequest

router = APIRouter()


class ChatRequestWithModel(BaseModel):
    """带模型配置的聊天请求"""
    messages: list
    session_id: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None


@router.post("/chat")
async def chat(payload: ChatRequestWithModel):
    # 验证 llm_config
    if not payload.llm_config:
        raise ValueError("缺少 llm_config 参数。请在请求中提供模型配置。")
    
    provider = payload.llm_config.get("provider")
    model = payload.llm_config.get("model")
    
    if not provider or not model:
        raise ValueError("llm_config 缺少 provider 或 model 字段。")
    
    llm = await create_llm_instance(
        provider=provider,
        model=model,
        parameters=payload.llm_config.get("parameters", {})
    )
    
    messages = to_langchain_messages([m if isinstance(m, dict) else m.model_dump() for m in payload.messages])
    
    async def stream_generator():
        full_content = ""
        # 1. 预先持久化用户消息
        if payload.session_id:
            async with in_transaction():
                for msg in payload.messages:
                    msg_dict = msg if isinstance(msg, dict) else msg.model_dump()
                    await ChatMessage.create(
                        role=msg_dict.get("role", "user"), 
                        content=msg_dict.get("content", ""), 
                        session_id=payload.session_id
                    )
        
        # 2. 流式获取内容
        async for chunk in llm.astream(messages):
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            full_content += content
            yield f"data: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
        
        # 3. 结束后持久化助手消息
        if full_content and payload.session_id:
            async with in_transaction():
                await ChatMessage.create(role="assistant", content=full_content, session_id=payload.session_id)
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

