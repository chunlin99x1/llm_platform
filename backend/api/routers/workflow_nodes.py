"""
工作流节点配置 API

提供节点类型、模型列表、工具列表等动态配置接口。

Author: chunlin
"""

from typing import Optional
from fastapi import APIRouter, Query

from schemas import (
    NodeTypeInfo,
    NodeTypesResponse,
    VariableTypeInfo,
    VariableTypesResponse,
)

router = APIRouter(prefix="/workflow", tags=["workflow-config"])


# ============== 节点类型配置 ==============

NODE_TYPES = [
    NodeTypeInfo(
        type="start",
        label="开始",
        icon="play",
        color="#3b82f6",
        description="工作流的起点，定义输入变量"
    ),
    NodeTypeInfo(
        type="llm",
        label="LLM",
        icon="box",
        color="#6366f1",
        description="调用大语言模型生成内容"
    ),
    NodeTypeInfo(
        type="answer",
        label="回复",
        icon="message-square",
        color="#f97316",
        description="输出最终回复给用户"
    ),
    NodeTypeInfo(
        type="condition",
        label="条件分支",
        icon="git-branch",
        color="#8b5cf6",
        description="根据条件选择不同的执行路径"
    ),
    NodeTypeInfo(
        type="code",
        label="代码执行",
        icon="code",
        color="#2563eb",
        description="执行自定义 Python 代码"
    ),
    NodeTypeInfo(
        type="http",
        label="HTTP 请求",
        icon="globe",
        color="#06b6d4",
        description="发送 HTTP 请求调用外部 API"
    ),
    NodeTypeInfo(
        type="variable",
        label="变量赋值",
        icon="variable",
        color="#eab308",
        description="设置或转换变量值"
    ),
    NodeTypeInfo(
        type="knowledge",
        label="知识检索",
        icon="database",
        color="#22c55e",
        description="从知识库检索相关内容"
    ),
    NodeTypeInfo(
        type="iteration",
        label="迭代",
        icon="repeat",
        color="#06b6d4",
        description="循环处理列表中的每个元素"
    ),
    NodeTypeInfo(
        type="template",
        label="模板转换",
        icon="file-code",
        color="#3b82f6",
        description="使用 Jinja2 模板格式化文本"
    ),
    NodeTypeInfo(
        type="extractor",
        label="参数提取",
        icon="file-search",
        color="#a855f7",
        description="使用 LLM 从文本中提取结构化参数"
    ),
    # Phase 2 新增节点
    NodeTypeInfo(
        type="tool",
        label="工具调用",
        icon="wrench",
        color="#10b981",
        description="调用单个工具执行任务"
    ),
    NodeTypeInfo(
        type="question-classifier",
        label="问题分类",
        icon="help-circle",
        color="#f59e0b",
        description="使用 LLM 对问题进行分类"
    ),
    NodeTypeInfo(
        type="document-extractor",
        label="文档提取",
        icon="file-text",
        color="#6366f1",
        description="从文档中提取文本内容"
    ),
    NodeTypeInfo(
        type="list-operator",
        label="列表操作",
        icon="list",
        color="#06b6d4",
        description="对列表进行过滤、排序、切片等操作"
    ),
    NodeTypeInfo(
        type="agent",
        label="Agent",
        icon="bot",
        color="#8b5cf6",
        description="在工作流中嵌入 Agent 执行多轮工具调用"
    ),
    NodeTypeInfo(
        type="end",
        label="结束",
        icon="square",
        color="#ef4444",
        description="工作流的终点"
    ),
]


@router.get("/nodes/types", response_model=NodeTypesResponse)
async def get_node_types(
    app_mode: Optional[str] = Query(None, description="应用模式 (workflow/chatflow/agent)")
):
    """
    获取所有支持的节点类型
    
    Args:
        app_mode: 可选，应用模式 (workflow/chatflow/agent)，用于过滤节点
    """
    nodes = NODE_TYPES
    
    if app_mode:
        mode = app_mode.lower().strip()
        # 根据模式过滤节点
        if mode == "workflow":
            # Workflow 模式排除 answer 节点
            # 同时保留 end 节点
            nodes = [n for n in nodes if n.type != "answer"]
        elif mode in ("chatflow", "agent"):
            # Chatflow/Agent 模式排除 end 节点
            # 同时保留 answer 节点 (Agent 也可能有 Answer)
            nodes = [n for n in nodes if n.type != "end"]
            
            # Agent 模式可能还需要排除其他节点？目前假设与其他一致
            if mode == "agent":
                pass
    
    return NodeTypesResponse(nodes=nodes)


# ============== 工具配置 ==============

from core.tools.registry import BUILTIN_TOOLS


@router.get("/tools")
async def get_tools():
    """获取所有内置工具列表（分类格式）"""
    return {
        "categories": [
            {
                "category": cat_name,
                "tools": [
                    {
                        "name": tool_name,
                        "description": getattr(t, "description", "") or (t.__doc__ or "").strip()
                    }
                    for tool_name, t in cat_tools.items()
                ]
            }
            for cat_name, cat_tools in BUILTIN_TOOLS.items()
        ]
    }


# ============== 变量类型配置 ==============

VARIABLE_TYPES = [
    VariableTypeInfo(type="string", label="文本", color="#3b82f6"),
    VariableTypeInfo(type="number", label="数字", color="#22c55e"),
    VariableTypeInfo(type="boolean", label="布尔", color="#8b5cf6"),
    VariableTypeInfo(type="object", label="对象", color="#f97316"),
    VariableTypeInfo(type="array", label="数组", color="#06b6d4"),
    VariableTypeInfo(type="array[string]", label="文本列表", color="#06b6d4"),
    VariableTypeInfo(type="file", label="文件", color="#ec4899"),
    VariableTypeInfo(type="array[file]", label="文件列表", color="#ec4899"),
]


@router.get("/variable-types", response_model=VariableTypesResponse)
async def get_variable_types():
    """获取可用的变量类型列表"""
    return VariableTypesResponse(types=VARIABLE_TYPES)
