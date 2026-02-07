# BTC Scalper Dashboard 🤖

A mobile-first, real-time dashboard for tracking Bitcoin scalping performance on Polymarket. Built with Next.js and deployed on Vercel.

## 🎯 Features

### Live Performance Tracking
- **Real-time P&L**: Current balance, total P&L, and today's P&L with animated transitions
- **Win Rate Analytics**: Visual circular progress indicator showing win percentage
- **Streak Tracking**: Current, best, and worst winning/losing streaks
- **Live BTC Price**: Fetched from CoinGecko API every 60 seconds

### Trading Insights
- **Current Prediction**: Latest trade prediction with confidence level and edge calculation
- **Indicator Weights**: Horizontal bar chart showing all 11 trading indicators
- **Recent Trades**: Scrollable list of last 20 trades with results
- **Win Rate by Confidence**: Breakdown of performance across confidence buckets (50-60%, 60-70%, etc.)
- **Daily P&L Chart**: 7-day sparkline chart showing daily performance

### UI/UX
- 🌙 **Dark Theme**: Crypto-inspired design with dark backgrounds
- 📱 **Mobile-First**: Fully responsive, optimized for mobile viewing
- 🔄 **Auto-Refresh**: Updates every 60 seconds automatically
- ⚡ **Fast & Lightweight**: No external chart libraries, pure CSS/SVG

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Data Source

The dashboard reads from `/public/data.json`, which is synced from the Polymarket trader skill.

### Data Structure

```json
{
  "btc_price": 102350.45,
  "last_updated": "2026-02-07T23:42:15Z",
  "performance": {
    "total_predictions": 24,
    "correct": 15,
    "wrong": 9,
    "win_rate": 62.5,
    "current_streak": 3,
    "best_streak": 5,
    "worst_streak": -3,
    "total_pnl": 18.75,
    "starting_balance": 100,
    "current_balance": 118.75
  },
  "weights": {
    "rsi_1m": 0.12,
    "rsi_5m": 0.11,
    // ... other indicators
  },
  "current_prediction": {
    "prediction": "UP",
    "confidence": 68,
    "edge": 0.09,
    // ... more fields
  },
  "trades": [
    // Array of trade objects
  ]
}
```

## 🔄 Syncing Data

The dashboard data is synced from the Polymarket trader skill using two Python scripts:

### 1. Generate Dashboard Data
```bash
python ../skills/polymarket-trader/scripts/btc_dashboard_data.py
```

This script:
- Reads `btc_trades.json`, `btc_performance.json`, and `btc_weights.json`
- Fetches current BTC price from CoinGecko
- Gets latest prediction from the trading bot
- Outputs combined JSON to stdout

### 2. Sync to Dashboard
```bash
python ../skills/polymarket-trader/scripts/btc_sync_dashboard.py
```

This script:
- Runs `btc_dashboard_data.py`
- Writes output to `public/data.json`
- (Optional) Commits and pushes to git for Vercel auto-deployment

### Automated Sync

To automatically sync dashboard data every 15 minutes, add this to your cron/scheduled tasks:

```bash
# Linux/Mac (crontab)
*/15 * * * * cd /path/to/workspace && python skills/polymarket-trader/scripts/btc_sync_dashboard.py

# Windows (Task Scheduler)
# Create a task that runs btc_sync_dashboard.py every 15 minutes
```

## 🌐 Deploying to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option 2: GitHub Integration

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/btc-dashboard.git
   git push -u origin main
   ```

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and deploy

3. Auto-deployment:
   - Every git push triggers a new deployment
   - Uncomment the git section in `btc_sync_dashboard.py` to enable auto-updates

### Environment Variables

No environment variables needed! The dashboard reads from static JSON.

## 🎨 Customization

### Colors

Edit `app/page.tsx` to change color scheme:

```typescript
// Current colors
const colors = {
  background: '#0a0a0a',
  cardBg: '#1a1a1a',
  green: '#22c55e',  // Wins/Up
  red: '#ef4444',    // Losses/Down
  blue: '#3b82f6',   // Neutral/Info
};
```

### Styling

The dashboard uses Tailwind CSS. Modify classes in `app/page.tsx` or extend `tailwind.config.ts`.

### Data Refresh Rate

Change the auto-refresh interval in `app/page.tsx`:

```typescript
// Current: 60 seconds
const interval = setInterval(fetchData, 60000);

// Change to 30 seconds
const interval = setInterval(fetchData, 30000);
```

## 📱 Mobile Optimization

- Single column layout on mobile
- Touch-friendly card sizes
- Optimized font sizes for small screens
- Horizontal scroll for trade list
- Responsive charts and progress bars

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Data**: Static JSON (no database needed)

## 📝 License

MIT

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own use!

## 📞 Support

For issues or questions, create an issue in the GitHub repository.

---

Built with ❤️ for crypto traders
