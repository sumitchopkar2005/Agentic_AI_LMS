"""
Code sandbox executor — manages isolated subprocess execution for student code.

Uses subprocess with resource limits as a practical sandbox. For production
use with Firecracker microVMs, replace _run_in_subprocess with the Firecracker
API client (boot VM, write code, execute, collect output, destroy VM).
"""

import asyncio
import logging
import tempfile
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Language runtime configs
LANGUAGE_CONFIGS = {
    "python": {
        "extension": ".py",
        "command": ["python3"],
        "test_framework": "pytest",
        "test_command": ["python3", "-m", "pytest", "--tb=short", "-q"],
    },
    "javascript": {
        "extension": ".js",
        "command": ["node"],
        "test_framework": "jest",
        "test_command": ["node"],
    },
    "java": {
        "extension": ".java",
        "command": ["java"],
        "test_framework": "junit",
        "test_command": ["java"],
    },
    "cpp": {
        "extension": ".cpp",
        "command": ["g++", "-o", "/tmp/a.out"],
        "run_command": ["/tmp/a.out"],
        "test_framework": None,
        "test_command": None,
    },
}

# Resource limits
MAX_EXECUTION_TIME = 30  # seconds
MAX_OUTPUT_SIZE = 1024 * 100  # 100 KB


async def execute_code(code: str, language: str, test_suite: str | None = None) -> dict:
    """Execute student code in an isolated subprocess with resource limits.

    Returns: {"stdout": str, "stderr": str, "exit_code": int,
              "test_results": [...], "execution_time_ms": int}
    """
    config = LANGUAGE_CONFIGS.get(language)
    if not config:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}. Supported: {', '.join(LANGUAGE_CONFIGS.keys())}",
            "exit_code": 1,
            "test_results": None,
            "execution_time_ms": 0,
        }

    start_time = time.monotonic()

    try:
        with tempfile.TemporaryDirectory(prefix="sandbox_") as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Write student code
            code_file = tmpdir_path / f"solution{config['extension']}"
            code_file.write_text(code)

            # Write test suite if provided
            test_file = None
            if test_suite:
                if language == "python":
                    test_file = tmpdir_path / "test_solution.py"
                    test_file.write_text(test_suite)
                elif language == "javascript":
                    test_file = tmpdir_path / "test_solution.js"
                    test_file.write_text(test_suite)

            # Build command
            if test_suite and config.get("test_command") and language == "python":
                cmd = [*config["test_command"], str(tmpdir_path)]
            elif language == "cpp":
                # Compile first, then run
                compile_result = await _run_subprocess(
                    [*config["command"], str(code_file)],
                    cwd=str(tmpdir_path),
                )
                if compile_result["exit_code"] != 0:
                    elapsed_ms = int((time.monotonic() - start_time) * 1000)
                    return {**compile_result, "test_results": None, "execution_time_ms": elapsed_ms}
                cmd = config.get("run_command", ["/tmp/a.out"])
            else:
                cmd = [*config["command"], str(code_file)]

            result = await _run_subprocess(cmd, cwd=str(tmpdir_path))

            # Parse test results if test suite was provided
            test_results = None
            if test_suite and language == "python":
                test_results = _parse_pytest_output(result["stdout"], result["stderr"])

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            return {
                "stdout": result["stdout"][:MAX_OUTPUT_SIZE],
                "stderr": result["stderr"][:MAX_OUTPUT_SIZE],
                "exit_code": result["exit_code"],
                "test_results": test_results,
                "execution_time_ms": elapsed_ms,
            }

    except Exception as e:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        logger.error("Sandbox execution failed: %s", e)
        return {
            "stdout": "",
            "stderr": f"Execution error: {str(e)}",
            "exit_code": 1,
            "test_results": None,
            "execution_time_ms": elapsed_ms,
        }


async def _run_subprocess(cmd: list[str], cwd: str) -> dict:
    """Run a subprocess with timeout and capture output."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=MAX_EXECUTION_TIME,
        )
        return {
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "exit_code": proc.returncode or 0,
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {MAX_EXECUTION_TIME} seconds",
            "exit_code": 124,
        }


def _parse_pytest_output(stdout: str, stderr: str) -> list[dict]:
    """Parse pytest -q output into structured test results."""
    results = []
    combined = stdout + "\n" + stderr

    for line in combined.splitlines():
        line = line.strip()
        if "::" in line and (" PASSED" in line or " FAILED" in line or " ERROR" in line):
            test_name = line.split("::")[1].split()[0] if "::" in line else line
            passed = "PASSED" in line
            results.append({
                "name": test_name,
                "passed": passed,
                "output": line,
            })

    # If no parsed results but we had output, create a summary
    if not results and ("passed" in combined or "failed" in combined):
        results.append({
            "name": "test_suite",
            "passed": "failed" not in combined.lower(),
            "output": combined[:500],
        })

    return results
