export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 10;

const BOT_API = process.env.BOT_API_URL || 'https://btc-scalper-api.loca.lt';
const BOT_API_KEY = process.env.BOT_API_KEY || '94e355f69fe2a76fcc0faf239d2fdc46fa61de6d5cfe1249';
const GITHUB_SNAPSHOT_URL = 'https://raw.githubusercontent.com/peytoncampbell/btc-dashboard/master/public/data/snapshot.json';

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${BOT_API_KEY}`,
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'BTC-Dashboard/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function loadSnapshot(): Promise<any> {
  // Try local file first (works during build / local dev)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const snapPath = path.join(process.cwd(), 'public', 'data', 'snapshot.json');
    const raw = fs.readFileSync(snapPath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && data.performance) return data;
  } catch {}

  // Fetch from GitHub raw (public repo, no token needed)
  try {
    const res = await fetch(GITHUB_SNAPSHOT_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BTC-Dashboard/1.0' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return null;
}

function buildResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function buildFromSnapshot(snapshot: any, range: string) {
  const rangeData = snapshot.ranges?.[range] || snapshot.ranges?.['all'] || {};
  return {
    btc_price: snapshot.live_signal?.btc_price || 0,
    last_updated: snapshot.generated_at || new Date().toISOString(),
    _source: 'snapshot',
    performance: snapshot.performance || { balance: 100, total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 },
    live_signal: snapshot.live_signal || null,
    strategy_rankings: rangeData.strategy_rankings || snapshot.strategy_rankings || [],
    recent_trades: snapshot.recent_trades || [],
    hourly_stats: rangeData.hourly_stats || {},
    regime_breakdown: rangeData.regime_breakdown || {},
    current_regime: snapshot.current_regime || { volatility: 'unknown', market: 'unknown' },
    near_misses: snapshot.near_misses || [],
    data_quality: snapshot.data_quality || { total_trades: snapshot.performance?.total_trades || 0, last_export: snapshot.generated_at },
    drawdown: rangeData.drawdown || { cumulative_pnl: [], max_drawdown: 0 },
    edge_analysis: snapshot.edge_analysis || {},
    minute_stats: {},
    daily_pnl: [],
    gate_status: snapshot.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
    gate_stats: { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
    funding_rate: snapshot.funding_rate || null,
    orderbook_imbalance: 0,
    strategies_config: {},
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';

  // Try live API first with aggressive timeout
  let liveData: any = null;
  let statsData: any = null;
  let nearMissesData: any = null;
  let btcPrice = 0;
  let apiWorked = false;

  try {
    // Race all API calls against a single 4s deadline
    const deadline = new Promise((_, reject) => setTimeout(() => reject(new Error('deadline')), 4000));
    
    const apiResults = await Promise.race([
      Promise.allSettled([
        fetchWithTimeout(`${BOT_API}/api/live`, 3500),
        fetchWithTimeout(`${BOT_API}/api/stats?range=${range}`, 3500),
        fetchWithTimeout(`${BOT_API}/api/near-misses?limit=20`, 3500),
      ]),
      deadline,
    ]) as PromiseSettledResult<Response>[];

    if (Array.isArray(apiResults)) {
      if (apiResults[0]?.status === 'fulfilled' && (apiResults[0] as any).value?.ok) {
        liveData = await (apiResults[0] as any).value.json();
        apiWorked = true;
      }
      if (apiResults[1]?.status === 'fulfilled' && (apiResults[1] as any).value?.ok) {
        statsData = await (apiResults[1] as any).value.json();
        apiWorked = true;
      }
      if (apiResults[2]?.status === 'fulfilled' && (apiResults[2] as any).value?.ok) {
        nearMissesData = await (apiResults[2] as any).value.json();
      }
    }
  } catch {
    // API timed out or failed — fall through to snapshot
  }

  // Get BTC price from CoinGecko (fast, reliable)
  try {
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      cache: 'no-store',
    });
    if (priceRes.ok) {
      const priceData = await priceRes.json();
      btcPrice = priceData.bitcoin?.usd || 0;
    }
  } catch {}

  // If API didn't work, use snapshot
  if (!apiWorked) {
    const snapshot = await loadSnapshot();
    if (snapshot) {
      const data = buildFromSnapshot(snapshot, range);
      if (btcPrice) data.btc_price = btcPrice;
      return buildResponse(data);
    }
    // No snapshot either — return minimal
    return buildResponse({
      error: 'No data available',
      btc_price: btcPrice,
      last_updated: new Date().toISOString(),
      performance: { balance: 100, total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 },
      live_signal: null,
      strategy_rankings: [],
      recent_trades: [],
      hourly_stats: {},
      regime_breakdown: {},
      current_regime: { volatility: 'unknown', market: 'unknown' },
      near_misses: [],
      data_quality: { total_trades: 0, last_export: new Date().toISOString() },
      drawdown: { cumulative_pnl: [], max_drawdown: 0 },
      edge_analysis: {},
      minute_stats: {},
      daily_pnl: [],
      gate_status: { atr_pct: 0, threshold: 0.15, is_open: true },
      gate_stats: { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
      funding_rate: null,
      orderbook_imbalance: 0,
      strategies_config: {},
    });
  }

  // API worked — build full response
  if (!btcPrice && liveData?.signal?.btc_price) {
    btcPrice = liveData.signal.btc_price;
  }

  const rawPerformance = liveData?.performance || { balance: 100, total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_streak: 0, best_streak: 0, today_pnl: 0, initial_balance: 100 };
  const initialBalance = rawPerformance.initial_balance ?? 100;
  const totalPnl = rawPerformance.total_pnl ?? 0;
  const performance = { ...rawPerformance, initial_balance: initialBalance, balance: rawPerformance.balance ?? (initialBalance + totalPnl) };

  const recentTrades = liveData?.recent_trades || [];
  const strategyRankings = statsData?.strategy_rankings || liveData?.rankings || [];
  const completed = recentTrades.filter((t: any) => t.result === 'WIN' || t.result === 'LOSS');

  // Edge analysis
  let edgeBuckets = liveData?.edge_analysis || statsData?.edge_analysis;
  if (!edgeBuckets) {
    edgeBuckets = { '0-5¢': { wins: 0, total: 0 }, '5-10¢': { wins: 0, total: 0 }, '10-15¢': { wins: 0, total: 0 }, '15¢+': { wins: 0, total: 0 } };
    for (const t of completed) {
      const edge = Math.abs((t.buy_price || 0) - 0.5);
      const bucket = edge < 0.05 ? '0-5¢' : edge < 0.10 ? '5-10¢' : edge < 0.15 ? '10-15¢' : '15¢+';
      edgeBuckets[bucket].total++;
      if (t.result === 'WIN') edgeBuckets[bucket].wins++;
    }
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

  // Daily P&L
  const dailyMap: Record<string, number> = {};
  for (const t of completed) {
    const d = new Date(String(t.timestamp)).toLocaleDateString();
    dailyMap[d] = (dailyMap[d] || 0) + (Number(t.profit) || 0);
  }
  const dailyPnl = Object.entries(dailyMap).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-7).map(([date, pnl]) => ({ date, pnl }));

  return buildResponse({
    btc_price: btcPrice,
    last_updated: new Date().toISOString(),
    performance,
    live_signal: liveData?.signal || null,
    strategy_rankings: strategyRankings,
    recent_trades: recentTrades.slice(0, 20),
    hourly_stats: statsData?.hourly_stats || {},
    regime_breakdown: statsData?.regime_breakdown || {},
    current_regime: liveData?.current_regime || { volatility: 'unknown', market: 'unknown' },
    near_misses: nearMissesData?.near_misses || liveData?.near_misses_recent || [],
    data_quality: liveData?.data_quality || { total_trades: recentTrades.length, last_export: new Date().toISOString() },
    drawdown: statsData?.drawdown || { cumulative_pnl: [], max_drawdown: 0 },
    edge_analysis: edgeBuckets,
    minute_stats: minuteStats,
    daily_pnl: dailyPnl,
    gate_status: liveData?.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
    gate_stats: liveData?.gate_stats || { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
    funding_rate: liveData?.funding_rate || null,
    orderbook_imbalance: liveData?.orderbook_imbalance || 0,
    strategies_config: liveData?.strategies_config || {},
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
