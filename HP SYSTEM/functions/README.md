# HP System — Cloud Functions (Stage 2)

The money + trust engine. Payments via MoMo / VNPay / ZaloPay, automatic
settlement, scheduled jobs, and role-claim sync — all on Firebase.

## What's here

| Function | Type | What it does |
|---|---|---|
| `createPayment` | callable | App calls this to start a checkout; returns the gateway pay URL/deeplink. |
| `momoIpn`, `vnpayIpn`, `zalopayCallback` | HTTPS | Gateway webhooks. Verify the signature, then mark the payment **paid**. |
| `onPaymentPaid` | Firestore trigger | The single **settlement** point: invoice→paid, partner commission→payable, student notification, audit entry. Idempotent. |
| `markOverdueInvoices` | scheduled (daily) | Flags unpaid invoices past their due date and notifies the student. |
| `monthlyCommissionRollup` | scheduled (monthly) | Summarizes payable commissions per partner and notifies them. |
| `syncRoleClaim` | Firestore trigger | Keeps each user's auth role claim in sync with their `users` doc. |

Settlement is centralized in `onPaymentPaid` so every gateway shares the exact
same money ripple, and re-delivery of a webhook can't double-charge or
double-pay (it no-ops if the invoice is already paid).

## Deploy

```bash
cd functions
npm install
cp .env.example .env        # fill in SANDBOX gateway keys first
cd ..
firebase deploy --only functions
```

After deploy, copy each webhook's URL (shown in the deploy output, e.g.
`https://<region>-<project>.cloudfunctions.net/momoIpn`) into your gateway
dashboards **and** into `functions/.env` (`MOMO_IPN_URL`, `ZALOPAY_CALLBACK_URL`),
then redeploy so the create-order calls advertise the right callback.

## Test the flow

1. Sign in to the app, open **Student → Fees → Pay Now**, choose a method.
2. Complete payment in the gateway **sandbox**.
3. The gateway calls the webhook → payment marked paid → `onPaymentPaid` settles:
   the invoice flips to paid, the partner commission becomes payable, the student
   gets a notification, and an audit entry is written — all automatically.

> The web app also has a **demo** payment path (no gateway/keys needed) that runs
> the same ripple in-memory so you can see it instantly with `?demo=1`.
