from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.events.consumer import start_event_consumer
from app.routes import auth, courses, assignments, submissions, gamification, tutor, code_execution, analytics, voice, mascot

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup: launch the event consumer as a background task
    consumer_task = asyncio.create_task(start_event_consumer())
    logger.info("Event consumer started")
    yield
    # Shutdown
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    logger.info("Event consumer stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Agentic LMS API",
        description="AI-powered Learning Management System",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
    app.include_router(courses.router, prefix="/api/v1", tags=["courses"])
    app.include_router(assignments.router, prefix="/api/v1", tags=["assignments"])
    app.include_router(submissions.router, prefix="/api/v1", tags=["submissions"])
    app.include_router(gamification.router, prefix="/api/v1", tags=["gamification"])
    app.include_router(tutor.router, prefix="/api/v1", tags=["tutor"])
    app.include_router(code_execution.router, prefix="/api/v1", tags=["code-execution"])
    app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
    app.include_router(voice.router, prefix="/api/v1", tags=["voice"])
    app.include_router(mascot.router, prefix="/api/v1", tags=["mascot"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
