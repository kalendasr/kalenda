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

Requires Node.js 22+ and a PostgreSQL server.

```bash
npm install
cp .env.example .env
```

Fill in `.env`. `DATABASE_URL` and `BETTER_AUTH_SECRET` are required to boot;
the R2 variables are only validated when file storage is actually used, so you
can start without a Cloudflare account.

Create the development database once:

```bash
sudo -u postgres psql -c "CREATE ROLE kalenda LOGIN PASSWORD 'kalenda' CREATEDB;" -c "CREATE DATABASE kalenda OWNER kalenda;"
```

Then apply migrations and start the dev server:

```bash
npm run db:migrate
npm run dev
```

## Scripts

| Command              | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Dev server on http://localhost:3000      |
| `npm run build`      | Production build                         |
| `npm run preview`    | Serve the production build               |
| `npm run lint`       | ESLint                                   |
| `npm run format`     | Prettier (write)                         |
| `npm run typecheck`  | TypeScript, no emit                      |
| `npm run test`       | Vitest                                   |
| `npm run db:migrate` | Create and apply a migration in dev      |
| `npm run db:deploy`  | Apply pending migrations (CI/production) |
| `npm run db:studio`  | Inspect the database                     |

## Project structure

```
CLAUDE.md            Development guide (read automatically by Claude Code)
docs/                Source-of-truth specifications
prisma/              Database schema & migrations
src/
  routes/            File-based routes; routes/api/** are server routes
  components/ui/     shadcn/ui primitives (generated, not hand-edited)
  components/        Shared application components
  features/          Vertical slices per domain (added per roadmap phase)
  lib/               Cross-cutting modules; *.server.ts is server-only
  test/              Test setup
  generated/         Prisma client output (git-ignored)
```

Imports use the `#/` alias, which maps to `src/` via the `imports` field in
`package.json` — no bundler-specific path plugin involved.

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
