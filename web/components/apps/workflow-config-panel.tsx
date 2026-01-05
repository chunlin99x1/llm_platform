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
    GitBranch,
    Code,
    Globe,
    Variable,
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
    // 获取节点类型对应的图标和颜色
    const getNodeMeta = (type: string | undefined) => {
        const meta: Record<string, { icon: any; color: string; label: string }> = {
            start: { icon: Play, color: "bg-blue-500", label: "开始" },
            llm: { icon: Box, color: "bg-indigo-500", label: "LLM" },
            answer: { icon: Box, color: "bg-orange-500", label: "回复" },
            condition: { icon: GitBranch, color: "bg-cyan-500", label: "条件分支" },
            code: { icon: Code, color: "bg-blue-600", label: "代码执行" },
            http: { icon: Globe, color: "bg-violet-500", label: "HTTP 请求" },
            variable: { icon: Variable, color: "bg-blue-500", label: "变量赋值" },
        };
        return meta[type || ""] || { icon: Box, color: "bg-gray-500", label: type || "Unknown" };
    };

    const nodeMeta = getNodeMeta(selectedNode?.type);
    const NodeIcon = nodeMeta.icon;

    return (
        <div className="w-[320px] border-l border-divider bg-white flex flex-col overflow-hidden shadow-xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
                {selectedNode ? (
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nodeMeta.color} shadow-sm`}>
                            <NodeIcon size={16} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-foreground-900 leading-tight">
                                {selectedNode.data?.label || nodeMeta.label}
                            </span>
                            <span className="text-[10px] text-foreground-400 uppercase tracking-wider">
                                {selectedNode.type}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-foreground-400" />
                        <span className="text-[13px] font-medium text-foreground-500">节点配置</span>
                    </div>
                )}
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

                        {/* 条件分支节点配置 */}
                        {selectedNode.type === "condition" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <GitBranch size={10} />
                                    条件设置
                                </div>
                                <Textarea
                                    label="条件表达式"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={3}
                                    placeholder="例如: {{input.length}} > 10"
                                    value={selectedNode.data?.condition || ""}
                                    onValueChange={(v) => updateSelectedNode({ condition: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
                                />
                                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        提示：条件为真时走 <kbd className="bg-purple-100 text-purple-700 px-1 rounded">True</kbd> 分支，
                                        否则走 <kbd className="bg-gray-100 text-gray-700 px-1 rounded">False</kbd> 分支。
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 代码执行节点配置 */}
                        {selectedNode.type === "code" && (
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Code size={10} />
                                        代码
                                    </div>
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button size="sm" variant="flat" className="h-6 text-[10px]">
                                                {selectedNode.data?.language || "Python"}
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label="语言选择"
                                            onAction={(key) => updateSelectedNode({ language: key as string })}
                                        >
                                            <DropdownItem key="Python">Python</DropdownItem>
                                            <DropdownItem key="JavaScript">JavaScript</DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                                <Textarea
                                    variant="bordered"
                                    minRows={12}
                                    placeholder="# 在此输入代码..."
                                    value={selectedNode.data?.code || ""}
                                    onValueChange={(v) => updateSelectedNode({ code: v })}
                                    classNames={{ input: "font-mono text-[11px] leading-tight" }}
                                />
                                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        使用 <kbd className="bg-emerald-100 text-emerald-700 px-1 rounded">return</kbd> 返回结果。
                                        可通过 <kbd className="bg-emerald-100 text-emerald-700 px-1 rounded">{"{{input}}"}</kbd> 访问输入。
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* HTTP 请求节点配置 */}
                        {selectedNode.type === "http" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Globe size={10} />
                                    HTTP 请求
                                </div>
                                <div className="flex gap-2">
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button size="sm" variant="flat" color="primary" className="h-9 min-w-[70px] text-[10px] font-bold">
                                                {selectedNode.data?.method || "GET"}
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label="方法选择"
                                            onAction={(key) => updateSelectedNode({ method: key as string })}
                                        >
                                            <DropdownItem key="GET">GET</DropdownItem>
                                            <DropdownItem key="POST">POST</DropdownItem>
                                            <DropdownItem key="PUT">PUT</DropdownItem>
                                            <DropdownItem key="DELETE">DELETE</DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                    <Input
                                        variant="bordered"
                                        size="sm"
                                        placeholder="https://api.example.com/..."
                                        value={selectedNode.data?.url || ""}
                                        onValueChange={(v) => updateSelectedNode({ url: v })}
                                        classNames={{ input: "text-[11px]", inputWrapper: "h-9" }}
                                    />
                                </div>
                                <Textarea
                                    label="请求体 (JSON)"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={4}
                                    placeholder='{"key": "value"}'
                                    value={selectedNode.data?.body || ""}
                                    onValueChange={(v) => updateSelectedNode({ body: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
                                />
                            </section>
                        )}

                        {/* 变量赋值节点配置 */}
                        {selectedNode.type === "variable" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Variable size={10} />
                                    变量设置
                                </div>
                                <Input
                                    label="变量名"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="my_variable"
                                    value={selectedNode.data?.variableName || ""}
                                    onValueChange={(v) => updateSelectedNode({ variableName: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                                <Textarea
                                    label="值"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={3}
                                    placeholder="静态值或 {{node.output}}"
                                    value={selectedNode.data?.value || ""}
                                    onValueChange={(v) => updateSelectedNode({ value: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
                                />
                                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        可引用其他节点输出：<kbd className="bg-amber-100 text-amber-700 px-1 rounded">{"{{nodeId.output}}"}</kbd>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 迭代节点配置 */}
                        {selectedNode.type === "iteration" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <GitBranch size={10} />
                                    迭代设置
                                </div>
                                <Input
                                    label="输入列表"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="{{items}} 或 {{node.output}}"
                                    value={selectedNode.data?.inputList || ""}
                                    onValueChange={(v) => updateSelectedNode({ inputList: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                                <Input
                                    label="迭代变量名"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="item"
                                    value={selectedNode.data?.iteratorVar || "item"}
                                    onValueChange={(v) => updateSelectedNode({ iteratorVar: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                                <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        在迭代内部使用 <kbd className="bg-cyan-100 text-cyan-700 px-1 rounded">{"{{item}}"}</kbd> 访问当前元素。
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 模板转换节点配置 */}
                        {selectedNode.type === "template" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Code size={10} />
                                    模板设置
                                </div>
                                <Textarea
                                    label="Jinja2 模板"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={6}
                                    placeholder="{% for item in items %}&#10;{{ item.name }}&#10;{% endfor %}"
                                    value={selectedNode.data?.template || ""}
                                    onValueChange={(v) => updateSelectedNode({ template: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
                                />
                                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        支持 Jinja2 语法，如循环、条件、过滤器等。
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 知识检索节点配置 */}
                        {selectedNode.type === "knowledge" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Box size={10} />
                                    知识库设置
                                </div>
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button variant="bordered" size="sm" className="justify-between h-9 text-[11px]">
                                            {selectedNode.data?.knowledgeBase || "选择知识库..."}
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="选择知识库"
                                        onAction={(key) => updateSelectedNode({ knowledgeBase: key as string })}
                                    >
                                        <DropdownItem key="kb-1">产品文档</DropdownItem>
                                        <DropdownItem key="kb-2">技术手册</DropdownItem>
                                        <DropdownItem key="kb-3">FAQ 知识库</DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                                <Input
                                    label="检索数量"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    type="number"
                                    placeholder="5"
                                    value={selectedNode.data?.topK || "5"}
                                    onValueChange={(v) => updateSelectedNode({ topK: v })}
                                    classNames={{ input: "text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                                <Input
                                    label="相似度阈值"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    placeholder="0.7"
                                    value={selectedNode.data?.threshold || "0.7"}
                                    onValueChange={(v) => updateSelectedNode({ threshold: v })}
                                    classNames={{ input: "text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                            </section>
                        )}

                        {/* 问题分类节点配置 */}
                        {selectedNode.type === "classifier" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Box size={10} />
                                    分类设置
                                </div>
                                <Textarea
                                    label="分类说明"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={3}
                                    placeholder="描述如何对问题进行分类..."
                                    value={selectedNode.data?.classifierDesc || ""}
                                    onValueChange={(v) => updateSelectedNode({ classifierDesc: v })}
                                    classNames={{ input: "text-[11px]", label: "text-[10px]" }}
                                />
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1 mt-2">
                                    分类列表
                                </div>
                                <div className="space-y-2">
                                    {(selectedNode.data?.categories || ["技术问题", "产品咨询", "其他"]).map((cat: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${["bg-green-500", "bg-blue-500", "bg-orange-500", "bg-purple-500"][idx % 4]}`} />
                                            <Input
                                                variant="bordered"
                                                size="sm"
                                                value={cat}
                                                classNames={{ input: "text-[11px]", inputWrapper: "h-8 flex-1" }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button size="sm" variant="flat" color="primary" className="text-[10px] h-7">
                                    + 添加分类
                                </Button>
                            </section>
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
