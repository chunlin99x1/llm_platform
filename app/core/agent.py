"""
Agent 执行核心模块

提供流式 Agent 执行逻辑，支持工具调用。

Author: chunlin
"""

import json
from collections.abc import AsyncGenerator
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage

from app.core.llm import chat_llm
from app.core.tools import resolve_tools

async def _invoke_tool(tool_obj: Any, args: Dict[str, Any]) -> str:
    """
    异步调用工具，统一处理所有类型的 LangChain 工具。
    """
    try:
        # LangChain 所有工具都支持 ainvoke，内部会自动处理同步/异步
        result = await tool_obj.ainvoke(args)
        return str(result)
    except Exception as e:
        tool_name = getattr(tool_obj, 'name', 'Unknown')
        error_msg = str(e)
        
        if "validation error" in error_msg.lower():
            return f"工具 '{tool_name}' 参数验证失败: {error_msg}"
        elif "required" in error_msg.lower():
            return f"工具 '{tool_name}' 缺少必需参数: {error_msg}"
        else:
            return f"工具 '{tool_name}' 执行失败: {error_msg}"



async def agent_stream(
    *,
    system_prompt: Optional[str] = None,
    messages: List[BaseMessage],
    enabled_tools: Optional[List[str]] = None,
    max_iters: int = 8,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    流式生成器，输出事件数据包。

    数据包类型：
    - text: 消息文本片段
    - trace: 工具调用开始
    - trace_result: 工具调用结果
    - message: 持久化专用消息（AI/Tool）
    - error: 错误信息
    - done: 完成标记
    """
    try:
        llm = chat_llm()
        tools = resolve_tools(enabled_tools)
        
        if tools:
            llm_with_tools = llm.bind_tools(tools)
        else:
            llm_with_tools = llm

        all_messages = messages.copy()
        if system_prompt:
            all_messages.insert(0, SystemMessage(content=system_prompt))

        for iteration in range(max_iters):
            # 流式调用 LLM
            ai_msg_content = ""
            # 使用字典来累积工具调用（按index或id合并）
            tool_calls_dict: Dict[int, Dict[str, Any]] = {}
            
            async for chunk in llm_with_tools.astream(all_messages):
                # 文本内容
                if hasattr(chunk, "content") and chunk.content:
                    ai_msg_content += chunk.content
                    yield {"type": "text", "content": chunk.content}
                
                # 工具调用 - 使用 tool_call_chunks 来正确累积
                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    for tc_chunk in chunk.tool_call_chunks:
                        idx = tc_chunk.get("index", 0)
                        if idx not in tool_calls_dict:
                            tool_calls_dict[idx] = {"name": "", "args": "", "id": ""}
                        
                        # 累积各个字段
                        if tc_chunk.get("name"):
                            tool_calls_dict[idx]["name"] += tc_chunk["name"]
                        if tc_chunk.get("args"):
                            tool_calls_dict[idx]["args"] += tc_chunk["args"]
                        if tc_chunk.get("id"):
                            tool_calls_dict[idx]["id"] += tc_chunk["id"]
                
                # 回退：也处理完整的 tool_calls（非流式情况）
                elif hasattr(chunk, "tool_calls") and chunk.tool_calls:
                    for i, tc in enumerate(chunk.tool_calls):
                        if i not in tool_calls_dict:
                            tool_calls_dict[i] = {"name": "", "args": "", "id": ""}
                        if tc.get("name"):
                            tool_calls_dict[i]["name"] = tc["name"]
                        if tc.get("args"):
                            tool_calls_dict[i]["args"] = tc["args"] if isinstance(tc["args"], str) else json.dumps(tc["args"])
                        if tc.get("id"):
                            tool_calls_dict[i]["id"] = tc["id"]
            
            # 解析累积的工具调用
            ai_msg_tool_calls = []
            for idx in sorted(tool_calls_dict.keys()):
                tc_data = tool_calls_dict[idx]
                if tc_data["name"]:  # 只处理有名称的工具调用
                    # 解析 args JSON 字符串
                    try:
                        args = json.loads(tc_data["args"]) if tc_data["args"] else {}
                    except json.JSONDecodeError:
                        args = {}
                    
                    ai_msg_tool_calls.append({
                        "name": tc_data["name"],
                        "args": args,
                        "id": tc_data["id"]
                    })


            # 构建完整的 AI 消息
            ai_msg = AIMessage(content=ai_msg_content, tool_calls=ai_msg_tool_calls)
            all_messages.append(ai_msg)
            
            # 持久化 AI 消息
            yield {
                "type": "message",
                "role": "assistant",
                "content": ai_msg_content,
                "tool_calls": ai_msg_tool_calls
            }

            # 如果没有工具调用，结束
            if not ai_msg_tool_calls:
                break

            # 执行工具调用
            for tc in ai_msg_tool_calls:
                tool_name = tc.get("name")
                tool_args = tc.get("args", {})
                tool_id = tc.get("id", "")

                # 发送工具调用开始事件
                yield {
                    "type": "trace",
                    "id": tool_id,
                    "name": tool_name,
                    "args": tool_args
                }

                # 查找并执行工具
                tool_obj = None
                for t in tools:
                    if t.name == tool_name:
                        tool_obj = t
                        break

                if tool_obj is None:
                    result = f"工具 {tool_name} 未找到"
                else:
                    result = await _invoke_tool(tool_obj, tool_args)

                # 发送工具调用结果事件
                yield {
                    "type": "trace_result",
                    "id": tool_id,
                    "result": result
                }

                # 添加工具消息
                tool_msg = ToolMessage(content=result, tool_call_id=tool_id, name=tool_name)
                all_messages.append(tool_msg)
                
                # 持久化工具消息
                yield {
                    "type": "message",
                    "role": "tool",
                    "content": result,
                    "name": tool_name,
                    "tool_call_id": tool_id
                }

        yield {"type": "done"}

    except Exception as e:
        yield {"type": "error", "content": f"Agent 执行错误: {str(e)}"}
