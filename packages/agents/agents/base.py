"""Base agent class with common patterns for all LangGraph agents."""

from abc import ABC, abstractmethod
from collections.abc import Callable, Coroutine
from typing import Any


class BaseAgent(ABC):
    """Base class for all Agentic LMS agents.

    All agents follow the same lifecycle:
    1. Build the LangGraph StateGraph
    2. Compile it
    3. Run it with input state
    """

    @abstractmethod
    def build_graph(self) -> Any:
        """Build and return the compiled LangGraph."""
        ...

    async def run(
        self,
        input_state: dict,
        on_step: Callable[[str], Coroutine[Any, Any, None]] | None = None,
    ) -> dict:
        """Execute the agent graph with the given input state."""
        graph = self.build_graph()
        if on_step:
            # Stream through nodes to report progress
            result = input_state.copy()
            async for event in graph.astream(input_state, stream_mode="updates"):
                for node_name, updates in event.items():
                    result.update(updates)
                    await on_step(node_name)
            return result
        else:
            return await graph.ainvoke(input_state)
