export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  session_id?: string;
  messages: ChatMessage[];
};

export type ChatResponse = {
  content: string;
};

export type WorkflowRunRequest = {
  input: string;
  context?: Record<string, unknown>;
};

export type WorkflowRunResponse = {
  run_id: number;
  output: string;
};

export type Agent = {
  id: number;
  name: string;
  description?: string | null;
  system_prompt?: string | null;
  enabled_tools: string[];
};

export type AgentCreateRequest = {
  name: string;
  description?: string;
  system_prompt?: string;
  enabled_tools?: string[];
};

export type AgentSessionCreateRequest = {
  title?: string;
};

export type AgentSessionResponse = {
  session_id: string;
};

export type AgentToolTrace = {
  id: string;
  name?: string | null;
  args: Record<string, unknown>;
  result: string;
  mcp_server?: string | null;  // MCP 服务器名称，如果是 MCP 工具
};

export type PromptVariable = {
  key: string;
  name: string;
  type: "string" | "number" | "select";
  required?: boolean;
  options?: string[];
  max_length?: number;
};

export type MCPServer = {
  id: string;
  name: string;
  url: string;
  status?: "connected" | "disconnected" | "error";
  tools?: {
    name: string;
    description?: string;
    input_schema: Record<string, unknown>;
  }[];
};


export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  config?: Record<string, unknown>;
}

// Workflow Node Types
export interface WorkflowNodeData {
  label?: string;
  prompt?: string;
  model?: string;
  modelConfig?: {
    provider: string;
    model: string;
    parameters?: Record<string, unknown>;
  };
  variables?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
  }>;
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description?: string | null;
  document_count: number;
  created_at: string;
  embedding_provider?: string;
  embedding_model?: string;
  retrieval_mode?: string;
  rerank_provider?: string;
  rerank_model?: string;
}

export interface KnowledgeSettings {
  top_k?: number;  // 返回结果数量，默认 3
  retrieval_mode?: "semantic" | "keyword" | "hybrid";  // 检索方式，默认 hybrid
  score_threshold?: number;  // 分数阈值，默认 0.0
  rerank_enabled?: boolean;  // 是否启用重排序，默认 false
  rerank_provider?: string;  // 重排序模型供应商（覆盖知识库配置）
  rerank_model?: string;  // 重排序模型名称（覆盖知识库配置）
  rerank_top_k?: number;  // 重排序返回数量，默认 3
  fallback_to_model?: boolean;  // 没有命中时是否使用模型知识，默认 true
}

export type AgentChatRequest = {
  session_id?: string;
  input: string;
  instructions?: string;
  enabled_tools?: string[];
  mcp_servers?: MCPServer[];
  llm_config?: Record<string, unknown>;
  knowledge_base_ids?: number[];  // 关联的知识库 ID 列表
  knowledge_settings?: KnowledgeSettings;  // 知识库检索设置
  inputs?: Record<string, unknown>;
};

export type AgentChatResponse = {
  session_id: string;
  content: string;
  tool_traces: AgentToolTrace[];
};

export type AppMode = "workflow" | "chatflow" | "agent";

export type AppItem = {
  id: number;
  name: string;
  description?: string;
  mode: AppMode;
  icon?: string;
  icon_background?: string;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AppCreateRequest = {
  name: string;
  description?: string;
  mode?: AppMode;
};


export type WorkflowGraph = {
  nodes?: unknown[];
  edges?: unknown[];
  viewport?: Record<string, unknown>;
  [k: string]: unknown;
};

export type WorkflowDefResponse = {
  app_id: number;
  graph: WorkflowGraph;
};

export type WorkflowDefUpdateRequest = {
  graph: WorkflowGraph;
};

export type ToolItem = {
  name: string;
  description: string;
};

export type ToolCategory = {
  category: string;
  tools: ToolItem[];
};
