/**
 * 系统变量配置
 * 
 * 根据应用模式（workflow/chatflow）提供不同的系统变量。
 */

"use client";

import type { VarType } from "../workflow-types";


// ============== 系统变量定义 ==============

interface SystemVariable {
    key: string;
    type: VarType;
    description: string;
}

// 通用系统变量
const COMMON_SYSTEM_VARIABLES: SystemVariable[] = [
    { key: "sys.files", type: "array[file]" as VarType, description: "上传的文件列表" },
    { key: "sys.user_id", type: "string", description: "用户 ID" },
    { key: "sys.app_id", type: "string", description: "应用 ID" },
    { key: "sys.workflow_id", type: "string", description: "工作流 ID" },
    { key: "sys.workflow_run_id", type: "string", description: "工作流运行 ID" },
];

// Chatflow 专属系统变量
const CHATFLOW_SYSTEM_VARIABLES: SystemVariable[] = [
    { key: "sys.query", type: "string", description: "用户输入消息" },
    { key: "sys.conversation_id", type: "string", description: "会话 ID" },
    { key: "sys.dialogue_count", type: "number", description: "对话轮次" },
];

// Workflow 专属系统变量（目前无）
const WORKFLOW_SYSTEM_VARIABLES: SystemVariable[] = [];

// ============== 获取系统变量 ==============

export function getSystemVariables(isChatflow: boolean): SystemVariable[] {
    if (isChatflow) {
        return [...CHATFLOW_SYSTEM_VARIABLES, ...COMMON_SYSTEM_VARIABLES];
    }
    return [...WORKFLOW_SYSTEM_VARIABLES, ...COMMON_SYSTEM_VARIABLES];
}

// ============== 更新 NODE_OUTPUT_VARIABLES ==============

/**
 * 根据应用模式获取 Start 节点的输出变量
 */
export function getStartNodeVariables(isChatflow: boolean): { key: string; type: VarType; description: string }[] {
    const systemVars = getSystemVariables(isChatflow);

    // 基础输入变量
    const baseVars = [
        { key: "input", type: "string" as VarType, description: "用户输入" },
    ];

    // 如果是 Chatflow，添加 query 变量
    if (isChatflow) {
        baseVars.push({ key: "query", type: "string" as VarType, description: "用户消息" });
    }

    return [...baseVars, ...systemVars];
}

// ============== 会话变量支持 ==============

export interface ConversationVariable {
    id: string;
    name: string;
    type: VarType;
    defaultValue?: unknown;
    description?: string;
}

/**
 * Chatflow 专属：会话变量配置
 */
export function isConversationVariablesSupported(isChatflow: boolean): boolean {
    return isChatflow;
}
