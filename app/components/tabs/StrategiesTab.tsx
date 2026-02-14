'use client';

import { useState } from 'react';
import { DashboardData } from '../../lib/snapshotMapper';

export default function StrategiesTab({ data }: { data: DashboardData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const strategies = [...data.strategy_rankings]
    .sort((a, b) => (b.p_dd || 0) - (a.p_dd || 0));

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
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap" style={{ background: '#0d1117', color: '#8b949e' }}>Strategy</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap" style={{ background: '#0d1117', color: '#8b949e' }}>Status</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>P/DD</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>P&L</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>Trades</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>Win %</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>Sortino</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>Max DD</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map(s => {
                const isGood = (s.p_dd || 0) >= 2.0;
                const isShadow = s.status === 'SHADOW';
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
                        {s.status}
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
