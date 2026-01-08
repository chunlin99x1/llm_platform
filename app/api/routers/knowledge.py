"""
知识库 API

提供知识库管理和检索接口。

Author: chunlin
"""

import json
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.db.models import KnowledgeBase, Document, DocumentSegment
from app.core.rag.chunker import DocumentChunker
from app.core.rag.embedding import EmbeddingService
from app.core.rag.weaviate_client import WeaviateClient
from app.core.rag.retriever import HybridRetriever, RetrievalConfig, RetrievalMode
from app.core.rag.reranker import BGEReranker

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# ============== 请求/响应模型 ==============

class CreateKnowledgeBaseRequest(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_provider: str = "openai"
    embedding_model: Optional[str] = None
    retrieval_mode: str = "hybrid"  # semantic, keyword, hybrid


class KnowledgeBaseResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    document_count: int
    created_at: datetime


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    retrieval_mode: Optional[str] = None  # 覆盖默认检索模式
    alpha: float = 0.5  # 混合检索权重
    score_threshold: float = 0.0
    rerank: bool = True
    rerank_top_k: int = 3
    filters: Optional[dict] = None


class QueryResult(BaseModel):
    content: str
    score: float
    doc_name: Optional[str]
    chunk_index: int
    metadata: dict


class QueryResponse(BaseModel):
    results: List[QueryResult]
    total: int


# ============== API 端点 ==============

@router.post("/datasets", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(payload: CreateKnowledgeBaseRequest):
    """创建知识库"""
    # 创建数据库记录
    kb = await KnowledgeBase.create(
        name=payload.name,
        description=payload.description,
        embedding_provider=payload.embedding_provider,
        embedding_model=payload.embedding_model,
        retrieval_mode=payload.retrieval_mode
    )
    
    # 创建 Weaviate Collection
    weaviate = WeaviateClient()
    collection_name = f"kb_{kb.id}"
    
    try:
        await weaviate.create_collection(collection_name)
    finally:
        weaviate.close()
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        document_count=0,
        created_at=kb.created_at
    )


@router.get("/datasets", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_bases():
    """获取所有知识库"""
    kbs = await KnowledgeBase.all()
    
    results = []
    for kb in kbs:
        doc_count = await Document.filter(knowledge_base_id=kb.id).count()
        results.append(KnowledgeBaseResponse(
            id=kb.id,
            name=kb.name,
            description=kb.description,
            document_count=doc_count,
            created_at=kb.created_at
        ))
    
    return results


@router.get("/datasets/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(kb_id: int):
    """获取知识库详情"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    doc_count = await Document.filter(knowledge_base_id=kb.id).count()
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        document_count=doc_count,
        created_at=kb.created_at
    )


@router.delete("/datasets/{kb_id}")
async def delete_knowledge_base(kb_id: int):
    """删除知识库"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # 删除 Weaviate Collection
    weaviate = WeaviateClient()
    collection_name = f"kb_{kb_id}"
    
    try:
        await weaviate.delete_collection(collection_name)
    finally:
        weaviate.close()
    
    # 删除数据库记录（先获取文档 ID，再删除片段）
    docs = await Document.filter(knowledge_base_id=kb_id).all()
    for doc in docs:
        await DocumentSegment.filter(document_id=doc.id).delete()
    await Document.filter(knowledge_base_id=kb_id).delete()
    await kb.delete()
    
    return {"deleted": True}


@router.post("/datasets/{kb_id}/documents")
async def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50)
):
    """上传文档到知识库（异步处理）"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # 读取文件内容
    content = await file.read()
    text = content.decode("utf-8")
    
    # 创建文档记录
    doc = await Document.create(
        knowledge_base_id=kb_id,
        name=file.filename,
        content=text,
        metadata={"size": len(content), "type": file.content_type, "status": "indexing"}
    )
    
    # 提交异步任务
    from app.tasks.indexing import index_document_task
    
    task = index_document_task.delay(
        document_id=doc.id,
        knowledge_base_id=kb_id,
        content=text,
        filename=file.filename,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_provider=kb.embedding_provider,
        embedding_model=kb.embedding_model
    )
    
    return {
        "document_id": doc.id,
        "name": file.filename,
        "task_id": task.id,
        "status": "indexing",
        "message": "文档已提交处理，请通过任务状态接口查询进度"
    }


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    from app.tasks.celery_app import celery_app
    
    result = celery_app.AsyncResult(task_id)
    
    response = {
        "task_id": task_id,
        "status": result.status,
    }
    
    if result.state == "PENDING":
        response["progress"] = 0
        response["stage"] = "等待处理..."
    elif result.state in ["CHUNKING", "EMBEDDING", "INDEXING", "SAVING"]:
        info = result.info or {}
        response["progress"] = info.get("progress", 0)
        response["stage"] = info.get("stage", "处理中...")
        response["total_chunks"] = info.get("total_chunks")
    elif result.state == "SUCCESS":
        response["progress"] = 100
        response["stage"] = "完成"
        response["result"] = result.result
    elif result.state == "FAILURE":
        response["progress"] = 0
        response["stage"] = "失败"
        response["error"] = str(result.info) if result.info else "Unknown error"
    
    return response


@router.post("/datasets/{kb_id}/query", response_model=QueryResponse)
async def query_knowledge_base(kb_id: int, payload: QueryRequest):
    """检索知识库"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # 初始化服务
    weaviate = WeaviateClient()
    embedding = EmbeddingService(
        provider=kb.embedding_provider,
        model=kb.embedding_model
    )
    retriever = HybridRetriever(weaviate, embedding)
    
    # 确定检索模式
    mode_str = payload.retrieval_mode or kb.retrieval_mode
    mode = RetrievalMode(mode_str)
    
    # 检索配置
    config = RetrievalConfig(
        mode=mode,
        top_k=payload.top_k,
        alpha=payload.alpha,
        score_threshold=payload.score_threshold,
        filters=payload.filters
    )
    
    collection_name = f"kb_{kb_id}"
    
    try:
        # 执行检索
        results = await retriever.retrieve(
            query=payload.query,
            collection_name=collection_name,
            config=config
        )
        
        # Rerank
        if payload.rerank and results:
            reranker = BGEReranker()
            docs_for_rerank = [
                {"content": r.content, "metadata": r.metadata}
                for r in results
            ]
            
            rerank_results = await reranker.rerank(
                query=payload.query,
                documents=docs_for_rerank,
                top_k=payload.rerank_top_k
            )
            
            # 转换结果
            final_results = [
                QueryResult(
                    content=r.content,
                    score=r.score,
                    doc_name=r.metadata.get("doc_name"),
                    chunk_index=r.metadata.get("chunk_index", 0),
                    metadata=r.metadata
                )
                for r in rerank_results
            ]
        else:
            final_results = [
                QueryResult(
                    content=r.content,
                    score=r.score,
                    doc_name=r.metadata.get("doc_name"),
                    chunk_index=r.metadata.get("chunk_index", 0),
                    metadata=r.metadata
                )
                for r in results
            ]
    finally:
        weaviate.close()
    
    return QueryResponse(
        results=final_results,
        total=len(final_results)
    )
