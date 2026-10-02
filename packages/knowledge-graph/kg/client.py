"""Neo4j async driver wrapper for Knowledge Graph operations."""

import logging

from neo4j import AsyncGraphDatabase

from kg.models import ConceptNode, Relationship

logger = logging.getLogger(__name__)


class KGClient:
    """Async client for Neo4j Knowledge Graph operations."""

    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self._driver = AsyncGraphDatabase.driver(uri, auth=(user, password))

    async def close(self) -> None:
        await self._driver.close()

    async def create_concept(self, node: ConceptNode) -> str:
        """Create a concept node in the Knowledge Graph."""
        query = """
        MERGE (c:Concept {id: $id})
        SET c.name = $name,
            c.description = $description,
            c.course_id = $course_id,
            c.difficulty = $difficulty,
            c.unit_number = $unit_number,
            c.unit_name = $unit_name,
            c.position = $position,
            c.material_id = $material_id
        RETURN c.id AS id
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=node.id,
                name=node.name,
                description=node.description,
                course_id=node.course_id,
                difficulty=node.difficulty,
                unit_number=node.unit_number,
                unit_name=node.unit_name,
                position=node.position,
                material_id=node.material_id,
            )
            record = await result.single()
            logger.info("Created concept node: %s", node.name)
            return record["id"] if record else node.id

    async def create_relationship(self, rel: Relationship) -> None:
        """Create a relationship between two concept nodes."""
        query = """
        MATCH (a:Concept {id: $source_id})
        MATCH (b:Concept {id: $target_id})
        MERGE (a)-[r:RELATES_TO {type: $rel_type}]->(b)
        SET r.weight = $weight
        """
        async with self._driver.session() as session:
            await session.run(
                query,
                source_id=rel.source_id,
                target_id=rel.target_id,
                rel_type=rel.type,
                weight=rel.weight,
            )
            logger.info("Created relationship: %s -[%s]-> %s", rel.source_id, rel.type, rel.target_id)

    async def get_course_graph(self, course_id: str) -> dict:
        """Get the full Knowledge Graph for a course."""
        query = """
        MATCH (c:Concept {course_id: $course_id})
        OPTIONAL MATCH (c)-[r:RELATES_TO]->(t:Concept)
        RETURN c, r, t
        """
        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        async with self._driver.session() as session:
            result = await session.run(query, course_id=course_id)
            async for record in result:
                c = record["c"]
                nodes[c["id"]] = {
                    "id": c["id"],
                    "name": c["name"],
                    "description": c.get("description", ""),
                    "difficulty": c.get("difficulty", 1),
                    "unit_number": c.get("unit_number"),
                    "unit_name": c.get("unit_name"),
                    "position": c.get("position", 0),
                }
                if record["r"] is not None and record["t"] is not None:
                    t = record["t"]
                    nodes[t["id"]] = {
                        "id": t["id"],
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "difficulty": t.get("difficulty", 1),
                        "unit_number": t.get("unit_number"),
                        "unit_name": t.get("unit_name"),
                        "position": t.get("position", 0),
                    }
                    edges.append({
                        "source": c["id"],
                        "target": t["id"],
                        "type": record["r"].get("type", "related"),
                        "weight": record["r"].get("weight", 1.0),
                    })

        return {"nodes": list(nodes.values()), "edges": edges}

    async def get_unit_graph(self, course_id: str, unit_number: int) -> dict:
        """Get the Knowledge Graph for a specific unit of a course."""
        query = """
        MATCH (c:Concept {course_id: $course_id, unit_number: $unit_number})
        OPTIONAL MATCH (c)-[r:RELATES_TO]->(t:Concept)
        RETURN c, r, t
        """
        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        async with self._driver.session() as session:
            result = await session.run(query, course_id=course_id, unit_number=unit_number)
            async for record in result:
                c = record["c"]
                nodes[c["id"]] = {
                    "id": c["id"],
                    "name": c["name"],
                    "description": c.get("description", ""),
                    "difficulty": c.get("difficulty", 1),
                    "unit_number": c.get("unit_number"),
                    "unit_name": c.get("unit_name"),
                    "position": c.get("position", 0),
                }
                if record["r"] is not None and record["t"] is not None:
                    t = record["t"]
                    nodes[t["id"]] = {
                        "id": t["id"],
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "difficulty": t.get("difficulty", 1),
                        "unit_number": t.get("unit_number"),
                        "unit_name": t.get("unit_name"),
                        "position": t.get("position", 0),
                    }
                    edges.append({
                        "source": c["id"],
                        "target": t["id"],
                        "type": record["r"].get("type", "related"),
                        "weight": record["r"].get("weight", 1.0),
                    })

        return {"nodes": list(nodes.values()), "edges": edges}

    async def get_course_units(self, course_id: str) -> list[dict]:
        """Get distinct units for a course from the KG."""
        query = """
        MATCH (c:Concept {course_id: $course_id})
        WHERE c.unit_number IS NOT NULL
        RETURN DISTINCT c.unit_number AS unit_number, c.unit_name AS unit_name
        ORDER BY c.unit_number
        """
        units: list[dict] = []
        async with self._driver.session() as session:
            result = await session.run(query, course_id=course_id)
            async for record in result:
                units.append({
                    "unit_number": record["unit_number"],
                    "unit_name": record["unit_name"],
                })
        return units

    async def get_max_position(self, course_id: str, unit_number: int | None = None) -> int:
        """Get the maximum position value among existing concepts.

        If unit_number is given, scopes to that unit. Returns 0 if no concepts exist.
        """
        if unit_number is not None:
            query = """
            MATCH (c:Concept {course_id: $course_id, unit_number: $unit_number})
            RETURN coalesce(max(c.position), 0) AS max_pos
            """
            params = {"course_id": course_id, "unit_number": unit_number}
        else:
            query = """
            MATCH (c:Concept {course_id: $course_id})
            RETURN coalesce(max(c.position), 0) AS max_pos
            """
            params = {"course_id": course_id}

        async with self._driver.session() as session:
            result = await session.run(query, **params)
            record = await result.single()
            return record["max_pos"] if record else 0

    async def get_prerequisites(self, concept_id: str) -> list[ConceptNode]:
        """Get prerequisite concepts for a given concept."""
        query = """
        MATCH (pre:Concept)-[r:RELATES_TO {type: 'prerequisite'}]->(c:Concept {id: $concept_id})
        RETURN pre
        """
        results: list[ConceptNode] = []
        async with self._driver.session() as session:
            result = await session.run(query, concept_id=concept_id)
            async for record in result:
                n = record["pre"]
                results.append(
                    ConceptNode(
                        id=n["id"],
                        name=n["name"],
                        description=n.get("description", ""),
                        course_id=n.get("course_id", ""),
                        difficulty=n.get("difficulty", 1),
                    )
                )
        return results

    async def update_node(self, node_id: str, properties: dict) -> None:
        """Update properties of a concept node."""
        set_clauses = ", ".join(f"c.{key} = ${key}" for key in properties)
        query = f"MATCH (c:Concept {{id: $node_id}}) SET {set_clauses}"
        params = {"node_id": node_id, **properties}
        async with self._driver.session() as session:
            await session.run(query, **params)

    async def delete_node(self, node_id: str) -> None:
        """Delete a concept node and its relationships."""
        query = "MATCH (c:Concept {id: $node_id}) DETACH DELETE c"
        async with self._driver.session() as session:
            await session.run(query, node_id=node_id)

    async def delete_course_graph(self, course_id: str) -> int:
        """Delete all concept nodes and relationships for a course. Returns count of deleted nodes."""
        query = """
        MATCH (c:Concept {course_id: $course_id})
        WITH c, count(c) AS cnt
        DETACH DELETE c
        RETURN cnt
        """
        async with self._driver.session() as session:
            result = await session.run(
                "MATCH (c:Concept {course_id: $course_id}) WITH collect(c) AS nodes, count(c) AS cnt "
                "FOREACH (n IN nodes | DETACH DELETE n) RETURN cnt",
                course_id=course_id,
            )
            record = await result.single()
            deleted = record["cnt"] if record else 0
            logger.info("Deleted %d concept nodes for course %s", deleted, course_id)
            return deleted

    async def delete_by_material(self, material_id: str) -> int:
        """Delete all concept nodes that came from a specific material upload.

        Returns the count of deleted nodes.
        """
        async with self._driver.session() as session:
            result = await session.run(
                "MATCH (c:Concept {material_id: $material_id}) WITH collect(c) AS nodes, count(c) AS cnt "
                "FOREACH (n IN nodes | DETACH DELETE n) RETURN cnt",
                material_id=material_id,
            )
            record = await result.single()
            deleted = record["cnt"] if record else 0
            logger.info("Deleted %d concept nodes for material %s", deleted, material_id)
            return deleted

    async def merge_nodes(self, source_id: str, target_id: str) -> str:
        """Merge two concept nodes — move all relationships from source to target, then delete source."""
        queries = [
            # Move incoming relationships
            """
            MATCH (s:Concept {id: $source_id})<-[r:RELATES_TO]-(other)
            MATCH (t:Concept {id: $target_id})
            MERGE (other)-[nr:RELATES_TO]->(t)
            SET nr = r
            DELETE r
            """,
            # Move outgoing relationships
            """
            MATCH (s:Concept {id: $source_id})-[r:RELATES_TO]->(other)
            MATCH (t:Concept {id: $target_id})
            MERGE (t)-[nr:RELATES_TO]->(other)
            SET nr = r
            DELETE r
            """,
            # Delete source
            "MATCH (s:Concept {id: $source_id}) DETACH DELETE s",
        ]
        async with self._driver.session() as session:
            for query in queries:
                await session.run(query, source_id=source_id, target_id=target_id)
        return target_id
