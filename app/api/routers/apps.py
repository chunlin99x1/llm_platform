from fastapi.concurrency import run_in_threadpool
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction
from fastapi import APIRouter, HTTPException
from app.core.agent import agent_invoke
from app.db.models import App, ChatMessage, WorkflowDef
from app.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentToolTrace,
    AppCreateRequest,
    AppResponse,
    WorkflowDefResponse,
    WorkflowDefUpdateRequest,
)

router = APIRouter(prefix="/apps", tags=["apps"])


def _default_graph() -> dict:
    return {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 120, "y": 80}, "data": {"label": "开始"}},
            {
                "id": "llm",
                "type": "llm",
                "position": {"x": 120, "y": 220},
                "data": {"label": "LLM", "prompt": "请根据用户输入生成回答。"},
            },
            {"id": "end", "type": "end", "position": {"x": 120, "y": 360}, "data": {"label": "结束"}},
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "llm"},
            {"id": "e2", "source": "llm", "target": "end"},
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }


def _default_agent_config() -> dict:
    return {
        "instructions": "你是一个有用的 AI 助手。",
        "enabled_tools": []
    }


@router.post("", response_model=AppResponse)
async def create_app(payload: AppCreateRequest):
    try:
        async with in_transaction():
            app = await App.create(name=payload.name, mode=payload.mode)

            default_graph = _default_agent_config() if app.mode == "agent" else _default_graph()
            await WorkflowDef.create(app=app, graph=default_graph)

        return AppResponse(id=app.id, name=app.name, mode=app.mode)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="应用名称已存在")


@router.get("", response_model=list[AppResponse])
async def list_apps(name: str = None, mode: str = None):
    query = App.all()
    if name:
        query = query.filter(name__icontains=name)
    if mode and mode != "all":
        query = query.filter(mode=mode)

    apps = await query.order_by("-id")
    return [AppResponse(id=a.id, name=a.name, mode=a.mode) for a in apps]


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(app_id: int):
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    return AppResponse(id=app.id, name=app.name, mode=app.mode)


@router.get("/{app_id}/workflow", response_model=WorkflowDefResponse)
async def get_workflow(app_id: int):
    wf = await WorkflowDef.get_or_none(app_id=app_id)
    if not wf:
        raise HTTPException(status_code=404, detail="编排不存在")
    return WorkflowDefResponse(app_id=app_id, graph=wf.graph or {})


@router.put("/{app_id}/workflow", response_model=WorkflowDefResponse)
async def update_workflow(app_id: int, payload: WorkflowDefUpdateRequest):
    wf = await WorkflowDef.get_or_none(app_id=app_id)
    if not wf:
        raise HTTPException(status_code=404, detail="编排不存在")
    wf.graph = payload.graph
    await wf.save()
    return WorkflowDefResponse(app_id=app_id, graph=wf.graph or {})

# App Chat = “开发者测试台”，配置灵活，甚至可以针对未发布的草稿进行对话。
@router.post("/{app_id}/chat", response_model=AgentChatResponse)
async def app_chat(app_id: int, payload: AgentChatRequest):
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")

    # 仅 Agent 模式支持此接口（目前）
    if app.mode != "agent":
        raise HTTPException(status_code=400, detail="该应用模式不支持对话接口")

    # 获取配置
    wf = await WorkflowDef.get_or_none(app_id=app_id)
    if not wf or not wf.graph:
        raise HTTPException(status_code=404, detail="应用编排定义不存在")

    instructions = wf.graph.get("instructions", "")
    enabled_tools = wf.graph.get("enabled_tools", [])

    # 加载历史记录 (基于 session_id)
    session_id = payload.session_id or "preview_default"
    db_history = await ChatMessage.filter(session_id=session_id).order_by("id")

    # 转换为 LangChain 消息格式
    history = []
    for m in db_history:
        if m.role == "user":
            history.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            history.append(AIMessage(content=m.content))
        # Note: ChatMessage model is simple, doesn't store tool/system role specifically for now

    user_msg = HumanMessage(content=payload.input)

    # 执行智能体逻辑 (同步转异步)
    final_text, convo, tool_traces = await run_in_threadpool(
        agent_invoke,
        system_prompt=instructions,
        messages=history + [user_msg],
        enabled_tools=enabled_tools
    )

    # 持久化新消息
    async with in_transaction():
        await ChatMessage.create(session_id=session_id, role="user", content=payload.input)
        await ChatMessage.create(session_id=session_id, role="assistant", content=final_text)

    return AgentChatResponse(
        session_id=session_id,
        content=final_text,
        tool_traces=[AgentToolTrace(**t) for t in tool_traces]
    )
