"""条件分支节点执行器"""

from typing import Dict, Any, AsyncGenerator


async def execute_condition_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行条件分支节点：评估条件表达式。
    """
    conditions = node_data.get("conditions", [])
    condition_result = False
    
    for cond in conditions:
        variable = cond.get("variable", "")
        operator = cond.get("operator", "==")
        value = cond.get("value", "")
        
        # 获取变量值
        actual_value = state["inputs"].get(variable, "")
        if not actual_value:
            for out_data in state["outputs"].values():
                if isinstance(out_data, dict) and variable in out_data:
                    actual_value = out_data[variable]
                    break
        
        # 评估条件
        try:
            if operator == "==" and str(actual_value) == str(value):
                condition_result = True
            elif operator == "!=" and str(actual_value) != str(value):
                condition_result = True
            elif operator == "contains" and str(value) in str(actual_value):
                condition_result = True
            elif operator == ">" and float(actual_value) > float(value):
                condition_result = True
            elif operator == "<" and float(actual_value) < float(value):
                condition_result = True
        except (ValueError, TypeError):
            pass
    
    result = {"result": condition_result}
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }
