"""Typed event definitions for the Valkey pub/sub event bus."""

from dataclasses import dataclass


@dataclass
class IngestionStarted:
    course_id: str
    file_name: str
    file_type: str
    channel: str = "ingestion.started"


@dataclass
class IngestionCompleted:
    course_id: str
    chunks_count: int
    concepts_count: int
    channel: str = "ingestion.completed"


@dataclass
class AssignmentGenerated:
    course_id: str
    assignment_ids: list[str]
    channel: str = "assignment.generated"


@dataclass
class AssignmentPublished:
    assignment_id: str
    course_id: str
    channel: str = "assignment.published"


@dataclass
class SubmissionReceived:
    submission_id: str
    assignment_id: str
    student_id: str
    channel: str = "submission.received"


@dataclass
class GradeAwarded:
    submission_id: str
    student_id: str
    score: float
    xp: int
    gold: int
    channel: str = "grade.awarded"


@dataclass
class HintAccessed:
    student_id: str
    assignment_id: str
    tier: str
    gold_cost: int
    channel: str = "hint.accessed"
