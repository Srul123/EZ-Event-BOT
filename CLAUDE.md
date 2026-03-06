# EZ-Event-BOT — Claude Code Instructions

## Project Identity

RSVP conversational agent for events delivered via Telegram. Guests receive personalized deep links and interact in free-text Hebrew/English. The bot uses a LangGraph state graph + hybrid NLP (rule-based → Claude 3 Haiku fallback) to collect RSVP responses. Data persisted in MongoDB.

**Master's degree final project — CS.**

---

## Commands

```bash
# Install all workspaces
npm install

# Run bot-service (port 3000)
npm run dev

# Run admin web dashboard (port 5173, separate terminal)
npm run dev --workspace=@ez-event-bot/admin-web

# Run all unit tests
npm test --workspace=@ez-event-bot/bot-service

# Build
npm run build --workspace=@ez-event-bot/bot-service
```

Health check: `GET http://localhost:3000/health` → `{"ok":true}`

---

## Architecture — Critical Constraints

```
domain/rsvp-graph/**  MUST NOT import from:  bot/*, mongoose, telegraf
domain/rsvp-graph/**  MUST NOT contain:      new Date()   ← use ClockPort.now()
decideAction.ts       MUST be:               pure synchronous function (no async, no I/O)
```

**Violation check:**
```bash
grep -r "new Date()" apps/bot-service/src/domain/rsvp-graph/
grep -r "from '.*bot/" apps/bot-service/src/domain/rsvp-graph/
```

---

## Key Files

| Path | Role |
|---|---|
| `apps/bot-service/src/domain/rsvp-graph/nodes/decideAction.ts` | ALL business logic — pure sync |
| `apps/bot-service/src/domain/rsvp-graph/graph.ts` | LangGraph state graph (compiled once at startup) |
| `apps/bot-service/src/domain/rsvp-graph/ports.ts` | Port interfaces (NluPort, NlgPort, ClockPort, LoggerPort) |
| `apps/bot-service/src/bot/adapters/nluAdapter.ts` | NluPort implementation |
| `apps/bot-service/src/bot/rsvp/interpret/rules.ts` | Hebrew NLP (~630 lines) |
| `apps/bot-service/src/bot/handlers/guestMessage.handler.ts` | Free-text: calls runGraph → applies EffectsPatch → replies |
| `apps/bot-service/src/domain/rsvp-graph/nodes/decideAction.test.ts` | 19 unit tests |
| `apps/bot-service/src/bot/rsvp/interpret/rules.test.ts` | ~20 unit tests |
| `docs/llm-context.md` | Compact full-project reference |

---

## Core Type Patterns

```typescript
// DB state
type RsvpStatus = 'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE';
type ConversationState = 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';

// Headcount — discriminated union, NOT number|null
type HeadcountExtraction =
  | { kind: 'exact'; headcount: number; fuzzy?: boolean }
  | { kind: 'ambiguous'; reason: AmbiguityReason }
  | { kind: 'none' };

// Action — 6 variants
type Action =
  | { type: 'SET_RSVP'; rsvpStatus: RsvpStatus; headcount: number | null }
  | { type: 'ASK_HEADCOUNT' }
  | { type: 'CLARIFY_HEADCOUNT'; reason: AmbiguityReason | null; attemptNumber: number }
  | { type: 'CLARIFY_INTENT' }
  | { type: 'ACK_NO_CHANGE' }
  | { type: 'STOP_WAITING_FOR_HEADCOUNT' };

// Sparse DB patch — only present keys written to MongoDB
interface EffectsPatch {
  rsvpStatus?: RsvpStatus; headcount?: number | null;
  conversationState?: ConversationState; lastResponseAt: Date;
  rsvpUpdatedAt?: Date; clarificationAttempts?: number;
  lastClarificationReason?: AmbiguityReason;
}
```

---

## LangGraph Routing

```
START → routeByState
  'DEFAULT'               → interpretFull → decideAction → composeReply → buildEffects → END
  'YES_AWAITING_HEADCOUNT' → interpretHeadcount
                                ├─ exact & !fuzzy → decideAction → composeReply → buildEffects → END
                                └─ else           → interpretFull → decideAction → ...
```

---

## Code Style

- **TypeScript**: Strict mode, ESM (`import`/`export`), NodeNext resolution. No `require()`.
- **Tests**: `node:test` built-in runner only (no jest, vitest, mocha).
- **Logging**: Pino singleton (`apps/bot-service/src/logger/logger.ts`). No `console.log` in prod code.
- **Validation**: Zod at API boundaries and LLM response parsing.
- **Error handling**: All async handlers wrapped in try/catch with structured Pino logging.

---

## Common Gotchas

1. **Never use `new Date()` in `domain/rsvp-graph/`** — inject `ClockPort.now()` instead.
2. **`decideAction` must stay sync** — no `await`, no side effects, no imports from infra.
3. **`EffectsPatch` is sparse** — omit a key entirely (not `undefined`) to skip writing it to DB.
4. **`rsvpUpdatedAt`** is only set when rsvpStatus or headcount actually changes — not on ACK/CLARIFY.
5. **`ConversationState` in DB is authoritative** over Telegraf session for restart resilience.
6. **LLM fallback is optional** — `RSVP_USE_LLM_INTERPRETATION=false` disables Claude calls; rule-based only.
7. **`bot/rsvp/rsvpFlow.ts`** is legacy dead code — not imported anywhere, kept for reference only.

---

## Environment (Required for Dev)

```dotenv
NODE_ENV=development
PORT=3000
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=EzEventBot
MONGODB_URI=mongodb://localhost:27017/ez-event-bot
LOG_LEVEL=info
ANTHROPIC_API_KEY=...          # required when RSVP_USE_LLM_INTERPRETATION=true
RSVP_USE_LLM_INTERPRETATION=true
RSVP_USE_LLM_RESPONSES=false
RSVP_CONFIDENCE_THRESHOLD=0.85
```

---

## Full Reference

See `AGENTS.md` for complete type definitions, annotated file tree, and MongoDB schemas.
