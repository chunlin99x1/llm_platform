"use client";

import { useState, useEffect } from "react";
import {
    Input,
    ScrollShadow,
} from "@heroui/react";
import {
    Settings,
    Box,
} from "lucide-react";
import type { Node, Edge } from "reactflow";

// Utils
import { getNodeMeta } from "./workflow/utils";

// Components
import { NextNodeConfig } from "./workflow/next-node-config";
import { StartNodeConfig } from "./workflow/nodes/start-node-config";
import { LLMNodeConfig } from "./workflow/nodes/llm-node-config";
import { CodeNodeConfig } from "./workflow/nodes/code-node-config";
import { HTTPNodeConfig } from "./workflow/nodes/http-node-config";
import { ConditionNodeConfig } from "./workflow/nodes/condition-node-config";
import { VariableAssignNodeConfig } from "./workflow/nodes/variable-assign-node-config";
import { IterationNodeConfig } from "./workflow/nodes/iteration-node-config";
import { TemplateNodeConfig } from "./workflow/nodes/template-node-config";
import { KnowledgeNodeConfig } from "./workflow/nodes/knowledge-node-config";
import { ExtractorNodeConfig } from "./workflow/nodes/extractor-node-config";
import { ClassifierNodeConfig } from "./workflow/nodes/classifier-node-config";
// Phase 2/3 新增节点配置
import { ToolNodeConfig } from "./workflow/nodes/tool-node-config";
import { AgentNodeConfig } from "./workflow/nodes/agent-node-config";
import { ListOperatorNodeConfig } from "./workflow/nodes/list-operator-node-config";
import { DocumentExtractorNodeConfig } from "./workflow/nodes/document-extractor-node-config";
import { QuestionClassifierNodeConfig } from "./workflow/nodes/question-classifier-node-config";
import { AnswerNodeConfig } from "./workflow/nodes/answer-node-config";
import { EndNodeConfig } from "./workflow/nodes/end-node-config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProviderModel {
    id: string;
    name: string;
    provider: string;
    config?: any;
}

interface KnowledgeBase {
    id: number;
    name: string;
}

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
    const [models, setModels] = useState<ProviderModel[]>([]);
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

    // Fetch models and knowledge bases
    useEffect(() => {
        const fetchModels = async () => {
            try {
                // Fetch from settings/model-providers to get dynamic models with config schemas
                const res = await fetch(`${API_BASE_URL}/settings/model-providers`);
                if (res.ok) {
                    const providers = await res.json();
                    // Flatten key models from all providers
                    const allModels: ProviderModel[] = providers.flatMap((p: any) =>
                        p.models.map((m: any) => ({
                            ...m,
                            provider: p.name // Ensure provider name is attached
                        }))
                    );
                    setModels(allModels);
                }
            } catch (err) {
                console.error("Failed to fetch models:", err);
            }
        };

        const fetchKnowledgeBases = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/knowledge/datasets`);
                if (res.ok) {
                    const data = await res.json();
                    setKnowledgeBases(data);
                }
            } catch (err) {
                console.error("Failed to fetch knowledge bases:", err);
            }
        };

        fetchModels();
        fetchKnowledgeBases();
    }, []);

    const meta = getNodeMeta(selectedNode?.type);
    const Icon = meta.icon;

    return (
        <div className="w-80 border-l border-divider bg-content1 flex flex-col h-full">
            {/* Header */}
            <div className="h-12 border-b border-divider flex items-center px-4 gap-2">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${meta.color} text-white shadow-sm`}>
                    <Icon size={14} />
                </div>
                <div className="font-semibold text-sm flex-1 truncate">
                    {selectedNode?.data?.label || meta.label}
                </div>
                <div className="text-[10px] bg-content2 px-1.5 py-0.5 rounded text-foreground-500 font-mono">
                    {selectedNode?.type?.toUpperCase() || "NONE"}
                </div>
            </div>

            <ScrollShadow className="flex-1 p-4">
                {selectedNode ? (
                    <div className="flex flex-col gap-5">
                        {/* Basic Settings */}
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

                        {/* Next Node Config */}
                        <NextNodeConfig
                            selectedNode={selectedNode}
                            nodes={nodes}
                            edges={edges}
                            setEdges={setEdges}
                        />

                        {/* Node Specific Configs */}
                        {selectedNode.type === "start" && (
                            <StartNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "llm" && (
                            <LLMNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                nodes={nodes}
                                edges={edges}
                                models={models}
                            />
                        )}

                        {selectedNode.type === "code" && (
                            <CodeNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                nodes={nodes}
                                edges={edges}
                            />
                        )}

                        {selectedNode.type === "http" && (
                            <HTTPNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "condition" && (
                            <ConditionNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                nodes={nodes}
                                edges={edges}
                            />
                        )}

                        {selectedNode.type === "variable" && (
                            <VariableAssignNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "iteration" && (
                            <IterationNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "template" && (
                            <TemplateNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "knowledge" && (
                            <KnowledgeNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                knowledgeBases={knowledgeBases}
                            />
                        )}

                        {selectedNode.type === "extractor" && (
                            <ExtractorNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "classifier" && (
                            <ClassifierNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {/* Phase 2/3 新增节点 */}
                        {selectedNode.type === "tool" && (
                            <ToolNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "agent" && (
                            <AgentNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "list-operator" && (
                            <ListOperatorNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "document-extractor" && (
                            <DocumentExtractorNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {selectedNode.type === "question-classifier" && (
                            <QuestionClassifierNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                            />
                        )}

                        {(selectedNode.type === "answer") && (
                            <AnswerNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                nodes={nodes}
                                edges={edges}
                            />
                        )}

                        {(selectedNode.type === "end") && (
                            <EndNodeConfig
                                selectedNode={selectedNode}
                                updateSelectedNode={updateSelectedNode}
                                nodes={nodes}
                                edges={edges}
                            />
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
