# Handoff — 2026-03-14 UTC

## Agent Identity
- Task: Full-stack Agentic LMS — monorepo, backend, frontend, packages, AI tutor, gamification
- Branch: main

## Completed

### Infrastructure & Setup
- Turborepo monorepo structure with `turbo.json`, root `package.json`, `Makefile`
- `docker-compose.yml` for all local infra: Postgres 16, Valkey 8, Weaviate, Neo4j CE, Keycloak 26, MinIO
- `.env.example` with all required environment variables
- `.gitignore` for the full stack
- All dependencies installed (`pip install -e ".[dev]"`, `npm install`)
- Docker services running (Postgres, Weaviate, Ollama, etc.)
- Alembic migration generated and applied (`initial_schema` + `tutor_sessions`)

### Backend (apps/api/)
- FastAPI app factory (`main.py`) with CORS, lifespan, health endpoint
- `config.py` with pydantic-settings for all env vars
- `database.py` with async SQLAlchemy engine + session factory
- `dependencies.py` with JWT auth (get_current_user, get_current_faculty, get_current_student)
- **9 SQLAlchemy models**: Institution, User, Course, Assignment, Submission, HintTransaction, Badge, TutorSession, TutorMessage
  - All with UUID primary keys, timestamp mixins, proper relationships
  - Enums: UserRole, CourseStatus, GamificationLevel, GradingStrictness, AssignmentType, AssignmentStatus, AppealStatus, HintTier
  - `HintTransaction.assignment_id` is nullable (supports tutor chat hints without assignment context)
- **5 Pydantic schema files**: courses, assignments, submissions, gamification, analytics
- **7 route files**:
  - courses.py (CRUD + upload + ingestion status + knowledge graph)
  - assignments.py (generate, list, get, update, publish)
  - submissions.py (submit with MCQ auto-grading, appeal, AI rationale) — **MCQ auto-grading IMPLEMENTED: awards XP + Gold on correct answer**
  - gamification.py (profile, leaderboard, hint preview/purchase, streak freeze, badges)
  - tutor.py — **FULLY IMPLEMENTED**: WebSocket chat with JWT auth, session persistence, multi-turn conversation, learning summary, hint offers with gold deduction, `buy_hint` handler
  - code_execution.py (sandbox execute — stub)
  - analytics.py (heatmap, summary, at-risk)
- **Service layer**:
  - ingestion: parser.py, chunker.py, embedder.py (stubs)
  - assignments: generator.py (stub), publisher.py (stub)
  - grading: grader.py (stub), appeal.py (stub), feedback.py (stub)
  - gamification: xp_engine.py ✅, gold_engine.py ✅, hint_pricing.py ✅, streaks.py (stub), badges.py (stub — definitions exist, eligibility engine not wired), leaderboard.py (stub)
  - sandbox: executor.py (stub), test_runner.py (stub)
  - analytics: heatmap.py, risk_detector.py
  - **tutor.py** ✅ — session persistence, conversation history (last 20 msgs), learning summary generation via LLM, attempt tracking
- Event system: event_types.py, publisher.py, consumer.py
- Auth middleware with JWT (HS256, secret `change-me-in-production`)

### AI Tutor System (FULLY IMPLEMENTED)
- **DB Models**: `TutorSession` (student_id, course_id, assignment_id, learning_summary, topics_covered, attempt_count) + `TutorMessage` (session_id FK CASCADE, role, content, citations)
- **LangGraph Agent** (packages/agents/agents/tutor/): 5-node graph `resolve_learning_path → retrieve_context → socratic_respond → offer_hint → assess_mastery → END`
  - `resolve_learning_path`: Uses KGClient to load course graph from Neo4j, maps student question to closest concept via LLM, finds current concept based on mastery, checks prerequisites
  - `retrieve_context`: RAG via Weaviate hybrid search (falls back to empty context gracefully)
  - `socratic_respond`: Multi-turn chat with KG context (current concept, mastered count, upcoming), prerequisite blocking (redirects student away from advanced topics with unmet prerequisites)
  - `offer_hint`: Tiered hints (NUDGE=5g, GUIDANCE=15g, SOLUTION=30g) after 3+ attempts
  - `assess_mastery`: LLM judges student understanding (understood/partial/none), returns concept_discussed and understanding_level for mastery update
- **Prompts** (packages/agents/agents/tutor/prompts.py): System prompt with Socratic method rules, KG learning path context, prerequisite enforcement, general knowledge fallback. Per-tier hint prompts. Learning summary prompt. `assess_mastery` prompt (judges understanding level). `identify_concept` prompt (maps question to KG concept).
- **Mastery Tracker** (apps/api/app/services/mastery_tracker.py): Per-concept mastery tracking — `get_mastery_map()`, `update_mastery()`, `find_current_concept()` (walks prerequisite graph), `check_prerequisites_met()`, `get_upcoming_concepts()`. Mastery threshold=70, increments: understood=+25, partial=+10, max=100. Uses JSONB `mastery_map` field on User model.
- **WebSocket Route** (apps/api/app/routes/tutor.py):
  - JWT auth on connect, extracts student_id + institution_id
  - Course lookup fallback when JWT `course_ids` is empty (queries DB by institution_id)
  - `message` handler: loads KG from Neo4j (cached per connection), loads mastery_map → runs agent with all KG fields → updates mastery after exchange → recomputes learning path → sends `learning_path` in `done` message (total_concepts, mastered_count, current_concept, upcoming, mastered, mastery_update)
  - `buy_hint` handler: validates gold balance → deducts gold → creates HintTransaction → generates hint via LLM → sends `hint_purchased` with hint_text/gold_spent/new_balance
  - Error types: `hint_error`, `error`
- **Tutor Service** (apps/api/app/services/tutor.py): `get_or_create_session` (with selectinload fix for async), `build_conversation_history`, `save_message`, `update_learning_summary`, `increment_attempt`
- **LLM**: Ollama at `http://localhost:11434/v1`, tutoring task uses `qwen3-coder:latest` (temp=0.3, max_tokens=2048)

### Gamification System (PARTIALLY IMPLEMENTED)
- **XP Engine** ✅: base XP × score%, hint penalties (-5%/-15%/-30%), 1.5× perfect score, 1.2× streak bonus
- **Gold Engine** ✅: base gold × score%, +25 perfect bonus, +5/streak day (capped +50)
- **Hint Pricing** ✅: NUDGE=5, GUIDANCE=15, SOLUTION=30 Gold
- **MCQ Auto-grading** ✅: Correct answer awards max_xp + max_gold to student (in submissions route)
- **Gold Spending on Hints** ✅: Full buy_hint flow in tutor WebSocket — deducts gold_balance, records HintTransaction, generates hint via LLM
- **Real-time Gold Sync** ✅: TutorChat updates Zustand gamification store on hint purchase so sidebar inventory reflects deduction immediately
- **Badge Definitions** exist (7 badges) but eligibility engine returns `[]` — NOT WIRED
- **Streak Tracking** — stub, always returns zeros
- **Leaderboard** — DB-based query works for `GET /courses/{id}/leaderboard`, but Valkey sorted set integration is stubbed

### Frontend (apps/web/)
- Next.js 14: package.json, tsconfig, next.config, tailwind.config (Tokyo Night theme), postcss
- Custom color palette (brand, gold, xp, streak, accent-purple, accent-cyan)
- **Login page** with role selection (student/faculty), JWT token generation
- **Student Layout** ✅: Sidebar with XP/Gold/Streak inventory panel, level progress bar, navigation links, hydration fix (mounted state gate)
- **Faculty Layout** ✅: Sidebar with navigation, hydration fix (mounted state gate)
- **Student Dashboard** ✅: Full gamification UI — stat pills (XP/Gold/Streak), recent submissions, course cards
- **Student Profile** ✅: Detailed stats grid, battle stats, badge showcase
- **Student Assignments** ✅: Assignment list with submission status
- **Student Leaderboard** ✅: Course leaderboard with rank display
- **Faculty Dashboard** ✅: Full gamification revamp — 10 pages of faculty UI completed
- **Faculty Courses, Assignments, Analytics, Settings** — all pages functional
- **TutorChat Component** ✅: WebSocket chat with typing indicator, streaming responses, learning summary panel, hint offer banners with "Buy for X Gold" button, gold balance indicator, hint_purchased/hint_error message handling, **Learning Path Progress panel** (progress bar, current concept with difficulty indicator, upcoming concepts list, mastery update notifications)
- API client: base client with auth, courses API, assignments API, gamification API
- TypeScript types mirroring all Pydantic schemas
- Zustand stores: auth (persisted via localStorage), gamification (with optimistic updates + spendGold/earnGold/addXP)
- Components: UploadZone, XPBar, GoldBalance, StreakCounter, HintButton, TutorChat

### Bug Fixes Applied
1. **Tutor lazy-load crash**: `session.messages = []` after `db.flush()` caused sync lazy load in async context → fixed by re-fetching with `selectinload`
2. **Null course_id IntegrityError**: JWT always has `course_ids: []` → fixed with DB course lookup by institution_id
3. **Next.js hydration mismatch**: Zustand persisted store returns null during SSR → fixed with `mounted` state gate in both StudentLayout and FacultyLayout
4. **Tutor repeated responses**: History was a text blob in one user prompt → fixed with proper multi-turn chat messages [system, user, assistant, ...]
5. **"ONLY use CONTEXT" with no context**: LLM looped because no Weaviate docs existed → relaxed to "use general knowledge when no materials available"
6. **Gold never spent on hints**: Hint offers were cosmetic text → implemented full purchase flow with gold deduction + HintTransaction + LLM-generated hint
7. **FK violation on hint_transactions.assignment_id**: Was non-nullable but tutor chat hints have no assignment → made nullable + ALTER TABLE
8. **Sidebar gold not updating on hint purchase**: TutorChat only updated local state → now calls `useGamificationStore.getState().spendGold()` for real-time sync

### Bug Fixes & Wiring (2026-03-14)
9. **Mastery 0/28 bug**: `identify_concept` prompt asked LLM to return opaque 16-char hex IDs — LLM hallucinated characters → mastery written under wrong keys. Fixed: LLM now returns concept **name**, code does case-insensitive name→ID lookup with fuzzy substring fallback (`packages/agents/agents/tutor/nodes.py`, `prompts.py`)
10. **`bool("false")` bug in CODE_LAB**: `bool(parsed.get("solves_problem"))` was `True` for string `"false"`. Fixed: `val is True or (isinstance(val, str) and val.lower() == "true")` (`apps/api/app/routes/submissions.py`)
11. **JWT `course_ids` always `[]`**: `_create_token` was hardcoded to empty list. Fixed: now queries DB for faculty's courses or student's institution courses. Made `_create_token` async (`apps/api/app/routes/auth.py`)
12. **XP/Gold engines bypassed for MCQ**: MCQ grading did direct `user.xp_total += max_xp`. Fixed: now uses `calculate_xp()` and `calculate_gold_earned()` with hint penalties and streak bonus
13. **Badges not wired**: `check_badge_eligibility()` existed but was never called. Fixed: called after every submission grading
14. **Streaks not wired**: `update_streak()` existed but was never called. Fixed: called after every submission
15. **Leaderboard Valkey not wired**: `update_leaderboard()` existed but was never called. Fixed: called after every XP-awarding submission

### KG-Guided Structured Learning Path (NEW)
- **Knowledge Graph**: 16 Python concepts across 4 units (Fundamentals, Data Structures, Functions & Modules, OOP) seeded in Neo4j via `scripts/seed_kg.py`
- **Prerequisite Graph**: 17 prerequisite + 3 related edges forming a DAG — students must master prerequisites before accessing advanced topics
- **Prerequisite Blocking**: When student asks about an advanced concept (e.g., Decorators) without mastering prerequisites (e.g., Lambda), tutor redirects to the current concept instead
- **Per-Concept Mastery**: Mastery tracked per concept in JSONB `mastery_map` on User model. Threshold=70 for mastered. Increments: understood=+25, partial=+10
- **Learning Path UI**: TutorChat shows progress bar (mastered/total), current concept with difficulty dots, upcoming concepts, mastery update notifications
- **Graph Walk**: `find_current_concept()` traverses prerequisites to find the first un-mastered concept whose prerequisites are ALL mastered, sorted by unit_number then difficulty
- **TutorState**: Extended with 8 KG fields: `kg_concepts`, `kg_edges`, `mastery_map`, `current_concept`, `upcoming_concepts`, `mastered_concepts`, `concept_discussed`, `understanding_level`

## Completed TODO(agent) Stubs — All 15 Implemented (2026-03-11)

### Gamification (4) ✅
1. `apps/api/app/services/gamification/badges.py` — Badge eligibility engine: queries student profile, existing badges, submissions, hint transactions; checks 7 badge criteria (First Steps, Perseverance, Perfect Score, Streak Master/Legend, Hint-Free, Gold Saver); awards new badges to DB
2. `apps/api/app/services/gamification/streaks.py` — Streak tracking: checks last submission date, increments if yesterday, resets if gap >1 day, updates longest_streak
3. `apps/api/app/services/gamification/leaderboard.py` — Valkey sorted set: `update_leaderboard()` (zadd), `get_leaderboard()` (zrevrange), `get_rank()` (zrevrank, 1-indexed)
4. `apps/api/app/routes/gamification.py` — Dynamic hint pricing: loads assignment's hint_config, counts student attempts via Submission query, calls `calculate_hint_cost()` with dynamic_pricing feature flag

### Grading Pipeline (4) ✅
5. `apps/api/app/services/grading/grader.py` — Full LLM grading: per-criterion evaluation with JSON parsing, 3× consistency check (variance > 0.20 triggers human review), feedback generation, XP/Gold award via engines
6. `packages/agents/agents/grader/nodes.py` — LangGraph grader nodes: `evaluate_criteria` (per-rubric LLM grading), `check_consistency` (3× re-grade, variance check), `generate_feedback` (constructive LLM feedback), uses `task_type="grading"`
7. `apps/api/app/services/grading/feedback.py` — Prescriptive feedback: identifies low-scoring criteria (<60%), maps to KG concepts, generates LLM feedback with fallback
8. `apps/api/app/services/grading/appeal.py` — Appeal workflow: `submit_appeal()` sets PENDING status + publishes event; `review_appeal()` faculty can override grade (recalculates XP/Gold) or uphold

### Code Execution Sandbox (3) ✅
9. `apps/api/app/services/sandbox/executor.py` — Subprocess sandbox: language configs for Python/JS/Java/C++, 30s timeout, output size limit, temp dir isolation, pytest output parsing
10. `apps/api/app/services/sandbox/test_runner.py` — Test runner: writes `solution.py` + `test_solution.py` separately, runs `pytest -v --tb=short --no-header`, parses verbose output with regex `r".*::(\w+)\s+(PASSED|FAILED|ERROR)\b"`
11. `apps/api/app/routes/code_execution.py` — Added `POST /code/run` endpoint (LeetCode-style run without submission) + `RunCodeRequest/Response/RunTestResult` Pydantic models

### Other (4) ✅
12. `apps/api/app/services/assignments/publisher.py` — Validates rubric exists, concept_tags non-empty, status allows publishing; sets PUBLISHED status, emits AssignmentPublished event
13. `packages/llm/llm/cost_tracker.py` — `get_summary()` (by task type, by model), `persist_to_db()` (PostgreSQL), `push_to_valkey()` (real-time metrics); global `cost_tracker` singleton
14. `apps/web/src/components/faculty/UploadZone.tsx` — Wired to `uploadMaterials` API with auth token, click-to-upload, error state, real progress simulation
15. `apps/web/src/components/student/HintButton.tsx` — Calls `purchaseHint` API, updates Zustand gold store on success, proper error handling

### CODE_LAB LeetCode-Style Feature (2026-03-11) ✅
- **Backend**: `POST /code/run` endpoint for running code without submission; CODE_LAB auto-grading in submissions route (70% test pass rate + 30% LLM code quality); LLM `solves_problem` gate — code must solve the stated problem to earn XP/Gold
- **Frontend**: Monaco Editor (dynamic import, vs-dark theme), Run Code / Submit toolbar, tabbed Test Results panel (per-test pass/fail + Console Output), confetti on success, shake on failure
- **Fixed**: `bool("false")` bug — now properly parses LLM `solves_problem` as `val is True or (isinstance(val, str) and val.lower() == "true")`

## GPU Infrastructure Plan (2026-03-12)

### Hardware
- **Server 1** (100.72.139.99): 4× Tesla T4 16GB — Embedding & Reranking
- **Server 2** (100.100.22.88): 4× Tesla T4 16GB — LLM Generation (current dev machine)

### Server 1 — Embedding Server Layout (ACTUAL)
| GPU | Workload | VRAM |
|-----|----------|------|
| T4-0 | Qwen3-VL-Embedding-8B replica 1 (INT8) ✅ DEPLOYED | 14.4GB |
| T4-1 | Available for replica 2 | free |
| T4-2 | llama-server (pre-existing) | 8.5GB |
| T4-3 | Available for replica 3 | free |

- Replaces BGE-M3 (text-only, 1024-dim) with Qwen3-VL-Embedding-8B (multimodal, 4096-dim)
- INT8 via bitsandbytes uses 14.4GB — fits on T4 but tight (no room for replicas on same GPU)
- Served via FastAPI + transformers (TEI doesn't support VL models)
- Exposes `/embed` endpoint (text + image input)
- Tested: 8 texts in 885ms, semantic similarity verified

### Server 2 — Generation Server Layout
| GPU | Workload | VRAM |
|-----|----------|------|
| T4-0,1 | Qwen 2.5-32B (AWQ 4-bit, tensor parallel=2) | ~20GB |
| T4-2,3 | Qwen 2.5-7B × 2 replicas (FP16) | ~14GB each |

- 32B model for high-stakes: grading, feedback, appeals
- 7B replicas for low-latency: tutoring, hints, code quality
- All served via vLLM with task-type routing via LLM Router

### Migration Steps
1. [x] Set up Server 1: Python 3.10 venv, pip, torch 2.5.1+cu121, transformers, bitsandbytes
2. [x] Build embedding microservice: `services/embedding/server.py` — FastAPI wrapping Qwen3-VL-Embedding-8B
3. [x] Deploy on Server 1 GPU 0 with INT8 quantization (bitsandbytes) — 14.4GB VRAM, loaded in 51s
4. [x] Rewire `embedder.py` to call remote `/embed` endpoint via httpx (removed sentence-transformers dependency)
5. [x] Rewire `retriever.py` to call remote `/embed` for query encoding (removed sentence-transformers dependency)
6. [x] Update `config.py` with `embedding_server_url = http://100.72.139.99:9100`, added `extra="ignore"` for env compat
7. [x] Tested: 8-text batch in 885ms, 4096-dim vectors, semantic similarity verified
8. [ ] Deploy replica on GPU 1 + nginx load balancer for throughput
9. [ ] Drop & recreate Weaviate collections (dimension change: 1024 → 4096)
10. [ ] Re-index all course materials with new embeddings
11. [ ] Set up vLLM on Server 2 with tensor parallelism for 32B model
12. [ ] Update LLM Router endpoints to point at local vLLM instances

### Embedding Server Details
- **Location**: `services/embedding/` (server.py, qwen3_vl_embedding.py, requirements.txt)
- **Deployed at**: Server 1 GPU 0, port 9100 (`http://100.72.139.99:9100`)
- **Endpoints**: `POST /embed` (batch text+image), `GET /health`, `GET /info`
- **Model**: Qwen/Qwen3-VL-Embedding-8B, INT8 quantized via bitsandbytes
- **Output dimension**: 4096 (up from 1024 with BGE-M3)
- **Startup cmd**: `CUDA_VISIBLE_DEVICES=0 EMBEDDING_DTYPE=int8 python server.py`
- **Multimodal**: supports `{"text": "...", "image": "url"}` inputs for embedding PDFs with diagrams
- **GPU 2 note**: occupied by llama-server (8.5GB) — do not use

## Known Limitations
- RAG retrieval returns no results (Weaviate has no course materials indexed) — tutor falls back to general knowledge
- Weaviate collection naming convention is `course_{course_id_with_underscores}`

## Key Accounts & Config
- **All data flushed (2026-03-14)**: DB truncated, MinIO cleared, Neo4j wiped, Weaviate wiped, Valkey flushed. Login auto-creates users.
- **JWT Secret**: `change-me-in-production` (HS256)
- **Ollama**: `http://localhost:11434/v1`
- **Neo4j**: `bolt://localhost:7687`, user=neo4j, password=password
- **LLM Model for Tutoring**: `qwen3-coder:latest` (temp=0.3, max_tokens=2048)
- **API**: `http://localhost:8000`, auto-reloads on code changes

## Suggested Next Steps
1. **Deploy GPU infrastructure** — follow Migration Steps above (Server 1: embedding, Server 2: generation)
2. **Upload course materials to Weaviate** — so RAG retrieval returns real context for the tutor
3. **Set up vLLM with tensor parallelism** — Qwen 2.5-32B on Server 2 for high-quality grading
4. **Re-index materials** after embedding model migration (dimension change)


## System Initialization

1. Backend (from apps/api/):
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

2. Frontend (from apps/web/):
npm run dev
Which runs next dev --port 3000 --turbopack.