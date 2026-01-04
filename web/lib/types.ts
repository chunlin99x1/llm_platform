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
};

export type AgentChatRequest = {
  session_id?: string;
  input: string;
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
  mode: AppMode | string;
};

export type AppCreateRequest = {
  name: string;
  mode?: AppMode | string;
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
