"use client";

import {
    Button,
    Input,
} from "@heroui/react";
import {
    Play,
    ChevronRight,
    Activity,
    MessageSquare,
} from "lucide-react";
import { MessageDisplay } from "./message-display";
import type { AgentToolTrace } from "@/lib/types";

interface AgentPreviewProps {
    runOutput: string;
    runError: string | null;
    toolTraces: AgentToolTrace[];
    runInput: string;
    setRunInput: (value: string) => void;
    running: boolean;
    onRun: () => void;
}

export function AgentPreview({
    runOutput,
    runError,
    toolTraces,
    runInput,
    setRunInput,
    running,
    onRun,
}: AgentPreviewProps) {
    return (
        <div className="flex-1 flex flex-col bg-content2/5 p-6">
            <div className="max-w-4xl w-full h-full mx-auto flex flex-col bg-white border border-divider rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-divider bg-content1/30 flex items-center gap-2">
                    <Activity size={14} className="text-primary" />
                    <span className="text-[11px] font-bold">实时测试预览</span>
                </div>
                <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                    {runOutput || runError ? (
                        <MessageDisplay
                            output={runOutput}
                            error={runError}
                            toolTraces={toolTraces}
                            messageLabel="Assistant"
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-foreground gap-4 opacity-30 select-none">
                            <MessageSquare size={48} strokeWidth={1} />
                            <div className="text-center max-w-[200px]">
                                <div className="text-[11px] font-bold mb-1 uppercase tracking-wide">开始对话</div>
                                <p className="text-[10px] leading-tight italic">
                                    修改指令或工具后，在下方发送消息进行实时测试。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-divider bg-white">
                    <Input
                        placeholder="向您的智能体发送指令..."
                        value={runInput}
                        onValueChange={setRunInput}
                        onKeyDown={(e) => e.key === "Enter" && onRun()}
                        startContent={<ChevronRight size={14} className="text-foreground/40" />}
                        endContent={
                            <Button
                                isIconOnly
                                size="sm"
                                color="primary"
                                variant="solid"
                                className="h-7 w-7 rounded-lg"
                                isLoading={running}
                                onPress={onRun}
                            >
                                <Play size={12} fill="white" />
                            </Button>
                        }
                        classNames={{ inputWrapper: "h-10 bg-content2/10 border-divider", input: "text-[11px]" }}
                    />
                </div>
            </div>
        </div>
    );
}
