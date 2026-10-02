"""
LLM Router — routes requests to the appropriate model endpoint by task type.

Supports vLLM and Ollama backends via OpenAI-compatible APIs.
"""

from dataclasses import dataclass

from llm.provider import LLMProvider, LLMResponse
from llm.vllm_provider import VLLMProvider


@dataclass
class TaskConfig:
    provider_name: str
    model: str
    temperature: float
    max_tokens: int


# Default routing table — maps task types to model configs
DEFAULT_TASK_ROUTING: dict[str, TaskConfig] = {
    "creative": TaskConfig("primary", "Qwen/Qwen2.5-72B-Instruct-AWQ", 0.8, 4096),
    "grading": TaskConfig("primary", "Qwen/Qwen2.5-72B-Instruct-AWQ", 0.1, 2048),
    "coding": TaskConfig("primary", "Qwen/Qwen2.5-72B-Instruct-AWQ", 0.3, 4096),
    "tutoring": TaskConfig("fast", "Qwen/Qwen2.5-7B-Instruct", 0.3, 1024),
    "ingestion": TaskConfig("fast", "Qwen/Qwen2.5-7B-Instruct", 0.2, 2048),
    "vision": TaskConfig("vision", "Qwen/Qwen2.5-VL-7B-Instruct", 0.2, 2048),
}

OLLAMA_TASK_ROUTING: dict[str, TaskConfig] = {
    "creative": TaskConfig("ollama", "qwen3-coder:latest", 0.8, 4096),
    "grading": TaskConfig("ollama", "qwen3-coder:latest", 0.1, 2048),
    "coding": TaskConfig("ollama", "qwen3-coder:latest", 0.3, 4096),
    "tutoring": TaskConfig("ollama", "qwen3-coder:latest", 0.3, 2048),
    "ingestion": TaskConfig("ollama", "llama3:latest", 0.2, 2048),
    "vision": TaskConfig("ollama", "qwen2.5vl:latest", 0.2, 2048),
}


class LLMRouter:
    """Routes LLM requests to the appropriate model based on task type."""

    def __init__(
        self,
        primary_url: str = "http://localhost:8000/v1",
        fast_url: str = "http://localhost:8001/v1",
        vision_url: str = "http://localhost:8002/v1",
        ollama_url: str | None = None,
    ):
        self.providers: dict[str, LLMProvider] = {
            "primary": VLLMProvider(base_url=primary_url),
            "fast": VLLMProvider(base_url=fast_url),
            "vision": VLLMProvider(base_url=vision_url),
        }
        if ollama_url:
            from llm.ollama_provider import OllamaProvider
            self.providers["ollama"] = OllamaProvider(base_url=ollama_url)
            self.task_routing = OLLAMA_TASK_ROUTING
        else:
            self.task_routing = DEFAULT_TASK_ROUTING

    async def complete(
        self,
        task_type: str,
        messages: list[dict] | None = None,
        prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        model_override: str | None = None,
    ) -> LLMResponse:
        """Route a completion request to the appropriate model.
        
        If model_override is provided, it will be used instead of the task routing.
        """
        config = self.task_routing.get(task_type)
        if config is None:
            raise ValueError(f"Unknown task type: {task_type}")

        provider = self.providers[config.provider_name]

        if messages is None:
            if prompt is None:
                raise ValueError("Either messages or prompt must be provided")
            messages = [{"role": "user", "content": prompt}]

        model = model_override or config.model

        return await provider.complete(
            messages=messages,
            model=model,
            temperature=temperature or config.temperature,
            max_tokens=max_tokens or config.max_tokens,
        )
