# Local Development with Razorpay

This project supports two modes for API calls:

## Local Development Mode

For local payment development, simply run:

```bash
npm run dev
```

This will automatically start both servers at the same time:
- Express API server on `http://localhost:3001`
- Vite dev server on `http://localhost:5173` (with API proxy enabled)

The local server dispatches the same handlers used by Vercel from `api/`, including:
- `/api/admin-*` - Admin subscription, plan, feature, override, mapping, and payment APIs
- `/api/entitlements` and `/api/pricing` - Feature access and plan pricing
- `/api/create-subscription`, `/api/verify-subscription`, `/api/subscription-status`, and `/api/cancel-subscription`
- `/api/razorpay-webhook` - Razorpay webhook handler
- `/api/health` - Local server health check

### Environment Variables Required for Local Dev

Make sure your `.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

## Production Mode (Vercel)

When deployed to Vercel, the app uses Vercel serverless functions located in the `api/` directory.

The `vercel.json` configuration handles routing to these functions.

### Deploying to Production

Simply push to GitHub - Vercel will automatically deploy using the serverless functions in the `api/` folder.

**Important:** The `server.js` file is ignored by git (in `.gitignore`) so it won't affect production.

## Development Workflow

### For Local Payment Testing
```bash
npm run dev
```
Both servers start automatically.

### For Vercel Local Development (if needed)
```bash
npm run dev:vercel
```

### To run only the API server
```bash
npm run dev:api
```

## Key Differences

| Feature | Local (server.js) | Production (Vercel) |
|---------|------------------|-------------------|
| Server | Express on port 3001 | Vercel serverless functions |
| Proxy | Vite proxy config | Vercel rewrites |
| Environment | Loads from .env | Vercel environment variables |
| Webhook testing | Requires tunnel (ngrok, etc.) | Public URL available |

## Testing Webhooks Locally

To test Razorpay webhooks locally, you'll need to expose your local server to the internet:

1. Use ngrok or similar tunneling service:
   ```bash
   ngrok http 3001
   ```

2. Configure the ngrok URL in your Razorpay dashboard for webhooks

3. Webhooks will be received at: `https://your-ngrok-url.ngrok-free.app/api/razorpay-webhook`
