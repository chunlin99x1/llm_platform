from functools import lru_cache
from typing import Any, Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI

from configs import get_settings



@lru_cache(maxsize=1)
def chat_llm() -> ChatOpenAI:
    cfg = get_settings.llm
    if not cfg.api_key:
        raise ValueError("缺少 DASHSCOPE_API_KEY，请先在环境变量中设置。")
    return ChatOpenAI(
        openai_api_key=cfg.api_key,
        openai_api_base=cfg.base_url,
        model=cfg.model_name,
        temperature=0.2,
    )


async def create_llm_instance(
    provider: str, 
    model: str, 
    parameters: Dict[str, Any] = None
) -> ChatOpenAI:
    """
    Dynamically create an LLM instance based on provider and model settings.
    Fetches credentials from the database.
    """
    from database.models import ModelProvider
    
    parameters = parameters or {}
    temperature = parameters.get("temperature", 0.7)
    max_tokens = parameters.get("max_tokens", 2048)
    
    # Defaults
    api_key = None
    base_url = None
    
    # 1. Try to find provider in DB
    provider_obj = await ModelProvider.get_or_none(name=provider)
    if provider_obj:
        api_key = provider_obj.api_key
        base_url = provider_obj.api_base
    
    # 2. Fallback to Env vars if matching provider
    # Simple mapping for demo purposes, or if provider matches env config
    cfg = get_settings.llm
    if not api_key:
        # If user requests "openai" or "deepseek" and we have it in env
        # This is a fallback logic. 
        # For strict correctness we should rely on DB if dynamic.
        if provider == "openai" or provider == "deepseek": 
             # Assumes env vars are for the requested provider
             pass 

    if not api_key and cfg.api_key:
         # Use system default if nothing found (Safety net? Or explicit error?)
         # Better to allow system default if provider matches
         api_key = cfg.api_key
         base_url = cfg.base_url

    if not api_key:
         print(f"Warning: No API Key found for provider {provider}. Trying without key or using Env default.")
         # You might want to raise an error here in production
    
    # Construct ChatOpenAI (Compatible with most providers via OpenAI-compatible endpoints)
    # Note: For Anthropic native, we would need ChatAnthropic. 
    # For now, assuming OpenAI-compatible format for DashScope/DeepSeek/OpenAI.
    
    return ChatOpenAI(
        openai_api_key=api_key or "sk-placeholder", # Prevent init error
        openai_api_base=base_url,
        model=model,
        temperature=float(temperature),
        max_tokens=int(max_tokens) if max_tokens else None,
        # Add other standard params if needed
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
        elif role == "system":
             messages.append(SystemMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
    return messages
