import { n } from './utils';
interface DataQualityProps {
  totalTrades: number;
  tradesWithVolatilityRegime: number;
  tradesWithMarketRegime: number;
  tradesWithOrderbookData: number;
  nearMissCount: number;
  lastExport: string;
}

export default function DataQualityPanel({
  totalTrades,
  tradesWithVolatilityRegime,
  tradesWithMarketRegime,
  tradesWithOrderbookData,
  nearMissCount,
  lastExport,
}: DataQualityProps) {
  const volPct = totalTrades > 0 ? (tradesWithVolatilityRegime / totalTrades) * 100 : 0;
  const regimePct = totalTrades > 0 ? (tradesWithMarketRegime / totalTrades) * 100 : 0;
  const obPct = totalTrades > 0 ? (tradesWithOrderbookData / totalTrades) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">📊 DATA QUALITY (v9)</h2>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-400">Volatility Regime</span>
            <span className="text-gray-300 font-bold">
              {tradesWithVolatilityRegime}/{totalTrades} n({n(volPct).toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${volPct > 80 ? 'bg-green-500' : volPct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${volPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-400">Market Regime</span>
            <span className="text-gray-300 font-bold">
              {tradesWithMarketRegime}/{totalTrades} n({n(regimePct).toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${regimePct > 80 ? 'bg-green-500' : regimePct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${regimePct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-400">Orderbook Data</span>
            <span className="text-gray-300 font-bold">
              {tradesWithOrderbookData}/{totalTrades} n({n(obPct).toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${obPct > 80 ? 'bg-green-500' : obPct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${obPct}%` }}
            />
          </div>
        </div>
        <div className="pt-2 border-t border-gray-700/50">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Near Misses</span>
            <span className="text-blue-400 font-bold">{nearMissCount}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Last Update</span>
            <span>{new Date(lastExport).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}



