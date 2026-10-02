# Product Requirements Document: The Agentic Learning Management System

**Document Version:** 1.0  
**Date:** February 17, 2026  
**Status:** Draft  
**Classification:** Confidential  
**Author:** Product Team  
**Stakeholders:** Engineering, Design, Pedagogy, University Partners

---

## Table of Contents

1. [Introduction & Product Vision](#1-introduction--product-vision)
2. [User Personas & Stakeholders](#2-user-personas--stakeholders)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Data Model](#6-data-model)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Security, Privacy & Compliance](#9-security-privacy--compliance)
10. [Release Plan & Milestones](#10-release-plan--milestones)
11. [Success Metrics & KPIs](#11-success-metrics--kpis)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Open Questions](#13-open-questions--decisions-needed)
14. [Glossary](#14-glossary)
15. [Approval & Sign-Off](#15-approval--sign-off)

---

## 1. Introduction & Product Vision

### 1.1 Purpose

This PRD defines the scope, features, architecture, and success criteria for the **Agentic Learning Management System (Agentic LMS)** — a next-generation educational platform that combines the administrative flexibility of traditional LMS platforms (Canvas, Moodle) with the interactive, gamified learning experience of platforms like DataCamp, powered entirely by autonomous AI agents.

### 1.2 Product Vision

> **Empower any university faculty member to transform their raw course materials into a fully interactive, gamified, and intelligently tutored learning experience — without writing a single line of code or designing a single quiz manually.**

### 1.3 Problem Statement

Higher education faces three converging crises that the current LMS ecosystem fails to address:

**Student Disengagement:** Traditional LMS platforms are passive file repositories. Students download PDFs, submit assignments, and wait days for feedback. The "teachable moment" — the cognitive state of struggle and curiosity — is lost. Engagement metrics across universities show declining interaction rates with LMS content.

**Faculty Burnout:** Creating interactive, high-quality assessments is enormously time-consuming. A single branching scenario with adaptive feedback can take 20+ hours to build manually. Grading essays at scale remains a bottleneck that consumes 30–40% of faculty time.

**Platform Lock-In:** Platforms like DataCamp offer excellent interactive learning but only for their own pre-built content. Universities cannot bring their unique curricula, research papers, or pedagogical approaches to these closed platforms.

### 1.4 Target Users

- **Primary:** Mid-to-large universities (5,000+ students) seeking to modernize their digital learning infrastructure
- **Secondary:** Community colleges, online degree programs, and corporate training academies with custom curricula
- **Tertiary:** K–12 school districts piloting AI-enhanced pedagogy (via simplified feature set)

### 1.5 Key Differentiators

| Differentiator | Description |
|---|---|
| **Content Sovereignty** | Faculty upload their own materials; the AI works from those materials exclusively. No vendor lock-in to pre-built curricula. |
| **Autonomous Generation** | Multi-agent AI system auto-generates assignments, rubrics, scenarios, and coding labs from raw uploads. |
| **Gamified Hint Economy** | Loss-aversion-driven hint system with dynamic pricing, turning help-seeking into a metacognitive skill. |
| **Socratic AI Tutoring** | RAG-powered tutor that never gives direct answers; guides students through structured questioning. |
| **Instant AI Grading** | Rubric-anchored, citation-backed assessment with built-in appeal workflow for human oversight. |
| **LTI 1.3 Integration** | Deploys as a tool inside existing Canvas/Moodle ecosystems — no rip-and-replace required. |

---

## 2. User Personas & Stakeholders

### 2.1 Primary Personas

#### Dr. Sarah Chen — Associate Professor of Biology

> *"I want my students to think like scientists, not just memorize facts. But I don't have time to build the experiences that would make that happen."*

- **Goals:** Spend less time creating quizzes and grading papers. Wants students to actively engage with concepts, not passively read slides.
- **Pain Points:** Spends 15+ hours/week grading. Her Moodle quizzes are basic MCQs that students memorize. She has no time to build interactive simulations.
- **Success Looks Like:** Upload her 50-page PDF and have a gamified, interactive module ready for review in under 30 minutes.

#### Marcus Rivera — Sophomore CS Student

> *"DataCamp makes me actually want to practice. Why can't my university courses feel like that?"*

- **Goals:** Learn by doing. Wants immediate feedback on code. Motivated by streaks, XP, and leaderboard competition with peers.
- **Pain Points:** Downloads PDFs from Canvas but rarely reads them end-to-end. Waits 5 days for assignment grades. Finds the LMS "boring and outdated."
- **Success Looks Like:** A mission-based interface with coding challenges, instant feedback, and visible progress through a streak and XP system.

#### Dean Patricia Okafor — Dean of Academic Innovation

> *"I need a solution that faculty will actually adopt — not another tool that collects dust after the pilot."*

- **Goals:** Improve retention and engagement metrics. Demonstrate ROI on EdTech investment. Ensure FERPA compliance.
- **Pain Points:** Existing LMS has poor analytics. Cannot measure "deep learning." Faculty resist new tools that require heavy setup.
- **Success Looks Like:** A platform with measurable engagement uplift, clear analytics dashboards, and near-zero setup friction for faculty.

### 2.2 Secondary Stakeholders

- **Teaching Assistants (TAs):** Benefit from reduced grading load; use AI flagging to focus human review on edge cases.
- **IT Administrators:** Need LTI 1.3 compliance, SSO integration, and clear data governance policies.
- **Institutional Researchers:** Require xAPI/Caliper event streams for learning analytics and accreditation reporting.

---

## 3. Functional Requirements

Requirements are categorized using **MoSCoW prioritization:** Must Have (M), Should Have (S), Could Have (C), Won't Have This Release (W).

### 3.1 FR-100: Content Ingestion & Knowledge Base

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-101 | System shall accept PDF, PPTX, DOCX, MP4, and MP3 uploads from faculty. | M | Sprint 1–2 | Planned |
| FR-102 | System shall extract text from PDFs including OCR for scanned documents and handwritten notes. | M | Sprint 1–2 | Planned |
| FR-103 | System shall transcribe video/audio lectures using Whisper or equivalent ASR. | M | Sprint 2–3 | Planned |
| FR-104 | System shall perform semantic chunking by concept (not by page/time). | M | Sprint 2–3 | Planned |
| FR-105 | System shall construct a Knowledge Graph mapping concept dependencies (prerequisite relationships). | M | Sprint 3–4 | Planned |
| FR-106 | System shall embed chunks into a vector database for semantic retrieval (RAG). | M | Sprint 2–3 | Planned |
| FR-107 | System shall extract and index images, charts, and diagrams from uploads. | S | Sprint 4–5 | Planned |
| FR-108 | Faculty shall preview the generated Knowledge Graph and manually correct/merge nodes. | S | Sprint 5–6 | Planned |

### 3.2 FR-200: Autonomous Assignment Generation

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-201 | Design Agent shall auto-generate MCQ quizzes from ingested content with distractors based on common misconceptions. | M | Sprint 4–5 | Planned |
| FR-202 | Design Agent shall generate branching scenario/simulation assignments grounded in faculty content. | M | Sprint 5–7 | Planned |
| FR-203 | Design Agent shall generate "Fix This Code" assignments with hidden unit tests for CS courses. | M | Sprint 5–7 | Planned |
| FR-204 | Design Agent shall generate "Reverse Assignment" (flawed essay for student to critique). | S | Sprint 7–8 | Planned |
| FR-205 | Design Agent shall generate a "Debate Bot" persona grounded in course perspectives. | S | Sprint 8–9 | Planned |
| FR-206 | Design Agent shall auto-generate a detailed grading rubric for every assignment. | M | Sprint 5–6 | Planned |
| FR-207 | Faculty shall review, edit, and approve all generated assignments before student deployment. | M | Sprint 5–6 | Planned |
| FR-208 | System shall tag each generated question/scenario with the Knowledge Graph concept(s) it tests. | M | Sprint 6–7 | Planned |

### 3.3 FR-300: Socratic AI Tutor

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-301 | Tutor Agent shall answer student questions using ONLY the faculty-uploaded content (strict RAG grounding). | M | Sprint 4–6 | Planned |
| FR-302 | Tutor Agent shall never provide direct answers; it shall use Socratic questioning to guide the student. | M | Sprint 4–6 | Planned |
| FR-303 | Tutor Agent shall cite the specific page/slide/timestamp of the source material in every response. | M | Sprint 5–6 | Planned |
| FR-304 | Tutor Agent shall respond "I don't know based on the course materials" when the answer is not in the knowledge base. | M | Sprint 4–6 | Planned |
| FR-305 | Tutor Agent shall detect student frustration (repeated failures, long pauses) and adjust hint pricing downward. | S | Sprint 8–9 | Planned |
| FR-306 | Tutor Agent shall support conversation history within a session for multi-turn scaffolding. | M | Sprint 5–6 | Planned |

### 3.4 FR-400: Gamification Engine

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-401 | System shall maintain two currency types: XP (non-spendable progress metric) and Gold (spendable economy token). | M | Sprint 3–4 | Planned |
| FR-402 | Hint Button shall deduct Gold from the student's balance. Cost shall be displayed before confirmation. | M | Sprint 5–6 | Planned |
| FR-403 | System shall implement tiered hints: Tier 1 (Nudge, low cost), Tier 2 (Guidance, medium cost), Tier 3 (Solution, high cost). | M | Sprint 5–7 | Planned |
| FR-404 | System shall implement Dynamic Hint Pricing: cost adjusts based on student effort level and current balance. | S | Sprint 8–10 | Planned |
| FR-405 | System shall track and display Learning Streaks with visual streak counter. | M | Sprint 4–5 | Planned |
| FR-406 | System shall offer "Streak Freeze" purchasable with Gold to maintain streak on missed days. | S | Sprint 6–7 | Planned |
| FR-407 | System shall display a class leaderboard ranked by XP (with opt-out for privacy). | M | Sprint 5–6 | Planned |
| FR-408 | Game Agent shall monitor economy health: inject "Bonus Events" if median Gold drops below threshold. | C | Sprint 10+ | Planned |
| FR-409 | System shall award badges for milestones (Perseverance, Perfect Score, Streak Master, Peer Helper). | S | Sprint 6–7 | Planned |
| FR-410 | Faculty shall configure gamification intensity: Off, Low, Medium, High per course. | M | Sprint 5–6 | Planned |

### 3.5 FR-500: AI Assessment & Grading

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-501 | Grading Agent shall evaluate submissions against the auto-generated rubric with per-criterion scores. | M | Sprint 6–8 | Planned |
| FR-502 | Grading Agent shall cite specific evidence from the student's submission to justify each score. | M | Sprint 6–8 | Planned |
| FR-503 | Grading Agent shall run consistency checks: grade same submission 3x, flag if variance > threshold. | S | Sprint 8–9 | Planned |
| FR-504 | System shall provide an "Appeal" button that routes submission + AI rationale to human instructor for review. | M | Sprint 7–8 | Planned |
| FR-505 | Grading Agent shall generate prescriptive feedback: identify knowledge gaps and offer targeted mini-quizzes for bonus XP. | M | Sprint 7–9 | Planned |
| FR-506 | System shall auto-grade code submissions by executing student code against hidden test suites in sandboxed containers. | M | Sprint 6–8 | Planned |
| FR-507 | Tutor Agent shall translate raw compiler errors into pedagogical, beginner-friendly explanations. | S | Sprint 7–8 | Planned |

### 3.6 FR-600: Faculty Dashboard & Course Management

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-601 | Faculty shall drag-and-drop upload course materials with progress indicator and parsing status. | M | Sprint 1–2 | Planned |
| FR-602 | Faculty shall view a "Concept Heatmap" showing which topics students struggle with most. | M | Sprint 7–9 | Planned |
| FR-603 | Faculty shall preview all AI-generated assignments and edit them before publishing. | M | Sprint 5–6 | Planned |
| FR-604 | Faculty shall view aggregate analytics: completion rates, hint usage, average scores, at-risk students. | M | Sprint 8–10 | Planned |
| FR-605 | Faculty shall configure course settings: gamification level, grading strictness, hint availability. | M | Sprint 4–5 | Planned |
| FR-606 | System shall flag "at-risk" students based on engagement patterns and notify faculty. | S | Sprint 9–10 | Planned |

### 3.7 FR-700: Student Dashboard & Mission Interface

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-701 | Student dashboard shall display courses as "Mission Maps" with locked/unlocked module progression. | M | Sprint 5–7 | Planned |
| FR-702 | Student shall view XP, Gold balance, streak count, and badges prominently on the dashboard. | M | Sprint 4–5 | Planned |
| FR-703 | Student shall access the Socratic Tutor via a persistent chat panel within any assignment. | M | Sprint 5–7 | Planned |
| FR-704 | Student shall receive instant feedback after every submission with specific, actionable commentary. | M | Sprint 6–8 | Planned |
| FR-705 | Student shall view a personal "Mastery Map" showing concept-level proficiency from the Knowledge Graph. | S | Sprint 9–10 | Planned |
| FR-706 | Student shall have access to a coding IDE (Monaco Editor) embedded in the platform for code assignments. | M | Sprint 5–7 | Planned |

### 3.8 FR-800: Integration & Interoperability

| ID | Requirement | Priority | Sprint | Status |
|---|---|---|---|---|
| FR-801 | System shall support LTI 1.3 as a Tool Provider for deep linking into Canvas, Moodle, and Blackboard. | M | Sprint 3–5 | Planned |
| FR-802 | System shall support LTI 1.3 Assignment and Grade Services (AGS) for grade passback to host LMS. | M | Sprint 4–6 | Planned |
| FR-803 | System shall emit xAPI/Caliper events (HintAccessed, ScenarioCompleted, GradeAwarded) to institutional LRS. | S | Sprint 7–9 | Planned |
| FR-804 | System shall support SSO via SAML 2.0 and OpenID Connect. | M | Sprint 2–3 | Planned |
| FR-805 | System shall provide a REST API for institutional data integrations. | S | Sprint 8–10 | Planned |

---

## 4. Non-Functional Requirements

| ID | Requirement | Metric | Target |
|---|---|---|---|
| NFR-01 | Tutor Agent response time | P95 latency | < 3 seconds |
| NFR-02 | Grading Agent response time | P95 latency for essay grading | < 15 seconds |
| NFR-03 | Content ingestion speed | Time to ingest a 100-page PDF | < 5 minutes |
| NFR-04 | Concurrent users | Simultaneous active students per tenant | 10,000 |
| NFR-05 | System uptime | Monthly availability SLA | 99.9% |
| NFR-06 | Data residency | Student data storage location | Configurable per institution (US/EU) |
| NFR-07 | Hallucination rate | % of tutor/grader responses without RAG grounding | < 2% |
| NFR-08 | Grading consistency | Inter-rater reliability (AI vs. AI re-grade) | Cohen's κ > 0.85 |
| NFR-09 | Code sandbox isolation | Container escape prevention | gVisor/Firecracker isolation |
| NFR-10 | Accessibility | WCAG compliance level | WCAG 2.1 AA |
| NFR-11 | Browser support | Supported browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-12 | Mobile responsiveness | Lighthouse mobile usability score | > 90 |

---

## 5. System Architecture

### 5.1 High-Level Architecture

The Agentic LMS is built as a modular, microservices-based platform with a Multi-Agent System (MAS) orchestration layer. The architecture separates concerns into five tiers:

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
│   LLM Inference (GPT-4o / Claude Sonnet / Llama 3)                 │
│   Weaviate (Vector DB) │ Neo4j (Knowledge Graph)                    │
├─────────────────────────────────────────────────────────────────────┤
│                  DATA & INFRASTRUCTURE TIER                         │
│   PostgreSQL 16 │ Redis 7 │ S3/GCS │ Firecracker (Sandbox)         │
│   Kubernetes │ Keycloak (Auth) │ Prometheus + Grafana               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Multi-Agent System Design

Each agent operates as an independent, stateless microservice orchestrated by LangGraph. Agents communicate via a shared state graph and event bus.

| Agent | Trigger | Inputs | Outputs | LLM Config |
|---|---|---|---|---|
| **Ingestion** | Faculty upload event | Raw files (PDF, PPTX, MP4) | Vector index, Knowledge Graph | GPT-4o Vision (multimodal) |
| **Designer** | Ingestion complete + faculty config | Knowledge Graph, learning objectives, gamification settings | Assignments, rubrics, scenarios | Claude Sonnet (creative temp: 0.8) |
| **Tutor** | Student query (real-time) | Student message, conversation history, vector context | Socratic response, hint offer | GPT-4o-mini (low latency, temp: 0.3) |
| **Grader** | Student submission event | Submission text/code, rubric, source material | Grade, evidence citations, feedback, remediation quiz | Claude Sonnet (strict temp: 0.1) |
| **Game** | Score event, hint request, login | Student profile, transaction request | XP/Gold updates, badge awards, economy adjustments | Rule engine (no LLM) |
| **Analytics** | Scheduled + on-demand | All event streams | Heatmaps, at-risk flags, reports | Aggregation pipeline (no LLM) |

### 5.3 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 + React 18 + Tailwind CSS | SSR for performance, React ecosystem, rapid UI dev |
| Code Editor | Monaco Editor (VS Code engine) | Industry-standard code editing with IntelliSense |
| API Layer | FastAPI (Python) + WebSocket | Async-native, auto-docs, LangChain/LangGraph compatible |
| Agent Orchestration | LangGraph + LangChain | Stateful multi-agent workflows with checkpointing |
| Primary LLM | GPT-4o / Claude 3.5 Sonnet (configurable) | Model-agnostic; best-in-class reasoning for grading/design |
| Fast LLM | GPT-4o-mini / Llama 3 8B | Low-latency tutor responses at reduced cost |
| Vector DB | Weaviate (self-hosted) or Pinecone | Hybrid search (dense + sparse), multi-tenant support |
| Graph DB | Neo4j | Knowledge Graph storage and traversal |
| Primary DB | PostgreSQL 16 | ACID transactions, JSONB for flexible schemas |
| Cache | Redis 7 | Session management, real-time leaderboards, rate limiting |
| Object Storage | AWS S3 / GCS | Faculty uploads, generated assets |
| Code Sandbox | Firecracker microVMs on Kubernetes | Secure, isolated code execution per student |
| CI/CD | GitHub Actions + ArgoCD | GitOps deployment with automated testing |
| Monitoring | Prometheus + Grafana + Sentry | Metrics, dashboards, error tracking |
| Auth | Keycloak | SAML 2.0, OIDC, RBAC for multi-tenant institutions |

### 5.4 Key Architecture Decisions

**ADR-001: Model-Agnostic LLM Layer.** The system abstracts all LLM calls behind a unified interface. This allows institutions to choose their provider (OpenAI, Anthropic, self-hosted) and enables cost optimization by routing simple tasks to cheaper models.

**ADR-002: LangGraph over Raw LangChain.** LangGraph provides stateful, graph-based agent orchestration with built-in checkpointing. This is critical for multi-step workflows like "Ingest → Generate → Review → Publish" where failures at any step must be recoverable.

**ADR-003: Firecracker over Docker for Code Sandbox.** Docker containers share the host kernel, creating potential escape vectors. Firecracker microVMs provide hardware-level isolation in <125ms boot time, making them suitable for per-student sandboxed execution.

**ADR-004: Knowledge Graph + Vector DB (Dual Store).** The Knowledge Graph (Neo4j) captures structural relationships between concepts (prerequisites, dependencies). The Vector DB (Weaviate) enables semantic search for RAG retrieval. Both are required — the graph for curriculum sequencing, the vectors for tutoring context.

---

## 6. Data Model

### 6.1 Core Entities

#### Institution

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique institution identifier |
| `name` | VARCHAR(255) | Institution display name |
| `lti_config` | JSONB | LTI 1.3 platform registration details |
| `data_residency` | ENUM | `US_EAST`, `US_WEST`, `EU_WEST`, `AP_SOUTHEAST` |
| `llm_config` | JSONB | Preferred LLM provider and API keys (encrypted at rest) |
| `created_at` | TIMESTAMP | Record creation time |

#### Course

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique course identifier |
| `institution_id` | UUID (FK) | Parent institution |
| `faculty_id` | UUID (FK) | Owning faculty member |
| `title` | VARCHAR(255) | Course title |
| `gamification_level` | ENUM | `OFF`, `LOW`, `MEDIUM`, `HIGH` |
| `grading_strictness` | ENUM | `LENIENT`, `MEDIUM`, `STRICT` |
| `knowledge_graph_id` | UUID (FK) | Reference to Neo4j graph |
| `vector_collection` | VARCHAR(128) | Weaviate/Pinecone collection name |
| `status` | ENUM | `SETUP`, `ACTIVE`, `ARCHIVED` |

#### Student Profile

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique student identifier |
| `institution_id` | UUID (FK) | Parent institution |
| `xp_total` | INTEGER | Cumulative XP (non-spendable) |
| `gold_balance` | INTEGER | Current spendable Gold |
| `current_streak` | INTEGER | Consecutive active days |
| `longest_streak` | INTEGER | All-time longest streak |
| `badges` | JSONB | Array of earned badge objects |
| `mastery_map` | JSONB | Concept-level proficiency scores (references Knowledge Graph node IDs) |

#### Assignment

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique assignment identifier |
| `course_id` | UUID (FK) | Parent course |
| `type` | ENUM | `MCQ`, `SCENARIO`, `CODE_LAB`, `DEBATE`, `REVERSE_ESSAY`, `CUSTOM` |
| `generated_by` | ENUM | `AI_AGENT`, `FACULTY_MANUAL` |
| `status` | ENUM | `DRAFT`, `FACULTY_REVIEW`, `PUBLISHED`, `ARCHIVED` |
| `rubric` | JSONB | Auto-generated or manually edited grading rubric |
| `concept_tags` | UUID[] | Knowledge Graph concept node IDs tested by this assignment |
| `hint_config` | JSONB | `{ tier1_cost, tier2_cost, tier3_cost, dynamic_pricing_enabled }` |
| `max_xp` | INTEGER | Maximum XP awardable |
| `max_gold` | INTEGER | Maximum Gold awardable |
| `prerequisite_concepts` | UUID[] | Concepts that must be mastered before this assignment unlocks |

#### Submission

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique submission identifier |
| `assignment_id` | UUID (FK) | Parent assignment |
| `student_id` | UUID (FK) | Submitting student |
| `content` | TEXT / JSONB | Student response (text, code, or scenario choice tree) |
| `ai_grade` | JSONB | `{ overall_score, criteria: [{ name, score, max, evidence }] }` |
| `human_override` | JSONB | Faculty override grade and rationale (if appealed) |
| `hints_used` | JSONB | Array of `{ tier, cost, timestamp, hint_text }` |
| `xp_awarded` | INTEGER | Final XP after hint deductions |
| `gold_awarded` | INTEGER | Final Gold earned |
| `feedback` | TEXT | AI-generated prescriptive feedback |
| `appeal_status` | ENUM | `NONE`, `PENDING`, `REVIEWED`, `OVERTURNED` |
| `submitted_at` | TIMESTAMP | Submission time |

#### Hint Transaction

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Transaction ID |
| `student_id` | UUID (FK) | Student who purchased the hint |
| `assignment_id` | UUID (FK) | Assignment context |
| `tier` | ENUM | `NUDGE`, `GUIDANCE`, `SOLUTION` |
| `gold_cost` | INTEGER | Gold deducted |
| `hint_text` | TEXT | The hint content delivered |
| `dynamic_price_applied` | BOOLEAN | Whether dynamic pricing adjusted the cost |
| `student_attempt_count` | INTEGER | Number of attempts before hint was requested |
| `created_at` | TIMESTAMP | Transaction time |

---

## 7. API Specifications

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header. Full OpenAPI 3.0 specification is maintained in the engineering repository.

### 7.1 Content & Ingestion

| Method | Endpoint | Auth Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/courses/{id}/upload` | Faculty | Upload course materials; triggers Ingestion Agent |
| `GET` | `/api/v1/courses/{id}/ingestion-status` | Faculty | Poll ingestion progress (parsing, chunking, embedding, graph) |
| `GET` | `/api/v1/courses/{id}/knowledge-graph` | Faculty | Retrieve the generated Knowledge Graph (nodes + edges) |
| `PATCH` | `/api/v1/courses/{id}/knowledge-graph/nodes/{nodeId}` | Faculty | Edit, merge, or delete Knowledge Graph nodes |

### 7.2 Assignments

| Method | Endpoint | Auth Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/courses/{id}/generate-assignments` | Faculty | Trigger Design Agent to generate assignment proposals |
| `GET` | `/api/v1/courses/{id}/assignments` | Faculty / Student | List assignments (students see only `PUBLISHED`) |
| `GET` | `/api/v1/assignments/{id}` | Faculty / Student | Get assignment details including rubric and hint config |
| `PATCH` | `/api/v1/assignments/{id}` | Faculty | Edit assignment content, rubric, or hint configuration |
| `POST` | `/api/v1/assignments/{id}/publish` | Faculty | Publish assignment to student dashboard |

### 7.3 Student Interaction

| Method | Endpoint | Auth Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/assignments/{id}/submit` | Student | Submit assignment response; triggers Grader Agent |
| `GET` | `/api/v1/assignments/{id}/hint/preview` | Student | Preview hint cost for current tier without purchasing |
| `POST` | `/api/v1/assignments/{id}/hint` | Student | Purchase and receive a hint; deducts Gold |
| `POST` | `/api/v1/tutor/chat` | Student | Send message to Socratic Tutor (WebSocket upgrade: `ws://`) |
| `POST` | `/api/v1/submissions/{id}/appeal` | Student | Appeal an AI grade; routes to faculty review queue |
| `POST` | `/api/v1/code/execute` | Student | Execute code in sandboxed container; returns stdout/stderr + test results |

### 7.4 Gamification

| Method | Endpoint | Auth Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/students/me/profile` | Student | Get XP, Gold, streak, badges, mastery map |
| `GET` | `/api/v1/courses/{id}/leaderboard` | Student | Get class leaderboard (XP-ranked, paginated) |
| `POST` | `/api/v1/students/me/streak-freeze` | Student | Purchase streak freeze with Gold |
| `GET` | `/api/v1/students/me/badges` | Student | List all earned and available badges |

### 7.5 Faculty Analytics

| Method | Endpoint | Auth Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/courses/{id}/analytics/heatmap` | Faculty | Concept Heatmap (students × concepts × mastery) |
| `GET` | `/api/v1/courses/{id}/analytics/summary` | Faculty | Aggregate KPIs (completion, hint usage, avg scores) |
| `GET` | `/api/v1/courses/{id}/analytics/at-risk` | Faculty | List of students flagged as at-risk with reasoning |
| `GET` | `/api/v1/submissions/{id}/ai-rationale` | Faculty | Full AI grading rationale for appeal review |

---

## 8. UI/UX Specifications

### 8.1 Design Principles

**Progressive Disclosure:** Show complexity only when needed. The faculty dashboard starts as a simple upload box and reveals configuration panels as materials are ingested.

**Game-First, Not Game-Only:** Gamification elements enhance learning, never obstruct it. Every gamified element (XP, Gold, leaderboard, streaks) has a per-course "off" switch controlled by faculty.

**Anxiety-Free AI:** AI actions are always transparent. Students must always know they're interacting with AI. Faculty must always have override control. No AI-generated content reaches students without faculty approval.

**Accessibility First:** WCAG 2.1 AA compliance. Full keyboard navigation. Screen reader compatibility. Colorblind-safe palettes. High-contrast mode toggle.

### 8.2 Key Screens

#### Faculty: Course Setup Wizard

A three-step wizard:

1. **Upload Materials** — Drag-and-drop zone accepting PDF, PPTX, DOCX, MP4, MP3. Real-time progress bar showing: Parsing → Chunking → Embedding → Graph Building. Estimated time remaining.
2. **Configure** — Gamification intensity slider (Off → Low → Medium → High). Grading strictness selector (Lenient / Medium / Strict). Toggle switches for: Hints enabled, Leaderboard visible, Streak tracking active.
3. **Review & Publish** — Card-based gallery of AI-generated assignments. Each card shows: assignment type icon, title, tested concepts (tags), estimated difficulty. Inline "Edit" and "Approve / Reject" actions. Bulk approve option.

#### Faculty: Analytics Dashboard

- **Top row:** KPI cards — Active Students, Average Score, Hint Usage Rate, At-Risk Count
- **Center:** Concept Heatmap — Matrix of students × concepts, cells color-coded by mastery level (red → yellow → green)
- **Bottom:** Sortable student table with columns: Name, XP, Completion %, Hints Used, Risk Flag. Click to drill down into individual student performance timeline.

#### Student: Mission Map

Vertically scrolling map with nodes representing modules/assignments. Visual states: Completed (green glow) → Current (pulsing animation) → Locked (grayed, lock icon). Persistent top bar: XP progress bar, Gold coin balance, streak flame counter, notification bell. Tap any completed node to review feedback and retry for bonus XP.

#### Student: Assignment View

Split-pane layout:
- **Left panel:** Assignment prompt — scenario text, code challenge, debate interface, or essay prompt
- **Right panel:** Source material excerpt from the faculty PDF, relevant to the current task (collapsible)
- **Bottom-right:** Hint button with Gold cost badge. Tap to preview cost → confirm → receive tiered hint
- **Submit action:** Triggers inline feedback panel that slides up from the bottom with grade, per-criterion breakdown, and "Next Steps" recommendations

#### Student: Code Lab

- Full-width Monaco Editor with syntax highlighting and IntelliSense
- File explorer sidebar (for multi-file assignments)
- Terminal output panel at bottom
- "Run" button executes code in Firecracker sandbox
- Test results panel: green ✓ / red ✗ per test case
- AI error translation: inline tooltips on error lines with friendly explanations

---

## 9. Security, Privacy & Compliance

### 9.1 Regulatory Compliance

| Regulation | Compliance Strategy |
|---|---|
| **FERPA** | All student data stored in institution-owned tenant. No student PII used for LLM model training. Data deletion on student/institution request. Audit logs for all data access. |
| **GDPR** | Data residency configurable per institution (EU regions available). Right to erasure fully supported. Consent management UI for analytics tracking. Data Processing Agreements with all sub-processors. |
| **COPPA** | K–12 deployment requires parental consent workflows. Student-facing AI interactions logged and auditable. Age-gated features. |
| **SOC 2 Type II** | Target certification within 12 months of GA. Annual penetration testing. Encrypted data at rest (AES-256) and in transit (TLS 1.3). |

### 9.2 AI-Specific Safety

**Strict RAG Grounding:** All tutor and grader agents operate with system prompts that enforce context-only responses. System prompt includes: *"Answer ONLY using the provided context. If the answer is not in the context, respond: 'I don't know based on the course materials.' Never speculate or use external knowledge."*

**Citation Enforcement:** Every AI response must include at least one citation referencing `{document_name}, page {X}` or `{lecture_title}, timestamp {MM:SS}`. Responses without citations are blocked by the output validation layer.

**Content Filtering:** All AI outputs pass through a safety filter before reaching students. Filters detect and block harmful, biased, sexually explicit, or off-topic content.

**Audit Logging:** Every AI decision (grade awarded, hint generated, tutor response) is logged with: full prompt sent to LLM, model name and version, raw response, confidence score, latency, and token count. Logs retained for 7 years per FERPA requirements.

**Human Override:** Faculty can override any AI decision at any time. The Appeal workflow is a first-class feature, not an afterthought. Override actions are logged with faculty rationale.

**Model Isolation:** Student data never leaves the institution's private cloud tenant. Supported deployment modes: Azure OpenAI Service (private endpoint), AWS Bedrock (VPC), or self-hosted models (vLLM on institution infrastructure).

---

## 10. Release Plan & Milestones

### 10.1 Phased Delivery

| Phase | Timeline | Scope | Exit Criteria |
|---|---|---|---|
| **Alpha** | Months 1–4 | Content ingestion, basic MCQ generation, hint economy (static pricing), code sandbox MVP, faculty upload/review workflow | 3 faculty pilot users, 50 students, core pipeline functional |
| **Beta** | Months 5–8 | Scenario generation, Socratic tutor, AI grading with appeal, LTI 1.3 Canvas integration, leaderboard, streak tracking | 1 university pilot (500+ students), < 5% hallucination rate |
| **GA v1.0** | Months 9–12 | Dynamic hint pricing, debate bot, faculty analytics dashboard, xAPI events, mobile responsiveness, Concept Heatmap | 3 university partners, 99.9% uptime, SOC 2 audit initiated |
| **v1.5** | Months 13–18 | Economy auto-balancing, Moodle/Blackboard LTI, advanced analytics, multi-language support, peer review Gold rewards | 10 institutions, 50,000+ student accounts |

### 10.2 Sprint Breakdown (Alpha Phase)

| Sprint | Deliverables |
|---|---|
| **Sprint 1–2** | File upload pipeline, PDF/PPTX/DOCX parsing, OCR integration, basic text extraction, user authentication (Keycloak), project scaffold, CI/CD pipeline |
| **Sprint 3–4** | Semantic chunking engine, vector embedding pipeline (Weaviate), Knowledge Graph MVP (Neo4j), XP/Gold data model and APIs, LTI 1.3 platform registration |
| **Sprint 5–6** | MCQ generation agent, rubric auto-synthesis, static hint economy (3 tiers), faculty review/approve workflow, student dashboard MVP with mission map |
| **Sprint 7–8** | Code sandbox (Firecracker), code assignment generation, auto-grading with hidden test suites, compiler error translation, basic Socratic tutor with RAG |

### 10.3 Dependencies & Prerequisites

- Cloud infrastructure provisioned (AWS/Azure/GCP) by Week 1
- LLM API access agreements signed (OpenAI and/or Anthropic) by Week 1
- University partner MOU signed for pilot by Month 2
- Design system and component library established by Sprint 2
- LTI 1.3 developer sandbox access from Canvas by Sprint 3

---

## 11. Success Metrics & KPIs

### 11.1 Product Metrics

| Metric | Definition | Target (GA) |
|---|---|---|
| Faculty Adoption Rate | % of pilot faculty who publish ≥ 1 AI-generated assignment | ≥ 80% |
| Time-to-First-Assignment | Time from first upload to first published assignment | < 30 minutes |
| Student DAU/MAU | Daily active / Monthly active student ratio | ≥ 0.40 |
| Assignment Completion Rate | % of started assignments that are submitted | ≥ 75% |
| Hint-to-Retry Ratio | % of students who retry before buying a hint | ≥ 60% |
| Average Streak Length | Mean consecutive active days per student | ≥ 5 days |
| AI Grading Acceptance | % of AI grades not appealed by students | ≥ 92% |
| Appeal Overturn Rate | % of appeals where faculty changes the AI grade | < 15% |
| NPS (Faculty) | Net Promoter Score from faculty surveys | ≥ 50 |
| NPS (Student) | Net Promoter Score from student surveys | ≥ 40 |

### 11.2 Technical Metrics

| Metric | Definition | Target |
|---|---|---|
| Hallucination Rate | % of tutor/grader responses not grounded in source material | < 2% |
| Tutor Latency (P95) | 95th percentile response time for tutor chat | < 3 seconds |
| Grading Latency (P95) | 95th percentile time for AI essay grading | < 15 seconds |
| System Uptime | Monthly availability | 99.9% |
| Code Sandbox Boot Time | Time to provision a student code container | < 2 seconds |
| Ingestion Throughput | Pages processed per minute | ≥ 20 pages/min |
| Vector Search Latency | P95 for RAG retrieval queries | < 200ms |

### 11.3 Business Metrics

| Metric | Definition | Target (Year 1) |
|---|---|---|
| Institutions Onboarded | Paying institutional customers | ≥ 3 (GA), ≥ 10 (v1.5) |
| Student Accounts | Total registered student accounts | ≥ 50,000 |
| Revenue | Annual recurring revenue | TBD (pending pricing model decision — see OQ-02) |
| LTV:CAC Ratio | Customer lifetime value to acquisition cost | ≥ 3:1 |

---

## 12. Risks & Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | AI hallucination in tutoring or grading | Medium | Critical | Strict RAG grounding, citation requirements, hallucination detection pipeline, mandatory faculty review for grading |
| R-02 | Faculty resistance to AI-generated content | High | High | Faculty retains full approval authority. "Orchestrator, not replaced" messaging. Gradual rollout with faculty champions. |
| R-03 | LLM cost overruns at scale | Medium | High | Model-agnostic design allows cost optimization. Smaller models for high-volume tasks. Token budgets per course. Caching for repeated queries. |
| R-04 | Student gaming of the XP/Gold economy | Medium | Medium | Game Agent monitors anomalous patterns (rapid hint buying, XP farming). Rate limits on hint purchases. Periodic economy rebalancing. |
| R-05 | Code sandbox security breach | Low | Critical | Firecracker microVMs with no network access. CPU/memory/time resource limits. No persistent storage between executions. |
| R-06 | FERPA/GDPR violation via AI data leakage | Low | Critical | Private cloud tenants per institution. No student data used for model training. Data Processing Agreements with all LLM providers. Regular compliance audits. |
| R-07 | Poor quality of auto-generated assignments | Medium | High | Mandatory faculty review gate (nothing reaches students without approval). Quality scoring pipeline with automated checks. Feedback loop from student performance data to improve generation. |
| R-08 | Vendor lock-in to specific LLM provider | Medium | Medium | Model-agnostic abstraction layer. Standardized prompt templates. Support for self-hosted models (vLLM). Regular benchmarking across providers. |
| R-09 | Student over-reliance on AI tutor | Medium | Medium | Tutor usage limits per assignment. Progressive hint cost increase within a session. Analytics flagging students who use tutor >3x per question. |
| R-10 | Knowledge Graph quality varies by content type | Medium | High | Quality thresholds before assignment generation is allowed. Faculty review of graph nodes. Specialized parsing pipelines for visual-heavy content (diagrams, equations). |

---

## 13. Open Questions & Decisions Needed

| ID | Question | Owner | Due Date |
|---|---|---|---|
| OQ-01 | Should gamification elements (XP, Gold, streaks) factor into the official course grade, or remain separate as engagement metrics only? | Product + Pedagogy | Sprint 3 |
| OQ-02 | What is the pricing model? Per-student, per-institution flat fee, or usage-based (LLM tokens consumed)? | Business | Sprint 4 |
| OQ-03 | Should students be able to earn Gold by peer-reviewing classmates' work? What quality controls are needed? | Product + Pedagogy | Sprint 6 |
| OQ-04 | What is the minimum viable Knowledge Graph quality threshold before assignments can be generated? How is quality measured? | Engineering + ML | Sprint 3 |
| OQ-05 | How do we handle courses with primarily visual/diagrammatic content (e.g., Anatomy, Architecture, Circuit Design)? | Engineering + ML | Sprint 4 |
| OQ-06 | Should we support real-time multiplayer scenarios (e.g., two students debating each other with AI moderation)? | Product | v1.5 planning |
| OQ-07 | What's the fallback UX when the LLM provider experiences an outage? Cached responses? Graceful degradation? | Engineering | Sprint 5 |
| OQ-08 | How should the system handle multi-language courses (e.g., faculty uploads in Hindi, students interact in English)? | Engineering + ML | v1.5 planning |
| OQ-09 | Should we offer a "faculty co-pilot" mode where the AI suggests improvements to faculty-authored (non-AI-generated) assignments? | Product | Beta planning |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Agentic AI** | AI systems capable of autonomous reasoning, planning, and multi-step execution without continuous human prompting. |
| **RAG** | Retrieval-Augmented Generation — a technique where an LLM retrieves relevant context from a knowledge base before generating a response, reducing hallucination. |
| **Knowledge Graph** | A graph database mapping relationships between concepts (e.g., "Mitochondria" `is-part-of` "Cell Biology", "Cell Biology" `is-prerequisite-for` "Cellular Respiration"). |
| **LTI 1.3** | Learning Tools Interoperability — an IMS Global standard for securely integrating third-party tools into LMS platforms like Canvas, Moodle, and Blackboard. |
| **xAPI / Caliper** | Learning analytics standards for tracking and reporting student learning activities in a standardized format to a Learning Record Store (LRS). |
| **MAS** | Multi-Agent System — an architecture where multiple specialized AI agents collaborate, each with distinct roles, tools, and permissions. |
| **XP** | Experience Points — a non-spendable metric tracking cumulative student progress. Used for leaderboard ranking. |
| **Gold** | A spendable in-platform currency earned through streaks, perfect scores, and peer help. Used to purchase hints, streak freezes, and cosmetic items. |
| **Socratic Questioning** | A pedagogical method where the tutor asks guiding questions rather than providing direct answers, promoting critical thinking and self-discovery. |
| **Hint Penalty** | A game mechanic where requesting a hint costs the student Gold, leveraging loss aversion to trigger metacognitive evaluation of whether help is truly needed. |
| **Dynamic Hint Pricing** | An adaptive system where hint costs adjust based on the student's effort level (attempts made) and current Gold balance, preventing both free-riding and frustration. |
| **FERPA** | Family Educational Rights and Privacy Act — US federal law protecting the privacy of student education records. |
| **GDPR** | General Data Protection Regulation — EU regulation governing personal data protection and privacy. |
| **Firecracker** | An open-source microVM technology (developed by AWS) that provides hardware-level isolation with <125ms boot times, used for secure code execution sandboxes. |
| **LRS** | Learning Record Store — a data store that receives, stores, and returns learning activity statements (xAPI/Caliper) for analytics and reporting. |

---

## 15. Approval & Sign-Off

By signing below, stakeholders confirm they have reviewed this PRD and approve the described scope, priorities, and architecture for development.

| Name & Title | Role | Signature | Date |
|---|---|---|---|
| | Product Owner | | |
| | Engineering Lead | | |
| | Design Lead | | |
| | Pedagogy Advisor | | |
| | University Partner Rep | | |

---

*This document is a living artifact and will be updated as decisions are made and requirements evolve. All changes will be tracked in the Revision History table.*