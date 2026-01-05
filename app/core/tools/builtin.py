"""
内置工具模块

提供自定义的内置工具，包括计算器、时间获取、网页读取等。

Author: chunlin
"""

import ast
import operator as op
from datetime import datetime
from typing import Any

import httpx
from bs4 import BeautifulSoup
from langchain_core.tools import tool


# Safe expression evaluation helpers
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
    """Safely evaluate a mathematical expression."""
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
        raise ValueError("Unsupported expression")

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
