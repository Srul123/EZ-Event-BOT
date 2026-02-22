# EZ-Event-BOT: Demo Guide for Academic Presentation

## Overview

**EZ-Event-BOT** is a conversational Telegram bot system for event management that enables organizers to collect RSVP responses from guests through natural language interactions. The system combines rule-based parsing with LLM-powered interpretation to understand free-text messages in Hebrew and English, making event RSVP collection seamless and user-friendly.

---

## System Architecture Overview

### High-Level Architecture

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

- **Runtime**: Node.js 22+ with ESM
- **Language**: TypeScript 5.3+ (strict mode)
- **Framework**: Express.js (HTTP API), Telegraf (Telegram bot)
- **Agent Framework**: LangGraph (`@langchain/langgraph`) — state graph orchestration for RSVP flow
- **Database**: MongoDB with Mongoose ODM
- **LLM**: Anthropic Claude 3 Haiku (via official SDK) — optimized for classification tasks
- **Validation**: Zod for schema validation
- **Logging**: Pino (structured logging)

---

## Demo Flow: Step-by-Step

### Prerequisites Setup

1. **Start the service**:
   ```bash
   npm run dev --workspace=@ez-event-bot/bot-service
   ```

2. **Verify services are running**:
   - HTTP server: `GET http://localhost:3000/health` → `{"ok": true}`
   - MongoDB: Check logs for connection success
   - Telegram bot: Check logs for "Bot launched successfully"

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
- System creates Guest documents in MongoDB

**Expected Response**:
```json
{
  "campaign": {
    "_id": "...",
    "name": "Demo Event - Academic Presentation",
    "eventTitle": "Research Project Demo",
    "eventDate": "2026-02-15",
    "guests": [...]
  }
}
```

**Save the `campaign._id` for next steps!**

#### Step 1.2: Generate Personalized Telegram Links

```bash
curl -X POST http://localhost:3000/api/campaigns/{CAMPAIGN_ID}/generate-telegram-links
```

**What to explain**:
- Each guest gets a unique token (12-char base64url)
- Token is stored in `Invite` collection with unique index
- Link format: `https://t.me/{botUsername}?start=inv_{token}`
- Token maps guest identity to Telegram user

**Expected Response**:
```json
{
  "links": [
    {
      "guestName": "דוד כהן",
      "link": "https://t.me/your_bot?start=inv_abc123xyz456"
    },
    ...
  ]
}
```

**Highlight**: Each link is unique and personalized. Guest identity is pre-loaded.

---

### Part 2: Guest Interaction Flow

**Goal**: Demonstrate the conversational RSVP flow with natural language understanding.

#### Step 2.1: Guest Opens Link

1. **Open one of the generated links** in a browser or Telegram
2. **Bot responds with personalized invitation**:
   ```
   שלום דוד כהן! 👋
   
   הוזמנת לאירוע: Research Project Demo
   תאריך: 2026-02-15
   
   אנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.
   ```
3. **Explain**: 
   - Token extracted from `/start` command
   - Guest data loaded from database
   - Campaign details (eventTitle, eventDate) fetched and stored in session
   - Personalized invitation message includes event details and RSVP instructions
   - Session initialized for subsequent interactions

#### Step 2.2: RSVP with Natural Language

**Scenario 1: Simple YES**

Guest sends: `"כן מגיע"`

**What happens**:
1. **Interpretation Layer**:
   - Rules engine detects Hebrew keyword "כן" (YES)
   - Confidence: 0.9 (high)
   - No headcount detected
   - Result: `{rsvp: "YES", headcount: null, confidence: 0.9, needsHeadcount: true}`

2. **Flow Logic**:
   - Detects YES without headcount
   - Action: `ASK_HEADCOUNT`
   - State transition: `DEFAULT` → `YES_AWAITING_HEADCOUNT`

3. **Response Generation**:
   - Template: `"דוד כהן, כמה אנשים יגיעו?"`
   - Persisted to DB: `rsvpStatus: "YES"`, `conversationState: "YES_AWAITING_HEADCOUNT"`

**Bot replies**: `"דוד כהן, כמה אנשים יגיעו?"`

**Explain**:
- Rule-based parsing is fast and deterministic
- Hebrew-first approach for common cases
- State management enables multi-turn conversations

**Scenario 2: Provide Headcount**

Guest sends: `"אנחנו זוג"` (We're a couple)

**What happens**:
1. **Interpretation** (in `YES_AWAITING_HEADCOUNT` state):
   - **Important**: Does NOT call full interpretation again
   - Only extracts headcount from rules: "זוג" → 2
   - Headcount found: 2

2. **Flow Logic**:
   - Action: `SET_RSVP` with `headcount: 2`
   - State transition: `YES_AWAITING_HEADCOUNT` → `DEFAULT`

3. **Response Generation**:
   - Template: `"תודה דוד כהן! נרשמת 2 אנשים."`

4. **Persistence**:
   - Updates: `rsvpStatus: "YES"`, `headcount: 2`, `conversationState: "DEFAULT"`
   - Updates: `rsvpUpdatedAt` (status/headcount changed)
   - Updates: `lastResponseAt` (always updated)

**Bot replies**: `"תודה דוד כהן! נרשמת 2 אנשים."`

**Explain**:
- State-aware flow prevents redundant interpretation
- Headcount extraction handles natural language ("זוג", "אני+1", digits)
- Database persistence with proper timestamp tracking

**Scenario 3: MAYBE Response**

Guest sends: `"תלוי בעבודה, עוד לא סגור"` (Depends on work, not sure yet)

**What happens**:
1. **Interpretation**:
   - Rules detect "תלוי" (depends) → MAYBE
   - Confidence: 0.85 (meets threshold)
   - Result: `{rsvp: "MAYBE", confidence: 0.85}`

2. **Flow Logic**:
   - Action: `SET_RSVP` with `rsvpStatus: "MAYBE"`

3. **Response Generation**:
   - Template: `"הבנתי, תודה. תעדכן אותי כשיהיה ברור."`
   - **Note**: Does NOT promise reminders (by design)

**Bot replies**: `"הבנתי, תודה. תעדכן אותי כשיהיה ברור."`

**Explain**:
- Handles ambiguous responses gracefully
- Template messages are concise and natural
- No false promises about reminders (MVP scope)

**Scenario 4: LLM Fallback (Optional)**

Guest sends: `"אני חושב שאגיע אבל צריך לבדוק עם הבוס"` (I think I'll come but need to check with the boss)

**What happens**:
1. **Interpretation**:
   - Rules attempt parsing: confidence < 0.85 (threshold)
   - Falls back to LLM (if `RSVP_USE_LLM_INTERPRETATION=true`)
   - LLM analyzes context and extracts intent
   - Result: `{rsvp: "MAYBE", confidence: 0.8}`

2. **Response**: Similar to Scenario 3

**Explain**:
- Hybrid approach: fast rules for common cases, LLM for complex messages
- Configurable via environment variables
- Robust JSON extraction with fallback to safe defaults

**Scenario 5: Already Recorded**

Guest with existing `rsvpStatus: "YES"` sends: `"שלום"` (Hello)

**What happens**:
1. **Flow Logic**:
   - Detects: `currentRsvpStatus: "YES"` + `conversationState: "DEFAULT"`
   - Action: `ACK` (acknowledge, no DB modification)
   - Response: `"תודה דוד כהן! כבר נרשמת 2 אנשים."`

**Explain**:
- Prevents unnecessary database writes
- Provides helpful acknowledgment
- Keeps flow simple for MVP

---

### Part 3: Architecture Deep Dive

**Goal**: Explain the technical architecture and design decisions.

#### 3.1: Code Structure Walkthrough

```
apps/bot-service/src/
├── domain/                        # Pure domain (NO bot/mongoose/telegraf imports)
│   ├── rsvp/
│   │   └── types.ts               # Shared types: RsvpStatus, Interpretation, etc.
│   ├── rsvp-graph/                # LangGraph RSVP agent (the core)
│   │   ├── types.ts               # GuestContext, Action (6 types), EffectsPatch
│   │   ├── ports.ts               # NluPort, NlgPort, ClockPort, LoggerPort
│   │   ├── state.ts               # LangGraph Annotation (7 channels)
│   │   ├── graph.ts               # StateGraph with conditional routing
│   │   ├── index.ts               # createRsvpGraphRunner() — public API
│   │   └── nodes/
│   │       ├── interpretFull.ts       # NLU node
│   │       ├── interpretHeadcount.ts  # Headcount-only extraction
│   │       ├── decideAction.ts        # ALL business logic (pure function)
│   │       ├── composeReply.ts        # NLG node
│   │       ├── buildEffects.ts        # Action → EffectsPatch
│   │       └── decideAction.test.ts   # 19 unit tests
│   └── campaigns/
│       ├── guest.model.ts         # MongoDB schema
│       ├── guest.service.ts       # RSVP update logic
│       └── guest-session.service.ts
│
├── bot/
│   ├── handlers/                  # Thin handlers
│   │   ├── start.handler.ts
│   │   ├── help.handler.ts
│   │   └── guestMessage.handler.ts  # Calls graph runner, applies EffectsPatch
│   ├── adapters/                  # Port implementations
│   │   ├── nluAdapter.ts          # NluPort → wraps interpret/*
│   │   └── nlgAdapter.ts          # NlgPort → wraps respond/*
│   └── rsvp/                      # Existing NLU/NLG (accessed via adapters)
│       ├── types.ts               # Re-export shim + bot-layer types
│       ├── rsvpFlow.ts            # LEGACY (retained, not imported)
│       ├── interpret/             # Rules + LLM interpretation
│       └── respond/               # Templates + LLM responses
│
└── infra/
    └── llm/                       # LLM infrastructure
        ├── anthropic.ts           # SDK wrapper
        └── llmClient.ts           # Retry/timeout logic
```

**Key Points**:
- **Hexagonal Architecture**: Domain graph depends on port interfaces; adapters bridge to existing code
- **Pure Business Logic**: `decideAction` is a pure function with 19 unit tests — no async, no mocks needed
- **Architecture Boundaries**: `domain/rsvp-graph/` never imports `bot/`, `mongoose`, `telegraf`, or calls `new Date()`
- **Testability**: Each layer can be tested independently; domain graph is fully isolated

#### 3.2: Data Flow Example

**Message: "כן מגיע"**

```
1. Telegram → guestMessage.handler.ts
   ↓
2. Fetch guest from DB (source of truth)
   ↓
3. Build GuestContext (guestId, guestName, eventTitle, currentRsvpStatus, conversationState, ...)
   ↓
4. runGraph({ messageText: "כן מגיע", guestContext })
   ↓
   ┌─── LangGraph State Graph ───────────────────────────┐
   │                                                      │
   │  5. routeByState → "DEFAULT" → interpretFull node    │
   │     ↓                                                │
   │     NluPort.interpretMessage("כן מגיע", context)     │
   │     ├─→ rules.ts (Hebrew parsing)                    │
   │     │   └─→ Confidence: 0.9 ✓ (meets threshold)     │
   │     └─→ Sets state.interpretation = {rsvp: "YES"}    │
   │     ↓                                                │
   │  6. decideAction node (pure function)                │
   │     └─→ YES + no headcount → Action: ASK_HEADCOUNT  │
   │     ↓                                                │
   │  7. composeReply node                                │
   │     └─→ NlgPort.buildClarificationQuestion()        │
   │     └─→ "דוד כהן, רק כדי לדעת, כמה תהיו סהכ?"     │
   │     ↓                                                │
   │  8. buildEffects node (via ClockPort)                │
   │     └─→ EffectsPatch: { rsvpStatus: "YES",          │
   │         conversationState: "YES_AWAITING_HEADCOUNT", │
   │         lastResponseAt, rsvpUpdatedAt }              │
   │                                                      │
   └──────────────────────────────────────────────────────┘
   ↓
9. Handler applies EffectsPatch → updateGuestRsvp(guestId, patch)
   ├─→ Only writes keys present in patch
   └─→ Returns updated GuestDocument
   ↓
10. Sync session from patch
   ↓
11. Send replyText to Telegram
```

#### 3.3: State Management

**Conversation States**:
- `DEFAULT`: Normal RSVP flow → `interpretFull` node
- `YES_AWAITING_HEADCOUNT`: First tries `interpretHeadcount` (cheap, number-only); falls through to `interpretFull` if no exact result (enables intent changes like "actually no")

**State Persistence**:
- **Database**: Source of truth (`guest.conversationState`)
- **Session**: Cached for performance
- **Sync Policy**: Session syncs from DB on message, persists back after flow

**Example State Transition**:
```
DEFAULT → (YES without headcount) → YES_AWAITING_HEADCOUNT
YES_AWAITING_HEADCOUNT → (headcount provided) → DEFAULT
```

#### 3.4: LLM Integration Strategy

**When LLM is Used**:
1. **Interpretation**: Only when rules confidence < threshold (default 0.85)
2. **Response Generation**: Only if `RSVP_USE_LLM_RESPONSES=true` (default: false)

**Robustness**:
- JSON extraction with regex fallback
- Zod validation of LLM responses
- Safe fallback to templates on any error
- Never crashes on LLM failures

**Configuration**:
```env
RSVP_USE_LLM_INTERPRETATION=true   # Enable LLM fallback
RSVP_USE_LLM_RESPONSES=false        # Use templates (default)
RSVP_CONFIDENCE_THRESHOLD=0.85      # Rules confidence threshold
```

---

### Part 4: Verification & Results

**Goal**: Show how organizers can verify RSVP data.

#### Step 4.1: Check Campaign Status

```bash
curl http://localhost:3000/api/campaigns/{CAMPAIGN_ID}
```

**Expected Response**:
```json
{
  "campaign": {
    "_id": "...",
    "eventTitle": "Research Project Demo",
    "guests": [
      {
        "name": "דוד כהן",
        "rsvpStatus": "YES",
        "headcount": 2,
        "conversationState": "DEFAULT",
        "lastResponseAt": "2026-01-25T19:30:00.000Z",
        "rsvpUpdatedAt": "2026-01-25T19:30:00.000Z"
      },
      {
        "name": "שרה לוי",
        "rsvpStatus": "MAYBE",
        "conversationState": "DEFAULT",
        "lastResponseAt": "2026-01-25T19:25:00.000Z"
      }
    ]
  }
}
```

**Explain**:
- All RSVP data persisted correctly
- Timestamps track when responses were received and updated
- Conversation state maintained for flow continuity

---

## Key Features to Highlight

### 1. **Natural Language Understanding**
- Hebrew-first rule-based parsing
- LLM fallback for complex messages
- Handles variations: "כן", "מגיע", "סבבה", "ok"

### 2. **Conversational Flow**
- Multi-turn conversations (YES → headcount)
- State-aware responses
- Context preservation across messages

### 3. **Robust Architecture**
- Hexagonal (ports & adapters): domain graph isolated from infrastructure
- LangGraph state graph: compiled once, reused per invocation
- Pure `decideAction` function: all business logic, fully unit-tested
- Type-safe with TypeScript; strict architecture boundary enforcement
- Error handling with graceful fallbacks at every layer

### 4. **Performance Optimizations**
- Campaign details fetched once (during /start)
- Session caching for guest data
- Rules-first approach (fast, no API calls for common cases)

### 5. **Scalability Considerations**
- Stateless HTTP API
- Session-based bot state
- MongoDB for persistence
- LLM calls only when needed

---

## Academic Discussion Points

### Research Contributions

1. **Hybrid NLP Approach**: Combining rule-based and LLM methods for conversational interfaces
2. **LangGraph Agent Architecture**: Expressing conversational business logic as a compiled directed graph with typed state annotations
3. **Hexagonal Domain Isolation**: Port interfaces decouple domain policy from NLU/NLG/DB infrastructure — pure-function business logic with zero side effects
4. **State Management**: Conversation state persistence in distributed systems (DB + session) with sparse effect patches
5. **Hebrew Language Processing**: Rule-based parsing for morphologically rich languages

### Technical Challenges Solved

1. **JSON Extraction from LLM**: Robust parsing with regex fallback
2. **Error Resilience**: System never crashes on LLM failures
3. **Type Safety**: Full TypeScript coverage with strict mode
4. **Architecture Boundaries**: Domain layer verified by grep — zero imports from `bot/`, `mongoose`, `telegraf`, no `new Date()`
5. **Intent-Change Detection in Sub-Flows**: Headcount loop falls through to full NLU when number extraction fails, enabling guests to change their mind

### Future Research Directions

1. **Multi-language Support**: Extend rules to other languages
2. **Sentiment Analysis**: Add as a new graph node without rewiring existing logic
3. **Proactive Reminders**: Scheduled notifications (out of MVP scope)
4. **Analytics Dashboard**: Visualize RSVP trends and patterns
5. **Multi-turn Memory**: Leverage LangGraph's state persistence for cross-session context

---

## Demo Checklist

Before the presentation:

- [ ] Service running (`npm run dev`)
- [ ] MongoDB connected
- [ ] Telegram bot token configured
- [ ] Anthropic API key configured (if using LLM)
- [ ] Test campaign created
- [ ] Test links generated
- [ ] Test guest interactions completed
- [ ] API responses verified

During the presentation:

- [ ] Show campaign creation
- [ ] Show link generation
- [ ] Demonstrate guest interaction flow
- [ ] Explain architecture diagram
- [ ] Walk through code structure
- [ ] Show database persistence
- [ ] Discuss design decisions
- [ ] Answer questions about scalability/performance

---

## Troubleshooting

### Bot Not Responding
- Check Telegram bot token in `.env`
- Verify bot is launched (check logs)
- Test with `/start` command

### LLM Not Working
- Verify `ANTHROPIC_API_KEY` is set
- Check `RSVP_USE_LLM_INTERPRETATION` flag
- Review logs for API errors

### Database Issues
- Verify `MONGODB_URI` is correct
- Check MongoDB connection logs
- Ensure indexes are created (unique index on Invite.token)

---

## Conclusion

This demo showcases a production-ready conversational bot system that:
- Sends personalized invitation messages with event details
- Handles natural language in Hebrew and English
- Implements RSVP logic as a **LangGraph state graph** with pure domain business logic
- Uses **hexagonal architecture** (ports & adapters) to isolate domain from infrastructure
- Maintains conversation state across interactions with sparse effect patches
- Provides robust error handling and fallbacks at every layer
- Scales with proper state management and compiled graph reuse

The system demonstrates practical application of NLP, agent-based architecture (LangGraph), state management, and software architecture principles in a real-world event management context.
