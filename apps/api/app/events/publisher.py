"""Event publisher — sends events to Valkey pub/sub."""

import json
import logging
from dataclasses import asdict

import valkey.asyncio as avalkey

from app.config import settings

logger = logging.getLogger(__name__)

_client: avalkey.Valkey | None = None


async def get_valkey_client() -> avalkey.Valkey:
    """Get or create a Valkey async client."""
    global _client
    if _client is None:
        _client = avalkey.from_url(settings.valkey_url, decode_responses=True)
    return _client


async def publish_event(event: object) -> None:
    """Publish an event to the Valkey pub/sub channel."""
    client = await get_valkey_client()
    channel = getattr(event, "channel", "default")
    payload = json.dumps(asdict(event))  # type: ignore[arg-type]
    await client.publish(channel, payload)
    logger.info("Published event to channel '%s'", channel)


async def set_ingestion_status(
    course_id: str,
    status: str,
    progress_pct: int,
    current_step: str,
) -> None:
    """Cache ingestion progress in Valkey for polling."""
    client = await get_valkey_client()
    key = f"ingestion:{course_id}:status"
    data = json.dumps(
        {
            "status": status,
            "progress_pct": progress_pct,
            "current_step": current_step,
        }
    )
    await client.set(key, data, ex=3600)  # TTL 1 hour


async def get_ingestion_status(course_id: str) -> dict | None:
    """Get cached ingestion status from Valkey."""
    client = await get_valkey_client()
    key = f"ingestion:{course_id}:status"
    data = await client.get(key)
    if data is None:
        return None
    return json.loads(data)
