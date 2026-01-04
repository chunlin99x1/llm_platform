from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from tortoise.transactions import in_transaction

from app.core.llm import chat_llm, to_langchain_messages
from app.db.models import ChatMessage
from app.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    llm = chat_llm()
    messages = to_langchain_messages([m.model_dump() for m in payload.messages])
    result = await run_in_threadpool(llm.invoke, messages)
    content = result.content if hasattr(result, "content") else str(result)

    # Persist messages and response in a transaction
    async with in_transaction():
        for msg in payload.messages:
            await ChatMessage.create(role=msg.role, content=msg.content, session_id=payload.session_id)
        await ChatMessage.create(role="assistant", content=content, session_id=payload.session_id)

    return ChatResponse(content=content)
