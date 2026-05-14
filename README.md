# Glootie

Glootie is a private client dashboard for ads, products, and creative decisions.

It gives clients one place to see what is happening in their paid media, what is working, what is wasting spend, which Shopify products are ready for ads, and what creative ideas to make next.

## What It Does

- Shows live or seed-mode ads performance for Meta Ads and Google Ads.
- Tracks spend, revenue, ROAS, purchases, cost per purchase, CTR, impressions, and campaign delivery.
- Classifies campaigns by campaign type, such as bundle offer, product-specific, brand search, generic search, Shopping/catalog, PMax, retargeting, prospecting, and account-wide sales.
- Monitors Shopify product data, including price, inventory, status, product type, image, and readiness for ads.
- Creates client-readable product recommendations: scale, test, hold, fix first, or do not advertise.
- Provides AI tools for ad copy and image prompt generation.
- Includes API settings for Shopify, Meta, Google Ads, OpenAI, Anthropic, Gemini, OpenRouter, and Neokens.
- Runs in demo/seed mode when credentials are missing, so the app can still be reviewed and deployed safely.

## First Client

The first dashboard is for Cafe Racer Garage.

The app is built so future clients can be added behind the same dashboard structure with separate client records, integrations, campaigns, products, and recommendations.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Neon Postgres
- Vercel hosting
- Vercel Cron for scheduled syncs

## Main Pages

- `/` - Overview dashboard
- `/ads/meta` - Meta Ads performance
- `/ads/google` - Google Ads performance
- `/products` - Shopify product monitor
- `/products/[id]` - Product detail and linked ad campaigns
- `/opportunities` - Product and campaign recommendations
- `/ad-copy` - AI ad copy studio
- `/image-maker` - AI image prompt studio
- `/settings` - Integrations, API keys, and manual syncs

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The app works without live credentials by using seed data.

## Environment Variables

Private access:

```text
APP_ACCESS_PASSWORD=
AUTH_COOKIE_SECRET=
CRON_SECRET=
```

Database:

```text
DATABASE_URL=
CREDENTIAL_ENCRYPTION_KEY=
```

`CREDENTIAL_ENCRYPTION_KEY` is required in production before saving integration credentials from the Settings page. It should be a long random string, different from `AUTH_COOKIE_SECRET`. Saved credentials are encrypted server-side and stored in Postgres, then read only by server routes and sync jobs.

Shopify:

```text
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_ACCESS_TOKEN=
```

Meta Ads:

```text
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
```

Google Ads:

```text
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
GOOGLE_ADS_REDIRECT_URI=
```

AI providers:

```text
OPENAI_API_KEY=
OPENAI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
NEOKENS_KEY=
NEOKENS_BASE_URL=
NEOKENS_MODEL=
```

Never commit `.env.local`.

## Vercel Deployment

1. Import this GitHub repo into Vercel.
2. Select the Next.js framework preset.
3. Add a Neon Postgres database and set `DATABASE_URL`.
4. Add `APP_ACCESS_PASSWORD`, `AUTH_COOKIE_SECRET`, `CRON_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY`.
5. Add Shopify, Meta, Google Ads, and AI provider credentials in Settings or as Vercel environment variables.
6. Deploy.

In production, Settings saves integration credentials into the database as encrypted JSON. The browser can add, replace, or remove credentials, but saved secret values are never returned to the browser. Google Ads OAuth stores the refresh token the same way when the database and encryption key are configured.

The production cron job is defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync/all",
      "schedule": "0 7 * * *"
    }
  ]
}
```

The sync endpoint should be protected with `CRON_SECRET`.

## Useful Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run db:push
```

## Product Direction

Glootie is built to become one dashboard per client. V1 is private and password-gated. The auth layer is intentionally simple so Clerk or another full auth provider can be added later without rebuilding the product.
