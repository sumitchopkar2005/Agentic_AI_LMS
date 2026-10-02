"""Seed test Knowledge Graph data for a course.

Usage:
    python scripts/seed_kg.py

Requires Neo4j running at bolt://localhost:7687 (user=neo4j, password=password).
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "packages", "knowledge-graph"))

from kg.client import KGClient
from kg.models import ConceptNode, Relationship

COURSE_ID = "bc1c2a1d-81f4-4769-86bb-4bf987994039"

# --- Unit 1: Python Fundamentals ---
CONCEPTS = [
    ConceptNode(id="c-variables", name="Variables & Data Types", description="Python variables, int, float, str, bool, type casting", course_id=COURSE_ID, difficulty=1, unit_number=1, unit_name="Python Fundamentals"),
    ConceptNode(id="c-operators", name="Operators & Expressions", description="Arithmetic, comparison, logical, and assignment operators", course_id=COURSE_ID, difficulty=1, unit_number=1, unit_name="Python Fundamentals"),
    ConceptNode(id="c-conditionals", name="Conditionals", description="if, elif, else statements and boolean logic", course_id=COURSE_ID, difficulty=2, unit_number=1, unit_name="Python Fundamentals"),
    ConceptNode(id="c-loops", name="Loops", description="for loops, while loops, break, continue, range()", course_id=COURSE_ID, difficulty=2, unit_number=1, unit_name="Python Fundamentals"),
    ConceptNode(id="c-strings", name="String Operations", description="Slicing, formatting, common string methods", course_id=COURSE_ID, difficulty=2, unit_number=1, unit_name="Python Fundamentals"),

    # --- Unit 2: Data Structures ---
    ConceptNode(id="c-lists", name="Lists", description="Creating, indexing, slicing, list methods, list comprehensions", course_id=COURSE_ID, difficulty=2, unit_number=2, unit_name="Data Structures"),
    ConceptNode(id="c-tuples", name="Tuples", description="Immutable sequences, packing/unpacking, tuple methods", course_id=COURSE_ID, difficulty=2, unit_number=2, unit_name="Data Structures"),
    ConceptNode(id="c-dicts", name="Dictionaries", description="Key-value pairs, dict methods, iteration, comprehensions", course_id=COURSE_ID, difficulty=3, unit_number=2, unit_name="Data Structures"),
    ConceptNode(id="c-sets", name="Sets", description="Unique collections, set operations, frozenset", course_id=COURSE_ID, difficulty=3, unit_number=2, unit_name="Data Structures"),

    # --- Unit 3: Functions ---
    ConceptNode(id="c-functions", name="Functions", description="def, parameters, return values, docstrings", course_id=COURSE_ID, difficulty=3, unit_number=3, unit_name="Functions & Modules"),
    ConceptNode(id="c-scope", name="Scope & Closures", description="Local/global scope, LEGB rule, closures", course_id=COURSE_ID, difficulty=4, unit_number=3, unit_name="Functions & Modules"),
    ConceptNode(id="c-lambda", name="Lambda & Higher-Order Functions", description="Lambda expressions, map, filter, reduce", course_id=COURSE_ID, difficulty=4, unit_number=3, unit_name="Functions & Modules"),
    ConceptNode(id="c-decorators", name="Decorators", description="Function decorators, @syntax, wraps", course_id=COURSE_ID, difficulty=5, unit_number=3, unit_name="Functions & Modules"),

    # --- Unit 4: OOP ---
    ConceptNode(id="c-classes", name="Classes & Objects", description="Class definition, __init__, self, attributes, methods", course_id=COURSE_ID, difficulty=3, unit_number=4, unit_name="Object-Oriented Programming"),
    ConceptNode(id="c-inheritance", name="Inheritance", description="Single/multiple inheritance, super(), method resolution order", course_id=COURSE_ID, difficulty=4, unit_number=4, unit_name="Object-Oriented Programming"),
    ConceptNode(id="c-polymorphism", name="Polymorphism", description="Duck typing, method overriding, abstract classes", course_id=COURSE_ID, difficulty=5, unit_number=4, unit_name="Object-Oriented Programming"),
]

RELATIONSHIPS = [
    # Unit 1 flow
    Relationship(source_id="c-variables", target_id="c-operators", type="prerequisite", weight=1.0),
    Relationship(source_id="c-operators", target_id="c-conditionals", type="prerequisite", weight=1.0),
    Relationship(source_id="c-conditionals", target_id="c-loops", type="prerequisite", weight=1.0),
    Relationship(source_id="c-variables", target_id="c-strings", type="prerequisite", weight=1.0),

    # Unit 1 → Unit 2
    Relationship(source_id="c-loops", target_id="c-lists", type="prerequisite", weight=1.0),
    Relationship(source_id="c-strings", target_id="c-lists", type="prerequisite", weight=0.5),

    # Unit 2 flow
    Relationship(source_id="c-lists", target_id="c-tuples", type="prerequisite", weight=0.8),
    Relationship(source_id="c-lists", target_id="c-dicts", type="prerequisite", weight=1.0),
    Relationship(source_id="c-dicts", target_id="c-sets", type="prerequisite", weight=0.7),

    # Unit 2 → Unit 3
    Relationship(source_id="c-loops", target_id="c-functions", type="prerequisite", weight=1.0),
    Relationship(source_id="c-lists", target_id="c-functions", type="prerequisite", weight=0.5),

    # Unit 3 flow
    Relationship(source_id="c-functions", target_id="c-scope", type="prerequisite", weight=1.0),
    Relationship(source_id="c-scope", target_id="c-lambda", type="prerequisite", weight=0.8),
    Relationship(source_id="c-lambda", target_id="c-decorators", type="prerequisite", weight=1.0),

    # Unit 3 → Unit 4
    Relationship(source_id="c-functions", target_id="c-classes", type="prerequisite", weight=1.0),

    # Unit 4 flow
    Relationship(source_id="c-classes", target_id="c-inheritance", type="prerequisite", weight=1.0),
    Relationship(source_id="c-inheritance", target_id="c-polymorphism", type="prerequisite", weight=1.0),

    # Related (non-prerequisite)
    Relationship(source_id="c-strings", target_id="c-lists", type="related", weight=0.5),
    Relationship(source_id="c-tuples", target_id="c-dicts", type="related", weight=0.4),
    Relationship(source_id="c-scope", target_id="c-classes", type="related", weight=0.6),
]


async def main() -> None:
    client = KGClient(uri="bolt://localhost:7687", user="neo4j", password="password")
    try:
        print(f"Seeding KG for course {COURSE_ID} ...")
        for concept in CONCEPTS:
            await client.create_concept(concept)
            print(f"  ✓ {concept.name} (unit {concept.unit_number}, difficulty {concept.difficulty})")

        for rel in RELATIONSHIPS:
            await client.create_relationship(rel)
            print(f"  → {rel.source_id} --[{rel.type}]--> {rel.target_id}")

        # Verify
        graph = await client.get_course_graph(COURSE_ID)
        print(f"\nDone! Graph has {len(graph['nodes'])} concepts and {len(graph['edges'])} edges.")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
