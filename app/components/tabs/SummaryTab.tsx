'use client';

import { useMemo, useState, useEffect } from 'react';
import { DashboardData } from '../../lib/snapshotMapper';

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2, className = '' }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 600;
    const start = Date.now();
    const from = displayed;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (value - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className={className}>{prefix}{Math.abs(displayed).toFixed(decimals)}{suffix}</span>;
}

function computeSortino(profits: number[]): number {
  if (profits.length < 2) return 0;
  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const downside = profits.map(p => Math.min(0, p) ** 2);
  const dd = Math.sqrt(downside.reduce((a, b) => a + b, 0) / downside.length);
  return dd === 0 ? (mean > 0 ? 10 : 0) : mean / dd;
}

export default function SummaryTab({ data }: { data: DashboardData }) {
  const perf = data.performance;
  const pnlPct = perf.initial_balance > 0 ? (perf.total_pnl / perf.initial_balance) * 100 : 0;
  const isPositive = perf.total_pnl >= 0;
  const todayPositive = perf.today_pnl >= 0;

  const sortino = useMemo(() => {
    const completed = data.recent_trades.filter(t => t.result === 'WIN' || t.result === 'LOSS');
    const profits = completed.slice(-20).map(t => Number(t.profit) || 0);
    return computeSortino(profits);
  }, [data.recent_trades]);

  const regime = data.current_regime;
  const regimeEmoji = regime.market === 'bull' || regime.market === 'bullish' ? '🟢' :
    regime.market === 'bear' || regime.market === 'bearish' ? '🔴' : '🟡';

  const [updateAge, setUpdateAge] = useState('now');
  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(data.last_updated).getTime()) / 1000);
      setUpdateAge(diff < 5 ? 'now' : diff < 60 ? `${diff}s ago` : `${Math.floor(diff / 60)}m ago`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [data.last_updated]);

  return (
    <div className="space-y-3 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">BTC Dashboard</h1>
          <p className="text-xs" style={{ color: '#8b949e' }}>{updateAge}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
          style={{ background: '#161b22', borderColor: '#30363d', color: '#8b949e' }}>
          PAPER v2
        </span>
      </div>

      {/* Compact Hero P&L */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#8b949e' }}>Total P&L</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold" style={{ color: isPositive ? '#3fb950' : '#f85149' }}>
              {isPositive ? '+' : '-'}$<AnimatedNumber value={perf.total_pnl} decimals={2} />
            </span>
            <span className="text-sm" style={{ color: isPositive ? '#3fb950' : '#f85149' }}>
              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <span className="text-2xl">{isPositive ? '↑' : '↓'}</span>
      </div>

      {/* Stats Strip */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <div className="flex divide-x" style={{ borderColor: '#30363d' }}>
          {[
            { label: 'Balance', value: `$${perf.balance.toLocaleString()}`, color: '#fff' },
            { label: 'Today', value: `${todayPositive ? '+' : '-'}$${Math.abs(perf.today_pnl).toFixed(2)}`, color: todayPositive ? '#3fb950' : '#f85149' },
            { label: 'Win Rate', value: `${perf.win_rate.toFixed(0)}%`, color: '#fff' },
            { label: 'Trades', value: `${perf.total_trades}`, color: '#fff' },
            { label: 'Streak', value: `${perf.current_streak >= 0 ? '+' : ''}${perf.current_streak}`, color: perf.current_streak >= 0 ? '#3fb950' : '#f85149' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 px-2 py-2.5 text-center" style={{ borderColor: '#30363d' }}>
              <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#8b949e' }}>{stat.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Pills Bar */}
      <div className="flex gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <span>{regimeEmoji}</span>
          <span className="font-medium capitalize">{regime.market || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: data.gate_status.is_open ? '#3fb950' : '#f85149' }} />
          <span className="font-medium">Gate {data.gate_status.is_open ? 'Open' : 'Closed'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <span style={{ color: '#8b949e' }}>Sortino</span>
          <span className="font-bold" style={{ color: sortino >= 0.05 ? '#3fb950' : '#f85149' }}>
            {sortino.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
}
