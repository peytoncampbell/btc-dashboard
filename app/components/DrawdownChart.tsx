interface DrawdownChartProps {
  cumulativePnl: Array<{ timestamp: string; pnl: number }>;
  maxDrawdown: number;
}

export default function DrawdownChart({ cumulativePnl, maxDrawdown }: DrawdownChartProps) {
  if (cumulativePnl.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
        <h2 className="text-xs font-bold text-gray-400 mb-2">📉 DRAWDOWN CHART</h2>
        <div className="text-center py-4 text-gray-500 text-xs">No data yet</div>
      </div>
    );
  }

  const maxPnl = Math.max(...cumulativePnl.map((p) => p.pnl), 0);
  const minPnl = Math.min(...cumulativePnl.map((p) => p.pnl), 0);
  const range = Math.max(Math.abs(maxPnl), Math.abs(minPnl), 1);

  // Sample points for SVG (max 100 points)
  const step = Math.ceil(cumulativePnl.length / 100);
  const sampled = cumulativePnl.filter((_, i) => i % step === 0 || i === cumulativePnl.length - 1);

  const width = 300;
  const height = 100;
  const padding = 10;

  const xScale = (i: number) => padding + (i / (sampled.length - 1)) * (width - 2 * padding);
  const yScale = (pnl: number) => height - padding - ((pnl + range) / (2 * range)) * (height - 2 * padding);

  const pathData = sampled
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(p.pnl)}`)
    .join(' ');

  // Zero line
  const zeroY = yScale(0);

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">📉 CUMULATIVE P&L</h2>
      <div className="flex items-center justify-between text-xs mb-2">
        <div>
          <span className="text-gray-500">Total: </span>
          <span className={`font-bold ${cumulativePnl[cumulativePnl.length - 1].pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${cumulativePnl[cumulativePnl.length - 1].pnl.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Max DD: </span>
          <span className="text-red-400 font-bold">${maxDrawdown.toFixed(2)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
        {/* Zero line */}
        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          stroke="#4b5563"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        {/* P&L line */}
        <path d={pathData} fill="none" stroke="#10b981" strokeWidth="2" />
        {/* Area fill */}
        <path
          d={`${pathData} L ${xScale(sampled.length - 1)},${zeroY} L ${xScale(0)},${zeroY} Z`}
          fill="url(#pnl-gradient)"
          opacity="0.2"
        />
        {/* Gradient */}
        <defs>
          <linearGradient id="pnl-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
