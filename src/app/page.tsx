"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = "https://dashboard.peytoncampbell.ca";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const REFRESH_MS = 30_000;

type Tab = "paper" | "live";
type SortKey = string;
type SortDir = "asc" | "desc";

async function api<T = unknown>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE}${path}`, { headers: { "X-API-Key": API_KEY } });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

function Badge({ ok }: { ok: boolean }) {
  return <span>{ok ? "✅" : "❌"}</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 flex flex-col gap-1">
      <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-xl sm:text-2xl font-bold ${color ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

interface TableRow {
  name: string;
  status: string;
  total_pnl: number;
  win_rate: number;
  pdd: number;
  trades: number;
}

function MobileStrategyCards({ rows, pnlColor, fmt }: { rows: TableRow[]; pnlColor: (n: number) => string; fmt: (n: number, d?: number) => string }) {
  return (
    <div className="sm:hidden space-y-2 p-3">
      {rows.map((row) => (
        <div key={row.name} className={`bg-gray-950 rounded-lg p-3 ${row.status === "SHADOW" ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm truncate mr-2">{row.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
              row.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-800 text-gray-400"
            }`}>{row.status}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-500">P&L</span><br/><span className={`font-mono ${pnlColor(row.total_pnl)}`}>${fmt(row.total_pnl)}</span></div>
            <div><span className="text-gray-500">WR</span><br/><span className="font-mono">{fmt(row.win_rate * 100, 1)}%</span></div>
            <div><span className="text-gray-500">Trades</span><br/><span className="font-mono">{row.trades}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileSignalCards({ signals, fmt }: { signals: Signal[]; fmt: (n: number, d?: number) => string }) {
  return (
    <div className="sm:hidden space-y-2 p-3">
      {signals.slice(0, 30).map((sig) => (
        <div key={sig.id} className="bg-gray-950 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm truncate mr-2">{sig.strategy_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              sig.outcome === "WIN" ? "bg-emerald-900/50 text-emerald-400"
                : sig.outcome === "LOSS" ? "bg-red-900/50 text-red-400"
                : "bg-yellow-900/50 text-yellow-400"
            }`}>{sig.outcome ?? "pending"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className={`font-bold ${sig.direction === "UP" ? "text-emerald-400" : "text-red-400"}`}>{sig.direction}</span>
            {sig.buy_price != null && <span className="font-mono">${Number(sig.buy_price).toFixed(2)}</span>}
            <span>{(() => { try { return new Date(sig.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return sig.timestamp; } })()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface HealthData {
  status: string;
  signal_engine?: { ts?: string } | null;
  paper_trader?: { ts?: string } | null;
  live_trader?: { ts?: string } | null;
  wallet_balance?: number;
  [key: string]: unknown;
}

interface StatRow {
  strategy_name: string;
  total_trades: number;
  wins: number;
  losses: number;
  total_pnl: number;
  max_drawdown: number;
  win_rate: number;
}

interface StrategyInfo {
  name: string;
  status: string;
  description: string;
  paper_stats?: StatRow;
}

interface Signal {
  id: number;
  strategy_name: string;
  direction: string;
  buy_price?: number;
  confidence?: number;
  timestamp: string;
  outcome?: string;
}

interface EquityPoint {
  t: string;
  b: number;
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("paper");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [paperStats, setPaperStats] = useState<StatRow[]>([]);
  const [liveStats, setLiveStats] = useState<StatRow[]>([]);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [paperEquity, setPaperEquity] = useState<EquityPoint[]>([]);
  const [liveEquity, setLiveEquity] = useState<EquityPoint[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("total_pnl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [apiOk, setApiOk] = useState(false);

  const refresh = useCallback(async () => {
    const [h, ps, ls, strats, sigs, pe, le] = await Promise.all([
      api<HealthData>("/api/health"),
      api<{ stats: StatRow[] }>("/api/stats?mode=paper"),
      api<{ stats: StatRow[] }>("/api/stats?mode=live"),
      api<{ strategies: StrategyInfo[] }>("/api/strategies"),
      api<{ signals: Signal[] }>("/api/signals?limit=50"),
      api<{ equity: EquityPoint[] }>("/api/equity?mode=paper&points=300"),
      api<{ equity: EquityPoint[] }>("/api/equity?mode=live&points=300"),
    ]);
    setApiOk(h !== null);
    if (h) setHealth(h);
    if (ps) setPaperStats(ps.stats);
    if (ls) setLiveStats(ls.stats);
    if (strats) setStrategies(strats.strategies);
    if (sigs) setSignals(sigs.signals);
    if (pe) setPaperEquity(pe.equity);
    if (le) setLiveEquity(le.equity);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const strategyMap = useMemo(() => {
    const m: Record<string, StrategyInfo> = {};
    strategies.forEach((s) => (m[s.name] = s));
    return m;
  }, [strategies]);

  const activeStratNames = useMemo(() => {
    const s = new Set<string>();
    strategies.filter((st) => st.status === "ACTIVE").forEach((st) => s.add(st.name));
    return s;
  }, [strategies]);

  // Build rows for the current tab

  const currentStats = tab === "paper" ? paperStats : liveStats;

  const tableRows: TableRow[] = useMemo(() => {
    if (tab === "paper") {
      // All strategies — use paperStats + any strategies without stats
      const seen = new Set<string>();
      const rows: TableRow[] = paperStats.map((s) => {
        seen.add(s.strategy_name);
        const info = strategyMap[s.strategy_name];
        const dd = s.max_drawdown ?? 0;
        return {
          name: s.strategy_name,
          status: info?.status ?? "UNKNOWN",
          total_pnl: s.total_pnl,
          win_rate: s.win_rate,
          pdd: dd > 0 ? s.total_pnl / dd : 0,
          trades: s.total_trades,
        };
      });
      // Add strategies with no paper stats yet
      strategies.forEach((st) => {
        if (!seen.has(st.name)) {
          rows.push({ name: st.name, status: st.status, total_pnl: 0, win_rate: 0, pdd: 0, trades: 0 });
        }
      });
      return rows;
    } else {
      // Live tab: only ACTIVE strategies
      return liveStats
        .filter((s) => activeStratNames.has(s.strategy_name))
        .map((s) => {
          const dd = s.max_drawdown ?? 0;
          return {
            name: s.strategy_name,
            status: "ACTIVE",
            total_pnl: s.total_pnl,
            win_rate: s.win_rate,
            pdd: dd > 0 ? s.total_pnl / dd : 0,
            trades: s.total_trades,
          };
        });
    }
  }, [tab, paperStats, liveStats, strategies, strategyMap, activeStratNames]);

  const sortedRows = useMemo(() => {
    const rows = [...tableRows];
    rows.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey] ?? 0;
      const bv = (b as unknown as Record<string, unknown>)[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return rows;
  }, [tableRows, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const equityData = useMemo(() => {
    const src = tab === "paper" ? paperEquity : liveEquity;
    return src.map((p) => ({ t: p.t, balance: p.b }));
  }, [tab, paperEquity, liveEquity]);

  // Filtered signals: paper = all, live = only active strategies
  const filteredSignals = useMemo(() => {
    if (tab === "paper") return signals;
    return signals.filter((s) => activeStratNames.has(s.strategy_name));
  }, [tab, signals, activeStratNames]);

  const agg = useMemo(() => {
    const stats = currentStats;
    const relevantStats = tab === "live" ? stats.filter((s) => activeStratNames.has(s.strategy_name)) : stats;
    const total = relevantStats.reduce((s, r) => s + r.total_pnl, 0);
    const trades = relevantStats.reduce((s, r) => s + r.total_trades, 0);
    const wins = relevantStats.reduce((s, r) => s + r.wins, 0);
    return { total, trades, wins, wr: trades > 0 ? wins / trades : 0, count: relevantStats.length };
  }, [currentStats, tab, activeStratNames]);

  const isHbAlive = (hb: { ts?: string } | null | undefined) => {
    if (!hb || !hb.ts) return false;
    return Date.now() - new Date(hb.ts).getTime() < 120_000;
  };

  const fmt = (n: number, d = 2) => n.toFixed(d);
  const pnlColor = (n: number) => (n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-gray-400");
  const lineColor = tab === "paper" ? "#3b82f6" : "#10b981";

  const ThSortable = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {children}
      {sortKey === k && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">BTC Trading Dashboard</h1>
          <p className="text-sm text-gray-500">
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => setTab("paper")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "paper" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            📊 Paper Trading
          </button>
          <button
            onClick={() => setTab("live")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "live" ? "bg-red-600 text-white shadow" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            🔴 Live Trading
          </button>
        </div>
      </div>

      {/* Health Bar */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2">
        <span>Signal Engine: <Badge ok={isHbAlive(health?.signal_engine as { ts?: string } | null)} /></span>
        <span>Paper Trader: <Badge ok={isHbAlive(health?.paper_trader as { ts?: string } | null)} /></span>
        <span>Live Trader: <Badge ok={isHbAlive(health?.live_trader as { ts?: string } | null)} /></span>
        <span>API Server: <Badge ok={apiOk} /></span>
        {tab === "live" && health?.wallet_balance != null && (
          <span className="text-emerald-400 font-medium">Wallet: ${fmt(Number(health.wallet_balance))}</span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={`${tab === "paper" ? "Paper" : "Live"} P&L`}
          value={`$${fmt(agg.total)}`}
          color={pnlColor(agg.total)}
        />
        <StatCard label={`${tab === "paper" ? "Paper" : "Live"} WR`} value={`${fmt(agg.wr * 100, 1)}%`} />
        <StatCard label={`${tab === "paper" ? "Paper" : "Live"} Trades`} value={String(agg.trades)} />
        <StatCard label="Strategies" value={String(agg.count)} />
      </div>

      {/* Equity Curve */}
      {equityData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">
            {tab === "paper" ? "Paper" : "Live"} Equity Curve
          </h2>
          <div className="h-[200px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(v: string) => {
                  try { return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
                  catch { return v; }
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={2} dot={false} name={tab === "paper" ? "Paper" : "Live"} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Strategy Performance Table */}
      {sortedRows.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold">
              {tab === "paper" ? "All Strategies — Paper Stats" : "Live Strategies"}
            </h2>
          </div>
          <MobileStrategyCards rows={sortedRows} pnlColor={pnlColor} fmt={fmt} />
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950">
                <tr>
                  <ThSortable k="name">Strategy</ThSortable>
                  <ThSortable k="status">Status</ThSortable>
                  <ThSortable k="total_pnl">P&L</ThSortable>
                  <ThSortable k="win_rate">WR%</ThSortable>
                  <ThSortable k="pdd">P/DD</ThSortable>
                  <ThSortable k="trades">Trades</ThSortable>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedRows.map((row) => (
                  <tr key={row.name} className={`hover:bg-gray-800/50 transition ${row.status === "SHADOW" ? "opacity-60" : ""}`}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-800 text-gray-400"
                      }`}>{row.status}</span>
                    </td>
                    <td className={`px-3 py-2 font-mono ${pnlColor(row.total_pnl)}`}>${fmt(row.total_pnl)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(row.win_rate * 100, 1)}%</td>
                    <td className="px-3 py-2 font-mono">{fmt(row.pdd, 2)}</td>
                    <td className="px-3 py-2 font-mono">{row.trades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Signals */}
      {filteredSignals.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold">
              {tab === "paper" ? "Recent Signals" : "Live Signals"}
            </h2>
          </div>
          <MobileSignalCards signals={filteredSignals} fmt={fmt} />
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Strategy</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Side</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Confidence</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredSignals.slice(0, 30).map((sig) => (
                  <tr key={sig.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {(() => { try { return new Date(sig.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return sig.timestamp; } })()}
                    </td>
                    <td className="px-3 py-2 font-medium">{sig.strategy_name}</td>
                    <td className="px-3 py-2">
                      <span className={`font-bold ${sig.direction === "UP" ? "text-emerald-400" : "text-red-400"}`}>{sig.direction}</span>
                    </td>
                    <td className="px-3 py-2 font-mono">{sig.buy_price != null ? `$${Number(sig.buy_price).toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 font-mono">{sig.confidence != null ? `${(Number(sig.confidence) * 100).toFixed(0)}%` : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sig.outcome === "WIN" ? "bg-emerald-900/50 text-emerald-400"
                          : sig.outcome === "LOSS" ? "bg-red-900/50 text-red-400"
                          : "bg-yellow-900/50 text-yellow-400"
                      }`}>{sig.outcome ?? "pending"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!apiOk && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-lg">Connecting to API server...</p>
          <p className="text-gray-600 text-sm mt-2">Make sure the API server is running on port 18801</p>
        </div>
      )}

      <footer className="text-center text-xs text-gray-600 py-4">
        BTC Trading System — Peyton Campbell
      </footer>
    </div>
  );
}
