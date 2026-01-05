"use client";

import {
    Button,
    Card,
    CardBody,
    Input,
    Accordion,
    AccordionItem,
} from "@heroui/react";
import {
    Play,
    Terminal,
    Variable as VariableIcon,
} from "lucide-react";
import { MessageDisplay } from "./message-display";
import type { AgentToolTrace, PromptVariable } from "@/lib/types";
import { useState } from "react";

interface WorkflowPreviewProps {
    runOutput: string;
    runError: string | null;
    toolTraces: AgentToolTrace[];
    runInput: string;
    setRunInput: (value: string) => void;
    running: boolean;
    onRun: (inputs?: Record<string, any>) => void;
    variables: PromptVariable[];
}

export function WorkflowPreview({
    runOutput,
    runError,
    toolTraces,
    runInput,
    setRunInput,
    running,
    onRun,
    variables,
}: WorkflowPreviewProps) {
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});

    const handleRun = () => {
        onRun(variableValues);
    };

    return (
        <div className="flex h-full items-center justify-center bg-content2/5 p-6">
            <Card className="max-w-4xl w-full h-full shadow-xl border-divider bg-background overflow-hidden relative rounded-2xl">
                <CardBody className="p-0 flex flex-row">
                    {/* Compact Debug Settings */}
                    <div className="w-[300px] border-r border-divider p-6 bg-content1/30 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                <Terminal size={14} className="text-primary" />
                                运行测试
                            </div>
                        </div>

                        <section className="flex-1 flex flex-col gap-6 overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest px-1">Query Input</div>
                                <Input
                                    label="入口输入 (input)"
                                    variant="bordered"
                                    size="sm"
                                    placeholder="输入测试内容..."
                                    value={runInput}
                                    onValueChange={setRunInput}
                                    labelPlacement="outside"
                                    classNames={{
                                        label: "text-[10px] font-semibold text-foreground/70",
                                        inputWrapper: "h-9 bg-content2/10",
                                        input: "text-[11px]"
                                    }}
                                />
                            </div>

                            {variables.length > 0 && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-divider/50">
                                    <div className="flex items-center gap-2 px-1 mb-1">
                                        <VariableIcon size={12} className="text-primary" />
                                        <div className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Prompt Variables</div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {variables.map((v) => (
                                            <Input
                                                key={v.key}
                                                label={v.name}
                                                placeholder={`输入 ${v.key} 的值...`}
                                                labelPlacement="outside"
                                                size="sm"
                                                variant="bordered"
                                                value={variableValues[v.key] || ""}
                                                onValueChange={(val) =>
                                                    setVariableValues((prev) => ({ ...prev, [v.key]: val }))
                                                }
                                                classNames={{
                                                    label: "text-[10px] font-medium text-foreground/70",
                                                    input: "text-xs",
                                                    inputWrapper: "h-8 bg-content2/20 border-divider",
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <Button
                            className="mt-6 w-full h-10 text-[11px] font-bold shadow-md shadow-primary/20"
                            color="primary"
                            isLoading={running}
                            onPress={handleRun}
                            startContent={<Play size={14} fill="currentColor" />}
                        >
                            开始运行调试
                        </Button>
                    </div>

                    {/* Compact Chat Result */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden">
                        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                            {runOutput || runError ? (
                                <MessageDisplay
                                    output={runOutput}
                                    error={runError}
                                    toolTraces={toolTraces}
                                    messageLabel="Output"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-foreground gap-4 opacity-30 select-none">
                                    <Terminal size={48} strokeWidth={1} />
                                    <div className="text-center max-w-[200px]">
                                        <div className="text-[11px] font-bold mb-1 uppercase tracking-wide">等待输入</div>
                                        <p className="text-[10px] leading-tight italic">点击左侧按钮开始测试工作流...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
