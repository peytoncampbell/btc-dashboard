import { n } from './utils';
interface EdgeAnalysisProps {
  edgeBuckets: Record<string, { wins: number; total: number }>;
}

export default function EdgeAnalysis({ edgeBuckets }: EdgeAnalysisProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">🎯 EDGE ANALYSIS</h2>
      {Object.values(edgeBuckets).every((b) => b.total === 0) ? (
        <div className="text-center py-4 text-gray-500 text-xs">No edge data yet</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(edgeBuckets).map(([bucket, b]) => {
            const wr = b.total > 0 ? (b.wins / b.total) * 100 : 0;
            return n(
              <div key={bucket}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-300">{bucket}</span>
                  <span className="text-gray-400">
                    {b.wins}/{b.total} ({n(wr).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-4 bg-gray-800 rounded overflow-hidden flex">
                  {b.total > 0 && (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${wr}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${100 - wr}%` }} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



