"use client";

/**
 * Agent 配置面板组件
 *
 * 提供系统指令编辑、工具选择和 Prompt 变量管理功能，参照 Dify 风格设计。
 *
 * Author: chunlin
 */

import { useState, useMemo } from "react";
import {
    Card,
    CardBody,
    Chip,
    Divider,
    ScrollShadow,
    Textarea,
    Switch,
    Tooltip,
    Slider,
    Button,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Select,
    SelectItem,
    Tabs,
    Tab,
} from "@heroui/react";
import {
    Terminal,
    Search,
    Book,
    Globe,
    Clock,
    FileText,
    FileCode,
    Folder,
    Trash2,
    Plus,
    Settings,
    Bot,
    Zap,
    Info,
    Variable,
    Pencil,
    Server,
    Link,
} from "lucide-react";
import { ModelParamsModal } from "./workflow/modals/model-params-modal";
import {
    PromptVariable,
    ToolCategory,
    MCPServer,
    ProviderModel,
    KnowledgeBase,
    KnowledgeSettings
} from "@/lib/types";

interface AgentConfigPanelProps {
    instructions: string;
    setInstructions: (value: string) => void;
    enabledTools: string[];
    setEnabledTools: (value: string[] | ((prev: string[]) => string[])) => void;
    availableTools: ToolCategory[];
    variables: PromptVariable[];
    setVariables: (vars: PromptVariable[]) => void;
    mcpServers: MCPServer[];
    setMcpServers: React.Dispatch<React.SetStateAction<MCPServer[]>>;
    models: ProviderModel[];
    modelConfig: Record<string, any>;
    setModelConfig: (config: Record<string, any>) => void;
    knowledgeBases: KnowledgeBase[];
    selectedKBs: number[];
    setSelectedKBs: (ids: number[] | ((prev: number[]) => number[])) => void;
    knowledgeSettings: KnowledgeSettings;
    setKnowledgeSettings: (settings: KnowledgeSettings | ((prev: KnowledgeSettings) => KnowledgeSettings)) => void;
}

// 工具图标映射
const toolIcons: Record<string, any> = {
    calc: Terminal,
    duckduckgo_search: Search,
    wikipedia: Book,
    web_page_reader: Globe,
    get_current_datetime: Clock,
    python_repl: FileCode,
    read_file: FileText,
    write_file: FileText,
    list_directory: Folder,
    file_delete: Trash2,
    echo: Zap,
};

export function AgentConfigPanel({
    instructions,
    setInstructions,
    enabledTools,
    setEnabledTools,
    availableTools,
    variables,
    setVariables,
    mcpServers,
    setMcpServers,
    models,
    modelConfig,
    setModelConfig,
    knowledgeBases,
    selectedKBs,
    setSelectedKBs,
    knowledgeSettings,
    setKnowledgeSettings,
}: AgentConfigPanelProps) {
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);

    // Model Params Modal State
    const { isOpen: isModelParamsOpen, onOpen: onModelParamsOpen, onOpenChange: onModelParamsOpenChange } = useDisclosure();

    // Variable Modal State
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingVar, setEditingVar] = useState<PromptVariable | null>(null);
    const [varKey, setVarKey] = useState("");
    const [varName, setVarName] = useState("");
    const [varType, setVarType] = useState<"string" | "number" | "select">("string");

    // MCP Server State
    const { isOpen: isMCPOpen, onOpen: onMCPOpen, onOpenChange: onMCPOpenChange } = useDisclosure();
    const [editingMCPServer, setEditingMCPServer] = useState<MCPServer | null>(null);
    const [mcpName, setMcpName] = useState("");
    const [mcpUrl, setMcpUrl] = useState("");

    // 计算工具名字典以便快速查找
    const allToolNames = useMemo(() => {
        return new Set(availableTools.flatMap(cat => cat.tools.map(t => t.name)));
    }, [availableTools]);

    // 计算已启用工具数量
    const enabledCount = useMemo(() => {
        return enabledTools.filter(name => allToolNames.has(name)).length;
    }, [enabledTools, allToolNames]);

    const totalCount = availableTools.reduce((sum, cat) => sum + cat.tools.length, 0);

    // 切换工具启用状态
    const toggleTool = (toolName: string, enabled: boolean) => {
        if (enabled) {
            setEnabledTools((prev) => [...prev, toolName]);
        } else {
            setEnabledTools((prev) => prev.filter((t) => t !== toolName));
        }
    };

    // Variable Operations
    const handleAddVariable = () => {
        setEditingVar(null);
        setVarKey("");
        setVarName("");
        setVarType("string");
        onOpen();
    };

    const handleEditVariable = (v: PromptVariable) => {
        setEditingVar(v);
        setVarKey(v.key);
        setVarName(v.name);
        setVarType(v.type);
        onOpen();
    };

    const handleDeleteVariable = (key: string) => {
        setVariables(variables.filter((v) => v.key !== key));
    };

    const handleSaveVariable = () => {
        if (!varKey || !varName) return;

        const newVar: PromptVariable = {
            key: varKey,
            name: varName,
            type: varType,
        };

        if (editingVar) {
            setVariables(variables.map((v) => (v.key === editingVar.key ? newVar : v)));
        } else {
            setVariables([...variables, newVar]);
        }
        onOpenChange();
    };

    // MCP Operations
    const handleAddMCPServer = () => {
        setEditingMCPServer(null);
        setMcpName("");
        setMcpUrl("");
        onMCPOpen();
    };

    const handleEditMCPServer = (server: MCPServer) => {
        setEditingMCPServer(server);
        setMcpName(server.name);
        setMcpUrl(server.url);
        onMCPOpen();
    };

    const handleSaveMCPServer = () => {
        if (!mcpName || !mcpUrl) return;

        const newServer: MCPServer = {
            id: editingMCPServer?.id || Math.random().toString(36).substring(7),
            name: mcpName,
            url: mcpUrl,
            status: "connected"
        };

        if (editingMCPServer) {
            setMcpServers(mcpServers.map(s => s.id === editingMCPServer.id ? newServer : s));
        } else {
            setMcpServers([...mcpServers, newServer]);
        }
        onMCPOpenChange();
    };

    const handleDeleteMCPServer = (id: string) => {
        setMcpServers(mcpServers.filter(s => s.id !== id));
    };

    return (
        <div className="w-[420px] flex flex-col border-r border-divider bg-background overflow-hidden">
            {/* 头部 */}
            <div className="h-14 px-5 border-b border-divider flex items-center justify-between bg-content1/30">
                <div className="flex items-center gap-2">
                    <Bot size={16} className="text-primary" />
                    <span className="font-semibold text-sm">智能体配置</span>
                </div>
                <Chip size="sm" variant="flat" color="primary" className="text-[10px]">
                    Agent Mode
                </Chip>
            </div>

            <ScrollShadow className="flex-1 overflow-y-auto">
                {/* Agent 模式设置 & 模型选择 */}
                <div className="p-4 border-b border-divider space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-content2/50 border border-divider shadow-sm">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-foreground">ReAct Agent</span>
                                <Chip size="sm" variant="flat" color="success" className="text-[8px] h-3.5 px-1 font-bold">
                                    推荐
                                </Chip>
                            </div>
                            <div className="text-[10px] text-foreground/60 leading-tight">
                                基于 <span className="font-medium text-foreground/80">推理-行动 (Reasoning-Action)</span> 循环。
                            </div>
                        </div>
                    </div>

                    {/* 模型选择 */}
                    <div className="flex items-center gap-2">
                        <Select
                            label="选择模型"
                            size="sm"
                            variant="flat"
                            placeholder="Select a model"
                            selectedKeys={(() => {
                                // Find ID matching current config
                                const current = models.find(
                                    m => m.provider === modelConfig.provider && m.name === modelConfig.model
                                );
                                return current ? [String(current.id)] : [];
                            })()}
                            onChange={(e) => {
                                const selected = models.find(m => String(m.id) === e.target.value);
                                if (selected) {
                                    setModelConfig({
                                        ...modelConfig,
                                        provider: selected.provider,
                                        model: selected.name,  // Store NAME, not ID
                                    });
                                }
                            }}
                            classNames={{
                                trigger: "h-9 min-h-9 bg-content2/50 hover:bg-content2/80 transition-colors",
                                value: "text-xs font-medium",
                            }}
                            labelPlacement="outside-left"
                        >
                            {models.map((m) => (
                                <SelectItem key={m.id} textValue={m.name}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">{m.name}</span>
                                        <span className="text-[10px] text-foreground-400">({m.provider})</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>
                        <Tooltip content="模型参数">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="h-9 w-9 text-foreground-500 hover:text-primary"
                                onPress={onModelParamsOpen}
                            >
                                <Settings size={16} />
                            </Button>
                        </Tooltip>
                    </div>
                </div>

                {/* Model Params Modal */}
                <ModelParamsModal
                    isOpen={isModelParamsOpen}
                    onOpenChange={onModelParamsOpenChange}
                    data={modelConfig.parameters || {}}
                    onChange={(patch) => setModelConfig({ ...modelConfig, parameters: { ...(modelConfig.parameters || {}), ...patch } })}
                />


                <section className="flex flex-col gap-3 p-4">
                    <header className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5">
                            <Terminal size={12} /> 系统指令
                        </label>
                    </header>
                    <Textarea
                        variant="bordered"
                        placeholder="你是一个专业的 AI 助手..."
                        minRows={12}
                        value={instructions}
                        onValueChange={setInstructions}
                        classNames={{ input: "text-[11px] leading-relaxed font-mono", inputWrapper: "p-2" }}
                    />
                    <p className="text-[9px] text-foreground leading-tight">
                        编写详细的指令来定义智能体的角色、目标和行为准则。
                    </p>
                </section>

                <Divider className="opacity-50" />

                {/* 变量设置 (New Section) */}
                <div className="p-5 border-b border-divider">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <Variable size={12} className="text-white" />
                            </div>
                            <span className="text-xs font-semibold">输入变量</span>
                            <Chip size="sm" variant="flat" className="text-[9px] h-4 bg-content2">
                                {variables.length}
                            </Chip>
                        </div>
                        <Tooltip content="添加变量">
                            <Button
                                size="sm"
                                variant="flat"
                                isIconOnly
                                className="h-7 w-7 bg-primary/10 hover:bg-primary/20 text-primary"
                                onPress={handleAddVariable}
                            >
                                <Plus size={14} />
                            </Button>
                        </Tooltip>
                    </div>

                    {variables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed border-divider bg-content2/20">
                            <div className="h-10 w-10 rounded-full bg-content3/50 flex items-center justify-center mb-3">
                                <Variable size={18} className="text-foreground/30" />
                            </div>
                            <div className="text-[11px] text-foreground/50 text-center">
                                暂无变量
                            </div>
                            <div className="text-[10px] text-foreground/30 text-center mt-1">
                                添加变量后可在提示词中使用 {"{{key}}"}
                            </div>
                            <Button
                                size="sm"
                                variant="flat"
                                className="mt-4 h-7 text-[10px] bg-primary/10 text-primary"
                                startContent={<Plus size={12} />}
                                onPress={handleAddVariable}
                            >
                                添加第一个变量
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {variables.map((v, index) => {
                                const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
                                    string: { bg: "bg-blue-500/10", text: "text-blue-600", icon: "from-blue-500 to-cyan-500" },
                                    number: { bg: "bg-amber-500/10", text: "text-amber-600", icon: "from-amber-500 to-orange-500" },
                                    select: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: "from-emerald-500 to-teal-500" },
                                };
                                const colors = typeColors[v.type] || typeColors.string;

                                return (
                                    <div
                                        key={v.key}
                                        className="group relative flex items-center gap-3 p-3 rounded-xl bg-content2/40 hover:bg-content2/70 transition-all duration-200 border border-transparent hover:border-divider/50 hover:shadow-sm"
                                    >
                                        {/* 变量图标 */}
                                        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors.icon} flex items-center justify-center shadow-sm`}>
                                            <span className="text-white text-[11px] font-bold uppercase">
                                                {v.key.slice(0, 2)}
                                            </span>
                                        </div>

                                        {/* 变量信息 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground">{v.key}</span>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    className={`text-[9px] h-4 ${colors.bg} ${colors.text} capitalize`}
                                                >
                                                    {v.type}
                                                </Chip>
                                            </div>
                                            <div className="text-[10px] text-foreground/50 mt-0.5 truncate">
                                                {v.name}
                                            </div>
                                        </div>

                                        {/* 引用提示 */}
                                        <div className="hidden group-hover:flex items-center mr-2">
                                            <code className="text-[9px] px-1.5 py-0.5 rounded bg-content3/80 text-foreground/60 font-mono">
                                                {`{{${v.key}}}`}
                                            </code>
                                        </div>

                                        {/* 操作按钮 */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="编辑">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="h-7 w-7 text-foreground/50 hover:text-primary hover:bg-primary/10"
                                                    onPress={() => handleEditVariable(v)}
                                                >
                                                    <Pencil size={12} />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content="删除">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="h-7 w-7 text-foreground/50 hover:text-danger hover:bg-danger/10"
                                                    onPress={() => handleDeleteVariable(v.key)}
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </Tooltip>
                                        </div>

                                        {/* 序号标识 */}
                                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-gradient-to-b from-primary/60 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>


                {/* 工具与 MCP 切换 */}
                <div className="p-0 border-b border-divider">
                    <Tabs
                        aria-label="工具选项"
                        variant="underlined"
                        fullWidth
                        classNames={{
                            base: "px-5 border-b border-divider bg-content1/20",
                            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                            cursor: "w-full bg-primary",
                            tab: "max-w-fit px-0 h-12",
                            tabContent: "group-data-[selected=true]:text-primary font-semibold text-xs"
                        }}
                    >
                        <Tab
                            key="tools"
                            title={
                                <div className="flex items-center gap-2">
                                    <Settings size={14} />
                                    <span>内置工具</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50 px-1.5">
                                        {enabledCount}/{totalCount}
                                    </Chip>
                                </div>
                            }
                        >
                            <div className="p-5">
                                <div className="space-y-4">
                                    {availableTools.map((cat) => (
                                        <div key={cat.category}>
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                                                <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                                                    {cat.category}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {cat.tools.map((tool) => {
                                                    const isEnabled = enabledTools.includes(tool.name);
                                                    const isHovered = hoveredTool === tool.name;
                                                    const IconComponent = toolIcons[tool.name] || Plus;

                                                    return (
                                                        <div
                                                            key={tool.name}
                                                            className={`group relative flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${isEnabled
                                                                ? "border-primary/30 bg-primary/5"
                                                                : "border-divider hover:border-primary/20 hover:bg-content2/50"
                                                                }`}
                                                            onMouseEnter={() => setHoveredTool(tool.name)}
                                                            onMouseLeave={() => setHoveredTool(null)}
                                                        >
                                                            {/* 工具图标 */}
                                                            <div
                                                                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isEnabled
                                                                    ? "bg-primary text-white"
                                                                    : "bg-content3 text-foreground/50"
                                                                    }`}
                                                            >
                                                                <IconComponent size={14} />
                                                            </div>

                                                            {/* 工具信息 */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-medium ${isEnabled ? "text-foreground" : "text-foreground/70"}`}>
                                                                        {tool.name}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-foreground/40 line-clamp-1 mt-0.5">
                                                                    {tool.description}
                                                                </div>
                                                            </div>

                                                            {/* 操作按钮 */}
                                                            <div className="flex items-center gap-2">
                                                                {isHovered && (
                                                                    <Tooltip content="查看详情">
                                                                        <Button
                                                                            isIconOnly
                                                                            size="sm"
                                                                            variant="light"
                                                                            className="h-6 w-6 min-w-6"
                                                                        >
                                                                            <Info size={12} />
                                                                        </Button>
                                                                    </Tooltip>
                                                                )}
                                                                <Switch
                                                                    size="sm"
                                                                    isSelected={isEnabled}
                                                                    onValueChange={(val) => toggleTool(tool.name, val)}
                                                                    classNames={{
                                                                        wrapper: "group-data-[selected=true]:bg-primary",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Tab>
                        <Tab
                            key="mcp"
                            title={
                                <div className="flex items-center gap-2">
                                    <Server size={14} />
                                    <span>MCP 工具</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50">
                                        {mcpServers.length}
                                    </Chip>
                                </div>
                            }
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">已连接的服务器</span>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        isIconOnly
                                        className="h-6 w-6 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                                        onPress={handleAddMCPServer}
                                    >
                                        <Plus size={14} />
                                    </Button>
                                </div>

                                <div className="text-[10px] text-foreground/50 mb-4 px-1 leading-relaxed">
                                    通过 Model Context Protocol 协议接入外部工具服务器。
                                </div>

                                {mcpServers.length === 0 ? (
                                    <div
                                        className="group flex flex-col items-center justify-center py-6 px-4 rounded-xl border-1 border-dashed border-divider hover:border-blue-400/50 hover:bg-blue-500/[0.02] cursor-pointer transition-all"
                                        onClick={handleAddMCPServer}
                                    >
                                        <Server size={14} className="text-foreground/20 group-hover:text-blue-500/40 mb-1.5 transition-colors" />
                                        <div className="text-[10px] text-foreground/40 group-hover:text-blue-500/60 font-medium">配置 MCP 服务器</div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {mcpServers.map((server) => (
                                            <div
                                                key={server.id}
                                                className="group relative flex items-center gap-3 p-3 rounded-xl bg-content2/30 border border-transparent hover:border-blue-500/30 hover:bg-white hover:shadow-sm transition-all duration-200"
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Link size={14} className="text-blue-500" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[11px] font-bold text-foreground truncate">{server.name}</span>
                                                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                                                    </div>
                                                    <div className="text-[9px] text-foreground/40 font-mono truncate">
                                                        {server.url}
                                                    </div>
                                                </div>

                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-6 w-6 min-w-0 text-foreground/40 hover:text-blue-600"
                                                        onPress={() => handleEditMCPServer(server)}
                                                    >
                                                        <Settings size={12} />
                                                    </Button>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-6 w-6 min-w-0 text-foreground/40 hover:text-danger"
                                                        onPress={() => handleDeleteMCPServer(server.id)}
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Tab>
                        <Tab
                            key="knowledge"
                            title={
                                <div className="flex items-center gap-2">
                                    <Book size={14} />
                                    <span>知识库</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50">
                                        {selectedKBs.length}
                                    </Chip>
                                </div>
                            }
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">关联知识库</span>
                                </div>

                                <div className="text-[10px] text-foreground/50 mb-4 px-1 leading-relaxed">
                                    选择要关联的知识库，Agent 会在回答问题时检索相关内容。
                                </div>

                                {knowledgeBases.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-1 border-dashed border-divider bg-content2/20">
                                        <Book size={14} className="text-foreground/20 mb-1.5" />
                                        <div className="text-[10px] text-foreground/40 font-medium">暂无可用知识库</div>
                                        <div className="text-[9px] text-foreground/30 mt-1">请先在知识库管理中创建知识库</div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {knowledgeBases.map((kb) => {
                                            const isSelected = selectedKBs.includes(kb.id);
                                            return (
                                                <div
                                                    key={kb.id}
                                                    className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer border ${isSelected
                                                        ? "bg-emerald-500/5 border-emerald-500/30"
                                                        : "bg-content2/30 border-transparent hover:border-emerald-500/20 hover:bg-content2/50"
                                                        }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedKBs((prev) => prev.filter(id => id !== kb.id));
                                                        } else {
                                                            setSelectedKBs((prev) => [...prev, kb.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500 text-white" : "bg-emerald-50"
                                                        }`}>
                                                        <Book size={14} className={isSelected ? "text-white" : "text-emerald-500"} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-emerald-700" : "text-foreground"}`}>
                                                                {kb.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[9px] text-foreground/40 truncate">
                                                            {kb.document_count} 个文档
                                                        </div>
                                                    </div>

                                                    <Switch
                                                        size="sm"
                                                        isSelected={isSelected}
                                                        onValueChange={(val) => {
                                                            if (val) {
                                                                setSelectedKBs((prev) => [...prev, kb.id]);
                                                            } else {
                                                                setSelectedKBs((prev) => prev.filter(id => id !== kb.id));
                                                            }
                                                        }}
                                                        classNames={{
                                                            wrapper: "group-data-[selected=true]:bg-emerald-500",
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 高级设置 */}
                                {selectedKBs.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-divider">
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">检索设置</span>
                                        </div>
                                        <div className="space-y-3">
                                            {/* Top K */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-foreground/70">返回结果数量</span>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    min={1}
                                                    max={10}
                                                    value={String(knowledgeSettings.top_k || 3)}
                                                    onChange={(e) => setKnowledgeSettings({ ...knowledgeSettings, top_k: Number(e.target.value) })}
                                                    className="w-16"
                                                    classNames={{ input: "text-center text-[11px]", inputWrapper: "h-7 min-h-7" }}
                                                />
                                            </div>

                                            {/* 检索方式 */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-foreground/70">检索方式</span>
                                                <Select
                                                    size="sm"
                                                    selectedKeys={[knowledgeSettings.retrieval_mode || "hybrid"]}
                                                    onChange={(e) => setKnowledgeSettings({ ...knowledgeSettings, retrieval_mode: e.target.value as any })}
                                                    className="w-24"
                                                    classNames={{ trigger: "h-7 min-h-7", value: "text-[11px]" }}
                                                >
                                                    <SelectItem key="hybrid">混合</SelectItem>
                                                    <SelectItem key="semantic">语义</SelectItem>
                                                    <SelectItem key="keyword">关键词</SelectItem>
                                                </Select>
                                            </div>

                                            {/* 分数阈值 */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-foreground/70">分数阈值</span>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    min={0}
                                                    max={1}
                                                    step={0.1}
                                                    value={String(knowledgeSettings.score_threshold || 0)}
                                                    onChange={(e) => setKnowledgeSettings({ ...knowledgeSettings, score_threshold: Number(e.target.value) })}
                                                    className="w-16"
                                                    classNames={{ input: "text-center text-[11px]", inputWrapper: "h-7 min-h-7" }}
                                                />
                                            </div>

                                            {/* 重排序 */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-foreground/70">启用重排序</span>
                                                <Switch
                                                    size="sm"
                                                    isSelected={knowledgeSettings.rerank_enabled || false}
                                                    onValueChange={(val) => setKnowledgeSettings({ ...knowledgeSettings, rerank_enabled: val })}
                                                />
                                            </div>

                                            {/* 回退到模型知识 */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-foreground/70">无命中时使用模型知识</span>
                                                <Switch
                                                    size="sm"
                                                    isSelected={knowledgeSettings.fallback_to_model !== false}
                                                    onValueChange={(val) => setKnowledgeSettings({ ...knowledgeSettings, fallback_to_model: val })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                </div>
            </ScrollShadow>

            {/* Config Variable Modal */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-3 pb-2">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                                    <Variable size={18} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-base font-semibold">
                                        {editingVar ? "编辑变量" : "添加变量"}
                                    </div>
                                    <div className="text-xs text-foreground/50 font-normal">
                                        定义可在提示词中引用的输入参数
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody className="gap-4">
                                <Input
                                    label="变量 Key"
                                    labelPlacement="outside"
                                    placeholder="例如: query"
                                    variant="bordered"
                                    size="md"
                                    value={varKey}
                                    onValueChange={setVarKey}
                                    description={
                                        <span className="text-[10px]">
                                            在提示词中通过 <code className="px-1 py-0.5 rounded bg-content2 font-mono">{`{{${varKey || "key"}}}`}</code> 引用
                                        </span>
                                    }
                                    classNames={{
                                        input: "font-mono",
                                        inputWrapper: "bg-content2/30",
                                    }}
                                    startContent={
                                        <div className="h-5 w-5 rounded bg-blue-500/10 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-blue-600">K</span>
                                        </div>
                                    }
                                />
                                <Input
                                    label="变量名称"
                                    labelPlacement="outside"
                                    placeholder="例如: 用户输入"
                                    variant="bordered"
                                    size="md"
                                    value={varName}
                                    onValueChange={setVarName}
                                    description="对变量的简短描述，方便识别用途"
                                    classNames={{
                                        inputWrapper: "bg-content2/30",
                                    }}
                                    startContent={
                                        <div className="h-5 w-5 rounded bg-emerald-500/10 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-emerald-600">N</span>
                                        </div>
                                    }
                                />
                                <Select
                                    label="变量类型"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="md"
                                    selectedKeys={[varType]}
                                    onChange={(e) => setVarType(e.target.value as any)}
                                    description="决定用户输入时的控件类型"
                                    classNames={{
                                        trigger: "bg-content2/30",
                                    }}
                                >
                                    <SelectItem key="string">📝 文本 (String)</SelectItem>
                                    <SelectItem key="number">🔢 数字 (Number)</SelectItem>
                                    <SelectItem key="select">📋 选项 (Select)</SelectItem>
                                </Select>
                            </ModalBody>
                            <ModalFooter className="pt-2">
                                <Button
                                    variant="flat"
                                    onPress={onClose}
                                    className="bg-content2 hover:bg-content3"
                                >
                                    取消
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleSaveVariable}
                                    isDisabled={!varKey || !varName}
                                    className="shadow-md shadow-primary/20"
                                >
                                    {editingVar ? "保存修改" : "添加变量"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* MCP Server Modal */}
            <Modal isOpen={isMCPOpen} onOpenChange={onMCPOpenChange} size="md" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-3 pb-2 border-b border-divider/50">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                    <Server size={18} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-base font-bold">
                                        {editingMCPServer ? "编辑 MCP 服务器" : "配置 MCP 服务器"}
                                    </div>
                                    <div className="text-[11px] text-foreground/50 font-normal">
                                        Model Context Protocol (MCP) 外部工具集成
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6 px-6 gap-6">
                                <section className="space-y-4">
                                    <Input
                                        label="服务器名称"
                                        labelPlacement="outside"
                                        placeholder="例如：Code Executor"
                                        variant="bordered"
                                        size="md"
                                        value={mcpName}
                                        onValueChange={setMcpName}
                                        classNames={{
                                            inputWrapper: "bg-content2/30 border-divider",
                                            label: "text-xs font-bold"
                                        }}
                                    />
                                    <Input
                                        label="服务器 URL"
                                        labelPlacement="outside"
                                        placeholder="HTTP 或 SSE 协议地址 (e.g. http://.../sse)"
                                        variant="bordered"
                                        size="md"
                                        value={mcpUrl}
                                        onValueChange={setMcpUrl}
                                        classNames={{
                                            inputWrapper: "bg-content2/30 border-divider",
                                            input: "font-mono text-xs",
                                            label: "text-xs font-bold"
                                        }}
                                        startContent={<Link size={14} className="text-foreground/30" />}
                                    />
                                    <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                                            <Info size={14} />
                                            <span className="text-[11px] font-bold">MCP 协议说明</span>
                                        </div>
                                        <div className="text-[10px] text-blue-600/70 leading-relaxed">
                                            MCP 服务器提供了一组可以通过 LLM 调用的工具。配置完成后，Agent 会自动请求服务器获取工具列表，并尝试与这些工具进行交互。支持标准 MCP HTTP 传输协议。
                                        </div>
                                    </div>
                                </section>
                            </ModalBody>
                            <ModalFooter className="border-t border-divider/50">
                                <Button variant="flat" onPress={onClose} className="font-bold text-xs">
                                    取消
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleSaveMCPServer}
                                    isDisabled={!mcpName || !mcpUrl}
                                    className="font-bold text-xs shadow-md shadow-primary/20"
                                >
                                    {editingMCPServer ? "保存更改" : "添加连接"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

        </div>
    );
}
