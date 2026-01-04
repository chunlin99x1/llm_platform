from pydantic import Field
from pydantic_settings import BaseSettings


class LLMSettings(BaseSettings):
    """
    默认使用通义千问 OpenAI 兼容端点（compatible-mode）。
    出于安全考虑，不在代码/README 中内置真实 API Key，请通过环境变量提供。
    """

    api_key: str = Field("sk-hLshRr7Ejn", validation_alias="DASHSCOPE_API_KEY")
    base_url: str = Field("https://dashscope.aliyuncs.com/compatible-mode/v1", validation_alias="DASHSCOPE_BASE_URL")
    model_name: str = Field("qwen-max", validation_alias="MODEL_NAME")


class AppSettings(BaseSettings):
    llm: LLMSettings = Field(default_factory=LLMSettings)
    db_url: str = Field("postgres://postgres:123456@localhost:5432/llmops", validation_alias="DB_URL")


def load_settings() -> AppSettings:
    return AppSettings()  # type: ignore[arg-type]
