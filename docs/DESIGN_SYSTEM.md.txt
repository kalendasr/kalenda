# DESIGN_SYSTEM.md

Version: 1.0 (MVP)

---

# 1. Purpose

Dit document definieert het complete Design System van het Event Management Platform.

Het is de bron van waarheid voor:

- UI
- UX
- Componenten
- Layouts
- Responsiveness
- Interacties
- Toegankelijkheid

Alle nieuwe schermen moeten dit document volgen.

Nooit componenten ontwerpen buiten dit systeem.

---

# 2. Design Philosophy

## Less But Better

Voeg nooit een component toe omdat het mooi is.

Voeg alleen componenten toe die een taak sneller maken.

---

## Workflow First

Iedere pagina ondersteunt één workflow.

Niet meerdere.

---

## Calm Interface

Een organisator gebruikt het platform uren achter elkaar.

De interface moet rustig aanvoelen.

Gebruik veel witruimte.

Vermijd visuele ruis.

---

## Progressive Disclosure

Laat alleen zien wat nu relevant is.

Geavanceerde opties zijn standaard verborgen.

---

## Consistency Above Creativity

Een gebruiker leert één patroon.

Daarna wordt dat patroon overal herhaald.

Nooit verschillende oplossingen voor hetzelfde probleem.

---

# 3. Design Tokens

## Border Radius

Cards: lg

Buttons: md

Inputs: md

Dialogs: xl

---

## Shadows

Gebruik uitsluitend:

shadow-sm

shadow-md

Nooit zware schaduwen.

---

## Borders

Gebruik borders.

Niet alleen schaduwen.

Cards moeten altijd een subtiele border hebben.

---

## Animaties

Gebruik alleen:

150ms

200ms

ease-out

Geen overdreven animaties.

---

# 4. Colors

## Primary

Wordt gebruikt voor:

- primaire knoppen
- links
- actieve navigatie

---

## Success

Groen.

Gebruik alleen voor:

- succesvolle betaling
- ticket geldig
- afgeronde actie

---

## Warning

Oranje.

Gebruik voor:

- wacht op actie
- dubbele scan
- aandacht vereist

---

## Error

Rood.

Gebruik alleen voor:

- fouten
- afgewezen betaling
- ongeldig ticket

---

## Neutral

Grijstinten.

Voor tekst.

Borders.

Achtergronden.

---

# 5. Typography

Headings

H1

Pagina titel

H2

Sectie

H3

Card titel

Body

Normale tekst

Caption

Extra informatie

Gebruik nooit meer dan deze hiërarchie.

---

# 6. Layout

Desktop

Sidebar links

Content rechts

Maximale leesbreedte:

1280px

---

Mobile

Bottom padding voor safe area.

Geen horizontaal scrollen.

Alles onder elkaar.

---

# 7. Spacing

Gebruik een 8-point grid.

4

8

12

16

24

32

48

64

Nooit willekeurige spacing.

---

# 8. Navigation

## Hoofdnavigatie

Dashboard

Organizations

Events

Settings

---

Binnen Event Workspace

Overview

Orders

Tickets

Ticket Types

Content

Scanner

Reports

Settings

---

Breadcrumbs alleen waar nodig.

---

# 9. Buttons

## Primary

Eén per scherm.

Bijvoorbeeld:

Nieuw evenement

Tickets uitgeven

Betaling bevestigen

---

## Secondary

Minder belangrijk.

---

## Destructive

Alleen rood.

Alleen voor:

Verwijderen

Annuleren

Niet voor gewone acties.

---

## Icon Buttons

Alleen voor bekende acties.

Edit

Delete

Copy

Download

---

# 10. Forms

Gebruik altijd dezelfde volgorde.

Label

↓

Input

↓

Helptekst

↓

Validatie

---

Verplichte velden duidelijk markeren.

Niet pas na submit.

---

# 11. Validation

Realtime.

Niet pas na submit.

Gebruik positieve feedback.

Voorbeeld:

✓ E-mailadres is geldig

In plaats van alleen fouten tonen.

---

# 12. Tables

Alle tabellen hebben:

Zoeken

Sorteren

Filters

Paginering

Kolommen aanpassen (V1)

---

Rij klikbaar.

Acties rechts.

---

# 13. Cards

Cards bevatten:

Titel

Beschrijving

Actie

Nooit meer dan één primaire actie.

---

# 14. Empty States

Iedere lege pagina heeft:

Illustratie (optioneel)

Titel

Beschrijving

Primaire CTA

Voorbeeld:

Nog geen evenementen

Maak je eerste evenement aan.

[ Nieuw evenement ]

---

# 15. Loading States

Gebruik Skeletons.

Niet:

Loading...

Spinners alleen voor korte acties.

---

# 16. Dialogs

Gebruik dialogs voor:

Bevestigen

Verwijderen

Kleine formulieren

---

Gebruik GEEN dialogs voor complete workflows.

---

# 17. Toasts

Succes

Groen

Kort

---

Fout

Rood

Leg uit wat fout ging.

---

Info

Blauw

Alleen indien nodig.

---

# 18. Status Badges

Draft

Grijs

Published

Blauw

Live

Groen

Pending

Oranje

Cancelled

Rood

Completed

Groen

---

# 19. Dashboard

Dashboard toont alleen:

Actie vereist

Statistieken

Recente activiteit

Snelkoppelingen

Geen instellingen.

---

# 20. Workspace Design

Iedere Workspace gebruikt dezelfde structuur.

Header

↓

KPI Cards

↓

Primary Action

↓

Tabs

↓

Content

Nooit hiervan afwijken.

---

# 21. Responsive Rules

Desktop

Volledige tabellen.

---

Tablet

Compacte tabellen.

---

Mobile

Cards.

Geen brede tabellen.

---

# 22. Accessibility

Alle formulieren:

Keyboard toegankelijk.

ARIA labels.

Focus states.

Voldoende contrast.

Geen informatie alleen met kleur communiceren.

---

# 23. Icons

Gebruik uitsluitend Lucide.

Nooit meerdere icon libraries.

---

# 24. Feedback

Iedere actie geeft feedback.

Opslaan

↓

Succesmelding

Verwijderen

↓

Bevestiging

Betaling

↓

Status wijzigen

Gebruiker mag nooit twijfelen.

---

# 25. Copywriting

Gebruik eenvoudige taal.

Niet:

"Transactie succesvol gevalideerd."

Wel:

"Betaling bevestigd."

---

Niet:

"Entity deleted."

Wel:

"Evenement verwijderd."

---

# 26. Mobile First

Alle schermen worden eerst mobiel ontworpen.

Daarna desktop.

Niet andersom.

---

# 27. Component Library

Toegestane componenten

Button

Input

Textarea

Select

Combobox

Checkbox

Radio

Switch

Card

Dialog

Drawer

Popover

Badge

Avatar

Table

Tabs

Accordion

Calendar

Toast

Alert

Tooltip

Empty State

Skeleton

---

Gebruik geen componenten buiten deze lijst zonder documentatie bij te werken.

---

# 28. MVP UI Checklist

## Layout

☐ Sidebar

☐ Header

☐ Workspace Layout

☐ Responsive

---

## Forms

☐ Consistente labels

☐ Realtime validatie

☐ Helpteksten

---

## Tables

☐ Zoeken

☐ Sorteren

☐ Filters

---

## Feedback

☐ Toasts

☐ Empty States

☐ Loading States

☐ Error States

---

## Accessibility

☐ Keyboard

☐ Focus

☐ Contrast

☐ Mobile