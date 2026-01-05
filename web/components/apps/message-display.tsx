"use client";

import {
    Avatar,
    Divider,
    Accordion,
    AccordionItem,
} from "@heroui/react";
import {
    Terminal,
    AlertCircle,
    Activity,
} from "lucide-react";
import type { AgentToolTrace } from "@/lib/types";

interface MessageDisplayProps {
    output?: string;
    error?: string | null;
    toolTraces?: AgentToolTrace[];
    messageLabel?: string;
}

export function MessageDisplay({ output, error, toolTraces = [], messageLabel = "Assistant" }: MessageDisplayProps) {
    if (!output && !error) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            {output && (
                <>
                    <div className="flex items-center gap-1.5">
                        <Avatar icon={<Terminal size={10} />} classNames={{ base: "bg-primary text-white h-5 w-5" }} />
                        <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">{messageLabel}</span>
                        <Divider className="flex-1 ml-2" />
                    </div>
                    <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-foreground">
                        {output}
                    </div>
                </>
            )}

            {error && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-danger" />
                        <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Error</span>
                        <Divider className="flex-1 ml-2" />
                    </div>
                    <div className="p-4 rounded-2xl bg-content1 border border-divider shadow-sm whitespace-pre-wrap leading-relaxed text-[13px] text-danger">
                        {error}
                    </div>
                </div>
            )}

            {toolTraces.length > 0 && (
                <div className="mt-2">
                    <Accordion
                        variant="splitted"
                        className="px-0"
                        itemClasses={{
                            base: "group-[.is-splitted]:bg-content2/30 group-[.is-splitted]:shadow-none border border-divider !rounded-xl mb-2",
                            title: "text-[10px] font-bold text-primary py-2",
                            trigger: "px-3 py-0 h-8",
                            content: "text-[10px] pb-3 px-3 pt-0 text-foreground/80 font-mono",
                            indicator: "text-foreground/40",
                        }}
                    >
                        {toolTraces.map((trace, idx) => (
                            <AccordionItem
                                key={trace.id || idx}
                                aria-label={trace.name || "Tool"}
                                title={
                                    <div className="flex items-center gap-2">
                                        <Activity size={10} className="text-primary/60" />
                                        <span>使用工具: {trace.name}</span>
                                        {trace.result === "执行中..." && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </div>
                                }
                            >
                                <div className="flex flex-col gap-1.5 bg-black/5 p-2 rounded-lg border border-black/5">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Arguments</span>
                                        <code className="text-[10px] break-all">{JSON.stringify(trace.args, null, 2)}</code>
                                    </div>
                                    <Divider className="opacity-40" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase text-foreground/40 font-bold mb-0.5">Result</span>
                                        <div className="text-[10px] break-words whitespace-pre-wrap">{trace.result}</div>
                                    </div>
                                </div>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}
        </div>
    );
}
