"""HTTP 请求节点执行器"""

from typing import Dict, Any, AsyncGenerator
import httpx


async def execute_http_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 HTTP 请求节点。
    """
    url = node_data.get("url", "")
    method = node_data.get("method", "GET").upper()
    headers = node_data.get("headers", {})
    body = node_data.get("body", "")
    
    # 变量替换
    for k, v in state["inputs"].items():
        url = url.replace(f"{{{{{k}}}}}", str(v))
        body = body.replace(f"{{{{{k}}}}}", str(v))
    
    for out_node_id, out_data in state["outputs"].items():
        if isinstance(out_data, dict):
            for out_key, out_val in out_data.items():
                url = url.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))
                body = body.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))
    
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
