# BTC Dashboard — Deployment

## Architecture

The dashboard is a Next.js client-side app deployed on **Vercel**, fetching data from **Supabase**.

```
Browser → Vercel (btc-dashboard-amber.vercel.app)
  └→ Client-side fetch → Supabase REST API (dashboard_data table)
```

Data is synced to Supabase every 30s by the BTC bot's data sync script.

## Supabase Data Source

- Table: `dashboard_data` (single row, id=1)
- Columns: `live_data` (jsonb), `stats_7d` (jsonb), `updated_at`
- REST endpoint: `https://rwewjbofwqvukvxrlybj.supabase.co/rest/v1/dashboard_data?id=eq.1&select=*`
- Dashboard polls every 30 seconds

## Deploying

```bash
cd btc-dashboard
npx vercel --prod --yes
```

Or push to GitHub (master branch) and deploy manually.

## Production URL

https://btc-dashboard-amber.vercel.app
