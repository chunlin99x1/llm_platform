"""代码执行节点执行器

使用 LangChain PythonREPL 执行 Python 代码。
"""

from typing import Dict, Any, AsyncGenerator
import asyncio
from concurrent.futures import ThreadPoolExecutor


async def execute_code_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行代码节点：使用 LangChain PythonREPL 运行 Python 代码。
    """
    from langchain_experimental.utilities import PythonREPL
    
    code = node_data.get("code", "")
    
    # 准备上下文变量
    # 构建可在代码中访问的变量
    context_code = ""
    for k, v in state["inputs"].items():
        if isinstance(v, str):
            context_code += f'{k} = """{v}"""\n'
        else:
            context_code += f'{k} = {repr(v)}\n'
    
    for out_node_id, out_data in state["outputs"].items():
        safe_name = out_node_id.replace("-", "_")
        if isinstance(out_data, dict):
            context_code += f'{safe_name} = {repr(out_data)}\n'
    
    # 组合完整代码
    full_code = context_code + "\n" + code
    
    # 使用 PythonREPL 执行
    repl = PythonREPL()
    
    # 在线程池中执行（避免阻塞）
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        try:
            output = await loop.run_in_executor(executor, repl.run, full_code)
            result = {"output": output.strip(), "success": True}
        except Exception as e:
            result = {"error": str(e), "success": False}
    
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }
