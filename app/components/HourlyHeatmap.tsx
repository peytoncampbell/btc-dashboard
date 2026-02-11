import { n } from './utils';
interface HourlyStats {
  [key: string]: { wins: number; losses: number; pnl: number };
}

interface HourlyHeatmapProps {
  hourlyStats: HourlyStats;
}

export default function HourlyHeatmap({ hourlyStats }: HourlyHeatmapProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max abs PnL for color scaling
  const maxAbsPnl = Math.max(...Object.values(hourlyStats).map((s) => Math.abs(s.pnl)), 0.01);

  function getCellColor(pnl: number) {
    if (pnl === 0) return 'bg-gray-800';
    const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
    if (pnl > 0) {
      // Green scale
      const opacity = Math.floor(intensity * 5) + 1;
      return `bg-green-500/${opacity * 20}`;
    } else {
      // Red scale
      const opacity = Math.floor(intensity * 5) + 1;
      return `bg-red-500/${opacity * 20}`;
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">🕐 HOURLY HEATMAP (EST)</h2>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Hour labels in EST (UTC-5) */}
          <div className="flex mb-1">
            <div className="w-8"></div>
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-gray-500">
                {h}
              </div>
            ))}
          </div>
          {/* Grid — remap UTC data to EST by shifting +5 hours */}
          {days.map((day, dow) => (
            <div key={dow} className="flex items-center mb-0.5">
              <div className="w-8 text-[9px] text-gray-500">{day}</div>
              {hours.map((estHour) => {
                // Convert EST display hour back to UTC to look up data
                const utcHour = (estHour + 5) % 24;
                // If EST hour < 5, the UTC day is actually the next day
                const utcDow = estHour < 5 ? (dow + 1) % 7 : dow;
                const key = `${utcDow}-${utcHour}`;
                const stats = hourlyStats[key];
                const pnl = stats?.pnl || 0;
                const total = stats ? stats.wins + stats.losses : 0;
                return (
                  <div
                    key={estHour}
                    className={`flex-1 h-4 mx-[1px] rounded ${getCellColor(pnl)} ${total > 0 ? 'border border-gray-700' : ''}`}
                    title={`${day} ${estHour}:00 EST | ${total} trades | ${pnl >= 0 ? '+' : ''}$${n(pnl).toFixed(2)}`}
                  ></div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-gray-500 mt-2">
        <span>🟥 Loss hours</span>
        <span>⬜ No data</span>
        <span>🟩 Profit hours</span>
      </div>
    </div>
  );
}



