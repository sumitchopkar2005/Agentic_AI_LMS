---
name: agentic-lms
description: "Full-stack skill for the Agentic LMS project — a gamified, AI-driven academic platform. Covers backend (FastAPI, LangGraph, vLLM), frontend (Next.js, React, Tailwind), multi-agent orchestration, self-hosted LLM inference on 4× Tesla T4 GPUs, gamification engine, RAG pipeline, Knowledge Graph (Neo4j), code sandbox (Firecracker), and multi-agent handoff protocol. Use this skill for ANY task involving this codebase: feature implementation, bug fixes, architecture decisions, database changes, agent node creation, API endpoints, UI components, or infrastructure work."
version: "1.0"
license: Proprietary
stack:
  backend: Python 3.12+ / FastAPI / SQLAlchemy 2.0 / Alembic
  frontend: TypeScript 5.x / Next.js 14 / React 18 / Tailwind CSS / shadcn-ui
  orchestration: LangGraph / LangChain
  llm: vLLM (self-hosted) / Qwen 2.5 72B-AWQ / Qwen 2.5 7B / Qwen 2.5-VL 7B
  embeddings: BGE-M3 (CPU) / sentence-transformers
  databases: PostgreSQL 16 / Weaviate / Neo4j CE / Valkey 8
  storage: MinIO (S3-compatible)
  auth: Keycloak (SAML 2.0 + OIDC)
  sandbox: Firecracker microVMs
  infra: Kubernetes / OpenTofu / GitHub Actions / ArgoCD
  monitoring: Prometheus / Grafana / Sentry
hardware:
  gpus: 4x NVIDIA Tesla T4 (16 GB VRAM each)
  ram: 500 GB
  storage: 10 TB
---

# SKILL.md — Agentic LMS Project

> **This file is the single source of truth for any AI agent working on this codebase.**
> Read this ENTIRELY before writing any code, running any command, or making any decision.
> If you are picking up work from another agent, start at [Agent Handoff Protocol](#agent-handoff-protocol).

---

## Table of Contents

- [Project Identity](#project-identity)
- [Agent Handoff Protocol](#agent-handoff-protocol)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Tech Stack & Versions](#tech-stack--versions)
- [Environment Setup](#environment-setup)
- [Backend Conventions (Python / FastAPI)](#backend-conventions-python--fastapi)
- [Frontend Conventions (Next.js / React)](#frontend-conventions-nextjs--react)
- [Multi-Agent System Conventions (LangGraph)](#multi-agent-system-conventions-langgraph)
- [Database Conventions](#database-conventions)
- [API Conventions](#api-conventions)
- [Authentication & Authorization](#authentication--authorization)
- [Gamification Engine](#gamification-engine)
- [RAG Pipeline & Knowledge Graph](#rag-pipeline--knowledge-graph)
- [Code Sandbox (Firecracker)](#code-sandbox-firecracker)
- [Testing Conventions](#testing-conventions)
- [Git Workflow](#git-workflow)
- [Deployment & Infrastructure](#deployment--infrastructure)
- [Error Handling & Logging](#error-handling--logging)
- [Common Tasks Reference](#common-tasks-reference)
- [Known Pitfalls & Gotchas](#known-pitfalls--gotchas)

---

## Project Identity

| Key | Value |
|-----|-------|
| **Project** | Agentic LMS — Gamified, AI-Driven Academic Platform |
| **Monorepo** | Yes — Turborepo |
| **Primary Language (Backend)** | Python 3.12+ |
| **Primary Language (Frontend)** | TypeScript 5.x (strict mode) |
| **LLM Orchestration** | LangGraph + LangChain |
| **LLM Inference** | vLLM (self-hosted on 4× Tesla T4 GPUs) |
| **Primary DB** | PostgreSQL 16 |
| **Vector DB** | Weaviate |
| **Graph DB** | Neo4j Community Edition |
| **Cache / Pub-Sub** | Valkey 8 (open-source Redis fork) |
| **Object Storage** | MinIO |
| **Auth** | Keycloak (SAML 2.0 + OIDC) |
| **Container Orchestration** | Kubernetes |
| **Code Sandbox** | Firecracker microVMs |
| **IaC** | OpenTofu |
| **CI/CD** | GitHub Actions + ArgoCD |

### Hardware Profile (Production Server)

| Resource | Spec |
|----------|------|
| **GPUs** | 4× NVIDIA Tesla T4 (16 GB VRAM each = 64 GB total) |
| **RAM** | 500 GB |
| **Storage** | 10 TB |
| **GPU Capability** | FP16 / INT8 / INT4 inference via vLLM with tensor parallelism |

> **VRAM budget:** 64 GB total allows running a 70B-parameter model in INT4 quantization across all 4 GPUs (tensor parallel), OR multiple smaller models concurrently (e.g., 2 GPUs for a 32B model + 2 GPUs for an 8B model). See [LLM Router Configuration](#llm-router-configuration) for the exact allocation strategy.

---

## Agent Handoff Protocol

> **CRITICAL: Every agent MUST follow this protocol. It is the backbone of multi-agent collaboration.**

### When You START Work (Picking Up From Another Agent)

1. **Read this entire SKILL.md first.** No exceptions.
2. **Check the handoff log:**
   ```bash
   cat HANDOFF.md
   ```
   This file contains the last agent's summary of: what was done, what's in progress, what's blocked, and what to do next.
3. **Check current branch and git status:**
   ```bash
   git branch --show-current
   git status
   git log --oneline -10
   ```
4. **Run the health check:**
   ```bash
   make check
   ```
   This runs linting, type checking, and tests. Fix anything broken before writing new code.
5. **Check for pending TODOs from the previous agent:**
   ```bash
   grep -rn "TODO(agent)" --include="*.py" --include="*.ts" --include="*.tsx" .
   ```
   Previous agents mark unfinished work with `TODO(agent): description`.

### When You END Work (Handing Off To Next Agent)

1. **Ensure all code compiles and passes lint:**
   ```bash
   make check
   ```
2. **Commit your work with a conventional commit message** (see [Git Workflow](#git-workflow)).
3. **Update `HANDOFF.md`** with this exact structure:
   ```markdown
   # Handoff — [DATE] [TIME UTC]

   ## Agent Identity
   - Task: [What you were asked to do]
   - Branch: [Current branch name]

   ## Completed
   - [Bullet list of what you finished]

   ## In Progress (Partially Done)
   - [File/feature]: [What's done, what remains]
   - Look for `TODO(agent)` markers in these files: [list files]

   ## Blocked / Needs Decision
   - [Anything you couldn't resolve — missing env vars, unclear requirements, etc.]

   ## Suggested Next Steps
   1. [Prioritized list of what the next agent should do]

   ## Files Modified
   - [List every file you created or modified]

   ## Database Changes
   - [Any migrations created? Any seed data added?]

   ## Environment Changes
   - [Any new env vars, packages, or dependencies added?]
   ```
4. **Never leave the codebase in a broken state.** If your code doesn't compile, revert to the last working commit and note what went wrong in HANDOFF.md.

### TODO Marker Convention

When you cannot finish something, leave a marker:
```python
# TODO(agent): Implement dynamic hint pricing algorithm.
#   Context: FR-404 requires pricing based on attempt count and gold balance.
#   The HintTransaction model is ready, pricing logic goes in services/gamification/hint_pricing.py
#   See PRD section 3.4 for the full spec.
```

```typescript
// TODO(agent): Wire up the MasteryMap component to the /api/v1/students/me/profile endpoint.
//   The component shell exists in components/student/MasteryMap.tsx
//   API client function is stubbed in lib/api/student.ts
```

Always include: what needs to be done, where to find context, and which files are involved.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                             │
│  apps/web (Next.js 14 + React 18 + Tailwind + shadcn/ui)       │
│  ├── Faculty Dashboard (upload, review, analytics)              │
│  ├── Student Mission Map (gamified course view)                 │
│  ├── Code Lab (Monaco Editor + terminal)                        │
│  └── Tutor Chat (WebSocket, streaming responses)                │
├─────────────────────────────────────────────────────────────────┤
│                    API GATEWAY TIER                              │
│  apps/api (FastAPI + WebSocket + JWT)                           │
│  ├── /api/v1/courses/*        (CRUD, upload, config)            │
│  ├── /api/v1/assignments/*    (generate, publish, submit)       │
│  ├── /api/v1/tutor/*          (chat, hints)                     │
│  ├── /api/v1/students/*       (profile, leaderboard, gamify)    │
│  └── /api/v1/code/*           (sandbox execute)                 │
├─────────────────────────────────────────────────────────────────┤
│               AGENT ORCHESTRATION TIER                          │
│  packages/agents (LangGraph + LangChain)                        │
│  ├── IngestionAgent     → parses uploads, builds KG + vectors   │
│  ├── DesignerAgent      → generates assignments + rubrics       │
│  ├── TutorAgent         → Socratic Q&A via RAG                  │
│  ├── GraderAgent        → rubric-based assessment + feedback    │
│  ├── GameAgent          → XP/Gold/streak/badge rule engine      │
│  └── AnalyticsAgent     → heatmaps, at-risk detection           │
├─────────────────────────────────────────────────────────────────┤
│                    AI / ML TIER (Self-Hosted)                    │
│  vLLM on 4× Tesla T4 (tensor parallel / multi-model serving)   │
│  ├── Qwen 2.5 72B-INT4   (creative + grading, 4 GPUs)          │
│  ├── Qwen 2.5 7B          (tutoring, low-latency, 1 GPU)       │
│  ├── Qwen 2.5-VL 7B       (multimodal ingestion, 1 GPU)        │
│  └── BGE-M3               (embeddings, CPU-only)                │
│  Weaviate (Vector DB) │ Neo4j CE (Knowledge Graph)              │
├─────────────────────────────────────────────────────────────────┤
│               DATA & INFRASTRUCTURE TIER                        │
│  PostgreSQL 16 │ Valkey 8 │ MinIO │ Firecracker (Sandbox)       │
│  Kubernetes │ Keycloak (Auth) │ Prometheus + Grafana             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Faculty Upload → Student Assignment

```
Faculty uploads PDF
  → API receives file, stores in MinIO
  → Emits `ingestion.started` event
  → IngestionAgent:
      1. Parse (OCR, text extraction)
      2. Semantic chunk by concept
      3. Embed chunks → Weaviate
      4. Build concept nodes → Neo4j Knowledge Graph
      5. Emit `ingestion.completed` event
  → Faculty reviews Knowledge Graph (optional edits)
  → Faculty clicks "Generate Assignments"
  → DesignerAgent:
      1. Read Knowledge Graph + learning objectives
      2. Generate assignments (MCQ, scenario, code lab, etc.)
      3. Generate rubrics per assignment
      4. Tag assignments with concept nodes
      5. Set status = FACULTY_REVIEW
  → Faculty reviews, edits, approves
  → Assignment status = PUBLISHED
  → Student sees new mission on Mission Map
```

### Data Flow: Student Submission → Feedback

```
Student submits assignment
  → API validates, stores submission
  → If CODE_LAB:
      → Spin up Firecracker microVM
      → Execute student code against hidden tests
      → Collect stdout/stderr + test results
  → GraderAgent:
      1. Load rubric + source material
      2. Evaluate submission per rubric criterion
      3. Cite evidence from student's work
      4. Generate prescriptive feedback
      5. If score < threshold → generate remediation mini-quiz
  → GameAgent:
      1. Calculate XP earned (base - hint deductions)
      2. Calculate Gold earned
      3. Check streak status
      4. Check badge eligibility
      5. Update student profile
  → Return instant feedback to student UI
```

---

## Directory Structure

```
agentic-lms/
├── HANDOFF.md                          # Agent handoff log (ALWAYS check this first)
├── SKILL.md                            # This file
├── Makefile                            # Top-level commands (make check, make dev, make test)
├── turbo.json                          # Turborepo config
├── docker-compose.yml                  # Local dev: Postgres, Valkey, Weaviate, Neo4j, Keycloak, MinIO
├── docker-compose.sandbox.yml          # Firecracker sandbox (separate for security)
├── docker-compose.vllm.yml            # vLLM inference servers (requires NVIDIA GPU + CUDA)
├── .env.example                        # Template for environment variables
├── .env.local                          # Local overrides (NEVER commit)
│
├── apps/
│   ├── api/                            # FastAPI backend
│   │   ├── pyproject.toml
│   │   ├── alembic/                    # DB migrations
│   │   │   ├── versions/               # Migration files (NEVER manually edit after applying)
│   │   │   └── env.py
│   │   ├── app/
│   │   │   ├── main.py                 # FastAPI app factory
│   │   │   ├── config.py               # Settings (pydantic-settings, reads from env)
│   │   │   ├── dependencies.py         # FastAPI dependency injection
│   │   │   ├── middleware/             
│   │   │   │   ├── auth.py             # JWT validation, role extraction
│   │   │   │   ├── rate_limit.py       # Valkey-backed rate limiting
│   │   │   │   └── cors.py
│   │   │   ├── routes/                 # Route handlers (thin — delegate to services)
│   │   │   │   ├── courses.py
│   │   │   │   ├── assignments.py
│   │   │   │   ├── submissions.py
│   │   │   │   ├── tutor.py            # WebSocket endpoint for chat
│   │   │   │   ├── gamification.py
│   │   │   │   ├── code_execution.py
│   │   │   │   └── analytics.py
│   │   │   ├── services/               # Business logic (THICK — all logic lives here)
│   │   │   │   ├── ingestion/
│   │   │   │   │   ├── parser.py       # PDF, PPTX, DOCX, audio/video parsing
│   │   │   │   │   ├── chunker.py      # Semantic chunking
│   │   │   │   │   └── embedder.py     # Vector embedding + Weaviate upsert
│   │   │   │   ├── assignments/
│   │   │   │   │   ├── generator.py    # Calls DesignerAgent
│   │   │   │   │   └── publisher.py    # Status transitions, validation
│   │   │   │   ├── grading/
│   │   │   │   │   ├── grader.py       # Calls GraderAgent
│   │   │   │   │   ├── appeal.py       # Appeal workflow
│   │   │   │   │   └── feedback.py     # Prescriptive feedback generation
│   │   │   │   ├── gamification/
│   │   │   │   │   ├── xp_engine.py    # XP calculation rules
│   │   │   │   │   ├── gold_engine.py  # Gold earn/spend logic
│   │   │   │   │   ├── hint_pricing.py # Static + dynamic hint pricing
│   │   │   │   │   ├── streaks.py      # Streak tracking + freeze logic
│   │   │   │   │   ├── badges.py       # Badge eligibility checks
│   │   │   │   │   └── leaderboard.py  # Valkey sorted set leaderboard
│   │   │   │   ├── sandbox/
│   │   │   │   │   ├── executor.py     # Firecracker VM management
│   │   │   │   │   └── test_runner.py  # Execute hidden tests, collect results
│   │   │   │   └── analytics/
│   │   │   │       ├── heatmap.py
│   │   │   │       └── risk_detector.py
│   │   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   │   ├── base.py             # Declarative base + mixins (TimestampMixin, UUIDMixin)
│   │   │   │   ├── institution.py
│   │   │   │   ├── course.py
│   │   │   │   ├── user.py             # Faculty + Student (polymorphic)
│   │   │   │   ├── assignment.py
│   │   │   │   ├── submission.py
│   │   │   │   ├── hint_transaction.py
│   │   │   │   └── badge.py
│   │   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   │   ├── courses.py
│   │   │   │   ├── assignments.py
│   │   │   │   ├── submissions.py
│   │   │   │   ├── gamification.py
│   │   │   │   └── analytics.py
│   │   │   └── events/                 # Event bus (Valkey pub/sub or Kafka)
│   │   │       ├── publisher.py
│   │   │       ├── consumer.py
│   │   │       └── event_types.py      # Typed event definitions
│   │   └── tests/
│   │       ├── conftest.py             # Fixtures: test DB, test client, mock LLM
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
│   │
│   └── web/                            # Next.js frontend
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── src/
│       │   ├── app/                    # Next.js App Router
│       │   │   ├── layout.tsx          # Root layout (auth provider, theme)
│       │   │   ├── (auth)/             # Auth route group
│       │   │   ├── (faculty)/          # Faculty route group
│       │   │   │   ├── dashboard/
│       │   │   │   ├── courses/[id]/
│       │   │   │   │   ├── upload/
│       │   │   │   │   ├── assignments/
│       │   │   │   │   ├── analytics/
│       │   │   │   │   └── knowledge-graph/
│       │   │   │   └── review/
│       │   │   └── (student)/          # Student route group
│       │   │       ├── dashboard/      # Mission Map
│       │   │       ├── assignments/[id]/
│       │   │       ├── code-lab/[id]/
│       │   │       ├── tutor/
│       │   │       └── profile/
│       │   ├── components/
│       │   │   ├── ui/                 # shadcn/ui primitives (Button, Card, Dialog, etc.)
│       │   │   ├── faculty/            # Faculty-specific components
│       │   │   │   ├── UploadZone.tsx
│       │   │   │   ├── AssignmentReviewCard.tsx
│       │   │   │   ├── ConceptHeatmap.tsx
│       │   │   │   └── KnowledgeGraphViewer.tsx
│       │   │   ├── student/            # Student-specific components
│       │   │   │   ├── MissionMap.tsx
│       │   │   │   ├── XPBar.tsx
│       │   │   │   ├── GoldBalance.tsx
│       │   │   │   ├── StreakCounter.tsx
│       │   │   │   ├── HintButton.tsx
│       │   │   │   ├── Leaderboard.tsx
│       │   │   │   ├── BadgeGrid.tsx
│       │   │   │   └── MasteryMap.tsx
│       │   │   ├── assignment/         # Shared assignment components
│       │   │   │   ├── ScenarioPlayer.tsx
│       │   │   │   ├── MCQRenderer.tsx
│       │   │   │   ├── DebateInterface.tsx
│       │   │   │   └── FeedbackPanel.tsx
│       │   │   ├── code/               # Code lab components
│       │   │   │   ├── CodeEditor.tsx  # Monaco Editor wrapper
│       │   │   │   ├── Terminal.tsx
│       │   │   │   └── TestResults.tsx
│       │   │   └── tutor/
│       │   │       ├── TutorChat.tsx   # WebSocket chat interface
│       │   │       └── CitationCard.tsx
│       │   ├── lib/
│       │   │   ├── api/                # API client functions (fetch wrappers)
│       │   │   │   ├── client.ts       # Base client with auth headers
│       │   │   │   ├── courses.ts
│       │   │   │   ├── assignments.ts
│       │   │   │   ├── submissions.ts
│       │   │   │   ├── gamification.ts
│       │   │   │   └── tutor.ts
│       │   │   ├── hooks/              # Custom React hooks
│       │   │   │   ├── useProfile.ts
│       │   │   │   ├── useLeaderboard.ts
│       │   │   │   ├── useTutorChat.ts # WebSocket hook
│       │   │   │   └── useCodeExecution.ts
│       │   │   └── utils/
│       │   ├── stores/                 # Zustand state management
│       │   │   ├── auth.ts
│       │   │   ├── gamification.ts     # XP, Gold, streak (optimistic updates)
│       │   │   └── assignment.ts
│       │   └── types/                  # Shared TypeScript types
│       │       ├── api.ts              # API response types (mirror Pydantic schemas)
│       │       ├── assignment.ts
│       │       ├── gamification.ts
│       │       └── user.ts
│       └── tests/
│           ├── components/
│           └── e2e/                    # Playwright
│
├── packages/                           # Shared packages
│   ├── agents/                         # LangGraph agent definitions
│   │   ├── pyproject.toml
│   │   ├── agents/
│   │   │   ├── base.py                 # BaseAgent class with common patterns
│   │   │   ├── ingestion/
│   │   │   │   ├── agent.py            # IngestionAgent graph definition
│   │   │   │   ├── nodes.py            # parse, chunk, embed, build_graph
│   │   │   │   └── state.py            # IngestionState TypedDict
│   │   │   ├── designer/
│   │   │   │   ├── agent.py
│   │   │   │   ├── nodes.py            # generate_mcq, generate_scenario, generate_rubric
│   │   │   │   ├── prompts.py          # ALL prompt templates (never inline prompts)
│   │   │   │   └── state.py
│   │   │   ├── tutor/
│   │   │   │   ├── agent.py
│   │   │   │   ├── nodes.py            # retrieve_context, socratic_respond, offer_hint
│   │   │   │   ├── prompts.py
│   │   │   │   └── state.py
│   │   │   ├── grader/
│   │   │   │   ├── agent.py
│   │   │   │   ├── nodes.py            # evaluate_criteria, generate_feedback, check_consistency
│   │   │   │   ├── prompts.py
│   │   │   │   └── state.py
│   │   │   └── game/
│   │   │       ├── engine.py           # Pure rule engine (no LLM)
│   │   │       └── rules.py            # XP/Gold calculation rules, badge triggers
│   │   └── tests/
│   │
│   ├── llm/                            # Model-agnostic LLM abstraction
│   │   ├── pyproject.toml
│   │   ├── llm/
│   │   │   ├── provider.py             # Abstract LLMProvider interface
│   │   │   ├── vllm_provider.py        # vLLM OpenAI-compatible client (primary)
│   │   │   ├── openai_provider.py      # OpenAI fallback (optional, for cloud failover)
│   │   │   ├── router.py              # Routes requests to appropriate model by task type
│   │   │   └── cost_tracker.py         # Token usage tracking per course (for capacity planning)
│   │   └── tests/
│   │
│   ├── rag/                            # RAG pipeline
│   │   ├── pyproject.toml
│   │   ├── rag/
│   │   │   ├── retriever.py            # Weaviate hybrid search
│   │   │   ├── reranker.py             # Cross-encoder reranking
│   │   │   ├── context_builder.py      # Assemble context window with citations
│   │   │   └── grounding.py            # Hallucination detection (verify claims vs. context)
│   │   └── tests/
│   │
│   ├── knowledge-graph/                # Neo4j client
│   │   ├── pyproject.toml
│   │   ├── kg/
│   │   │   ├── client.py               # Neo4j async driver wrapper
│   │   │   ├── builder.py              # Concept extraction + relationship mapping
│   │   │   ├── queries.py              # Cypher query templates
│   │   │   └── models.py               # ConceptNode, Relationship dataclasses
│   │   └── tests/
│   │
│   └── shared/                         # Shared utilities
│       ├── pyproject.toml
│       ├── shared/
│       │   ├── event_types.py          # Event type constants + schemas
│       │   ├── exceptions.py           # Custom exception hierarchy
│       │   ├── pagination.py           # Cursor-based pagination utilities
│       │   └── validators.py           # Shared validation logic
│       └── tests/
│
├── infra/                              # Infrastructure-as-Code
│   ├── k8s/                            # Kubernetes manifests
│   ├── opentofu/                       # Cloud provisioning (open-source Terraform fork)
│   ├── vllm/                           # vLLM inference server configs
│   │   ├── serve_primary.sh            # Launch Qwen 72B on 4× T4 (tensor parallel)
│   │   ├── serve_fast.sh               # Launch Qwen 7B on 1× T4
│   │   ├── serve_vision.sh             # Launch Qwen VL 7B on 1× T4
│   │   ├── gpu_scheduler.py            # Dynamic GPU allocation (peak vs. off-peak)
│   │   └── model_health_check.py       # Endpoint health + latency monitoring
│   └── docker/
│       ├── Dockerfile.api
│       ├── Dockerfile.web
│       └── Dockerfile.agents
│
└── scripts/
    ├── seed_dev_data.py                # Seed local dev with sample course + students
    ├── run_migrations.sh
    └── reset_local.sh                  # Nuclear reset: drop DBs, re-migrate, re-seed
```

---

## Tech Stack & Versions

> **Pin these exact versions. Do not upgrade without updating this file and running the full test suite.**

### Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| python | 3.12+ | Runtime |
| fastapi | 0.115+ | API framework |
| uvicorn | 0.34+ | ASGI server |
| sqlalchemy | 2.0+ | ORM (async mode) |
| alembic | 1.14+ | DB migrations |
| pydantic | 2.10+ | Validation + schemas |
| pydantic-settings | 2.7+ | Environment config |
| langgraph | 0.3+ | Agent orchestration |
| langchain-core | 0.3+ | LLM abstractions |
| langchain-community | 0.3+ | Community integrations (vLLM, local models) |
| openai | 1.60+ | OpenAI-compatible client (used for vLLM's OpenAI-compat endpoint) |
| vllm | 0.6+ | Self-hosted LLM inference (production server) |
| sentence-transformers | 3.3+ | Embedding models (BGE-M3, GTE-large) |
| weaviate-client | 4.x | Vector DB client |
| neo4j | 5.x | Graph DB driver (async) |
| valkey | 6.x | Cache + pub/sub (Valkey client, drop-in redis replacement) |
| python-jose | 3.3+ | JWT handling |
| minio | 7.x | MinIO object storage client |
| pymupdf (fitz) | 1.24+ | PDF parsing |
| python-pptx | 1.0+ | PPTX parsing |
| python-docx | 1.1+ | DOCX parsing |
| faster-whisper | 1.1+ | Audio transcription (CTranslate2, runs on T4) |
| httpx | 0.28+ | Async HTTP client |
| pytest | 8.x | Testing |
| pytest-asyncio | 0.24+ | Async test support |
| ruff | 0.8+ | Linter + formatter |
| mypy | 1.13+ | Type checker |

### Self-Hosted Models (vLLM)

| Model | Quantization | GPU Allocation | Purpose | Approx VRAM |
|-------|-------------|----------------|---------|-------------|
| Qwen/Qwen2.5-72B-Instruct-AWQ | AWQ INT4 | 4× T4 (tensor parallel) | Creative generation (assignments, scenarios, rubrics) + Grading | ~40 GB |
| Qwen/Qwen2.5-7B-Instruct | FP16 | 1× T4 | Low-latency tutoring + hint generation | ~14 GB |
| Qwen/Qwen2.5-VL-7B-Instruct | FP16 | 1× T4 | Multimodal ingestion (read charts, diagrams, handwriting) | ~14 GB |
| BAAI/bge-m3 | FP32 | CPU only | Text embeddings for vector search | ~2 GB RAM |
| Systran/faster-whisper-large-v3 | FP16 | 1× T4 (shared) | Audio/video transcription | ~3 GB |

> **GPU Scheduling Strategy:** The 72B model uses all 4 GPUs during off-peak (batch assignment generation, bulk grading). During peak student hours, the server runs the 7B tutoring model on 1 GPU and the 72B on 3 GPUs with reduced throughput. See `infra/vllm/` for the scheduling scripts.

> **Why Qwen 2.5?** Best open-weight model family for instruction following, code generation, and multilingual support as of early 2026. Apache 2.0 license. The 72B-AWQ fits in 64 GB VRAM with tensor parallelism. Swap for Llama 4 or Mistral Large if benchmarks shift.

### Frontend (TypeScript)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.x | React meta-framework |
| react | 18.x | UI library |
| typescript | 5.x | Type safety (strict mode) |
| tailwindcss | 3.4+ | Utility CSS |
| shadcn/ui | latest | Component primitives |
| zustand | 5.x | State management |
| @monaco-editor/react | 4.x | Code editor |
| recharts | 2.x | Charts (analytics) |
| d3 | 7.x | Knowledge Graph visualization |
| playwright | 1.49+ | E2E testing |
| vitest | 2.x | Unit testing |
| eslint | 9.x | Linting |
| prettier | 3.x | Formatting |

---

## Environment Setup

### Local Development (First Time)

```bash
# 1. Clone and install
git clone <repo-url> && cd agentic-lms
cp .env.example .env.local   # Review and confirm settings

# 2. Start infrastructure
docker compose up -d          # Postgres, Valkey, Weaviate, Neo4j, Keycloak, MinIO

# 3. Start vLLM inference server (requires NVIDIA GPU + CUDA)
# Option A: Docker (recommended)
docker compose -f docker-compose.vllm.yml up -d

# Option B: Direct (for debugging)
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 --port 8000 \
  --tensor-parallel-size 1

# 4. Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head          # Run migrations
python scripts/seed_dev_data.py

# 5. Frontend
cd apps/web
npm install
npm run dev

# 5. Verify
make check                    # Lint + type check + tests
```

### Required Environment Variables

```bash
# .env.local (NEVER commit this file)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/agentic_lms
VALKEY_URL=valkey://localhost:6379/0
WEAVIATE_URL=http://localhost:8080
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# MinIO (S3-compatible object storage)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=agentic-lms-uploads

# vLLM Self-Hosted LLM Endpoints (OpenAI-compatible API)
VLLM_BASE_URL_PRIMARY=http://localhost:8000/v1       # Qwen 72B (creative + grading)
VLLM_BASE_URL_FAST=http://localhost:8001/v1          # Qwen 7B (tutoring)
VLLM_BASE_URL_VISION=http://localhost:8002/v1        # Qwen VL 7B (multimodal)
VLLM_MODEL_PRIMARY=Qwen/Qwen2.5-72B-Instruct-AWQ
VLLM_MODEL_FAST=Qwen/Qwen2.5-7B-Instruct
VLLM_MODEL_VISION=Qwen/Qwen2.5-VL-7B-Instruct

# Embedding model (sentence-transformers, runs on CPU)
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DEVICE=cpu

# Whisper (audio transcription)
WHISPER_MODEL=large-v3
WHISPER_DEVICE=cuda                                   # Uses 1 T4 when transcribing

# Auth
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=agentic-lms
JWT_SECRET=<generated-secret>

# Feature Flags
ENABLE_DYNAMIC_HINT_PRICING=false          # FR-404, enable in Beta
ENABLE_DEBATE_BOT=false                    # FR-205, enable in Beta
ENABLE_ECONOMY_BALANCING=false             # FR-408, enable in GA
```

---

## Backend Conventions (Python / FastAPI)

### Code Style

- **Formatter:** `ruff format` (line length: 100)
- **Linter:** `ruff check` (all rules enabled except `D` docstring rules)
- **Type checker:** `mypy --strict`
- **All functions must have type annotations.** No `Any` unless unavoidable (document why).

### File Patterns

**Routes are thin.** They validate input, call a service, and return a response. No business logic.

```python
# ✅ CORRECT — routes/assignments.py
@router.post("/courses/{course_id}/generate-assignments")
async def generate_assignments(
    course_id: UUID,
    config: AssignmentGenerationConfig,
    faculty: Faculty = Depends(get_current_faculty),
    service: AssignmentService = Depends(),
) -> AssignmentGenerationResponse:
    return await service.generate(course_id, config, faculty)
```

```python
# ❌ WRONG — never put logic in routes
@router.post("/courses/{course_id}/generate-assignments")
async def generate_assignments(course_id: UUID, ...):
    graph = await neo4j.get_graph(course_id)        # Don't do this here
    assignments = await designer_agent.run(graph)     # Don't do this here
    for a in assignments:
        await db.insert(a)                            # Don't do this here
    return assignments
```

**Services contain all business logic.** They are the single source of truth for "how things work."

```python
# services/assignments/generator.py
class AssignmentService:
    def __init__(self, db: AsyncSession, agent: DesignerAgent, kg: KGClient):
        self.db = db
        self.agent = agent
        self.kg = kg

    async def generate(
        self, course_id: UUID, config: AssignmentGenerationConfig, faculty: Faculty
    ) -> AssignmentGenerationResponse:
        graph = await self.kg.get_course_graph(course_id)
        assignments = await self.agent.run(graph, config)
        # ... validation, storage, event emission
```

### Async Everywhere

All database, HTTP, and LLM calls MUST be async. Never use sync drivers.

```python
# ✅ async
async with async_session() as session:
    result = await session.execute(select(Assignment).where(...))

# ❌ sync — will block the event loop
session.query(Assignment).filter(...).all()
```

### Pydantic Schemas

- Request schemas go in `schemas/` and are suffixed with `Request` or `Config`
- Response schemas are suffixed with `Response`
- DB model fields that should never be exposed (internal IDs, secrets) are excluded in the response schema

```python
# schemas/assignments.py
class AssignmentResponse(BaseModel):
    id: UUID
    type: AssignmentType
    title: str
    status: AssignmentStatus
    concept_tags: list[UUID]
    max_xp: int
    hint_config: HintConfig

    model_config = ConfigDict(from_attributes=True)
```

---

## Frontend Conventions (Next.js / React)

### Code Style

- **TypeScript strict mode.** No `any`. No `@ts-ignore` without a comment explaining why.
- **Formatter:** Prettier (printWidth: 100, singleQuote: true)
- **Linter:** ESLint with next/core-web-vitals + typescript-eslint strict
- **File naming:** `kebab-case` for files, `PascalCase` for components

### Component Patterns

**Server Components by default.** Only add `"use client"` when the component needs interactivity (hooks, event handlers, browser APIs).

```tsx
// ✅ Server Component (default) — for data fetching
// app/(faculty)/courses/[id]/analytics/page.tsx
export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const data = await getAnalytics(params.id);  // Server-side fetch
  return <ConceptHeatmap data={data} />;
}
```

```tsx
// ✅ Client Component — for interactivity
// components/student/HintButton.tsx
"use client";
import { useState } from "react";
import { useGamificationStore } from "@/stores/gamification";

export function HintButton({ assignmentId, tier }: HintButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { gold, spendGold } = useGamificationStore();
  // ...
}
```

### State Management

- **Server state:** React Server Components + Next.js `fetch` with revalidation
- **Client state:** Zustand (one store per domain: `auth`, `gamification`, `assignment`)
- **WebSocket state:** Custom hooks with `useRef` for connection management
- **Optimistic updates:** For gamification actions (XP gain, Gold spend) — update UI immediately, reconcile on server response

### Styling

- **Tailwind CSS only.** No inline styles. No CSS modules. No styled-components.
- **shadcn/ui for primitives.** Use `Button`, `Card`, `Dialog`, `Input`, `Badge`, etc. from shadcn.
- **Custom components use Tailwind.** Follow shadcn patterns for consistency.
- **Color palette defined in `tailwind.config.ts`.** Never hardcode hex values in components.

### API Client Pattern

```typescript
// lib/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiClient<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.token && { Authorization: `Bearer ${options.token}` }),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

---

## Multi-Agent System Conventions (LangGraph)

### Agent Definition Pattern

Every agent follows the same structure. Do not deviate.

```python
# packages/agents/agents/designer/state.py
from typing import TypedDict
from langgraph.graph import StateGraph

class DesignerState(TypedDict):
    """Immutable state passed through the agent graph."""
    course_id: str
    knowledge_graph: dict              # Serialized KG subgraph
    config: dict                       # Gamification level, strictness, etc.
    generated_assignments: list[dict]  # Accumulated outputs
    current_step: str                  # For observability
    errors: list[str]                  # Accumulated errors
```

```python
# packages/agents/agents/designer/nodes.py
async def generate_mcq(state: DesignerState) -> DesignerState:
    """Generate MCQ assignments from the Knowledge Graph."""
    # 1. Get prompt template (NEVER inline prompts)
    prompt = PROMPTS["generate_mcq"].format(
        concepts=state["knowledge_graph"],
        strictness=state["config"]["grading_strictness"],
    )
    # 2. Call LLM via the model-agnostic provider
    response = await llm_router.complete(
        task_type="creative",           # Routes to Qwen 72B at temp 0.8
        prompt=prompt,
    )
    # 3. Parse + validate output
    assignments = parse_mcq_response(response)
    # 4. Return updated state (never mutate)
    return {**state, "generated_assignments": state["generated_assignments"] + assignments}
```

```python
# packages/agents/agents/designer/agent.py
from langgraph.graph import StateGraph, END

def build_designer_graph() -> StateGraph:
    graph = StateGraph(DesignerState)
    graph.add_node("generate_mcq", generate_mcq)
    graph.add_node("generate_scenarios", generate_scenarios)
    graph.add_node("generate_rubrics", generate_rubrics)
    graph.add_node("tag_concepts", tag_concepts)

    graph.set_entry_point("generate_mcq")
    graph.add_edge("generate_mcq", "generate_scenarios")
    graph.add_edge("generate_scenarios", "generate_rubrics")
    graph.add_edge("generate_rubrics", "tag_concepts")
    graph.add_edge("tag_concepts", END)

    return graph.compile()
```

### Prompt Management

**ALL prompts live in `prompts.py` files.** Never inline a prompt string in a node function.

```python
# packages/agents/agents/tutor/prompts.py
PROMPTS = {
    "socratic_response": """You are a Socratic tutor for a university course.

RULES (NEVER VIOLATE):
1. NEVER give the direct answer.
2. ONLY use information from the provided CONTEXT.
3. If the answer is not in the CONTEXT, say: "I don't know based on the course materials."
4. ALWAYS cite your source as [Source: {{document_name}}, Page {{page_number}}].
5. Ask guiding questions that lead the student to discover the answer themselves.
6. If the student has made {attempt_count} failed attempts, offer a hint (cost: {hint_cost} Gold).

CONTEXT:
{context}

STUDENT QUESTION:
{question}

CONVERSATION HISTORY:
{history}
""",
}
```

### LLM Router Configuration

```python
# packages/llm/llm/router.py
"""
All LLM inference goes through self-hosted vLLM servers exposing OpenAI-compatible APIs.
The router maps task types to the appropriate model endpoint.
"""
from openai import AsyncOpenAI

# vLLM exposes an OpenAI-compatible API — we use the standard OpenAI client
PROVIDERS = {
    "primary": AsyncOpenAI(base_url=settings.VLLM_BASE_URL_PRIMARY, api_key="unused"),
    "fast":    AsyncOpenAI(base_url=settings.VLLM_BASE_URL_FAST,    api_key="unused"),
    "vision":  AsyncOpenAI(base_url=settings.VLLM_BASE_URL_VISION,  api_key="unused"),
}

TASK_ROUTING = {
    # Creative tasks: assignments, scenarios, debate bots — need the 72B model
    "creative":    {"provider": "primary", "model": "Qwen/Qwen2.5-72B-Instruct-AWQ", "temperature": 0.8, "max_tokens": 4096},

    # Grading: strict, low-temperature evaluation — needs the 72B model for reasoning quality
    "grading":     {"provider": "primary", "model": "Qwen/Qwen2.5-72B-Instruct-AWQ", "temperature": 0.1, "max_tokens": 2048},

    # Tutoring: low-latency Socratic responses — 7B model for speed
    "tutoring":    {"provider": "fast",    "model": "Qwen/Qwen2.5-7B-Instruct",      "temperature": 0.3, "max_tokens": 1024},

    # Ingestion (text): concept extraction, chunking decisions — 7B is sufficient
    "ingestion":   {"provider": "fast",    "model": "Qwen/Qwen2.5-7B-Instruct",      "temperature": 0.2, "max_tokens": 2048},

    # Ingestion (vision): reading charts, diagrams, handwriting from PDFs
    "vision":      {"provider": "vision",  "model": "Qwen/Qwen2.5-VL-7B-Instruct",   "temperature": 0.2, "max_tokens": 2048},
}
```

> **IMPORTANT:** vLLM's OpenAI-compatible API means all `openai` Python SDK calls work unchanged. The `api_key` field is required by the client but ignored by vLLM — set it to `"unused"`. If you ever need to fall back to a cloud provider (e.g., during GPU maintenance), just swap the `base_url` and `api_key` to point to OpenAI or any OpenAI-compatible endpoint. The rest of the code stays the same.

---

## Database Conventions

### Migrations

- **Tool:** Alembic with async support
- **ALWAYS create a migration for schema changes.** Never modify a DB table manually.
- **One migration per logical change.** Don't combine unrelated changes.
- **Migration naming:** `{YYYY_MM_DD}_{HHMM}_{description}.py`

```bash
# Create a new migration
cd apps/api
alembic revision --autogenerate -m "add_hint_transaction_table"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

### Model Conventions

```python
# models/base.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func
import uuid

class Base(DeclarativeBase):
    pass

class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

All models inherit from `Base`, `UUIDMixin`, and `TimestampMixin`.

### Query Patterns

- Use SQLAlchemy 2.0 style (`select()`, not `session.query()`)
- Always use `async` sessions
- Never use `*` selects — specify columns
- Always paginate list queries (cursor-based, not offset)

```python
# ✅ CORRECT
stmt = select(Assignment).where(
    Assignment.course_id == course_id,
    Assignment.status == AssignmentStatus.PUBLISHED,
).order_by(Assignment.created_at.desc()).limit(20)
result = await session.execute(stmt)
assignments = result.scalars().all()
```

---

## API Conventions

### URL Structure

```
/api/v1/{resource}                    # Collection
/api/v1/{resource}/{id}               # Individual
/api/v1/{resource}/{id}/{sub-resource} # Nested
/api/v1/{resource}/{id}/{action}      # Actions (verbs: generate, publish, appeal)
```

### Response Format

All responses follow a consistent envelope:

```json
// Success (single resource)
{
  "data": { ... },
  "meta": { "request_id": "uuid" }
}

// Success (list)
{
  "data": [ ... ],
  "meta": {
    "request_id": "uuid",
    "pagination": { "cursor": "abc123", "has_more": true, "total": 42 }
  }
}

// Error
{
  "error": {
    "code": "ASSIGNMENT_NOT_FOUND",
    "message": "Assignment with ID xyz not found.",
    "details": { ... }
  },
  "meta": { "request_id": "uuid" }
}
```

### Error Codes

Use uppercase snake_case error codes. Define them in `shared/exceptions.py`.

```python
class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict | None = None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}

# Usage
raise AppError("INSUFFICIENT_GOLD", "You need 50 Gold but only have 30.", 402, {"required": 50, "balance": 30})
```

### WebSocket (Tutor Chat)

```
ws://api.domain.com/api/v1/tutor/chat?token=JWT

Client → Server: { "type": "message", "content": "What is mitosis?", "assignment_id": "uuid" }
Server → Client: { "type": "stream", "content": "Let me guide you...", "citations": [...] }
Server → Client: { "type": "hint_offer", "tier": 1, "cost": 10, "preview": "Look at page 4" }
Server → Client: { "type": "done", "message_id": "uuid" }
```

---

## Authentication & Authorization

### Roles

| Role | Scope | Access |
|------|-------|--------|
| `admin` | Institution | Full access to all courses and users within the institution |
| `faculty` | Course | Manage courses they own: upload, generate, review, publish, analytics |
| `ta` | Course | Grade review, student analytics (no publish, no config) |
| `student` | Enrollment | Access published assignments, submit, use tutor, view own profile |

### JWT Claims

```json
{
  "sub": "user-uuid",
  "role": "faculty",
  "institution_id": "inst-uuid",
  "course_ids": ["course-uuid-1", "course-uuid-2"],
  "iss": "keycloak",
  "exp": 1700000000
}
```

### Authorization Pattern

```python
# dependencies.py
async def get_current_faculty(token: str = Depends(oauth2_scheme)) -> Faculty:
    claims = verify_jwt(token)
    if claims["role"] not in ("faculty", "admin"):
        raise AppError("FORBIDDEN", "Faculty role required.", 403)
    return await get_user(claims["sub"])

# In routes
@router.post("/courses/{course_id}/publish")
async def publish(course_id: UUID, faculty: Faculty = Depends(get_current_faculty)):
    if course_id not in faculty.course_ids:
        raise AppError("FORBIDDEN", "You do not own this course.", 403)
    ...
```

---

## Gamification Engine

### XP Rules

| Action | XP Earned | Notes |
|--------|-----------|-------|
| Complete assignment (no hints) | `max_xp` | Full marks |
| Complete assignment (with hints) | `max_xp - (hint_tier * penalty)` | Tier 1: -5%, Tier 2: -15%, Tier 3: -30% |
| Daily login | 5 XP | Once per day |
| Perfect score | 1.5x multiplier | Applied to assignment XP |
| Streak bonus (7+ days) | 1.2x multiplier | Stacks with perfect score |

### Gold Rules

| Action | Gold Earned/Spent | Notes |
|--------|-------------------|-------|
| Complete assignment | +10–50 Gold | Based on difficulty |
| Perfect score | +25 Gold bonus | |
| Daily streak | +5 Gold/day | Capped at +50/day |
| Tier 1 Hint | -10 Gold | Nudge |
| Tier 2 Hint | -30 Gold | Guidance |
| Tier 3 Hint | -75 Gold | Solution |
| Streak Freeze | -100 Gold | Preserves streak for 1 missed day |
| Retry (Second Chance) | -50 Gold | Retake without penalty |

### Dynamic Hint Pricing (FR-404, Beta+)

```python
def calculate_hint_cost(base_cost: int, attempts: int, gold_balance: int) -> int:
    """
    Dynamic pricing reduces cost when student demonstrates genuine effort.
    - 3+ valid attempts: 50% discount
    - 5+ valid attempts: 75% discount
    - Gold balance < 20% of course median: emergency pricing (90% discount)
    """
    if attempts >= 5:
        return max(1, int(base_cost * 0.25))
    elif attempts >= 3:
        return max(1, int(base_cost * 0.50))
    return base_cost
```

### Leaderboard (Valkey)

```python
# Sorted set: key = f"leaderboard:{course_id}", member = student_id, score = xp
await valkey.zadd(f"leaderboard:{course_id}", {student_id: xp_total})
top_10 = await valkey.zrevrange(f"leaderboard:{course_id}", 0, 9, withscores=True)
rank = await valkey.zrevrank(f"leaderboard:{course_id}", student_id)
```

---

## RAG Pipeline & Knowledge Graph

### Ingestion Pipeline

```
Raw PDF → PyMuPDF (text + images) → Semantic Chunker → Chunks
  → text-embedding-3-small → Weaviate (vector store)
  → LLM concept extraction → Neo4j (knowledge graph)
```

### Semantic Chunking Rules

1. **Chunk by concept, not by page.** A single concept may span 2 pages; don't split it.
2. **Max chunk size:** 512 tokens (with 50-token overlap)
3. **Metadata per chunk:** `{ document_id, page_numbers: [int], concept_id, heading_hierarchy: [str] }`
4. **Never chunk mid-sentence.**

### RAG Retrieval

```python
# packages/rag/rag/retriever.py
async def retrieve(query: str, course_id: str, top_k: int = 5) -> list[Chunk]:
    """Hybrid search: dense (semantic) + sparse (keyword) + reranking."""
    results = await weaviate.query.hybrid(
        collection=f"course_{course_id}",
        query=query,
        alpha=0.7,             # 70% semantic, 30% keyword
        limit=top_k * 3,      # Over-fetch for reranking
    )
    reranked = await reranker.rank(query, results, top_k=top_k)
    return reranked
```

### Knowledge Graph Schema (Neo4j)

```cypher
// Node types
(:Concept {id: UUID, name: String, description: String, course_id: UUID})
(:Document {id: UUID, title: String, type: String})

// Relationship types
(:Concept)-[:IS_PREREQUISITE_FOR]->(:Concept)
(:Concept)-[:IS_PART_OF]->(:Concept)
(:Concept)-[:MENTIONED_IN {pages: [Int]}]->(:Document)
```

### Grounding & Hallucination Detection

```python
# packages/rag/rag/grounding.py
async def verify_grounding(response: str, context_chunks: list[Chunk]) -> GroundingResult:
    """
    Check every claim in the AI response against the provided context.
    Returns: { is_grounded: bool, ungrounded_claims: list[str], confidence: float }
    """
    # 1. Extract claims from response
    # 2. For each claim, check semantic similarity against context
    # 3. Flag claims with similarity < threshold as ungrounded
    # 4. If any ungrounded claims → block response, return fallback
```

---

## Code Sandbox (Firecracker)

### Security Rules (NON-NEGOTIABLE)

1. **No network access.** Firecracker VMs have no outbound networking.
2. **Resource limits:** 1 vCPU, 256MB RAM, 10-second execution timeout.
3. **No persistent storage.** VMs are destroyed after each execution.
4. **Read-only root filesystem.** Student code writes only to `/tmp`.
5. **No `sudo`, no `apt`, no package installation.** Pre-baked images only.

### Execution Flow

```python
# services/sandbox/executor.py
async def execute_student_code(
    code: str,
    language: str,
    hidden_tests: list[TestCase],
    timeout: int = 10,
) -> ExecutionResult:
    """
    1. Spin up Firecracker microVM with language-specific image
    2. Write student code to /tmp/solution.{ext}
    3. Write test runner to /tmp/run_tests.{ext}
    4. Execute with timeout
    5. Capture stdout, stderr, test results
    6. Destroy VM
    7. Return ExecutionResult
    """
```

### Error Translation

```python
# Map raw errors to pedagogical messages
ERROR_TRANSLATIONS = {
    r"SyntaxError: unexpected EOF while parsing":
        "It looks like your code is incomplete. Check if you forgot to close a parenthesis, bracket, or quote.",
    r"IndentationError":
        "Python uses spaces to understand code structure. Check that your indentation is consistent.",
    r"NameError: name '(\w+)' is not defined":
        "You're using a variable called '{0}' that hasn't been created yet. Did you forget to define it?",
    r"TypeError: .* takes (\d+) positional arguments? but (\d+) (?:was|were) given":
        "Your function expects {0} argument(s) but you gave it {1}. Check your function call.",
}
```

---

## Testing Conventions

### Test Pyramid

```
E2E (Playwright)        ← 10% — Critical user journeys only
Integration (pytest)    ← 30% — Service layer with real DB + mocked LLM
Unit (pytest + vitest)  ← 60% — Pure logic, no I/O
```

### Backend Testing

```bash
# Run all tests
cd apps/api && pytest

# Run specific test file
pytest tests/unit/test_hint_pricing.py

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

#### Mock LLM Calls

**NEVER make real LLM calls in tests.** Always mock.

```python
# tests/conftest.py
@pytest.fixture
def mock_llm():
    """Mock LLM provider that returns predictable responses."""
    with patch("packages.llm.llm.router.LLMRouter.complete") as mock:
        mock.return_value = LLMResponse(
            content="Mocked response",
            tokens_used=100,
            model="mock-model",
        )
        yield mock
```

#### Test Database

```python
# tests/conftest.py
@pytest.fixture
async def db_session():
    """Provide a clean database session for each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

### Frontend Testing

```bash
# Unit tests (vitest)
cd apps/web && npm run test

# E2E tests (Playwright)
npm run test:e2e
```

### What to Test

| Layer | Test What | Don't Test |
|-------|-----------|------------|
| **Unit** | XP calculation, Gold deduction, hint pricing, rubric parsing, state transitions | Framework internals, UI rendering |
| **Integration** | Service layer (e.g., submit assignment → grade → update XP → emit event), API routes with test DB | External services (mock LLM, mock MinIO) |
| **E2E** | Faculty upload → generate → review → publish flow; Student submit → feedback flow | Every UI permutation |

---

## Git Workflow

### Branch Strategy

```
main                    ← Production. Protected. Deploy via tag.
├── develop             ← Integration branch. CI must pass.
├── feat/FR-201-mcq-gen ← Feature branches. Named: feat/{FR-ID}-{short-desc}
├── fix/bug-hint-cost   ← Bug fixes. Named: fix/{short-desc}
└── chore/update-deps   ← Maintenance. Named: chore/{short-desc}
```

### Commit Convention (Conventional Commits)

```
feat(agents): implement MCQ generation node for DesignerAgent

- Add generate_mcq node in packages/agents/agents/designer/nodes.py
- Add MCQ prompt template in prompts.py
- Add unit tests for MCQ parsing
- Implements FR-201

Refs: FR-201
```

Format: `{type}({scope}): {description}`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructure (no behavior change) |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, deps, config changes |
| `perf` | Performance improvement |

**Scope options:** `agents`, `api`, `web`, `rag`, `kg`, `llm`, `gamification`, `sandbox`, `infra`, `auth`

### PR Rules

1. Every PR must reference a Functional Requirement ID (e.g., `Implements FR-201`)
2. Every PR must have passing CI (lint + type check + tests)
3. Every PR must be reviewed by at least one other agent or human
4. Squash merge into `develop`. No merge commits.

---

## Deployment & Infrastructure

### Local Dev

```bash
make dev          # Start all services (docker compose + api + web)
make check        # Lint + type check + test (ALL must pass)
make reset        # Nuclear reset: drop DBs, re-migrate, re-seed
make migrate      # Run pending Alembic migrations
make seed         # Seed dev data
```

### CI/CD Pipeline (GitHub Actions)

```
Push to any branch →
  ├── Lint (ruff + eslint)
  ├── Type Check (mypy + tsc)
  ├── Unit Tests (pytest + vitest)
  └── Integration Tests (pytest with test DB)

Push to develop →
  └── Deploy to staging (ArgoCD)

Tag v*.*.* →
  └── Deploy to production (ArgoCD, requires manual approval)
```

### Docker Images

```bash
# Build
docker build -f infra/docker/Dockerfile.api -t agentic-lms-api .
docker build -f infra/docker/Dockerfile.web -t agentic-lms-web .
docker build -f infra/docker/Dockerfile.agents -t agentic-lms-agents .
```

---

## Error Handling & Logging

### Exception Hierarchy

```python
AppError                          # Base — all app errors
├── ValidationError               # 400 — Bad input
├── AuthenticationError           # 401 — Invalid/expired token
├── AuthorizationError            # 403 — Insufficient permissions
├── NotFoundError                 # 404 — Resource not found
├── ConflictError                 # 409 — State conflict (e.g., already published)
├── InsufficientGoldError         # 402 — Not enough Gold for hint
├── RateLimitError                # 429 — Too many requests
├── LLMError                      # 502 — LLM provider failure
│   ├── LLMTimeoutError
│   └── LLMHallucinationError     # Grounding check failed
├── SandboxError                  # 500 — Code execution failure
│   ├── SandboxTimeoutError
│   └── SandboxResourceError
└── IngestionError                # 500 — File parsing failure
```

### Structured Logging

```python
import structlog
logger = structlog.get_logger()

# Always include context
logger.info("assignment.generated",
    course_id=course_id,
    assignment_type="MCQ",
    question_count=10,
    duration_ms=1234,
)

logger.error("grading.failed",
    submission_id=submission_id,
    error_code="LLM_TIMEOUT",
    model="Qwen/Qwen2.5-72B-Instruct-AWQ",
    attempt=2,
)
```

### Log Levels

| Level | When |
|-------|------|
| `DEBUG` | Detailed internal state (disabled in prod) |
| `INFO` | Business events: assignment generated, submission graded, hint purchased |
| `WARNING` | Recoverable issues: LLM retry, cache miss, slow query |
| `ERROR` | Failures requiring attention: LLM down, grounding check failed, sandbox crash |
| `CRITICAL` | System-level failures: DB down, auth service unreachable |

---

## Common Tasks Reference

### Add a New Agent Node

1. Create the node function in `packages/agents/agents/{agent_name}/nodes.py`
2. Add the prompt template in `prompts.py` (NEVER inline prompts)
3. Wire the node into the graph in `agent.py`
4. Add the state fields in `state.py` if needed
5. Write unit tests in `packages/agents/tests/`
6. Update `HANDOFF.md`

### Add a New API Endpoint

1. Add the Pydantic schema in `apps/api/app/schemas/`
2. Add the service method in `apps/api/app/services/`
3. Add the route in `apps/api/app/routes/`
4. Add integration test in `apps/api/tests/integration/`
5. Add the TypeScript type in `apps/web/src/types/api.ts`
6. Add the API client function in `apps/web/src/lib/api/`

### Add a New Database Table

1. Create the SQLAlchemy model in `apps/api/app/models/`
2. Import it in `models/__init__.py` (required for Alembic detection)
3. Run `alembic revision --autogenerate -m "add_{table_name}"`
4. Review the generated migration file (Alembic sometimes misses things)
5. Run `alembic upgrade head`
6. Add the corresponding Pydantic schema
7. Update seed script if needed

### Add a New Frontend Page

1. Create the route in `apps/web/src/app/({role})/{path}/page.tsx`
2. Create components in `apps/web/src/components/{domain}/`
3. Add API client function if needed
4. Add to navigation (sidebar or mission map)
5. Write Playwright E2E test for the critical path

---

## Known Pitfalls & Gotchas

### vLLM (Self-Hosted LLM)

- **Tensor parallelism across T4s is slow for the first request.** The 72B model needs ~30s cold start. Use `--max-model-len 4096` to limit KV cache and speed up loading.
- **T4 GPUs do NOT support bfloat16.** Always use `--dtype float16` or quantized models (AWQ/GPTQ). bfloat16 will silently fall back to float32 and blow VRAM.
- **AWQ quantization requires the `autoawq` package** installed alongside vLLM. Without it, the model loads in FP16 and OOMs on 4× T4.
- **vLLM's OpenAI-compatible endpoint uses `/v1/chat/completions`.** The `openai` Python client works as-is — just set `base_url` and any string for `api_key`.
- **GPU memory fragmentation:** After many requests, vLLM's KV cache can fragment. Set `--gpu-memory-utilization 0.90` (not 0.95) to leave headroom.
- **Multi-model serving:** Run each model as a separate vLLM process on different ports. Do NOT try to load multiple models into one vLLM instance.
- **Model downloads:** First launch downloads models from HuggingFace (~40GB for 72B-AWQ). Pre-download to `/models/` on the 10TB storage to avoid repeated downloads:
  ```bash
  huggingface-cli download Qwen/Qwen2.5-72B-Instruct-AWQ --local-dir /models/qwen72b-awq
  ```
- **Embedding models (BGE-M3) run on CPU.** Do NOT waste GPU VRAM on embeddings. Use `sentence-transformers` with `device="cpu"` — with 500GB RAM, CPU inference is fast enough for embeddings.

### Valkey

- **Drop-in replacement for Redis.** The `valkey` Python client is API-compatible with `redis-py`. Import `from valkey import asyncio as avalkey` instead of `from redis import asyncio as aioredis`.
- **Valkey fork diverges from Redis 7.4+.** Don't copy-paste Redis 8.x features — check Valkey docs.

### MinIO

- **S3-compatible API.** Use `minio` Python client or any S3 SDK with the custom endpoint URL.
- **Bucket names must be lowercase, 3–63 chars.** No underscores — use hyphens.
- **Default credentials (`minioadmin/minioadmin`) are for dev only.** Rotate in production.

### LangGraph

- **State must be serializable.** No SQLAlchemy model instances in state — convert to dicts first.
- **Checkpointing requires a persistence backend.** Use Valkey for dev, PostgreSQL for prod.
- **Graph compilation is expensive.** Compile once at startup, not per request.

### Weaviate

- **Collection names cannot contain hyphens.** Use underscores: `course_abc123`, not `course-abc123`.
- **Batch imports are MUCH faster than individual inserts.** Always batch during ingestion.
- **Hybrid search `alpha` parameter:** 0.0 = pure keyword, 1.0 = pure vector. Default 0.7 works well.

### Neo4j

- **Async driver requires `AsyncGraphDatabase`.** Don't use the sync driver.
- **Always use parameterized Cypher queries.** Never string-interpolate to avoid injection.
- **Graph traversal can be slow on large graphs.** Set depth limits on recursive queries.

### Firecracker

- **Requires Linux with KVM.** Does not work on macOS or Windows. Use Docker fallback for local dev.
- **VM boot is fast (~125ms) but cold start includes image load.** Pre-warm VMs for latency-sensitive paths.
- **No GPU access.** Don't use Firecracker for ML workloads.

### Next.js

- **Server Components cannot use hooks.** `useState`, `useEffect` etc. require `"use client"`.
- **`fetch` in Server Components is auto-cached.** Use `{ cache: 'no-store' }` or `{ next: { revalidate: 60 } }` for dynamic data.
- **Middleware runs on the Edge.** Don't import Node.js-only modules in `middleware.ts`.

### General

- **Never commit `.env.local`.** It's in `.gitignore` but double-check.
- **Never commit API keys or secrets.** Use environment variables only. Even with self-hosted LLMs, Keycloak and MinIO have secrets.
- **vLLM must be running before starting the API server.** The health check (`make check`) verifies vLLM endpoints are reachable.
- **Always check `HANDOFF.md` before starting work.** Another agent may have left critical context.
- **When in doubt, ask.** If a requirement is ambiguous, add it to `HANDOFF.md` as a blocked item rather than guessing.

---

*Last updated: February 17, 2026. This is a living document — update it when conventions change.*