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
import logging

from database.models import KnowledgeBase, Document, DocumentSegment
from core.rag.chunker import DocumentChunker
from core.rag.embedding import EmbeddingService
from core.rag.db_conn import get_weaviate_client
from core.rag.retriever import WeaviateHybridRetriever, RetrievalMode
from core.rag.reranker import DashScopeReranker
# 在文件顶部添加日志配置
logger = logging.getLogger(__name__)

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


class UpdateKnowledgeBaseRequest(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None
    retrieval_mode: Optional[str] = None  # semantic, keyword, hybrid
    indexing_config: Optional[dict] = None  # 索引配置


class KnowledgeBaseDetailResponse(BaseModel):
    """知识库详情响应（包含更多字段）"""
    id: int
    name: str
    description: Optional[str]
    embedding_provider: str
    embedding_model: Optional[str]
    retrieval_mode: str
    indexing_config: Optional[dict]
    document_count: int
    word_count: int  # 总字符数
    created_at: datetime
    updated_at: datetime


class UpdateDocumentRequest(BaseModel):
    """更新文档请求"""
    name: Optional[str] = None
    enabled: Optional[bool] = None
    archived: Optional[bool] = None


class BatchDocumentRequest(BaseModel):
    """批量文档操作请求"""
    document_ids: List[int]
    action: str  # enable, disable, delete, archive


class DocumentResponse(BaseModel):
    """文档响应"""
    id: int
    name: str
    status: str  # pending, indexing, completed, error
    enabled: bool
    archived: bool
    word_count: int
    segment_count: int
    error_message: Optional[str]
    indexing_task_id: Optional[str]
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """文档列表响应"""
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class UpdateSegmentRequest(BaseModel):
    """更新分段请求"""
    content: Optional[str] = None
    keywords: Optional[List[str]] = None
    enabled: Optional[bool] = None


class SegmentResponse(BaseModel):
    """分段响应"""
    id: int
    content: str
    position: int
    tokens: int
    keywords: Optional[List[str]]
    hit_count: int
    enabled: bool
    created_at: datetime


class SegmentListResponse(BaseModel):
    """分段列表响应"""
    segments: List[SegmentResponse]
    total: int
    page: int
    page_size: int


class HitTestingRequest(BaseModel):
    """召回测试请求"""
    query: str
    retrieval_mode: Optional[str] = None
    top_k: int = 10
    score_threshold: float = 0.0
    rerank: bool = True
    rerank_top_k: int = 5


class HitTestingResult(BaseModel):
    """召回测试结果"""
    content: str
    score: float
    document_id: int
    document_name: str
    segment_id: int
    position: int
    word_count: int


class HitTestingResponse(BaseModel):
    """召回测试响应"""
    query: str
    results: List[HitTestingResult]
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
    weaviate = get_weaviate_client()
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
    weaviate = get_weaviate_client()
    collection_name = f"kb_{kb_id}"

    try:
        await weaviate.delete_collection(collection_name)
    except Exception as e:
        # 即使删除 Collection 失败（比如不存在），可能也想继续删除数据库记录
        # 这里根据业务需求决定是报错返回，还是 log 一下继续
        logger.warning(f"Warning: Failed to delete collection {collection_name}: {e}")

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
        metadata={"size": len(content), "type": file.content_type},
        status="indexing",
        word_count=len(text),
        segment_count=0
    )

    # 提交异步任务
    from tasks.indexing import index_document_task

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

    # 更新任务 ID
    doc.indexing_task_id = task.id
    await doc.save()

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
    from tasks.celery_app import celery_app

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
    weaviate =get_weaviate_client()
    embedding = EmbeddingService(
        provider=kb.embedding_provider,
        model=kb.embedding_model
    )

    # 确定检索模式
    mode_str = payload.retrieval_mode or kb.retrieval_mode

    collection_name = f"kb_{kb_id}"
    
    retriever = WeaviateHybridRetriever(
        weaviate_client=weaviate,
        embedding_service=embedding,
        collection_name=collection_name,
        mode=mode_str,
        top_k=payload.top_k,
        alpha=payload.alpha,
        score_threshold=payload.score_threshold,
        filters=payload.filters
    )

    try:
        # 执行检索
        results = await retriever.retrieve_raw(query=payload.query)

        # Rerank
        if payload.rerank and results:
            reranker = DashScopeReranker()
            docs_for_rerank = [
                {"content": r.content, "metadata": r.metadata}
                for r in results
            ]

            rerank_results = await reranker.rerank(
                query=payload.query,
                documents=docs_for_rerank,
                top_k=payload.rerank_top_k
            )
            candidates = rerank_results
        else:
            candidates = results

        # 过滤已禁用或归档的文档/分段
        final_results = []
        if candidates:
            # 收集所有涉及的 ID
            doc_ids = set()
            seg_ids = set()
            for r in candidates:
                if d_id := r.metadata.get("doc_id"):
                    doc_ids.add(int(d_id))
                if s_id := r.metadata.get("segment_id"):
                    seg_ids.add(int(s_id))

            # 批量查询状态
            # 1. 查找有效文档 (enabled=True, archived=False)
            valid_docs = await Document.filter(
                id__in=list(doc_ids),
                knowledge_base_id=kb_id,
                enabled=True,
                archived=False
            ).values_list("id", flat=True)
            valid_doc_ids = set(valid_docs)

            # 2. 查找有效分段 (enabled=True)
            # 注意：如果 Weaviate 没存 segment_id，可能无法过滤分段级别，但在本系统中应该都存了
            valid_segs = await DocumentSegment.filter(
                id__in=list(seg_ids),
                enabled=True
            ).values_list("id", flat=True)
            valid_seg_ids = set(valid_segs)

            for r in candidates:
                doc_id = int(r.metadata.get("doc_id", 0))
                seg_id = int(r.metadata.get("segment_id", 0))

                # 检查文档和分段是否有效
                if doc_id in valid_doc_ids and seg_id in valid_seg_ids:
                    final_results.append(QueryResult(
                        content=r.content,
                        score=r.score,
                        doc_name=r.metadata.get("doc_name"),
                        chunk_index=r.metadata.get("chunk_index", 0),
                        metadata=r.metadata
                    ))

            # 3. 更新命中计数 (Async update)
            # 提取最终结果中的分段 ID
            hit_seg_ids = []
            for res in final_results:
                if s_id := res.metadata.get("segment_id"):
                    hit_seg_ids.append(int(s_id))

            if hit_seg_ids:
                from tortoise.expressions import F
                await DocumentSegment.filter(id__in=hit_seg_ids).update(hit_count=F("hit_count") + 1)

    except Exception as e:
        print(f"datasets {kb_id} query  Error: {e}")

    return QueryResponse(
        results=final_results,
        total=len(final_results)
    )


# ============== 知识库更新 API ==============

@router.put("/datasets/{kb_id}", response_model=KnowledgeBaseDetailResponse)
async def update_knowledge_base(kb_id: int, payload: UpdateKnowledgeBaseRequest):
    """更新知识库设置"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # 更新字段
    if payload.name is not None:
        kb.name = payload.name
    if payload.description is not None:
        kb.description = payload.description
    if payload.embedding_provider is not None:
        kb.embedding_provider = payload.embedding_provider
    if payload.embedding_model is not None:
        kb.embedding_model = payload.embedding_model
    if payload.retrieval_mode is not None:
        kb.retrieval_mode = payload.retrieval_mode
    if payload.indexing_config is not None:
        kb.indexing_config = payload.indexing_config

    await kb.save()

    # 统计
    doc_count = await Document.filter(knowledge_base_id=kb.id).count()
    docs = await Document.filter(knowledge_base_id=kb.id).all()
    total_words = sum(doc.word_count for doc in docs)

    return KnowledgeBaseDetailResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        embedding_provider=kb.embedding_provider,
        embedding_model=kb.embedding_model,
        retrieval_mode=kb.retrieval_mode,
        indexing_config=kb.indexing_config,
        document_count=doc_count,
        word_count=total_words,
        created_at=kb.created_at,
        updated_at=kb.updated_at
    )


@router.get("/datasets/{kb_id}/detail", response_model=KnowledgeBaseDetailResponse)
async def get_knowledge_base_detail(kb_id: int):
    """获取知识库详细信息"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    doc_count = await Document.filter(knowledge_base_id=kb.id).count()
    docs = await Document.filter(knowledge_base_id=kb.id).all()
    total_words = sum(doc.word_count for doc in docs)

    return KnowledgeBaseDetailResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        embedding_provider=kb.embedding_provider,
        embedding_model=kb.embedding_model,
        retrieval_mode=kb.retrieval_mode,
        indexing_config=kb.indexing_config,
        document_count=doc_count,
        word_count=total_words,
        created_at=kb.created_at,
        updated_at=kb.updated_at
    )


# ============== 文档管理 API ==============

@router.get("/datasets/{kb_id}/documents", response_model=DocumentListResponse)
async def list_documents(
    kb_id: int,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    enabled: Optional[bool] = None
):
    """获取文档列表"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # 构建查询
    query = Document.filter(knowledge_base_id=kb_id, archived=False)

    if status:
        query = query.filter(status=status)
    if keyword:
        query = query.filter(name__icontains=keyword)
    if enabled is not None:
        query = query.filter(enabled=enabled)

    # 统计总数
    total = await query.count()

    # 分页
    offset = (page - 1) * page_size
    docs = await query.order_by("-created_at").offset(offset).limit(page_size)

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=doc.id,
                name=doc.name,
                status=doc.status,
                enabled=doc.enabled,
                archived=doc.archived,
                word_count=doc.word_count,
                segment_count=doc.segment_count,
                error_message=doc.error_message,
                indexing_task_id=doc.indexing_task_id,
                created_at=doc.created_at,
                updated_at=doc.updated_at
            )
            for doc in docs
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/datasets/{kb_id}/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(kb_id: int, doc_id: int):
    """获取文档详情"""
    doc = await Document.get_or_none(id=doc_id, knowledge_base_id=kb_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=doc.id,
        name=doc.name,
        status=doc.status,
        enabled=doc.enabled,
        archived=doc.archived,
        word_count=doc.word_count,
        segment_count=doc.segment_count,
        error_message=doc.error_message,
        indexing_task_id=doc.indexing_task_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )


@router.patch("/datasets/{kb_id}/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(kb_id: int, doc_id: int, payload: UpdateDocumentRequest):
    """更新文档状态"""
    doc = await Document.get_or_none(id=doc_id, knowledge_base_id=kb_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if payload.name is not None:
        doc.name = payload.name
    if payload.enabled is not None:
        doc.enabled = payload.enabled
    if payload.archived is not None:
        doc.archived = payload.archived
        if payload.archived:
            doc.enabled = False  # 归档自动禁用

    await doc.save()

    return DocumentResponse(
        id=doc.id,
        name=doc.name,
        status=doc.status,
        enabled=doc.enabled,
        archived=doc.archived,
        word_count=doc.word_count,
        segment_count=doc.segment_count,
        error_message=doc.error_message,
        indexing_task_id=doc.indexing_task_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )


@router.post("/datasets/{kb_id}/documents/batch")
async def batch_operate_documents(kb_id: int, payload: BatchDocumentRequest):
    """批量操作文档"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    docs = await Document.filter(id__in=payload.document_ids, knowledge_base_id=kb_id).all()
    count = 0

    if payload.action == "delete":
        # 需要清理 Weaviate 向量
        weaviate = get_weaviate_client()
        collection_name = f"kb_{kb_id}"
        
        for doc in docs:
            try:
                # 1. 删除 Weaviate 向量 (Best Effort)
                try:
                    await weaviate.delete_by_filter(collection_name, {"doc_id": str(doc.id)})
                except Exception as e:
                    logger.warning(f"Failed to delete vector for doc {doc.id}: {e}")

                # 2. 删除分段
                await DocumentSegment.filter(document_id=doc.id).delete()
                
                # 3. 删除文档
                await doc.delete()
                count += 1
            except Exception as e:
                logger.error(f"Failed to delete document {doc.id}: {e}")

    elif payload.action == "archive":
        for doc in docs:
            doc.archived = True
            doc.enabled = False
            await doc.save()
            count += 1

    elif payload.action == "enable":
        for doc in docs:
            if not doc.archived:
                doc.enabled = True
                await doc.save()
                count += 1

    elif payload.action == "disable":
        for doc in docs:
            doc.enabled = False
            await doc.save()
            count += 1

    return {"action": payload.action, "count": count}


@router.delete("/datasets/{kb_id}/documents/{doc_id}")
async def delete_document(kb_id: int, doc_id: int):
    """删除文档"""
    doc = await Document.get_or_none(id=doc_id, knowledge_base_id=kb_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 从 Weaviate 删除相关向量
    weaviate =get_weaviate_client()
    collection_name = f"kb_{kb_id}"

    try:
        await weaviate.delete_by_filter(
            collection_name=collection_name,
            filters={"doc_id": str(doc_id)}
        )
    except Exception as e:
        # 如果向量删除失败，记录日志但继续删除数据库记录
        print(f"Failed to delete vectors for doc {doc_id}: {e}")

    # 删除分段
    await DocumentSegment.filter(document_id=doc_id).delete()
    # 删除文档
    await doc.delete()

    return {"deleted": True, "document_id": doc_id}


# ============== 分段管理 API ==============

@router.get("/datasets/{kb_id}/documents/{doc_id}/segments", response_model=SegmentListResponse)
async def list_segments(
    kb_id: int,
    doc_id: int,
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None
):
    """获取文档分段列表"""
    doc = await Document.get_or_none(id=doc_id, knowledge_base_id=kb_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    query = DocumentSegment.filter(document_id=doc_id)

    if keyword:
        query = query.filter(content__icontains=keyword)

    total = await query.count()
    offset = (page - 1) * page_size
    segments = await query.order_by("position").offset(offset).limit(page_size)

    return SegmentListResponse(
        segments=[
            SegmentResponse(
                id=seg.id,
                content=seg.content,
                position=seg.position,
                tokens=seg.tokens,
                keywords=seg.keywords,
                hit_count=seg.hit_count,
                enabled=seg.enabled,
                created_at=seg.created_at
            )
            for seg in segments
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/datasets/{kb_id}/documents/{doc_id}/segments/{seg_id}", response_model=SegmentResponse)
async def get_segment(kb_id: int, doc_id: int, seg_id: int):
    """获取单个分段详情"""
    seg = await DocumentSegment.get_or_none(id=seg_id, document_id=doc_id)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    return SegmentResponse(
        id=seg.id,
        content=seg.content,
        position=seg.position,
        tokens=seg.tokens,
        keywords=seg.keywords,
        hit_count=seg.hit_count,
        enabled=seg.enabled,
        created_at=seg.created_at
    )


@router.patch("/datasets/{kb_id}/documents/{doc_id}/segments/{seg_id}", response_model=SegmentResponse)
async def update_segment(kb_id: int, doc_id: int, seg_id: int, payload: UpdateSegmentRequest):
    """更新分段"""
    doc = await Document.get_or_none(id=doc_id, knowledge_base_id=kb_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    seg = await DocumentSegment.get_or_none(id=seg_id, document_id=doc_id)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    if payload.content is not None:
        seg.content = payload.content

        # 同步更新向量 (Re-indexing)
        kb = await KnowledgeBase.get_or_none(id=kb_id)
        if kb:
            try:
                # 1. 生成新的 Embedding
                embedding_service = EmbeddingService(
                    provider=kb.embedding_provider,
                    model=kb.embedding_model
                )
                new_vector = embedding_service.embed_query(payload.content)

                # 2. 更新 Weaviate
                weaviate = get_weaviate_client()
                collection_name = f"kb_{kb_id}"

                try:
                    # 查找 UUID
                    uuid = await weaviate.find_uuid(
                        collection_name,
                        {"doc_id": str(doc.id), "chunk_index": seg.position}
                    )

                    if uuid:
                        # 更新内容和向量
                        await weaviate.update_object(
                            collection_name=collection_name,
                            uuid=uuid,
                            properties={"content": payload.content},
                            vector=new_vector
                        )
                    else:
                        print(f"Warning: Segment vector object not found for doc {doc.id} pos {seg.position}")

                except Exception as e:
                    print(f"Failed to update vector for segment {seg.id}: {e}")
            except Exception as e:
                print(f"Failed to update vector for segment {seg.id}: {e}")
                # 即使向量更新失败，数据库记录仍会保存，但数据会不一致。
                # 生产环境可能需要回滚或重试机制。

    if payload.keywords is not None:
        seg.keywords = payload.keywords
    if payload.enabled is not None:
        seg.enabled = payload.enabled

    await seg.save()

    return SegmentResponse(
        id=seg.id,
        content=seg.content,
        position=seg.position,
        tokens=seg.tokens,
        keywords=seg.keywords,
        hit_count=seg.hit_count,
        enabled=seg.enabled,
        created_at=seg.created_at
    )


# ============== 召回测试 API ==============

@router.post("/datasets/{kb_id}/hit-testing", response_model=HitTestingResponse)
async def hit_testing(kb_id: int, payload: HitTestingRequest):
    """召回测试"""
    kb = await KnowledgeBase.get_or_none(id=kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # 初始化服务
    weaviate = get_weaviate_client()
    embedding = EmbeddingService(
        provider=kb.embedding_provider,
        model=kb.embedding_model
    )
    
    mode_str = payload.retrieval_mode or kb.retrieval_mode

    collection_name = f"kb_{kb_id}"
    
    retriever = WeaviateHybridRetriever(
        weaviate_client=weaviate,
        embedding_service=embedding,
        collection_name=collection_name,
        mode=mode_str,
        top_k=payload.top_k,
        score_threshold=payload.score_threshold
    )

    # ✅ 修复：在 try 之前初始化变量，确保无论是否报错，变量都存在
    final_results = []

    try:
        results = await retriever.retrieve_raw(query=payload.query)
        
        # DEBUG: 打印原始检索结果
        print(f"[HIT_TESTING DEBUG] Query: {payload.query}")
        print(f"[HIT_TESTING DEBUG] Collection: {collection_name}")
        print(f"[HIT_TESTING DEBUG] Raw results count: {len(results)}")
        for i, r in enumerate(results[:3]):  # 只打印前 3 条
            print(f"[HIT_TESTING DEBUG] Result {i}: score={r.score}, content={r.content[:50]}..., metadata={r.metadata}")

        # Rerank
        if payload.rerank and results:
            from core.rag.reranker import DashScopeReranker
            reranker = DashScopeReranker()
            docs_for_rerank = [
                {"content": r.content, "metadata": r.metadata}
                for r in results
            ]

            rerank_results = await reranker.rerank(
                query=payload.query,
                documents=docs_for_rerank,
                top_k=payload.rerank_top_k
            )
            # 兼容 QueryResult 和 HitTestingResult
            candidates = []
            for r in rerank_results:
                candidates.append(QueryResult(
                    content=r.content,
                    score=r.score,
                    doc_name=r.metadata.get("doc_name", ""),
                    chunk_index=r.metadata.get("chunk_index", 0),
                    metadata=r.metadata
                ))
        else:
            candidates = results

        # 过滤已禁用或归档的文档/分段
        # 将 QueryResult 转换为 Candidates 以便统一过滤逻辑（这里可复用逻辑）
        # 为简单起见，这里直接重写一遍过滤逻辑

        final_results = []
        if candidates:
            doc_ids = set()
            seg_ids = set()
            for r in candidates:
                if d_id := r.metadata.get("doc_id"):
                    doc_ids.add(int(d_id))
                if s_id := r.metadata.get("segment_id"):
                    seg_ids.add(int(s_id))

            # 1. 查找有效文档
            valid_docs = await Document.filter(
                id__in=list(doc_ids),
                knowledge_base_id=kb_id,
                enabled=True,
                archived=False
            ).values_list("id", flat=True)
            valid_doc_ids = set(valid_docs)

            # 2. 查找有效分段
            valid_segs = await DocumentSegment.filter(
                id__in=list(seg_ids),
                enabled=True
            ).values_list("id", flat=True)
            valid_seg_ids = set(valid_segs)

            for r in candidates:
                doc_id = int(r.metadata.get("doc_id", 0))
                seg_id = int(r.metadata.get("segment_id", 0))

                if doc_id in valid_doc_ids and seg_id in valid_seg_ids:
                    final_results.append(HitTestingResult(
                        content=r.content,
                        score=r.score,
                        document_id=doc_id,
                        document_name=r.metadata.get("doc_name", ""),
                        segment_id=seg_id,
                        position=r.metadata.get("chunk_index", 0),
                        word_count=len(r.content)
                    ))
    except Exception as e:
        print(f"Failed to retrieve documents: {e}")

    return HitTestingResponse(
        query=payload.query,
        results=final_results,
        total=len(final_results)
    )

