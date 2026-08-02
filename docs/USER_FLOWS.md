# USER_FLOWS.md

Version: 1.1 (MVP)

---

# 1. Purpose

Dit document beschrijft alle primaire gebruikersflows binnen het platform.

Het is de bron van waarheid voor:

- UX
- Frontend
- Backend
- Business Rules
- API's
- Testscenario's

Iedere flow heeft:

- één duidelijk startpunt
- één duidelijk eindpunt
- één verantwoordelijke gebruiker per stap

---

# 2. User Types

## Visitor

Niet ingelogd.

Kan:

- evenementen bekijken
- zoeken
- filteren
- ticket kopen

---

## Customer

Koopt tickets.

Kan:

- bestelling bekijken
- betaalbewijs uploaden
- tickets downloaden
- QR-code tonen

Heeft geen account (MVP).

Opent de bestelling en tickets via een unieke orderlink en via e-mail.

---

## Organizer

Beheert evenementen.

Kan:

- evenementen beheren
- betalingen verwerken
- tickets uitgeven
- bezoekers scannen

---

## Platform Admin

Beheert het platform.

---

# 3. Organisatie Aanmaken

## Doel

Nieuwe organisator registreren.

## Flow

Landing Page

↓

Registreren

↓

Naam

Email

Wachtwoord

↓

Email verificatie

↓

Eerste login

↓

Organisatie aanmaken

↓

Algemene gegevens

↓

Betaalgegevens instellen

↓

Dashboard

---

Resultaat

Organisatie is klaar om evenementen te publiceren.

---

# 4. Evenement Aanmaken

Dashboard

↓

Nieuw evenement

↓

Basisinformatie

↓

Datum

↓

Locatie

↓

Categorie

↓

Omschrijving

↓

Coverfoto

↓

Opslaan als Concept

↓

Event Workspace

---

Resultaat

Event bestaat.

Nog niet zichtbaar.

---

# 5. Tickettypes Aanmaken

Event Workspace

↓

Ticket Types

↓

Nieuw tickettype

↓

Naam

↓

Prijs

↓

Aantal

↓

Verkoopperiode

↓

Maximum per bestelling

↓

Opslaan

↓

Herhalen indien nodig

---

Resultaat

Event is verkoopklaar.

---

# 6. Evenement Publiceren

Event Workspace

↓

Controle

↓

Verplichte velden compleet?

↓

Ja

↓

Publiceren

↓

Status

Published

↓

Zichtbaar op website

---

Nee

↓

Toon ontbrekende onderdelen

---

# 7. Bezoeker Koopt Tickets

Evenement

↓

Ticket kiezen

↓

Aantal kiezen

↓

Persoonsgegevens

↓

Bestelling controleren

↓

Betaalmethode kiezen

↓

WhatsApp

of

Bankoverschrijving

↓

Order aanmaken

↓

Bevestigingspagina

↓

Unieke orderlink

(zonder login te openen, ook per e-mail verstuurd)

---

# 8. WhatsApp Betaalflow

Order aangemaakt

↓

Klant kiest:

Mope

of

Uni5Pay

↓

Bestelling opgeslagen

↓

Organisator ontvangt melding

↓

Organisator opent Order

↓

Klikt:

"Betaalverzoek versturen"

↓

Platform toont:

Naam klant

Telefoon

Bestelnummer

Bedrag

Gekozen betaalapp

↓

Organisator verstuurt zelf betaalverzoek

↓

Orderstatus

Waiting for Payment

↓

Klant betaalt

↓

Organisator ontvangt betaling

↓

Open Order

↓

Betaling bevestigen

↓

QR Tickets genereren

↓

Email versturen

↓

Order voltooid

---

# 9. Bankoverschrijving

Order

↓

Platform toont:

Bank

Rekeninghouder

Rekeningnummer

Omschrijving

↓

Klant maakt over

↓

Upload betaalbewijs

↓

Orderstatus

Waiting for Review

↓

Organisator controleert

↓

Afkeuren

of

Goedkeuren

↓

Bij goedkeuren

↓

QR genereren

↓

Tickets versturen

---

# 10. Order Verwerken

Organizer Dashboard

↓

Nieuwe Orders

↓

Order openen

↓

Status bekijken

↓

Indien nodig:

Betaalverzoek versturen

↓

Of

Betaalbewijs controleren

↓

Goedkeuren

↓

Tickets verzenden

↓

Klaar

---

# 11. Ticket Uitgifte

Betaling goedgekeurd

↓

QR-code genereren

↓

Ticketnummer genereren

↓

PDF maken

↓

Email versturen

↓

Ticket beschikbaar in klantaccount

---

# 12. Ticket Opnieuw Versturen

Organizer

↓

Order openen

↓

Tickets

↓

Opnieuw verzenden

↓

Email verstuurd

---

# 13. Ticket Scannen

Scanner openen

↓

QR scannen

↓

Ticket gevonden?

↓

Nee

↓

Rood scherm

↓

Niet geldig

---

Ja

↓

Status controleren

↓

Nog niet ingecheckt

↓

Check-in

↓

Groen scherm

↓

Welkom

---

Reeds ingecheckt

↓

Oranje scherm

↓

Dubbele scan

---

# 14. Event Beëindigen

Event eindigt

↓

Status

Finished

↓

Scanner sluiten

↓

Rapport beschikbaar

↓

Archiveren mogelijk

---

# 15. Dashboard Workflow

Bij openen Dashboard

Toon:

Nieuwe orders

↓

Open betalingen

↓

Te controleren betaalbewijzen

↓

Vandaag

↓

Komende evenementen

↓

Recente activiteit

Geen instellingen tonen.

---

# 16. Empty States

Wanneer geen evenementen

↓

Toon:

"Maak je eerste evenement"

---

Geen orders

↓

"Nog geen bestellingen"

---

Geen tickets

↓

"Nog geen tickets verkocht"

---

Geen content

↓

"Voeg informatie toe"

---

# 17. Error States

Onvolledige betaling

↓

Order blijft Pending

---

Betaalbewijs afgekeurd

↓

Status Rejected

↓

Klant ontvangt melding

↓

Nieuw betaalbewijs uploaden

---

Dubbele scan

↓

Niet opnieuw inchecken

↓

Waarschuwing tonen

---

QR ongeldig

↓

Toegang weigeren

---

# 18. Notifications

Customer

Nieuwe bestelling

↓

Betaling ontvangen

↓

Tickets verzonden

↓

Betaalbewijs afgekeurd

↓

Evenement gewijzigd (V1)

---

Organizer

Nieuwe bestelling

↓

Nieuwe betaling

↓

Nieuw betaalbewijs

↓

Nieuwe check-in statistieken (V1)

---

# 19. Mobile UX

Alle workflows moeten mobiel werken.

Belangrijk:

Organisator verwerkt betalingen vaak via telefoon.

Scanner draait op telefoon.

Customer toont QR-code op telefoon.

Desktop is secundair.

---

# 20. UX Principles

Iedere pagina heeft één primaire actie.

Iedere workflow heeft:

- duidelijk begin
- duidelijke volgende stap
- duidelijke eindstatus

De gebruiker mag nooit twijfelen:

Wat gebeurt er nu?

Wie moet nu iets doen?

Wanneer krijg ik mijn tickets?

---

# 21. MVP Checklist

## Organisatie

☐ Registreren

☐ Organisatie aanmaken

☐ Betaalinstellingen

---

## Events

☑ Event aanmaken

☑ Publiceren

☑ Bewerken

---

## Tickets

☑ Tickettypes

☐ Checkout

☐ QR generatie

☐ Ticket versturen

---

## Orders

☑ Nieuwe order

☐ WhatsApp flow

☐ Bankoverschrijving

☐ Betaling bevestigen

☐ Betaalbewijs afkeuren

---

## Scanner

☐ QR scannen

☐ Dubbele scan

☐ Ongeldig ticket

---

## Dashboard

☐ Nieuwe orders

☐ Open betalingen

☐ Komende evenementen

☐ Omzet

☐ Recente activiteit