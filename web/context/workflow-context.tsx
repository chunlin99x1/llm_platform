/**
 * 工作流上下文
 * 
 * 提供应用模式（workflow/chatflow）的统一上下文，
 * 让所有子组件可以根据模式进行差异化渲染，无需创建不同组件。
 */

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AppMode } from "@/lib/types";
import {
    APP_MODE_CONFIG,
    NODE_TYPE_CONFIGS,
    NODE_CATEGORY_LABELS,
    getAvailableNodeTypes,
    getNodeTypesByCategory,
    type NodeTypeConfig
} from "@/lib/app-mode-config";

// ============== 上下文类型 ==============

interface WorkflowContextValue {
    /** 应用模式 */
    appMode: AppMode;

    /** 是否为 Chatflow */
    isChatflow: boolean;

    /** 是否为 Workflow */
    isWorkflow: boolean;

    /** 应用模式配置 */
    modeConfig: typeof APP_MODE_CONFIG[AppMode];

    /** 可用节点列表 */
    availableNodes: NodeTypeConfig[];

    /** 按分类的节点列表 */
    nodesByCategory: Record<string, NodeTypeConfig[]>;

    /** 终止节点类型 (end/answer) */
    terminatorNodeType: string;

    /** 是否支持会话变量 */
    supportsConversationVariables: boolean;

    /** 系统变量列表 */
    systemVariables: string[];

    /** 检查节点是否可用 */
    isNodeAvailable: (nodeType: string) => boolean;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

// ============== Provider ==============

interface WorkflowProviderProps {
    appMode: AppMode;
    children: ReactNode;
}

export function WorkflowProvider({ appMode, children }: WorkflowProviderProps) {
    const value = useMemo<WorkflowContextValue>(() => {
        const modeConfig = APP_MODE_CONFIG[appMode];
        const availableNodes = getAvailableNodeTypes(appMode);
        const nodesByCategory = getNodeTypesByCategory(appMode);
        const availableNodeTypes = new Set(availableNodes.map(n => n.type));

        return {
            appMode,
            isChatflow: appMode === "chatflow",
            isWorkflow: appMode === "workflow",
            modeConfig,
            availableNodes,
            nodesByCategory,
            terminatorNodeType: modeConfig.terminatorNode,
            supportsConversationVariables: modeConfig.supportsConversationVariables,
            systemVariables: modeConfig.systemVariables,
            isNodeAvailable: (nodeType: string) => availableNodeTypes.has(nodeType),
        };
    }, [appMode]);

    return (
        <WorkflowContext.Provider value={value}>
            {children}
        </WorkflowContext.Provider>
    );
}

// ============== Hook ==============

export function useWorkflowContext(): WorkflowContextValue {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error("useWorkflowContext must be used within a WorkflowProvider");
    }
    return context;
}

/**
 * 可选的 Hook：在没有 Provider 时提供回退值
 */
export function useWorkflowContextOptional(): WorkflowContextValue | null {
    return useContext(WorkflowContext);
}

// ============== 条件渲染组件 ==============

interface ShowIfChatflowProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/** 仅在 Chatflow 模式下渲染 */
export function ShowIfChatflow({ children, fallback = null }: ShowIfChatflowProps) {
    const { isChatflow } = useWorkflowContext();
    return isChatflow ? <>{children}</> : <>{fallback}</>;
}

interface ShowIfWorkflowProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/** 仅在 Workflow 模式下渲染 */
export function ShowIfWorkflow({ children, fallback = null }: ShowIfWorkflowProps) {
    const { isWorkflow } = useWorkflowContext();
    return isWorkflow ? <>{children}</> : <>{fallback}</>;
}

interface ShowIfNodeAvailableProps {
    nodeType: string;
    children: ReactNode;
}

/** 仅在节点可用时渲染 */
export function ShowIfNodeAvailable({ nodeType, children }: ShowIfNodeAvailableProps) {
    const { isNodeAvailable } = useWorkflowContext();
    return isNodeAvailable(nodeType) ? <>{children}</> : null;
}

// ============== 导出分类标签 ==============

export { NODE_CATEGORY_LABELS };
