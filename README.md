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

### 启动前端（Next.js + HeroUI）

```bash
cd fastapi_llmops/web
cp .env.example .env.local
pnpm install
pnpm dev
```

访问：`http://localhost:3000`

### 主要接口

- `POST /chat`：简单对话，入参 `{"messages": [{"role":"user","content":"hi"}]}`。
- `POST /workflow/run`：示例工作流（Start -> LLM -> End），入参 `{"input":"...","context":{}}`。
- `POST /agents`：创建智能体（system prompt + 启用工具）。
- `GET /agents`：智能体列表。
- `POST /agents/{agent_id}/sessions`：创建会话。
- `POST /agents/{agent_id}/chat`：智能体对话（支持工具调用）。
- `POST /apps`：创建应用（默认带一个工作流草稿）。
- `GET /apps`：应用列表。
- `GET /apps/{app_id}/workflow`：获取编排图。
- `PUT /apps/{app_id}/workflow`：保存编排图。
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


### celery 运行
cd backend
PYTHONPATH=. celery -A tasks.celery_app worker --loglevel=info

