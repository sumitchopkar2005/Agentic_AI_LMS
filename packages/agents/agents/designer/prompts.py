"""Prompt templates for the DesignerAgent. ALL prompts live here — never inline."""

PROMPTS = {
    "generate_mcq": """You are an expert educational assessment designer.

Given the following course concepts and their relationships, generate {count} multiple-choice questions.

REQUIREMENTS:
1. Each question must test understanding of exactly ONE concept.
2. Provide 4 answer options (A-D) with exactly 1 correct answer.
3. Distractors must reflect common misconceptions, not random wrong answers.
4. Include a brief explanation for why the correct answer is right.
5. Tag each question with the concept_id it tests.
6. Difficulty level: {difficulty} (1=recall, 2=understand, 3=apply, 4=analyze, 5=evaluate)

CONCEPTS:
{concepts}

OUTPUT FORMAT (JSON array):
[{{
    "question": "...",
    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "correct_answer": "B",
    "explanation": "...",
    "concept_id": "...",
    "difficulty": 2
}}]
""",
    "generate_scenario": """You are an expert educational scenario designer.

Create a branching scenario assignment based on the following concepts.
The student should navigate through a realistic situation that tests their understanding.

REQUIREMENTS:
1. Create a scenario with 3-5 decision points.
2. Each decision should have 2-3 options with different outcomes.
3. Wrong choices should lead to learning moments, not dead ends.
4. The scenario must be grounded in the provided concepts.
5. Include feedback text for each choice explaining why it was right/wrong.

CONCEPTS:
{concepts}

COURSE CONTEXT:
{context}

GRADING STRICTNESS: {strictness}

OUTPUT FORMAT (JSON):
{{
    "title": "...",
    "introduction": "...",
    "nodes": [{{
        "id": "node_1",
        "text": "...",
        "choices": [{{
            "text": "...",
            "next_node": "node_2",
            "is_optimal": true,
            "feedback": "..."
        }}]
    }}]
}}
""",
    "generate_rubric": """You are an expert at creating grading rubrics.

Create a detailed grading rubric for the following assignment.

ASSIGNMENT:
{assignment}

REQUIREMENTS:
1. Create 3-5 grading criteria.
2. Each criterion has a name, description, and max points.
3. For each criterion, describe what constitutes full marks, partial marks, and no marks.
4. Total max points should sum to {max_points}.
5. Criteria should assess both content knowledge and critical thinking.

OUTPUT FORMAT (JSON):
{{
    "criteria": [{{
        "name": "...",
        "description": "...",
        "max_points": 25,
        "levels": {{
            "excellent": "...",
            "good": "...",
            "needs_improvement": "...",
            "unsatisfactory": "..."
        }}
    }}]
}}
""",
    "generate_code_lab": """You are an expert programming instructor and assessment designer.

Create a coding lab assignment based on the following concepts.
The student must write code that demonstrates understanding of the concepts.

REQUIREMENTS:
1. Create a clear problem statement with specific requirements.
2. Provide starter code with function signatures and docstrings.
3. Include 3-5 test cases (input/output pairs) to verify correctness.
4. The problem should be solvable in a single file.
5. Difficulty level: {difficulty} (1=basic syntax, 2=simple algorithms, 3=data structures, 4=complex algorithms, 5=system design)

CONCEPTS:
{concepts}

OUTPUT FORMAT (JSON):
{{
    "title": "...",
    "problem_statement": "...",
    "starter_code": "...",
    "language": "python",
    "test_cases": [{{
        "input": "...",
        "expected_output": "...",
        "description": "..."
    }}],
    "hints": ["...", "..."],
    "expected_solution": "..."
}}
""",
}
