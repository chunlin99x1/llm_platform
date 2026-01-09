import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Input,
    Textarea
} from "@heroui/react";
import {
    Globe
} from "lucide-react";

export function HTTPNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <Globe size={10} />
                HTTP 请求
            </div>
            <div className="flex gap-2">
                <Dropdown>
                    <DropdownTrigger>
                        <Button size="sm" variant="flat" color="primary" className="h-9 min-w-[70px] text-[10px] font-bold">
                            {selectedNode.data?.method || "GET"}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="方法选择"
                        onAction={(key) => updateSelectedNode({ method: key as string })}
                    >
                        <DropdownItem key="GET">GET</DropdownItem>
                        <DropdownItem key="POST">POST</DropdownItem>
                        <DropdownItem key="PUT">PUT</DropdownItem>
                        <DropdownItem key="DELETE">DELETE</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
                <Input
                    variant="bordered"
                    size="sm"
                    placeholder="https://api.example.com/..."
                    value={selectedNode.data?.url || ""}
                    onValueChange={(v) => updateSelectedNode({ url: v })}
                    classNames={{ input: "text-[11px]", inputWrapper: "h-9" }}
                />
            </div>
            <Textarea
                label="请求体 (JSON)"
                labelPlacement="outside"
                variant="bordered"
                minRows={4}
                placeholder='{"key": "value"}'
                value={selectedNode.data?.body || ""}
                onValueChange={(v) => updateSelectedNode({ body: v })}
                classNames={{ input: "font-mono text-[11px]", label: "text-[10px]" }}
            />
        </section>
    );
}
