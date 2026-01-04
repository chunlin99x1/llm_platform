from functools import lru_cache
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI

from .config import AppSettings, load_settings


@lru_cache(maxsize=1)
def settings() -> AppSettings:
    return load_settings()


@lru_cache(maxsize=1)
def chat_llm() -> ChatOpenAI:
    cfg = settings().llm
    if not cfg.api_key:
        raise ValueError("缺少 DASHSCOPE_API_KEY，请先在环境变量中设置。")
    return ChatOpenAI(
        openai_api_key=cfg.api_key,
        openai_api_base=cfg.base_url,
        model=cfg.model_name,
        temperature=0.2,
    )


def to_langchain_messages(payload: List[Dict[str, Any]]) -> List[BaseMessage]:
    """
    Convert simple role/content dicts to LangChain messages.
    """
    messages: List[BaseMessage] = []
    for item in payload:
        role = item.get("role", "user")
        content = item.get("content", "")
        if role == "assistant":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
    return messages
