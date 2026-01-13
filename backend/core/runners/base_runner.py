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
    conversation_variables: Dict[str, Any] = field(default_factory=dict)
    
    # 系统变量
    query: str = ""
    user_id: str = ""
    app_id: str = ""
    workflow_id: str = ""
    workflow_run_id: str = ""
    conversation_id: str = ""


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
            user_id=self.user_id,
            app_id=self.app_id,
            workflow_id=self.app_id, # 默认 workflow_id = app_id
        )
    
    def _find_start_node(self) -> Optional[str]:
        """查找起始节点"""
        for node_id, node in self.nodes.items():
            if node.get("data", {}).get("type") == "start" or node.get("type") == "start":
                return node_id
        # 如果没有 start 节点，返回第一个节点
        return list(self.nodes.keys())[0] if self.nodes else None
    
    
    def _find_next_nodes(self, current_node_id: str) -> list[str]:
        """
        查找下一个节点
        支持基于 sourceHandle 的条件路由
        """
        next_nodes = []
        
        # 获取当前节点输出
        node_output = self._state.outputs.get(current_node_id, {})
        
        # 确定选中的 Handle
        selected_handle = None
        if isinstance(node_output, dict):
            # 1. 显式 branch_id (新版多分支)
            if "branch_id" in node_output:
                selected_handle = node_output["branch_id"]
            # 2. 传统 True/False (旧版条件)
            elif "result" in node_output:
                selected_handle = "true" if node_output["result"] else "false"
        
        for edge in self.edges:
            if edge.get("source") == current_node_id:
                source_handle = edge.get("sourceHandle")
                
                # 如果节点输出了明确的分支决策 (Condition Node)
                if selected_handle:
                    # Edge 必须严格匹配该 Handle
                    # 注意：如果 Edge 没有 Handle (None)，也不匹配 explicit handle (e.g. "case_1")
                    if source_handle != selected_handle:
                        continue
                
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
                    "temp_data": state.temp_data,
                    "variables": state.variables,
                    "conversation_variables": state.conversation_variables,
                    "system_variables": {
                        "user_id": state.user_id,
                        "app_id": state.app_id,
                        "query": state.query,
                        "workflow_id": state.workflow_id,
                        "workflow_run_id": state.workflow_run_id,
                        "conversation_id": state.conversation_id,
                    }
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
