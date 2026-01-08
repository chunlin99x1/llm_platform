"""
混合检索器

整合向量检索和 BM25 检索。

Author: chunlin
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

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


class HybridRetriever:
    """
    混合检索器
    
    支持：
    - 纯向量检索
    - 纯 BM25 检索
    - 混合检索（向量 + BM25）
    - Metadata 过滤
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
        """
        执行检索
        
        Args:
            query: 查询文本
            collection_name: 知识库 Collection 名称
            config: 检索配置
            
        Returns:
            检索结果列表
        """
        config = config or RetrievalConfig()
        
        if config.mode == RetrievalMode.SEMANTIC:
            return await self._semantic_search(query, collection_name, config)
        elif config.mode == RetrievalMode.KEYWORD:
            return await self._keyword_search(query, collection_name, config)
        else:
            return await self._hybrid_search(query, collection_name, config)
    
    async def _semantic_search(
        self,
        query: str,
        collection_name: str,
        config: RetrievalConfig
    ) -> List[SearchResult]:
        """纯向量检索"""
        # 向量化查询
        query_vector = await self.embedding.embed_query(query)
        
        # 检索
        results = await self.weaviate.vector_search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=config.top_k,
            filters=config.filters
        )
        
        # 分数过滤
        if config.score_threshold > 0:
            results = [r for r in results if r.score >= config.score_threshold]
        
        return results
    
    async def _keyword_search(
        self,
        query: str,
        collection_name: str,
        config: RetrievalConfig
    ) -> List[SearchResult]:
        """纯 BM25 检索"""
        results = await self.weaviate.bm25_search(
            collection_name=collection_name,
            query=query,
            limit=config.top_k,
            filters=config.filters
        )
        
        # 分数过滤
        if config.score_threshold > 0:
            results = [r for r in results if r.score >= config.score_threshold]
        
        return results
    
    async def _hybrid_search(
        self,
        query: str,
        collection_name: str,
        config: RetrievalConfig
    ) -> List[SearchResult]:
        """混合检索"""
        # 向量化查询
        query_vector = await self.embedding.embed_query(query)
        
        # 混合检索
        results = await self.weaviate.hybrid_search(
            collection_name=collection_name,
            query=query,
            query_vector=query_vector,
            limit=config.top_k,
            alpha=config.alpha,
            filters=config.filters
        )
        
        # 分数过滤
        if config.score_threshold > 0:
            results = [r for r in results if r.score >= config.score_threshold]
        
        return results
