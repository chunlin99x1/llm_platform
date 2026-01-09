"""
MCP (Model Context Protocol) 核心适配模块

利用 langchain-mcp-adapters 将外部 MCP 服务器工具集成到 LangChain 生态中。
使用 AsyncExitStack 管理多个 MCP 连接的生命周期。

Author: chunlin
"""

import logging
from contextlib import asynccontextmanager, AsyncExitStack
from typing import List, Dict, Any, AsyncGenerator

from langchain_core.tools import BaseTool
from mcp.client.session import ClientSession
from mcp.client.sse import sse_client
from langchain_mcp_adapters.tools import load_mcp_tools

logger = logging.getLogger(__name__)

@asynccontextmanager
async def mcp_connection_manager(mcp_servers: List[Dict[str, Any]]) -> AsyncGenerator[List[BaseTool], None]:
    """
    上下文管理器：管理多个 MCP 服务器连接并产生工具列表。

    server_config:
    {
        "url": "http://localhost:8000/sse",
        "name": "Server Name"
    }
    """
    if not mcp_servers:
        yield []
        return

    async with AsyncExitStack() as stack:
        all_tools = []

        for server in mcp_servers:
            url = server.get("url")
            name = server.get("name", "Unknown MCP")
            print(url)

            if not url:
                continue

            try:
                # 1. 建立 SSE 传输层连接
                # 显式设置超时时间，防止长连接断开
                # sse_client 是一个 async context manager，返回 (read_stream, write_stream)
                read_stream, write_stream = await stack.enter_async_context(
                    sse_client(url, timeout=30, sse_read_timeout=60 * 60)
                )
                
                # 2. 初始化 ClientSession
                # ClientSession 也是 async context manager
                session = await stack.enter_async_context(ClientSession(read_stream, write_stream))

                # 3. 初始化协议
                await session.initialize()

                # 4. 加载工具
                # load_mcp_tools 需要传入 session 对象
                tools = await load_mcp_tools(session)

                # 5. 为每个工具添加 MCP 服务器名称元数据
                for tool in tools:
                    # 使用 object.__setattr__ 绕过 Pydantic 验证
                    # 因为 StructuredTool 是 Pydantic 模型，不能直接设置任意属性
                    object.__setattr__(tool, 'mcp_server_name', name)
                
                all_tools.extend(tools)
                logger.info(f"MCP: 已连接至 {name}, 加载工具数: {len(tools)}")

            except Exception as e:
                logger.error(f"MCP: 连接服务器失败 {name} ({url})", exc_info=True)
                if hasattr(e, 'exceptions'):
                    for idx, sub_exc in enumerate(e.exceptions):
                        logger.error(f"MCP Sub-exception {idx}: {sub_exc}")

        # 将所有加载到的工具 yield 给调用方使用
        # 连接会在退出此上下文时自动关闭
        print(all_tools)
        yield all_tools

