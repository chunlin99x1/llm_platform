from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from core.mcp import fetch_mcp_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])

class MCPToolResponse(BaseModel):
    name: str
    description: Optional[str]
    input_schema: Dict[str, Any]

class FetchToolsRequest(BaseModel):
    url: str

@router.post("/tools", response_model=List[MCPToolResponse])
async def list_mcp_tools(payload: FetchToolsRequest):
    """
    连接 MCP 服务器并列出可用工具。
    """
    try:
        tools = await fetch_mcp_tools(payload.url)
        return tools
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch tools: {str(e)}")
