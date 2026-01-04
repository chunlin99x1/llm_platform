import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from tortoise.transactions import in_transaction

from app.core.llm import chat_llm, to_langchain_messages
from app.db.models import ChatMessage
from app.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat")
async def chat(payload: ChatRequest):
    llm = chat_llm()
    messages = to_langchain_messages([m.model_dump() for m in payload.messages])
    
    async def stream_generator():
        full_content = ""
        # 1. 预先持久化用户消息
        async with in_transaction():
            for msg in payload.messages:
                await ChatMessage.create(role=msg.role, content=msg.content, session_id=payload.session_id)
        
        # 2. 流式获取内容
        async for chunk in llm.astream(messages):
            content = chunk.content if hasattr(chunk, "content") else str(chunk)
            full_content += content
            yield f"data: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
        
        # 3. 结束后持久化助手消息
        if full_content:
            async with in_transaction():
                await ChatMessage.create(role="assistant", content=full_content, session_id=payload.session_id)
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
