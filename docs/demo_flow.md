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
│      Telegraf Bot Service            │
│  - Session Management                │
│  - Message Handling                  │
│  - RSVP Flow Orchestration           │
└────────┬─────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
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

1. **Domain-Driven Design**: Business logic separated from infrastructure
2. **Clean Architecture**: Domain layer has zero LLM dependencies
3. **Modular Design**: Interpretation and response generation are separate modules
4. **State Management**: Conversation state persisted in both DB and session (DB is source of truth)

---

## Technology Stack

- **Runtime**: Node.js 22+ with ESM
- **Language**: TypeScript 5.3+ (strict mode)
- **Framework**: Express.js (HTTP API), Telegraf (Telegram bot)
- **Database**: MongoDB with Mongoose ODM
- **LLM**: Anthropic Claude 3.5 Sonnet (via official SDK)
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
├── domain/              # Business logic (NO LLM imports)
│   └── campaigns/
│       ├── guest.model.ts      # MongoDB schema
│       ├── guest.service.ts    # RSVP update logic
│       └── guest-session.service.ts
│
├── bot/
│   ├── handlers/       # Thin handlers (orchestration)
│   │   ├── start.handler.ts
│   │   ├── help.handler.ts
│   │   └── guestMessage.handler.ts
│   │
│   └── rsvp/           # RSVP application logic
│       ├── types.ts            # Type definitions
│       ├── rsvpFlow.ts         # Flow orchestration
│       ├── interpret/          # Message interpretation
│       │   ├── rules.ts        # Hebrew-first rules
│       │   ├── llmInterpreter.ts
│       │   └── prompts/
│       └── respond/            # Reply generation
│           ├── templates.ts   # Hebrew templates
│           ├── llmResponder.ts
│           └── prompts/
│
└── infra/
    └── llm/            # LLM infrastructure
        ├── anthropic.ts        # SDK wrapper
        └── llmClient.ts       # Retry/timeout logic
```

**Key Points**:
- **Separation of Concerns**: Domain layer is pure business logic
- **Modularity**: Interpretation and response are separate modules
- **Testability**: Each layer can be tested independently

#### 3.2: Data Flow Example

**Message: "כן מגיע"**

```
1. Telegram → guestMessage.handler.ts
   ↓
2. Fetch guest from DB (source of truth)
   ↓
3. Build FlowContext (guestName, eventTitle, currentRsvpStatus, conversationState)
   ↓
4. rsvpFlow.ts → handleIncomingTextMessage()
   ↓
5. interpret/index.ts → interpretMessage()
   ├─→ rules.ts (Hebrew parsing)
   │   └─→ Confidence: 0.9 ✓ (meets threshold)
   └─→ Returns: {rsvp: "YES", needsHeadcount: true}
   ↓
6. rsvpFlow.ts determines action: ASK_HEADCOUNT
   ↓
7. respond/index.ts → composeReply()
   ├─→ templates.ts (Hebrew template)
   └─→ Returns: "דוד כהן, כמה אנשים יגיעו?"
   ↓
8. guest.service.ts → updateGuestRsvp()
   ├─→ Updates: rsvpStatus, conversationState, lastResponseAt
   └─→ Returns updated GuestDocument
   ↓
9. Update session with DB values
   ↓
10. Send reply to Telegram
```

#### 3.3: State Management

**Conversation States**:
- `DEFAULT`: Normal RSVP flow, full interpretation
- `YES_AWAITING_HEADCOUNT`: Waiting for headcount, only extract number

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
- Clean separation: domain vs. application
- Type-safe with TypeScript
- Error handling with graceful fallbacks
- Structured logging for debugging

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
2. **State Management**: Conversation state persistence in distributed systems (DB + session)
3. **Hebrew Language Processing**: Rule-based parsing for morphologically rich languages

### Technical Challenges Solved

1. **JSON Extraction from LLM**: Robust parsing with regex fallback
2. **Error Resilience**: System never crashes on LLM failures
3. **Type Safety**: Full TypeScript coverage with strict mode
4. **Architecture Cleanliness**: Zero LLM code in domain layer

### Future Research Directions

1. **Multi-language Support**: Extend rules to other languages
2. **Sentiment Analysis**: Detect guest sentiment from messages
3. **Proactive Reminders**: Scheduled notifications (out of MVP scope)
4. **Analytics Dashboard**: Visualize RSVP trends and patterns

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
- Maintains conversation state across interactions
- Provides robust error handling and fallbacks
- Follows clean architecture principles
- Scales with proper state management

The system demonstrates practical application of NLP, state management, and software architecture principles in a real-world event management context.
