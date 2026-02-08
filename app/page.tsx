'use client';

import { useEffect, useState, useCallback } from 'react';

interface StrategySignal { direction: string; confidence: number; }
interface LiveSignal {
  timestamp: string | null; window_start: string | null; window_end: string | null;
  minute: number | null; btc_price: number; window_open: number; change_pct: number;
  strategies: Record<string, StrategySignal>;
  ensemble: { direction: string; confidence: number };
  market: { yes_price: number; no_price: number };
  edge: number; action: string;
  current_trade: { direction: string; price: number } | null;
}
interface StrategyRanking {
  name: string; backtest_win_rate: number; backtest_min1_wr: number; backtest_sharpe: number;
  live_trades: number; live_win_rate: number; live_pnl: number; active: boolean;
}
interface Trade {
  id: string; timestamp: string; direction: string; confidence: number;
  entry_price: number; exit_price: number | null; result: string; profit: number;
  edge?: number; entry_minute?: number; strategy?: string;
  strategies_agreed?: string[]; strategies_disagreed?: string[];
}
interface DashboardData {
  btc_price: number; last_updated: string;
  performance: {
    balance: number; initial_balance: number; total_pnl: number; today_pnl: number;
    total_trades: number; wins: number; losses: number; win_rate: number;
    current_streak: number; best_streak: number;
  };
  live_signal: LiveSignal | null;
  strategy_rankings: StrategyRanking[];
  recent_trades: Trade[];
  edge_analysis: Record<string, { wins: number; total: number }>;
  minute_stats: Record<string, { wins: number; total: number }>;
  daily_pnl: Array<{ date: string; pnl: number }>;
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
  return <span className="font-mono text-sm text-yellow-400">{remaining}</span>;
}

function WinRateGauge({ rate, size = 48 }: { rate: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#374151" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={rate >= 60 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444'}
        strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size/2} y={size/2} fill="white" fontSize="11" fontWeight="bold"
        textAnchor="middle" dominantBaseline="central" transform={`rotate(90 ${size/2} ${size/2})`}>
        {rate.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [howOpen, setHowOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await fetch('/api/data'); setData(await res.json()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);

  if (loading || !data) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="text-white animate-pulse">Loading...</div></div>;
  }

  const { performance: perf, live_signal: sig, strategy_rankings: rankings, recent_trades: trades, edge_analysis: edges, minute_stats: mins, daily_pnl: daily } = data;
  const pnlPct = perf.initial_balance > 0 ? (perf.total_pnl / perf.initial_balance) * 100 : 0;
  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';

  const fmt = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const windowLabel = sig?.window_start && sig?.window_end
    ? `${fmt(sig.window_start)}-${fmt(sig.window_end)} | Min ${sig.minute ?? '?'}`
    : '';

  const pnlColor = (v: number) => v >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlSign = (v: number) => v >= 0 ? '+' : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-2 md:p-3">
      {/* ===== TOP BAR ===== */}
      <header className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-1.5 mb-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">BTC Scalper 🤖</span>
          <span className="text-gray-400">BTC</span>
          <span className="text-white font-semibold">${data.btc_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {sig && <span className={`${pnlColor(sig.change_pct)} font-mono`}>{pnlSign(sig.change_pct)}{sig.change_pct.toFixed(3)}%</span>}
        </div>
        <div className="hidden md:flex items-center gap-2 text-blue-400 font-mono">
          {windowLabel && <span>{windowLabel}</span>}
          {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-400">{sigActive ? 'Active' : 'Idle'}</span>
          <span className="text-gray-600">⟳ 30s</span>
        </div>
      </header>

      {/* Mobile window info */}
      {windowLabel && (
        <div className="md:hidden flex items-center justify-between bg-gray-900/50 rounded px-2 py-1 mb-2 text-xs text-blue-400 font-mono">
          <span>{windowLabel}</span>
          {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
        </div>
      )}

      {/* ===== ROW 1: Portfolio | Live Signal | Quick Stats ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Portfolio */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">PORTFOLIO</div>
          <div className="text-2xl font-bold">${perf.balance.toFixed(2)}</div>
          <div className={`text-sm font-semibold ${pnlColor(perf.total_pnl)}`}>
            {pnlSign(perf.total_pnl)}${perf.total_pnl.toFixed(2)} <span className="text-xs">({pnlSign(pnlPct)}{pnlPct.toFixed(1)}%)</span>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            <span>W/R: <span className="text-white font-semibold">{perf.win_rate.toFixed(0)}%</span></span>
            <span>Streak: <span className={pnlColor(perf.current_streak)}>{perf.current_streak > 0 ? '+' : ''}{perf.current_streak}{perf.current_streak >= 3 ? '🔥' : ''}</span></span>
            <span>Best: <span className="text-green-400">+{perf.best_streak}</span></span>
          </div>
        </div>

        {/* Live Signal */}
        <div className={`border rounded-lg p-3 ${sigActive ? 'bg-blue-900/15 border-blue-800/40' : 'bg-gray-900 border-gray-800'}`}>
          <div className="text-xs text-gray-500 mb-1">LIVE SIGNAL</div>
          {!sigActive ? (
            <div className="text-gray-600 text-sm">Idle — no active window</div>
          ) : sig && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">${sig.btc_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className={`text-xs font-semibold ${pnlColor(sig.change_pct)}`}>{pnlSign(sig.change_pct)}{sig.change_pct.toFixed(3)}%</span>
              </div>
              {/* Strategy pills grid */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {Object.entries(sig.strategies).map(([name, s]) => {
                  const c = s.direction === 'UP' ? 'text-green-400' : s.direction === 'DOWN' ? 'text-red-400' : 'text-gray-500';
                  const icon = s.direction === 'UP' ? '▲' : s.direction === 'DOWN' ? '▼' : '—';
                  return (
                    <div key={name} className="bg-black/30 rounded px-1 py-0.5 text-center">
                      <div className="text-[8px] text-gray-600 leading-tight truncate">{name.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className={`text-[10px] font-bold ${c}`}>{icon}{s.confidence > 0 ? ` ${(s.confidence * 100).toFixed(0)}` : ''}</div>
                    </div>
                  );
                })}
              </div>
              {/* Ensemble + Edge + Action */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${sig.ensemble.direction === 'UP' ? 'text-green-400' : sig.ensemble.direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                  {sig.ensemble.direction === 'UP' ? '⬆' : sig.ensemble.direction === 'DOWN' ? '⬇' : '—'} {(sig.ensemble.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-gray-600">|</span>
                <span className={sig.edge >= 0.05 ? 'text-green-400' : sig.edge > 0 ? 'text-yellow-400' : 'text-gray-500'}>Edge {(sig.edge * 100).toFixed(1)}¢</span>
                <span className="text-gray-600">|</span>
                {sig.current_trade
                  ? <span className="text-green-400 font-semibold">BOUGHT {sig.current_trade.direction} @ {sig.current_trade.price.toFixed(0)}¢</span>
                  : <span className="text-yellow-400">{sig.action === 'HOLD' ? 'HOLD' : sig.action}</span>
                }
              </div>
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">STATS</div>
          <div className="flex items-start gap-3">
            <WinRateGauge rate={perf.win_rate} />
            <div className="text-xs space-y-0.5 flex-1">
              <div className="flex justify-between"><span className="text-gray-400">Trades</span><span className="font-semibold">{perf.total_trades}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Wins</span><span className="text-green-400 font-semibold">{perf.wins}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Losses</span><span className="text-red-400 font-semibold">{perf.losses}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Best Streak</span><span className="text-green-400 font-semibold">+{perf.best_streak}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Today P&L</span><span className={`font-semibold ${pnlColor(perf.today_pnl)}`}>{pnlSign(perf.today_pnl)}${perf.today_pnl.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ROW 2: Strategy Leaderboard (60%) | Recent Trades (40%) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        {/* Strategy Leaderboard */}
        <div className="md:col-span-3 bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">🏆 STRATEGY LEADERBOARD</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-1 pr-2">#</th>
                  <th className="text-left py-1">Strategy</th>
                  <th className="text-right py-1 px-1">BT%</th>
                  <th className="text-right py-1 px-1">M1%</th>
                  <th className="text-right py-1 px-1">Sharpe</th>
                  {rankings.some(r => r.live_trades > 0) && <>
                    <th className="text-right py-1 px-1">Live W/R</th>
                    <th className="text-right py-1 px-1">Trades</th>
                    <th className="text-right py-1 px-1">P&L</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => {
                  const rowBg = r.backtest_win_rate >= 0.65 ? 'bg-green-900/10' : r.backtest_win_rate < 0.55 ? 'bg-red-900/5' : '';
                  return (
                    <tr key={r.name} className={`border-b border-gray-800/30 hover:bg-gray-800/30 ${rowBg}`}>
                      <td className="py-1 pr-2 text-gray-600">{i + 1}</td>
                      <td className="py-1 font-medium">
                        {r.name}
                        {r.active && <span className="ml-1 text-[8px] bg-green-500/20 text-green-400 px-1 rounded">ON</span>}
                      </td>
                      <td className={`text-right py-1 px-1 font-semibold ${r.backtest_win_rate >= 0.65 ? 'text-green-400' : r.backtest_win_rate >= 0.55 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {(r.backtest_win_rate * 100).toFixed(0)}%
                      </td>
                      <td className="text-right py-1 px-1">{(r.backtest_min1_wr * 100).toFixed(0)}%</td>
                      <td className="text-right py-1 px-1 text-blue-400">{r.backtest_sharpe.toFixed(1)}</td>
                      {rankings.some(r => r.live_trades > 0) && <>
                        <td className="text-right py-1 px-1">{r.live_trades > 0 ? `${(r.live_win_rate * 100).toFixed(0)}%` : '—'}</td>
                        <td className="text-right py-1 px-1">{r.live_trades || '—'}</td>
                        <td className={`text-right py-1 px-1 ${pnlColor(r.live_pnl)}`}>{r.live_trades > 0 ? `${pnlSign(r.live_pnl)}$${r.live_pnl.toFixed(2)}` : '—'}</td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">📊 RECENT TRADES</div>
          {trades.length === 0 ? (
            <div className="text-gray-600 text-xs">—</div>
          ) : (
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto text-xs">
              {trades.slice(0, 12).map((t) => (
                <div key={t.id} className={`flex items-center justify-between py-1 px-1.5 rounded ${
                  t.result === 'WIN' ? 'bg-green-900/10' : t.result === 'LOSS' ? 'bg-red-900/10' : 'bg-gray-800/30'
                }`}>
                  <span>
                    <span>{t.direction === 'UP' ? '↑' : '↓'}</span>{' '}
                    <span className="font-semibold">{t.direction}</span>{' '}
                    <span className="text-gray-500">{(t.confidence * 100).toFixed(0)}%</span>
                    {t.entry_price > 0 && <span className="text-gray-600"> @ {t.entry_price.toFixed(0)}¢</span>}
                  </span>
                  <span>
                    <span>{t.result === 'WIN' ? '✅' : t.result === 'LOSS' ? '❌' : '⏳'}</span>{' '}
                    <span className={`font-bold ${t.profit > 0 ? 'text-green-400' : t.profit < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {t.profit !== 0 ? `${pnlSign(t.profit)}$${Math.abs(t.profit).toFixed(2)}` : '—'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== ROW 3: Edge Analysis | Win Rate by Minute | Daily P&L ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Edge Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">🎯 EDGE ANALYSIS</div>
          {Object.values(edges).every(b => b.total === 0) ? (
            <div className="text-gray-600 text-xs">—</div>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(edges).map(([bucket, b]) => {
                const wr = b.total > 0 ? (b.wins / b.total) * 100 : 0;
                return (
                  <div key={bucket}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-400">{bucket}</span>
                      <span className="text-gray-500">{b.wins}/{b.total} ({wr.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded overflow-hidden flex">
                      {b.total > 0 && <>
                        <div className="bg-green-500 h-full" style={{ width: `${wr}%` }} />
                        <div className="bg-red-500/50 h-full" style={{ width: `${100 - wr}%` }} />
                      </>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Win Rate by Entry Minute */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">⏱ WIN RATE BY MINUTE</div>
          {Object.keys(mins).length === 0 ? (
            <div className="text-gray-600 text-xs">—</div>
          ) : (
            <>
              <div className="flex items-end gap-px h-20">
                {Array.from({ length: 15 }, (_, i) => {
                  const m = mins[i.toString()];
                  const wr = m && m.total > 0 ? (m.wins / m.total) * 100 : 0;
                  const total = m?.total || 0;
                  const isOptimal = i >= 2 && i <= 7;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center" title={`Min ${i}: ${wr.toFixed(0)}% (${total})`}>
                      <div className={`w-full rounded-t ${isOptimal ? 'bg-blue-500' : 'bg-gray-600'} ${wr >= 60 ? '!bg-green-500' : wr > 0 && wr < 50 ? '!bg-red-500' : ''}`}
                        style={{ height: `${Math.max(total > 0 ? wr : 0, 2)}%`, minHeight: total > 0 ? '3px' : '1px' }} />
                      <div className={`text-[7px] ${isOptimal ? 'text-blue-400' : 'text-gray-700'}`}>{i}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[8px] text-gray-600 mt-0.5">Min 2-7 optimal</div>
            </>
          )}
        </div>

        {/* Daily P&L */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">📈 DAILY P&L</div>
          {daily.length === 0 ? (
            <div className="text-gray-600 text-xs">—</div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-20">
              {daily.map((d) => {
                const maxAbs = Math.max(...daily.map(x => Math.abs(x.pnl)), 0.01);
                const h = (Math.abs(d.pnl) / maxAbs) * 100;
                const pos = d.pnl >= 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className={`text-[9px] font-bold ${pnlColor(d.pnl)}`}>{pnlSign(d.pnl)}${d.pnl.toFixed(0)}</div>
                    <div className={`w-full rounded-t ${pos ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${h}%`, minHeight: '3px' }} />
                    <div className="text-[7px] text-gray-600">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== ROW 4: Collapsible How It Works ===== */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
        <button onClick={() => setHowOpen(!howOpen)} className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 hover:text-gray-300">
          <span className="font-semibold">📖 How It Works</span>
          <span>{howOpen ? '▾' : '▸'}</span>
        </button>
        {howOpen && (
          <div className="px-3 pb-3 text-xs text-gray-400 space-y-2 leading-relaxed">
            <p><span className="text-white font-semibold">🎯 Strategy:</span> Trade Polymarket&apos;s 15-min BTC up/down binary markets. YES tokens pay $1 if BTC goes up.</p>
            <p><span className="text-white font-semibold">🤖 Ensemble:</span> 8 independent strategies (Bollinger, ATR, RSI, Williams %R, volume, trend, wick, open-vs-current) vote every 10s.</p>
            <p><span className="text-white font-semibold">⚖️ Voting:</span> Weighted by each strategy&apos;s backtested win rate at that specific entry minute.</p>
            <p><span className="text-white font-semibold">📊 Edge:</span> Only trade when ensemble confidence exceeds market price. 70% conf vs 65¢ = 5¢ edge.</p>
            <p><span className="text-white font-semibold">⏱️ Window:</span> Enter at minutes 2-7. Too early = no data, too late = already priced in.</p>
            <p><span className="text-white font-semibold">🏆 Tracking:</span> Each strategy tracked individually. Continuous optimization.</p>
          </div>
        )}
      </div>

      <footer className="text-center text-[10px] text-gray-700 mt-1 pb-1">
        BTC Scalper v3 · {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </div>
  );
}
