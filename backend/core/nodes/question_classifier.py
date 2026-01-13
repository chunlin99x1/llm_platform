"""
Question Classifier 节点执行器

使用 LLM 对问题进行分类，根据分类结果选择不同的执行路径。

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator, List
from core.variable_resolver import resolve_variables


async def execute_question_classifier_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 Question Classifier 节点：问题分类。
    
    节点配置格式:
    {
        "query_variable": "{{start.query}}",
        "classes": [
            {"id": "class_1", "name": "技术问题"},
            {"id": "class_2", "name": "销售咨询"},
            {"id": "class_3", "name": "其他"}
        ],
        "model": {
            "provider": "openai",
            "name": "gpt-4o-mini"
        },
        "instruction": "请根据用户问题进行分类"
    }
    """
    from core.llm import create_llm_instance
    from langchain_core.messages import HumanMessage, SystemMessage
    import json
    
    # 获取配置
    query_variable = node_data.get("query_variable", "")
    classes = node_data.get("classes", [])
    model_config = node_data.get("model", {})
    instruction = node_data.get("instruction", "")
    
    if not classes:
        raise ValueError(f"Question Classifier 节点 '{node_id}' 未配置分类类别")
    
    # 解析问题变量
    query = resolve_variables(query_variable, state)
    if not query:
        query = state.get("inputs", {}).get("query", "")
    
    # 构建分类 prompt
    class_descriptions = "\n".join([
        f"- {c['id']}: {c['name']}" + (f" ({c.get('description', '')})" if c.get('description') else "")
        for c in classes
    ])
    
    system_prompt = f"""你是一个问题分类器。请根据用户的问题，将其分类到以下类别之一。

可用类别：
{class_descriptions}

{instruction if instruction else ''}

请仅返回类别的 id，不要返回其他内容。"""

    # 创建 LLM
    provider = model_config.get("provider", "openai")
    model = model_config.get("name", "gpt-4o-mini")
    
    llm = await create_llm_instance(
        provider=provider,
        model=model,
        parameters={"temperature": 0}  # 低温度保证一致性
    )
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query)
    ]
    
    # 调用 LLM
    yield {
        "type": "classifying",
        "node_id": node_id,
        "query": query
    }
    
    response = await llm.ainvoke(messages)
    classified_id = response.content.strip()
    
    # 验证分类结果
    valid_ids = [c["id"] for c in classes]
    if classified_id not in valid_ids:
        # 尝试模糊匹配
        for c in classes:
            if c["id"].lower() in classified_id.lower() or c["name"].lower() in classified_id.lower():
                classified_id = c["id"]
                break
        else:
            # 默认使用第一个类别
            classified_id = valid_ids[0]
    
    # 获取分类名称
    classified_name = next(
        (c["name"] for c in classes if c["id"] == classified_id),
        classified_id
    )
    
    output = {
        "class_id": classified_id,
        "class_name": classified_name,
        "query": query
    }
    
    # 设置分支选择（用于条件分支）
    state["outputs"][node_id] = output
    state["temp_data"]["selected_branch"] = classified_id
    
    yield {
        "type": "classified",
        "node_id": node_id,
        "class_id": classified_id,
        "class_name": classified_name
    }
    
    yield {
        "type": "result",
        "outputs": {node_id: output}
    }
