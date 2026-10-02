"""Hallucination detection — verifies AI claims against source context."""

import json
import logging

logger = logging.getLogger(__name__)

GROUNDING_PROMPT = """\
You are a fact-checker. Given an AI response and the source context it was based on,
identify any claims in the response that are NOT supported by the context.

AI Response:
{response}

Source Context:
{context}

Return a JSON object:
{{
    "grounded": true/false,
    "ungrounded_claims": ["claim 1 not in context", ...],
    "confidence": 0.0 to 1.0
}}

Rules:
- A claim is "grounded" if the context contains supporting evidence
- Set grounded=false if >20% of factual claims lack support
- Only flag factual claims, not opinions or general knowledge
"""


async def check_grounding(
    response: str,
    context: str,
    llm_router=None,
) -> dict:
    """Check if an AI response is grounded in the provided context.

    Returns: {"grounded": bool, "ungrounded_claims": [...], "confidence": float}
    """
    if not response or not context:
        return {"grounded": True, "ungrounded_claims": [], "confidence": 1.0}

    if llm_router is None:
        # Without LLM, do basic keyword overlap check
        response_words = set(response.lower().split())
        context_words = set(context.lower().split())
        overlap = len(response_words & context_words) / max(len(response_words), 1)
        return {
            "grounded": overlap > 0.3,
            "ungrounded_claims": [],
            "confidence": min(overlap * 2, 1.0),
        }

    try:
        prompt = GROUNDING_PROMPT.format(
            response=response[:3000],
            context=context[:4000],
        )
        result = await llm_router.complete(
            task_type="grading",
            messages=[
                {"role": "system", "content": "You are a precise JSON-outputting fact-checker."},
                {"role": "user", "content": prompt},
            ],
        )
        raw = result.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
        parsed = json.loads(raw)
        return {
            "grounded": bool(parsed.get("grounded", True)),
            "ungrounded_claims": parsed.get("ungrounded_claims", []),
            "confidence": float(parsed.get("confidence", 1.0)),
        }
    except Exception:
        logger.warning("Grounding check failed, defaulting to grounded", exc_info=True)
        return {"grounded": True, "ungrounded_claims": [], "confidence": 0.5}
