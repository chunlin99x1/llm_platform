"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Textarea
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

import { agentChat, createAgent, createAgentSession, listAgents } from "@/lib/api";
import type { Agent, AgentToolTrace } from "@/lib/types";

type LocalMsg = { role: "user" | "assistant" | "tool"; content: string };

export default function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [newName, setNewName] = useState("默认智能体");
  const [newSystemPrompt, setNewSystemPrompt] = useState("你是一个严谨的中文助手，必要时可以调用工具。");
  const [newTools, setNewTools] = useState<string>("calc,echo");

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<LocalMsg[]>([]);
  const [traces, setTraces] = useState<AgentToolTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listAgents();
        setAgents(data);
        if (data.length && agentId === null) setAgentId(data[0]!.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentAgent = useMemo(() => agents.find((a) => a.id === agentId) || null, [agents, agentId]);
  const canSend = useMemo(() => !!agentId && !loading && input.trim().length > 0, [agentId, loading, input]);

  async function ensureSession() {
    if (!agentId) throw new Error("请先选择 Agent");
    if (sessionId) return sessionId;
    const resp = await createAgentSession(agentId, {});
    setSessionId(resp.session_id);
    return resp.session_id;
  }

  async function onCreateAgent() {
    setError(null);
    setLoading(true);
    try {
      const enabled_tools = newTools
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const created = await createAgent({
        name: newName.trim(),
        system_prompt: newSystemPrompt.trim(),
        enabled_tools
      });
      setAgents([created, ...agents]);
      setAgentId(created.id);
      setSessionId(null);
      setMsgs([]);
      setTraces([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    if (!canSend || !agentId) return;
    setError(null);

    const text = input.trim();
    setInput("");
    setLoading(true);
    setTraces([]);

    try {
      const sid = await ensureSession();
      const nextMsgs: LocalMsg[] = [...msgs, { role: "user", content: text }];
      setMsgs(nextMsgs);

      const resp = await agentChat(agentId, { session_id: sid, input: text });
      setSessionId(resp.session_id);
      setTraces(resp.tool_traces || []);
      setMsgs([...nextMsgs, { role: "assistant", content: resp.content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-base font-semibold">智能体（/agents）</div>
          <div className="flex items-center gap-2">
            {agentId ? (
              <Chip size="sm" variant="flat" color="primary">
                agent_id: {agentId}
              </Chip>
            ) : null}
            {sessionId ? (
              <Chip size="sm" variant="flat" color="default">
                session: {sessionId.slice(0, 8)}…
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            label="选择 Agent"
            selectedKeys={agentId ? [String(agentId)] : []}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              const id = k ? Number(k) : null;
              setAgentId(id);
              setSessionId(null);
              setMsgs([]);
              setTraces([]);
            }}
            variant="bordered"
          >
            {agents.map((a) => (
              <SelectItem key={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </Select>

          <div className="flex items-end justify-end gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                setSessionId(null);
                setMsgs([]);
                setTraces([]);
              }}
            >
              新会话
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="新建 Agent 名称" value={newName} onValueChange={setNewName} variant="bordered" />
          <Input
            label="启用工具（逗号分隔）"
            value={newTools}
            onValueChange={setNewTools}
            variant="bordered"
            description="内置：calc, echo"
          />
          <div className="md:col-span-2">
            <Textarea
              label="System Prompt"
              value={newSystemPrompt}
              onValueChange={setNewSystemPrompt}
              minRows={3}
              variant="bordered"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button color="primary" isLoading={loading} onPress={onCreateAgent}>
              创建 Agent
            </Button>
          </div>
        </div>

        <Divider />

        {currentAgent ? (
          <div className="rounded-xl border p-3 text-sm text-foreground-500">
            <div className="font-medium text-foreground">当前 Agent：{currentAgent.name}</div>
            <div className="mt-1 whitespace-pre-wrap">{currentAgent.system_prompt || "（无 system prompt）"}</div>
          </div>
        ) : null}

        {msgs.length ? (
          <div className="flex flex-col gap-3">
            {msgs.map((m, idx) => (
              <div
                key={idx}
                className={[
                  "rounded-xl border p-3",
                  m.role === "user" ? "ml-auto w-[92%] bg-[#111a2e]" : "mr-auto w-[92%] bg-[#0f172a]"
                ].join(" ")}
              >
                <div className="mb-1 text-xs text-foreground-500">{m.role}</div>
                <div className="whitespace-pre-wrap text-sm leading-6">{m.content}</div>
              </div>
            ))}
          </div>
        ) : null}

        {traces.length ? (
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium">工具调用</div>
            <div className="flex flex-col gap-2">
              {traces.map((t) => (
                <div key={t.id} className="rounded-lg bg-black/20 p-2 text-xs">
                  <div className="text-foreground-500">{t.name}</div>
                  <div className="mt-1 whitespace-pre-wrap">args: {JSON.stringify(t.args)}</div>
                  <div className="mt-1 whitespace-pre-wrap">result: {t.result}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Textarea
            label="输入"
            placeholder="让智能体做点什么，比如：计算 (1+2)*3 或者 echo hello"
            value={input}
            onValueChange={setInput}
            minRows={3}
            variant="bordered"
          />
          <div className="flex justify-end">
            <Button color="primary" isLoading={loading} isDisabled={!canSend} onPress={onSend}>
              发送
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
