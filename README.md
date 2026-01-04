## FastAPI + LangGraph LLMOps 基座（原型）

- FastAPI + LangChain 1.2.0 + LangGraph 1.0.5 + Tortoise ORM 0.25.3。
- 默认使用通义千问（OpenAI 兼容端点）调用，支持工作流编排与聊天示例。
- 无认证、无 OTEL，便于快速起步。

### 环境变量

```bash
export DASHSCOPE_API_KEY="你的 DashScope Key"
export DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export MODEL_NAME="qwen-max"
export DB_URL="postgres://postgres:postgres@localhost:5432/llmops"
```

### 启动

```bash
cd fastapi_llmops
uvicorn app.main:app --reload --port 8000
```

### 本地启动 PostgreSQL（可选）

```bash
cd fastapi_llmops
docker compose up -d
```

### 主要接口

- `POST /chat`：简单对话，入参 `{"messages": [{"role":"user","content":"hi"}]}`。
- `POST /workflow/run`：示例工作流（Start -> LLM -> End），入参 `{"input":"...","context":{}}`。
- `GET /health`：健康检查。

### 目录

- `app/main.py`：FastAPI 入口与路由注册。
- `app/api/routers/`：API 路由（健康、聊天、工作流）。
- `app/core/config.py`：配置（默认通义千问端点）。
- `app/core/llm.py`：OpenAI 兼容调用（LangChain `ChatOpenAI`）。
- `app/core/workflow.py`：LangGraph 示例编排。
- `app/db/models.py`：Tortoise ORM 模型（工作流运行、节点运行、消息）。
- `app/db/db.py`：Tortoise 初始化与关闭。
- `app/schemas/__init__.py`：请求/响应 Schema。
