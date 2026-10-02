"""Concept extraction and relationship mapping from parsed content."""

import hashlib
import json
import logging
import re

from llm.router import LLMRouter

logger = logging.getLogger(__name__)


def _extract_json_array(raw: str) -> list:
    """Extract a JSON array from LLM output that may contain surrounding text."""
    raw = raw.strip()
    # Strip markdown code fences
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("["):
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    continue
    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Find the first [ ... ] block in the text
    start = raw.find("[")
    if start != -1:
        depth = 0
        for i in range(start, len(raw)):
            if raw[i] == "[":
                depth += 1
            elif raw[i] == "]":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(raw[start : i + 1])
                    except json.JSONDecodeError:
                        break
    return []

CONCEPT_EXTRACTION_PROMPT = """\
You are an expert educator analyzing course content.
Extract the distinct academic concepts from the following text chunks.

For each concept, provide:
- name: short label (2-5 words)
- description: one-sentence explanation
- difficulty: integer 1-5 (1 = introductory, 5 = advanced)
- unit_number: integer for the unit/chapter this concept belongs to (if detectable, otherwise null)
- unit_name: name of the unit/chapter (if detectable, otherwise null)

Chunks:
{chunks_text}

Return a JSON array:
[{{"name": "Concept Name", "description": "...", "difficulty": 2, "unit_number": 1, "unit_name": "Introduction to Data Structures"}}]
"""

RELATIONSHIP_MAPPING_PROMPT = """\
You are an expert educator building a knowledge graph.
Given these concepts, identify the relationships between them.

Relationship types: "prerequisite", "related", "part_of", "leads_to"

Concepts:
{concepts_text}

Return a JSON array:
[{{"source": "Concept A", "target": "Concept B", "type": "prerequisite"}}]

Rules:
- "prerequisite" means source must be learned before target
- "part_of" means source is a subtopic of target
- "leads_to" means understanding source naturally leads to target
- "related" for loose connections
- Avoid cycles in prerequisite chains
"""


def _make_concept_id(course_id: str, concept_name: str) -> str:
    content = f"{course_id}:{concept_name.lower().strip()}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


async def extract_concepts(
    chunks: list[dict],
    course_id: str,
    llm_router: LLMRouter | None = None,
) -> list[dict]:
    """Extract concepts from semantic chunks using LLM.

    Returns: [{"id": "...", "name": "Mitosis", "description": "...", "difficulty": 2, "course_id": "..."}]
    """
    if not chunks:
        return []

    # Build summary of chunks for the LLM
    chunks_text = "\n---\n".join(
        f"[{c.get('concept', 'General')}] {c['text'][:500]}" for c in chunks[:30]
    )

    if llm_router is None:
        # Fallback: extract concepts from chunk concept labels
        seen: set[str] = set()
        concepts: list[dict] = []
        for chunk in chunks:
            name = chunk.get("concept", "General")
            if name.lower() not in seen and name != "General":
                seen.add(name.lower())
                concepts.append({
                    "id": _make_concept_id(course_id, name),
                    "name": name,
                    "description": chunk["text"][:200],
                    "difficulty": 1,
                    "course_id": course_id,
                })

        # If no named concepts found, extract from headings/key terms in text
        if not concepts:
            heading_re = re.compile(
                r"^(?:(?:Chapter|Section|Part|Module|Unit|Lecture|Topic)\s+\d+[.:]\s*(.+)"
                r"|\d+(?:\.\d+)*\s+(.+)"
                r"|#{1,4}\s+(.+))",
                re.MULTILINE,
            )
            for chunk in chunks:
                for m in heading_re.finditer(chunk["text"]):
                    name = (m.group(1) or m.group(2) or m.group(3) or "").strip()
                    if name and name.lower() not in seen and len(name) < 80:
                        seen.add(name.lower())
                        concepts.append({
                            "id": _make_concept_id(course_id, name),
                            "name": name,
                            "description": chunk["text"][:200],
                            "difficulty": 1,
                            "course_id": course_id,
                        })

        return concepts

    try:
        prompt = CONCEPT_EXTRACTION_PROMPT.format(chunks_text=chunks_text)
        response = await llm_router.complete(
            task_type="ingestion",
            messages=[
                {"role": "system", "content": "You are a precise JSON-outputting assistant."},
                {"role": "user", "content": prompt},
            ],
        )
        raw = response.content.strip()
        parsed = _extract_json_array(raw)
        concepts = []
        seen_names: set[str] = set()

        for item in parsed:
            if not isinstance(item, dict) or not item.get("name"):
                continue
            name = item["name"].strip()
            if name.lower() in seen_names:
                continue
            seen_names.add(name.lower())
            concepts.append({
                "id": _make_concept_id(course_id, name),
                "name": name,
                "description": item.get("description", ""),
                "difficulty": min(max(int(item.get("difficulty", 1)), 1), 5),
                "course_id": course_id,
                "unit_number": item.get("unit_number"),
                "unit_name": item.get("unit_name"),
            })

        logger.info("Extracted %d concepts from %d chunks", len(concepts), len(chunks))
        return concepts

    except Exception:
        logger.warning("LLM concept extraction failed, falling back to chunk labels", exc_info=True)
        return await extract_concepts(chunks, course_id, llm_router=None)


async def map_relationships(
    concepts: list[dict],
    llm_router: LLMRouter | None = None,
) -> list[dict]:
    """Identify relationships between extracted concepts using LLM.

    Returns: [{"source_id": "...", "target_id": "...", "type": "prerequisite"}]
    """
    if not concepts or len(concepts) < 2:
        return []

    name_to_id = {c["name"]: c["id"] for c in concepts}
    concepts_text = "\n".join(
        f"- {c['name']} (difficulty: {c.get('difficulty', 1)}): {c.get('description', '')}"
        for c in concepts
    )

    if llm_router is None:
        # Fallback: link concepts sequentially by difficulty
        sorted_concepts = sorted(concepts, key=lambda c: c.get("difficulty", 1))
        relationships: list[dict] = []
        for i in range(len(sorted_concepts) - 1):
            relationships.append({
                "source_id": sorted_concepts[i]["id"],
                "target_id": sorted_concepts[i + 1]["id"],
                "type": "leads_to",
            })
        return relationships

    try:
        prompt = RELATIONSHIP_MAPPING_PROMPT.format(concepts_text=concepts_text)
        response = await llm_router.complete(
            task_type="ingestion",
            messages=[
                {"role": "system", "content": "You are a precise JSON-outputting assistant."},
                {"role": "user", "content": prompt},
            ],
        )
        raw = response.content.strip()
        parsed = _extract_json_array(raw)
        relationships = []
        for item in parsed:
            if not isinstance(item, dict):
                continue
            source_name = item.get("source", "")
            target_name = item.get("target", "")
            source_id = name_to_id.get(source_name)
            target_id = name_to_id.get(target_name)
            if source_id and target_id and source_id != target_id:
                relationships.append({
                    "source_id": source_id,
                    "target_id": target_id,
                    "type": item.get("type", "related"),
                })

        logger.info("Mapped %d relationships between %d concepts", len(relationships), len(concepts))
        return relationships

    except Exception:
        logger.warning("LLM relationship mapping failed, falling back to sequential", exc_info=True)
        return await map_relationships(concepts, llm_router=None)
