# HP System — Deploy Runbook (end-to-end)
_Run these in order. Steps that need YOUR Google/Firebase login are marked 🔑._

## 0. Prerequisites (once)
```bash
npm install -g firebase-tools eas-cli      # CLIs
firebase login                             # 🔑 interactive Google login
cd "C:\Users\alvic\OneDrive\Desktop\HP SYSTEM"
firebase use hp-system-142a5               # select the project
```
In the Firebase Console (one-time): enable **Authentication → Email/Password**, create
**Firestore** (Production mode, region `asia-southeast1`), and **Blaze** billing (required
for Cloud Functions + outbound calls to payment gateways).

## 1. Seed users + sample data
```bash
cd seed
# Console → Project Settings → Service accounts → Generate new private key
# save as seed/serviceAccountKey.json   (NEVER commit this)
npm install
node seed.js                               # creates 6 users + connected sample data
cd ..
```
Logins after seeding: `student@hp.edu` … `parent@hp.edu` / `HpDemo!2026`
(override with `SEED_PASSWORD`). **Change before real use.**

## 2. Deploy security rules + indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
(Indexes take a few minutes to build — that's normal.)

## 3. Deploy Cloud Functions (payments, settlement, jobs, push)
```bash
cd functions
npm install
cp .env.example .env        # fill SANDBOX gateway keys (MoMo/VNPay/ZaloPay)
cd ..
firebase deploy --only functions           # 🔑 (uses your login)
```
Then copy each webhook URL from the output (e.g. `…/momoIpn`, `…/vnpayIpn`,
`…/zalopayCallback`) into (a) the gateway dashboards and (b) `functions/.env`
(`MOMO_IPN_URL`, `ZALOPAY_CALLBACK_URL`), and redeploy functions once more.

## 4. Deploy the web app
```bash
firebase deploy --only hosting
```
Deploys to the project's **default** site → `https://hp-system-142a5.web.app`
(firebase.json no longer pins a site name, so this just works). Add `?demo=1` for the
credential-free demo. To use a custom site/domain later: `firebase hosting:sites:create <name>`
then add `"site": "<name>"` back under `hosting` in firebase.json.

## 5. Mobile (app stores)
```bash
cd mobile
npm install
eas login                                  # 🔑
eas build:configure                        # sets expo.extra.eas.projectId (enables push)
eas build --platform android               # or ios
```
For local testing instead: `npx expo start` and open in Expo Go.

## 6. Verify (smoke test)
- Web: open the URL, sign in as `teacher@hp.edu`, generate an attendance OTP.
- Mobile: sign in as `student@hp.edu`, enter the OTP, pass face + GPS → check in.
- Confirm the check-in shows on the teacher's web screen in real time.
- Student → Fees → Pay (sandbox) → invoice clears on web + mobile; partner commission flips.

## 7. Rollback
- Hosting: `firebase hosting:rollback`
- Functions: redeploy the previous code (`git checkout <prev>` then `firebase deploy --only functions`)
- Rules: redeploy previous `firestore.rules`
- Data: restore from the latest scheduled export (see `GO-LIVE-RUNBOOK.md`).

## Secrets — never commit
`seed/serviceAccountKey.json`, `functions/.env`, `backend/.env`, `backend/keys/*`.
