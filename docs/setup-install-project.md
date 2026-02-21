# Project Setup and Installation Guide

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Minimum Version | Purpose |
|---|---|---|
| **Node.js** | 22.0.0+ | Runtime (required by `engines` in package.json) |
| **npm** | 10+ | Package manager (ships with Node.js 22) |
| **MongoDB** | 6.0+ | Database (local install or cloud Atlas) |
| **Telegram Bot Token** | — | From [@BotFather](https://t.me/BotFather) on Telegram |
| **Anthropic API Key** | — | Optional: for LLM-powered RSVP interpretation |

### Verify Node.js version

```bash
node -v
# Should output v22.x.x or higher
```

---

## 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd EZ-Event-BOT

# Install all dependencies (root + all workspaces)
npm install
```

This single `npm install` at the root installs dependencies for all three workspaces:
- `apps/bot-service` — Backend (Express + Telegraf + Mongoose)
- `apps/admin-web` — Frontend (Vue 3 + Vite)
- `packages/shared` — Shared utilities (currently a placeholder)

---

## 2. Environment Configuration

### Create the `.env` file

The bot-service loads environment variables from a `.env` file in the **current working directory** (the repo root when running via `npm run dev` from root).

```bash
# Copy the example from bot-service
cp apps/bot-service/.env.example .env
```

### Edit `.env` with your values

```dotenv
NODE_ENV=development
PORT=3000
TELEGRAM_BOT_TOKEN=<your-bot-token-from-botfather>
TELEGRAM_BOT_USERNAME=<your-bot-username>
MONGODB_URI=mongodb://localhost:27017/ez-event-bot
LOG_LEVEL=info
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, or `test` |
| `PORT` | Yes | — | HTTP server port (typically `3000`) |
| `TELEGRAM_BOT_TOKEN` | Yes | — | Bot token from Telegram BotFather |
| `TELEGRAM_BOT_USERNAME` | No | `EzEventBot` | Bot username (without @) for generating invite links |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `LOG_LEVEL` | No | `info` | Pino log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `ANTHROPIC_API_KEY` | Conditional | — | Required if `RSVP_USE_LLM_INTERPRETATION=true` |
| `RSVP_USE_LLM_INTERPRETATION` | No | `true` | Enable LLM fallback for RSVP message interpretation |
| `RSVP_USE_LLM_RESPONSES` | No | `false` | Enable LLM-generated reply messages |
| `RSVP_CONFIDENCE_THRESHOLD` | No | `0.85` | Confidence threshold for rule-based interpretation before falling back to LLM |

### Running without an Anthropic API key

If you don't have an Anthropic key, set LLM interpretation to false:

```dotenv
RSVP_USE_LLM_INTERPRETATION=false
ANTHROPIC_API_KEY=
```

The bot will still work using rule-based interpretation only (no LLM fallback for ambiguous messages).

---

## 3. MongoDB Setup

### Option A: Local MongoDB

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services or run mongod manually
```

Verify it's running:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

The database `ez-event-bot` is created automatically on first connection.

### Option B: MongoDB Atlas (Cloud)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP
4. Copy the connection string and set it in `.env`:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ez-event-bot?retryWrites=true&w=majority
```

---

## 4. Telegram Bot Setup

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts to create a bot
3. Copy the **bot token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Copy the **bot username** (without @)
5. Set both in your `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=MyEventBot
```

---

## 5. Running the Project

### Start the backend (bot-service)

From the **repository root**:

```bash
npm run dev
```

This runs `tsx watch src/index.ts` in the bot-service workspace. It starts:
- Express HTTP server on `http://localhost:3000`
- Telegram bot (long polling)
- MongoDB connection

You should see output like:
```
[info] MongoDB connected
[info] HTTP server started { port: 3000 }
[info] Telegram bot launched
```

### Start the frontend (admin-web)

In a **separate terminal**, from the repository root:

```bash
npm run dev --workspace=@ez-event-bot/admin-web
```

Or navigate to the workspace directly:

```bash
cd apps/admin-web
npm run dev
```

This starts the Vite dev server on `http://localhost:5173`. The frontend proxies all `/api` requests to `http://localhost:3000` (the backend).

### Verify everything is running

| Service | URL | Expected |
|---|---|---|
| Backend health check | `http://localhost:3000/health` | `{"ok":true}` |
| Campaign API | `http://localhost:3000/api/campaigns` | `[]` (empty array) |
| Admin dashboard | `http://localhost:5173` | Vue app loads |

---

## 6. Build for Production

### Build all workspaces

```bash
npm run build
```

### Build individually

```bash
# Backend (TypeScript → JavaScript)
npm run build --workspace=@ez-event-bot/bot-service

# Frontend (Vue → static files)
npm run build --workspace=@ez-event-bot/admin-web
```

### Run production backend

```bash
npm start --workspace=@ez-event-bot/bot-service
# Runs: node dist/index.js
```

### Preview production frontend

```bash
npm run preview --workspace=@ez-event-bot/admin-web
```

---

## 7. Project Structure

```
EZ-Event-BOT/
├── .env                          ← Your environment variables (git-ignored)
├── package.json                  ← Root workspace config
├── tsconfig.base.json            ← Shared TypeScript config
├── apps/
│   ├── bot-service/              ← Backend service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example          ← Environment template
│   │   └── src/
│   │       ├── index.ts          ← Entry point (bootstrap)
│   │       ├── config/env.ts     ← Zod-validated env config
│   │       ├── db/mongo.ts       ← MongoDB connection
│   │       ├── http/             ← Express server + API routes
│   │       ├── bot/              ← Telegram bot + RSVP flow
│   │       ├── domain/           ← Business logic (Campaign, Guest, Invite)
│   │       ├── infra/llm/        ← Anthropic LLM client
│   │       └── logger/           ← Pino logger
│   └── admin-web/                ← Frontend dashboard
│       ├── package.json
│       ├── vite.config.js
│       ├── index.html
│       └── src/
│           ├── main.js           ← Vue app entry
│           ├── App.vue           ← Root component
│           ├── router/           ← Vue Router
│           ├── stores/           ← Pinia stores
│           ├── views/            ← Page components
│           ├── components/       ← UI components
│           ├── api/              ← Axios API client
│           ├── composables/      ← Vue composables
│           ├── i18n/             ← Hebrew/English translations
│           ├── styles/           ← Tailwind CSS
│           └── utils/            ← Formatters, validators
├── packages/
│   └── shared/                   ← Shared package (placeholder)
└── docs/                         ← Documentation
```

---

## 8. Quick Test Workflow

Once both backend and frontend are running:

### Via API (cURL)

```bash
# 1. Create a campaign with guests
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "eventTitle": "My Test Event",
    "eventDate": "2026-03-15",
    "scheduledAt": "2026-03-10T10:00:00Z",
    "guests": [
      {"name": "Israel", "phone": "0501234567"},
      {"name": "Sarah", "phone": "0529876543"}
    ]
  }'

# 2. Copy the campaignId from the response, then generate links
curl -X POST http://localhost:3000/api/campaigns/<campaignId>/generate-telegram-links

# 3. Copy a link from the response and open it in Telegram
# The bot should greet the guest by name and ask for RSVP
```

### Via Admin Dashboard

1. Open `http://localhost:5173`
2. Navigate to Campaigns → Create Campaign
3. Fill in event details and import guests
4. Generate Telegram invite links
5. Copy a link and test it in Telegram

---

## 9. Common Issues

### `ANTHROPIC_API_KEY is required when RSVP_USE_LLM_INTERPRETATION is true`

The Zod validation fails at startup. Either:
- Set `RSVP_USE_LLM_INTERPRETATION=false` in `.env`
- Or provide a valid `ANTHROPIC_API_KEY`

### `MongooseServerSelectionError: connect ECONNREFUSED`

MongoDB is not running. Start it:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Frontend shows network errors

The backend must be running on port 3000. The Vite dev server proxies `/api` requests to `http://localhost:3000`. Start the backend first.

### `Error: 401 Unauthorized` from Telegram

Your `TELEGRAM_BOT_TOKEN` is invalid. Get a new token from [@BotFather](https://t.me/BotFather).

### Port already in use

Another process is using port 3000 or 5173. Either stop it or change the port:
```dotenv
PORT=3001
```
If you change the backend port, also update the proxy target in `apps/admin-web/vite.config.js`.

---

## 10. npm Workspace Commands Reference

| Command | Scope | Description |
|---|---|---|
| `npm install` | All workspaces | Install all dependencies |
| `npm run dev` | bot-service | Start backend in development mode (watch) |
| `npm run dev -w @ez-event-bot/admin-web` | admin-web | Start frontend dev server |
| `npm run build` | All workspaces | Build all packages |
| `npm run build -w @ez-event-bot/bot-service` | bot-service | Build backend (TypeScript) |
| `npm run build -w @ez-event-bot/admin-web` | admin-web | Build frontend (Vite) |
| `npm start -w @ez-event-bot/bot-service` | bot-service | Run production backend |
| `npm run preview -w @ez-event-bot/admin-web` | admin-web | Preview production frontend |
