"""GraderAgent — LangGraph workflow for submission evaluation."""

from langgraph.graph import END, StateGraph

from agents.base import BaseAgent
from agents.grader.nodes import check_consistency, evaluate_criteria, generate_feedback
from agents.grader.state import GraderState


class GraderAgent(BaseAgent):
    def build_graph(self) -> StateGraph:
        graph = StateGraph(GraderState)

        graph.add_node("evaluate_criteria", evaluate_criteria)
        graph.add_node("check_consistency", check_consistency)
        graph.add_node("generate_feedback", generate_feedback)

        graph.set_entry_point("evaluate_criteria")
        graph.add_edge("evaluate_criteria", "check_consistency")
        graph.add_edge("check_consistency", "generate_feedback")
        graph.add_edge("generate_feedback", END)

        return graph.compile()
