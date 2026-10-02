"""Ollama provider — connects to local Ollama OpenAI-compatible API."""

from openai import AsyncOpenAI

from llm.provider import LLMProvider, LLMResponse


class OllamaProvider(LLMProvider):
    """Provider for local Ollama inference server."""

    def __init__(self, base_url: str = "http://localhost:11434/v1"):
        self.client = AsyncOpenAI(base_url=base_url, api_key="ollama")

    async def complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        choice = response.choices[0]
        usage = response.usage
        return LLMResponse(
            content=choice.message.content or "",
            model=response.model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        )

    async def health_check(self) -> bool:
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
