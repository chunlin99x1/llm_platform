"""
Weaviate + LangChain 客户端（v4 API）

支持：
- Collection 管理
- 文档批量写入（外部 embedding）
- 混合检索（向量 + BM25）
- Metadata 过滤
- 纯向量检索
- BM25 检索

Dependencies:
    pip install weaviate-client>=4.0.0 langchain-community
"""

from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from urllib.parse import urlparse
import logging

import weaviate
from weaviate.classes.init import Auth, AdditionalConfig, Timeout
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import Filter, MetadataQuery
from langchain_community.vectorstores import Weaviate
from langchain_core.documents import Document

# 设置日志
logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class WeaviateClient:
    """
    LangChain + Weaviate v4 封装 (gRPC Enabled)
    """

    def __init__(
        self,
        url: str = "http://localhost:8080",
        api_key: Optional[str] = None,
        grpc_port: int = 50051,
        additional_headers: Optional[Dict[str, str]] = None,
        timeout_config: Optional[Dict[str, int]] = None,
    ):
        """
        初始化 Weaviate 客户端

        Args:
            url: Weaviate HTTP 地址 (例如: http://localhost:8080)
            api_key: Weaviate API Key
            grpc_port: gRPC 端口（默认 50051）
            additional_headers: 额外的 headers（如 OpenAI API Key）
            timeout_config: 超时配置 {"init": 30, "query": 60, "insert": 120}
        """
        self.url = url
        self.additional_headers = additional_headers or {}

        # 1. 解析 URL 以提取 host, port, scheme
        parsed = urlparse(url)
        http_host = parsed.hostname or "localhost"
        http_port = parsed.port or (443 if parsed.scheme == "https" else 8080)
        http_secure = parsed.scheme == "https"

        # 2. 认证配置
        auth_credentials = Auth.api_key(api_key) if api_key else None

        # 3. 超时配置
        timeout_settings = Timeout(
            init=timeout_config.get("init", 30) if timeout_config else 30,
            query=timeout_config.get("query", 60) if timeout_config else 60,
            insert=timeout_config.get("insert", 120) if timeout_config else 120,
        )

        # 4. 初始化连接 (默认启用 gRPC)
        try:
            self.client = weaviate.connect_to_custom(
                http_host=http_host,
                http_port=http_port,
                http_secure=http_secure,
                grpc_host=http_host,  # 通常 gRPC host 与 HTTP host 相同
                grpc_port=grpc_port,
                grpc_secure=http_secure,
                auth_credentials=auth_credentials,  # 这里已经处理了认证
                headers=self.additional_headers,    # 这里只传其他的 headers (如 OpenAI key)
                additional_config=AdditionalConfig(timeout=timeout_settings),
                skip_init_checks=False  # 生产环境建议保持检查
            )

            if self.client.is_connected():
                logger.info(f"Connected to Weaviate at {url} (gRPC: {grpc_port})")
            else:
                logger.warning("Weaviate client initialized but connection test failed.")

        except Exception as e:
            logger.error(f"Failed to connect to Weaviate: {e}")
            raise e

    def close(self):
        """关闭连接"""
        if self.client and self.client.is_connected():
            self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # ============================
    # Collection 管理
    # ============================

    async def create_collection(self, name: str) -> bool:
        """创建 Collection (Schema 定义)"""
        if self.client.collections.exists(name):
            return True

        try:
            self.client.collections.create(
                name=name,
                # 显式禁用内置 Vectorizer，因为我们使用外部 embedding
                vectorizer_config=Configure.Vectorizer.none(),
                properties=[
                    Property(name="content", data_type=DataType.TEXT),
                    Property(name="doc_id", data_type=DataType.TEXT, skip_vectorization=True),
                    Property(name="doc_name", data_type=DataType.TEXT, skip_vectorization=True),
                    Property(name="chunk_index", data_type=DataType.INT, skip_vectorization=True),
                    Property(name="knowledge_base_id", data_type=DataType.TEXT, skip_vectorization=True),
                    Property(name="source", data_type=DataType.TEXT, skip_vectorization=True),
                ]
            )
            logger.info(f"Collection '{name}' created.")
            return True
        except Exception as e:
            logger.error(f"Error creating collection {name}: {e}")
            return False

    async def delete_collection(self, name: str) -> bool:
        """删除 Collection"""
        if self.client.collections.exists(name):
            self.client.collections.delete(name)
            logger.info(f"Collection '{name}' deleted.")
        return True

    async def list_collections(self) -> List[str]:
        """列出所有 Collections"""
        collections = self.client.collections.list_all()
        return list(collections.keys())

    # ============================
    # 文档写入（外部 embedding）
    # ============================

    async def add_documents(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
        vectors: List[List[float]]
    ) -> List[str]:
        """
        批量添加文档
        注意：documents 和 vectors 的长度必须一致
        """
        if len(documents) != len(vectors):
            raise ValueError("Documents and vectors must have the same length.")

        collection = self.client.collections.get(collection_name)
        ids = []

        # 使用 dynamic batch，自动处理并发和重试
        with collection.batch.dynamic() as batch:
            for doc, vector in zip(documents, vectors):
                # 确保 vector 是列表格式
                vec = vector if isinstance(vector, list) else list(vector)

                uuid = batch.add_object(
                    properties={
                        "content": doc.get("content", ""),
                        "doc_id": doc.get("doc_id", ""),
                        "doc_name": doc.get("doc_name", ""),
                        "chunk_index": doc.get("chunk_index", 0),
                        "knowledge_base_id": doc.get("knowledge_base_id", ""),
                        "source": doc.get("source", ""),
                    },
                    vector=vec
                )
                ids.append(str(uuid))

        # 检查是否有失败的对象
        if collection.batch.failed_objects:
            logger.error(f"Failed to import {len(collection.batch.failed_objects)} objects.")
            for failed in collection.batch.failed_objects:
                logger.error(f"Error: {failed.message}")

        return ids

    # ============================
    # LangChain VectorStore 封装
    # ============================

    def _get_vectorstore(self, collection_name: str, embedding) -> Weaviate:
        """获取 LangChain VectorStore 实例"""
        return Weaviate(
            client=self.client,
            index_name=collection_name,
            text_key="content",
            embedding=embedding,
            by_text=False,  # 使用外部 embedding
        )

    def _build_filter(self, filters: Optional[Dict[str, Any]]) -> Optional[Filter]:
        """
        构建 Weaviate V4 过滤器
        支持:
        - 字符串/数字 -> Equal
        - 列表 -> ContainsAny
        """
        if not filters:
            return None

        conditions = []
        for key, value in filters.items():
            if isinstance(value, list):
                # 如果是列表，通常表示 key 的值包含在列表中任意一个 (OR 逻辑)
                conditions.append(Filter.by_property(key).contains_any(value))
            elif isinstance(value, (str, int, float, bool)):
                conditions.append(Filter.by_property(key).equal(value))

        if not conditions:
            return None

        if len(conditions) == 1:
            return conditions[0]

        # 多个条件使用 AND 连接
        return Filter.all_of(conditions)

    def _parse_result(self, obj) -> SearchResult:
        """内部工具：将 Weaviate 对象解析为 SearchResult"""
        props = obj.properties
        meta = obj.metadata

        # 统一处理分数
        score = 0.0
        distance = 0.0

        if meta:
            if hasattr(meta, 'score'):  # BM25 / Hybrid
                score = meta.score
            if hasattr(meta, 'distance'):  # Vector
                distance = meta.distance
                # 将距离转换为相似度分数 (0~1)
                # Cosine distance ranges usually from 0 to 2.
                # Common normalization: 1 / (1 + distance)
                if score == 0.0 and distance is not None:
                    score = 1.0 / (1.0 + distance)

        return SearchResult(
            id=str(obj.uuid),
            content=props.get("content", ""),
            score=score,
            metadata={
                "doc_id": props.get("doc_id", ""),
                "doc_name": props.get("doc_name", ""),
                "chunk_index": props.get("chunk_index", 0),
                "knowledge_base_id": props.get("knowledge_base_id", ""),
                "source": props.get("source", ""),
                "distance": distance,
            }
        )

    # ============================
    # 混合检索（Hybrid）
    # ============================

    async def hybrid_search(
        self,
        collection_name: str,
        query: str,
        embedding,
        query_vector: Optional[List[float]] = None,
        alpha: float = 0.5,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        混合检索（向量 + BM25）
        """
        collection = self.client.collections.get(collection_name)

        if query_vector is None:
            query_vector = embedding.embed_query(query)

        weaviate_filter = self._build_filter(filters)

        try:
            response = collection.query.hybrid(
                query=query,
                vector=query_vector,
                alpha=alpha,
                limit=limit,
                filters=weaviate_filter,
                return_metadata=MetadataQuery(score=True, distance=True),
            )
            return [self._parse_result(obj) for obj in response.objects]
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []

    # ============================
    # 纯向量检索
    # ============================

    async def vector_search(
        self,
        collection_name: str,
        query: str,
        embedding,
        query_vector: Optional[List[float]] = None,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """纯向量检索"""
        collection = self.client.collections.get(collection_name)

        if query_vector is None:
            query_vector = embedding.embed_query(query)

        weaviate_filter = self._build_filter(filters)

        try:
            response = collection.query.near_vector(
                near_vector=query_vector,
                limit=limit,
                filters=weaviate_filter,
                return_metadata=MetadataQuery(distance=True),
            )
            return [self._parse_result(obj) for obj in response.objects]
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

    # ============================
    # BM25 检索
    # ============================

    async def bm25_search(
        self,
        collection_name: str,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """BM25 关键词检索"""
        collection = self.client.collections.get(collection_name)
        weaviate_filter = self._build_filter(filters)

        try:
            response = collection.query.bm25(
                query=query,
                limit=limit,
                filters=weaviate_filter,
                return_metadata=MetadataQuery(score=True),
            )
            return [self._parse_result(obj) for obj in response.objects]
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            return []

    # ============================
    # 删除与统计
    # ============================

    async def find_uuid(
        self,
        collection_name: str,
        filters: Dict[str, Any]
    ) -> Optional[str]:
        """查找单个对象的 UUID"""
        collection = self.client.collections.get(collection_name)
        weaviate_filter = self._build_filter(filters)
        
        try:
            # 只获取 UUID，不获取属性和向量
            response = collection.query.fetch_objects(
                filters=weaviate_filter,
                limit=1,
                include_vector=False
            )
            if response.objects:
                return str(response.objects[0].uuid)
            return None
        except Exception as e:
            logger.error(f"Find UUID failed: {e}")
            return None

    async def update_object(
        self,
        collection_name: str,
        uuid: str,
        properties: Optional[Dict[str, Any]] = None,
        vector: Optional[List[float]] = None
    ) -> bool:
        """更新对象的属性和向量"""
        collection = self.client.collections.get(collection_name)
        try:
            collection.data.update(
                uuid=uuid,
                properties=properties,
                vector=vector
            )
            return True
        except Exception as e:
            logger.error(f"Update object failed: {e}")
            return False

    async def delete_documents(
        self,
        collection_name: str,
        filters: Dict[str, Any]
    ) -> int:
        """根据过滤条件批量删除文档"""
        collection = self.client.collections.get(collection_name)
        weaviate_filter = self._build_filter(filters)

        if weaviate_filter is None:
            logger.warning("Delete operation aborted: No filters provided (would delete all).")
            return 0

        try:
            result = collection.data.delete_many(where=weaviate_filter)
            return result.successful
        except Exception as e:
            logger.error(f"Delete documents failed: {e}")
            return 0

    async def delete_by_ids(
        self,
        collection_name: str,
        ids: List[str]
    ) -> int:
        """根据 ID 列表删除文档"""
        collection = self.client.collections.get(collection_name)
        try:
            # V4 同样支持 delete_many 传入 uuid 列表的过滤器，这比循环删除效率高
            # 但这里使用循环确保兼容性，或者使用 batch delete logic
            result = collection.data.delete_many(
                where=Filter.by_id().contains_any(ids)
            )
            return result.successful
        except Exception as e:
            logger.error(f"Delete by IDs failed: {e}")
            return 0

    async def get_document_by_id(
        self,
        collection_name: str,
        doc_id: str
    ) -> Optional[SearchResult]:
        """根据 ID 获取文档"""
        collection = self.client.collections.get(collection_name)
        try:
            obj = collection.query.fetch_object_by_id(doc_id)
            if obj:
                return self._parse_result(obj)
        except Exception:
            return None
        return None

    async def count_documents(
        self,
        collection_name: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """统计文档数量"""
        collection = self.client.collections.get(collection_name)
        weaviate_filter = self._build_filter(filters)

        try:
            response = collection.aggregate.over_all(
                filters=weaviate_filter,
                total_count=True,
            )
            return response.total_count or 0
        except Exception as e:
            logger.error(f"Count documents failed: {e}")
            return 0
