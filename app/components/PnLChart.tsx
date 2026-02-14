'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PnLChartProps {
  data: Array<{ timestamp: string; pnl: number }>;
}

export default function PnLChart({ data }: PnLChartProps) {
  const chartData = useMemo(() => data.map((item, index) => ({
    ...item,
    index,
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(item.timestamp).toLocaleDateString(),
  })), [data]);

  const currentPnL = data[data.length - 1]?.pnl || 0;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string; time: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-400 text-sm">{data.date}</p>
          <p className="text-gray-400 text-sm">{data.time}</p>
          <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            P&L: {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toFixed(2)}
          </p>
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
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="pnl" 
              stroke={currentPnL >= 0 ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: currentPnL >= 0 ? "#22c55e" : "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}