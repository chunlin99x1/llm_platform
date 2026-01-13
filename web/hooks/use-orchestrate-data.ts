import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import {
    useApp,
    useWorkflow,
    useModels,
    useKnowledgeBases,
    useTools
} from "@/hooks/use-api";
import type {
    AppItem,
    ToolCategory,
    ProviderModel,
    KnowledgeBase,
    PromptVariable,
    MCPServer,
    KnowledgeSettings,
    WorkflowGraph,
    WorkflowEdge as Edge,
    WorkflowNode as Node,
    WorkflowNodeData
} from "@/lib/types";

interface UseOrchestrateDataProps {
    appId: number;
    setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
    setSelectedId: (id: string) => void;
}

export function useOrchestrateData({ appId, setNodes, setEdges, setSelectedId }: UseOrchestrateDataProps) {
    // API Hooks
    const { data: app, loading: appLoading, error: appError } = useApp(appId);
    const { data: wfDataRaw, loading: wfLoading, error: wfError } = useWorkflow(appId);
    const { data: toolsData, loading: toolsLoading } = useTools();
    const { data: providers, loading: modelsLoading } = useModels();
    const { data: kbData, loading: kbLoading } = useKnowledgeBases();

    // Derived States
    const loading = appLoading || wfLoading || toolsLoading || modelsLoading || kbLoading;
    const error = appError?.message || wfError?.message || null;

    // Process Models Data
    const models = useMemo(() => {
        if (!providers) return [];
        return providers.flatMap((p: any) =>
            (p.models || [])
                .filter((m: any) => m.model_type === "llm")
                .map((m: any) => ({
                    ...m,
                    provider: p.name
                }))
        );
    }, [providers]);

    const availableTools = useMemo(() => toolsData?.categories || [], [toolsData]);
    const knowledgeBases = useMemo(() => kbData || [], [kbData]);

    // Agent State
    const [instructions, setInstructions] = useState("");
    const [enabledTools, setEnabledTools] = useState<string[]>([]);
    const [variables, setVariables] = useState<PromptVariable[]>([]);
    const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
    const [selectedKBs, setSelectedKBs] = useState<number[]>([]);
    const [knowledgeSettings, setKnowledgeSettings] = useState<KnowledgeSettings>({
        top_k: 3,
        retrieval_mode: "hybrid",
        score_threshold: 0.0,
        rerank_enabled: false,
        fallback_to_model: true
    });
    const [modelConfig, setModelConfig] = useState<Record<string, unknown>>({
        provider: "openai",
        model: "gpt-4o",
        parameters: {}
    });

    const [previewSessionId, setPreviewSessionId] = useState("");
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize State when data is ready
    useEffect(() => {
        if (loading || error || isInitialized || !app || !wfDataRaw) return;

        try {
            if (app.mode === "agent") {
                const g = (wfDataRaw.graph || {}) as Record<string, unknown>;

                setInstructions((g.instructions as string) || "");
                setEnabledTools((g.enabled_tools as string[]) || []);
                setVariables((g.prompt_variables as PromptVariable[]) || []);
                setMcpServers((g.mcp_servers as MCPServer[]) || []);
                setSelectedKBs((g.knowledge_base_ids as number[]) || []);

                if (g.knowledge_settings) {
                    setKnowledgeSettings((prev) => ({ ...prev, ...(g.knowledge_settings as KnowledgeSettings || {}) }));
                }
                if (g.model_config) {
                    setModelConfig(g.model_config as Record<string, unknown>);
                }
            } else {
                const g = (wfDataRaw.graph || {}) as WorkflowGraph;
                const loadedNodes = ((g.nodes || []) as Node[]).map((n) => ({
                    ...n,
                    data: { ...n.data } as WorkflowNodeData,
                }));
                const loadedEdges = (g.edges || []) as Edge[];
                setNodes(loadedNodes);
                setEdges(loadedEdges);
                if (loadedNodes.length > 0) setSelectedId(loadedNodes[0].id);
            }

            setPreviewSessionId(`preview_${appId}_${uuidv4().slice(0, 8)}`);
            setIsInitialized(true);
        } catch (e) {
            console.error("Failed to initialize orchestration data:", e);
        }
    }, [loading, error, isInitialized, app, wfDataRaw, appId, setNodes, setEdges, setSelectedId]);

    return {
        loading,
        error,
        app,
        availableTools,
        models,
        knowledgeBases,
        previewSessionId,
        // Agent State Setters
        agentState: {
            instructions, setInstructions,
            enabledTools, setEnabledTools,
            variables, setVariables,
            mcpServers, setMcpServers,
            selectedKBs, setSelectedKBs,
            knowledgeSettings, setKnowledgeSettings,
            modelConfig, setModelConfig
        }
    };
}
