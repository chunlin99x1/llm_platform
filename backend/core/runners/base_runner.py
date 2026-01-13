"""
工作流运行器基类

提供 Workflow 和 Chatflow 共享的基础逻辑。

Author: chunlin
"""

import time
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, AsyncGenerator, Optional
from dataclasses import dataclass, field

from backend.core.enums import WorkflowType, NodeExecutionStatus, WorkflowExecutionStatus

logger = logging.getLogger(__name__)


@dataclass
class WorkflowState:
    """工作流执行状态"""
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    temp_data: Dict[str, Any] = field(default_factory=dict)
    variables: Dict[str, Any] = field(default_factory=dict)
    
    # 系统变量
    user_id: str = ""
    app_id: str = ""
    workflow_id: str = ""
    workflow_run_id: str = ""


@dataclass
class NodeExecutionResult:
    """节点执行结果"""
    node_id: str
    node_type: str
    status: NodeExecutionStatus
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    elapsed_time: float = 0.0


class BaseWorkflowRunner(ABC):
    """
    工作流运行器基类
    
    Workflow 和 Chatflow 的共享基础逻辑：
    - 图解析和节点执行
    - 事件发布
    - 执行状态管理
    """
    
    def __init__(
        self,
        graph_config: Dict[str, Any],
        user_id: str = "",
        app_id: str = "",
    ):
        self.graph_config = graph_config
        self.user_id = user_id
        self.app_id = app_id
        
        self.nodes = {n["id"]: n for n in graph_config.get("nodes", [])}
        self.edges = graph_config.get("edges", [])
        
        self._state: Optional[WorkflowState] = None
        self._start_time: float = 0.0
    
    @property
    def workflow_type(self) -> WorkflowType:
        """子类必须实现：返回工作流类型"""
        raise NotImplementedError
    
    @abstractmethod
    async def run(
        self,
        inputs: Dict[str, Any],
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行工作流
        
        Args:
            inputs: 用户输入
            **kwargs: 额外参数
            
        Yields:
            执行事件
        """
        pass
    
    def _init_state(self, inputs: Dict[str, Any]) -> WorkflowState:
        """初始化执行状态"""
        return WorkflowState(
            inputs=inputs,
            outputs={},
            user_id=self.user_id,
            app_id=self.app_id,
        )
    
    def _find_start_node(self) -> Optional[str]:
        """查找起始节点"""
        for node_id, node in self.nodes.items():
            if node.get("data", {}).get("type") == "start" or node.get("type") == "start":
                return node_id
        # 如果没有 start 节点，返回第一个节点
        return list(self.nodes.keys())[0] if self.nodes else None
    
    def _find_next_nodes(self, current_node_id: str) -> list[str]:
        """查找下一个节点"""
        next_nodes = []
        for edge in self.edges:
            if edge.get("source") == current_node_id:
                next_nodes.append(edge.get("target"))
        return next_nodes
    
    def _is_terminal_node(self, node_id: str) -> bool:
        """判断是否为终止节点"""
        node = self.nodes.get(node_id, {})
        node_type = node.get("data", {}).get("type") or node.get("type", "")
        return node_type in ("end", "answer")
    
    async def _execute_node(
        self,
        node_id: str,
        state: WorkflowState,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行单个节点
        
        Yields:
            节点执行事件
        """
        from backend.core.nodes import execute_node
        
        node = self.nodes.get(node_id)
        if not node:
            yield {"type": "error", "message": f"Node {node_id} not found"}
            return
        
        node_data = node.get("data", {})
        node_type = node_data.get("type") or node.get("type", "")
        
        start_time = time.time()
        
        # 发布节点开始事件
        yield {
            "type": "node_started",
            "node_id": node_id,
            "node_type": node_type,
        }
        
        try:
            # 执行节点
            async for event in execute_node(
                node_id=node_id,
                node_type=node_type,
                node_data=node_data,
                state={
                    "inputs": state.inputs,
                    "outputs": state.outputs,
                    "temp_data": state.temp_data,
                    "variables": state.variables,
                },
                edges=self.edges
            ):
                yield event
            
            elapsed_time = time.time() - start_time
            
            # 发布节点完成事件
            yield {
                "type": "node_finished",
                "node_id": node_id,
                "node_type": node_type,
                "status": NodeExecutionStatus.SUCCEEDED.value,
                "elapsed_time": elapsed_time,
            }
            
        except Exception as e:
            logger.exception(f"Node {node_id} execution failed")
            yield {
                "type": "node_finished",
                "node_id": node_id,
                "node_type": node_type,
                "status": NodeExecutionStatus.FAILED.value,
                "error": str(e),
            }
            raise
