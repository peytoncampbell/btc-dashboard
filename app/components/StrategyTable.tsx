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
  ev?: number;
  sortino?: number;
  max_dd?: number;
  p_dd?: number;
  avg_confidence?: number;
  streak?: number;
}

interface StrategyTableProps {
  strategies: Strategy[];
}

type SortKey = 'name' | 'trades' | 'wr' | 'pnl' | 'ev' | 'sortino' | 'max_dd' | 'p_dd' | 'avg_conf' | 'streak';

export default function StrategyTable({ strategies }: StrategyTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('pnl');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
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
        aVal = n(a.live_trades);
        bVal = n(b.live_trades);
        break;
      case 'wr':
        aVal = n(a.live_win_rate);
        bVal = n(b.live_win_rate);
        break;
      case 'pnl':
        aVal = n(a.live_pnl);
        bVal = n(b.live_pnl);
        break;
      case 'ev':
        aVal = n(a.ev);
        bVal = n(b.ev);
        break;
      case 'sortino':
        aVal = n(a.sortino);
        bVal = n(b.sortino);
        break;
      case 'max_dd':
        aVal = n(a.max_dd);
        bVal = n(b.max_dd);
        break;
      case 'p_dd':
        aVal = n(a.p_dd);
        bVal = n(b.p_dd);
        break;
      case 'avg_conf':
        aVal = n(a.avg_confidence);
        bVal = n(b.avg_confidence);
        break;
      case 'streak':
        aVal = n(a.streak);
        bVal = n(b.streak);
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
                  className="text-left py-1.5 px-1.5 cursor-pointer hover:bg-gray-800 sticky left-0 bg-gray-900"
                  onClick={() => handleSort('name')}
                >
                  Strategy {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('trades')}
                >
                  Trades {sortBy === 'trades' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('wr')}
                >
                  WR {sortBy === 'wr' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('pnl')}
                >
                  P&L {sortBy === 'pnl' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('ev')}
                >
                  EV {sortBy === 'ev' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('sortino')}
                >
                  Sortino {sortBy === 'sortino' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('max_dd')}
                >
                  Max DD {sortBy === 'max_dd' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('p_dd')}
                >
                  P/DD {sortBy === 'p_dd' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('avg_conf')}
                >
                  Conf {sortBy === 'avg_conf' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-center py-1.5 px-1.5 cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('streak')}
                >
                  Streak {sortBy === 'streak' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-1.5 px-1.5 text-gray-300 truncate max-w-[120px] sticky left-0 bg-gray-900">{s.name}</td>
                  <td className="py-1.5 px-1.5 text-center text-gray-400">{n(s.live_trades)}</td>
                  <td className="py-1.5 px-1.5 text-center">
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
                  <td className="py-1.5 px-1.5 text-center">
                    <span className={`font-bold ${n(s.live_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {n(s.live_pnl) >= 0 ? '+' : ''}${n(s.live_pnl).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <span className={n(s.ev) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ${n(s.ev).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <span className={n(s.sortino) >= 1 ? 'text-green-400' : 'text-yellow-400'}>
                      {n(s.sortino) >= 999 ? '∞' : n(s.sortino).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <span className="text-red-400">
                      ${n(s.max_dd).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    <span className={n(s.p_dd) >= 2 ? 'text-green-400' : 'text-yellow-400'}>
                      {n(s.p_dd) >= 999 ? '∞' : n(s.p_dd).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-gray-400">
                    {n(s.avg_confidence).toFixed(0)}%
                  </td>
                  <td className="py-1.5 px-1.5 text-center">
                    {n(s.streak) > 0 ? (
                      <span className="text-green-400">+{n(s.streak)} 🔥</span>
                    ) : n(s.streak) < 0 ? (
                      <span className="text-red-400">{n(s.streak)}</span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
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




