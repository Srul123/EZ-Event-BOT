# Current Development Status

> Part of the [EZ-Event-BOT documentation](README.md).
> Last updated: March 2026.

## 1. Implementation Summary

EZ-Event-BOT is a fully functional RSVP agent system. The core bot capabilities — personalized guest invitation, free-text RSVP interpretation (rule-based + LLM), multi-turn conversation management, RSVP persistence, and update/correction handling — are fully implemented and manually verified. The admin web dashboard provides complete campaign management, real-time RSVP statistics, and Telegram link distribution.

---

## 2. Fully Implemented & Working

### 2.1 Infrastructure & Core Services

- **Monorepo**: npm workspaces (`bot-service`, `admin-web`, `packages/shared` placeholder)
- **TypeScript**: Strict mode, ESM (ES2022), NodeNext module resolution
- **Environment configuration**: Zod-validated at startup with cross-field validation (e.g., API key required when LLM enabled)
- **Logging**: Pino with pino-pretty for development (structured JSON in production)
- **Database**: MongoDB via Mongoose with graceful connection management and timeouts
- **HTTP server**: Express with `/health` endpoint
- **Graceful shutdown**: SIGINT/SIGTERM handlers for clean process exit

### 2.2 Telegram Bot

- Telegraf bot with session middleware for guest data persistence
- `/start` handler: token extraction, guest lookup, campaign fetch, session initialization, personalized Hebrew invitation message
- `/help` handler: personalized response with guest name when session exists
- Free-text message handler: invokes LangGraph runner, applies `EffectsPatch`, syncs session, replies

### 2.3 Token-Based Guest Identification

- `POST /api/campaigns/:id/generate-telegram-links` generates unique tokens (`inv_` + 12-char base64url)
- Tokens stored in `Invite` collection with unique index
- `getGuestByToken()` resolves token → Invite → Guest → Campaign in 3 sequential queries
- `usedAt` timestamp set on first link click

### 2.4 LangGraph RSVP Agent (Core Feature)

The RSVP agent is implemented as a compiled LangGraph state graph with hexagonal architecture:

- **5 nodes**: `interpretFull`, `interpretHeadcount`, `decideAction`, `composeReply`, `buildEffects`
- **Conditional routing**: `routeByState` (DEFAULT vs. YES_AWAITING_HEADCOUNT) and `headcountResultRouter` (fast path vs. full NLU fallback)
- **`decideAction`**: Pure synchronous function, 6 action types, change detection, clarification attempt tracking
- **`buildEffects`**: Sparse `EffectsPatch` via `ClockPort` (no implicit `new Date()`)
- **Domain isolation**: `domain/rsvp-graph/` has zero imports from `bot/`, `mongoose`, `telegraf`, or `new Date()`
- **Port adapters**: `nluAdapter.ts` and `nlgAdapter.ts` bridge domain ports to existing NLU/NLG functions

### 2.5 NLU Pipeline

- **Rule-based interpreter** (`bot/rsvp/interpret/rules.ts`, ~630 lines):
  - Hebrew/English keyword matching (YES/NO/MAYBE), confidence scoring
  - Hebrew text normalization: niqqud stripping, prefix stripping (ו, ה, ב, ל, כ, מ, ש), tokenization
  - 14-step headcount extraction priority chain (ranges, family terms, digits, Hebrew number words, patterns)
  - Levenshtein fuzzy matching with context-word gating
  - Language detection (Hebrew/English)
- **LLM fallback** (`bot/rsvp/interpret/llmInterpreter.ts`):
  - Anthropic Claude 3 Haiku, structured JSON output schema
  - Zod validation with regex JSON extraction fallback
  - 200-token budget, graceful degradation to UNKNOWN on any failure
- **Headcount-only extractor** for `YES_AWAITING_HEADCOUNT` state
- **HeadcountExtraction** discriminated union: `exact | ambiguous | none`
- Configurable confidence threshold (default: 0.85)

### 2.6 NLG Pipeline

- **Hebrew templates** (default): Static, fast, deterministic replies
- **Adaptive clarification questions**: 3-attempt progression (reason-specific → simplified → graceful exit)
- **Optional LLM responses** (`RSVP_USE_LLM_RESPONSES=true`): Claude-generated natural Hebrew replies (disabled by default)

### 2.7 Campaign Management API

| Endpoint | Status |
|---|---|
| `POST /api/campaigns` | ✅ Implemented |
| `GET /api/campaigns` | ✅ Implemented |
| `GET /api/campaigns/:id` | ✅ Implemented |
| `POST /api/campaigns/:id/generate-telegram-links` | ✅ Implemented |

All endpoints include Zod request validation and structured error responses.

### 2.8 Admin Web Dashboard (Vue 3)

| Feature | Status |
|---|---|
| Campaign list with search & status filter | ✅ |
| Campaign creation with CSV import | ✅ |
| Campaign detail with RSVP statistics | ✅ |
| Guest table (search, filter, sort) | ✅ |
| Personalized link generation | ✅ |
| Copy-to-clipboard & CSV export | ✅ |
| Hebrew/English i18n with RTL/LTR | ✅ |
| Responsive (mobile-friendly) | ✅ |
| Toast notifications | ✅ |

---

## 3. Automated Tests

**Test runner**: Node.js built-in `node:test` (no jest/vitest/mocha).

| Test File | Cases | Coverage |
|---|---|---|
| `bot/rsvp/interpret/rules.test.ts` | ~20 | `extractHeadcount()`: Hebrew numbers, digits, family terms, fuzzy matching, edge cases, normalization |
| `domain/rsvp-graph/nodes/decideAction.test.ts` | 19 | DEFAULT state (8), YES_AWAITING_HEADCOUNT state (7), EffectsPatch correctness (4) |

**`decideAction.test.ts` breakdown:**
- DEFAULT state: YES+headcount, YES without headcount, NO, MAYBE, UNKNOWN, ACK_NO_CHANGE, change detection, headcount-only update
- YES_AWAITING_HEADCOUNT: exact headcount, fuzzy headcount, ambiguous with attempt tracking, 3-attempt cap, intent changes ("actually no", "maybe"), compound messages
- EffectsPatch: ACK_NO_CHANGE/CLARIFY_INTENT produce minimal patches, SET_RSVP omits `rsvpUpdatedAt` when no change, ASK_HEADCOUNT includes `rsvpStatus: YES`

**No integration tests, no E2E tests.** All core flows have been manually verified (see §5).

---

## 4. Known Limitations & Not Yet Implemented

| Feature | Status | Notes |
|---|---|---|
| Authentication/Authorization | ❌ Not implemented | All API endpoints and admin web are open — no auth middleware |
| Campaign scheduling/dispatch | ⚠️ Schema ready, no worker | `scheduledAt` field exists; no cron/scheduler processes it |
| Campaign dispatch outbox | ⚠️ Status field ready | Backend `status` field exists; no dispatch worker |
| Docker/containerization | ❌ Not configured | No Dockerfile or docker-compose |
| CI/CD pipeline | ❌ Not configured | No GitHub Actions or equivalent |
| `packages/shared` | ⚠️ Empty placeholder | Workspace exists but `index.ts` is empty |
| Rate limiting | ❌ Not implemented | No Express rate-limit middleware |
| Message history logging | ❌ Not implemented | Only latest guest state is tracked; no conversation log |
| LLM response generation | ⚠️ Implemented, disabled by default | `RSVP_USE_LLM_RESPONSES=false` |
| Integration/E2E tests | ❌ Not set up | Manual testing only |
| Advanced bot features | ❌ Out of scope | No location sharing, event info queries, or additional commands beyond `/start` and `/help` |
| External EZ-Event API integration | ❌ Not connected | No integration with external event management systems |

---

## 5. Manually Verified Scenarios

All of the following have been tested end-to-end via Telegram:

| Scenario | Result |
|---|---|
| HTTP server starts, health endpoint returns `{"ok":true}` | ✅ |
| MongoDB connection and Telegram bot launch | ✅ |
| Token-based guest identification via `/start` | ✅ |
| Personalized Hebrew invitation message | ✅ |
| Session persistence across commands | ✅ |
| "כן מגיע" → ASK_HEADCOUNT → headcount → SET_RSVP YES | ✅ |
| "לא מגיע" → SET_RSVP NO | ✅ |
| "תלוי בעבודה" → SET_RSVP MAYBE | ✅ |
| Ambiguous message → LLM fallback | ✅ |
| Already confirmed → ACK_NO_CHANGE | ✅ |
| Correction message ("אופס טעיתי, נהיה 2") → headcount update | ✅ |
| 3 failed headcount attempts → STOP_WAITING | ✅ |
| Admin web: campaign creation, link generation, stats | ✅ |

---

## 6. Code Quality Assessment

| Aspect | Assessment |
|---|---|
| Type safety | Full TypeScript strict mode throughout backend |
| Architecture boundaries | Domain layer verified by grep — zero infrastructure imports |
| Error handling | Comprehensive try/catch with Pino structured logging |
| LLM resilience | Graceful degradation at every integration point |
| Input validation | Zod at API boundary and LLM response parsing |
| Business logic isolation | `decideAction` is a pure function — no async, no side effects |
| Test coverage | Minimal — 39 unit tests total, no integration coverage |

---

## 7. Deployment Readiness

### Ready
- Zod-validated environment configuration at startup
- Graceful shutdown (SIGINT/SIGTERM)
- Structured Pino logging with log levels

### Needs Configuration
- Production environment variables (bot token, MongoDB URI, Anthropic key)
- MongoDB production cluster

### Not Set Up
- Docker / containerization (no Dockerfile, no docker-compose)
- CI/CD pipeline
- API authentication and authorization
- Rate limiting and security middleware
- Production monitoring beyond basic `/health`
