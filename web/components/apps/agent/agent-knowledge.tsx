import {
    Book,
} from "lucide-react";
import {
    Chip,
    Switch,
} from "@heroui/react";
import type { KnowledgeBase, KnowledgeSettings } from "@/lib/types";

interface AgentKnowledgeProps {
    knowledgeBases: KnowledgeBase[];
    selectedKBs: number[];
    setSelectedKBs: (ids: number[] | ((prev: number[]) => number[])) => void;
    knowledgeSettings: KnowledgeSettings;
    setKnowledgeSettings: (settings: KnowledgeSettings | ((prev: KnowledgeSettings) => KnowledgeSettings)) => void;
}

export function AgentKnowledge({
    knowledgeBases,
    selectedKBs,
    setSelectedKBs,
    // knowledgeSettings, // Reserved for future advanced settings UI
    // setKnowledgeSettings 
}: AgentKnowledgeProps) {
    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">关联知识库</span>
            </div>

            <div className="text-[10px] text-foreground/50 mb-4 px-1 leading-relaxed">
                选择要关联的知识库，Agent 会在回答问题时检索相关内容。
            </div>

            {knowledgeBases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-1 border-dashed border-divider bg-content2/20">
                    <Book size={14} className="text-foreground/20 mb-1.5" />
                    <div className="text-[10px] text-foreground/40 font-medium">暂无可用知识库</div>
                    <div className="text-[9px] text-foreground/30 mt-1">请先在知识库管理中创建知识库</div>
                </div>
            ) : (
                <div className="space-y-2">
                    {knowledgeBases.map((kb) => {
                        const isSelected = selectedKBs.includes(kb.id);
                        return (
                            <div
                                key={kb.id}
                                className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer border ${isSelected
                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                    : "bg-content2/30 border-transparent hover:border-emerald-500/20 hover:bg-content2/50"
                                    }`}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedKBs((prev) => prev.filter(id => id !== kb.id));
                                    } else {
                                        setSelectedKBs((prev) => [...prev, kb.id]);
                                    }
                                }}
                            >
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-emerald-500 text-white" : "bg-emerald-50"
                                    }`}>
                                    <Book size={14} className={isSelected ? "text-white" : "text-emerald-500"} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`text-[11px] font-bold truncate ${isSelected ? "text-emerald-700" : "text-foreground"}`}>
                                            {kb.name}
                                        </span>
                                    </div>
                                    <div className="text-[9px] text-foreground/40 truncate">
                                        {kb.document_count} 个文档
                                    </div>
                                </div>

                                <Switch
                                    size="sm"
                                    isSelected={isSelected}
                                    onValueChange={(val) => {
                                        if (val) {
                                            setSelectedKBs((prev) => [...prev, kb.id]);
                                        } else {
                                            setSelectedKBs((prev) => prev.filter(id => id !== kb.id));
                                        }
                                    }}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-emerald-500",
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
