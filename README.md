# Agentic LMS

> **Transform raw course materials into fully interactive, gamified, AI-tutored learning experiences — without writing a single line of code or designing a single quiz manually.**

Agentic LMS is a next-generation Learning Management System that combines the administrative flexibility of traditional LMS platforms (Canvas, Moodle) with the interactive, gamified learning experience of platforms like DataCamp — powered entirely by autonomous AI agents.

![Agentic LMS — Product Overview](image-readme/hero.png)

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Multi-Agent System](#multi-agent-system)
- [Gamification Engine](#gamification-engine)
- [Faculty Experience](#faculty-experience)
- [Student Experience](#student-experience)
- [AI Tutor System](#ai-tutor-system)
- [Code Lab](#code-lab)
- [Knowledge Graph](#knowledge-graph)
- [GPU Infrastructure](#gpu-infrastructure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

---

## Key Features

| Feature | Description |
|---|---|
| **Content Sovereignty** | Faculty upload their own materials (PDF, PPTX, DOCX, MP4, MP3); the AI works exclusively from those materials. No vendor lock-in. |
| **Autonomous Assignment Generation** | Multi-agent AI system auto-generates MCQs, branching scenarios, coding labs, rubrics, and debate bots from raw uploads. |
| **Socratic AI Tutor** | RAG-grounded tutor that never gives direct answers — guides students through structured Socratic questioning with citations. |
| **Gamified Hint Economy** | Loss-aversion-driven hint system with tiered pricing (Nudge / Guidance / Solution), XP, Gold, streaks, and leaderboards. |
| **Instant AI Grading** | Rubric-anchored, citation-backed assessment with 3× consistency checks and built-in appeal workflow for human oversight. |
| **Knowledge Graph-Guided Learning** | Neo4j-powered prerequisite graph that sequences learning, tracks per-concept mastery, and blocks advanced topics until prerequisites are met. |
| **LeetCode-Style Code Lab** | Monaco Editor with sandboxed execution, hidden test suites, auto-grading (70% tests + 30% LLM code quality), and friendly error translation. |
| **LTI 1.3 Integration** | Deploys as a tool inside existing Canvas/Moodle/Blackboard ecosystems — no rip-and-replace required. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION TIER                              │
│   Next.js 14 + React 18 + Tailwind CSS + Monaco Editor             │
│   Mission Map UI │ Faculty Dashboard │ Code Lab │ Tutor Chat        │
├─────────────────────────────────────────────────────────────────────┤
│                      API GATEWAY TIER                               │
│   FastAPI (Python) │ WebSocket │ JWT Auth │ Rate Limiting           │
├─────────────────────────────────────────────────────────────────────┤
│                  AGENT ORCHESTRATION TIER                           │
│   LangGraph Stateful Workflows                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│   │Ingestion │ │ Designer │ │  Tutor   │ │  Grader  │ │  Game   │ │
│   │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │ │  Agent  │ │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                       AI / ML TIER                                  │
│   LLM Inference (Qwen / Ollama / vLLM)                              │
│   Weaviate (Vector DB) │ Neo4j (Knowledge Graph)                    │
├─────────────────────────────────────────────────────────────────────┤
│                  DATA & INFRASTRUCTURE TIER                         │
│   PostgreSQL 16 │ Valkey 8 │ MinIO (S3) │ Sandbox (Code Exec)      │
│   Docker Compose │ Keycloak (Auth) │ Turborepo                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, Tailwind CSS (Tokyo Night theme), Zustand |
| **Code Editor** | Monaco Editor (VS Code engine) |
| **API** | FastAPI (Python), WebSocket, JWT (HS256) |
| **Agent Orchestration** | LangGraph + LangChain |
| **LLM Inference** | Ollama (dev), vLLM (production), Qwen models |
| **Vector DB** | Weaviate (hybrid search — dense + sparse) |
| **Graph DB** | Neo4j 5 Community (Knowledge Graph + prerequisite DAG) |
| **Primary DB** | PostgreSQL 16 (SQLAlchemy async, Alembic migrations) |
| **Cache / Leaderboard** | Valkey 8 (Redis-compatible, sorted sets) |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | Keycloak 26 (SAML 2.0, OIDC, RBAC) |
| **Embedding** | Qwen3-VL-Embedding-8B (multimodal, 4096-dim, INT8) |
| **Monorepo** | Turborepo + npm workspaces |
| **Containerization** | Docker Compose |

---

## Monorepo Structure

```
agentic-lms/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py         # App factory, CORS, health endpoint
│   │   │   ├── config.py       # Pydantic settings (env vars)
│   │   │   ├── database.py     # Async SQLAlchemy engine + sessions
│   │   │   ├── dependencies.py # JWT auth guards
│   │   │   ├── models/         # 9 SQLAlchemy models (UUID PKs)
│   │   │   ├── schemas/        # 5 Pydantic schema modules
│   │   │   ├── routes/         # 7 route files (REST + WebSocket)
│   │   │   ├── services/       # Business logic layer
│   │   │   │   ├── gamification/   # XP, Gold, hints, streaks, badges, leaderboard
│   │   │   │   ├── grading/        # AI grader, appeal, feedback
│   │   │   │   ├── sandbox/        # Code execution + test runner
│   │   │   │   ├── ingestion/      # Parser, chunker, embedder
│   │   │   │   ├── assignments/    # Generator, publisher
│   │   │   │   ├── analytics/      # Heatmap, risk detector
│   │   │   │   ├── tutor.py        # Session persistence, history
│   │   │   │   └── mastery_tracker.py  # Per-concept mastery
│   │   │   ├── events/         # Event bus (types, publisher, consumer)
│   │   │   └── middleware/     # Auth middleware
│   │   ├── alembic/            # Database migrations
│   │   └── tests/              # Unit, integration, e2e tests
│   │
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/            # Pages (student + faculty dashboards)
│           ├── components/     # UI components (TutorChat, CodeLab, etc.)
│           ├── lib/            # API client, utilities
│           ├── stores/         # Zustand stores (auth, gamification)
│           └── types/          # TypeScript types mirroring schemas
│
├── packages/
│   ├── agents/                 # LangGraph AI agents
│   │   └── agents/
│   │       ├── base.py         # Base agent class
│   │       ├── tutor/          # Socratic tutor (5-node graph)
│   │       ├── grader/         # AI grading pipeline
│   │       ├── designer/       # Assignment generation
│   │       ├── ingestion/      # Content processing
│   │       └── game/           # Economy management
│   ├── knowledge-graph/        # Neo4j client, models, queries
│   ├── llm/                    # LLM router, providers, cost tracker
│   ├── rag/                    # RAG pipeline, context builder, grounding
│   └── shared/                 # Shared utilities
│
├── services/
│   └── embedding/              # Qwen3-VL-Embedding-8B microservice
│
├── scripts/                    # Seed scripts (KG, dev data)
├── infra/                      # Docker, K8s, OpenTofu, vLLM configs
├── docker-compose.yml          # Local infrastructure
├── Makefile                    # Dev commands
├── turbo.json                  # Turborepo pipeline config
└── package.json                # Root workspace config
```

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm 10+
- **Docker** and Docker Compose
- **Ollama** (for local LLM inference during development)

### 1. Clone the Repository

```bash
git clone <repo-url> agentic-lms
cd agentic-lms
```

### 2. Start Infrastructure Services

```bash
# Start Postgres, Valkey, Weaviate, Neo4j, Keycloak, and MinIO
make infra
```

This launches via Docker Compose:

| Service | Port | Credentials |
|---|---|---|
| PostgreSQL 16 | 5432 | `postgres` / `postgres` |
| Valkey 8 (Redis) | 6379 | — |
| Weaviate | 8080, 50051 | Anonymous access |
| Neo4j | 7474 (browser), 7687 (bolt) | `neo4j` / `password` |
| Keycloak | 8081 | `admin` / `admin` |
| MinIO | 9000 (API), 9001 (console) | `minioadmin` / `minioadmin` |

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Install Dependencies

```bash
# Python packages (from repo root)
cd apps/api && pip install -e ".[dev]"
cd ../../packages/agents && pip install -e ".[dev]"
cd ../llm && pip install -e ".[dev]"
cd ../knowledge-graph && pip install -e ".[dev]"
cd ../rag && pip install -e ".[dev]"
cd ../shared && pip install -e ".[dev]"

# Node packages (from repo root)
cd ../../ && npm install
```

### 5. Run Database Migrations

```bash
make migrate
```

### 6. Seed the Knowledge Graph

```bash
python scripts/seed_kg.py
```

This seeds 16 Python concepts across 4 units (Fundamentals, Data Structures, Functions & Modules, OOP) with 17 prerequisite + 3 related edges forming a directed acyclic graph.

### 7. Start Ollama (Dev LLM)

```bash
ollama pull qwen3-coder:latest
ollama serve  # Runs at http://localhost:11434
```

---

## Running the Application

### Full Stack (via Turborepo)

```bash
make dev
```

### Individual Services

```bash
# Backend API (http://localhost:8000)
make dev-api
# or: cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (http://localhost:3000)
make dev-web
# or: cd apps/web && npm run dev
```

### Useful Makefile Targets

| Command | Description |
|---|---|
| `make dev` | Start all services via Turborepo |
| `make dev-api` | Start backend only |
| `make dev-web` | Start frontend only |
| `make infra` | Start Docker infrastructure |
| `make infra-down` | Stop Docker infrastructure |
| `make migrate` | Run Alembic migrations |
| `make migrate-new msg="description"` | Generate a new migration |
| `make seed` | Seed development data |
| `make reset` | Reset local environment |
| `make lint` | Run linters (ruff + mypy + eslint) |
| `make test` | Run all tests (pytest + jest) |
| `make check` | Lint + test combined |

---

## Multi-Agent System

The platform is powered by 5 specialized LangGraph agents, each operating as an independent stateful workflow:

### Ingestion Agent
Processes faculty uploads (PDF, PPTX, DOCX, MP4, MP3) through a pipeline: **Parse → Chunk (semantic, concept-based) → Embed (Weaviate) → Build Knowledge Graph (Neo4j)**.

### Designer Agent
Auto-generates assignments from the Knowledge Graph and ingested content: MCQs with misconception-based distractors, branching scenarios, coding labs with hidden test suites, debate bots, and reverse essays. Each assignment includes an auto-generated rubric and concept tags.

### Tutor Agent
A 5-node LangGraph workflow for real-time Socratic tutoring:

```
resolve_learning_path → retrieve_context → socratic_respond → offer_hint → assess_mastery → END
```

- **resolve_learning_path**: Maps student question to KG concept, checks prerequisites
- **retrieve_context**: RAG hybrid search via Weaviate
- **socratic_respond**: Multi-turn chat with KG context, prerequisite blocking
- **offer_hint**: Tiered hints (Nudge=5g, Guidance=15g, Solution=30g) after 3+ attempts
- **assess_mastery**: LLM judges understanding level (understood/partial/none)

### Grader Agent
Evaluates submissions against auto-generated rubrics with per-criterion scores, evidence citations, and 3× consistency checks (flags variance > 20% for human review). Generates prescriptive feedback mapping low scores to KG concepts.

### Game Agent
Rule engine (no LLM) managing the XP/Gold economy, streak tracking, badge eligibility, leaderboard updates, and economy health monitoring.

---

## Gamification Engine

The gamification system uses a dual-currency model with loss-aversion mechanics:

### Currencies
- **XP** (Experience Points) — Non-spendable progress metric. Used for leaderboard ranking and level progression
- **Gold** — Spendable economy token earned through performance. Used to purchase hints and streak freezes

### XP Calculation
```
Final XP = base_xp × score% × hint_penalty × streak_bonus × perfect_bonus
```
- Hint penalties: Nudge (-5%), Guidance (-15%), Solution (-30%)
- Perfect score: 1.5× multiplier
- Active streak: 1.2× multiplier

### Gold Calculation
```
Final Gold = base_gold × score% + perfect_bonus(25) + streak_bonus(5/day, capped 50)
```

### Hint Tiers
| Tier | Cost | Description |
|---|---|---|
| **Nudge** | 5 Gold | A gentle push in the right direction |
| **Guidance** | 15 Gold | Structured guidance with partial information |
| **Solution** | 30 Gold | Near-complete solution (heavy XP penalty) |

### Other Systems
- **Streaks**: Consecutive daily activity tracking with purchasable Streak Freezes
- **Badges**: 7 badge types (First Steps, Perseverance, Perfect Score, Streak Master, Streak Legend, Hint-Free, Gold Saver)
- **Leaderboard**: Real-time XP-ranked via Valkey sorted sets with opt-out for privacy

![Student Gamification Profile](image-readme/student-gamification-profile.png)

---

## Faculty Experience

### Course Setup Wizard

Faculty onboarding follows a streamlined three-step flow:

1. **Upload Materials** — Drag-and-drop zone accepting PDF, PPTX, DOCX, MP4, MP3 with real-time progress tracking through the ingestion pipeline (Parsing → Chunking → Embedding → Graph Building)

![Faculty Upload — Course Setup Wizard](image-readme/faculty-upload-course-setup-wizard.png)

2. **Configure** — Set gamification intensity (Off / Low / Medium / High), grading strictness (Lenient / Medium / Strict), and toggle hints, leaderboard, and streak tracking per course


3. **Review & Publish** — Card-based gallery of AI-generated assignments with inline edit, approve, and reject actions. Nothing reaches students without faculty approval.

![Faculty Assignment Review](image-readme/faculty-assignment-review.png)

### Faculty Dashboard

- **KPI Cards**: Active students, average scores, hint usage rate, at-risk count
- **Concept Heatmap**: Matrix of students × concepts, color-coded by mastery level
- **Student Table**: Sortable by Name, XP, Completion %, Hints Used, Risk Flag with drill-down to individual student timelines
- **Analytics**: Completion rates, hint usage patterns, at-risk student detection

![Faculty Dashboard](image-readme/coruse-upload.png)

![Faculty Analytics — Concept Heatmap](image-readme/analytics.png)

### Faculty Routes

| Page | Description |
|---|---|
| Dashboard | KPI overview and quick actions |
| Courses | Course management and creation |
| Assignments | AI-generated assignment review and editing |
| Analytics | Concept heatmaps, at-risk students, summaries |
| Settings | Course configuration and gamification controls |

---

## Student Experience

### Mission Map Dashboard

The student dashboard presents courses as **Mission Maps** with vertically scrolling nodes representing modules/assignments:
- **Completed** — Green glow
- **Current** — Pulsing animation
- **Locked** — Grayed with lock icon (prerequisite not met)

Persistent top bar displays XP progress bar, Gold balance, streak flame counter, and notification bell.

![Student Dashboard — Mission Map](image-readme/student-mission.png)

### Student Profile

Detailed stats grid with XP, Gold, streak, level progression, battle stats, and badge showcase.

![Student Profile](image-readme/student-gamification-profile.png)

### Assignment View

Split-pane layout:
- **Left**: Assignment prompt (scenario, code challenge, debate, or essay)
- **Right**: Relevant source material excerpt from faculty uploads (collapsible)
- **Bottom-right**: Hint button with Gold cost preview and confirmation
- **Inline feedback**: Grade, per-criterion breakdown, and "Next Steps" recommendations

<!-- 📸 Add student assignment view screenshot here -->

### Leaderboard

Course leaderboard ranked by XP with rank display and privacy opt-out.

![Student Leaderboard](image-readme/leaderboard.png)

---

## AI Tutor System

The Socratic AI Tutor connects via WebSocket and enforces strict pedagogical principles:

- **Never provides direct answers** — uses Socratic questioning to guide discovery
- **RAG-grounded** — responds only from faculty-uploaded materials (falls back to general knowledge when no materials are indexed)
- **Citations** — every response references source page/slide/timestamp
- **Multi-turn conversations** — maintains session history (last 20 messages) for scaffolded learning
- **Prerequisite enforcement** — redirects students away from advanced topics when prerequisites aren't mastered
- **Frustration detection** — adjusts hint pricing downward when students struggle repeatedly

### Tutor Chat Interface

- Streaming responses with typing indicator
- Learning summary panel
- Hint offer banners with "Buy for X Gold" button
- Gold balance indicator with real-time sync
- **Learning Path Progress panel**: progress bar (mastered/total), current concept with difficulty indicator, upcoming concepts list, mastery update notifications

![AI Tutor — Socratic Chat Interface](image-readme/AI-tutor.png)

### Mastery Tracking

Per-concept mastery tracked via JSONB on the User model:
- **Mastery threshold**: 70 for "mastered" status
- **Increments**: understood = +25, partial = +10, max = 100
- The system walks the prerequisite graph to find the first un-mastered concept whose prerequisites are all satisfied

---

## Code Lab

LeetCode-style coding environment for CS courses:

- **Monaco Editor** with syntax highlighting, IntelliSense, and VS Dark theme
- **Run Code** button for testing without submission
- **Submit** button triggers grading: 70% test pass rate + 30% LLM code quality evaluation
- **Tabbed Test Results** panel with per-test pass/fail icons and console output
- **LLM Problem Gate** — code must solve the stated problem to earn XP/Gold
- **Sandboxed Execution** — subprocess isolation with 30s timeout, output limits, temp directory isolation
- **Language Support** — Python, JavaScript, Java, C++
- **Confetti on success**, shake animation on failure

![Code Lab — Monaco Editor](image-readme/code-lab.png)

---

## Knowledge Graph

The Knowledge Graph is the backbone of the learning path system, stored in Neo4j:

### Seeded Structure (Python Curriculum)

**4 Units, 16 Concepts:**

| Unit | Concepts |
|---|---|
| **Fundamentals** | Variables & Types, Operators, Control Flow, Loops |
| **Data Structures** | Strings, Lists, Tuples, Dictionaries, Sets |
| **Functions & Modules** | Functions, Lambda, Decorators, Modules |
| **OOP** | Classes & Objects, Inheritance, Polymorphism |

**17 prerequisite edges + 3 related edges** forming a DAG that ensures students progress through concepts in the correct order.

### How It Works

1. **Ingestion Agent** builds the KG from uploaded course materials
2. **Tutor Agent** uses the KG to resolve learning paths, check prerequisites, and track mastery
3. **Designer Agent** tags generated assignments with KG concept IDs
4. **Mastery Tracker** walks the prerequisite graph to determine the student's current concept
5. **Prerequisite Blocking** redirects students who try to access advanced concepts without meeting prerequisites

![Knowledge Graph Visualization](image-readme/Knowledge-graph.png)

---

## GPU Infrastructure

### Production Layout (2-Server Setup)

**Server 1** (Embedding & Reranking) — 4× Tesla T4 16GB:

| GPU | Workload | VRAM |
|---|---|---|
| T4-0 | Qwen3-VL-Embedding-8B (INT8) | 14.4 GB |
| T4-1 | Available (replica) | — |
| T4-2 | llama-server | 8.5 GB |
| T4-3 | Available (replica) | — |

**Server 2** (LLM Generation) — 4× Tesla T4 16GB:

| GPU | Workload | VRAM |
|---|---|---|
| T4-0,1 | Qwen 2.5-32B (AWQ 4-bit, tensor parallel=2) | ~20 GB |
| T4-2,3 | Qwen 2.5-7B × 2 replicas (FP16) | ~14 GB each |

- **32B model**: High-stakes tasks (grading, feedback, appeals)
- **7B replicas**: Low-latency tasks (tutoring, hints, code quality)
- All served via **vLLM** with task-type routing through the LLM Router

### Embedding Microservice

Located at `services/embedding/`:
- **Model**: Qwen/Qwen3-VL-Embedding-8B (INT8 via bitsandbytes)
- **Dimension**: 4096 (multimodal — text + images)
- **Endpoints**: `POST /embed`, `GET /health`, `GET /info`
- **Startup**: `CUDA_VISIBLE_DEVICES=0 EMBEDDING_DTYPE=int8 python server.py`

---

## API Reference

The backend exposes a RESTful API + WebSocket endpoints. Full OpenAPI docs are available at `http://localhost:8000/docs` when running.

### Content & Ingestion

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/courses/{id}/upload` | Faculty | Upload course materials |
| `GET` | `/api/v1/courses/{id}/ingestion-status` | Faculty | Poll ingestion progress |
| `GET` | `/api/v1/courses/{id}/knowledge-graph` | Faculty | Retrieve Knowledge Graph |

### Assignments

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/courses/{id}/generate-assignments` | Faculty | Trigger Design Agent |
| `GET` | `/api/v1/courses/{id}/assignments` | All | List assignments |
| `PATCH` | `/api/v1/assignments/{id}` | Faculty | Edit assignment |
| `POST` | `/api/v1/assignments/{id}/publish` | Faculty | Publish to students |

### Student Interaction

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/assignments/{id}/submit` | Student | Submit response |
| `GET` | `/api/v1/assignments/{id}/hint/preview` | Student | Preview hint cost |
| `POST` | `/api/v1/assignments/{id}/hint` | Student | Purchase hint |
| `WS` | `/api/v1/tutor/chat` | Student | Socratic tutor (WebSocket) |
| `POST` | `/api/v1/submissions/{id}/appeal` | Student | Appeal AI grade |
| `POST` | `/api/v1/code/execute` | Student | Run code in sandbox |
| `POST` | `/api/v1/code/run` | Student | Run code without submission |

### Gamification

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/students/me/profile` | Student | XP, Gold, streak, badges |
| `GET` | `/api/v1/courses/{id}/leaderboard` | Student | Class leaderboard |
| `POST` | `/api/v1/students/me/streak-freeze` | Student | Purchase streak freeze |

### Faculty Analytics

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/courses/{id}/analytics/heatmap` | Faculty | Concept heatmap |
| `GET` | `/api/v1/courses/{id}/analytics/summary` | Faculty | Aggregate KPIs |
| `GET` | `/api/v1/courses/{id}/analytics/at-risk` | Faculty | At-risk students |
| `GET` | `/api/v1/submissions/{id}/ai-rationale` | Faculty | AI grading rationale |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/agentic_lms` | PostgreSQL connection string |
| `VALKEY_URL` | `redis://localhost:6379` | Valkey/Redis URL |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt protocol |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |
| `WEAVIATE_URL` | `http://localhost:8080` | Weaviate endpoint |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO S3 endpoint |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama API base URL |
| `EMBEDDING_SERVER_URL` | `http://100.72.139.99:9100` | Remote embedding service |
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret (HS256) |
| `LLM_MODEL` | `qwen3-coder:latest` | Default LLM model for tutoring |

---

## Development

### Code Quality

```bash
# Run all checks
make check

# Lint only
make lint
# Backend: ruff check + ruff format + mypy
# Frontend: eslint

# Format
cd apps/api && ruff format .
```

### Database Migrations

```bash
# Apply migrations
make migrate

# Create new migration
make migrate-new msg="add_new_table"

# Reset everything
make reset
```

### Project Scripts

```bash
# Seed Knowledge Graph (16 Python concepts)
python scripts/seed_kg.py

# Seed development data
make seed
```

---

## Testing

```bash
# Run all tests
make test

# Backend tests only
cd apps/api && pytest

# Frontend tests only
cd apps/web && npm run test
```

Tests are organized into:
- `apps/api/tests/unit/` — Unit tests
- `apps/api/tests/integration/` — Integration tests
- `apps/api/tests/e2e/` — End-to-end tests
- `apps/web/tests/components/` — Component tests
- `apps/web/tests/e2e/` — Frontend e2e tests

---

## Database Models

The backend uses 9 SQLAlchemy models with UUID primary keys:

| Model | Description |
|---|---|
| `Institution` | Multi-tenant institution with LTI and LLM config |
| `User` | Faculty/Student with role enum, mastery_map (JSONB) |
| `Course` | Course with gamification level, grading strictness |
| `Assignment` | MCQ, Scenario, Code Lab, Debate, Reverse Essay, Custom |
| `Submission` | Student response with AI grade, appeal status |
| `HintTransaction` | Gold deductions for hint purchases |
| `Badge` | Earned badge records |
| `TutorSession` | Chat session with learning summary and topics |
| `TutorMessage` | Individual messages with role, content, citations |

---

## Security & Compliance

- **JWT Auth** with role-based access control (Faculty / Student)
- **Strict RAG Grounding** — AI never speculates beyond uploaded materials
- **Faculty Approval Gate** — no AI-generated content reaches students without review
- **Appeal Workflow** — students can challenge AI grades with human faculty review
- **Code Sandbox Isolation** — subprocess isolation with timeout and resource limits
- **FERPA/GDPR Ready** — data residency configuration, no student PII used for model training
- **Audit Logging** — every AI decision logged with full prompt, response, and metadata

---

## License

This project is proprietary and confidential. All rights reserved.
