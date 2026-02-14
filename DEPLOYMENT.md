# BTC Dashboard — Deployment

## Architecture

Single-origin setup: the Python data server serves **both** the API and the static frontend on port 18801.

```
Browser → Cloudflare Tunnel (dashboard.peytoncampbell.ca) → localhost:18801
  ├── /api/*        → Python API handlers (live, trades, stats, signal, health, near-misses)
  └── /*            → Static files from btc-dashboard/out/ (Next.js static export)
```

No Vercel, no cross-origin, no CORS issues, no latency from chained requests.

## How It Works

1. **Next.js static export** — `output: 'export'` in `next.config.ts` builds to `btc-dashboard/out/`
2. **Python data server** — `btc_data_server.py` serves API endpoints at `/api/*` and falls through to static files for everything else
3. **Frontend fetches** — The dashboard calls `/api/live` and `/api/stats` directly (same origin, relative URLs)
4. **Cloudflare tunnel** — Routes `dashboard.peytoncampbell.ca` → `localhost:18801` (unchanged)

## Rebuilding the Frontend

```bash
cd btc-dashboard
npx next build
```

Output goes to `btc-dashboard/out/`. The Python server serves it immediately — no restart needed.

## Restarting the Data Server

```bash
cd C:\Users\campb\.openclaw\workspace
python -u skills/polymarket-trader/scripts/btc_data_server.py
```

## Polling

The dashboard polls `/api/live` and `/api/stats` every 15 seconds with a 12s abort timeout. BTC price is fetched from CoinGecko client-side.
