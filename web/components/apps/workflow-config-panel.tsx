"use client";

import {
    Chip,
    Input,
    ScrollShadow,
    Textarea,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
} from "@heroui/react";
import {
    Settings,
    Terminal,
    MoreVertical,
    Play,
    Box,
} from "lucide-react";
import type { Node } from "reactflow";

interface WorkflowConfigPanelProps {
    selectedNode: Node | null;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
    selectedId: string;
}

export function WorkflowConfigPanel({
    selectedNode,
    updateSelectedNode,
    nodes,
    setNodes,
    selectedId,
}: WorkflowConfigPanelProps) {
    return (
        <div className="w-[300px] border-l border-divider bg-background flex flex-col overflow-hidden shadow-xl z-10 text-xs">
            <div className="flex items-center justify-between px-4 py-3 border-b border-divider bg-content1/50">
                <div className="flex flex-col">
                    <div className="text-[9px] font-bold text-foreground uppercase tracking-widest leading-none mb-1">
                        Config
                    </div>
                    <div className="flex items-center gap-1.5">
                        {selectedNode ? (
                            <Chip size="sm" variant="dot" color="primary" classNames={{ content: "text-[10px] font-bold" }}>
                                {selectedNode.type?.toUpperCase()}
                            </Chip>
                        ) : (
                            <span className="text-foreground italic text-[11px]">No Selection</span>
                        )}
                    </div>
                </div>
                {selectedNode && (
                    <Dropdown>
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm" className="h-7 w-7">
                                <MoreVertical size={14} />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Node Actions" className="text-xs">
                            <DropdownItem key="copy">复制节点</DropdownItem>
                            <DropdownItem
                                key="delete"
                                color="danger"
                                onPress={() => setNodes(nodes.filter((n) => n.id !== selectedId))}
                            >
                                删除节点
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                )}
            </div>

            <ScrollShadow className="flex-1 p-4">
                {selectedNode ? (
                    <div className="flex flex-col gap-5">
                        <section>
                            <div className="text-[10px] font-bold text-foreground mb-2 px-1 flex items-center gap-1.5 uppercase tracking-wide">
                                <Settings size={10} />
                                基本设置
                            </div>
                            <Input
                                label="节点名称"
                                labelPlacement="outside"
                                placeholder="例如: 基础回答"
                                variant="bordered"
                                size="sm"
                                value={selectedNode.data?.label || ""}
                                onValueChange={(v) => updateSelectedNode({ label: v })}
                                classNames={{ inputWrapper: "h-9", label: "text-[10px]", input: "text-[11px]" }}
                            />
                        </section>

                        {selectedNode.type === "llm" && (
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Terminal size={10} />
                                        PROMPT
                                    </div>
                                    <Chip size="sm" variant="flat" color="primary" className="h-4 text-[8px] font-black">
                                        GPT-4O
                                    </Chip>
                                </div>

                                <div className="relative">
                                    <Textarea
                                        variant="bordered"
                                        minRows={10}
                                        placeholder="在此输入指令..."
                                        value={selectedNode.data?.prompt || ""}
                                        onValueChange={(v) => updateSelectedNode({ prompt: v })}
                                        classNames={{ input: "font-mono text-[11px] leading-tight", innerWrapper: "p-1" }}
                                    />
                                </div>

                                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="flex gap-2">
                                        <div className="text-[10px] text-foreground-600 leading-tight">
                                            提示：使用{" "}
                                            <kbd className="bg-primary/10 text-primary font-bold px-1 rounded">{"{{input}}"}</kbd> 引用输入。
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {selectedNode.type === "start" && (
                            <div className="py-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                                    <Play size={20} />
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold">起点节点</div>
                                    <p className="text-[10px] text-foreground mt-1 max-w-[160px] leading-snug">
                                        初始化输入与环境。
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-foreground py-10 px-6 text-center">
                        <Box size={40} className="opacity-10" />
                        <div>
                            <div className="text-[11px] font-bold text-foreground-500 mb-1 leading-none uppercase tracking-wide">
                                未选中节点
                            </div>
                            <p className="text-[10px] leading-relaxed">点击画布节点进行编辑。</p>
                        </div>
                    </div>
                )}
            </ScrollShadow>
        </div>
    );
}
