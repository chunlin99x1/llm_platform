"use client";

import {
    Button,
    Card,
    Tooltip,
} from "@heroui/react";
import {
    Play,
    Box,
    MessageSquare,
} from "lucide-react";
import ReactFlow, {
    Background,
    Controls,
    BackgroundVariant,
    type Edge,
    type Node,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./node-components";

interface WorkflowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setSelectedId: (id: string) => void;
    addNode: (type: string) => void;
}

export function WorkflowCanvas({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedId,
    addNode,
}: WorkflowCanvasProps) {
    return (
        <div className="flex-1 relative bg-[#f8fafc]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                fitView
                className="bg-dot-pattern"
                snapToGrid
                snapGrid={[20, 20]}
                defaultEdgeOptions={{ type: "smoothstep", animated: true, style: { strokeWidth: 1.5 } }}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
                <Controls className="bg-white border-divider shadow-md !left-4 !bottom-4 scale-75" />
            </ReactFlow>

            {/* Compact Floating Toolbox */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
                <Card className="bg-white/80 backdrop-blur border-divider p-1 shadow-lg">
                    <div className="flex flex-col gap-1">
                        {[
                            { type: "start", icon: Play, label: "开始", color: "success" },
                            { type: "llm", icon: Box, label: "LLM 节点", color: "primary" },
                            { type: "answer", icon: MessageSquare, label: "回答节点", color: "warning" },
                        ].map((item) => (
                            <Tooltip key={item.type} content={item.label} placement="right">
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="flat"
                                    color={item.color as any}
                                    className="h-8 w-8 bg-white border-divider transition-all active:scale-95"
                                    onPress={() => addNode(item.type)}
                                >
                                    <item.icon size={16} />
                                </Button>
                            </Tooltip>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
