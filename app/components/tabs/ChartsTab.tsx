'use client';

import { useState, useMemo } from 'react';
import { DashboardData } from '../../lib/snapshotMapper';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

function computeRollingSortino(trades: any[], windowSize = 20): number[] {
  const completed = trades
    .filter((t: any) => t.result === 'WIN' || t.result === 'LOSS')
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (completed.length < windowSize) return [];
  const points: number[] = [];
  for (let i = windowSize; i <= completed.length; i++) {
    const profits = completed.slice(i - windowSize, i).map((t: any) => Number(t.profit) || 0);
    const mean = profits.reduce((a: number, b: number) => a + b, 0) / profits.length;
    const dd = Math.sqrt(profits.map((p: number) => Math.min(0, p) ** 2).reduce((a: number, b: number) => a + b, 0) / profits.length);
    points.push(dd === 0 ? (mean > 0 ? 10 : 0) : mean / dd);
  }
  return points;
}

export default function ChartsTab({ data }: { data: DashboardData }) {
  const [range, setRange] = useState<'1D' | '7D' | '30D' | 'All'>('All');
  const ranges = ['1D', '7D', '30D', 'All'] as const;

  const chartData = useMemo(() => {
    let points = data.drawdown.cumulative_pnl;
    if (range !== 'All') {
      const now = Date.now();
      const ms = range === '1D' ? 86400000 : range === '7D' ? 604800000 : 2592000000;
      points = points.filter(p => now - new Date(p.timestamp).getTime() < ms);
    }
    let peak = -Infinity;
    return points.map(p => {
      if (p.pnl > peak) peak = p.pnl;
      const dd = peak > 0 ? ((p.pnl - peak) / peak) * 100 : p.pnl < 0 ? -100 : 0;
      return { ...p, drawdown: Math.min(0, dd) };
    });
  }, [data.drawdown.cumulative_pnl, range]);

  const sortinoData = useMemo(() => {
    const points = computeRollingSortino(data.recent_trades);
    return points.map((v, i) => ({ i, sortino: v }));
  }, [data.recent_trades]);

  const currentPnL = chartData[chartData.length - 1]?.pnl || 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg p-2 text-xs" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <p style={{ color: '#8b949e' }}>{new Date(d.timestamp).toLocaleString()}</p>
        <p style={{ color: d.pnl >= 0 ? '#3fb950' : '#f85149' }}>P&L: ${d.pnl?.toFixed(2)}</p>
        {d.drawdown < 0 && <p style={{ color: '#f85149' }}>DD: {d.drawdown.toFixed(1)}%</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Charts</h2>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: range === r ? '#30363d' : 'transparent',
                color: range === r ? 'white' : '#8b949e',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Chart */}
      <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8b949e' }}>Cumulative P&L</p>
          <p className="text-sm font-bold" style={{ color: currentPnL >= 0 ? '#3fb950' : '#f85149' }}>
            {currentPnL >= 0 ? '+' : ''}${currentPnL.toFixed(2)}
          </p>
        </div>
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f85149" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f85149" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis yAxisId="pnl" hide />
              <YAxis yAxisId="dd" hide />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="dd" type="monotone" dataKey="drawdown" fill="url(#ddGrad)"
                stroke="#f85149" strokeWidth={1} strokeOpacity={0.3} dot={false} isAnimationActive={false} />
              <Line yAxisId="pnl" type="monotone" dataKey="pnl"
                stroke={currentPnL >= 0 ? '#3fb950' : '#f85149'} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sortino Sparkline */}
      {sortinoData.length > 2 && (
        <div className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#8b949e' }}>Rolling Sortino</p>
          <div className="h-24 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortinoData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="sortino" stroke="#3fb950" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
