import { memo } from "react";
import { Bot } from "lucide-react";
import { Chip } from "@heroui/react";

export const AgentConfigHeader = memo(function AgentConfigHeader() {
    return (
        <div className="h-14 px-5 border-b border-divider flex items-center justify-between bg-content1/30">
            <div className="flex items-center gap-2">
                <Bot size={16} className="text-primary" />
                <span className="font-semibold text-sm">智能体配置</span>
            </div>
            <Chip size="sm" variant="flat" color="primary" className="text-[10px]">
                Agent Mode
            </Chip>
        </div>
    );
});
