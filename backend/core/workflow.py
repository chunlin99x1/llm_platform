from typing import Any, Dict, List, TypedDict, Annotated
import operator
import json

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from .llm import create_llm_instance


class WorkflowState(TypedDict):
    """
    工作流状态，包含消息列表、全局输入和节点输出。
    """
    messages: Annotated[List[BaseMessage], operator.add]
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    temp_data: Dict[str, Any]


class WorkflowExecutor:
    def __init__(self, graph_config: Dict[str, Any]):
        self.graph_config = graph_config
        self.nodes = {n["id"]: n for n in graph_config.get("nodes", [])}
        self.edges = graph_config.get("edges", [])
        self._compiled_graph = self._build_graph()

    def _create_node_handler(self, node_id: str, node_type: str):
        """
        根据节点类型创建对应的处理函数。
        """
        node_data = self.nodes[node_id].get("data", {})

        async def handler(state: WorkflowState) -> Dict[str, Any]:
            if node_type == "start":
                # Start 节点通常只起标记作用，可以初始化一些变量
                return {"temp_data": {"start_node_id": node_id}}

            elif node_type == "llm":
                # 从节点配置中获取模型信息
                model_config = node_data.get("modelConfig", {})
                provider = model_config.get("provider")
                model = model_config.get("model")
                
                if not provider or not model:
                    raise ValueError(f"LLM 节点 '{node_id}' 缺少模型配置。请在节点中配置 provider 和 model。")
                
                llm = await create_llm_instance(
                    provider=provider,
                    model=model,
                    parameters=model_config.get("parameters", {})
                )
                prompt_template = node_data.get("prompt", "")
                
                # 简单的变量替换，支持 {{input}} 语法
                prompt = prompt_template
                for k, v in state["inputs"].items():
                    prompt = prompt.replace(f"{{{{{k}}}}}", str(v))
                
                # 如果没有 prompt 模板，默认透传用户输入
                if not prompt:
                    prompt = state["inputs"].get("input", "")

                messages = [HumanMessage(content=prompt)]
                response = await llm.ainvoke(messages)
                
                return {
                    "messages": [response],
                    "outputs": {node_id: {"text": response.content}}
                }

            elif node_type == "answer" or node_type == "end":
                # Answer 节点将结果写入最终输出
                # 这里假设它引用了某个节点的输出，简单起见先直接读最后的 message
                last_msg = state["messages"][-1].content if state["messages"] else ""
                return {"outputs": {"final_answer": last_msg}}

            return {}

        return handler

    def _build_graph(self):
        workflow = StateGraph(WorkflowState)

        # 添加节点
        for node_id, node in self.nodes.items():
            node_type = node.get("type", "custom")
            workflow.add_node(node_id, self._create_node_handler(node_id, node_type))

        # 添加连线
        for edge in self.edges:
            source = edge["source"]
            target = edge["target"]
            # 如果 source 是 START，LangGraph 使用特殊常量
            # 但在我们的 UI 中，Start 节点也是一个普通 Node
            workflow.add_edge(source, target)

        # 寻找入口点（通常是类型为 'start' 的节点）
        start_nodes = [id for id, n in self.nodes.items() if n.get("type") == "start"]
        if start_nodes:
            workflow.add_edge(START, start_nodes[0])
        else:
            # 兼容：如果没定义 Start 节点但有节点，取第一个
            if self.nodes:
                workflow.add_edge(START, list(self.nodes.keys())[0])

        # 寻找终点（没有出边的节点连接到 END）
        sources = {e["source"] for e in self.edges}
        for node_id in self.nodes:
            if node_id not in sources:
                workflow.add_edge(node_id, END)

        return workflow.compile()

    def get_graph(self):
        return self._compiled_graph


def build_graph_from_def(graph_def: Dict[str, Any]):
    executor = WorkflowExecutor(graph_def)
    return executor.get_graph()
