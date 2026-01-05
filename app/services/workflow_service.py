"""
Workflow service for workflow management and execution.

This module handles business logic related to workflow definition
management and execution.
"""

from typing import Dict, Any, Optional

from app.db.models import WorkflowDef
from app.core.workflow import build_graph_from_def
from app.schemas import WorkflowDefResponse, WorkflowDefUpdateRequest


class WorkflowService:
    """Service class for workflow management."""

    @staticmethod
    async def get_workflow_definition(app_id: int) -> Optional[WorkflowDef]:
        """
        Get workflow definition by app ID.
        
        Args:
            app_id: Application ID
            
        Returns:
            WorkflowDef instance or None if not found
        """
        return await WorkflowDef.get_or_none(app_id=app_id)

    @staticmethod
    async def get_workflow_response(app_id: int) -> Optional[WorkflowDefResponse]:
        """
        Get workflow definition response by app ID.
        
        Args:
            app_id: Application ID
            
        Returns:
            WorkflowDefResponse or None if not found
        """
        wf = await WorkflowService.get_workflow_definition(app_id)
        if not wf:
            return None
        return WorkflowDefResponse(app_id=app_id, graph=wf.graph or {})

    @staticmethod
    async def update_workflow_definition(
        app_id: int, 
        payload: WorkflowDefUpdateRequest
    ) -> Optional[WorkflowDefResponse]:
        """
        Update workflow definition.
        
        Args:
            app_id: Application ID
            payload: Workflow update request data
            
        Returns:
            Updated WorkflowDefResponse or None if not found
        """
        wf = await WorkflowService.get_workflow_definition(app_id)
        if not wf:
            return None
        
        wf.graph = payload.graph
        await wf.save()
        
        return WorkflowDefResponse(app_id=app_id, graph=wf.graph or {})

    @staticmethod
    async def execute_workflow(
        graph_def: Dict[str, Any],
        input_data: str
    ) -> str:
        """
        Execute a workflow with given input.
        
        Args:
            graph_def: Workflow graph definition
            input_data: Input data string
            
        Returns:
            Workflow execution output
        """
        graph = build_graph_from_def(graph_def)
        
        result = await graph.ainvoke({
            "messages": [],
            "inputs": {"input": input_data},
            "outputs": {},
            "temp_data": {}
        })
        
        return result.get("outputs", {}).get("final_answer", "")
