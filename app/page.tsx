'use client';

import { useEffect, useState, useCallback } from 'react';

interface StrategySignal {
  direction: string;
  confidence: number;
}

interface LiveSignal {
  timestamp: string | null;
  window_start: string | null;
  window_end: string | null;
  minute: number | null;
  btc_price: number;
  window_open: number;
  change_pct: number;
  strategies: Record<string, StrategySignal>;
  ensemble: { direction: string; confidence: number };
  market: { yes_price: number; no_price: number };
  edge: number;
  action: string;
  current_trade: { direction: string; price: number } | null;
}

interface StrategyRanking {
  name: string;
  backtest_win_rate: number;
  backtest_min1_wr: number;
  backtest_sharpe: number;
  live_trades: number;
  live_win_rate: number;
  live_pnl: number;
  active: boolean;
}

interface Trade {
  id: string;
  timestamp: string;
  direction: string;
  confidence: number;
  entry_price: number;
  exit_price: number | null;
  result: string;
  profit: number;
  edge?: number;
  entry_minute?: number;
  strategy?: string;
  strategies_agreed?: string[];
  strategies_disagreed?: string[];
}

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
  live_signal: LiveSignal | null;
  strategy_rankings: StrategyRanking[];
  recent_trades: Trade[];
  edge_analysis: Record<string, { wins: number; total: number }>;
  minute_stats: Record<string, { wins: number; total: number }>;
  daily_pnl: Array<{ date: string; pnl: number }>;
}

function SignalPill({ direction, confidence }: { direction: string; confidence: number }) {
  const color = direction === 'UP' ? 'bg-green-500/20 text-green-400 border-green-500/40'
    : direction === 'DOWN' ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  const icon = direction === 'UP' ? '▲' : direction === 'DOWN' ? '▼' : '—';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${color}`}>
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
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [windowEnd]);
  return <span className="font-mono text-2xl text-yellow-400">{remaining}</span>;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { performance: perf, live_signal: sig, strategy_rankings: rankings, recent_trades: trades, edge_analysis: edges, minute_stats: mins, daily_pnl: daily } = data;
  const pnlPct = perf.initial_balance > 0 ? (perf.total_pnl / perf.initial_balance) * 100 : 0;
  const sigActive = sig && sig.timestamp && sig.action !== 'IDLE';

  // Window info
  let windowLabel = '';
  if (sig?.window_start && sig?.window_end) {
    const fmt = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    windowLabel = `Window ${fmt(sig.window_start)}-${fmt(sig.window_end)} | Min ${sig.minute ?? '?'}`;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* ===== HEADER ===== */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl md:text-3xl font-bold">🤖 BTC Scalper</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${sigActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm text-gray-400">{sigActive ? 'Active' : 'Idle'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between text-sm text-gray-400 gap-2">
          <div>BTC <span className="text-white font-semibold">${data.btc_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          {windowLabel && <div className="text-blue-400 font-mono text-xs">{windowLabel}</div>}
          <div className="text-xs">Auto-refresh 30s</div>
        </div>
      </header>

      {/* ===== SECTION 1: PORTFOLIO ===== */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Balance</div>
            <div className="text-2xl font-bold">${perf.balance.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${perf.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {perf.total_pnl >= 0 ? '+' : ''}${perf.total_pnl.toFixed(2)}
              <span className="text-sm ml-1">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Today</div>
            <div className={`text-2xl font-bold ${perf.today_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {perf.today_pnl >= 0 ? '+' : ''}${perf.today_pnl.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{perf.win_rate.toFixed(0)}%
              <span className="text-sm text-gray-400 ml-1">{perf.wins}/{perf.total_trades}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span>Streak: <span className={`font-bold ${perf.current_streak >= 0 ? 'text-green-400' : 'text-red-400'}`}>{perf.current_streak > 0 ? '+' : ''}{perf.current_streak}{perf.current_streak >= 3 ? ' 🔥' : ''}</span></span>
          <span>Best: <span className="text-green-400 font-bold">+{perf.best_streak}</span></span>
        </div>
      </section>

      {/* ===== SECTION 2: LIVE SIGNAL PANEL ===== */}
      <section className={`rounded-2xl p-5 mb-5 border ${sigActive ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/20 border-blue-700/50' : 'bg-gray-900 border-gray-700'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">📡 Live Signal</h2>
          {sig?.window_end && <Countdown windowEnd={sig.window_end} />}
        </div>

        {!sigActive ? (
          <div className="text-center py-6 text-gray-500">No active window — bot is idle</div>
        ) : sig && (
          <>
            {/* BTC price + change */}
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold">${sig.btc_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <span className={`text-sm font-semibold ${sig.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {sig.change_pct >= 0 ? '+' : ''}{sig.change_pct.toFixed(3)}%
              </span>
            </div>

            {/* Strategy signals */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(sig.strategies).map(([name, s]) => (
                <div key={name} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-500 leading-none">{name.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <SignalPill direction={s.direction} confidence={s.confidence} />
                </div>
              ))}
            </div>

            {/* Ensemble + Market + Edge */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/30 rounded-xl p-3 mb-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Ensemble</div>
                <div className={`text-xl font-bold ${sig.ensemble.direction === 'UP' ? 'text-green-400' : sig.ensemble.direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                  {sig.ensemble.direction === 'UP' ? '⬆' : sig.ensemble.direction === 'DOWN' ? '⬇' : '—'} {(sig.ensemble.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Market YES/NO</div>
                <div className="text-xl font-bold">{sig.market.yes_price.toFixed(2)}¢ / {sig.market.no_price.toFixed(2)}¢</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Edge</div>
                <div className={`text-xl font-bold ${sig.edge >= 0.05 ? 'text-green-400' : sig.edge > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {(sig.edge * 100).toFixed(1)}¢
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Action</div>
                <div className="text-sm font-bold mt-1">
                  {sig.current_trade
                    ? <span className="text-green-400">BOUGHT {sig.current_trade.direction} @ {sig.current_trade.price.toFixed(2)}¢</span>
                    : <span className="text-yellow-400">{sig.action === 'HOLD' ? 'HOLDING — waiting for edge' : sig.action}</span>
                  }
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ===== SECTION 3: STRATEGY LEADERBOARD ===== */}
      <section className="bg-gray-900 rounded-xl p-5 mb-5 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">🏆 Strategy Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Strategy</th>
                <th className="text-right py-2">BT Win%</th>
                <th className="text-right py-2">Min1 Win%</th>
                <th className="text-right py-2">Sharpe</th>
                <th className="text-right py-2">Live W/R</th>
                <th className="text-right py-2">Live Trades</th>
                <th className="text-right py-2">Live P&L</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <tr key={r.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-gray-500">{i + 1}</td>
                  <td className="py-2 font-medium">
                    {r.name}
                    {r.active && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                  </td>
                  <td className={`text-right py-2 font-semibold ${r.backtest_win_rate >= 0.65 ? 'text-green-400' : r.backtest_win_rate >= 0.55 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(r.backtest_win_rate * 100).toFixed(0)}%
                  </td>
                  <td className="text-right py-2">{(r.backtest_min1_wr * 100).toFixed(0)}%</td>
                  <td className="text-right py-2 text-blue-400">{r.backtest_sharpe.toFixed(1)}</td>
                  <td className="text-right py-2">{r.live_trades > 0 ? `${(r.live_win_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td className="text-right py-2">{r.live_trades || '—'}</td>
                  <td className={`text-right py-2 ${r.live_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.live_trades > 0 ? `${r.live_pnl >= 0 ? '+' : ''}$${r.live_pnl.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== SECTION 4: RECENT TRADES ===== */}
      <section className="bg-gray-900 rounded-xl p-5 mb-5 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">📊 Recent Trades</h2>
        {trades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Waiting for first trade...</div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {trades.map((t) => (
              <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                t.result === 'WIN' ? 'bg-green-900/10 border-green-700/30' :
                t.result === 'LOSS' ? 'bg-red-900/10 border-red-700/30' :
                'bg-gray-800/50 border-gray-700/50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.direction === 'UP' ? '⬆️' : '⬇️'}</span>
                  <div>
                    <div className="text-sm font-semibold">
                      {(t.confidence * 100).toFixed(0)}% conf
                      {t.entry_price > 0 && <span className="text-gray-400 ml-2">@ {t.entry_price.toFixed(2)}¢</span>}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(t.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {t.strategies_agreed && t.strategies_agreed.length > 0 && (
                        <span className="ml-2 text-green-500">✓ {t.strategies_agreed.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div>{t.result === 'WIN' ? '✅' : t.result === 'LOSS' ? '❌' : '⏳'}</div>
                  <div className={`text-sm font-bold ${t.profit > 0 ? 'text-green-400' : t.profit < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {t.profit !== 0 ? `${t.profit > 0 ? '+' : ''}$${t.profit.toFixed(2)}` : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== SECTION 5: EDGE ANALYSIS ===== */}
      <section className="bg-gray-900 rounded-xl p-5 mb-5 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">🎯 Edge Analysis</h2>
        {Object.values(edges).every(b => b.total === 0) ? (
          <div className="text-center py-6 text-gray-500">No edge data yet — trades will populate this</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(edges).map(([bucket, b]) => {
              const wr = b.total > 0 ? (b.wins / b.total) * 100 : 0;
              return (
                <div key={bucket}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{bucket} edge</span>
                    <span className="text-gray-400">{b.wins}/{b.total} ({wr.toFixed(0)}% win)</span>
                  </div>
                  <div className="h-6 bg-gray-800 rounded-lg overflow-hidden flex">
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
      </section>

      {/* ===== SECTION 6: WIN RATE BY ENTRY MINUTE ===== */}
      <section className="bg-gray-900 rounded-xl p-5 mb-5 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">⏱ Win Rate by Entry Minute</h2>
        {Object.keys(mins).length === 0 ? (
          <div className="text-center py-6 text-gray-500">No minute data yet</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 15 }, (_, i) => {
              const m = mins[i.toString()];
              const wr = m && m.total > 0 ? (m.wins / m.total) * 100 : 0;
              const total = m?.total || 0;
              const isOptimal = i >= 2 && i <= 7;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] text-gray-500">{total > 0 ? `${wr.toFixed(0)}%` : ''}</div>
                  <div
                    className={`w-full rounded-t transition-all ${isOptimal ? 'bg-blue-500' : 'bg-gray-600'} ${wr >= 60 ? '!bg-green-500' : wr > 0 && wr < 50 ? '!bg-red-500' : ''}`}
                    style={{ height: `${Math.max(total > 0 ? wr : 0, 2)}%`, minHeight: total > 0 ? '4px' : '2px' }}
                  />
                  <div className={`text-[9px] ${isOptimal ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>{i}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="text-[10px] text-gray-600 mt-2">Minutes 2-7 highlighted (optimal entry window)</div>
      </section>

      {/* ===== SECTION 7: DAILY P&L ===== */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">📈 Daily P&L (Last 7 Days)</h2>
        {daily.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No daily data yet</div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-28">
            {daily.map((d) => {
              const maxAbs = Math.max(...daily.map(x => Math.abs(x.pnl)), 0.01);
              const h = (Math.abs(d.pnl) / maxAbs) * 100;
              const pos = d.pnl >= 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`text-xs font-bold ${pos ? 'text-green-400' : 'text-red-400'}`}>
                    {pos ? '+' : ''}${d.pnl.toFixed(0)}
                  </div>
                  <div className={`w-full rounded-t ${pos ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${h}%`, minHeight: '4px' }} />
                  <div className="text-[10px] text-gray-500">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
        <h2 className="text-lg font-bold mb-4">📖 How It Works</h2>
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <div>
            <h3 className="text-white font-semibold mb-1">🎯 The Strategy</h3>
            <p>We trade Polymarket&apos;s 15-minute BTC up/down binary markets. Every 15 minutes, a new market opens asking: &quot;Will BTC go up or down in the next 15 minutes?&quot; YES tokens pay $1 if BTC goes up, $0 if down.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">🤖 The Ensemble</h3>
            <p>We run <strong>8 independent strategies</strong> simultaneously — each analyzing BTC price action from a different angle (Bollinger Bands, ATR breakouts, RSI divergence, Williams %R, volume analysis, trend strength, candle wick patterns, and open-vs-current price). Every 10 seconds, each strategy votes UP, DOWN, or SKIP with a confidence level.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">⚖️ Weighted Voting</h3>
            <p>Votes are weighted by each strategy&apos;s <strong>backtested win rate at that specific entry minute</strong>. ATR Breakout at minute 3 (75% historical accuracy) gets more weight than WickRatio at minute 3 (53%). The ensemble combines all weighted votes into a single direction + confidence score.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">📊 Edge Detection</h3>
            <p>We only trade when our ensemble confidence <strong>exceeds the market price</strong>. If we&apos;re 70% confident BTC goes up but YES tokens cost 65¢, that&apos;s a 5¢ edge. If YES is already at 75¢, there&apos;s no edge — we hold. This is how we avoid overpaying.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">⏱️ Entry Window</h3>
            <p>We enter trades at <strong>minutes 2-7</strong> of each 15-minute window. Too early (min 0-1) = not enough data. Too late (min 8+) = market already priced the move in. The sweet spot gives us enough signal while still having time to profit.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">🏆 Strategy Tracking</h3>
            <p>Each strategy is individually tracked. When the ensemble places a trade, every strategy that voted with the ensemble gets credit (or blame) for the outcome. This lets us see which strategies actually contribute edge vs which are dead weight — and we continuously add new strategies from backtesting.</p>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs text-gray-600 mt-6 pb-4">
        BTC Scalper v2 — Multi-Strategy Ensemble · Updated {new Date(data.last_updated).toLocaleTimeString()}
      </footer>
    </div>
  );
}
