import ast
import json
import operator as op
from collections.abc import AsyncGenerator, Iterable
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import asyncio

import httpx
from bs4 import BeautifulSoup
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool, BaseTool

from app.core.llm import chat_llm

_BIN_OPS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
}
_UNARY_OPS = {ast.UAdd: op.pos, ast.USub: op.neg}


def _safe_eval_expr(expression: str) -> float:
    node = ast.parse(expression, mode="eval")

    def _eval(n: ast.AST) -> float:
        if isinstance(n, ast.Expression):
            return _eval(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return float(n.value)
        if isinstance(n, ast.UnaryOp) and type(n.op) in _UNARY_OPS:
            return _UNARY_OPS[type(n.op)](_eval(n.operand))
        if isinstance(n, ast.BinOp) and type(n.op) in _BIN_OPS:
            return _BIN_OPS[type(n.op)](_eval(n.left), _eval(n.right))
        raise ValueError("不支持的表达式")

    return _eval(node)


@tool
def calc(expression: str) -> str:
    """计算一个简单数学表达式（仅支持数字与 + - * / // % ** 括号）。"""
    value = _safe_eval_expr(expression)
    if abs(value - int(value)) < 1e-12:
        return str(int(value))
    return str(value)


@tool
def echo(text: str) -> str:
    """回显输入文本，用于测试工具调用链路。"""
    return text


@tool
def get_current_datetime() -> str:
    """获取当前系统的日期和时间。"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
async def web_page_reader(url: str) -> str:
    """读取指定 URL 网页的正文内容。"""
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for s in soup(["script", "style"]):
                s.decompose()
            text = soup.get_text(separator="\n")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return "\n".join(lines)[:4000]
        except Exception as e:
            return f"读取网页失败: {e}"


# 初始化工具实例
ddg_search = DuckDuckGoSearchRun()
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang="zh"))

# Python REPL
from langchain_experimental.utilities import PythonREPL
from langchain_core.tools import Tool

python_repl = PythonREPL()
python_tool = Tool(
    name="python_repl",
    description="一个 Python 交互式外壳。使用它来执行 Python 命令。输入应该是一个有效的 Python 命令。如果你想查看一个值的输出，你应该用 `print(...)` 打印出来。",
    func=python_repl.run,
)

# 文件管理工具
import os
import tempfile
from langchain_community.agent_toolkits import FileManagementToolkit

WORKING_DIR = os.path.join(tempfile.gettempdir(), "llmops_sandbox")
if not os.path.exists(WORKING_DIR):
    os.makedirs(WORKING_DIR)

file_toolkit = FileManagementToolkit(
    root_dir=str(WORKING_DIR),
    selected_tools=["read_file", "write_file", "list_directory", "file_delete"]
)
file_tools = file_toolkit.get_tools()


def _build_tool_registry() -> Dict[str, Any]:
    """
    构建工具注册表，key 统一使用工具的实际 name 属性。
    这样可以确保 LLM 返回的工具名与注册名一致。
    """
    registry: Dict[str, Any] = {}

    # 搜索类
    registry[ddg_search.name] = ddg_search
    registry[wikipedia.name] = wikipedia

    # 计算与代码类
    registry[calc.name] = calc
    registry[python_tool.name] = python_tool

    # 文件类
    for ft in file_tools:
        registry[ft.name] = ft

    # 系统与网络
    registry[get_current_datetime.name] = get_current_datetime
    registry[web_page_reader.name] = web_page_reader
    registry[echo.name] = echo

    return registry


# 全局工具注册表（按工具实际名称索引）
TOOL_REGISTRY: Dict[str, Any] = _build_tool_registry()

# 分类工具映射（用于前端展示）
BUILTIN_TOOLS = {
    "搜索类": {
        ddg_search.name: ddg_search,
        wikipedia.name: wikipedia,
    },
    "计算与代码类": {
        calc.name: calc,
        python_tool.name: python_tool,
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


def resolve_tools(enabled_tools: Optional[Iterable[str]]) -> List[Any]:
    """根据工具名称列表解析出工具对象"""
    if not enabled_tools:
        return []
    tools: List[Any] = []
    for name in enabled_tools:
        tool_obj = TOOL_REGISTRY.get(name)
        if tool_obj is not None:
            tools.append(tool_obj)
    return tools


def _run_async_in_sync(coro):
    """在同步上下文中运行异步协程"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None:
        # 已有事件循环，创建新线程运行
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result()
    else:
        return asyncio.run(coro)


def _invoke_tool(tool_obj: Any, args: Dict[str, Any]) -> str:
    """
    统一的工具调用方法，自动处理同步/异步工具
    """
    try:
        # 检查工具是否有 ainvoke 方法且是异步的
        if hasattr(tool_obj, 'coroutine') and tool_obj.coroutine is not None:
            # 这是一个异步 @tool 装饰的函数
            result = _run_async_in_sync(tool_obj.ainvoke(args))
        elif hasattr(tool_obj, 'ainvoke'):
            # 尝试使用 ainvoke，LangChain 工具通常都有这个方法
            # 对于同步工具，ainvoke 内部会处理
            try:
                loop = asyncio.get_running_loop()
                # 如果已在异步上下文，直接调用 invoke
                result = tool_obj.invoke(args)
            except RuntimeError:
                # 不在异步上下文，可以安全使用 invoke
                result = tool_obj.invoke(args)
        else:
            result = tool_obj.invoke(args)

        return str(result)
    except Exception as e:
        return f"工具执行失败：{e}"


def agent_invoke(
    *,
    system_prompt: Optional[str],
    messages: List[BaseMessage],
    enabled_tools: Optional[Iterable[str]],
    max_iters: int = 8,
) -> Tuple[str, List[BaseMessage], List[Dict[str, Any]]]:
    """
    同步 Agent 调用

    返回：
    - final_text: 最终 assistant 输出
    - all_messages: 包含 tool message 的完整消息链
    - tool_traces: 执行过的工具调用记录（用于前端展示）
    """
    tool_traces: List[Dict[str, Any]] = []
    tools = resolve_tools(enabled_tools)

    llm = chat_llm()
    if tools:
        llm = llm.bind_tools(tools)

    convo: List[BaseMessage] = []
    if system_prompt:
        convo.append(SystemMessage(content=system_prompt))
    convo.extend(messages)

    for i in range(max_iters):
        ai: AIMessage = llm.invoke(convo)
        convo.append(ai)

        tool_calls = getattr(ai, "tool_calls", None) or []
        if not tool_calls:
            final_text = ai.content if isinstance(ai.content, str) else str(ai.content)
            return final_text, convo, tool_traces

        # 执行工具调用
        for j, call in enumerate(tool_calls):
            name = call.get("name")
            args = call.get("args") or {}
            call_id = call.get("id") or f"call_{i}_{j}"

            # 【修复】使用 TOOL_REGISTRY 查找工具
            tool_obj = TOOL_REGISTRY.get(name)

            if tool_obj is None:
                result = f"工具不存在：{name}，可用工具：{list(TOOL_REGISTRY.keys())}"
            else:
                result = _invoke_tool(tool_obj, args)

            tool_traces.append({
                "id": call_id,
                "name": name,
                "args": args,
                "result": result
            })
            convo.append(ToolMessage(content=result, tool_call_id=call_id, name=name))

    return "已达到工具调用迭代上限，请简化问题或关闭部分工具。", convo, tool_traces


async def agent_stream(
    *,
    system_prompt: Optional[str],
    messages: List[BaseMessage],
    enabled_tools: Optional[Iterable[str]],
    max_iters: int = 8,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    流式生成器，输出事件数据包。

    数据包类型：
    - text: 消息文本片段
    - trace: 工具调用开始
    - trace_result: 工具调用结果
    - error: 错误信息
    - done: 完成标记
    """
    tools = resolve_tools(enabled_tools)
    llm = chat_llm()
    if tools:
        llm = llm.bind_tools(tools)

    convo: List[BaseMessage] = []
    if system_prompt:
        convo.append(SystemMessage(content=system_prompt))
    convo.extend(messages)

    for i in range(max_iters):
        ai_msg: Optional[AIMessage] = None

        # 1. 流式获取 LLM 输出
        try:
            async for chunk in llm.astream(convo):
                if ai_msg is None:
                    ai_msg = chunk
                else:
                    ai_msg = ai_msg + chunk

                if chunk.content:
                    text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                    yield {"type": "text", "content": text}
        except Exception as e:
            yield {"type": "error", "content": f"LLM 调用失败: {e}"}
            return

        if ai_msg is None:
            break

        convo.append(ai_msg)

        # 2. 检查工具调用
        tool_calls = getattr(ai_msg, "tool_calls", None) or []
        if not tool_calls:
            yield {"type": "done"}
            return

        # 3. 执行工具
        for j, call in enumerate(tool_calls):
            name = call.get("name")
            args = call.get("args") or {}
            call_id = call.get("id") or f"call_{i}_{j}"

            yield {"type": "trace", "name": name, "args": args, "id": call_id}

            # 【修复】使用 TOOL_REGISTRY 查找工具
            tool_obj = TOOL_REGISTRY.get(name)

            if tool_obj is None:
                result = f"工具不存在：{name}"
            else:
                try:
                    # 使用 ainvoke 处理异步工具
                    res_obj = await tool_obj.ainvoke(args)
                    result = str(res_obj)
                except Exception as e:
                    result = f"工具执行失败：{e}"

            yield {"type": "trace_result", "id": call_id, "result": result}
            convo.append(ToolMessage(content=result, tool_call_id=call_id, name=name))

    yield {"type": "error", "content": "已达到工具调用迭代上限"}
