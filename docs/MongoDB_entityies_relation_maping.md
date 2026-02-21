# MongoDB Schema — Entity Relationship Mapping

## Overview

EZ-Event-BOT uses **MongoDB** (via **Mongoose ODM**) with three collections that model the core domain: event campaigns, invited guests, and token-based invite links. The schema is designed around a one-to-many relationship pattern where a single campaign owns many guests, and each guest can have one or more invite tokens.

All models live under `apps/bot-service/src/domain/campaigns/`.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│             Campaign                │
│─────────────────────────────────────│
│  _id          : ObjectId (PK)      │
│  name         : String  (required) │
│  eventTitle   : String  (required) │
│  eventDate    : String  (optional) │
│  scheduledAt  : Date    (required) │
│  status       : Enum               │
│  createdAt    : Date    (auto)     │
│  updatedAt    : Date    (auto)     │
├─────────────────────────────────────┤
│  Index: { scheduledAt, status }    │
└──────────────┬──────────────────────┘
               │
               │  1 Campaign → N Guests
               │
┌──────────────▼──────────────────────┐
│               Guest                 │
│─────────────────────────────────────│
│  _id               : ObjectId (PK) │
│  campaignId        : ObjectId (FK) │──→ Campaign._id
│  name              : String        │
│  phone             : String        │
│  rsvpStatus        : Enum          │
│  headcount         : Number (opt)  │
│  conversationState : Enum (opt)    │
│  rsvpUpdatedAt     : Date  (opt)   │
│  lastResponseAt    : Date  (opt)   │
│  createdAt         : Date  (auto)  │
│  updatedAt         : Date  (auto)  │
├─────────────────────────────────────┤
│  Index: { campaignId }             │
│  Index: { phone }                  │
└──────────────┬──────────────────────┘
               │
               │  1 Guest → N Invites
               │
┌──────────────▼──────────────────────┐
│              Invite                 │
│─────────────────────────────────────│
│  _id         : ObjectId (PK)       │
│  token       : String   (unique)   │──→ Deep link identifier
│  guestId     : ObjectId (FK)       │──→ Guest._id
│  campaignId  : ObjectId (FK)       │──→ Campaign._id
│  usedAt      : Date     (opt)      │
│  createdAt   : Date     (auto)     │
│  updatedAt   : Date     (auto)     │
├─────────────────────────────────────┤
│  Index: { token }  (unique)        │
│  Index: { guestId }                │
│  Index: { campaignId }             │
└─────────────────────────────────────┘
```

### Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| Campaign → Guest | **One-to-Many** | A campaign contains many guests. `Guest.campaignId` references `Campaign._id`. |
| Guest → Invite | **One-to-Many** | A guest can have multiple invites (e.g., re-generated links). `Invite.guestId` references `Guest._id`. |
| Campaign → Invite | **One-to-Many** | All invites for a campaign. `Invite.campaignId` references `Campaign._id` (denormalized for fast lookup). |

> **No Mongoose `populate()` is used.** All cross-collection lookups are done as explicit sequential queries (find invite → find guest by ID → find campaign by ID). This is intentional — it keeps queries simple and avoids hidden N+1 patterns.

---

## Collection Schemas

### 1. Campaign

Represents an event campaign created by an organizer.

**Source**: `campaign.model.ts`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | MongoDB primary key |
| `name` | `String` | yes | — | Internal campaign name (for organizer reference) |
| `eventTitle` | `String` | yes | — | Public event title shown to guests in bot messages |
| `eventDate` | `String` | no | — | Human-readable event date string (displayed as-is to guests) |
| `scheduledAt` | `Date` | yes | — | When the campaign is scheduled to start dispatching |
| `status` | `String` (enum) | no | `'SCHEDULED'` | Campaign lifecycle state |
| `createdAt` | `Date` | auto | auto | Mongoose timestamp |
| `updatedAt` | `Date` | auto | auto | Mongoose timestamp |

**Status enum values:**

| Value | Meaning |
|---|---|
| `DRAFT` | Campaign created but not scheduled |
| `SCHEDULED` | Campaign scheduled, waiting for dispatch time |
| `RUNNING` | Campaign actively dispatching invites |
| `COMPLETED` | All invites dispatched successfully |
| `FAILED` | Dispatch encountered an error |

> **Note**: The `status` field and `scheduledAt` exist as infrastructure for future campaign dispatching. Currently, no scheduler/worker processes these — campaigns are created as `SCHEDULED` and links are generated on demand via the API.

**Indexes:**

| Fields | Type | Purpose |
|---|---|---|
| `{ scheduledAt: 1, status: 1 }` | Compound | Future use — efficient querying for campaigns ready to dispatch |

**Design decisions:**
- `eventDate` is stored as a free-form `String` (not `Date`) because it's a display value shown directly to guests in Hebrew (e.g., "יום שישי, 25 ביולי"). No date arithmetic is needed on this field.
- `scheduledAt` is a proper `Date` for future scheduler queries (finding campaigns where `scheduledAt <= now AND status = 'SCHEDULED'`).

---

### 2. Guest

Represents an invited guest within a specific campaign. Tracks RSVP status and conversation state with the Telegram bot.

**Source**: `guest.model.ts`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | MongoDB primary key |
| `campaignId` | `ObjectId` (ref: Campaign) | yes | — | The campaign this guest belongs to |
| `name` | `String` | yes | — | Guest's display name (used in bot messages) |
| `phone` | `String` | yes | — | Guest's phone number (imported from CSV/manual entry) |
| `rsvpStatus` | `String` (enum) | no | `'NO_RESPONSE'` | Current RSVP status |
| `headcount` | `Number` | no | — | Number of attendees (set when guest confirms YES) |
| `conversationState` | `String` (enum) | no | `'DEFAULT'` | Bot conversation flow state |
| `rsvpUpdatedAt` | `Date` | no | — | Timestamp when `rsvpStatus` or `headcount` last changed |
| `lastResponseAt` | `Date` | no | — | Timestamp of last meaningful guest message |
| `createdAt` | `Date` | auto | auto | Mongoose timestamp |
| `updatedAt` | `Date` | auto | auto | Mongoose timestamp |

**rsvpStatus enum values:**

| Value | Meaning |
|---|---|
| `NO_RESPONSE` | Guest hasn't responded yet (initial state) |
| `YES` | Guest confirmed attendance |
| `NO` | Guest declined |
| `MAYBE` | Guest is uncertain |

**conversationState enum values:**

| Value | Meaning |
|---|---|
| `DEFAULT` | Normal RSVP flow — accepts all message types |
| `YES_AWAITING_HEADCOUNT` | Guest said YES but hasn't provided headcount — bot is actively asking |

**Indexes:**

| Fields | Type | Purpose |
|---|---|---|
| `{ campaignId: 1 }` | Single | Fetch all guests for a campaign (used by detail view and link generation) |
| `{ phone: 1 }` | Single | Lookup guest by phone number |

**Timestamp semantics:**

| Field | When updated |
|---|---|
| `rsvpUpdatedAt` | Only when `rsvpStatus` changes OR `headcount` changes while status is `YES`. NOT updated on repeat messages with no change. |
| `lastResponseAt` | Every time a meaningful message is processed (including ACK responses with no data change). |
| `updatedAt` | Every `save()` call (Mongoose automatic). |

**Design decisions:**
- `headcount` uses `min: 0` validation. A `null`/`undefined` headcount means "not yet provided" — distinct from `0` which would mean "no additional guests."
- `conversationState` is persisted to DB (not just session) so the bot can recover state if the Telegraf session is lost. **DB is the source of truth** — on each message, the handler fetches the guest from DB and syncs the session.
- `rsvpUpdatedAt` vs `lastResponseAt` distinction enables the admin dashboard to show "last RSVP change" separately from "last interaction," supporting scenarios where a guest sends multiple messages without changing their RSVP.

---

### 3. Invite

Maps a unique token to a guest and campaign. Tokens are embedded in Telegram deep links and used to identify guests when they open the bot.

**Source**: `invite.model.ts`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | auto | MongoDB primary key |
| `token` | `String` | yes (unique) | — | Unique invite token (format: `inv_` + 12-char base64url) |
| `guestId` | `ObjectId` (ref: Guest) | yes | — | The guest this invite belongs to |
| `campaignId` | `ObjectId` (ref: Campaign) | yes | — | The campaign this invite belongs to |
| `usedAt` | `Date` | no | — | Timestamp when the guest first clicked the link |
| `createdAt` | `Date` | auto | auto | Mongoose timestamp |
| `updatedAt` | `Date` | auto | auto | Mongoose timestamp |

**Indexes:**

| Fields | Type | Purpose |
|---|---|---|
| `{ token: 1 }` | Unique | Fast O(1) token lookup when guest opens deep link — the primary access pattern |
| `{ guestId: 1 }` | Single | Find all invites for a guest (e.g., check if links already generated) |
| `{ campaignId: 1 }` | Single | Find all invites for a campaign |

**Token format:**
```
inv_aB3xK9mP2nQ7    (prefix "inv_" + 12 random base64url chars)
```
Generated via `crypto.randomBytes(8).toString('base64url').substring(0, 12)`.

**Design decisions:**
- `campaignId` is **denormalized** (it could be derived from `guestId → Guest.campaignId`). Stored directly on Invite for query convenience — avoids a join when listing invites per campaign.
- `usedAt` tracks first usage only. Set once when the guest clicks the link, never updated again. This lets the organizer see which guests have opened their invite vs. which haven't.
- A guest can have **multiple Invite records** if links are regenerated (e.g., organizer clicks "Generate Links" again). Each generation creates new tokens. All old tokens remain valid.

---

## Data Flow & Query Patterns

### 1. Campaign Creation

```
API: POST /api/campaigns  →  campaign.service.ts → createCampaign()
```

1. Create one `Campaign` document
2. Bulk insert `Guest` documents via `insertMany()`, each with `campaignId` referencing the new campaign
3. All guests start with `rsvpStatus: 'NO_RESPONSE'`

```
Campaign { _id: C1, name: "Wedding", eventTitle: "חתונה של דני ומיכל", ... }
Guest    { _id: G1, campaignId: C1, name: "Israel", phone: "0501234567", rsvpStatus: "NO_RESPONSE" }
Guest    { _id: G2, campaignId: C1, name: "Sarah",  phone: "0529876543", rsvpStatus: "NO_RESPONSE" }
```

### 2. Link Generation

```
API: POST /api/campaigns/:id/generate-telegram-links  →  links.service.ts → generateTelegramInviteLinks()
```

1. Find campaign by ID
2. Find all guests where `{ campaignId }`
3. For each guest: generate random token, create `Invite` document, return link

```
Invite { token: "inv_aB3xK9mP2n", guestId: G1, campaignId: C1 }
Invite { token: "inv_zY8wV6tR4s", guestId: G2, campaignId: C1 }

Links:
  https://t.me/BotName?start=inv_aB3xK9mP2n  →  Israel
  https://t.me/BotName?start=inv_zY8wV6tR4s  →  Sarah
```

### 3. Guest Identification (Bot /start)

```
Bot: /start inv_aB3xK9mP2n  →  guest-session.service.ts → getGuestByToken()
```

1. `InviteModel.findOne({ token })` — O(1) via unique index
2. `GuestModel.findById(invite.guestId)` — O(1) by primary key
3. Mark `invite.usedAt = now` if first use
4. `CampaignModel.findById(guest.campaignId)` — O(1) to fetch event details for the greeting message
5. Return guest session data to bot handler

```
Token "inv_aB3xK9mP2n"
  → Invite { guestId: G1, campaignId: C1 }
  → Guest  { name: "Israel", phone: "0501234567", rsvpStatus: "NO_RESPONSE" }
  → Campaign { eventTitle: "חתונה של דני ומיכל", eventDate: "25 ביולי" }
```

### 4. RSVP Update (Bot message handler)

```
Bot: text message  →  guestMessage.handler.ts → guest.service.ts → updateGuestRsvp()
```

1. `GuestModel.findById(session.guestId)` — fetch current state (DB is source of truth)
2. Process message through RSVP flow (interpret → decide action)
3. `guest.save()` — update fields based on action:
   - `rsvpStatus`, `headcount`, `conversationState`, `lastResponseAt`
   - `rsvpUpdatedAt` set automatically only when status or headcount actually changes

### 5. Campaign Details (Admin dashboard)

```
API: GET /api/campaigns/:id  →  campaign.service.ts → getCampaignDetails()
```

1. `CampaignModel.findById(campaignId)` — campaign metadata
2. `GuestModel.find({ campaignId })` — all guests for this campaign (uses `campaignId` index)
3. Return combined result with guest list

### 6. Campaign List (Admin dashboard)

```
API: GET /api/campaigns  →  campaign.service.ts → listCampaigns()
```

1. `CampaignModel.find().sort({ createdAt: -1 })` — all campaigns, newest first
2. Uses `.select()` projection to return only needed fields

---

## Index Strategy

| Collection | Index | Unique | Primary Query |
|---|---|---|---|
| Campaign | `{ scheduledAt: 1, status: 1 }` | No | Future scheduler: find campaigns ready to dispatch |
| Guest | `{ campaignId: 1 }` | No | Get all guests in a campaign |
| Guest | `{ phone: 1 }` | No | Lookup by phone (not currently used in queries, available for future) |
| Invite | `{ token: 1 }` | **Yes** | Token-to-guest resolution on `/start` command |
| Invite | `{ guestId: 1 }` | No | Find invites for a specific guest |
| Invite | `{ campaignId: 1 }` | No | Find all invites in a campaign |

### Why no compound indexes on Guest?

The current query patterns only filter guests by `campaignId` (fetch all guests for a campaign). There's no query that filters by both `campaignId` and `rsvpStatus` at the DB level — RSVP filtering happens in the frontend. If campaign guest counts grow large, a compound index on `{ campaignId: 1, rsvpStatus: 1 }` could be added.

### Why `phone` is indexed but not unique?

A person can be invited to multiple campaigns with the same phone number. Each campaign creates its own Guest document, so the same phone can appear across different `campaignId` values.

---

## Denormalization Choices

| Field | Location | Why Denormalized |
|---|---|---|
| `Invite.campaignId` | Invite | Avoids needing to join through Guest to find which campaign an invite belongs to. Enables direct `Invite.find({ campaignId })` queries. |
| Session `eventTitle`, `eventDate` | Bot session (in-memory) | Fetched once during `/start` and cached in Telegraf session. Avoids repeated Campaign lookups on every guest message. Not persisted to DB. |

### What is NOT denormalized (and why)

- **Guest name is not on Invite**: Invite is a thin lookup table. The guest name is only needed after resolving the token, and the Guest document is always fetched anyway.
- **RSVP stats are not pre-aggregated on Campaign**: Stats (total YES, total headcount, response rate) are computed on-the-fly from the guest list. With typical campaign sizes (tens to low hundreds of guests), this is fast enough without materialized aggregations.

---

## TypeScript Type Definitions

**Source**: `types.ts`

```typescript
export type RsvpStatus = 'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CreateCampaignGuestInput = {
  name: string;
  phone: string;
};

export type CreateCampaignRequest = {
  name: string;
  eventTitle: string;
  eventDate?: string;
  scheduledAt: string; // ISO string in request, converted to Date before save
  guests: CreateCampaignGuestInput[];
};
```

**Mongoose Document interfaces** are defined in each model file (`CampaignDocument`, `GuestDocument`, `InviteDocument`) and extend `mongoose.Document`.

---

## Data Lifecycle

```
[Organizer creates campaign]
     │
     ▼
Campaign (SCHEDULED) + N × Guest (NO_RESPONSE)
     │
     │  [Organizer generates links]
     ▼
N × Invite (token, guestId, campaignId)
     │
     │  [Guest clicks link]
     ▼
Invite.usedAt = now
Bot session initialized (guest data + campaign details cached)
     │
     │  [Guest sends RSVP message]
     ▼
Guest.rsvpStatus = YES/NO/MAYBE
Guest.headcount = N (if YES)
Guest.conversationState = DEFAULT / YES_AWAITING_HEADCOUNT
Guest.lastResponseAt = now
Guest.rsvpUpdatedAt = now (only if status/headcount changed)
     │
     │  [Guest sends update message]
     ▼
Guest fields updated again (same logic, change detection)
     │
     │  [Organizer views dashboard]
     ▼
Campaign + all Guests fetched → stats computed client-side
```

---

## Schema Validation

- **API layer**: Zod schemas validate incoming requests before any DB operations (in `campaignRoutes.ts`)
- **Mongoose layer**: Schema-level validation (`required`, `enum`, `min`) as a safety net
- **Service layer**: Business logic validation in `updateGuestRsvp()` (e.g., valid rsvpStatus check)

---

## Considerations for Future Growth

| Scenario | Current State | Potential Change |
|---|---|---|
| Large guest lists (1000+) | `insertMany` + single `find({ campaignId })` | Pagination on guest list API, compound index `{ campaignId, rsvpStatus }` |
| Campaign scheduling | `scheduledAt` + `status` fields exist, no worker | Add a cron job / worker that queries `{ scheduledAt: { $lte: now }, status: 'SCHEDULED' }` |
| Multi-organizer | No auth, single-tenant | Add `organizerId` field to Campaign, authentication middleware |
| Guest across campaigns | Same phone = separate Guest docs | Could add a top-level `Contact` collection with deduplication if cross-campaign analytics needed |
| Invite expiration | No TTL, all invites valid forever | Add `expiresAt` field + TTL index, or check in `getGuestByToken()` |
| Message history | Only latest state tracked | Add a `Message` collection to log full conversation history per guest |
