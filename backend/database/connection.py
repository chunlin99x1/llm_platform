from tortoise import Tortoise
from configs import get_settings

settings = get_settings()

async def init_db():
    """初始化数据库连接（FastAPI & Celery 通用）"""
    await Tortoise.init(
        db_url=settings.db_url,
        modules={"models": [
            "database.models.app",
            "database.models.workflow",
            "database.models.chat",
            "database.models.knowledge",
            "database.models.settings",
        ]}
    )

async def generate_schema():
    """仅 FastAPI 需要（Celery 不需要建表）"""
    await Tortoise.generate_schemas(safe=True)

async def close_db():
    """关闭数据库连接"""
    await Tortoise.close_connections()
