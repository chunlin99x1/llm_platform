"""
应用服务模块

处理应用的创建、查询、管理等业务逻辑。

Author: chunlin
"""

from typing import List, Optional

from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from database.models import App, WorkflowDef
from schemas import AppCreateRequest, AppResponse


class AppService:
    """Service class for application management."""

    @staticmethod
    def _default_workflow_graph() -> dict:
        """Generate default workflow graph structure."""
        return {
            "nodes": [
                {"id": "start", "type": "start", "position": {"x": 120, "y": 80}, "data": {"label": "开始"}},
                {
                    "id": "llm",
                    "type": "llm",
                    "position": {"x": 120, "y": 220},
                    "data": {"label": "LLM", "prompt": "请根据用户输入生成回答。"},
                },
                {"id": "end", "type": "end", "position": {"x": 120, "y": 360}, "data": {"label": "结束"}},
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "llm"},
                {"id": "e2", "source": "llm", "target": "end"},
            ],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }

    @staticmethod
    def _default_agent_config() -> dict:
        """Generate default agent configuration."""
        return {
            "instructions": "你是一个有用的 AI 助手。",
            "enabled_tools": []
        }

    @staticmethod
    async def create_app(payload: AppCreateRequest) -> AppResponse:
        """
        Create a new application with default workflow/agent configuration.
        
        Args:
            payload: Application creation request data
            
        Returns:
            Created application response
            
        Raises:
            IntegrityError: If app name already exists
        """
        async with in_transaction():
            app = await App.create(name=payload.name, mode=payload.mode)

            default_graph = (
                AppService._default_agent_config() 
                if app.mode == "agent" 
                else AppService._default_workflow_graph()
            )
            await WorkflowDef.create(app=app, graph=default_graph)

        return AppResponse(id=app.id, name=app.name, mode=app.mode)

    @staticmethod
    async def list_apps(name: Optional[str] = None, mode: Optional[str] = None) -> List[AppResponse]:
        """
        List applications with optional filtering.
        
        Args:
            name: Optional name filter (case-insensitive contains)
            mode: Optional mode filter
            
        Returns:
            List of application responses
        """
        query = App.all()
        
        if name:
            query = query.filter(name__icontains=name)
        if mode and mode != "all":
            query = query.filter(mode=mode)

        apps = await query.order_by("-id")
        return [AppResponse(id=a.id, name=a.name, mode=a.mode) for a in apps]

    @staticmethod
    async def get_app(app_id: int) -> Optional[App]:
        """
        Get application by ID.
        
        Args:
            app_id: Application ID
            
        Returns:
            App model instance or None if not found
        """
        return await App.get_or_none(id=app_id)

    @staticmethod
    async def get_app_response(app_id: int) -> Optional[AppResponse]:
        """
        Get application response by ID.
        
        Args:
            app_id: Application ID
            
        Returns:
            Application response or None if not found
        """
        app = await AppService.get_app(app_id)
        if not app:
            return None
        return AppResponse(id=app.id, name=app.name, mode=app.mode)
