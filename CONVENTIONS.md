# BTC Dashboard Conventions

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Deployed on Vercel (Hobby plan — daily cron only)
- Data from SQLite via data server (localhost:18801, Tailscale-exposed)

## Critical Rules

### JSX
- **NEVER wrap JSX elements in function calls** like `n()`, `h()`, or similar. This was a recurring bug that caused "00" display.
- Return JSX directly from components — no wrappers.

### Time Display
- Server stores/sends UTC timestamps
- **Always** use `timeZone: 'America/New_York'` in all `toLocaleTimeString()` / `toLocaleString()` calls
- Import shared formatters from `app/components/utils.ts` when available

### Data Formatting
- Dollar amounts: `$X.XX` (2 decimal places)
- Percentages: `X.X%` (1 decimal place)
- Win rates: `X.X%`
- P/DD ratios: `X.XX`

### Component Pattern
- One component per file in `app/components/`
- Use `'use client'` directive for interactive components
- Auto-refresh via `setInterval` where needed (data server polling)
- Handle loading/error states — never leave a blank screen
