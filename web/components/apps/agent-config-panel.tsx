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
} from "lucide-react";
import type { ToolCategory, PromptVariable } from "@/lib/types";

interface AgentConfigPanelProps {
    instructions: string;
    setInstructions: (value: string) => void;
    enabledTools: string[];
    setEnabledTools: (value: string[] | ((prev: string[]) => string[])) => void;
    availableTools: ToolCategory[];
    variables: PromptVariable[];
    setVariables: (value: PromptVariable[]) => void;
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
}: AgentConfigPanelProps) {
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);

    // Variable Modal State
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingVar, setEditingVar] = useState<PromptVariable | null>(null);
    const [varKey, setVarKey] = useState("");
    const [varName, setVarName] = useState("");
    const [varType, setVarType] = useState<"string" | "number" | "select">("string");

    // 计算已启用工具数量
    const enabledCount = enabledTools.length;
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
                {/* Agent 模式设置 */}
                <div className="p-4 border-b border-divider">
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
                                基于 <span className="font-medium text-foreground/80">推理-行动 (Reasoning-Action)</span> 循环，是目前效果最稳健、最常用的智能体模式。
                            </div>
                        </div>
                    </div>
                </div>

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


                {/* 系统指令 */}
                <div className="p-5 border-b border-divider">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-foreground/60" />
                            <span className="text-xs font-semibold">系统指令</span>
                        </div>
                        <Tooltip content="定义智能体的角色、目标和行为准则">
                            <Info size={14} className="text-foreground/40 cursor-help" />
                        </Tooltip>
                    </div>
                    <Textarea
                        variant="bordered"
                        placeholder="你是一个专业的 AI 助手，能够使用各种工具来帮助用户解决问题..."
                        minRows={8}
                        value={instructions}
                        onValueChange={setInstructions}
                        classNames={{
                            input: "text-xs leading-relaxed font-mono",
                            inputWrapper: "bg-content2/30 border-divider hover:border-primary/50 transition-colors",
                        }}
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-foreground/40">
                            支持使用 {"{{variable_key}}"} 引用变量
                        </span>
                        <Chip size="sm" variant="flat" className="text-[9px] h-5">
                            {instructions.length} 字符
                        </Chip>
                    </div>
                </div>

                {/* 工具列表 */}
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings size={14} className="text-foreground/60" />
                            <span className="text-xs font-semibold">工具</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-foreground/50">
                                {enabledCount}/{totalCount} 已启用
                            </span>
                        </div>
                    </div>

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

        </div>
    );
}
