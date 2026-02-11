interface NearMiss {
  id: number;
  timestamp: string;
  entry_minute: number;
  direction: string;
  strategy: string;
  signal_strength: number;
  threshold: number;
  reason_skipped: string;
  would_have_won: number | null;
  btc_move_pct: number;
}

interface NearMissFeedProps {
  nearMisses: NearMiss[];
}

export default function NearMissFeed({ nearMisses }: NearMissFeedProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">🎯 NEAR MISSES</h2>
      {nearMisses.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-xs">No near misses yet</div>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {nearMisses.map((nm) => {
            const wouldWin = nm.would_have_won === 1;
            const wouldLose = nm.would_have_won === 0;
            return (
              <div
                key={nm.id}
                className={`p-2 rounded-lg border text-xs ${
                  wouldWin
                    ? 'bg-yellow-900/10 border-yellow-700/30'
                    : wouldLose
                    ? 'bg-gray-800/50 border-gray-700/50'
                    : 'bg-gray-800/30 border-gray-700/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span>{nm.direction === 'UP' ? '⬆️' : '⬇️'}</span>
                    <span className="font-semibold truncate">{nm.strategy}</span>
                    {wouldWin && <span className="text-yellow-400">💡</span>}
                  </div>
                  <div className="text-[10px] text-gray-500">Min {nm.entry_minute}</div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div>
                    <span className="text-gray-500">Signal: </span>
                    <span className="text-green-400 font-bold">{(nm.signal_strength * 100).toFixed(0)}%</span>
                    <span className="text-gray-500"> / Thresh: </span>
                    <span className="text-gray-400">{(nm.threshold * 100).toFixed(0)}%</span>
                  </div>
                  {nm.would_have_won != null && (
                    <span className={wouldWin ? 'text-yellow-400 font-bold' : 'text-gray-500'}>
                      {wouldWin ? 'Would win!' : 'Would lose'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Skipped: {nm.reason_skipped}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
