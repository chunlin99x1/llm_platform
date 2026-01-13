"""
Chatflow 运行器

用于执行 Chatflow 类型应用（多轮对话，流式输出）。

Author: chunlin
"""

import time
import logging
from typing import Any, Dict, AsyncGenerator, Optional

from core.enums import WorkflowType, WorkflowExecutionStatus, SystemVariableKey
from .base_runner import BaseWorkflowRunner, WorkflowState

logger = logging.getLogger(__name__)


class ChatflowRunner(BaseWorkflowRunner):
    """
    Chatflow 运行器

    特点：
    - 多轮对话
    - 使用 Answer 节点流式输出
    - 支持会话变量
    - 支持输入审核和标注回复
    """

    def __init__(
        self,
        graph_config: Dict[str, Any],
        user_id: str = "",
        app_id: str = "",
        conversation_id: str = "",
        dialogue_count: int = 0,
    ):
        super().__init__(graph_config, user_id, app_id)
        self.conversation_id = conversation_id
        self.dialogue_count = dialogue_count
        self._conversation_variables: Dict[str, Any] = {}

    @property
    def workflow_type(self) -> WorkflowType:
        return WorkflowType.CHATFLOW

    def set_conversation_variables(self, variables: Dict[str, Any]) -> None:
        """设置会话变量"""
        self._conversation_variables = variables

    def _init_state(self, inputs: Dict[str, Any]) -> WorkflowState:
        """初始化状态（包含 Chatflow 专属系统变量）"""
        state = super()._init_state(inputs)

        # 设置系统变量字段
        state.query = inputs.get("query", "")
        state.conversation_id = self.conversation_id
        state.user_id = self.user_id
        state.app_id = self.app_id
        
        # 为了兼容性，inputs 中保留 query
        
        # 设置会话变量
        state.conversation_variables = self._conversation_variables or {}

        return state

    async def run(
        self,
        inputs: Dict[str, Any],
        query: str = "",
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行 Chatflow

        Args:
            inputs: 用户输入变量
            query: 用户对话消息

        Yields:
            执行事件（包含流式文本输出）
        """
        # 将 query 添加到 inputs
        if query:
            inputs["query"] = query

        self._start_time = time.time()
        self._state = self._init_state(inputs)

        # 发布工作流开始事件
        yield {
            "type": "workflow_started",
            "workflow_type": self.workflow_type.value,
            "conversation_id": self.conversation_id,
            "inputs": inputs,
        }

        try:
            # 从起始节点开始执行
            start_node_id = self._find_start_node()
            if not start_node_id:
                raise ValueError("No start node found")

            # 执行节点链
            current_nodes = [start_node_id]
            executed_nodes = set()

            while current_nodes:
                node_id = current_nodes.pop(0)

                if node_id in executed_nodes:
                    continue
                executed_nodes.add(node_id)

                # 执行当前节点
                async for event in self._execute_node(node_id, self._state):
                    # 直接传递流式事件（text_chunk）
                    yield event

                # 如果不是终止节点，继续执行下一个节点
                if not self._is_terminal_node(node_id):
                    next_nodes = self._find_next_nodes(node_id)
                    current_nodes.extend(next_nodes)

            elapsed_time = time.time() - self._start_time

            # 发布工作流完成事件
            yield {
                "type": "workflow_finished",
                "status": WorkflowExecutionStatus.SUCCEEDED.value,
                "conversation_id": self.conversation_id,
                "answer": self._state.outputs.get("final_answer", ""),
                "elapsed_time": elapsed_time,
            }

        except Exception as e:
            logger.exception("Chatflow execution failed")
            elapsed_time = time.time() - self._start_time

            yield {
                "type": "workflow_finished",
                "status": WorkflowExecutionStatus.FAILED.value,
                "conversation_id": self.conversation_id,
                "error": str(e),
                "elapsed_time": elapsed_time,
            }

    def get_updated_conversation_variables(self) -> Dict[str, Any]:
        """获取更新后的会话变量（用于持久化）"""
        if self._state:
            # 过滤掉系统变量，只返回会话变量
            system_keys = {key.value for key in SystemVariableKey}
            return {
                k: v for k, v in self._state.variables.items()
                if k not in system_keys
            }
        return {}
