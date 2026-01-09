import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Input
} from "@heroui/react";
import {
    GitBranch
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "../../workflow-variable-selector";

export function ConditionNodeConfig({
    selectedNode,
    updateSelectedNode,
    nodes,
    edges
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
    nodes: Node[];
    edges: Edge[];
}) {
    return (
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
    );
}
