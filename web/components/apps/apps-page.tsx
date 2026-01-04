"use client";

import { Button, Card, CardBody, Input, Select, SelectItem } from "@heroui/react";
import { LayoutGrid, MessageSquare, Terminal, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createApp, listApps } from "@/lib/api";
import type { AppItem } from "@/lib/types";

import AppCard from "./app-card";

export default function AppsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<string>("workflow");

  const canCreate = useMemo(() => !loading && name.trim().length > 0, [loading, name]);

  async function refresh() {
    const data = await listApps();
    setApps(data);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  async function onCreate() {
    if (!canCreate) return;
    setError(null);
    setLoading(true);
    try {
      const created = await createApp({ name: name.trim(), mode });
      setName("");
      setApps([created, ...apps]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-content2/10">
      <header className="flex items-center justify-between p-8 bg-background border-b border-divider">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">应用管理</h1>
          <p className="text-sm text-foreground-500 mt-1">
            构建、定制和部署您的 AI 应用（工作流、智能体等）。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="flat" onPress={refresh}>
            刷新列表
          </Button>
          <Button color="primary" onPress={() => setName("New App")}>
            新建应用
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <Card className="bg-background shadow-none border border-divider">
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
              <div className="md:col-span-2">
                <Input label="快速创建应用" placeholder="输入应用名称..." variant="bordered" value={name} onValueChange={setName} />
              </div>
              <Select
                label="应用模式"
                variant="bordered"
                selectedKeys={[mode]}
                onSelectionChange={(keys) => setMode(String(Array.from(keys)[0] || "workflow"))}
              >
                <SelectItem key="workflow" startContent={<LayoutGrid size={16} />}>Workflow (工作流)</SelectItem>
                <SelectItem key="chatflow" startContent={<MessageSquare size={16} />}>Chatflow (对话流)</SelectItem>
                <SelectItem key="agent" startContent={<Terminal size={16} />}>Agent (智能体)</SelectItem>
              </Select>
              <Button color="primary" className="h-10" isLoading={loading} isDisabled={!canCreate} onPress={onCreate}>
                确认创建
              </Button>
              {error ? (
                <div className="md:col-span-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-foreground-500 uppercase tracking-widest">所有应用 ({apps.length})</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

