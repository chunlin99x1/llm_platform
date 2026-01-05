"""
Tool registry and resolution.

This module manages the registration and resolution of tools for the Agent system.
"""

from collections.abc import Iterable
from typing import Any, Dict, List, Optional

from .builtin import calc, echo, get_current_datetime, web_page_reader
from .external import ddg_search, wikipedia, python_tool, file_tools


def _build_tool_registry() -> Dict[str, Any]:
    """
    构建工具注册表，key 统一使用工具的实际 name 属性。
    这样可以确保 LLM 返回的工具名与注册名一致。
    """
    registry = {}
    
    # Built-in tools
    for t in [calc, echo, get_current_datetime, web_page_reader]:
        registry[t.name] = t
    
    # External search tools
    for t in [ddg_search, wikipedia]:
        registry[t.name] = t
    
    # Python REPL
    registry[python_tool.name] = python_tool
    
    # File management tools
    for t in file_tools:
        registry[t.name] = t
    
    return registry


# Global tool registry (indexed by actual tool name)
TOOL_REGISTRY: Dict[str, Any] = _build_tool_registry()

# Categorized tool mapping (for frontend display)
BUILTIN_TOOLS = {
    "搜索类": {
        ddg_search.name: ddg_search,
        wikipedia.name: wikipedia,
    },
    "编程类": {
        python_tool.name: python_tool,
        calc.name: calc,
    },
    "文件类": {
        ft.name: ft for ft in file_tools
    },
    "系统与网络": {
        get_current_datetime.name: get_current_datetime,
        web_page_reader.name: web_page_reader,
        echo.name: echo,
    }
}


def get_all_tool_names() -> List[str]:
    """获取所有可用工具名称列表"""
    return list(TOOL_REGISTRY.keys())


def resolve_tools(enabled_tools: Optional[Iterable[str]] = None) -> List[Any]:
    """根据工具名称列表解析出工具对象"""
    if not enabled_tools:
        return []
    
    tools = []
    for name in enabled_tools:
        if name in TOOL_REGISTRY:
            tools.append(TOOL_REGISTRY[name])
        else:
            print(f"Warning: Tool '{name}' not found in registry")
    
    return tools
