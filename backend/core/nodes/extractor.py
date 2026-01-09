"""参数提取节点执行器

使用 LLM 从文本中提取结构化数据。
"""

from typing import Dict, Any, AsyncGenerator
import json


async def execute_extractor_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行参数提取节点：使用 LLM 提取结构化数据。
    """
    from core.llm import create_llm_instance
    from langchain_core.messages import HumanMessage, SystemMessage
    
    # 获取配置
    input_text = node_data.get("input_text", "")
    parameters = node_data.get("parameters", [])  # [{"name": "xxx", "type": "string", "description": "xxx"}]
    
    # 变量替换
    for k, v in state["inputs"].items():
        input_text = input_text.replace(f"{{{{{k}}}}}", str(v))
    
    for out_node_id, out_data in state["outputs"].items():
        if isinstance(out_data, dict):
            for out_key, out_val in out_data.items():
                input_text = input_text.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))
    
    if not input_text:
        input_text = state["inputs"].get("input", "")
    
    # 构建提取 schema
    schema_desc = "从以下文本中提取指定参数，以 JSON 格式返回：\n\n"
    schema_desc += "需要提取的参数：\n"
    for param in parameters:
        schema_desc += f"- {param.get('name')}: {param.get('description', '')} (类型: {param.get('type', 'string')})\n"
    
    schema_desc += "\n请只返回 JSON 对象，不要包含其他文字。"
    
    # 从节点配置获取模型信息
    model_config = node_data.get("modelConfig", {})
    provider = model_config.get("provider")
    model = model_config.get("model")
    
    if not provider or not model:
        raise ValueError(f"参数提取节点 '{node_id}' 缺少模型配置。请在节点中配置 provider 和 model。")
    
    llm = await create_llm_instance(
        provider=provider,
        model=model,
        parameters=model_config.get("parameters", {})
    )
    messages = [
        SystemMessage(content=schema_desc),
        HumanMessage(content=f"文本内容：\n{input_text}")
    ]
    
    try:
        response = await llm.ainvoke(messages)
        response_text = response.content.strip()
        
        # 尝试解析 JSON
        # 清理可能的 markdown 代码块
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        extracted = json.loads(response_text)
        result = {
            "extracted": extracted,
            "raw_response": response.content,
            "success": True
        }
    except json.JSONDecodeError:
        result = {
            "extracted": {},
            "raw_response": response.content if 'response' in dir() else "",
            "success": False,
            "error": "Failed to parse JSON from LLM response"
        }
    except Exception as e:
        result = {
            "extracted": {},
            "raw_response": "",
            "success": False,
            "error": str(e)
        }
    
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }
