/**
 * Workflow 组件统一导出
 * 
 * 使用方式：
 * 1. OrchestratePage 中用 WorkflowProvider 包裹组件
 * 2. 子组件通过 useWorkflowContext 获取应用模式
 * 3. 使用 ShowIfChatflow/ShowIfWorkflow 条件渲染
 */

export { NodePanel, NodeList } from "./node-panel";
export { VariableSelector, ConversationVariablesEditor } from "./variable-selector";
export { getSystemVariables, getStartNodeVariables, isConversationVariablesSupported } from "./system-variables";
export type { ConversationVariable } from "./system-variables";
