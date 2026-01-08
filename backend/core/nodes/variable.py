"""变量赋值节点执行器"""

from typing import Dict, Any, AsyncGenerator


async def execute_variable_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行变量赋值节点：设置变量值。
    """
    assignments = node_data.get("assignments", [])
    var_outputs = {}
    
    for assign in assignments:
        var_name = assign.get("name", "")
        var_value = assign.get("value", "")
        
        # 变量替换
        for k, v in state["inputs"].items():
            var_value = var_value.replace(f"{{{{{k}}}}}", str(v))
        
        for out_node_id, out_data in state["outputs"].items():
            if isinstance(out_data, dict):
                for out_key, out_val in out_data.items():
                    var_value = var_value.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))
        
        var_outputs[var_name] = var_value
        state["inputs"][var_name] = var_value
    
    state["outputs"][node_id] = var_outputs
    yield {
        "type": "result",
        "outputs": {node_id: var_outputs}
    }
