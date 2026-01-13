"""
Template 节点执行器 - 模板转换
"""

from typing import Dict, Any, AsyncGenerator
from core.variable_resolver import resolve_variables


async def execute_template_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 Template 节点：使用 Jinja2 风格(其实是简单替换)的模板引擎
    
    配置:
    {
        "template": "Hello {{name}}",
        "variables": [...] # 前端可能会传变量列表，但 resolve_variables 会自动从 state 解析
    }
    """
    template = node_data.get("template", "")
    
    # 解析变量
    result = resolve_variables(template, state)
    
    # 存入输出
    state["outputs"][node_id] = {"output": result}
    
    yield {
        "type": "result",
        "outputs": {node_id: {"output": result}}
    }
