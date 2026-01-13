import { useState, useCallback } from "react";
import { appChatStream } from "@/lib/api";
import type {
    AppItem,
    AgentToolTrace,
    MCPServer,
    PromptVariable,
    KnowledgeSettings,
    WorkflowGraph,
    WorkflowNode,
    WorkflowEdge,
} from "@/lib/types";

interface UseWorkflowRunProps {
    appId: number;
    app: AppItem | null;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    // Agent Params
    instructions: string;
    enabledTools: string[];
    mcpServers: MCPServer[];
    modelConfig: Record<string, any>;
    selectedKBs: number[];
    knowledgeSettings: KnowledgeSettings;
    previewSessionId: string;
}

export function useWorkflowRun({
    appId,
    app,
    nodes,
    edges,
    instructions,
    enabledTools,
    mcpServers,
    modelConfig,
    selectedKBs,
    knowledgeSettings,
    previewSessionId
}: UseWorkflowRunProps) {
    const [runInput, setRunInput] = useState("介绍一下你自己");
    const [runOutput, setRunOutput] = useState("");
    const [runError, setRunError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [toolTraces, setToolTraces] = useState<AgentToolTrace[]>([]);
    const [nodeRunStatus, setNodeRunStatus] = useState<Record<string, 'running' | 'success' | 'error'>>({});

    const onRun = useCallback(async (inputs?: Record<string, any>) => {
        setRunning(true);
        setRunOutput("");
        setRunError(null);
        setToolTraces([]);
        setNodeRunStatus({});

        // 防御性处理：防止 React 事件对象被当作输入变量传入导致的循环引用序列化错误
        const cleanInputs = (inputs && typeof inputs === 'object' && !('nativeEvent' in inputs) && !('target' in inputs)) ? inputs : undefined;

        try {
            if (app?.mode === "agent") {
                await appChatStream(
                    appId,
                    {
                        input: runInput,
                        session_id: previewSessionId,
                        instructions: instructions,
                        enabled_tools: enabledTools,
                        mcp_servers: mcpServers,
                        llm_config: modelConfig,
                        knowledge_base_ids: selectedKBs,
                        knowledge_settings: knowledgeSettings,
                        inputs: cleanInputs,
                    },
                    (event) => {
                        if (event.type === "text") {
                            setRunOutput((prev) => prev + event.content);
                        } else if (event.type === "trace") {
                            setToolTraces((prev) => [
                                ...prev,
                                { id: event.id, name: event.name, args: event.args, result: "执行中...", mcp_server: event.mcp_server },
                            ]);
                        } else if (event.type === "trace_result") {
                            setToolTraces((prev) => prev.map((t) => (t.id === event.id ? { ...t, result: event.result } : t)));
                        } else if (event.type === "error") {
                            setRunError(event.content);
                        }
                    }
                );
            } else {
                // 工作流模式：使用流式 API
                const response = await fetch('/api/workflow/run/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inputs: { ...cleanInputs, input: runInput },
                        context: { app_id: appId },
                        graph: { nodes, edges },
                        response_mode: "streaming"
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = decoder.decode(value);
                        const lines = text.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));

                                    if (data.event === 'node_started') {
                                        setNodeRunStatus((prev) => ({ ...prev, [data.node_id]: 'running' }));
                                    } else if (data.event === 'node_output') {
                                        // LLM 流式输出
                                        setRunOutput((prev) => prev + data.chunk);
                                    } else if (data.event === 'node_finished') {
                                        setNodeRunStatus((prev) => ({
                                            ...prev,
                                            [data.node_id]: data.status === 'success' ? 'success' : 'error'
                                        }));
                                    } else if (data.event === 'workflow_finished') {
                                        if (data.output) {
                                            setRunOutput(data.output);
                                        }
                                    } else if (data.event === 'error') {
                                        setRunError(data.message);
                                    }
                                } catch {
                                    // 忽略解析错误
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            setRunError(e instanceof Error ? e.message : String(e));
        } finally {
            setRunning(false);
        }
    }, [app?.mode, appId, runInput, previewSessionId, instructions, enabledTools, mcpServers, modelConfig, selectedKBs, knowledgeSettings, nodes, edges]);

    return {
        runInput, setRunInput,
        runOutput, setRunOutput,
        runError, setRunError,
        running,
        toolTraces,
        nodeRunStatus,
        onRun
    };
}
