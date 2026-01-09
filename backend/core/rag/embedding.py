"""
向量化服务

支持 OpenAI 和本地模型向量化。

Author: chunlin
"""

from typing import List, Optional
from abc import ABC, abstractmethod
from configs import get_settings

import os
import numpy as np


class BaseEmbedding(ABC):
    """向量化基类"""

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """向量化单个查询"""
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """向量化多个文档"""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """向量维度"""
        pass


class OpenAIEmbedding(BaseEmbedding):
    """OpenAI 向量化"""

    def __init__(self, model: str = "text-embedding-3-small", api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.model = model
        self.api_key = api_key
        self.api_base = api_base
        self._dimension = 1536 if "3-small" in model else 3072

    async def embed_query(self, text: str) -> List[float]:
        from langchain_openai import OpenAIEmbeddings
        embeddings = OpenAIEmbeddings(
            model=self.model,
            openai_api_key=self.api_key,
            openai_api_base=self.api_base
        )
        return await embeddings.aembed_query(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        from langchain_openai import OpenAIEmbeddings
        embeddings = OpenAIEmbeddings(
            model=self.model,
            openai_api_key=self.api_key,
            openai_api_base=self.api_base
        )
        return await embeddings.aembed_documents(texts)

    @property
    def dimension(self) -> int:
        return self._dimension


class LocalEmbedding(BaseEmbedding):
    """
    本地向量化（使用 sentence-transformers）

    支持：
    - all-MiniLM-L6-v2（轻量级，384 维）
    - bge-base-zh-v1.5（中文优化，768 维）
    - bge-large-zh-v1.5（中文大模型，1024 维）
    """
# ... (LocalEmbedding remains same)

class DashScopeEmbedding(BaseEmbedding):
    """
    阿里云 DashScope 向量化

    支持：
    - text-embedding-v1（通用，1536 维）
    - text-embedding-v2（通用，1536 维）
    - text-embedding-v3（多语言，1024 维）
    """

    def __init__(self, model: str = "text-embedding-v3", api_key: Optional[str] = None):
        self.model = model
        # 维度映射
        self._dimensions = {
            "text-embedding-v1": 1536,
            "text-embedding-v2": 1536,
            "text-embedding-v3": 1024,
            "text-embedding-async-v1": 1536,
            "text-embedding-async-v2": 1536,
        }
        self._dimension = self._dimensions.get(model, 1024)
        self.dashscope_api_key = api_key or get_settings().dashscope_api_key

    async def embed_query(self, text: str) -> List[float]:
        from langchain_community.embeddings import DashScopeEmbeddings
        import asyncio
        embeddings = DashScopeEmbeddings(model=self.model, dashscope_api_key=self.dashscope_api_key)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: embeddings.embed_query(text)
        )
        return result

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        from langchain_community.embeddings import DashScopeEmbeddings
        import asyncio
        embeddings = DashScopeEmbeddings(model=self.model, dashscope_api_key=self.dashscope_api_key)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: embeddings.embed_documents(texts)
        )
        return result

    @property
    def dimension(self) -> int:
        return self._dimension


class EmbeddingService:
    """
    向量化服务（工厂模式）

    支持：
    - openai: OpenAI 向量化
    - local: 本地 sentence-transformers
    - dashscope: 阿里云 DashScope
    """

    def __init__(self, provider: str = "openai", model: Optional[str] = None, api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.provider = provider

        if provider == "openai":
            self.embedder = OpenAIEmbedding(model=model or "text-embedding-3-small", api_key=api_key, api_base=api_base)
        elif provider == "local":
            self.embedder = LocalEmbedding(model_name=model or "BAAI/bge-base-zh-v1.5")
        elif provider == "dashscope":
            self.embedder = DashScopeEmbedding(model=model or "text-embedding-v3", api_key=api_key)
        else:
            raise ValueError(f"Unknown embedding provider: {provider}")

    async def embed_query(self, text: str) -> List[float]:
        return await self.embedder.embed_query(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return await self.embedder.embed_documents(texts)

    @property
    def dimension(self) -> int:
        return self.embedder.dimension
