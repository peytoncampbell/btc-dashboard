'use client';

import { n } from './utils';

interface Trade {
  id?: number | string;
  timestamp: string;
  strategy?: string;
  direction?: string;  // UP or DOWN from backend
  buy_price?: number;  // Polymarket contract price (0-1)
  buy_price_cents?: number;
  btc_entry?: number;  // BTC price at entry
  btc_open?: number;   // BTC price at window open
  btc_close?: number;  // BTC price at window close
  result?: string;
  profit?: number;
  entry_minute?: number;
  confidence?: number;
}

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades = [] }: RecentTradesProps) {
  const recentTrades = trades.slice(0, 20);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isUp = (dir?: string) => dir === 'UP' || dir === 'LONG';
  const isDown = (dir?: string) => dir === 'DOWN' || dir === 'SHORT';

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Trades</h3>
        <span className="text-xs text-gray-500">({recentTrades.length})</span>
      </div>

      {recentTrades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No trades yet</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentTrades.map((trade, index) => (
            <div
              key={trade.id || index}
              className={`p-3 rounded-lg border transition-colors ${
                trade.result === 'WIN'
                  ? 'bg-green-900/20 border-green-800/30'
                  : trade.result === 'LOSS'
                  ? 'bg-red-900/20 border-red-800/30'
                  : 'bg-gray-800/30 border-gray-700/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    isUp(trade.direction)
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : isDown(trade.direction)
                      ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                      : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                  }`}>
                    {trade.direction === 'UP' ? '▲ UP' : trade.direction === 'DOWN' ? '▼ DOWN' : trade.direction || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatDate(trade.timestamp)}
                  </span>
                  <span className="text-sm font-mono text-gray-400">
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
                
                <div className={`text-sm font-bold ${
                  trade.result === 'WIN'
                    ? 'text-green-400'
                    : trade.result === 'LOSS'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {trade.profit != null ? (
                    <>
                      {n(trade.profit) >= 0 ? '+' : ''}${n(trade.profit).toFixed(2)}
                    </>
                  ) : (
                    trade.result || 'PENDING'
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium">
                  {trade.strategy || 'Unknown Strategy'}
                </span>
                <div className="flex items-center gap-3">
                  {trade.btc_entry != null && (
                    <span className="text-gray-400">
                      BTC: ${n(trade.btc_entry).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {trade.buy_price != null && (
                    <span>
                      Buy: {n(trade.buy_price_cents ?? Math.round(n(trade.buy_price) * 100))}¢
                    </span>
                  )}
                  {trade.confidence != null && (
                    <span>
                      Conf: {(n(trade.confidence) * 100).toFixed(0)}%
                    </span>
                  )}
                  {trade.entry_minute != null && (
                    <span>
                      Min: {trade.entry_minute}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}