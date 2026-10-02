"""IngestionAgent graph nodes — parse, chunk, embed, build_graph."""

import logging
from pathlib import Path

from agents.ingestion.state import IngestionState

logger = logging.getLogger(__name__)


async def parse(state: IngestionState) -> dict:
    """Parse the uploaded file into structured page data."""
    from app.services.ingestion.parser import parse_file

    errors = list(state.get("errors", []))
    try:
        file_path = Path(state["file_path"])
        pages = await parse_file(file_path)
        logger.info("Parsed %d pages from %s", len(pages), file_path.name)
        return {
            "current_step": "parsing",
            "progress_pct": 25,
            "parsed_pages": pages,
            "errors": errors,
        }
    except Exception as e:
        errors.append(f"Parse error: {e}")
        logger.error("Parse failed: %s", e, exc_info=True)
        return {
            "current_step": "parsing",
            "progress_pct": 25,
            "parsed_pages": [],
            "errors": errors,
        }


async def chunk(state: IngestionState) -> dict:
    """Split parsed content into semantic chunks."""
    from app.services.ingestion.chunker import semantic_chunk
    from llm.router import LLMRouter

    errors = list(state.get("errors", []))
    try:
        llm_router = None
        ollama_url = state.get("ollama_base_url")
        if ollama_url:
            llm_router = LLMRouter(ollama_url=ollama_url)

        chunks = await semantic_chunk(
            pages=state["parsed_pages"],
            course_id=state["course_id"],
            source_doc=state.get("source_doc", "unknown"),
            material_id=state.get("material_id", ""),
            llm_router=llm_router,
        )
        logger.info("Created %d chunks for course %s", len(chunks), state["course_id"])
        return {
            "current_step": "chunking",
            "progress_pct": 50,
            "chunks": chunks,
            "errors": errors,
        }
    except Exception as e:
        errors.append(f"Chunk error: {e}")
        logger.error("Chunking failed: %s", e, exc_info=True)
        return {
            "current_step": "chunking",
            "progress_pct": 50,
            "chunks": [],
            "errors": errors,
        }


async def embed(state: IngestionState) -> dict:
    """Embed chunks and store in Weaviate."""
    from app.services.ingestion.embedder import embed_and_store

    errors = list(state.get("errors", []))
    try:
        collection_name = state.get("vector_collection", f"course_{state['course_id'].replace('-', '_')}")
        stored = await embed_and_store(
            chunks=state["chunks"],
            collection_name=collection_name,
            weaviate_url=state.get("weaviate_url", "http://localhost:8080"),
        )
        logger.info("Stored %d embeddings in Weaviate", stored)
        return {
            "current_step": "embedding",
            "progress_pct": 75,
            "embeddings_stored": stored,
            "errors": errors,
        }
    except Exception as e:
        errors.append(f"Embed error: {e}")
        logger.error("Embedding failed: %s", e, exc_info=True)
        return {
            "current_step": "embedding",
            "progress_pct": 75,
            "embeddings_stored": 0,
            "errors": errors,
        }


async def build_graph(state: IngestionState) -> dict:
    """Extract concepts and build Knowledge Graph in Neo4j."""
    from kg.builder import extract_concepts, map_relationships
    from kg.client import KGClient
    from kg.models import ConceptNode, Relationship
    from llm.router import LLMRouter

    errors = list(state.get("errors", []))
    try:
        llm_router = None
        ollama_url = state.get("ollama_base_url")
        if ollama_url:
            llm_router = LLMRouter(ollama_url=ollama_url)

        concepts = await extract_concepts(
            chunks=state["chunks"],
            course_id=state["course_id"],
            llm_router=llm_router,
        )

        # Apply unit info from upload if provided (overrides LLM-detected units)
        unit_number = state.get("unit_number")
        unit_name = state.get("unit_name")
        if unit_number is not None:
            for concept in concepts:
                concept["unit_number"] = unit_number
                concept["unit_name"] = unit_name or concept.get("unit_name")

        relationships = await map_relationships(concepts, llm_router=llm_router)

        # Store in Neo4j
        kg_client = KGClient(
            uri=state.get("neo4j_uri", "bolt://localhost:7687"),
            user=state.get("neo4j_user", "neo4j"),
            password=state.get("neo4j_password", "password"),
        )
        try:
            # Query max existing position so new concepts append AFTER existing ones
            max_pos = await kg_client.get_max_position(
                state["course_id"], unit_number=unit_number,
            )

            for i, concept in enumerate(concepts):
                concept["position"] = max_pos + i + 1
                await kg_client.create_concept(
                    ConceptNode(
                        id=concept["id"],
                        name=concept["name"],
                        description=concept.get("description", ""),
                        course_id=state["course_id"],
                        difficulty=concept.get("difficulty", 1),
                        unit_number=concept.get("unit_number"),
                        unit_name=concept.get("unit_name"),
                        position=concept["position"],
                        material_id=state.get("material_id", ""),
                    )
                )
            for rel in relationships:
                await kg_client.create_relationship(
                    Relationship(
                        source_id=rel["source_id"],
                        target_id=rel["target_id"],
                        type=rel.get("type", "related"),
                    )
                )
        finally:
            await kg_client.close()

        logger.info(
            "Built KG: %d concepts, %d relationships for course %s",
            len(concepts), len(relationships), state["course_id"],
        )
        return {
            "current_step": "completed",
            "progress_pct": 100,
            "concept_nodes": concepts,
            "relationships": relationships,
            "errors": errors,
        }
    except Exception as e:
        errors.append(f"Graph build error: {e}")
        logger.error("Graph building failed: %s", e, exc_info=True)
        return {
            "current_step": "graph_building",
            "progress_pct": 100,
            "concept_nodes": [],
            "relationships": [],
            "errors": errors,
        }
