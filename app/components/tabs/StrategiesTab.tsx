'use client';

import { useState } from 'react';
import { DashboardData } from '../../lib/snapshotMapper';

type SortKey = 'name' | 'status' | 'p_dd' | 'pnl' | 'trades' | 'wr' | 'sortino' | 'max_dd';

export default function StrategiesTab({ data }: { data: DashboardData }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('p_dd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir(key === 'name' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const strategies = [...data.strategy_rankings].sort((a, b) => {
    let aVal: number | string, bVal: number | string;
    switch (sortBy) {
      case 'name':
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      case 'status':
        return sortDir === 'asc' ? (a.status || '').localeCompare(b.status || '') : (b.status || '').localeCompare(a.status || '');
      case 'p_dd': aVal = a.p_dd || 0; bVal = b.p_dd || 0; break;
      case 'pnl': aVal = a.live_pnl || 0; bVal = b.live_pnl || 0; break;
      case 'trades': aVal = a.live_trades || 0; bVal = b.live_trades || 0; break;
      case 'wr': aVal = a.live_win_rate || 0; bVal = b.live_win_rate || 0; break;
      case 'sortino': aVal = a.sortino || 0; bVal = b.sortino || 0; break;
      case 'max_dd': aVal = a.max_dd || 0; bVal = b.max_dd || 0; break;
      default: return 0;
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const arrow = (key: SortKey) => sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (!strategies.length) {
    return (
      <div className="animate-in">
        <h2 className="text-lg font-bold mb-3">Strategies</h2>
        <div className="rounded-xl p-8 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <p style={{ color: '#8b949e' }}>No strategy data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <h2 className="text-lg font-bold mb-3">Strategies</h2>
      <div className="rounded-xl overflow-hidden" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left" style={{ background: '#0d1117' }}>
                {([
                  ['name', 'Strategy', 'left'],
                  ['status', 'Status', 'left'],
                  ['p_dd', 'P/DD', 'right'],
                  ['pnl', 'P&L', 'right'],
                  ['trades', 'Trades', 'right'],
                  ['wr', 'Win %', 'right'],
                  ['sortino', 'Sortino', 'right'],
                  ['max_dd', 'Max DD', 'right'],
                ] as [SortKey, string, string][]).map(([key, label, align]) => (
                  <th key={key}
                    className={`sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap cursor-pointer select-none hover:bg-white/[0.05] transition-colors text-${align}`}
                    style={{ background: '#0d1117', color: sortBy === key ? '#58a6ff' : '#8b949e' }}
                    onClick={() => handleSort(key)}>
                    {label}{arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map(s => {
                const isGood = (s.p_dd || 0) >= 2.0;
                const status = s.status || 'ACTIVE';
                const isShadow = status === 'SHADOW';
                const isExpanded = expanded === s.name;
                const textColor = isShadow ? '#8b949e' : '#fff';

                return (
                  <tr key={s.name} className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{
                      borderBottom: '1px solid #30363d',
                      borderLeft: isGood ? '3px solid #3fb950' : '3px solid transparent',
                    }}
                    onClick={() => setExpanded(isExpanded ? null : s.name)}>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: textColor }}>{s.name}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: isShadow ? '#30363d' : '#238636',
                          color: isShadow ? '#8b949e' : '#fff',
                        }}>
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap"
                      style={{ color: isGood ? '#3fb950' : '#8b949e' }}>
                      {(s.p_dd || 0).toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: s.live_pnl >= 0 ? '#3fb950' : '#f85149' }}>
                      {s.live_pnl >= 0 ? '+' : ''}${s.live_pnl.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: textColor }}>{s.live_trades}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: textColor }}>{s.live_win_rate.toFixed(0)}%</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap"
                      style={{ color: (s.sortino || 0) >= 0.05 ? '#3fb950' : '#f85149' }}>
                      {(s.sortino || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: '#f85149' }}>
                      {(s.max_dd || 0).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
