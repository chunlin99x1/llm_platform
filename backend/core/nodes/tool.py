"""
Tool 节点执行器

用于在工作流中调用单个工具。

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator
from core.variable_resolver import resolve_variables
from core.tools.registry import TOOL_REGISTRY


async def execute_tool_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 Tool 节点：调用指定工具。
    
    节点配置格式:
    {
        "tool_name": "工具名称",
        "tool_parameters": {
            "param1": "{{node_id.output}}",
            "param2": "静态值"
        }
    }
    """
    tool_name = node_data.get("tool_name", "")
    tool_parameters = node_data.get("tool_parameters", {})
    
    if not tool_name:
        raise ValueError(f"Tool 节点 '{node_id}' 未配置工具名称")
    
    # 获取工具
    tool = TOOL_REGISTRY.get(tool_name)
    if not tool:
        raise ValueError(f"工具 '{tool_name}' 不存在")
    
    # 解析参数中的变量引用
    resolved_params = {}
    for key, value in tool_parameters.items():
        if isinstance(value, str):
            resolved_params[key] = resolve_variables(value, state)
        else:
            resolved_params[key] = value
    
    # 发布工具调用开始事件
    yield {
        "type": "tool_call_started",
        "node_id": node_id,
        "tool_name": tool_name,
        "parameters": resolved_params
    }
    
    try:
        # 调用工具
        # LangChain 工具可通过 invoke 或 ainvoke 调用
        if hasattr(tool, "ainvoke"):
            # 异步调用
            result = await tool.ainvoke(resolved_params)
        elif hasattr(tool, "invoke"):
            # 同步调用
            result = tool.invoke(resolved_params)
        elif hasattr(tool, "run"):
            # 旧版工具
            result = tool.run(**resolved_params)
        elif callable(tool):
            # 普通函数
            result = tool(**resolved_params)
        else:
            raise ValueError(f"工具 '{tool_name}' 不可调用")
        
        # 标准化结果
        if isinstance(result, str):
            output = {"result": result}
        elif isinstance(result, dict):
            output = result
        else:
            output = {"result": str(result)}
        
        # 发布工具调用完成事件
        yield {
            "type": "tool_call_finished",
            "node_id": node_id,
            "tool_name": tool_name,
            "status": "succeeded",
            "output": output
        }
        
        # 保存输出
        state["outputs"][node_id] = output
        yield {
            "type": "result",
            "outputs": {node_id: output}
        }
        
    except Exception as e:
        yield {
            "type": "tool_call_finished",
            "node_id": node_id,
            "tool_name": tool_name,
            "status": "failed",
            "error": str(e)
        }
        raise
