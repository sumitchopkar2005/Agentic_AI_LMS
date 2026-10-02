"""IngestionAgent state definition."""

from typing import TypedDict


class IngestionState(TypedDict):
    course_id: str
    material_id: str  # UUID of CourseMaterial row — used for cascading deletes
    file_path: str
    file_type: str  # pdf, pptx, docx, mp4, mp3
    source_doc: str
    vector_collection: str
    weaviate_url: str
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    ollama_base_url: str  # e.g. http://localhost:11434/v1
    unit_number: int | None
    unit_name: str | None
    parsed_pages: list[dict]
    chunks: list[dict]
    embeddings_stored: int
    concept_nodes: list[dict]
    relationships: list[dict]
    current_step: str
    progress_pct: int
    errors: list[str]
