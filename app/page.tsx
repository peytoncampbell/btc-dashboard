'use client';

import { useEffect, useState, useCallback } from 'react';
import PortfolioCard from './components/PortfolioCard';
import MarketRegime from './components/MarketRegime';
import LiveSignal from './components/LiveSignal';
import StrategyTable from './components/StrategyTable';
import DrawdownChart from './components/DrawdownChart';
import HourlyHeatmap from './components/HourlyHeatmap';
import NearMissFeed from './components/NearMissFeed';
import DataQualityPanel from './components/DataQualityPanel';
import RecentTrades from './components/RecentTrades';
import EdgeAnalysis from './components/EdgeAnalysis';
import StrategyHeatmap from './components/StrategyHeatmap';

interface DashboardData {
  btc_price: number;
  last_updated: string;
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
  live_signal: any;
  strategy_rankings: Array<any>;
  recent_trades: Array<any>;
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
  current_regime: { volatility: string; market: string; volume: string };
  near_misses: Array<any>;
  data_quality: {
    total_trades: number;
    trades_with_volatility_regime: number;
    trades_with_market_regime: number;
    trades_with_orderbook_data: number;
    near_miss_count: number;
    last_export: string;
  };
  drawdown: {
    cumulative_pnl: Array<{ timestamp: string; pnl: number }>;
    max_drawdown: number;
  };
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [howOpen, setHowOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const include = dateRange === '7d' ? 'near_misses' : '';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api/data?range=${dateRange}&include=${include}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const newData = await res.json();
      // Always update — the API route now guarantees real data (live or snapshot fallback)
      setData(newData);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('API failed, trying snapshot fallback:', e);
      // Fallback: load static snapshot directly
      try {
        const snapRes = await fetch('/data/snapshot.json');
        if (snapRes.ok) {
          const snap = await snapRes.json();
          setData({
            ...snap,
            btc_price: snap.live_signal?.btc_price || 0,
            last_updated: snap.generated_at || new Date().toISOString(),
            _source: 'snapshot_fallback',
            strategy_rankings: snap.strategy_rankings || [],
            recent_trades: snap.recent_trades || [],
            hourly_stats: {},
            regime_breakdown: {},
            current_regime: snap.current_regime || { volatility: 'unknown', market: 'unknown' },
            near_misses: [],
            data_quality: { total_trades: 0, last_export: snap.generated_at },
            drawdown: { cumulative_pnl: [], max_drawdown: 0 },
            edge_analysis: {},
            minute_stats: {},
            daily_pnl: [],
            gate_status: snap.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
            gate_stats: { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
            funding_rate: snap.funding_rate || null,
            orderbook_imbalance: 0,
            strategies_config: {},
          });
          setLastUpdate(new Date(snap.generated_at || Date.now()));
        }
      } catch (snapErr) {
        console.error('Snapshot fallback also failed:', snapErr);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15000);
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
        <div className="text-white text-xl animate-pulse">Loading BTC Scalper v9...</div>
      </div>
    );
  }

  const perf = data.performance;
  const sig = data.live_signal;
  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';

  let windowLabel = '';
  if (sig?.window_start && sig?.window_end) {
    const fmt = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    windowLabel = `${fmt(sig.window_start)}-${fmt(sig.window_end)} | Min ${sig.minute ?? '?'}`;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-2 md:p-3 max-w-7xl mx-auto text-sm">
      {/* HEADER */}
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">
            🤖 BTC Scalper{' '}
            <span className="text-xs text-blue-400 font-normal">v9 · Enriched ML</span>
          </h1>
          <div className={`w-2 h-2 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400">{sigActive ? 'Active' : 'Idle'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {/* Date range filter */}
          <div className="flex gap-1">
            {(['today', '7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2 py-1 rounded ${
                  dateRange === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-400">Updated {updateAge} ago</span>
          </div>
          <span className="text-gray-400">
            BTC <span className="text-white font-semibold">${data.btc_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
          {windowLabel && <span className="text-blue-400 font-mono">{windowLabel}</span>}
        </div>
      </header>

      {/* ROW 1: Portfolio | Market Regime | Live Signal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <PortfolioCard
          balance={perf.balance}
          initialBalance={perf.initial_balance}
          totalPnl={perf.total_pnl}
          todayPnl={perf.today_pnl}
          winRate={perf.win_rate}
          wins={perf.wins}
          totalTrades={perf.total_trades}
          currentStreak={perf.current_streak}
          bestStreak={perf.best_streak}
        />
        <MarketRegime
          volatility={data.current_regime.volatility}
          trend={data.current_regime.market}
          volume={data.current_regime.volume}
        />
        <LiveSignal
          signal={sig}
          gateStatus={data.gate_status}
          obImbalance={data.orderbook_imbalance}
        />
      </div>

      {/* ROW 2: Strategy Table (full width) */}
      <div className="mb-2">
        <StrategyTable strategies={data.strategy_rankings} />
      </div>

      {/* ROW 3: Drawdown Chart | Hourly Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <DrawdownChart
          cumulativePnl={data.drawdown.cumulative_pnl}
          maxDrawdown={data.drawdown.max_drawdown}
        />
        <HourlyHeatmap hourlyStats={data.hourly_stats} />
      </div>

      {/* ROW 4: Strategy Heatmap (full width) */}
      <div className="mb-2">
        <StrategyHeatmap regimeBreakdown={data.regime_breakdown} />
      </div>

      {/* ROW 5: Near-Miss Feed | Data Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <NearMissFeed nearMisses={data.near_misses} />
        <DataQualityPanel
          totalTrades={data.data_quality.total_trades}
          tradesWithVolatilityRegime={data.data_quality.trades_with_volatility_regime}
          tradesWithMarketRegime={data.data_quality.trades_with_market_regime}
          tradesWithOrderbookData={data.data_quality.trades_with_orderbook_data}
          nearMissCount={data.data_quality.near_miss_count}
          lastExport={data.data_quality.last_export}
        />
      </div>

      {/* ROW 6: Recent Trades | Edge Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <RecentTrades trades={data.recent_trades} />
        <EdgeAnalysis edgeBuckets={data.edge_analysis} />
      </div>

      {/* How It Works */}
      <section className="bg-gray-900/50 rounded-xl border border-gray-800">
        <button
          onClick={() => setHowOpen(!howOpen)}
          className="w-full p-3 flex items-center justify-between text-left"
        >
          <h2 className="text-sm font-bold">📖 How It Works — v9 Architecture</h2>
          <span className="text-gray-500 text-xs">{howOpen ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {howOpen && (
          <div className="px-3 pb-3 space-y-3 text-xs text-gray-300 leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-0.5">🚦 Layer 1: Volatility Gate</h3>
              <p>
                ATR% from Binance 1m candles must exceed {data.gate_status.threshold}%. Low volatility = skip the window entirely.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">🤖 Layer 2: Strategy Ensemble</h3>
              <p>
                45+ weighted strategies vote on direction. ML models (XGBoost, v5, v6) + technical indicators + Binance signals. Weighted consensus determines direction + confidence.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">📊 Layer 3: Edge Detection</h3>
              <p>
                We only trade when our ensemble confidence exceeds the Polymarket price by 5¢+. Entry restricted to minutes 2-7. All trades enriched with 64 fields including market regime, volatility, orderbook depth, and strategy consensus.
              </p>
            </div>
          </div>
        )}
      </section>

      <footer className="text-center text-[10px] text-gray-600 mt-2 pb-2">
        BTC Scalper v9 — Enriched ML · {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </div>
  );
}
