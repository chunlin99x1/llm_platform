"""
混合检索器（LangChain 兼容）

整合向量检索和 BM25 检索，支持 LangChain BaseRetriever 接口。

Author: chunlin
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun

from .weaviate_client import WeaviateClient, SearchResult
from .embedding import EmbeddingService


class RetrievalMode(Enum):
    """检索模式"""
    SEMANTIC = "semantic"       # 纯向量检索
    KEYWORD = "keyword"         # 纯 BM25 检索
    HYBRID = "hybrid"           # 混合检索


@dataclass
class RetrievalConfig:
    """检索配置"""
    mode: RetrievalMode = RetrievalMode.HYBRID
    top_k: int = 10
    alpha: float = 0.5          # 混合检索权重（0=BM25, 1=向量）
    score_threshold: float = 0.0
    filters: Optional[Dict[str, Any]] = None


class WeaviateHybridRetriever(BaseRetriever):
    """
    Weaviate 混合检索器（LangChain 兼容）
    
    继承自 LangChain BaseRetriever，可与其他 LangChain 组件无缝集成。
    
    支持：
    - 纯向量检索 (semantic)
    - 纯 BM25 检索 (keyword)
    - 混合检索（向量 + BM25）(hybrid)
    - Metadata 过滤
    """
    
    # Pydantic 字段声明
    weaviate_client: Any
    embedding_service: Any
    collection_name: str
    mode: str = "hybrid"
    top_k: int = 10
    alpha: float = 0.5
    score_threshold: float = 0.0
    filters: Optional[Dict[str, Any]] = None
    
    class Config:
        arbitrary_types_allowed = True
    
    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun = None
    ) -> List[Document]:
        """
        同步检索方法（LangChain 接口要求）
        
        内部调用异步方法并使用 asyncio.run() 执行。
        """
        import asyncio
        
        # 创建新的 event loop 执行异步代码
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        
        if loop and loop.is_running():
            # 如果已经在异步上下文中，使用 run_coroutine_threadsafe
            import concurrent.futures
            future = asyncio.run_coroutine_threadsafe(
                self._aretrieve(query),
                loop
            )
            return future.result()
        else:
            # 否则创建新的 loop
            return asyncio.run(self._aretrieve(query))
    
    async def _aretrieve(self, query: str) -> List[Document]:
        """异步检索实现"""
        config = RetrievalConfig(
            mode=RetrievalMode(self.mode),
            top_k=self.top_k,
            alpha=self.alpha,
            score_threshold=self.score_threshold,
            filters=self.filters
        )
        
        if config.mode == RetrievalMode.SEMANTIC:
            results = await self._semantic_search(query, config)
        elif config.mode == RetrievalMode.KEYWORD:
            results = await self._keyword_search(query, config)
        else:
            results = await self._hybrid_search(query, config)
        
        # 转换为 LangChain Document 格式
        return [
            Document(
                page_content=r.content,
                metadata={
                    **r.metadata,
                    "score": r.score
                }
            )
            for r in results
        ]
    
    async def _semantic_search(self, query: str, config: RetrievalConfig) -> List[SearchResult]:
        """纯向量检索"""
        query_vector = await self.embedding_service.embed_query(query)
        
        results = await self.weaviate_client.vector_search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=config.top_k,
            filters=config.filters
        )
        
        if config.score_threshold > 0:
            results = [r for r in results if r.score is not None and r.score >= config.score_threshold]
        
        return results
    
    async def _keyword_search(self, query: str, config: RetrievalConfig) -> List[SearchResult]:
        """纯 BM25 检索"""
        results = await self.weaviate_client.bm25_search(
            collection_name=self.collection_name,
            query=query,
            limit=config.top_k,
            filters=config.filters
        )
        
        if config.score_threshold > 0:
            results = [r for r in results if r.score is not None and r.score >= config.score_threshold]
        
        return results
    
    async def _hybrid_search(self, query: str, config: RetrievalConfig) -> List[SearchResult]:
        """混合检索"""
        query_vector = await self.embedding_service.embed_query(query)
        
        results = await self.weaviate_client.hybrid_search(
            collection_name=self.collection_name,
            query=query,
            query_vector=query_vector,
            limit=config.top_k,
            alpha=config.alpha,
            filters=config.filters
        )
        
        if config.score_threshold > 0:
            results = [r for r in results if r.score is not None and r.score >= config.score_threshold]
        
        return results


# 保留原有的 HybridRetriever 以保持向后兼容
class HybridRetriever:
    """
    混合检索器（原有接口）
    
    保留以支持现有代码，建议使用 WeaviateHybridRetriever（LangChain 兼容）。
    """
    
    def __init__(
        self,
        weaviate_client: WeaviateClient,
        embedding_service: EmbeddingService
    ):
        self.weaviate = weaviate_client
        self.embedding = embedding_service
    
    async def retrieve(
        self,
        query: str,
        collection_name: str,
        config: Optional[RetrievalConfig] = None
    ) -> List[SearchResult]:
        """执行检索"""
        config = config or RetrievalConfig()
        
        # 使用 LangChain 兼容的检索器
        retriever = WeaviateHybridRetriever(
            weaviate_client=self.weaviate,
            embedding_service=self.embedding,
            collection_name=collection_name,
            mode=config.mode.value,
            top_k=config.top_k,
            alpha=config.alpha,
            score_threshold=config.score_threshold,
            filters=config.filters
        )
        
        # 直接调用异步方法获取原始结果
        if config.mode == RetrievalMode.SEMANTIC:
            return await retriever._semantic_search(query, config)
        elif config.mode == RetrievalMode.KEYWORD:
            return await retriever._keyword_search(query, config)
        else:
            return await retriever._hybrid_search(query, config)
