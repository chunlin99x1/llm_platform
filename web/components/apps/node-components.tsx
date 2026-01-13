"use client";

import { Handle, Position } from "reactflow";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Play,
    Box,
    MessageSquare,
    Terminal,
    MoreHorizontal,
    GitBranch,
    Code,
    Globe,
    Variable,
    Repeat,
    FileCode,
    Database,
    HelpCircle,
    Search,
    Bot,
    Wrench,
    FileText,
    List,
    FileSearch,
} from "lucide-react";
import { cn } from "@heroui/react";

// --- Node Components ---

export type NodeStatus = "idle" | "pending" | "running" | "success" | "error";

interface BaseNodeProps {
    title: string;
    icon: any;
    children: React.ReactNode;
    colorClass: string; // TailWind class for text color in icon
    bgClass: string; // TailWind class for icon background
    selected?: boolean;
    status?: NodeStatus;
    executionTime?: number; // 毫秒
    headerRight?: React.ReactNode;
    onMenuClick?: (e: React.MouseEvent) => void;
    hideHandles?: boolean; // 新增属性
}

function StatusIndicator({ status, executionTime }: { status: NodeStatus; executionTime?: number }) {
    switch (status) {
        case "pending":
            return (
                <div className="flex items-center justify-center w-5 h-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                </div>
            );
        case "running":
            return (
                <div className="flex items-center justify-center w-5 h-5 text-[#155EEF]">
                    <Loader2 size={14} className="animate-spin" />
                </div>
            );
        case "success":
            return (
                <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                    {executionTime && <span className="text-[9px] font-medium font-mono text-gray-400">{`${(executionTime / 1000).toFixed(2)}s`}</span>}
                </div>
            );
        case "error":
            return (
                <div className="flex items-center justify-center w-5 h-5 text-red-600">
                    <XCircle size={14} strokeWidth={2.5} />
                </div>
            );
        default:
            return null;
    }
}

function BaseNode({ title, icon: Icon, children, colorClass, bgClass, selected, status = "idle", executionTime, headerRight, onMenuClick, hideHandles }: BaseNodeProps) {
    const isRunning = status === "running";
    const isError = status === "error";

    return (
        <div
            className={cn(
                "group relative w-[240px] rounded-2xl border bg-white transition-all duration-200",
                selected
                    ? "border-[#155EEF] ring-1 ring-[#155EEF] shadow-lg shadow-[#155EEF]/10 z-10"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                isRunning && "ring-2 ring-[#155EEF]/30 border-[#155EEF]",
                isError && "border-red-300 ring-2 ring-red-100"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-[10px] shadow-sm shrink-0", bgClass)}>
                        <Icon size={16} className={cn("text-white")} />
                    </div>
                    <span className="text-[13px] font-bold text-gray-900 truncate flex-1 leading-tight">
                        {title}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {status !== "idle" ? (
                        <StatusIndicator status={status} executionTime={executionTime} />
                    ) : (
                        headerRight || (
                            <button
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={onMenuClick}
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="px-3 pb-3 space-y-2">
                <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100/50">
                    {children}
                </div>
            </div>

            {/* Handles */}
            {!hideHandles && (
                <>
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="!h-3 !w-3 !border-[3px] !border-white !bg-[#155EEF] !shadow-sm -ml-[6px] transition-transform hover:scale-125"
                    />
                    <Handle
                        type="source"
                        position={Position.Right}
                        className="!h-3 !w-3 !border-[3px] !border-white !bg-[#155EEF] !shadow-sm -mr-[6px] transition-transform hover:scale-125"
                    />
                </>
            )}
        </div>
    );
}


// 引入 WorkflowContext
import { useWorkflowContext } from "@/context/workflow-context";
import { getSystemVariables } from "./workflow/system-variables";

export function StartNode({ data, selected }: { data: any, selected: boolean }) {
    const { isChatflow } = useWorkflowContext();
    // 获取当前模式下的系统变量
    const sysVars = getSystemVariables(isChatflow);

    return (
        <BaseNode
            title="开始"
            icon={Play}
            colorClass="text-white"
            bgClass="bg-[#155EEF]" // Blue-600
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500">
                <span className="text-gray-400 block mb-1.5 text-[10px] font-medium uppercase tracking-wider">系统变量</span>
                <div className="flex flex-wrap gap-1.5">
                    {sysVars.map(v => (
                        <span key={v.key} className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-mono font-medium bg-white border border-gray-200 text-gray-600">
                            {v.key}
                        </span>
                    ))}
                </div>
            </div>
        </BaseNode>
    );
}

export function LLMNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "LLM"}
            icon={Box}
            colorClass="text-white"
            bgClass="bg-[#6172F3]" // Indigo
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Model</span>
                    <span className="text-[11px] font-semibold text-gray-700">{data.model || "未配置"}</span>
                </div>
                <div className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {data.prompt ? (
                        <span className="text-gray-600">{data.prompt}</span>
                    ) : (
                        <span className="italic text-gray-400">输入提示词...</span>
                    )}
                </div>
            </div>
        </BaseNode>
    );
}

export function AnswerNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "直接回复"}
            icon={MessageSquare}
            colorClass="text-white"
            bgClass="bg-[#F79009]" // Orange
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500 leading-relaxed">
                回复内容将直接发送给用户
            </div>
        </BaseNode>
    );
}

export function ConditionNode({ data, selected }: { data: any, selected: boolean }) {
    const cases = data.cases || [];

    return (
        <BaseNode
            title={data.label || "条件分支"}
            icon={GitBranch}
            colorClass="text-white"
            bgClass="bg-gray-600"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
            hideHandles={true}
        >
            <div className="space-y-2 mb-2">
                <div className="text-[10px] text-gray-400">
                    {cases.length > 0
                        ? `${cases.length} 个分支`
                        : (data.conditions?.length ? "已配置条件 (Binary)" : "请配置条件")
                    }
                </div>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                id="target"
                className="!h-3 !w-3 !border-[3px] !border-white !bg-[#155EEF] !shadow-sm -ml-[6px]"
            />

            {/* Output Handles */}
            <div className="absolute -right-[6px] top-[40px] flex flex-col gap-4 items-end">
                {cases.length > 0 ? (
                    /* 1. 多分支模式 */
                    <>
                        {cases.map((c: any, i: number) => (
                            <div key={c.id} className="relative flex items-center h-4">
                                <span className="absolute right-4 text-[9px] font-bold text-gray-500 whitespace-nowrap bg-white/80 px-1 rounded shadow-sm">
                                    {c.name || `CASE ${i + 1}`}
                                </span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={c.id}
                                    className="!h-3 !w-3 !border-[3px] !border-white !bg-[#155EEF] hover:!bg-[#155EEF] !shadow-sm"
                                />
                            </div>
                        ))}
                        {/* Else */}
                        <div className="relative flex items-center h-4">
                            <span className="absolute right-4 text-[9px] font-bold text-gray-400 whitespace-nowrap">ELSE</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="false"
                                className="!h-3 !w-3 !border-[3px] !border-white !bg-gray-400 hover:!bg-gray-500"
                            />
                        </div>
                    </>
                ) : (
                    /* 2. 旧版 Binary 模式 */
                    <>
                        {/* True */}
                        <div className="relative flex items-center h-4">
                            <span className="absolute right-4 text-[9px] font-bold text-emerald-600 bg-white/80 px-1 rounded">TRUE</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="true"
                                className="!h-3 !w-3 !border-[3px] !border-white !bg-emerald-500 hover:!bg-emerald-600"
                            />
                        </div>
                        {/* False */}
                        <div className="relative flex items-center h-4">
                            <span className="absolute right-4 text-[9px] font-bold text-gray-400">FALSE</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="false"
                                className="!h-3 !w-3 !border-[3px] !border-white !bg-gray-400 hover:!bg-gray-500"
                            />
                        </div>
                    </>
                )}
            </div>
        </BaseNode>
    );
}

export function CodeNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "代码执行"}
            icon={Code}
            colorClass="text-white"
            bgClass="bg-[#E44D6C]" // Rose/Pink
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Language</span>
                    <span className="text-[10px] font-bold text-[#E44D6C] bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                        {data.language || "Python"}
                    </span>
                </div>
                <div className="bg-[#1e1e1e] rounded-lg p-2 overflow-hidden border border-gray-800">
                    <div className="text-[10px] font-mono text-gray-400 leading-tight line-clamp-3 opacity-90">
                        {data.code || "# Write your code here"}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export function HttpNode({ data, selected }: { data: any, selected: boolean }) {
    const methodColors: Record<string, string> = {
        GET: "bg-blue-50 text-blue-700 border-blue-200",
        POST: "bg-green-50 text-green-700 border-green-200",
        PUT: "bg-orange-50 text-orange-700 border-orange-200",
        DELETE: "bg-red-50 text-red-700 border-red-200",
    };
    const method = data.method || "GET";

    return (
        <BaseNode
            title={data.label || "HTTP 请求"}
            icon={Globe}
            colorClass="text-white"
            bgClass="bg-[#875BF7]" // Violet
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200">
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", methodColors[method] || methodColors.GET)}>
                    {method}
                </span>
                <span className="text-[11px] text-gray-600 truncate font-mono flex-1">
                    {data.url ? new URL(data.url).pathname : "/..."}
                </span>
            </div>
        </BaseNode>
    );
}

export function VariableNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "变量赋值"}
            icon={Variable}
            colorClass="text-white"
            bgClass="bg-[#155EEF]"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400">SET</span>
                    <span className="text-[11px] font-mono text-[#155EEF] font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 max-w-[140px] truncate">
                        {data.variableName || "var_name"}
                    </span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400">TO</span>
                    <span className="text-[11px] text-gray-600 truncate max-w-[140px] font-mono bg-white px-1 rounded border border-gray-100">
                        {data.value || "..."}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export function IterationNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "迭代"}
            icon={Repeat}
            colorClass="text-white"
            bgClass="bg-[#06AED4]" // Cyan
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Input</div>
                <div className="font-mono text-[11px] text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-1 truncate">
                    {data.inputList || "{{items}}"}
                </div>
            </div>
        </BaseNode>
    );
}

export function TemplateNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "模板转换"}
            icon={FileCode}
            colorClass="text-white"
            bgClass="bg-[#155EEF]"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <div className="text-[10px] font-mono text-gray-500 leading-tight line-clamp-2">
                    {data.template || "{{ input }}"}
                </div>
            </div>
        </BaseNode>
    );
}

export function KnowledgeNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "知识检索"}
            icon={Database}
            colorClass="text-white"
            bgClass="bg-[#00A9A6]" // Teal (Dify style)
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Dataset</div>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded p-1.5">
                    <div className="w-4 h-4 rounded bg-[#FFF2F2] flex items-center justify-center text-[10px]">📙</div>
                    <div className="text-[11px] font-medium text-gray-700 truncate">
                        {data.knowledgeBase || "选择知识库..."}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export function ClassifierNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "问题分类"}
            icon={HelpCircle}
            colorClass="text-white"
            bgClass="bg-[#00A9A6]" // Same as Knowledge
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1.5 mt-0.5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />
                    <span className="text-[11px] text-gray-600 font-medium">Class 1</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
                    <span className="text-[11px] text-gray-600 font-medium">Class 2</span>
                </div>
            </div>
        </BaseNode>
    );
}

export function ToolNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "工具调用"}
            icon={Wrench}
            colorClass="text-white"
            bgClass="bg-[#10b981]" // Emerald
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tool</div>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded p-1.5">
                    <div className="text-[11px] font-medium text-gray-700 truncate">
                        {data.tool_name || "选择工具..."}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export function AgentNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "Agent"}
            icon={Bot}
            colorClass="text-white"
            bgClass="bg-[#8b5cf6]" // Violet
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500 leading-relaxed">
                <div className="flex items-center gap-1">
                    <span className="text-xs">🤖</span>
                    <span>{data.agent_mode || "Function Call"}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export function QuestionClassifierNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "问题分类"}
            icon={HelpCircle}
            colorClass="text-white"
            bgClass="bg-[#f59e0b]" // Amber
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="space-y-1.5 mt-0.5">
                {(data.classes || []).slice(0, 2).map((cls: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-blue-500'} shadow-sm`} />
                        <span className="text-[11px] text-gray-600 font-medium truncate">{cls.name || `Class ${i + 1}`}</span>
                    </div>
                ))}
            </div>
        </BaseNode>
    );
}

export function ExtractorNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "参数提取"}
            icon={FileSearch}
            colorClass="text-white"
            bgClass="bg-[#a855f7]" // Purple
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500">
                提取结构化参数
            </div>
        </BaseNode>
    );
}

export function DocumentExtractorNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "文档提取"}
            icon={FileText}
            colorClass="text-white"
            bgClass="bg-[#6366f1]" // Indigo
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500">
                从文档提取内容
            </div>
        </BaseNode>
    );
}

export function ListOperatorNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "列表操作"}
            icon={List}
            colorClass="text-white"
            bgClass="bg-[#06b6d4]" // Cyan
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
            onMenuClick={data.onShowMenu}
        >
            <div className="text-[11px] text-gray-500">
                <span className="font-mono text-[10px] bg-gray-100 px-1 rounded">{data.operator || "filter"}</span>
            </div>
        </BaseNode>
    );
}

export const nodeTypes = {
    start: StartNode,
    llm: LLMNode,
    answer: AnswerNode,
    end: AnswerNode, // End node uses Answer style currently? Or should have explicit EndNode? Reusing Answer is fine for now, or use red color. 
    condition: ConditionNode,
    code: CodeNode,
    http: HttpNode,
    variable: VariableNode,
    iteration: IterationNode,
    template: TemplateNode,
    knowledge: KnowledgeNode,
    // Fix existing classifier key if needed, or alias it
    classifier: ClassifierNode,
    "question-classifier": QuestionClassifierNode, // Match backend type
    tool: ToolNode,
    agent: AgentNode,
    extractor: ExtractorNode,
    "document-extractor": DocumentExtractorNode,
    "list-operator": ListOperatorNode,
};
