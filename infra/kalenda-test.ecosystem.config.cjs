// PM2-procesdefinitie voor de TEST-omgeving van kalenda.
//
// Caddy (zie kalenda.caddy) proxyt kalenda.mijnonline.shop naar poort 3500.
// Draait dit proces niet, dan geeft de URL een 502.
//
// Starten/bijwerken vanaf /home/amresh/kalenda:
//     pm2 start infra/kalenda-test.ecosystem.config.cjs && pm2 save
// Herstarten na een codewijziging is niet nodig — Vite doet hot reload. Wel
// nodig na een wijziging in .env.test of in dit bestand:
//     pm2 restart kalenda-test
//
// `.cjs` en niet `.js`: package.json staat op "type": "module" en PM2 leest
// dit bestand met require().
module.exports = {
  apps: [
    {
      name: 'kalenda-test',
      cwd: '/home/amresh/kalenda',

      // Vite's bin rechtstreeks aanroepen in plaats van via `npm run dev:test`,
      // zodat PM2 het echte serverproces bewaakt en niet een npm-wrapper die
      // signalen niet doorgeeft.
      script: 'node_modules/vite/bin/vite.js',
      args: 'dev --port 3500',
      node_args: '--env-file=.env.test',
      interpreter: 'node',

      // Dit is een testomgeving met één gebruiker: één proces, geen cluster.
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      // Blijft de server crashen (bijv. door een kapotte .env.test), dan moet
      // PM2 stoppen met proberen in plaats van eindeloos te herstarten.
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 5000,
    },
  ],
}
