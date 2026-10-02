import asyncio
import logging
import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, get_current_faculty, get_current_user, get_current_student
from app.events.publisher import get_ingestion_status, publish_event, set_ingestion_status
from app.models.course import Course
from app.models.course_material import CourseMaterial, MaterialStatus
from app.schemas.courses import (
    CourseCreateRequest,
    CourseMaterialResponse,
    CourseResponse,
    CourseUpdateRequest,
    IngestionStatusResponse,
)

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".docx"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

router = APIRouter()


@router.post("/courses", response_model=CourseResponse)
async def create_course(
    body: CourseCreateRequest,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> Course:
    course = Course(
        institution_id=faculty.institution_id,
        faculty_id=faculty.id,
        **body.model_dump(),
    )
    db.add(course)
    await db.flush()
    return course


@router.get("/courses", response_model=list[CourseResponse])
async def list_courses(
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    result = await db.execute(
        select(Course).where(Course.faculty_id == faculty.id).order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    return course


@router.get("/student/courses", response_model=list[CourseResponse])
async def list_student_courses(
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    """List all active courses in the student's institution."""
    result = await db.execute(
        select(Course).where(
            Course.institution_id == student.institution_id,
            Course.status == "ACTIVE",
        ).order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/student/courses/all", response_model=list[CourseResponse])
async def list_all_student_courses(
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    """List all courses in the student's institution (any status) for dev convenience."""
    result = await db.execute(
        select(Course).where(
            Course.institution_id == student.institution_id,
        ).order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: UUID,
    body: CourseUpdateRequest,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one()
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await db.flush()
    return course


@router.post("/courses/{course_id}/upload")
async def upload_materials(
    course_id: UUID,
    file: UploadFile,
    unit_number: int | None = Form(None),
    unit_name: str | None = Form(None),
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Validate file
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")

    # Verify course exists and belongs to same institution
    result = await db.execute(select(Course).where(Course.id == course_id, Course.institution_id == faculty.institution_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    # Read file content (with size limit)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 100 MB)")

    # Upload to MinIO
    from io import BytesIO
    from minio import Minio

    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )

    bucket = settings.minio_bucket
    if not minio_client.bucket_exists(bucket):
        minio_client.make_bucket(bucket)

    object_name = f"courses/{course_id}/{filename}"
    minio_client.put_object(
        bucket,
        object_name,
        BytesIO(content),
        length=len(content),
        content_type=file.content_type or "application/octet-stream",
    )

    # Record material in DB
    material = CourseMaterial(
        course_id=course_id,
        filename=filename,
        file_type=ext.lstrip("."),
        file_size=len(content),
        object_name=object_name,
        status=MaterialStatus.UPLOADED,
        unit_number=unit_number,
        unit_name=unit_name,
    )
    db.add(material)
    await db.flush()

    # Set vector collection name on course if not set
    if not course.vector_collection:
        course.vector_collection = f"course_{str(course_id).replace('-', '_')}"
        await db.flush()

    # Trigger ingestion pipeline directly as background task
    file_type = ext.lstrip(".")
    asyncio.create_task(_run_ingestion(str(course_id), filename, file_type, str(material.id), unit_number, unit_name))

    logger.info("Uploaded %s to MinIO for course %s", filename, course_id)
    return {
        "status": "accepted",
        "filename": filename,
        "course_id": str(course_id),
        "object_name": object_name,
        "material_id": str(material.id),
        "unit_number": unit_number,
        "unit_name": unit_name,
    }


async def _run_ingestion(
    course_id: str,
    file_name: str,
    file_type: str,
    material_id: str | None = None,
    unit_number: int | None = None,
    unit_name: str | None = None,
) -> None:
    """Run the ingestion pipeline as a background task."""
    from app.events.consumer import handle_ingestion_started

    # Update material status to PARSING
    if material_id:
        await _update_material_status(material_id, MaterialStatus.PARSING)

    try:
        await handle_ingestion_started({
            "course_id": course_id,
            "file_name": file_name,
            "file_type": file_type,
            "material_id": material_id,
            "unit_number": unit_number,
            "unit_name": unit_name,
        })
        # Update material status to COMPLETED
        if material_id:
            await _update_material_status(material_id, MaterialStatus.COMPLETED)
    except Exception:
        logger.error("Background ingestion failed for course %s", course_id, exc_info=True)
        await set_ingestion_status(course_id, "failed", 0, "error")
        if material_id:
            await _update_material_status(material_id, MaterialStatus.FAILED)


async def _update_material_status(material_id: str, status: MaterialStatus) -> None:
    """Update a course material's ingestion status."""
    from app.database import async_session_factory
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(CourseMaterial).where(CourseMaterial.id == material_id)
            )
            material = result.scalar_one_or_none()
            if material:
                material.status = status
                await session.commit()
    except Exception:
        logger.error("Failed to update material %s status", material_id, exc_info=True)


@router.get("/courses/{course_id}/materials", response_model=list[CourseMaterialResponse])
async def list_course_materials(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[CourseMaterial]:
    result = await db.execute(
        select(CourseMaterial)
        .where(CourseMaterial.course_id == course_id)
        .order_by(CourseMaterial.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/courses/{course_id}/materials/{material_id}")
async def delete_material(
    course_id: UUID,
    material_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a course material and cascade to Weaviate chunks + Neo4j concepts."""
    from app.services.ingestion.embedder import delete_by_material
    from kg.client import KGClient

    # Verify material exists and belongs to this course
    result = await db.execute(
        select(CourseMaterial).where(
            CourseMaterial.id == material_id,
            CourseMaterial.course_id == course_id,
        )
    )
    material = result.scalar_one_or_none()
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")

    # 1. Delete from MinIO
    try:
        from minio import Minio
        minio_client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        minio_client.remove_object(settings.minio_bucket, material.object_name)
    except Exception:
        logger.warning("MinIO delete failed for %s", material.object_name, exc_info=True)

    # 2. Delete chunks from Weaviate
    collection_name = f"course_{str(course_id).replace('-', '_')}"
    weaviate_deleted = 0
    try:
        weaviate_deleted = await delete_by_material(
            collection_name=collection_name,
            material_id=str(material_id),
            weaviate_url=settings.weaviate_url,
        )
    except Exception:
        logger.warning("Weaviate delete failed for material %s", material_id, exc_info=True)

    # 3. Delete concepts from Neo4j
    neo4j_deleted = 0
    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        neo4j_deleted = await kg_client.delete_by_material(str(material_id))
    except Exception:
        logger.warning("Neo4j delete failed for material %s", material_id, exc_info=True)
    finally:
        await kg_client.close()

    # 4. Invalidate mermaid cache
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if course and course.mermaid_cache:
        course.mermaid_cache = None

    # 5. Delete DB record
    await db.delete(material)

    logger.info(
        "Deleted material %s: %d Weaviate chunks, %d Neo4j concepts",
        material_id, weaviate_deleted, neo4j_deleted,
    )
    return {
        "status": "deleted",
        "material_id": str(material_id),
        "weaviate_chunks_deleted": weaviate_deleted,
        "neo4j_concepts_deleted": neo4j_deleted,
    }


@router.get("/courses/{course_id}/ingestion-status", response_model=IngestionStatusResponse)
async def get_ingestion_status_route(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> IngestionStatusResponse:
    cached = await get_ingestion_status(str(course_id))
    if cached is None:
        return IngestionStatusResponse(
            course_id=course_id,
            status="pending",
            progress_pct=0,
            current_step="not_started",
        )
    return IngestionStatusResponse(
        course_id=course_id,
        status=cached["status"],
        progress_pct=cached["progress_pct"],
        current_step=cached["current_step"],
    )


@router.get("/courses/{course_id}/knowledge-graph")
async def get_knowledge_graph(
    course_id: UUID,
    unit: int | None = None,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    from kg.client import KGClient

    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        if unit is not None:
            graph = await kg_client.get_unit_graph(str(course_id), unit)
        else:
            graph = await kg_client.get_course_graph(str(course_id))
        return {"course_id": str(course_id), **graph}
    finally:
        await kg_client.close()


@router.get("/courses/{course_id}/units")
async def get_course_units(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    from kg.client import KGClient

    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        units = await kg_client.get_course_units(str(course_id))
        return {"course_id": str(course_id), "units": units}
    finally:
        await kg_client.close()


@router.get("/models")
async def list_available_models(
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    """List available LLM models from Ollama."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=settings.ollama_base_url, api_key="ollama")
        models_resp = await client.models.list()
        models = [{"id": m.id, "name": m.id} for m in models_resp.data]
        return {"models": models}
    except Exception:
        logger.warning("Could not fetch Ollama models", exc_info=True)
        return {"models": [
            {"id": "llama3:latest", "name": "LLaMA 3 (8B)"},
            {"id": "qwen3-coder:latest", "name": "Qwen3 Coder (coding)"},
            {"id": "qwen2.5vl:latest", "name": "Qwen2.5 VL (vision)"},
        ]}


@router.patch("/courses/{course_id}/knowledge-graph/nodes/{node_id}")
async def update_knowledge_graph_node(
    course_id: UUID,
    node_id: str,
    body: dict,
    faculty: CurrentUser = Depends(get_current_faculty),
) -> dict:
    from kg.client import KGClient

    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        # Only allow updating safe properties
        allowed_keys = {"name", "description", "difficulty"}
        safe_props = {k: v for k, v in body.items() if k in allowed_keys}
        if safe_props:
            await kg_client.update_node(node_id, safe_props)
        return {"status": "updated", "node_id": node_id}
    finally:
        await kg_client.close()


@router.get("/courses/{course_id}/knowledge-graph/mermaid")
async def get_knowledge_graph_mermaid(
    course_id: UUID,
    unit: int | None = None,
    regenerate: bool = False,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Use the LLM to produce a Mermaid diagram from the knowledge graph.
    
    Caches the result in the course record. Re-uses cache if the KG
    node/edge counts haven't changed. Pass ?regenerate=true to force.
    """
    import re
    from kg.client import KGClient
    from llm.router import LLMRouter

    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        if unit is not None:
            graph = await kg_client.get_unit_graph(str(course_id), unit)
        else:
            graph = await kg_client.get_course_graph(str(course_id))
    finally:
        await kg_client.close()

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    if not nodes:
        return {"mermaid_code": "", "node_count": 0, "edge_count": 0}

    # ── Check cache ──────────────────────────────────────────────────────
    cache_key = f"unit_{unit}" if unit is not None else "all"
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course and course.mermaid_cache and not regenerate:
        cached = course.mermaid_cache.get(cache_key)
        if cached and cached.get("node_count") == len(nodes) and cached.get("edge_count") == len(edges):
            return {
                "mermaid_code": cached["mermaid_code"],
                "node_count": cached["node_count"],
                "edge_count": cached["edge_count"],
            }

    # ── Generate with LLM ────────────────────────────────────────────────
    node_lines = []
    for n in nodes:
        nid = n["id"][:8]
        name = n.get("name") or n.get("label") or n["id"]
        unit_info = f" [Unit {n['unit_number']}: {n['unit_name']}]" if n.get("unit_number") else ""
        diff = f" (difficulty {n['difficulty']})" if n.get("difficulty") else ""
        node_lines.append(f"- {nid}: {name}{unit_info}{diff}")

    edge_lines = []
    id_short = {n["id"]: n["id"][:8] for n in nodes}
    for e in edges:
        src = id_short.get(e["source"], e["source"][:8])
        tgt = id_short.get(e["target"], e["target"][:8])
        rel = e.get("type") or e.get("relationship") or "related"
        edge_lines.append(f"- {src} --{rel}--> {tgt}")

    graph_text = "NODES:\n" + "\n".join(node_lines) + "\n\nEDGES:\n" + "\n".join(edge_lines)

    system_prompt = """You are a knowledge-graph visualisation assistant.
Given a list of concept nodes and edges, produce a Mermaid flowchart diagram.

Rules:
1. Start with `graph TD` on its own line.
2. Group nodes by unit using `subgraph UnitN["Unit N - UnitName"]` ... `end`. Use only ASCII characters in subgraph labels — no em dashes or special unicode.
3. Use short readable labels inside the node boxes. Do NOT use the raw hex IDs as labels.
4. Arrow styles by relationship type:
   - prerequisite  → solid arrow  `-->`
   - leads_to      → solid arrow  `-->`
   - related        → dotted arrow `-.->`
   - part_of        → thick arrow  `==>`
5. Do NOT add edge labels — just use the arrow style to indicate the relationship type.
6. Keep the output CLEAN — only return the raw Mermaid code, no markdown fences, no explanation, no thinking.
7. Use safe Mermaid node IDs (alphanumeric only, no spaces, no hyphens). Example: `AlgoDef["Algorithm Definition"]`.
8. Make sure every node appears exactly once.
9. Each statement must be on its own line. Never concatenate multiple statements on one line.
"""

    llm = LLMRouter(ollama_url=settings.ollama_base_url)
    response = await llm.complete(
        task_type="creative",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": graph_text},
        ],
        temperature=0.3,
        max_tokens=4096,
        model_override="qwen3-coder:latest",
    )

    mermaid_code = response.content.strip()
    if mermaid_code.startswith("```"):
        lines = mermaid_code.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        mermaid_code = "\n".join(lines).strip()

    mermaid_code = re.sub(r"<think>.*?</think>", "", mermaid_code, flags=re.DOTALL).strip()
    mermaid_code = re.sub(r"(graph\s+TD)\s*(\S)", r"\1\n\2", mermaid_code)

    # ── Save to cache ────────────────────────────────────────────────────
    if course:
        cache = dict(course.mermaid_cache) if course.mermaid_cache else {}
        cache[cache_key] = {
            "mermaid_code": mermaid_code,
            "node_count": len(nodes),
            "edge_count": len(edges),
        }
        course.mermaid_cache = cache
        await db.commit()

    return {"mermaid_code": mermaid_code, "node_count": len(nodes), "edge_count": len(edges)}


@router.delete("/courses/{course_id}/knowledge-graph")
async def delete_knowledge_graph(
    course_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from kg.client import KGClient

    kg_client = KGClient(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    try:
        deleted = await kg_client.delete_course_graph(str(course_id))
    finally:
        await kg_client.close()

    # Invalidate mermaid cache
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course and course.mermaid_cache:
        course.mermaid_cache = None
        await db.commit()

    return {"status": "deleted", "course_id": str(course_id), "deleted_count": deleted}


@router.get("/faculty/dashboard-stats")
async def get_faculty_dashboard_stats(
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return aggregate stats for the faculty dashboard."""
    from app.models.assignment import Assignment, AssignmentStatus
    from app.models.submission import Submission

    # Active courses
    course_result = await db.execute(
        select(func.count()).select_from(Course).where(Course.faculty_id == faculty.id)
    )
    total_courses = course_result.scalar() or 0

    # Get all course ids for this faculty
    cids_result = await db.execute(
        select(Course.id).where(Course.faculty_id == faculty.id)
    )
    course_ids = [row[0] for row in cids_result.all()]

    # Pending reviews (assignments in FACULTY_REVIEW status)
    pending_reviews = 0
    total_students = 0
    at_risk_count = 0

    if course_ids:
        pending_result = await db.execute(
            select(func.count()).select_from(Assignment).where(
                Assignment.course_id.in_(course_ids),
                Assignment.status == AssignmentStatus.FACULTY_REVIEW,
            )
        )
        pending_reviews = pending_result.scalar() or 0

        # Distinct students with submissions in faculty's courses
        published_result = await db.execute(
            select(Assignment.id).where(
                Assignment.course_id.in_(course_ids),
                Assignment.status == AssignmentStatus.PUBLISHED,
            )
        )
        pub_ids = [row[0] for row in published_result.all()]

        if pub_ids:
            student_result = await db.execute(
                select(func.count(func.distinct(Submission.student_id))).where(
                    Submission.assignment_id.in_(pub_ids)
                )
            )
            total_students = student_result.scalar() or 0

    return {
        "active_courses": total_courses,
        "total_students": total_students,
        "pending_reviews": pending_reviews,
        "at_risk_count": at_risk_count,
    }
