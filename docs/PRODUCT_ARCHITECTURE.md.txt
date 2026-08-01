# PRODUCT_ARCHITECTURE.md

# Event Platform - Product Architecture

Version: 1.0 (MVP)

---

# 1. Product Vision

## Missie

Een modern event management- en ticketingplatform bouwen waarmee organisatoren in Suriname eenvoudig evenementen kunnen publiceren, tickets kunnen verkopen en bezoekers kunnen beheren.

Het platform richt zich op eenvoud, snelheid en betrouwbaarheid.

Wij concurreren niet door méér functies te hebben dan andere platformen.

Wij concurreren doordat het platform eenvoudiger, sneller en prettiger werkt.

---

## Filosofie

Een organisator moet binnen enkele minuten:

- een organisatie kunnen aanmaken;
- een evenement kunnen publiceren;
- tickets kunnen verkopen;
- betalingen kunnen verwerken;
- QR-tickets kunnen uitgeven.

Het platform ondersteunt deze workflow.

Niet andersom.

---

# 2. Product Principles

Het platform is gebaseerd op de volgende principes.

## Workflow First

Gebruikers willen een taak uitvoeren.

Niet een pagina bekijken.

Iedere pagina ondersteunt één workflow.

---

## Simplicity Wins

Iedere extra knop kost aandacht.

Iedere extra instelling kost tijd.

Iedere extra pagina verhoogt de complexiteit.

Wanneer twee oplossingen mogelijk zijn kiezen we altijd de eenvoudigste.

---

## Orders Before Configuration

Organisatoren besteden dagelijks tijd aan:

- nieuwe bestellingen
- betalingen
- bezoekers
- tickets

Niet aan instellingen.

Daarom zijn Orders belangrijker dan Settings.

---

## One Source of Truth

Gegevens bestaan altijd maar op één plek.

Voorbeelden:

Organisatiegegevens staan alleen bij Organisatie.

Ticketprijzen alleen bij Ticket Types.

Betaalgegevens alleen bij Organisatie → Betalingen.

Nooit dupliceren.

---

## Progressive Disclosure

Toon alleen informatie die op dat moment relevant is.

Een scanner hoeft geen omzet te zien.

Een bezoeker hoeft geen instellingen te zien.

Een organisator hoeft tijdens orderverwerking geen FAQ-editor te zien.

---

# 3. Product Hierarchy

Het platform bestaat uit de volgende hiërarchie.

Platform

↓

Organization

↓

Event

↓

Order

↓

Ticket

Dit is de kern van het systeem.

Alle relaties zijn hierop gebaseerd.

---

# 4. Core Domains

## Account

Persoonlijke gebruiker.

Bevat:

- naam
- e-mail
- wachtwoord
- voorkeuren

Niet:

- organisatie
- evenementen

---

## Organization

De organisatie is eigenaar van evenementen.

Bevat:

- organisatienaam
- logo
- omschrijving
- contactgegevens
- website
- sociale media
- WhatsApp
- betaalgegevens
- standaardinstellingen

Een organisatie kan meerdere evenementen beheren.

---

## Event

Een evenement is een verkoopbaar product.

Bevat:

- titel
- omschrijving
- categorie
- locatie
- datum
- status
- coverfoto

Niet:

- orders
- betalingen
- tickets

Deze zijn aparte domeinen.

---

## Ticket Types

Beschrijft wat verkocht wordt.

Bijvoorbeeld:

Regular

VIP

Early Bird

Student

Per tickettype:

- naam
- prijs
- capaciteit
- verkoopperiode
- beschrijving
- limieten

---

## Orders

Orders vormen het hart van het platform.

Een order bevat:

- klant
- evenement
- betaalmethode
- status
- totaalbedrag
- één of meerdere tickets

Vrijwel alle dagelijkse werkzaamheden van een organisator vinden hier plaats.

---

## Payments

Het platform verwerkt geen betalingen.

Het platform ondersteunt de afhandeling.

Ondersteunde betaalmethoden:

- WhatsApp-betaalverzoek
- Bankoverschrijving

Later uitbreidbaar.

---

## Tickets

Na een goedgekeurde betaling worden tickets uitgegeven.

Ieder ticket heeft:

- QR-code
- tickettype
- eigenaar
- status

---

## Content

Alle publieke eventinformatie.

Bestaat uit:

- agenda
- FAQ
- sprekers
- sponsors
- galerij
- huisregels
- route

Content hoort niet bij ticketverkoop.

---

## Scanner

Controleert bezoekers.

Functionaliteit:

- QR scannen
- zoeken
- handmatig inchecken
- dubbele scans herkennen

---

## Reports

Statistieken.

- omzet
- tickets
- bezoekers
- check-ins
- capaciteit

---

# 5. Workspaces

Het platform werkt met Workspaces.

Niet met losse pagina's.

---

## Organization Workspace

Modules

- Overzicht
- Algemene gegevens
- Branding
- Betalingen
- Notificaties
- Team (V1)
- Standaarden

---

## Event Workspace

Modules

- Overzicht
- Orders
- Tickets
- Ticket Types
- Content
- Scanner
- Rapportages
- Instellingen

Een organisator blijft binnen dezelfde Workspace.

---

# 6. Navigation

Dashboard

Organizations

Events

Settings

Binnen een Event:

Overview

Orders

Tickets

Ticket Types

Content

Scanner

Reports

Settings

---

# 7. Event Lifecycle

Concept

↓

Gereed

↓

Gepubliceerd

↓

Live

↓

Afgelopen

↓

Gearchiveerd

Alleen gepubliceerde evenementen zijn zichtbaar voor bezoekers.

---

# 8. Order Lifecycle

Nieuwe bestelling

↓

Wacht op betaalactie

↓

Wacht op controle

↓

Betaald

↓

Tickets verzonden

↓

Ingecheckt

of

↓

Geannuleerd

Orders mogen nooit stappen overslaan.

---

# 9. Ticket Lifecycle

Aangemaakt

↓

Verzonden

↓

Actief

↓

Ingecheckt

of

↓

Geannuleerd

---

# 10. Payment Workflows

## WhatsApp

Klant kiest tickets

↓

Klant kiest

WhatsApp-betaalverzoek

↓

Kiest:

- Mope
- Uni5Pay

↓

Order wordt aangemaakt

↓

Organisator ontvangt melding

↓

Organisator stuurt zelf betaalverzoek

↓

Klant betaalt

↓

Organisator bevestigt betaling

↓

Platform verstuurt QR-ticket

---

## Bankoverschrijving

Klant kiest tickets

↓

Order wordt aangemaakt

↓

Platform toont bankgegevens

↓

Klant maakt over

↓

Klant uploadt betaalbewijs

↓

Organisator controleert

↓

Goedkeuren

↓

Platform verstuurt tickets

---

# 11. Dashboard Philosophy

Een dashboard toont geen instellingen.

Een dashboard toont:

- wat aandacht nodig heeft;
- statistieken;
- recente activiteit;
- snelle acties.

---

# 12. Information Architecture

Iedere pagina heeft één verantwoordelijkheid.

Dashboard

Overzicht.

Orders

Bestellingen verwerken.

Tickets

Uitgegeven tickets beheren.

Content

Publieke informatie beheren.

Scanner

Bezoekers controleren.

Settings

Configuratie.

Nooit combineren.

---

# 13. MVP Scope

## MVP

- Organisaties
- Events
- Tickettypes
- Orders
- WhatsApp-betalingen
- Bankoverschrijvingen
- QR-tickets
- Scanner
- Dashboard
- Rapportages

---

## V1

- Teamleden
- Coupons
- Sponsors
- Mailtemplates
- Herinneringen

---

## V2

- Online PSP
- White-label
- API
- Mobiele app
- Meerdere landen
- Meerdere valuta

---

# 14. Architecture Rules

Nieuwe functionaliteit wordt alleen toegevoegd wanneer:

- het een bestaande workflow verbetert;
- een duidelijk gebruikersprobleem oplost;
- geen bestaande module vervangt.

Geen dubbele schermen.

Geen dubbele instellingen.

Geen dubbele routes.

---

# 15. MVP Implementation Plan

## Fase 1 – Fundament

- Organisatie Workspace bouwen
- Event Workspace bouwen
- Navigatie vereenvoudigen
- Ticketbeheer verwijderen
- Content-module introduceren

---

## Fase 2 – Orders

- Orders centraal maken
- Betaalstatussen
- Orderstatussen
- Betaalworkflow WhatsApp
- Betaalworkflow Bank

---

## Fase 3 – Tickets

- QR-generatie
- Ticketuitgifte
- Ticketoverzicht
- Scanner

---

## Fase 4 – Dashboard

- KPI's
- Open acties
- Omzet
- Check-ins
- Recente orders

---

## Fase 5 – UX

- Design System toepassen
- Lege staten
- Bevestigingsschermen
- Microcopy
- Mobiele optimalisatie