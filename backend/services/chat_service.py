"""
聊天服务模块

处理会话管理和消息记录，支持 Agent 和 Chatflow 应用。

Author: chunlin
"""

from typing import AsyncGenerator, Dict, Any, List, Optional
from uuid import UUID, uuid4

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from tortoise.transactions import in_transaction

from core.agent import agent_stream
from database.models import App, Conversation, Message


class ChatService:
    """Service class for chat functionality."""

    # ============== 消息转换 ==============

    @staticmethod
    def convert_db_messages_to_langchain(db_messages: List[Message]) -> List[BaseMessage]:
        """
        Convert database messages to LangChain message format.
        
        Args:
            db_messages: List of database Message models
            
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

    # ============== 会话管理 ==============

    @staticmethod
    async def get_or_create_conversation(
        app_id: int,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        name: Optional[str] = None
    ) -> Conversation:
        """
        Get existing conversation or create a new one.
        
        Args:
            app_id: Application ID
            conversation_id: Optional existing conversation ID
            user_id: Optional user ID
            name: Optional conversation name
            
        Returns:
            Conversation instance
        """
        if conversation_id:
            conv = await Conversation.get_or_none(id=conversation_id, app_id=app_id)
            if conv:
                return conv
        
        # Create new conversation
        async with in_transaction():
            conv = await Conversation.create(
                id=uuid4(),
                app_id=app_id,
                user_id=user_id,
                name=name
            )
        return conv

    @staticmethod
    async def get_conversation(conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID."""
        return await Conversation.get_or_none(id=conversation_id)

    @staticmethod
    async def list_conversations(
        app_id: int,
        user_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Conversation]:
        """
        List conversations for an app.
        
        Args:
            app_id: Application ID
            user_id: Optional user ID filter
            limit: Maximum number of results
            
        Returns:
            List of Conversation instances
        """
        query = Conversation.filter(app_id=app_id)
        if user_id:
            query = query.filter(user_id=user_id)
        return await query.order_by("-created_at").limit(limit)

    # ============== 消息管理 ==============

    @staticmethod
    async def load_conversation_history(conversation_id: str) -> List[BaseMessage]:
        """
        Load message history for a conversation.
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            List of LangChain messages
        """
        db_messages = await Message.filter(conversation_id=conversation_id).order_by("id")
        return ChatService.convert_db_messages_to_langchain(db_messages)

    @staticmethod
    async def save_message(
        conversation_id: str,
        role: str,
        content: str,
        name: str = None,
        tool_call_id: str = None,
        tool_calls: List[Dict[str, Any]] = None,
        metadata: Dict[str, Any] = None,
        workflow_run_id: int = None
    ) -> Message:
        """
        Save a message to database.
        
        Args:
            conversation_id: Conversation ID
            role: Message role (user/assistant/tool/system)
            content: Message content
            name: Optional tool name
            tool_call_id: Optional tool call ID
            tool_calls: Optional list of tool calls
            metadata: Optional metadata dict
            workflow_run_id: Optional associated workflow run ID
            
        Returns:
            Created Message instance
        """
        async with in_transaction():
            msg = await Message.create(
                conversation_id=conversation_id,
                role=role,
                content=content,
                name=name,
                tool_call_id=tool_call_id,
                tool_calls=tool_calls,
                metadata=metadata or {},
                workflow_run_id=workflow_run_id
            )
            # Update conversation message count
            await Conversation.filter(id=conversation_id).update(
                message_count=Conversation.message_count + 1
            )
            return msg

    # ============== Agent 聊天处理 ==============

    @staticmethod
    async def process_agent_chat(
        conversation_id: str,
        user_input: str,
        instructions: str,
        enabled_tools: List[str],
        history: List[BaseMessage],
        inputs: Dict[str, Any] = None,
        mcp_servers: List[Dict[str, Any]] = None,
        model_config: Dict[str, Any] = None,
        knowledge_base_ids: List[int] = None,
        knowledge_settings: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process agent chat with streaming response.
        
        This method:
        1. Replace variables in instructions
        2. Saves user message
        3. Streams agent response
        4. Persists intermediate messages (AI/tool)
        
        Args:
            conversation_id: Conversation ID
            user_input: User input text
            instructions: System instructions
            enabled_tools: List of enabled tool names
            history: Chat history as LangChain messages
            inputs: Optional variable inputs for substitution
            mcp_servers: Optional MCP server configurations
            model_config: Optional LLM configuration
            knowledge_base_ids: Optional list of knowledge base IDs for RAG
            knowledge_settings: Optional knowledge retrieval settings
            
        Yields:
            Event dictionaries for streaming response
        """
        # 0. Replace variables in instructions
        if inputs:
            for key, value in inputs.items():
                instructions = instructions.replace(f"{{{{{key}}}}}", str(value))
        
        # 1. Save user message
        await ChatService.save_message(conversation_id, "user", user_input)
        
        # 2. Create user message for agent
        user_msg = HumanMessage(content=user_input)
        
        # 3. Stream agent response
        async for item in agent_stream(
            system_prompt=instructions,
            messages=history + [user_msg],
            enabled_tools=enabled_tools,
            mcp_servers=mcp_servers,
            llm_config=model_config,
            knowledge_base_ids=knowledge_base_ids,
            knowledge_settings=knowledge_settings
        ):
            if item["type"] == "message":
                # Persist intermediate messages (AI thinking or tool execution)
                await ChatService.save_message(
                    conversation_id=conversation_id,
                    role=item["role"],
                    content=item["content"],
                    name=item.get("name"),
                    tool_call_id=item.get("tool_call_id"),
                    tool_calls=item.get("tool_calls")
                )
                continue  # Persistence-only packet, don't send to frontend

            yield item
