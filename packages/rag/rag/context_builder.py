"""Assemble context window with citations for LLM prompts."""


def build_context(chunks: list[dict], max_tokens: int = 4000) -> str:
    """Build a context string from retrieved chunks with citations.

    Format:
    [Source: lecture1.pdf, Page 4]
    <chunk text>

    [Source: lecture2.pdf, Page 12]
    <chunk text>
    """
    parts = []
    for chunk in chunks:
        citation = f"[Source: {chunk.get('source_doc', 'unknown')}, Page {chunk.get('source_page', '?')}]"
        parts.append(f"{citation}\n{chunk.get('text', '')}")

    return "\n\n".join(parts)
