"use client";

import { Box, History } from "lucide-react";
import { useState, useCallback } from "react";
import "reactflow/dist/style.css";

import { updateWorkflow } from "@/lib/api";

// Import extracted components and hooks
import { AgentConfigPanel } from "./agent-config-panel";
import { AgentPreview } from "./agent-preview";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowConfigPanel } from "./workflow-config-panel";
import { WorkflowPreview } from "./workflow-preview";
import { useWorkflowShortcuts } from "./workflow-history";
import { OrchestrateHeader } from "./orchestrate-header";

import { useOrchestrateData } from "@/hooks/use-orchestrate-data";
import { useWorkflowGraph } from "@/hooks/use-workflow-graph";
import { useWorkflowRun } from "@/hooks/use-workflow-run";

export default function OrchestratePage({ appId }: { appId: number }) {
  const [activeTab, setActiveTab] = useState("orchestrate");
  const [saving, setSaving] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // 1. Workflow Graph Logic
  const {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    selectedId, setSelectedId,
    selectedNode, updateSelectedNode,
    addNode, onConnect,
    handleCopy, handlePaste, handleDelete
  } = useWorkflowGraph();

  // 2. Data Fetching & State Initialization
  const {
    loading,
    error: dataError,
    app,
    availableTools,
    models,
    knowledgeBases,
    previewSessionId,
    agentState
  } = useOrchestrateData({ appId, setNodes, setEdges, setSelectedId });

  // 3. Execution Logic
  const {
    runInput, setRunInput,
    runOutput,
    runError,
    running,
    toolTraces,
    nodeRunStatus,
    onRun
  } = useWorkflowRun({
    appId,
    app,
    nodes,
    edges,
    instructions: agentState.instructions,
    enabledTools: agentState.enabledTools,
    mcpServers: agentState.mcpServers,
    modelConfig: agentState.modelConfig,
    selectedKBs: agentState.selectedKBs,
    knowledgeSettings: agentState.knowledgeSettings,
    previewSessionId
  });

  // Save Logic
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const graphPayload =
        app?.mode === "agent"
          ? {
            instructions: agentState.instructions,
            enabled_tools: agentState.enabledTools,
            prompt_variables: agentState.variables,
            mcp_servers: agentState.mcpServers,
            model_config: agentState.modelConfig,
            knowledge_base_ids: agentState.selectedKBs,
            knowledge_settings: agentState.knowledgeSettings
          }
          : { nodes, edges };
      await updateWorkflow(appId, { graph: graphPayload });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [app?.mode, appId, nodes, edges, agentState]);

  // Shortcuts
  useWorkflowShortcuts({
    onUndo: () => console.log("Undo"),
    onRedo: () => console.log("Redo"),
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onSelectAll: () => console.log("Select All"),
    onSave: handleSave,
    enabled: app?.mode === "workflow" && activeTab === "orchestrate",
  });

  if (loading)
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-primary shadow-md shadow-primary/30 flex items-center justify-center text-white">
            <Box size={18} />
          </div>
        </div>
        <div className="text-[11px] font-medium text-foreground animate-pulse uppercase tracking-wider">
          进入编排空间...
        </div>
      </div>
    );

  if (dataError) {
    return <div className="p-4 text-red-500">Error: {dataError}</div>;
  }

  const isAgent = app?.mode === "agent";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <OrchestrateHeader
        appId={appId}
        isAgent={isAgent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        saving={saving}
        onSave={handleSave}
      />

      <div className="flex-1 overflow-hidden">
        {activeTab === "orchestrate" ? (
          isAgent ? (
            /* Agent Orchestration View */
            <div className="flex h-full bg-[#f8fafc]">
              <AgentConfigPanel
                instructions={agentState.instructions}
                setInstructions={agentState.setInstructions}
                enabledTools={agentState.enabledTools}
                setEnabledTools={agentState.setEnabledTools}
                availableTools={availableTools}
                variables={agentState.variables}
                setVariables={agentState.setVariables}
                mcpServers={agentState.mcpServers}
                setMcpServers={agentState.setMcpServers}
                models={models}
                modelConfig={agentState.modelConfig}
                setModelConfig={agentState.setModelConfig}
                knowledgeBases={knowledgeBases}
                selectedKBs={agentState.selectedKBs}
                setSelectedKBs={agentState.setSelectedKBs}
                knowledgeSettings={agentState.knowledgeSettings}
                setKnowledgeSettings={agentState.setKnowledgeSettings}
              />
              <AgentPreview
                runOutput={runOutput}
                runError={runError}
                toolTraces={toolTraces}
                runInput={runInput}
                setRunInput={setRunInput}
                variables={agentState.variables}
                running={running}
                onRun={onRun}
              />
            </div>
          ) : (
            /* Workflow Graph View */
            <div className="flex h-full">
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                setSelectedId={setSelectedId}
                addNode={addNode}
                onCopyNode={handleCopy}
                onDeleteNode={(id) => {
                  handleDelete(); // use hook's handleDelete logic but might need ID param if canvas passes it
                  // Actually WorkflowCanvas onDeleteNode passes ID, but handleDelete logic uses selectedId
                  // Compatibility check: Canvas might select node before delete?
                  // Let's stick closely to original: setNodes filter out ID.
                  // The hook's handleDelete relies on selectedId. 
                  // Canvas calls onDeleteNode(id). 
                  // Best compatibility: manually filter here or update hook to accept optional ID.
                  // For now, inline filter is safer as per previous implementation.
                  setNodes((nds) => nds.filter((n) => n.id !== id));
                  setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
                  if (selectedId === id) setSelectedId("");
                }}
                nodeRunStatus={nodeRunStatus}
              />
              <WorkflowConfigPanel
                selectedNode={selectedNode}
                updateSelectedNode={updateSelectedNode}
                nodes={nodes}
                edges={edges}
                setNodes={setNodes}
                setEdges={setEdges}
                selectedId={selectedId}
              />
            </div>
          )
        ) : activeTab === "preview" ? (
          <WorkflowPreview
            runOutput={runOutput}
            runError={runError}
            toolTraces={toolTraces}
            runInput={runInput}
            setRunInput={setRunInput}
            running={running}
            onRun={onRun}
            variables={(() => {
              if (isAgent) return agentState.variables;
              const startNode = nodes.find(n => n.type === 'start');
              return (startNode?.data?.variables || []).map((v: any) => ({
                key: v.name,
                name: v.name,
                type: (v.type || 'string').toLowerCase(),
                required: v.required
              }));
            })()}
            nodeRunStatus={nodeRunStatus}
            nodes={nodes}
          />
        ) : (
          <div className="p-10 flex flex-col items-center justify-center gap-4 text-foreground h-full">
            <History size={40} strokeWidth={1} className="opacity-20" />
            <div className="text-[10px] italic font-medium uppercase tracking-widest">日志系统正在迭代中...</div>
          </div>
        )}
      </div>
    </div>
  );
}
