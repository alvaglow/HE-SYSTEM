# HP System — Build Status & Next Steps
_Last updated: 16 June 2026_

This document is the current source of truth for the build. It records what was
fixed, the data-layer approach, and the exact commands left for you to run
(the steps that need your own credentials/login).

---

## 1. What was fixed this pass

### Web app — `HP-SYSTEM.html`
- **Critical: fixed a JSX syntax error that blanked the entire app.**
  The Student dashboard had a malformed attribute
  `trend="Due "+d.nextFeeDate"` → corrected to `trend={"Due " + d.nextFeeDate}`.
  Because the whole file compiles in one Babel pass, this single error would
  have shown users a blank screen. Verified the full script now parses cleanly.
- **Demo/live hybrid** (see §2): added a `?demo=1` URL override and made the
  login screen honor the runtime demo fallback, so the deployed site is
  explorable with no accounts.

### Backend — `backend/`
- Added 3 dependencies that the code `require`s but were missing from
  `package.json`: **express-slow-down**, **body-parser**, **moment-timezone**.
  (Without these, `npm install` + boot would crash.)
- Removed the bogus **`crypto`** dependency (it shadows the Node built-in).
- Created the missing **`scripts/migrate.js`** that `npm run migrate` references —
  it applies `schema.sql` to PostgreSQL.
- Verified: all 19 source files pass syntax checks and every local `require`
  resolves.

### Mobile — `mobile/`
- Added the missing **expo-crypto** dependency (used by `FaceScanButton`).
- Removed **expo-face-detector** — it was unused and is **not available in
  Expo SDK 51** (would break `expo install`/build).
- Removed the unused **react-native-dotenv** Babel plugin (nothing imports
  `@env`; the app reads `apiUrl` from `app.json → expo.extra`).
- Added `expo.extra.apiUrl` so `api.js`'s config path works, plus splash /
  adaptive-icon / web-favicon wiring.
- Generated branded **`assets/`** (icon, adaptive-icon, splash, favicon) — the
  folder was referenced by `app.json` but did not exist (would break builds).

### Firebase rules — `firestore.rules`
- Added rules for **`/grades`** and **`/leaveRequests`**. The app writes to both
  (Teacher Grade Entry / Leave Mgmt), but there were no rules → under
  default-deny those live writes were silently failing. Now scoped to staff
  roles.

---

## 2. Data-layer approach (recommended + implemented)

**Hybrid: live Firebase is the real backend; demo mode is a credential-free preview.**

- The app already ships a real Firebase config (`hp-system-142a5`), so by default
  it uses **live Firebase Auth + Firestore**.
- It now also supports **`https://your-app/?demo=1`** → forces demo mode with
  mock data and the 6 role cards, so anyone can explore the deployed site with
  no account. The app also falls back to demo automatically if Firebase can't
  initialise (e.g. opened via `file://`) or doesn't respond within 8s.
- To make **live login** work, run the **seeder** (`seed/`) once — it creates the
  6 portal users + sample data. Without seeding, an empty project has no users
  to log in as.

---

## 3. Steps left for you (need your login/credentials)

### A. Seed the live project (makes login work)
```bash
cd "seed"
# Firebase Console → Project Settings → Service accounts → Generate new private key
# save as seed/serviceAccountKey.json
npm install
node seed.js
```
Then sign in at your app URL with `student@hp.edu` … `parent@hp.edu`,
password `HpDemo!2026` (override with `SEED_PASSWORD`). **Change these before real use.**

### B. Deploy the web app + rules + indexes
```bash
cd "C:\Users\alvic\OneDrive\Desktop\HP SYSTEM"
npm install -g firebase-tools     # once
firebase login                    # interactive — only you can do this

# Verify the hosting site name in firebase.json ("site": "hp-system") exists:
firebase hosting:sites:list
#   • if "hp-system" is listed → proceed
#   • if not → either: firebase hosting:sites:create hp-system
#     or remove the "site" line from firebase.json to use the default site

firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```
Live URL: `https://hp-system-142a5.web.app` (or your site’s domain).

### B2. Deploy Cloud Functions — payments engine (Stage 2)
This is the chosen backend for payments (MoMo/VNPay/ZaloPay), settlement, scheduled
jobs and role claims. Details in `functions/README.md`.
```bash
cd functions
npm install
cp .env.example .env        # fill in SANDBOX gateway keys first
cd ..
firebase deploy --only functions
```
After deploy: copy each webhook URL from the output (e.g. `…/momoIpn`,
`…/zalopayCallback`) into your gateway dashboards **and** into `functions/.env`,
then `firebase deploy --only functions` again. Test via **Student → Fees → Pay Now**
(or instantly with no keys using `?demo=1`).

### C. Backend API (legacy/optional — superseded by Cloud Functions above)
The Node/PostgreSQL backend remains as reference. Under the Firebase-centric plan,
payments now run as Cloud Functions (B2), so this is **not required** to go live.
Requires PostgreSQL + Redis and real payment keys.
```bash
cd backend
cp .env.example .env        # fill in DB, Redis, JWT, MoMo/VNPay/ZaloPay keys
npm install
npm run generate-keys       # RSA-4096 JWT keys + prints MASTER_ENCRYPTION_KEY
npm run migrate             # applies schema.sql (15 tables)
npm start
```

### D. Mobile app
Requires an Expo account for store builds.
```bash
cd mobile
npm install
npx expo start              # dev (Expo Go / simulator)
# set expo.extra.apiUrl in app.json to your deployed backend first
npm run build:android       # or build:ios  (EAS — needs `eas login`)
```

---

## 4. Notes / things to watch
- **Secrets in the repo:** `HP-SYSTEM.html` contains the Firebase web config
  (that’s normal — web API keys are public and protected by Firestore rules).
  But **never** commit `seed/serviceAccountKey.json`, `backend/.env`, or
  `backend/keys/*` — these are admin-level secrets. (`.gitignore` added in `seed/`.)
- **Hosting site name:** the one config item most likely to trip the first
  deploy — verify with the `hosting:sites:list` step above.
- I could not run `firebase deploy`, `npm install`, or the seeder for you from
  here because each needs your interactive Google/Firebase login or your own
  infrastructure. Everything is staged so the commands above run clean.
