"""IngestionAgent — LangGraph workflow for content ingestion."""

from langgraph.graph import END, StateGraph

from agents.base import BaseAgent
from agents.ingestion.nodes import build_graph, chunk, embed, parse
from agents.ingestion.state import IngestionState


class IngestionAgent(BaseAgent):
    def build_graph(self) -> StateGraph:
        graph = StateGraph(IngestionState)

        graph.add_node("parse", parse)
        graph.add_node("chunk", chunk)
        graph.add_node("embed", embed)
        graph.add_node("build_graph", build_graph)

        graph.set_entry_point("parse")
        graph.add_edge("parse", "chunk")
        graph.add_edge("chunk", "embed")
        graph.add_edge("embed", "build_graph")
        graph.add_edge("build_graph", END)

        return graph.compile()
