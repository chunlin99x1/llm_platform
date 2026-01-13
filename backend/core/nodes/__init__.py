"""
节点执行器模块

每个节点类型对应一个执行函数。

- Answer: Chatflow 专用，流式输出
- End: Workflow 专用，批量输出

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator
from .start import execute_start_node
from .llm import execute_llm_node
from .answer import execute_answer_node
from .end import execute_end_node
from .code import execute_code_node
from .http import execute_http_node
from .condition import execute_condition_node
from .variable import execute_variable_node
from .knowledge import execute_knowledge_node
from .iteration import execute_iteration_node
from .extractor import execute_extractor_node


# 节点执行器映射
NODE_EXECUTORS = {
    "start": execute_start_node,
    "llm": execute_llm_node,
    "answer": execute_answer_node,  # Chatflow 专用
    "end": execute_end_node,  # Workflow 专用
    "code": execute_code_node,
    "http-request": execute_http_node,
    "http": execute_http_node,  # 兼容旧版
    "if-else": execute_condition_node,
    "condition": execute_condition_node,  # 兼容旧版
    "variable-aggregator": execute_variable_node,
    "variable": execute_variable_node,  # 兼容旧版
    "knowledge-retrieval": execute_knowledge_node,
    "knowledge": execute_knowledge_node,  # 兼容旧版
    "iteration": execute_iteration_node,
    "parameter-extractor": execute_extractor_node,
    "extractor": execute_extractor_node,  # 兼容旧版
}


# Chatflow 专用节点
CHATFLOW_ONLY_NODES = {"answer"}

# Workflow 专用节点
WORKFLOW_ONLY_NODES = {"end"}



async def execute_node(
    node_id: str,
    node_type: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行节点，返回执行结果的生成器。

    Yields:
        事件字典，包含：
        - type: 事件类型 (output, result)
        - data: 事件数据
    """
    executor = NODE_EXECUTORS.get(node_type)

    if executor:
        async for event in executor(node_id, node_data, state, edges):
            yield event
    else:
        yield {"type": "result", "outputs": {}}
