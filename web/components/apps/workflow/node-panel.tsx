/**
 * 节点选择面板
 * 
 * 根据应用模式（workflow/chatflow）自动过滤可用节点，
 * 使用统一组件，通过配置驱动差异化。
 */

"use client";

import { useMemo } from "react";
import {
    Play,
    Square,
    MessageCircle,
    Bot,
    GitBranch,
    GitFork,
    Repeat,
    Layers,
    Code2,
    Globe,
    FileText,
    Database,
    FileSearch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkflowContext, NODE_CATEGORY_LABELS } from "@/context/workflow-context";
import type { NodeTypeConfig } from "@/lib/app-mode-config";

// ============== 图标映射 ==============

const ICON_MAP: Record<string, LucideIcon> = {
    Play,
    Square,
    MessageCircle,
    Bot,
    GitBranch,
    GitFork,
    Repeat,
    Layers,
    Code2,
    Globe,
    FileText,
    Database,
    FileSearch,
};

function getIconComponent(iconName: string): LucideIcon {
    return ICON_MAP[iconName] || Play;
}

// ============== 颜色映射 ==============

const BG_COLOR_MAP: Record<string, string> = {
    "bg-green-500": "bg-green-500",
    "bg-red-500": "bg-red-500",
    "bg-blue-500": "bg-blue-500",
    "bg-purple-500": "bg-purple-500",
    "bg-amber-500": "bg-amber-500",
    "bg-teal-500": "bg-teal-500",
    "bg-indigo-500": "bg-indigo-500",
    "bg-cyan-500": "bg-cyan-500",
    "bg-gray-500": "bg-gray-500",
    "bg-orange-500": "bg-orange-500",
    "bg-pink-500": "bg-pink-500",
    "bg-emerald-500": "bg-emerald-500",
    "bg-rose-500": "bg-rose-500",
};

// ============== 组件 ==============

interface NodePanelProps {
    onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
    className?: string;
}

export function NodePanel({ onAddNode, className = "" }: NodePanelProps) {
    const { nodesByCategory, appMode, isChatflow } = useWorkflowContext();

    // 分类顺序
    const categoryOrder = ["input", "output", "llm", "logic", "tool", "data"];

    return (
        <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-[220px] ${className}`}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600">添加节点</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                    {isChatflow ? "Chatflow" : "Workflow"}
                </span>
            </div>

            {/* Scrollable Content */}
            <div className="p-2 max-h-[400px] overflow-y-auto space-y-3">
                {categoryOrder.map((category) => {
                    const nodes = nodesByCategory[category];
                    if (!nodes || nodes.length === 0) return null;

                    return (
                        <div key={category}>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                                {NODE_CATEGORY_LABELS[category] || category}
                            </div>
                            <div className="space-y-0.5">
                                {nodes.map((node) => (
                                    <NodeButton
                                        key={node.type}
                                        node={node}
                                        onClick={() => onAddNode(node.type)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============== 节点按钮 ==============

interface NodeButtonProps {
    node: NodeTypeConfig;
    onClick: () => void;
}

function NodeButton({ node, onClick }: NodeButtonProps) {
    const Icon = getIconComponent(node.icon);
    const bgColor = BG_COLOR_MAP[node.bgColor] || "bg-gray-500";

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
        >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${bgColor} shadow-sm`}>
                <Icon size={10} className="text-white" />
            </div>
            <div className="flex-1 text-left">
                <div className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">
                    {node.label}
                </div>
                <div className="text-[9px] text-gray-400 leading-tight">{node.description}</div>
            </div>
        </button>
    );
}

// ============== 简化版面板（用于右键菜单） ==============

interface NodeListProps {
    onAddNode: (nodeType: string) => void;
}

export function NodeList({ onAddNode }: NodeListProps) {
    const { availableNodes } = useWorkflowContext();

    return (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {availableNodes.map((node) => (
                <button
                    key={node.type}
                    onClick={() => onAddNode(node.type)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                >
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${BG_COLOR_MAP[node.bgColor] || "bg-gray-500"}`}>
                        {(() => {
                            const Icon = getIconComponent(node.icon);
                            return <Icon size={8} className="text-white" />;
                        })()}
                    </div>
                    <span className="text-xs text-gray-700">{node.label}</span>
                </button>
            ))}
        </div>
    );
}
