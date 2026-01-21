# EZ-Event-BOT

EZ-Event BOT project - A monorepo-style Node.js + TypeScript project.

## Repository Structure

This repository uses npm workspaces to manage multiple packages and applications.

```
.
├── apps/
│   ├── bot-service/          # Main bot service application
│   │   ├── src/
│   │   │   ├── bot/          # Bot logic (future)
│   │   │   ├── api/          # API logic (future)
│   │   │   ├── db/           # Database logic (future)
│   │   │   ├── config/       # Configuration (future)
│   │   │   ├── utils/        # Utilities (future)
│   │   │   └── index.ts      # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── admin-web/            # Admin web frontend (placeholder)
│       └── package.json
├── packages/
│   └── shared/               # Shared utilities and types
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json              # Root workspace configuration
├── tsconfig.base.json        # Shared TypeScript configuration
└── .gitignore
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the bot service in development mode:
   ```bash
   npm run dev
   ```

3. Build all workspaces:
   ```bash
   npm run build
   ```

## Workspaces

- **apps/bot-service**: Main bot service application
- **apps/admin-web**: Admin web frontend (placeholder for future implementation)
- **packages/shared**: Shared utilities and types used across workspaces

## Requirements

- Node.js >= 22.0.0
- TypeScript 5.3+
