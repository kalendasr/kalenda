# CLAUDE.md

Event Management & Ticketing Platform for Suriname.

This file is the operating guide for Claude Code. If code conflicts with this
document, this document wins. Detailed specifications live in `docs/` — always
consult them before implementing a feature.

---

## 1. What this project is

A professional event management & ticketing platform. Organizers manage the full
event lifecycle; visitors discover events and buy tickets. Payments are handled
**manually outside the platform** — the platform coordinates the workflow and
tracks status, it never processes money.

The heart of the platform is the **Order**: customer creates an order → organizer
processes the payment → platform issues QR tickets → tickets get scanned at the door.

---

## 2. Tech stack

- Framework: TanStack Start (React) + TypeScript
- Styling: Tailwind CSS + shadcn/ui (Lucide icons only)
- Database: PostgreSQL via Prisma
- Auth: Better Auth
- File storage: Cloudflare R2
- Tooling: ESLint, Prettier, Husky, GitHub Actions

---

## 3. Common commands

These become active after the Phase 0 scaffold is in place.

```bash
npm run dev            # start dev server
npm run build          # production build
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # run tests

npx prisma migrate dev # create/apply a migration in dev
npx prisma generate    # regenerate the Prisma client
npx prisma studio      # inspect the database
```

Run `lint` and `test` before every commit.

---

## 4. Project structure

```
CLAUDE.md              # this file (read automatically by Claude Code)
README.md
docs/                  # source-of-truth specifications
  PRODUCT_ARCHITECTURE.md
  DATABASE_DOMAIN.md
  USER_FLOWS.md
  DESIGN_SYSTEM.md
  BUSINESS_RULES.md
  ROADMAP.md
src/                   # application code (created during Phase 0)
prisma/                # schema + migrations
```

---

## 5. Reference documents

Before building, read the relevant spec — do not guess.

- Architecture & domains: `docs/PRODUCT_ARCHITECTURE.md`
- Domain / data model: `docs/DATABASE_DOMAIN.md`
- User flows: `docs/USER_FLOWS.md`
- Design system & UI rules: `docs/DESIGN_SYSTEM.md`
- Business rules (BR-xxx): `docs/BUSINESS_RULES.md`
- Build order & phases: `docs/ROADMAP.md`

---

## 6. How to work in this repo

Follow the roadmap in `docs/ROADMAP.md`. Build **vertical slices**: each feature
must work end to end (database → API → frontend → validation → UX) before moving on.
Do not build isolated screens or half-finished workflows. Do not build a later
phase during an earlier one.

Architecture-first order for every feature:
user workflow → business rules → domain model → database → API → frontend → polish.

Commit and push after every completed slice.

---

## 7. Core principles (always apply)

- **Workflow first.** Design around what the user is trying to accomplish, never
  around pages, CRUD or forms. Every screen has exactly one primary responsibility.
- **Orders are the center.** Optimize for order handling and payment processing,
  not for configuration screens.
- **One source of truth.** Never duplicate data, pages, settings or actions.
  Organization info lives only in Organization; payment settings only in
  Organization → Payments; ticket types only in Ticket Types.
- **Delete before create.** Before adding anything, ask whether something can be
  removed or an existing workflow reused. Simpler always wins.
- **Don't surprise the user.** Every important action must say what happened, what
  happens next, who acts next, and when to expect a result.
- **Mobile first.** Organizers process payments and scan tickets on their phone.
  Desktop extends mobile, never the other way around.
- **Premium SaaS feel.** Aim for Stripe / Linear / Notion quality. Avoid generic
  admin-dashboard aesthetics.

---

## 8. Payment workflows (critical, do not deviate)

**WhatsApp**
Customer selects tickets → chooses WhatsApp payment request → picks Mope or Uni5Pay
→ order created → organizer is notified → organizer manually sends the payment
request from their own app → customer pays → organizer confirms payment in the
platform → platform issues QR tickets.

**Bank transfer**
Customer creates order → platform shows bank details → customer transfers → customer
uploads proof of payment → organizer verifies and approves → platform issues tickets.

Tickets are only issued when `PaymentStatus == Verified`. The organizer decides
whether a payment is valid, never the platform.

---

## 9. Non-negotiables

- UUID primary keys; soft delete (`deletedAt`) where specified in the domain model.
- `createdAt` / `updatedAt` on every entity.
- Order status only moves forward (see BR-505). Orders never skip steps.
- Accessibility on every component: keyboard, visible focus, ARIA, contrast.
- No `TODO`, `FIXME`, dead code or placeholder implementations in committed code.
- Follow the design system exactly; use only the approved component library.
