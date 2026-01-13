
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Input,
    Accordion,
    AccordionItem
} from "@heroui/react";
import {
    GitBranch,
    Plus,
    Trash2,
    MoreHorizontal
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "../../workflow-variable-selector";
import { useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

// 单个条件行组件
function ConditionRow({
    condition,
    onChange,
    onRemove,
    nodes,
    edges,
    nodeId
}: {
    condition: any;
    onChange: (val: any) => void;
    onRemove: () => void;
    nodes: Node[];
    edges: Edge[];
    nodeId: string;
}) {
    return (
        <div className="p-2 bg-content1/50 border border-divider rounded-lg mb-2 group">
            {/* Row 1: Variable */}
            <div className="flex items-center gap-1 h-7 px-2 bg-background/50 border border-divider/50 rounded mb-2">
                <VariableSelector
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(varRef) => onChange({ ...condition, variable: varRef })}
                />
                <span className="text-[10px] font-mono text-foreground-600 truncate flex-1" title={condition.variable}>
                    {condition.variable || "选择变量..."}
                </span>
            </div>

            {/* Row 2: Op + Value + Delete */}
            <div className="flex items-center gap-2">
                <Dropdown>
                    <DropdownTrigger>
                        <Button size="sm" variant="flat" className="h-7 min-w-[70px] text-[10px] font-mono px-2 justify-between bg-background/50 border border-divider/50">
                            {condition.operator || "=="}
                            <span className="text-[8px] opacity-50">▼</span>
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="Op"
                        onAction={(key) => onChange({ ...condition, operator: key as string })}
                        classNames={{ base: "min-w-[120px]" }}
                    >
                        <DropdownItem key="==">Equals (==)</DropdownItem>
                        <DropdownItem key="!=">Not Equals (!=)</DropdownItem>
                        <DropdownItem key=">">Greater than (&gt;)</DropdownItem>
                        <DropdownItem key="<">Less than (&lt;)</DropdownItem>
                        <DropdownItem key=">=">Greater or Eq (&gt;=)</DropdownItem>
                        <DropdownItem key="<=">Less or Eq (&lt;=)</DropdownItem>
                        <DropdownItem key="contains">Contains</DropdownItem>
                        <DropdownItem key="not contains">Not Contains</DropdownItem>
                        <DropdownItem key="is empty">Is Empty</DropdownItem>
                        <DropdownItem key="is not empty">Is Not Empty</DropdownItem>
                    </DropdownMenu>
                </Dropdown>

                <div className="flex-1">
                    <Input
                        size="sm"
                        variant="flat"
                        placeholder="比较值"
                        value={condition.value || ""}
                        onValueChange={(v) => onChange({ ...condition, value: v })}
                        classNames={{
                            inputWrapper: "h-7 bg-background/50 border border-divider/50",
                            input: "text-[10px]"
                        }}
                    />
                </div>

                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={onRemove}
                >
                    <Trash2 size={13} />
                </Button>
            </div>
        </div>
    );
}

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
    // 初始化 Cases (如果旧数据存在，尝试迁移，这里简单处理为初始化空)
    const cases = selectedNode.data?.cases || [];

    // 如果还没有 Cases 但有旧条件，迁移一次 (可选，为了兼容性)
    useEffect(() => {
        if (!selectedNode.data?.cases && (selectedNode.data?.conditionVar || selectedNode.data?.conditions)) {
            // 简单迁移逻辑... 略，直接使用新模式
            // 如果用户通过 UI 操作，会初始化第一个 Case
            if (cases.length === 0) {
                handleAddCase();
            }
        }
    }, []);

    const handleAddCase = useCallback(() => {
        const newCase = {
            id: uuidv4(),
            name: `Case ${cases.length + 1}`,
            conditions: [{ variable: "", operator: "==", value: "" }]
        };
        updateSelectedNode({ cases: [...cases, newCase] });
    }, [cases, updateSelectedNode]);

    const handleUpdateCase = useCallback((index: number, newCase: any) => {
        const newCases = [...cases];
        newCases[index] = newCase;
        updateSelectedNode({ cases: newCases });
    }, [cases, updateSelectedNode]);

    const handleRemoveCase = useCallback((index: number) => {
        const newCases = cases.filter((_: any, i: number) => i !== index);
        updateSelectedNode({ cases: newCases });
    }, [cases, updateSelectedNode]);

    return (
        <section className="flex flex-col gap-4">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <GitBranch size={10} />
                多分支条件
            </div>

            <div className="space-y-4">
                {cases.map((caseItem: any, index: number) => (
                    <div key={caseItem.id || index} className="p-3 bg-content2/30 rounded-xl border border-divider">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-bold text-primary uppercase">
                                {index === 0 ? "IF" : "ELIF"}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    size="sm"
                                    variant="underlined"
                                    value={caseItem.name}
                                    onValueChange={(v) => handleUpdateCase(index, { ...caseItem, name: v })}
                                    classNames={{ input: "text-[10px] font-bold text-foreground-600 text-right", inputWrapper: "h-6 w-20" }}
                                />
                                <Button isIconOnly size="sm" variant="light" className="h-6 w-6" onClick={() => handleRemoveCase(index)}>
                                    <Trash2 size={12} className="text-foreground-400" />
                                </Button>
                            </div>
                        </div>

                        {/* Conditions List in Case */}
                        <div className="space-y-1">
                            {(caseItem.conditions || []).map((cond: any, cIndex: number) => (
                                <ConditionRow
                                    key={cIndex}
                                    condition={cond}
                                    nodeId={selectedNode.id}
                                    nodes={nodes}
                                    edges={edges}
                                    onChange={(newCond) => {
                                        const newConditions = [...caseItem.conditions];
                                        newConditions[cIndex] = newCond;
                                        handleUpdateCase(index, { ...caseItem, conditions: newConditions });
                                    }}
                                    onRemove={() => {
                                        const newConditions = caseItem.conditions.filter((_: any, i: number) => i !== cIndex);
                                        handleUpdateCase(index, { ...caseItem, conditions: newConditions });
                                    }}
                                />
                            ))}
                            <Button
                                size="sm"
                                variant="light"
                                className="h-6 text-[10px] text-primary"
                                startContent={<Plus size={10} />}
                                onClick={() => {
                                    const newConditions = [...(caseItem.conditions || []), { variable: "", operator: "==", value: "" }];
                                    handleUpdateCase(index, { ...caseItem, conditions: newConditions });
                                }}
                            >
                                添加条件 (AND)
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<Plus size={14} />}
                onClick={handleAddCase}
                className="w-full font-bold"
            >
                添加分支 (ELIF)
            </Button>

            <div className="p-3 bg-default-50 rounded-xl border border-default-100">
                <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-foreground-400 uppercase">ELSE</div>
                    <div className="text-[10px] text-foreground-500">
                        如果以上条件都不满足，执行 Else 分支
                    </div>
                </div>
            </div>
        </section>
    );
}
