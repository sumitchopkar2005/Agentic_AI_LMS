"""Cypher query templates for Neo4j operations."""

CREATE_CONCEPT = """
CREATE (c:Concept {
    id: $id,
    name: $name,
    description: $description,
    course_id: $course_id,
    difficulty: $difficulty
})
RETURN c
"""

CREATE_RELATIONSHIP = """
MATCH (a:Concept {id: $source_id})
MATCH (b:Concept {id: $target_id})
MERGE (a)-[r:$rel_type {weight: $weight}]->(b)
RETURN r
"""

GET_COURSE_GRAPH = """
MATCH (c:Concept {course_id: $course_id})
OPTIONAL MATCH (c)-[r]->(other:Concept {course_id: $course_id})
RETURN c, collect(r) as relationships, collect(other) as targets
"""

GET_PREREQUISITES = """
MATCH (c:Concept {id: $concept_id})<-[:PREREQUISITE*1..3]-(prereq:Concept)
RETURN prereq
ORDER BY prereq.difficulty
"""

DELETE_CONCEPT = """
MATCH (c:Concept {id: $concept_id})
DETACH DELETE c
"""

MERGE_CONCEPTS = """
MATCH (source:Concept {id: $source_id})
MATCH (target:Concept {id: $target_id})
WITH source, target
MATCH (source)-[r]-()
WITH source, target, collect(r) as rels
FOREACH (rel in rels |
    CREATE (target)-[newRel:MERGED_FROM]->(target)
)
DETACH DELETE source
RETURN target
"""
