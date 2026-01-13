import { useState, useMemo } from "react";
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
    Info,
    Zap,
} from "lucide-react";
import {
    Button,
    Chip,
    Switch,
    Tooltip,
} from "@heroui/react";
import type { ToolCategory } from "@/lib/types";

// Helper map for icons
const toolIcons: Record<string, any> = {
    calc: Terminal,
    duckduckgo_search: Search,
    wikipedia: Book,
    web_page_reader: Globe,
    get_current_datetime: Clock,
    python_repl: FileCode,
    read_file: FileText,
    write_file: FileText,
    list_directory: Folder,
    file_delete: Trash2,
    echo: Zap,
};

interface AgentToolsProps {
    availableTools: ToolCategory[];
    enabledTools: string[];
    setEnabledTools: (value: string[] | ((prev: string[]) => string[])) => void;
}

export function AgentTools({ availableTools, enabledTools, setEnabledTools }: AgentToolsProps) {
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);

    const toggleTool = (toolName: string, enabled: boolean) => {
        if (enabled) {
            setEnabledTools((prev) => [...prev, toolName]);
        } else {
            setEnabledTools((prev) => prev.filter((t) => t !== toolName));
        }
    };

    return (
        <div className="p-5">
            <div className="space-y-4">
                {availableTools.map((cat) => (
                    <div key={cat.category}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                            <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">
                                {cat.category}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {cat.tools.map((tool) => {
                                const isEnabled = enabledTools.includes(tool.name);
                                const isHovered = hoveredTool === tool.name;
                                const IconComponent = toolIcons[tool.name] || Plus;

                                return (
                                    <div
                                        key={tool.name}
                                        className={`group relative flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${isEnabled
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-divider hover:border-primary/20 hover:bg-content2/50"
                                            }`}
                                        onMouseEnter={() => setHoveredTool(tool.name)}
                                        onMouseLeave={() => setHoveredTool(null)}
                                    >
                                        {/* 工具图标 */}
                                        <div
                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isEnabled
                                                ? "bg-primary text-white"
                                                : "bg-content3 text-foreground/50"
                                                }`}
                                        >
                                            <IconComponent size={14} />
                                        </div>

                                        {/* 工具信息 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-medium ${isEnabled ? "text-foreground" : "text-foreground/70"}`}>
                                                    {tool.name}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-foreground/40 line-clamp-1 mt-0.5">
                                                {tool.description}
                                            </div>
                                        </div>

                                        {/* 操作按钮 */}
                                        <div className="flex items-center gap-2">
                                            {isHovered && (
                                                <Tooltip content="查看详情">
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        className="h-6 w-6 min-w-6"
                                                    >
                                                        <Info size={12} />
                                                    </Button>
                                                </Tooltip>
                                            )}
                                            <Switch
                                                size="sm"
                                                isSelected={isEnabled}
                                                onValueChange={(val) => toggleTool(tool.name, val)}
                                                classNames={{
                                                    wrapper: "group-data-[selected=true]:bg-primary",
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
