# Admin Web Dashboard

> Part of the [EZ-Event-BOT documentation](README.md).
> See also: [06-api-reference.md](06-api-reference.md) for the REST API consumed by this dashboard.

## 1. Overview

The admin web dashboard is a Vue 3 single-page application for event organizers to create and manage campaigns, monitor RSVP responses in real time, and distribute personalized Telegram invite links. It supports Hebrew (RTL) and English with a bilingual interface.

**Source**: `apps/admin-web/`

---

## 2. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | Composition API | UI framework |
| Vite | latest | Build tool and dev server |
| Tailwind CSS 4 | 4.x | Styling with custom design tokens (see `DESIGN_TOKENS.md`) |
| Pinia | latest | State management |
| Vue Router | 4.x | Client-side routing |
| vue-i18n | latest | Hebrew/English internationalization |
| Axios | latest | HTTP client with request/response interceptors |
| PapaParse | latest | CSV parsing for guest import |
| date-fns | latest | Date formatting |

---

## 3. Application Routes

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Welcome page with call-to-action buttons |
| `/campaigns` | `CampaignsListView` | Campaign list with search and status filtering |
| `/campaigns/create` | `CampaignCreateView` | Multi-step campaign creation wizard with CSV guest import |
| `/campaigns/:id` | `CampaignDetailView` | Campaign statistics, guest table, link generation |
| `/campaigns/:id/dispatch` | `CampaignDispatchView` | Link generation and distribution interface |

---

## 4. Key Features

### 4.1 Campaign Management

- **Campaign list**: Search by name, filter by status (DRAFT, SCHEDULED, RUNNING, COMPLETED, FAILED), status badges
- **Campaign creation wizard**: Multi-step form for event name, title, date, scheduledAt, and guest import
- **Campaign detail view**: Full statistics dashboard with individual guest table
- **Real-time data refresh**: Refresh button updates all stats and guest data from the API

### 4.2 RSVP Statistics Dashboard

Displayed for each campaign in `CampaignDetailView`:

| Metric | Description |
|---|---|
| Total guests | Total count of guests in the campaign |
| YES | Number of confirmed attendees |
| NO | Number of declined guests |
| MAYBE | Number of uncertain guests |
| NO_RESPONSE | Guests who have not yet responded |
| Response rate | Percentage of guests who responded (YES + NO + MAYBE) / total |
| Total attendees | Sum of `headcount` values for all YES guests |

The response rate is displayed as a visual progress bar.

### 4.3 Guest Management

The guest table in `CampaignDetailView` provides:

| Feature | Description |
|---|---|
| RSVP status badges | Color-coded: green (YES), red (NO), yellow (MAYBE), gray (NO_RESPONSE) |
| Headcount display | Shown for YES guests with a confirmed headcount |
| Name/phone columns | Guest identity information |
| Last response time | Formatted timestamp from `lastResponseAt` |
| Search | Filter guests by name or phone number |
| Status filter | Show only guests with a specific RSVP status |
| Sorting | Sortable columns |

### 4.4 Guest Import

The `CampaignCreateView` supports two methods of adding guests:

- **CSV upload**: PapaParse parses uploaded CSV files with columns `name` and `phone`
- **Manual entry**: Add individual guests via form fields

The `useCsvImport` composable handles CSV parsing, validation, and preview before submission.

### 4.5 Link Generation & Distribution

The `CampaignDispatchView` and `LinkGenerator` component provide:

- **Bulk link generation**: Calls `POST /api/campaigns/:id/generate-telegram-links` to generate links for all guests
- **Per-guest links**: Each guest is shown their personalized deep link (`https://t.me/{botUsername}?start=inv_{token}`)
- **Copy to clipboard**: One-click copy for individual links
- **CSV export**: Export all guest links as a CSV file for bulk sending
- **Guest name association**: Links are displayed alongside guest names for easy identification

### 4.6 Internationalization & UX

- **Hebrew/English language switcher**: Persistent selection stored in `localStorage`
- **RTL/LTR layout**: `BaseLayout` dynamically applies RTL for Hebrew, LTR for English using CSS logical properties
- **Responsive design**: Mobile-first, fully usable on phones and tablets
- **Loading states**: Spinner indicators during API calls (`LoadingSpinner` component)
- **Error handling**: Inline error messages for failed API calls
- **Toast notifications**: Non-blocking feedback via `useNotifications` composable and `NotificationContainer` component

---

## 5. Source Structure

```
apps/admin-web/src/
├── main.js                    ← Vue app entry point
├── App.vue                    ← Root component (router-view)
├── components/
│   ├── campaign/
│   │   ├── CampaignCard.vue   ← Campaign summary card for list view
│   │   ├── CampaignForm.vue   ← Campaign creation form
│   │   └── CampaignStats.vue  ← RSVP statistics display
│   ├── guest/
│   │   ├── GuestTable.vue     ← Guest table with search, filter, sort
│   │   ├── GuestImport.vue    ← CSV import + manual entry UI
│   │   └── RSVPStatusBadge.vue ← Colored badge for RSVP status
│   ├── links/
│   │   └── LinkGenerator.vue  ← Link generation and copy/export UI
│   └── common/
│       ├── Button.vue
│       ├── Card.vue
│       ├── Badge.vue
│       ├── Input.vue
│       ├── Modal.vue
│       ├── LoadingSpinner.vue
│       ├── NotificationContainer.vue
│       └── LanguageSwitcher.vue
├── views/
│   ├── HomeView.vue
│   ├── CampaignsListView.vue
│   ├── CampaignCreateView.vue
│   ├── CampaignDetailView.vue
│   └── CampaignDispatchView.vue
├── layouts/
│   └── BaseLayout.vue         ← App shell: header, nav, footer, RTL/LTR
├── composables/
│   ├── useCampaigns.js        ← Campaign CRUD operations
│   ├── useCsvImport.js        ← CSV parsing and validation
│   └── useNotifications.js    ← Toast notification state
├── stores/
│   └── campaigns.js           ← Pinia store (campaign list + detail state)
├── api/
│   ├── client.js              ← Axios base instance (baseURL, interceptors)
│   └── campaigns.js           ← API functions: listCampaigns, getCampaign, createCampaign, generateLinks
├── i18n/
│   ├── en.js                  ← English translations
│   └── he.js                  ← Hebrew translations
├── router/
│   └── index.js               ← Vue Router configuration
├── styles/
│   └── main.css               ← Tailwind CSS 4, design tokens, component layer
└── utils/
    ├── formatters.js          ← Date formatting (date-fns), number formatting
    ├── validators.js          ← Phone and form field validation
    └── csvParser.js           ← CSV parsing utilities (PapaParse wrapper)
```

---

## 6. API Integration

The admin web communicates with the bot-service backend via Axios. In development, the Vite dev server proxies all `/api` requests to `http://localhost:3000`.

**API operations used:**

| Operation | Endpoint | Used In |
|---|---|---|
| List campaigns | `GET /api/campaigns` | `CampaignsListView` |
| Create campaign | `POST /api/campaigns` | `CampaignCreateView` |
| Get campaign details | `GET /api/campaigns/:id` | `CampaignDetailView` |
| Generate Telegram links | `POST /api/campaigns/:id/generate-telegram-links` | `CampaignDispatchView`, `LinkGenerator` |

**Proxy configuration** (`vite.config.js`):
```javascript
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

---

## 7. State Management

Pinia is used for global state. The `campaigns` store holds:

- `campaigns` — list of all campaigns (for `CampaignsListView`)
- `currentCampaign` — detailed campaign with guests (for `CampaignDetailView`)
- `loading` — loading state flags
- `error` — error messages

Most state is fetched on-demand via composables (`useCampaigns`), which call the Pinia store actions. The store is the single source of truth for campaign data within the session.

---

## 8. Design System

Tailwind CSS 4 with custom design tokens documented in `apps/admin-web/DESIGN_TOKENS.md`. The component layer in `main.css` defines reusable classes (`.btn-primary`, `.card`, `.badge-yes`, etc.) that build on the token definitions.

RTL/LTR layout is handled via CSS logical properties (e.g., `ms-4` instead of `ml-4`) so layout automatically mirrors for Hebrew.

---

## 9. Running the Frontend

```bash
# From repository root (separate terminal from backend)
npm run dev --workspace=@ez-event-bot/admin-web

# Or from apps/admin-web directory:
cd apps/admin-web && npm run dev
```

Available at: `http://localhost:5173`

The backend (`npm run dev`) must be running on port 3000 for API calls to work.
