from fastapi import FastAPI
from tortoise import Tortoise

from app.core.config import load_settings


async def init_db(app: FastAPI):
    cfg = load_settings()
    await Tortoise.init(db_url=cfg.db_url, modules={"models": ["app.db.models"]})
    await Tortoise.generate_schemas(safe=True)
    app.state.db_ready = True


async def close_db():
    await Tortoise.close_connections()
