"""
Weaviate 向量数据库客户端

支持混合检索（向量 + BM25）和 Metadata 过滤。

Author: chunlin
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.query import Filter, MetadataQuery
from weaviate.classes.config import Configure, Property, DataType
import os


@dataclass
class SearchResult:
    """检索结果"""
    id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class WeaviateClient:
    """
    Weaviate 客户端封装

    功能：
    - Collection 管理
    - 文档索引
    - 混合检索（向量 + BM25）
    - Metadata 过滤
    """

    def __init__(
        self,
        url: str = "http://localhost:8080",
        api_key: Optional[str] = None,
        collection_name: str = "Document"
    ):
        self.url = url
        self.api_key = api_key or os.getenv("WEAVIATE_API_KEY", "weaviate-admin")
        self.collection_name = collection_name
        self._client = None

    def _get_client(self) -> weaviate.WeaviateClient:
        if self._client is None:
            self._client = weaviate.connect_to_local(
                host=self.url.replace("http://", "").split(":")[0],
                port=int(self.url.split(":")[-1]) if ":" in self.url else 8080,
                auth_credentials=Auth.api_key(self.api_key),
                skip_init_checks = True
            )
        return self._client

    def close(self):
        if self._client:
            self._client.close()
            self._client = None

    async def create_collection(
        self,
        name: str,
        vector_dimension: int = 768
    ) -> bool:
        """
        创建 Collection（知识库）
        """
        client = self._get_client()

        # 检查是否已存在
        if client.collections.exists(name):
            return True

        # 创建 Collection
        client.collections.create(
            name=name,
            vectorizer_config=Configure.Vectorizer.none(),  # 使用外部向量化
            properties=[
                Property(name="content", data_type=DataType.TEXT),
                Property(name="doc_id", data_type=DataType.TEXT),
                Property(name="doc_name", data_type=DataType.TEXT),
                Property(name="chunk_index", data_type=DataType.INT),
                Property(name="knowledge_base_id", data_type=DataType.TEXT),
                Property(name="source", data_type=DataType.TEXT),
                Property(name="created_at", data_type=DataType.DATE),
            ]
        )

        return True

    async def delete_collection(self, name: str) -> bool:
        """删除 Collection"""
        client = self._get_client()
        if client.collections.exists(name):
            client.collections.delete(name)
        return True

    async def add_documents(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
        vectors: List[List[float]]
    ) -> List[str]:
        """
        添加文档到 Collection

        Args:
            collection_name: Collection 名称
            documents: 文档列表，每个包含 content 和 metadata
            vectors: 对应的向量列表

        Returns:
            文档 ID 列表
        """
        client = self._get_client()
        collection = client.collections.get(collection_name)

        ids = []
        with collection.batch.dynamic() as batch:
            for doc, vector in zip(documents, vectors):
                uuid = batch.add_object(
                    properties={
                        "content": doc.get("content", ""),
                        "doc_id": doc.get("doc_id", ""),
                        "doc_name": doc.get("doc_name", ""),
                        "chunk_index": doc.get("chunk_index", 0),
                        "knowledge_base_id": doc.get("knowledge_base_id", ""),
                        "source": doc.get("source", ""),
                    },
                    vector=vector
                )
                ids.append(str(uuid))

        return ids

    async def hybrid_search(
        self,
        collection_name: str,
        query: str,
        query_vector: List[float],
        limit: int = 10,
        alpha: float = 0.5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        混合检索（向量 + BM25）

        Args:
            collection_name: Collection 名称
            query: 查询文本（用于 BM25）
            query_vector: 查询向量
            limit: 返回数量
            alpha: 向量与 BM25 权重（0=纯BM25, 1=纯向量）
            filters: Metadata 过滤条件

        Returns:
            检索结果列表
        """
        client = self._get_client()
        collection = client.collections.get(collection_name)

        # 构建过滤器
        weaviate_filter = None
        if filters:
            filter_conditions = []
            for key, value in filters.items():
                filter_conditions.append(Filter.by_property(key).equal(value))

            if len(filter_conditions) == 1:
                weaviate_filter = filter_conditions[0]
            elif len(filter_conditions) > 1:
                weaviate_filter = Filter.all_of(filter_conditions)

        # 混合检索
        response = collection.query.hybrid(
            query=query,
            vector=query_vector,
            alpha=alpha,
            limit=limit,
            filters=weaviate_filter,
            return_metadata=MetadataQuery(score=True)
        )

        results = []
        for obj in response.objects:
            results.append(SearchResult(
                id=str(obj.uuid),
                content=obj.properties.get("content", ""),
                score=obj.metadata.score if obj.metadata else 0.0,
                metadata={
                    "doc_id": obj.properties.get("doc_id"),
                    "doc_name": obj.properties.get("doc_name"),
                    "chunk_index": obj.properties.get("chunk_index"),
                    "knowledge_base_id": obj.properties.get("knowledge_base_id"),
                    "source": obj.properties.get("source"),
                }
            ))

        return results

    async def vector_search(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """纯向量检索"""
        client = self._get_client()
        collection = client.collections.get(collection_name)

        # 构建过滤器
        weaviate_filter = None
        if filters:
            filter_conditions = []
            for key, value in filters.items():
                filter_conditions.append(Filter.by_property(key).equal(value))

            if len(filter_conditions) == 1:
                weaviate_filter = filter_conditions[0]
            elif len(filter_conditions) > 1:
                weaviate_filter = Filter.all_of(filter_conditions)

        response = collection.query.near_vector(
            near_vector=query_vector,
            limit=limit,
            filters=weaviate_filter,
            return_metadata=MetadataQuery(distance=True)
        )

        results = []
        for obj in response.objects:
            # 将 distance 转换为 score（1 - distance）
            distance = obj.metadata.distance if obj.metadata else 1.0
            score = 1.0 - distance

            results.append(SearchResult(
                id=str(obj.uuid),
                content=obj.properties.get("content", ""),
                score=score,
                metadata={
                    "doc_id": obj.properties.get("doc_id"),
                    "doc_name": obj.properties.get("doc_name"),
                    "chunk_index": obj.properties.get("chunk_index"),
                    "knowledge_base_id": obj.properties.get("knowledge_base_id"),
                    "source": obj.properties.get("source"),
                }
            ))

        return results

    async def bm25_search(
        self,
        collection_name: str,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """纯 BM25 检索"""
        client = self._get_client()
        collection = client.collections.get(collection_name)

        # 构建过滤器
        weaviate_filter = None
        if filters:
            filter_conditions = []
            for key, value in filters.items():
                filter_conditions.append(Filter.by_property(key).equal(value))

            if len(filter_conditions) == 1:
                weaviate_filter = filter_conditions[0]
            elif len(filter_conditions) > 1:
                weaviate_filter = Filter.all_of(filter_conditions)

        response = collection.query.bm25(
            query=query,
            limit=limit,
            filters=weaviate_filter,
            return_metadata=MetadataQuery(score=True)
        )

        results = []
        for obj in response.objects:
            results.append(SearchResult(
                id=str(obj.uuid),
                content=obj.properties.get("content", ""),
                score=obj.metadata.score if obj.metadata else 0.0,
                metadata={
                    "doc_id": obj.properties.get("doc_id"),
                    "doc_name": obj.properties.get("doc_name"),
                    "chunk_index": obj.properties.get("chunk_index"),
                    "knowledge_base_id": obj.properties.get("knowledge_base_id"),
                    "source": obj.properties.get("source"),
                }
            ))

        return results

    async def delete_documents(
        self,
        collection_name: str,
        filters: Dict[str, Any]
    ) -> int:
        """删除符合条件的文档"""
        client = self._get_client()
        collection = client.collections.get(collection_name)

        # 构建过滤器
        filter_conditions = []
        for key, value in filters.items():
            filter_conditions.append(Filter.by_property(key).equal(value))

        if len(filter_conditions) == 1:
            weaviate_filter = filter_conditions[0]
        else:
            weaviate_filter = Filter.all_of(filter_conditions)

        result = collection.data.delete_many(where=weaviate_filter)
        return result.successful
