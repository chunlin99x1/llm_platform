"use client";

import { Button, Card, CardBody, CardHeader, Chip, ScrollShadow, Textarea } from "@heroui/react";
import { useMemo, useState } from "react";

import { chat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

function roleLabel(role: ChatMessage["role"]) {
  return role === "user" ? "你" : "助手";
}

export default function ChatPanel() {
  const [sessionId] = useState("default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "你好，我是你的助手。你可以在这里测试 /chat 接口。" }
  ]);

  const canSend = useMemo(() => !loading && input.trim().length > 0, [input, loading]);

  async function onSend() {
    if (!canSend) return;
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setInput("");
    setLoading(true);

    try {
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      const resp = await chat({ session_id: sessionId, messages: nextMessages });
      setMessages([...nextMessages, { role: "assistant", content: resp.content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold">聊天（/chat）</div>
          <Chip size="sm" variant="flat" color="primary">
            session: {sessionId}
          </Chip>
        </div>
        <Button
          size="sm"
          variant="flat"
          color="default"
          onPress={() => setMessages([{ role: "assistant", content: "已清空。你可以继续提问。" }])}
        >
          清空
        </Button>
      </CardHeader>
      <CardBody className="gap-4">
        <ScrollShadow className="max-h-[420px] pr-2">
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={[
                  "rounded-xl border p-3",
                  m.role === "user" ? "ml-auto w-[92%] bg-content2" : "mr-auto w-[92%] bg-content1"
                ].join(" ")}
              >
                <div className="mb-1 text-xs text-foreground-500">{roleLabel(m.role)}</div>
                <div className="whitespace-pre-wrap text-sm leading-6">{m.content}</div>
              </div>
            ))}
          </div>
        </ScrollShadow>

        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Textarea
            label="输入"
            placeholder="请输入你的问题…"
            value={input}
            onValueChange={setInput}
            minRows={3}
            variant="bordered"
          />
          <div className="flex items-center justify-end gap-2">
            <Button color="primary" isLoading={loading} isDisabled={!canSend} onPress={onSend}>
              发送
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

