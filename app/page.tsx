'use client';

import { useEffect, useState, useCallback } from 'react';

interface DashboardData {
  btc_price: number;
  last_updated: string;
  performance: {
    balance: number;
    initial_balance: number;
    total_pnl: number;
    today_pnl: number;
    total_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    current_streak: number;
    best_streak: number;
  };
  live_signal: {
    timestamp?: string | null;
    window_start?: string | null;
    window_end?: string | null;
    minute?: number | null;
    btc_price?: number;
    window_open?: number;
    change_pct?: number;
    strategies?: Record<string, { direction: string; confidence: number }>;
    ensemble?: { direction: string; confidence: number };
    market?: { yes_price: number; no_price: number };
    edge?: number;
    action?: string;
    current_trade?: Record<string, unknown> | null;
    orderbook_imbalance?: number;
  } | null;
  strategy_rankings: Array<Record<string, unknown>>;
  recent_trades: Array<Record<string, unknown>>;
  edge_analysis: Record<string, { wins: number; total: number }>;
  minute_stats: Record<string, { wins: number; total: number }>;
  daily_pnl: Array<{ date: string; pnl: number }>;
  gate_status: { atr_pct: number; threshold: number; is_open: boolean };
  gate_stats: { windows_checked: number; windows_traded: number; windows_skipped: number; windows_passed_gate: number };
  funding_rate: { direction: string; confidence: number } | null;
  orderbook_imbalance: number;
  strategies_config: Record<string, number>;
}

function n(v: unknown, d = 0): number {
  const num = Number(v);
  return isNaN(num) ? d : num;
}

function SignalPill({ direction, confidence }: { direction: string; confidence: number }) {
  const color = direction === 'UP' ? 'bg-green-500/20 text-green-400 border-green-500/40'
    : direction === 'DOWN' ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  const icon = direction === 'UP' ? '▲' : direction === 'DOWN' ? '▼' : '—';
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
      {icon} {direction} {confidence > 0 ? `${(confidence * 100).toFixed(0)}%` : ''}
    </span>
  );
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

function GateIndicator({ gate }: { gate: { atr_pct: number; threshold: number; is_open: boolean } }) {
  const isOpen = gate.is_open;
  return (
    <div className={`rounded-xl p-3 border ${isOpen ? 'bg-green-900/15 border-green-700/40' : 'bg-red-900/15 border-red-700/40'}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-gray-400">🚦 VOLATILITY GATE</h2>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {isOpen ? 'OPEN' : 'CLOSED'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[10px] text-gray-500">ATR%</div>
          <div className={`text-lg font-bold font-mono ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
            {gate.atr_pct.toFixed(3)}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 mb-1">Threshold: {gate.threshold}%</div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min((gate.atr_pct / (gate.threshold * 3)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderbookBar({ imbalance }: { imbalance: number }) {
  // imbalance ranges from -1 (all asks) to +1 (all bids)
  const pct = ((imbalance + 1) / 2) * 100; // 0-100, 50 = balanced
  const label = imbalance > 0.15 ? 'Bullish' : imbalance < -0.15 ? 'Bearish' : 'Neutral';
  const color = imbalance > 0.15 ? 'text-green-400' : imbalance < -0.15 ? 'text-red-400' : 'text-gray-400';
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-green-400">Bids</span>
        <span className={`font-bold ${color}`}>{label} ({(imbalance * 100).toFixed(0)}%)</span>
        <span className="text-red-400">Asks</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500/60 h-full transition-all" style={{ width: `${pct}%` }} />
        <div className="bg-red-500/60 h-full transition-all" style={{ width: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [howOpen, setHowOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading BTC Scalper v4...</div>
      </div>
    );
  }

  const perf = data.performance ?? {} as DashboardData['performance'];
  const sig = data.live_signal;
  const rankings = data.strategy_rankings ?? [];
  const trades = data.recent_trades ?? [];
  const edges = data.edge_analysis ?? {};
  const mins = data.minute_stats ?? {};
  const daily = data.daily_pnl ?? [];
  const gate = data.gate_status ?? { atr_pct: 0, threshold: 0.15, is_open: true };
  const gateStats = data.gate_stats ?? { windows_checked: 0, windows_traded: 0, windows_skipped: 0, windows_passed_gate: 0 };
  const fundingRate = data.funding_rate;
  const obImbalance = data.orderbook_imbalance ?? sig?.orderbook_imbalance ?? 0;
  const strategiesConfig = data.strategies_config ?? {};

  const balance = n(perf?.balance, 100);
  const initialBalance = n(perf?.initial_balance, 100);
  const totalPnl = n(perf?.total_pnl);
  const todayPnl = n(perf?.today_pnl);
  const winRate = n(perf?.win_rate);
  const totalTrades = n(perf?.total_trades);
  const wins = n(perf?.wins);
  const currentStreak = n(perf?.current_streak);
  const bestStreak = n(perf?.best_streak);
  const pnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';

  let windowLabel = '';
  if (sig?.window_start && sig?.window_end) {
    const fmt = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    windowLabel = `${fmt(sig.window_start)}-${fmt(sig.window_end)} | Min ${sig.minute ?? '?'}`;
  }

  const tradePrice = sig?.current_trade
    ? n(sig.current_trade.buy_price_cents ?? sig.current_trade.buy_price ?? sig.current_trade.price, 0)
    : 0;
  const tradeDir = sig?.current_trade ? String(sig.current_trade.direction ?? sig.current_trade.side ?? '?') : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-2 md:p-3 max-w-6xl mx-auto text-sm">
      {/* HEADER */}
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">🤖 BTC Scalper <span className="text-xs text-blue-400 font-normal">v4 · 3-Layer</span></h1>
          <div className={`w-2 h-2 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400">{sigActive ? 'Active' : 'Idle'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>BTC <span className="text-white font-semibold">${n(data.btc_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          {windowLabel && <span className="text-blue-400 font-mono">{windowLabel}</span>}
        </div>
      </header>

      {/* ROW 1: Portfolio | Volatility Gate + Binance Data | Live Signal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Portfolio */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">💰 PORTFOLIO</h2>
          <div className="text-xl font-bold">${balance.toFixed(2)}</div>
          <div className={`text-sm font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} <span className="text-xs">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
          </div>
          <div className={`text-xs mt-1 ${todayPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Today: {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700/50">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span className="text-gray-500">Win Rate </span>
                <span className="font-bold">{winRate.toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Trades </span>
                <span className="font-bold">{wins}/{totalTrades}</span>
              </div>
              <div>
                <span className="text-gray-500">Streak </span>
                <span className={`font-bold ${currentStreak >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentStreak > 0 ? '+' : ''}{currentStreak}{currentStreak >= 3 ? ' 🔥' : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Best </span>
                <span className="text-green-400 font-bold">+{bestStreak}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 1: Volatility Gate + Binance Data */}
        <div className="space-y-2">
          <GateIndicator gate={gate} />
          
          {/* Gate Stats */}
          <div className="bg-gray-900 rounded-xl p-2.5 border border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">📊 Gate Selectivity</span>
              <span className="font-bold text-blue-400">
                {gateStats.windows_traded} of {gateStats.windows_checked} traded
              </span>
            </div>
            {gateStats.windows_checked > 0 && (
              <div className="mt-1.5 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: `${(gateStats.windows_traded / gateStats.windows_checked) * 100}%` }} title="Traded" />
                <div className="bg-yellow-500/60 h-full" style={{ width: `${((gateStats.windows_passed_gate - gateStats.windows_traded) / gateStats.windows_checked) * 100}%` }} title="Passed gate, no trade" />
                <div className="bg-red-500/40 h-full" style={{ width: `${(gateStats.windows_skipped / gateStats.windows_checked) * 100}%` }} title="Gate blocked" />
              </div>
            )}
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>🟢 Traded</span>
              <span>🟡 No edge</span>
              <span>🔴 Gate blocked</span>
            </div>
          </div>

          {/* Funding Rate */}
          <div className="bg-gray-900 rounded-xl p-2.5 border border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">💸 Funding Rate</span>
              {fundingRate ? (
                <span className={`font-bold ${fundingRate.direction === 'UP' ? 'text-green-400' : fundingRate.direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                  {fundingRate.direction === 'UP' ? '⬆ Bullish' : fundingRate.direction === 'DOWN' ? '⬇ Bearish' : '— Neutral'}
                  {fundingRate.confidence > 0 && ` (${(fundingRate.confidence * 100).toFixed(0)}%)`}
                </span>
              ) : (
                <span className="text-gray-500">Neutral</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Signal */}
        <div className={`rounded-xl p-3 border ${sigActive ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/20 border-blue-700/50' : 'bg-gray-900 border-gray-700'}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-gray-400">📡 LIVE SIGNAL</h2>
            {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
          </div>
          {!sigActive ? (
            <div className="text-center py-3 text-gray-500 text-xs">
              {!gate.is_open ? '🚫 Gate closed — low volatility' : 'Bot idle'}
            </div>
          ) : sig && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">${n(sig.btc_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className={`text-xs font-semibold ${n(sig.change_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {n(sig.change_pct) >= 0 ? '+' : ''}{n(sig.change_pct).toFixed(3)}%
                </span>
              </div>
              {sig.ensemble && (
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="text-gray-500">Ensemble:</span>
                  <span className={`font-bold ${sig.ensemble.direction === 'UP' ? 'text-green-400' : sig.ensemble.direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                    {sig.ensemble.direction === 'UP' ? '⬆' : sig.ensemble.direction === 'DOWN' ? '⬇' : '—'} {(n(sig.ensemble.confidence) * 100).toFixed(0)}%
                  </span>
                  <span className="text-gray-500">Edge:</span>
                  <span className={`font-bold ${n(sig.edge) >= 0.05 ? 'text-green-400' : 'text-gray-400'}`}>{(n(sig.edge) * 100).toFixed(1)}¢</span>
                </div>
              )}
              {sig.market && (
                <div className="text-xs text-gray-500 mb-2">
                  YES {(n(sig.market.yes_price) * 100).toFixed(1)}¢ / NO {(n(sig.market.no_price) * 100).toFixed(1)}¢
                </div>
              )}
              {sig.current_trade && (
                <div className="text-xs mt-1 text-green-400 font-bold">
                  BOUGHT {tradeDir} @ {tradePrice}¢
                </div>
              )}
              {/* Orderbook */}
              <div className="mt-2">
                <OrderbookBar imbalance={n(obImbalance)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ROW 2: Active Strategies (votes) | Recent Trades */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <div className="md:col-span-3 bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">⚙️ ACTIVE STRATEGIES (5)</h2>
          <div className="space-y-1.5">
            {Object.entries(strategiesConfig).length > 0 ? (
              Object.entries(strategiesConfig).map(([name, weight]) => {
                const vote = sig?.strategies?.[name];
                const dir = vote?.direction ?? 'SKIP';
                const conf = n(vote?.confidence);
                const ranking = rankings.find((r) => String(r.name) === name);
                const liveWr = ranking ? n(ranking.live_win_rate) : 0;
                const liveTrades = ranking ? n(ranking.live_trades) : 0;
                return (
                  <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs truncate">{name}</span>
                        <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 rounded">w:{weight}</span>
                      </div>
                      {liveTrades > 0 && (
                        <div className="text-[10px] text-gray-500">
                          Live: {liveWr.toFixed(0)}% ({liveTrades} trades)
                        </div>
                      )}
                    </div>
                    <SignalPill direction={dir} confidence={conf} />
                  </div>
                );
              })
            ) : (
              // Fallback: show from signal strategies
              sig?.strategies && Object.entries(sig.strategies).map(([name, s]) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                  <span className="font-medium text-xs">{name}</span>
                  <SignalPill direction={s?.direction ?? 'SKIP'} confidence={n(s?.confidence)} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">📋 RECENT TRADES</h2>
          {trades.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs">Waiting for first trade...</div>
          ) : (
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {trades.map((t, i) => {
                const result = String(t.result ?? '');
                const dir = String(t.direction ?? '?');
                const conf = n(t.confidence);
                const profit = n(t.profit);
                const ep = n(t.entry_price);
                const ts = String(t.timestamp ?? '');
                const agreed = Array.isArray(t.strategies_agreed) ? t.strategies_agreed : [];
                const signals = (t.signals || t.indicators || {}) as Record<string, { dir?: string; conf?: number } | string>;
                return (
                  <div key={String(t.id ?? i)} className={`p-2 rounded-lg border text-xs ${
                    result === 'WIN' ? 'bg-green-900/10 border-green-700/30' :
                    result === 'LOSS' ? 'bg-red-900/10 border-red-700/30' :
                    'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{dir === 'UP' ? '⬆️' : '⬇️'}</span>
                        <div>
                          <div className="font-semibold">
                            {(conf * 100).toFixed(0)}% conf
                            {ep > 0 && <span className="text-gray-400 ml-1">@ {ep.toFixed(2)}¢</span>}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{result === 'WIN' ? '✅' : result === 'LOSS' ? '❌' : '⏳'}</div>
                        <div className={`font-bold ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {profit !== 0 ? `${profit > 0 ? '+' : ''}$${profit.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>
                    {/* Strategy votes for this trade */}
                    {Object.keys(signals).length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {Object.entries(signals).map(([sname, sval]) => {
                          const sdir = typeof sval === 'string' ? sval : (sval?.dir ?? 'SKIP');
                          return (
                            <span key={sname} className={`text-[8px] px-1 rounded ${
                              sdir === dir ? 'bg-green-500/15 text-green-400' :
                              sdir === 'SKIP' ? 'bg-gray-500/15 text-gray-500' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {sname.replace(/([A-Z])/g, ' $1').trim().split(' ')[0]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Edge Analysis | Win Rate by Minute | Daily P&L */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Edge Analysis */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">🎯 EDGE ANALYSIS</h2>
          {Object.values(edges).every(b => b.total === 0) ? (
            <div className="text-center py-4 text-gray-500 text-xs">No edge data yet</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(edges).map(([bucket, b]) => {
                const wr = b.total > 0 ? (b.wins / b.total) * 100 : 0;
                return (
                  <div key={bucket}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-300">{bucket}</span>
                      <span className="text-gray-400">{b.wins}/{b.total} ({wr.toFixed(0)}%)</span>
                    </div>
                    <div className="h-4 bg-gray-800 rounded overflow-hidden flex">
                      {b.total > 0 && (
                        <>
                          <div className="bg-green-500 h-full" style={{ width: `${wr}%` }} />
                          <div className="bg-red-500 h-full" style={{ width: `${100 - wr}%` }} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Win Rate by Minute */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">⏱ WIN RATE BY MINUTE</h2>
          {Object.keys(mins).length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs">No minute data yet</div>
          ) : (
            <div className="flex items-end gap-0.5 h-24">
              {Array.from({ length: 15 }, (_, i) => {
                const m = mins[i.toString()];
                const wr = m && m.total > 0 ? (m.wins / m.total) * 100 : 0;
                const total = m?.total || 0;
                const isOptimal = i >= 2 && i <= 7;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="text-[8px] text-gray-500">{total > 0 ? `${wr.toFixed(0)}%` : ''}</div>
                    <div
                      className={`w-full rounded-t ${isOptimal ? 'bg-blue-500' : 'bg-gray-600'} ${wr >= 60 ? '!bg-green-500' : wr > 0 && wr < 50 ? '!bg-red-500' : ''}`}
                      style={{ height: `${Math.max(total > 0 ? wr : 0, 2)}%`, minHeight: total > 0 ? '3px' : '2px' }}
                    />
                    <div className={`text-[8px] ${isOptimal ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>{i}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-[9px] text-gray-600 mt-1">Min 2-7 = optimal entry window</div>
        </div>

        {/* Daily P&L */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">📈 DAILY P&L (7D)</h2>
          {daily.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs">No daily data yet</div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-24">
              {daily.map((d) => {
                const maxAbs = Math.max(...daily.map(x => Math.abs(n(x.pnl))), 0.01);
                const h = (Math.abs(n(d.pnl)) / maxAbs) * 100;
                const pos = n(d.pnl) >= 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className={`text-[10px] font-bold ${pos ? 'text-green-400' : 'text-red-400'}`}>
                      {pos ? '+' : ''}${n(d.pnl).toFixed(0)}
                    </div>
                    <div className={`w-full rounded-t ${pos ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${h}%`, minHeight: '3px' }} />
                    <div className="text-[9px] text-gray-500">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* How It Works - Updated */}
      <section className="bg-gray-900/50 rounded-xl border border-gray-800">
        <button onClick={() => setHowOpen(!howOpen)} className="w-full p-3 flex items-center justify-between text-left">
          <h2 className="text-sm font-bold">📖 How It Works — 3-Layer Architecture</h2>
          <span className="text-gray-500 text-xs">{howOpen ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {howOpen && (
          <div className="px-3 pb-3 space-y-3 text-xs text-gray-300 leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-0.5">🚦 Layer 1: Volatility Gate</h3>
              <p>Before any analysis, we check if the market is volatile enough to trade. ATR% from Binance 1m candles must exceed {gate.threshold}%. Low volatility = skip the window entirely.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">🤖 Layer 2: Strategy Ensemble</h3>
              <p><strong>5 weighted strategies</strong> vote on direction. OpenVsCurrent (w:3.0) is the anchor. BinanceOrderbook (w:2.0) and FundingRate (w:1.5) add Binance data signals. Weighted consensus determines direction + confidence.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">📊 Layer 3: Edge Detection</h3>
              <p>We only trade when our ensemble confidence exceeds the Polymarket price by {(MIN_EDGE * 100).toFixed(0)}¢+. No edge = no trade. Entry restricted to minutes 2-7.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="text-center text-[10px] text-gray-600 mt-2 pb-2">
        BTC Scalper v4 — 3-Layer Architecture · {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </div>
  );
}

const MIN_EDGE = 0.08;
