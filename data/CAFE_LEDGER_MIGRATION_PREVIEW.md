# Cafe ledger migration (preview)

Source: **`cafe-ledger-migration-preview.json`**.

After `npx prisma migrate deploy` (or `dev`), apply data:

```bash
npm run ledger:apply
```

Requires: restaurant `cafe-mantra`, seeded employees, and at least one user in that restaurant.
