from fastapi import APIRouter, HTTPException
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from app.db.models import App, WorkflowDef
from app.schemas import AppCreateRequest, AppResponse, WorkflowDefResponse, WorkflowDefUpdateRequest

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


@router.post("", response_model=AppResponse)
async def create_app(payload: AppCreateRequest):
    try:
        async with in_transaction():
            app = await App.create(name=payload.name, mode=payload.mode)
            await WorkflowDef.create(app=app, graph=_default_graph())
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

