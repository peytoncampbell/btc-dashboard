/**
 * Maps a raw snapshot object into the DashboardData shape.
 * Used by both the API route (server-side) and the client fallback.
 */

export interface DashboardData {
  mode?: 'live' | 'paper';
  btc_price: number;
  last_updated: string;
  _source?: string;
  performance: {
    balance: number;
    initial_balance: number;
    total_pnl: number;
    today_pnl: number;
    total_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    current_streak: number;
    best_streak: number;
  };
  live_signal: {
    timestamp?: string | null;
    window_start?: string | null;
    window_end?: string | null;
    btc_price?: number;
    confidence?: number;
    action?: string;
    [key: string]: unknown;
  } | null;
  strategy_rankings: Array<{
    name: string;
    status?: string;
    direction?: string;
    live_trades: number;
    live_win_rate: number;
    live_pnl: number;
    live_wins: number;
    live_losses: number;
    ev?: number;
    sortino?: number;
    max_dd?: number;
    p_dd?: number;
    avg_confidence?: number;
    streak?: number;
  }>;
  recent_trades: Array<{
    id?: string;
    timestamp: string;
    strategy?: string;
    direction?: string;
    price?: number;
    result?: string;
    profit?: number;
    entry_minute?: number;
    buy_price?: number;
    confidence?: number;
  }>;
  edge_analysis: Record<string, { wins: number; total: number }>;
  minute_stats: Record<string, { wins: number; total: number }>;
  hourly_stats: Record<string, { wins: number; losses: number; pnl: number }>;
  daily_pnl: Array<{ date: string; pnl: number }>;
  gate_status: { atr_pct: number; threshold: number; is_open: boolean };
  gate_stats: {
    windows_checked: number;
    windows_traded: number;
    windows_skipped: number;
    windows_passed_gate: number;
  };
  funding_rate: { direction: string; confidence: number } | null;
  orderbook_imbalance: number;
  strategies_config: Record<string, number>;
  regime_breakdown: Record<string, Record<string, { wins: number; total: number }>>;
  current_regime: { volatility: string; market: string; volume?: string };
  near_misses: Array<{
    id: number;
    timestamp: string;
    strategy: string;
    direction: string;
    signal_strength: number;
    threshold: number;
    reason_skipped: string;
    would_have_won: number | null;
    btc_move_pct: number;
    entry_minute: number;
  }>;
  data_quality: {
    total_trades: number;
    trades_with_volatility_regime?: number;
    trades_with_market_regime?: number;
    trades_with_orderbook_data?: number;
    near_miss_count?: number;
    last_export: string;
  };
  drawdown: {
    cumulative_pnl: Array<{ timestamp: string; pnl: number }>;
    max_drawdown: number;
  };
  live_trading?: {
    balance_usdc: number;
    open_positions: Array<{
      market: string;
      side: 'BUY' | 'SELL';
      size: number;
      entry_price: number;
      current_price: number;
      pnl: number;
      strategy: string;
      opened_at: string;
    }>;
    recent_orders: Array<{
      id: string;
      market: string;
      side: 'BUY' | 'SELL';
      size: number;
      price: number;
      status: 'filled' | 'open' | 'cancelled' | 'failed';
      strategy: string;
      timestamp: string;
      error?: string;
    }>;
    daily_pnl: number;
    total_pnl: number;
    total_trades: number;
    win_rate: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSnapshotToDashboard(snap: any, range?: string): DashboardData {
  const rangeData = snap.ranges?.[range || 'all'] || snap.ranges?.['all'] || {};
  return {
    btc_price: snap.live_signal?.btc_price || 0,
    last_updated: snap.generated_at || new Date().toISOString(),
    _source: 'snapshot',
    performance: snap.performance || {
      balance: 100, initial_balance: 100, total_pnl: 0, today_pnl: 0,
      win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_streak: 0, best_streak: 0,
    },
    live_signal: snap.live_signal || null,
    strategy_rankings: rangeData.strategy_rankings || snap.strategy_rankings || [],
    recent_trades: snap.recent_trades || [],
    hourly_stats: rangeData.hourly_stats || {},
    regime_breakdown: rangeData.regime_breakdown || {},
    current_regime: snap.current_regime || { volatility: 'unknown', market: 'unknown' },
    near_misses: snap.near_misses || [],
    data_quality: snap.data_quality || {
      total_trades: snap.performance?.total_trades || 0,
      last_export: snap.generated_at,
    },
    drawdown: rangeData.drawdown || { cumulative_pnl: [], max_drawdown: 0 },
    edge_analysis: snap.edge_analysis || {},
    minute_stats: {},
    daily_pnl: [],
    gate_status: snap.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
    gate_stats: { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
    funding_rate: snap.funding_rate || null,
    orderbook_imbalance: 0,
    strategies_config: {},
  };
}
