"use client";

import type { Node } from "reactflow";

// ============== 变量类型定义 ==============

export type VarType =
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "array[string]"
    | "array[number]"
    | "array[object]"
    | "file"
    | "any";

export interface Variable {
    nodeId: string;
    nodeName: string;
    variableKey: string;
    variableType: VarType;
    description?: string;
}

export interface NodeVariable {
    nodeId: string;
    nodeType: string;
    nodeName: string;
    variables: Variable[];
}

// ============== 节点输出变量定义 ==============

export const NODE_OUTPUT_VARIABLES: Record<string, { key: string; type: VarType; description: string }[]> = {
    start: [
        { key: "input", type: "string", description: "用户输入" },
        { key: "sys.user_id", type: "string", description: "用户ID" },
        { key: "sys.conversation_id", type: "string", description: "会话ID" },
    ],
    llm: [
        { key: "text", type: "string", description: "模型输出文本" },
        { key: "usage.total_tokens", type: "number", description: "Token 使用量" },
    ],
    code: [
        { key: "result", type: "any", description: "代码执行结果" },
    ],
    http: [
        { key: "body", type: "any", description: "响应体" },
        { key: "status_code", type: "number", description: "状态码" },
        { key: "headers", type: "object", description: "响应头" },
    ],
    knowledge: [
        { key: "result", type: "array[object]", description: "检索结果" },
    ],
    condition: [
        { key: "result", type: "boolean", description: "条件结果" },
    ],
    variable: [
        { key: "value", type: "any", description: "变量值" },
    ],
    iteration: [
        { key: "output", type: "array", description: "迭代输出列表" },
        { key: "item", type: "any", description: "当前迭代项" },
        { key: "index", type: "number", description: "当前迭代索引" },
    ],
    template: [
        { key: "output", type: "string", description: "模板输出" },
    ],
    classifier: [
        { key: "class_name", type: "string", description: "分类名称" },
    ],
    answer: [],
    end: [],
};

// ============== 变量提取函数 ==============

/**
 * 获取单个节点的输出变量
 */
export function getNodeOutputVariables(node: Node): Variable[] {
    const nodeType = node.type || "";
    const nodeName = node.data?.label || nodeType;
    const nodeId = node.id;

    // 开始节点：从 data.variables 获取动态定义的变量
    if (nodeType === "start") {
        const staticOutputs = NODE_OUTPUT_VARIABLES.start || [];
        const staticVariables = staticOutputs.map(output => ({
            nodeId,
            nodeName,
            variableKey: output.key,
            variableType: output.type,
            description: output.description,
        }));

        // 添加用户定义的变量
        const userVariables = (node.data?.variables || []).map((v: { name: string; type: string }) => ({
            nodeId,
            nodeName,
            variableKey: v.name,
            variableType: (v.type as VarType) || "string",
            description: `用户定义变量`,
        }));

        return [...staticVariables, ...userVariables];
    }

    const outputs = NODE_OUTPUT_VARIABLES[nodeType] || [];

    return outputs.map(output => ({
        nodeId,
        nodeName,
        variableKey: output.key,
        variableType: output.type,
        description: output.description,
    }));
}

/**
 * 获取所有上游节点的变量（用于变量选择器）
 */
export function getUpstreamVariables(
    currentNodeId: string,
    nodes: Node[],
    edges: { source: string; target: string }[]
): NodeVariable[] {
    // 找到所有可以到达当前节点的上游节点
    const upstreamNodeIds = new Set<string>();

    function findUpstream(nodeId: string) {
        edges.forEach(edge => {
            if (edge.target === nodeId && !upstreamNodeIds.has(edge.source)) {
                upstreamNodeIds.add(edge.source);
                findUpstream(edge.source);
            }
        });
    }

    findUpstream(currentNodeId);

    // 获取每个上游节点的变量
    const result: NodeVariable[] = [];

    nodes.forEach(node => {
        if (upstreamNodeIds.has(node.id)) {
            const variables = getNodeOutputVariables(node);
            if (variables.length > 0) {
                result.push({
                    nodeId: node.id,
                    nodeType: node.type || "",
                    nodeName: node.data?.label || node.type || "",
                    variables,
                });
            }
        }
    });

    return result;
}

/**
 * 格式化变量引用（用于插入到文本中）
 */
export function formatVariableReference(nodeId: string, variableKey: string): string {
    return `{{${nodeId}.${variableKey}}}`;
}

/**
 * 解析变量引用
 */
export function parseVariableReference(reference: string): { nodeId: string; variableKey: string } | null {
    const match = reference.match(/\{\{(\w+)\.(.+?)\}\}/);
    if (match) {
        return {
            nodeId: match[1],
            variableKey: match[2],
        };
    }
    return null;
}

// ============== 变量类型图标和颜色 ==============

export const VARIABLE_TYPE_CONFIG: Record<VarType, { color: string; bgColor: string; label: string }> = {
    string: { color: "text-green-600", bgColor: "bg-green-50", label: "Str" },
    number: { color: "text-blue-600", bgColor: "bg-blue-50", label: "Num" },
    boolean: { color: "text-purple-600", bgColor: "bg-purple-50", label: "Bool" },
    object: { color: "text-orange-600", bgColor: "bg-orange-50", label: "Obj" },
    array: { color: "text-cyan-600", bgColor: "bg-cyan-50", label: "Arr" },
    "array[string]": { color: "text-cyan-600", bgColor: "bg-cyan-50", label: "Arr[Str]" },
    "array[number]": { color: "text-cyan-600", bgColor: "bg-cyan-50", label: "Arr[Num]" },
    "array[object]": { color: "text-cyan-600", bgColor: "bg-cyan-50", label: "Arr[Obj]" },
    file: { color: "text-pink-600", bgColor: "bg-pink-50", label: "File" },
    any: { color: "text-gray-600", bgColor: "bg-gray-50", label: "Any" },
};
