'use client';

import { DashboardData } from '../../lib/snapshotMapper';

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TradesTab({ data }: { data: DashboardData }) {
  const trades = data.recent_trades;

  if (!trades.length) {
    return (
      <div className="animate-in">
        <h2 className="text-lg font-bold mb-3">Recent Trades</h2>
        <div className="rounded-xl p-8 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
          <p style={{ color: '#8b949e' }}>No trades yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <h2 className="text-lg font-bold mb-3">Recent Trades</h2>
      <div className="rounded-xl overflow-hidden" style={{ background: '#161b22', border: '1px solid #30363d' }}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left" style={{ background: '#0d1117' }}>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap" style={{ background: '#0d1117', color: '#8b949e' }}>Time</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap" style={{ background: '#0d1117', color: '#8b949e' }}>Strategy</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-center" style={{ background: '#0d1117', color: '#8b949e' }}>Dir</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-center" style={{ background: '#0d1117', color: '#8b949e' }}>Result</th>
                <th className="sticky top-0 px-3 py-2.5 font-bold whitespace-nowrap text-right" style={{ background: '#0d1117', color: '#8b949e' }}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => {
                const isWin = t.result === 'WIN';
                const isLoss = t.result === 'LOSS';
                const isPending = !isWin && !isLoss;
                const profit = Number(t.profit) || 0;

                return (
                  <tr key={t.id || i} className="transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: '1px solid #30363d' }}>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: '#8b949e' }}>
                      {timeAgo(t.timestamp)}
                    </td>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">{t.strategy || 'Unknown'}</td>
                    <td className="px-3 py-2.5 text-center text-base whitespace-nowrap"
                      style={{ color: (t.direction === 'UP' || t.direction === 'LONG') ? '#3fb950' : '#f85149' }}>
                      {(t.direction === 'UP' || t.direction === 'LONG') ? '↑' : '↓'}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: isWin ? '#238636' : isLoss ? '#da3633' : '#d29922',
                          color: isPending ? '#0d1117' : '#fff',
                        }}>
                        {isPending ? 'PENDING' : t.result}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: isPending ? '#d29922' : profit >= 0 ? '#3fb950' : '#f85149' }}>
                      {isPending ? '—' : `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
