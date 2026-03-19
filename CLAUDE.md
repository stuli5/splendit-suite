# Splendit Suite — Claude Code Guide

## Project Overview
SplenditSuite is the unified internal platform for Splendit IT recruitment, hosted at splendidjob.cz.
All modules live in one Next.js app with shared auth, design system, and Firebase backend.

## Tech Stack
- **Language:** TypeScript
- **Framework:** Next.js 14 (App Router)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Styling:** Tailwind CSS + custom design tokens
- **Hosting:** Firebase Hosting (splendidjob.cz)

## Repository Structure

```
splendit-suite/
├── app/
│   ├── (auth)/login/         # Login page
│   └── (platform)/           # Protected modules
│       ├── layout.tsx         # Sidebar + header layout
│       ├── dashboard/         # Main dashboard
│       ├── crm/               # CRM — candidates, projects
│       ├── ims/               # Interview Management System
│       ├── meet-visualizer/   # Meet Visualizer (D3)
│       ├── deal-radar/        # Deal pipeline
│       ├── bodyshop/          # Contractor management
│       └── bot/               # SplenditBot
├── components/
│   ├── layout/                # Sidebar, Header, Nav
│   └── ui/                    # Shared UI components
├── lib/
│   ├── firebase.ts            # Firebase config + init
│   └── auth-context.tsx       # Auth provider
├── meet-visu/                 # Migration reference (vanilla HTML)
└── interview-system/          # Migration reference (vanilla HTML)
```

## Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build for production
npm run lint      # Lint
```

## Design System
- **Primary:** #00a87a (teal)
- **Secondary:** #0091c7 (blue)
- **Accent:** #6b46a8 (purple)
- **Background:** #f0faf8 (mint)
- **Fonts:** Syne (headings) + JetBrains Mono (body/UI)
- **Style:** Glassmorphic cards, aurora backdrop, soft shadows

## Code Conventions

### General
- Prefer explicit over implicit — name things clearly
- Keep functions small and focused (single responsibility)
- No magic numbers — use named constants
- Delete dead code rather than commenting it out

### Git
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes
- Commit messages: imperative mood, max 72 chars subject line
- One logical change per commit
- Never force-push to `main`

### Pull Requests
- Keep PRs focused — one concern per PR
- Include a test for every bug fix
- Update docs when changing behavior

## Environment Variables

```bash
cp .env.example .env.local
```

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase API key | ✓ |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase auth domain | ✓ |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase project ID | ✓ |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Storage bucket | ✓ |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Messaging sender ID | ✓ |
| NEXT_PUBLIC_FIREBASE_APP_ID | App ID | ✓ |

## Modules

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | /dashboard | skeleton |
| CRM - Candidates | /crm/candidates | skeleton |
| CRM - Projects | /crm/projects | skeleton |
| IMS | /ims | migrating from interview-system/ |
| Meet Visualizer | /meet-visualizer | migrating from meet-visu/ |
| Deal Radar | /deal-radar | todo |
| Bodyshop | /bodyshop | todo |
| Bot | /bot | todo |
