# HP System — Mobile (Stage 3)

The phone app now runs on the **same Firebase backbone** as the web app: one set of
logins, one Firestore, the same Cloud Functions. A check-in on the phone shows on the
teacher's web screen; a payment on the phone settles the same invoice.

## What changed in Stage 3
- **Auth** → Firebase Auth (`src/services/firebase.js` with AsyncStorage persistence).
  Same accounts as the web app (seeded by `seed/`).
- **Data** → live Firestore via `src/services/data.js` (students, invoices, attendance,
  notifications). No more REST backend.
- **Attendance** → `AttendanceScreen` + `FaceScanButton`: OTP + face liveness + GPS,
  written to the shared `attendanceRecords` (Firestore queues offline writes itself).
- **Payments** → `PaymentScreen` calls the same `createPayment` Cloud Function
  (ZaloPay / VNPay / MoMo) and opens the gateway.
- **Push** → registers an Expo push token on the user's doc; the
  `sendPushOnNotification` Cloud Function delivers any new notification to that device.

## Run it (development)
```bash
cd mobile
npm install
npx expo start          # open in Expo Go or a simulator
```
Sign in with a seeded account (e.g. `student@hp.edu` / `HpDemo!2026`).
Make sure you've run the `seed/` script and deployed `functions/` first.

## Build for the stores (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure       # creates the EAS project + sets expo.extra.eas.projectId
eas build --platform android   # or ios
```

## Notes
- **Push tokens** need an EAS `projectId` (added by `eas build:configure`). Until then,
  push registration no-ops gracefully.
- The old `src/services/api.js` (Node REST client) is no longer used and can be removed;
  it's left in place for reference.
- Camera/Location/Notifications permissions are declared in `app.json`.
