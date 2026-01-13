"use client";

import { useWorkflowContext } from "@/context/workflow-context";
import {
    Play,
    Square,
    MessageSquare,
    Bot,
    GitBranch,
    Variable,
    Code,
    Globe,
    Repeat,
    FileText,
    Database,
    Wrench,
    HelpCircle,
    List,
    Box,
    StopCircle, // end
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 图标名称规范化映射
const ICON_NAME_MAP: Record<string, any> = {
    // API 节点类型 -> 图标组件
    "start": Play,
    "end": StopCircle,
    "answer": MessageSquare,
    "llm": Box,
    "tool": Wrench,
    "agent": Bot,
    "question-classifier": HelpCircle,
    "list-operator": List,
    "document-extractor": FileText,
    "condition": GitBranch,
    "iteration": Repeat,
    "code": Code,
    "http": Globe,
    "variable": Variable,
    "template": FileText,
    "knowledge": Database,
    "extractor": FileText,
    "classifier": GitBranch,

    // API icon 字段 -> 图标组件 (仅保留特定不同的或重命名的)
    "play": Play,
    "stop-circle": StopCircle,
    "stop": StopCircle,
    "box": Box,
    "message-square": MessageSquare,
    "git-branch": GitBranch,
    // "code": Code, // 重复
    "globe": Globe,
    // "variable": Variable, // 重复
    "file-text": FileText,
    "database": Database,
    "wrench": Wrench,
    "help-circle": HelpCircle,
    "list": List,
    "bot": Bot,
    "repeat": Repeat,
};

function getIconComponent(iconName: string, nodeType?: string): LucideIcon {
    // 1. 尝试直接映射 icon 名称
    if (ICON_NAME_MAP[iconName]) return ICON_NAME_MAP[iconName];

    // 2. 尝试映射 nodeType
    if (nodeType && ICON_NAME_MAP[nodeType]) return ICON_NAME_MAP[nodeType];

    // 默认
    return Play;
}

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
                    const categoryNodes = nodesByCategory[category];
                    if (!categoryNodes?.length) return null;

                    // 获取分类标签
                    const CATEGORY_LABELS: Record<string, string> = {
                        input: "输入",
                        output: "输出",
                        llm: "大语言模型",
                        logic: "逻辑",
                        tool: "工具",
                        data: "知识与数据",
                    };

                    return (
                        <div key={category}>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                {CATEGORY_LABELS[category] || category}
                            </div>
                            <div className="space-y-1">
                                {categoryNodes.map((node) => (
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
    node: any; // 支持 API 返回的 NodeTypeInfo
    onClick: () => void;
}

function NodeButton({ node, onClick }: NodeButtonProps) {
    const Icon = getIconComponent(node.icon, node.type);

    // API 返回的是 hex color (e.g. #3b82f6)
    const bgStyle = node.color ? { backgroundColor: node.color } : undefined;
    const bgClass = !node.color ? "bg-gray-500" : "";

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
        >
            <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shadow-sm ${bgClass}`}
                style={bgStyle}
            >
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
        <div className="space-y-0.5 max-h-[300px] overflow-y-auto p-1">
            {availableNodes.map((node) => {
                const Icon = getIconComponent(node.icon, node.type);
                const colorStyle = node.color ? { color: node.color } : undefined;
                const colorClass = !node.color ? "text-gray-500" : "";

                return (
                    <button
                        key={node.type}
                        onClick={() => onAddNode(node.type)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                    >
                        <Icon size={14} className={colorClass} style={colorStyle} />
                        <span className="text-xs text-gray-700">{node.label}</span>
                    </button>
                )
            })}
        </div>
    );
}
