"use client";

import { useState, useEffect } from "react";
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
    ArrowRight,
    Plus,
    Repeat,
    FileCode,
    BookOpen,
    Trash2,
    Edit3,
} from "lucide-react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Checkbox,
    Select,
    SelectItem
} from "@heroui/react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "./workflow-variable-selector";

interface WorkflowConfigPanelProps {
    selectedNode: Node | null;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    edges: Edge[];
    setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
    selectedId: string;
}

export function WorkflowConfigPanel({
    selectedNode,
    updateSelectedNode,
    nodes,
    edges,
    setNodes,
    setEdges,
    selectedId,
}: WorkflowConfigPanelProps) {
    // 模型列表状态
    const [models, setModels] = useState<{ id: string; name: string; provider: string; config?: any }[]>([]);
    // 知识库列表状态
    const [knowledgeBases, setKnowledgeBases] = useState<{ id: number; name: string }[]>([]);
    // 变量类型状态
    const [variableTypes, setVariableTypes] = useState<{ type: string; label: string; color: string }[]>([]);

    // 模型参数模态框状态
    const { isOpen: isModelParamsModalOpen, onOpenChange: onModelParamsModalOpenChange } = useDisclosure();

    // 变量管理模态框状态
    const { isOpen: isVarModalOpen, onOpenChange: onVarModalOpenChange } = useDisclosure();
    const [editingVariable, setEditingVariable] = useState<any>(null);
    const [editingVariableIndex, setEditingVariableIndex] = useState<number>(-1);



    // 从后端获取模型列表和知识库列表
    useEffect(() => {
        // 获取模型列表
        fetch('/api/settings/model-providers')
            .then(res => res.json())
            .then((providers: any[]) => {
                const loadedModels: { id: string; name: string; provider: string; config?: any }[] = [];
                providers.forEach((p: any) => {
                    if (p.models) {
                        p.models.forEach((m: any) => {
                            if (m.model_type === "llm") {
                                loadedModels.push({
                                    id: m.name,
                                    name: m.name,
                                    provider: p.name,
                                    config: m.config || {}
                                });
                            }
                        });
                    }
                });
                if (loadedModels.length > 0) {
                    setModels(loadedModels);
                } else {
                    // 回退到默认模型
                    setModels([
                        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
                        { id: 'qwen-max', name: 'Qwen Max', provider: 'dashscope' },
                    ]);
                }
            })
            .catch(() => {
                // 回退到默认模型
                setModels([
                    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
                    { id: 'qwen-max', name: 'Qwen Max', provider: 'dashscope' },
                ]);
            });

        // 获取知识库列表
        fetch('/api/knowledge/datasets')
            .then(res => res.json())
            .then((data: any[]) => {
                setKnowledgeBases(data.map((kb: any) => ({ id: kb.id, name: kb.name })));
            })
            .catch(() => {
                setKnowledgeBases([]);
            });

        // 获取变量类型
        setVariableTypes([
            { type: 'string', label: '文本 (String)', color: '#3b82f6' },
            { type: 'number', label: '数字 (Number)', color: '#22c55e' },
            { type: 'object', label: '对象 (Object)', color: '#f97316' },
            { type: 'array[string]', label: '文本列表', color: '#06b6d4' },
            { type: 'file', label: '单文件 (File)', color: '#ec4899' },
            { type: 'array[file]', label: '文件列表', color: '#ec4899' },
        ]);
    }, []);

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
            knowledge: { icon: BookOpen, color: "bg-emerald-500", label: "知识库检索" },
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

                        {/* 下一节点选择 */}
                        {selectedNode.type !== "end" && selectedNode.type !== "answer" && (
                            <section>
                                <div className="text-[10px] font-bold text-foreground mb-2 px-1 flex items-center gap-1.5 uppercase tracking-wide">
                                    <ArrowRight size={10} />
                                    下一节点
                                </div>
                                <div className="space-y-2">
                                    {/* 显示当前连接的下一节点 */}
                                    {(() => {
                                        const connectedEdges = edges.filter(e => e.source === selectedNode.id);
                                        const targetNodes = connectedEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean);

                                        if (targetNodes.length === 0) {
                                            return (
                                                <div className="p-3 bg-content2/50 rounded-xl border border-dashed border-divider text-center">
                                                    <span className="text-[10px] text-foreground-400">暂无连接节点</span>
                                                </div>
                                            );
                                        }

                                        return targetNodes.map((targetNode) => {
                                            const meta = getNodeMeta(targetNode?.type);
                                            const IconComponent = meta.icon;
                                            return (
                                                <div
                                                    key={targetNode?.id}
                                                    className="flex items-center gap-2 p-2 bg-content2/50 rounded-lg border border-divider"
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${meta.color}`}>
                                                        <IconComponent size={10} className="text-white" />
                                                    </div>
                                                    <span className="text-[11px] flex-1">{targetNode?.data?.label || meta.label}</span>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-5 w-5 min-w-5 text-danger"
                                                        onPress={() => {
                                                            // 删除连接
                                                            setEdges((eds) => eds.filter(e => !(e.source === selectedNode.id && e.target === targetNode?.id)));
                                                        }}
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            );
                                        });
                                    })()}

                                    {/* 添加新的下一节点 */}
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                className="w-full h-8 text-[10px]"
                                                startContent={<Plus size={12} />}
                                            >
                                                添加下一节点
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label="选择下一节点"
                                            onAction={(key) => {
                                                const targetId = key as string;
                                                // 检查是否已存在连接
                                                const exists = edges.some(e => e.source === selectedNode.id && e.target === targetId);
                                                if (!exists && targetId !== selectedNode.id) {
                                                    setEdges((eds) => [
                                                        ...eds,
                                                        {
                                                            id: `${selectedNode.id}-${targetId}`,
                                                            source: selectedNode.id,
                                                            target: targetId,
                                                            type: 'custom',
                                                        }
                                                    ]);
                                                }
                                            }}
                                        >
                                            {nodes
                                                .filter(n => n.id !== selectedNode.id && n.type !== 'start')
                                                .map(n => {
                                                    const meta = getNodeMeta(n.type);
                                                    return (
                                                        <DropdownItem key={n.id} textValue={n.data?.label || meta.label}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-4 h-4 rounded flex items-center justify-center ${meta.color}`}>
                                                                    <meta.icon size={8} className="text-white" />
                                                                </div>
                                                                <span className="text-[11px]">{n.data?.label || meta.label}</span>
                                                            </div>
                                                        </DropdownItem>
                                                    );
                                                })
                                            }
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                            </section>
                        )}

                        {selectedNode.type === "llm" && (
                            <section className="flex flex-col gap-4">
                                {/* 模型选择 */}
                                <div className="flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                        <Box size={10} />
                                        模型
                                    </div>
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button
                                                variant="bordered"
                                                size="sm"
                                                className="justify-between h-9 text-[11px] w-full"
                                            >
                                                {selectedNode.data?.model || "gpt-4o"}
                                                <span className="text-foreground-400">▼</span>
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label="选择模型"
                                            onAction={(key) => updateSelectedNode({ model: key as string })}
                                        >
                                            {models.map((m) => (
                                                <DropdownItem key={m.id}>
                                                    {m.name}
                                                    <span className="text-[9px] text-foreground-400 ml-1">({m.provider})</span>
                                                </DropdownItem>
                                            ))}
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>

                                {/* 参数设置 */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                        <Settings size={10} />
                                        参数
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        className="w-full h-8 text-[11px] justify-between px-3 bg-content2/50 hover:bg-content2"
                                        onPress={onModelParamsModalOpenChange}
                                        endContent={<Settings size={12} className="text-foreground-500" />}
                                    >
                                        <span className="text-foreground-600">
                                            Temp: {selectedNode.data?.temperature ?? 0.7} / Max: {selectedNode.data?.maxTokens ?? 2048}
                                        </span>
                                    </Button>

                                    {/* 模型参数模态框 */}
                                    <ModelParamsModal
                                        isOpen={isModelParamsModalOpen}
                                        onOpenChange={onModelParamsModalOpenChange}
                                        data={selectedNode.data}
                                        onChange={updateSelectedNode}
                                        modelConfig={models.find(m => m.id === selectedNode.data?.model)?.config}
                                    />
                                </div>

                                {/* Prompt */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                                            <Terminal size={10} />
                                            PROMPT
                                        </div>
                                        <VariableSelector
                                            currentNodeId={selectedNode.id}
                                            nodes={nodes}
                                            edges={edges}
                                            onSelect={(varRef) => {
                                                const current = selectedNode.data?.prompt || "";
                                                updateSelectedNode({ prompt: current + varRef });
                                            }}
                                        />
                                    </div>

                                    <Textarea
                                        variant="bordered"
                                        minRows={8}
                                        placeholder="在此输入指令..."
                                        value={selectedNode.data?.prompt || ""}
                                        onValueChange={(v) => updateSelectedNode({ prompt: v })}
                                        classNames={{ input: "font-mono text-[11px] leading-tight", innerWrapper: "p-1" }}
                                    />
                                </div>

                                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="text-[10px] text-foreground-600 leading-tight">
                                        点击 <Variable size={10} className="inline text-primary" /> 选择上游变量，格式：{" "}
                                        <kbd className="bg-primary/10 text-primary font-bold px-1 rounded">{"{{node.output}}"}</kbd>
                                    </div>
                                </div>
                            </section>
                        )}

                        {selectedNode.type === "start" && (
                            <section className="flex flex-col gap-3">
                                {/* 变量管理模态框 */}
                                <VariableModal
                                    isOpen={isVarModalOpen}
                                    onOpenChange={onVarModalOpenChange}
                                    initialData={editingVariable}
                                    onSave={(newVar) => {
                                        const vars = [...(selectedNode.data?.variables || [])];
                                        if (editingVariableIndex >= 0) {
                                            vars[editingVariableIndex] = newVar;
                                        } else {
                                            vars.push(newVar);
                                        }
                                        updateSelectedNode({ variables: vars });
                                        onVarModalOpenChange();
                                    }}
                                />

                                {/* 输入字段标题和添加按钮 */}
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-[11px] font-semibold text-foreground">输入字段</div>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        className="h-6 px-2 text-[10px] text-primary"
                                        onPress={() => {
                                            setEditingVariable(null);
                                            setEditingVariableIndex(-1);
                                            onVarModalOpenChange();
                                        }}
                                    >
                                        <Plus size={12} className="mr-1" />
                                        添加
                                    </Button>
                                </div>

                                {/* 变量列表表头 */}
                                <div className="flex items-center px-3 py-1 bg-content2/50 rounded-t-lg border-b border-divider text-[10px] text-foreground-400 font-medium">
                                    <span className="flex-1">字段名</span>
                                    <span className="w-16">类型</span>
                                    <span className="w-8 text-center">必填</span>
                                    <span className="w-10 text-center">操作</span>
                                </div>

                                {/* 用户变量列表 */}
                                <div className="flex flex-col border-x border-b border-divider rounded-b-lg divide-y divide-divider bg-content1/30">
                                    {(selectedNode.data?.variables || []).length === 0 && (
                                        <div className="py-4 text-center text-[10px] text-foreground-400">
                                            暂无输入变量，点击右上角添加
                                        </div>
                                    )}
                                    {(selectedNode.data?.variables || []).map((v: any, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center px-3 h-8 hover:bg-content2/50 transition-colors group"
                                        >
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <Variable size={10} className="text-primary/70 shrink-0" />
                                                <span className="text-[11px] font-mono text-foreground-700 truncate">{v.name}</span>
                                            </div>
                                            <div className="w-16 text-[10px] text-foreground-500 truncate">{v.type}</div>
                                            <div className="w-8 flex justify-center">
                                                {v.required && <div className="w-1.5 h-1.5 rounded-full bg-danger" />}
                                            </div>
                                            <div className="w-10 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="h-5 w-5 min-w-5 text-foreground-400 hover:text-primary"
                                                    onPress={() => {
                                                        setEditingVariable(v);
                                                        setEditingVariableIndex(index);
                                                        onVarModalOpenChange();
                                                    }}
                                                >
                                                    <Edit3 size={10} />
                                                </Button>
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="h-5 w-5 min-w-5 text-foreground-400 hover:text-danger"
                                                    onPress={() => {
                                                        const vars = [...(selectedNode.data?.variables || [])];
                                                        vars.splice(index, 1);
                                                        updateSelectedNode({ variables: vars });
                                                    }}
                                                >
                                                    <Trash2 size={10} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 分隔线 */}
                                <div className="h-px bg-divider my-1" />

                                {/* 系统变量 - 保持现有样式但更紧凑 */}
                                <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-foreground-400 mb-1 px-1">系统变量</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { name: "sys.query", type: "String" },
                                            { name: "sys.files", type: "Array[File]" },
                                            { name: "sys.user_id", type: "String" },
                                            { name: "sys.conversation_id", type: "String" },
                                        ].map((v) => (
                                            <div key={v.name} className="flex h-7 items-center justify-between rounded border border-divider bg-content2/30 px-2">
                                                <span className="text-[10px] font-mono text-foreground-500 truncate">{v.name}</span>
                                                <span className="text-[9px] text-foreground-400">{v.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 条件分支节点配置 */}
                        {selectedNode.type === "condition" && (
                            <section className="flex flex-col gap-4">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <GitBranch size={10} />
                                    条件设置
                                </div>

                                {/* 可视化条件构建器 */}
                                <div className="space-y-3">
                                    {/* 条件 1 */}
                                    <div className="p-3 bg-content2/50 rounded-xl border border-divider">
                                        <div className="text-[9px] font-bold text-foreground-400 mb-2">IF</div>
                                        <div className="flex items-center gap-2">
                                            {/* 变量选择 */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1 h-8 px-2 bg-content1 border border-divider rounded-lg">
                                                    <VariableSelector
                                                        currentNodeId={selectedNode.id}
                                                        nodes={nodes}
                                                        edges={edges}
                                                        onSelect={(varRef) => updateSelectedNode({ conditionVar: varRef })}
                                                    />
                                                    <span className="text-[10px] font-mono text-foreground-600 truncate flex-1">
                                                        {selectedNode.data?.conditionVar || "选择变量"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 运算符 */}
                                            <Dropdown>
                                                <DropdownTrigger>
                                                    <Button size="sm" variant="bordered" className="h-8 min-w-[60px] text-[10px] font-mono">
                                                        {selectedNode.data?.conditionOp || "=="}
                                                    </Button>
                                                </DropdownTrigger>
                                                <DropdownMenu
                                                    aria-label="选择运算符"
                                                    onAction={(key) => updateSelectedNode({ conditionOp: key as string })}
                                                >
                                                    <DropdownItem key="==">等于 ==</DropdownItem>
                                                    <DropdownItem key="!=">不等于 !=</DropdownItem>
                                                    <DropdownItem key=">">大于 &gt;</DropdownItem>
                                                    <DropdownItem key="<">小于 &lt;</DropdownItem>
                                                    <DropdownItem key=">=">大于等于 &gt;=</DropdownItem>
                                                    <DropdownItem key="<=">小于等于 &lt;=</DropdownItem>
                                                    <DropdownItem key="contains">包含</DropdownItem>
                                                    <DropdownItem key="not contains">不包含</DropdownItem>
                                                    <DropdownItem key="is empty">为空</DropdownItem>
                                                    <DropdownItem key="is not empty">不为空</DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>

                                            {/* 值 */}
                                            <Input
                                                size="sm"
                                                variant="bordered"
                                                placeholder="值"
                                                value={selectedNode.data?.conditionValue || ""}
                                                onValueChange={(v) => updateSelectedNode({ conditionValue: v })}
                                                classNames={{ inputWrapper: "h-8 w-20", input: "text-[10px] font-mono" }}
                                            />
                                        </div>
                                    </div>

                                    {/* 逻辑运算符 */}
                                    <div className="flex items-center gap-2 px-3">
                                        <div className="h-px flex-1 bg-divider" />
                                        <Dropdown>
                                            <DropdownTrigger>
                                                <Button size="sm" variant="flat" className="h-6 text-[9px] font-bold">
                                                    {selectedNode.data?.logicOp || "AND"}
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu
                                                aria-label="选择逻辑运算符"
                                                onAction={(key) => updateSelectedNode({ logicOp: key as string })}
                                            >
                                                <DropdownItem key="AND">AND</DropdownItem>
                                                <DropdownItem key="OR">OR</DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>
                                        <div className="h-px flex-1 bg-divider" />
                                    </div>

                                    {/* 条件 2 (可选) */}
                                    <div className="p-3 bg-content2/30 rounded-xl border border-dashed border-divider">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1 h-8 px-2 bg-content1 border border-divider rounded-lg">
                                                    <VariableSelector
                                                        currentNodeId={selectedNode.id}
                                                        nodes={nodes}
                                                        edges={edges}
                                                        onSelect={(varRef) => updateSelectedNode({ conditionVar2: varRef })}
                                                    />
                                                    <span className="text-[10px] font-mono text-foreground-400 truncate flex-1">
                                                        {selectedNode.data?.conditionVar2 || "+ 添加条件"}
                                                    </span>
                                                </div>
                                            </div>
                                            {selectedNode.data?.conditionVar2 && (
                                                <>
                                                    <Dropdown>
                                                        <DropdownTrigger>
                                                            <Button size="sm" variant="bordered" className="h-8 min-w-[60px] text-[10px] font-mono">
                                                                {selectedNode.data?.conditionOp2 || "=="}
                                                            </Button>
                                                        </DropdownTrigger>
                                                        <DropdownMenu
                                                            aria-label="选择运算符"
                                                            onAction={(key) => updateSelectedNode({ conditionOp2: key as string })}
                                                        >
                                                            <DropdownItem key="==">等于 ==</DropdownItem>
                                                            <DropdownItem key="!=">不等于 !=</DropdownItem>
                                                            <DropdownItem key=">">大于 &gt;</DropdownItem>
                                                            <DropdownItem key="<">小于 &lt;</DropdownItem>
                                                        </DropdownMenu>
                                                    </Dropdown>
                                                    <Input
                                                        size="sm"
                                                        variant="bordered"
                                                        placeholder="值"
                                                        value={selectedNode.data?.conditionValue2 || ""}
                                                        onValueChange={(v) => updateSelectedNode({ conditionValue2: v })}
                                                        classNames={{ inputWrapper: "h-8 w-20", input: "text-[10px] font-mono" }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 分支说明 */}
                                <div className="flex gap-2">
                                    <div className="flex-1 p-2 bg-green-50 rounded-lg border border-green-200">
                                        <div className="text-[9px] font-bold text-green-700 mb-0.5">✓ True</div>
                                        <div className="text-[8px] text-green-600">条件满足时执行</div>
                                    </div>
                                    <div className="flex-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="text-[9px] font-bold text-gray-700 mb-0.5">✗ False</div>
                                        <div className="text-[8px] text-gray-600">条件不满足时执行</div>
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
                                    <div className="flex items-center gap-1">
                                        <VariableSelector
                                            currentNodeId={selectedNode.id}
                                            nodes={nodes}
                                            edges={edges}
                                            onSelect={(varRef) => {
                                                const current = selectedNode.data?.code || "";
                                                updateSelectedNode({ code: current + varRef });
                                            }}
                                        />
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
                                        点击 <Variable size={10} className="inline text-primary" /> 插入上游变量。
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
                                        <Button variant="bordered" size="sm" className="justify-between h-9 text-[11px] w-full">
                                            {selectedNode.data?.knowledgeBaseName || "选择知识库..."}
                                            <span className="text-foreground-400">▼</span>
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="选择知识库"
                                        onAction={(key) => {
                                            const kb = knowledgeBases.find(k => k.id === Number(key));
                                            updateSelectedNode({
                                                knowledgeBaseId: Number(key),
                                                knowledgeBaseName: kb?.name || String(key)
                                            });
                                        }}
                                    >
                                        {knowledgeBases.map((kb) => (
                                            <DropdownItem key={kb.id}>{kb.name}</DropdownItem>
                                        ))}
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

                        {/* 迭代节点配置 */}
                        {selectedNode.type === "iteration" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <Repeat size={10} />
                                    迭代设置
                                </div>
                                <Input
                                    label="输入变量"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="items"
                                    value={selectedNode.data?.input_variable || ""}
                                    onValueChange={(v) => updateSelectedNode({ input_variable: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                                <Input
                                    label="输出变量"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="results"
                                    value={selectedNode.data?.output_variable || "results"}
                                    onValueChange={(v) => updateSelectedNode({ output_variable: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]", inputWrapper: "h-9" }}
                                />
                            </section>
                        )}

                        {/* 参数提取节点配置 */}
                        {selectedNode.type === "extractor" && (
                            <section className="flex flex-col gap-3">
                                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                                    <FileCode size={10} />
                                    参数提取
                                </div>
                                <Textarea
                                    label="输入文本"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    minRows={3}
                                    placeholder="{{input}}"
                                    value={selectedNode.data?.input_text || "{{input}}"}
                                    onValueChange={(v) => updateSelectedNode({ input_text: v })}
                                    classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
                                />
                                <div className="text-[10px] font-bold text-foreground-500 px-1 mt-2">提取参数</div>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                    className="text-[10px] h-7"
                                    onPress={() => {
                                        const params = [...(selectedNode.data?.parameters || [])];
                                        params.push({ name: "", description: "", type: "string" });
                                        updateSelectedNode({ parameters: params });
                                    }}
                                >
                                    + 添加参数
                                </Button>
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

function VariableModal({
    isOpen,
    onOpenChange,
    initialData,
    onSave
}: {
    isOpen: boolean;
    onOpenChange: () => void;
    initialData: any | null;
    onSave: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        type: "string",
        required: true,
        description: "",
        ...initialData
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: "",
                type: "string",
                required: true,
                description: "",
                ...initialData
            });
        }
    }, [isOpen, initialData]);

    const variableTypes = [
        { type: 'string', label: '文本 (String)' },
        { type: 'number', label: '数字 (Number)' },
        { type: 'object', label: '对象 (Object)' },
        { type: 'array[string]', label: '文本列表' },
        { type: 'file', label: '单文件 (File)' },
        { type: 'array[file]', label: '文件列表' },
    ];

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-[13px]">
                            {initialData ? "编辑变量" : "添加变量"}
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <div className="flex flex-col gap-4">
                                <Input
                                    label="变量名"
                                    labelPlacement="outside"
                                    placeholder="例如: query"
                                    value={formData.name}
                                    onValueChange={(v) => setFormData({ ...formData, name: v })}
                                    variant="bordered"
                                    size="sm"
                                    classNames={{ label: "text-[11px]", input: "text-[12px] font-mono" }}
                                />
                                <Select
                                    label="变量类型"
                                    labelPlacement="outside"
                                    placeholder="选择类型"
                                    selectedKeys={[formData.type]}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    variant="bordered"
                                    size="sm"
                                    classNames={{ label: "text-[11px]", value: "text-[12px]" }}
                                >
                                    {variableTypes.map((t) => (
                                        <SelectItem key={t.type} textValue={t.label}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Checkbox
                                    isSelected={formData.required}
                                    onValueChange={(v) => setFormData({ ...formData, required: v })}
                                    size="sm"
                                >
                                    <span className="text-[12px]">必填项</span>
                                </Checkbox>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" size="sm" onPress={onClose} className="text-[11px]">
                                取消
                            </Button>
                            <Button
                                color="primary"
                                size="sm"
                                onPress={() => {
                                    if (!formData.name) return;
                                    onSave(formData);
                                    onClose();
                                }}
                                className="text-[11px]"
                            >
                                确定
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

function ModelParamsModal({
    isOpen,
    onOpenChange,
    data,
    onChange,
    modelConfig
}: {
    isOpen: boolean;
    onOpenChange: () => void;
    data: any;
    onChange: (patch: Record<string, any>) => void;
    modelConfig?: any;
}) {
    // Default parameters if no config provided
    const defaultParams = [
        { label: "Temperature", key: "temperature", min: 0, max: 2, step: 0.1, desc: ["精确", "创意"], default: 0.7 },
        { label: "Top P", key: "topP", min: 0, max: 1, step: 0.05, desc: ["0", "1"], default: 1.0 },
        { label: "Presence Penalty", key: "presencePenalty", min: 0, max: 2, step: 0.1, desc: ["0", "2"], default: 0 },
        { label: "Frequency Penalty", key: "frequencyPenalty", min: 0, max: 2, step: 0.1, desc: ["0", "2"], default: 0 },
        { label: "Max Tokens", key: "maxTokens", min: 1, max: 8192, step: 1, desc: ["1", "8192"], default: 2048, isInt: true },
    ];

    // Generate parameters list from modelConfig if available

    const getParams = () => {
        // Always start with default parameters
        const merged = [...defaultParams];

        if (!modelConfig || Object.keys(modelConfig).length === 0) return merged;

        // Merge or add parameters from config
        Object.entries(modelConfig).forEach(([key, conf]: [string, any]) => {
            const index = merged.findIndex(p => p.key === key);

            if (index !== -1) {
                // Override existing parameter
                merged[index] = { ...merged[index], ...conf };
            } else {
                // Add new parameter with smart defaults
                merged.push({
                    label: conf.label || key.charAt(0).toUpperCase() + key.slice(1),
                    key: key,
                    min: conf.min ?? 0,
                    max: conf.max ?? 1,
                    step: conf.step ?? (Number.isInteger(conf.min) && Number.isInteger(conf.max) ? 1 : 0.1),
                    desc: conf.desc || [String(conf.min ?? 0), String(conf.max ?? 1)],
                    default: conf.default ?? conf.min ?? 0,
                    isInt: conf.isInt || (Number.isInteger(conf.min) && Number.isInteger(conf.max))
                });
            }
        });

        return merged;
    };

    const params = getParams();

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-[13px]">模型参数配置</ModalHeader>
                        <ModalBody className="pb-6">
                            <div className="flex flex-col gap-5">
                                {params.map((param) => (
                                    <div key={param.key} className="group">
                                        <div className="flex items-center justify-between mb-2 h-6">
                                            <span className="text-[12px] font-medium text-foreground-700">{param.label}</span>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    size="sm"
                                                    variant="flat"
                                                    type="number"
                                                    value={String(data?.[param.key] ?? param.default)}
                                                    onValueChange={(v) => {
                                                        let val = parseFloat(v);
                                                        if (isNaN(val)) return;
                                                        if (param.isInt) val = Math.floor(val);
                                                        // Clamp value
                                                        if (val < param.min) val = param.min;
                                                        if (val > param.max) val = param.max;
                                                        onChange({ [param.key]: val });
                                                    }}
                                                    classNames={{
                                                        base: "w-16",
                                                        input: "text-[11px] font-mono text-right p-0",
                                                        inputWrapper: "h-7 min-h-7 px-2 bg-content2/50 transition-colors shadow-none"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={param.min}
                                                max={param.max}
                                                step={param.step}
                                                value={data?.[param.key] ?? param.default}
                                                onChange={(e) => onChange({ [param.key]: param.isInt ? parseInt(e.target.value) : parseFloat(e.target.value) })}
                                                className="flex-1 h-1.5 bg-content2 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-600 transition-all"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-foreground-400 mt-1.5">
                                            <span>{param.desc[0]}</span>
                                            <span>{param.desc[1]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" size="sm" onPress={onClose} className="text-[11px]">
                                完成
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
