/**
 * 变量选择器差异化组件
 * 
 * 统一的变量选择器，根据应用模式自动显示/隐藏会话变量部分。
 */

"use client";

import { useMemo } from "react";
import { ChevronDown, Variable, MessageSquare } from "lucide-react";
import { Button, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { useWorkflowContext, ShowIfChatflow } from "@/context/workflow-context";
import { getSystemVariables, type ConversationVariable } from "./system-variables";
import type { NodeVariable, Variable as VarType } from "../workflow-types";

// ============== 变量选择器 Props ==============

interface VariableSelectorProps {
    /** 上游节点变量 */
    upstreamVariables: NodeVariable[];
    /** 会话变量（仅 Chatflow） */
    conversationVariables?: ConversationVariable[];
    /** 选中回调 */
    onSelect: (variableRef: string) => void;
    /** 触发器样式 */
    triggerClassName?: string;
    /** 占位文本 */
    placeholder?: string;
}

export function VariableSelector({
    upstreamVariables,
    conversationVariables = [],
    onSelect,
    triggerClassName = "",
    placeholder = "选择变量",
}: VariableSelectorProps) {
    const { isChatflow, systemVariables } = useWorkflowContext();

    // 系统变量
    const sysVars = useMemo(() => getSystemVariables(isChatflow), [isChatflow]);

    return (
        <Popover placement="bottom-start">
            <PopoverTrigger>
                <Button
                    variant="bordered"
                    size="sm"
                    className={`flex items-center gap-1 ${triggerClassName}`}
                >
                    <Variable size={14} />
                    <span className="text-xs">{placeholder}</span>
                    <ChevronDown size={12} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
                <div className="max-h-[400px] overflow-y-auto">
                    {/* 系统变量 */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                            系统变量
                        </div>
                        <div className="space-y-0.5">
                            {sysVars.map((v) => (
                                <button
                                    key={v.key}
                                    onClick={() => onSelect(`{{${v.key}}}`)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 text-left transition-colors"
                                >
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 font-mono">
                                        {v.type}
                                    </span>
                                    <span className="text-xs text-gray-700">{v.key}</span>
                                    <span className="text-[10px] text-gray-400 ml-auto">{v.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 会话变量 - 仅 Chatflow */}
                    <ShowIfChatflow>
                        {conversationVariables.length > 0 && (
                            <div className="p-2 border-b border-gray-100">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                                    <MessageSquare size={10} />
                                    会话变量
                                </div>
                                <div className="space-y-0.5">
                                    {conversationVariables.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => onSelect(`{{conversation.${v.name}}}`)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 text-left transition-colors"
                                        >
                                            <span className="text-[10px] px-1 py-0.5 rounded bg-violet-100 text-violet-600 font-mono">
                                                {v.type}
                                            </span>
                                            <span className="text-xs text-gray-700">{v.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ShowIfChatflow>

                    {/* 上游节点变量 */}
                    {upstreamVariables.length > 0 && (
                        <div className="p-2">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                节点变量
                            </div>
                            {upstreamVariables.map((node) => (
                                <div key={node.nodeId} className="mb-2">
                                    <div className="text-[10px] font-medium text-gray-500 px-1 mb-1">
                                        {node.nodeName}
                                    </div>
                                    <div className="space-y-0.5">
                                        {node.variables.map((v) => (
                                            <button
                                                key={`${node.nodeId}.${v.variableKey}`}
                                                onClick={() => onSelect(`{{${node.nodeId}.${v.variableKey}}}`)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 text-left transition-colors"
                                            >
                                                <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-600 font-mono">
                                                    {v.variableType}
                                                </span>
                                                <span className="text-xs text-gray-700">{v.variableKey}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ============== 会话变量编辑器 - 仅 Chatflow ==============

interface ConversationVariablesEditorProps {
    variables: ConversationVariable[];
    onChange: (variables: ConversationVariable[]) => void;
}

export function ConversationVariablesEditor({ variables, onChange }: ConversationVariablesEditorProps) {
    const { isChatflow } = useWorkflowContext();

    // 非 Chatflow 模式不渲染
    if (!isChatflow) {
        return null;
    }

    return (
        <div className="p-4 border rounded-lg bg-violet-50/50 border-violet-200">
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-violet-600" />
                <span className="text-sm font-medium text-violet-700">会话变量</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">
                    Chatflow 专属
                </span>
            </div>

            <p className="text-xs text-violet-600 mb-3">
                会话变量在多轮对话中持久化，可用于存储上下文信息。
            </p>

            {/* 变量列表 */}
            <div className="space-y-2">
                {variables.map((v, index) => (
                    <div key={v.id} className="flex items-center gap-2 p-2 bg-white rounded border border-violet-200">
                        <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                                const newVars = [...variables];
                                newVars[index] = { ...v, name: e.target.value };
                                onChange(newVars);
                            }}
                            placeholder="变量名"
                            className="flex-1 text-xs px-2 py-1 border rounded"
                        />
                        <select
                            value={v.type}
                            onChange={(e) => {
                                const newVars = [...variables];
                                newVars[index] = { ...v, type: e.target.value as any };
                                onChange(newVars);
                            }}
                            className="text-xs px-2 py-1 border rounded"
                        >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="object">object</option>
                            <option value="array">array</option>
                        </select>
                        <button
                            onClick={() => onChange(variables.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={() => onChange([...variables, { id: Date.now().toString(), name: "", type: "string" }])}
                className="mt-2 text-xs text-violet-600 hover:text-violet-700"
            >
                + 添加会话变量
            </button>
        </div>
    );
}
