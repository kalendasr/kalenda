# ROADMAP.md

Version: 1.0 (MVP)

---

# Roadmap Philosophy

De roadmap is gebaseerd op één uitgangspunt:

**Iedere fase moet zelfstandig bruikbaar zijn.**

Een sprint is pas afgerond wanneer een gebruiker daadwerkelijk een taak kan uitvoeren.

Geen halve functionaliteit.

Geen onafgemaakte workflows.

We bouwen verticale slices.

---

# Development Principles

Iedere sprint levert op:

- Werkende backend
- Werkende frontend
- Werkende database
- Werkende validaties
- Werkende UX
- Tests
- Documentatie bijgewerkt

Geen losse API's.

Geen losse pagina's.

Geen onafgemaakte componenten.

---

# Phase 0 — Project Setup

## Doel

Een stabiele technische basis.

### Taken

- Repository aanmaken
- TanStack Start configureren
- TypeScript configureren
- Tailwind CSS
- shadcn/ui installeren
- Prisma configureren
- PostgreSQL koppelen
- Better Auth installeren
- Cloudflare R2 configureren
- ESLint
- Prettier
- Husky
- GitHub Actions
- Environment structuur
- Folderstructuur opzetten

### Resultaat

Een leeg maar professioneel project.

---

# Phase 1 — Authenticatie & Organisatie

## Doel

Een organisator kan een account maken en een organisatie beheren.

### Functionaliteit

- Registreren
- Inloggen
- Wachtwoord vergeten
- Organisatie aanmaken
- Organisatie bewerken
- Branding
- Contactgegevens
- Betaalinstellingen
- Dashboard

### Database

- User
- Organization
- PaymentSettings

### Klaar wanneer

Een organisator volledig kan inloggen en zijn organisatie kan configureren.

---

# Phase 2 — Event Management

## Doel

Een organisator kan evenementen publiceren.

### Functionaliteit

- Event Workspace
- Nieuw evenement
- Bewerken
- Publiceren
- Concept
- Archiveren
- Coverfoto
- Categorie
- Locatie

### Content

- FAQ
- Agenda
- Sprekers
- Huisregels

### Database

- Event
- EventContent
- Category
- Venue

### Klaar wanneer

Een evenement zichtbaar is op de website.

---

# Phase 3 — Ticketing

## Doel

Een evenement kan tickets verkopen.

### Functionaliteit

- Tickettypes
- Capaciteit
- Verkoopperiode
- Maximum per bestelling
- Ticketprijzen
- Beschikbaarheid

### Database

- TicketType

### Klaar wanneer

Een bezoeker tickets kan selecteren.

---

# Phase 4 — Orders

## Doel

Bezoekers kunnen een bestelling plaatsen.

### Functionaliteit

- Checkout
- Persoonsgegevens
- Orderoverzicht
- Ordernummer
- Bestelbevestiging

### Database

- Customer/User
- Order
- OrderItem

### Klaar wanneer

Een order succesvol wordt opgeslagen.

---

# Phase 5 — Payments

## Doel

De organisator kan betalingen verwerken.

### Functionaliteit

## WhatsApp

- Betaalmethode kiezen
- Mope kiezen
- Uni5Pay kiezen
- Organisator ontvangt melding
- Orderstatussen

## Bank

- Bankgegevens tonen
- Upload betaalbewijs
- Goedkeuren
- Afkeuren

### Database

- Payment

### Klaar wanneer

Een organisator betalingen kan bevestigen.

---

# Phase 6 — Tickets

## Doel

Betaalde klanten ontvangen tickets.

### Functionaliteit

- QR-code genereren
- Ticketnummer
- PDF
- Email versturen
- Ticketoverzicht
- Opnieuw versturen

### Database

- Ticket

### Klaar wanneer

Een klant een geldig ticket ontvangt.

---

# Phase 7 — Scanner

## Doel

Tickets controleren aan de ingang.

### Functionaliteit

- QR Scanner
- Ticket zoeken
- Dubbele scans
- Handmatige check-in
- Scanhistorie

### Database

- CheckIn

### Klaar wanneer

Bezoekers succesvol kunnen worden ingecheckt.

---

# Phase 8 — Dashboard & Rapportages

## Doel

Organisatoren inzicht geven.

### Dashboard

- Nieuwe orders
- Open betalingen
- Open acties
- Omzet
- Tickets verkocht

### Rapportages

- Omzet
- Check-ins
- Capaciteit
- Ticketverkoop

### Klaar wanneer

Een organisator overzicht heeft over zijn evenement.

---

# Phase 9 — UX Polish

## Doel

De applicatie voelt professioneel.

### Werkzaamheden

- Empty States
- Loading States
- Error States
- Mobiele optimalisatie
- Accessibility
- Performance
- Microcopy
- Consistente iconen
- Animaties
- Form validatie

### Klaar wanneer

De applicatie klaar is voor productie.

---

# MVP Release Checklist

## Organisatie

- [x] Registreren
- [x] Inloggen
- [x] Organisatie aanmaken
- [x] Betaalinstellingen

---

## Evenementen

- [x] Event Workspace
- [x] Event publiceren
- [x] Event archiveren

---

## Content

- [x] FAQ
- [x] Agenda
- [x] Sprekers
- [x] Huisregels

---

## Ticketing

- [x] Tickettypes
- [x] Capaciteit
- [x] Verkoopperiode

---

## Orders

- [x] Checkout
- [x] Orderoverzicht
- [x] Orderstatus

---

## Betalingen

- [x] WhatsApp
- [x] Mope
- [x] Uni5Pay
- [x] Bankoverschrijving
- [x] Upload betaalbewijs
- [x] Betaling bevestigen / afkeuren

---

## Tickets

- [x] QR-code
- [x] PDF
- [x] Email
- [x] Opnieuw versturen

---

## Scanner

- [x] QR Scan
- [x] Dubbele scan
- [x] Ticket zoeken

---

## Dashboard

- [x] Open acties
- [x] Nieuwe orders
- [x] Open betalingen
- [x] Omzet
- [x] Check-ins

---

# Version 1 (Na MVP)

Na een succesvolle livegang bouwen we verder.

## Organisatie

- Teamleden
- Rollen en rechten

## Marketing

- Kortingscodes
- Coupons

## Communicatie

- Mailtemplates
- Geautomatiseerde herinneringen

## Events

- Sponsors
- Galerij
- Extra contentblokken

---

# Version 2

Na bewezen product-market fit.

## Payments

- PSP-integratie
- Online betalingen

## Platform

- White-label
- API
- Webhooks

## Internationalisatie

- Meerdere landen
- Meerdere talen
- Meerdere valuta

## Mobiel

- Native app

---

# Success Criteria

De MVP is succesvol wanneer:

- Een organisator zich kan registreren.
- Een organisatie kan worden aangemaakt.
- Een evenement gepubliceerd kan worden.
- Tickets verkocht kunnen worden.
- Betalingen handmatig verwerkt kunnen worden.
- QR-tickets automatisch worden uitgegeven.
- Tickets gescand kunnen worden.
- Organisatoren inzicht hebben in hun verkopen.

Pas daarna worden nieuwe functionaliteiten ontwikkeld.

---

# Definition of Done

Een feature is pas afgerond wanneer:

- [ ] Functioneel compleet
- [ ] UX gecontroleerd
- [ ] Responsive
- [ ] Toegankelijk
- [ ] Getest
- [ ] Gedocumenteerd
- [ ] Code gereviewd
- [ ] Geen bekende kritieke bugs