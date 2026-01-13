"""LLM 节点执行器"""

from typing import Dict, Any, AsyncGenerator
from core.variable_resolver import resolve_variables


async def execute_llm_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 LLM 节点：调用大语言模型。
    """
    from core.llm import create_llm_instance
    from langchain_core.messages import HumanMessage

    # 从节点配置获取模型信息
    model_config = node_data.get("modelConfig", {})
    provider = model_config.get("provider")
    model = model_config.get("model")
    parameters = model_config.get("parameters", {})

    # Fallback to Dify style configuration (under "model" key)
    if not provider or not model:
        dify_model_config = node_data.get("model", {})
        if dify_model_config:
            provider = dify_model_config.get("provider")
            model = dify_model_config.get("name")  # Dify uses 'name' for model name
            parameters = dify_model_config.get("completion_params", {})

    if not provider or not model:
        raise ValueError(f"LLM 节点 '{node_id}' 缺少模型配置。请在节点中配置 provider 和 model。")
    
    llm = await create_llm_instance(
        provider=provider,
        model=model,
        parameters=parameters
    )
    
    # 获取并解析 prompt
    prompt_template = node_data.get("prompt", "")
    prompt = resolve_variables(prompt_template, state)

    if not prompt:
        prompt = state.get("inputs", {}).get("input", "")

    messages = [HumanMessage(content=prompt)]
    
    # 流式输出
    full_response = ""
    async for chunk in llm.astream(messages):
        if hasattr(chunk, 'content') and chunk.content:
            full_response += chunk.content
            yield {"type": "output", "chunk": chunk.content}

    state["outputs"][node_id] = {"text": full_response}
    yield {
        "type": "result",
        "outputs": {node_id: {"text": full_response}}
    }

