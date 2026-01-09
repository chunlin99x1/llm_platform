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
        from database.connection import init_db, close_db
        
        # 显式初始化数据库连接（绑定到当前 Event Loop）
        await init_db()
        
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
            # 获取 Provider 凭证
            from database.models import ModelProvider
            
            api_key = None
            api_base = None
            
            if embedding_provider and embedding_provider != "local":
                provider_obj = await ModelProvider.get_or_none(name=embedding_provider)
                if provider_obj:
                    api_key = provider_obj.api_key
                    api_base = provider_obj.api_base

            embedding = EmbeddingService(
                provider=embedding_provider,
                model=embedding_model,
                api_key=api_key,
                api_base=api_base
            )

            texts = [seg.content for seg in segments]
            vectors = await embedding.embed_documents(texts)

            self.update_state(state="INDEXING", meta={
                "progress": 70,
                "stage": "存储到数据库...",
                "total_chunks": len(segments)
            })

            # 3. 保存片段到数据库 (先保存以获取 ID)
            from database.models import DocumentSegment
            
            db_segments = []
            for seg in segments:
                db_seg = await DocumentSegment.create(
                    document_id=document_id,
                    content=seg.content,
                    position=seg.position,
                    tokens=seg.tokens,
                    hit_count=0,
                    enabled=True
                )
                db_segments.append(db_seg)

            # 4. 存储到 Weaviate
            weaviate = get_weaviate_client()
            collection_name = f"kb_{knowledge_base_id}"
            
            # 确保 collection 存在并更新 Schema
            await weaviate.create_collection(collection_name)

            documents_to_add = []
            # 使用 db_segments 匹配真实 ID
            for i, seg in enumerate(segments):
                documents_to_add.append({
                    "content": seg.content,
                    "doc_id": str(document_id),
                    "doc_name": filename,
                    "chunk_index": seg.position,
                    "segment_id": db_segments[i].id, # Use REAL DB ID
                    "knowledge_base_id": str(knowledge_base_id),
                    "source": filename,
                    "enabled": True,
                    "archived": False,
                })

            # Do NOT close weaviate here, it is a global singleton!
            await weaviate.add_documents(collection_name, documents_to_add, vectors)

            self.update_state(state="SAVING", meta={
                "progress": 90,
                "stage": "完成..."
            })

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
        finally:
            # 必须关闭数据库连接，释放资源
            await close_db()

    # Run the entire async logic in one loop
    return run_async(index_document_async())

