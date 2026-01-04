from fastapi import APIRouter, HTTPException, Body
from typing import Any, Dict, Optional
from langchain_core.messages import HumanMessage
from tortoise.transactions import in_transaction

from app.core.workflow import build_graph_from_def
from app.db.models import NodeRun, WorkflowRun, App, WorkflowDef
from app.schemas import WorkflowRunRequest, WorkflowRunResponse

router = APIRouter()


@router.post("/workflow/run", response_model=WorkflowRunResponse)
async def run_workflow(payload: WorkflowRunRequest):
    """
    根据应用定义的图结构动态运行工作流。
    """
    app_id = payload.context.get("app_id")
    if not app_id:
        raise HTTPException(status_code=400, detail="Missing app_id in context")

    # 获取工作流定义
    workflow_def = await WorkflowDef.get_or_none(app_id=app_id)
    if not workflow_def or not workflow_def.graph:
        raise HTTPException(status_code=404, detail="Workflow definition not found or empty")

    graph = build_graph_from_def(workflow_def.graph)
    
    # 构造初始状态
    # 注意：我们的 WorkflowState 现在包含 messages, inputs, outputs, temp_data
    initial_state = {
        "messages": [], # 初始消息列表为空，由节点产生或从 inputs 读取
        "inputs": {"input": payload.input, **payload.context},
        "outputs": {},
        "temp_data": {}
    }

    try:
        async with in_transaction():
            run = await WorkflowRun.create(
                workflow_name=f"app_{app_id}", 
                status="running", 
                input_text=payload.input
            )

            # 执行工作流
            # 由于 LangGraph 的 ainvoke 是异步的，直接调用即可
            result_state = await graph.ainvoke(initial_state)
            
            # 提取最终输出
            # 优先从 outputs.final_answer 获取，否则取最后一条消息
            outputs = result_state.get("outputs", {})
            final_answer = outputs.get("final_answer")
            
            if not final_answer:
                messages = result_state.get("messages", [])
                if messages:
                    final_answer = messages[-1].content
                else:
                    final_answer = ""

            # 记录节点执行情况 (简化实现，目前只记录最终结果)
            await NodeRun.create(
                workflow_run=run,
                node_name="execution_summary",
                status="succeeded",
                payload=outputs,
            )

            run.status = "succeeded"
            run.output_text = str(final_answer)
            await run.save()

        return WorkflowRunResponse(run_id=run.id, output=run.output_text)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
