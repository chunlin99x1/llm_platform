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
    BackgroundVariant,
    type Edge,
    type Node,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./node-components";
import CustomEdge from "./custom-edge";
import { NodeContextMenu, CanvasContextMenu, useContextMenu } from "./workflow-contextmenu";

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
}: WorkflowCanvasProps) {
    // 右键菜单状态
    const { nodeMenu, canvasMenu, openNodeMenu, openCanvasMenu, closeMenus } = useContextMenu();

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
                nodes={nodes}
                edges={edgesWithData}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
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
            >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="#cbd5e1" />
                <Controls className="!bg-white !border-divider !shadow-sm !rounded-lg !m-4" />
            </ReactFlow>

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
                onAddNode={(type, pos) => addNode(type, pos)}
            />

            {/* Dify-style Block Selector */}
            <div className="absolute left-4 top-4">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-[220px]">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                        <span className="text-[11px] font-semibold text-gray-600">添加节点</span>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-2 max-h-[400px] overflow-y-auto space-y-3">
                        {/* 基础 */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                                基础
                            </div>
                            <div className="space-y-0.5">
                                {[
                                    { type: "start", label: "开始", desc: "工作流入口", color: "bg-blue-500" },
                                    { type: "llm", label: "LLM", desc: "调用大语言模型", color: "bg-indigo-500" },
                                    { type: "answer", label: "直接回复", desc: "输出结果给用户", color: "bg-orange-500" },
                                    { type: "end", label: "结束", desc: "工作流结束", color: "bg-orange-500" },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => addNode(item.type)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.color} shadow-sm`}>
                                            <Play size={10} className="text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">{item.label}</div>
                                            <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 逻辑 */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                                逻辑
                            </div>
                            <div className="space-y-0.5">
                                {[
                                    { type: "condition", label: "条件分支", desc: "IF/ELSE 逻辑", color: "bg-cyan-500", icon: GitBranch },
                                    { type: "iteration", label: "迭代", desc: "循环处理列表", color: "bg-cyan-500", icon: Repeat },
                                    { type: "variable", label: "变量赋值", desc: "设置变量值", color: "bg-blue-500", icon: Variable },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => addNode(item.type)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.color} shadow-sm`}>
                                            <item.icon size={10} className="text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">{item.label}</div>
                                            <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 转换 */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                                转换
                            </div>
                            <div className="space-y-0.5">
                                {[
                                    { type: "code", label: "代码执行", desc: "运行 Python/JS", color: "bg-blue-600", icon: Code },
                                    { type: "template", label: "模板转换", desc: "Jinja2 模板", color: "bg-blue-500", icon: FileCode },
                                    { type: "http", label: "HTTP 请求", desc: "调用外部 API", color: "bg-violet-500", icon: Globe },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => addNode(item.type)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.color} shadow-sm`}>
                                            <item.icon size={10} className="text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">{item.label}</div>
                                            <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 知识 */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                                知识
                            </div>
                            <div className="space-y-0.5">
                                {[
                                    { type: "knowledge", label: "知识检索", desc: "从知识库检索", color: "bg-green-500", icon: Database },
                                    { type: "classifier", label: "问题分类", desc: "对问题分类", color: "bg-green-500", icon: HelpCircle },
                                ].map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => addNode(item.type)}
                                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${item.color} shadow-sm`}>
                                            <item.icon size={10} className="text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900">{item.label}</div>
                                            <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
