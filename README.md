# EZ-Event-BOT

**Conversational RSVP Agent for Events via Telegram**
---

> **Master's Degree Final Project — Computer Science**
> The Open University of Israel
> Student: Israel Heiblum

---

![Image](https://github.com/user-attachments/assets/8e21339b-f56b-4764-bc9e-8819e2e5e7ea)

## Abstract

EZ-Event-BOT is an intelligent RSVP agent that allows event organizers to manage guest responses through personalized Telegram conversations. Guests receive unique deep links and interact with the bot in free-text Hebrew or English. The system interprets natural-language responses using a hybrid NLP pipeline — a rule-based Hebrew parser with an Anthropic Claude Haiku 4.5 LLM fallback — and manages multi-turn conversations via a compiled **LangGraph state graph** built on a hexagonal (ports & adapters) architecture. RSVP state is persisted in MongoDB and managed through an admin web dashboard built with Vue 3.

The project demonstrates the integration of **conversational AI**, **agent-based architectures**, **stateful dialogue management**, **NLP for non-English (Hebrew) text**, and **full-stack software engineering** principles.

---

## System Overview

```
Event Organizer                    Guests (Telegram)
      │                                   │
      ▼                                   ▼
┌─────────────────┐           ┌───────────────────────┐
│  Admin Web      │           │  Telegram Bot          │
│  Dashboard      │           │  (Telegraf)            │
│  (Vue 3)        │           │                        │
└────────┬────────┘           └───────────┬────────────┘
         │ REST API                       │ free-text messages
         ▼                               ▼
┌─────────────────────────────────────────────────────┐
│                   bot-service (Node.js 22)           │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           LangGraph RSVP Agent               │   │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │  NLU     │→ │  Business  │→ │  NLG     │  │   │
│  │  │  Pipeline│  │  Logic     │  │  Pipeline│  │   │
│  │  └──────────┘  └────────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                        │                            │
│                        ▼                            │
│               ┌─────────────────┐                   │
│               │    MongoDB      │                   │
│               │ Campaigns/Guests│                   │
│               └─────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

---

## Key Technical Contributions

### 1. Hybrid NLP Pipeline for Hebrew

A two-stage interpretation pipeline processes guest messages:

- **Rule-based interpreter** (`~630 lines`): Hebrew text normalization (niqqud stripping, morphological prefix stripping), keyword matching (YES/NO/MAYBE), a 14-step headcount extraction priority chain, and Levenshtein fuzzy matching with context-word gating.
- **LLM fallback** (Anthropic Claude Haiku 4.5): Invoked when rule-based confidence falls below the configurable threshold (default: 0.85). Returns structured JSON validated via Zod with regex extraction fallback.

### 2. LangGraph Stateful Agent

The RSVP conversation is orchestrated by a compiled LangGraph state graph with 5 nodes and conditional routing:

```
START → routeByState
  DEFAULT               → interpretFull → decideAction → composeReply → buildEffects → END
  YES_AWAITING_HEADCOUNT → interpretHeadcount
                              ├─ exact & !fuzzy → decideAction → ...
                              └─ else           → interpretFull → ...
```

All business logic is isolated in `decideAction` — a **pure synchronous function** with no side effects, independently unit-tested.

### 3. Hexagonal Architecture (Ports & Adapters)

The domain layer (`domain/rsvp-graph/`) is completely isolated from all infrastructure concerns. It depends only on port interfaces (`NluPort`, `NlgPort`, `ClockPort`, `LoggerPort`) and has **zero imports** from Telegraf, Mongoose, or any infrastructure module.

### 4. Sparse EffectsPatch Pattern

Database writes use a sparse patch object — only fields that are explicitly set are written to MongoDB, preserving semantic correctness of timestamps such as `rsvpUpdatedAt` (updated only on actual RSVP change) vs. `lastResponseAt` (updated on every message).

---

## Technology Stack

| Layer                      | Technology                                               |
| -------------------------- | -------------------------------------------------------- |
| Backend runtime            | Node.js 22+, TypeScript 5.3+ strict ESM                  |
| Bot framework              | Telegraf 4.x                                             |
| Agent / conversation graph | LangGraph (`@langchain/langgraph`)                       |
| HTTP API                   | Express.js                                               |
| Database                   | MongoDB 7 via Mongoose ODM                               |
| LLM                        | Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)     |
| Input validation           | Zod                                                      |
| Logging                    | Pino (structured JSON)                                   |
| Frontend                   | Vue 3, Vite, Tailwind CSS 4, Pinia, Vue Router, vue-i18n |
| Tests                      | Node.js built-in `node:test`                             |

---

## Repository Structure

```
EZ-Event-BOT/
├── apps/
│   ├── bot-service/              ← Backend (Express + Telegraf + LangGraph)
│   │   └── src/
│   │       ├── domain/           ← Pure business logic (hexagonal core)
│   │       │   ├── rsvp-graph/   ← LangGraph agent (isolated from all infra)
│   │       │   └── campaigns/    ← Mongoose models & services
│   │       ├── bot/              ← Telegraf handlers + NLU/NLG adapters
│   │       ├── http/             ← Express routes + REST API
│   │       └── infra/            ← Anthropic LLM client
│   └── admin-web/                ← Frontend admin dashboard (Vue 3 + Vite)
│       └── src/
│           ├── views/            ← Campaign management views
│           ├── components/       ← UI component library
│           ├── stores/           ← Pinia state management
│           └── i18n/             ← Hebrew / English translations
├── packages/
│   └── shared/                   ← Shared workspace (placeholder)
├── docs/                         ← Full project documentation
│   ├── README.md                 ← Documentation index
│   ├── 01-system-architecture.md
│   ├── 02-database-models.md
│   ├── 03-rsvp-lifecycle.md
│   ├── 04-nlu-pipeline.md
│   ├── 05-langgraph-agent.md
│   ├── 06-api-reference.md
│   ├── 07-admin-web.md
│   ├── 08-setup-installation.md
│   ├── 09-development-status.md
│   └── 10-demo-guide.md
├── AGENTS.md                     ← LLM agent codebase context
├── CLAUDE.md                     ← Claude Code instructions
└── package.json                  ← npm workspaces root
```

---

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- MongoDB (local or Atlas)
- Telegram bot token ([BotFather](https://t.me/BotFather))
- Anthropic API key (optional — for LLM fallback)

### Installation

```bash
# Clone and install all workspaces
git clone <repository-url>
cd EZ-Event-BOT
npm install

# Configure environment
cp apps/bot-service/.env.example apps/bot-service/.env
# Edit .env with your tokens and MongoDB URI

# Start backend (port 3000)
npm run dev

# Start admin dashboard (port 5173, separate terminal)
npm run dev --workspace=@ez-event-bot/admin-web

# Run tests
npm test --workspace=@ez-event-bot/bot-service
```

Health check: `GET http://localhost:3000/health` → `{"ok":true}`

See [docs/08-setup-installation.md](docs/08-setup-installation.md) for full setup instructions.

---

## Documentation

| Document                                              | Description                                        |
| ----------------------------------------------------- | -------------------------------------------------- |
| [System Architecture](docs/01-system-architecture.md) | Layered design, component inventory, data flow     |
| [Database Models](docs/02-database-models.md)         | MongoDB schema, ERD, indexes, query patterns       |
| [RSVP Lifecycle](docs/03-rsvp-lifecycle.md)           | Guest state machine, business rules, EffectsPatch  |
| [NLU Pipeline](docs/04-nlu-pipeline.md)               | Hebrew NLP, headcount extraction, LLM integration  |
| [LangGraph Agent](docs/05-langgraph-agent.md)         | Graph topology, nodes, ports, design principles    |
| [API Reference](docs/06-api-reference.md)             | REST endpoints, request/response schemas           |
| [Admin Dashboard](docs/07-admin-web.md)               | Vue 3 frontend, features, component structure      |
| [Setup & Installation](docs/08-setup-installation.md) | Prerequisites, configuration, running locally      |
| [Development Status](docs/09-development-status.md)   | Implemented features, tests, known limitations     |
| [Demo Guide](docs/10-demo-guide.md)                   | Step-by-step demo flow, academic discussion points |

---

## Academic Context

This project was developed as the final project for the **Master of Science in Computer Science** program at the **Open University of Israel**. It demonstrates applied research and engineering across the following domains:

- **Natural Language Processing** — Hebrew morphology, rule-based parsing, confidence scoring, LLM integration for low-resource/ambiguous input
- **Conversational Agent Design** — Multi-turn dialogue, state machine management, graceful degradation strategies
- **Software Architecture** — Hexagonal architecture, domain isolation, pure functional core, port/adapter pattern
- **Agent Frameworks** — LangGraph state graphs, compiled agent pipelines, conditional routing
- **Full-Stack Engineering** — TypeScript monorepo, REST API, reactive Vue 3 frontend, MongoDB ODM

---

## License

Academic project — All rights reserved. © Israel Heiblum, The Open University of Israel.
