

import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Input,
    Textarea
} from "@heroui/react";
import {
    Code,
    Variable,
    Plus,
    X
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import { VariableSelector } from "../../workflow-variable-selector";
import { useCallback } from "react";

export function CodeNodeConfig({
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
    const variables = selectedNode.data?.variables || [];

    const handleAddVariable = useCallback(() => {
        const newVars = [...variables, { name: "", value: "" }];
        updateSelectedNode({ variables: newVars });
    }, [variables, updateSelectedNode]);

    const handleUpdateVariable = useCallback((index: number, field: string, value: string) => {
        const newVars = [...variables];
        newVars[index] = { ...newVars[index], [field]: value };
        updateSelectedNode({ variables: newVars });
    }, [variables, updateSelectedNode]);

    const handleDeleteVariable = useCallback((index: number) => {
        const newVars = variables.filter((_: any, i: number) => i !== index);
        updateSelectedNode({ variables: newVars });
    }, [variables, updateSelectedNode]);

    return (
        <section className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide">
                    <Code size={10} />
                    代码执行
                </div>
                <Dropdown>
                    <DropdownTrigger>
                        <Button size="sm" variant="flat" className="h-6 text-[10px] font-mono">
                            {selectedNode.data?.language || "Python"}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="语言选择"
                        onAction={(key) => updateSelectedNode({ language: key as string })}
                    >
                        <DropdownItem key="Python">Python 3</DropdownItem>
                        <DropdownItem key="JavaScript">JavaScript</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </div>

            {/* Input Variables */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="text-[10px] font-bold text-foreground-500">输入变量</div>
                    <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        className="h-5 w-5 min-w-0"
                        onClick={handleAddVariable}
                    >
                        <Plus size={12} />
                    </Button>
                </div>

                <div className="space-y-2">
                    {variables.map((v: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                            <Input
                                size="sm"
                                variant="bordered"
                                placeholder="变量名"
                                value={v.name}
                                onValueChange={(val) => handleUpdateVariable(index, 'name', val)}
                                classNames={{ input: "font-mono text-[10px]", inputWrapper: "h-8" }}
                                className="w-1/3"
                            />
                            <div className="flex-1 relative">
                                <VariableSelector
                                    currentNodeId={selectedNode.id}
                                    nodes={nodes}
                                    edges={edges}
                                    onSelect={(val) => handleUpdateVariable(index, 'value', val)}
                                />
                                <div className="absolute inset-y-0 left-0 right-0 flex items-center px-3 pointer-events-none">
                                    <span className="text-[10px] font-mono text-foreground-600 truncate">
                                        {v.value || "选择变量..."}
                                    </span>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                color="danger"
                                className="h-8 w-8 min-w-0"
                                onClick={() => handleDeleteVariable(index)}
                            >
                                <X size={12} />
                            </Button>
                        </div>
                    ))}
                    {variables.length === 0 && (
                        <div className="text-[10px] text-foreground-400 italic px-2">暂无输入变量</div>
                    )}
                </div>
            </div>

            {/* Code Editor */}
            <div className="space-y-1">
                <div className="text-[10px] font-bold text-foreground-500 px-1">代码内容</div>
                <Textarea
                    variant="bordered"
                    minRows={15}
                    placeholder="def main(inputs): ..."
                    value={selectedNode.data?.code || ""}
                    onValueChange={(v) => updateSelectedNode({ code: v })}
                    classNames={{
                        input: "font-mono text-[11px] leading-relaxed text-white",
                        inputWrapper: "bg-[#1e1e1e] p-2 border-default-200 hover:border-primary focus-within:border-primary !outline-none"
                    }}
                />
            </div>

            <div className="p-3 bg-content2/50 rounded-xl border border-divider">
                <div className="text-[10px] text-foreground-500 leading-relaxed">
                    Python 函数定义：
                    <pre className="mt-1 font-mono text-foreground-700 bg-content2 p-1.5 rounded select-all">
                        {`def main(${variables.map((v: any) => v.name).join(", ") || "inputs"}):\n    return { "result": "hello" }`}
                    </pre>
                </div>
            </div>
        </section>
    );
}
