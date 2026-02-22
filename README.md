# BTC Scalper Dashboard

Real-time dashboard for tracking Bitcoin scalping performance on Polymarket 5-minute binary options.

**Live:** [peytoncampbell.ca/dashboard](https://peytoncampbell.ca/dashboard)

## Features

- **4 tabs:** Summary, Strategies, Trades, Charts
- **Multi-strategy architecture:** 5 live strategies (MorningCheap, DownMomentumConfirm, TakerBuyRatio_DOWN, EarlyEntryDown, MLProfit_v5) + LEGACY strategies
- **Key metrics:** P/DD ratio, Sortino ratio, max drawdown, win rate
- **Live data** from Supabase (synced from the bot in real time)
- Dark theme, mobile-first, responsive

## Tech Stack

- **Framework:** Next.js 15 (App Router, static export)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data:** Supabase
- **Hosting:** GitHub Pages (`output: 'export'`, `basePath: '/dashboard'`)

## Development

```bash
npm install
npm run dev
```

## Deployment (GitHub Pages)

```bash
npx next build
```

Copy the `out/` directory to your portfolio repo's `docs/dashboard/` folder, then push:

```bash
cp -r out/* ../portfolio/docs/dashboard/
cd ../portfolio
git add docs/dashboard
git commit -m "update dashboard"
git push
```

## License

MIT
