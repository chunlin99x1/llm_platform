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
    """
    执行条件分支节点：评估条件表达式。
    支持 IF-ELIF-ELSE 逻辑。
    """
    # 1. 新版多分支模式 (Cases)
    cases = node_data.get("cases", [])
    if cases:
        for case in cases:
            case_id = case.get("id")
            # Case 内部逻辑 (目前假设每个 Case 是一组 AND/OR 条件)
            # 这里简化：只要 Case 内有一个 Condition 满足 (OR) 或者 所有满足 (AND)
            # Dify 逻辑通常是：Condition Group 内部是 AND，不同 Groups 是 OR?
            # 或者是每个 Case 有自己的 Condition List。
            
            # 使用旧版逻辑评估该 Case 的 conditions
            case_conditions = case.get("conditions", [])
            if _evaluate_conditions(case_conditions, state):
                # 匹配成功
                result = {"branch_id": case_id, "result": True}
                state["outputs"][node_id] = result
                yield {"type": "result", "outputs": {node_id: result}}
                return

        # 没有 Case 匹配 -> Else
        result = {"branch_id": "false", "result": False} # Default handle is usually 'false' or 'else'
        state["outputs"][node_id] = result
        yield {"type": "result", "outputs": {node_id: result}}
        return

    # 2. 旧版 Binary 模式
    conditions = node_data.get("conditions", [])
    logic_op = node_data.get("logicOp", "and").lower()
    condition_result = _evaluate_conditions(conditions, state, logic=logic_op)
    
    result = {"result": condition_result, "branch_id": "true" if condition_result else "false"}
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }

def _evaluate_conditions(conditions: list, state: Dict[str, Any], logic: str = "and") -> bool:
    """
    评估一组条件
    logic: "and" (所有满足) 或 "or" (任一满足)
    """
    if not conditions:
        return False
        
    # AND logic default: assume True, if any fail -> False
    # OR logic default: assume False, if any success -> True
    
    results = []
    
    for cond in conditions:
        variable = cond.get("variable", "")
        operator = cond.get("operator", "==")
        value = cond.get("value", "")
        
        # 解析变量值
        from core.variable_resolver import resolve_variables
        
        actual_value = ""
        if "{{" in variable:
             actual_value = resolve_variables(variable, state)
        else:
            actual_value = state["inputs"].get(variable, "")
            if not actual_value:
                 for out_data in state["outputs"].values():
                    if isinstance(out_data, dict) and variable in out_data:
                        actual_value = out_data[variable]
                        break
        
        # 评估单个条件
        is_match = False
        try:
            str_val = str(actual_value) if actual_value is not None else ""
            str_target = str(value)
            
            if operator == "==":
                is_match = (str_val == str_target)
            elif operator == "!=":
                is_match = (str_val != str_target)
            elif operator == "contains":
                is_match = (str_target in str_val)
            elif operator == "not contains":
                is_match = (str_target not in str_val)
            elif operator == "is empty":
                is_match = (not str_val)
            elif operator == "is not empty":
                is_match = (bool(str_val))
            elif operator in (">", "<", ">=", "<="):
                try:
                    f_val = float(str_val)
                    f_target = float(str_target)
                    if operator == ">": is_match = f_val > f_target
                    elif operator == "<": is_match = f_val < f_target
                    elif operator == ">=": is_match = f_val >= f_target
                    elif operator == "<=": is_match = f_val <= f_target
                except:
                    # 数值转换失败，尝试字符串比较
                    if operator == ">": is_match = str_val > str_target
                    elif operator == "<": is_match = str_val < str_target
                    elif operator == ">=": is_match = str_val >= str_target
                    elif operator == "<=": is_match = str_val <= str_target
        except Exception:
            is_match = False
            
        results.append(is_match)

    if logic == "or":
        return any(results)
    else: # and
        return all(results)
