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
  } | null;
  strategy_rankings: Array<Record<string, unknown>>;
  recent_trades: Array<Record<string, unknown>>;
  edge_analysis: Record<string, { wins: number; total: number }>;
  minute_stats: Record<string, { wins: number; total: number }>;
  daily_pnl: Array<{ date: string; pnl: number }>;
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
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading BTC Scalper...</div>
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
          <h1 className="text-lg font-bold">🤖 BTC Scalper</h1>
          <div className={`w-2 h-2 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-400">{sigActive ? 'Active' : 'Idle'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>BTC <span className="text-white font-semibold">${n(data.btc_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          {windowLabel && <span className="text-blue-400 font-mono">{windowLabel}</span>}
        </div>
      </header>

      {/* ROW 1: Portfolio | Live Signal | Quick Stats */}
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
        </div>

        {/* Live Signal */}
        <div className={`rounded-xl p-3 border ${sigActive ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/20 border-blue-700/50' : 'bg-gray-900 border-gray-700'}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-gray-400">📡 LIVE SIGNAL</h2>
            {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
          </div>
          {!sigActive ? (
            <div className="text-center py-3 text-gray-500 text-xs">Bot idle</div>
          ) : sig && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">${n(sig.btc_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className={`text-xs font-semibold ${n(sig.change_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {n(sig.change_pct) >= 0 ? '+' : ''}{n(sig.change_pct).toFixed(3)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {sig.strategies && Object.entries(sig.strategies).map(([name, s]) => (
                  <SignalPill key={name} direction={s?.direction ?? 'SKIP'} confidence={n(s?.confidence)} />
                ))}
              </div>
              {sig.ensemble && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Ensemble:</span>
                  <span className={`font-bold ${sig.ensemble.direction === 'UP' ? 'text-green-400' : sig.ensemble.direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                    {sig.ensemble.direction === 'UP' ? '⬆' : sig.ensemble.direction === 'DOWN' ? '⬇' : '—'} {(n(sig.ensemble.confidence) * 100).toFixed(0)}%
                  </span>
                  <span className="text-gray-500">Edge:</span>
                  <span className={`font-bold ${n(sig.edge) >= 0.05 ? 'text-green-400' : 'text-gray-400'}`}>{(n(sig.edge) * 100).toFixed(1)}¢</span>
                </div>
              )}
              {sig.current_trade && (
                <div className="text-xs mt-1 text-green-400 font-bold">
                  BOUGHT {tradeDir} @ {tradePrice}¢
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">📊 QUICK STATS</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Win Rate</div>
              <div className="text-lg font-bold">{winRate.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-gray-500">Trades</div>
              <div className="text-lg font-bold">{wins}/{totalTrades}</div>
            </div>
            <div>
              <div className="text-gray-500">Streak</div>
              <div className={`font-bold ${currentStreak >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {currentStreak > 0 ? '+' : ''}{currentStreak}{currentStreak >= 3 ? ' 🔥' : ''}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Best</div>
              <div className="text-green-400 font-bold">+{bestStreak}</div>
            </div>
            {sig?.market && (
              <>
                <div>
                  <div className="text-gray-500">YES/NO</div>
                  <div className="font-bold">{n(sig.market.yes_price).toFixed(2)}¢ / {n(sig.market.no_price).toFixed(2)}¢</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Strategy Leaderboard (60%) | Recent Trades (40%) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <div className="md:col-span-3 bg-gray-900 rounded-xl p-3 border border-gray-700">
          <h2 className="text-xs font-bold text-gray-400 mb-2">🏆 STRATEGY LEADERBOARD</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Strategy</th>
                  <th className="text-right py-1">BT%</th>
                  <th className="text-right py-1">M1%</th>
                  <th className="text-right py-1">Sharpe</th>
                  <th className="text-right py-1">Live W/R</th>
                  <th className="text-right py-1">Live P&L</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => {
                  const btWr = n(r.backtest_win_rate);
                  const m1Wr = n(r.backtest_min1_wr);
                  const sharpe = n(r.backtest_sharpe);
                  const lt = n(r.live_trades);
                  const lwr = n(r.live_win_rate);
                  const lpnl = n(r.live_pnl);
                  return (
                    <tr key={String(r.name ?? i)} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-1 text-gray-500">{i + 1}</td>
                      <td className="py-1 font-medium">
                        {String(r.name ?? '?')}
                        {Boolean(r.active) && <span className="ml-1 text-[9px] bg-green-500/20 text-green-400 px-1 rounded-full">ON</span>}
                      </td>
                      <td className={`text-right py-1 font-semibold ${btWr >= 0.65 ? 'text-green-400' : btWr >= 0.55 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {(btWr * 100).toFixed(0)}%
                      </td>
                      <td className="text-right py-1">{(m1Wr * 100).toFixed(0)}%</td>
                      <td className="text-right py-1 text-blue-400">{sharpe.toFixed(1)}</td>
                      <td className="text-right py-1">{lt > 0 ? `${lwr.toFixed(0)}%` : '—'}</td>
                      <td className={`text-right py-1 ${lpnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {lt > 0 ? `${lpnl >= 0 ? '+' : ''}$${lpnl.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                return (
                  <div key={String(t.id ?? i)} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                    result === 'WIN' ? 'bg-green-900/10 border-green-700/30' :
                    result === 'LOSS' ? 'bg-red-900/10 border-red-700/30' :
                    'bg-gray-800/50 border-gray-700/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{dir === 'UP' ? '⬆️' : '⬇️'}</span>
                      <div>
                        <div className="font-semibold">
                          {(conf * 100).toFixed(0)}% conf
                          {ep > 0 && <span className="text-gray-400 ml-1">@ {ep.toFixed(2)}¢</span>}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {ts ? new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          {agreed.length > 0 && <span className="ml-1 text-green-500">✓ {agreed.join(', ')}</span>}
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

      {/* How It Works - Collapsed */}
      <section className="bg-gray-900/50 rounded-xl border border-gray-800">
        <button onClick={() => setHowOpen(!howOpen)} className="w-full p-3 flex items-center justify-between text-left">
          <h2 className="text-sm font-bold">📖 How It Works</h2>
          <span className="text-gray-500 text-xs">{howOpen ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {howOpen && (
          <div className="px-3 pb-3 space-y-3 text-xs text-gray-300 leading-relaxed">
            <div>
              <h3 className="text-white font-semibold mb-0.5">🎯 The Strategy</h3>
              <p>We trade Polymarket&apos;s 15-minute BTC up/down binary markets. YES tokens pay $1 if BTC goes up, $0 if down.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">🤖 The Ensemble</h3>
              <p><strong>8 independent strategies</strong> analyze BTC price action from different angles. Every 10 seconds, each votes UP, DOWN, or SKIP with a confidence level.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">⚖️ Weighted Voting</h3>
              <p>Votes are weighted by each strategy&apos;s backtested win rate at that specific entry minute.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">📊 Edge Detection</h3>
              <p>We only trade when ensemble confidence exceeds the market price. No edge = no trade.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-0.5">⏱️ Entry Window</h3>
              <p>Trades enter at minutes 2-7 of each 15-minute window — the sweet spot between signal and opportunity.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="text-center text-[10px] text-gray-600 mt-2 pb-2">
        BTC Scalper v2 — Multi-Strategy Ensemble · {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </div>
  );
}
