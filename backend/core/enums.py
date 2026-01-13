"""
核心枚举定义
"""

from enum import StrEnum


class AppMode(StrEnum):
    """
    应用模式枚举
    - WORKFLOW: 工作流应用，单次执行
    - CHATFLOW: 对话流应用，多轮对话（对应 Dify 的 advanced-chat）
    - AGENT: 智能体应用
    """
    WORKFLOW = "workflow"
    CHATFLOW = "chatflow"
    AGENT = "agent"

    @classmethod
    def value_of(cls, value: str) -> "AppMode":
        for mode in cls:
            if mode.value == value:
                return mode
        raise ValueError(f"Invalid AppMode value: {value}")


class WorkflowType(StrEnum):
    """
    工作流类型枚举
    - WORKFLOW: 普通工作流（单次执行）
    - CHATFLOW: 对话型工作流（多轮对话）
    """
    WORKFLOW = "workflow"
    CHATFLOW = "chatflow"

    @classmethod
    def from_app_mode(cls, app_mode: AppMode) -> "WorkflowType":
        """根据 AppMode 返回对应的 WorkflowType"""
        if app_mode == AppMode.WORKFLOW:
            return cls.WORKFLOW
        return cls.CHATFLOW


class NodeType(StrEnum):
    """节点类型枚举"""
    # 基础节点
    START = "start"
    END = "end"  # Workflow 专用
    ANSWER = "answer"  # Chatflow 专用
    
    # LLM 节点
    LLM = "llm"
    
    # 知识库节点
    KNOWLEDGE_RETRIEVAL = "knowledge-retrieval"
    
    # 逻辑控制节点
    IF_ELSE = "if-else"
    QUESTION_CLASSIFIER = "question-classifier"
    
    # 代码和工具节点
    CODE = "code"
    HTTP_REQUEST = "http-request"
    TOOL = "tool"
    
    # 变量节点
    VARIABLE_AGGREGATOR = "variable-aggregator"
    VARIABLE_ASSIGNER = "assigner"
    TEMPLATE_TRANSFORM = "template-transform"
    
    # 迭代和循环节点
    ITERATION = "iteration"
    ITERATION_START = "iteration-start"
    LOOP = "loop"
    LOOP_START = "loop-start"
    LOOP_END = "loop-end"
    
    # 文档处理节点
    DOCUMENT_EXTRACTOR = "document-extractor"
    LIST_OPERATOR = "list-operator"
    PARAMETER_EXTRACTOR = "parameter-extractor"

    @classmethod
    def get_chatflow_only_nodes(cls) -> set["NodeType"]:
        """返回 Chatflow 专用节点"""
        return {cls.ANSWER}

    @classmethod
    def get_workflow_only_nodes(cls) -> set["NodeType"]:
        """返回 Workflow 专用节点"""
        return {cls.END}

    @classmethod
    def get_available_nodes(cls, workflow_type: WorkflowType) -> list["NodeType"]:
        """根据工作流类型返回可用节点列表"""
        all_nodes = set(cls)
        if workflow_type == WorkflowType.CHATFLOW:
            # Chatflow: 移除 END 节点
            return sorted(all_nodes - cls.get_workflow_only_nodes(), key=lambda x: x.value)
        else:
            # Workflow: 移除 ANSWER 节点
            return sorted(all_nodes - cls.get_chatflow_only_nodes(), key=lambda x: x.value)


class WorkflowExecutionStatus(StrEnum):
    """工作流执行状态"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    STOPPED = "stopped"


class NodeExecutionStatus(StrEnum):
    """节点执行状态"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    STOPPED = "stopped"


class SystemVariableKey(StrEnum):
    """系统变量键"""
    # Chatflow 专用
    QUERY = "query"
    CONVERSATION_ID = "conversation_id"
    DIALOGUE_COUNT = "dialogue_count"
    
    # 通用
    FILES = "files"
    USER_ID = "user_id"
    APP_ID = "app_id"
    WORKFLOW_ID = "workflow_id"
    WORKFLOW_EXECUTION_ID = "workflow_run_id"
