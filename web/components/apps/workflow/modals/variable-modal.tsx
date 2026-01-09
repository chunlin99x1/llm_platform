import { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Select,
    SelectItem,
    Checkbox
} from "@heroui/react";

export function VariableModal({
    isOpen,
    onOpenChange,
    initialData,
    onSave
}: {
    isOpen: boolean;
    onOpenChange: () => void;
    initialData: any | null;
    onSave: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        type: "string",
        required: true,
        description: "",
        ...initialData
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: "",
                type: "string",
                required: true,
                description: "",
                ...initialData
            });
        }
    }, [isOpen, initialData]);

    const variableTypes = [
        { type: 'string', label: '文本 (String)' },
        { type: 'number', label: '数字 (Number)' },
        { type: 'object', label: '对象 (Object)' },
        { type: 'array[string]', label: '文本列表' },
        { type: 'file', label: '单文件 (File)' },
        { type: 'array[file]', label: '文件列表' },
    ];

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-[13px]">
                            {initialData ? "编辑变量" : "添加变量"}
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <div className="flex flex-col gap-4">
                                <Input
                                    label="变量名"
                                    labelPlacement="outside"
                                    placeholder="例如: query"
                                    value={formData.name}
                                    onValueChange={(v) => setFormData({ ...formData, name: v })}
                                    variant="bordered"
                                    size="sm"
                                    classNames={{ label: "text-[11px]", input: "text-[12px] font-mono" }}
                                />
                                <Select
                                    label="变量类型"
                                    labelPlacement="outside"
                                    placeholder="选择类型"
                                    selectedKeys={[formData.type]}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    variant="bordered"
                                    size="sm"
                                    classNames={{ label: "text-[11px]", value: "text-[12px]" }}
                                >
                                    {variableTypes.map((t) => (
                                        <SelectItem key={t.type} textValue={t.label}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Checkbox
                                    isSelected={formData.required}
                                    onValueChange={(v) => setFormData({ ...formData, required: v })}
                                    size="sm"
                                >
                                    <span className="text-[12px]">必填项</span>
                                </Checkbox>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" size="sm" onPress={onClose} className="text-[11px]">
                                取消
                            </Button>
                            <Button
                                color="primary"
                                size="sm"
                                onPress={() => {
                                    if (!formData.name) return;
                                    onSave(formData);
                                    onClose();
                                }}
                                className="text-[11px]"
                            >
                                确定
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
