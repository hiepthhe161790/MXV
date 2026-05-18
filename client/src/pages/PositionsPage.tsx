import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import toast from 'react-hot-toast';

export default function PositionsPage() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPositions = async () => {
      try {
        const accountId = authStore.account?._id;
        if (!accountId) {
          setLoading(false);
          return;
        }
        const response = await tradingService.getPositions(accountId);
        const positionData = response || [];
        setPositions(positionData);
        store.setPositions(positionData);
      } catch (error) {
        console.error('Error loading positions:', error);
        toast.error('Failed to load positions');
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
    const interval = setInterval(loadPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClosePosition = async (position: any) => {
    const closePriceStr = window.prompt(
      `Đóng vị thế ${position.symbol}\nNhập giá đóng (hiện tại ~$${position.currentPrice?.toFixed(2) || position.entryPrice?.toFixed(2)}):`,
      String(position.currentPrice || position.entryPrice || 0)
    );
    if (!closePriceStr) return;
    const closePrice = parseFloat(closePriceStr);
    if (!closePrice || closePrice <= 0) { toast.error('Giá đóng không hợp lệ'); return; }
    try {
      const accountId = authStore.account?._id;
      if (!accountId) throw new Error('No account');
      await tradingService.closePosition(accountId, position.symbol, closePrice);
      toast.success(`Đóng vị thế ${position.symbol} thành công`);
      const updated = positions.filter(p => p._id !== position._id);
      setPositions(updated);
      store.setPositions(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể đóng vị thế');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading positions...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-white">Open Positions</h1>
        <p className="text-slate-400 mt-2">Monitor and manage your active trading positions</p>
      </div>

      {positions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No open positions</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {positions.map((position) => (
            <div key={position._id} className="card">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                {/* Symbol */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Symbol</p>
                  <p className="text-lg font-bold text-white">{position.symbol}</p>
                </div>

                {/* Side */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Side</p>
                  <div
                    className={`flex items-center space-x-1 ${position.side === 'LONG' ? 'text-green-400' : 'text-red-400'
                      }`}
                  >
                    {position.side === 'LONG' ? (
                      <TrendingUp size={18} />
                    ) : (
                      <TrendingDown size={18} />
                    )}
                    <span className="font-semibold">{position.side}</span>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Quantity</p>
                  <p className="text-lg font-bold text-white">{position.quantity}</p>
                </div>

                {/* Entry Price */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Entry Price</p>
                  <p className="text-lg font-bold text-white">${position.entryPrice?.toFixed(2)}</p>
                </div>

                {/* Current Price */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Current Price</p>
                  <p className="text-lg font-bold text-white">${position.currentPrice?.toFixed(2)}</p>
                </div>

                {/* P&L */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Unrealized P&L</p>
                  <p
                    className={`text-lg font-bold ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                  >
                    ${position.unrealizedPnL?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-400">Margin Used</p>
                  <p className="text-sm font-semibold text-white">${position.marginUsed?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Leverage</p>
                  <p className="text-sm font-semibold text-white">{position.leverage}:1</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Realized P&L</p>
                  <p className={`text-sm font-semibold ${position.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${position.realizedPnL?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => handleClosePosition(position)}
                    className="flex items-center space-x-1 ml-auto btn btn-danger btn-sm"
                  >
                    <X size={16} />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
