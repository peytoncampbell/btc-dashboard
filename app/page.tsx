'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardData } from './lib/snapshotMapper';
import SummaryTab from './components/tabs/SummaryTab';
import StrategiesTab from './components/tabs/StrategiesTab';
import TradesTab from './components/tabs/TradesTab';
import ChartsTab from './components/tabs/ChartsTab';
import LiveTab from './components/tabs/LiveTab';

type Tab = 'summary' | 'strategies' | 'trades' | 'charts' | 'live';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('summary');
  const [refreshPulse, setRefreshPulse] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchData = useCallback(async () => {
    const SUPABASE_URL = 'https://rwewjbofwqvukvxrlybj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_5fyufdP-YcDJry7oupCBhA_DPJzhFCB';
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/dashboard_data?id=eq.1&select=*`,
        { headers: { apikey: SUPABASE_KEY }, cache: 'no-store' }
      );
      const rows = await res.json();
      if (!rows?.length) return;
      const row = rows[0];
      const ld = row.live_data || {};
      const stats = row.stats_7d;

      const recentTrades = ld.recent_trades || [];
      const completed = recentTrades.filter((t: any) => t.result === 'WIN' || t.result === 'LOSS');

      let cumulativePnl = stats?.drawdown?.cumulative_pnl || [];
      if (!cumulativePnl.length && completed.length) {
        let running = 0;
        cumulativePnl = completed.map((t: any) => {
          running += Number(t.profit) || 0;
          return { timestamp: t.timestamp, pnl: running };
        });
      }
      const downsample = (arr: any[], max: number) => {
        if (arr.length <= max) return arr;
        const step = arr.length / max;
        return Array.from({ length: max }, (_, i) =>
          i === max - 1 ? arr[arr.length - 1] : arr[Math.floor(i * step)]
        );
      };

      const dailyMap: Record<string, number> = {};
      for (const t of completed) {
        const d = new Date(String(t.timestamp)).toLocaleDateString();
        dailyMap[d] = (dailyMap[d] || 0) + (Number(t.profit) || 0);
      }

      const newData: DashboardData = {
        mode: 'paper',
        btc_price: ld.signal?.btc_price || ld.performance?.btc_price || 0,
        last_updated: row.updated_at || new Date().toISOString(),
        performance: ld.performance || { balance: 100, initial_balance: 100, total_pnl: 0, today_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_streak: 0, best_streak: 0 },
        live_signal: ld.signal || null,
        strategy_rankings: stats?.strategy_rankings || ld?.rankings || [],
        recent_trades: recentTrades.slice(0, 30),
        hourly_stats: stats?.hourly_stats || {},
        regime_breakdown: stats?.regime_breakdown || {},
        current_regime: ld?.current_regime || { volatility: 'unknown', market: 'unknown' },
        near_misses: (ld?.near_misses_recent || []).slice(0, 20),
        data_quality: ld?.data_quality || { total_trades: recentTrades.length, last_export: new Date().toISOString() },
        drawdown: { cumulative_pnl: downsample(cumulativePnl, 200), max_drawdown: stats?.drawdown?.max_drawdown || 0 },
        edge_analysis: ld.edge_analysis || stats?.edge_analysis || {},
        minute_stats: {},
        daily_pnl: Object.entries(dailyMap).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-7).map(([date, pnl]) => ({ date, pnl })),
        gate_status: ld?.gate_status || { atr_pct: 0, threshold: 0.15, is_open: true },
        gate_stats: ld?.gate_stats || { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 },
        funding_rate: ld?.funding_rate || null,
        orderbook_imbalance: ld?.orderbook_imbalance || 0,
        strategies_config: ld?.strategies_config || {},
        live_trading: ld?.live_trading || undefined,
      };

      setData(newData);
      setRefreshPulse(true);
      setTimeout(() => setRefreshPulse(false), 600);
    } catch (e) {
      console.error('Fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Skeleton loading
  if (loading || !data) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto" style={{ background: '#0d1117' }}>
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl mb-4" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'summary', label: 'Summary', icon: '📊' },
    { id: 'strategies', label: 'Strategies', icon: '🎯' },
    { id: 'trades', label: 'Trades', icon: '📋' },
    { id: 'charts', label: 'Charts', icon: '📈' },
    { id: 'live', label: 'Live', icon: '🔴' },
  ];

  // Desktop: single scrollable page
  if (!isMobile) {
    return (
      <div className={`min-h-screen p-6 max-w-7xl mx-auto ${refreshPulse ? 'pulse-refresh' : ''}`} style={{ background: '#0d1117' }}>
        <SummaryTab data={data} />
        <div className="mt-6"><StrategiesTab data={data} /></div>
        <div className="mt-6 grid grid-cols-2 gap-6">
          <TradesTab data={data} />
          <ChartsTab data={data} />
        </div>
        <div className="mt-6"><LiveTab data={data} /></div>
      </div>
    );
  }

  // Mobile: tabbed layout
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      {/* Content */}
      <div className={`flex-1 overflow-y-auto pb-20 px-4 pt-4 no-scrollbar ${refreshPulse ? 'pulse-refresh' : ''}`}>
        <div className="tab-content" key={tab}>
          {tab === 'summary' && <SummaryTab data={data} />}
          {tab === 'strategies' && <StrategiesTab data={data} />}
          {tab === 'trades' && <TradesTab data={data} />}
          {tab === 'charts' && <ChartsTab data={data} />}
          {tab === 'live' && <LiveTab data={data} />}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 border-t flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50"
        style={{ background: '#161b22', borderColor: '#30363d' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${tab === t.id ? 'text-white' : 'text-[#8b949e]'}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
