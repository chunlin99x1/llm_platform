from typing import Any, Dict, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph import END, START, StateGraph

from .llm import chat_llm


class WorkflowState(TypedDict):
    messages: list[BaseMessage]
    context: dict[str, Any]


def llm_node(state: WorkflowState) -> WorkflowState:
    """
    Simple node that calls the default LLM with the running message list.
    """
    llm = chat_llm()
    response = llm.invoke(state["messages"])
    return {
        "messages": state["messages"] + [response],
        "context": state["context"],
    }


def build_graph():
    """
    Build a minimal Start -> LLM -> End workflow using LangGraph.
    """
    graph = StateGraph(WorkflowState)
    graph.add_node("llm", llm_node)
    graph.add_edge(START, "llm")
    graph.add_edge("llm", END)
    return graph.compile()
