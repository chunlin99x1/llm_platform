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

