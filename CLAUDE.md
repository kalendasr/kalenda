# CLAUDE.md

# Event Platform - AI Development Guide

Version: 1.0

This document defines the development philosophy, architecture principles, UX rules and engineering standards for this project.

Every AI-generated change must comply with this document.

If code conflicts with this document, this document always wins.

---

# 1. PROJECT VISION

This project is NOT an event website.

It is a professional Event Management & Ticketing Platform built for Suriname.

The goal is to create software that organizers use to manage their complete event lifecycle.

Visitors discover events.

Organizers manage events.

The platform manages orders, tickets and workflows.

Payments are currently handled manually outside the platform.

The platform manages the process.

NOT the transaction.

---

# 2. PRODUCT PHILOSOPHY

Always design around workflows.

Never around pages.

Never around CRUD.

Never around forms.

Always ask:

"What is the user trying to accomplish?"

Instead of:

"What information can we display?"

Every screen must have exactly one primary responsibility.

If a screen starts solving multiple problems, split it.

---

# 3. DESIGN PRINCIPLES

The platform should feel like premium SaaS software.

Design inspiration:

• Stripe
• Shopify
• Eventbrite
• Airbnb
• Linear
• Notion

Avoid interfaces that resemble:

• Bootstrap Admin
• AdminLTE
• Generic CRUD dashboards
• Enterprise software from 2012

The interface must feel modern, calm and highly usable.

---

# 4. CORE PRODUCT PRINCIPLES

Always optimize for:

• Simplicity
• Clarity
• Trust
• Speed
• Scalability
• Accessibility

Never optimize for:

• More buttons
• More options
• More menus
• More configuration

Less is almost always better.

---

# 5. MVP PHILOSOPHY

The MVP should solve one complete workflow extremely well.

It should NOT solve every possible workflow.

Avoid premature complexity.

Avoid enterprise features.

Avoid building future functionality today.

Design for expansion.

Implement only what is needed.

---

# 6. ARCHITECTURE FIRST

Whenever implementing a feature, always think in this order.

1.
User workflow

↓

2.
Business rules

↓

3.
Domain model

↓

4.
Database

↓

5.
API

↓

6.
Frontend

↓

7.
Animations

Never reverse this order.

---

# 7. DOMAIN DRIVEN THINKING

The software consists of domains.

Each domain owns its own responsibility.

Examples:

Organization

Events

Orders

Tickets

Payments

Scanner

Reports

Notifications

Settings

Never mix domains together.

Example:

FAQ does not belong inside Ticket Management.

Agenda does not belong inside Orders.

Payments do not belong inside Tickets.

---

# 8. SINGLE RESPONSIBILITY

Every page has one purpose.

Examples

Dashboard

Purpose:

Show what needs attention today.

NOT:

Editing data.

---

Orders

Purpose:

Handle customer orders.

NOT:

Edit event information.

---

Tickets

Purpose:

Manage issued tickets.

NOT:

Manage payments.

---

Content

Purpose:

Manage public event information.

NOT:

Handle ticket sales.

---

# 9. INFORMATION ARCHITECTURE

Never duplicate functionality.

Never create two pages that solve the same problem.

Avoid:

Settings

and

Edit Event

containing identical fields.

Avoid:

Profile

and

Organization

containing identical information.

One location.

One source of truth.

---

# 10. USER EXPERIENCE

The user should never wonder:

"What happens now?"

Every important action should explain:

What happened.

What happens next.

Who performs the next action.

When something happens.

Good UX removes uncertainty.

---

# 11. MICROCOPY

Always write for humans.

Avoid technical wording.

Examples

Bad

Payment registered.

Good

We received your payment.

Bad

Validation failed.

Good

Please enter a valid phone number.

Every message should reduce support questions.

---

# 12. EMPTY STATES

Never show

"No data."

Instead explain:

Why the page is empty.

What the user can do.

Provide one clear CTA.

Example

You don't have any events yet.

Create your first event to start selling tickets.

[ Create Event ]

---

# 13. FORMS

Long forms should be split into logical steps.

Do not create forms with 25 fields.

Group information.

Examples

General

Location

Tickets

Payments

Publishing

Review

---

# 14. CONFIRMATION SCREENS

After important actions always provide confirmation.

Examples

Event published

Order completed

Payment confirmed

Ticket sent

Do not silently redirect users.

---

# 15. MOBILE FIRST

Always design mobile first.

Desktop extends mobile.

Never create desktop-only interactions.

---

# 16. ACCESSIBILITY

Every new component must support:

Keyboard navigation

Visible focus

ARIA labels

Proper contrast

Semantic HTML

Never sacrifice accessibility for aesthetics.

---

# 17. PERFORMANCE

Optimize for perceived speed.

Lazy load where appropriate.

Avoid unnecessary renders.

Avoid huge component trees.

Prefer composition over deeply nested components.

---

# 18. REUSABILITY

Before creating a component ask:

Can an existing component solve this?

Avoid duplicate UI.

Create reusable building blocks.

Buttons

Cards

Tables

Dialogs

Status badges

Inputs

Selectors

Tabs

Every new component should be reusable.

---

# 19. CONSISTENCY

The same action should always look the same.

Primary buttons

Same color.

Same spacing.

Same radius.

Same typography.

Danger actions

Always red.

Success

Always green.

Information

Always blue.

Warning

Always orange.

Consistency builds trust.

---

# 20. ORDERS ARE THE HEART OF THE PLATFORM

The most important workflow is:

Customer

↓

Creates Order

↓

Organizer processes payment

↓

Platform issues tickets

Everything revolves around orders.

Optimize around this workflow.

---

# 21. PAYMENT PHILOSOPHY

The platform is NOT a payment processor.

Payments happen outside the platform.

The platform coordinates the process.

Never assume the platform receives money.

It only tracks payment status.

---

# 22. WHATSAPP PAYMENT FLOW

Customer selects tickets.

↓

Customer selects:

Payment Request via WhatsApp.

↓

Customer selects

Mope

or

Uni5Pay.

↓

Order created.

↓

Organizer receives notification.

↓

Organizer manually sends payment request using their own payment app.

↓

Customer pays.

↓

Organizer confirms payment inside platform.

↓

Platform automatically issues QR tickets.

---

# 23. BANK TRANSFER FLOW

Customer creates order.

↓

Platform displays bank details.

↓

Customer transfers money.

↓

Customer uploads proof of payment.

↓

Organizer verifies payment.

↓

Organizer approves payment.

↓

Platform automatically issues tickets.

---

# 24. FUTURE PAYMENT METHODS

Future integrations may include:

Online PSP

Card payments

Wallets

Installments

Never design the MVP around these.

Keep architecture extensible.

---

# 25. CODE QUALITY

Never leave:

TODO

FIXME

Placeholder implementations

Dead code

Commented production code

Always deliver production-ready code.

---

# 26. REFACTOR RULE

Whenever touching existing code:

Improve readability.

Reduce duplication.

Simplify architecture.

Leave the project better than before.

---

# 27. DOCUMENTATION

Complex business logic must be documented.

Never rely on assumptions.

Code should explain HOW.

Documentation explains WHY.

---

# 28. WHEN UNSURE

If multiple implementations are possible, choose the one that:

Reduces cognitive load.

Improves maintainability.

Improves scalability.

Reduces future technical debt.

Creates the best organizer experience.

---

# 29. AI SELF REVIEW

Before generating code always ask:

Does this solve a real user problem?

Does this fit the architecture?

Does this duplicate functionality?

Can this be simplified?

Would Stripe, Shopify or Eventbrite design it this way?

If the answer is "no", redesign before coding.

---

# 30. GOLDEN RULE

This project is not about writing code.

It is about creating the best event management experience in Suriname.

Every decision must move the platform toward that goal.

---

# 31. MVP FIRST

The primary goal of this project is to launch a professional, reliable MVP as quickly as possible.

Every decision must help us get to market faster without sacrificing code quality or user experience.

When implementing a feature, always ask:

- Does this help us launch?
- Does this improve the organizer experience?
- Does this reduce manual work?
- Does this make ticket sales easier?

If the answer is no, postpone the feature.

Design for future expansion.

Implement only what the MVP requires.

Never build future functionality before it is needed.

---

# 32. DELETE BEFORE CREATE

Before adding anything new, first ask:

Can something be removed?

Can an existing screen be improved?

Can an existing workflow solve this?

The best software usually has fewer screens, fewer buttons and fewer settings.

Adding functionality is the last option.

Simplifying is always the first option.

---

# 33. WORKSPACE PHILOSOPHY

Large edit pages are not allowed.

Every major object in the platform should behave like a workspace.

Example:

Organization Workspace

- Overview
- Branding
- Payments
- Team
- Notifications
- Defaults

Event Workspace

- Overview
- Orders
- Tickets
- Ticket Types
- Content
- Reports
- Scanner
- Settings

Users should remain inside the same workspace while completing tasks.

Avoid navigating users across unrelated pages.

---

# 34. ORDERS FIRST

Orders are the operational center of the platform.

The organizer spends most of their time:

- receiving new orders
- sending payment requests
- verifying payments
- issuing tickets
- handling customer questions

Therefore:

Always optimize workflows around Orders.

Not around editing Events.

Whenever a design decision must be made, prioritize operational efficiency over configuration screens.

---

# 35. DON'T SURPRISE THE USER

The user should always know:

What just happened.

What happens next.

Who performs the next action.

When they can expect a result.

Every important action must clearly communicate the current status.

Every workflow should reduce uncertainty.

---

# 36. NO DUPLICATE FEATURES

Never introduce duplicate functionality.

Before creating a new page, setting or action ask:

Does this already exist somewhere else?

If yes:

Improve the existing workflow instead.

There must always be one source of truth.

Examples:

Organization information exists only inside Organization.

Event settings exist only inside Event Settings.

Ticket types exist only inside Ticket Types.

Payment settings exist only inside Organization Payments.

Avoid duplicate buttons, duplicate menus and duplicate edit pages.

---

# 37. IMPLEMENTATION STRATEGY

Development follows these phases.

Phase 1

Build the complete MVP.

Phase 2

Improve workflows.

Phase 3

Improve automation.

Phase 4

Add advanced functionality.

Do not skip phases.

Do not build Phase 4 functionality during Phase 1.

---

# 38. BUILD COMPLETE FLOWS

Never build isolated screens.

Every feature must be usable from start to finish.

Example:

Bad

✔ Create Order page

Good

Create Order

↓

Receive payment

↓

Approve payment

↓

Issue tickets

↓

Customer receives QR ticket

↓

Ticket can be scanned

Always finish complete user journeys.

---

# 39. PRODUCT OVER FEATURES

Do not think in features.

Think in problems.

Example:

Wrong mindset

"We need a FAQ module."

Correct mindset

"Visitors need answers before buying tickets."

The solution may or may not be a FAQ.

Always solve user problems.

Never collect features.

---

# 40. FINAL GOLDEN RULE

This platform is built for organizers.

Every screen, workflow and feature should help organizers spend less time managing events and more time creating successful events.

If a feature increases complexity without creating clear value, do not build it.

Simple software wins.