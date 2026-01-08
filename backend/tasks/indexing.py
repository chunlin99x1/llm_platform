"""
文档索引异步任务

将文档分块、向量化、存储到向量数据库。

Author: chunlin
"""
from .celery_app import celery_app
from celery import states
from configs import get_settings
from core.rag.db_conn import get_weaviate_client
from core.utils import run_async


async def update_document_status(document_id: int, status: str, segment_count: int = 0, error_message: str = None):
    """更新文档状态"""
    from database.models import Document
    doc = await Document.get_or_none(id=document_id)
    if doc:
        doc.status = status
        if segment_count > 0:
            doc.segment_count = segment_count
        if error_message:
            doc.error_message = error_message
        await doc.save()


@celery_app.task(bind=True, name="index_document")
def index_document_task(
    self,
    document_id: int,
    knowledge_base_id: int,
    content: str,
    filename: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    embedding_provider: str = "openai",
    embedding_model: str = None
):
    """
    文档索引任务

    Args:
        document_id: 文档 ID
        knowledge_base_id: 知识库 ID
        content: 文档内容
        filename: 文件名
        chunk_size: 分块大小
        chunk_overlap: 分块重叠
        embedding_provider: 向量化提供商
        embedding_model: 向量化模型
    """
    # 更新任务状态
    self.update_state(state="CHUNKING", meta={"progress": 10, "stage": "分块中..."})

    # 导入模块（在任务中导入，避免循环依赖）
    from core.rag.chunker import DocumentChunker
    from core.rag.embedding import EmbeddingService
    from core.rag.weaviate_client import WeaviateClient

    # ... imports

    # 1. Main Async Logic Wrapper
    async def index_document_async():
        try:
            # 1. 分块
            chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            segments = chunker.chunk_document(
                content=content,
                metadata={"doc_id": str(document_id), "doc_name": filename}
            )

            self.update_state(state="EMBEDDING", meta={
                "progress": 30,
                "stage": "向量化中...",
                "total_chunks": len(segments)
            })

            # 2. 向量化
            embedding = EmbeddingService(
                provider=embedding_provider,
                model=embedding_model
            )

            texts = [seg.content for seg in segments]
            vectors = await embedding.embed_documents(texts)

            self.update_state(state="INDEXING", meta={
                "progress": 70,
                "stage": "存储到向量库...",
                "total_chunks": len(segments)
            })

            # 3. 存储到 Weaviate
            weaviate = get_weaviate_client()
            collection_name = f"kb_{knowledge_base_id}"
            
            # 确保 collection 存在 (Optional check, but safeguards against JIT creation errors)
            # await weaviate.create_collection(collection_name) # Assuming it's improved

            documents_to_add = []
            for i, seg in enumerate(segments):
                documents_to_add.append({
                    "content": seg.content,
                    "doc_id": str(document_id),
                    "doc_name": filename,
                    "chunk_index": seg.position,
                    "knowledge_base_id": str(knowledge_base_id),
                    "source": filename,
                })

            # Do NOT close weaviate here, it is a global singleton!
            await weaviate.add_documents(collection_name, documents_to_add, vectors)

            self.update_state(state="SAVING", meta={
                "progress": 90,
                "stage": "保存片段到数据库..."
            })

            # 4. 保存片段到数据库
            from database.models import DocumentSegment
            
            # Bulk create is better if library supports it, otherwise loop
            for seg in segments:
                await DocumentSegment.create(
                    document_id=document_id,
                    content=seg.content,
                    position=seg.position,
                    tokens=seg.tokens,
                    hit_count=0,
                    enabled=True
                )

            # 5. 更新文档状态为完成
            await update_document_status(
                document_id=document_id,
                status="completed",
                segment_count=len(segments)
            )

            return {
                "status": "success",
                "document_id": document_id,
                "segments": len(segments),
                "tokens": sum(seg.tokens for seg in segments)
            }

        except Exception as e:
            # 更新文档状态为失败
            await update_document_status(
                document_id=document_id,
                status="error",
                error_message=str(e)
            )
            self.update_state(state=states.FAILURE, meta={
                "exc_type": type(e).__name__, "exc_message": str(e)
            })
            raise e

    # Run the entire async logic in one loop
    return run_async(index_document_async())

