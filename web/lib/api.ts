import type { ChatRequest, ChatResponse, WorkflowRunRequest, WorkflowRunResponse } from "./types";

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

