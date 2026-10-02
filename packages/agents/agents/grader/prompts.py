"""Prompt templates for the GraderAgent."""

PROMPTS = {
    "evaluate_criteria": """You are a strict academic grader evaluating a student submission.

RUBRIC:
{rubric}

SOURCE MATERIAL (ground truth):
{source_material}

STUDENT SUBMISSION:
{submission}

INSTRUCTIONS:
1. Evaluate the submission against EACH rubric criterion.
2. For each criterion, assign a score and cite SPECIFIC evidence from the student's work.
3. Be fair but rigorous. The grading strictness level is: {strictness}.
4. Only give credit for claims that are supported by the source material.

OUTPUT FORMAT (JSON):
{{
    "overall_score": 85,
    "max_score": 100,
    "criteria": [{{
        "name": "Content Accuracy",
        "score": 22,
        "max_score": 25,
        "evidence": "Student correctly identified... but missed..."
    }}]
}}
""",
    "generate_feedback": """Based on the following grading result, generate prescriptive feedback.

GRADE RESULT:
{grade_result}

KNOWLEDGE GRAPH CONCEPTS TESTED:
{concepts}

INSTRUCTIONS:
1. Identify specific knowledge gaps (concepts where the student scored low).
2. Provide actionable next steps (not just "study more").
3. Reference specific source material pages for review.
4. Be encouraging — acknowledge what the student did well.
5. If score < 70%, suggest a remediation mini-quiz on weak concepts.

OUTPUT: Prescriptive feedback text (2-3 paragraphs).
""",
}
