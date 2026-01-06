"use client";

import { memo, useState, useCallback } from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from "reactflow";
import { Plus, Repeat, FileCode, Database, HelpCircle } from "lucide-react";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    Button,
} from "@heroui/react";
import {
    Play,
    Box,
    MessageSquare,
    GitBranch,
    Code,
    Globe,
    Variable,
} from "lucide-react";

interface CustomEdgeProps extends EdgeProps {
    data?: {
        onInsertNode?: (edgeId: string, nodeType: string, position: { x: number; y: number }) => void;
        isExecuting?: boolean;
        isSuccess?: boolean;
        isError?: boolean;
    };
}

const nodeOptions = [
    { type: "llm", label: "LLM", icon: Box, color: "bg-indigo-500", desc: "调用大模型" },
    { type: "condition", label: "条件分支", icon: GitBranch, color: "bg-cyan-500", desc: "条件判断" },
    { type: "code", label: "代码执行", icon: Code, color: "bg-blue-600", desc: "执行代码" },
    { type: "http", label: "HTTP 请求", icon: Globe, color: "bg-violet-500", desc: "发送请求" },
    { type: "variable", label: "变量赋值", icon: Variable, color: "bg-blue-500", desc: "设置变量" },
    { type: "iteration", label: "迭代", icon: Repeat, color: "bg-cyan-500", desc: "循环处理" },
    { type: "template", label: "模板转换", icon: FileCode, color: "bg-blue-500", desc: "Jinja2 模板" },
    { type: "knowledge", label: "知识检索", icon: Database, color: "bg-green-500", desc: "检索知识库" },
    { type: "answer", label: "回复", icon: MessageSquare, color: "bg-orange-500", desc: "输出回复" },
];

function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: CustomEdgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.25,
    });

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!isPopoverOpen) {
            setIsHovered(false);
        }
    }, [isPopoverOpen]);

    const handleInsertNode = useCallback((nodeType: string) => {
        if (data?.onInsertNode) {
            data.onInsertNode(id, nodeType, { x: labelX, y: labelY });
        }
        setIsPopoverOpen(false);
        setIsHovered(false);
    }, [data, id, labelX, labelY]);

    // 确定边的颜色
    let strokeColor = '#94a3b8';
    let strokeWidth = 2;
    let animated = false;

    if (data?.isExecuting) {
        strokeColor = '#6366f1';
        animated = true;
    } else if (data?.isSuccess) {
        strokeColor = '#22c55e';
    } else if (data?.isError) {
        strokeColor = '#ef4444';
    } else if (isHovered || isPopoverOpen) {
        strokeColor = '#6366f1';
        strokeWidth = 2.5;
    }

    return (
        <>
            {/* Invisible wider path for easier hover detection */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={20}
                stroke="transparent"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="cursor-pointer"
            />

            {/* 动画流动效果 */}
            {animated && (
                <path
                    d={edgePath}
                    fill="none"
                    strokeWidth={2}
                    stroke={strokeColor}
                    strokeDasharray="5 5"
                    style={{
                        animation: 'dashFlow 1s linear infinite',
                    }}
                />
            )}

            {/* Visible edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: strokeColor,
                    strokeWidth,
                    transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
            />

            {/* Add Node Button */}
            <EdgeLabelRenderer>
                <div
                    className={`
                        absolute pointer-events-auto nodrag nopan
                        transition-all duration-200 ease-out
                        ${isHovered || isPopoverOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                    `}
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Popover
                        isOpen={isPopoverOpen}
                        onOpenChange={setIsPopoverOpen}
                        placement="bottom"
                    >
                        <PopoverTrigger>
                            <button
                                className={`
                                    flex items-center justify-center
                                    w-6 h-6 rounded-full
                                    bg-white border-2 border-indigo-500
                                    text-indigo-500 shadow-lg
                                    hover:bg-indigo-500 hover:text-white
                                    transition-all duration-150
                                    hover:scale-110
                                `}
                            >
                                <Plus size={14} strokeWidth={2.5} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-1 min-w-[180px] max-h-[300px] overflow-y-auto">
                            <div className="flex flex-col">
                                <div className="px-2 py-1 text-[9px] font-bold text-foreground-400 uppercase tracking-wider">
                                    插入节点
                                </div>
                                {nodeOptions.map((node) => (
                                    <Button
                                        key={node.type}
                                        size="sm"
                                        variant="light"
                                        className="justify-start h-9 px-2 group"
                                        onPress={() => handleInsertNode(node.type)}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${node.color} mr-2 group-hover:scale-110 transition-transform`}>
                                            <node.icon size={12} className="text-white" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[11px] font-medium">{node.label}</span>
                                            <span className="text-[9px] text-foreground-400">{node.desc}</span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export default memo(CustomEdge);
