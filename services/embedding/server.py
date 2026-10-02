"""Embedding microservice — serves Qwen3-VL-Embedding-8B over HTTP.

Endpoints:
  POST /embed          — embed a batch of text (and optional images)
  GET  /health         — liveness check
  GET  /info           — model metadata (dimension, max_length, device)

Designed to run behind nginx with multiple replicas for throughput.
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from qwen3_vl_embedding import Qwen3VLEmbedder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("embedding-server")

# ── Configuration via env vars ──────────────────────────────────────
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "Qwen/Qwen3-VL-Embedding-8B")
DEVICE = os.getenv("EMBEDDING_DEVICE", "cuda")
DTYPE = os.getenv("EMBEDDING_DTYPE", "float16")  # float16 or bfloat16 or int8
MAX_BATCH = int(os.getenv("EMBEDDING_MAX_BATCH", "32"))
PORT = int(os.getenv("EMBEDDING_PORT", "9100"))

# ── Global model reference ──────────────────────────────────────────
_model: Optional[Qwen3VLEmbedder] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    logger.info("Loading model %s on %s (%s)...", MODEL_NAME, DEVICE, DTYPE)
    t0 = time.time()

    dtype_map = {
        "float16": torch.float16,
        "bfloat16": torch.bfloat16,
    }
    kwargs = {}
    if DTYPE in dtype_map:
        kwargs["torch_dtype"] = dtype_map[DTYPE]
    elif DTYPE == "int8":
        from transformers import BitsAndBytesConfig
        kwargs["torch_dtype"] = torch.float16
        kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)

    _model = Qwen3VLEmbedder(model_name_or_path=MODEL_NAME, **kwargs)
    elapsed = time.time() - t0
    logger.info("Model loaded in %.1fs — dimension=%d", elapsed, _get_dim())
    yield
    logger.info("Shutting down embedding server")


app = FastAPI(title="Qwen3-VL Embedding Server", lifespan=lifespan)


# ── Schemas ─────────────────────────────────────────────────────────
class EmbedItem(BaseModel):
    text: Optional[str] = None
    image: Optional[str] = None  # URL or base64
    instruction: Optional[str] = None


class EmbedRequest(BaseModel):
    inputs: list[EmbedItem] = Field(..., min_length=1)
    normalize: bool = True


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dimension: int
    count: int
    elapsed_ms: int


# ── Helpers ─────────────────────────────────────────────────────────
def _get_dim() -> int:
    """Infer embedding dimension from model config."""
    cfg = _model.model.config
    # Qwen3-VL stores hidden_size in text_config
    if hasattr(cfg, "text_config") and hasattr(cfg.text_config, "hidden_size"):
        return cfg.text_config.hidden_size
    return getattr(cfg, "hidden_size", 4096)


# ── Routes ──────────────────────────────────────────────────────────
@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    if len(req.inputs) > MAX_BATCH:
        raise HTTPException(400, f"Batch size {len(req.inputs)} exceeds max {MAX_BATCH}")

    batch = [item.model_dump(exclude_none=True) for item in req.inputs]
    t0 = time.time()

    try:
        embeddings = _model.process(batch, normalize=req.normalize)
        vectors = embeddings.cpu().tolist()
    except Exception as e:
        logger.error("Embedding failed: %s", e, exc_info=True)
        raise HTTPException(500, f"Embedding failed: {e}")

    elapsed_ms = int((time.time() - t0) * 1000)
    return EmbedResponse(
        embeddings=vectors,
        dimension=len(vectors[0]),
        count=len(vectors),
        elapsed_ms=elapsed_ms,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/info")
async def info():
    return {
        "model": MODEL_NAME,
        "dimension": _get_dim() if _model else None,
        "device": DEVICE,
        "dtype": DTYPE,
        "max_batch": MAX_BATCH,
    }


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, workers=1)
