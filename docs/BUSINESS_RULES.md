# BUSINESS_RULES.md

Version: 1.1 (MVP)

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

## BR-403

Een klant heeft in de MVP geen account.

Toegang tot de bestelling en de tickets verloopt via een unieke, deelbare orderlink en via e-mail.

Geen login vereist.

---

## BR-404

Een klantaccount ("Mijn tickets") is V1.

Verwijs in de MVP nooit naar "je account" waar de orderlink wordt bedoeld.

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

## BR-508

Een bestelling kan geannuleerd worden zolang er nog geen tickets zijn uitgegeven.

Na Paid bestaan de QR-codes (BR-604) en zou annuleren betekenen dat geldige tickets ingetrokken worden. Dat is terugbetalingsgebied en valt buiten de MVP; de organisator handelt dat buiten het platform af (BR-600).

Annuleren geeft de gereserveerde tickets direct vrij, net als bij verlopen (BR-507).

---

## BR-509

Een klant kan om annulering vragen; de organisator beslist.

De klant dient een verzoek in met een reden. Het platform annuleert niets uit zichzelf — het brengt het verzoek bij de organisator, die het toekent (de bestelling wordt geannuleerd, BR-508) of afwijst (de bestelling blijft staan). In beide gevallen krijgt de klant automatisch bericht.

Er kan hoogstens één verzoek tegelijk openstaan. Een afgehandeld verzoek blijft zichtbaar in de geschiedenis van de bestelling.

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

De bestelling keert daarvoor terug naar Pending Payment met een hersteltermijn van 24 uur, gerekend vanaf het moment van afkeuren.

Dit is de enige toegestane stap terug in BR-505. Zonder die stap blijft een afgekeurde bestelling in Awaiting Review staan, en die status verloopt nooit (BR-506) — de gereserveerde tickets zouden dan permanent bezet blijven, ook als de klant nooit meer iets indient. Dat botst met BR-507.

Dient de klant binnen 24 uur niets in, dan verloopt de bestelling alsnog en komen de plaatsen terug in de verkoop.

---

## BR-606

Bij afkeuring ontvangt klant automatisch een melding.

---

## BR-607

Organisator bepaalt of betaling correct is.

Niet het platform.

---

## BR-608

Het platform int geen servicefee uit de betaling.

Omdat alle betaling rechtstreeks tussen klant en organisator loopt (BR-600), wordt de servicefee niet automatisch ingehouden.

In de MVP wordt de servicefee per order vastgelegd (Order.serviceFee) voor rapportage en afrekening.

De daadwerkelijke facturatie aan de organisator valt buiten de MVP-betaalflow.

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

## BR-904

Gepubliceerd event: begintijd of locatie gewijzigd

↓

Alle klanten met een actieve bestelling (niet geannuleerd/verlopen) voor dat event informeren.

---

## BR-905

Event vindt vandaag plaats

↓

Elke klant met een betaalde/afgeronde bestelling voor dat event krijgt eenmalig een herinnering (per bestelling geclaimd, zodat een dagelijkse cronrun niet dubbel verstuurt).

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