import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input
} from "@heroui/react";

export function ModelParamsModal({
    isOpen,
    onOpenChange,
    data,
    onChange,
    modelConfig
}: {
    isOpen: boolean;
    onOpenChange: () => void;
    data: any;
    onChange: (patch: Record<string, any>) => void;
    modelConfig?: any;
}) {
    // Default parameters if no config provided
    const defaultParams = [
        { label: "Temperature", key: "temperature", min: 0, max: 2, step: 0.1, desc: ["精确", "创意"], default: 0.7 },
        { label: "Top P", key: "topP", min: 0, max: 1, step: 0.05, desc: ["0", "1"], default: 1.0 },
        { label: "Presence Penalty", key: "presencePenalty", min: 0, max: 2, step: 0.1, desc: ["0", "2"], default: 0 },
        { label: "Frequency Penalty", key: "frequencyPenalty", min: 0, max: 2, step: 0.1, desc: ["0", "2"], default: 0 },
        { label: "Max Tokens", key: "maxTokens", min: 1, max: 8192, step: 1, desc: ["1", "8192"], default: 2048, isInt: true },
    ];

    // Generate parameters list from modelConfig if available
    const getParams = () => {
        // Always start with default parameters
        const merged = [...defaultParams];

        if (!modelConfig || Object.keys(modelConfig).length === 0) return merged;

        // Merge or add parameters from config
        Object.entries(modelConfig).forEach(([key, conf]: [string, any]) => {
            const index = merged.findIndex(p => p.key === key);

            if (index !== -1) {
                // Override existing parameter
                merged[index] = { ...merged[index], ...conf };
            } else {
                // Add new parameter with smart defaults
                merged.push({
                    label: conf.label || key.charAt(0).toUpperCase() + key.slice(1),
                    key: key,
                    min: conf.min ?? 0,
                    max: conf.max ?? 1,
                    step: conf.step ?? (Number.isInteger(conf.min) && Number.isInteger(conf.max) ? 1 : 0.1),
                    desc: conf.desc || [String(conf.min ?? 0), String(conf.max ?? 1)],
                    default: conf.default ?? conf.min ?? 0,
                    isInt: conf.isInt || (Number.isInteger(conf.min) && Number.isInteger(conf.max))
                });
            }
        });

        return merged;
    };

    const params = getParams();

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-[13px]">模型参数配置</ModalHeader>
                        <ModalBody className="pb-6">
                            <div className="flex flex-col gap-5">
                                {params.map((param) => (
                                    <div key={param.key} className="group">
                                        <div className="flex items-center justify-between mb-2 h-6">
                                            <span className="text-[12px] font-medium text-foreground-700">{param.label}</span>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    size="sm"
                                                    variant="flat"
                                                    type="number"
                                                    value={String(data?.[param.key] ?? param.default)}
                                                    onValueChange={(v) => {
                                                        let val = parseFloat(v);
                                                        if (isNaN(val)) return;
                                                        if (param.isInt) val = Math.floor(val);
                                                        // Clamp value
                                                        if (val < param.min) val = param.min;
                                                        if (val > param.max) val = param.max;
                                                        onChange({ [param.key]: val });
                                                    }}
                                                    classNames={{
                                                        base: "w-16",
                                                        input: "text-[11px] font-mono text-right p-0",
                                                        inputWrapper: "h-7 min-h-7 px-2 bg-content2/50 transition-colors shadow-none"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={param.min}
                                                max={param.max}
                                                step={param.step}
                                                value={data?.[param.key] ?? param.default}
                                                onChange={(e) => onChange({ [param.key]: param.isInt ? parseInt(e.target.value) : parseFloat(e.target.value) })}
                                                className="flex-1 h-1.5 bg-content2 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-600 transition-all"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-foreground-400 mt-1.5">
                                            <span>{param.desc[0]}</span>
                                            <span>{param.desc[1]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" size="sm" onPress={onClose} className="text-[11px]">
                                完成
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
