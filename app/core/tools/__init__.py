"""
工具模块

为 Agent 系统提供工具管理和注册功能。

Author: chunlin
"""

from .registry import TOOL_REGISTRY, get_all_tool_names, resolve_tools
from .builtin import calc, echo, get_current_datetime, web_page_reader

__all__ = [
    "TOOL_REGISTRY",
    "get_all_tool_names",
    "resolve_tools",
    "calc",
    "echo",
    "get_current_datetime",
    "web_page_reader",
]
