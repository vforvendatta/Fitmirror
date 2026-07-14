# Task 8-DODO agent worklog

See /home/z/my-project/worklog.md for the appended task record (Task ID: 8-DODO).

## Summary of files created/modified

### Created
- `src/lib/dodo.ts` — Dodo Payments server-side helper (settings reader, createCheckout, retrievePayment, verifyWebhook).
- `src/app/api/checkout/route.ts` — `POST /api/checkout` → starts Dodo hosted checkout.
- `src/app/api/checkout/status/route.ts` — `GET /api/checkout/status?paymentId=xxx` → polls Dodo.
- `src/app/api/webhook/dodo/route.ts` — `POST /api/webhook/dodo` → verifies signature, creates Payment, upgrades Session.plan.

### Modified
- `prisma/schema.prisma` — added two **nullable** fields to the `Payment` model: `provider String?` and `providerPaymentId String?`, plus `@@index([providerPaymentId])`. Non-breaking for existing code paths.
- (Ran `bun run db:push` to apply the schema change + regenerate the Prisma client.)

## API contract confirmation
| Route | Method | Contract | Verified |
| --- | --- | --- | --- |
| `/api/checkout` | POST | body `{ plan, customerEmail? }` → 200 `{ checkoutUrl, paymentId }`; 400 bad plan; 503 not configured | ✅ curl-tested |
| `/api/checkout/status` | GET | `?paymentId=xxx` → 200 `{ status, plan, amountCents, currency }`; 400 missing id; 503 not configured | ✅ curl-tested |
| `/api/webhook/dodo` | POST | verifies `dp_signature` HMAC; on `succeeded` creates Payment + upgrades Session.plan; idempotent on `providerPaymentId`; always returns 200 | ✅ curl-tested (incl. idempotency replay) |

## Lint
My four files: **0 errors** when run with `npx eslint` directly. The `bun run lint` script reports 308 errors but they are all in `mini-services/pocketbase/pb_data/types.d.ts` (an auto-generated file owned by the parallel PocketBase task — out of scope for 8-DODO).

## Notes for other agents
- The `Payment` model now has optional `provider` and `providerPaymentId` columns. Existing `/api/admin/payment` and `/api/admin/payments` routes still work unchanged (they just don't populate the new columns for manually-recorded payments — `provider` will be `null` for those).
- The Dodo webhook reads the raw body via `await request.text()` BEFORE parsing JSON, so HMAC verification works on the exact bytes Dodo sent.
- `getDodoSetting(key)` falls back to env vars `DODO_API_KEY` / `DODO_WEBHOOK_SECRET` / `DODO_ENABLED` when no DB row is set, so deployments can use either mechanism.
- Admins set `dodo.api_key`, `dodo.webhook_secret`, `dodo.enabled` from the existing Admin → Settings tab; no UI changes were needed.
