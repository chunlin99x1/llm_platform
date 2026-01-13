/**
 * List Operator 节点配置面板
 * 
 * 配置列表操作
 */

import { Select, SelectItem, Input } from "@heroui/react";
import { List } from "lucide-react";
import type { Selection } from "@heroui/react";

const OPERATIONS = [
    { key: "first", label: "取首项", description: "获取列表前 N 项" },
    { key: "last", label: "取末项", description: "获取列表后 N 项" },
    { key: "limit", label: "限制数量", description: "限制列表长度" },
    { key: "slice", label: "切片", description: "按索引范围切片" },
    { key: "sort", label: "排序", description: "按字段排序" },
    { key: "unique", label: "去重", description: "移除重复项" },
    { key: "flatten", label: "展平", description: "展平嵌套列表" },
    { key: "filter", label: "过滤", description: "按条件过滤" },
    { key: "extract", label: "提取字段", description: "提取指定字段" },
];

export function ListOperatorNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    const operation = selectedNode.data?.operation || "first";
    const params = selectedNode.data?.params || {};

    const handleOperationChange = (keys: Selection) => {
        const op = Array.from(keys)[0] as string;
        updateSelectedNode({ operation: op });
    };

    const updateParams = (key: string, value: any) => {
        updateSelectedNode({
            params: { ...params, [key]: value }
        });
    };

    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <List size={10} />
                列表操作
            </div>

            <Input
                label="输入列表变量"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="{{node_id.list}}"
                value={selectedNode.data?.variable || ""}
                onValueChange={(v) => updateSelectedNode({ variable: v })}
                classNames={{
                    input: "font-mono text-[11px]",
                    label: "text-[10px]",
                    inputWrapper: "h-9"
                }}
            />

            <Select
                label="操作类型"
                labelPlacement="outside"
                selectedKeys={[operation]}
                onSelectionChange={handleOperationChange}
                classNames={{
                    trigger: "h-10",
                    label: "text-[10px]",
                    value: "text-[11px]"
                }}
            >
                {OPERATIONS.map((op) => (
                    <SelectItem key={op.key} textValue={op.label}>
                        <div className="flex flex-col">
                            <span className="text-[11px]">{op.label}</span>
                            <span className="text-[9px] text-gray-400">{op.description}</span>
                        </div>
                    </SelectItem>
                ))}
            </Select>

            {/* 根据操作类型显示不同参数 */}
            {(operation === "first" || operation === "last" || operation === "limit") && (
                <Input
                    label="数量"
                    labelPlacement="outside"
                    type="number"
                    variant="bordered"
                    size="sm"
                    min={1}
                    value={String(params.count || 1)}
                    onValueChange={(v) => updateParams("count", parseInt(v) || 1)}
                    classNames={{
                        input: "text-[11px]",
                        label: "text-[10px]",
                        inputWrapper: "h-9"
                    }}
                />
            )}

            {operation === "slice" && (
                <div className="flex gap-2">
                    <Input
                        label="起始"
                        labelPlacement="outside"
                        type="number"
                        variant="bordered"
                        size="sm"
                        min={0}
                        value={String(params.start || 0)}
                        onValueChange={(v) => updateParams("start", parseInt(v) || 0)}
                        classNames={{
                            input: "text-[11px]",
                            label: "text-[10px]",
                            inputWrapper: "h-9"
                        }}
                    />
                    <Input
                        label="结束"
                        labelPlacement="outside"
                        type="number"
                        variant="bordered"
                        size="sm"
                        min={0}
                        value={String(params.end || 10)}
                        onValueChange={(v) => updateParams("end", parseInt(v) || 10)}
                        classNames={{
                            input: "text-[11px]",
                            label: "text-[10px]",
                            inputWrapper: "h-9"
                        }}
                    />
                </div>
            )}

            {(operation === "sort" || operation === "filter" || operation === "extract") && (
                <Input
                    label="字段名"
                    labelPlacement="outside"
                    variant="bordered"
                    size="sm"
                    placeholder="name"
                    value={params.field || ""}
                    onValueChange={(v) => updateParams("field", v)}
                    classNames={{
                        input: "text-[11px]",
                        label: "text-[10px]",
                        inputWrapper: "h-9"
                    }}
                />
            )}

            {operation === "sort" && (
                <Select
                    label="排序方向"
                    labelPlacement="outside"
                    selectedKeys={[params.order || "asc"]}
                    onSelectionChange={(keys) => updateParams("order", Array.from(keys)[0])}
                    classNames={{
                        trigger: "h-9",
                        label: "text-[10px]",
                        value: "text-[11px]"
                    }}
                >
                    <SelectItem key="asc">升序</SelectItem>
                    <SelectItem key="desc">降序</SelectItem>
                </Select>
            )}
        </section>
    );
}
