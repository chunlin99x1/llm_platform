import { useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Variable
} from "lucide-react";
import {
    Button,
    Chip,
    Tooltip,
    useDisclosure,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
    Select,
    SelectItem,
} from "@heroui/react";
import type { PromptVariable } from "@/lib/types";

interface AgentVariablesProps {
    variables: PromptVariable[];
    setVariables: (vars: PromptVariable[]) => void;
}

export function AgentVariables({ variables, setVariables }: AgentVariablesProps) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingVar, setEditingVar] = useState<PromptVariable | null>(null);
    const [varKey, setVarKey] = useState("");
    const [varName, setVarName] = useState("");
    const [varType, setVarType] = useState<"string" | "number" | "select">("string");

    const handleAddVariable = () => {
        setEditingVar(null);
        setVarKey("");
        setVarName("");
        setVarType("string");
        onOpen();
    };

    const handleEditVariable = (v: PromptVariable) => {
        setEditingVar(v);
        setVarKey(v.key);
        setVarName(v.name);
        setVarType(v.type);
        onOpen();
    };

    const handleDeleteVariable = (key: string) => {
        setVariables(variables.filter((v) => v.key !== key));
    };

    const handleSaveVariable = () => {
        if (!varKey || !varName) return;

        const newVar: PromptVariable = {
            key: varKey,
            name: varName,
            type: varType,
        };

        if (editingVar) {
            setVariables(variables.map((v) => (v.key === editingVar.key ? newVar : v)));
        } else {
            setVariables([...variables, newVar]);
        }
        onOpenChange();
    };

    return (
        <div className="p-5 border-b border-divider">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Variable size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold">输入变量</span>
                    <Chip size="sm" variant="flat" className="text-[9px] h-4 bg-content2">
                        {variables.length}
                    </Chip>
                </div>
                <Tooltip content="添加变量">
                    <Button
                        size="sm"
                        variant="flat"
                        isIconOnly
                        className="h-7 w-7 bg-primary/10 hover:bg-primary/20 text-primary"
                        onPress={handleAddVariable}
                    >
                        <Plus size={14} />
                    </Button>
                </Tooltip>
            </div>

            {variables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed border-divider bg-content2/20">
                    <div className="h-10 w-10 rounded-full bg-content3/50 flex items-center justify-center mb-3">
                        <Variable size={18} className="text-foreground/30" />
                    </div>
                    <div className="text-[11px] text-foreground/50 text-center">
                        暂无变量
                    </div>
                    <div className="text-[10px] text-foreground/30 text-center mt-1">
                        添加变量后可在提示词中使用 {"{{key}}"}
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        className="mt-4 h-7 text-[10px] bg-primary/10 text-primary"
                        startContent={<Plus size={12} />}
                        onPress={handleAddVariable}
                    >
                        添加第一个变量
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {variables.map((v, index) => {
                        const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
                            string: { bg: "bg-blue-500/10", text: "text-blue-600", icon: "from-blue-500 to-cyan-500" },
                            number: { bg: "bg-amber-500/10", text: "text-amber-600", icon: "from-amber-500 to-orange-500" },
                            select: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: "from-emerald-500 to-teal-500" },
                        };
                        const colors = typeColors[v.type] || typeColors.string;

                        return (
                            <div
                                key={v.key}
                                className="group relative flex items-center gap-3 p-3 rounded-xl bg-content2/40 hover:bg-content2/70 transition-all duration-200 border border-transparent hover:border-divider/50 hover:shadow-sm"
                            >
                                {/* 变量图标 */}
                                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${colors.icon} flex items-center justify-center shadow-sm`}>
                                    <span className="text-white text-[11px] font-bold uppercase">
                                        {v.key.slice(0, 2)}
                                    </span>
                                </div>

                                {/* 变量信息 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{v.key}</span>
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className={`text-[9px] h-4 ${colors.bg} ${colors.text} capitalize`}
                                        >
                                            {v.type}
                                        </Chip>
                                    </div>
                                    <div className="text-[10px] text-foreground/50 mt-0.5 truncate">
                                        {v.name}
                                    </div>
                                </div>

                                {/* 引用提示 */}
                                <div className="hidden group-hover:flex items-center mr-2">
                                    <code className="text-[9px] px-1.5 py-0.5 rounded bg-content3/80 text-foreground/60 font-mono">
                                        {`{{${v.key}}}`}
                                    </code>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip content="编辑">
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            className="h-7 w-7 text-foreground/50 hover:text-primary hover:bg-primary/10"
                                            onPress={() => handleEditVariable(v)}
                                        >
                                            <Pencil size={12} />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content="删除">
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            className="h-7 w-7 text-foreground/50 hover:text-danger hover:bg-danger/10"
                                            onPress={() => handleDeleteVariable(v.key)}
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    </Tooltip>
                                </div>

                                {/* 序号标识 */}
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-gradient-to-b from-primary/60 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                {editingVar ? "编辑变量" : "添加变量"}
                            </ModalHeader>
                            <ModalBody>
                                <Input
                                    label="变量 Key"
                                    placeholder="例如：topic"
                                    value={varKey}
                                    onValueChange={setVarKey}
                                    description="在 Prompt 中通过 {{key}} 引用"
                                />
                                <Input
                                    label="变量名称"
                                    placeholder="例如：主题"
                                    value={varName}
                                    onValueChange={setVarName}
                                />
                                <Select
                                    label="变量类型"
                                    selectedKeys={[varType]}
                                    onChange={(e) => setVarType(e.target.value as any)}
                                >
                                    <SelectItem key="string" value="string">文本 (String)</SelectItem>
                                    <SelectItem key="number" value="number">数字 (Number)</SelectItem>
                                    <SelectItem key="select" value="select">下拉选项 (Select)</SelectItem>
                                </Select>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    取消
                                </Button>
                                <Button color="primary" onPress={handleSaveVariable}>
                                    保存
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
