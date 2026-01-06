"use client";

import { useCallback, useMemo } from "react";
import type { Node, Edge, Connection } from "reactflow";

// ============== 连接验证 ==============

export interface ConnectionValidation {
    isValid: boolean;
    message?: string;
}

// 定义节点类型可以连接到的目标节点类型
const VALID_CONNECTIONS: Record<string, string[]> = {
    start: ["llm", "code", "http", "condition", "variable", "iteration", "template", "knowledge", "classifier"],
    llm: ["llm", "code", "http", "condition", "variable", "iteration", "template", "answer", "end", "classifier"],
    code: ["llm", "code", "http", "condition", "variable", "iteration", "template", "answer", "end", "classifier"],
    http: ["llm", "code", "http", "condition", "variable", "iteration", "template", "answer", "end", "classifier"],
    condition: ["llm", "code", "http", "condition", "variable", "iteration", "template", "answer", "end"],
    variable: ["llm", "code", "http", "condition", "variable", "iteration", "template", "answer", "end"],
    iteration: ["llm", "code", "http", "condition", "variable", "answer", "end"],
    template: ["llm", "code", "http", "condition", "variable", "answer", "end"],
    knowledge: ["llm", "code", "http", "condition", "variable", "answer", "end"],
    classifier: ["llm", "code", "http", "condition", "variable", "answer", "end"],
    answer: ["end"],
    end: [],
};

// 不能作为源节点的类型
const NO_SOURCE_TYPES = ["end"];

// 不能作为目标节点的类型
const NO_TARGET_TYPES = ["start"];

/**
 * 验证连接是否有效
 */
export function validateConnection(
    connection: Connection,
    nodes: Node[],
    edges: Edge[]
): ConnectionValidation {
    const { source, target } = connection;

    if (!source || !target) {
        return { isValid: false, message: "源节点或目标节点不存在" };
    }

    // 不能连接到自己
    if (source === target) {
        return { isValid: false, message: "不能连接到自身" };
    }

    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    if (!sourceNode || !targetNode) {
        return { isValid: false, message: "节点不存在" };
    }

    const sourceType = sourceNode.type || "";
    const targetType = targetNode.type || "";

    // 检查源节点是否可以有输出
    if (NO_SOURCE_TYPES.includes(sourceType)) {
        return { isValid: false, message: `${sourceType} 节点不能有输出连接` };
    }

    // 检查目标节点是否可以有输入
    if (NO_TARGET_TYPES.includes(targetType)) {
        return { isValid: false, message: `${targetType} 节点不能有输入连接` };
    }

    // 检查连接类型是否有效
    const validTargets = VALID_CONNECTIONS[sourceType] || [];
    if (!validTargets.includes(targetType)) {
        return { isValid: false, message: `${sourceType} 不能连接到 ${targetType}` };
    }

    // 检查是否已存在相同连接
    const existingEdge = edges.find(e => e.source === source && e.target === target);
    if (existingEdge) {
        return { isValid: false, message: "连接已存在" };
    }

    // 检查是否会形成循环
    if (wouldCreateCycle(source, target, edges)) {
        return { isValid: false, message: "不能创建循环连接" };
    }

    return { isValid: true };
}

/**
 * 检查添加连接是否会形成循环
 */
function wouldCreateCycle(source: string, target: string, edges: Edge[]): boolean {
    // 使用 DFS 检查从 target 是否能到达 source
    const visited = new Set<string>();
    const stack = [target];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) {
            return true;
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);

        // 找到从 current 出发的所有边
        edges.forEach(edge => {
            if (edge.source === current && !visited.has(edge.target)) {
                stack.push(edge.target);
            }
        });
    }

    return false;
}

// ============== 辅助线 ==============

export interface HelpLine {
    type: "horizontal" | "vertical";
    position: number;
}

/**
 * 计算辅助线位置（用于节点对齐）
 */
export function calculateHelpLines(
    draggedNode: Node,
    nodes: Node[],
    threshold: number = 5
): HelpLine[] {
    const helpLines: HelpLine[] = [];
    const { x, y } = draggedNode.position;
    const width = draggedNode.width || 200;
    const height = draggedNode.height || 100;

    // 拖拽节点的关键点
    const draggedPoints = {
        left: x,
        centerX: x + width / 2,
        right: x + width,
        top: y,
        centerY: y + height / 2,
        bottom: y + height,
    };

    nodes.forEach(node => {
        if (node.id === draggedNode.id) return;

        const nodeWidth = node.width || 200;
        const nodeHeight = node.height || 100;

        // 其他节点的关键点
        const nodePoints = {
            left: node.position.x,
            centerX: node.position.x + nodeWidth / 2,
            right: node.position.x + nodeWidth,
            top: node.position.y,
            centerY: node.position.y + nodeHeight / 2,
            bottom: node.position.y + nodeHeight,
        };

        // 垂直对齐检查
        if (Math.abs(draggedPoints.left - nodePoints.left) < threshold) {
            helpLines.push({ type: "vertical", position: nodePoints.left });
        }
        if (Math.abs(draggedPoints.centerX - nodePoints.centerX) < threshold) {
            helpLines.push({ type: "vertical", position: nodePoints.centerX });
        }
        if (Math.abs(draggedPoints.right - nodePoints.right) < threshold) {
            helpLines.push({ type: "vertical", position: nodePoints.right });
        }

        // 水平对齐检查
        if (Math.abs(draggedPoints.top - nodePoints.top) < threshold) {
            helpLines.push({ type: "horizontal", position: nodePoints.top });
        }
        if (Math.abs(draggedPoints.centerY - nodePoints.centerY) < threshold) {
            helpLines.push({ type: "horizontal", position: nodePoints.centerY });
        }
        if (Math.abs(draggedPoints.bottom - nodePoints.bottom) < threshold) {
            helpLines.push({ type: "horizontal", position: nodePoints.bottom });
        }
    });

    // 去重
    const uniqueLines: HelpLine[] = [];
    helpLines.forEach(line => {
        const exists = uniqueLines.some(
            l => l.type === line.type && l.position === line.position
        );
        if (!exists) {
            uniqueLines.push(line);
        }
    });

    return uniqueLines;
}

// ============== 吸附逻辑 ==============

export interface SnapResult {
    x: number;
    y: number;
    snapped: boolean;
}

/**
 * 计算吸附后的位置
 */
export function snapToGrid(
    position: { x: number; y: number },
    gridSize: number = 10
): SnapResult {
    return {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize,
        snapped: true,
    };
}

/**
 * 吸附到其他节点
 */
export function snapToNodes(
    draggedNode: Node,
    nodes: Node[],
    threshold: number = 10
): SnapResult {
    let { x, y } = draggedNode.position;
    let snapped = false;
    const width = draggedNode.width || 200;
    const height = draggedNode.height || 100;

    nodes.forEach(node => {
        if (node.id === draggedNode.id) return;

        const nodeWidth = node.width || 200;
        const nodeHeight = node.height || 100;

        // 左边对齐
        if (Math.abs(x - node.position.x) < threshold) {
            x = node.position.x;
            snapped = true;
        }
        // 右边对齐
        if (Math.abs(x + width - (node.position.x + nodeWidth)) < threshold) {
            x = node.position.x + nodeWidth - width;
            snapped = true;
        }
        // 顶部对齐
        if (Math.abs(y - node.position.y) < threshold) {
            y = node.position.y;
            snapped = true;
        }
        // 底部对齐
        if (Math.abs(y + height - (node.position.y + nodeHeight)) < threshold) {
            y = node.position.y + nodeHeight - height;
            snapped = true;
        }
    });

    return { x, y, snapped };
}

// ============== Hook: 使用连接验证 ==============

export function useConnectionValidation(nodes: Node[], edges: Edge[]) {
    const isValidConnection = useCallback(
        (connection: Connection): boolean => {
            const result = validateConnection(connection, nodes, edges);
            return result.isValid;
        },
        [nodes, edges]
    );

    return { isValidConnection };
}
