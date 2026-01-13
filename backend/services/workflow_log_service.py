"""
工作流执行日志服务

处理 WorkflowRun 和 NodeRun 的创建和更新。

Author: chunlin
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from tortoise.transactions import in_transaction

from database.models import App, WorkflowDef, WorkflowRun, NodeRun
from core.enums import WorkflowType


class WorkflowLogService:
    """工作流执行日志服务"""
    
    @staticmethod
    async def create_workflow_run(
        app_id: int,
        workflow_def_id: int,
        workflow_type: WorkflowType,
        inputs: Dict[str, Any],
        graph: Dict[str, Any] = None,
        triggered_from: str = "app-run",
        conversation_id: str = None
    ) -> WorkflowRun:
        """
        创建工作流运行记录
        
        Args:
            app_id: 应用 ID
            workflow_def_id: 工作流定义 ID
            workflow_type: 工作流类型
            inputs: 输入参数
            graph: 运行时图快照
            triggered_from: 触发来源 (debugging/app-run)
            conversation_id: 会话 ID (Chatflow)
            
        Returns:
            WorkflowRun 实例
        """
        async with in_transaction():
            run = await WorkflowRun.create(
                app_id=app_id,
                workflow_def_id=workflow_def_id,
                type=workflow_type.value,
                triggered_from=triggered_from,
                inputs=inputs,
                graph=graph,
                status="running"
            )
        return run
    
    @staticmethod
    async def update_workflow_run(
        run_id: int,
        status: str = None,
        outputs: Dict[str, Any] = None,
        error: str = None,
        elapsed_time: float = None,
        total_tokens: int = None,
        total_steps: int = None
    ) -> Optional[WorkflowRun]:
        """
        更新工作流运行记录
        
        Args:
            run_id: 运行记录 ID
            status: 状态 (succeeded/failed/stopped)
            outputs: 输出结果
            error: 错误信息
            elapsed_time: 执行时间
            total_tokens: 总 token 数
            total_steps: 总步骤数
            
        Returns:
            更新后的 WorkflowRun 或 None
        """
        run = await WorkflowRun.get_or_none(id=run_id)
        if not run:
            return None
        
        async with in_transaction():
            if status:
                run.status = status
            if outputs is not None:
                run.outputs = outputs
            if error:
                run.error = error
            if elapsed_time is not None:
                run.elapsed_time = elapsed_time
            if total_tokens is not None:
                run.total_tokens = total_tokens
            if total_steps is not None:
                run.total_steps = total_steps
            
            if status in ("succeeded", "failed", "stopped"):
                run.finished_at = datetime.now()
            
            await run.save()
        
        return run
    
    @staticmethod
    async def create_node_run(
        workflow_run_id: int,
        node_id: str,
        node_type: str,
        title: str = None,
        index: int = 0,
        predecessor_node_id: str = None,
        inputs: Dict[str, Any] = None
    ) -> NodeRun:
        """
        创建节点运行记录
        
        Args:
            workflow_run_id: 工作流运行 ID
            node_id: 节点 ID
            node_type: 节点类型
            title: 节点标题
            index: 执行顺序
            predecessor_node_id: 前置节点 ID
            inputs: 输入参数
            
        Returns:
            NodeRun 实例
        """
        async with in_transaction():
            node_run = await NodeRun.create(
                workflow_run_id=workflow_run_id,
                node_id=node_id,
                node_type=node_type,
                title=title or node_id,
                index=index,
                predecessor_node_id=predecessor_node_id,
                inputs=inputs,
                status="running"
            )
        return node_run
    
    @staticmethod
    async def update_node_run(
        node_run_id: int,
        status: str = None,
        outputs: Dict[str, Any] = None,
        process_data: Dict[str, Any] = None,
        error: str = None,
        elapsed_time: float = None,
        execution_metadata: Dict[str, Any] = None
    ) -> Optional[NodeRun]:
        """
        更新节点运行记录
        
        Args:
            node_run_id: 节点运行 ID
            status: 状态 (succeeded/failed)
            outputs: 输出结果
            process_data: 处理过程数据
            error: 错误信息
            elapsed_time: 执行时间
            execution_metadata: 执行元数据
            
        Returns:
            更新后的 NodeRun 或 None
        """
        node_run = await NodeRun.get_or_none(id=node_run_id)
        if not node_run:
            return None
        
        async with in_transaction():
            if status:
                node_run.status = status
            if outputs is not None:
                node_run.outputs = outputs
            if process_data is not None:
                node_run.process_data = process_data
            if error:
                node_run.error = error
            if elapsed_time is not None:
                node_run.elapsed_time = elapsed_time
            if execution_metadata is not None:
                node_run.execution_metadata = execution_metadata
            
            if status in ("succeeded", "failed"):
                node_run.finished_at = datetime.now()
            
            await node_run.save()
        
        return node_run
    
    @staticmethod
    async def get_workflow_run(run_id: int) -> Optional[WorkflowRun]:
        """获取工作流运行记录"""
        return await WorkflowRun.get_or_none(id=run_id)
    
    @staticmethod
    async def list_workflow_runs(
        app_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> List[WorkflowRun]:
        """获取应用的工作流运行记录列表"""
        return await WorkflowRun.filter(app_id=app_id).order_by("-id").offset(offset).limit(limit)
    
    @staticmethod
    async def list_node_runs(workflow_run_id: int) -> List[NodeRun]:
        """获取工作流运行的所有节点记录"""
        return await NodeRun.filter(workflow_run_id=workflow_run_id).order_by("index")
