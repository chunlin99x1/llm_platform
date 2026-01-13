import {
    Button,
    Input
} from "@heroui/react";
import {
    Plus,
    Edit3,
    Trash2,
    Variable
} from "lucide-react";
import { useState, useMemo } from "react";
import { VariableModal } from "../modals/variable-modal";
import { useWorkflowContext } from "@/context/workflow-context";
import { getSystemVariables } from "../system-variables";

export function StartNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    const { isChatflow } = useWorkflowContext();
    const sysVars = useMemo(() => getSystemVariables(isChatflow), [isChatflow]);

    const [isVarModalOpen, setIsVarModalOpen] = useState(false);
    const [editingVariable, setEditingVariable] = useState<any>(null);
    const [editingVariableIndex, setEditingVariableIndex] = useState(-1);

    const onVarModalOpenChange = () => setIsVarModalOpen(!isVarModalOpen);

    return (
        <section className="flex flex-col gap-3">
            {/* 变量管理模态框 */}
            <VariableModal
                isOpen={isVarModalOpen}
                onOpenChange={onVarModalOpenChange}
                initialData={editingVariable}
                onSave={(newVar) => {
                    const vars = [...(selectedNode.data?.variables || [])];
                    if (editingVariableIndex >= 0) {
                        vars[editingVariableIndex] = newVar;
                    } else {
                        vars.push(newVar);
                    }
                    updateSelectedNode({ variables: vars });
                    onVarModalOpenChange();
                }}
            />

            {/* 输入字段标题和添加按钮 */}
            <div className="flex items-center justify-between px-1">
                <div className="text-[11px] font-semibold text-foreground">输入字段</div>
                <Button
                    size="sm"
                    variant="light"
                    className="h-6 px-2 text-[10px] text-primary"
                    onPress={() => {
                        setEditingVariable(null);
                        setEditingVariableIndex(-1);
                        onVarModalOpenChange();
                    }}
                >
                    <Plus size={12} className="mr-1" />
                    添加
                </Button>
            </div>

            {/* 变量列表表头 */}
            <div className="flex items-center px-3 py-1 bg-content2/50 rounded-t-lg border-b border-divider text-[10px] text-foreground-400 font-medium">
                <span className="flex-1">字段名</span>
                <span className="w-16">类型</span>
                <span className="w-8 text-center">必填</span>
                <span className="w-10 text-center">操作</span>
            </div>

            {/* 用户变量列表 */}
            <div className="flex flex-col border-x border-b border-divider rounded-b-lg divide-y divide-divider bg-content1/30">
                {(selectedNode.data?.variables || []).length === 0 && (
                    <div className="py-4 text-center text-[10px] text-foreground-400">
                        暂无输入变量，点击右上角添加
                    </div>
                )}
                {(selectedNode.data?.variables || []).map((v: any, index: number) => (
                    <div
                        key={index}
                        className="flex items-center px-3 h-8 hover:bg-content2/50 transition-colors group"
                    >
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <Variable size={10} className="text-primary/70 shrink-0" />
                            <span className="text-[11px] font-mono text-foreground-700 truncate">{v.name}</span>
                        </div>
                        <div className="w-16 text-[10px] text-foreground-500 truncate">{v.type}</div>
                        <div className="w-8 flex justify-center">
                            {v.required && <div className="w-1.5 h-1.5 rounded-full bg-danger" />}
                        </div>
                        <div className="w-10 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="h-5 w-5 min-w-5 text-foreground-400 hover:text-primary"
                                onPress={() => {
                                    setEditingVariable(v);
                                    setEditingVariableIndex(index);
                                    onVarModalOpenChange();
                                }}
                            >
                                <Edit3 size={10} />
                            </Button>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="h-5 w-5 min-w-5 text-foreground-400 hover:text-danger"
                                onPress={() => {
                                    const vars = [...(selectedNode.data?.variables || [])];
                                    vars.splice(index, 1);
                                    updateSelectedNode({ variables: vars });
                                }}
                            >
                                <Trash2 size={10} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-divider my-1" />

            {/* 系统变量 - 动态渲染 */}
            <div className="space-y-1">
                <div className="text-[10px] font-medium text-foreground-400 mb-1 px-1">系统变量</div>
                <div className="grid grid-cols-2 gap-2">
                    {sysVars.map((v) => (
                        <div key={v.key} className="flex h-7 items-center justify-between rounded border border-divider bg-content2/30 px-2">
                            <span className="text-[10px] font-mono text-foreground-500 truncate">{v.key}</span>
                            <span className="text-[9px] text-foreground-400">{v.type}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
