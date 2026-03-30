# SplenditSuite — Project Context for Claude Code

## Project Overview
SplenditSuite is the unified internal platform for SplendIT (splendit.cz) — an IT consulting and staffing company.
Hosted at **splendidjob.cz**. All modules live in one Next.js app with shared auth, design system, and Firebase backend.

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 14 (App Router)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **AI:** Anthropic SDK (@anthropic-ai/sdk)
- **Styling:** Tailwind CSS + custom design tokens
- **Testing:** Jest + ts-jest
- **Hosting:** Firebase App Hosting (splendidjob.cz)
- **Document processing:** mammoth (docx), pdf-parse (pdf)

## Critical Rules — NEVER break these
- **NEVER** modify `.env.local` or any `.env*` files
- **NEVER** commit secrets, API keys, or tokens to git
- **NEVER** delete or overwrite Firestore data without explicit confirmation
- **NEVER** change `lib/firebase.ts` or `lib/auth-context.tsx` without asking first
- **NEVER** install new npm packages without asking first
- **NEVER** use `any` type — always use proper TypeScript types from `lib/types.ts`
- **NEVER** use `dangerouslySetInnerHTML` without sanitization
- **NEVER** put server secrets in `NEXT_PUBLIC_*` variables
- **ALWAYS** write tests for new functionality in `__tests__/`
- **ALWAYS** validate and sanitize user inputs before Firestore writes
- **ALWAYS** check `useAuth()` protection on new platform pages

## Repository Structure

```
splendit-suite/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (platform)/           # Protected modules (all require auth)
│   │   ├── layout.tsx        # Sidebar + header layout
│   │   ├── dashboard/        # Main dashboard with AI insights
│   │   ├── crm/              # CRM — candidates, projects
│   │   ├── ims/              # Interview Management System
│   │   ├── meet-visualizer/  # Meet Visualizer (D3.js)
│   │   ├── deal-radar/       # Deal pipeline tracking
│   │   ├── bodyshop/         # Contractor management
│   │   └── bot/              # SplenditBot (AI assistant)
│   ├── api/                  # API routes
│   └── portal/               # External portal
├── components/
│   ├── bodyshop/             # Bodyshop module components
│   ├── companies/            # Company components
│   ├── crm-candidates/       # CRM candidate components
│   ├── layout/               # Sidebar, Header, Nav
│   ├── meet-visu/            # Meet visualizer components
│   └── projects/             # Project components
├── lib/
│   ├── firebase.ts           # Firebase config + init (DO NOT MODIFY)
│   ├── auth-context.tsx      # Auth provider (DO NOT MODIFY)
│   ├── types.ts              # Shared TypeScript types
│   ├── ai.ts                 # AI/Anthropic integration
│   ├── ai-usage.ts           # AI usage tracking
│   ├── bodyshop.ts           # Bodyshop data layer
│   ├── companies.ts          # Companies data layer
│   ├── crm-candidates.ts     # CRM candidates data layer
│   ├── deals.ts              # Deals data layer
│   ├── projects.ts           # Projects data layer
│   ├── project-candidates.ts # Project-candidate relations
│   ├── meet-visu.ts          # Meet visualizer data layer
│   ├── portal.ts             # Portal data layer
│   └── portal-auth-context.tsx # Portal auth
├── __tests__/
│   ├── api/                  # API route tests
│   └── lib/                  # Library/data layer tests
├── scripts/
│   ├── gen-questions.js      # Generate IMS questions
│   └── import-recru.js       # Import from RECRU system
├── interview-system/         # Legacy reference (vanilla HTML, being migrated)
└── meet-visu/                # Legacy reference (vanilla HTML, being migrated)
```

## Module Status

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Dashboard | /dashboard | active | AI insights integration |
| CRM - Candidates | /crm/candidates | active | RECRU import, search, pipeline |
| CRM - Projects | /crm/projects | active | Project tracking |
| IMS | /ims | migrating | From interview-system/ (legacy HTML) |
| Meet Visualizer | /meet-visualizer | migrating | From meet-visu/ (legacy HTML, D3) |
| Deal Radar | /deal-radar | in progress | Deal pipeline management |
| Bodyshop | /bodyshop | in progress | Contractor tracking |
| Bot | /bot | in progress | AI-powered assistant |
| Portal | /portal | in progress | External client/candidate portal |

## Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build for production
npm run lint      # Lint
npx jest          # Run all tests
npx jest --watch  # Run tests in watch mode
```

## Testing Conventions
- Tests live in `__tests__/` mirroring the source structure
- API tests: `__tests__/api/` — test API routes
- Library tests: `__tests__/lib/` — test data layer functions
- Use Jest + ts-jest
- Mock Firebase calls — never hit real Firestore in tests
- Every bug fix must include a regression test
- Run `npx jest` before committing

## Design System
- **Primary:** #00a87a (teal)
- **Secondary:** #0091c7 (blue)
- **Accent:** #6b46a8 (purple)
- **Background:** #f0faf8 (mint)
- **Fonts:** Syne (headings) + JetBrains Mono (body/UI)
- **Style:** Glassmorphic cards, aurora backdrop, soft shadows
- Use Tailwind utility classes — avoid inline styles
- Component naming: PascalCase for components, camelCase for utils

## Code Conventions

### TypeScript
- Strict mode — no `any`, no `@ts-ignore`
- Define all types in `lib/types.ts` or co-located `.types.ts` files
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`, never use `var`

### Data Layer Pattern
Each module follows the same pattern in `lib/`:
- Export CRUD functions that talk to Firestore
- Always validate inputs before writes
- Numeric fields: `Number(value)` — never store strings in numeric fields
- Optional fields: use `undefined` (not empty string)
- Return typed results, throw typed errors

### Components
- One component per file
- Keep components under 200 lines — split if larger
- Props interface at top of file
- Use `"use client"` directive only when needed (interactivity, hooks)

### Git
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes
- Commit messages: imperative mood, max 72 chars subject line
- One logical change per commit
- Never force-push to `main`

### Language
- UI strings: Slovak
- Code, comments, docs: English

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
| ANTHROPIC_API_KEY | Anthropic API (server-side only!) | ✓ |
| RESEND_API_KEY | Email service (server-side only!) | ✗ |

**Rule:** `NEXT_PUBLIC_*` = visible in browser. Server-only secrets MUST NOT have this prefix.

## Security Rules

### Firestore
- Production: authenticated users only (`request.auth != null`)
- NEVER deploy `allow read, write: if true` to production
- Validate data types and field lengths in security rules

### Input Validation
- Sanitize all user inputs before Firestore writes
- Validate URLs (block `javascript:` scheme)
- Never concatenate user input into Firestore query paths

### Dependencies
- Run `npm audit` regularly — fix high/critical vulnerabilities
- Do not add unmaintained packages without review

## Pending Tasks

> See `TODO.md` for the full task list. Key items:
> - LinkedIn extension: fix headline extraction (MutationObserver), remove DEBUG block
