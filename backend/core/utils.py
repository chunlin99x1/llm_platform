"""
通用工具函数

提供异步执行、常用工具方法等。

Author: chunlin
"""

import asyncio
from typing import TypeVar, Coroutine, Any

T = TypeVar('T')


def run_async(coro: Coroutine[Any, Any, T]) -> T:
    """
    在同步上下文中运行异步函数。
    
    适用于 Celery 任务等同步环境需要调用异步代码的场景。
    
    Args:
        coro: 协程对象
        
    Returns:
        协程的返回值
        
    Example:
        result = run_async(some_async_function())
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
