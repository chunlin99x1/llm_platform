/**
 * Document Extractor 节点配置面板
 * 
 * 配置文档提取
 */

import { Input } from "@heroui/react";
import { FileText } from "lucide-react";

export function DocumentExtractorNodeConfig({
    selectedNode,
    updateSelectedNode
}: {
    selectedNode: any;
    updateSelectedNode: (patch: Record<string, any>) => void;
}) {
    return (
        <section className="flex flex-col gap-3">
            <div className="text-[10px] font-bold text-foreground-500 flex items-center gap-1.5 uppercase tracking-wide px-1">
                <FileText size={10} />
                文档提取
            </div>

            <Input
                label="文件变量"
                labelPlacement="outside"
                variant="bordered"
                size="sm"
                placeholder="{{start.file}}"
                value={selectedNode.data?.variable || ""}
                onValueChange={(v) => updateSelectedNode({ variable: v })}
                classNames={{
                    input: "font-mono text-[11px]",
                    label: "text-[10px]",
                    inputWrapper: "h-9"
                }}
            />

            <div className="text-[9px] text-gray-400 px-1 space-y-1">
                <p>支持的格式：</p>
                <ul className="list-disc list-inside space-y-0.5">
                    <li>文本文件: .txt, .md, .csv</li>
                    <li>PDF 文档: .pdf</li>
                    <li>Word 文档: .docx</li>
                    <li>HTML 页面: .html, .htm</li>
                </ul>
            </div>
        </section>
    );
}
