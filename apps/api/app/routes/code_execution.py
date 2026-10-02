import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import CurrentUser, get_current_student
from app.models.assignment import Assignment
from app.schemas.submissions import CodeExecutionRequest, CodeExecutionResponse, TestResult
from app.services.sandbox.executor import execute_code
from app.services.sandbox.test_runner import run_tests

router = APIRouter()


class RunCodeRequest(BaseModel):
    code: str
    language: str = "python"
    assignment_id: UUID | None = None


class RunTestResult(BaseModel):
    name: str
    passed: bool
    output: str | None = None
    error: str | None = None
    expected: str | None = None


class RunCodeResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    test_results: list[RunTestResult] | None = None
    tests_passed: int = 0
    tests_total: int = 0
    all_passed: bool = False
    execution_time_ms: int = 0


@router.post("/code/run", response_model=RunCodeResponse)
async def run_student_code(
    body: RunCodeRequest,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> RunCodeResponse:
    """Run student code against test cases WITHOUT creating a submission.

    LeetCode-style: student clicks 'Run' to test their code before submitting.
    """
    start = time.monotonic()

    test_suite = None
    sample_tests = None

    if body.assignment_id:
        a_result = await db.execute(
            select(Assignment).where(Assignment.id == body.assignment_id)
        )
        assignment = a_result.scalar_one_or_none()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

        content = assignment.content or {}
        test_suite = content.get("test_suite", "")
        sample_tests = content.get("sample_tests")  # visible example tests

    elapsed_ms = 0

    if test_suite:
        test_results_raw = await run_tests(body.code, test_suite, body.language)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        tests_total = len(test_results_raw)
        tests_passed = sum(1 for t in test_results_raw if t.get("passed"))

        return RunCodeResponse(
            stdout=f"{tests_passed}/{tests_total} tests passed",
            stderr="",
            exit_code=0 if tests_passed == tests_total else 1,
            test_results=[
                RunTestResult(
                    name=t.get("name", f"test_{i+1}"),
                    passed=t.get("passed", False),
                    output=t.get("output"),
                    error=t.get("error"),
                )
                for i, t in enumerate(test_results_raw)
            ],
            tests_passed=tests_passed,
            tests_total=tests_total,
            all_passed=tests_passed == tests_total,
            execution_time_ms=elapsed_ms,
        )
    else:
        # No test suite — just execute and return output
        result = await execute_code(body.code, body.language)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return RunCodeResponse(
            stdout=result["stdout"],
            stderr=result["stderr"],
            exit_code=result["exit_code"],
            tests_passed=1 if result["exit_code"] == 0 else 0,
            tests_total=1,
            all_passed=result["exit_code"] == 0,
            execution_time_ms=result.get("execution_time_ms", elapsed_ms),
        )


@router.post("/code/execute", response_model=CodeExecutionResponse)
async def execute_student_code(
    body: CodeExecutionRequest,
    student: CurrentUser = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
) -> CodeExecutionResponse:
    """Execute student code in a sandboxed environment."""
    test_suite = None

    # If assignment_id provided, load hidden test suite
    if body.assignment_id:
        a_result = await db.execute(
            select(Assignment).where(Assignment.id == body.assignment_id)
        )
        assignment = a_result.scalar_one_or_none()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )
        # Extract test suite from assignment content
        content = assignment.content or {}
        test_suite = content.get("test_suite")

    if test_suite:
        # Run code against test suite
        test_results = await run_tests(body.code, test_suite, body.language)
        # Determine overall pass/fail
        all_passed = all(t["passed"] for t in test_results)
        return CodeExecutionResponse(
            stdout="All tests passed!" if all_passed else "Some tests failed.",
            stderr="",
            exit_code=0 if all_passed else 1,
            test_results=[
                TestResult(
                    name=t["name"],
                    passed=t["passed"],
                    output=t.get("output"),
                    error=t.get("error"),
                )
                for t in test_results
            ],
            execution_time_ms=0,
        )
    else:
        # Just execute the code
        result = await execute_code(body.code, body.language)

        test_results_out = None
        if result.get("test_results"):
            test_results_out = [
                TestResult(
                    name=t["name"],
                    passed=t["passed"],
                    output=t.get("output"),
                    error=t.get("error"),
                )
                for t in result["test_results"]
            ]

        return CodeExecutionResponse(
            stdout=result["stdout"],
            stderr=result["stderr"],
            exit_code=result["exit_code"],
            test_results=test_results_out,
            execution_time_ms=result["execution_time_ms"],
        )
