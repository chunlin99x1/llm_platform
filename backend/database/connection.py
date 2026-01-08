"""
数据库连接管理
"""

from fastapi import FastAPI
from tortoise import Tortoise

from configs import get_settings


async def init_db(app: FastAPI):
    """初始化数据库连接"""
    cfg = get_settings()
    await Tortoise.init(
        db_url=cfg.db_url,
        modules={"models": ["database.models"]}
    )
    await Tortoise.generate_schemas(safe=True)
    app.state.db_ready = True


async def close_db():
    """关闭数据库连接"""
    await Tortoise.close_connections()
