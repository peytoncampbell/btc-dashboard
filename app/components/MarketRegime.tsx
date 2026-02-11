interface MarketRegimeProps {
  volatility: string;
  trend: string;
  volume: string;
}

export default function MarketRegime({ volatility, trend, volume }: MarketRegimeProps) {
  const volColor =
    volatility === 'extreme'
      ? 'bg-red-500/20 text-red-400 border-red-500/40'
      : volatility === 'high'
      ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
      : volatility === 'medium'
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
      : 'bg-green-500/20 text-green-400 border-green-500/40';

  const trendColor =
    trend === 'bull'
      ? 'bg-green-500/20 text-green-400 border-green-500/40'
      : trend === 'bear'
      ? 'bg-red-500/20 text-red-400 border-red-500/40'
      : 'bg-gray-500/20 text-gray-400 border-gray-500/40';

  const volumeColor =
    volume === 'surge'
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
      : volume === 'active'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      : volume === 'normal'
      ? 'bg-gray-500/20 text-gray-400 border-gray-500/40'
      : 'bg-gray-600/20 text-gray-500 border-gray-600/40';

  const volIcon = volatility === 'extreme' ? '🔥' : volatility === 'high' ? '⚡' : volatility === 'medium' ? '📊' : '😴';
  const trendIcon = trend === 'bull' ? '🐂' : trend === 'bear' ? '🐻' : '↔️';
  const volumeIcon = volume === 'surge' ? '🌊' : volume === 'active' ? '📈' : volume === 'normal' ? '📊' : '🔇';

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">🌐 MARKET REGIME</h2>
      <div className="space-y-2">
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Volatility</div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${volColor}`}>
            <span>{volIcon}</span>
            <span className="uppercase">{volatility}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Trend</div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${trendColor}`}>
            <span>{trendIcon}</span>
            <span className="uppercase">{trend}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Volume</div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${volumeColor}`}>
            <span>{volumeIcon}</span>
            <span className="uppercase">{volume}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
