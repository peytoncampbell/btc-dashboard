'use client';
import { n } from './utils';

import { useState } from 'react';

interface Strategy {
  name: string;
  live_trades: number;
  live_win_rate: number;
  live_pnl: number;
  live_wins: number;
  live_losses: number;
}

interface StrategyTableProps {
  strategies: Strategy[];
}

export default function StrategyTable({ strategies }: StrategyTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'trades' | 'wr' | 'pnl'>('pnl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sorted = [...strategies].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'name':
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      case 'trades':
        aVal = a.live_trades;
        bVal = b.live_trades;
        break;
      case 'wr':
        aVal = a.live_win_rate;
        bVal = b.live_win_rate;
        break;
      case 'pnl':
        aVal = a.live_pnl;
        bVal = b.live_pnl;
        break;
      default:
        return 0;
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">⚙️ STRATEGY PERFORMANCE</h2>
      {strategies.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-xs">No strategy data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th
                  className="text-left py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('name')}
                >
                  Strategy {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('trades')}
                >
                  Trades {sortBy === 'trades' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('wr')}
                >
                  Win Rate {sortBy === 'wr' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('pnl')}
                >
                  P&L {sortBy === 'pnl' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-1.5 px-2">W/L</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-1.5 px-2 text-gray-300 truncate max-w-[150px]">{s.name}</td>
                  <td className="py-1.5 px-2 text-center text-gray-400">{n(s.live_trades)}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`font-bold ${
                        n(s.live_win_rate) >= 60
                          ? 'text-green-400'
                          : n(s.live_win_rate) >= 40
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {n(s.live_win_rate).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span className={`font-bold ${n(s.live_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {n(s.live_pnl) >= 0 ? '+' : ''}${n(s.live_pnl).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center text-gray-500 text-[10px]">
                    {n(s.live_wins)}/{n(s.live_losses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}




