"use client";

import {
    Play,
    Box,
    MessageSquare,
    Terminal,
    MoreVertical,
} from "lucide-react";
import { Handle, Position } from "reactflow";

// --- Node Components ---

interface BaseNodeProps {
    title: string;
    icon: any;
    children: React.ReactNode;
    colorClass: string;
    selected?: boolean;
}

function BaseNode({ title, icon: Icon, children, colorClass, selected }: BaseNodeProps) {
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

export function StartNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode title="Start" icon={Play} colorClass="bg-success" selected={selected}>
            <div className="font-bold text-[13px] tracking-tight">{data.label || "开始"}</div>
        </BaseNode>
    );
}

export function LLMNode({ data, selected }: { data: any, selected: boolean }) {
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

export function AnswerNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <BaseNode title="Answer" icon={MessageSquare} colorClass="bg-warning" selected={selected}>
            <div className="font-bold text-[13px] text-warning-700 tracking-tight">{data.label || "回答"}</div>
        </BaseNode>
    );
}

export const nodeTypes = {
    start: StartNode,
    llm: LLMNode,
    answer: AnswerNode,
    end: AnswerNode,
};
