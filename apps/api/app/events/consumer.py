"""Event consumer — subscribes to Valkey channels and triggers agent workflows."""

import asyncio
import json
import logging
import tempfile
from pathlib import Path

import valkey.asyncio as avalkey

from app.config import settings
from app.events.publisher import set_ingestion_status

logger = logging.getLogger(__name__)


async def handle_ingestion_started(data: dict) -> None:
    """Download file from MinIO and run the IngestionAgent pipeline."""
    from minio import Minio

    from agents.ingestion.agent import IngestionAgent

    course_id = data["course_id"]
    file_name = data["file_name"]
    file_type = data["file_type"]
    material_id = data.get("material_id", "")
    unit_number = data.get("unit_number")
    unit_name = data.get("unit_name")

    await set_ingestion_status(course_id, "processing", 5, "parsing")

    # Download from MinIO to a temp file
    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )

    object_name = f"courses/{course_id}/{file_name}"
    suffix = f".{file_type}"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        minio_client.fget_object(settings.minio_bucket, object_name, tmp_path)

        collection_name = f"course_{course_id.replace('-', '_')}"

        # Define a progress callback to update Valkey at each step
        step_progress = {
            "parse": ("processing", 10, "parsing"),
            "chunk": ("processing", 35, "chunking"),
            "embed": ("processing", 60, "embedding"),
            "build_graph": ("processing", 80, "graph_building"),
        }

        async def on_step(step_name: str) -> None:
            if step_name in step_progress:
                status, pct, step = step_progress[step_name]
                await set_ingestion_status(course_id, status, pct, step)

        agent = IngestionAgent()
        result = await agent.run(
            {
                "course_id": course_id,
                "material_id": material_id,
                "file_path": tmp_path,
                "file_type": file_type,
                "source_doc": file_name,
                "vector_collection": collection_name,
                "weaviate_url": settings.weaviate_url,
                "neo4j_uri": settings.neo4j_uri,
                "neo4j_user": settings.neo4j_user,
                "neo4j_password": settings.neo4j_password,
                "ollama_base_url": settings.ollama_base_url,
                "unit_number": unit_number,
                "unit_name": unit_name,
                "parsed_pages": [],
                "chunks": [],
                "embeddings_stored": 0,
                "concept_nodes": [],
                "relationships": [],
                "current_step": "starting",
                "progress_pct": 0,
                "errors": [],
            },
            on_step=on_step,
        )

        if result.get("errors"):
            await set_ingestion_status(course_id, "failed", 100, "error")
            logger.error("Ingestion errors for course %s: %s", course_id, result["errors"])
        else:
            await set_ingestion_status(course_id, "completed", 100, "completed")
            logger.info(
                "Ingestion completed for course %s: %d chunks, %d concepts",
                course_id,
                result.get("embeddings_stored", 0),
                len(result.get("concept_nodes", [])),
            )

    except Exception:
        await set_ingestion_status(course_id, "failed", 0, "error")
        logger.error("Ingestion failed for course %s", course_id, exc_info=True)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


EVENT_HANDLERS = {
    "ingestion.started": handle_ingestion_started,
}


async def start_event_consumer() -> None:
    """Start listening for events on Valkey pub/sub channels.

    Routes events to appropriate agent handlers:
    - ingestion.started → IngestionAgent
    - submission.received → GraderAgent → GameAgent
    - grade.awarded → AnalyticsAgent
    """
    client = avalkey.from_url(settings.valkey_url, decode_responses=True)
    pubsub = client.pubsub()

    channels = list(EVENT_HANDLERS.keys())
    await pubsub.subscribe(*channels)
    logger.info("Event consumer subscribed to: %s", channels)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            channel = message["channel"]
            handler = EVENT_HANDLERS.get(channel)
            if handler is None:
                logger.warning("No handler for channel: %s", channel)
                continue

            try:
                data = json.loads(message["data"])
                # Run handler as a background task so we don't block the listener
                asyncio.create_task(handler(data))
            except json.JSONDecodeError:
                logger.error("Invalid JSON on channel %s: %s", channel, message["data"])
            except Exception:
                logger.error("Error handling event on %s", channel, exc_info=True)
    finally:
        await pubsub.unsubscribe(*channels)
        await client.aclose()
