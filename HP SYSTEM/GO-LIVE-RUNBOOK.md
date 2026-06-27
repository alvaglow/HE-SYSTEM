# HP System — Go-Live Runbook (operations, monitoring, backup, incident)
_Companion to `DEPLOY.md`. Do these before onboarding real users._

## 1. Pre-launch checklist
- [ ] Seeded demo passwords changed (`SEED_PASSWORD`); remove/disable demo accounts not needed.
- [ ] `?demo=1` understood (it forces mock mode — fine to leave; it never touches live data).
- [ ] Security rules deployed (Stage 4 hardened: roles via claims, server-only check-ins/payments).
- [ ] Rules tests pass: `cd tests && npm install && firebase emulators:exec --only firestore "npm test"`.
- [ ] Cloud Functions deployed; gateway webhook URLs registered (MoMo/VNPay/ZaloPay).
- [ ] `SCHOOL_LAT/LNG/RADIUS` set in `functions/.env` if geofencing attendance.
- [ ] Billing (Blaze) enabled; **budget alert** configured (below).
- [ ] Scheduled Firestore **backups** enabled (below).
- [ ] Mobile build has an EAS `projectId` (push works).

## 2. Monitoring & alerting
- **Functions:** Firebase Console → Functions → Health/Logs. Add a **log-based alert** on
  error rate (Cloud Logging → Alerting) for `severity>=ERROR`.
- **Crash/perf (mobile + web):** enable Crashlytics + Performance Monitoring.
- **Budget alert (cost guardrail):**
  ```
  Google Cloud Console → Billing → Budgets & alerts → Create budget
  Scope: project hp-system-142a5 → set monthly amount → alerts at 50/90/100%.
  ```
- **Uptime:** add a Cloud Monitoring uptime check on the hosting URL.

## 3. Backups (Firestore scheduled export)
One-time setup (daily export to a bucket, 30-day lifecycle):
```bash
# Create a bucket (once)
gsutil mb -l asia-southeast1 gs://hp-system-142a5-backups

# Grant the export service account access (Firebase export uses the App Engine default SA)
# Schedule a daily export (Cloud Scheduler + Firestore export API), e.g. via gcloud:
gcloud firestore export gs://hp-system-142a5-backups/$(date +%Y%m%d) --async
```
For a managed daily schedule, enable the **"Schedule data exports"** option in the Firebase
Console → Firestore → Backups (PITR), or wire a small scheduled Function that calls the
export API. **Restore:** `gcloud firestore import gs://hp-system-142a5-backups/<date>`.

## 4. Incident response
1. **Assess:** check Functions logs + Firestore usage; identify blast radius.
2. **Communicate:** post status to staff (web Management portal / Slack).
3. **Mitigate / roll back** (see §5).
4. **Postmortem:** record in `auditLogs` context + a short write-up; add a test if a rule/logic gap.

## 5. Rollback
| Layer | Command |
|-------|---------|
| Hosting (web) | `firebase hosting:rollback` |
| Functions | redeploy previous commit: `git checkout <prev> -- functions && firebase deploy --only functions` |
| Rules/Indexes | redeploy previous `firestore.rules` / `firestore.indexes.json` |
| Data | `gcloud firestore import gs://hp-system-142a5-backups/<date>` |

## 6. Remaining Stage-4 polish (tracked)
- Server-side **liveness verification** (currently a client token is recorded, not cryptographically verified).
- **Dashboard aggregation** via Firestore `count()` / counters when collections exceed ~10k.
- **Notification fan-out** for role-targeted alerts (e.g., notify all admins).
- Separate **staging** Firebase project + CI before each prod deploy.
- **Sign-out** entry in the mobile UI (`data.logout()` exists).
