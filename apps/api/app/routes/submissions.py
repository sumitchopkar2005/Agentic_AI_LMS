from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, get_current_faculty, get_current_student
from app.models.assignment import Assignment, AssignmentType
from app.models.submission import AppealStatus, Submission
from app.models.user import User
from app.schemas.submissions import AppealRequest, SubmissionCreateRequest, SubmissionResponse
from app.services.sandbox.executor import execute_code as sandbox_execute
from app.services.sandbox.test_runner import run_tests

router = APIRouter()


@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionResponse)
async def submit_assignment(
    assignment_id: UUID,
    body: SubmissionCreateRequest,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> Submission:
    # Count existing attempts
    result = await db.execute(
        select(Submission).where(
            Submission.assignment_id == assignment_id,
            Submission.student_id == student.id,
        )
    )
    existing = result.scalars().all()

    # Block resubmission if already answered correctly (MCQ)
    for prev in existing:
        if prev.ai_grade and prev.ai_grade.get("correct") is True:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already answered this question correctly.",
            )

    submission = Submission(
        assignment_id=assignment_id,
        student_id=student.id,
        content=body.content,
        content_json=body.content_json,
        attempt_number=len(existing) + 1,
    )
    db.add(submission)
    await db.flush()

    # Auto-grade MCQ assignments immediately
    result_a = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result_a.scalar_one_or_none()
    if assignment and assignment.type == AssignmentType.MCQ:
        correct = (assignment.content or {}).get("correct_answer")
        selected = (body.content_json or {}).get("selected_answer")
        is_correct = correct is not None and selected == correct
        if is_correct:
            submission.ai_grade = {
                "overall_score": assignment.max_xp,
                "max_score": assignment.max_xp,
                "correct": True,
                "correct_answer": correct,
            }
            submission.feedback = "Correct! Well done."
            # Use XP/Gold engines
            from app.services.gamification.xp_engine import calculate_xp
            from app.services.gamification.gold_engine import calculate_gold_earned
            user_result = await db.execute(select(User).where(User.id == student.id))
            user = user_result.scalar_one()
            hints_used = submission.hints_used if isinstance(submission.hints_used, list) else []
            xp = calculate_xp(assignment.max_xp, 1.0, hints_used, user.current_streak)
            gold = calculate_gold_earned(assignment.max_gold, 1.0, True, user.current_streak)
            submission.xp_awarded = xp
            submission.gold_awarded = gold
            user.xp_total += xp
            user.gold_balance += gold
        else:
            submission.ai_grade = {
                "overall_score": 0,
                "max_score": assignment.max_xp,
                "correct": False,
            }
            submission.feedback = "Not quite right. Try again — use a hint if you're stuck!"
            submission.xp_awarded = 0
            submission.gold_awarded = 0
        await db.flush()

    # Auto-grade CODE_LAB assignments: run tests + LLM code quality assessment
    if assignment and assignment.type == AssignmentType.CODE_LAB:
        student_code = body.content or ""
        content = assignment.content or {}
        test_suite = content.get("test_suite", "")
        language = content.get("language", "python")

        # --- Run test cases ---
        tests_passed = 0
        tests_total = 0
        test_results_list: list[dict] = []

        if test_suite:
            test_results_list = await run_tests(student_code, test_suite, language)
            tests_total = len(test_results_list)
            tests_passed = sum(1 for t in test_results_list if t.get("passed"))

        # If no test suite, just execute and check for errors
        if not test_suite:
            exec_result = await sandbox_execute(student_code, language)
            if exec_result["exit_code"] == 0:
                tests_passed = 1
                tests_total = 1
                test_results_list = [{"name": "execution", "passed": True, "output": exec_result["stdout"]}]
            else:
                tests_passed = 0
                tests_total = 1
                test_results_list = [{"name": "execution", "passed": False, "output": exec_result["stderr"]}]

        test_pass_rate = tests_passed / tests_total if tests_total > 0 else 0.0
        all_tests_passed = tests_passed == tests_total and tests_total > 0

        # --- LLM correctness + quality assessment ---
        code_quality_score = 0.0
        code_feedback = ""
        code_solves_problem = False  # LLM verdict on whether code addresses the problem
        try:
            from llm import LLMRouter
            llm = LLMRouter(ollama_url=settings.ollama_base_url)
            problem_statement = content.get('problem_statement', assignment.description or assignment.title)
            quality_prompt = (
                f"You are a strict code grader. Assess whether this student code actually "
                f"solves the given problem AND rate its quality.\n\n"
                f"## Problem Statement\n{problem_statement}\n\n"
                f"## Student Code ({language})\n```{language}\n{student_code[:3000]}\n```\n\n"
                f"## Test Results\n{tests_passed}/{tests_total} tests passed\n\n"
                f"IMPORTANT: The code might run without errors and pass generic tests but "
                f"still NOT implement what the problem asks for. Check carefully:\n"
                f"1. Does the code implement the SPECIFIC functionality described in the problem?\n"
                f"2. Would the code produce correct results for the problem's requirements?\n"
                f"3. Is it actually solving this problem, or is it unrelated code that happens to run?\n\n"
                f"Respond with ONLY a JSON object (no markdown):\n"
                f'{{"solves_problem": true/false, "quality_score": <0-100>, '
                f'"feedback": "<2-3 sentences explaining your verdict>"}}'
            )
            resp = await llm.complete(task_type="grading", prompt=quality_prompt)
            import json as _json
            text = resp.content.strip()
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0:
                parsed = _json.loads(text[start:end])
                raw_solves = parsed.get("solves_problem", False)
                code_solves_problem = raw_solves is True or (isinstance(raw_solves, str) and raw_solves.lower() == "true")
                code_quality_score = min(float(parsed.get("quality_score", 0)), 100.0)
                code_feedback = parsed.get("feedback", "")
        except Exception:
            # Fallback: if LLM fails and tests exist and passed, trust the tests
            if test_suite and all_tests_passed:
                code_solves_problem = True
                code_quality_score = test_pass_rate * 80
                code_feedback = "All tests passed! Good job."
            else:
                code_solves_problem = False
                code_quality_score = test_pass_rate * 80
                code_feedback = (
                    f"{tests_passed}/{tests_total} tests passed. Review failing cases."
                    if tests_total > 0 else "Could not verify code correctness."
                )

        # Gate: code must solve the problem to be considered correct
        is_correct = all_tests_passed and code_solves_problem

        # --- Compute final score ---
        # 70% weight on tests, 30% on code quality
        test_score = test_pass_rate * 70
        quality_component = (code_quality_score / 100) * 30
        final_score = test_score + quality_component
        final_pct = final_score / 100

        submission.ai_grade = {
            "overall_score": round(final_score, 1),
            "max_score": 100,
            "correct": is_correct,
            "solves_problem": code_solves_problem,
            "test_results": test_results_list,
            "tests_passed": tests_passed,
            "tests_total": tests_total,
            "code_quality_score": round(code_quality_score, 1),
        }

        if is_correct:
            submission.feedback = code_feedback or "All tests passed! Great work."
            # Award XP and Gold
            from app.services.gamification.xp_engine import calculate_xp
            from app.services.gamification.gold_engine import calculate_gold_earned
            user_result = await db.execute(select(User).where(User.id == student.id))
            user = user_result.scalar_one()
            hints_used = submission.hints_used if isinstance(submission.hints_used, list) else []
            xp = calculate_xp(assignment.max_xp, final_pct, hints_used, user.current_streak)
            gold = calculate_gold_earned(assignment.max_gold, final_pct, final_pct >= 1.0, user.current_streak)
            submission.xp_awarded = xp
            submission.gold_awarded = gold
            user.xp_total += xp
            user.gold_balance += gold
        elif all_tests_passed and not code_solves_problem:
            # Code runs but doesn't solve the problem
            submission.feedback = (
                "Your code runs without errors, but it does not implement the required functionality. "
                + (code_feedback or "Please re-read the problem statement and try again.")
            )
            submission.xp_awarded = 0
            submission.gold_awarded = 0
        else:
            submission.feedback = (
                f"{tests_passed}/{tests_total} tests passed. "
                + (code_feedback or "Fix the failing tests and try again.")
            )
            submission.xp_awarded = 0
            submission.gold_awarded = 0

        await db.flush()

    # --- Post-grading hooks: streaks, badges, leaderboard ---
    try:
        from app.services.gamification.streaks import update_streak
        await update_streak(student.id, db)
    except Exception:
        pass  # non-critical
    try:
        from app.services.gamification.badges import check_badge_eligibility
        await check_badge_eligibility(student.id, db)
    except Exception:
        pass  # non-critical
    if assignment and submission.xp_awarded:
        try:
            from app.services.gamification.leaderboard import update_leaderboard
            user_result = await db.execute(select(User).where(User.id == student.id))
            user = user_result.scalar_one()
            await update_leaderboard(assignment.course_id, student.id, user.xp_total)
        except Exception:
            pass  # non-critical

    return submission


@router.post("/submissions/{submission_id}/appeal")
async def appeal_grade(
    submission_id: UUID,
    body: AppealRequest,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your submission")

    submission.appeal_status = AppealStatus.PENDING
    await db.flush()
    return {"status": "appeal_submitted", "submission_id": str(submission_id)}


@router.get("/submissions/{submission_id}/ai-rationale")
async def get_ai_rationale(
    submission_id: UUID,
    faculty: CurrentUser = Depends(get_current_faculty),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return {
        "submission_id": str(submission_id),
        "ai_grade": submission.ai_grade,
        "feedback": submission.feedback,
    }


@router.get("/assignments/{assignment_id}/submissions/mine", response_model=list[SubmissionResponse])
async def my_submissions(
    assignment_id: UUID,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> list[Submission]:
    """Get the current student's submissions for an assignment."""
    result = await db.execute(
        select(Submission)
        .where(
            Submission.assignment_id == assignment_id,
            Submission.student_id == student.id,
        )
        .order_by(Submission.attempt_number.desc())
    )
    return list(result.scalars().all())


@router.get("/courses/{course_id}/submissions/mine", response_model=list[SubmissionResponse])
async def my_course_submissions(
    course_id: UUID,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> list[Submission]:
    """Get all of the current student's submissions for a course."""
    result = await db.execute(
        select(Submission)
        .join(Assignment, Submission.assignment_id == Assignment.id)
        .where(
            Assignment.course_id == course_id,
            Submission.student_id == student.id,
        )
        .order_by(Submission.assignment_id, Submission.attempt_number.desc())
    )
    return list(result.scalars().all())
