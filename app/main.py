from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers.chat import router as chat_router
from app.api.routers.health import router as health_router
from app.api.routers.workflow import router as workflow_router
from app.db.db import close_db, init_db

app = FastAPI(title="LLMOps Prototype", docs_url="/docs", redoc_url="/redoc")

# Allow local development origins without authentication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(workflow_router)


@app.on_event("startup")
async def startup_event():
    await init_db(app)


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()
