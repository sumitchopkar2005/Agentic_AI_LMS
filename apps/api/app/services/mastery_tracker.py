"""Mastery tracker — tracks per-concept mastery for students using the Knowledge Graph."""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

# Mastery thresholds
MASTERY_THRESHOLD = 70  # concept considered "mastered" at this level
MASTERY_INCREMENT_UNDERSTOOD = 25  # boost when student demonstrates understanding
MASTERY_INCREMENT_PARTIAL = 10  # boost for partial understanding
MASTERY_MAX = 100


async def get_mastery_map(db: AsyncSession, student_id: uuid.UUID) -> dict:
    """Get the student's concept mastery map.

    Returns: { "concept_id": { "level": 0-100, "last_seen": "iso_timestamp", "name": "..." } }
    """
    result = await db.execute(select(User).where(User.id == student_id))
    user = result.scalar_one_or_none()
    if not user or not user.mastery_map:
        return {}
    return user.mastery_map


async def update_mastery(
    db: AsyncSession,
    student_id: uuid.UUID,
    concept_id: str,
    concept_name: str,
    understanding_level: str,
) -> dict:
    """Update mastery for a specific concept.

    understanding_level: "understood", "partial", "none"
    Returns the updated mastery entry.
    """
    result = await db.execute(select(User).where(User.id == student_id))
    user = result.scalar_one()
    mastery_map = dict(user.mastery_map or {})
    
    current = mastery_map.get(concept_id, {"level": 0, "name": concept_name, "last_seen": None})

    if understanding_level == "understood":
        new_level = min(current["level"] + MASTERY_INCREMENT_UNDERSTOOD, MASTERY_MAX)
    elif understanding_level == "partial":
        new_level = min(current["level"] + MASTERY_INCREMENT_PARTIAL, MASTERY_MAX)
    else:
        new_level = current["level"]

    entry = {
        "level": new_level,
        "name": concept_name,
        "last_seen": datetime.now(timezone.utc).isoformat(),
    }
    mastery_map[concept_id] = entry
    user.mastery_map = mastery_map
    # Force SQLAlchemy to detect mutation on JSONB
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user, "mastery_map")

    return entry


def is_concept_mastered(mastery_map: dict, concept_id: str) -> bool:
    """Check if a concept is mastered (level >= threshold)."""
    entry = mastery_map.get(concept_id)
    if not entry:
        return False
    return entry.get("level", 0) >= MASTERY_THRESHOLD


def find_current_concept(
    concepts: list[dict],
    edges: list[dict],
    mastery_map: dict,
) -> dict | None:
    """Find the next concept the student should learn.

    Walks the prerequisite graph to find the first un-mastered concept
    whose prerequisites are ALL mastered. Concepts are sorted by
    unit_number then difficulty.

    Returns the concept dict or None if all mastered.
    """
    if not concepts:
        return None

    # Build prerequisite lookup: concept_id -> list of prerequisite concept_ids
    prereqs: dict[str, list[str]] = {c["id"]: [] for c in concepts}
    for edge in edges:
        if edge.get("type") in ("prerequisite", "leads_to"):
            # source is prerequisite OF target (source must be learned before target)
            target = edge.get("target")
            source = edge.get("source")
            if target in prereqs:
                prereqs[target].append(source)

    # Sort by unit_number then position for stable insertion-order within each unit
    sorted_concepts = sorted(
        concepts,
        key=lambda c: (c.get("unit_number") or 0, c.get("position", 0)),
    )

    for concept in sorted_concepts:
        cid = concept["id"]
        if is_concept_mastered(mastery_map, cid):
            continue
        # Check if all prerequisites are mastered
        all_prereqs_met = all(
            is_concept_mastered(mastery_map, pid) for pid in prereqs.get(cid, [])
        )
        if all_prereqs_met:
            return concept

    return None  # All concepts mastered


def get_mastered_concepts(concepts: list[dict], mastery_map: dict) -> list[dict]:
    """Return list of mastered concepts."""
    return [c for c in concepts if is_concept_mastered(mastery_map, c["id"])]


def get_upcoming_concepts(
    current_concept: dict | None,
    concepts: list[dict],
    edges: list[dict],
    mastery_map: dict,
    limit: int = 3,
) -> list[dict]:
    """Get the next N concepts after the current one in the learning path."""
    if not current_concept or not concepts:
        return []

    # Find concepts that current leads_to or that follow in unit/position order
    sorted_concepts = sorted(
        concepts,
        key=lambda c: (c.get("unit_number") or 0, c.get("position", 0)),
    )

    # Find index of current concept
    current_idx = None
    for i, c in enumerate(sorted_concepts):
        if c["id"] == current_concept["id"]:
            current_idx = i
            break

    if current_idx is None:
        return []

    upcoming = []
    for c in sorted_concepts[current_idx + 1:]:
        if not is_concept_mastered(mastery_map, c["id"]):
            upcoming.append(c)
            if len(upcoming) >= limit:
                break

    return upcoming


def check_prerequisites_met(
    target_concept_id: str,
    concepts: list[dict],
    edges: list[dict],
    mastery_map: dict,
) -> tuple[bool, list[dict]]:
    """Check if all prerequisites for a concept are met.

    Returns (all_met, list_of_unmet_prerequisite_concepts).
    """
    prereq_ids: list[str] = []
    for edge in edges:
        if edge.get("type") in ("prerequisite", "leads_to") and edge.get("target") == target_concept_id:
            prereq_ids.append(edge["source"])

    concept_map = {c["id"]: c for c in concepts}
    unmet = []
    for pid in prereq_ids:
        if not is_concept_mastered(mastery_map, pid):
            if pid in concept_map:
                unmet.append(concept_map[pid])

    return len(unmet) == 0, unmet
