import { n } from './utils';
interface PortfolioCardProps {
  balance: number;
  initialBalance: number;
  totalPnl: number;
  todayPnl: number;
  winRate: number;
  wins: number;
  totalTrades: number;
  currentStreak: number;
  bestStreak: number;
}

export default function PortfolioCard({
  balance,
  initialBalance,
  totalPnl,
  todayPnl,
  winRate,
  wins,
  totalTrades,
  currentStreak,
  bestStreak,
}: PortfolioCardProps) {
  const pnlPct = initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0;

  return n(
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-3 border border-gray-700">
      <h2 className="text-xs font-bold text-gray-400 mb-2">💰 PORTFOLIO</h2>
      <div className="text-xl font-bold">${n(balance).toFixed(2)}</div>
      <div className={`text-sm font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {totalPnl >= 0 ? '+' : ''}${n(totalPnl).toFixed(2)}{' '}
        <span className="text-xs">
          n({pnlPct >= 0 ? '+' : ''}
          {n(pnlPct).toFixed(1)}%)
        </span>
      </div>
      <div className={`text-xs mt-1 ${todayPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        Today: {todayPnl >= 0 ? '+' : ''}${n(todayPnl).toFixed(2)}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700/50">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            <span className="text-gray-500">Win Rate </span>
            <span className="font-bold">{n(winRate).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500">Trades </span>
            <span className="font-bold">
              {wins}/{totalTrades}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Streak </span>
            <span
              className={`font-bold ${
                currentStreak >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {currentStreak > 0 ? '+' : ''}
              {currentStreak}
              {currentStreak >= 3 ? ' 🔥' : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Best </span>
            <span className="text-green-400 font-bold">+{bestStreak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}



