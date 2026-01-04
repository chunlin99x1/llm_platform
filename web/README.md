## LLMOps Web（Next.js + HeroUI）

### 环境变量

```bash
cp .env.example .env.local
```

默认后端地址为 `http://localhost:8000`（对应 FastAPI）。

### 启动

```bash
pnpm install
pnpm dev
```

访问：`http://localhost:3000`

### 页面

- `/`：聊天/智能体/工作流 Demo
- `/apps`：应用列表（创建后进入编排）
- `/apps/{appId}/orchestrate`：编排页面（ReactFlow 画布 + 保存/运行预览）
