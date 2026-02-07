# Deployment Guide 🚀

Complete guide to deploying the BTC Scalper Dashboard to Vercel.

## Prerequisites

- [GitHub account](https://github.com)
- [Vercel account](https://vercel.com) (free tier works great)
- Git installed locally

## Step-by-Step Deployment

### 1. Prepare Your Repository

```bash
# Navigate to dashboard directory
cd C:\Users\campb\.openclaw\workspace\btc-dashboard

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: BTC Scalper Dashboard"
```

### 2. Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `btc-dashboard` (or your preferred name)
3. Keep it **Private** (recommended for trading bots)
4. Don't initialize with README (we already have one)
5. Click "Create repository"

### 3. Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/btc-dashboard.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel

#### Option A: Import from GitHub (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Find your `btc-dashboard` repository and click **"Import"**
5. Vercel auto-detects Next.js configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. Click **"Deploy"**
7. Wait 1-2 minutes for build to complete
8. Your dashboard is live! 🎉

#### Option B: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? btc-dashboard
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

### 5. Get Your Dashboard URL

After deployment, Vercel provides:
- **Production URL**: `https://btc-dashboard.vercel.app` (or custom domain)
- **Preview URLs**: For each git push (if using GitHub integration)

## Auto-Deployment Setup

### Enable Auto-Deployment from Git

With GitHub integration, every `git push` triggers a new deployment automatically.

### Update Dashboard Data Automatically

To keep your dashboard updated with live trading data:

#### Option 1: Manual Sync + Git Push

```bash
# Run sync script
python ../skills/polymarket-trader/scripts/btc_sync_dashboard.py

# Commit and push
cd btc-dashboard
git add public/data.json
git commit -m "Update dashboard data"
git push
```

Vercel will automatically deploy the update.

#### Option 2: Enable Auto-Commit in Sync Script

Edit `skills/polymarket-trader/scripts/btc_sync_dashboard.py`:

Uncomment the git section at the bottom:

```python
# Uncomment this section:
try:
    os.chdir(dashboard_dir)
    subprocess.run(['git', 'add', 'public/data.json'], check=True)
    subprocess.run([
        'git', 'commit', '-m', 
        f'Update dashboard data - {datetime.now().strftime("%Y-%m-%d %H:%M")}'
    ], check=False)
    subprocess.run(['git', 'push'], check=True)
    print("[OK] Changes pushed to git")
except subprocess.CalledProcessError as e:
    print(f"Warning: Git operation failed: {e}", file=sys.stderr)
```

Now every time you run `btc_sync_dashboard.py`, it will:
1. Update `data.json`
2. Commit to git
3. Push to GitHub
4. Trigger Vercel deployment

#### Option 3: Scheduled Task (Recommended)

**Windows (Task Scheduler):**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "BTC Dashboard Sync"
4. Trigger: Daily, repeat every 15 minutes
5. Action: Start a program
   - Program: `python`
   - Arguments: `C:\Users\campb\.openclaw\workspace\skills\polymarket-trader\scripts\btc_sync_dashboard.py`
6. Finish

**Linux/Mac (Cron):**

```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes)
*/15 * * * * cd /path/to/workspace && python skills/polymarket-trader/scripts/btc_sync_dashboard.py
```

## Custom Domain (Optional)

### Add Your Own Domain

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Click **"Add"**
4. Enter your domain (e.g., `btc.yourdomain.com`)
5. Follow DNS configuration instructions
6. Wait for DNS propagation (5-60 minutes)

### Free Alternatives

Vercel provides a free subdomain: `your-project.vercel.app`

## Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error: "TypeScript errors"**
```bash
# Check types locally
npm run build

# Fix any TypeScript errors shown
```

### Dashboard Shows Old Data

1. Check `public/data.json` has latest data
2. Clear browser cache (Ctrl+Shift+R)
3. Verify Vercel deployment completed successfully
4. Check Vercel deployment logs for errors

### Auto-Deployment Not Working

1. Verify GitHub repository is connected in Vercel
2. Check Vercel deployment logs for errors
3. Ensure `git push` is successful
4. Check Vercel project settings for auto-deploy toggle

### Data Not Updating

1. Run sync script manually:
   ```bash
   python skills/polymarket-trader/scripts/btc_sync_dashboard.py
   ```
2. Check for errors in script output
3. Verify paths to data files are correct
4. Check git credentials if auto-commit is enabled

## Performance Optimization

### Enable Edge Caching

In `next.config.ts`, add:

```typescript
const config = {
  async headers() {
    return [
      {
        source: '/data.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60',
          },
        ],
      },
    ];
  },
};
```

### Reduce Client-Side Requests

The dashboard auto-refreshes every 60 seconds. To reduce unnecessary requests:

```typescript
// In app/page.tsx, increase interval
const interval = setInterval(fetchData, 120000); // 2 minutes
```

## Security Best Practices

### Keep Repository Private

Trading bot data should remain private. Keep GitHub repo private if it contains sensitive data.

### Environment Variables

If you add API keys later, use Vercel environment variables:

1. Vercel dashboard → Project → Settings → Environment Variables
2. Add variables (e.g., `COINGECKO_API_KEY`)
3. Redeploy for changes to take effect

### Data Access

The dashboard reads from static JSON. No authentication needed since data is public on frontend.

If you want to restrict access:
1. Add basic auth middleware
2. Use Vercel password protection (Pro plan)
3. Host behind a private VPN/network

## Monitoring

### Vercel Analytics (Optional)

Enable in Vercel dashboard:
- Go to project → Analytics
- Free tier includes basic metrics
- Track visitors, performance, etc.

### Check Deployment Status

```bash
# Via CLI
vercel ls

# Or check Vercel dashboard
# https://vercel.com/dashboard
```

## Cost

**Vercel Free Tier Includes:**
- Unlimited deployments
- Automatic HTTPS
- 100 GB bandwidth/month
- Edge Network (CDN)
- Serverless Functions

Perfect for personal dashboards! 🎉

## Next Steps

After deployment:
1. Bookmark your dashboard URL
2. Set up auto-sync (cron/scheduled task)
3. Share with friends (if desired)
4. Customize colors/layout to your preference

---

Happy trading! 📈🚀
