"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    DropdownSection,
} from "@heroui/react";
import {
    Copy,
    Trash2,
    Eye,
    Play,
    Plus,
    Box,
    MessageSquare,
    GitBranch,
    Code,
    Globe,
    Variable,
} from "lucide-react";

interface ContextMenuPosition {
    x: number;
    y: number;
}

interface NodeContextMenuProps {
    isOpen: boolean;
    position: ContextMenuPosition;
    nodeId: string;
    nodeType: string;
    onClose: () => void;
    onCopy: (nodeId: string) => void;
    onDelete: (nodeId: string) => void;
    onViewOutput: (nodeId: string) => void;
    onRunFromHere: (nodeId: string) => void;
}

export function NodeContextMenu({
    isOpen,
    position,
    nodeId,
    nodeType,
    onClose,
    onCopy,
    onDelete,
    onViewOutput,
    onRunFromHere,
}: NodeContextMenuProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed z-50"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-content1 border border-divider rounded-xl shadow-xl py-1 min-w-[160px]">
                <button
                    className="w-full px-3 py-2 text-left text-[11px] hover:bg-content2 flex items-center gap-2 transition-colors"
                    onClick={() => {
                        onCopy(nodeId);
                        onClose();
                    }}
                >
                    <Copy size={12} />
                    复制节点
                    <span className="ml-auto text-foreground-400 text-[9px]">⌘C</span>
                </button>
                <button
                    className="w-full px-3 py-2 text-left text-[11px] hover:bg-content2 flex items-center gap-2 transition-colors"
                    onClick={() => {
                        onViewOutput(nodeId);
                        onClose();
                    }}
                >
                    <Eye size={12} />
                    查看输出
                </button>
                {nodeType !== "start" && (
                    <button
                        className="w-full px-3 py-2 text-left text-[11px] hover:bg-content2 flex items-center gap-2 transition-colors"
                        onClick={() => {
                            onRunFromHere(nodeId);
                            onClose();
                        }}
                    >
                        <Play size={12} />
                        从此处运行
                    </button>
                )}
                <div className="h-px bg-divider my-1" />
                <button
                    className="w-full px-3 py-2 text-left text-[11px] hover:bg-danger/10 text-danger flex items-center gap-2 transition-colors"
                    onClick={() => {
                        onDelete(nodeId);
                        onClose();
                    }}
                >
                    <Trash2 size={12} />
                    删除节点
                    <span className="ml-auto text-danger/50 text-[9px]">⌫</span>
                </button>
            </div>
        </div>
    );
}

interface CanvasContextMenuProps {
    isOpen: boolean;
    position: ContextMenuPosition;
    onClose: () => void;
    onAddNode: (type: string, position: { x: number; y: number }) => void;
}

const nodeTypes = [
    { type: "start", label: "开始节点", icon: Play, color: "text-success" },
    { type: "llm", label: "LLM 节点", icon: Box, color: "text-primary" },
    { type: "answer", label: "回答节点", icon: MessageSquare, color: "text-warning" },
    { type: "condition", label: "条件分支", icon: GitBranch, color: "text-purple-500" },
    { type: "code", label: "代码执行", icon: Code, color: "text-emerald-500" },
    { type: "http", label: "HTTP 请求", icon: Globe, color: "text-blue-500" },
    { type: "variable", label: "变量赋值", icon: Variable, color: "text-amber-500" },
];

export function CanvasContextMenu({
    isOpen,
    position,
    onClose,
    onAddNode,
}: CanvasContextMenuProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed z-50"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-content1 border border-divider rounded-xl shadow-xl py-1 min-w-[180px]">
                <div className="px-3 py-1.5 text-[9px] font-bold text-foreground-400 uppercase tracking-wider">
                    添加节点
                </div>
                {nodeTypes.map((node) => (
                    <button
                        key={node.type}
                        className="w-full px-3 py-2 text-left text-[11px] hover:bg-content2 flex items-center gap-2 transition-colors"
                        onClick={() => {
                            onAddNode(node.type, position);
                            onClose();
                        }}
                    >
                        <node.icon size={12} className={node.color} />
                        {node.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

interface UseContextMenuReturn {
    nodeMenu: {
        isOpen: boolean;
        position: ContextMenuPosition;
        nodeId: string;
        nodeType: string;
    };
    canvasMenu: {
        isOpen: boolean;
        position: ContextMenuPosition;
    };
    openNodeMenu: (nodeId: string, nodeType: string, x: number, y: number) => void;
    openCanvasMenu: (x: number, y: number) => void;
    closeMenus: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
    const [nodeMenu, setNodeMenu] = useState({
        isOpen: false,
        position: { x: 0, y: 0 },
        nodeId: "",
        nodeType: "",
    });

    const [canvasMenu, setCanvasMenu] = useState({
        isOpen: false,
        position: { x: 0, y: 0 },
    });

    const openNodeMenu = useCallback((nodeId: string, nodeType: string, x: number, y: number) => {
        setCanvasMenu({ isOpen: false, position: { x: 0, y: 0 } });
        setNodeMenu({ isOpen: true, position: { x, y }, nodeId, nodeType });
    }, []);

    const openCanvasMenu = useCallback((x: number, y: number) => {
        setNodeMenu({ isOpen: false, position: { x: 0, y: 0 }, nodeId: "", nodeType: "" });
        setCanvasMenu({ isOpen: true, position: { x, y } });
    }, []);

    const closeMenus = useCallback(() => {
        setNodeMenu({ isOpen: false, position: { x: 0, y: 0 }, nodeId: "", nodeType: "" });
        setCanvasMenu({ isOpen: false, position: { x: 0, y: 0 } });
    }, []);

    // 点击其他地方关闭菜单
    useEffect(() => {
        const handleClick = () => closeMenus();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMenus();
        };

        window.addEventListener("click", handleClick);
        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("click", handleClick);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [closeMenus]);

    return {
        nodeMenu,
        canvasMenu,
        openNodeMenu,
        openCanvasMenu,
        closeMenus,
    };
}
