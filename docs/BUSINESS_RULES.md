# BUSINESS_RULES.md

Version: 1.0 (MVP)

---

# 1. Purpose

Dit document beschrijft alle businessregels van het platform.

Business Rules bepalen:

- wanneer acties zijn toegestaan;
- wanneer statussen veranderen;
- welke validaties gelden;
- welke automatische acties plaatsvinden;
- welke uitzonderingen bestaan.

Deze regels zijn leidend voor:

- Backend
- Frontend
- Database
- API
- Tests
- Documentatie

Nooit businesslogica dupliceren.

---

# 2. General Rules

## BR-001

Iedere belangrijke actie wordt gelogd.

Voorbeelden:

- Event gepubliceerd
- Betaling bevestigd
- Ticket uitgegeven
- Ticket gescand

---

## BR-002

Soft delete wordt gebruikt.

Data wordt nooit definitief verwijderd.

---

## BR-003

Iedere entiteit heeft:

- createdAt
- updatedAt

---

## BR-004

UUID is verplicht als Primary Key.

---

# 3. Organization Rules

## BR-100

Een gebruiker mag meerdere organisaties beheren.

[MVP]
1 organisatie per gebruiker.

[V1]
Meerdere organisaties.

---

## BR-101

Iedere organisatie heeft precies één eigenaar.

---

## BR-102

Alle evenementen behoren tot precies één organisatie.

---

## BR-103

Alle betaalinstellingen behoren tot de organisatie.

Nooit tot een evenement.

---

# 4. Event Rules

## BR-200

Een evenement begint als:

Draft

---

## BR-201

Een evenement mag alleen gepubliceerd worden wanneer:

- titel ingevuld
- omschrijving ingevuld
- datum ingevuld
- locatie ingevuld
- minimaal één tickettype
- betaalmethode actief

---

## BR-202

Niet-gepubliceerde evenementen zijn niet zichtbaar.

---

## BR-203

Een gepubliceerd evenement kan weer naar Draft.

Alleen zolang geen tickets zijn verkocht.

---

## BR-204

Een evenement kan niet verwijderd worden zodra er orders bestaan.

Alleen archiveren.

---

# 5. Ticket Type Rules

## BR-300

Prijs mag nooit negatief zijn.

---

## BR-301

Capaciteit moet groter zijn dan nul.

---

## BR-302

Verkoopstart moet vóór verkoopeinde liggen.

---

## BR-303

Een tickettype kan gedeactiveerd worden.

Verkochte tickets blijven geldig.

---

## BR-304

Een tickettype kan niet verwijderd worden zodra het verkocht is.

---

# 6. Customer Rules

## BR-400

Een klant hoeft geen account te hebben.

Gastbestellingen zijn toegestaan.

---

## BR-401

Email is verplicht.

---

## BR-402

Telefoonnummer is verplicht.

Voor WhatsApp-contact.

---

# 7. Order Rules

## BR-500

Een bestelling krijgt direct een uniek ordernummer.

---

## BR-501

Iedere order hoort bij exact één evenement.

---

## BR-502

Iedere order hoort bij exact één klant.

---

## BR-503

Een order bevat minimaal één ticket.

---

## BR-504

Een order kan niet gewijzigd worden nadat tickets zijn uitgegeven.

---

## BR-505

Orderstatus mag alleen vooruit.

Pending Payment

↓

Awaiting Review

↓

Paid

↓

Completed

of

↓

Cancelled

---

## BR-506

Een verlopen bestelling wordt automatisch geannuleerd.

MVP:

48 uur.

---

## BR-507

Een verlopen bestelling geeft gereserveerde tickets vrij.

---

# 8. Payment Rules

## BR-600

Het platform verwerkt geen geld.

Alleen de workflow.

---

## BR-601

Ondersteunde betaalmethoden:

WhatsApp

Bankoverschrijving

---

## BR-602

WhatsApp-flow

Platform maakt order.

↓

Platform stuurt melding.

↓

Organisator verstuurt betaalverzoek.

↓

Organisator bevestigt betaling.

↓

Platform genereert tickets.

---

## BR-603

Bank-flow

Platform toont bankgegevens.

↓

Klant betaalt.

↓

Upload betaalbewijs.

↓

Organisator controleert.

↓

Platform genereert tickets.

---

## BR-604

Tickets mogen uitsluitend worden uitgegeven wanneer:

PaymentStatus == Verified

---

## BR-605

Afgekeurde betalingen mogen opnieuw worden ingediend.

---

## BR-606

Bij afkeuring ontvangt klant automatisch een melding.

---

## BR-607

Organisator bepaalt of betaling correct is.

Niet het platform.

---

# 9. Ticket Rules

## BR-700

Iedere ticket krijgt:

- Ticketnummer
- QR-code

---

## BR-701

QR-code moet uniek zijn.

---

## BR-702

Ticketstatus

Issued

↓

Sent

↓

Checked In

of

↓

Cancelled

---

## BR-703

Geannuleerde tickets zijn ongeldig.

---

## BR-704

Tickets kunnen opnieuw verstuurd worden.

QR blijft gelijk.

---

# 10. Scanner Rules

## BR-800

Alle scans worden opgeslagen.

---

## BR-801

Eerste scan

Resultaat:

Valid

---

## BR-802

Tweede scan

Resultaat:

Already Checked In

---

## BR-803

Geannuleerd ticket

Resultaat:

Invalid

---

## BR-804

Niet bestaand ticket

Resultaat:

Not Found

---

# 11. Notification Rules

## BR-900

Nieuwe order

↓

Organisator informeren.

---

## BR-901

Betaling bevestigd

↓

Klant informeren.

---

## BR-902

Tickets verstuurd

↓

Klant informeren.

---

## BR-903

Betaalbewijs afgekeurd

↓

Klant informeren.

---

# 12. Dashboard Rules

Dashboard toont uitsluitend:

- open acties
- statistieken
- recente activiteit

Nooit instellingen.

---

# 13. Security Rules

Gebruikers mogen uitsluitend eigen organisaties zien.

---

Gebruikers mogen uitsluitend eigen evenementen beheren.

---

Orders zijn alleen zichtbaar voor de eigenaar van het evenement.

---

Scanner heeft uitsluitend toegang tot:

- Tickets
- Check-ins

Geen betaalinformatie.

---

# 14. Validation Rules

Email geldig.

---

Telefoon verplicht.

---

Evenement eindigt na start.

---

Verkoopperiode binnen eventperiode.

---

Prijs ≥ 0.

---

Capaciteit ≥ 1.

---

# 15. Automatic Actions

Na succesvolle publicatie

↓

Event zichtbaar.

---

Na bevestigde betaling

↓

QR genereren.

↓

PDF genereren.

↓

Mail versturen.

---

Na verlopen order

↓

Order annuleren.

↓

Tickets vrijgeven.

---

Na check-in

↓

Ticketstatus wijzigen.

---

# 16. Error Handling

Dubbele betaling

↓

Organisator beslist.

---

Dubbele scan

↓

Waarschuwing.

Geen check-in.

---

QR onbekend

↓

Toegang weigeren.

---

Upload mislukt

↓

Opnieuw proberen.

---

# 17. Audit Rules

Log:

- Login
- Publicatie
- Betaling
- Ticketuitgifte
- Check-in
- Annulering

---

# 18. MVP Scope

✅ Organisatie

✅ Event

✅ Tickettype

✅ Orders

✅ WhatsApp

✅ Bank

✅ Tickets

✅ Scanner

✅ Dashboard

---

# 19. V1

Teamleden

Coupons

Mailtemplates

Sponsors

Kortingscodes

---

# 20. V2

Refunds

PSP-integraties

API

White-label

Meerdere valuta

Meerdere landen

---

# 21. Implementation Checklist

## Sprint 1

☐ Event validaties

☐ Organisatie validaties

☐ Tickettype validaties

---

## Sprint 2

☐ Order lifecycle

☐ Payment lifecycle

☐ Ticket lifecycle

---

## Sprint 3

☐ Scanner rules

☐ Notifications

☐ Dashboard rules

---

## Sprint 4

☐ Security

☐ Logging

☐ Error handling

☐ Tests