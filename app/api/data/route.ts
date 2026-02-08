export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BOT_API = 'https://desktop-5ghsjh6.tail05872a.ts.net';
const BOT_API_KEY = process.env.BOT_API_KEY || '94e355f69fe2a76fcc0faf239d2fdc46fa61de6d5cfe1249';

export async function GET() {
  // Fetch all live data from the bot's data server
  let botData: {
    trades: { balance: number; initial_balance?: number; trades: Array<Record<string, unknown>> };
    signal: Record<string, unknown> | null;
    rankings: Array<Record<string, unknown>>;
    gate_status?: { atr_pct: number; threshold: number; is_open: boolean };
    gate_stats?: { windows_checked: number; windows_traded: number; windows_skipped: number; windows_passed_gate: number };
    funding_rate?: { direction: string; confidence: number } | null;
    orderbook_imbalance?: number;
    strategies_config?: Record<string, number>;
  } | null = null;

  // Try Tailscale funnel first, fall back to local data files
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BOT_API}/api/live`, { 
      cache: 'no-store', 
      headers: { 'Authorization': `Bearer ${BOT_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      botData = await res.json();
    } else {
      console.error(`Bot API returned ${res.status}`);
    }
  } catch (err) {
    console.error('Bot API fetch error (will use local files):', err);
  }

  // Fallback: read from local data files (pushed via git)
  if (!botData) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      const [tradesRaw, signalRaw] = await Promise.all([
        fs.readFile(path.join(dataDir, 'trades.json'), 'utf-8').catch(() => '{}'),
        fs.readFile(path.join(dataDir, 'live_signal.json'), 'utf-8').catch(() => 'null'),
      ]);
      const localTrades = JSON.parse(tradesRaw);
      const localSignal = JSON.parse(signalRaw);
      if (localTrades.trades) {
        botData = {
          trades: localTrades,
          signal: localSignal,
          rankings: [],
        };
      }
    } catch (fsErr) {
      console.error('Local file fallback error:', fsErr);
    }
  }

  const trades = botData?.trades || { balance: 100, initial_balance: 100, trades: [] };
  const liveSignal = botData?.signal || null;
  const strategyRankings = botData?.rankings || [];

  // Fetch live BTC price
  let btcPrice = 0;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { cache: 'no-store' });
    const priceData = await res.json();
    btcPrice = priceData.bitcoin?.usd || 0;
  } catch {
    btcPrice = liveSignal ? Number((liveSignal as Record<string, unknown>).btc_price) || 0 : 0;
  }

  // Fetch live Polymarket prices for current window
  let polyData: { yes_price: number; no_price: number; liquidity: number; volume: number; question: string } | null = null;
  try {
    const now = new Date();
    const minute = Math.floor(now.getUTCMinutes() / 15) * 15;
    const ws = new Date(now);
    ws.setUTCMinutes(minute, 0, 0);
    const ts = Math.floor(ws.getTime() / 1000);
    const polyRes = await fetch(`https://gamma-api.polymarket.com/markets?slug=btc-updown-15m-${ts}`, { cache: 'no-store' });
    const markets = await polyRes.json();
    if (markets?.length > 0) {
      const m = markets[0];
      const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
      polyData = {
        yes_price: parseFloat(prices?.[0] || '0.5'),
        no_price: parseFloat(prices?.[1] || '0.5'),
        liquidity: parseFloat(m.liquidity || '0'),
        volume: parseFloat(m.volume || '0'),
        question: m.question || '',
      };
    }
  } catch { /* ignore */ }

  // Compute performance
  const allTrades = trades.trades || [];
  const completed = allTrades.filter((t: Record<string, unknown>) => t.result !== 'PENDING');
  const wins = completed.filter((t: Record<string, unknown>) => t.result === 'WIN').length;
  const losses = completed.filter((t: Record<string, unknown>) => t.result === 'LOSS').length;
  const totalPnl = completed.reduce((s: number, t: Record<string, unknown>) => s + Number(t.profit || 0), 0);
  const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

  // Streak
  let currentStreak = 0;
  let bestStreak = 0;
  const sorted = [...completed].sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
    new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime()
  );
  let temp = 0;
  for (const t of sorted) {
    if (t.result === 'WIN') { temp = temp >= 0 ? temp + 1 : 1; }
    else { temp = temp <= 0 ? temp - 1 : -1; }
    if (temp > bestStreak) bestStreak = temp;
  }
  currentStreak = temp;

  // Today's P&L
  const today = new Date().toDateString();
  const todayPnl = completed
    .filter((t: Record<string, unknown>) => new Date(String(t.timestamp)).toDateString() === today)
    .reduce((s: number, t: Record<string, unknown>) => s + Number(t.profit || 0), 0);

  // Daily P&L
  const dailyMap: Record<string, number> = {};
  for (const t of completed) {
    const d = new Date(String(t.timestamp)).toLocaleDateString();
    dailyMap[d] = (dailyMap[d] || 0) + Number(t.profit || 0);
  }
  const dailyPnl = Object.entries(dailyMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-7)
    .map(([date, pnl]) => ({ date, pnl }));

  // Edge analysis
  const edgeBuckets: Record<string, { wins: number; total: number }> = {
    '0-5¢': { wins: 0, total: 0 }, '5-10¢': { wins: 0, total: 0 },
    '10-15¢': { wins: 0, total: 0 }, '15¢+': { wins: 0, total: 0 },
  };
  for (const t of completed) {
    const edge = Number(t.edge || 0);
    const bucket = edge < 0.05 ? '0-5¢' : edge < 0.10 ? '5-10¢' : edge < 0.15 ? '10-15¢' : '15¢+';
    edgeBuckets[bucket].total++;
    if (t.result === 'WIN') edgeBuckets[bucket].wins++;
  }

  // Minute stats
  const minuteStats: Record<number, { wins: number; total: number }> = {};
  for (const t of completed) {
    const min = Number(t.entry_minute);
    if (!isNaN(min)) {
      if (!minuteStats[min]) minuteStats[min] = { wins: 0, total: 0 };
      minuteStats[min].total++;
      if (t.result === 'WIN') minuteStats[min].wins++;
    }
  }

  // Per-strategy live performance
  const stratPerf: Record<string, { wins: number; losses: number; pnl: number }> = {};
  for (const t of completed) {
    const indicators = (t.indicators || {}) as Record<string, string>;
    const direction = String(t.direction);
    for (const [name, dir] of Object.entries(indicators)) {
      if (!stratPerf[name]) stratPerf[name] = { wins: 0, losses: 0, pnl: 0 };
      if (dir === direction) {
        if (t.result === 'WIN') {
          stratPerf[name].wins++;
          stratPerf[name].pnl += Number(t.profit || 0);
        } else {
          stratPerf[name].losses++;
          stratPerf[name].pnl += Number(t.profit || 0);
        }
      }
    }
  }

  const enrichedRankings = strategyRankings.map((s: Record<string, unknown>) => {
    const name = String(s.name);
    const perf = stratPerf[name];
    const lt = perf ? perf.wins + perf.losses : 0;
    return {
      ...s,
      live_trades: lt,
      live_win_rate: lt > 0 ? (perf!.wins / lt) * 100 : 0,
      live_pnl: perf ? perf.pnl : 0,
      live_wins: perf ? perf.wins : 0,
      live_losses: perf ? perf.losses : 0,
    };
  });

  // Merge live polymarket into signal
  const enrichedSignal = liveSignal ? {
    ...liveSignal,
    ...(polyData ? { market: { yes_price: polyData.yes_price, no_price: polyData.no_price } } : {}),
  } : (polyData ? { market: { yes_price: polyData.yes_price, no_price: polyData.no_price }, action: 'WAITING' } : null);

  const recentTrades = [...allTrades]
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime()
    )
    .slice(0, 20);

  return new Response(JSON.stringify({
    btc_price: btcPrice,
    last_updated: new Date().toISOString(),
    performance: {
      balance: trades.balance || 100,
      initial_balance: trades.initial_balance || 100,
      total_pnl: totalPnl, today_pnl: todayPnl,
      total_trades: completed.length, wins, losses,
      win_rate: winRate, current_streak: currentStreak, best_streak: bestStreak,
    },
    live_signal: enrichedSignal,
    strategy_rankings: enrichedRankings,
    recent_trades: recentTrades,
    edge_analysis: edgeBuckets,
    minute_stats: minuteStats,
    daily_pnl: dailyPnl,
    gate_status: botData?.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
    gate_stats: botData?.gate_stats || { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
    funding_rate: botData?.funding_rate || null,
    orderbook_imbalance: botData?.orderbook_imbalance || 0,
    strategies_config: botData?.strategies_config || {},
  }), {
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
