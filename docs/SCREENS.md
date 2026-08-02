# SCREENS.md

Version: 1.4 (MVP)

---

# 1. Purpose

Dit document is de bron van waarheid voor **concrete schermontwerpen en prototypes**.

Waar DESIGN_SYSTEM.md het *systeem* beschrijft (tokens, componenten, patronen), beschrijft dit document de *toepassing* van dat systeem op specifieke schermen en flows.

Iedere screen-entry verbindt vier dingen:

- de flow die het scherm realiseert (USER_FLOWS.md)
- de componenten die het gebruikt (DESIGN_SYSTEM.md)
- de fase waarin het gebouwd wordt (ROADMAP.md)
- het prototype zelf (Claude Design)

Merknaam van het platform is **Kalenda**.

---

# 2. Relation To Other Documents

Dit document dupliceert nooit inhoud uit andere documenten.

| Document | Verantwoordelijkheid |
|---|---|
| DESIGN_SYSTEM.md | Het visuele systeem: tokens, componenten, patronen |
| USER_FLOWS.md | Stapsgewijze gebruikersreizen |
| SCREENS.md | Concrete schermen die flows + systeem samenbrengen |
| ROADMAP.md | Bouwvolgorde en fases |

Regel: een scherm dat hier staat verwijst naar de flow en de componenten. Het herhaalt ze niet.

Openstaande besluiten en afwijkingen staan in sectie 6, met verwijzing naar het eigenaar-document.

---

# 3. Screen Entry Convention

Iedere screen-entry bevat vaste velden: Prototype, Doel, User type, Realiseert flow, Componenten, Fase, Status, Open punten.

---

# 4. Screens

## 4.1 Homepage

**Prototype** — Herdesign_Eventplatform_Homepage.zip → Homepage.dc.html

**Doel** — Publieke landingspagina die bezoekers binnenhaalt en organisatoren naar "Event plaatsen" leidt.

**User type** — Visitor (niet ingelogd).

**Realiseert flow** — Instappunt vóór USER_FLOWS sectie 7. Nog niet als flow beschreven in USER_FLOWS.

**Componenten** — Sticky header met navigatie en valutaschakelaar **SRD/EUR**; hero met live-teller en dubbele CTA; zoekbalk met snelfilters; statistiekenblok; categorie-carrousel (8 categorieën, zie sectie 5); "Dit weekend" met dag-tabs; uitgelichte events (kaarten met badge, favoriet, prijs); "Zo werkt het" (3 stappen); reviews; organisator-CTA; FAQ-accordeon (4 vragen); footer.

**Fase** — Publieke storefront (nu impliciet onder ROADMAP Phase 2). Zie sectie 7.

**Status** — Concept.

**Open punten** — Geen; marketingcopy is afgestemd op de MVP-scope (zie sectie 6).

---

## 4.2 Zoekpagina

**Prototype** — Herdesign_Eventplatform_Homepage.zip → Zoekpagina.dc.html

**Doel** — Bezoekers laten ontdekken, zoeken en filteren tussen gepubliceerde evenementen.

**User type** — Visitor (niet ingelogd).

**Realiseert flow** — Publieke discovery-laag vóór USER_FLOWS sectie 7. Alleen Published events zichtbaar (BUSINESS_RULES BR-202).

**Componenten** — Header met valutaschakelaar SRD/EUR; breadcrumb + snelfilter-chips; filter-sidebar (Categorieën met aantallen, Datum-radio, Prijs-slider + Gratis/Betaald, "Wis alles"); zoekinput (naam, artiest of locatie); sorteren (Relevantie / Datum / Prijs / Populariteit); resultaatteller met verwijderbare filter-chips; event-kaartenraster met **favoriet-hart** (bewaren), datum, categorie, titel, locatie, prijs en Tickets-knop; paginering.

**Status** — Concept.

**Open punten** — Empty state (nul resultaten vs. geen gepubliceerde events) nog te ontwerpen. Favoriet/bewaren behouden; opkomst ("X gaan") is verwijderd — favorieten vereist nog wel een entiteit in het domeinmodel (sectie 6, punt E).

---

## 4.3 Ticketaanvraag & betaalflow

**Prototype** — Ticketverkoop_betaalflow.zip → Ticketverkoop UX.dc.html (canvas) + Aanvraag.dc.html (component)

**Doel** — Bezoeker van ticketkeuze naar een aangemaakte aanvraag leiden, en daarna door betaling tot e-ticket.

**User type** — Visitor → Customer.

**Realiseert flow** — USER_FLOWS sectie 7 (kopen), 8 (WhatsApp) en 9 (Bankoverschrijving). Eindpunt is een aanvraag met uniek kenmerk (= ordernummer, BUSINESS_RULES BR-500).

**Vorm** — In het prototype een klikbaar overlay op de eventpagina, op mobiel (390×844) en desktop, met een deelbare statuspagina `/aanvraag/$id` (geen login vereist). **Per DESIGN_SYSTEM §16 wordt de checkout als eigen route gebouwd, niet als dialog** — de overlay in het prototype is illustratief.

**Stappen** (form → bevestigd → wacht → betaald) — Aanvraagformulier (naam voorgevuld, WhatsApp-nummer +597, betaalmethode) → bevestiging met tijdlijn "Wat gebeurt er nu?" + 48-uur teller (BR-506) → wachten op betaling/controle → e-ticket met QR-code.

**Betaalmethoden** — (1) Betaalverzoek via WhatsApp met inline app-keuze **Mope / Uni5Pay**; (2) Bankoverschrijving met rekeninggegevens + kenmerk. Daarnaast een uitgeschakelde teaser "Direct online betalen — binnenkort" (toekomstige PSP). **Contant is verwijderd.**

**Kenmerk** — In het prototype (uit een eerdere repo, `lillion83/ticketsysteem`) landde de app-keuze als `reserveringen.betaalmethode = 'whatsapp:mope'`. Die veldnamen gelden **niet** in deze repo (`kalendasr/kalenda`), die de Engelse namen uit DATABASE_DOMAIN volgt en de Order/Payment-modellen nog moet bouwen (Phase 4–5). De samengestelde methode-keuze is dus een open modelleerkeuze — zie sectie 6, punt H.

**Fase** — ROADMAP Phase 3 (ticketkeuze) + Phase 4 (order), doorloop in Phase 5 (betalingen) en Phase 6 (e-ticket).

**Status** — Gebouwd (Fase 4, checkout + order-save + statuspagina). Checkout is een eigen route `/evenementen/$slug/afrekenen`; de deelbare statuspagina is `/bestelling/$orderNumber` (geen login, BR-403). Het bevestigen van betalingen + betaalbewijs-upload volgt in Fase 5.

---

## 4.4 Organisator · ticketaanvragen (referentie)

Zichtbaar binnen Ticketverkoop UX.dc.html. De operationele tegenhanger van 4.3: organisator verwerkt aanvragen (verzoek sturen, betaling bevestigen). Hoort in Event Workspace → Orders (PRODUCT_ARCHITECTURE §5), realiseert USER_FLOWS sectie 10. Geen nieuw scherm. Lijst met status-tabs (Wacht op betaling / Betaald / Verzonden), per rij klant, aantal + tickettype, bedrag, telefoon, kenmerk, resterende tijd, methode-badge en acties.

---

# 5. Design Tokens

Bron van waarheid zijn de CSS-variabelen in `src/styles.css` (shadcn, oklch), niet losse hex-waarden. De prototypes horen deze variabelen te consumeren.

| Rol | Token in repo | Prototype-benadering |
|---|---|---|
| Primary | `--primary: oklch(0.53 0.19 261.5)` | ≈ #1D4ED8 |
| Success | `--success` | #16A34A |
| Warning | `--warning` | #F59E0B |
| Error | `--destructive` | #DC2626 |
| Radius | `--radius: 0.625rem` (~10px) | pill in prototype → volg `--radius` bij bouw |
| Iconen | `iconLibrary: lucide` (components.json) | inline-SVG in prototype → vervang door Lucide |

De prototype-primary (#1D4ED8) is bewust naar dezelfde blauwtint geharmoniseerd als `--primary`. Fonts (Plus Jakarta Sans + IBM Plex Mono) en de valutaschakelaar SRD/EUR zijn prototype-keuzes; leg fonts vast in DESIGN_SYSTEM als ze definitief zijn.

**Categorieën (8)** — seed voor de Category-entiteit (DATABASE_DOMAIN §15):
Muziek & Concerten · Nightlife · Cultuur & Festival · Food & Drinks · Business & Netwerk · Sport & Outdoor · Workshops · Familie & Kids

---

# 6. Besluiten & Afwijkingen

## Besloten en verwerkt in de designs

**A. Merknaam** — Het platform heet **Kalenda**. Toegepast op alle schermen.

**B. Contant** — Vervalt als betaalmethode. Verwijderd uit de aanvraagflow. BUSINESS_RULES BR-601 (alleen WhatsApp + Bank) blijft dus ongewijzigd geldig.

**C. Valuta** — Schakelaar is **SRD/EUR** (was SRD/USD). De koers in het prototype is een placeholder (1 EUR ≈ 43 SRD). Een echte koersbron moet nog worden bepaald. → DATABASE_DOMAIN, BUSINESS_RULES.

**D. Marketingbeloftes** — Verwijderd omdat het platform geen geld verwerkt (CLAUDE.md §21): automatische terugbetaling, ticket doorgeven/op naam zetten, en "uitbetaling 2× per week". Copy verwijst nu naar betaling rechtstreeks aan de organisator; terugbetaling regelt de organisator.

**E. Favorieten vs. opkomst** — Favoriet/bewaren **blijft**; opkomst ("X gaan") is **verwijderd**. Let op: favorieten vereist nog een entiteit in het domeinmodel. → DATABASE_DOMAIN.

**F. Design system** — Primary/hover geharmoniseerd naar #1D4ED8 / #1737A8. Checkout wordt een eigen route i.p.v. dialog (§16). Knop-radius en iconen conformeren bij bouw aan DESIGN_SYSTEM (md-radius, Lucide).

## Verwerkt in de repo-docs (v1.1)

**G. Klanttoegang zonder account** — Vastgelegd: de MVP heeft geen klantaccount; toegang loopt via een unieke orderlink + e-mail. Zie BUSINESS_RULES **BR-403 / BR-404** en USER_FLOWS (User Types → Customer, en de koopflow). Homepage-copy die naar "je account" verwees is aangepast naar "je persoonlijke orderlink". Een klantaccount ("Mijn tickets") is V1.

**H. Betaalmethode-modellering** — Vastgelegd: methode en app in aparte velden, `Order.paymentApp` (Mope / Uni5Pay, leeg bij Bank), waarden uit PaymentSettings → WhatsApp.supportedApps. Geen samengestelde string. Zie DATABASE_DOMAIN §9 (**Payment App**).

**I. Servicefee** — Vastgelegd: het platform int geen fee uit de betaling; `Order.serviceFee` wordt in de MVP alleen geregistreerd voor rapportage. Zie BUSINESS_RULES **BR-608**. De feitelijke facturatie aan de organisator is bewust naar een latere fase geschoven — dat blijft het enige echt openstaande punt.

---

# 7. Storefront Gap (bijgewerkt)

De publieke storefront is grotendeels ingevuld: Homepage (4.1), Zoekpagina (4.2) en een publieke eventpagina (achtergrond van 4.3).

**Gebouwd (Fase 2):** een eenvoudige publieke eventlijst (`/evenementen`) en een zelfstandige publieke eventpagina (`/evenementen/$slug`) — alleen gepubliceerde events (BR-202). Nog te doen als eigen storefront-ronde: homepage-herontwerp (hero/categorieën) en de zoekpagina met filters/sortering + empty state.

Nog te ontwerpen / expliciet te maken: klant-statuspagina `/aanvraag/$id` als vastgesteld scherm (Fase 4).

**Plaatsing** — Dit bestand hoort in `docs/` naast de andere `.md`-documenten in `kalendasr/kalenda`.

**Aanbeveling** — Maak de publieke storefront expliciet in ROADMAP (eigen mini-fase of concreet resultaat binnen Phase 2).

---

# 8. Maintenance Rules

- Voeg hier alleen concrete schermen toe, geen systeempatronen (die horen in DESIGN_SYSTEM).
- Verwijs altijd naar flow, componenten en fase. Herhaal ze niet.
- Nieuwe afwijkingen komen in sectie 6, met verwijzing naar het eigenaar-document.
- Werk de status bij zodra een scherm van Concept naar Gebouwd gaat.

---

# 9. Changelog

- **1.4** — Besluiten G/H/I verwerkt in de repo-docs (BUSINESS_RULES BR-403/404/608, DATABASE_DOMAIN Payment App / Order.paymentApp, USER_FLOWS klant zonder account). Homepage-copy over "je account" aangepast.
- **1.3** — Afgestemd op repo `kalendasr/kalenda`: tokens verwijzen naar `src/styles.css`, betaalmethode-provenance gecorrigeerd (Engelse namen), plaatsing in `docs/`.
- **1.2** — Besluiten verwerkt: merknaam Kalenda, Contant verwijderd, SRD/EUR, marketingbeloftes verwijderd, opkomst verwijderd (favorieten behouden), tokens geharmoniseerd, checkout als route. Designbestanden bijgewerkt.
- **1.1** — Echte inhoud uit de designbestanden verwerkt; afwijkingen gesignaleerd.
- **1.0** — Eerste opzet met twee schermen.
