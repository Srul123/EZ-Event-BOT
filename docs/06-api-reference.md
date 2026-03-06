# API Reference — Campaign Management

> Part of the [EZ-Event-BOT documentation](README.md).

**Base URL:** `http://localhost:3000/api`

The Campaign Management API is a RESTful HTTP API served by the bot-service (Express.js). It provides endpoints for creating campaigns, managing guests, and generating personalized Telegram invite links.

---

## Table of Contents

- [Create Campaign](#create-campaign)
- [List Campaigns](#list-campaigns)
- [Get Campaign Details](#get-campaign-details)
- [Generate Telegram Links](#generate-telegram-links)
- [Data Types](#data-types)
- [Error Responses](#error-responses)
- [Environment Variables](#environment-variables)

---

## Create Campaign

Creates a new campaign with associated guests.

**Endpoint:** `POST /api/campaigns`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Summer BBQ 2024",
  "eventTitle": "Annual Summer BBQ Party",
  "eventDate": "2024-07-15",
  "scheduledAt": "2024-07-10T10:00:00Z",
  "guests": [
    {
      "name": "John Doe",
      "phone": "+1234567890"
    },
    {
      "name": "Jane Smith",
      "phone": "+0987654321"
    }
  ]
}
```

**Field Descriptions:**
- `name` (string, required): Campaign name/identifier
- `eventTitle` (string, required): Title of the event
- `eventDate` (string, optional): Event date in ISO format (YYYY-MM-DD)
- `scheduledAt` (string, required): ISO 8601 datetime string for when the campaign should be executed
- `guests` (array, required, min 1): Array of guest objects
  - `name` (string, required): Guest's full name
  - `phone` (string, required): Guest's phone number

**Success Response (200 OK):**
```json
{
  "campaignId": "6970b507ce951f625695114b"
}
```

**Error Responses:**

- **400 Bad Request** - Validation error:
```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "array",
      "inclusive": true,
      "exact": false,
      "message": "Array must contain at least 1 element(s)",
      "path": ["guests"]
    }
  ]
}
```

- **500 Internal Server Error** - Server error:
```json
{
  "error": "Failed to create campaign"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer BBQ 2024",
    "eventTitle": "Annual Summer BBQ Party",
    "eventDate": "2024-07-15",
    "scheduledAt": "2024-07-10T10:00:00Z",
    "guests": [
      {"name": "John Doe", "phone": "+1234567890"},
      {"name": "Jane Smith", "phone": "+0987654321"}
    ]
  }'
```

---

## List Campaigns

Retrieves a list of all campaigns, sorted by creation date (newest first).

**Endpoint:** `GET /api/campaigns`

**Request:** No request body required.

**Success Response (200 OK):**
```json
[
  {
    "id": "6970b507ce951f625695114b",
    "name": "Summer BBQ 2024",
    "eventTitle": "Annual Summer BBQ Party",
    "scheduledAt": "2024-07-10T10:00:00.000Z",
    "status": "SCHEDULED",
    "createdAt": "2024-01-15T08:30:00.000Z"
  },
  {
    "id": "6970b507ce951f625695114c",
    "name": "Winter Gala 2024",
    "eventTitle": "Annual Winter Gala",
    "scheduledAt": "2024-12-20T18:00:00.000Z",
    "status": "SCHEDULED",
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
]
```

**Field Descriptions:**
- `id` (string): Campaign unique identifier
- `name` (string): Campaign name
- `eventTitle` (string): Event title
- `scheduledAt` (string): ISO 8601 datetime when campaign is scheduled
- `status` (string): Campaign status (`DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `FAILED`)
- `createdAt` (string): ISO 8601 datetime when campaign was created

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Failed to list campaigns"
}
```

**Example cURL:**
```bash
curl http://localhost:3000/api/campaigns
```

---

## Get Campaign Details

Retrieves detailed information about a specific campaign, including all associated guests.

**Endpoint:** `GET /api/campaigns/:id`

**URL Parameters:**
- `id` (string, required): Campaign ID (MongoDB ObjectId)

**Example:** `GET /api/campaigns/6970b507ce951f625695114b`

**Success Response (200 OK):**
```json
{
  "id": "6970b507ce951f625695114b",
  "name": "Summer BBQ 2024",
  "eventTitle": "Annual Summer BBQ Party",
  "eventDate": "2024-07-15",
  "scheduledAt": "2024-07-10T10:00:00.000Z",
  "status": "SCHEDULED",
  "createdAt": "2024-01-15T08:30:00.000Z",
  "updatedAt": "2024-01-15T08:30:00.000Z",
  "guests": [
    {
      "id": "6970b507ce951f625695114d",
      "name": "John Doe",
      "phone": "+1234567890",
      "rsvpStatus": "NO_RESPONSE",
      "headcount": null,
      "updatedAt": "2024-01-15T08:30:00.000Z"
    },
    {
      "id": "6970b507ce951f625695114e",
      "name": "Jane Smith",
      "phone": "+0987654321",
      "rsvpStatus": "NO_RESPONSE",
      "headcount": null,
      "updatedAt": "2024-01-15T08:30:00.000Z"
    }
  ]
}
```

**Campaign Fields:**
- `id` (string): Campaign unique identifier
- `name` (string): Campaign name
- `eventTitle` (string): Event title
- `eventDate` (string, optional): Event date
- `scheduledAt` (string): ISO 8601 datetime when campaign is scheduled
- `status` (string): Campaign status
- `createdAt` / `updatedAt` (string): ISO 8601 timestamps

**Guest Fields:**
- `id` (string): Guest unique identifier
- `name` (string): Guest's full name
- `phone` (string): Guest's phone number
- `rsvpStatus` (string): RSVP status (`NO_RESPONSE`, `YES`, `NO`, `MAYBE`)
- `headcount` (number | null): Number of attendees (if provided by guest)
- `updatedAt` (string): ISO 8601 datetime when guest record was last updated

**Error Responses:**

- **404 Not Found:**
```json
{
  "error": "Campaign not found"
}
```

- **500 Internal Server Error:**
```json
{
  "error": "Failed to get campaign details"
}
```

**Example cURL:**
```bash
curl http://localhost:3000/api/campaigns/6970b507ce951f625695114b
```

---

## Generate Telegram Links

Generates personalized Telegram deep links for all guests in a campaign. Each link contains a unique token that identifies the guest when they interact with the bot.

**Endpoint:** `POST /api/campaigns/:id/generate-telegram-links`

**URL Parameters:**
- `id` (string, required): Campaign ID (MongoDB ObjectId)

**Request:** No request body required.

**Success Response (200 OK):**
```json
{
  "campaignId": "6970b507ce951f625695114b",
  "botUsername": "EzEventBot",
  "links": [
    {
      "guestId": "6970b507ce951f625695114d",
      "name": "John Doe",
      "phone": "+1234567890",
      "link": "https://t.me/EzEventBot?start=inv_evUWgi549vE",
      "token": "inv_evUWgi549vE"
    },
    {
      "guestId": "6970b507ce951f625695114e",
      "name": "Jane Smith",
      "phone": "+0987654321",
      "link": "https://t.me/EzEventBot?start=inv_aBc123XyZ",
      "token": "inv_aBc123XyZ"
    }
  ]
}
```

**Field Descriptions:**
- `campaignId` (string): Campaign unique identifier
- `botUsername` (string): Telegram bot username (from `TELEGRAM_BOT_USERNAME` env var)
- `links` (array): Array of invite link objects
  - `guestId` (string): Guest unique identifier
  - `name` (string): Guest's full name
  - `phone` (string): Guest's phone number
  - `link` (string): Full Telegram deep link URL
  - `token` (string): Unique invite token (format: `inv_<12-char-token>`)

**Important Notes:**
- Tokens are persisted in the database and linked to guests
- Each token can be used to identify the guest when they interact with the bot
- When a guest clicks the link and starts the bot, the token is used to initialize their session
- Calling this endpoint multiple times generates new tokens; all previous tokens remain valid

**Error Responses:**

- **404 Not Found:**
```json
{
  "error": "Campaign not found"
}
```

- **500 Internal Server Error:**
```json
{
  "error": "Failed to generate Telegram links"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/campaigns/6970b507ce951f625695114b/generate-telegram-links
```

**Usage Workflow:**
1. Create a campaign with guests using `POST /api/campaigns`
2. Generate Telegram links using `POST /api/campaigns/:id/generate-telegram-links`
3. Copy the links from the response and send them to guests
4. When a guest clicks the link, Telegram opens with `/start inv_<token>`
5. The bot identifies the guest by token and personalizes the conversation

---

## Data Types

### Campaign Status
```typescript
type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
```

### RSVP Status
```typescript
type RsvpStatus = 'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE';
```

| Value | Meaning |
|---|---|
| `NO_RESPONSE` | Default status when guest is created |
| `YES` | Guest confirmed attendance |
| `NO` | Guest declined |
| `MAYBE` | Guest is unsure |

---

## Error Responses

### 400 Bad Request
Validation errors when request body doesn't match the expected schema.

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["name"],
      "message": "Required"
    }
  ]
}
```

### 404 Not Found
Resource not found (campaign ID doesn't exist).

```json
{
  "error": "Campaign not found"
}
```

### 500 Internal Server Error
Unexpected server errors.

```json
{
  "error": "Failed to <operation>"
}
```

---

## Complete Workflow Example

**Step 1 — Create a campaign:**
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "eventTitle": "Test Event Title",
    "eventDate": "2024-12-25",
    "scheduledAt": "2024-12-20T10:00:00Z",
    "guests": [
      {"name": "Alice", "phone": "+1111111111"},
      {"name": "Bob", "phone": "+2222222222"}
    ]
  }'
```

**Step 2 — List all campaigns:**
```bash
curl http://localhost:3000/api/campaigns
```

**Step 3 — Get campaign details:**
```bash
curl http://localhost:3000/api/campaigns/6970b507ce951f625695114b
```

**Step 4 — Generate Telegram links:**
```bash
curl -X POST http://localhost:3000/api/campaigns/6970b507ce951f625695114b/generate-telegram-links
```

**Step 5 — Test a generated link:**
Copy a link from the response (e.g., `https://t.me/EzEventBot?start=inv_evUWgi549vE`) and open it in Telegram. The bot should greet the guest by name.

---

## Environment Variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_USERNAME` | Telegram bot username (default: `EzEventBot`) |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | HTTP server port (default: `3000`) |

---

## Notes

- All datetime fields use ISO 8601 format
- Campaign IDs are MongoDB ObjectIds (24-character hex strings)
- Guest RSVP status is channel-agnostic and represents only the response status
- Tokens generated for Telegram links are unique and persisted in the database
- The bot uses tokens to identify guests and personalize conversations
