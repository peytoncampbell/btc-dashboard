'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  btc_price: number;
  last_updated: string;
  performance: {
    total_predictions: number;
    correct: number;
    wrong: number;
    win_rate: number;
    current_streak: number;
    best_streak: number;
    worst_streak: number;
    total_pnl: number;
    starting_balance: number;
    current_balance: number;
  };
  weights: Record<string, number>;
  current_prediction: {
    prediction: string;
    confidence: number;
    edge: number;
    bet_amount: number;
    market_price_up: number;
    market_price_down: number;
    potential_payout: number;
    time_to_resolution: number;
  } | null;
  trades: Array<{
    id: string;
    timestamp: string;
    prediction: string;
    confidence: number;
    bet_amount: number;
    status: string;
    pnl: number;
  }>;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch('/data.json');
      const newData = await response.json();
      setData(newData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const isSystemActive = data.trades.length > 0 && 
    (new Date().getTime() - new Date(data.trades[0].timestamp).getTime()) < 30 * 60 * 1000;

  const todaysPnl = data.trades
    .filter(t => {
      const tradeDate = new Date(t.timestamp).toDateString();
      const today = new Date().toDateString();
      return tradeDate === today;
    })
    .reduce((sum, t) => sum + t.pnl, 0);

  const avgWeight = Object.values(data.weights).reduce((a, b) => a + b, 0) / Object.keys(data.weights).length;

  const confidenceBuckets = {
    '50-60%': { count: 0, wins: 0 },
    '60-70%': { count: 0, wins: 0 },
    '70-80%': { count: 0, wins: 0 },
    '80-90%': { count: 0, wins: 0 },
    '90-100%': { count: 0, wins: 0 },
  };

  data.trades.forEach(trade => {
    if (trade.status === 'open') return;
    const conf = trade.confidence;
    let bucket: keyof typeof confidenceBuckets;
    if (conf < 60) bucket = '50-60%';
    else if (conf < 70) bucket = '60-70%';
    else if (conf < 80) bucket = '70-80%';
    else if (conf < 90) bucket = '80-90%';
    else bucket = '90-100%';
    
    confidenceBuckets[bucket].count++;
    if (trade.status === 'won') confidenceBuckets[bucket].wins++;
  });

  const dailyPnl: Record<string, number> = {};
  data.trades.forEach(trade => {
    const date = new Date(trade.timestamp).toLocaleDateString();
    dailyPnl[date] = (dailyPnl[date] || 0) + trade.pnl;
  });
  const dailyPnlArray = Object.entries(dailyPnl)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-7);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">BTC Scalper 🤖</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSystemActive ? 'bg-[#22c55e]' : 'bg-gray-600'} animate-pulse`}></div>
            <span className="text-sm text-gray-400">{isSystemActive ? 'Active' : 'Idle'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>BTC: <span className="text-white font-semibold">${data.btc_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
          <div>Updated: {new Date(data.last_updated).toLocaleTimeString()}</div>
        </div>
      </header>

      {/* P&L Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Portfolio Balance</div>
        <div className="text-4xl font-bold mb-4">
          ${data.performance.current_balance.toFixed(2)}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Total P&L</div>
            <div className={`text-xl font-semibold ${data.performance.total_pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {data.performance.total_pnl >= 0 ? '+' : ''}${data.performance.total_pnl.toFixed(2)} 
              ({data.performance.total_pnl >= 0 ? '+' : ''}{((data.performance.total_pnl / data.performance.starting_balance) * 100).toFixed(1)}%)
            </div>
          </div>
          <div>
            <div className="text-gray-400">Today's P&L</div>
            <div className={`text-xl font-semibold ${todaysPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {todaysPnl >= 0 ? '+' : ''}${todaysPnl.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Win Rate</div>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90" width="64" height="64">
                <circle cx="32" cy="32" r="28" stroke="#1f2937" strokeWidth="6" fill="none" />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke={data.performance.win_rate >= 50 ? '#22c55e' : '#ef4444'}
                  strokeWidth="6" 
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28 * (data.performance.win_rate / 100)} ${2 * Math.PI * 28}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {data.performance.win_rate.toFixed(0)}%
              </div>
            </div>
            <div className="text-2xl font-bold">{data.performance.correct}/{data.performance.total_predictions}</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Total Trades</div>
          <div className="text-3xl font-bold">{data.performance.total_predictions}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.performance.correct} wins · {data.performance.wrong} losses
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Current Streak</div>
          <div className="text-3xl font-bold flex items-center gap-2">
            {data.performance.current_streak > 0 && '🔥'}
            {data.performance.current_streak >= 0 ? '+' : ''}{data.performance.current_streak}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Best Streak</div>
          <div className="text-3xl font-bold text-[#22c55e]">+{data.performance.best_streak}</div>
        </div>
      </div>

      {/* Current Prediction */}
      {data.current_prediction && (
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl p-6 mb-6 border border-blue-700/50 animate-pulse">
          <div className="text-sm text-gray-300 mb-2">Current Prediction</div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`text-5xl font-bold ${data.current_prediction.prediction === 'UP' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {data.current_prediction.prediction === 'UP' ? '⬆️ UP' : '⬇️ DOWN'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{data.current_prediction.confidence}%</div>
              <div className="text-sm text-gray-400">confidence</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Edge vs Market</div>
              <div className="text-lg font-semibold text-[#3b82f6]">+{(data.current_prediction.edge * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Time to Resolution</div>
              <div className="text-lg font-semibold">{Math.floor(data.current_prediction.time_to_resolution / 60)}m {data.current_prediction.time_to_resolution % 60}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Indicator Weights */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Indicator Weights</h2>
        <div className="space-y-3">
          {Object.entries(data.weights).map(([key, value]) => {
            const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const percentage = (value * 100).toFixed(0);
            const isAboveAvg = value > avgWeight;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{label}</span>
                  <span className={isAboveAvg ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{percentage}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isAboveAvg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
        {data.trades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Waiting for first trade...
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.trades.slice(0, 20).map((trade) => (
              <div 
                key={trade.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  trade.status === 'won' ? 'bg-green-900/20 border border-green-700/30' :
                  trade.status === 'lost' ? 'bg-red-900/20 border border-red-700/30' :
                  'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {trade.prediction === 'UP' ? '⬆️' : '⬇️'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{trade.confidence}% confidence</div>
                    <div className="text-xs text-gray-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg">
                    {trade.status === 'won' ? '✅' : trade.status === 'lost' ? '❌' : '⏳'}
                  </div>
                  <div className={`text-sm font-semibold ${
                    trade.pnl > 0 ? 'text-[#22c55e]' : trade.pnl < 0 ? 'text-[#ef4444]' : 'text-gray-400'
                  }`}>
                    {trade.pnl > 0 ? '+' : ''}{trade.pnl === 0 ? '-' : `$${trade.pnl.toFixed(2)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Win Rate by Confidence */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Win Rate by Confidence</h2>
        <div className="space-y-4">
          {Object.entries(confidenceBuckets).map(([bucket, data]) => {
            const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
            return (
              <div key={bucket}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">{bucket}</span>
                  <span className="text-gray-400">
                    {data.wins}/{data.count} trades ({winRate.toFixed(0)}% win)
                  </span>
                </div>
                <div className="h-8 bg-gray-800 rounded-lg overflow-hidden flex">
                  {data.count > 0 && (
                    <>
                      <div 
                        className="bg-[#22c55e] flex items-center justify-center text-xs font-semibold"
                        style={{ width: `${(data.wins / data.count) * 100}%` }}
                      >
                        {data.wins > 0 && `${data.wins}`}
                      </div>
                      <div 
                        className="bg-[#ef4444] flex items-center justify-center text-xs font-semibold"
                        style={{ width: `${((data.count - data.wins) / data.count) * 100}%` }}
                      >
                        {data.count - data.wins > 0 && `${data.count - data.wins}`}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily P&L Chart */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Daily P&L (Last 7 Days)</h2>
        {dailyPnlArray.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No trading data yet...
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {dailyPnlArray.map(([date, pnl]) => {
              const maxPnl = Math.max(...dailyPnlArray.map(([_, p]) => Math.abs(p)));
              const height = maxPnl > 0 ? (Math.abs(pnl) / maxPnl) * 100 : 0;
              const isPositive = pnl >= 0;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-semibold" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                  </div>
                  <div 
                    className="w-full rounded-t-lg transition-all"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: isPositive ? '#22c55e' : '#ef4444',
                      minHeight: '4px'
                    }}
                  ></div>
                  <div className="text-xs text-gray-500 rotate-0">
                    {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
