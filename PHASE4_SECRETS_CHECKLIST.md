# HE-SYSTEM — Launch Secrets Checklist

Live-tested against the deployed project (`mluhfmflrdleyqrasuvk`) on 2026-07-13 by calling each edge function directly and confirming the "not configured" response. Set these in **Supabase Dashboard → Edge Functions → Secrets** (no CLI/MCP tool exists to set them programmatically — this must be done by hand).

## 1. Blocking for real payments (currently ALL missing — confirmed live)

| Gateway | Secrets to add | Where to get them |
|---|---|---|
| ZaloPay | `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_CALLBACK_URL` | ZaloPay merchant dashboard (sandbox: merchant.zalopay.vn sandbox portal). Callback URL = `https://mluhfmflrdleyqrasuvk.supabase.co/functions/v1/payment-zalopay` |
| VNPay | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` | VNPay merchant portal (sandbox.vnpayment.vn). Return URL = your web app's `/student/fees` or wherever you redirect after payment |
| MoMo | `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_NOTIFY_URL`, `MOMO_RETURN_URL` | MoMo business portal (test-payment.momo.vn). Notify URL = `https://mluhfmflrdleyqrasuvk.supabase.co/functions/v1/payment-momo` |
| Stripe (webhook) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → API keys / Webhooks (only needed if you're taking card payments alongside the Vietnamese wallets) |

Optional overrides (each has a working sandbox default baked in, only needed to go live/production): `ZALOPAY_ENDPOINT`, `VNPAY_ENDPOINT`, `VNPAY_QUERY_URL`, `MOMO_ENDPOINT`.

**Verified behavior:** all four gateways currently return a clean `503 {"error":"Service not configured","missing":[...]}` instead of crashing or silently failing — safe to deploy before these are set, nothing will misbehave. Set them whenever the real merchant accounts are ready.

## 2. Blocking for attendance check-in

| Secret | Notes |
|---|---|
| `LIVENESS_SECRET` | Internal signing secret only — not a 3rd-party credential. Confirmed missing live. Generated one for you, just paste it in: `ae4450849a84ddb87c75b1c2715a500b9990a1515f68b43b75812c042cacfd32` |

Without this, GPS/biometric attendance check-in (student mobile app) will return 503 instead of issuing a check-in token.

## 3. Notifications (degrade gracefully — not launch-blocking, but needed for full functionality)

Each of these is checked independently in `notify-send`; a missing one just skips that channel and logs `skipped: not configured` — it never blocks the other channels or the in-app notification.

| Channel | Secrets | Where to get them |
|---|---|---|
| Push (FCM) | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | resend.com → API Keys (from-email must be on a verified domain) |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Twilio Console |
| Zalo OA | `ZALO_OA_ACCESS_TOKEN` | Zalo Official Account admin panel |

Recommendation: at minimum set up Email (Resend) before launch, since invoice/payment receipts and leave-decision notices currently have no fallback if email is unset — students/parents just won't be notified.

## 4. Already fine — no action needed

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Supabase platform into every edge function; nothing to configure.

## 5. Auth hardening (Dashboard-only, not an edge function secret)

- **Leaked password protection** — Dashboard → Authentication → Policies → Password Security → toggle on. (You asked about this — it's a checkbox, no secret value needed. No MCP tool exists to flip it for you.)
- **Rate limits** — Dashboard → Authentication → Rate Limits — review the defaults are acceptable for your expected signup/login volume.

## Live smoke-test results (2026-07-13)

```
payment-zalopay create  -> 503 missing: ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_CALLBACK_URL
payment-vnpay create    -> 503 missing: VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL
payment-momo create     -> 503 missing: MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_NOTIFY_URL, MOMO_RETURN_URL
payment-webhook (stripe)-> 503 missing: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
attendance-liveness-token -> 503 missing: LIVENESS_SECRET
notify-send              -> 401 (correctly rejects non-staff/invalid session — auth gate confirmed working)
auth-register            -> confirmed institution slug is "happy-english"; signup validation confirmed working
```

All error handling behaved exactly as designed (structured 503s, no crashes, no silent no-ops) — the hardening from Phase 3 is holding up under real invocation.
