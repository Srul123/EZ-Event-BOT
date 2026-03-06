# Demo Guide — Academic Presentation

> Part of the [EZ-Event-BOT documentation](README.md).

## Overview

**EZ-Event-BOT** is a conversational Telegram bot system for event management that enables organizers to collect RSVP responses from guests through natural language interactions. The system combines rule-based parsing with LLM-powered interpretation to understand free-text messages in Hebrew and English, making event RSVP collection seamless and user-friendly.

---

## System Architecture Overview

```
┌─────────────────┐
│  Event Organizer│
│  (API Client)   │
└────────┬────────┘
         │
         │ HTTP API
         ▼
┌─────────────────────────────────────┐
│      Express HTTP Server              │
│  - Campaign Management API           │
│  - Link Generation                   │
└────────┬─────────────────────────────┘
         │
         │ MongoDB
         ▼
┌─────────────────────────────────────┐
│         MongoDB Database             │
│  - Campaigns                         │
│  - Guests                            │
│  - Invites (Tokens)                  │
└──────────────────────────────────────┘

┌─────────────────┐
│     Guest       │
│  (Telegram)     │
└────────┬────────┘
         │
         │ Telegram Bot API
         ▼
┌─────────────────────────────────────┐
│      Telegraf Handler (bot layer)    │
│  - Session Management                │
│  - Build GuestContext                │
│  - Apply EffectsPatch to DB          │
└────────┬─────────────────────────────┘
         │
         │  GraphInput
         ▼
┌─────────────────────────────────────┐
│  LangGraph State Graph (domain)      │
│                                      │
│  START → routeByState                │
│    ├─ DEFAULT → interpretFull        │
│    └─ AWAITING → interpretHeadcount  │
│         └─ fallback → interpretFull  │
│  → decideAction → composeReply       │
│  → buildEffects → END                │
│                                      │
│  Ports: NluPort, NlgPort, ClockPort  │
└────────┬─────────────────────────────┘
         │
         │ via Port Adapters
         ▼
┌──────────────┐   ┌──────────────┐
│ Interpretation│   │  Response    │
│   Layer       │   │  Generation  │
│ - Rules       │   │ - Templates  │
│ - LLM Fallback│   │ - LLM (opt)  │
└──────┬───────┘   └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
                ▼
        ┌──────────────┐
        │ Anthropic    │
        │ Claude API   │
        └──────────────┘
```

### Key Architectural Principles

1. **Hexagonal Architecture (Ports & Adapters)**: Domain graph depends only on port interfaces; adapters bridge to existing NLU/NLG
2. **LangGraph State Graph**: RSVP flow as a compiled directed graph with 5 nodes and conditional routing
3. **Clean Architecture**: Domain layer (`domain/rsvp-graph/`) has zero imports from `bot/`, `mongoose`, `telegraf`, or `new Date()`
4. **Pure Business Logic**: `decideAction` node is a pure function — fully unit-testable without mocks
5. **State Management**: Conversation state persisted in both DB and session (DB is source of truth)

---

## Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 22+ with ESM |
| Language | TypeScript 5.3+ (strict mode) |
| HTTP API | Express.js |
| Telegram Bot | Telegraf |
| Agent Framework | LangGraph (`@langchain/langgraph`) |
| Database | MongoDB with Mongoose ODM |
| LLM | Anthropic Claude 3 Haiku (via official SDK) |
| Validation | Zod |
| Logging | Pino (structured) |

---

## Demo Flow: Step-by-Step

### Prerequisites

1. **Start the backend service**:
   ```bash
   npm run dev --workspace=@ez-event-bot/bot-service
   ```

2. **Verify services are running**:
   - HTTP server: `GET http://localhost:3000/health` → `{"ok": true}`
   - MongoDB: Check logs for connection success
   - Telegram bot: Check logs for "Bot launched successfully"

---

### Part 1: Campaign Creation & Link Generation

**Goal**: Show how organizers create events and generate personalized invite links.

#### Step 1.1: Create a Campaign

```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Event - Academic Presentation",
    "eventTitle": "Research Project Demo",
    "eventDate": "2026-02-15",
    "scheduledAt": "2026-02-10T10:00:00Z",
    "guests": [
      {"name": "דוד כהן", "phone": "+972501234567"},
      {"name": "שרה לוי", "phone": "+972509876543"},
      {"name": "יוסי ישראלי", "phone": "+972505551234"}
    ]
  }'
```

**What to explain**:
- Campaign represents an event with metadata
- Guests are pre-registered with name and phone
- System creates Guest documents in MongoDB with `rsvpStatus: NO_RESPONSE`

**Save the `campaignId` from the response for next steps.**

#### Step 1.2: Generate Personalized Telegram Links

```bash
curl -X POST http://localhost:3000/api/campaigns/{CAMPAIGN_ID}/generate-telegram-links
```

**What to explain**:
- Each guest gets a unique token (12-char base64url, prefixed `inv_`)
- Token is stored in `Invite` collection with unique index
- Link format: `https://t.me/{botUsername}?start=inv_{token}`
- Token maps guest identity to Telegram user

**Highlight**: Each link is unique and personalized. Guest identity is pre-loaded.

---

### Part 2: Guest Interaction Flow

**Goal**: Demonstrate the conversational RSVP flow with natural language understanding.

#### Step 2.1: Guest Opens Link

1. **Open one of the generated links** in Telegram
2. **Bot responds with personalized invitation**:
   ```
   שלום דוד כהן! 👋

   הוזמנת לאירוע: Research Project Demo
   תאריך: 2026-02-15

   אנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.
   ```
3. **Explain**:
   - Token extracted from `/start` command
   - Guest data loaded from database (token → Invite → Guest → Campaign)
   - Campaign details (eventTitle, eventDate) fetched and stored in session
   - Session initialized for subsequent interactions

#### Step 2.2: RSVP Scenarios

---

**Scenario 1: Simple YES**

Guest sends: `"כן מגיע"`

What happens:
1. Rules engine detects "כן" (YES), confidence: 0.9 (high) → no LLM call
2. No headcount detected → Action: `ASK_HEADCOUNT`
3. State transition: `DEFAULT` → `YES_AWAITING_HEADCOUNT`
4. Patch applied: `{rsvpStatus: YES, conversationState: YES_AWAITING_HEADCOUNT, lastResponseAt, rsvpUpdatedAt}`

Bot replies: `"דוד כהן, כמה אנשים יגיעו?"`

**Explain**: Rule-based parsing is fast and deterministic. No LLM call needed for clear patterns.

---

**Scenario 2: Provide Headcount**

Guest sends: `"אנחנו זוג"` (We're a couple — in `YES_AWAITING_HEADCOUNT` state)

What happens:
1. Graph routes to `interpretHeadcount` node (headcount-only extraction)
2. "זוג" → `exact: 2` (from priority chain, step 5)
3. Exact & not fuzzy → fast path directly to `decideAction`
4. Action: `SET_RSVP { YES, headcount: 2 }`
5. State → `DEFAULT`

Bot replies: `"תודה דוד כהן! נרשמת 2 אנשים."`

**Explain**: State-aware routing prevents redundant full NLU in the headcount loop.

---

**Scenario 3: MAYBE Response**

Guest sends: `"תלוי בעבודה, עוד לא סגור"` (Depends on work, not decided)

What happens:
1. Rules detect "תלוי" → MAYBE, confidence: 0.85 (meets threshold)
2. Action: `SET_RSVP { MAYBE }`

Bot replies: `"הבנתי, תודה. תעדכן אותי כשיהיה ברור."`

---

**Scenario 4: LLM Fallback**

Guest sends: `"אני חושב שאגיע אבל צריך לבדוק עם הבוס"` (I think I'll come but need to check with the boss)

What happens:
1. Rules attempt parsing: confidence < 0.85 → LLM fallback triggered
2. Anthropic Claude 3 Haiku analyzes: returns `{rsvp: "MAYBE", confidence: 0.8}`
3. Validated by Zod schema → Action: `SET_RSVP { MAYBE }`

**Explain**: Hybrid approach: rules for common cases (~80-90%), LLM for the long tail of complex messages.

---

**Scenario 5: Already Recorded (ACK_NO_CHANGE)**

Guest with `rsvpStatus: YES, headcount: 2` sends: `"שלום"` (Hello)

What happens:
1. `decideAction` detects: confirmed guest, no change detected
2. Action: `ACK_NO_CHANGE`
3. Patch: `{lastResponseAt}` only — no DB status mutation

Bot replies: `"תודה דוד כהן! כבר נרשמת 2 אנשים."`

**Explain**: Prevents unnecessary database writes. The sparse EffectsPatch pattern shines here.

---

**Scenario 6: RSVP Correction**

Guest with `rsvpStatus: YES, headcount: 4` sends: `"אופס טעיתי, נהיה 2"` (Oops, I made a mistake, we'll be 2)

What happens:
1. Rules might classify as NO (correction keyword), but `decideAction` detects:
   - Correction keyword ("טעיתי") + current YES + different headcount (2 ≠ 4)
   - Priority rule: headcount update > status change
2. Action: `SET_RSVP { YES, headcount: 2 }`

Bot replies: `"סבבה, מעדכן ל-2 סהכ."`

**Explain**: Prevents accidental cancellations. Business logic in `decideAction` handles the edge case.

---

### Part 3: Architecture Deep Dive

**Goal**: Explain the technical architecture and design decisions.

#### 3.1 Domain Isolation (Hexagonal Architecture)

```
domain/rsvp-graph/        ← Pure domain (ZERO infrastructure imports)
  ├── types.ts             ← GuestContext, Action (6 types), EffectsPatch
  ├── ports.ts             ← NluPort, NlgPort, ClockPort, LoggerPort
  ├── state.ts             ← LangGraph Annotation (7 channels)
  ├── graph.ts             ← StateGraph with conditional routing
  ├── index.ts             ← createRsvpGraphRunner() — public API
  └── nodes/
      ├── interpretFull.ts     ← NLU node (calls NluPort)
      ├── interpretHeadcount.ts ← Headcount-only extraction
      ├── decideAction.ts      ← ALL business logic (pure function, 19 unit tests)
      ├── composeReply.ts      ← NLG node (calls NlgPort)
      └── buildEffects.ts      ← Action → sparse EffectsPatch (via ClockPort)

bot/adapters/
  ├── nluAdapter.ts        ← Implements NluPort (wraps interpret/*)
  └── nlgAdapter.ts        ← Implements NlgPort (wraps respond/*)
```

**Key Points**:
- `decideAction` is a pure function: no async, no side effects, 19 unit tests — no mocks needed
- Architecture boundaries: `domain/rsvp-graph/` verified by grep — zero imports from `bot/`, `mongoose`, `telegraf`, no `new Date()`

#### 3.2 Data Flow — "כן מגיע"

```
1. Telegram → guestMessage.handler.ts
   ↓
2. Fetch guest from DB (source of truth)
   ↓
3. Build GuestContext (guestId, name, eventTitle, rsvpStatus, conversationState, ...)
   ↓
4. runGraph({ messageText: "כן מגיע", guestContext })
   ↓
   ┌─── LangGraph State Graph ───────────────────────────┐
   │                                                      │
   │  5. routeByState → "DEFAULT" → interpretFull node    │
   │     ↓                                                │
   │     NluPort.interpretMessage("כן מגיע", context)     │
   │     └─→ rules.ts: "כן" → YES, confidence: 0.9 ✓     │
   │     ↓                                                │
   │  6. decideAction node (pure function)                │
   │     └─→ YES + no headcount → Action: ASK_HEADCOUNT  │
   │     ↓                                                │
   │  7. composeReply → NlgPort.buildClarificationQuestion│
   │     └─→ "דוד כהן, כמה אנשים יגיעו?"                │
   │     ↓                                                │
   │  8. buildEffects (via ClockPort)                     │
   │     └─→ EffectsPatch: { rsvpStatus: "YES",          │
   │         conversationState: "YES_AWAITING_HEADCOUNT", │
   │         lastResponseAt, rsvpUpdatedAt }              │
   │                                                      │
   └──────────────────────────────────────────────────────┘
   ↓
9. Handler applies EffectsPatch → updateGuestRsvp(guestId, patch)
   (only keys present in patch are written to MongoDB)
   ↓
10. Sync session from patch
   ↓
11. Send replyText to Telegram
```

#### 3.3 LLM Integration Strategy

| When LLM is used | Condition |
|---|---|
| Interpretation | Rules confidence < 0.85 AND `RSVP_USE_LLM_INTERPRETATION=true` |
| Response generation | `RSVP_USE_LLM_RESPONSES=true` (default: false) |

**Robustness**: JSON extraction with regex fallback, Zod validation, template fallback on any error. System never crashes on LLM failure.

**Configuration**:
```dotenv
RSVP_USE_LLM_INTERPRETATION=true   # Enable LLM fallback
RSVP_USE_LLM_RESPONSES=false        # Use templates (default)
RSVP_CONFIDENCE_THRESHOLD=0.85      # Rules confidence threshold
```

---

### Part 4: Verification

**Check campaign RSVP status:**

```bash
curl http://localhost:3000/api/campaigns/{CAMPAIGN_ID}
```

Expected (after demo interactions):
```json
{
  "guests": [
    {
      "name": "דוד כהן",
      "rsvpStatus": "YES",
      "headcount": 2,
      "conversationState": "DEFAULT",
      "lastResponseAt": "2026-02-10T19:30:00.000Z",
      "rsvpUpdatedAt": "2026-02-10T19:30:00.000Z"
    },
    {
      "name": "שרה לוי",
      "rsvpStatus": "MAYBE",
      "conversationState": "DEFAULT",
      "lastResponseAt": "2026-02-10T19:25:00.000Z"
    }
  ]
}
```

---

## Academic Discussion Points

### Research Contributions

1. **Hybrid NLP Approach**: Combining rule-based and LLM methods for conversational interfaces — deterministic for ~80-90% of messages, LLM for the long tail
2. **LangGraph Agent Architecture**: Expressing conversational business logic as a compiled directed graph with typed state annotations
3. **Hexagonal Domain Isolation**: Port interfaces decouple domain policy from NLU/NLG/DB infrastructure — pure-function business logic with zero side effects
4. **Sparse Effect Patches**: `EffectsPatch` pattern for intent-driven sparse DB updates — only changes what actually needs to change
5. **Hebrew Language Processing**: Rule-based parsing for morphologically rich language: niqqud stripping, prefix removal, gender-variant number words, Levenshtein fuzzy matching

### Technical Challenges Solved

1. **JSON Extraction from LLM**: Robust parsing with regex fallback — handles LLM prose wrappers
2. **Error Resilience**: Graceful degradation at every LLM integration point — system always produces a reply
3. **Intent-Change Detection in Sub-Flows**: Headcount loop falls through to full NLU when number extraction fails, enabling guests to change their mind
4. **Correction Message Handling**: Multi-signal change detection prevents accidental cancellations
5. **Architecture Boundaries**: Domain layer verified by grep — zero infrastructure imports

### Future Research Directions

1. **Multi-language Support**: Extend rules to Arabic, Russian (common in Israeli events)
2. **Sentiment Analysis**: Add as a new LangGraph node without rewiring existing logic
3. **Proactive Reminders**: Scheduled notifications via campaign dispatcher
4. **Analytics Dashboard**: RSVP trend visualization and pattern analysis
5. **Multi-turn Memory**: LangGraph state persistence for cross-session context

---

## Demo Checklist

### Before the presentation:

- [ ] Service running (`npm run dev`)
- [ ] MongoDB connected
- [ ] Telegram bot token configured
- [ ] Anthropic API key configured (for LLM fallback demo)
- [ ] Test campaign created
- [ ] Test links generated
- [ ] Verified bot responds to all demo scenarios

### During the presentation:

- [ ] Show campaign creation (API)
- [ ] Show link generation (API)
- [ ] Demonstrate guest interaction (5 scenarios)
- [ ] Explain architecture diagram
- [ ] Walk through code structure (domain isolation)
- [ ] Show database persistence via API
- [ ] Discuss design decisions and tradeoffs

---

## Troubleshooting

### Bot Not Responding
- Check `TELEGRAM_BOT_TOKEN` in `.env`
- Verify bot launched (check logs for "Bot launched")
- Test with `/start` command

### LLM Not Working
- Verify `ANTHROPIC_API_KEY` is set
- Check `RSVP_USE_LLM_INTERPRETATION=true`
- Review logs for Anthropic API errors

### Database Issues
- Verify `MONGODB_URI` is correct
- Check MongoDB connection in logs
- Ensure unique index on `Invite.token` was created

---

## Conclusion

This system demonstrates practical application of:
- **NLP**: Hybrid rule-based + LLM pipeline for Hebrew conversational understanding
- **Agent Architecture**: LangGraph state graph with pure domain business logic
- **State Management**: Distributed state (DB + session) with sparse effect patches
- **Software Architecture**: Hexagonal architecture with strict layer boundaries
- **Real-world Engineering**: Graceful degradation, cost optimization, type safety, and testability
