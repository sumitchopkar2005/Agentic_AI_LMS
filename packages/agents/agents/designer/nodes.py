"""DesignerAgent graph nodes — generate_mcq, generate_scenarios, generate_rubrics, tag_concepts."""

import json
import logging
import re

from agents.designer.prompts import PROMPTS
from agents.designer.state import DesignerState

logger = logging.getLogger(__name__)


def _extract_json(raw: str):
    """Extract JSON object or array from LLM output."""
    raw = raw.strip()
    # Strip markdown code fences
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("[") or part.startswith("{"):
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    continue
    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Find first [ or { block
    for opener, closer in [("[", "]"), ("{", "}")]:
        start = raw.find(opener)
        if start != -1:
            depth = 0
            for i in range(start, len(raw)):
                if raw[i] == opener:
                    depth += 1
                elif raw[i] == closer:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(raw[start : i + 1])
                        except json.JSONDecodeError:
                            break
    return None


def _format_concepts(graph: dict) -> str:
    """Format KG nodes into a text list for prompts."""
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    id_to_name = {n["id"]: n["name"] for n in nodes}

    lines = []
    for node in nodes:
        lines.append(
            f"- {node['name']} (id={node['id']}, difficulty={node.get('difficulty', 1)}): "
            f"{node.get('description', '')[:120]}"
        )

    if edges:
        lines.append("\nRelationships:")
        for e in edges[:30]:
            src = id_to_name.get(e["source"], e["source"][:8])
            tgt = id_to_name.get(e["target"], e["target"][:8])
            lines.append(f"  {src} --[{e.get('type', 'related')}]--> {tgt}")

    return "\n".join(lines)


def _get_router(state: DesignerState):
    """Create an LLM router from state config."""
    from llm.router import LLMRouter
    ollama_url = state.get("ollama_base_url")
    if ollama_url:
        return LLMRouter(ollama_url=ollama_url)
    return LLMRouter()


def _get_model_override(state: DesignerState, assignment_type: str | None = None) -> str | None:
    """Get model override from config, with auto-routing for coding assignments."""
    config = state.get("config", {})
    model = config.get("model")
    if model:
        return model
    # Auto-route coding assignments to qwen-coder
    if assignment_type == "CODE_LAB":
        return "qwen3-coder:latest"
    return None


def _build_dedup_context(state: DesignerState) -> str:
    """Build a text block listing previously generated assignments so the LLM avoids repeats."""
    existing = state.get("existing_assignments", [])
    # Also include assignments generated earlier in the current run
    in_run = state.get("generated_assignments", [])
    all_prev = existing + in_run
    if not all_prev:
        return ""
    lines = ["PREVIOUSLY GENERATED ASSIGNMENTS (DO NOT REPEAT OR CREATE SIMILAR QUESTIONS):"]
    for a in all_prev:
        a_type = a.get("type", "?")
        title = a.get("title", "")
        desc = (a.get("description") or "")[:150]
        lines.append(f"- [{a_type}] {title}: {desc}")
    lines.append("\nEach new question MUST be unique and substantially different from all of the above.\n")
    return "\n".join(lines)


async def generate_mcq(state: DesignerState) -> dict:
    """Generate MCQ assignments from the Knowledge Graph."""
    errors = list(state.get("errors", []))
    assignments = list(state.get("generated_assignments", []))
    config = state.get("config", {})
    graph = state.get("knowledge_graph", {})

    types = config.get("types", ["MCQ", "SCENARIO"])
    if "MCQ" not in types:
        return {"current_step": "generate_mcq", "generated_assignments": assignments, "errors": errors}

    count = config.get("mcq_count") or config.get("count_per_type", 3)
    diff_low, diff_high = config.get("difficulty_range", (1, 3))
    concepts_text = _format_concepts(graph)

    if not concepts_text.strip():
        errors.append("No concepts in knowledge graph for MCQ generation")
        return {"current_step": "generate_mcq", "errors": errors, "generated_assignments": assignments}

    try:
        router = _get_router(state)
        model_override = _get_model_override(state, "MCQ")
        dedup = _build_dedup_context(state)
        prompt = PROMPTS["generate_mcq"].format(
            count=count,
            difficulty=f"{diff_low}-{diff_high}",
            concepts=concepts_text,
        )
        if dedup:
            prompt = dedup + "\n" + prompt
        response = await router.complete(
            task_type="creative",
            messages=[
                {"role": "system", "content": "You are a precise JSON-outputting assistant. Output ONLY valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=4096,
            model_override=model_override,
        )
        questions = _extract_json(response.content)
        if isinstance(questions, list):
            for i, q in enumerate(questions):
                if not isinstance(q, dict) or not q.get("question"):
                    continue
                assignments.append({
                    "type": "MCQ",
                    "title": f"MCQ: {q.get('question', '')[:60]}",
                    "description": q.get("question", ""),
                    "content": {
                        "question": q["question"],
                        "options": q.get("options", {}),
                        "correct_answer": q.get("correct_answer", "A"),
                        "explanation": q.get("explanation", ""),
                    },
                    "concept_tags": [q["concept_id"]] if q.get("concept_id") else [],
                    "difficulty": q.get("difficulty", diff_low),
                    "max_xp": 100,
                    "max_gold": 25,
                })
            logger.info("Generated %d MCQ questions", len(questions))
        else:
            errors.append("MCQ generation: LLM did not return a valid JSON array")
    except Exception as e:
        errors.append(f"MCQ generation error: {e}")
        logger.error("MCQ generation failed: %s", e, exc_info=True)

    return {"current_step": "generate_mcq", "generated_assignments": assignments, "errors": errors}


async def generate_scenarios(state: DesignerState) -> dict:
    """Generate branching scenario assignments."""
    errors = list(state.get("errors", []))
    assignments = list(state.get("generated_assignments", []))
    config = state.get("config", {})
    graph = state.get("knowledge_graph", {})

    types = config.get("types", ["MCQ", "SCENARIO"])
    if "SCENARIO" not in types:
        return {"current_step": "generate_scenarios", "generated_assignments": assignments, "errors": errors}

    concepts_text = _format_concepts(graph)
    if not concepts_text.strip():
        return {"current_step": "generate_scenarios", "generated_assignments": assignments, "errors": errors}

    count = config.get("count_per_type", 2)
    strictness = config.get("grading_strictness", "MEDIUM")

    try:
        router = _get_router(state)
        model_override = _get_model_override(state, "SCENARIO")
        dedup = _build_dedup_context(state)
        for i in range(count):
            # Pick a subset of concepts for each scenario
            nodes = graph.get("nodes", [])
            start = (i * 3) % max(len(nodes), 1)
            subset_nodes = nodes[start : start + 5] if nodes else []
            subset_text = "\n".join(
                f"- {n['name']}: {n.get('description', '')[:100]}" for n in subset_nodes
            ) or concepts_text[:500]

            prompt = PROMPTS["generate_scenario"].format(
                concepts=subset_text,
                context=f"Course concepts from a data structures and algorithms curriculum",
                strictness=strictness,
            )
            if dedup:
                prompt = dedup + "\n" + prompt
            response = await router.complete(
                task_type="creative",
                messages=[
                    {"role": "system", "content": "You are a precise JSON-outputting assistant. Output ONLY valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=4096,
                model_override=model_override,
            )
            scenario = _extract_json(response.content)
            if isinstance(scenario, dict) and scenario.get("title"):
                assignments.append({
                    "type": "SCENARIO",
                    "title": scenario.get("title", f"Scenario {i+1}"),
                    "description": scenario.get("introduction", ""),
                    "content": scenario,
                    "concept_tags": [n["id"] for n in subset_nodes] if subset_nodes else [],
                    "difficulty": 3,
                    "max_xp": 200,
                    "max_gold": 50,
                })
                logger.info("Generated scenario: %s", scenario.get("title"))
            else:
                errors.append(f"Scenario {i+1}: LLM did not return valid JSON")
    except Exception as e:
        errors.append(f"Scenario generation error: {e}")
        logger.error("Scenario generation failed: %s", e, exc_info=True)

    return {"current_step": "generate_scenarios", "generated_assignments": assignments, "errors": errors}


async def generate_code_lab(state: DesignerState) -> dict:
    """Generate coding lab assignments."""
    errors = list(state.get("errors", []))
    assignments = list(state.get("generated_assignments", []))
    config = state.get("config", {})
    graph = state.get("knowledge_graph", {})

    types = config.get("types", ["MCQ", "SCENARIO"])
    if "CODE_LAB" not in types:
        return {"current_step": "generate_code_lab", "generated_assignments": assignments, "errors": errors}

    concepts_text = _format_concepts(graph)
    if not concepts_text.strip():
        return {"current_step": "generate_code_lab", "generated_assignments": assignments, "errors": errors}

    count = config.get("count_per_type", 2)
    diff_low, diff_high = config.get("difficulty_range", (1, 3))

    try:
        router = _get_router(state)
        model_override = _get_model_override(state, "CODE_LAB")
        dedup = _build_dedup_context(state)
        for i in range(count):
            nodes = graph.get("nodes", [])
            start = (i * 3) % max(len(nodes), 1)
            subset_nodes = nodes[start : start + 5] if nodes else []
            subset_text = "\n".join(
                f"- {n['name']}: {n.get('description', '')[:100]}" for n in subset_nodes
            ) or concepts_text[:500]

            prompt = PROMPTS["generate_code_lab"].format(
                concepts=subset_text,
                difficulty=f"{diff_low}-{diff_high}",
            )
            if dedup:
                prompt = dedup + "\n" + prompt
            response = await router.complete(
                task_type="coding",
                messages=[
                    {"role": "system", "content": "You are a precise JSON-outputting assistant. Output ONLY valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=4096,
                model_override=model_override,
            )
            lab = _extract_json(response.content)
            if isinstance(lab, dict) and (lab.get("title") or lab.get("problem_statement")):
                assignments.append({
                    "type": "CODE_LAB",
                    "title": lab.get("title", f"Code Lab {i+1}"),
                    "description": lab.get("problem_statement", ""),
                    "content": lab,
                    "concept_tags": [n["id"] for n in subset_nodes] if subset_nodes else [],
                    "difficulty": diff_high,
                    "max_xp": 300,
                    "max_gold": 75,
                })
                logger.info("Generated code lab: %s", lab.get("title"))
            else:
                errors.append(f"Code Lab {i+1}: LLM did not return valid JSON")
    except Exception as e:
        errors.append(f"Code Lab generation error: {e}")
        logger.error("Code Lab generation failed: %s", e, exc_info=True)

    return {"current_step": "generate_code_lab", "generated_assignments": assignments, "errors": errors}


async def generate_rubrics(state: DesignerState) -> dict:
    """Generate grading rubrics for non-MCQ assignments in a single batched LLM call.

    MCQs already have correct_answer built-in, so they get a simple auto-rubric
    without any LLM call.
    """
    errors = list(state.get("errors", []))
    assignments = list(state.get("generated_assignments", []))
    rubrics = []

    # Auto-rubric for MCQs — no LLM needed
    need_llm: list[int] = []  # indices that need LLM-generated rubrics
    for i, assignment in enumerate(assignments):
        if assignment.get("rubric"):
            rubrics.append(assignment["rubric"])
            continue
        if assignment.get("type") == "MCQ":
            auto_rubric = {
                "criteria": [{"name": "Correctness", "points": assignment.get("max_xp", 100), "description": "Correct answer selected"}],
                "total_points": assignment.get("max_xp", 100),
            }
            assignments[i]["rubric"] = auto_rubric
            rubrics.append(auto_rubric)
            continue
        need_llm.append(i)

    # Batch all non-MCQ rubrics into a single LLM call
    if need_llm:
        try:
            router = _get_router(state)
            model_override = _get_model_override(state)
            batch_items = []
            for idx in need_llm:
                a = assignments[idx]
                batch_items.append({
                    "index": idx,
                    "title": a.get("title", ""),
                    "type": a.get("type", ""),
                    "description": (a.get("description") or "")[:300],
                    "max_points": a.get("max_xp", 100),
                })

            prompt = (
                "Generate grading rubrics for each of the following assignments.\n\n"
                + json.dumps(batch_items, indent=2)
                + "\n\nReturn a JSON array where each element is an object with "
                "'index' (matching above) and 'rubric' (object with 'criteria' array of "
                "{'name', 'points', 'description'} and 'total_points')."
            )
            response = await router.complete(
                task_type="grading",
                messages=[
                    {"role": "system", "content": "You are a precise JSON-outputting assistant. Output ONLY valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=4096,
                model_override=model_override,
            )
            parsed = _extract_json(response.content)
            if isinstance(parsed, list):
                for entry in parsed:
                    idx = entry.get("index")
                    rubric = entry.get("rubric")
                    if idx is not None and isinstance(rubric, dict) and 0 <= idx < len(assignments):
                        assignments[idx]["rubric"] = rubric
                        rubrics.append(rubric)
                        logger.info("Generated rubric for: %s", assignments[idx].get("title", "?"))
            else:
                errors.append("Batch rubric generation: LLM did not return a valid JSON array")
        except Exception as e:
            errors.append(f"Rubric generation error: {e}")
            logger.error("Rubric generation failed: %s", e, exc_info=True)

    return {
        "current_step": "generate_rubrics",
        "generated_assignments": assignments,
        "generated_rubrics": rubrics,
        "errors": errors,
    }


async def tag_concepts(state: DesignerState) -> dict:
    """Ensure each assignment is tagged with KG concept IDs it tests."""
    assignments = list(state.get("generated_assignments", []))
    graph = state.get("knowledge_graph", {})
    nodes = graph.get("nodes", [])

    # Build a name→id lookup for fuzzy matching
    name_to_id: dict[str, str] = {}
    for n in nodes:
        name_to_id[n["name"].lower()] = n["id"]

    for assignment in assignments:
        tags = assignment.get("concept_tags", [])
        if tags:
            continue
        # Try to match concept names from assignment title/description
        title = (assignment.get("title", "") + " " + assignment.get("description", "")).lower()
        matched = []
        for name, cid in name_to_id.items():
            if name in title:
                matched.append(cid)
        if matched:
            assignment["concept_tags"] = matched[:3]

    return {"current_step": "tag_concepts", "generated_assignments": assignments, "errors": list(state.get("errors", []))}
