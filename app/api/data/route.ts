import tradesData from '@/data/trades.json';

export const dynamic = 'force-dynamic';

interface Trade {
  id: string;
  timestamp: string;
  strategy: string;
  direction: "UP" | "DOWN";
  confidence: number;
  entry_price: number;
  exit_price: number | null;
  result: "WIN" | "LOSS" | "PENDING";
  profit: number;
  indicators: Record<string, number>;
  window_start: string;
  window_end: string;
}

interface TradeData {
  balance: number;
  initial_balance: number;
  strategies: string[];
  active_strategy: string;
  trades: Trade[];
}

function computeMetrics(data: TradeData, strategyFilter: string | null) {
  const trades = strategyFilter && strategyFilter !== 'all'
    ? data.trades.filter(t => t.strategy === strategyFilter)
    : data.trades;

  const completedTrades = trades.filter(t => t.result !== 'PENDING');
  const wins = completedTrades.filter(t => t.result === 'WIN').length;
  const losses = completedTrades.filter(t => t.result === 'LOSS').length;
  const totalPredictions = completedTrades.length;
  const winRate = totalPredictions > 0 ? (wins / totalPredictions) * 100 : 0;
  const totalPnl = completedTrades.reduce((sum, t) => sum + t.profit, 0);

  // Streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let tempStreak = 0;
  const sorted = [...completedTrades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (const t of sorted) {
    if (t.result === 'WIN') {
      tempStreak = tempStreak >= 0 ? tempStreak + 1 : 1;
    } else {
      tempStreak = tempStreak <= 0 ? tempStreak - 1 : -1;
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    if (tempStreak < worstStreak) worstStreak = tempStreak;
  }
  currentStreak = tempStreak;

  // Today's P&L
  const today = new Date().toDateString();
  const todaysPnl = completedTrades
    .filter(t => new Date(t.timestamp).toDateString() === today)
    .reduce((sum, t) => sum + t.profit, 0);

  // Current prediction (latest trade)
  const latestTrade = trades.length > 0 ? trades[trades.length - 1] : null;

  // Indicator weights from latest trade
  const weights = latestTrade?.indicators || {
    rsi_1m: 0.1, rsi_5m: 0.1, macd: 0.1, bollinger: 0.1, vwap: 0.1,
    volume: 0.1, momentum_5m: 0.1, momentum_15m: 0.1, ema_trend: 0.1,
    order_book: 0.05, news_sentiment: 0.05
  };

  // Map trades to dashboard format
  const dashboardTrades = [...trades]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map(t => ({
      id: t.id,
      timestamp: t.timestamp,
      prediction: t.direction,
      confidence: Math.round(t.confidence * 100),
      bet_amount: Math.abs(t.profit) || 0,
      status: t.result === 'WIN' ? 'won' : t.result === 'LOSS' ? 'lost' : 'open',
      pnl: t.profit,
      strategy: t.strategy,
    }));

  // Current prediction in dashboard format
  const currentPrediction = latestTrade && latestTrade.result === 'PENDING' ? {
    prediction: latestTrade.direction,
    confidence: Math.round(latestTrade.confidence * 100),
    edge: latestTrade.confidence - 0.5,
    bet_amount: 0,
    market_price_up: 0.5,
    market_price_down: 0.5,
    potential_payout: 0,
    time_to_resolution: latestTrade.window_end
      ? Math.max(0, Math.floor((new Date(latestTrade.window_end).getTime() - Date.now()) / 1000))
      : 300,
  } : null;

  // Strategy comparison
  const strategyStats: Record<string, { wins: number; total: number; pnl: number }> = {};
  for (const t of data.trades.filter(t => t.result !== 'PENDING')) {
    if (!strategyStats[t.strategy]) strategyStats[t.strategy] = { wins: 0, total: 0, pnl: 0 };
    strategyStats[t.strategy].total++;
    if (t.result === 'WIN') strategyStats[t.strategy].wins++;
    strategyStats[t.strategy].pnl += t.profit;
  }

  return {
    performance: {
      total_predictions: totalPredictions,
      correct: wins,
      wrong: losses,
      win_rate: winRate,
      current_streak: currentStreak,
      best_streak: bestStreak,
      worst_streak: worstStreak,
      total_pnl: totalPnl,
      starting_balance: data.initial_balance,
      current_balance: data.balance,
    },
    weights,
    current_prediction: currentPrediction,
    trades: dashboardTrades,
    strategies: data.strategies,
    active_strategy: strategyFilter || data.active_strategy,
    strategy_stats: strategyStats,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const strategy = searchParams.get('strategy');

  // Fetch live BTC price
  let btcPrice = 0;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      next: { revalidate: 30 },
    });
    const priceData = await res.json();
    btcPrice = priceData.bitcoin?.usd || 0;
  } catch {
    btcPrice = 0;
  }

  const data = tradesData as unknown as TradeData;
  const metrics = computeMetrics(data, strategy);

  const response = {
    btc_price: btcPrice,
    last_updated: new Date().toISOString(),
    ...metrics,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
