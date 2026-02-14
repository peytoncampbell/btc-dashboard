'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PnLChartProps {
  data: Array<{ timestamp: string; pnl: number }>;
}

export default function PnLChart({ data }: PnLChartProps) {
  const chartData = useMemo(() => {
    let peak = -Infinity;
    return data.map((item, index) => {
      if (item.pnl > peak) peak = item.pnl;
      const drawdownPct = peak > 0 ? ((item.pnl - peak) / peak) * 100 : (item.pnl < 0 ? -100 : 0);
      return {
        ...item,
        index,
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(item.timestamp).toLocaleDateString(),
        drawdown: Math.min(0, drawdownPct),
      };
    });
  }, [data]);

  const currentPnL = data[data.length - 1]?.pnl || 0;
  const minDD = Math.min(0, ...chartData.map(d => d.drawdown));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string; time: string; drawdown: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-400 text-sm">{d.date} {d.time}</p>
          <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            P&L: {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toFixed(2)}
          </p>
          {d.drawdown < 0 && (
            <p className="text-sm text-red-400/80">DD: {d.drawdown.toFixed(1)}%</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Cumulative P&L</h3>
        </div>
        <div className={`text-lg font-bold ${currentPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {currentPnL >= 0 ? '+' : ''}${currentPnL.toFixed(2)}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} tick={{ fill: '#9CA3AF' }} />
            <YAxis
              yAxisId="pnl"
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(v) => `$${v}`}
            />
            <YAxis
              yAxisId="dd"
              orientation="right"
              stroke="#9CA3AF"
              fontSize={10}
              tick={{ fill: '#6B7280' }}
              tickFormatter={(v) => `${v}%`}
              domain={[minDD < -5 ? minDD * 1.2 : -5, 0]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="dd"
              type="monotone"
              dataKey="drawdown"
              fill="url(#ddGrad)"
              stroke="#ef4444"
              strokeWidth={1}
              strokeOpacity={0.4}
              fillOpacity={1}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pnl"
              type="monotone"
              dataKey="pnl"
              stroke={currentPnL >= 0 ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: currentPnL >= 0 ? '#22c55e' : '#ef4444' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
