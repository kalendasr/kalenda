# DATABASE_DOMAIN.md

Version: 1.1 (MVP)

---

# 1. Purpose

Dit document beschrijft het complete domeinmodel van het Event Management Platform.

Het is de bron van waarheid voor:

- Database ontwerp
- Prisma schema
- API ontwerp
- Business Rules
- Frontend formulieren
- Autorisatie
- Rapportages

De database volgt de business.

Nooit andersom.

---

# 2. Design Principles

## Single Source of Truth

Iedere informatie bestaat op exact één plaats.

Nooit dupliceren.

---

## Explicit Relationships

Alle relaties zijn expliciet.

Gebruik geen verborgen koppelingen.

---

## Soft Delete

Records worden nooit permanent verwijderd.

Gebruik:

deletedAt

waar mogelijk.

---

## UUID Primary Keys

Iedere tabel gebruikt UUID's.

Geen auto increment IDs.

---

## Auditability

Belangrijke acties moeten later te herleiden zijn.

Gebruik waar nodig:

createdAt

updatedAt

createdBy

updatedBy

---

# 3. Domain Overview

Platform

│

├── Users

├── Organizations

│ ├── Team Members (V1)

│ ├── Payment Settings

│ └── Branding

│

├── Events

│ ├── Ticket Types

│ ├── Content

│ ├── Orders

│ ├── Tickets

│ ├── Reports

│ └── Scanner

│

└── Notifications

---

# 4. Core Entities

## User

Persoonlijk account.

### Velden

id

firstName

lastName

email

passwordHash

phone

avatar

locale

timezone

createdAt

updatedAt

deletedAt

### Relaties

User

↓

OrganizationMembership

---

## Organization

Eigenaar van evenementen.

### Velden

id

name

slug

description

logo

coverImage

email

phone

website

facebook

instagram

tiktok

linkedin

address

city

country

isVerified

createdAt

updatedAt

deletedAt

### Relaties

Organization

↓

Events

↓

PaymentSettings

↓

NotificationSettings

---

## Organization Payment Settings

Hier worden alle betaalgegevens opgeslagen.

### WhatsApp

enabled

phoneNumber

supportedApps

(Mope, Uni5Pay)

---

### Bank

enabled

bankName

accountHolder

accountNumber

branch

paymentInstructions

---

# 5. Event

Een verkoopbaar evenement.

### Velden

id

organizationId

title

slug

shortDescription

description

categoryId

venueId

coverImage

startsAt

endsAt

timezone

status

visibility

createdAt

updatedAt

deletedAt

---

### Status

Draft

Ready

Published

Live

Finished

Archived

---

# 6. Event Content

Publieke informatie.

### Velden

id

eventId

type

sortOrder

title

content

published

---

Types

Agenda

FAQ

Speaker

Sponsor

Gallery

Rules

Route

Custom

---

# 7. Ticket Type

Definieert een verkoopbaar ticket.

### Velden

id

eventId

name

description

price

currency

quantity

minimumPerOrder

maximumPerOrder

salesStart

salesEnd

visible

sortOrder

---

# 8. Customer

Persoon die tickets koopt.

### Velden

id

firstName

lastName

email

phone

createdAt

updatedAt

---

Customer hoeft geen account te hebben.

Gastbestellingen zijn toegestaan.

---

# 9. Order

Belangrijkste entiteit.

### Velden

id

eventId

customerId

orderNumber

paymentMethod

paymentApp

orderStatus

paymentStatus

currency

subtotal

serviceFee

discount

total

notes

createdAt

updatedAt

---

### Payment Method

WhatsApp

Bank Transfer

---

### Payment App

Alleen van toepassing bij paymentMethod = WhatsApp.

Mope

Uni5Pay

Waarden komen uit Organization Payment Settings → WhatsApp.supportedApps.

Bij Bank Transfer is paymentApp leeg.

Bewaar methode en app in aparte velden.

Nooit samenvoegen tot één string (bijv. "whatsapp:mope").

---

### Order Status

Pending Payment

Awaiting Review

Paid

Completed

Cancelled

Expired

Refunded (V2)

---

### Payment Status

Unpaid

Pending

Verified

Rejected

---

# 10. Order Items

Koppelt tickettypes aan een order.

### Velden

id

orderId

ticketTypeId

quantity

unitPrice

totalPrice

---

# 11. Payment

Registratie van betaalafhandeling.

### Velden

id

orderId

method

status

reference

proofImage

verifiedBy

verifiedAt

notes

createdAt

---

Method

WhatsApp

Bank

---

Status

Waiting

Submitted

Verified

Rejected

Cancelled

---

# 12. Ticket

Uitgegeven toegangsbewijs.

### Velden

id

orderItemId

ticketNumber

qrCode

status

issuedAt

checkedInAt

cancelledAt

---

Status

Issued

Sent

Checked In

Cancelled

---

# 13. Check In

Logt iedere scan.

### Velden

id

ticketId

checkedBy

location

device

createdAt

Iedere scan wordt opgeslagen.

Ook dubbele scans.

---

# 14. Notification

Alle communicatie.

### Velden

id

recipient

channel

type

subject

body

status

sentAt

createdAt

---

Channel

Email

WhatsApp

System

---

# 15. Category

Evenementcategorie.

### Velden

id

name

slug

icon

sortOrder

active

---

# 16. Venue

Locatie.

### Velden

id

name

address

district

country

latitude

longitude

capacity

---

# 17. Relationships

Organization

↓

Events

↓

Ticket Types

↓

Orders

↓

Order Items

↓

Tickets

↓

Check-ins

---

Customer

↓

Orders

↓

Payments

---

Event

↓

Content

↓

Reports

---

# 18. Soft Delete Policy

Soft delete toepassen op:

Users

Organizations

Events

Ticket Types

Customers

Orders

Venues

Categories

Nooit hard verwijderen.

---

# 19. MVP Entities

✅ User

✅ Organization

✅ PaymentSettings

✅ Event

✅ EventContent

✅ TicketType

✅ Customer

✅ Order

✅ OrderItem

✅ Payment

✅ Ticket

✅ CheckIn

✅ Venue

✅ Category

---

# 20. V1 Entities

OrganizationMember

Coupon

Discount

EventTag

Sponsor

MailTemplate

SavedFilter

---

# 21. V2 Entities

Invoice

Refund

Wallet

APIKey

Webhook

Subscription

Affiliate

Promotion

AuditLog

---

# 22. Naming Conventions

Gebruik altijd:

camelCase voor velden.

PascalCase voor modellen.

Enums in PascalCase.

UUID als primary key.

Geen afkortingen.

Gebruik volledige namen.

Goed:

paymentStatus

Niet:

payStat

---

# 23. Database Rules

Nooit data dupliceren.

Nooit JSON gebruiken waar een relatie hoort.

Nooit businesslogica in de database plaatsen.

Gebruik foreign keys.

Gebruik indexes op:

email

slug

eventId

organizationId

customerId

orderId

ticketId

---

# 24. MVP Implementation Checklist

## Sprint 1

☑ User

☑ Organization

☑ PaymentSettings

☑ Category

☑ Venue

---

## Sprint 2

☑ Event

☑ EventContent

☐ TicketType

---

## Sprint 3

☐ Customer

☐ Order

☐ OrderItem

☐ Payment

---

## Sprint 4

☐ Ticket

☐ CheckIn

---

## Sprint 5

☐ Notification