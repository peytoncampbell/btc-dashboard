'use client';
import { n } from './utils';

import { useState } from 'react';

interface RegimeBreakdown {
  [strategy: string]: {
    [regime: string]: { wins: number; total: number };
  };
}

interface StrategyHeatmapProps {
  regimeBreakdown: RegimeBreakdown;
}

export default function StrategyHeatmap({ regimeBreakdown }: StrategyHeatmapProps) {
  const [sortBy, setSortBy] = useState<'name' | 'bull' | 'bear' | 'sideways'>('name');

  const regimes = ['bull', 'bear', 'sideways'];
  const strategies = Object.keys(regimeBreakdown);

  // Calculate WR for each strategy-regime pair
  const data = strategies.map((strat) => {
    const stratData = regimeBreakdown[strat];
    const regimeWRs: Record<string, number> = {};
    for (const regime of regimes) {
      const stats = stratData[regime];
      regimeWRs[regime] = stats && stats.total > 0 ? (stats.wins / stats.total) * 100 : -1;
    }
    return { name: strat, ...regimeWRs };
  });

  // Sort
  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    const aVal = (a as any)[sortBy] ?? -1;
    const bVal = (b as any)[sortBy] ?? -1;
    return bVal - aVal;
  });

  function getCellColor(wr: number) {
    if (wr < 0) return 'bg-gray-800 text-gray-600';
    if (wr >= 60) return 'bg-green-500/20 text-green-400 border-green-500/40';
    if (wr >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">🔥 STRATEGY × REGIME HEATMAP</h2>
      {strategies.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-xs">No regime data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th
                  className="text-left py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                  onClick={() => setSortBy('name')}
                >
                  Strategy {sortBy === 'name' && '↓'}
                </th>
                {regimes.map((r) => (
                  <th
                    key={r}
                    className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                    onClick={() => setSortBy(r as any)}
                  >
                    {r === 'bull' ? '🐂' : r === 'bear' ? '🐻' : '↔️'} {r} {sortBy === r && '↓'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.name} className="border-b border-gray-800/50">
                  <td className="py-1.5 px-2 text-gray-300 truncate max-w-[120px]">{row.name}</td>
                  {regimes.map((r) => {
                    const wr = (row as any)[r] as number;
                    return (
                      <td key={r} className="py-1.5 px-2">
                        <div
                          className={`text-center py-0.5 rounded border ${getCellColor(wr)}`}
                        >
                          {wr >= 0 ? `${n(wr).toFixed(0)}%` : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}




