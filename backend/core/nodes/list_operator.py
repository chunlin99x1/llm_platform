"""
List Operator 节点执行器

对列表进行各种操作：过滤、排序、切片、提取等。

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator, List
from core.variable_resolver import resolve_variables


async def execute_list_operator_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 List Operator 节点：列表操作。
    
    节点配置格式:
    {
        "variable": "{{node_id.list}}",
        "operation": "first" | "last" | "filter" | "slice" | "sort" | "unique" | "flatten" | "limit",
        "params": {
            "count": 5,          # for first/last/limit
            "start": 0,          # for slice
            "end": 10,           # for slice  
            "field": "name",     # for sort/filter
            "order": "asc",      # for sort
            "condition": "...",  # for filter
        }
    }
    """
    variable = node_data.get("variable", "")
    operation = node_data.get("operation", "first")
    params = node_data.get("params", {})
    
    # 获取列表变量
    list_data = resolve_variables(variable, state)
    
    if not isinstance(list_data, list):
        # 尝试从输出中获取
        if isinstance(list_data, str):
            # 检查是否是 JSON 字符串
            try:
                import json
                list_data = json.loads(list_data)
            except:
                list_data = [list_data]
        else:
            list_data = [list_data] if list_data else []
    
    result = []
    
    yield {
        "type": "operating",
        "node_id": node_id,
        "operation": operation,
        "input_count": len(list_data)
    }
    
    # 执行操作
    if operation == "first":
        count = params.get("count", 1)
        result = list_data[:count]
    
    elif operation == "last":
        count = params.get("count", 1)
        result = list_data[-count:]
    
    elif operation == "limit":
        count = params.get("count", 10)
        result = list_data[:count]
    
    elif operation == "slice":
        start = params.get("start", 0)
        end = params.get("end", len(list_data))
        result = list_data[start:end]
    
    elif operation == "sort":
        field = params.get("field")
        order = params.get("order", "asc")
        reverse = order == "desc"
        
        if field and list_data and isinstance(list_data[0], dict):
            result = sorted(list_data, key=lambda x: x.get(field, ""), reverse=reverse)
        else:
            result = sorted(list_data, reverse=reverse)
    
    elif operation == "unique":
        seen = set()
        result = []
        for item in list_data:
            key = str(item) if not isinstance(item, dict) else str(sorted(item.items()))
            if key not in seen:
                seen.add(key)
                result.append(item)
    
    elif operation == "flatten":
        result = []
        for item in list_data:
            if isinstance(item, list):
                result.extend(item)
            else:
                result.append(item)
    
    elif operation == "filter":
        field = params.get("field")
        condition = params.get("condition", "")
        value = params.get("value")
        
        if field and condition:
            for item in list_data:
                if isinstance(item, dict):
                    item_value = item.get(field)
                    if _check_condition(item_value, condition, value):
                        result.append(item)
        else:
            result = [item for item in list_data if item]
    
    elif operation == "extract":
        # 提取特定字段
        field = params.get("field")
        if field:
            result = [
                item.get(field) if isinstance(item, dict) else item
                for item in list_data
            ]
        else:
            result = list_data
    
    else:
        result = list_data
    
    output = {
        "result": result,
        "count": len(result)
    }
    
    state["outputs"][node_id] = output
    
    yield {
        "type": "operated",
        "node_id": node_id,
        "operation": operation,
        "output_count": len(result)
    }
    
    yield {
        "type": "result",
        "outputs": {node_id: output}
    }


def _check_condition(value: Any, condition: str, target: Any) -> bool:
    """检查条件是否满足"""
    try:
        if condition == "equals":
            return value == target
        elif condition == "not_equals":
            return value != target
        elif condition == "contains":
            return str(target) in str(value)
        elif condition == "not_contains":
            return str(target) not in str(value)
        elif condition == "greater":
            return float(value) > float(target)
        elif condition == "less":
            return float(value) < float(target)
        elif condition == "is_empty":
            return not value
        elif condition == "is_not_empty":
            return bool(value)
        else:
            return bool(value)
    except:
        return False
