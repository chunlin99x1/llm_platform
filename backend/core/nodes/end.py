"""
End 节点执行器 - Workflow 专用

End 节点与 Answer 节点的区别：
- End: 用于 Workflow，批量输出所有结果变量
- Answer: 用于 Chatflow，支持流式输出文本

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator


async def execute_end_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    处理 End 节点：收集并输出所有指定的输出变量。
    
    End 节点配置格式:
    {
        "outputs": [
            {"variable_selector": ["node_id", "output_name"], "variable_name": "result_name"}
        ]
    }
    """
    outputs = {}
    output_configs = node_data.get("outputs", [])
    
    if output_configs:
        # 根据配置收集输出变量
        for output_config in output_configs:
            variable_selector = output_config.get("variable_selector", [])
            variable_name = output_config.get("variable_name", "output")
            
            if len(variable_selector) >= 2:
                source_node_id = variable_selector[0]
                output_key = variable_selector[1]
                
                source_output = state["outputs"].get(source_node_id, {})
                if isinstance(source_output, dict):
                    value = source_output.get(output_key, source_output.get("text", ""))
                else:
                    value = source_output
                
                outputs[variable_name] = value
    else:
        # 如果没有配置，收集所有上游节点的输出
        incoming_edges = [e for e in edges if e["target"] == node_id]
        for edge in incoming_edges:
            source_id = edge["source"]
            source_output = state["outputs"].get(source_id, {})
            outputs[source_id] = source_output
    
    # 合并到最终输出
    state["outputs"]["__workflow_output__"] = outputs
    
    yield {
        "type": "workflow_finished",
        "outputs": outputs
    }
