"""
工作流流式执行 API

提供 SSE 流式返回工作流执行状态。

Author: chunlin
"""

import json
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from database.models import WorkflowRun, App, WorkflowDef
from schemas import WorkflowRunRequest
from core.nodes import execute_node

router = APIRouter(prefix="/workflow", tags=["workflow-stream"])


async def stream_workflow_execution(
    app_id: int,
    input_text: str,
    context: dict
) -> AsyncGenerator[str, None]:
    """
    流式执行工作流，逐个节点返回执行状态。
    """
    # 获取应用
    app = await App.get_or_none(id=app_id)
    if not app:
        yield f"data: {json.dumps({'event': 'error', 'message': 'App not found'})}\n\n"
        return

    # 获取工作流定义
    workflow_def = await WorkflowDef.get_or_none(app_id=app_id)
    if not workflow_def or not workflow_def.graph:
        yield f"data: {json.dumps({'event': 'error', 'message': 'Workflow definition not found'})}\n\n"
        return

    graph_config = workflow_def.graph
    nodes = {n["id"]: n for n in graph_config.get("nodes", [])}
    edges = graph_config.get("edges", [])

    try:
        # 创建运行记录
        run = await WorkflowRun.create(
            workflow_name=app.name,
            input_text=input_text,
            status="running"
        )

        yield f"data: {json.dumps({'event': 'workflow_started', 'run_id': run.id})}\n\n"

        # 构建执行顺序（简单拓扑排序）
        execution_order = []
        visited = set()
        
        start_nodes = [id for id, n in nodes.items() if n.get("type") == "start"]
        current = start_nodes[0] if start_nodes else (list(nodes.keys())[0] if nodes else None)

        while current and current not in visited:
            execution_order.append(current)
            visited.add(current)
            next_edges = [e for e in edges if e["source"] == current]
            current = next_edges[0]["target"] if next_edges else None

        # 执行状态
        state = {
            "messages": [],
            "inputs": {"input": input_text, **context},
            "outputs": {},
            "temp_data": {}
        }

        # 逐个节点执行
        for node_id in execution_order:
            node = nodes.get(node_id)
            if not node:
                continue

            node_type = node.get("type", "custom")
            node_data = node.get("data", {})

            # 发送节点开始事件
            yield f"data: {json.dumps({'event': 'node_started', 'node_id': node_id, 'node_type': node_type})}\n\n"
            await asyncio.sleep(0.1)

            try:
                # 执行节点
                async for event in execute_node(node_id, node_type, node_data, state, edges):
                    if event["type"] == "output":
                        yield f"data: {json.dumps({'event': 'node_output', 'node_id': node_id, 'chunk': event['chunk']})}\n\n"
                    elif event["type"] == "result":
                        state["outputs"].update(event.get("outputs", {}))

                yield f"data: {json.dumps({'event': 'node_finished', 'node_id': node_id, 'status': 'success'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'event': 'node_finished', 'node_id': node_id, 'status': 'error', 'error': str(e)})}\n\n"
                break

        # 获取最终输出
        final_answer = state["outputs"].get("final_answer", "")
        if not final_answer:
            for nid in reversed(execution_order):
                node_output = state["outputs"].get(nid, {})
                if isinstance(node_output, dict) and "text" in node_output:
                    final_answer = node_output["text"]
                    break

        # 更新运行记录
        run.status = "succeeded"
        run.output_text = str(final_answer)
        await run.save()

        yield f"data: {json.dumps({'event': 'workflow_finished', 'run_id': run.id, 'output': final_answer})}\n\n"

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"


@router.post("/run/stream")
async def run_workflow_stream(payload: WorkflowRunRequest):
    """
    流式执行工作流，返回 SSE 事件流。
    """
    app_id = payload.context.get("app_id")
    if not app_id:
        raise HTTPException(status_code=400, detail="Missing app_id in context")

    return StreamingResponse(
        stream_workflow_execution(app_id, payload.input, payload.context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
