from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routers.chat import router as chat_router
from app.api.routers.agent import router as agent_router
from app.api.routers.apps import router as apps_router
from app.api.routers.health import router as health_router
from app.api.routers.workflow import router as workflow_router
from app.api.routers.workflow_nodes import router as workflow_nodes_router
from app.api.routers.workflow_stream import router as workflow_stream_router
from app.api.routers.workflow_publish import router as workflow_publish_router
from app.api.routers.knowledge import router as knowledge_router
from app.db.db import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db(app)
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="LLMOps Prototype",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(agent_router)
app.include_router(workflow_router)
app.include_router(workflow_nodes_router)
app.include_router(workflow_stream_router)
app.include_router(workflow_publish_router)
app.include_router(knowledge_router)
app.include_router(apps_router)
