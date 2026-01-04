from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from app.core.agent import BUILTIN_TOOLS, agent_invoke
from app.db.models import Agent, AgentMessage, AgentSession
from app.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentCreateRequest,
    AgentMessageResponse,
    AgentResponse,
    AgentSessionCreateRequest,
    AgentSessionResponse,
)

router = APIRouter(prefix="/agents", tags=["agents"])


def _lc_messages_from_db(db_messages: list[AgentMessage]) -> list[BaseMessage]:
    msgs: list[BaseMessage] = []
    for m in db_messages:
        if m.role == "user":
            msgs.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            msgs.append(AIMessage(content=m.content))
        elif m.role == "tool":
            msgs.append(ToolMessage(content=m.content, tool_call_id=m.tool_call_id or "", name=m.name))
        elif m.role == "system":
            msgs.append(SystemMessage(content=m.content))
    return msgs


@router.get("/tools")
async def list_tools():
    return {
        "categories": [
            {
                "category": cat_name,
                "tools": [
                    {
                        "name": tool_name,
                        "description": getattr(t, "description", "") or (t.__doc__ or "").strip()
                    }
                    for tool_name, t in cat_tools.items()
                ]
            }
            for cat_name, cat_tools in BUILTIN_TOOLS.items()
        ]
    }


@router.post("", response_model=AgentResponse)
async def create_agent(payload: AgentCreateRequest):
    try:
        async with in_transaction():
            agent = await Agent.create(
                name=payload.name,
                description=payload.description,
                system_prompt=payload.system_prompt,
                enabled_tools=payload.enabled_tools,
            )
        return AgentResponse(
            id=agent.id,
            name=agent.name,
            description=agent.description,
            system_prompt=agent.system_prompt,
            enabled_tools=agent.enabled_tools or [],
        )
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Agent 名称已存在")


@router.get("", response_model=list[AgentResponse])
async def list_agents():
    agents = await Agent.all().order_by("-id")
    return [
        AgentResponse(
            id=a.id,
            name=a.name,
            description=a.description,
            system_prompt=a.system_prompt,
            enabled_tools=a.enabled_tools or [],
        )
        for a in agents
    ]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int):
    agent = await Agent.get_or_none(id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        system_prompt=agent.system_prompt,
        enabled_tools=agent.enabled_tools or [],
    )


@router.post("/{agent_id}/sessions", response_model=AgentSessionResponse)
async def create_session(agent_id: int, payload: AgentSessionCreateRequest):
    agent = await Agent.get_or_none(id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent 不存在")
    session = await AgentSession.create(agent=agent, title=payload.title)
    return AgentSessionResponse(session_id=str(session.id))


@router.get("/{agent_id}/sessions/{session_id}/messages", response_model=list[AgentMessageResponse])
async def list_session_messages(agent_id: int, session_id: str):
    session = await AgentSession.get_or_none(id=session_id, agent_id=agent_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    msgs = await AgentMessage.filter(session=session).order_by("id")
    return [
        AgentMessageResponse(role=m.role, content=m.content, name=m.name, tool_call_id=m.tool_call_id) for m in msgs
    ]


@router.post("/{agent_id}/chat", response_model=AgentChatResponse)
async def agent_chat(agent_id: int, payload: AgentChatRequest):
    agent = await Agent.get_or_none(id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent 不存在")

    # Resolve/create session
    if payload.session_id:
        session = await AgentSession.get_or_none(id=payload.session_id, agent=agent)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
    else:
        session = await AgentSession.create(agent=agent, title=None)

    # Load history
    db_history = await AgentMessage.filter(session=session).order_by("id")
    history = _lc_messages_from_db(db_history)

    # Invoke agent (sync in threadpool)
    user_msg = HumanMessage(content=payload.input)
    initial_len = (1 if agent.system_prompt else 0) + len(history) + 1

    final_text, convo, tool_traces = await run_in_threadpool(
        agent_invoke,
        system_prompt=agent.system_prompt,
        messages=history + [user_msg],
        enabled_tools=agent.enabled_tools,
        max_iters=8,
    )

    # Persist new messages
    async with in_transaction():
        await AgentMessage.create(session=session, role="user", content=payload.input)
        new_msgs = convo[initial_len:]
        for m in new_msgs:
            if isinstance(m, AIMessage):
                content = m.content if isinstance(m.content, str) else str(m.content)
                await AgentMessage.create(session=session, role="assistant", content=content)
            elif isinstance(m, ToolMessage):
                await AgentMessage.create(
                    session=session,
                    role="tool",
                    content=m.content,
                    name=getattr(m, "name", None),
                    tool_call_id=getattr(m, "tool_call_id", None),
                )

    return AgentChatResponse(
        session_id=str(session.id),
        content=final_text,
        tool_traces=tool_traces,
    )

