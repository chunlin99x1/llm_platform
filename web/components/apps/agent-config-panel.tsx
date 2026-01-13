"use client";

import { useMemo } from "react";
import {
    Card,
    CardBody,
    Chip,
    Divider,
    ScrollShadow,
    Tabs,
    Tab,
} from "@heroui/react";
import {
    Settings,
    Server,
    Book,
} from "lucide-react";

import {
    PromptVariable,
    ToolCategory,
    MCPServer,
    ProviderModel,
    KnowledgeBase,
    KnowledgeSettings
} from "@/lib/types";

// Import Sub-components
import { AgentConfigHeader } from "./agent/agent-config-header";
import { AgentModelSelect } from "./agent/agent-model-select";
import { AgentInstructions } from "./agent/agent-instructions";
import { AgentVariables } from "./agent/agent-variables";
import { AgentTools } from "./agent/agent-tools";
import { AgentMCPTools } from "./agent/agent-mcp-tools";
import { AgentKnowledge } from "./agent/agent-knowledge";

interface AgentConfigPanelProps {
    instructions: string;
    setInstructions: (value: string) => void;
    enabledTools: string[];
    setEnabledTools: (value: string[] | ((prev: string[]) => string[])) => void;
    availableTools: ToolCategory[];
    variables: PromptVariable[];
    setVariables: (vars: PromptVariable[]) => void;
    mcpServers: MCPServer[];
    setMcpServers: React.Dispatch<React.SetStateAction<MCPServer[]>>;
    models: ProviderModel[];
    modelConfig: Record<string, any>;
    setModelConfig: (config: Record<string, any>) => void;
    knowledgeBases: KnowledgeBase[];
    selectedKBs: number[];
    setSelectedKBs: (ids: number[] | ((prev: number[]) => number[])) => void;
    knowledgeSettings: KnowledgeSettings;
    setKnowledgeSettings: (settings: KnowledgeSettings | ((prev: KnowledgeSettings) => KnowledgeSettings)) => void;
}

export function AgentConfigPanel({
    instructions,
    setInstructions,
    enabledTools,
    setEnabledTools,
    availableTools,
    variables,
    setVariables,
    mcpServers,
    setMcpServers,
    models,
    modelConfig,
    setModelConfig,
    knowledgeBases,
    selectedKBs,
    setSelectedKBs,
    knowledgeSettings,
    setKnowledgeSettings,
}: AgentConfigPanelProps) {

    // 計算已啟用工具數量
    const allToolNames = useMemo(() => {
        return new Set(availableTools.flatMap(cat => cat.tools.map(t => t.name)));
    }, [availableTools]);

    const enabledCount = useMemo(() => {
        return enabledTools.filter(name => allToolNames.has(name)).length;
    }, [enabledTools, allToolNames]);

    const totalCount = availableTools.reduce((sum, cat) => sum + cat.tools.length, 0);

    return (
        <div className="w-[420px] flex flex-col border-r border-divider bg-background overflow-hidden relative z-10">
            <AgentConfigHeader />

            <ScrollShadow className="flex-1 overflow-y-auto">
                <AgentModelSelect
                    models={models}
                    modelConfig={modelConfig}
                    setModelConfig={setModelConfig}
                />

                <AgentInstructions
                    instructions={instructions}
                    setInstructions={setInstructions}
                />

                <Divider className="opacity-50" />

                <AgentVariables
                    variables={variables}
                    setVariables={setVariables}
                />

                {/* 工具与 MCP 切换 */}
                <div className="p-0 border-b border-divider">
                    <Tabs
                        aria-label="工具选项"
                        variant="underlined"
                        fullWidth
                        classNames={{
                            base: "px-5 border-b border-divider bg-content1/20",
                            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                            cursor: "w-full bg-primary",
                            tab: "max-w-fit px-0 h-12",
                            tabContent: "group-data-[selected=true]:text-primary font-semibold text-xs"
                        }}
                    >
                        <Tab
                            key="tools"
                            title={
                                <div className="flex items-center gap-2">
                                    <Settings size={14} />
                                    <span>内置工具</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50 px-1.5">
                                        {enabledCount}/{totalCount}
                                    </Chip>
                                </div>
                            }
                        >
                            <AgentTools
                                availableTools={availableTools}
                                enabledTools={enabledTools}
                                setEnabledTools={setEnabledTools}
                            />
                        </Tab>
                        <Tab
                            key="mcp"
                            title={
                                <div className="flex items-center gap-2">
                                    <Server size={14} />
                                    <span>MCP 工具</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50">
                                        {mcpServers.length}
                                    </Chip>
                                </div>
                            }
                        >
                            <AgentMCPTools
                                mcpServers={mcpServers}
                                setMcpServers={setMcpServers}
                            />
                        </Tab>
                        <Tab
                            key="knowledge"
                            title={
                                <div className="flex items-center gap-2">
                                    <Book size={14} />
                                    <span>知识库</span>
                                    <Chip size="sm" variant="flat" className="h-4 text-[10px] bg-content3/50">
                                        {selectedKBs.length}
                                    </Chip>
                                </div>
                            }
                        >
                            <AgentKnowledge
                                knowledgeBases={knowledgeBases}
                                selectedKBs={selectedKBs}
                                setSelectedKBs={setSelectedKBs}
                                knowledgeSettings={knowledgeSettings}
                                setKnowledgeSettings={setKnowledgeSettings}
                            />
                        </Tab>
                    </Tabs>
                </div>
            </ScrollShadow>
        </div>
    );
}
