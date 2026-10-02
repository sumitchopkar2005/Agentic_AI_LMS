"""TutorAgent — LangGraph workflow for Socratic tutoring with KG-guided learning path."""

from langgraph.graph import END, StateGraph

from agents.base import BaseAgent
from agents.tutor.nodes import (
    assess_mastery,
    offer_hint,
    resolve_learning_path,
    retrieve_context,
    socratic_respond,
)
from agents.tutor.state import TutorState


class TutorAgent(BaseAgent):
    def build_graph(self) -> StateGraph:
        graph = StateGraph(TutorState)

        graph.add_node("resolve_learning_path", resolve_learning_path)
        graph.add_node("retrieve_context", retrieve_context)
        graph.add_node("socratic_respond", socratic_respond)
        graph.add_node("offer_hint", offer_hint)
        graph.add_node("assess_mastery", assess_mastery)

        graph.set_entry_point("resolve_learning_path")
        graph.add_edge("resolve_learning_path", "retrieve_context")
        graph.add_edge("retrieve_context", "socratic_respond")
        graph.add_edge("socratic_respond", "offer_hint")
        graph.add_edge("offer_hint", "assess_mastery")
        graph.add_edge("assess_mastery", END)

        return graph.compile()
