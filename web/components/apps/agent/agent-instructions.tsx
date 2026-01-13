import { Terminal } from "lucide-react";
import { Textarea } from "@heroui/react";

interface AgentInstructionsProps {
    instructions: string;
    setInstructions: (value: string) => void;
}

export function AgentInstructions({ instructions, setInstructions }: AgentInstructionsProps) {
    return (
        <section className="flex flex-col gap-3 p-4">
            <header className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5">
                    <Terminal size={12} /> 系统指令
                </label>
            </header>
            <Textarea
                variant="bordered"
                placeholder="你是一个专业的 AI 助手..."
                minRows={12}
                value={instructions}
                onValueChange={setInstructions}
                classNames={{ input: "text-[11px] leading-relaxed font-mono", inputWrapper: "p-2" }}
            />
            <p className="text-[9px] text-foreground leading-tight">
                编写详细的指令来定义智能体的角色、目标和行为准则。
            </p>
        </section>
    );
}
