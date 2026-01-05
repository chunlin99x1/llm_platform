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
  Tooltip,
  Breadcrumbs,
  BreadcrumbItem,
  Avatar,
  User,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Accordion,
  AccordionItem,
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
  Search,
  Book,
  Globe,
  Clock,
  FileText,
  FileCode,
  Folder,
  Trash2,
  Terminal,
  Activity,
  History,
  MoreVertical,
  ChevronLeft,
  Share2,
  AlertCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
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
  Position,
  BackgroundVariant
} from "reactflow";
import "reactflow/dist/style.css";

import { getWorkflow, runWorkflow, updateWorkflow, getApp, appChat, appChatStream, listTools } from "@/lib/api";
import type { WorkflowGraph, AppItem, ToolCategory, AgentToolTrace } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';

// --- Node Styles ---

function BaseNode({ title, icon: Icon, children, colorClass, selected }: { title: string, icon: any, children: React.ReactNode, colorClass: string, selected?: boolean }) {
  return (
    <div className={`group relative min-w-[180px] cursor-pointer rounded-xl border bg-content1 shadow-sm transition-all duration-300 ${selected ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10' : 'border-divider hover:border-primary/40 hover:shadow-md'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colorClass}`} />
      <div className="flex items-center justify-between border-b border-divider/50 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-foreground-500" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-500">{title}</span>
        </div>
        <MoreVertical size={12} className="text-foreground-300" />
      </div>
      <div className="px-3 py-3">{children}</div>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-white !bg-primary" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-white !bg-primary" />
    </div>
  );
}

function StartNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <BaseNode title="Start" icon={Play} colorClass="bg-success" selected={selected}>
      <div className="font-bold text-[13px] tracking-tight">{data.label || "开始"}</div>
    </BaseNode>
  );
}

function LLMNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <BaseNode title="LLM" icon={Box} colorClass="bg-primary" selected={selected}>
      <div className="font-bold text-[13px] tracking-tight">{data.label || "LLM"}</div>
      <div className="mt-2 overflow-hidden rounded-lg bg-content2/50 border border-divider/50">
        <div className="bg-content3/40 px-1.5 py-0.5 flex items-center gap-1 border-b border-divider/30">
          <Terminal size={8} className="text-foreground" />
          <span className="text-[8px] font-bold text-foreground uppercase">System Prompt</span>
        </div>
        <div className="px-1.5 py-1.5 line-clamp-2 text-[9px] text-foreground-600 leading-tight font-mono">
          {data.prompt || "未设置 Prompt..."}
        </div>
      </div>
    </BaseNode>
  );
}

function AnswerNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <BaseNode title="Answer" icon={MessageSquare} colorClass="bg-warning" selected={selected}>
      <div className="font-bold text-[13px] text-warning-700 tracking-tight">{data.label || "回答"}</div>
    </BaseNode>
  );
}

const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  answer: AnswerNode,
  end: AnswerNode,
};

// --- Main Page ---

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
          listTools()
        ]);

        setApp(appData);
        setAvailableTools(toolsData.categories);

        if (appData.mode === "agent") {
          const g = (wfData.graph || {}) as any;
          setInstructions(g.instructions || "");
          setEnabledTools(g.enabled_tools || []);
        } else {
          const g = (wfData.graph || {}) as WorkflowGraph;
          const loadedNodes = ((g.nodes || []) as Node[]).map((n) => ({
            ...n,
            data: { ...n.data }
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
      const graphPayload = app?.mode === "agent"
        ? { instructions, enabled_tools: enabledTools }
        : { nodes, edges };
      await updateWorkflow(appId, { graph: graphPayload });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onRun() {
    setRunning(true);
    setRunOutput("");
    setRunError(null);
    setToolTraces([]);
    try {
      if (app?.mode === "agent") {
        await appChatStream(appId, {
          input: runInput,
          session_id: previewSessionId,
          instructions: instructions,
          enabled_tools: enabledTools
        }, (event) => {
          if (event.type === "text") {
            setRunOutput((prev) => prev + event.content);
          } else if (event.type === "trace") {
            setToolTraces((prev) => [...prev, { id: event.id, name: event.name, args: event.args, result: "执行中..." }]);
          } else if (event.type === "trace_result") {
            setToolTraces((prev) =>
              prev.map(t => t.id === event.id ? { ...t, result: event.result } : t)
            );
          } else if (event.type === "error") {
            setRunError(event.content);
          }
        });
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

  if (loading) return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-primary shadow-md shadow-primary/30 flex items-center justify-center text-white">
          <Box size={18} />
        </div>
      </div>
      <div className="text-[11px] font-medium text-foreground animate-pulse uppercase tracking-wider">进入编排空间...</div>
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
              tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-bold text-[11px]"
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
              <div className="w-[450px] flex flex-col border-r border-divider bg-white shadow-sm overflow-hidden text-xs">
                <div className="p-4 border-b border-divider bg-content1/50 flex items-center justify-between">
                  <span className="font-black uppercase tracking-widest text-[10px]">智能体配置</span>
                </div>
                <ScrollShadow className="flex-1 p-5 gap-6 flex flex-col">
                  <section className="flex flex-col gap-3">
                    <header className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5"><Terminal size={12} /> 系统指令</label>
                      <Chip size="sm" variant="flat" color="primary" className="h-4 text-[8px] font-black">GPT-4O</Chip>
                    </header>
                    <Textarea
                      variant="bordered"
                      placeholder="你是一个专业的 AI 助手..."
                      minRows={12}
                      value={instructions}
                      onValueChange={setInstructions}
                      classNames={{ input: "text-[11px] leading-relaxed font-mono", inputWrapper: "p-2" }}
                    />
                    <p className="text-[9px] text-foreground/50 leading-tight">编写详细的指令来定义智能体的角色、目标和行为准则。</p>
                  </section>

                  <Divider className="opacity-50" />

                  <section className="flex flex-col gap-6">
                    {availableTools.map((cat) => (
                      <div key={cat.category} className="flex flex-col gap-3">
                        <header className="flex items-center gap-2 px-1">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{cat.category}</span>
                        </header>
                        <div className="grid grid-cols-1 gap-2">
                          {cat.tools.map((tool) => {
                            const isEnabled = enabledTools.includes(tool.name);
                            return (
                              <Card
                                key={tool.name}
                                isPressable
                                onPress={() => setEnabledTools(prev => isEnabled ? prev.filter(t => t !== tool.name) : [...prev, tool.name])}
                                className={`border transition-all duration-300 rounded-xl ${isEnabled ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-divider hover:border-primary/40'}`}
                              >
                                <CardBody className="p-3 flex flex-row items-center gap-3">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary text-white shadow-sm' : 'bg-content2 text-foreground/40'}`}>
                                    {tool.name === 'calc' && <Terminal size={14} />}
                                    {tool.name === 'google_search' && <Search size={14} />}
                                    {tool.name === 'wikipedia' && <Book size={14} />}
                                    {tool.name === 'web_page_reader' && <Globe size={14} />}
                                    {tool.name === 'current_datetime' && <Clock size={14} />}
                                    {tool.name === 'python_repl' && <FileCode size={14} />}
                                    {tool.name === 'read_file' && <FileText size={14} />}
                                    {tool.name === 'write_file' && <FileText size={14} />}
                                    {tool.name === 'list_directory' && <Folder size={14} />}
                                    {tool.name === 'file_delete' && <Trash2 size={14} />}
                                    {!['calc', 'google_search', 'wikipedia', 'web_page_reader', 'current_datetime', 'python_repl', 'read_file', 'write_file', 'list_directory', 'file_delete'].includes(tool.name) && <Plus size={14} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[11px] flex items-center gap-2">
                                      {tool.name}
                                      {isEnabled && <Chip size="sm" color="primary" variant="solid" className="h-3 text-[7px] font-black px-1 rounded-sm">ENABLED</Chip>}
                                    </div>
                                    <div className="text-[9px] text-foreground/50 line-clamp-2 mt-0.5" title={tool.description}>{tool.description}</div>
                                  </div>
                                </CardBody>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                </ScrollShadow>
              </div>

              {/* Live Preview for Agent */}
              <div className="flex-1 flex flex-col bg-content2/5 p-6">
                <div className="max-w-4xl w-full h-full mx-auto flex flex-col bg-white border border-divider rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-divider bg-content1/30 flex items-center gap-2">
                    <Activity size={14} className="text-primary" />
                    <span className="text-[11px] font-bold">实时测试预览</span>
                  </div>
                  <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                    {runOutput ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                          <Avatar icon={<Terminal size={10} />} classNames={{ base: "bg-primary text-white h-5 w-5" }} />
                          <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">Assistant</span>
                          <Divider className="flex-1 ml-2" />
                        </div>
                        <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-foreground">
                          {runOutput}
                        </div>
                        {runError && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle size={14} className="text-danger" />
                              <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Error</span>
                              <Divider className="flex-1 ml-2" />
                            </div>
                            <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-danger">
                              {runError}
                            </div>
                          </div>
                        )}
                        {toolTraces.length > 0 && (
                          <div className="mt-2">
                            <Accordion
                              variant="splitted"
                              className="px-0"
                              itemClasses={{
                                base: "group-[.is-splitted]:bg-content2/30 group-[.is-splitted]:shadow-none border border-divider !rounded-xl mb-2",
                                title: "text-[10px] font-bold text-primary py-2",
                                trigger: "px-3 py-0 h-8",
                                content: "text-[10px] pb-3 px-3 pt-0 text-foreground/80 font-mono",
                                indicator: "text-foreground/40",
                              }}
                            >
                              {toolTraces.map((trace, idx) => (
                                <AccordionItem
                                  key={trace.id || idx}
                                  aria-label={trace.name || "Tool"}
                                  title={
                                    <div className="flex items-center gap-2">
                                      <Activity size={10} className="text-primary/60" />
                                      <span>使用工具: {trace.name}</span>
                                      {trace.result === "执行中..." && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                      )}
                                    </div>
                                  }
                                >
                                  <div className="flex flex-col gap-1.5 bg-black/5 p-2 rounded-lg border border-black/5">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Arguments</span>
                                      <code className="text-[10px] break-all">{JSON.stringify(trace.args, null, 2)}</code>
                                    </div>
                                    <Divider className="opacity-40" />
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Result</span>
                                      <div className="text-[10px] break-words whitespace-pre-wrap">{trace.result}</div>
                                    </div>
                                  </div>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        )}
                      </div>
                    ) : runError ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-danger" />
                          <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Error</span>
                          <Divider className="flex-1 ml-2" />
                        </div>
                        <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-danger">
                          {runError}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-foreground gap-4 opacity-30 select-none">
                        <MessageSquare size={48} strokeWidth={1} />
                        <div className="text-center max-w-[200px]">
                          <div className="text-[11px] font-bold mb-1 uppercase tracking-wide">开始对话</div>
                          <p className="text-[10px] leading-tight italic">修改指令或工具后，在下方发送消息进行实时测试。</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-divider bg-white">
                    <Input
                      placeholder="向您的智能体发送指令..."
                      value={runInput}
                      onValueChange={setRunInput}
                      onKeyDown={(e) => e.key === "Enter" && onRun()}
                      startContent={<ChevronRight size={14} className="text-foreground/40" />}
                      endContent={
                        <Button isIconOnly size="sm" color="primary" variant="solid" className="h-7 w-7 rounded-lg" isLoading={running} onPress={onRun}>
                          <Play size={12} fill="white" />
                        </Button>
                      }
                      classNames={{ inputWrapper: "h-10 bg-content2/10 border-divider", input: "text-[11px]" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Workflow Graph View */
            <div className="flex h-full">
              {/* Canvas Area */}
              <div className="flex-1 relative bg-[#f8fafc]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onNodeClick={(_, node) => setSelectedId(node.id)}
                  fitView
                  className="bg-dot-pattern"
                  snapToGrid
                  snapGrid={[20, 20]}
                  defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 1.5 } }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
                  <Controls className="bg-white border-divider shadow-md !left-4 !bottom-4 scale-75" />
                </ReactFlow>

                {/* Compact Floating Toolbox */}
                <div className="absolute left-4 top-4 flex flex-col gap-2">
                  <Card className="bg-white/80 backdrop-blur border-divider p-1 shadow-lg">
                    <div className="flex flex-col gap-1">
                      {[
                        { type: 'start', icon: Play, label: '开始', color: 'success' },
                        { type: 'llm', icon: Box, label: 'LLM 节点', color: 'primary' },
                        { type: 'answer', icon: MessageSquare, label: '回答节点', color: 'warning' },
                      ].map((item) => (
                        <Tooltip key={item.type} content={item.label} placement="right">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color={item.color as any}
                            className="h-8 w-8 bg-white border-divider transition-all active:scale-95"
                            onPress={() => addNode(item.type)}
                          >
                            <item.icon size={16} />
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Compact Config Panel */}
              <div className="w-[300px] border-l border-divider bg-background flex flex-col overflow-hidden shadow-xl z-10 text-xs">
                <div className="flex items-center justify-between px-4 py-3 border-b border-divider bg-content1/50">
                  <div className="flex flex-col">
                    <div className="text-[9px] font-bold text-foreground uppercase tracking-widest leading-none mb-1">Config</div>
                    <div className="flex items-center gap-1.5">
                      {selectedNode ? (
                        <Chip size="sm" variant="dot" color="primary" classNames={{ content: "text-[10px] font-bold" }}>{selectedNode.type?.toUpperCase()}</Chip>
                      ) : (
                        <span className="text-foreground italic text-[11px]">No Selection</span>
                      )}
                    </div>
                  </div>
                  {selectedNode && (
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly variant="light" size="sm" className="h-7 w-7"><MoreVertical size={14} /></Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Node Actions" className="text-xs">
                        <DropdownItem key="copy">复制节点</DropdownItem>
                        <DropdownItem key="delete" color="danger" onPress={() => setNodes(nodes.filter(n => n.id !== selectedId))}>删除节点</DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  )}
                </div>

                <ScrollShadow className="flex-1 p-4">
                  {selectedNode ? (
                    <div className="flex flex-col gap-5">
                      <section>
                        <div className="text-[10px] font-bold text-foreground mb-2 px-1 flex items-center gap-1.5 uppercase tracking-wide">
                          <Settings size={10} />
                          基本设置
                        </div>
                        <Input
                          label="节点名称"
                          labelPlacement="outside"
                          placeholder="例如: 基础回答"
                          variant="bordered"
                          size="sm"
                          value={selectedNode.data?.label || ""}
                          onValueChange={(v) => updateSelectedNode({ label: v })}
                          classNames={{ inputWrapper: "h-9", label: "text-[10px]", input: "text-[11px]" }}
                        />
                      </section>

                      {selectedNode.type === 'llm' && (
                        <section className="flex flex-col gap-3">
                          <div className="flex items-center justify-between px-1">
                            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                              <Terminal size={10} />
                              PROMPT
                            </div>
                            <Chip size="sm" variant="flat" color="primary" className="h-4 text-[8px] font-bold">GPT-4O</Chip>
                          </div>

                          <div className="relative">
                            <Textarea
                              variant="bordered"
                              minRows={10}
                              placeholder="在此输入指令..."
                              value={selectedNode.data?.prompt || ""}
                              onValueChange={(v) => updateSelectedNode({ prompt: v })}
                              classNames={{ input: "font-mono text-[11px] leading-tight", innerWrapper: "p-1" }}
                            />
                          </div>

                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="flex gap-2">
                              <div className="text-[10px] text-foreground-600 leading-tight">
                                提示：使用 <kbd className="bg-primary/10 text-primary font-bold px-1 rounded">{"{{input}}"}</kbd> 引用输入。
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                      {selectedNode.type === 'start' && (
                        <div className="py-8 flex flex-col items-center gap-3 text-center">
                          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                            <Play size={20} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold">起点节点</div>
                            <p className="text-[10px] text-foreground mt-1 max-w-[160px] leading-snug">初始化输入与环境。</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-foreground py-10 px-6 text-center">
                      <Box size={40} className="opacity-10" />
                      <div>
                        <div className="text-[11px] font-bold text-foreground-500 mb-1 leading-none uppercase tracking-wide">未选中节点</div>
                        <p className="text-[10px] leading-relaxed">点击画布节点进行编辑。</p>
                      </div>
                    </div>
                  )}
                </ScrollShadow>
              </div>
            </div>
          )
        ) : activeTab === "preview" ? (
          <div className="flex h-full items-center justify-center bg-content2/5 p-6">
            <Card className="max-w-4xl w-full h-full shadow-xl border-divider bg-background overflow-hidden relative rounded-2xl">
              <CardBody className="p-0 flex flex-row">
                {/* Compact Debug Settings */}
                <div className="w-[280px] border-r border-divider p-6 bg-content1/30 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                      <Terminal size={14} className="text-primary" />
                      运行测试
                    </div>
                  </div>

                  <section className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[9px] font-bold text-foreground uppercase tracking-widest px-1">Inputs</div>
                      <Input
                        label="input"
                        variant="bordered"
                        size="sm"
                        placeholder="发送消息..."
                        value={runInput}
                        onValueChange={setRunInput}
                        classNames={{ label: "text-foreground-500 font-bold", inputWrapper: "h-9", input: "text-[11px]" }}
                      />
                    </div>
                  </section>

                  <Button
                    className="mt-6 w-full h-10 text-[11px] font-bold shadow-md shadow-primary/20"
                    color="primary"
                    isLoading={running}
                    onPress={onRun}
                    startContent={<Play size={14} fill="currentColor" />}
                  >
                    开始运行调试
                  </Button>
                </div>

                {/* Compact Chat Result */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                    {runOutput ? (
                      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                        <div className="flex items-center gap-1.5">
                          <Avatar icon={<Terminal size={10} />} classNames={{ base: "bg-primary text-white h-5 w-5" }} />
                          <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">Output</span>
                          <Divider className="flex-1 ml-2" />
                        </div>
                        <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-foreground-800">
                          {runOutput}
                        </div>
                        {runError && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle size={14} className="text-danger" />
                              <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Error</span>
                              <Divider className="flex-1 ml-2" />
                            </div>
                            <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-danger">
                              {runError}
                            </div>
                          </div>
                        )}
                        {toolTraces.length > 0 && (
                          <div className="mt-2">
                            <Accordion
                              variant="splitted"
                              className="px-0"
                              itemClasses={{
                                base: "group-[.is-splitted]:bg-content2/30 group-[.is-splitted]:shadow-none border border-divider !rounded-xl mb-2",
                                title: "text-[10px] font-bold text-primary py-2",
                                trigger: "px-3 py-0 h-8",
                                content: "text-[10px] pb-3 px-3 pt-0 text-foreground/80 font-mono",
                                indicator: "text-foreground/40",
                              }}
                            >
                              {toolTraces.map((trace, idx) => (
                                <AccordionItem
                                  key={trace.id || idx}
                                  aria-label={trace.name || "Tool"}
                                  title={
                                    <div className="flex items-center gap-2">
                                      <Activity size={10} className="text-primary/60" />
                                      <span>使用工具: {trace.name}</span>
                                      {trace.result === "执行中..." && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                      )}
                                    </div>
                                  }
                                >
                                  <div className="flex flex-col gap-1.5 bg-black/5 p-2 rounded-lg border border-black/5">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Arguments</span>
                                      <code className="text-[10px] break-all">{JSON.stringify(trace.args, null, 2)}</code>
                                    </div>
                                    <Divider className="opacity-40" />
                                    <div className="flex flex-col">
                                      <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Result</span>
                                      <div className="text-[10px] break-words whitespace-pre-wrap">{trace.result}</div>
                                    </div>
                                  </div>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        )}
                      </div>
                    ) : runError ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-danger" />
                          <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Error</span>
                          <Divider className="flex-1 ml-2" />
                        </div>
                        <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-danger">
                          {runError}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-foreground gap-4 opacity-30 select-none">
                        <Terminal size={48} strokeWidth={1} />
                        <div className="text-center max-w-[200px]">
                          <div className="text-[11px] font-bold mb-1 uppercase tracking-wide">等待输入</div>
                          <p className="text-[10px] leading-tight italic">点击左侧按钮开始测试工作流...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
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
