# CLAUDE.md — Event Platform AI Development Guide

Version: 2.0 (compressed)

This document defines philosophy, architecture, UX rules, and engineering standards. Every AI-generated change must comply with it. If code conflicts with this document, this document wins. For numbered business rules (BR-xxx), see `docs/BUSINESS_RULES.md` — that document is authoritative for validation logic.

---

## 1. Vision

A professional Event Management & Ticketing Platform for Suriname — not just an event website. Organizers manage the full event lifecycle (create, sell, check in); visitors discover and buy. **The platform manages the process, not the transaction** — payments happen outside the platform (see §6).

Mission: let an organizer go from "create organization" to "issue QR tickets" in minutes. Compete on simplicity and speed, not feature count.

---

## 2. Product Philosophy

- Design around **workflows**, never around pages, CRUD, or forms. Ask "what is the user trying to accomplish?" not "what can we display?"
- Every screen has exactly one responsibility. If it starts solving multiple problems, split it.
- One source of truth per data type — never duplicate a field across two screens (e.g. org info lives only in Organization; ticket prices only in Ticket Types).
- MVP = solve one complete workflow extremely well. Avoid premature complexity, enterprise features, and building for hypothetical future needs. Implement only what's needed now; design so it can extend later.
- Before adding anything new: can something be removed or simplified instead? Simplifying beats adding.

---

## 3. Design & UX

**Visual style:** premium SaaS feel (Stripe, Shopify, Eventbrite, Airbnb, Linear, Notion as reference — not generic admin dashboards). Modern, calm, usable. Mobile-first always; desktop extends mobile, never the reverse.

**Communicating with users:**
- Never leave the user wondering "what happens now?" — every important action states what happened, what happens next, who acts next, and when.
- Microcopy is human, not technical: "We received your payment," not "Payment registered." "Please enter a valid phone number," not "Validation failed."
- Empty states explain *why* it's empty and give one clear CTA — never bare "No data."
- Confirm important actions explicitly (event published, order completed, payment confirmed, ticket sent). Never silently redirect.
- Long forms split into logical grouped steps (General / Location / Tickets / Payments / Publishing / Review) — never a 25-field wall.

**Consistency & reuse:** same action always looks the same (primary buttons, danger=red, success=green, info=blue, warning=orange). Before building a new component, check if an existing one (button, card, table, dialog, badge, input, tabs) already solves it.

**Accessibility & performance:** every new component supports keyboard navigation, visible focus, ARIA labels, proper contrast, semantic HTML — non-negotiable. Optimize for perceived speed: lazy load, avoid unnecessary re-renders, prefer composition over deep component trees.

---

## 4. Architecture

**Build order — never reverse:**
User workflow → Business rules → Domain model → Database → API → Frontend → Animations.

**Domains** (each owns its responsibility, never mixed): Organization, Event, Ticket Types, Orders, Payments, Tickets, Content, Scanner, Reports, Notifications, Settings. Example violations to avoid: FAQ inside Ticket Management, Agenda inside Orders, Payments inside Tickets.

**Workspaces, not loose pages.** Users stay inside one workspace to complete a task:
- *Organization Workspace:* Overview, General, Branding, Payments, Notifications, Team (V1), Defaults
- *Event Workspace:* Overview, Orders, Tickets, Ticket Types, Content, Scanner, Reports, Settings

**Orders are the operational center.** Organizers spend their time on orders (receive, send payment request, verify, issue tickets, handle questions) — not on settings. Optimize workflows around Orders first.

**No duplicate functionality.** Before creating a new page/setting/action: does this already exist elsewhere? If yes, improve the existing flow instead of adding a parallel one.

---

## 5. Payment Philosophy — read before touching payments/orders/tickets code

**The platform is not a payment processor. It never receives money — it only tracks payment status.** Supported methods (MVP): WhatsApp payment request (Mopé / Uni5Pay) and bank transfer. In both flows, the *organizer* decides whether a payment is valid (BR-607) — the platform never makes that judgment call. Future PSP/card/wallet integrations are V2; do not design the MVP around them.

**Before modifying anything in `checkout.ts`, `payments.ts`, `tickets.server.ts`, `reservations.server.ts`, or `scanner.ts`, explicitly check against these rules:**

| Rule | Constraint |
|---|---|
| BR-505 | Order status moves forward only, never skips a step |
| BR-604 | Tickets may only be issued when `PaymentStatus == Verified` |
| BR-506/507 | Expired orders (48h) auto-cancel and release reserved tickets — concurrency-sensitive |
| BR-701/801/802 | QR codes are unique; a second scan returns "Already Checked In," never a check-in |
| BR-608 | Platform never auto-deducts a service fee from a payment (BR-600: no money flows through it) |

If a change touches order state transitions or reservation expiry, flag the concurrency risk explicitly before implementing — this is the one area in the codebase where a race condition has real business impact (double-selling capacity).

---

## 6. Engineering Standards

- **Stack:** TanStack Start + React 19, Prisma (Postgres adapter), better-auth, AWS S3 for uploads. Follow existing patterns in `src/server/*` for new server functions — one file per domain, same shape as `event.ts` / `organization.ts`.
- **No placeholders.** No `TODO`, `FIXME`, dead code, or commented-out production code shipped. Deliver working code, not scaffolding.
- **Refactor-as-you-go.** Touching existing code is an opportunity to improve readability and reduce duplication in that file — don't leave it worse than you found it, but don't scope-creep into unrelated files.
- **Document the "why," not the "how."** Code should be self-explanatory for *how*; comments are for non-obvious business reasoning (e.g. why an order can revert to Draft only before tickets are sold).
- **Tests:** cover state-transition logic (order lifecycle, ticket lifecycle, scanner double-scan detection) and anything touching the BR-xxx table above. UI-only components don't need the same rigor.
- **Migrations:** every schema change ships with a Prisma migration in the same PR — never hand-edit the database out of band.

---

## 7. When Unsure

Choose the option that reduces cognitive load, improves maintainability and scalability, reduces future technical debt, and creates the best organizer experience — in that order of tiebreak.

**Before generating code, ask:** Does this solve a real user problem? Does it fit the domain boundaries in §4? Does it duplicate something that already exists? Can it be simplified? Would Stripe/Shopify/Eventbrite ship it this way — and does that match our MVP-simplicity goal, or is it scope creep dressed up as polish?

If the answer to the first four is "no," redesign before coding.

---

## Golden Rule

This isn't about writing code — it's about giving Suriname's event organizers the best possible way to run their events. Every screen, workflow, and line of code should mean organizers spend less time managing and more time creating successful events. If a feature adds complexity without clear value, don't build it.
