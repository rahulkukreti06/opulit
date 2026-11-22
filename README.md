# OPULIT React + Vite

OPULIT uses React/Vite for the frontend and Vercel Node.js Functions for payment APIs.

## Environment variables

Use `.env.example` as the variable-name reference. Add secrets only through Vercel or a local ignored `.env`.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Never set `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secrets, or webhook secrets as `VITE_` variables.

## Local development

```powershell
npm install
npm run dev:vercel
```

Use `npm run dev` only for frontend-only work; `/api` routes require `npm run dev:vercel`.

## Supabase migration

Run `supabase/payment_migration.sql` in the Supabase SQL editor before testing payments.

## Razorpay webhook

Configure `https://<your-vercel-domain>/api/razorpay-webhook` in the Razorpay dashboard. Enable:

- `payment.captured`
- `payment.failed`
- `subscription.activated`
- `subscription.charged`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`
