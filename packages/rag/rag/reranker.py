"""Cross-encoder reranking for improved retrieval quality."""

import asyncio
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded cross-encoder
_cross_encoder = None


def _get_cross_encoder(model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    global _cross_encoder
    if _cross_encoder is None:
        from sentence_transformers import CrossEncoder

        _cross_encoder = CrossEncoder(model_name, device="cpu")
    return _cross_encoder


async def rerank(query: str, chunks: list[dict], top_k: int = 3) -> list[dict]:
    """Rerank retrieved chunks using a cross-encoder model.

    Takes initial retrieval results and reorders them by relevance.
    """
    if not chunks or len(chunks) <= 1:
        return chunks[:top_k]

    def _score() -> list[dict]:
        try:
            encoder = _get_cross_encoder()
            pairs = [(query, c.get("text", "")) for c in chunks]
            scores = encoder.predict(pairs)

            scored = list(zip(chunks, scores))
            scored.sort(key=lambda x: float(x[1]), reverse=True)
            return [item[0] for item in scored[:top_k]]
        except Exception:
            logger.warning("Cross-encoder reranking failed, returning original order", exc_info=True)
            return chunks[:top_k]

    return await asyncio.to_thread(_score)
