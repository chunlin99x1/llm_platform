"""开始节点执行器"""

from typing import Dict, Any, AsyncGenerator


async def execute_start_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    处理开始节点：初始化变量。
    """
    variables = node_data.get("variables", [])
    for var in variables:
        var_name = var.get("name")
        var_default = var.get("defaultValue", "")
        if var_name and var_name not in state["inputs"]:
            state["inputs"][var_name] = var_default
    
    yield {
        "type": "result",
        "outputs": {node_id: {"variables": state["inputs"]}}
    }
