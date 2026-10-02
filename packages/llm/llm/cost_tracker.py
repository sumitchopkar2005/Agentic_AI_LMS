"""Token usage tracking per course for capacity planning."""

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class UsageRecord:
    task_type: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    course_id: str | None = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CostTracker:
    """Track LLM token usage for capacity planning and cost monitoring.

    Supports in-memory tracking with persistent storage to PostgreSQL
    and Valkey for real-time metrics.
    """

    def __init__(self) -> None:
        self._records: list[UsageRecord] = []

    def record(self, usage: UsageRecord) -> None:
        self._records.append(usage)

    def get_total_tokens(self, course_id: str | None = None) -> int:
        records = self._records
        if course_id:
            records = [r for r in records if r.course_id == course_id]
        return sum(r.prompt_tokens + r.completion_tokens for r in records)

    def get_summary(self, course_id: str | None = None) -> dict:
        """Get a summary of token usage."""
        records = self._records
        if course_id:
            records = [r for r in records if r.course_id == course_id]

        total_prompt = sum(r.prompt_tokens for r in records)
        total_completion = sum(r.completion_tokens for r in records)

        by_task: dict[str, dict] = {}
        for r in records:
            if r.task_type not in by_task:
                by_task[r.task_type] = {"prompt_tokens": 0, "completion_tokens": 0, "count": 0}
            by_task[r.task_type]["prompt_tokens"] += r.prompt_tokens
            by_task[r.task_type]["completion_tokens"] += r.completion_tokens
            by_task[r.task_type]["count"] += 1

        by_model: dict[str, dict] = {}
        for r in records:
            if r.model not in by_model:
                by_model[r.model] = {"prompt_tokens": 0, "completion_tokens": 0, "count": 0}
            by_model[r.model]["prompt_tokens"] += r.prompt_tokens
            by_model[r.model]["completion_tokens"] += r.completion_tokens
            by_model[r.model]["count"] += 1

        return {
            "total_records": len(records),
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "total_tokens": total_prompt + total_completion,
            "by_task_type": by_task,
            "by_model": by_model,
        }

    async def persist_to_db(self, db_session) -> int:
        """Persist in-memory usage records to PostgreSQL.

        Stores records in the llm_usage_log table. Returns the number
        of records persisted.
        """
        if not self._records:
            return 0

        records_to_persist = list(self._records)
        self._records.clear()

        try:
            from sqlalchemy import text
            for record in records_to_persist:
                await db_session.execute(
                    text(
                        "INSERT INTO llm_usage_log "
                        "(task_type, model, prompt_tokens, completion_tokens, course_id, created_at) "
                        "VALUES (:task_type, :model, :prompt_tokens, :completion_tokens, :course_id, :created_at)"
                    ),
                    {
                        "task_type": record.task_type,
                        "model": record.model,
                        "prompt_tokens": record.prompt_tokens,
                        "completion_tokens": record.completion_tokens,
                        "course_id": record.course_id,
                        "created_at": record.timestamp,
                    },
                )
            await db_session.commit()
            logger.info("Persisted %d usage records to PostgreSQL", len(records_to_persist))
            return len(records_to_persist)
        except Exception as e:
            logger.warning("Failed to persist usage records: %s", e)
            # Put records back so they can be retried
            self._records.extend(records_to_persist)
            return 0

    async def push_to_valkey(self, valkey_client) -> None:
        """Push current metrics to Valkey for real-time monitoring dashboards."""
        try:
            summary = self.get_summary()
            await valkey_client.set(
                "llm:usage:summary",
                json.dumps(summary),
                ex=300,  # 5 min TTL
            )

            # Per-task counters
            for task_type, stats in summary["by_task_type"].items():
                await valkey_client.set(
                    f"llm:usage:{task_type}:tokens",
                    stats["prompt_tokens"] + stats["completion_tokens"],
                    ex=300,
                )
        except Exception as e:
            logger.warning("Failed to push metrics to Valkey: %s", e)


# Global singleton
cost_tracker = CostTracker()
