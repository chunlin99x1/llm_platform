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
    MoreVertical,
    GitBranch,
    Code,
    Globe,
    Variable,
    Repeat,
    FileCode,
    Database,
    HelpCircle,
} from "lucide-react";

// --- Node Components ---

export type NodeStatus = "idle" | "pending" | "running" | "success" | "error";

interface BaseNodeProps {
    title: string;
    icon: any;
    children: React.ReactNode;
    colorClass: string; // TailWind class for text/bg color
    iconBgClass?: string;
    selected?: boolean;
    status?: NodeStatus;
    executionTime?: number; // 毫秒
}

function StatusIndicator({ status, executionTime }: { status: NodeStatus; executionTime?: number }) {
    switch (status) {
        case "pending":
            return (
                <div className="flex items-center gap-1 text-foreground-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground-300 animate-pulse" />
                </div>
            );
        case "running":
            return (
                <div className="flex items-center gap-1 text-primary">
                    <Loader2 size={12} className="animate-spin" />
                </div>
            );
        case "success":
            return (
                <div className="flex items-center gap-1 text-success">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                    {executionTime && <span className="text-[9px] font-medium">{`${(executionTime / 1000).toFixed(2)} s`}</span>}
                </div>
            );
        case "error":
            return (
                <div className="flex items-center gap-1 text-danger">
                    <XCircle size={13} strokeWidth={2.5} />
                </div>
            );
        default:
            return null;
    }
}

function BaseNode({ title, icon: Icon, children, colorClass, iconBgClass, selected, status = "idle", executionTime }: BaseNodeProps) {
    const statusBorderClass = status === "running"
        ? "ring-2 ring-primary ring-offset-1"
        : status === "success"
            ? "ring-1 ring-success"
            : status === "error"
                ? "ring-1 ring-danger"
                : "";

    const selectedClass = selected ? "ring-2 ring-primary border-primary shadow-lg shadow-primary/10" : "border-divider/60 hover:border-primary/40 hover:shadow-md";

    return (
        <div className={`group relative min - w - [200px] max - w - [200px] cursor - pointer rounded - xl border bg - white shadow - sm transition - all duration - 200 ${selectedClass} ${statusBorderClass} `}>

            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                    <div className={`flex items - center justify - center w - 5 h - 5 rounded - md shadow - sm ${iconBgClass || colorClass} `}>
                        <Icon size={12} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground-900 leading-none truncate max-w-[120px]">{title}</span>
                </div>

                <div className="flex items-center gap-1">
                    {status !== "idle" ? (
                        <StatusIndicator status={status} executionTime={executionTime} />
                    ) : (
                        <button className="text-foreground-300 hover:text-foreground-500 transition-colors">
                            <MoreVertical size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="px-2.5 pb-3 space-y-1.5">
                {children}
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!h-2.5 !w-2.5 !border-2 !border-white !bg-primary -ml-[5px]"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!h-2.5 !w-2.5 !border-2 !border-white !bg-primary -mr-[5px]"
            />
        </div>
    );
}


export function StartNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title="开始"
            icon={Play}
            colorClass="bg-blue-500"
            iconBgClass="bg-blue-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="text-[11px] text-foreground-500 bg-foreground-50 p-2 rounded-lg">
                <span className="font-medium text-foreground-700">系统输入</span>
                <div className="mt-1 flex flex-wrap gap-1">
                    <span className="bg-white border border-divider px-1.5 py-0.5 rounded text-[10px]">sys.query</span>
                    <span className="bg-white border border-divider px-1.5 py-0.5 rounded text-[10px]">sys.files</span>
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
            colorClass="bg-indigo-500"
            iconBgClass="bg-indigo-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="space-y-2">
                <div className="text-[11px] font-medium text-foreground-600 bg-foreground-50 px-2 py-1 rounded">
                    MODEL: <span className="font-bold text-foreground-800">GPT-4o</span>
                </div>
                <div className="text-[11px] text-foreground-500 line-clamp-2 leading-relaxed px-1">
                    {data.prompt || "输入提示词..."}
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
            colorClass="bg-orange-500"
            iconBgClass="bg-orange-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="text-[11px] text-foreground-500 bg-foreground-50 p-2 rounded-lg">
                回复内容将直接发送给用户
            </div>
        </BaseNode>
    );
}

export function ConditionNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "条件分支"}
            icon={GitBranch}
            colorClass="bg-cyan-500"
            iconBgClass="bg-cyan-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="group/code bg-foreground-50 rounded-lg p-2 border border-transparent hover:border-divider transition-colors">
                <div className="text-[10px] font-bold text-foreground-400 mb-1 uppercase tracking-wider">IF</div>
                <div className="text-[11px] font-mono text-foreground-700 truncate">
                    {data.condition || "condition..."}
                </div>
            </div>
        </BaseNode>
    );
}

export function CodeNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode
            title={data.label || "代码执行"}
            icon={Code}
            colorClass="bg-blue-600"
            iconBgClass="bg-blue-600"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                    {data.language || "Python"}
                </div>
            </div>
            <div className="bg-foreground-900 rounded-lg p-2 overflow-hidden relative">
                <div className="text-[10px] font-mono text-zinc-400 leading-tight line-clamp-3 opacity-80">
                    {data.code || "# code here..."}
                </div>
            </div>
        </BaseNode>
    );
}

export function HttpNode({ data, selected }: { data: any, selected: boolean }) {
    const methodColors: Record<string, string> = {
        GET: "bg-blue-100 text-blue-700 border-blue-200",
        POST: "bg-green-100 text-green-700 border-green-200",
        PUT: "bg-orange-100 text-orange-700 border-orange-200",
        DELETE: "bg-red-100 text-red-700 border-red-200",
    };
    const method = data.method || "GET";

    return (
        <BaseNode
            title={data.label || "HTTP 请求"}
            icon={Globe}
            colorClass="bg-violet-500"
            iconBgClass="bg-violet-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="flex items-center gap-2 bg-foreground-50 p-2 rounded-lg border border-transparent hover:border-divider transition-colors">
                <span className={`text - [9px] font - bold px - 1.5 py - 0.5 rounded border ${methodColors[method] || methodColors.GET} `}>
                    {method}
                </span>
                <span className="text-[11px] text-foreground-600 truncate font-mono">
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
            colorClass="bg-blue-500"
            iconBgClass="bg-blue-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="flex flex-col gap-1.5 bg-foreground-50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground-400 font-medium">SET</span>
                    <span className="text-[11px] font-mono text-primary font-medium bg-primary/5 px-1 rounded">
                        {data.variableName || "variable"}
                    </span>
                </div>
                <div className="h-px bg-divider/50 w-full" />
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground-400 font-medium">TO</span>
                    <span className="text-[11px] text-foreground-600 truncate max-w-[140px]">
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
            colorClass="bg-cyan-500"
            iconBgClass="bg-cyan-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="bg-foreground-50 p-2 rounded-lg">
                <div className="text-[10px] text-foreground-500 mb-1">输入列表</div>
                <div className="text-[11px] font-mono text-foreground-700 truncate">
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
            colorClass="bg-blue-500"
            iconBgClass="bg-blue-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="bg-foreground-900 rounded-lg p-2 overflow-hidden">
                <div className="text-[10px] font-mono text-zinc-400 leading-tight line-clamp-2">
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
            colorClass="bg-green-500"
            iconBgClass="bg-green-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="bg-foreground-50 p-2 rounded-lg">
                <div className="text-[10px] text-foreground-500 mb-1">知识库</div>
                <div className="text-[11px] font-medium text-foreground-700 truncate">
                    {data.knowledgeBase || "选择知识库..."}
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
            colorClass="bg-green-500"
            iconBgClass="bg-green-500"
            selected={selected}
            status={data.status}
            executionTime={data.executionTime}
        >
            <div className="bg-foreground-50 p-2 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-foreground-600">类别 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-foreground-600">类别 2</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <span className="text-[10px] text-foreground-400">更多...</span>
                </div>
            </div>
        </BaseNode>
    );
}

export const nodeTypes = {
    start: StartNode,
    llm: LLMNode,
    answer: AnswerNode,
    end: AnswerNode,
    condition: ConditionNode,
    code: CodeNode,
    http: HttpNode,
    variable: VariableNode,
    iteration: IterationNode,
    template: TemplateNode,
    knowledge: KnowledgeNode,
    classifier: ClassifierNode,
};
