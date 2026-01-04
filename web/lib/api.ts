import type {
  Agent,
  AgentChatRequest,
  AgentChatResponse,
  AgentCreateRequest,
  AgentSessionCreateRequest,
  AgentSessionResponse,
  AppCreateRequest,
  AppItem,
  ChatRequest,
  ChatResponse,
  WorkflowDefResponse,
  WorkflowDefUpdateRequest,
  WorkflowRunRequest,
  WorkflowRunResponse,
  ToolCategory
} from "./types";

const DEFAULT_BASE_URL = "http://localhost:8000";

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as TResponse;
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>("/chat", req);
}

export async function runWorkflow(req: WorkflowRunRequest): Promise<WorkflowRunResponse> {
  return postJson<WorkflowRunResponse>("/workflow/run", req);
}

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${apiBaseUrl()}/agents`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as Agent[];
}

export async function createAgent(req: AgentCreateRequest): Promise<Agent> {
  return postJson<Agent>("/agents", req);
}

export async function createAgentSession(agentId: number, req: AgentSessionCreateRequest): Promise<AgentSessionResponse> {
  return postJson<AgentSessionResponse>(`/agents/${agentId}/sessions`, req);
}

export async function agentChat(agentId: number, req: AgentChatRequest): Promise<AgentChatResponse> {
  return postJson<AgentChatResponse>(`/agents/${agentId}/chat`, req);
}

export async function listApps(params?: { name?: string; mode?: string }): Promise<AppItem[]> {
  const url = new URL(`${apiBaseUrl()}/apps`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as AppItem[];
}

export async function createApp(req: AppCreateRequest): Promise<AppItem> {
  return postJson<AppItem>("/apps", req);
}

export async function getWorkflow(appId: number): Promise<WorkflowDefResponse> {
  const res = await fetch(`${apiBaseUrl()}/apps/${appId}/workflow`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as WorkflowDefResponse;
}

export async function updateWorkflow(appId: number, req: WorkflowDefUpdateRequest): Promise<WorkflowDefResponse> {
  const res = await fetch(`${apiBaseUrl()}/apps/${appId}/workflow`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as WorkflowDefResponse;
}

export async function getApp(appId: number): Promise<AppItem> {
  const res = await fetch(`${apiBaseUrl()}/apps/${appId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as AppItem;
}

export async function appChat(appId: number, payload: AgentChatRequest): Promise<AgentChatResponse> {
  const res = await fetch(`${apiBaseUrl()}/apps/${appId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as AgentChatResponse;
}

export async function appChatStream(
  appId: number,
  payload: AgentChatRequest,
  onEvent: (event: any) => void
): Promise<void> {
  const res = await fetch(`${apiBaseUrl()}/apps/${appId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const json = JSON.parse(data);
        onEvent(json);
      } catch (e) {
        console.warn("Failed to parse SSE line:", trimmed);
      }
    }
  }
}

export async function listTools(): Promise<{ categories: ToolCategory[] }> {
  const res = await fetch(`${apiBaseUrl()}/agents/tools`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}
