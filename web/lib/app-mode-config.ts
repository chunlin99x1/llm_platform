/**
 * 应用类型和节点配置
 * 
 * 定义 Workflow/Chatflow/Agent 的区别和节点可用性
 */

import type { AppMode } from "@/lib/types";

// ============== 应用模式配置 ==============

export const APP_MODE_CONFIG = {
  workflow: {
    label: "工作流",
    description: "针对流程化任务，单次执行",
    icon: "LayoutGrid",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    // 工作流使用 End 节点
    terminatorNode: "end",
    // 不支持会话变量
    supportsConversationVariables: false,
    // 系统变量
    systemVariables: ["files", "user_id", "app_id", "workflow_id", "workflow_run_id"],
  },
  chatflow: {
    label: "聊天助手",
    description: "基于 LLM 的多轮对话",
    icon: "MessageSquare",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    // Chatflow 使用 Answer 节点
    terminatorNode: "answer",
    // 支持会话变量
    supportsConversationVariables: true,
    // 系统变量（包含对话相关）
    systemVariables: ["query", "files", "conversation_id", "user_id", "dialogue_count", "app_id", "workflow_id", "workflow_run_id"],
  },
  agent: {
    label: "Agent",
    description: "自主任务执行",
    icon: "Terminal",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    terminatorNode: "answer",
    supportsConversationVariables: true,
    systemVariables: ["query", "files", "conversation_id", "user_id", "dialogue_count", "app_id"],
  },
} as const;

// ============== 节点类型配置 ==============

export interface NodeTypeConfig {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  category: "input" | "output" | "llm" | "logic" | "tool" | "data";
  // 哪些应用模式可用
  availableIn: AppMode[];
}

export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  // 输入节点
  {
    type: "start",
    label: "开始",
    description: "工作流入口",
    icon: "Play",
    color: "text-green-600",
    bgColor: "bg-green-500",
    category: "input",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  
  // 输出节点
  {
    type: "end",
    label: "结束",
    description: "工作流出口，批量输出",
    icon: "Square",
    color: "text-red-600",
    bgColor: "bg-red-500",
    category: "output",
    availableIn: ["workflow"], // Workflow 专用
  },
  {
    type: "answer",
    label: "回答",
    description: "流式输出回复",
    icon: "MessageCircle",
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    category: "output",
    availableIn: ["chatflow", "agent"], // Chatflow/Agent 专用
  },
  
  // LLM 节点
  {
    type: "llm",
    label: "LLM",
    description: "调用大语言模型",
    icon: "Bot",
    color: "text-purple-600",
    bgColor: "bg-purple-500",
    category: "llm",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "classifier",
    label: "问题分类",
    description: "使用 LLM 分类问题",
    icon: "GitBranch",
    color: "text-teal-600",
    bgColor: "bg-teal-500",
    category: "llm",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  
  // 逻辑节点
  {
    type: "condition",
    label: "条件分支",
    description: "根据条件选择路径",
    icon: "GitFork",
    color: "text-amber-600",
    bgColor: "bg-amber-500",
    category: "logic",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "iteration",
    label: "迭代",
    description: "循环处理数组",
    icon: "Repeat",
    color: "text-indigo-600",
    bgColor: "bg-indigo-500",
    category: "logic",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "variable",
    label: "变量聚合",
    description: "合并多个变量",
    icon: "Layers",
    color: "text-cyan-600",
    bgColor: "bg-cyan-500",
    category: "logic",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  
  // 工具节点
  {
    type: "code",
    label: "代码",
    description: "执行自定义代码",
    icon: "Code2",
    color: "text-gray-600",
    bgColor: "bg-gray-500",
    category: "tool",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "http",
    label: "HTTP 请求",
    description: "发送 HTTP 请求",
    icon: "Globe",
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    category: "tool",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "template",
    label: "模板转换",
    description: "Jinja2 模板处理",
    icon: "FileText",
    color: "text-pink-600",
    bgColor: "bg-pink-500",
    category: "tool",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  
  // 数据节点
  {
    type: "knowledge",
    label: "知识检索",
    description: "从知识库检索",
    icon: "Database",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500",
    category: "data",
    availableIn: ["workflow", "chatflow", "agent"],
  },
  {
    type: "extractor",
    label: "参数提取",
    description: "从文本提取结构化数据",
    icon: "FileSearch",
    color: "text-rose-600",
    bgColor: "bg-rose-500",
    category: "data",
    availableIn: ["workflow", "chatflow", "agent"],
  },
];

// ============== 工具函数 ==============

/**
 * 根据应用模式获取可用节点类型
 */
export function getAvailableNodeTypes(appMode: AppMode): NodeTypeConfig[] {
  return NODE_TYPE_CONFIGS.filter(config => config.availableIn.includes(appMode));
}

/**
 * 根据应用模式获取分类后的节点
 */
export function getNodeTypesByCategory(appMode: AppMode): Record<string, NodeTypeConfig[]> {
  const available = getAvailableNodeTypes(appMode);
  return available.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, NodeTypeConfig[]>);
}

/**
 * 获取节点类型配置
 */
export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return NODE_TYPE_CONFIGS.find(config => config.type === type);
}

/**
 * 检查节点在指定应用模式下是否可用
 */
export function isNodeAvailable(nodeType: string, appMode: AppMode): boolean {
  const config = getNodeTypeConfig(nodeType);
  return config?.availableIn.includes(appMode) ?? false;
}

/**
 * 获取应用模式的终止节点类型
 */
export function getTerminatorNodeType(appMode: AppMode): string {
  return APP_MODE_CONFIG[appMode]?.terminatorNode ?? "end";
}

// ============== 分类标签 ==============

export const NODE_CATEGORY_LABELS: Record<string, string> = {
  input: "输入",
  output: "输出",
  llm: "LLM",
  logic: "逻辑控制",
  tool: "工具",
  data: "数据处理",
};
