"""
工作流节点配置 API

提供节点类型、模型列表、工具列表等动态配置接口。

Author: chunlin
"""

from fastapi import APIRouter

from schemas import (
    NodeTypeInfo,
    NodeTypesResponse,
    ModelInfo,
    ModelsResponse,
    ToolInfo,
    ToolsResponse,
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
    NodeTypeInfo(
        type="end",
        label="结束",
        icon="square",
        color="#ef4444",
        description="工作流的终点"
    ),
]


@router.get("/nodes/types", response_model=NodeTypesResponse)
async def get_node_types():
    """获取所有支持的节点类型"""
    return NodeTypesResponse(nodes=NODE_TYPES)


# ============== 模型配置 ==============

AVAILABLE_MODELS = [
    ModelInfo(id="gpt-4o", name="GPT-4o", provider="openai", max_tokens=128000),
    ModelInfo(id="gpt-4o-mini", name="GPT-4o Mini", provider="openai", max_tokens=128000),
    ModelInfo(id="gpt-4-turbo", name="GPT-4 Turbo", provider="openai", max_tokens=128000),
    ModelInfo(id="gpt-3.5-turbo", name="GPT-3.5 Turbo", provider="openai", max_tokens=16385),
    ModelInfo(id="claude-3-5-sonnet", name="Claude 3.5 Sonnet", provider="anthropic", max_tokens=200000),
    ModelInfo(id="claude-3-opus", name="Claude 3 Opus", provider="anthropic", max_tokens=200000),
    ModelInfo(id="deepseek-chat", name="DeepSeek Chat", provider="deepseek", max_tokens=64000),
    ModelInfo(id="deepseek-reasoner", name="DeepSeek Reasoner", provider="deepseek", max_tokens=64000),
]


@router.get("/models", response_model=ModelsResponse)
async def get_models():
    """获取可用的 LLM 模型列表"""
    return ModelsResponse(models=AVAILABLE_MODELS)


# ============== 工具配置 ==============

AVAILABLE_TOOLS = [
    ToolInfo(
        name="web_search",
        label="网络搜索",
        description="搜索互联网获取最新信息"
    ),
    ToolInfo(
        name="code_interpreter",
        label="代码解释器",
        description="执行 Python 代码并返回结果"
    ),
    ToolInfo(
        name="file_reader",
        label="文件读取",
        description="读取上传文件的内容"
    ),
    ToolInfo(
        name="image_generation",
        label="图像生成",
        description="根据描述生成图像"
    ),
]


@router.get("/tools", response_model=ToolsResponse)
async def get_tools():
    """获取可用的工具列表"""
    return ToolsResponse(tools=AVAILABLE_TOOLS)


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
