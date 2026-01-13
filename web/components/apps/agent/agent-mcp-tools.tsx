import { useState } from "react";
import {
    Plus,
    Settings,
    Trash2,
    Link,
    Server,
} from "lucide-react";
import {
    Button,
    Chip,
    Input,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from "@heroui/react";
import { toast } from "sonner";
import type { MCPServer } from "@/lib/types";

interface AgentMCPToolsProps {
    mcpServers: MCPServer[];
    setMcpServers: React.Dispatch<React.SetStateAction<MCPServer[]>>;
}

export function AgentMCPTools({ mcpServers, setMcpServers }: AgentMCPToolsProps) {
    const { isOpen: isMCPOpen, onOpen: onMCPOpen, onOpenChange: onMCPOpenChange } = useDisclosure();
    const [editingMCPServer, setEditingMCPServer] = useState<MCPServer | null>(null);
    const [mcpName, setMcpName] = useState("");
    const [mcpUrl, setMcpUrl] = useState("");
    const [mcpSaving, setMcpSaving] = useState(false);

    // MCP Operations
    const handleAddMCPServer = () => {
        setEditingMCPServer(null);
        setMcpName("");
        setMcpUrl("");
        onMCPOpen();
    };

    const handleEditMCPServer = (server: MCPServer) => {
        setEditingMCPServer(server);
        setMcpName(server.name);
        setMcpUrl(server.url);
        onMCPOpen();
    };

    const handleSaveMCPServer = async () => {
        if (!mcpName || !mcpUrl) return;

        setMcpSaving(true);
        try {
            // Fetch tools from the MCP server
            let tools = [];
            try {
                // 使用 /api/mcp/tools 路径，匹配后端配置（去掉了 /v1）
                const resp = await fetch("/api/mcp/tools", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: mcpUrl }),
                });

                if (resp.ok) {
                    tools = await resp.json();
                    toast.success(`成功连接，获取到 ${tools.length} 个工具`);
                } else {
                    const err = await resp.json();
                    toast.error(`连接失败: ${err.detail || "未知错误"}`);
                    setMcpSaving(false);
                    return;
                }
            } catch (e) {
                console.error("Failed to fetch MCP tools:", e);
                toast.error("连接 MCP 服务器失败");
                setMcpSaving(false);
                return;
            }

            const newServer: MCPServer = {
                id: editingMCPServer?.id || Math.random().toString(36).substring(7),
                name: mcpName,
                url: mcpUrl,
                status: "connected",
                tools: tools
            };

            if (editingMCPServer) {
                setMcpServers(mcpServers.map(s => s.id === editingMCPServer.id ? newServer : s));
            } else {
                setMcpServers([...mcpServers, newServer]);
            }
            onMCPOpenChange();
        } finally {
            setMcpSaving(false);
        }
    };

    const handleDeleteMCPServer = (id: string) => {
        setMcpServers(mcpServers.filter(s => s.id !== id));
    };

    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">已连接的服务器</span>
                <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    className="h-6 w-6 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                    onPress={handleAddMCPServer}
                >
                    <Plus size={14} />
                </Button>
            </div>

            <div className="text-[10px] text-foreground/50 mb-4 px-1 leading-relaxed">
                通过 Model Context Protocol 协议接入外部工具服务器。
            </div>

            {mcpServers.length === 0 ? (
                <div
                    className="group flex flex-col items-center justify-center py-6 px-4 rounded-xl border-1 border-dashed border-divider hover:border-blue-400/50 hover:bg-blue-500/[0.02] cursor-pointer transition-all"
                    onClick={handleAddMCPServer}
                >
                    <Server size={14} className="text-foreground/20 group-hover:text-blue-500/40 mb-1.5 transition-colors" />
                    <div className="text-[10px] text-foreground/40 group-hover:text-blue-500/60 font-medium">配置 MCP 服务器</div>
                </div>
            ) : (
                <div className="space-y-2">
                    {mcpServers.map((server) => (
                        <div
                            key={server.id}
                            className="group relative flex flex-col gap-0 p-3 rounded-xl bg-content2/30 border border-transparent hover:border-blue-500/30 hover:bg-white hover:shadow-sm transition-all duration-200"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <Link size={14} className="text-blue-500" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-bold text-foreground truncate">{server.name}</span>
                                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                                    </div>
                                    <div className="text-[9px] text-foreground/40 font-mono truncate flex items-center gap-2">
                                        <span>{server.url}</span>
                                        {server.tools && server.tools.length > 0 && (
                                            <span className="px-1 py-px bg-blue-50 text-blue-600 rounded text-[9px]">
                                                {server.tools.length} 工具
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="h-6 w-6 min-w-0 text-foreground/40 hover:text-blue-600"
                                        onPress={() => handleEditMCPServer(server)}
                                    >
                                        <Settings size={12} />
                                    </Button>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        className="h-6 w-6 min-w-0 text-foreground/40 hover:text-danger"
                                        onPress={() => handleDeleteMCPServer(server.id)}
                                    >
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            </div>

                            {server.tools && server.tools.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-divider/50 w-full">
                                    <div className="grid grid-cols-1 gap-2">
                                        {server.tools.map((tool, idx) => (
                                            <div key={idx} className="bg-white/50 dark:bg-black/20 p-2 rounded border border-gray-100 dark:border-gray-800 flex flex-col gap-0.5">
                                                <div className="text-[10px] font-semibold text-foreground/80 flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                                                    {tool.name}
                                                </div>
                                                {tool.description && (
                                                    <div className="text-[9px] text-foreground/50 truncate pl-2.5">
                                                        {tool.description}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isMCPOpen} onOpenChange={onMCPOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                {editingMCPServer ? "编辑 MCP 服务器" : "添加 MCP 服务器"}
                            </ModalHeader>
                            <ModalBody>
                                <Input
                                    label="服务器名称"
                                    placeholder="例如：Weather Service"
                                    value={mcpName}
                                    onValueChange={setMcpName}
                                />
                                <Input
                                    label="Server URL"
                                    placeholder="http://localhost:8000/sse"
                                    value={mcpUrl}
                                    onValueChange={setMcpUrl}
                                    description="MCP Server 的 SSE 入口地址"
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    取消
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleSaveMCPServer}
                                    isLoading={mcpSaving}
                                >
                                    连接并保存
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
