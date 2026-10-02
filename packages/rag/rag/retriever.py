"""Weaviate hybrid search retriever for RAG context."""

import asyncio
import logging
import os
from dataclasses import dataclass

import httpx
import weaviate
from weaviate.classes.query import MetadataQuery

logger = logging.getLogger(__name__)

EMBEDDING_SERVER_URL = os.getenv("EMBEDDING_SERVER_URL", "http://100.72.139.99:9100")


@dataclass
class RetrievedChunk:
    text: str
    source_doc: str
    source_page: int
    concept: str
    score: float


async def _encode_query(query: str) -> list[float]:
    """Encode a query string via the remote embedding server."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{EMBEDDING_SERVER_URL}/embed",
            json={"inputs": [{"text": query}], "normalize": True},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["embeddings"][0]


async def retrieve(
    query: str,
    collection_name: str,
    top_k: int = 5,
    weaviate_url: str = "http://localhost:8080",
    alpha: float = 0.7,
) -> list[RetrievedChunk]:
    """Perform hybrid search (dense + sparse) on Weaviate.

    Returns top-k most relevant chunks with source attribution.
    alpha: weighting between dense (1.0) and sparse (0.0) search.
    """
    query_vector = await _encode_query(query)

    def _search() -> list[RetrievedChunk]:
        host = weaviate_url.replace("http://", "").split(":")[0]
        port = int(weaviate_url.replace("http://", "").split(":")[-1])
        client = weaviate.connect_to_local(host=host, port=port)

        try:
            if not client.collections.exists(collection_name):
                logger.warning("Collection '%s' does not exist", collection_name)
                return []

            collection = client.collections.get(collection_name)

            results = collection.query.hybrid(
                query=query,
                vector=query_vector,
                alpha=alpha,
                limit=top_k,
                return_metadata=MetadataQuery(score=True),
            )

            chunks: list[RetrievedChunk] = []
            for obj in results.objects:
                props = obj.properties
                chunks.append(
                    RetrievedChunk(
                        text=props.get("text", ""),
                        source_doc=props.get("source_doc", "unknown"),
                        source_page=int(props.get("source_page", 0)),
                        concept=props.get("concept", ""),
                        score=obj.metadata.score if obj.metadata and obj.metadata.score else 0.0,
                    )
                )
            return chunks
        finally:
            client.close()

    return await asyncio.to_thread(_search)
