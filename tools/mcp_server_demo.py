# mcp_server_demo.py
# 使用 FastMCP 简化实现

from mcp.server.fastmcp import FastMCP

# 初始化 FastMCP 服务器
mcp = FastMCP("本地测试服务器")

@mcp.tool()
def add(a: int, b: int) -> int:
    """两数相加"""
    return a + b

@mcp.tool()
def get_weather(city: str) -> str:
    """获取天气"""
    return f"{city}: 晴天 25°C"

if __name__ == "__main__":
    import uvicorn
    # 获取 SSE 应用并使用 uvicorn 运行
    app = mcp.sse_app()
    uvicorn.run(app, host="0.0.0.0", port=8002)
