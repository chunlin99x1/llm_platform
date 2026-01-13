import { useState, useCallback, useMemo } from "react";
import {
    addEdge,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
    type OnConnect,
} from "reactflow";

export function useWorkflowGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [clipboard, setClipboard] = useState<Node | null>(null);

    const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

    const onConnect: OnConnect = useCallback(
        (params) => {
            setEdges((eds) => addEdge({ ...params, type: "smoothstep", animated: true }, eds));
        },
        [setEdges]
    );

    function updateSelectedNode(patch: Record<string, any>) {
        setNodes((prev) =>
            prev.map((n) => {
                if (n.id !== selectedId) return n;
                return { ...n, data: { ...(n.data || {}), ...patch } };
            })
        );
    }

    function addNode(type: string, position?: { x: number; y: number }) {
        const id = `${type}_${Date.now()}`;
        const newNode: Node<any> = {
            id,
            type,
            position: position || { x: 100, y: 100 },
            data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
        };
        if (type === "llm") {
            newNode.data.prompt = "你是一个智能助手。\n用户输入: {{input}}\n请回答用户的问题。";
        }

        setNodes((nds) => nds.concat(newNode));
        setSelectedId(id);
    }

    const handleCopy = useCallback(() => {
        if (selectedNode) {
            setClipboard(JSON.parse(JSON.stringify(selectedNode)));
            console.log("Copied node:", selectedNode.id);
        }
    }, [selectedNode]);

    const handlePaste = useCallback(() => {
        if (clipboard) {
            const newId = `${clipboard.type}_${Date.now()}`;
            const newNode: Node<any> = {
                ...clipboard,
                id: newId,
                position: {
                    x: clipboard.position.x + 50,
                    y: clipboard.position.y + 50,
                },
                data: { ...clipboard.data, label: `${clipboard.data?.label || clipboard.type} (复制)` },
            };
            setNodes((nds) => nds.concat(newNode));
            setSelectedId(newId);
            console.log("Pasted node:", newId);
        }
    }, [clipboard, setNodes]);

    const handleDelete = useCallback(() => {
        if (selectedId) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedId));
            setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
            setSelectedId("");
            console.log("Deleted node:", selectedId);
        }
    }, [selectedId, setNodes, setEdges]);

    return {
        nodes, setNodes, onNodesChange,
        edges, setEdges, onEdgesChange,
        selectedId, setSelectedId,
        selectedNode,
        updateSelectedNode,
        addNode,
        onConnect,
        handleCopy,
        handlePaste,
        handleDelete
    };
}
