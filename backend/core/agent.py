"""
Agent 执行核心模块

提供流式 Agent 执行逻辑，支持工具调用。

Author: chunlin
"""

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage

from core.llm import create_llm_instance
from core.tools import resolve_tools
from core.mcp import mcp_connection_manager

logger = logging.getLogger(__name__)


async def _invoke_tool(tool_obj: Any, args: Dict[str, Any]) -> str:
    """
    异步调用工具，统一处理所有类型的 LangChain 工具。
    """
    try:
        # LangChain 所有工具都支持 ainvoke，内部会自动处理同步/异步
        result = await tool_obj.ainvoke(args)
        return str(result)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        # 打印详细堆栈到日志（假设有logger）
        print(f"Tool execution failed: {error_trace}") # 临时打印到 stdout 确保能看到

        tool_name = getattr(tool_obj, 'name', 'Unknown')
        error_msg = str(e)
        if not error_msg:
             error_msg = repr(e)

        if "validation error" in error_msg.lower():
            return f"工具 '{tool_name}' 参数验证失败: {error_msg}"
        elif "required" in error_msg.lower():
            return f"工具 '{tool_name}' 缺少必需参数: {error_msg}"
        else:
            return f"工具 '{tool_name}' 执行失败: {error_msg}\nDebug Trace: {error_trace}"


async def _retrieve_from_knowledge_bases(
    kb_ids: List[int],
    query: str,
    top_k: int = 3,
    retrieval_mode: str = "hybrid",
    score_threshold: float = 0.0,
    rerank_enabled: bool = False
) -> str:
    """
    从多个知识库中检索相关内容。

    Args:
        kb_ids: 知识库 ID 列表
        query: 用户查询
        top_k: 每个知识库返回的最大结果数
        retrieval_mode: 检索方式 (semantic/keyword/hybrid)
        score_threshold: 分数阈值
        rerank_enabled: 是否启用重排序

    Returns:
        格式化的检索结果文本
    """
    from database.models import KnowledgeBase, ModelProvider
    from core.rag.db_conn import get_weaviate_client
    from core.rag.retriever import WeaviateHybridRetriever, RetrievalMode
    from core.rag.embedding import EmbeddingService

    all_results = []

    for kb_id in kb_ids:
        try:
            kb = await KnowledgeBase.get_or_none(id=kb_id)
            if not kb:
                continue

            # 获取 embedding 凭证
            provider_obj = await ModelProvider.get_or_none(name=kb.embedding_provider)
            if not provider_obj:
                logger.warning(f"知识库 {kb.name} 的 embedding provider 未配置")
                continue

            # 创建 embedding 服务
            embedding_svc = EmbeddingService(
                provider=kb.embedding_provider,
                model=kb.embedding_model,
                api_key=provider_obj.api_key,
                api_base=provider_obj.api_base
            )

            # 创建检索器
            client = get_weaviate_client()
            retriever = WeaviateHybridRetriever(
                weaviate_client=client,
                collection_name=f"kb_{kb_id}",
                embedding_service=embedding_svc,
                mode=retrieval_mode,
                top_k=top_k,
                alpha=0.5,
                score_threshold=score_threshold
            )

            # 检索
            results = await retriever.retrieve_raw(query)

            for r in results:
                all_results.append({
                    "kb_name": kb.name,
                    "content": r.content,
                    "score": r.score or 0
                })

        except Exception as e:
            logger.error(f"知识库 {kb_id} 检索失败: {e}")
            continue

    # 按分数排序并格式化输出
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)

    if not all_results:
        return ""

    formatted = []
    for i, r in enumerate(all_results[:top_k * 2], 1):  # 最多返回 top_k * 2 条
        formatted.append(f"[{i}] 来源：{r['kb_name']}\n{r['content']}")

    return "\n\n---\n\n".join(formatted)

async def agent_stream(
    *,
    system_prompt: Optional[str] = None,
    messages: List[BaseMessage],
    enabled_tools: Optional[List[str]] = None,
    mcp_servers: Optional[List[Dict[str, Any]]] = None,
    llm_config: Optional[Dict[str, Any]] = None,
    knowledge_base_ids: Optional[List[int]] = None,
    knowledge_settings: Optional[Dict[str, Any]] = None,
    max_iters: int = 8,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    流式生成器，输出事件数据包。
    """
    try:
        if not llm_config:
            raise ValueError("缺少 llm_config 参数。请在请求中提供模型配置。")

        # llm_config should look like: {"provider": "...", "model": "...", "parameters": {...}}
        llm = await create_llm_instance(
            provider=llm_config.get("provider"),
            model=llm_config.get("model"),
            parameters=llm_config.get("parameters", {})
        )
        if not llm_config.get("provider") or not llm_config.get("model"):
            raise ValueError("llm_config 缺少 provider 或 model 字段。")

        # 解析知识库设置（KnowledgeSettings 有默认值，直接使用属性访问）
        kb_top_k = knowledge_settings.top_k if knowledge_settings else 3
        kb_retrieval_mode = knowledge_settings.retrieval_mode if knowledge_settings else "hybrid"
        kb_score_threshold = knowledge_settings.score_threshold if knowledge_settings else 0.0
        kb_rerank_enabled = knowledge_settings.rerank_enabled if knowledge_settings else False
        kb_fallback_to_model = knowledge_settings.fallback_to_model if knowledge_settings else True

        # 知识库检索：从用户输入获取相关内容
        rag_context = ""
        if knowledge_base_ids and len(knowledge_base_ids) > 0:
            # 获取最后一条用户消息作为查询
            user_query = ""
            for msg in reversed(messages):
                if isinstance(msg, HumanMessage):
                    user_query = msg.content
                    break

            if user_query:
                rag_context = await _retrieve_from_knowledge_bases(
                    knowledge_base_ids,
                    user_query,
                    top_k=kb_top_k,
                    retrieval_mode=kb_retrieval_mode,
                    score_threshold=kb_score_threshold,
                    rerank_enabled=kb_rerank_enabled
                )

        # 构建增强的 system prompt
        enhanced_prompt = system_prompt or ""
        if rag_context:
            # 有检索结果：让模型参考这些信息回答
            enhanced_prompt = f"""{enhanced_prompt}

## 相关参考资料
以下是从知识库中检索到的相关内容，请在回答时参考这些信息：

{rag_context}

请根据以上参考资料和你的知识来回答用户的问题。如果参考资料中没有相关信息，请基于你的知识回答。"""
        elif knowledge_base_ids and len(knowledge_base_ids) > 0 and not kb_fallback_to_model:
            # 启用了知识库但没有检索到内容，且禁止使用模型知识回退
            # 直接返回固定消息，不调用 LLM（避免模型不遵守指示）
            no_result_msg = "抱歉，我在知识库中没有找到与您问题相关的信息。由于系统配置为仅使用知识库内容回答，我无法为您提供答案。请尝试换一种方式提问，或联系管理员补充相关知识。"
            print(f"[RAG DEBUG] Returning no_result_msg")
            yield {"type": "text", "content": no_result_msg}
            return

        print(enhanced_prompt)
        local_tools = resolve_tools(enabled_tools)

        # 使用上下文管理器加载 MCP 工具
        async with mcp_connection_manager(mcp_servers) as mcp_tools:
            # 合并工具
            tools = local_tools + mcp_tools

            if tools:
                llm_with_tools = llm.bind_tools(tools)
            else:
                llm_with_tools = llm

            all_messages = messages.copy()
            if enhanced_prompt:
                all_messages.insert(0, SystemMessage(content=enhanced_prompt))

            # ✅ 整个循环必须在 async with 内部！
            for iteration in range(max_iters):
                # 流式调用 LLM
                ai_msg_content = ""
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

                            if tc_chunk.get("name"):
                                tool_calls_dict[idx]["name"] += tc_chunk["name"]
                            if tc_chunk.get("args"):
                                tool_calls_dict[idx]["args"] += tc_chunk["args"]
                            if tc_chunk.get("id"):
                                tool_calls_dict[idx]["id"] += tc_chunk["id"]

                    elif hasattr(chunk, "tool_calls") and chunk.tool_calls:
                        logger.info(f"OpenAI Chunk has tool_calls: {chunk.tool_calls}")
                        for i, tc in enumerate(chunk.tool_calls):
                            if i not in tool_calls_dict:
                                tool_calls_dict[i] = {"name": "", "args": "", "id": ""}
                            if tc.get("name"):
                                tool_calls_dict[i]["name"] = tc["name"]
                            if tc.get("args"):
                                tool_calls_dict[i]["args"] = tc["args"] if isinstance(tc["args"], str) else json.dumps(
                                    tc["args"])
                            if tc.get("id"):
                                tool_calls_dict[i]["id"] = tc["id"]

                # 解析累积的工具调用
                ai_msg_tool_calls = []
                logger.info(f"Accumulated tool_calls_dict: {tool_calls_dict}")
                for idx in sorted(tool_calls_dict.keys()):
                    tc_data = tool_calls_dict[idx]
                    if tc_data["name"]:
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

                    # 先查找工具对象
                    tool_obj = None
                    for t in tools:
                        if t.name == tool_name:
                            tool_obj = t
                            break

                    # 获取 MCP 服务器名称（如果是 MCP 工具）
                    mcp_server_name = getattr(tool_obj, 'mcp_server_name', None) if tool_obj else None

                    yield {
                        "type": "trace",
                        "id": tool_id,
                        "name": tool_name,
                        "args": tool_args,
                        "mcp_server": mcp_server_name  # 如果是 MCP 工具则返回服务器名称，否则为 None
                    }

                    if tool_obj is None:
                        result = f"工具 {tool_name} 未找到"
                    else:
                        result = await _invoke_tool(tool_obj, tool_args)

                    yield {
                        "type": "trace_result",
                        "id": tool_id,
                        "result": result
                    }

                    tool_msg = ToolMessage(content=result, tool_call_id=tool_id, name=tool_name)
                    all_messages.append(tool_msg)

                    yield {
                        "type": "message",
                        "role": "tool",
                        "content": result,
                        "name": tool_name,
                        "tool_call_id": tool_id
                    }

            # ✅ 循环结束后，仍在 async with 内
            yield {"type": "done"}

    except BaseException as e:
        # 处理 ExceptionGroup (Python 3.11+) 或 TaskGroup 错误
        error_details = str(e)
        if hasattr(e, 'exceptions'):
            # ExceptionGroup 包含多个子异常
            sub_errors = []
            for idx, sub_exc in enumerate(e.exceptions):
                sub_errors.append(f"[{idx}] {type(sub_exc).__name__}: {sub_exc}")
            error_details = f"{str(e)}\n详细错误:\n" + "\n".join(sub_errors)

        import traceback
        logger.error(f"Agent 执行错误: {error_details}\n{traceback.format_exc()}")
        yield {"type": "error", "content": f"Agent 执行错误: {error_details}"}
