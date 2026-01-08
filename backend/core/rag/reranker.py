"""
Reranker 重排序模块

使用 LangChain 集成的 DashScope Rerank 模型对检索结果重排序。

Author: chunlin
"""

from typing import List, Optional
from dataclasses import dataclass
import asyncio


@dataclass 
class RerankResult:
    """重排序结果"""
    content: str
    score: float
    original_index: int
    metadata: dict


class DashScopeReranker:
    """
    DashScope Reranker (基于 LangChain 集成)
    
    使用 langchain_community 的 DashScopeRerank 组件。
    
    模型选项：
    - gte-rerank (默认)
    """
    
    def __init__(
        self, 
        model_name: str = "gte-rerank",
        top_n: int = 10
    ):
        self.model_name = model_name
        self.top_n = top_n
        self._reranker = None
    
    def _get_reranker(self):
        """懒加载 LangChain DashScopeRerank 实例"""
        if self._reranker is None:
            from langchain_community.document_compressors.dashscope_rerank import DashScopeRerank
            from configs import get_settings
            
            settings = get_settings()
            self._reranker = DashScopeRerank(
                model=self.model_name,
                top_n=self.top_n,
                dashscope_api_key=settings.dashscope_api_key
            )
        return self._reranker
    
    async def rerank(
        self,
        query: str,
        documents: List[dict],
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None
    ) -> List[RerankResult]:
        """
        对文档进行重排序
        
        Args:
            query: 查询文本
            documents: 文档列表，每个包含 content 和 metadata
            top_k: 返回前 K 个结果
            score_threshold: 分数阈值
            
        Returns:
            重排序后的结果列表
        """
        if not documents:
            return []
        
        from langchain_core.documents import Document as LCDocument
        
        # 转换为 LangChain Document 格式
        lc_docs = [
            LCDocument(
                page_content=d.get("content", ""),
                metadata=d.get("metadata", {})
            )
            for d in documents
        ]
        
        # 在线程池中执行（reranker.compress_documents 是同步方法）
        loop = asyncio.get_event_loop()
        reranker = self._get_reranker()
        
        # 动态设置 top_n
        if top_k:
            reranker.top_n = top_k
        
        compressed_docs = await loop.run_in_executor(
            None,
            lambda: reranker.compress_documents(lc_docs, query)
        )
        
        # 构建结果
        results = []
        for i, doc in enumerate(compressed_docs):
            score = doc.metadata.get("relevance_score", 0.0)
            
            if score_threshold is not None and score < score_threshold:
                continue
            
            # 查找原始索引
            original_idx = next(
                (j for j, d in enumerate(documents) if d.get("content") == doc.page_content),
                i
            )
            
            results.append(RerankResult(
                content=doc.page_content,
                score=score,
                original_index=original_idx,
                metadata=doc.metadata
            ))
        
        return results
