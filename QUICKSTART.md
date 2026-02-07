# Quick Start Guide ⚡

Get your BTC Scalper Dashboard running in 3 minutes.

## Local Development

```bash
# 1. Navigate to dashboard
cd C:\Users\campb\.openclaw\workspace\btc-dashboard

# 2. Install dependencies (first time only)
npm install

# 3. Start development server
npm run dev
```

Open **http://localhost:3000** in your browser. Done! 🎉

## Update Dashboard Data

```bash
# Run sync script to update data.json
python ../skills/polymarket-trader/scripts/btc_sync_dashboard.py
```

Refresh your browser to see updated data.

## Deploy to Vercel

### First Time Setup

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Deploy to production
vercel --prod
```

Your dashboard is now live on the internet! 🌐

### Subsequent Deployments

```bash
# Just push to git (if connected to GitHub)
git add .
git commit -m "Update"
git push

# Or use CLI
vercel --prod
```

## Automated Data Updates

### Windows Task Scheduler

1. Open **Task Scheduler**
2. Create Basic Task → "BTC Dashboard Sync"
3. Trigger: Every 15 minutes
4. Action: Start program
   - Program: `python`
   - Arguments: `C:\Users\campb\.openclaw\workspace\skills\polymarket-trader\scripts\btc_sync_dashboard.py`

### Linux/Mac Cron

```bash
# Edit crontab
crontab -e

# Add line (runs every 15 minutes)
*/15 * * * * cd ~/workspace && python skills/polymarket-trader/scripts/btc_sync_dashboard.py
```

## Project Structure

```
btc-dashboard/
├── app/
│   ├── page.tsx          # Main dashboard component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── public/
│   └── data.json         # Dashboard data (auto-updated)
├── README.md             # Full documentation
├── DEPLOYMENT.md         # Deployment guide
└── QUICKSTART.md         # This file
```

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main dashboard UI with all components |
| `public/data.json` | Live trading data (synced from trader skill) |
| `btc_sync_dashboard.py` | Script to update dashboard data |
| `btc_dashboard_data.py` | Script to generate combined data |

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Deployment
vercel                   # Deploy to preview
vercel --prod            # Deploy to production

# Data sync
python ../skills/polymarket-trader/scripts/btc_sync_dashboard.py
```

## Customization

### Change Colors

Edit `app/page.tsx`:

```typescript
// Find color classes and update
className="text-[#22c55e]"  // Green (wins)
className="text-[#ef4444]"  // Red (losses)
className="text-[#3b82f6]"  // Blue (info)
```

### Change Auto-Refresh Rate

Edit `app/page.tsx`:

```typescript
// Line ~55, change 60000 (60 seconds) to your preference
const interval = setInterval(fetchData, 60000);
```

### Modify Layout

The dashboard is fully responsive. Edit `app/page.tsx` to:
- Reorder sections
- Change grid layouts
- Add/remove components
- Adjust card styling

## Troubleshooting

### Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Build fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Dashboard shows old data

1. Run sync script
2. Hard refresh browser (Ctrl+Shift+R)
3. Check `public/data.json` is updated

## Next Steps

- ✅ Test dashboard locally
- ✅ Run sync script
- ✅ Deploy to Vercel
- ✅ Set up auto-sync
- 🎨 Customize colors/layout
- 📱 Test on mobile device
- 🔗 Share your dashboard URL!

## Support

- Full docs: `README.md`
- Deployment: `DEPLOYMENT.md`
- Issues: Check Vercel logs or sync script output

Happy trading! 📈
