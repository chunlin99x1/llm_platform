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
    Globe,
    Plus,
    X
} from "lucide-react";
import { VariableSelector } from "../../workflow-variable-selector";
import { VariableInput } from "../../workflow-variable-selector";
import { useCallback } from "react";
import type { Node, Edge } from "reactflow";

// Key-Value Editor Subcomponent
function KeyValueList({
    title,
    items,
    onChange
}: {
    title: string;
    items: { key: string; value: string }[];
    onChange: (items: { key: string; value: string }[]) => void;
}) {
    const handleAdd = () => {
        onChange([...items, { key: "", value: "" }]);
    };

    const handleUpdate = (index: number, field: "key" | "value", val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        onChange(newItems);
    };

    const handleDelete = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-bold text-foreground-500">{title}</div>
                <Button size="sm" variant="light" isIconOnly className="h-5 w-5 min-w-0" onClick={handleAdd}>
                    <Plus size={12} />
                </Button>
            </div>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                        <Input
                            placeholder="Key"
                            value={item.key}
                            onValueChange={(v) => handleUpdate(index, "key", v)}
                            size="sm"
                            variant="bordered"
                            classNames={{ input: "text-[10px] font-mono", inputWrapper: "h-7" }}
                        />
                        <Input
                            placeholder="Value"
                            value={item.value}
                            onValueChange={(v) => handleUpdate(index, "value", v)}
                            size="sm"
                            variant="bordered"
                            classNames={{ input: "text-[10px] font-mono", inputWrapper: "h-7" }}
                        />
                        <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            color="danger"
                            className="h-7 w-7 min-w-0"
                            onClick={() => handleDelete(index)}
                        >
                            <X size={12} />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HTTPNodeConfig({
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
    const headers = selectedNode.data?.headers || [];
    const params = selectedNode.data?.params || [];

    const updateHeaders = (newHeaders: any[]) => updateSelectedNode({ headers: newHeaders });
    const updateParams = (newParams: any[]) => updateSelectedNode({ params: newParams });

    return (
        <section className="flex flex-col gap-4">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Globe size={10} />
                HTTP 请求
            </div>

            {/* Method & URL */}
            <div className="flex gap-2 items-center">
                <Dropdown>
                    <DropdownTrigger>
                        <Button size="sm" variant="flat" color="primary" className="h-9 min-w-[70px] text-[10px] font-bold">
                            {selectedNode.data?.method || "GET"}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="方法选择"
                        onAction={(key) => updateSelectedNode({ method: key as string })}
                    >
                        <DropdownItem key="GET">GET</DropdownItem>
                        <DropdownItem key="POST">POST</DropdownItem>
                        <DropdownItem key="PUT">PUT</DropdownItem>
                        <DropdownItem key="DELETE">DELETE</DropdownItem>
                        <DropdownItem key="PATCH">PATCH</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
                <div className="flex-1">
                    <VariableInput
                        value={selectedNode.data?.url || ""}
                        onChange={(v) => updateSelectedNode({ url: v })}
                        placeholder="https://api.example.com/..."
                        currentNodeId={selectedNode.id}
                        nodes={nodes}
                        edges={edges}
                    />
                </div>
            </div>

            {/* Params */}
            <KeyValueList title="Params" items={params} onChange={updateParams} />

            {/* Headers */}
            <KeyValueList title="Headers" items={headers} onChange={updateHeaders} />

            {/* Body */}
            <div className="space-y-1">
                <div className="text-[10px] font-bold text-foreground-500 px-1">Body (JSON)</div>
                <VariableInput
                    value={selectedNode.data?.body || ""}
                    onChange={(v) => updateSelectedNode({ body: v })}
                    placeholder='{"key": "value"}'
                    isTextarea
                    minRows={5}
                    currentNodeId={selectedNode.id}
                    nodes={nodes}
                    edges={edges}
                />
            </div>
        </section>
    );
}
