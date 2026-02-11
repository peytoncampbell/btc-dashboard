'use client';
import { n } from './utils';

import { useEffect, useState } from 'react';

interface LiveSignalProps {
  signal: {
    timestamp?: string | null;
    window_start?: string | null;
    window_end?: string | null;
    minute?: number | null;
    btc_price?: number;
    change_pct?: number;
    ensemble?: { direction: string; confidence: number };
    market?: { yes_price: number; no_price: number };
    edge?: number;
    action?: string;
    current_trade?: Record<string, unknown> | null;
    orderbook_imbalance?: number;
  } | null;
  gateStatus: { atr_pct: number; threshold: number; is_open: boolean };
  obImbalance: number;
}

function Countdown({ windowEnd }: { windowEnd: string | null }) {
  const [remaining, setRemaining] = useState('--:--');
  useEffect(() => {
    if (!windowEnd) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(windowEnd).getTime() - Date.now()) / 1000));
      setRemaining(`${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [windowEnd]);
  return <span className="font-mono text-lg text-yellow-400">{remaining}</span>;
}

function OrderbookBar({ imbalance }: { imbalance: number }) {
  const pct = ((imbalance + 1) / 2) * 100;
  const label = imbalance > 0.15 ? 'Bullish' : imbalance < -0.15 ? 'Bearish' : 'Neutral';
  const color = imbalance > 0.15 ? 'text-green-400' : imbalance < -0.15 ? 'text-red-400' : 'text-gray-400';
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-green-400">Bids</span>
        <span className={`font-bold ${color}`}>
          {label} ({(imbalance * 100).toFixed(0)}%)
        </span>
        <span className="text-red-400">Asks</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500/60 h-full transition-all" style={{ width: `${pct}%` }} />
        <div className="bg-red-500/60 h-full transition-all" style={{ width: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

export default function LiveSignal({ signal, gateStatus, obImbalance }: LiveSignalProps) {
  const sig = signal;
  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';
  const gate = gateStatus;

  const tradePrice = sig?.current_trade
    ? Number(sig.current_trade.buy_price_cents ?? sig.current_trade.buy_price ?? sig.current_trade.price ?? 0)
    : 0;
  const tradeDir = sig?.current_trade
    ? String(sig.current_trade.direction ?? sig.current_trade.side ?? '?')
    : '';

  return (
    <div
      className={`rounded-xl p-3 border ${
        sigActive
          ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/20 border-blue-700/50'
          : 'bg-gray-900 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-gray-400">📡 LIVE SIGNAL</h2>
        {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
      </div>
      {!sigActive ? (
        <div className="text-center py-3 text-gray-500 text-xs">
          {!gate.is_open ? '🚫 Gate closed — low volatility' : 'Bot idle'}
        </div>
      ) : (
        sig && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold">
                ${(sig.btc_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-semibold ${
                  (sig.change_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {(sig.change_pct || 0) >= 0 ? '+' : ''}
                {n(sig.change_pct || 0).toFixed(3)}%
              </span>
            </div>
            {sig.ensemble && (
              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="text-gray-500">Ensemble:</span>
                <span
                  className={`font-bold ${
                    sig.ensemble.direction === 'UP'
                      ? 'text-green-400'
                      : sig.ensemble.direction === 'DOWN'
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {sig.ensemble.direction === 'UP' ? '⬆' : sig.ensemble.direction === 'DOWN' ? '⬇' : '—'}{' '}
                  {(sig.ensemble.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-gray-500">Edge:</span>
                <span className={`font-bold ${(sig.edge || 0) >= 0.05 ? 'text-green-400' : 'text-gray-400'}`}>
                  {((sig.edge || 0) * 100).toFixed(1)}¢
                </span>
              </div>
            )}
            {sig.market && (
              <div className="text-xs text-gray-500 mb-2">
                YES {(sig.market.yes_price * 100).toFixed(1)}¢ / NO {(n(sig.market.no_price) * 100).toFixed(1)}¢
              </div>
            )}
            {sig.current_trade && (
              <div className="text-xs mt-1 text-green-400 font-bold">
                BOUGHT {tradeDir} @ {tradePrice}¢
              </div>
            )}
            <div className="mt-2">
              <OrderbookBar imbalance={obImbalance} />
            </div>
          </>
        )
      )}
    </div>
  );
}




