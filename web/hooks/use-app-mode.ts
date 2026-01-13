/**
 * 应用模式相关 Hooks
 */

import { useMemo } from "react";
import type { AppMode } from "@/lib/types";
import {
    getAvailableNodeTypes,
    getNodeTypesByCategory,
    APP_MODE_CONFIG,
    type NodeTypeConfig
} from "@/lib/app-mode-config";

/**
 * 获取当前应用模式的节点配置
 */
export function useAvailableNodes(appMode: AppMode) {
    const availableNodes = useMemo(() => {
        return getAvailableNodeTypes(appMode);
    }, [appMode]);

    const nodesByCategory = useMemo(() => {
        return getNodeTypesByCategory(appMode);
    }, [appMode]);

    return {
        availableNodes,
        nodesByCategory,
    };
}

/**
 * 获取应用模式配置
 */
export function useAppModeConfig(appMode: AppMode) {
    return useMemo(() => {
        return APP_MODE_CONFIG[appMode];
    }, [appMode]);
}

/**
 * 判断是否为 Chatflow 模式
 */
export function useIsChatflow(appMode: AppMode) {
    return appMode === "chatflow";
}

/**
 * 判断是否为 Workflow 模式
 */
export function useIsWorkflow(appMode: AppMode) {
    return appMode === "workflow";
}
