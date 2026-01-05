"use client";

import {
  Button,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Breadcrumbs,
  BreadcrumbItem,
} from "@heroui/react";
import {
  Play,
  Save,
  Box,
  Settings,
  ChevronLeft,
  History,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from "reactflow";
import "reactflow/dist/style.css";

import { getWorkflow, runWorkflow, updateWorkflow, getApp, appChatStream, listTools } from "@/lib/api";
import type { WorkflowGraph, AppItem, ToolCategory, AgentToolTrace, PromptVariable, MCPServer } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Import extracted components
import { AgentConfigPanel } from "./agent-config-panel";
import { AgentPreview } from "./agent-preview";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowConfigPanel } from "./workflow-config-panel";
import { WorkflowPreview } from "./workflow-preview";

export default function OrchestratePage({ appId }: { appId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [app, setApp] = useState<AppItem | null>(null);
  const [availableTools, setAvailableTools] = useState<ToolCategory[]>([]);

  // Workflow State
  const [selectedId, setSelectedId] = useState<string>("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Agent State
  const [instructions, setInstructions] = useState("");
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

  const [runInput, setRunInput] = useState("介绍一下你自己");
  const [runOutput, setRunOutput] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [activeTab, setActiveTab] = useState("orchestrate");
  const [previewSessionId, setPreviewSessionId] = useState("");
  const [toolTraces, setToolTraces] = useState<AgentToolTrace[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [appData, wfData, toolsData] = await Promise.all([
          getApp(appId),
          getWorkflow(appId),
          listTools(),
        ]);

        setApp(appData);
        setAvailableTools(toolsData.categories);

        if (appData.mode === "agent") {
          const g = (wfData.graph || {}) as any;
          setInstructions(g.instructions || "");
          setEnabledTools(g.enabled_tools || []);
          setVariables((g.prompt_variables as PromptVariable[]) || []);
          setMcpServers((g.mcp_servers as MCPServer[]) || []);
        } else {
          const g = (wfData.graph || {}) as WorkflowGraph;
          const loadedNodes = ((g.nodes || []) as Node[]).map((n) => ({
            ...n,
            data: { ...n.data },
          }));
          const loadedEdges = (g.edges || []) as Edge[];
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          if (loadedNodes.length > 0) setSelectedId(loadedNodes[0].id);
        }

        // Initialize preview session
        setPreviewSessionId(`preview_${appId}_${uuidv4().slice(0, 8)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [appId, setEdges, setNodes]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, type: "smoothstep", animated: true }, eds));
    },
    [setEdges]
  );

  function updateSelectedNode(patch: Record<string, any>) {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedId) return n;
        return { ...n, data: { ...(n.data || {}), ...patch } };
      })
    );
  }

  function addNode(type: string) {
    const id = `${type}_${Date.now()}`;
    const newNode: Node<any> = {
      id,
      type,
      position: { x: 100, y: 100 },
      data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
    };
    if (type === "llm") {
      newNode.data.prompt = "你是一个智能助手。\n用户输入: {{input}}\n请回答用户的问题。";
    }

    setNodes((nds) => nds.concat(newNode));
    setSelectedId(id);
  }

  async function onSave() {
    setSaving(true);
    try {
      const graphPayload =
        app?.mode === "agent"
          ? { instructions, enabled_tools: enabledTools, prompt_variables: variables, mcp_servers: mcpServers }
          : { nodes, edges };
      await updateWorkflow(appId, { graph: graphPayload });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onRun(inputs?: Record<string, any>) {
    setRunning(true);
    setRunOutput("");
    setRunError(null);
    setToolTraces([]);

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
            inputs: cleanInputs,
          },
          (event) => {
            if (event.type === "text") {
              setRunOutput((prev) => prev + event.content);
            } else if (event.type === "trace") {
              setToolTraces((prev) => [
                ...prev,
                { id: event.id, name: event.name, args: event.args, result: "执行中..." },
              ]);
            } else if (event.type === "trace_result") {
              setToolTraces((prev) => prev.map((t) => (t.id === event.id ? { ...t, result: event.result } : t)));
            } else if (event.type === "error") {
              setRunError(event.content);
            }
          }
        );
      } else {
        const resp = await runWorkflow({ input: runInput, context: { app_id: appId } });
        setRunOutput(resp.output);
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  if (loading)
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-primary shadow-md shadow-primary/30 flex items-center justify-center text-white">
            <Box size={18} />
          </div>
        </div>
        <div className="text-[11px] font-medium text-foreground animate-pulse uppercase tracking-wider">
          进入编排空间...
        </div>
      </div>
    );

  const isAgent = app?.mode === "agent";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Compact Header */}
      <header className="flex h-[48px] items-center justify-between border-b border-divider bg-background/80 backdrop-blur-md px-4 z-20">
        <div className="flex items-center gap-4">
          <Button as={Link} href="/apps" isIconOnly variant="light" size="sm" className="text-foreground h-8 w-8">
            <ChevronLeft size={16} />
          </Button>

          <div className="flex flex-col">
            <Breadcrumbs size="sm" underline="hover" classNames={{ list: "gap-1" }}>
              <BreadcrumbItem classNames={{ item: "text-[11px]" }}>Apps</BreadcrumbItem>
              <BreadcrumbItem classNames={{ item: "text-[11px] font-bold text-foreground" }}>
                {isAgent ? "Agent" : "Workflow"} #{appId}
              </BreadcrumbItem>
            </Breadcrumbs>
          </div>

          <Divider orientation="vertical" className="h-4 mx-1" />

          <Tabs
            variant="light"
            aria-label="Nav"
            selectedKey={activeTab}
            onSelectionChange={(k) => setActiveTab(k as string)}
            classNames={{
              tabList: "gap-4 p-0",
              cursor: "w-full bg-primary/10",
              tab: "max-w-fit px-3 h-8 rounded-lg",
              tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-bold text-[11px]",
            }}
          >
            <Tab key="orchestrate" title="编排" />
            <Tab key="preview" title="调试" />
            <Tab key="logs" title="日志" />
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="设置">
            <Button isIconOnly variant="light" size="sm" className="text-foreground-500 h-8 w-8">
              <Settings size={14} />
            </Button>
          </Tooltip>

          <div className="flex items-center gap-2 ml-2">
            <Button
              variant="flat"
              size="sm"
              startContent={<Play size={12} />}
              onPress={() => setActiveTab("preview")}
              className="font-bold bg-content2 hover:bg-content3 h-8 text-[11px]"
            >
              运行预览
            </Button>
            <Button
              color="primary"
              size="sm"
              startContent={<Save size={12} />}
              isLoading={saving}
              onPress={onSave}
              className="font-bold shadow-md shadow-primary/20 h-8 text-[11px]"
            >
              发布更新
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === "orchestrate" ? (
          isAgent ? (
            /* Agent Orchestration View */
            <div className="flex h-full bg-[#f8fafc]">
              <AgentConfigPanel
                instructions={instructions}
                setInstructions={setInstructions}
                enabledTools={enabledTools}
                setEnabledTools={setEnabledTools}
                availableTools={availableTools}
                variables={variables}
                setVariables={setVariables}
                mcpServers={mcpServers}
                setMcpServers={setMcpServers}
              />
              <AgentPreview
                runOutput={runOutput}
                runError={runError}
                toolTraces={toolTraces}
                runInput={runInput}
                setRunInput={setRunInput}
                variables={variables}
                running={running}
                onRun={onRun}
              />
            </div>
          ) : (
            /* Workflow Graph View */
            <div className="flex h-full">
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                setSelectedId={setSelectedId}
                addNode={addNode}
              />
              <WorkflowConfigPanel
                selectedNode={selectedNode}
                updateSelectedNode={updateSelectedNode}
                nodes={nodes}
                setNodes={setNodes}
                selectedId={selectedId}
              />
            </div>
          )
        ) : activeTab === "preview" ? (
          <WorkflowPreview
            runOutput={runOutput}
            runError={runError}
            toolTraces={toolTraces}
            runInput={runInput}
            setRunInput={setRunInput}
            running={running}
            onRun={onRun}
            variables={variables}
          />
        ) : (
          <div className="p-10 flex flex-col items-center justify-center gap-4 text-foreground h-full">
            <History size={40} strokeWidth={1} className="opacity-20" />
            <div className="text-[10px] italic font-medium uppercase tracking-widest">日志系统正在迭代中...</div>
          </div>
        )}
      </div>
    </div>
  );
}
