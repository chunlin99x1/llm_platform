"use client";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  Textarea,
  Tabs,
  Tab,
  Tooltip
} from "@heroui/react";
import {
  Play,
  Save,
  Plus,
  Box,
  MessageSquare,
  Settings,
  ChevronRight,
  Code2,
  Database,
  Terminal,
  Activity
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";

import { getWorkflow, runWorkflow, updateWorkflow } from "@/lib/api";
import type { WorkflowGraph } from "@/lib/types";

// --- Node Styles ---

function BaseNode({ title, icon: Icon, children, colorClass }: { title: string, icon: any, children: React.ReactNode, colorClass: string }) {
  return (
    <div className="group relative min-w-[200px] cursor-pointer rounded-2xl border border-divider bg-content1 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${colorClass}`} />
      <div className="flex items-center gap-2 border-b border-divider/50 px-4 py-2.5">
        <Icon size={16} className="text-foreground-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground-600">{title}</span>
      </div>
      <div className="px-4 py-4">{children}</div>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !bg-background" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !bg-background" />
    </div>
  );
}

function StartNode({ data }: { data: any }) {
  return (
    <BaseNode title="Start" icon={Play} colorClass="bg-success">
      <div className="font-medium">{data.label || "开始"}</div>
    </BaseNode>
  );
}

function LLMNode({ data }: { data: any }) {
  return (
    <BaseNode title="LLM" icon={Box} colorClass="bg-primary">
      <div className="font-medium">{data.label || "LLM"}</div>
      <div className="mt-2 line-clamp-2 text-[10px] text-foreground-500 bg-content2/50 rounded-lg p-1.5 leading-relaxed">
        {data.prompt || "未设置 Prompt"}
      </div>
    </BaseNode>
  );
}

function AnswerNode({ data }: { data: any }) {
  return (
    <BaseNode title="Answer" icon={MessageSquare} colorClass="bg-warning">
      <div className="font-medium text-warning-600 dark:text-warning-400">{data.label || "回答"}</div>
    </BaseNode>
  );
}

const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  answer: AnswerNode,
  end: AnswerNode, // Temporarily use AnswerNode for End
};

// --- Main Page ---

export default function OrchestratePage({ appId }: { appId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.8 });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

  const [runInput, setRunInput] = useState("介绍一下你自己");
  const [runOutput, setRunOutput] = useState("");
  const [running, setRunning] = useState(false);

  const [activeTab, setActiveTab] = useState("orchestrate");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getWorkflow(appId);
        const g = (data.graph || {}) as WorkflowGraph;

        const loadedNodes = ((g.nodes || []) as Node[]).map((n) => ({
          ...n,
          data: { ...n.data }
        }));
        const loadedEdges = (g.edges || []) as Edge[];

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        if (loadedNodes.length > 0) setSelectedId(loadedNodes[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [appId, setEdges, setNodes]);

  const onConnect: OnConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
  }, [setEdges]);

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
      data: { label: type.charAt(0).toUpperCase() + type.slice(1) }
    };
    if (type === 'llm') {
      newNode.data.prompt = "你是一个智能助手。\n用户输入: {{input}}\n请回答用户的问题。";
    }

    setNodes((nds) => nds.concat(newNode));
    setSelectedId(id);
  }

  async function onSave() {
    setSaving(true);
    try {
      await updateWorkflow(appId, { graph: { nodes, edges } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onRun() {
    setRunning(true);
    setRunOutput("");
    try {
      const resp = await runWorkflow({ input: runInput, context: { app_id: appId } });
      setRunOutput(resp.output);
    } catch (e) {
      setRunOutput("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center text-foreground-500">加载中...</div>;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-[56px] items-center justify-between border-b border-divider bg-content1 px-6">
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-white">
              <Box size={14} />
            </div>
            Workflow {appId}
          </div>
          <Divider orientation="vertical" className="h-6" />
          <Tabs
            variant="light"
            aria-label="Tabs"
            selectedKey={activeTab}
            onSelectionChange={(k) => setActiveTab(k as string)}
            classNames={{
              tabList: "gap-6",
              cursor: "w-full",
              tab: "max-w-fit px-0 h-14",
              tabContent: "group-data-[selected=true]:text-primary font-medium"
            }}
          >
            <Tab key="orchestrate" title="工作流编排" />
            <Tab key="preview" title="预览" />
            <Tab key="logs" title="操作日志" />
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            startContent={<Play size={16} />}
            onPress={() => setActiveTab("preview")}
          >
            运行预览
          </Button>
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isLoading={saving}
            onPress={onSave}
          >
            发布
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {activeTab === "orchestrate" ? (
          <div className="flex h-full">
            {/* Canvas Area */}
            <div className="flex-1 relative bg-[#F9FAFB] dark:bg-[#0B0F17]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                fitView
              >
                <Background color="#ccc" gap={20} />
                <Controls />
                <MiniMap />
              </ReactFlow>

              {/* Float Toolbars */}
              <div className="absolute left-6 top-6 flex flex-col gap-2">
                {[
                  { type: 'start', icon: Play, label: 'Start' },
                  { type: 'llm', icon: Box, label: 'LLM' },
                  { type: 'answer', icon: MessageSquare, label: 'Answer' },
                ].map((item) => (
                  <Tooltip key={item.type} content={item.label} placement="right">
                    <Button
                      isIconOnly
                      variant="flat"
                      className="h-10 w-10 bg-content1 shadow-md border-divider hover:border-primary/50"
                      onPress={() => addNode(item.type)}
                    >
                      <item.icon size={20} />
                    </Button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Side Config Panel */}
            <div className="w-[360px] border-l border-divider bg-content1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-divider">
                <div className="text-sm font-bold flex items-center gap-2">
                  <Settings size={16} className="text-foreground-500" />
                  配置 - {selectedNode?.type?.toUpperCase() || "未选择"}
                </div>
                {selectedNode && (
                  <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => setNodes(nodes.filter(n => n.id !== selectedId))}>
                    <Terminal size={14} />
                  </Button>
                )}
              </div>

              <ScrollShadow className="flex-1 p-4">
                {selectedNode ? (
                  <div className="flex flex-col gap-6">
                    <Input
                      label="节点名称"
                      variant="bordered"
                      value={selectedNode.data?.label || ""}
                      onValueChange={(v) => updateSelectedNode({ label: v })}
                    />

                    {selectedNode.type === 'llm' && (
                      <div className="flex flex-col gap-3">
                        <div className="text-xs font-bold text-foreground-500 flex items-center justify-between">
                          PROMPT TEMPLATE
                          <Chip size="sm" variant="flat" color="primary">SYSTEM</Chip>
                        </div>
                        <Textarea
                          variant="bordered"
                          minRows={12}
                          placeholder="输入 Prompt..."
                          value={selectedNode.data?.prompt || ""}
                          onValueChange={(v) => updateSelectedNode({ prompt: v })}
                        />
                        <div className="p-3 bg-content2 rounded-xl text-[11px] text-foreground-500 leading-relaxed">
                          提示：支持使用 <code className="text-primary font-bold">{"{{input}}"}</code> 引用变量。
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'start' && (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-divider flex flex-col items-center gap-2 text-center">
                        <Activity size={32} className="text-foreground-300" />
                        <div className="text-xs text-foreground-400">开始节点，此处定义全局输入参数</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-foreground-400">
                    <Box size={48} className="opacity-20" />
                    <div className="text-sm italic">选择或添加一个节点开始配置</div>
                  </div>
                )}
              </ScrollShadow>
            </div>
          </div>
        ) : activeTab === "preview" ? (
          <div className="flex h-full items-center justify-center bg-content2/30 p-8">
            <Card className="max-w-3xl w-full h-full shadow-lg">
              <CardBody className="p-0 flex flex-row">
                {/* Debug Settings */}
                <div className="w-[300px] border-r border-divider p-6 bg-content1/50">
                  <div className="text-sm font-bold mb-6 flex items-center gap-2">
                    <Settings size={16} />
                    参数设置
                  </div>
                  <Textarea
                    label="用户输入 (input)"
                    variant="bordered"
                    minRows={6}
                    value={runInput}
                    onValueChange={setRunInput}
                  />
                  <Button
                    className="mt-6 w-full"
                    color="primary"
                    isLoading={running}
                    onPress={onRun}
                    startContent={<Play size={16} />}
                  >
                    开始运行
                  </Button>
                </div>

                {/* Chat Result */}
                <div className="flex-1 flex flex-col bg-background">
                  <div className="flex-1 overflow-auto p-8 flex flex-col gap-6">
                    {runOutput ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground-400">
                          <Box size={14} />
                          FINAL OUTPUT
                        </div>
                        <div className="p-6 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed">
                          {runOutput}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-foreground-500 gap-4 opacity-30">
                        <Terminal size={64} />
                        <div className="text-sm">点击左侧“开始运行”查看执行轨迹</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="p-12 text-center text-foreground-400">
            日志系统开发中...
          </div>
        )}
      </div>
    </div>
  );
}
