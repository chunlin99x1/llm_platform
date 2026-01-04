import ast
import operator as op
from collections.abc import Iterable
from typing import Any, Dict, List, Optional, Tuple

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


BUILTIN_TOOLS = {
    "calc": calc,
    "echo": echo,
}


def resolve_tools(enabled_tools: Optional[Iterable[str]]) -> List[Any]:
    if not enabled_tools:
        return []
    tools: List[Any] = []
    for name in enabled_tools:
        t = BUILTIN_TOOLS.get(name)
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
                    result = tool_obj.invoke(args)  # type: ignore[attr-defined]
                except Exception as e:
                    result = f"工具执行失败：{e}"

            tool_traces.append({"id": call_id, "name": name, "args": args, "result": str(result)})
            convo.append(ToolMessage(content=str(result), tool_call_id=call_id, name=name))

    # 达到迭代上限
    return "已达到工具调用迭代上限，请简化问题或关闭部分工具。", convo, tool_traces

