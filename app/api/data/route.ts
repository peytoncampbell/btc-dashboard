export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BOT_API = 'https://desktop-5ghsjh6.tail05872a.ts.net';
const BOT_API_KEY = process.env.BOT_API_KEY || '94e355f69fe2a76fcc0faf239d2fdc46fa61de6d5cfe1249';

interface QueryParams {
  range?: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Authorization': `Bearer ${BOT_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';

  try {
    // Fetch data from all endpoints in parallel
    const [liveRes, statsRes, nearMissesRes, btcPriceRes] = await Promise.allSettled([
      fetchWithTimeout(`${BOT_API}/api/live`, 5000),
      fetchWithTimeout(`${BOT_API}/api/stats?range=${range}`, 5000),
      fetchWithTimeout(`${BOT_API}/api/near-misses?limit=20`, 5000),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
        cache: 'no-store',
      }),
    ]);

    // Parse responses
    let liveData: any = null;
    let statsData: any = null;
    let nearMissesData: any = null;
    let btcPrice = 0;

    // Live endpoint
    if (liveRes.status === 'fulfilled' && liveRes.value.ok) {
      liveData = await liveRes.value.json();
    }

    // Stats endpoint
    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
      statsData = await statsRes.value.json();
    }

    // Near misses endpoint
    if (nearMissesRes.status === 'fulfilled' && nearMissesRes.value.ok) {
      nearMissesData = await nearMissesRes.value.json();
    }

    // BTC price
    if (btcPriceRes.status === 'fulfilled' && btcPriceRes.value.ok) {
      const priceData = await btcPriceRes.value.json();
      btcPrice = priceData.bitcoin?.usd || 0;
    }

    // Fallback to signal price if CoinGecko fails
    if (!btcPrice && liveData?.signal?.btc_price) {
      btcPrice = liveData.signal.btc_price;
    }

    // Extract data from live endpoint
    const rawPerformance = liveData?.performance || {
      balance: 100,
      total_pnl: 0,
      win_rate: 0,
      total_trades: 0,
      wins: 0,
      losses: 0,
      current_streak: 0,
      best_streak: 0,
      today_pnl: 0,
      initial_balance: 100,
    };
    
    // Compute balance if null: initial_balance + total_pnl
    // Default initial_balance to 100 if not provided
    const initialBalance = rawPerformance.initial_balance ?? 100;
    const totalPnl = rawPerformance.total_pnl ?? 0;
    const computedBalance = rawPerformance.balance ?? (initialBalance + totalPnl);
    
    const performance = {
      ...rawPerformance,
      initial_balance: initialBalance,
      balance: computedBalance,
    };

    const liveSignal = liveData?.signal || null;
    const recentTrades = liveData?.recent_trades || [];
    const currentRegime = liveData?.current_regime || {
      volatility: 'unknown',
      market: 'unknown',
    };
    const gateStatus = liveData?.gate_status || {
      atr_pct: 0,
      threshold: 0.15,
      is_open: true,
    };
    const gateStats = liveData?.gate_stats || {
      windows_checked: 0,
      windows_traded: 0,
      windows_skipped: 0,
      windows_passed_gate: 0,
    };
    const fundingRate = liveData?.funding_rate || null;
    const obImbalance = liveData?.orderbook_imbalance || 0;
    const strategiesConfig = liveData?.strategies_config || {};

    // Extract stats data
    const hourlyStats = statsData?.hourly_stats || {};
    const regimeBreakdown = statsData?.regime_breakdown || {};
    const drawdown = statsData?.drawdown || {
      cumulative_pnl: [],
      max_drawdown: 0,
    };
    const strategyRankings = statsData?.strategy_rankings || liveData?.rankings || [];

    // Near misses
    const nearMisses = nearMissesData?.near_misses || liveData?.near_misses_recent || [];

    // Data quality
    const dataQuality = liveData?.data_quality || {
      total_trades: recentTrades.length,
      trades_with_volatility_regime: 0,
      trades_with_market_regime: 0,
      trades_with_orderbook_data: 0,
      near_miss_count: nearMisses.length,
      last_export: new Date().toISOString(),
    };

    // Use edge analysis from data server (computed from ALL trades)
    // Fallback to computing from recent trades if not provided
    let edgeBuckets = liveData?.edge_analysis || statsData?.edge_analysis;
    
    // Filter completed trades once for both edge analysis and minute stats
    const completed = recentTrades.filter((t: any) => t.result === 'WIN' || t.result === 'LOSS');
    
    if (!edgeBuckets) {
      edgeBuckets = {
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
    }

    // Compute minute stats
    const minuteStats: Record<number, { wins: number; total: number }> = {};
    for (const t of completed) {
      const min = t.entry_minute;
      if (min != null) {
        if (!minuteStats[min]) minuteStats[min] = { wins: 0, total: 0 };
        minuteStats[min].total++;
        if (t.result === 'WIN') minuteStats[min].wins++;
      }
    }

    // Compute daily P&L (last 7 days)
    const dailyMap: Record<string, number> = {};
    for (const t of completed) {
      const d = new Date(String(t.timestamp)).toLocaleDateString();
      dailyMap[d] = (dailyMap[d] || 0) + (Number(t.profit) || 0);
    }
    const dailyPnl = Object.entries(dailyMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([date, pnl]) => ({ date, pnl }));

    // Return comprehensive unified response
    return new Response(JSON.stringify({
      btc_price: btcPrice,
      last_updated: new Date().toISOString(),
      performance,
      live_signal: liveSignal,
      strategy_rankings: strategyRankings,
      recent_trades: recentTrades.slice(0, 20),
      hourly_stats: hourlyStats,
      regime_breakdown: regimeBreakdown,
      current_regime: currentRegime,
      near_misses: nearMisses,
      data_quality: dataQuality,
      drawdown,
      edge_analysis: edgeBuckets,
      minute_stats: minuteStats,
      daily_pnl: dailyPnl,
      gate_status: gateStatus,
      gate_stats: gateStats,
      funding_rate: fundingRate,
      orderbook_imbalance: obImbalance,
      strategies_config: strategiesConfig,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    
    // Return minimal fallback response
    return new Response(JSON.stringify({
      error: 'Failed to fetch data from bot server',
      btc_price: 0,
      last_updated: new Date().toISOString(),
      performance: {
        balance: 100,
        total_pnl: 0,
        win_rate: 0,
        total_trades: 0,
        wins: 0,
        losses: 0,
      },
      live_signal: null,
      strategy_rankings: [],
      recent_trades: [],
      hourly_stats: {},
      regime_breakdown: {},
      current_regime: { volatility: 'unknown', market: 'unknown' },
      near_misses: [],
      data_quality: {
        total_trades: 0,
        trades_with_volatility_regime: 0,
        trades_with_market_regime: 0,
        trades_with_orderbook_data: 0,
        near_miss_count: 0,
        last_export: new Date().toISOString(),
      },
      drawdown: { cumulative_pnl: [], max_drawdown: 0 },
      edge_analysis: {},
      minute_stats: {},
      daily_pnl: [],
      gate_status: { atr_pct: 0, threshold: 0.15, is_open: true },
      gate_stats: {
        windows_checked: 0,
        windows_traded: 0,
        windows_skipped: 0,
        windows_passed_gate: 0,
      },
      funding_rate: null,
      orderbook_imbalance: 0,
      strategies_config: {},
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
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
