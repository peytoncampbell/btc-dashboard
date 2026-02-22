'use client';

import { DashboardData } from '../../lib/snapshotMapper';

const statusColors: Record<string, string> = {
  filled: '#3fb950',
  open: '#d29922',
  cancelled: '#8b949e',
  failed: '#f85149',
};

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PnlText({ value, prefix = '' }: { value: number; prefix?: string }) {
  const color = value >= 0 ? '#3fb950' : '#f85149';
  const sign = value >= 0 ? '+' : '';
  return <span style={{ color }}>{prefix}{sign}{value.toFixed(2)}</span>;
}

export default function LiveTab({ data }: { data: DashboardData }) {
  const live = data.live_trading;

  if (!live) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">🔴</div>
        <h2 className="text-xl font-semibold text-white mb-2">Live Trading Not Active</h2>
        <p style={{ color: '#8b949e' }} className="text-sm">No live trading data available. The bot will populate this when active.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance + Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Balance Card */}
        <div className="rounded-xl p-4 border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Balance</div>
          <div className="text-2xl font-bold text-white">${live.balance_usdc.toFixed(2)}</div>
          <div className="text-xs mt-1">
            Daily: <PnlText value={live.daily_pnl} prefix="$" />
          </div>
        </div>

        {/* Total P&L */}
        <div className="rounded-xl p-4 border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Total P&L</div>
          <div className="text-2xl font-bold"><PnlText value={live.total_pnl} prefix="$" /></div>
        </div>

        {/* Total Trades */}
        <div className="rounded-xl p-4 border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Total Trades</div>
          <div className="text-2xl font-bold text-white">{live.total_trades}</div>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl p-4 border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Win Rate</div>
          <div className="text-2xl font-bold" style={{ color: live.win_rate >= 50 ? '#3fb950' : '#f85149' }}>
            {live.win_rate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#30363d' }}>
          <h3 className="text-sm font-semibold text-white">Open Positions ({live.open_positions.length})</h3>
        </div>
        {live.open_positions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: '#8b949e' }}>No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8b949e' }} className="border-b" >
                  <th className="text-left px-4 py-2 font-medium" style={{ borderColor: '#30363d' }}>Market</th>
                  <th className="text-left px-2 py-2 font-medium">Side</th>
                  <th className="text-right px-2 py-2 font-medium">Size</th>
                  <th className="text-right px-2 py-2 font-medium">Entry</th>
                  <th className="text-right px-2 py-2 font-medium">Current</th>
                  <th className="text-right px-2 py-2 font-medium">P&L</th>
                  <th className="text-left px-2 py-2 font-medium">Strategy</th>
                  <th className="text-right px-4 py-2 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {live.open_positions.map((pos, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: '#21262d' }}>
                    <td className="px-4 py-2 text-white font-medium truncate max-w-[180px]">{pos.market}</td>
                    <td className="px-2 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: pos.side === 'BUY' ? '#238636' : '#da3633', color: '#fff' }}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-white">${pos.size.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right" style={{ color: '#8b949e' }}>{pos.entry_price.toFixed(3)}</td>
                    <td className="px-2 py-2 text-right text-white">{pos.current_price.toFixed(3)}</td>
                    <td className="px-2 py-2 text-right"><PnlText value={pos.pnl} prefix="$" /></td>
                    <td className="px-2 py-2" style={{ color: '#8b949e' }}>{pos.strategy}</td>
                    <td className="px-4 py-2 text-right" style={{ color: '#8b949e' }}>{formatTimeAgo(pos.opened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#30363d' }}>
          <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
        </div>
        {live.recent_orders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: '#8b949e' }}>No recent orders</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8b949e' }} className="border-b">
                  <th className="text-left px-4 py-2 font-medium" style={{ borderColor: '#30363d' }}>Market</th>
                  <th className="text-left px-2 py-2 font-medium">Side</th>
                  <th className="text-right px-2 py-2 font-medium">Size</th>
                  <th className="text-right px-2 py-2 font-medium">Price</th>
                  <th className="text-center px-2 py-2 font-medium">Status</th>
                  <th className="text-left px-2 py-2 font-medium">Strategy</th>
                  <th className="text-right px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {live.recent_orders.slice(0, 20).map((order) => (
                  <tr key={order.id} className="border-t" style={{ borderColor: '#21262d' }}>
                    <td className="px-4 py-2 text-white font-medium truncate max-w-[180px]">{order.market}</td>
                    <td className="px-2 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: order.side === 'BUY' ? '#238636' : '#da3633', color: '#fff' }}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-white">${order.size.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right" style={{ color: '#8b949e' }}>{order.price.toFixed(3)}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `${statusColors[order.status]}20`, color: statusColors[order.status] }}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-2 py-2" style={{ color: '#8b949e' }}>{order.strategy}</td>
                    <td className="px-4 py-2 text-right" style={{ color: '#8b949e' }}>{formatTimeAgo(order.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
