"""
Agent 节点执行器

在工作流中嵌入 Agent 执行，支持多轮工具调用。

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator, List
from core.variable_resolver import resolve_variables


async def execute_agent_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 Agent 节点：在工作流中嵌入 Agent。
    
    节点配置格式:
    {
        "query": "{{start.query}}",  # 用户输入
        "instructions": "你是一个助手...",  # Agent 系统指令
        "enabled_tools": ["ddg_search", "calc"],  # 启用的工具
        "model": {
            "provider": "openai",
            "name": "gpt-4o-mini"
        },
        "max_iterations": 5,  # 最大迭代次数
        "knowledge_base_ids": [1, 2]  # 可选：关联知识库
    }
    """
    from core.agent import agent_stream
    from langchain_core.messages import HumanMessage
    
    # 获取配置
    query_template = node_data.get("query", "")
    instructions = node_data.get("instructions", "")
    enabled_tools = node_data.get("enabled_tools", [])
    model_config = node_data.get("model", {})
    max_iterations = node_data.get("max_iterations", 5)
    knowledge_base_ids = node_data.get("knowledge_base_ids", [])
    knowledge_settings = node_data.get("knowledge_settings", {})
    
    # 解析变量
    query = resolve_variables(query_template, state)
    instructions = resolve_variables(instructions, state)
    
    if not query:
        query = state.get("inputs", {}).get("query", "")
    
    # 构建 LLM 配置
    llm_config = None
    if model_config:
        llm_config = {
            "provider": model_config.get("provider"),
            "model": model_config.get("name"),
            "parameters": model_config.get("completion_params", {})
        }
    
    # 发布 Agent 开始事件
    yield {
        "type": "agent_started",
        "node_id": node_id,
        "query": query
    }
    
    # 构建消息
    messages = [HumanMessage(content=query)]
    
    # 收集结果
    final_answer = ""
    tool_results = []
    iteration = 0
    
    try:
        async for event in agent_stream(
            system_prompt=instructions,
            messages=messages,
            enabled_tools=enabled_tools,
            llm_config=llm_config,
            knowledge_base_ids=knowledge_base_ids,
            knowledge_settings=knowledge_settings,
            max_iters=max_iterations
        ):
            event_type = event.get("type")
            
            if event_type == "thinking":
                yield {
                    "type": "agent_thinking",
                    "node_id": node_id,
                    "content": event.get("content", "")
                }
                iteration += 1
            
            elif event_type == "tool_call":
                yield {
                    "type": "agent_tool_call",
                    "node_id": node_id,
                    "tool_name": event.get("name"),
                    "tool_id": event.get("tool_call_id"),
                    "arguments": event.get("arguments")
                }
            
            elif event_type == "tool_result":
                tool_results.append({
                    "name": event.get("name"),
                    "result": event.get("result")
                })
                yield {
                    "type": "agent_tool_result",
                    "node_id": node_id,
                    "tool_name": event.get("name"),
                    "result": event.get("result")
                }
            
            elif event_type == "token":
                # 流式输出
                final_answer += event.get("content", "")
                yield {
                    "type": "output",
                    "chunk": event.get("content", "")
                }
            
            elif event_type == "final_answer":
                final_answer = event.get("content", final_answer)
        
        # Agent 完成
        output = {
            "answer": final_answer,
            "tool_results": tool_results,
            "iterations": iteration
        }
        
        state["outputs"][node_id] = output
        
        yield {
            "type": "agent_finished",
            "node_id": node_id,
            "answer": final_answer,
            "iterations": iteration
        }
        
        yield {
            "type": "result",
            "outputs": {node_id: output}
        }
        
    except Exception as e:
        yield {
            "type": "agent_error",
            "node_id": node_id,
            "error": str(e)
        }
        raise
