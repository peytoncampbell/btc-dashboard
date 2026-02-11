import { n } from './utils';
interface Trade {
  id: number;
  timestamp: string;
  direction: string;
  buy_price_cents: number;
  entry_minute: number;
  confidence: number;
  strategy: string;
  result: string;
  profit: number;
  shadow_signals: string;
}

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">📋 RECENT TRADES</h2>
      {trades.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-xs">Waiting for first trade...</div>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {trades.map((t) => {
            const result = t.result || '';
            const dir = t.direction || '?';
            const conf = n(t.confidence);
            const profit = n(t.profit);

            let signals: Record<string, any> = {};
            try {
              signals = JSON.parse(t.shadow_signals || '{}');
            } catch { /* ignore */ }

            return (
              <div
                key={t.id}
                className={`p-2 rounded-lg border text-xs ${
                  result === 'WIN'
                    ? 'bg-green-900/10 border-green-700/30'
                    : result === 'LOSS'
                    ? 'bg-red-900/10 border-red-700/30'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{dir === 'UP' ? '⬆️' : '⬇️'}</span>
                    <div>
                      <div className="font-semibold">
                        {dir === 'UP' ? 'YES' : 'NO'} @ {n(t.buy_price_cents)}¢
                        <span className="text-gray-500 font-normal ml-1 text-[10px]">{t.strategy}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Min {n(t.entry_minute)} · {(conf * 100).toFixed(0)}% conf ·{' '}
                        {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{result === 'WIN' ? '✅' : result === 'LOSS' ? '❌' : '⏳'}</div>
                    <div
                      className={`font-bold ${
                        profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-500'
                      }`}
                    >
                      {profit !== 0 ? `${profit > 0 ? '+' : ''}$${profit.toFixed(2)}` : '—'}
                    </div>
                  </div>
                </div>
                {/* Strategy votes */}
                {Object.keys(signals).length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {Object.entries(signals)
                      .slice(0, 10)
                      .map(([sname, sval]) => {
                        const sdir = typeof sval === 'string' ? sval : (sval?.dir ?? 'SKIP');
                        return (
                          <span
                            key={sname}
                            className={`text-[8px] px-1 rounded ${
                              sdir === dir
                                ? 'bg-green-500/15 text-green-400'
                                : sdir === 'SKIP'
                                ? 'bg-gray-500/15 text-gray-500'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {sname.replace(/([A-Z])/g, ' $1').trim().split(' ')[0]}
                          </span>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



