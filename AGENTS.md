# EZ-Event-BOT — Agent Context

> Compact codebase reference for LLM coding agents. For full detail see `docs/llm-context.md`.

---

## System Identity

**EZ-Event-BOT** is a conversational RSVP agent for events delivered via Telegram. Event organizers create campaigns with guest lists via a REST API + Vue 3 admin dashboard. Guests receive personalized Telegram deep links (`https://t.me/{bot}?start=inv_{token}`) and interact in free-text Hebrew or English. The bot uses a **compiled LangGraph state graph** with **hybrid NLP** (rule-based first, Anthropic Claude 3 Haiku fallback) to collect and update RSVP responses. All data is persisted in MongoDB.

**Academic context**: Final project for a Master's degree in Computer Science.

---

## Repository Layout

```
apps/
  bot-service/src/
    index.ts                  ← Bootstrap: DB → bot → HTTP server
    config/env.ts             ← Zod-validated env (cross-field validation)
    db/mongo.ts               ← Mongoose connection
    logger/logger.ts          ← Pino logger singleton
    http/server.ts            ← Express + /health endpoint
    http/routes/campaignRoutes.ts  ← Campaign REST API (4 endpoints)
    domain/
      rsvp/types.ts           ← Shared types (RsvpStatus, ConversationState, etc.)
      rsvp-graph/             ← LangGraph RSVP agent ← ZERO imports from bot/, mongoose, telegraf
        types.ts              ← GuestContext, Action (6 variants), EffectsPatch, GraphInput/Output
        ports.ts              ← NluPort, NlgPort, ClockPort, LoggerPort
        state.ts              ← RsvpAnnotation (7 LangGraph channels, last-writer-wins)
        graph.ts              ← StateGraph with conditional routing (compiled once at startup)
        index.ts              ← createRsvpGraphRunner() ← public API, singleton factory
        nodes/
          interpretFull.ts        ← NLU node: calls NluPort.interpretMessage()
          interpretHeadcount.ts   ← Headcount-only node for YES_AWAITING_HEADCOUNT
          decideAction.ts         ← ALL business logic ← pure sync, no side effects
          composeReply.ts         ← NLG node: delegates to NlgPort
          buildEffects.ts         ← Action + GuestContext → sparse EffectsPatch via ClockPort
          decideAction.test.ts    ← 19 unit tests (node:test)
      campaigns/
        campaign.model.ts     ← Campaign Mongoose schema
        guest.model.ts        ← Guest Mongoose schema
        invite.model.ts       ← Invite Mongoose schema
        campaign.service.ts   ← createCampaign, listCampaigns, getCampaignDetails
        guest.service.ts      ← updateGuestRsvp(guestId, EffectsPatch)
        guest-session.service.ts  ← getGuestByToken(token) → {guest, campaign}
        links.service.ts      ← generateTelegramInviteLinks(campaignId)
    bot/
      createBot.ts            ← Telegraf setup, session middleware, handler wiring
      handlers/
        start.handler.ts      ← /start: token lookup, session init, Hebrew invitation
        help.handler.ts       ← /help: personalized with guest name
        guestMessage.handler.ts ← Free-text: calls runGraph, applies EffectsPatch, sends reply
      adapters/
        nluAdapter.ts         ← Implements NluPort (wraps bot/rsvp/interpret/*)
        nlgAdapter.ts         ← Implements NlgPort (wraps bot/rsvp/respond/*)
      rsvp/
        clarificationQuestions.ts ← 3-attempt adaptive clarification question builder
        interpret/
          index.ts            ← Entry: rules → threshold check → LLM fallback
          rules.ts            ← Hebrew NLP (~630 lines): keywords, 14-step headcount, fuzzy
          headcountOnly.ts    ← Headcount-only extractor for YES_AWAITING_HEADCOUNT
          llmInterpreter.ts   ← LLM fallback with Zod validation + JSON regex extraction
          prompts/interpret.prompt.ts  ← Anthropic system prompt for NLU
        respond/
          index.ts            ← Template vs. LLM response routing
          templates.ts        ← Static Hebrew reply templates
          llmResponder.ts     ← LLM response generation
          prompts/respond.prompt.ts   ← Anthropic system prompt for NLG
    infra/llm/
      anthropic.ts            ← Anthropic SDK singleton (claude-3-haiku-20240307, temp 0.2)
      llmClient.ts            ← 10s timeout, 1 retry, retryable error classification

  admin-web/src/              ← Vue 3 + Vite (proxies /api to localhost:3000)
    views/                    ← HomeView, CampaignsListView, CampaignCreateView, CampaignDetailView, CampaignDispatchView
    components/               ← campaign/, guest/, links/, common/
    stores/campaigns.js       ← Pinia store
    api/client.js             ← Axios instance
    i18n/en.js, he.js         ← Hebrew/English translations

packages/shared/              ← Empty placeholder
```

---

## Architecture Constraints — MUST ENFORCE

```
domain/rsvp-graph/**  MUST NOT import from:  bot/*, mongoose, telegraf
domain/rsvp-graph/**  MUST NOT contain:      new Date()   ← use ClockPort.now()
decideAction.ts       MUST be:               pure synchronous function (no async, no side effects)
```

These constraints enforce hexagonal architecture. The domain layer is independently testable without Telegram, MongoDB, or any infrastructure.

---

## Core Domain Types

```typescript
// ─── Status enums ─────────────────────────────────────────────────────────────
type RsvpStatus = 'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE';
type ConversationState = 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
type AmbiguityReason = 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN';

// ─── Headcount — discriminated union (NOT number|null) ─────────────────────────
type HeadcountExtraction =
  | { kind: 'exact'; headcount: number; fuzzy?: boolean }
  | { kind: 'ambiguous'; reason: AmbiguityReason }
  | { kind: 'none' };

// ─── NLU output ───────────────────────────────────────────────────────────────
interface Interpretation {
  rsvp: 'YES' | 'NO' | 'MAYBE' | 'UNKNOWN';
  headcount: number | null;
  headcountExtraction: HeadcountExtraction;
  confidence: number;           // 0.0–1.0
  needsHeadcount: boolean;
  language?: 'he' | 'en';
}

// ─── Graph input context ───────────────────────────────────────────────────────
interface GuestContext {
  guestId: string; campaignId: string; name: string; phone: string; locale: string;
  rsvpStatus: RsvpStatus; headcount: number | null;
  conversationState: ConversationState;
  clarificationAttempts: number; lastClarificationReason?: AmbiguityReason;
  eventTitle?: string; eventDate?: string;
}

// ─── 6-variant action union ────────────────────────────────────────────────────
type Action =
  | { type: 'SET_RSVP'; rsvpStatus: RsvpStatus; headcount: number | null }
  | { type: 'ASK_HEADCOUNT' }
  | { type: 'CLARIFY_HEADCOUNT'; reason: AmbiguityReason | null; attemptNumber: number }
  | { type: 'CLARIFY_INTENT' }
  | { type: 'ACK_NO_CHANGE' }
  | { type: 'STOP_WAITING_FOR_HEADCOUNT' };

// ─── Sparse DB patch — only present keys are written ─────────────────────────
interface EffectsPatch {
  rsvpStatus?: RsvpStatus; headcount?: number | null;
  conversationState?: ConversationState; lastResponseAt: Date;
  rsvpUpdatedAt?: Date; clarificationAttempts?: number;
  lastClarificationReason?: AmbiguityReason;
}

// ─── Port interfaces ──────────────────────────────────────────────────────────
interface NluPort {
  interpretMessage(text: string, context: GuestContext): Promise<Interpretation>;
  interpretHeadcountOnly(text: string, locale: string): Promise<HeadcountExtraction>;
}
interface NlgPort {
  composeReply(action: Action, context: GuestContext, interpretation?: Interpretation): Promise<string>;
  buildClarificationQuestion(reason: AmbiguityReason | null, attempt: number, context: GuestContext): string;
}
interface ClockPort { now(): Date; }
interface LoggerPort { info(...args: unknown[]): void; debug(...args: unknown[]): void; warn(...args: unknown[]): void; }
```

---

## LangGraph State Graph

**7 state channels** (all last-writer-wins):
`messageText`, `guestContext`, `interpretation`, `headcountExtraction`, `action`, `replyText`, `effects`

**Routing:**
```
START → routeByState
  'DEFAULT'               → interpretFull → decideAction → composeReply → buildEffects → END
  'YES_AWAITING_HEADCOUNT' → interpretHeadcount
                                ├─ exact & !fuzzy → decideAction → composeReply → buildEffects → END
                                └─ else           → interpretFull → decideAction → ...
```

---

## NLU Pipeline

| Signal | Confidence | Routed To |
|---|---|---|
| YES/NO keyword match | 0.9 | Rules accepted |
| MAYBE keyword match | 0.85 | Rules accepted at default threshold |
| Headcount only (no RSVP) | 0.5 | LLM fallback |
| Nothing matched | 0.3 | LLM fallback |

Default threshold: `RSVP_CONFIDENCE_THRESHOLD=0.85`

**Hebrew normalization**: niqqud stripping → prefix stripping (ו, ה, ב, ל, כ, מ, ש) → tokenization → 14-step headcount extraction chain → Levenshtein fuzzy matching with context-word gating.

**LLM fallback** (`llmInterpreter.ts`): Claude 3 Haiku, 200-token budget, Zod validation, JSON regex extraction fallback, graceful degradation to UNKNOWN on any failure.

---

## MongoDB Collections

**Campaign**: `_id, name, eventTitle, eventDate(String), scheduledAt(Date), status(DRAFT|SCHEDULED|RUNNING|COMPLETED|FAILED)`

**Guest**: `_id, campaignId, name, phone, rsvpStatus, headcount(Number|null), conversationState, rsvpUpdatedAt(Date|null), lastResponseAt(Date|null)`
- `rsvpUpdatedAt` only set when rsvpStatus or headcount changes (not on ACK/CLARIFY)
- Index: `{campaignId:1}`, `{phone:1}`

**Invite**: `_id, token(unique: "inv_"+12chars), guestId, campaignId, usedAt(Date|null)`
- Index: `{token:1}(unique)`, `{guestId:1}`, `{campaignId:1}`

---

## REST API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/campaigns` | Create campaign with guests array |
| GET | `/api/campaigns` | List all campaigns |
| GET | `/api/campaigns/:id` | Campaign detail with guest RSVP data |
| POST | `/api/campaigns/:id/generate-telegram-links` | Generate personalized deep links |

All endpoints include Zod request validation and structured error responses.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22+, TypeScript 5.3+ strict ESM |
| Bot | Telegraf 4.x with session middleware |
| Graph | LangGraph (JS) compiled state graph |
| DB | MongoDB 7 via Mongoose 8 |
| Validation | Zod |
| Logging | Pino + pino-pretty |
| HTTP | Express 5 |
| LLM | Anthropic SDK (claude-3-haiku-20240307, temp 0.2) |
| Frontend | Vue 3, Vite, Tailwind CSS 4, Pinia, Vue Router, vue-i18n |
| Tests | node:test (built-in, no jest/vitest) |

---

## Development Commands

```bash
npm install                                              # all workspaces
npm run dev                                              # bot-service (port 3000)
npm run dev --workspace=@ez-event-bot/admin-web         # admin-web (port 5173)
npm test --workspace=@ez-event-bot/bot-service          # unit tests (node:test)
npm run build --workspace=@ez-event-bot/bot-service     # compile TypeScript
```

---

## Critical Gotchas

1. **`new Date()` is banned in `domain/rsvp-graph/`** — inject `ClockPort.now()`.
2. **`decideAction` must stay synchronous** — adding `await` breaks the pure function guarantee.
3. **`EffectsPatch` is sparse** — omit a key entirely (not `undefined`) to skip writing it to MongoDB.
4. **`rsvpUpdatedAt` has semantic meaning** — only set it when the RSVP data actually changes.
5. **`ConversationState` in MongoDB is authoritative** — not the Telegraf session (session is a cache only).
6. **LLM calls are optional** — `RSVP_USE_LLM_INTERPRETATION=false` disables the Claude fallback entirely.
7. **`bot/rsvp/rsvpFlow.ts` is dead code** — legacy file, not imported anywhere; do not modify or rely on it.
8. **3-attempt clarification cap** — `CLARIFY_HEADCOUNT` escalates to `STOP_WAITING_FOR_HEADCOUNT` after 3 failed attempts.
9. **`packages/shared`** is an empty placeholder — do not put shared logic there without updating the workspace config.

---

## Environment Variables

```dotenv
NODE_ENV=development
PORT=3000
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=EzEventBot
MONGODB_URI=mongodb://localhost:27017/ez-event-bot
LOG_LEVEL=info
ANTHROPIC_API_KEY=...
RSVP_USE_LLM_INTERPRETATION=true   # default: true
RSVP_USE_LLM_RESPONSES=false        # default: false (templates used)
RSVP_CONFIDENCE_THRESHOLD=0.85      # default: 0.85
```

---

## Known Limitations (Not Implemented)

- No authentication/authorization on API or admin web
- Campaign scheduler/dispatcher (schema ready, no worker)
- Docker/containerization
- CI/CD pipeline
- Rate limiting
- Message history logging (only latest guest state tracked)
- Integration/E2E tests (manual testing only)
