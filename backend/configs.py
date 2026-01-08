"""
应用配置

使用 pydantic-settings 从 .env 文件加载配置。
采用 FastAPI 官方推荐的 lru_cache 模式。

Author: chunlin
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict





class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ============== 数据库 ==============
    db_url: str = Field(
        default="postgres://postgres:123456@localhost:5432/llmops",
        alias="DB_URL"
    )

    # ============== Redis ==============
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        alias="REDIS_URL"
    )

    # ============== LLM ==============
    dashscope_api_key: str = Field(default="", alias="DASHSCOPE_API_KEY")
    dashscope_base_url: str = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        alias="DASHSCOPE_BASE_URL"
    )
    default_model: str = Field(default="qwen-max", alias="DEFAULT_MODEL")

    # ============== OpenAI ==============
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        alias="OPENAI_BASE_URL"
    )

    # ============== Weaviate ==============
    weaviate_url: str = Field(default="http://localhost:8080", alias="WEAVIATE_URL")
    weaviate_api_key: str = Field(default="weaviate-admin", alias="WEAVIATE_API_KEY")

    # ============== 向量化 ==============
    embedding_provider: str = Field(default="dashscope", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="text-embedding-v3", alias="EMBEDDING_MODEL")


@lru_cache
def get_settings() -> Settings:
    """
    获取配置实例（使用 lru_cache 确保单例）

    FastAPI 官方推荐方式：
    https://fastapi.tiangolo.com/advanced/settings/
    """
    return Settings()
