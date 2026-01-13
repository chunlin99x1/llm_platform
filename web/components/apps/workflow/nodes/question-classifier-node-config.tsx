/**
 * Question Classifier 节点配置面板
 * 
 * 配置问题分类
 */

import { Input, Textarea, Button, Chip } from "@heroui/react";
import { HelpCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { QuickModelSelector } from "@/components/model-selector";

interface ClassItem {
    id: string;
    name: string;
    description?: string;
}

export function QuestionClassifierNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    const classes: ClassItem[] = selectedNode.data?.classes || [];
    const [newClassName, setNewClassName] = useState("");

    const addClass = () => {
        if (!newClassName.trim()) return;
        const id = `class_${Date.now()}`;
        const newClasses = [...classes, { id, name: newClassName.trim() }];
        updateSelectedNode({ classes: newClasses });
        setNewClassName("");
    };

    const removeClass = (id: string) => {
        const newClasses = classes.filter(c => c.id !== id);
        updateSelectedNode({ classes: newClasses });
    };

    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <HelpCircle size={10} />
                问题分类
            </div>

            <Input
                label="问题变量"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="{{start.query}}"
                value={selectedNode.data?.query_variable || ""}
                onValueChange={(v) => updateSelectedNode({ query_variable: v })}
                classNames={{
                    input: "font-mono text-[11px]",
                    label: "text-[10px]",
                    inputWrapper: "h-9"
                }}
            />

            <QuickModelSelector
                type="llm"
                value={selectedNode.data?.model}
                onChange={(model) => updateSelectedNode({ model })}
            />

            <Textarea
                label="分类指令 (可选)"
                labelPlacement="outside"
                variant="bordered"
                minRows={2}
                placeholder="请根据用户意图进行分类..."
                value={selectedNode.data?.instruction || ""}
                onValueChange={(v) => updateSelectedNode({ instruction: v })}
                classNames={{
                    input: "text-[11px]",
                    label: "text-[10px]"
                }}
            />

            {/* 分类列表 */}
            <div className="space-y-2">
                <div className="text-[10px] font-semibold text-foreground-600">
                    分类类别 ({classes.length})
                </div>

                <div className="flex flex-wrap gap-1">
                    {classes.map((cls) => (
                        <Chip
                            key={cls.id}
                            size="sm"
                            variant="flat"
                            color="primary"
                            onClose={() => removeClass(cls.id)}
                            classNames={{ content: "text-[10px]" }}
                        >
                            {cls.name}
                        </Chip>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        variant="bordered"
                        size="sm"
                        placeholder="添加分类..."
                        value={newClassName}
                        onValueChange={setNewClassName}
                        onKeyDown={(e) => e.key === "Enter" && addClass()}
                        classNames={{
                            input: "text-[11px]",
                            inputWrapper: "h-8"
                        }}
                    />
                    <Button
                        size="sm"
                        color="primary"
                        isIconOnly
                        className="h-8 w-8 min-w-8"
                        onPress={addClass}
                    >
                        <Plus size={12} />
                    </Button>
                </div>
            </div>
        </section>
    );
}
