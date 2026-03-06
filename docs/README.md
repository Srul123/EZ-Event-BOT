# EZ-Event-BOT — Documentation

**EZ-Event-BOT** is a conversational RSVP agent for events, delivered over Telegram. Event organizers create campaigns with a guest list via a REST API and a Vue 3 admin dashboard; guests receive personalized Telegram deep links and respond in free-text Hebrew or English. The bot interprets responses using a **hybrid NLP pipeline** (rule-based parser first, Anthropic Claude 3 Haiku as fallback) and orchestrates the multi-turn RSVP conversation using a **LangGraph state graph** built on a hexagonal (ports & adapters) architecture. All RSVP data is persisted in MongoDB.

This project was developed as a master's degree final project in Computer Science, demonstrating the integration of NLP, agent-based architectures (LangGraph), stateful conversation management, and software engineering principles.

---

## Document Index

| # | File | Contents |
|---|---|---|
| 1 | [01-system-architecture.md](01-system-architecture.md) | High-level architecture, layered design, tech stack, component inventory, data flow |
| 2 | [02-database-models.md](02-database-models.md) | MongoDB schema: Campaign, Guest, Invite collections, ERD, indexes, query patterns, data lifecycle |
| 3 | [03-rsvp-lifecycle.md](03-rsvp-lifecycle.md) | RSVP business logic, guest record state machine, conversation flow, change detection, EffectsPatch |
| 4 | [04-nlu-pipeline.md](04-nlu-pipeline.md) | NLU pipeline: rule-based interpreter, LLM fallback, headcount extraction, NLG, LLM integration |
| 5 | [05-langgraph-agent.md](05-langgraph-agent.md) | LangGraph state graph: nodes, routing, port interfaces, policy rules, session management, design principles |
| 6 | [06-api-reference.md](06-api-reference.md) | Campaign REST API: all endpoints, request/response schemas, error handling, workflow examples |
| 7 | [07-admin-web.md](07-admin-web.md) | Admin web dashboard: Vue 3 frontend, features, routes, component structure, API integration |
| 8 | [08-setup-installation.md](08-setup-installation.md) | Prerequisites, installation, environment configuration, running locally, troubleshooting |
| 9 | [09-development-status.md](09-development-status.md) | Implementation status, automated tests, known limitations, deployment readiness |
| 10 | [10-demo-guide.md](10-demo-guide.md) | Step-by-step demo flow, RSVP scenarios, architecture walkthrough, academic discussion points |

---

## Quick Links

- **Setting up the project** → [08-setup-installation.md](08-setup-installation.md)
- **Understanding the RSVP flow** → [03-rsvp-lifecycle.md](03-rsvp-lifecycle.md)
- **System architecture overview** → [01-system-architecture.md](01-system-architecture.md)
- **Database schema** → [02-database-models.md](02-database-models.md)
- **API endpoints** → [06-api-reference.md](06-api-reference.md)
- **For AI assistants** → [`AGENTS.md`](../AGENTS.md) at project root

---

## Technology Stack at a Glance

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 22+, TypeScript 5.3+ (strict, ESM) |
| Bot framework | Telegraf |
| Agent framework | LangGraph (`@langchain/langgraph`) |
| HTTP API | Express.js |
| Database | MongoDB 6+ via Mongoose ODM |
| LLM | Anthropic Claude 3 Haiku |
| Validation | Zod |
| Logging | Pino |
| Frontend | Vue 3, Vite, Tailwind CSS 4, Pinia, Vue Router, vue-i18n |

---

## Repository Layout

```
EZ-Event-BOT/
├── apps/
│   ├── bot-service/    ← Backend (Express + Telegraf + LangGraph)
│   └── admin-web/      ← Frontend admin dashboard (Vue 3 + Vite)
├── packages/
│   └── shared/         ← Placeholder for shared utilities
└── docs/               ← This documentation
    └── data/           ← Sample data files
```
