# Kalenda

Event management & ticketing platform for Suriname. Organizers manage the full
event lifecycle — publishing events, selling tickets, processing payments and
scanning visitors at the door. Payments are handled manually outside the platform;
the platform coordinates the workflow and issues QR tickets.

## Tech stack

- TanStack Start (React) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma
- Better Auth
- Cloudflare R2

## Getting started

```bash
# install dependencies
npm install

# set up environment
cp .env.example .env
# then fill in DATABASE_URL, auth secrets, R2 credentials, etc.

# database
npx prisma migrate dev
npx prisma generate

# run
npm run dev
```

## Project structure

```
CLAUDE.md      Development guide (read automatically by Claude Code)
docs/          Source-of-truth specifications
src/           Application code
prisma/        Database schema & migrations
```

## Documentation

The `docs/` folder is the single source of truth for design and behaviour:

- `PRODUCT_ARCHITECTURE.md` — product vision, domains, workspaces
- `DATABASE_DOMAIN.md` — domain & data model
- `USER_FLOWS.md` — primary user flows
- `DESIGN_SYSTEM.md` — UI/UX rules and components
- `BUSINESS_RULES.md` — business rules (BR-xxx)
- `ROADMAP.md` — build order and phases

## Development approach

Work is built in **vertical slices**, one roadmap phase at a time. Every feature
must work end to end (database → API → frontend → validation → UX) before the next
one begins. See `ROADMAP.md` for the phase order and `CLAUDE.md` for the working
rules.

## Status

Pre-MVP. Currently at Phase 0 (project setup).
