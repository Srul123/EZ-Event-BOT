# EZ-Event-BOT - Current Development State Report

## Project Overview

EZ-Event-BOT is a Node.js + TypeScript monorepo application that provides event management functionality through a Telegram bot. The system allows event organizers to create campaigns, manage guests, and send personalized Telegram invite links that connect guests to the bot with their identity pre-loaded.

## Current Implementation Status

### ✅ **Fully Implemented and Working**

#### 1. **Infrastructure & Core Services**
- **Monorepo Structure**: npm workspaces with `apps/bot-service` and `packages/shared`
- **TypeScript Configuration**: ESM (ES2022) with NodeNext module resolution
- **Environment Management**: dotenv with zod validation
- **Logging**: Pino with pino-pretty for development
- **Database**: MongoDB connection via Mongoose
- **HTTP Server**: Express server with health endpoint
- **Graceful Shutdown**: Handles SIGINT/SIGTERM for clean shutdown

#### 2. **Telegram Bot Integration**
- **Bot Connection**: Successfully connected to Telegram via Telegraf
- **Session Management**: Telegraf session middleware for guest data persistence
- **Token-Based Guest Linking**: Core feature fully implemented
- **RSVP Conversational Flow**: Full implementation with interpretation and response generation

#### 3. **Token-Based Guest Identification System**

**How It Works:**
1. **Link Generation**: 
   - API endpoint `POST /api/campaigns/:id/generate-telegram-links` generates personalized Telegram deep links
   - Each link format: `https://t.me/{botUsername}?start=inv_{token}`
   - Tokens are 12-character base64url strings prefixed with `inv_`
   - Tokens are persisted in MongoDB `Invite` collection

2. **Guest Connection Flow**:
   - Guest clicks personalized link → Telegram opens with `/start inv_{token}`
   - Bot extracts token from `/start` command parameter
   - Bot looks up guest data using `getGuestByToken(token)` service
   - Guest data (name, phone, RSVP status) is loaded from database
   - Campaign details (eventTitle, eventDate) are fetched and stored in session
   - Guest session is initialized and stored in Telegraf session
   - Bot sends personalized invitation message in Hebrew:
     ```
     שלום {guestName}! 👋
     
     הוזמנת לאירוע: {eventTitle}
     תאריך: {eventDate}
     
     אנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.
     ```

3. **Session Persistence**:
   - Guest data stored in session for subsequent interactions
   - `/help` command also personalizes response with guest name
   - Returning users (with existing session) get personalized welcome back message

#### 4. **RSVP Conversational Flow (Stage 1)**

**Core Features:**
- **Free-text Message Interpretation**: 
  - Hebrew-first rule-based parsing with keyword detection
  - LLM fallback (Anthropic) for unclear messages when confidence < threshold
  - Extracts RSVP intent (YES/NO/MAYBE/UNKNOWN) and optional headcount
  - Language detection (Hebrew/English)
  
- **Natural Reply Generation**:
  - Hebrew template-based replies (default)
  - Optional LLM-powered natural language responses (behind flag)
  - Personalized messages using guest name
  - Context-aware responses based on conversation state

- **Conversation State Management**:
  - `DEFAULT`: Normal RSVP flow
  - `YES_AWAITING_HEADCOUNT`: Waiting for headcount after YES response
  - State persisted in both database and session (DB is source of truth)

- **RSVP Persistence**:
  - Updates `rsvpStatus` (YES/NO/MAYBE/NO_RESPONSE)
  - Tracks `headcount` (number of attendees)
  - Updates `rsvpUpdatedAt` when status or headcount changes
  - Always updates `lastResponseAt` on meaningful messages
  - Maintains `conversationState` for flow continuity

- **"Already Recorded" Handling**:
  - Guests with final RSVP status (YES/NO) in DEFAULT state receive acknowledgment
  - No database modification unless clear intent to change detected

#### 5. **Campaign Management API**

**Endpoints Implemented:**
- `POST /api/campaigns` - Create campaign with guests
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details with guests
- `POST /api/campaigns/:id/generate-telegram-links` - Generate personalized Telegram links

**Data Models:**
- **Campaign**: name, eventTitle, eventDate, scheduledAt, status
- **Guest**: name, phone, rsvpStatus (NO_RESPONSE, YES, NO, MAYBE), headcount, conversationState, lastResponseAt, rsvpUpdatedAt
- **Invite**: token (unique indexed), guestId, campaignId, usedAt timestamp

#### 6. **Database Schema**

**Collections:**
- `Campaign`: Event campaigns with scheduling
- `Guest`: Guest information linked to campaigns with RSVP tracking
- `Invite`: Token-to-guest mapping with usage tracking

**Indexes:**
- Guest: indexed on `campaignId` and `phone`
- Invite: unique index on `token`, indexed on `guestId` and `campaignId`

**Guest Model Fields:**
- `conversationState`: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT' (tracks conversation flow)
- `lastResponseAt`: Timestamp of last guest message
- `rsvpUpdatedAt`: Timestamp when RSVP status or headcount changed

## Architecture

### Project Structure
```
apps/bot-service/
├── src/
│   ├── bot/
│   │   ├── createBot.ts          # Telegram bot setup and handler wiring
│   │   ├── handlers/
│   │   │   ├── start.handler.ts      # /start command handler
│   │   │   ├── help.handler.ts       # /help command handler
│   │   │   └── guestMessage.handler.ts # Text message RSVP flow handler
│   │   └── rsvp/
│   │       ├── types.ts              # RSVP type definitions
│   │       ├── rsvpFlow.ts           # Main RSVP flow orchestration with change detection
│   │       ├── clarificationQuestions.ts # Adaptive clarification question builder
│   │       ├── interpret/
│   │       │   ├── index.ts          # Interpretation entry point
│   │       │   ├── rules.ts          # Hebrew-first rule-based parsing with fuzzy matching
│   │       │   ├── headcountOnly.ts  # Headcount-only extraction for YES_AWAITING_HEADCOUNT state
│   │       │   ├── llmInterpreter.ts # LLM fallback interpreter
│   │       │   ├── prompts/
│   │       │   │   └── interpret.prompt.ts # Anthropic prompt builder
│   │       │   └── rules.test.ts     # Unit tests for interpretation rules
│   │       └── respond/
│   │           ├── index.ts          # Response generation entry point
│   │           ├── templates.ts      # Hebrew reply templates
│   │           ├── llmResponder.ts   # Optional LLM response generator
│   │           └── prompts/
│   │               └── respond.prompt.ts # Anthropic prompt builder
│   ├── config/
│   │   └── env.ts                # Environment variable validation
│   ├── db/
│   │   └── mongo.ts              # MongoDB connection management
│   ├── domain/
│   │   └── campaigns/
│   │       ├── campaign.model.ts
│   │       ├── campaign.service.ts
│   │       ├── guest.model.ts
│   │       ├── guest.service.ts      # Guest RSVP update service
│   │       ├── guest-session.service.ts  # Token lookup logic
│   │       ├── invite.model.ts
│   │       ├── links.service.ts          # Link generation
│   │       └── types.ts
│   ├── infra/
│   │   └── llm/
│   │       ├── anthropic.ts        # Anthropic API client (SDK-based)
│   │       └── llmClient.ts        # Generic LLM wrapper with retries
│   ├── http/
│   │   ├── routes/
│   │   │   └── campaignRoutes.ts # Campaign API endpoints
│   │   └── server.ts             # Express server setup
│   ├── logger/
│   │   └── logger.ts            # Pino logger configuration
│   └── index.ts                  # Application bootstrap

apps/admin-web/
├── src/
│   ├── components/
│   │   ├── campaign/        # CampaignCard, CampaignForm, CampaignStats
│   │   ├── guest/           # GuestTable, GuestImport, RSVPStatusBadge
│   │   ├── links/           # LinkGenerator
│   │   └── common/          # Reusable UI components
│   ├── views/              # Route components
│   ├── composables/        # useCampaigns, useCsvImport, useNotifications
│   ├── stores/             # Pinia stores
│   ├── api/                # API client and types
│   ├── i18n/               # Internationalization
│   └── utils/              # Formatters, validators, CSV parser
```

### Technology Stack

**Backend (Bot Service):**
- **Runtime**: Node.js 22+ with ESM
- **Language**: TypeScript 5.3+
- **Framework**: Express.js for HTTP API
- **Bot Framework**: Telegraf for Telegram integration
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod for schema validation
- **Logging**: Pino with pino-pretty
- **LLM Integration**: Anthropic Claude API (via official SDK)

**Frontend (Admin Web):**
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Internationalization**: vue-i18n (Hebrew/English)
- **State Management**: Pinia
- **Routing**: Vue Router

## Key Features

### 1. **Personalized Guest Invitation**
When a guest clicks their personalized Telegram link:
- Token is extracted from `/start` command
- Guest data is retrieved from database
- Campaign details (event title and date) are fetched
- Bot sends personalized invitation message in Hebrew:
  ```
  שלום {guestName}! 👋
  
  הוזמנת לאירוע: {eventTitle}
  תאריך: {eventDate}
  
  אנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.
  ```
- Guest session is stored for future interactions
- Message includes clear RSVP instructions

### 2. **Session Management**
- Guest identity persists across bot interactions
- `/help` command personalizes response with guest name
- Returning users see personalized welcome back message

### 3. **Campaign Workflow**
1. Create campaign via API with guest list
2. Generate personalized Telegram links
3. Distribute links to guests
4. Guests click links and are automatically identified
5. Bot sends personalized invitation message with event details and RSVP instructions

### 4. **RSVP Collection Workflow**
1. Guest sends free-text message (e.g., "כן מגיע", "תלוי בעבודה")
2. Bot interprets message using rules (Hebrew-first) or LLM fallback
3. Bot extracts RSVP intent (YES/NO/MAYBE) and optional headcount
4. If YES without headcount: bot asks for headcount, enters YES_AWAITING_HEADCOUNT state
5. Bot generates natural Hebrew reply (templates or LLM-powered)
6. RSVP status and headcount persisted to MongoDB
7. Conversation state maintained for flow continuity

### 5. **RSVP Update Workflow (After Confirmation)**
1. Guest with confirmed RSVP sends update message (e.g., "רק 2 אנשים", "אופס טעיתי, נהיה 2")
2. Bot interprets message and detects change intent
3. Bot identifies type of change:
   - Headcount update (different number with correction/change keywords)
   - Status change (YES → NO, NO → YES)
   - Headcount-only update (number without RSVP keywords)
4. Bot processes update while preserving appropriate context:
   - Headcount updates maintain YES status
   - Correction messages treated as updates, not cancellations
5. Bot confirms update with natural message: "סבבה, מעדכן ל-2 סהכ."
6. Database updated with new values and `rsvpUpdatedAt` timestamp
7. Session remains active for further updates

### 6. **Admin Dashboard Workflow**
1. Organizer creates campaign via web interface
2. Imports guest list (CSV or manual entry)
3. Views campaign details with real-time statistics
4. Generates personalized Telegram links for all guests
5. Copies and distributes links to guests
6. Monitors RSVP responses in real-time:
   - Response rate tracking
   - RSVP breakdown (YES/NO/MAYBE)
   - Total attendees count
   - Individual guest status and headcount
7. Refreshes data to see latest updates

## Current Bot Commands

### `/start [token]`
- **With token**: Looks up guest, fetches campaign details, stores eventTitle/eventDate in session, initializes session, sends personalized invitation message in Hebrew with event details and RSVP instructions
- **Without token (existing session)**: Personalized welcome back
- **Without token (new user)**: Generic welcome message

### `/help`
- **With session**: Personalized help message with guest name
- **Without session**: Generic help message

### **Free-text Messages (RSVP Flow)**
- **Interpretation**: Analyzes message for RSVP intent and headcount
  - Hebrew keywords: "כן", "מגיע", "לא", "תלוי", etc.
  - Headcount extraction: digits, "זוג" (2), "אני+1" (2), etc.
  - LLM fallback when confidence < threshold (default 0.85)
  
- **Response Generation**:
  - Hebrew templates (default): Short, natural replies
  - Optional LLM responses (behind `RSVP_USE_LLM_RESPONSES` flag)
  - Context-aware: Different replies for different conversation states
  
- **State Transitions**:
  - DEFAULT → YES_AWAITING_HEADCOUNT (when YES without headcount)
  - YES_AWAITING_HEADCOUNT → DEFAULT (when headcount provided)
  - State persisted in database and session

## API Documentation

Full API documentation available in `docs/api-campaigns.md` with:
- Request/response schemas
- Error handling
- Example cURL commands
- Complete workflow examples

## Environment Variables

Required configuration:
- `NODE_ENV`: development/production/test
- `PORT`: HTTP server port (default: 3000)
- `TELEGRAM_BOT_TOKEN`: Bot token from BotFather
- `TELEGRAM_BOT_USERNAME`: Bot username for link generation
- `MONGODB_URI`: MongoDB connection string
- `LOG_LEVEL`: Logging verbosity (fatal/error/warn/info/debug/trace)

RSVP Flow configuration:
- `ANTHROPIC_API_KEY`: Anthropic API key (required if `RSVP_USE_LLM_INTERPRETATION=true`)
- `RSVP_USE_LLM_INTERPRETATION`: Enable LLM fallback for interpretation (default: true)
- `RSVP_USE_LLM_RESPONSES`: Enable LLM-powered reply generation (default: false)
- `RSVP_CONFIDENCE_THRESHOLD`: Confidence threshold for LLM fallback (default: 0.85)

## Testing Status

### ✅ Verified Working
- HTTP server starts on configured port
- MongoDB connection successful
- Telegram bot launches and connects
- Health endpoint returns `{"ok": true}`
- Token-based guest identification works
- Personalized greeting with guest name
- Session persistence across commands
- RSVP message interpretation (rules + LLM fallback)
- Natural Hebrew reply generation
- RSVP status and headcount persistence
- Conversation state management

### Manual Testing Workflow
1. Create campaign: `POST /api/campaigns` with guest list
2. Generate links: `POST /api/campaigns/:id/generate-telegram-links`
3. Copy link from response (e.g., `https://t.me/bot?start=inv_abc123`)
4. Open link in browser → Telegram opens
5. Bot sends invitation: `"שלום {GuestName}! 👋 הוזמנת לאירוע: {eventTitle}..."`
6. Send RSVP message: "תלוי בעבודה, עוד לא סגור" → should set MAYBE
7. Send: "כן מגיע" → should ask headcount
8. Send: "אנחנו זוג" → should set YES + headcount=2 and confirm
9. Verify via `GET /api/campaigns/:id` that guest fields updated (rsvpStatus, headcount, conversationState, lastResponseAt)

## Known Limitations / Future Work

### Current Scope
- Basic bot commands (`/start`, `/help`)
- Token-based guest identification
- Campaign and guest management API
- Link generation and distribution
- **RSVP conversational flow (Stage 1)**:
  - Free-text message interpretation (Hebrew-first rules + LLM fallback)
  - Natural reply generation (templates + optional LLM)
  - RSVP status and headcount persistence
  - Conversation state management (DEFAULT / YES_AWAITING_HEADCOUNT)
  - "Already recorded" acknowledgment for final RSVP statuses

#### 7. **Admin Web Frontend (GUI)**

**Technology Stack:**
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Internationalization**: vue-i18n (Hebrew/English support)
- **State Management**: Pinia stores
- **Routing**: Vue Router

**Key Features Implemented:**

- **Campaign Management**:
  - Campaign list view with search and status filtering
  - Campaign detail view with comprehensive statistics
  - Campaign creation form with guest import (CSV support)
  - Real-time RSVP statistics dashboard
  - Campaign status badges (DRAFT, SCHEDULED, RUNNING, COMPLETED, FAILED)

- **Guest Management**:
  - Guest table with sorting and filtering
  - RSVP status badges with color coding
  - Headcount display for confirmed guests
  - Search functionality (by name/phone)
  - Status filtering (NO_RESPONSE, YES, NO, MAYBE)
  - Real-time data refresh

- **Link Generation & Dispatch**:
  - Personalized Telegram link generation interface
  - Bulk link generation for all guests in a campaign
  - Copy-to-clipboard functionality for easy distribution
  - Link display with guest name association

- **Statistics Dashboard**:
  - Total guests count
  - RSVP breakdown (YES/NO/MAYBE counts)
  - Response rate calculation with visual progress bar
  - Total attendees count (sum of headcounts for YES responses)
  - Real-time updates on data refresh

- **User Experience**:
  - Responsive design (mobile-friendly)
  - Loading states and error handling
  - Toast notifications for user feedback
  - Bilingual support (Hebrew/English) with language switcher
  - Modern, clean UI with consistent design system

**File Structure:**
```
apps/admin-web/
├── src/
│   ├── components/
│   │   ├── campaign/        # CampaignCard, CampaignForm, CampaignStats
│   │   ├── guest/           # GuestTable, GuestImport, RSVPStatusBadge
│   │   ├── links/           # LinkGenerator
│   │   └── common/          # Reusable UI components (Button, Card, Badge, etc.)
│   ├── views/              # Route components (CampaignsListView, CampaignDetailView, etc.)
│   ├── composables/        # useCampaigns, useCsvImport, useNotifications
│   ├── stores/             # Pinia stores (campaigns)
│   ├── api/                # API client and types
│   ├── i18n/               # Internationalization (en.js, he.js)
│   └── utils/              # Formatters, validators, CSV parser
```

#### 8. **Enhanced NLP Flow with Intelligent Conversation Handling**

**Advanced Features:**

- **Change Detection & RSVP Updates**:
  - Guests can update their RSVP after confirmation without requiring a new session
  - Intelligent change intent detection using multiple signals:
    - Explicit change keywords: "רק", "משנה", "מעדכן", "change", "update"
    - Correction keywords: "טעיתי", "אופס", "שגיאה", "mistake", "error", "oops"
    - Headcount difference detection (when new headcount differs from current)
    - RSVP status change detection (YES → NO, NO → YES, etc.)
  
- **Correction Message Handling**:
  - Special handling for correction messages (e.g., "אופס טעיתי, נהיה 2")
  - Prevents misinterpretation of corrections as status changes
  - When correction keyword + headcount detected with YES status → treats as headcount update, not cancellation
  - Maintains RSVP status (YES) while updating headcount when appropriate

- **Headcount-Only Updates**:
  - Supports headcount-only messages when guest has confirmed YES status
  - Examples: "רק 2 אנשים" (only 2 people), "2 אנשים" (2 people)
  - Automatically updates headcount while preserving YES status
  - Natural update confirmation: "סבבה, מעדכן ל-2 סהכ." (Got it, updating to 2 total)

- **Fuzzy Matching for Headcount**:
  - Levenshtein distance-based fuzzy matching for Hebrew number words
  - Handles typos in Hebrew number words (e.g., "שנים" instead of "שניים")
  - Context-aware fuzzy matching (only when headcount context words present)
  - Confirmation prompts for low-confidence fuzzy matches

- **Adaptive Clarification Questions**:
  - Context-aware clarification questions based on ambiguity type:
    - FAMILY_TERM: "רק כדי לדעת, כמה תהיו סהכ?" (Just to know, how many total?)
    - RELATIONAL: "רק כדי לדייק, כמה תהיו סהכ?" (Just to be precise, how many total?)
    - RANGE_OR_APPROX: Handles approximate responses gracefully
  - Attempt tracking (max 3 attempts) with graceful fallback
  - Personalized questions using guest name

- **Hebrew Number Word Recognition**:
  - Full support for Hebrew number words (0-10): "אחד", "שניים", "שלושה", etc.
  - Handles variants: "שני"/"שתיים", "שלוש"/"שלושה", etc.
  - Prefix stripping for Hebrew prefixes (ו, ה, ב, ל, כ, מ, ש)
  - Niqqud (diacritical marks) normalization

- **Context-Aware Interpretation**:
  - Headcount context words detection: "אנחנו", "נהיה", "מגיעים", "בסוף", "סהכ", "כולל"
  - Relational phrase recognition: "אני ואשתי" (me and my wife) → 2
  - Family term handling: Detects "ילדים", "משפחה" but asks for clarification if no number
  - Range/approximation detection: "בערך 3", "כ-3", "2-3" → marked as ambiguous

- **Conversation State Management**:
  - `DEFAULT`: Normal RSVP flow, handles all message types
  - `YES_AWAITING_HEADCOUNT`: Focused headcount extraction, prevents conversational drift
  - State persistence in both database and session (DB is source of truth)
  - Automatic state transitions based on conversation flow

- **Already Recorded Handling**:
  - Smart acknowledgment for confirmed RSVPs
  - Interprets message first to detect change intent
  - Only ACKs if no change detected
  - Processes updates seamlessly when change is detected

**NLP Architecture:**

```
Interpretation Pipeline:
1. Rule-based parsing (Hebrew-first) → Fast, deterministic
2. Confidence check → If < threshold (default 0.85)
3. LLM fallback (Anthropic Claude) → Handles edge cases
4. Change detection → Compares with current state
5. Action determination → SET_RSVP / ASK_HEADCOUNT / ACK / CLARIFY

Response Generation:
1. Template-based (default) → Fast, consistent
2. Optional LLM-powered → Natural, contextual (behind flag)
3. Context-aware → Different replies for different states
4. Personalized → Uses guest name
```

### Not Yet Implemented
- Reminder notifications and scheduling
- Campaign dispatching and outbox (backend ready, UI exists)
- Event details display in bot
- Integration with external EZ-Event API
- Advanced bot interactions beyond RSVP collection

## Code Quality

- **Type Safety**: Full TypeScript with strict mode
- **Error Handling**: Comprehensive try-catch with logging
- **Validation**: Zod schemas for API requests and LLM responses
- **Logging**: Structured logging with context
- **Code Organization**: Domain-driven structure with strict separation
  - Domain layer: Zero LLM imports (business logic only)
  - Application layer: LLM code isolated in `bot/rsvp/` and `infra/llm/`
- **Architecture**: Clean separation between interpretation and response generation

## Deployment Readiness

### ✅ Ready
- Environment configuration
- Graceful shutdown handling
- Error logging and monitoring
- Database connection management

### ⚠️ Needs Configuration
- Production environment variables
- MongoDB production connection
- Telegram bot token (currently using dev token)

## Summary

The system now includes **Stage 1 of the RSVP Agent**: a complete conversational RSVP flow that is **fully implemented and working**, plus a **fully functional Admin Web GUI**. The system successfully:

**Bot Capabilities:**
1. **Generates personalized Telegram links** with unique tokens
2. **Connects guests to the bot** via these links
3. **Identifies guests by token** and loads their data
4. **Sends personalized invitation**: Hebrew message with event title, date, and RSVP instructions
5. **Interprets free-text RSVP messages** using Hebrew-first rules with LLM fallback
6. **Extracts RSVP intent** (YES/NO/MAYBE) and optional headcount with advanced NLP
7. **Generates natural Hebrew replies** (templates or LLM-powered)
8. **Persists RSVP data** to MongoDB (status, headcount, conversation state)
9. **Manages conversation flow** with state transitions (DEFAULT / YES_AWAITING_HEADCOUNT)
10. **Handles "already recorded" cases** with smart change detection
11. **Supports RSVP updates after confirmation** without requiring new sessions
12. **Handles correction messages intelligently** (e.g., "אופס טעיתי, נהיה 2")
13. **Fuzzy matching for Hebrew number words** with typo tolerance
14. **Adaptive clarification questions** based on ambiguity type

**Admin Web GUI Capabilities:**
1. **Campaign management** with full CRUD operations
2. **Guest import** via CSV or manual entry
3. **Real-time RSVP statistics** dashboard with visual indicators
4. **Personalized link generation** with bulk operations
5. **Guest table** with search, filtering, and sorting
6. **Bilingual interface** (Hebrew/English) with language switcher
7. **Responsive design** for mobile and desktop
8. **Real-time data refresh** to monitor latest RSVP updates

### Architecture Highlights

**Backend:**
- **Clean separation**: Domain layer has zero LLM code; all LLM logic in application layer
- **Robust interpretation**: Rule-based parsing with configurable LLM fallback
- **Flexible responses**: Template-based (default) with optional LLM enhancement
- **State management**: Conversation state persisted in both DB and session (DB is source of truth)
- **Performance optimized**: Campaign details fetched once during /start, stored in session
- **Intelligent change detection**: Multi-signal approach for detecting RSVP updates
- **Correction handling**: Special logic for mistake/correction messages
- **Fuzzy matching**: Levenshtein distance for Hebrew number word typos

**Frontend:**
- **Component-based architecture**: Reusable UI components with consistent design system
- **Composable functions**: Clean separation of concerns (useCampaigns, useCsvImport, etc.)
- **Internationalization**: Full i18n support with easy language switching
- **Real-time updates**: Refresh functionality to monitor latest RSVP data
- **User-friendly**: Loading states, error handling, toast notifications
- **Responsive**: Mobile-first design with Tailwind CSS

The foundation is solid for extending with reminder notifications, campaign dispatching, and advanced event management features.
