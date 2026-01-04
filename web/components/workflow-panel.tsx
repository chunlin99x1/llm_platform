"use client";

import { Button, Card, CardBody, CardHeader, Input, Textarea } from "@heroui/react";
import { useMemo, useState } from "react";

import { runWorkflow } from "@/lib/api";

export default function WorkflowPanel() {
  const [input, setInput] = useState("给我写一个 20 字以内的自我介绍。");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [output, setOutput] = useState("");

  const canRun = useMemo(() => !loading && input.trim().length > 0, [input, loading]);

  async function onRun() {
    if (!canRun) return;
    setError(null);
    setLoading(true);
    setOutput("");
    setRunId(null);

    try {
      const resp = await runWorkflow({ input: input.trim(), context: {} });
      setRunId(resp.run_id);
      setOutput(resp.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <div className="text-base font-semibold">工作流（/workflow/run）</div>
      </CardHeader>
      <CardBody className="gap-4">
        <Input
          label="输入"
          value={input}
          onValueChange={setInput}
          variant="bordered"
          description="示例工作流：Start -> LLM -> End"
        />

        <div className="flex items-center justify-end gap-2">
          <Button color="primary" isLoading={loading} isDisabled={!canRun} onPress={onRun}>
            运行
          </Button>
        </div>

        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Textarea
          label={runId ? `输出（run_id=${runId}）` : "输出"}
          value={output}
          isReadOnly
          minRows={6}
          variant="bordered"
          placeholder="运行后显示输出…"
        />
      </CardBody>
    </Card>
  );
}

