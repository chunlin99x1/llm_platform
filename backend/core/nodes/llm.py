"""LLM 节点执行器"""

from typing import Dict, Any, AsyncGenerator


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
    
    if not provider or not model:
        raise ValueError(f"LLM 节点 '{node_id}' 缺少模型配置。请在节点中配置 provider 和 model。")
    
    llm = await create_llm_instance(
        provider=provider,
        model=model,
        parameters=model_config.get("parameters", {})
    )
    prompt_template = node_data.get("prompt", "")

    # 变量替换
    prompt = prompt_template
    for k, v in state["inputs"].items():
        prompt = prompt.replace(f"{{{{{k}}}}}", str(v))
    
    # 替换上游节点输出
    for out_node_id, out_data in state["outputs"].items():
        if isinstance(out_data, dict):
            for out_key, out_val in out_data.items():
                prompt = prompt.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))

    if not prompt:
        prompt = state["inputs"].get("input", "")

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
