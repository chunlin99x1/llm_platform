import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button
} from "@heroui/react";
import {
    ArrowRight,
    Plus
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { getNodeMeta } from "./utils";
import { Dispatch, SetStateAction } from "react";

export function NextNodeConfig({
    selectedNode,
    nodes,
    edges,
    setEdges,

}: {
    selectedNode: Node;
    nodes: Node[];
    edges: Edge[];
    setEdges: Dispatch<SetStateAction<Edge[]>>;
}) {
    if (selectedNode.type === "end" || selectedNode.type === "answer") return null;

    return (
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
    );
}
