"""
Test runner — executes hidden test suites against student code.
"""

import asyncio
import logging
import re
import tempfile
import time
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_EXECUTION_TIME = 30


async def run_tests(code: str, test_suite: str, language: str) -> list[dict]:
    """Run hidden tests against student code.

    Returns: [{"name": "test_add", "passed": True, "output": "..."}]
    """
    if language == "python":
        return await _run_python_tests(code, test_suite)
    elif language == "javascript":
        return await _run_js_tests(code, test_suite)
    else:
        # Fallback: combine and execute
        from app.services.sandbox.executor import execute_code
        result = await execute_code(code, language, test_suite=test_suite)
        passed = result["exit_code"] == 0
        return [{
            "name": "test_suite",
            "passed": passed,
            "output": result["stdout"][:1000] if passed else result["stderr"][:1000],
            "error": result["stderr"][:500] if not passed else None,
        }]


async def _run_python_tests(code: str, test_suite: str) -> list[dict]:
    """Run Python tests using pytest with verbose output for parsing."""
    with tempfile.TemporaryDirectory(prefix="sandbox_test_") as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Write student code as a module
        (tmpdir_path / "solution.py").write_text(code)

        # Write test file that imports from solution
        # Prepend an import that makes student code available
        test_content = f"from solution import *\n\n{test_suite}"
        (tmpdir_path / "test_solution.py").write_text(test_content)

        try:
            proc = await asyncio.create_subprocess_exec(
                "python3", "-m", "pytest",
                str(tmpdir_path / "test_solution.py"),
                "-v", "--tb=short", "--no-header",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(tmpdir_path),
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=MAX_EXECUTION_TIME
            )
        except asyncio.TimeoutError:
            proc.kill()
            return [{"name": "test_suite", "passed": False, "output": "", "error": f"Timed out after {MAX_EXECUTION_TIME}s"}]

        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        combined = stdout_text + "\n" + stderr_text

        # Parse pytest verbose output: "test_solution.py::test_name PASSED/FAILED"
        results = []
        for line in combined.splitlines():
            line = line.strip()
            # Match patterns like "test_solution.py::test_basic PASSED  [ 33%]"
            match = re.match(r".*::(\w+)\s+(PASSED|FAILED|ERROR)\b", line)
            if match:
                test_name = match.group(1)
                status = match.group(2)
                results.append({
                    "name": test_name,
                    "passed": status == "PASSED",
                    "output": line,
                    "error": None if status == "PASSED" else _extract_failure(combined, test_name),
                })

        # If pytest didn't produce parseable results, fall back
        if not results:
            passed = proc.returncode == 0
            # Try to count from summary line like "3 passed" or "1 failed, 2 passed"
            pass_match = re.search(r"(\d+) passed", combined)
            fail_match = re.search(r"(\d+) failed", combined)
            n_passed = int(pass_match.group(1)) if pass_match else (1 if passed else 0)
            n_failed = int(fail_match.group(1)) if fail_match else (0 if passed else 1)

            for i in range(n_passed):
                results.append({"name": f"test_{i+1}", "passed": True, "output": "Passed"})
            for i in range(n_failed):
                results.append({
                    "name": f"test_failed_{i+1}",
                    "passed": False,
                    "output": "",
                    "error": stderr_text[:300] if stderr_text else stdout_text[:300],
                })

            # If still empty, return a single result
            if not results:
                results.append({
                    "name": "test_suite",
                    "passed": passed,
                    "output": stdout_text[:500],
                    "error": stderr_text[:500] if not passed else None,
                })

        return results


def _extract_failure(combined_output: str, test_name: str) -> str | None:
    """Extract the failure message for a specific test from pytest output."""
    lines = combined_output.splitlines()
    capture = False
    failure_lines = []
    for line in lines:
        if f"FAILED {test_name}" in line or (f"::{test_name}" in line and "FAILED" in line):
            capture = True
            continue
        if capture:
            if line.strip().startswith("=") or (line.strip().startswith("test_") and "PASSED" in line or "FAILED" in line):
                break
            failure_lines.append(line)
    return "\n".join(failure_lines).strip()[:500] if failure_lines else None


async def _run_js_tests(code: str, test_suite: str) -> list[dict]:
    """Run JavaScript tests by combining code + assertions."""
    combined = f"// Student code\n{code}\n\n// Test suite\n{test_suite}"

    with tempfile.TemporaryDirectory(prefix="sandbox_js_") as tmpdir:
        tmpdir_path = Path(tmpdir)
        (tmpdir_path / "test.js").write_text(combined)

        try:
            proc = await asyncio.create_subprocess_exec(
                "node", str(tmpdir_path / "test.js"),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(tmpdir_path),
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=MAX_EXECUTION_TIME
            )
        except asyncio.TimeoutError:
            proc.kill()
            return [{"name": "test_suite", "passed": False, "output": "", "error": f"Timed out after {MAX_EXECUTION_TIME}s"}]

        passed = proc.returncode == 0
        return [{
            "name": "test_suite",
            "passed": passed,
            "output": stdout.decode("utf-8", errors="replace")[:500],
            "error": stderr.decode("utf-8", errors="replace")[:500] if not passed else None,
        }]
