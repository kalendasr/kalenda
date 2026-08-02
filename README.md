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
- Cloudflare R2 (file storage)
- Resend (transactional e-mail)

## Getting started

Requires Node.js 22+ and a PostgreSQL server.

```bash
npm install
cp .env.example .env
```

Fill in `.env`. `DATABASE_URL` and `BETTER_AUTH_SECRET` are required to boot.
The R2 variables are only validated when file storage is actually used and the
`MAIL_*` (Resend) variables only when e-mail is sent (e.g. password reset), so
you can start without those accounts — those specific features just won't work
until they are filled in.

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
  server/            Server functions (loaders & mutations) per domain
  components/ui/     shadcn/ui primitives
  components/        Shared application components (app shell, auth, …)
  lib/               Cross-cutting modules; *.server.ts is server-only
  lib/validation/    Shared zod schemas (one source of truth, client + server)
  test/              Test setup
  generated/         Prisma client output (git-ignored)
```

Imports use the `#/` alias for `src/`, resolved by Vite (`imports` in
`package.json`), TypeScript (`paths` in `tsconfig.json`) and Vitest
(`resolve.alias`). Plain Node does not accept `#/` as a specifier, so
standalone scripts run with `node` must use relative imports.

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

Pre-MVP.

**Phase 1 — Authentication & Organisation — complete.** An organizer can
register, log in, reset their password (Resend e-mail), and create and fully
configure their organisation (general details, branding with logo/cover upload
to R2, and WhatsApp/bank payment settings) from the organisation workspace.

**Phase 2 — Event management — complete.** An organizer can create events, fill
in the details (category, date/time, venue, cover image), add content
(programme, speakers, FAQ, house rules), and publish, unpublish or archive them.
Published events are visible on the public storefront at `/evenementen` and
`/evenementen/:slug`. The full homepage redesign and search/filter are a later
storefront pass.

Next: Phase 3 — Ticketing (see `docs/ROADMAP.md`).
