export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Database from 'better-sqlite3';

const DB_PATH = 'C:\\Users\\campb\\.openclaw\\workspace\\skills\\polymarket-trader\\data\\trades.db';
const BOT_API = 'https://desktop-5ghsjh6.tail05872a.ts.net';
const BOT_API_KEY = process.env.BOT_API_KEY || '94e355f69fe2a76fcc0faf239d2fdc46fa61de6d5cfe1249';

interface QueryParams {
  range?: string;
  include?: string;
}

function parseDateRange(range: string = '7d'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case 'all':
    default:
      start.setFullYear(2020);
      break;
  }
  
  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';
  const include = searchParams.get('include')?.split(',') || [];
  
  const { start, end } = parseDateRange(range);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  let db: Database.Database | null = null;
  let liveSignal: Record<string, unknown> | null = null;
  let gateStatus: Record<string, unknown> | null = null;
  let gateStats: Record<string, unknown> | null = null;
  let fundingRate: Record<string, unknown> | null = null;
  let obImbalance = 0;
  let strategiesConfig: Record<string, number> = {};

  try {
    // Try to fetch live signal data from bot API (Tailscale)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${BOT_API}/api/live`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${BOT_API_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const botData = await res.json();
        liveSignal = botData.signal || null;
        gateStatus = botData.gate_status || null;
        gateStats = botData.gate_stats || null;
        fundingRate = botData.funding_rate || null;
        obImbalance = botData.orderbook_imbalance || 0;
        strategiesConfig = botData.strategies_config || {};
      }
    } catch (err) {
      console.error('Bot API fetch error (using DB only):', err);
    }

    // Open SQLite database
    db = new Database(DB_PATH, { readonly: true });

    // Fetch all trades in range
    const trades = db.prepare(`
      SELECT * FROM trades
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `).all(startStr, endStr) as any[];

    // Compute performance metrics
    const completed = trades.filter((t) => t.result !== 'PENDING');
    const wins = completed.filter((t) => t.result === 'WIN').length;
    const losses = completed.filter((t) => t.result === 'LOSS').length;
    const totalPnl = completed.reduce((s: number, t) => s + (t.profit || 0), 0);
    const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

    // Current balance (from most recent trade)
    const lastTrade = db.prepare('SELECT balance_after FROM trades WHERE balance_after IS NOT NULL ORDER BY timestamp DESC LIMIT 1').get() as any;
    const balance = lastTrade?.balance_after || 100;

    // Initial balance (assumed)
    const initialBalance = 100;

    // Today's P&L
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayPnl = completed
      .filter((t) => new Date(t.timestamp) >= todayStart)
      .reduce((s: number, t) => s + (t.profit || 0), 0);

    // Streak calculation
    let currentStreak = 0;
    let bestStreak = 0;
    const sorted = [...completed].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let temp = 0;
    for (const t of sorted) {
      if (t.result === 'WIN') {
        temp = temp >= 0 ? temp + 1 : 1;
      } else {
        temp = temp <= 0 ? temp - 1 : -1;
      }
      if (temp > bestStreak) bestStreak = temp;
    }
    currentStreak = temp;

    // Daily P&L (last 7 days)
    const dailyMap: Record<string, number> = {};
    for (const t of completed) {
      const d = new Date(String(t.timestamp)).toLocaleDateString();
      dailyMap[d] = (dailyMap[d] || 0) + (Number(t.profit) || 0);
    }
    const dailyPnl = Object.entries(dailyMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([date, pnl]) => ({ date, pnl }));

    // Edge analysis
    const edgeBuckets: Record<string, { wins: number; total: number }> = {
      '0-5¢': { wins: 0, total: 0 },
      '5-10¢': { wins: 0, total: 0 },
      '10-15¢': { wins: 0, total: 0 },
      '15¢+': { wins: 0, total: 0 },
    };
    for (const t of completed) {
      const edge = Math.abs((t.buy_price || 0) - 0.5);
      const bucket = edge < 0.05 ? '0-5¢' : edge < 0.10 ? '5-10¢' : edge < 0.15 ? '10-15¢' : '15¢+';
      edgeBuckets[bucket].total++;
      if (t.result === 'WIN') edgeBuckets[bucket].wins++;
    }

    // Minute stats
    const minuteStats: Record<number, { wins: number; total: number }> = {};
    for (const t of completed) {
      const min = t.entry_minute;
      if (min != null) {
        if (!minuteStats[min]) minuteStats[min] = { wins: 0, total: 0 };
        minuteStats[min].total++;
        if (t.result === 'WIN') minuteStats[min].wins++;
      }
    }

    // Hourly stats (24x7 grid for heatmap)
    const hourlyStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    for (const t of completed) {
      const d = new Date(String(t.timestamp));
      const hour = d.getUTCHours();
      const dow = d.getUTCDay();
      const key = `${dow}-${hour}`;
      if (!hourlyStats[key]) hourlyStats[key] = { wins: 0, losses: 0, pnl: 0 };
      hourlyStats[key].pnl += Number(t.profit) || 0;
      if (t.result === 'WIN') hourlyStats[key].wins++;
      else hourlyStats[key].losses++;
    }

    // Strategy performance (from shadow_signals)
    const strategyPerf: Record<string, { wins: number; losses: number; pnl: number; trades: number }> = {};
    for (const t of completed) {
      try {
        const signals = JSON.parse(String(t.shadow_signals || '{}'));
        for (const [name, sig] of Object.entries(signals as Record<string, any>)) {
          if (!strategyPerf[name]) strategyPerf[name] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
          if (sig.dir === t.direction) {
            strategyPerf[name].trades++;
            strategyPerf[name].pnl += Number(t.profit) || 0;
            if (t.result === 'WIN') strategyPerf[name].wins++;
            else strategyPerf[name].losses++;
          }
        }
      } catch { /* ignore */ }
    }

    const strategyRankings = Object.entries(strategyPerf).map(([name, stats]) => ({
      name,
      live_trades: stats.trades,
      live_win_rate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      live_pnl: stats.pnl,
      live_wins: stats.wins,
      live_losses: stats.losses,
    })).sort((a, b) => b.live_pnl - a.live_pnl);

    // Regime breakdown (strategy WR by market regime)
    const regimeBreakdown: Record<string, Record<string, { wins: number; total: number }>> = {};
    for (const t of completed) {
      const regime = String(t.market_regime || 'unknown');
      const strat = String(t.strategy || 'Unknown');
      if (!regimeBreakdown[strat]) regimeBreakdown[strat] = {};
      if (!regimeBreakdown[strat][regime]) regimeBreakdown[strat][regime] = { wins: 0, total: 0 };
      regimeBreakdown[strat][regime].total++;
      if (t.result === 'WIN') regimeBreakdown[strat][regime].wins++;
    }

    // Data quality metrics
    const dataQuality = {
      total_trades: trades.length,
      trades_with_volatility_regime: trades.filter((t) => t.volatility_regime != null).length,
      trades_with_market_regime: trades.filter((t) => t.market_regime != null).length,
      trades_with_orderbook_data: trades.filter((t) => t.orderbook_imbalance != null).length,
      near_miss_count: 0,
      last_export: new Date().toISOString(),
    };

    // Near misses (if requested)
    let nearMisses: any[] = [];
    if (include.includes('near_misses')) {
      nearMisses = db.prepare(`
        SELECT * FROM near_misses
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
        LIMIT 50
      `).all(startStr, endStr) as any[];
      dataQuality.near_miss_count = nearMisses.length;
    }

    // Drawdown data (cumulative P&L over time)
    const cumulativePnl: Array<{ timestamp: string; pnl: number }> = [];
    let runningPnl = 0;
    for (const t of sorted) {
      runningPnl += Number(t.profit) || 0;
      cumulativePnl.push({ timestamp: String(t.timestamp), pnl: runningPnl });
    }
    const maxDrawdown = calculateMaxDrawdown(cumulativePnl.map(p => p.pnl));

    // Current regime (from most recent trade)
    const recentTrade = trades[0];
    const currentRegime = {
      volatility: String(recentTrade?.volatility_regime || 'unknown'),
      market: String(recentTrade?.market_regime || 'unknown'),
      volume: getVolumeRegime(Number(recentTrade?.btc_volume_1m) || 0),
    };

    // Fetch live BTC price
    let btcPrice = 0;
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { cache: 'no-store' });
      const priceData = await res.json();
      btcPrice = priceData.bitcoin?.usd || 0;
    } catch {
      btcPrice = liveSignal ? Number(liveSignal.btc_price) || 0 : 0;
    }

    // Return comprehensive data
    return new Response(JSON.stringify({
      btc_price: btcPrice,
      last_updated: new Date().toISOString(),
      performance: {
        balance,
        initial_balance: initialBalance,
        total_pnl: totalPnl,
        today_pnl: todayPnl,
        total_trades: completed.length,
        wins,
        losses,
        win_rate: winRate,
        current_streak: currentStreak,
        best_streak: bestStreak,
      },
      live_signal: liveSignal,
      strategy_rankings: strategyRankings,
      recent_trades: trades.slice(0, 20),
      edge_analysis: edgeBuckets,
      minute_stats: minuteStats,
      hourly_stats: hourlyStats,
      daily_pnl: dailyPnl,
      gate_status: gateStatus || { atr_pct: 0, threshold: 0.15, is_open: true },
      gate_stats: gateStats || { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
      funding_rate: fundingRate,
      orderbook_imbalance: obImbalance,
      strategies_config: strategiesConfig,
      regime_breakdown: regimeBreakdown,
      current_regime: currentRegime,
      near_misses: nearMisses,
      data_quality: dataQuality,
      drawdown: {
        cumulative_pnl: cumulativePnl,
        max_drawdown: maxDrawdown,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (db) db.close();
  }
}

function calculateMaxDrawdown(pnls: number[]): number {
  let maxDrawdown = 0;
  let peak = -Infinity;
  for (const pnl of pnls) {
    if (pnl > peak) peak = pnl;
    const drawdown = peak - pnl;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}

function getVolumeRegime(volume: number): string {
  if (volume < 0.001) return 'quiet';
  if (volume < 0.01) return 'normal';
  if (volume < 0.1) return 'active';
  return 'surge';
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
