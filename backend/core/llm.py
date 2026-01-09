from typing import Any, Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


async def create_llm_instance(
    provider: str, 
    model: str, 
    parameters: Dict[str, Any] = None
) -> ChatOpenAI:
    """
    根据前端传来的 provider 和 model 动态创建 LLM 实例。
    从数据库获取 provider 的 API Key 和 Base URL。
    
    如果找不到配置，直接抛出错误，不进行任何兜底。
    """
    from database.models import ModelProvider
    
    parameters = parameters or {}
    
    # 从数据库查找 provider 配置
    provider_obj = await ModelProvider.get_or_none(name=provider)
    if not provider_obj:
        raise ValueError(f"未找到模型提供商 '{provider}' 的配置。请先在设置中添加该提供商。")
    
    if not provider_obj.api_key:
        raise ValueError(f"模型提供商 '{provider}' 的 API Key 未配置。请在设置中添加 API Key。")
    
    api_key = provider_obj.api_key
    base_url = provider_obj.api_base
    
    # 处理前端传来的参数（驼峰式转下划线式）
    temperature = parameters.get("temperature", 0.7)
    max_tokens = parameters.get("maxTokens") or parameters.get("max_tokens")
    top_p = parameters.get("topP") or parameters.get("top_p")
    presence_penalty = parameters.get("presencePenalty") or parameters.get("presence_penalty")
    frequency_penalty = parameters.get("frequencyPenalty") or parameters.get("frequency_penalty")
    
    # 构建 ChatOpenAI 实例
    llm_kwargs: Dict[str, Any] = {
        "openai_api_key": api_key,
        "openai_api_base": base_url,
        "model": model,
        "temperature": float(temperature),
    }
    
    if max_tokens:
        llm_kwargs["max_tokens"] = int(max_tokens)
    if top_p is not None:
        llm_kwargs["top_p"] = float(top_p)
    if presence_penalty is not None:
        llm_kwargs["presence_penalty"] = float(presence_penalty)
    if frequency_penalty is not None:
        llm_kwargs["frequency_penalty"] = float(frequency_penalty)
    
    return ChatOpenAI(**llm_kwargs)


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
        elif role == "system":
             messages.append(SystemMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
    return messages
