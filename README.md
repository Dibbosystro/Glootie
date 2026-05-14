# Glootie

Client-facing live dashboard for Shopify, Meta Ads, Google Ads, product recommendations, and AI creative tooling.

## What This Is

Glootie is the clean GitHub/Vercel rebuild of the local `Replit-project` prototype. It keeps the product goal from the Replit app: show clients what is happening in their ads and products right now, explain what is working, identify wasted spend, and recommend which Shopify products should be advertised next.

`Ads Overview.html` remains a visual reference for the Meta-style reporting page. It is not the production source file.

The local `Replit-project` export is intentionally not committed because it is a large prototype archive, not production source.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app works with seed data when live credentials are missing. Set the variables from `.env.example` to enable live sync routes.

## Vercel Setup

1. Push this folder as its own GitHub repo.
2. Import the repo into Vercel.
3. Add Neon/Postgres from Vercel Marketplace and set `DATABASE_URL`.
4. Add `APP_ACCESS_PASSWORD`, `AUTH_COOKIE_SECRET`, and `CRON_SECRET`.
5. Add platform credentials as they become available.
6. Deploy.

## Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run db:push
```
