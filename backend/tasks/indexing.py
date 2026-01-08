"""
文档索引异步任务

将文档分块、向量化、存储到向量数据库。

Author: chunlin
"""

from .celery_app import celery_app
from celery import states
import asyncio


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
        
        # 2. 向量化（使用同步方式，因为 Celery 任务是同步的）
        embedding = EmbeddingService(
            provider=embedding_provider,
            model=embedding_model
        )
        
        texts = [seg.content for seg in segments]
        
        # 运行异步函数
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            vectors = loop.run_until_complete(embedding.embed_documents(texts))
        finally:
            loop.close()
        
        self.update_state(state="INDEXING", meta={
            "progress": 70, 
            "stage": "存储到向量库...",
            "total_chunks": len(segments)
        })
        
        # 3. 存储到 Weaviate
        weaviate = WeaviateClient()
        collection_name = f"kb_{knowledge_base_id}"
        
        try:
            documents_to_add = []
            for seg in segments:
                documents_to_add.append({
                    "content": seg.content,
                    "doc_id": str(document_id),
                    "doc_name": filename,
                    "chunk_index": seg.position,
                    "knowledge_base_id": str(knowledge_base_id),
                    "source": filename,
                })
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    weaviate.add_documents(collection_name, documents_to_add, vectors)
                )
            finally:
                loop.close()
        finally:
            weaviate.close()
        
        self.update_state(state="SAVING", meta={
            "progress": 90, 
            "stage": "保存片段到数据库..."
        })
        
        # 4. 保存片段到数据库（数据库连接已在 worker 启动时初始化）
        from database.models import DocumentSegment
        
        async def save_segments():
            for seg in segments:
                await DocumentSegment.create(
                    document_id=document_id,
                    content=seg.content,
                    position=seg.position,
                    tokens=seg.tokens
                )
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(save_segments())
        finally:
            loop.close()
        
        return {
            "status": "success",
            "document_id": document_id,
            "segments": len(segments),
            "tokens": sum(seg.tokens for seg in segments)
        }
        
    except Exception as e:
        self.update_state(state=states.FAILURE, meta={"error": str(e)})
        raise
