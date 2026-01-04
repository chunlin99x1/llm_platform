from fastapi import APIRouter, HTTPException
from tortoise.transactions import in_transaction

from app.core.workflow import build_graph_from_def
from app.db.models import WorkflowRun, App, WorkflowDef
from app.schemas import WorkflowRunRequest, WorkflowRunResponse

router = APIRouter()


@router.post("/workflow/run", response_model=WorkflowRunResponse)
async def run_workflow(payload: WorkflowRunRequest):
    """
    根据应用定义的结构动态运行工作流图。
    """
    app_id = payload.context.get("app_id")
    if not app_id:
        raise HTTPException(status_code=400, detail="Missing app_id in context")

    # 获取应用信息
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # 获取定义
    workflow_def = await WorkflowDef.get_or_none(app_id=app_id)
    if not workflow_def or not workflow_def.graph:
        raise HTTPException(status_code=404, detail="Orchestration definition not found or empty")

    graph_config = workflow_def.graph
    
    try:
        async with in_transaction():
            # 记录运行
            run = await WorkflowRun.create(
                workflow_name=app.name,
                input_text=payload.input,
                status="running"
            )

            # 构建并执行图
            graph = build_graph_from_def(graph_config)
            
            # 初始化状态
            initial_state = {
                "messages": [],
                "inputs": {"input": payload.input, **payload.context},
                "outputs": {},
                "temp_data": {}
            }
            
            # 使用 ainvoke 执行
            result_state = await graph.ainvoke(initial_state)
            
            outputs = result_state.get("outputs", {})
            final_answer = outputs.get("final_answer")
            
            if not final_answer:
                msgs = result_state.get("messages", [])
                if msgs:
                    final_answer = msgs[-1].content
                else:
                    final_answer = ""

            # 更新运行状态
            run.status = "succeeded"
            run.output_text = str(final_answer)
            await run.save()

            return WorkflowRunResponse(
                run_id=run.id,
                output=run.output_text
            )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
