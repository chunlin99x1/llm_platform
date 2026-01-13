"""HTTP 请求节点执行器"""

from typing import Dict, Any, AsyncGenerator
import httpx
from core.variable_resolver import resolve_variables


async def execute_http_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 HTTP 请求节点。
    """
    # 使用统一变量解析器
    url = resolve_variables(node_data.get("url", ""), state)
    method = node_data.get("method", "GET").upper()
    headers = node_data.get("headers", {})
    body = resolve_variables(node_data.get("body", ""), state)
    
    async with httpx.AsyncClient(timeout=30) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, content=body)
        elif method == "PUT":
            resp = await client.put(url, headers=headers, content=body)
        elif method == "DELETE":
            resp = await client.delete(url, headers=headers)
        else:
            resp = await client.request(method, url, headers=headers, content=body)
    
    result = {
        "status_code": resp.status_code,
        "text": resp.text,
        "body": resp.text
    }
    
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }

