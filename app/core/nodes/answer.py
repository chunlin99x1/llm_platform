"""回答/结束节点执行器"""

from typing import Dict, Any, AsyncGenerator


async def execute_answer_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    处理回答/结束节点：收集最终输出。
    """
    final_answer = ""
    
    # 查找连接到此节点的上游节点输出
    incoming_edges = [e for e in edges if e["target"] == node_id]
    if incoming_edges:
        source_id = incoming_edges[0]["source"]
        source_output = state["outputs"].get(source_id, {})
        if isinstance(source_output, dict):
            final_answer = source_output.get("text", "")
    
    if not final_answer and state["outputs"]:
        # 取最后一个输出
        last_output = list(state["outputs"].values())[-1]
        if isinstance(last_output, dict):
            final_answer = last_output.get("text", str(last_output))
        else:
            final_answer = str(last_output)

    state["outputs"]["final_answer"] = final_answer
    yield {
        "type": "result",
        "outputs": {"final_answer": final_answer}
    }
