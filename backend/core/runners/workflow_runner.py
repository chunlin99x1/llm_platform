"""
Workflow 运行器

用于执行 Workflow 类型应用（单次执行，批量输出）。

Author: chunlin
"""

import time
import logging
from typing import Any, Dict, AsyncGenerator

from core.enums import WorkflowType, WorkflowExecutionStatus
from .base_runner import BaseWorkflowRunner, WorkflowState

logger = logging.getLogger(__name__)


class WorkflowRunner(BaseWorkflowRunner):
    """
    Workflow 运行器

    特点：
    - 单次执行
    - 使用 End 节点批量输出
    - 无会话变量
    - 无输入审核
    """

    @property
    def workflow_type(self) -> WorkflowType:
        return WorkflowType.WORKFLOW

    async def run(
        self,
        inputs: Dict[str, Any],
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行 Workflow

        Args:
            inputs: 用户输入

        Yields:
            执行事件
        """
        self._start_time = time.time()
        self._state = self._init_state(inputs)

        # 发布工作流开始事件
        yield {
            "type": "workflow_started",
            "workflow_type": self.workflow_type.value,
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
                "outputs": self._state.outputs.get("__workflow_output__", self._state.outputs),
                "elapsed_time": elapsed_time,
            }

        except Exception as e:
            logger.exception("Workflow execution failed")
            elapsed_time = time.time() - self._start_time

            yield {
                "type": "workflow_finished",
                "status": WorkflowExecutionStatus.FAILED.value,
                "error": str(e),
                "elapsed_time": elapsed_time,
            }
