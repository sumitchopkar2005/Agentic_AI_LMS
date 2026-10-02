"""Knowledge Graph data models."""

from dataclasses import dataclass, field


@dataclass
class ConceptNode:
    id: str
    name: str
    description: str
    course_id: str
    difficulty: int = 1  # 1-5
    unit_number: int | None = None
    unit_name: str | None = None
    position: int = 0  # ordering within unit; higher = later in learning path
    material_id: str = ""  # UUID of source CourseMaterial — for cascading deletes
    metadata: dict = field(default_factory=dict)


@dataclass
class Relationship:
    source_id: str
    target_id: str
    type: str  # "prerequisite", "related", "part_of", "leads_to"
    weight: float = 1.0
