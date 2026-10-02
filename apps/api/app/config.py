import sys
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings

# Ensure monorepo packages are importable regardless of how the server is started
_api_dir = Path(__file__).resolve().parent.parent
_packages_dir = _api_dir.parent.parent / "packages"
for _pkg in ("llm", "knowledge-graph", "rag", "agents", "shared"):
    _pkg_path = str(_packages_dir / _pkg)
    if _pkg_path not in sys.path:
        sys.path.insert(0, _pkg_path)


class Settings(BaseSettings):
    # ─── Database ─────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/agentic_lms"    
    valkey_url: str = "valkey://localhost:6379/0"
    weaviate_url: str = "http://localhost:8080"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    # ─── MinIO ────────────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"

    @field_validator("minio_endpoint", mode="before")
    @classmethod
    def _strip_minio_scheme(cls, v: str) -> str:
        """Minio client expects host:port without scheme."""
        return v.replace("https://", "").replace("http://", "").rstrip("/")

    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "agentic-lms-uploads"
    minio_secure: bool = False

    # ─── vLLM ─────────────────────────────────────────────────
    vllm_base_url_primary: str = "http://localhost:8000/v1"
    vllm_base_url_fast: str = "http://localhost:8001/v1"
    vllm_base_url_vision: str = "http://localhost:8002/v1"
    vllm_model_primary: str = "Qwen/Qwen2.5-72B-Instruct-AWQ"
    vllm_model_fast: str = "Qwen/Qwen2.5-7B-Instruct"
    vllm_model_vision: str = "Qwen/Qwen2.5-VL-7B-Instruct"

    # ─── Ollama ───────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434/v1"

    # ─── Embeddings ───────────────────────────────────────────
    embedding_server_url: str = "http://100.72.139.99:9100"
    embedding_model: str = "Qwen/Qwen3-VL-Embedding-8B"
    embedding_device: str = "cpu"  # unused when remote server is configured

    # ─── Auth ─────────────────────────────────────────────────
    keycloak_url: str = "http://localhost:8081"
    keycloak_realm: str = "agentic-lms"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440  # 24 hours for dev

    # ─── Sarvam AI (STT / TTS) ─────────────────────────────
    sarvam_api_key: str = ""
    sarvam_stt_model: str = "saaras:v3"
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_speaker: str = "shubh"
    sarvam_tts_language: str = "en-IN"

    # ─── Feature Flags ───────────────────────────────────────
    enable_dynamic_hint_pricing: bool = False
    enable_debate_bot: bool = False
    enable_economy_balancing: bool = False

    # ─── App ──────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    debug: bool = True

    model_config = {"env_file": ".env.local", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
