"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    Button,
    Card,
    Tooltip,
} from "@heroui/react";
import {
    Play,
    Box,
    MessageSquare,
    GitBranch,
    Variable,
    Code,
    Globe,
    Repeat,
    FileCode,
    Database,
    HelpCircle,
} from "lucide-react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type Edge,
    type Node,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
    type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./node-components";
import CustomEdge from "./custom-edge";
import { NodeContextMenu, CanvasContextMenu, useContextMenu } from "./workflow-contextmenu";
import { useConnectionValidation } from "./workflow-utils";
// 导入配置驱动节点面板
import { NodePanel } from "./workflow/node-panel";


const edgeTypes = {
    custom: CustomEdge,
};

interface WorkflowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setSelectedId: (id: string) => void;
    addNode: (type: string, position?: { x: number; y: number }) => void;
    onInsertNode?: (edgeId: string, nodeType: string, position: { x: number; y: number }) => void;
    onCopyNode?: (nodeId: string) => void;
    onDeleteNode?: (nodeId: string) => void;
    nodeRunStatus?: Record<string, 'running' | 'success' | 'error'>;
}

export function WorkflowCanvas({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedId,
    addNode,
    onInsertNode,
    onCopyNode,
    onDeleteNode,
    nodeRunStatus = {},
}: WorkflowCanvasProps) {
    // 右键菜单状态
    const { nodeMenu, canvasMenu, openNodeMenu, openCanvasMenu, closeMenus } = useContextMenu();

    // 连接验证
    const { isValidConnection } = useConnectionValidation(nodes, edges);

    // ReactFlow 实例，用于坐标转换
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    // 辅助线状态
    const [helpLines, setHelpLines] = useState<{ horizontal: number | null; vertical: number | null }>({
        horizontal: null,
        vertical: null,
    });

    // 节点类型列表已改为使用配置驱动的 NodePanel 组件
    // 不再需要从后端获取节点类型



    // 将运行状态注入到节点 data 中
    const nodesWithStatus = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            status: nodeRunStatus[node.id] || 'idle',
            onShowMenu: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                openNodeMenu(node.id, node.type || '', e.clientX, e.clientY);
            }
        },
    }));

    // 为每条边附加 onInsertNode 回调
    const edgesWithData = edges.map(edge => ({
        ...edge,
        type: 'custom',
        data: { ...edge.data, onInsertNode },
    }));

    // 处理节点右键
    const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        openNodeMenu(node.id, node.type || '', event.clientX, event.clientY);
    };

    // 处理画布右键
    const handlePaneContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        openCanvasMenu(event.clientX, event.clientY);
    };

    return (
        <div className="flex-1 relative bg-[#F2F4F7]">
            <ReactFlow
                nodes={nodesWithStatus}
                edges={edgesWithData}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onNodeContextMenu={handleNodeContextMenu}
                onPaneContextMenu={handlePaneContextMenu}
                fitView
                fitViewOptions={{ padding: 0.4, maxZoom: 0.9 }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                snapToGrid
                snapGrid={[10, 10]}
                minZoom={0.1}
                maxZoom={1.5}
                defaultEdgeOptions={{
                    type: "custom",
                    animated: false,
                    style: { stroke: '#94a3b8', strokeWidth: 2 }
                }}
                onInit={(instance) => {
                    reactFlowInstance.current = instance;
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
                <Controls className="!bg-white !border-divider !shadow-sm !rounded-lg !m-4" />
                <MiniMap
                    className="!bg-white !border-divider !shadow-sm !rounded-lg"
                    nodeColor={(node) => {
                        const colors: Record<string, string> = {
                            start: '#3b82f6',
                            llm: '#6366f1',
                            answer: '#f97316',
                            condition: '#06b6d4',
                            code: '#2563eb',
                            http: '#8b5cf6',
                            knowledge: '#22c55e',
                            iteration: '#06b6d4',
                            template: '#3b82f6',
                            end: '#ef4444',
                            tool: '#10b981',
                            agent: '#8b5cf6',
                            'question-classifier': '#f59e0b',
                            extractor: '#a855f7',
                            'document-extractor': '#6366f1',
                            'list-operator': '#06b6d4',
                        };
                        return colors[node.type || ''] || '#94a3b8';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                    pannable
                    zoomable
                />
            </ReactFlow>

            {/* 辅助线 */}
            {helpLines.horizontal !== null && (
                <div
                    className="absolute left-0 right-0 h-px bg-primary pointer-events-none z-50"
                    style={{ top: helpLines.horizontal }}
                />
            )}
            {helpLines.vertical !== null && (
                <div
                    className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-50"
                    style={{ left: helpLines.vertical }}
                />
            )}

            {/* 右键菜单 */}
            <NodeContextMenu
                isOpen={nodeMenu.isOpen}
                position={nodeMenu.position}
                nodeId={nodeMenu.nodeId}
                nodeType={nodeMenu.nodeType}
                onClose={closeMenus}
                onCopy={(id) => onCopyNode?.(id)}
                onDelete={(id) => onDeleteNode?.(id)}
                onViewOutput={() => { }}
                onRunFromHere={() => { }}
            />
            <CanvasContextMenu
                isOpen={canvasMenu.isOpen}
                position={canvasMenu.position}
                onClose={closeMenus}
                nodeTypes={undefined}
                onAddNode={(type, screenPos) => {
                    // 屏幕坐标转换为画布坐标
                    if (reactFlowInstance.current) {
                        const flowPosition = reactFlowInstance.current.screenToFlowPosition({
                            x: screenPos.x,
                            y: screenPos.y,
                        });
                        addNode(type, flowPosition);
                    } else {
                        // 回退：使用原始位置
                        addNode(type, screenPos);
                    }
                }}
            />

            {/* 快速缩放控制 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-100 px-3 py-1.5">
                <Tooltip content="缩小" placement="top">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 w-7 min-w-7 text-foreground-500"
                        onPress={() => {
                            // 缩小通过 Controls 组件处理
                        }}
                    >
                        <span className="text-lg font-bold">−</span>
                    </Button>
                </Tooltip>
                <div className="text-[10px] font-medium text-foreground-500 min-w-[40px] text-center">
                    80%
                </div>
                <Tooltip content="放大" placement="top">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 w-7 min-w-7 text-foreground-500"
                        onPress={() => {
                            // 放大通过 Controls 组件处理
                        }}
                    >
                        <span className="text-lg font-bold">+</span>
                    </Button>
                </Tooltip>
                <div className="h-4 w-px bg-gray-200" />
                <Tooltip content="适应画布" placement="top">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="h-7 w-7 min-w-7 text-foreground-500"
                        onPress={() => {
                            // 适应画布通过 Controls 组件处理
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                    </Button>
                </Tooltip>
            </div>

            {/* 配置驱动节点面板 - 根据应用模式自动过滤节点 */}
            <div className="absolute left-4 top-4">
                <NodePanel onAddNode={addNode} />
            </div>
        </div>
    );
}

