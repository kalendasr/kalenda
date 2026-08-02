-- Seed de vaste categorielijst (SCREENS.md §5). Idempotent: opnieuw draaien
-- verandert niets dankzij ON CONFLICT op de unieke slug. Zo zijn de categorieën
-- reproduceerbaar op elke omgeving via `prisma migrate deploy`.
INSERT INTO "category" ("id", "name", "slug", "icon", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Muziek & Concerten', 'muziek-concerten', 'music', 1, true, now(), now()),
  (gen_random_uuid(), 'Nightlife', 'nightlife', 'disc-3', 2, true, now(), now()),
  (gen_random_uuid(), 'Cultuur & Festival', 'cultuur-festival', 'drama', 3, true, now(), now()),
  (gen_random_uuid(), 'Food & Drinks', 'food-drinks', 'utensils', 4, true, now(), now()),
  (gen_random_uuid(), 'Business & Netwerk', 'business-netwerk', 'briefcase', 5, true, now(), now()),
  (gen_random_uuid(), 'Sport & Outdoor', 'sport-outdoor', 'bike', 6, true, now(), now()),
  (gen_random_uuid(), 'Workshops', 'workshops', 'graduation-cap', 7, true, now(), now()),
  (gen_random_uuid(), 'Familie & Kids', 'familie-kids', 'baby', 8, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;
