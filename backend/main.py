from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.routers.chat import router as chat_router
from api.routers.agent import router as agent_router
from api.routers.apps import router as apps_router
from api.routers.health import router as health_router
from api.routers.workflow import router as workflow_router
from api.routers.workflow_nodes import router as workflow_nodes_router
from api.routers.workflow_stream import router as workflow_stream_router
from api.routers.workflow_publish import router as workflow_publish_router
from api.routers.knowledge import router as knowledge_router
from api.routers.settings import router as settings_router
from database.connection import close_db, init_db,generate_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await generate_schema()
    app.state.db_ready = True
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
app.include_router(settings_router)
