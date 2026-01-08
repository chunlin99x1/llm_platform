"""
core/rag/db_conn.py
负责管理 Weaviate 的全局连接实例（单例模式）
"""
import logging
from typing import Optional
from configs import get_settings
from core.rag.weaviate_client import WeaviateClient

logger = logging.getLogger(__name__)

# 模块级私有变量，存储单例
_weaviate_instance: Optional[WeaviateClient] = None


def get_weaviate_client() -> WeaviateClient:
    """
    获取全局 Weaviate 客户端实例（懒加载单例）

    1. 如果实例已存在，直接返回。
    2. 如果不存在，初始化一个新的并存储。
    """
    global _weaviate_instance

    if _weaviate_instance is None:
        logger.info("Initializing global WeaviateClient...")
        settings = get_settings()
        _weaviate_instance = WeaviateClient(
            url=settings.weaviate_url,
            api_key=settings.weaviate_api_key,
        )

    # 确保它是连接状态
    if not _weaviate_instance.client.is_connected():
        try:
            _weaviate_instance.client.connect()
        except Exception as e:
            logger.error(f"Failed to connect to Weaviate: {e}")
            raise e

    return _weaviate_instance


def close_weaviate_client():
    """关闭全局连接（通常在服务关闭时调用）"""
    global _weaviate_instance
    if _weaviate_instance:
        logger.info("Closing global WeaviateClient...")
        _weaviate_instance.close()
        _weaviate_instance = None
