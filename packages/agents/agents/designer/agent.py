"""DesignerAgent — LangGraph workflow for assignment generation."""

from langgraph.graph import END, StateGraph

from agents.base import BaseAgent
from agents.designer.nodes import generate_code_lab, generate_mcq, generate_rubrics, generate_scenarios, tag_concepts
from agents.designer.state import DesignerState


class DesignerAgent(BaseAgent):
    def build_graph(self) -> StateGraph:
        graph = StateGraph(DesignerState)

        graph.add_node("generate_mcq", generate_mcq)
        graph.add_node("generate_scenarios", generate_scenarios)
        graph.add_node("generate_code_lab", generate_code_lab)
        graph.add_node("generate_rubrics", generate_rubrics)
        graph.add_node("tag_concepts", tag_concepts)

        def _route_after_mcq(state: DesignerState) -> str:
            types = state.get("config", {}).get("types", ["MCQ", "SCENARIO"])
            if "SCENARIO" in types or "CODE_LAB" in types:
                return "generate_scenarios"
            # MCQ-only → skip straight to rubrics (auto-rubric, no LLM)
            return "generate_rubrics"

        graph.set_entry_point("generate_mcq")
        graph.add_conditional_edges("generate_mcq", _route_after_mcq)
        graph.add_edge("generate_scenarios", "generate_code_lab")
        graph.add_edge("generate_code_lab", "generate_rubrics")
        graph.add_edge("generate_rubrics", "tag_concepts")
        graph.add_edge("tag_concepts", END)

        return graph.compile()
