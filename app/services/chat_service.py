"""
聊天服务模块

处理聊天消息的管理和 Agent 执行逻辑。

Author: chunlin
"""

from typing import AsyncGenerator, Dict, Any, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from tortoise.transactions import in_transaction

from app.core.agent import agent_stream
from app.db.models import ChatMessage


class ChatService:
    """Service class for chat functionality."""

    @staticmethod
    def convert_db_messages_to_langchain(db_messages: List[ChatMessage]) -> List[BaseMessage]:
        """
        Convert database chat messages to LangChain message format.
        
        Args:
            db_messages: List of database chat message models
            
        Returns:
            List of LangChain BaseMessage instances
        """
        messages = []
        for m in db_messages:
            if m.role == "user":
                messages.append(HumanMessage(content=m.content))
            elif m.role == "assistant":
                messages.append(AIMessage(content=m.content, tool_calls=m.tool_calls or []))
            elif m.role == "tool":
                messages.append(ToolMessage(
                    content=m.content, 
                    tool_call_id=m.tool_call_id or "", 
                    name=m.name
                ))
            elif m.role == "system":
                messages.append(SystemMessage(content=m.content))
        return messages

    @staticmethod
    async def load_chat_history(session_id: str) -> List[BaseMessage]:
        """
        Load chat history for a session.
        
        Args:
            session_id: Chat session ID
            
        Returns:
            List of LangChain messages
        """
        db_history = await ChatMessage.filter(session_id=session_id).order_by("id")
        return ChatService.convert_db_messages_to_langchain(db_history)

    @staticmethod
    async def save_chat_message(
        session_id: str,
        role: str,
        content: str,
        name: str = None,
        tool_call_id: str = None,
        tool_calls: List[Dict[str, Any]] = None
    ) -> ChatMessage:
        """
        Save a chat message to database.
        
        Args:
            session_id: Chat session ID
            role: Message role (user/assistant/tool/system)
            content: Message content
            name: Optional tool name
            tool_call_id: Optional tool call ID
            tool_calls: Optional list of tool calls
            
        Returns:
            Created ChatMessage instance
        """
        async with in_transaction():
            return await ChatMessage.create(
                session_id=session_id,
                role=role,
                content=content,
                name=name,
                tool_call_id=tool_call_id,
                tool_calls=tool_calls
            )

    @staticmethod
    async def process_agent_chat(
        session_id: str,
        user_input: str,
        instructions: str,
        enabled_tools: List[str],
        history: List[BaseMessage]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process agent chat with streaming response.
        
        This method:
        1. Saves user message
        2. Streams agent response
        3. Persists intermediate messages (AI/tool)
        
        Args:
            session_id: Chat session ID
            user_input: User input text
            instructions: System instructions
            enabled_tools: List of enabled tool names
            history: Chat history as LangChain messages
            
        Yields:
            Event dictionaries for streaming response
        """
        # 1. Save user message
        await ChatService.save_chat_message(session_id, "user", user_input)
        
        # 2. Create user message for agent
        user_msg = HumanMessage(content=user_input)
        
        # 3. Stream agent response
        async for item in agent_stream(
            system_prompt=instructions,
            messages=history + [user_msg],
            enabled_tools=enabled_tools
        ):
            if item["type"] == "message":
                # Persist intermediate messages (AI thinking or tool execution)
                await ChatService.save_chat_message(
                    session_id=session_id,
                    role=item["role"],
                    content=item["content"],
                    name=item.get("name"),
                    tool_call_id=item.get("tool_call_id"),
                    tool_calls=item.get("tool_calls")
                )
                continue  # Persistence-only packet, don't send to frontend

            yield item
