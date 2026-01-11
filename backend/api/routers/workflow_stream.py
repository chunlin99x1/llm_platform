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
    input_text: str = "",
    context: dict = None,
    graph_config: dict = None,
    inputs: dict = None
) -> AsyncGenerator[str, None]:
    """
    流式执行工作流，逐个节点返回执行状态。
    支持直接传入 graph_config 用于预览/调试运行。
    """
    context = context or {}
    inputs = inputs or {}

    # 获取应用
    app = await App.get_or_none(id=app_id)
    if not app:
        yield f"data: {json.dumps({'event': 'error', 'message': 'App not found'})}\n\n"
        return

    # 确定 Graph 配置
    if not graph_config:
        # 如果未传入 graph，则从数据库加载
        workflow_def = await WorkflowDef.get_or_none(app_id=app_id)
        if not workflow_def or not workflow_def.graph:
            yield f"data: {json.dumps({'event': 'error', 'message': 'Workflow definition not found'})}\n\n"
            return
        graph_config = workflow_def.graph

    nodes = {n["id"]: n for n in graph_config.get("nodes", [])}
    edges = graph_config.get("edges", [])

    try:
        # 创建运行记录
        # 如果有 inputs，input_text 可能是其中的一个值，或者为空
        # 为了兼容 Dify，如果 inputs 存在，优先记录 inputs
        run_input = json.dumps(inputs) if inputs else input_text

        run = await WorkflowRun.create(
            workflow_name=app.name,
            input_text=run_input, 
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

        # 初始化执行状态
        # 混合 inputs, input_text, 和 context
        # Dify 风格的 inputs 优先级最高
        initial_inputs = {**context}
        if input_text:
            initial_inputs["input"] = input_text
        if inputs:
            initial_inputs.update(inputs)

        state = {
            "messages": [],
            "inputs": initial_inputs,
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
                import traceback
                traceback.print_exc()
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
    支持 preview 模式（传入 graph）和 inputs 参数。
    """
    # 尝试从 inputs 或 context 获取 app_id
    # 如果 payload.context 中没有，也可以尝试从 payload.inputs 获取（取决于前端怎么传）
    app_id = payload.context.get("app_id")
    if not app_id and payload.inputs:
         # 这是一个假设，可能 Dify 不会在 inputs 里传 app_id，但为了健壮性
         app_id = payload.inputs.get("app_id")
         
    # 实在没有，尝试 url 参数？但这是 POST body。
    # 假设 context 总是包含 app_id (因为之前的实现是这样)
    if not app_id:
        # 如果是 debug run，可能没有 app_id ? 
        # 暂时抛错，或者允许 app_id 为空（如果是完全只有 graph 的运行？）
        # 目前我们的逻辑需要 app 来创建 WorkflowRun 记录 (app.name)
        # 我们可以 mock 一个 app 或者是查找 default app
        # 为了保持兼容，先 check
        raise HTTPException(status_code=400, detail="Missing app_id in context")

    return StreamingResponse(
        stream_workflow_execution(
            app_id=app_id,
            input_text=payload.input,
            context=payload.context,
            graph_config=payload.graph,
            inputs=payload.inputs
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
