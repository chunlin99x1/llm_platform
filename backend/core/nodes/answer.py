"""
Answer 节点执行器 - Chatflow 专用

Answer 节点与 End 节点的区别：
- Answer: 用于 Chatflow，支持流式输出文本，可包含变量引用
- End: 用于 Workflow，批量输出所有结果变量

Author: chunlin
"""

import re
from typing import Dict, Any, AsyncGenerator


async def execute_answer_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    处理 Answer 节点：流式输出文本内容。
    
    Answer 节点配置格式:
    {
        "answer": "回答内容，支持 {{node_id.output_name}} 变量引用"
    }
    """
    answer_template = node_data.get("answer", "")
    
    if answer_template:
        # 解析变量引用 {{node_id.output_name}}
        final_answer = _resolve_variables(answer_template, state["outputs"])
    else:
        # 如果没有配置 answer，从上游节点获取输出
        final_answer = _get_upstream_output(node_id, state, edges)
    
    # 流式输出（模拟逐字输出）
    for i, char in enumerate(final_answer):
        yield {
            "type": "text_chunk",
            "text": char,
            "index": i
        }
    
    # 最终输出
    state["outputs"][node_id] = {"answer": final_answer}
    state["outputs"]["final_answer"] = final_answer
    
    yield {
        "type": "answer_finished",
        "outputs": {"answer": final_answer}
    }


def _resolve_variables(template: str, outputs: Dict[str, Any]) -> str:
    """解析变量引用 {{node_id.output_name}}"""
    pattern = r'\{\{([^}]+)\}\}'
    
    def replace_var(match):
        var_path = match.group(1).strip()
        parts = var_path.split(".")
        
        if len(parts) >= 2:
            node_id = parts[0]
            output_key = ".".join(parts[1:])
            
            node_output = outputs.get(node_id, {})
            if isinstance(node_output, dict):
                return str(node_output.get(output_key, node_output.get("text", match.group(0))))
            return str(node_output)
        
        return match.group(0)
    
    return re.sub(pattern, replace_var, template)


def _get_upstream_output(node_id: str, state: Dict[str, Any], edges: list) -> str:
    """从上游节点获取输出"""
    incoming_edges = [e for e in edges if e["target"] == node_id]
    
    if incoming_edges:
        source_id = incoming_edges[0]["source"]
        source_output = state["outputs"].get(source_id, {})
        if isinstance(source_output, dict):
            return source_output.get("text", str(source_output))
        return str(source_output)
    
    # 取最后一个输出
    if state["outputs"]:
        last_output = list(state["outputs"].values())[-1]
        if isinstance(last_output, dict):
            return last_output.get("text", str(last_output))
        return str(last_output)
    
    return ""
