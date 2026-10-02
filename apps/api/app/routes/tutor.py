import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.course import Course
from app.models.hint_transaction import HintTier, HintTransaction
from app.models.user import User
from app.services import tutor as tutor_service
from app.services.mastery_tracker import (
    find_current_concept,
    get_mastered_concepts,
    get_mastery_map,
    get_upcoming_concepts,
    update_mastery,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _load_course_kg(course_id: str) -> dict:
    """Load the Knowledge Graph for a course from Neo4j.

    Returns {"nodes": [...], "edges": [...]} or empty if unavailable.
    """
    try:
        from kg.client import KGClient
        kg = KGClient(
            uri=settings.neo4j_uri,
            user=settings.neo4j_user,
            password=settings.neo4j_password,
        )
        try:
            graph = await kg.get_course_graph(course_id)
            return graph
        finally:
            await kg.close()
    except Exception as e:
        logger.warning("Failed to load KG for course %s: %s", course_id, e)
        return {"nodes": [], "edges": []}


@router.websocket("/tutor/chat")
async def tutor_chat(websocket: WebSocket) -> None:
    # Authenticate via query param token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        student_id = uuid.UUID(payload["sub"])
        course_ids = [uuid.UUID(c) for c in payload.get("course_ids", [])]
        institution_id = uuid.UUID(payload["institution_id"])
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=4001, reason="Invalid authentication token")
        return

    # Read course_id from query params if supplied by the frontend
    _qs_course_id = websocket.query_params.get("course_id")
    if _qs_course_id:
        try:
            course_ids = [uuid.UUID(_qs_course_id)]
        except ValueError:
            pass

    await websocket.accept()

    # Track last hint offer state across the loop
    _last_hint_tier: int = 1
    _last_hint_cost: int = 5

    # Cache KG data per connection (loaded once, refreshed on demand)
    _kg_cache: dict | None = None
    _kg_course_id: str | None = None

    # ── Send initial data on connect (learning path + chat history) ──
    try:
        async with async_session_factory() as db:
            course_id = course_ids[0] if course_ids else None
            if course_id is None:
                result = await db.execute(
                    select(Course.id)
                    .where(Course.institution_id == institution_id)
                    .order_by(Course.created_at.desc())
                    .limit(1)
                )
                course_id = result.scalar_one_or_none()

            if course_id is not None:
                course_id_str = str(course_id)
                _kg_cache = await _load_course_kg(course_id_str)
                _kg_course_id = course_id_str
                kg_concepts = _kg_cache.get("nodes", [])
                kg_edges = _kg_cache.get("edges", [])

                if kg_concepts:
                    mastery_map = await get_mastery_map(db, student_id)
                    current_concept = find_current_concept(kg_concepts, kg_edges, mastery_map)
                    mastered_list = get_mastered_concepts(kg_concepts, mastery_map)
                    upcoming_list = get_upcoming_concepts(
                        current_concept, kg_concepts, kg_edges, mastery_map,
                    )
                    await websocket.send_json({
                        "type": "learning_path",
                        "learning_path": {
                            "total_concepts": len(kg_concepts),
                            "mastered_count": len(mastered_list),
                            "current_concept": {
                                "id": current_concept["id"],
                                "name": current_concept["name"],
                                "description": current_concept.get("description", ""),
                                "unit_number": current_concept.get("unit_number"),
                                "unit_name": current_concept.get("unit_name"),
                                "difficulty": current_concept.get("difficulty", 1),
                            } if current_concept else None,
                            "upcoming": [
                                {"id": c["id"], "name": c["name"], "difficulty": c.get("difficulty", 1)}
                                for c in upcoming_list[:3]
                            ],
                            "mastered": [
                                {"id": c["id"], "name": c["name"]}
                                for c in mastered_list
                            ],
                            "mastery_update": None,
                        },
                    })

                # ── Send chat history from DB ──────────────────────
                session = await tutor_service.get_or_create_session(
                    db, student_id, course_id,
                )
                if session.messages:
                    history = [
                        {
                            "id": str(m.id),
                            "role": m.role,
                            "content": m.content,
                            "citations": m.citations or [],
                        }
                        for m in session.messages[-50:]  # last 50 messages
                    ]
                    await websocket.send_json({
                        "type": "chat_history",
                        "messages": history,
                        "learning_summary": session.learning_summary or "",
                    })
    except Exception as e:
        logger.warning("Failed to send initial data: %s", e)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "buy_hint":
                # ── Handle hint purchase ──────────────────────────
                tier_num = data.get("tier", _last_hint_tier)
                cost = data.get("cost", _last_hint_cost)
                tier_map = {1: HintTier.NUDGE, 2: HintTier.GUIDANCE, 3: HintTier.SOLUTION}
                hint_tier_enum = tier_map.get(tier_num, HintTier.NUDGE)

                async with async_session_factory() as db:
                    try:
                        result = await db.execute(select(User).where(User.id == student_id))
                        user = result.scalar_one()

                        if user.gold_balance < cost:
                            await websocket.send_json({
                                "type": "hint_error",
                                "content": f"Not enough Gold! You need {cost} but have {user.gold_balance}.",
                            })
                            continue

                        # Deduct gold
                        user.gold_balance -= cost

                        # Record transaction
                        assignment_id_for_hint = None
                        if data.get("assignment_id"):
                            try:
                                assignment_id_for_hint = uuid.UUID(data["assignment_id"])
                            except ValueError:
                                pass
                        txn = HintTransaction(
                            student_id=student_id,
                            assignment_id=assignment_id_for_hint,
                            tier=hint_tier_enum,
                            gold_cost=cost,
                            hint_text="(pending generation)",
                            student_attempt_count=0,
                        )
                        db.add(txn)
                        await db.flush()

                        # Generate hint text using the current conversation context
                        from agents.tutor.prompts import PROMPTS
                        prompt_key = {1: "hint_nudge", 2: "hint_guidance", 3: "hint_solution"}.get(tier_num, "hint_nudge")
                        question = data.get("question", "the current topic")

                        from llm.router import LLMRouter
                        llm_router = LLMRouter(ollama_url="http://localhost:11434/v1")
                        hint_result = await llm_router.complete(
                            task_type="tutoring",
                            prompt=PROMPTS[prompt_key].format(
                                context="(Use your general knowledge)",
                                question=question,
                            ),
                        )
                        hint_text = hint_result.content.strip()

                        # Update transaction with actual hint
                        txn.hint_text = hint_text

                        await db.commit()

                        await websocket.send_json({
                            "type": "hint_purchased",
                            "hint_text": hint_text,
                            "gold_spent": cost,
                            "new_balance": user.gold_balance,
                            "tier": tier_num,
                        })
                    except Exception as e:
                        await db.rollback()
                        logger.error("Hint purchase error: %s", e, exc_info=True)
                        await websocket.send_json({
                            "type": "hint_error",
                            "content": "Failed to purchase hint. Please try again.",
                        })
                continue

            if msg_type != "message":
                continue

            question = data.get("content", "").strip()
            if not question:
                continue

            assignment_id_str = data.get("assignment_id")
            assignment_id = uuid.UUID(assignment_id_str) if assignment_id_str else None
            course_id = course_ids[0] if course_ids else None

            async with async_session_factory() as db:
                try:
                    # If no course_id from token, look up from DB
                    if course_id is None:
                        result = await db.execute(
                            select(Course.id)
                            .where(Course.institution_id == institution_id)
                            .order_by(Course.created_at.desc())
                            .limit(1)
                        )
                        row = result.scalar_one_or_none()
                        if row is None:
                            await websocket.send_json({
                                "type": "stream",
                                "content": "No course found. Please enroll in a course first.",
                                "citations": [],
                            })
                            await websocket.send_json({"type": "done", "message_id": str(uuid.uuid4())})
                            continue
                        course_id = row

                    # ── Load KG (cached per connection) ──────────────
                    course_id_str = str(course_id)
                    if _kg_cache is None or _kg_course_id != course_id_str:
                        _kg_cache = await _load_course_kg(course_id_str)
                        _kg_course_id = course_id_str

                    kg_concepts = _kg_cache.get("nodes", [])
                    kg_edges = _kg_cache.get("edges", [])

                    # ── Load student mastery map ─────────────────────
                    mastery_map = await get_mastery_map(db, student_id)

                    # Get or create session
                    session = await tutor_service.get_or_create_session(
                        db, student_id, course_id, assignment_id
                    )

                    # Save student message and flush so it's visible in the relationship
                    await tutor_service.save_message(db, session, "student", question)
                    attempt_count = await tutor_service.increment_attempt(db, session)
                    await db.flush()
                    await db.refresh(session, attribute_names=["messages"])

                    # Build conversation history from DB (includes current student message)
                    conversation_history = tutor_service.build_conversation_history(session)

                    # Build agent input state with KG data
                    from agents.tutor.agent import TutorAgent

                    agent = TutorAgent()
                    input_state = {
                        "student_id": str(student_id),
                        "course_id": str(course_id) if course_id else "",
                        "assignment_id": str(assignment_id) if assignment_id else "",
                        "question": question,
                        "conversation_history": conversation_history,
                        "retrieved_context": [],
                        "response": "",
                        "citations": [],
                        "hint_offered": False,
                        "hint_tier": 1,
                        "hint_cost": 5,
                        "attempt_count": attempt_count,
                        "learning_summary": session.learning_summary or "",
                        "errors": [],
                        # KG learning path fields
                        "kg_concepts": kg_concepts,
                        "kg_edges": kg_edges,
                        "mastery_map": mastery_map,
                        "current_concept": None,
                        "upcoming_concepts": [],
                        "mastered_concepts": [],
                        "concept_discussed": "",
                        "understanding_level": "",
                    }

                    # Run the agent graph
                    result = await agent.run(input_state)

                    response_text = result.get("response", "")
                    citations = result.get("citations", [])

                    # Stream response to client
                    await websocket.send_json({
                        "type": "stream",
                        "content": response_text,
                        "citations": citations,
                    })

                    # Send hint offer if applicable
                    if result.get("hint_offered"):
                        _last_hint_tier = result["hint_tier"]
                        _last_hint_cost = result["hint_cost"]
                        await websocket.send_json({
                            "type": "hint_offer",
                            "tier": result["hint_tier"],
                            "cost": result["hint_cost"],
                            "content": (
                                f"💡 Hint available! "
                                f"(Tier {result['hint_tier']} — costs {result['hint_cost']} Gold)"
                            ),
                        })

                    # ── Update mastery based on assessment ────────────
                    understanding = result.get("understanding_level", "none")
                    concept_discussed = result.get("concept_discussed", "")
                    if concept_discussed and understanding in ("understood", "partial"):
                        concept_map = {c["id"]: c for c in kg_concepts}
                        concept_name = concept_map.get(concept_discussed, {}).get("name", "")
                        mastery_entry = await update_mastery(
                            db, student_id, concept_discussed, concept_name, understanding,
                        )
                        logger.info(
                            "Mastery updated: concept=%s level=%d understanding=%s",
                            concept_name, mastery_entry["level"], understanding,
                        )
                        # Refresh mastery map for the learning_path message
                        mastery_map = await get_mastery_map(db, student_id)

                    # Save tutor response
                    await tutor_service.save_message(
                        db, session, "tutor", response_text, citations
                    )

                    # Update learning summary asynchronously
                    summary = await tutor_service.update_learning_summary(
                        db, session, question, response_text
                    )

                    # ── Build learning path status for frontend ──────
                    current_concept = result.get("current_concept")
                    mastered_list = result.get("mastered_concepts", [])
                    upcoming_list = result.get("upcoming_concepts", [])

                    # Recompute after mastery update
                    if kg_concepts:
                        current_concept = find_current_concept(kg_concepts, kg_edges, mastery_map)
                        mastered_list = get_mastered_concepts(kg_concepts, mastery_map)
                        upcoming_list = get_upcoming_concepts(current_concept, kg_concepts, kg_edges, mastery_map)

                    learning_path_data = None
                    if kg_concepts:
                        learning_path_data = {
                            "total_concepts": len(kg_concepts),
                            "mastered_count": len(mastered_list),
                            "current_concept": {
                                "id": current_concept["id"],
                                "name": current_concept["name"],
                                "description": current_concept.get("description", ""),
                                "unit_number": current_concept.get("unit_number"),
                                "unit_name": current_concept.get("unit_name"),
                                "difficulty": current_concept.get("difficulty", 1),
                            } if current_concept else None,
                            "upcoming": [
                                {"id": c["id"], "name": c["name"], "difficulty": c.get("difficulty", 1)}
                                for c in upcoming_list[:3]
                            ],
                            "mastered": [
                                {"id": c["id"], "name": c["name"]}
                                for c in mastered_list
                            ],
                            "mastery_update": {
                                "concept_id": concept_discussed,
                                "understanding": understanding,
                            } if concept_discussed else None,
                        }

                    # Send done with learning summary + learning path
                    await websocket.send_json({
                        "type": "done",
                        "message_id": str(uuid.uuid4()),
                        "learning_summary": summary,
                        "learning_path": learning_path_data,
                    })

                    await db.commit()

                except Exception as e:
                    await db.rollback()
                    logger.error("Tutor error: %s", e, exc_info=True)
                    await websocket.send_json({
                        "type": "stream",
                        "content": "Sorry, I encountered an error processing your question. Please try again.",
                        "citations": [],
                    })
                    await websocket.send_json({
                        "type": "done",
                        "message_id": str(uuid.uuid4()),
                    })

    except WebSocketDisconnect:
        pass
