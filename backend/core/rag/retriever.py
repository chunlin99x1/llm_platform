"""
混合检索器（LangChain 兼容）

基于 Weaviate 的混合检索器，支持 LangChain BaseRetriever 接口。

Author: chunlin
"""

from typing import List, Dict, Any, Optional
from enum import Enum

from pydantic import Field
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
    weaviate_client: Any = Field(description="Weaviate client instance")
    embedding_service: Any = Field(description="Embedding service instance")
    collection_name: str = Field(description="Weaviate collection name")
    mode: str = Field(default="hybrid", description="Retrieval mode: semantic, keyword, hybrid")
    top_k: int = Field(default=10, description="Number of results to return")
    alpha: float = Field(default=0.5, description="Hybrid search weight (0=BM25, 1=Vector)")
    score_threshold: float = Field(default=0.0, description="Minimum score threshold")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Metadata filters")
    
    # Pydantic v2 配置
    model_config = {"arbitrary_types_allowed": True}
    
    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun = None
    ) -> List[Document]:
        """
        同步检索方法（LangChain 接口要求）
        """
        import asyncio
        
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        
        if loop and loop.is_running():
            import concurrent.futures
            future = asyncio.run_coroutine_threadsafe(
                self._aretrieve(query),
                loop
            )
            return future.result()
        else:
            return asyncio.run(self._aretrieve(query))
    
    async def _aretrieve(self, query: str) -> List[Document]:
        """异步检索实现，返回 LangChain Document"""
        results = await self.retrieve_raw(query)
        
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
    
    async def retrieve_raw(self, query: str) -> List[SearchResult]:
        """
        异步检索，返回原始 SearchResult 格式
        
        供需要直接访问 SearchResult 的场景使用。
        """
        print(f"[RETRIEVER DEBUG] retrieve_raw called, mode={self.mode}")
        mode = RetrievalMode(self.mode)
        
        if mode == RetrievalMode.SEMANTIC:
            results = await self._semantic_search(query)
        elif mode == RetrievalMode.KEYWORD:
            results = await self._keyword_search(query)
        else:
            results = await self._hybrid_search(query)
        
        print(f"[RETRIEVER DEBUG] retrieve_raw got {len(results)} results before threshold filter")
        
        # 分数过滤
        if self.score_threshold > 0:
            print(f"[RETRIEVER DEBUG] score_threshold={self.score_threshold}, first result score={results[0].score if results else 'N/A'}")
            results = [r for r in results if r.score is not None and r.score >= self.score_threshold]
            print(f"[RETRIEVER DEBUG] retrieve_raw got {len(results)} results after threshold filter")
        
        return results
    
    async def _semantic_search(self, query: str) -> List[SearchResult]:
        """纯向量检索"""
        query_vector = await self.embedding_service.embed_query(query)
        print(f"[RETRIEVER DEBUG] _semantic_search called, collection: {self.collection_name}")
        
        results = await self.weaviate_client.vector_search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=self.top_k,
            filters=self.filters
        )
        print(f"[RETRIEVER DEBUG] _semantic_search got {len(results)} results")
        return results
    
    async def _keyword_search(self, query: str) -> List[SearchResult]:
        """纯 BM25 检索"""
        return await self.weaviate_client.bm25_search(
            collection_name=self.collection_name,
            query=query,
            limit=self.top_k,
            filters=self.filters
        )
    
    async def _hybrid_search(self, query: str) -> List[SearchResult]:
        """混合检索"""
        query_vector = await self.embedding_service.embed_query(query)
        
        return await self.weaviate_client.hybrid_search(
            collection_name=self.collection_name,
            query=query,
            query_vector=query_vector,
            limit=self.top_k,
            alpha=self.alpha,
            filters=self.filters
        )
