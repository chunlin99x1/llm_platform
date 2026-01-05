"use client";

import { useMemo, useState } from "react";
import {
    Button,
    Popover,
    PopoverTrigger,
    PopoverContent,
    ScrollShadow,
    Input,
} from "@heroui/react";
import { Variable, Search, ChevronRight } from "lucide-react";
import type { Node } from "reactflow";

interface VariableSelectorProps {
    nodes: Node[];
    currentNodeId: string;
    onSelect: (variable: string) => void;
}

interface NodeVariable {
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    variables: { name: string; description: string }[];
}

// 根据节点类型定义其输出变量
function getNodeOutputVariables(node: Node): { name: string; description: string }[] {
    switch (node.type) {
        case "start":
            return [
                { name: "input", description: "用户输入" },
            ];
        case "llm":
            return [
                { name: "output", description: "LLM 回复内容" },
                { name: "tokens", description: "消耗的 Token 数" },
            ];
        case "code":
            return [
                { name: "result", description: "代码返回值" },
            ];
        case "http":
            return [
                { name: "body", description: "响应体" },
                { name: "status", description: "状态码" },
                { name: "headers", description: "响应头" },
            ];
        case "variable":
            const varName = node.data?.variableName || "value";
            return [
                { name: varName, description: "变量值" },
            ];
        case "condition":
            return [
                { name: "result", description: "条件结果 (true/false)" },
            ];
        default:
            return [
                { name: "output", description: "输出" },
            ];
    }
}

export function VariableSelector({ nodes, currentNodeId, onSelect }: VariableSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // 获取当前节点之前的所有节点（按拓扑顺序）
    // 简化处理：只排除当前节点
    const availableNodes = useMemo(() => {
        return nodes
            .filter((n) => n.id !== currentNodeId)
            .map((node) => ({
                nodeId: node.id,
                nodeLabel: node.data?.label || node.type || "Unknown",
                nodeType: node.type || "unknown",
                variables: getNodeOutputVariables(node),
            }))
            .filter((n) => n.variables.length > 0);
    }, [nodes, currentNodeId]);

    const filteredNodes = useMemo(() => {
        if (!searchQuery) return availableNodes;
        const query = searchQuery.toLowerCase();
        return availableNodes.filter(
            (n) =>
                n.nodeLabel.toLowerCase().includes(query) ||
                n.nodeId.toLowerCase().includes(query) ||
                n.variables.some((v) => v.name.toLowerCase().includes(query))
        );
    }, [availableNodes, searchQuery]);

    const handleSelectVariable = (nodeId: string, varName: string) => {
        onSelect(`{{${nodeId}.${varName}}}`);
        setIsOpen(false);
        setSelectedNode(null);
    };

    return (
        <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-start">
            <PopoverTrigger>
                <Button
                    size="sm"
                    variant="flat"
                    startContent={<Variable size={12} />}
                    className="h-7 text-[10px] font-medium"
                >
                    插入变量
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
                <div className="flex flex-col">
                    {/* 搜索框 */}
                    <div className="p-2 border-b border-divider">
                        <Input
                            size="sm"
                            placeholder="搜索节点或变量..."
                            startContent={<Search size={12} className="text-foreground-400" />}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            classNames={{
                                input: "text-[11px]",
                                inputWrapper: "h-8",
                            }}
                        />
                    </div>

                    {/* 节点列表 */}
                    <ScrollShadow className="max-h-[300px]">
                        {filteredNodes.length === 0 ? (
                            <div className="p-4 text-center text-[11px] text-foreground-400">
                                暂无可用变量
                            </div>
                        ) : selectedNode ? (
                            // 显示选中节点的变量
                            <div className="p-1">
                                <Button
                                    size="sm"
                                    variant="light"
                                    className="w-full justify-start h-7 text-[10px] mb-1"
                                    onPress={() => setSelectedNode(null)}
                                >
                                    ← 返回节点列表
                                </Button>
                                {filteredNodes
                                    .find((n) => n.nodeId === selectedNode)
                                    ?.variables.map((v) => (
                                        <Button
                                            key={v.name}
                                            size="sm"
                                            variant="light"
                                            className="w-full justify-start h-8 px-3"
                                            onPress={() => handleSelectVariable(selectedNode, v.name)}
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {v.name}
                                                </code>
                                                <span className="text-[10px] text-foreground-500 truncate">
                                                    {v.description}
                                                </span>
                                            </div>
                                        </Button>
                                    ))}
                            </div>
                        ) : (
                            // 显示节点列表
                            <div className="p-1">
                                {filteredNodes.map((node) => (
                                    <Button
                                        key={node.nodeId}
                                        size="sm"
                                        variant="light"
                                        className="w-full justify-between h-9 px-3"
                                        onPress={() => setSelectedNode(node.nodeId)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${node.nodeType === "start"
                                                        ? "bg-success"
                                                        : node.nodeType === "llm"
                                                            ? "bg-primary"
                                                            : node.nodeType === "code"
                                                                ? "bg-emerald-500"
                                                                : node.nodeType === "http"
                                                                    ? "bg-blue-500"
                                                                    : "bg-foreground-300"
                                                    }`}
                                            />
                                            <span className="text-[11px] font-medium truncate max-w-[140px]">
                                                {node.nodeLabel}
                                            </span>
                                            <span className="text-[9px] text-foreground-400">
                                                ({node.variables.length} 变量)
                                            </span>
                                        </div>
                                        <ChevronRight size={12} className="text-foreground-300" />
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollShadow>
                </div>
            </PopoverContent>
        </Popover>
    );
}
