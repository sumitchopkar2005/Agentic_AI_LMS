"""
Concept heatmap generator — builds student × concept mastery matrix.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User


async def generate_heatmap(course_id: UUID, db: AsyncSession) -> dict:
    """Generate concept heatmap for faculty analytics dashboard.

    Returns matrix of students × concepts with mastery levels (0.0 - 1.0).
    """
    # 1. Get concept nodes from Knowledge Graph
    from kg.client import KGClient

    kg = KGClient(uri=settings.neo4j_uri, user=settings.neo4j_user, password=settings.neo4j_password)
    try:
        graph = await kg.get_course_graph(str(course_id))
    finally:
        await kg.close()

    concepts = []
    for node in graph.get("nodes", []):
        concepts.append({
            "concept_id": node.get("id", node.get("concept_id", "")),
            "concept_name": node.get("name", node.get("label", "")),
        })

    if not concepts:
        return {"concepts": [], "student_concept_matrix": []}

    # 2. Get enrolled students with mastery data
    result = await db.execute(
        select(User).where(User.role == "student")
    )
    students = result.scalars().all()

    # 3. Build matrix
    matrix = []
    concept_summaries = []
    concept_ids = [c["concept_id"] for c in concepts]

    for concept in concepts:
        cid = concept["concept_id"]
        levels = []
        for student in students:
            raw = (student.mastery_map or {}).get(cid, 0.0)
            # mastery_map values may be dicts with a "level" key or plain floats
            if isinstance(raw, dict):
                mastery = min(raw.get("level", 0) / 100.0, 1.0)
            else:
                mastery = float(raw)
            levels.append(mastery)
        avg_mastery = sum(levels) / len(levels) if levels else 0.0
        concept_summaries.append({
            "concept_id": cid,
            "concept_name": concept["concept_name"],
            "mastery_level": round(avg_mastery, 3),
            "student_count": len(levels),
        })

    for student in students:
        row = {
            "student_id": str(student.id),
            "student_name": student.full_name,
            "concepts": {},
        }
        mastery = student.mastery_map or {}
        for cid in concept_ids:
            raw = mastery.get(cid, 0.0)
            if isinstance(raw, dict):
                row["concepts"][cid] = min(raw.get("level", 0) / 100.0, 1.0)
            else:
                row["concepts"][cid] = float(raw)
        matrix.append(row)

    return {"concepts": concept_summaries, "student_concept_matrix": matrix}
