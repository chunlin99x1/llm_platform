"use client";

import { useState, useMemo } from "react";
import {
    Input,
    ScrollShadow,
    Popover,
    PopoverTrigger,
    PopoverContent,
    Button,
} from "@heroui/react";
import {
    Variable,
    Search,
    ChevronRight,
    Play,
    Box,
    Code,
    Globe,
    GitBranch,
    Database,
    Repeat,
    FileCode,
    HelpCircle,
    Settings,
    MessageSquare,
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import {
    getUpstreamVariables,
    formatVariableReference,
    VARIABLE_TYPE_CONFIG,
    type NodeVariable,
    type Variable as VariableType,
    type VarType,
} from "./workflow-types";
import { useWorkflowContext } from "@/context/workflow-context";
import { getSystemVariables } from "./workflow/system-variables";

// 节点类型图标映射
const NODE_TYPE_ICONS: Record<string, any> = {
    start: Play,
    llm: Box,
    code: Code,
    http: Globe,
    condition: GitBranch,
    knowledge: Database,
    iteration: Repeat,
    template: FileCode,
    classifier: HelpCircle,
    variable: Variable,
    system: Settings, // 系统变量图标
    conversation: MessageSquare, // 会话变量图标
};

// 节点类型颜色映射
const NODE_TYPE_COLORS: Record<string, string> = {
    start: "bg-blue-500",
    llm: "bg-indigo-500",
    code: "bg-blue-600",
    http: "bg-violet-500",
    condition: "bg-cyan-500",
    knowledge: "bg-green-500",
    iteration: "bg-cyan-500",
    template: "bg-blue-500",
    classifier: "bg-green-500",
    variable: "bg-blue-500",
    system: "bg-gray-500",
    conversation: "bg-violet-500",
};

interface VariableSelectorProps {
    currentNodeId: string;
    nodes: Node[];
    edges: Edge[];
    onSelect: (variableRef: string) => void;
    trigger?: React.ReactNode;
}

export function VariableSelector({
    currentNodeId,
    nodes,
    edges,
    onSelect,
    trigger,
}: VariableSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const { isChatflow } = useWorkflowContext();

    // 1. 获取上游变量
    const upstreamVariables = useMemo(() => {
        return getUpstreamVariables(currentNodeId, nodes, edges);
    }, [currentNodeId, nodes, edges]);

    // 2. 获取系统变量
    const systemVarsNode = useMemo((): NodeVariable | null => {
        const vars = getSystemVariables(isChatflow);
        if (vars.length === 0) return null;
        return {
            nodeId: "sys",
            nodeName: "系统变量",
            nodeType: "system",
            variables: vars.map(v => ({
                nodeId: "sys",
                nodeName: "系统变量",
                variableKey: v.key.replace("sys.", ""), // 移除前缀以便显示? 不，保持原样或者 key 是 full key
                variableType: v.type,
                description: v.description
            }))
        };
    }, [isChatflow]);

    // 3. 获取会话变量 (Chatflow 专属)
    const conversationVarsNode = useMemo((): NodeVariable | null => {
        if (!isChatflow) return null;
        const startNode = nodes.find(n => n.type === 'start');
        const vars: any[] = startNode?.data?.conversation_variables || [];
        if (vars.length === 0) return null;

        return {
            nodeId: "conversation",
            nodeName: "会话变量",
            nodeType: "conversation",
            variables: vars.map(v => ({
                nodeId: "conversation",
                nodeName: "会话变量",
                variableKey: v.name,
                variableType: v.type,
                description: "会话持久化变量"
            }))
        };
    }, [isChatflow, nodes]);

    // 合并所有变量源
    const allVariables = useMemo(() => {
        const list: NodeVariable[] = [];
        if (systemVarsNode) list.push(systemVarsNode);
        if (conversationVarsNode) list.push(conversationVarsNode);
        return [...list, ...upstreamVariables];
    }, [systemVarsNode, conversationVarsNode, upstreamVariables]);

    // 过滤变量
    const filteredVariables = useMemo(() => {
        if (!searchText) return allVariables;

        const lowerSearch = searchText.toLowerCase();
        return allVariables
            .map(nodeVar => ({
                ...nodeVar,
                variables: nodeVar.variables.filter(
                    v =>
                        v.variableKey.toLowerCase().includes(lowerSearch) ||
                        nodeVar.nodeName.toLowerCase().includes(lowerSearch) ||
                        (v.description && v.description.toLowerCase().includes(lowerSearch))
                ),
            }))
            .filter(nodeVar => nodeVar.variables.length > 0);
    }, [allVariables, searchText]);

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    const handleSelectVariable = (variable: VariableType) => {
        // 特殊处理系统变量和会话变量的引用格式
        let ref = "";
        if (variable.nodeId === "sys") {
            ref = `{{sys.${variable.variableKey}}}`.replace("sys.sys.", "sys."); // 防止重复前缀
        } else if (variable.nodeId === "conversation") {
            ref = `{{conversation.${variable.variableKey}}}`;
        } else {
            ref = formatVariableReference(variable.nodeId, variable.variableKey);
        }

        onSelect(ref);
        setIsOpen(false);
        setSearchText("");
    };

    return (
        <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-start">
            <PopoverTrigger>
                {trigger || (
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-6 w-6 min-w-6"
                    >
                        <Variable size={14} className="text-primary" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
                <div className="flex flex-col">
                    {/* 搜索框 */}
                    <div className="p-2 border-b border-divider">
                        <Input
                            size="sm"
                            placeholder="搜索变量..."
                            value={searchText}
                            onValueChange={setSearchText}
                            startContent={<Search size={14} className="text-foreground-400" />}
                            classNames={{
                                inputWrapper: "h-8",
                                input: "text-[11px]",
                            }}
                        />
                    </div>

                    {/* 变量列表 */}
                    <ScrollShadow className="max-h-[300px] p-1">
                        {filteredVariables.length === 0 ? (
                            <div className="py-6 text-center text-[11px] text-foreground-400">
                                {searchText ? "没有找到匹配的变量" : "没有可用的上游变量"}
                            </div>
                        ) : (
                            filteredVariables.map((nodeVar) => (
                                <NodeVariableGroup
                                    key={nodeVar.nodeId}
                                    nodeVar={nodeVar}
                                    isExpanded={expandedNodes.has(nodeVar.nodeId) || !!searchText}
                                    onToggle={() => toggleNode(nodeVar.nodeId)}
                                    onSelectVariable={handleSelectVariable}
                                />
                            ))
                        )}
                    </ScrollShadow>
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface NodeVariableGroupProps {
    nodeVar: NodeVariable;
    isExpanded: boolean;
    onToggle: () => void;
    onSelectVariable: (variable: VariableType) => void;
}

function NodeVariableGroup({
    nodeVar,
    isExpanded,
    onToggle,
    onSelectVariable,
}: NodeVariableGroupProps) {
    const IconComponent = NODE_TYPE_ICONS[nodeVar.nodeType] || Box;
    const colorClass = NODE_TYPE_COLORS[nodeVar.nodeType] || "bg-gray-500";

    return (
        <div className="mb-1">
            {/* 节点头部 */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-content2 transition-colors"
            >
                <ChevronRight
                    size={12}
                    className={`text-foreground-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
                <div className={`w-4 h-4 rounded flex items-center justify-center ${colorClass}`}>
                    <IconComponent size={10} className="text-white" />
                </div>
                <span className="text-[11px] font-medium text-foreground-700 flex-1 text-left truncate">
                    {nodeVar.nodeName}
                </span>
                <span className="text-[9px] text-foreground-400">
                    {nodeVar.variables.length} 个变量
                </span>
            </button>

            {/* 变量列表 */}
            {isExpanded && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                    {nodeVar.variables.map((variable) => (
                        <VariableItem
                            key={`${variable.nodeId}-${variable.variableKey}`}
                            variable={variable}
                            onClick={() => onSelectVariable(variable)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface VariableItemProps {
    variable: VariableType;
    onClick: () => void;
}

function VariableItem({ variable, onClick }: VariableItemProps) {
    const typeConfig = VARIABLE_TYPE_CONFIG[variable.variableType] || VARIABLE_TYPE_CONFIG.any;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors group"
        >
            <Variable size={12} className="text-foreground-400 group-hover:text-primary" />
            <span className="text-[11px] font-mono text-foreground-600 group-hover:text-primary flex-1 text-left truncate">
                {variable.variableKey}
            </span>
            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                {typeConfig.label}
            </span>
        </button>
    );
}

// ============== 变量标签组件 ==============

interface VariableTagProps {
    nodeId: string;
    variableKey: string;
    type?: VarType;
    onRemove?: () => void;
}

export function VariableTag({ nodeId, variableKey, type = "any", onRemove }: VariableTagProps) {
    const typeConfig = VARIABLE_TYPE_CONFIG[type] || VARIABLE_TYPE_CONFIG.any;

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${typeConfig.bgColor} ${typeConfig.color}`}>
            <Variable size={10} />
            <span className="font-mono">{nodeId}.{variableKey}</span>
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="ml-0.5 hover:opacity-70"
                >
                    ×
                </button>
            )}
        </span>
    );
}

// ============== 带变量选择的输入框 ==============

interface VariableInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    currentNodeId: string;
    nodes: Node[];
    edges: Edge[];
    label?: string;
    minRows?: number;
    isTextarea?: boolean;
}

export function VariableInput({
    value,
    onChange,
    placeholder,
    currentNodeId,
    nodes,
    edges,
    label,
    minRows = 3,
    isTextarea = false,
}: VariableInputProps) {
    const handleInsertVariable = (variableRef: string) => {
        onChange(value + variableRef);
    };

    return (
        <div className="relative">
            {label && (
                <div className="text-[10px] font-medium text-foreground-500 mb-1.5">{label}</div>
            )}
            <div className="relative">
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={minRows}
                        className="w-full px-3 py-2 pr-10 text-[11px] font-mono bg-content1 border border-divider rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 pr-10 h-9 text-[11px] font-mono bg-content1 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                )}
                <div className="absolute right-2 top-2">
                    <VariableSelector
                        currentNodeId={currentNodeId}
                        nodes={nodes}
                        edges={edges}
                        onSelect={handleInsertVariable}
                    />
                </div>
            </div>
        </div>
    );
}
