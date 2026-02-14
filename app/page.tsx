'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import MetricsCard from './components/MetricsCard';
import CircularProgress from './components/CircularProgress';
import PnLChart from './components/PnLChart';
import HourlyHeatmap from './components/HourlyHeatmap';
import StrategyTable from './components/StrategyTable';
import RecentTrades from './components/RecentTrades';
import { DashboardData } from './lib/snapshotMapper';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [tradingMode, setTradingMode] = useState<'paper' | 'live'>('paper');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [btcPriceChange, setBtcPriceChange] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [switching, setSwitching] = useState(false);
  const prevBtcPriceRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const SUPABASE_URL = 'https://rwewjbofwqvukvxrlybj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_5fyufdP-YcDJry7oupCBhA_DPJzhFCB';

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_data?id=eq.1&select=*`,
        { headers: { 'apikey': SUPABASE_KEY }, cache: 'no-store' }
      );
      const rows = await res.json();
      if (!rows || rows.length === 0) throw new Error('No data from Supabase');
      const row = rows[0];
      const liveData = row.live_data || {};
      const statsData = row.stats_7d; // may be null

      const btcPrice = liveData.signal?.btc_price || liveData.performance?.btc_price || 0;

      // Track BTC price changes for visual feedback
      if (prevBtcPriceRef.current && prevBtcPriceRef.current !== btcPrice) {
        setBtcPriceChange(btcPrice > prevBtcPriceRef.current ? 'up' : 'down');
        setTimeout(() => setBtcPriceChange('neutral'), 1000);
      }
      prevBtcPriceRef.current = btcPrice;

      // Build completed trades for derived metrics
      const recentTrades = liveData.recent_trades || [];
      const completed = recentTrades.filter((t: any) => t.result === 'WIN' || t.result === 'LOSS');

      // Edge analysis
      const edgeBuckets = liveData.edge_analysis || statsData?.edge_analysis || {};

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
      const dailyPnl = Object.entries(dailyMap)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-7)
        .map(([date, pnl]) => ({ date, pnl }));

      // Cumulative P&L: use stats if available, else derive from trades
      let cumulativePnl = statsData?.drawdown?.cumulative_pnl || [];
      if (cumulativePnl.length === 0 && completed.length > 0) {
        let running = 0;
        cumulativePnl = completed.map((t: any) => {
          running += Number(t.profit) || 0;
          return { timestamp: t.timestamp, pnl: running };
        });
      }

      const downsample = (arr: any[], max: number) => {
        if (arr.length <= max) return arr;
        const step = arr.length / max;
        const result = [];
        for (let i = 0; i < max - 1; i++) result.push(arr[Math.floor(i * step)]);
        result.push(arr[arr.length - 1]);
        return result;
      };

      const newData: DashboardData = {
        mode: tradingMode,
        btc_price: btcPrice,
        last_updated: row.updated_at || new Date().toISOString(),
        performance: liveData.performance || { balance: 100, initial_balance: 100, total_pnl: 0, today_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_streak: 0, best_streak: 0 },
        live_signal: liveData.signal || null,
        strategy_rankings: statsData?.strategy_rankings || liveData?.rankings || [],
        recent_trades: recentTrades.slice(0, 20),
        hourly_stats: statsData?.hourly_stats || {},
        regime_breakdown: statsData?.regime_breakdown || {},
        current_regime: liveData?.current_regime || { volatility: 'unknown', market: 'unknown' },
        near_misses: (liveData?.near_misses_recent || []).slice(0, 20),
        data_quality: liveData?.data_quality || { total_trades: recentTrades.length, last_export: new Date().toISOString() },
        drawdown: {
          cumulative_pnl: downsample(cumulativePnl, 200),
          max_drawdown: statsData?.drawdown?.max_drawdown || 0,
        },
        edge_analysis: edgeBuckets,
        minute_stats: minuteStats,
        daily_pnl: dailyPnl,
        gate_status: liveData?.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
        gate_stats: liveData?.gate_stats || { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
        funding_rate: liveData?.funding_rate || null,
        orderbook_imbalance: liveData?.orderbook_imbalance || 0,
        strategies_config: liveData?.strategies_config || {},
      };

      setData(newData);
      setLastUpdate(new Date());
      setSwitching(false);
    } catch (e) {
      console.error('Supabase fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [dateRange, tradingMode]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Time since last update
  const [updateAge, setUpdateAge] = useState('0s');
  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      setUpdateAge(diff < 60 ? `${diff}s` : `${Math.floor(diff / 60)}m`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [lastUpdate]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading BTC Scalper v10...</div>
      </div>
    );
  }

  const perf = data.performance;
  const sig = data.live_signal;
  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';
  const pnlPct = perf.initial_balance > 0 ? (perf.total_pnl / perf.initial_balance) * 100 : 0;

  // Calculate current drawdown
  const currentDrawdown = Math.max(0, perf.balance < perf.initial_balance + Math.max(...(data.drawdown.cumulative_pnl.map(p => p.pnl) || [0])) 
    ? (perf.initial_balance + Math.max(...(data.drawdown.cumulative_pnl.map(p => p.pnl) || [0])) - perf.balance) / perf.initial_balance * 100 
    : 0);

  // Get window timer info
  let windowCountdown = '';
  if (sig?.window_end) {
    const endTime = new Date(sig.window_end);
    const now = new Date();
    const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    if (diff > 0) {
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      windowCountdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Get strategy consensus for live status
  const liveStrategies = data.strategy_rankings.filter(s => s.status === 'LIVE');
  const consensus = liveStrategies.length > 0 ? liveStrategies[0]?.direction || 'NEUTRAL' : 'NEUTRAL';
  const confidence = sig?.confidence || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-3 sm:p-4 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="mb-4 sm:mb-6">
        {/* Top row: Title and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">BTC Scalper</h1>
              <div className={`w-3 h-3 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-xs sm:text-sm text-gray-400">{sigActive ? 'LIVE' : 'IDLE'}</span>
            </div>
            <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
              tradingMode === 'live' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
            }`}>
              {tradingMode === 'live' ? 'LIVE' : 'PAPER'}
            </div>
          </div>
          
          {/* BTC Price - always visible */}
          <div className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg border transition-colors duration-1000 ${
            btcPriceChange === 'up' ? 'bg-green-900/30 border-green-600/50 text-green-400' :
            btcPriceChange === 'down' ? 'bg-red-900/30 border-red-600/50 text-red-400' :
            'bg-gray-800/50 border-gray-700 text-white'
          }`}>
            <div className="font-semibold text-sm sm:text-base">
              BTC ${data.btc_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {/* Live/Paper Toggle */}
          <div className="flex bg-gray-800/50 rounded-lg border border-gray-700">
            <button
              onClick={() => { setSwitching(true); setTradingMode('paper'); }}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-l-lg transition-all ${
                tradingMode === 'paper' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Paper
            </button>
            <button
              onClick={() => { setSwitching(true); setTradingMode('live'); }}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-r-lg transition-all ${
                tradingMode === 'live' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Live
            </button>
          </div>

          {/* Window Timer */}
          {windowCountdown && (
            <div className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg">
              <div className="font-mono text-blue-400">{windowCountdown}</div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="flex gap-1 bg-gray-800/50 rounded-lg border border-gray-700">
            {(['today', '7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setSwitching(true); setDateRange(r); }}
                className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs font-medium transition-all ${
                  dateRange === r 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="text-gray-400 hidden sm:block">
            Updated {updateAge} ago
          </div>
        </div>
      </header>

      {/* Loading overlay for mode/range switches */}
      {switching && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-6 py-3 text-sm text-gray-300 animate-pulse">
            Loading {tradingMode === 'live' ? 'Live' : 'Paper'} data...
          </div>
        </div>
      )}

      {/* KEY METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {/* Portfolio Value */}
        <MetricsCard title="Portfolio" icon="💰">
          <div className="space-y-1 sm:space-y-2">
            <div className="text-lg sm:text-2xl font-bold">${perf.balance.toLocaleString()}</div>
            <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${perf.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-base sm:text-lg font-semibold">
                {perf.total_pnl >= 0 ? '+' : ''}${Math.abs(perf.total_pnl).toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm">
                ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
              </span>
            </div>
            <div className={`text-xs sm:text-sm ${perf.today_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Today: {perf.today_pnl >= 0 ? '+' : ''}${Math.abs(perf.today_pnl).toFixed(2)}
            </div>
          </div>
        </MetricsCard>

        {/* Win Rate */}
        <MetricsCard title="Win Rate" icon="🎯">
          <div className="flex items-center justify-between">
            <CircularProgress
              value={perf.win_rate}
              size={60}
              strokeWidth={5}
              color="#22c55e"
              centerText={
                <div className="text-center">
                  <div className="text-sm sm:text-lg font-bold text-white">{perf.win_rate.toFixed(0)}%</div>
                </div>
              }
            />
            <div className="text-right space-y-1">
              <div className="text-green-400 font-semibold text-xs sm:text-sm">{perf.wins} wins</div>
              <div className="text-red-400 font-semibold text-xs sm:text-sm">{perf.losses} losses</div>
              <div className="text-gray-400 text-xs">{perf.total_trades} total</div>
            </div>
          </div>
        </MetricsCard>

        {/* Live Status */}
        <MetricsCard title="Status" icon="📡">
          <div className="space-y-1 sm:space-y-2">
            <div className={`text-base sm:text-lg font-bold ${
              consensus === 'LONG' ? 'text-green-400' : 
              consensus === 'SHORT' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {consensus}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              Confidence: <span className="text-white font-semibold">{(confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              {liveStrategies.length} strategies
            </div>
            <div className={`text-xs px-1 sm:px-2 py-1 rounded ${data.gate_status.is_open ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              Gate: {data.gate_status.is_open ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </MetricsCard>

        {/* Risk Metrics */}
        <MetricsCard title="Risk" icon="⚠️">
          <div className="space-y-1 sm:space-y-2">
            <div>
              <div className="text-xs sm:text-sm text-gray-400">Max DD</div>
              <div className="text-red-400 font-semibold text-sm sm:text-base">{data.drawdown.max_drawdown.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-gray-400">Current DD</div>
              <div className={`font-semibold text-sm sm:text-base ${currentDrawdown > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {currentDrawdown.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-gray-400">Streak</div>
              <div className={`font-semibold text-sm sm:text-base ${perf.current_streak >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {perf.current_streak >= 0 ? '+' : ''}{perf.current_streak}
              </div>
            </div>
          </div>
        </MetricsCard>
      </div>

      {/* P&L CHART */}
      <div className="mb-4 sm:mb-6">
        <PnLChart data={data.drawdown.cumulative_pnl} />
      </div>

      {/* STRATEGY TABLE */}
      <div className="mb-4 sm:mb-6 overflow-x-auto">
        <StrategyTable strategies={data.strategy_rankings} />
      </div>

      {/* RECENT TRADES & HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="overflow-x-auto">
          <RecentTrades trades={data.recent_trades} />
        </div>
        <HourlyHeatmap hourlyStats={data.hourly_stats} />
      </div>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-600 pt-3 sm:pt-4 border-t border-gray-800">
        <div className="mb-1 sm:mb-2">v10 · Live Trading</div>
        <div>Last updated: {new Date(data.last_updated).toLocaleString()}</div>
      </footer>
    </div>
  );
}