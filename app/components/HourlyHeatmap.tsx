'use client';

import { n } from './utils';

interface HourlyStats {
  [hour: string]: {
    wins: number;
    losses: number;
    pnl: number;
  };
}

interface HourlyHeatmapProps {
  hourlyStats: HourlyStats;
}

export default function HourlyHeatmap({ hourlyStats = {} }: HourlyHeatmapProps) {
  // Generate all 24 hours with data or defaults
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    const stats = hourlyStats[hour] || { wins: 0, losses: 0, pnl: 0 };
    const total = stats.wins + stats.losses;
    const winRate = total > 0 ? (stats.wins / total) * 100 : 0;
    
    return {
      hour,
      displayHour: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`,
      ...stats,
      total,
      winRate
    };
  });

  // Calculate max values for color intensity
  const maxPnl = Math.max(...hours.map(h => Math.abs(h.pnl)));
  const maxTotal = Math.max(...hours.map(h => h.total));

  const getIntensityColor = (pnl: number, total: number) => {
    if (total === 0) return 'bg-gray-800/30';
    
    const pnlIntensity = Math.min(Math.abs(pnl) / (maxPnl || 1), 1);
    const alpha = Math.max(0.1, pnlIntensity * 0.8);
    
    if (pnl > 0) {
      return `rgba(34, 197, 94, ${alpha})`;
    } else if (pnl < 0) {
      return `rgba(239, 68, 68, ${alpha})`;
    } else {
      return 'bg-gray-800/30';
    }
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🕐</span>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Hourly Performance</h3>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
        {hours.map((hour) => (
          <div
            key={hour.hour}
            className="group relative"
            title={`${hour.displayHour}: ${hour.total} trades, ${hour.winRate.toFixed(0)}% WR, $${hour.pnl.toFixed(2)} P&L`}
          >
            <div
              className="aspect-square rounded border border-gray-700/50 flex flex-col items-center justify-center text-xs transition-all duration-200 hover:border-gray-500 cursor-pointer"
              style={{
                backgroundColor: getIntensityColor(hour.pnl, hour.total)
              }}
            >
              <div className="text-[10px] text-gray-300 font-medium">
                {hour.hour}
              </div>
              {hour.total > 0 && (
                <div className={`text-[9px] font-bold ${
                  hour.pnl > 0 ? 'text-green-300' : 
                  hour.pnl < 0 ? 'text-red-300' : 'text-gray-300'
                }`}>
                  ${Math.abs(hour.pnl) >= 10 ? hour.pnl.toFixed(0) : hour.pnl.toFixed(1)}
                </div>
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none whitespace-nowrap text-xs">
              <div className="text-white font-medium">{hour.displayHour}</div>
              <div className="text-gray-400">Trades: {hour.total}</div>
              {hour.total > 0 && (
                <>
                  <div className="text-gray-400">WR: {hour.winRate.toFixed(0)}%</div>
                  <div className={hour.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    P&L: {hour.pnl >= 0 ? '+' : ''}${hour.pnl.toFixed(2)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }}></div>
            <span>Profitable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-gray-600" style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }}></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-gray-600 bg-gray-800/30"></div>
            <span>No trades</span>
          </div>
        </div>
        <div>
          Total: {hours.reduce((sum, h) => sum + h.total, 0)} trades
        </div>
      </div>
    </div>
  );
}