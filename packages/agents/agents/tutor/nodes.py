"""TutorAgent graph nodes — resolve_learning_path, retrieve_context, socratic_respond, offer_hint, assess_mastery."""

import json
import logging

from agents.tutor.prompts import PROMPTS
from agents.tutor.state import TutorState

logger = logging.getLogger(__name__)

# Hint cost table by tier
HINT_COSTS = {1: 5, 2: 15, 3: 30}
# Offer a hint after this many attempts
HINT_ATTEMPT_THRESHOLD = 3


async def resolve_learning_path(state: TutorState) -> dict:
    """Resolve the student's position in the KG learning path.

    Uses pre-loaded kg_concepts, kg_edges, and mastery_map from the route
    to determine: current_concept, upcoming_concepts, mastered_concepts.
    Also identifies which concept the student's question relates to and
    checks prerequisite enforcement.
    """
    from app.services.mastery_tracker import (
        check_prerequisites_met,
        find_current_concept,
        get_mastered_concepts,
        get_upcoming_concepts,
    )

    concepts = state.get("kg_concepts", [])
    edges = state.get("kg_edges", [])
    mastery_map = state.get("mastery_map", {})

    if not concepts:
        # No KG available — skip learning path logic
        return {
            "current_concept": None,
            "upcoming_concepts": [],
            "mastered_concepts": [],
            "concept_discussed": "",
            "understanding_level": "",
        }

    current = find_current_concept(concepts, edges, mastery_map)
    mastered = get_mastered_concepts(concepts, mastery_map)
    upcoming = get_upcoming_concepts(current, concepts, edges, mastery_map)

    # Identify which concept the student's question relates to
    question = state["question"]
    concept_discussed = ""

    # Build a name → id lookup (case-insensitive)
    name_to_id = {c["name"].lower().strip(): c["id"] for c in concepts}

    try:
        from llm.router import LLMRouter
        router = LLMRouter(ollama_url="http://localhost:11434/v1")
        concepts_list = "\n".join(
            f'- {c["name"]}: {c.get("description", "")}'
            for c in concepts
        )
        prompt = PROMPTS["identify_concept"].format(
            concepts_list=concepts_list,
            question=question,
        )
        resp = await router.complete(
            task_type="tutoring",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        text = resp.content.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0:
            parsed = json.loads(text[start:end])
            cname = parsed.get("concept_name")
            if cname:
                # Look up real concept ID from name (case-insensitive)
                real_id = name_to_id.get(cname.lower().strip(), "")
                if real_id:
                    concept_discussed = real_id
                else:
                    # Fuzzy fallback: find best substring match
                    cname_lower = cname.lower().strip()
                    for kname, kid in name_to_id.items():
                        if cname_lower in kname or kname in cname_lower:
                            concept_discussed = kid
                            break
    except Exception as e:
        logger.warning("Concept identification failed: %s", e)

    return {
        "current_concept": current,
        "upcoming_concepts": upcoming,
        "mastered_concepts": mastered,
        "concept_discussed": concept_discussed,
    }


async def retrieve_context(state: TutorState) -> dict:
    """Retrieve relevant context from Weaviate for the student's question."""
    from rag.context_builder import build_context
    from rag.retriever import retrieve

    question = state["question"]
    course_id = state.get("course_id", "")
    collection_name = f"course_{course_id.replace('-', '_')}" if course_id else "default"

    try:
        chunks = await retrieve(
            query=question,
            collection_name=collection_name,
            top_k=5,
        )
        context_dicts = [
            {
                "text": c.text,
                "source_doc": c.source_doc,
                "source_page": c.source_page,
                "concept": c.concept,
                "score": c.score,
            }
            for c in chunks
        ]
        return {"retrieved_context": context_dicts}
    except Exception as e:
        logger.warning("RAG retrieval failed: %s", e)
        return {"retrieved_context": [], "errors": state.get("errors", []) + [str(e)]}


async def socratic_respond(state: TutorState) -> dict:
    """Generate a Socratic response using RAG context + KG learning path."""
    from llm.router import LLMRouter
    from rag.context_builder import build_context

    context_str = build_context(state.get("retrieved_context", []))

    learning_summary = state.get("learning_summary", "")
    if not learning_summary:
        learning_summary = "(First interaction — no learning history yet)"

    # Build learning path context for the system prompt
    current_concept = state.get("current_concept")
    mastered = state.get("mastered_concepts", [])
    upcoming = state.get("upcoming_concepts", [])
    concepts = state.get("kg_concepts", [])

    if current_concept:
        mastered_names = ", ".join(c["name"] for c in mastered) if mastered else "None yet"
        upcoming_names = ", ".join(c["name"] for c in upcoming[:3]) if upcoming else "End of path"
        unit_info = ""
        if current_concept.get("unit_name"):
            unit_info = f"Unit {current_concept.get('unit_number', '?')}: {current_concept['unit_name']}\n"
        learning_path_context = (
            f"{unit_info}"
            f"CURRENT CONCEPT: {current_concept['name']} — {current_concept.get('description', '')}\n"
            f"Difficulty: {current_concept.get('difficulty', 1)}/5\n"
            f"Mastered so far ({len(mastered)}/{len(concepts)}): {mastered_names}\n"
            f"Coming next: {upcoming_names}\n"
            f"Focus your teaching on the CURRENT CONCEPT. Guide the student through it step by step."
        )
    else:
        if concepts and len(mastered) == len(concepts):
            learning_path_context = (
                "The student has MASTERED ALL CONCEPTS in this course! "
                "Congratulate them and offer to review any topic or explore advanced applications."
            )
        else:
            learning_path_context = "(No learning path available — teach freely based on questions)"

    # Check if student's question needs prerequisite blocking
    concept_discussed = state.get("concept_discussed", "")
    prerequisite_instruction = PROMPTS["no_prerequisite_block"]

    if concept_discussed and current_concept and concepts:
        from app.services.mastery_tracker import check_prerequisites_met
        edges = state.get("kg_edges", [])
        mastery_map = state.get("mastery_map", {})

        # If the student is asking about a concept that isn't the current one
        if concept_discussed != current_concept["id"]:
            all_met, unmet = check_prerequisites_met(
                concept_discussed, concepts, edges, mastery_map,
            )
            if not all_met:
                unmet_names = ", ".join(c["name"] for c in unmet)
                prerequisite_instruction = PROMPTS["prerequisite_block"].format(
                    unmet_prerequisites=unmet_names,
                    current_concept_name=current_concept["name"],
                )

    # Build system message
    system_content = PROMPTS["system"].format(
        context=context_str or "(No course materials available — use your general knowledge)",
        attempt_count=state.get("attempt_count", 0),
        hint_cost=HINT_COSTS.get(state.get("hint_tier", 1), 5),
        learning_summary=learning_summary,
        learning_path_context=learning_path_context,
        prerequisite_instruction=prerequisite_instruction,
    )

    # Build proper multi-turn chat messages
    messages: list[dict] = [{"role": "system", "content": system_content}]
    for msg in state.get("conversation_history", [])[-20:]:
        role = msg.get("role", "student")
        chat_role = "assistant" if role == "tutor" else "user"
        messages.append({"role": chat_role, "content": msg.get("content", "")})

    # If the current question isn't already the last user message, add it
    if not messages or messages[-1].get("role") != "user" or messages[-1].get("content") != state["question"]:
        messages.append({"role": "user", "content": state["question"]})

    try:
        router = LLMRouter(ollama_url="http://localhost:11434/v1")
        result = await router.complete(
            task_type="tutoring",
            messages=messages,
        )

        # Extract citations from retrieved context
        citations = []
        seen = set()
        for chunk in state.get("retrieved_context", []):
            key = (chunk.get("source_doc", ""), chunk.get("source_page", 0))
            if key not in seen:
                seen.add(key)
                citations.append({"source": chunk["source_doc"], "page": chunk["source_page"]})

        return {"response": result.content, "citations": citations}
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        fallback = (
            "I'm having trouble connecting to my knowledge base right now. "
            "Could you try rephrasing your question?"
        )
        return {
            "response": fallback,
            "citations": [],
            "errors": state.get("errors", []) + [str(e)],
        }


async def offer_hint(state: TutorState) -> dict:
    """Check if student should be offered a hint based on attempt count."""
    attempt_count = state.get("attempt_count", 0)

    if attempt_count >= HINT_ATTEMPT_THRESHOLD:
        # Determine tier based on attempts
        if attempt_count >= 9:
            tier = 3  # SOLUTION
        elif attempt_count >= 6:
            tier = 2  # GUIDANCE
        else:
            tier = 1  # NUDGE
        return {
            "hint_offered": True,
            "hint_tier": tier,
            "hint_cost": HINT_COSTS[tier],
        }

    return {"hint_offered": False}


async def assess_mastery(state: TutorState) -> dict:
    """Assess whether the student demonstrated understanding of the current concept.

    This runs after the tutor responds, analyzing the exchange.
    """
    current_concept = state.get("current_concept")
    concept_discussed = state.get("concept_discussed", "")

    # Determine which concept to assess — prefer the discussed concept, fall back to current
    concepts = state.get("kg_concepts", [])
    concept_map = {c["id"]: c for c in concepts}

    assess_concept = None
    if concept_discussed and concept_discussed in concept_map:
        assess_concept = concept_map[concept_discussed]
    elif current_concept:
        assess_concept = current_concept

    if not assess_concept:
        return {"understanding_level": "none", "concept_discussed": ""}

    try:
        from llm.router import LLMRouter
        router = LLMRouter(ollama_url="http://localhost:11434/v1")
        prompt = PROMPTS["assess_mastery"].format(
            concept_name=assess_concept["name"],
            concept_description=assess_concept.get("description", ""),
            question=state["question"],
            response=state.get("response", ""),
        )
        result = await router.complete(
            task_type="tutoring",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        text = result.content.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0:
            parsed = json.loads(text[start:end])
            level = parsed.get("understanding", "none")
            if level not in ("understood", "partial", "none"):
                level = "none"
            return {
                "understanding_level": level,
                "concept_discussed": assess_concept["id"],
            }
    except Exception as e:
        logger.warning("Mastery assessment failed: %s", e)

    return {"understanding_level": "none", "concept_discussed": assess_concept["id"]}
