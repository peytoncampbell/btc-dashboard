'use client';

import React, { useMemo } from 'react';

interface SortinoCardProps {
  /** Recent trades with profit and timestamp */
  trades: Array<{ timestamp: string; profit?: number; result?: string }>;
  /** Go-live threshold */
  threshold?: number;
}

function computeSortino(profits: number[]): number {
  if (profits.length < 2) return 0;
  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const downside = profits.map(p => Math.min(0, p) ** 2);
  const downsideDev = Math.sqrt(downside.reduce((a, b) => a + b, 0) / downside.length);
  if (downsideDev === 0) return mean > 0 ? 10 : 0;
  return mean / downsideDev;
}

export default function SortinoCard({ trades, threshold = 0.05 }: SortinoCardProps) {
  const { current, sparkData } = useMemo(() => {
    // Filter completed trades, sort by time
    const completed = trades
      .filter(t => t.result === 'WIN' || t.result === 'LOSS')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (completed.length < 5) return { current: 0, sparkData: [] };

    // Compute rolling Sortino with a sliding window of ~20 trades
    const windowSize = Math.min(20, Math.floor(completed.length / 2));
    const points: number[] = [];
    for (let i = windowSize; i <= completed.length; i++) {
      const window = completed.slice(i - windowSize, i);
      const profits = window.map(t => Number(t.profit) || 0);
      points.push(computeSortino(profits));
    }

    // Downsample to ~30 points for sparkline
    const max = 30;
    let spark = points;
    if (points.length > max) {
      const step = points.length / max;
      spark = [];
      for (let i = 0; i < max; i++) spark.push(points[Math.floor(i * step)]);
    }

    return { current: points[points.length - 1] || 0, sparkData: spark };
  }, [trades]);

  const isGood = current >= threshold;
  const color = isGood ? '#22c55e' : '#ef4444';

  // SVG sparkline
  const svgW = 80;
  const svgH = 24;
  const sparkPath = useMemo(() => {
    if (sparkData.length < 2) return '';
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    return sparkData
      .map((v, i) => {
        const x = (i / (sparkData.length - 1)) * svgW;
        const y = svgH - ((v - min) / range) * (svgH - 2) - 1;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [sparkData]);

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800 p-3 sm:p-4">
      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
        <span className="text-sm sm:text-lg">📐</span>
        <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Sortino</h3>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg sm:text-2xl font-bold" style={{ color }}>
            {current.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">
            threshold: {threshold}
          </div>
        </div>
        {sparkData.length >= 2 && (
          <svg width={svgW} height={svgH} className="ml-2">
            {/* threshold line */}
            {(() => {
              const min = Math.min(...sparkData);
              const max = Math.max(...sparkData);
              const range = max - min || 1;
              const ty = svgH - ((threshold - min) / range) * (svgH - 2) - 1;
              return <line x1="0" y1={ty} x2={svgW} y2={ty} stroke="#6B7280" strokeWidth="0.5" strokeDasharray="2 2" />;
            })()}
            <path d={sparkPath} fill="none" stroke={color} strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </div>
  );
}
