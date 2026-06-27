# HP System — Seeder

Provisions the six demo portal users (Firebase Auth + Firestore `users/{uid}` profile)
plus a small set of sample records, so the **live** app is usable right after deploy.

## Steps

1. **Service account key** — Firebase Console → ⚙ Project Settings → *Service accounts* →
   **Generate new private key**. Save it here as `serviceAccountKey.json`.
   (Do **not** commit this file — it grants full admin access.)

2. **Install & run**
   ```bash
   cd "seed"
   npm install
   node seed.js
   ```

3. **Sign in** at your app URL with any of:
   `student@hp.edu`, `teacher@hp.edu`, `admin@hp.edu`,
   `management@hp.edu`, `partner@hp.edu`, `parent@hp.edu`
   — password `HpDemo!2026` (override with `SEED_PASSWORD=... node seed.js`).

## Notes

- **Idempotent** — safe to re-run; users are matched by email and sample docs use fixed IDs.
- `node seed.js --wipe` deletes the seeded sample docs, then reseeds.
- Sets a `role` **custom claim** on each user in addition to the Firestore profile.
- Change all demo passwords before any real/production use.
