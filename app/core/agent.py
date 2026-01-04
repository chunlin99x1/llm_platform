import ast
import operator as op
from collections.abc import Iterable
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from bs4 import BeautifulSoup
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

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
    # 去掉 1.0 这种尾零
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
            # 移除脚本和样式
            for s in soup(["script", "style"]):
                s.decompose()
            text = soup.get_text(separator="\n")
            # 简单清洗
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return "\n".join(lines)[:4000]  # 限制长度
        except Exception as e:
            return f"读取网页失败: {e}"


# 初始化工具实例
ddg_search = DuckDuckGoSearchRun()
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang="zh"))

# 高级工具：Python REPL (代码执行)
from langchain_experimental.utilities import PythonREPL
from langchain_core.tools import Tool

python_repl = PythonREPL()
python_tool = Tool(
    name="python_repl",
    description="一个 Python 交互式外壳。使用它来执行 Python 命令。输入应该是一个有效的 Python 命令。如果你想查看一个值的输出，你应该用 `print(...)` 打印出来。",
    func=python_repl.run,
)

# 高级工具：文件管理工具
import os
import tempfile
from langchain_community.agent_toolkits import FileManagementToolkit

# 为每个会话或全局创建一个沙盒目录 (简化处理，物理路径可配置)
WORKING_DIR = os.path.join(tempfile.gettempdir(), "llmops_sandbox")
if not os.path.exists(WORKING_DIR):
    os.makedirs(WORKING_DIR)

file_toolkit = FileManagementToolkit(
    root_dir=str(WORKING_DIR),
    selected_tools=["read_file", "write_file", "list_directory", "file_delete"]
)
file_tools = file_toolkit.get_tools()

# 定义工具分类与映射
# 这里的 key 是前端渲染使用的标识名
BUILTIN_TOOLS = {
    "搜索类": {
        "google_search": ddg_search,
        "wikipedia": wikipedia,
    },
    "计算与代码类": {
        "calc": calc,
        "python_repl": python_tool,
    },
    "文件类": {
        "read_file": [t for t in file_tools if t.name == "read_file"][0],
        "write_file": [t for t in file_tools if t.name == "write_file"][0],
        "list_directory": [t for t in file_tools if t.name == "list_directory"][0],
        "file_delete": [t for t in file_tools if t.name == "file_delete"][0],
    },
    "系统与网络": {
        "current_datetime": get_current_datetime,
        "web_page_reader": web_page_reader,
        "echo": echo,
    }
}


def _get_flat_builtin_tools() -> Dict[str, Any]:
    """将分类工具展平，方便按名称查找。"""
    flat = {}
    for cat_tools in BUILTIN_TOOLS.values():
        flat.update(cat_tools)
    return flat


def resolve_tools(enabled_tools: Optional[Iterable[str]]) -> List[Any]:
    if not enabled_tools:
        return []
    flat_tools = _get_flat_builtin_tools()
    tools: List[Any] = []
    for name in enabled_tools:
        t = flat_tools.get(name)
        if t is not None:
            tools.append(t)
    return tools


def agent_invoke(
    *,
    system_prompt: Optional[str],
    messages: List[BaseMessage],
    enabled_tools: Optional[Iterable[str]],
    max_iters: int = 8,
) -> Tuple[str, List[BaseMessage], List[Dict[str, Any]]]:
    """
    返回：
    - final_text: 最终 assistant 输出
    - all_messages: 包含 tool message 的完整消息链
    - tool_traces: 执行过的工具调用记录（用于前端展示）
    """
    import asyncio
    
    tool_traces: List[Dict[str, Any]] = []
    tools = resolve_tools(enabled_tools)

    llm = chat_llm()
    if tools:
        llm = llm.bind_tools(tools)  # type: ignore[assignment]

    convo: List[BaseMessage] = []
    if system_prompt:
        convo.append(SystemMessage(content=system_prompt))
    convo.extend(messages)

    for i in range(max_iters):
        ai: AIMessage = llm.invoke(convo)  # type: ignore[assignment]
        convo.append(ai)

        tool_calls = getattr(ai, "tool_calls", None) or []
        if not tool_calls:
            final_text = ai.content if isinstance(ai.content, str) else str(ai.content)
            return final_text, convo, tool_traces

        # 执行工具调用，并把结果作为 ToolMessage 回填
        for j, call in enumerate(tool_calls):
            name = call.get("name")
            args = call.get("args") or {}
            call_id = call.get("id") or f"call_{i}_{j}"
            tool_obj = BUILTIN_TOOLS.get(name)
            
            if tool_obj is None:
                result = f"工具不存在：{name}"
            else:
                try:
                    # 判断是否为协程（web_page_reader 是异步的）
                    if asyncio.iscoroutinefunction(tool_obj.invoke) or asyncio.iscoroutine(tool_obj.invoke(args)):
                         # 这里 agent_invoke 目前是在线程池运行的同步函数，
                         # 如果工具是异步的，需要在一个事件循环中跑
                         try:
                             loop = asyncio.get_event_loop()
                         except RuntimeError:
                             loop = asyncio.new_event_loop()
                             asyncio.set_event_loop(loop)
                         
                         if asyncio.iscoroutinefunction(tool_obj.invoke):
                            result = loop.run_until_complete(tool_obj.ainvoke(args))
                         else:
                            # 这种情况下 tool_obj 可能是直接定义的 @tool 异步函数
                            # LangChain 的 tool.invoke 会处理同步/异步，但这里我们绕过了点
                            result = loop.run_until_complete(tool_obj.ainvoke(args))
                    else:
                        result = tool_obj.invoke(args)
                except Exception as e:
                    result = f"工具执行失败：{e}"

            tool_traces.append({"id": call_id, "name": name, "args": args, "result": str(result)})
            convo.append(ToolMessage(content=str(result), tool_call_id=call_id, name=name))

    # 达到迭代上限
    return "已达到工具调用迭代上限，请简化问题或关闭部分工具。", convo, tool_traces

