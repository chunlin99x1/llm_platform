"""
并行执行和错误重试控制器

提供工作流的并行执行能力和节点失败重试机制。

Author: chunlin
"""

import asyncio
import time
import logging
from typing import Any, Dict, List, AsyncGenerator, Callable, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RetryConfig:
    """重试配置"""
    max_retries: int = 3
    retry_delay: float = 1.0  # 秒
    exponential_backoff: bool = True
    retryable_exceptions: tuple = (Exception,)


@dataclass 
class ParallelResult:
    """并行执行结果"""
    node_id: str
    success: bool
    result: Any = None
    error: str = None
    elapsed_time: float = 0.0


async def execute_with_retry(
    func: Callable,
    config: RetryConfig = None,
    *args,
    **kwargs
) -> Any:
    """
    带重试的异步函数执行
    
    Args:
        func: 要执行的异步函数
        config: 重试配置
        *args, **kwargs: 函数参数
        
    Returns:
        函数执行结果
        
    Raises:
        最后一次重试的异常
    """
    if config is None:
        config = RetryConfig()
    
    last_exception = None
    
    for attempt in range(config.max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except config.retryable_exceptions as e:
            last_exception = e
            
            if attempt < config.max_retries:
                delay = config.retry_delay
                if config.exponential_backoff:
                    delay = config.retry_delay * (2 ** attempt)
                
                logger.warning(
                    f"Retry {attempt + 1}/{config.max_retries} after error: {e}. "
                    f"Retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"All {config.max_retries} retries failed: {e}")
                raise
    
    raise last_exception


async def execute_parallel(
    tasks: List[Dict[str, Any]],
    executor: Callable,
    max_concurrency: int = 5
) -> List[ParallelResult]:
    """
    并行执行多个任务
    
    Args:
        tasks: 任务列表，每个任务是 {"node_id": str, "args": dict}
        executor: 执行函数 async def executor(node_id, **args) -> Any
        max_concurrency: 最大并发数
        
    Returns:
        并行执行结果列表
    """
    semaphore = asyncio.Semaphore(max_concurrency)
    
    async def run_task(task: Dict[str, Any]) -> ParallelResult:
        node_id = task.get("node_id", "unknown")
        args = task.get("args", {})
        
        async with semaphore:
            start_time = time.time()
            try:
                result = await executor(node_id, **args)
                return ParallelResult(
                    node_id=node_id,
                    success=True,
                    result=result,
                    elapsed_time=time.time() - start_time
                )
            except Exception as e:
                return ParallelResult(
                    node_id=node_id,
                    success=False,
                    error=str(e),
                    elapsed_time=time.time() - start_time
                )
    
    results = await asyncio.gather(*[run_task(t) for t in tasks])
    return list(results)


async def execute_parallel_nodes(
    node_ids: List[str],
    execute_node_func: Callable,
    state: Dict[str, Any],
    max_concurrency: int = 5
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    并行执行多个节点
    
    Args:
        node_ids: 要并行执行的节点 ID 列表
        execute_node_func: 节点执行函数
        state: 工作流状态
        max_concurrency: 最大并发数
        
    Yields:
        执行事件
    """
    if not node_ids:
        return
    
    yield {
        "type": "parallel_started",
        "node_ids": node_ids,
        "count": len(node_ids)
    }
    
    semaphore = asyncio.Semaphore(max_concurrency)
    completed = 0
    results = {}
    
    async def run_node(node_id: str) -> Dict[str, Any]:
        nonlocal completed
        async with semaphore:
            events = []
            try:
                async for event in execute_node_func(node_id, state):
                    events.append(event)
                completed += 1
                return {"node_id": node_id, "success": True, "events": events}
            except Exception as e:
                completed += 1
                return {"node_id": node_id, "success": False, "error": str(e)}
    
    # 并行执行所有节点
    tasks = [run_node(nid) for nid in node_ids]
    node_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 处理结果
    for result in node_results:
        if isinstance(result, Exception):
            yield {
                "type": "parallel_node_error",
                "error": str(result)
            }
        elif isinstance(result, dict):
            node_id = result.get("node_id")
            results[node_id] = result
            
            # 转发节点事件
            for event in result.get("events", []):
                yield event
    
    yield {
        "type": "parallel_finished",
        "node_ids": node_ids,
        "success_count": sum(1 for r in results.values() if r.get("success")),
        "failed_count": sum(1 for r in results.values() if not r.get("success"))
    }


class NodeExecutionController:
    """
    节点执行控制器
    
    提供重试和并行执行能力。
    """
    
    def __init__(
        self,
        retry_config: RetryConfig = None,
        max_concurrency: int = 5
    ):
        self.retry_config = retry_config or RetryConfig()
        self.max_concurrency = max_concurrency
    
    async def execute_with_retry(
        self,
        execute_func: Callable,
        node_id: str,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        带重试的节点执行
        
        Yields:
            执行事件
        """
        last_error = None
        
        for attempt in range(self.retry_config.max_retries + 1):
            try:
                if attempt > 0:
                    yield {
                        "type": "node_retry",
                        "node_id": node_id,
                        "attempt": attempt + 1,
                        "max_retries": self.retry_config.max_retries
                    }
                
                async for event in execute_func(node_id, **kwargs):
                    yield event
                return  # 成功执行
                
            except Exception as e:
                last_error = e
                
                if attempt < self.retry_config.max_retries:
                    delay = self.retry_config.retry_delay
                    if self.retry_config.exponential_backoff:
                        delay = self.retry_config.retry_delay * (2 ** attempt)
                    
                    yield {
                        "type": "node_retry_scheduled",
                        "node_id": node_id,
                        "attempt": attempt + 1,
                        "delay": delay,
                        "error": str(e)
                    }
                    await asyncio.sleep(delay)
        
        # 所有重试失败
        yield {
            "type": "node_retry_failed",
            "node_id": node_id,
            "attempts": self.retry_config.max_retries + 1,
            "error": str(last_error)
        }
        raise last_error
