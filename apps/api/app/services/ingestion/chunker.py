"""
Semantic chunking service — splits parsed content into concept-level chunks.

Uses LLM-assisted chunking when available, with a heading-aware text splitter as fallback.
Target: chunks of 200-500 tokens, each covering one concept.
"""

import hashlib
import json
import logging
import re

from llm.router import LLMRouter

logger = logging.getLogger(__name__)


def _extract_json_array(raw: str) -> list:
    """Extract a JSON array from LLM output that may contain surrounding text."""
    raw = raw.strip()
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("["):
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    continue
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    start = raw.find("[")
    if start != -1:
        depth = 0
        for i in range(start, len(raw)):
            if raw[i] == "[":
                depth += 1
            elif raw[i] == "]":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(raw[start : i + 1])
                    except json.JSONDecodeError:
                        break
    return []

CONCEPT_EXTRACTION_PROMPT = """\
You are a course content analyst. Split the following text into meaningful concept-level chunks.
Each chunk should cover exactly one concept or topic.

Rules:
- Each chunk should be 200-500 tokens
- Preserve the original text exactly — do NOT paraphrase
- Identify the primary concept for each chunk
- Return valid JSON only

Text:
{text}

Return a JSON array:
[{{"concept": "concept name", "text": "exact text from the source"}}]
"""

# Patterns that identify section headings in academic content
_HEADING_RE = re.compile(
    r"^(?:"
    r"(?:Chapter|Section|Part|Module|Unit|Lecture|Topic)\s+\d+[.:]\s*"  # Chapter 1: ...
    r"|\d+(?:\.\d+)*\s+[A-Z]"                                          # 1.1 Title
    r"|#{1,4}\s+"                                                       # Markdown headings
    r"|[A-Z][A-Za-z ]{2,60}$"                                          # Title-case lines (short)
    r")",
    re.MULTILINE,
)


def _split_on_headings(text: str) -> list[dict]:
    """Split text into sections using detected headings. Returns [{"concept": ..., "text": ...}]."""
    lines = text.split("\n")
    sections: list[dict] = []
    current_heading = "General"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            current_lines.append(line)
            continue

        is_heading = bool(_HEADING_RE.match(stripped)) and len(stripped) < 120

        if is_heading and current_lines:
            body = "\n".join(current_lines).strip()
            if body:
                sections.append({"concept": current_heading, "text": body})
            # Clean heading: strip numbering prefixes and trailing colons
            current_heading = re.sub(r"^(?:Chapter|Section|Part|Module|Unit|Lecture|Topic)\s+\d+[.:]\s*", "", stripped)
            current_heading = re.sub(r"^\d+(?:\.\d+)*\s*", "", current_heading)
            current_heading = re.sub(r"^#{1,4}\s+", "", current_heading)
            current_heading = current_heading.strip(": ") or "General"
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append({"concept": current_heading, "text": body})

    return sections


def _recursive_split(text: str, max_tokens: int = 400, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks at paragraph/sentence boundaries."""
    # Rough estimate: 1 token ≈ 4 characters
    max_chars = max_tokens * 4
    overlap_chars = overlap * 4

    separators = ["\n\n", "\n", ". ", " "]
    chunks: list[str] = []

    def _split_at(text: str, sep: str) -> list[str]:
        parts = text.split(sep)
        result: list[str] = []
        current = ""
        for part in parts:
            candidate = current + sep + part if current else part
            if len(candidate) > max_chars and current:
                result.append(current.strip())
                current = part
            else:
                current = candidate
        if current.strip():
            result.append(current.strip())
        return result

    for sep in separators:
        if len(text) <= max_chars:
            return [text] if text.strip() else []
        parts = _split_at(text, sep)
        if all(len(p) <= max_chars for p in parts):
            # Add overlap between chunks
            for i, part in enumerate(parts):
                if i > 0 and overlap_chars > 0:
                    prev_tail = parts[i - 1][-overlap_chars:]
                    part = prev_tail + " " + part
                chunks.append(part)
            return chunks

    # Last resort: hard split
    for i in range(0, len(text), max_chars - overlap_chars):
        chunk = text[i : i + max_chars]
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks


def _make_chunk_id(course_id: str, text: str, index: int) -> str:
    content = f"{course_id}:{index}:{text[:100]}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


async def semantic_chunk(
    pages: list[dict],
    course_id: str,
    source_doc: str = "unknown",
    material_id: str = "",
    llm_router: LLMRouter | None = None,
) -> list[dict]:
    """Split parsed pages into semantic chunks grouped by concept.

    Returns: [{"chunk_id": "...", "text": "...", "concept": "...",
               "source_page": 1, "source_doc": "lecture1.pdf"}]
    """
    all_chunks: list[dict] = []
    chunk_index = 0

    for page in pages:
        page_text = page.get("text", "")
        page_num = page.get("page", 0)

        if not page_text.strip():
            continue

        page_chunks: list[dict] = []

        # Try LLM-assisted chunking
        if llm_router is not None:
            try:
                prompt = CONCEPT_EXTRACTION_PROMPT.format(text=page_text[:6000])
                response = await llm_router.complete(
                    task_type="ingestion",
                    messages=[
                        {"role": "system", "content": "You are a precise JSON-outputting assistant."},
                        {"role": "user", "content": prompt},
                    ],
                )
                raw = response.content.strip()
                parsed = _extract_json_array(raw)
                for item in parsed:
                    if isinstance(item, dict) and item.get("text"):
                        page_chunks.append(
                            {
                                "concept": item.get("concept", "General"),
                                "text": item["text"],
                            }
                        )
            except Exception:
                logger.warning(
                    "LLM chunking failed for page %d, falling back to recursive split",
                    page_num,
                    exc_info=True,
                )

        # Fallback: split on headings first, then recursive split large sections
        if not page_chunks:
            sections = _split_on_headings(page_text)
            for section in sections:
                if len(section["text"]) > 1600:  # > ~400 tokens
                    text_parts = _recursive_split(section["text"])
                    for part in text_parts:
                        page_chunks.append({"concept": section["concept"], "text": part})
                else:
                    page_chunks.append(section)

        # Build final chunk dicts with IDs and metadata
        for chunk_data in page_chunks:
            chunk_id = _make_chunk_id(course_id, chunk_data["text"], chunk_index)
            all_chunks.append(
                {
                    "chunk_id": chunk_id,
                    "text": chunk_data["text"],
                    "concept": chunk_data["concept"],
                    "source_page": page_num,
                    "source_doc": source_doc,
                    "course_id": course_id,
                    "material_id": material_id,
                }
            )
            chunk_index += 1

    return all_chunks
