"use client";

import {
    Card,
    CardBody,
    Chip,
    Divider,
    ScrollShadow,
    Textarea,
} from "@heroui/react";
import {
    Terminal,
    Search,
    Book,
    Globe,
    Clock,
    FileText,
    FileCode,
    Folder,
    Trash2,
    Plus,
} from "lucide-react";
import type { ToolCategory } from "@/lib/types";

interface AgentConfigPanelProps {
    instructions: string;
    setInstructions: (value: string) => void;
    enabledTools: string[];
    setEnabledTools: (value: string[] | ((prev: string[]) => string[])) => void;
    availableTools: ToolCategory[];
}

const toolIcons: Record<string, any> = {
    calc: Terminal,
    google_search: Search,
    wikipedia: Book,
    web_page_reader: Globe,
    current_datetime: Clock,
    python_repl: FileCode,
    read_file: FileText,
    write_file: FileText,
    list_directory: Folder,
    file_delete: Trash2,
};

export function AgentConfigPanel({
    instructions,
    setInstructions,
    enabledTools,
    setEnabledTools,
    availableTools,
}: AgentConfigPanelProps) {
    return (
        <div className="w-[450px] flex flex-col border-r border-divider bg-white shadow-sm overflow-hidden text-xs">
            <div className="p-4 border-b border-divider bg-content1/50 flex items-center justify-between">
                <span className="font-black uppercase tracking-widest text-[10px]">智能体配置</span>
            </div>
            <ScrollShadow className="flex-1 p-5 gap-6 flex flex-col">
                <section className="flex flex-col gap-3">
                    <header className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5">
                            <Terminal size={12} /> 系统指令
                        </label>
                        <Chip size="sm" variant="flat" color="primary" className="h-4 text-[8px] font-black">
                            GPT-4O
                        </Chip>
                    </header>
                    <Textarea
                        variant="bordered"
                        placeholder="你是一个专业的 AI 助手..."
                        minRows={12}
                        value={instructions}
                        onValueChange={setInstructions}
                        classNames={{ input: "text-[11px] leading-relaxed font-mono", inputWrapper: "p-2" }}
                    />
                    <p className="text-[9px] text-foreground/50 leading-tight">
                        编写详细的指令来定义智能体的角色、目标和行为准则。
                    </p>
                </section>

                <Divider className="opacity-50" />

                <section className="flex flex-col gap-6">
                    {availableTools.map((cat) => (
                        <div key={cat.category} className="flex flex-col gap-3">
                            <header className="flex items-center gap-2 px-1">
                                <div className="h-1 w-1 rounded-full bg-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                    {cat.category}
                                </span>
                            </header>
                            <div className="grid grid-cols-1 gap-2">
                                {cat.tools.map((tool) => {
                                    const isEnabled = enabledTools.includes(tool.name);
                                    const IconComponent = toolIcons[tool.name] || Plus;

                                    return (
                                        <Card
                                            key={tool.name}
                                            isPressable
                                            onPress={() =>
                                                setEnabledTools((prev) =>
                                                    isEnabled ? prev.filter((t) => t !== tool.name) : [...prev, tool.name]
                                                )
                                            }
                                            className={`border transition-all duration-300 rounded-xl ${isEnabled
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                    : "border-divider hover:border-primary/40"
                                                }`}
                                        >
                                            <CardBody className="p-3 flex flex-row items-center gap-3">
                                                <div
                                                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${isEnabled ? "bg-primary text-white shadow-sm" : "bg-content2 text-foreground/40"
                                                        }`}
                                                >
                                                    <IconComponent size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-[11px] flex items-center gap-2">
                                                        {tool.name}
                                                        {isEnabled && (
                                                            <Chip
                                                                size="sm"
                                                                color="primary"
                                                                variant="solid"
                                                                className="h-3 text-[7px] font-black px-1 rounded-sm"
                                                            >
                                                                ENABLED
                                                            </Chip>
                                                        )}
                                                    </div>
                                                    <div className="text-[9px] text-foreground/50 line-clamp-2 mt-0.5" title={tool.description}>
                                                        {tool.description}
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            </ScrollShadow>
        </div>
    );
}
