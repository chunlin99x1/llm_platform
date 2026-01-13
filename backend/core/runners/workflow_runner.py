"""
Workflow 运行器

用于执行 Workflow 类型应用（单次执行，批量输出）。

Author: chunlin
"""

import time
import logging
from typing import Any, Dict, AsyncGenerator, Optional

from core.enums import WorkflowType, WorkflowExecutionStatus
from .base_runner import BaseWorkflowRunner, WorkflowState
from services.workflow_log_service import WorkflowLogService

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
    
    def __init__(
        self,
        graph_config: Dict[str, Any],
        user_id: str = "",
        app_id: str = "",
        workflow_def_id: int = None,
        enable_logging: bool = True
    ):
        super().__init__(graph_config, user_id, app_id)
        self.workflow_def_id = workflow_def_id
        self.enable_logging = enable_logging
        self._workflow_run_id: Optional[int] = None
        self._node_index = 0

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
        self._node_index = 0
        
        # 创建执行日志
        if self.enable_logging and self.app_id and self.workflow_def_id:
            try:
                run = await WorkflowLogService.create_workflow_run(
                    app_id=int(self.app_id),
                    workflow_def_id=self.workflow_def_id,
                    workflow_type=self.workflow_type,
                    inputs=inputs,
                    graph=self.graph_config,
                    triggered_from=kwargs.get("triggered_from", "app-run")
                )
                self._workflow_run_id = run.id
            except Exception as e:
                logger.warning(f"Failed to create workflow run log: {e}")

        # 发布工作流开始事件
        yield {
            "type": "workflow_started",
            "workflow_type": self.workflow_type.value,
            "workflow_run_id": self._workflow_run_id,
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
            predecessor_node_id = None

            while current_nodes:
                node_id = current_nodes.pop(0)

                if node_id in executed_nodes:
                    continue
                executed_nodes.add(node_id)
                
                # 创建节点执行日志
                node_run_id = None
                if self.enable_logging and self._workflow_run_id:
                    try:
                        node = self.nodes.get(node_id, {})
                        node_type = node.get("data", {}).get("type") or node.get("type", "")
                        node_run = await WorkflowLogService.create_node_run(
                            workflow_run_id=self._workflow_run_id,
                            node_id=node_id,
                            node_type=node_type,
                            title=node.get("data", {}).get("label", node_id),
                            index=self._node_index,
                            predecessor_node_id=predecessor_node_id,
                            inputs=self._state.inputs
                        )
                        node_run_id = node_run.id
                        self._node_index += 1
                    except Exception as e:
                        logger.warning(f"Failed to create node run log: {e}")

                # 执行当前节点
                node_start_time = time.time()
                async for event in self._execute_node(node_id, self._state):
                    yield event
                
                # 更新节点执行日志
                if node_run_id:
                    try:
                        await WorkflowLogService.update_node_run(
                            node_run_id=node_run_id,
                            status="succeeded",
                            outputs=self._state.outputs.get(node_id),
                            elapsed_time=time.time() - node_start_time
                        )
                    except Exception as e:
                        logger.warning(f"Failed to update node run log: {e}")
                
                predecessor_node_id = node_id

                # 如果不是终止节点，继续执行下一个节点
                if not self._is_terminal_node(node_id):
                    next_nodes = self._find_next_nodes(node_id)
                    current_nodes.extend(next_nodes)

            elapsed_time = time.time() - self._start_time
            final_outputs = self._state.outputs.get("__workflow_output__", self._state.outputs)
            
            # 更新执行日志
            if self._workflow_run_id:
                try:
                    await WorkflowLogService.update_workflow_run(
                        run_id=self._workflow_run_id,
                        status="succeeded",
                        outputs=final_outputs,
                        elapsed_time=elapsed_time,
                        total_steps=self._node_index
                    )
                except Exception as e:
                    logger.warning(f"Failed to update workflow run log: {e}")

            # 发布工作流完成事件
            yield {
                "type": "workflow_finished",
                "status": WorkflowExecutionStatus.SUCCEEDED.value,
                "workflow_run_id": self._workflow_run_id,
                "outputs": final_outputs,
                "elapsed_time": elapsed_time,
            }

        except Exception as e:
            logger.exception("Workflow execution failed")
            elapsed_time = time.time() - self._start_time
            
            # 更新执行日志
            if self._workflow_run_id:
                try:
                    await WorkflowLogService.update_workflow_run(
                        run_id=self._workflow_run_id,
                        status="failed",
                        error=str(e),
                        elapsed_time=elapsed_time,
                        total_steps=self._node_index
                    )
                except Exception as log_e:
                    logger.warning(f"Failed to update workflow run log: {log_e}")

            yield {
                "type": "workflow_finished",
                "status": WorkflowExecutionStatus.FAILED.value,
                "workflow_run_id": self._workflow_run_id,
                "error": str(e),
                "elapsed_time": elapsed_time,
            }

