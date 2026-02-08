import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GITHUB_RAW = 'https://raw.githubusercontent.com/peytoncampbell/btc-dashboard/master/data';

async function fetchGitHub(filename: string) {
  try {
    const res = await fetch(`${GITHUB_RAW}/${filename}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function readLocal(filename: string) {
  try {
    const raw = readFileSync(join(process.cwd(), 'data', filename), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readJSON(filename: string) {
  // Try GitHub first (always latest), fall back to local build files
  const gh = await fetchGitHub(filename);
  if (gh) return gh;
  return readLocal(filename);
}

export async function GET() {
  const trades = (await readJSON('trades.json')) || { balance: 100, initial_balance: 100, trades: [] };
  const liveSignal = await readJSON('live_signal.json');
  const strategyRankings = (await readJSON('strategy_rankings.json')) || [];

  // Fetch live BTC price
  let btcPrice = 0;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      cache: 'no-store',
    });
    const priceData = await res.json();
    btcPrice = priceData.bitcoin?.usd || 0;
  } catch {
    btcPrice = 0;
  }

  // Also fetch live Polymarket data for current window
  let polyData = null;
  try {
    const now = new Date();
    const minute = Math.floor(now.getUTCMinutes() / 15) * 15;
    const windowStart = new Date(now);
    windowStart.setUTCMinutes(minute, 0, 0);
    const ts = Math.floor(windowStart.getTime() / 1000);
    const slug = `btc-updown-15m-${ts}`;
    const polyRes = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}`, {
      cache: 'no-store',
    });
    const markets = await polyRes.json();
    if (markets && markets.length > 0) {
      const m = markets[0];
      const prices = m.outcomePrices ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices) : null;
      polyData = {
        yes_price: prices ? parseFloat(prices[0]) : 0.5,
        no_price: prices ? parseFloat(prices[1]) : 0.5,
        liquidity: parseFloat(m.liquidity || '0'),
        volume: parseFloat(m.volume || '0'),
        question: m.question,
        window_ts: ts,
      };
    }
  } catch {
    // ignore
  }

  // Compute performance from trades
  const allTrades = trades.trades || [];
  const completed = allTrades.filter((t: { result: string }) => t.result !== 'PENDING');
  const wins = completed.filter((t: { result: string }) => t.result === 'WIN').length;
  const losses = completed.filter((t: { result: string }) => t.result === 'LOSS').length;
  const totalPnl = completed.reduce((s: number, t: { profit: number }) => s + t.profit, 0);
  const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

  // Streak
  let currentStreak = 0;
  let bestStreak = 0;
  const sorted = [...completed].sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let temp = 0;
  for (const t of sorted) {
    if ((t as { result: string }).result === 'WIN') {
      temp = temp >= 0 ? temp + 1 : 1;
    } else {
      temp = temp <= 0 ? temp - 1 : -1;
    }
    if (temp > bestStreak) bestStreak = temp;
  }
  currentStreak = temp;

  // Today's P&L
  const today = new Date().toDateString();
  const todayPnl = completed
    .filter((t: { timestamp: string }) => new Date(t.timestamp).toDateString() === today)
    .reduce((s: number, t: { profit: number }) => s + t.profit, 0);

  // Daily P&L for chart
  const dailyMap: Record<string, number> = {};
  for (const t of completed) {
    const d = new Date((t as { timestamp: string }).timestamp).toLocaleDateString();
    dailyMap[d] = (dailyMap[d] || 0) + (t as { profit: number }).profit;
  }
  const dailyPnl = Object.entries(dailyMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-7)
    .map(([date, pnl]) => ({ date, pnl }));

  // Edge analysis from trades
  const edgeBuckets: Record<string, { wins: number; total: number }> = {
    '0-5¢': { wins: 0, total: 0 },
    '5-10¢': { wins: 0, total: 0 },
    '10-15¢': { wins: 0, total: 0 },
    '15¢+': { wins: 0, total: 0 },
  };
  for (const t of completed) {
    const edge = (t as { edge?: number }).edge || 0;
    let bucket: string;
    if (edge < 0.05) bucket = '0-5¢';
    else if (edge < 0.10) bucket = '5-10¢';
    else if (edge < 0.15) bucket = '10-15¢';
    else bucket = '15¢+';
    edgeBuckets[bucket].total++;
    if ((t as { result: string }).result === 'WIN') edgeBuckets[bucket].wins++;
  }

  // Win rate by entry minute
  const minuteStats: Record<number, { wins: number; total: number }> = {};
  for (const t of completed) {
    const min = (t as { entry_minute?: number }).entry_minute;
    if (min !== undefined && min !== null) {
      if (!minuteStats[min]) minuteStats[min] = { wins: 0, total: 0 };
      minuteStats[min].total++;
      if ((t as { result: string }).result === 'WIN') minuteStats[min].wins++;
    }
  }

  // Per-strategy live performance
  const stratPerf: Record<string, { wins: number; losses: number; pnl: number }> = {};
  for (const t of completed) {
    const indicators = (t as { indicators?: Record<string, string> }).indicators || {};
    const result = (t as { result: string }).result;
    const direction = (t as { direction: string }).direction;
    for (const [stratName, stratDir] of Object.entries(indicators)) {
      if (!stratPerf[stratName]) stratPerf[stratName] = { wins: 0, losses: 0, pnl: 0 };
      if (stratDir === direction) {
        if (result === 'WIN') {
          stratPerf[stratName].wins++;
          stratPerf[stratName].pnl += (t as { profit: number }).profit;
        } else {
          stratPerf[stratName].losses++;
          stratPerf[stratName].pnl -= (t as { buy_price_cents?: number }).buy_price_cents
            ? (t as { buy_price_cents: number }).buy_price_cents / 100
            : 0.5;
        }
      }
    }
  }

  const enrichedRankings = (strategyRankings as Array<Record<string, unknown>>).map((s) => {
    const name = s.name as string;
    const perf = stratPerf[name];
    const liveTrades = perf ? perf.wins + perf.losses : 0;
    const liveWR = liveTrades > 0 ? (perf!.wins / liveTrades) * 100 : 0;
    return {
      ...s,
      live_trades: liveTrades,
      live_win_rate: liveWR,
      live_pnl: perf ? perf.pnl : 0,
      live_wins: perf ? perf.wins : 0,
      live_losses: perf ? perf.losses : 0,
    };
  });

  const recentTrades = [...allTrades]
    .sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  // Merge live polymarket data into signal if available
  const enrichedSignal = liveSignal ? {
    ...liveSignal,
    ...(polyData ? {
      polymarket_live: polyData,
      market: {
        yes_price: polyData.yes_price,
        no_price: polyData.no_price,
      },
    } : {}),
  } : (polyData ? {
    polymarket_live: polyData,
    market: {
      yes_price: polyData.yes_price,
      no_price: polyData.no_price,
    },
    action: 'WAITING',
  } : null);

  const response = {
    btc_price: btcPrice,
    last_updated: new Date().toISOString(),
    performance: {
      balance: trades.balance || 100,
      initial_balance: trades.initial_balance || 100,
      total_pnl: totalPnl,
      today_pnl: todayPnl,
      total_trades: completed.length,
      wins,
      losses,
      win_rate: winRate,
      current_streak: currentStreak,
      best_streak: bestStreak,
    },
    live_signal: enrichedSignal,
    strategy_rankings: enrichedRankings,
    recent_trades: recentTrades,
    edge_analysis: edgeBuckets,
    minute_stats: minuteStats,
    daily_pnl: dailyPnl,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
