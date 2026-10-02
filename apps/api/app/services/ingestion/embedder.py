"""
Embedding service — converts text chunks to vectors and upserts to Weaviate.

Calls remote Qwen3-VL embedding server for vectorization and Weaviate v4
client for vector storage with hybrid search support.
"""

import asyncio
import logging

import httpx
import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.data import DataObject

from app.config import settings

logger = logging.getLogger(__name__)


async def _encode_texts(texts: list[str], images: list[str | None] | None = None) -> list[list[float]]:
    """Encode texts (and optional images) via the remote embedding server."""
    inputs = []
    for i, text in enumerate(texts):
        item: dict = {"text": text}
        if images and i < len(images) and images[i]:
            item["image"] = images[i]
        inputs.append(item)

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{settings.embedding_server_url}/embed",
            json={"inputs": inputs, "normalize": True},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["embeddings"]


def _ensure_collection(client: weaviate.WeaviateClient, collection_name: str) -> None:
    """Create the Weaviate collection if it doesn't exist."""
    if client.collections.exists(collection_name):
        return

    client.collections.create(
        name=collection_name,
        vectorizer_config=Configure.Vectorizer.none(),
        properties=[
            Property(name="chunk_id", data_type=DataType.TEXT),
            Property(name="text", data_type=DataType.TEXT),
            Property(name="concept", data_type=DataType.TEXT),
            Property(name="source_doc", data_type=DataType.TEXT),
            Property(name="source_page", data_type=DataType.INT),
            Property(name="course_id", data_type=DataType.TEXT),
            Property(name="material_id", data_type=DataType.TEXT),
        ],
    )
    logger.info("Created Weaviate collection: %s", collection_name)


async def embed_and_store(
    chunks: list[dict],
    collection_name: str,
    weaviate_url: str = "http://localhost:8080",
    batch_size: int = 32,
    **kwargs,
) -> int:
    """Embed chunks via remote Qwen3-VL server and upsert to Weaviate.

    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    # If chunks have image URLs (e.g. from PDF page screenshots), pass them along
    images = [c.get("image_url") for c in chunks]

    # Encode via remote server in batches
    all_vectors: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_images = images[i : i + batch_size] if any(images) else None
        vectors = await _encode_texts(batch_texts, batch_images)
        all_vectors.extend(vectors)

    # Upsert to Weaviate (sync client in thread)
    def _upsert() -> int:
        host = weaviate_url.replace("http://", "").split(":")[0]
        port = int(weaviate_url.replace("http://", "").split(":")[-1])
        client = weaviate.connect_to_local(host=host, port=port)
        try:
            _ensure_collection(client, collection_name)
            collection = client.collections.get(collection_name)

            stored = 0
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i : i + batch_size]
                batch_vectors = all_vectors[i : i + batch_size]

                objects = []
                for chunk, vector in zip(batch_chunks, batch_vectors):
                    objects.append(
                        DataObject(
                            properties={
                                "chunk_id": chunk["chunk_id"],
                                "text": chunk["text"],
                                "concept": chunk.get("concept", ""),
                                "source_doc": chunk.get("source_doc", ""),
                                "source_page": chunk.get("source_page", 0),
                                "course_id": chunk.get("course_id", ""),
                                "material_id": chunk.get("material_id", ""),
                            },
                            vector=vector,
                        )
                    )

                response = collection.data.insert_many(objects)
                stored += len(batch_chunks) - (len(response.errors) if response.errors else 0)

                if response.errors:
                    for idx, err in response.errors.items():
                        logger.error("Weaviate insert error at index %s: %s", idx, err)

            return stored
        finally:
            client.close()

    stored_count = await asyncio.to_thread(_upsert)
    logger.info("Stored %d/%d chunks in Weaviate collection '%s'", stored_count, len(chunks), collection_name)
    return stored_count


async def delete_by_material(
    collection_name: str,
    material_id: str,
    weaviate_url: str = "http://localhost:8080",
) -> int:
    """Delete all Weaviate chunks that belong to a specific material upload.

    Returns the number of deleted objects.
    """
    from weaviate.classes.query import Filter

    def _delete() -> int:
        host = weaviate_url.replace("http://", "").split(":")[0]
        port = int(weaviate_url.replace("http://", "").split(":")[-1])
        client = weaviate.connect_to_local(host=host, port=port)
        try:
            if not client.collections.exists(collection_name):
                return 0
            collection = client.collections.get(collection_name)
            result = collection.data.delete_many(
                where=Filter.by_property("material_id").equal(material_id),
            )
            deleted = result.successful
            logger.info(
                "Deleted %d chunks from Weaviate collection '%s' for material %s",
                deleted, collection_name, material_id,
            )
            return deleted
        finally:
            client.close()

    return await asyncio.to_thread(_delete)
