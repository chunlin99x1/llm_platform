"""
BGE Reranker 重排序

使用 BGE-Reranker 模型对检索结果重排序。

Author: chunlin
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass
import asyncio


@dataclass 
class RerankResult:
    """重排序结果"""
    content: str
    score: float
    original_index: int
    metadata: dict


class BGEReranker:
    """
    BGE Reranker 重排序器
    
    支持：
    - BAAI/bge-reranker-base（轻量级）
    - BAAI/bge-reranker-large（高精度）
    """
    
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        self.model_name = model_name
        self._model = None
        self._tokenizer = None
    
    def _load_model(self):
        if self._model is None:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
            import torch
            
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self._model.eval()
            
            # 使用 GPU 如果可用
            if torch.cuda.is_available():
                self._model = self._model.cuda()
    
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
        
        # 在线程池中执行模型推理
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            None,
            lambda: self._compute_scores(query, [d.get("content", "") for d in documents])
        )
        
        # 构建结果
        results = []
        for i, (doc, score) in enumerate(zip(documents, scores)):
            if score_threshold is not None and score < score_threshold:
                continue
            
            results.append(RerankResult(
                content=doc.get("content", ""),
                score=score,
                original_index=i,
                metadata=doc.get("metadata", {})
            ))
        
        # 按分数排序
        results.sort(key=lambda x: x.score, reverse=True)
        
        # 截取 top_k
        if top_k:
            results = results[:top_k]
        
        return results
    
    def _compute_scores(self, query: str, documents: List[str]) -> List[float]:
        """计算重排序分数"""
        import torch
        
        self._load_model()
        
        # 构建输入对
        pairs = [[query, doc] for doc in documents]
        
        with torch.no_grad():
            inputs = self._tokenizer(
                pairs,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            outputs = self._model(**inputs)
            scores = outputs.logits.squeeze(-1).float()
            
            # 转换为概率（sigmoid）
            scores = torch.sigmoid(scores).cpu().tolist()
        
        if isinstance(scores, float):
            scores = [scores]
        
        return scores


class CrossEncoderReranker:
    """
    基于 sentence-transformers CrossEncoder 的 Reranker
    
    更简单的实现，兼容性更好。
    """
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
    
    def _load_model(self):
        if self._model is None:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name)
    
    async def rerank(
        self,
        query: str,
        documents: List[dict],
        top_k: Optional[int] = None,
        score_threshold: Optional[float] = None
    ) -> List[RerankResult]:
        """重排序"""
        if not documents:
            return []
        
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            None,
            lambda: self._compute_scores(query, [d.get("content", "") for d in documents])
        )
        
        results = []
        for i, (doc, score) in enumerate(zip(documents, scores)):
            if score_threshold is not None and score < score_threshold:
                continue
            
            results.append(RerankResult(
                content=doc.get("content", ""),
                score=float(score),
                original_index=i,
                metadata=doc.get("metadata", {})
            ))
        
        results.sort(key=lambda x: x.score, reverse=True)
        
        if top_k:
            results = results[:top_k]
        
        return results
    
    def _compute_scores(self, query: str, documents: List[str]) -> List[float]:
        """计算分数"""
        self._load_model()
        pairs = [(query, doc) for doc in documents]
        scores = self._model.predict(pairs)
        return scores.tolist() if hasattr(scores, 'tolist') else list(scores)
