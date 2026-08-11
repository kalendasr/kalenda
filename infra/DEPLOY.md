# Testomgeving: kalenda.mijnonline.shop

De testomgeving draait op de VPS (`162.35.176.40`) en is bedoeld om af te
kijken op een telefoon — Web Push werkt alleen over https, dus `localhost`
volstaat niet.

## Hoe het in elkaar zit

```
kalenda.mijnonline.shop
  → Caddy (basicauth, zie kalenda.caddy)
    → localhost:3500
      → PM2-proces `kalenda-test`
        → vite dev in /home/amresh/kalenda  ← de gewone werkmap
```

Er is dus **geen build- of releasestap**. De URL serveert rechtstreeks de
werkmap `/home/amresh/kalenda`, met hot reload. Wat daar op schijf staat, staat
live.

## Werkafspraak

Alleen goedgekeurd en getest werk hoort in de werkmap te staan, want het is
meteen zichtbaar op de URL.

- **Afgerond werk** → committen in `/home/amresh/kalenda`, pushen, klaar. De
  URL volgt vanzelf.
- **Onafgerond of experimenteel werk** → in een aparte git-worktree onder
  `/home/amresh/kalenda-werk/<naam>`, zodat de testomgeving op de laatste
  goedgekeurde stand blijft:

  ```bash
  git worktree add /home/amresh/kalenda-werk/<naam> -b experiment/<naam>
  ```

  Die map heeft een eigen `node_modules` nodig (`npm ci`) en een eigen poort
  als je hem wilt draaien (`vite dev --port 3600`); poort 3500 is van de
  testomgeving. Opruimen na afloop:

  ```bash
  git worktree remove /home/amresh/kalenda-werk/<naam>
  ```

## Beheer

| Wat                               | Commando                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| Status                            | `pm2 status kalenda-test`                                       |
| Logboek                           | `pm2 logs kalenda-test`                                         |
| Herstarten                        | `pm2 restart kalenda-test`                                      |
| Na wijziging in dit procesbestand | `pm2 start infra/kalenda-test.ecosystem.config.cjs && pm2 save` |

Het proces staat in de PM2-dump en de systemd-unit `pm2-amresh` is enabled, dus
na een herstart van de VPS komt de omgeving vanzelf terug. Draai `pm2 save`
opnieuw zodra je processen toevoegt of verwijdert.

Codewijzigingen vereisen géén herstart (Vite doet hot reload). Wél herstarten na
een wijziging in `.env.test`.

## Database

De testomgeving praat met de database uit `.env.test`. Controleer na een
schemawijziging of de migraties toegepast zijn:

```bash
node --env-file=.env.test node_modules/.bin/prisma migrate status
```

## Let op bij pushen

De husky pre-push hook draait typecheck en de volledige testsuite en duurt
ongeveer twee minuten. Breek `git push` niet af omdat het "hangt".
