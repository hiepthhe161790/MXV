import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, X, Sliders, Target, ShieldAlert } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import toast from 'react-hot-toast';

export default function PositionsPage() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for SL/TP Modal
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
  const [slValue, setSlValue] = useState<string>('');
  const [tpValue, setTpValue] = useState<string>('');
  const [savingSLTP, setSavingSLTP] = useState(false);

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

  const handleOpenSLTPModal = (position: any) => {
    setSelectedPosition(position);
    setSlValue(position.stopLossPrice ? String(position.stopLossPrice) : '');
    setTpValue(position.takeProfitPrice ? String(position.takeProfitPrice) : '');
  };

  const applyPreset = (type: 'SL' | 'TP', percentage: number) => {
    if (!selectedPosition) return;
    const price = selectedPosition.currentPrice || selectedPosition.entryPrice || 0;
    const isLong = selectedPosition.side === 'LONG';
    
    let multiplier = 1;
    if (type === 'SL') {
      multiplier = isLong ? (1 - percentage) : (1 + percentage);
    } else {
      multiplier = isLong ? (1 + percentage) : (1 - percentage);
    }
    
    const targetValue = (price * multiplier).toFixed(2);
    if (type === 'SL') {
      setSlValue(targetValue);
    } else {
      setTpValue(targetValue);
    }
    toast.success(`Đã tính preset ${type} (${(percentage * 100).toFixed(0)}%)`);
  };

  const handleSaveSLTP = async () => {
    if (!selectedPosition) return;
    setSavingSLTP(true);
    try {
      const accountId = authStore.account?._id;
      if (!accountId) throw new Error('No account');

      const sl = slValue.trim() !== '' ? parseFloat(slValue) : null;
      const tp = tpValue.trim() !== '' ? parseFloat(tpValue) : null;

      if (sl !== null && (isNaN(sl) || sl <= 0)) {
        toast.error('Giá Stop Loss không hợp lệ');
        setSavingSLTP(false);
        return;
      }
      if (tp !== null && (isNaN(tp) || tp <= 0)) {
        toast.error('Giá Take Profit không hợp lệ');
        setSavingSLTP(false);
        return;
      }

      await tradingService.updateSLTP(accountId, selectedPosition.symbol, sl, tp);
      toast.success(`Cập nhật SL/TP cho ${selectedPosition.symbol} thành công`);
      
      const updated = positions.map(p => {
        if (p._id === selectedPosition._id) {
          return { ...p, stopLossPrice: sl, takeProfitPrice: tp };
        }
        return p;
      });
      setPositions(updated);
      store.setPositions(updated);
      setSelectedPosition(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Không thể cập nhật SL/TP');
    } finally {
      setSavingSLTP(false);
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-700 items-center">
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
                <div>
                  <p className="text-xs text-slate-400 mb-1">SL / TP Levels</p>
                  <div className="flex space-x-2 text-xs">
                    <span className={`font-semibold px-2 py-0.5 rounded border ${
                      position.stopLossPrice 
                        ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                        : 'text-slate-500 bg-slate-950/20 border-slate-800'
                    }`}>
                      SL: {position.stopLossPrice ? `$${position.stopLossPrice.toFixed(2)}` : 'Not set'}
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded border ${
                      position.takeProfitPrice 
                        ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                        : 'text-slate-500 bg-slate-950/20 border-slate-800'
                    }`}>
                      TP: {position.takeProfitPrice ? `$${position.takeProfitPrice.toFixed(2)}` : 'Not set'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 text-right">
                  <button
                    onClick={() => handleOpenSLTPModal(position)}
                    className="flex items-center space-x-1 btn btn-secondary btn-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold"
                  >
                    <Sliders size={14} />
                    <span>SL/TP</span>
                  </button>
                  <button
                    onClick={() => handleClosePosition(position)}
                    className="flex items-center space-x-1 btn btn-danger btn-sm"
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cài Đặt SL/TP */}
      {selectedPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md bg-slate-900 border border-slate-700 p-6 space-y-6 relative rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Sliders className="text-indigo-400" size={20} />
                  <span>Cài đặt SL / TP</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Cập nhật cắt lỗ/chốt lời cho vị thế {selectedPosition.symbol}</p>
              </div>
              <button 
                onClick={() => setSelectedPosition(null)}
                className="text-slate-400 hover:text-white transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Position Summary Card */}
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Vị thế</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  selectedPosition.side === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {selectedPosition.side} {selectedPosition.quantity} lot
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs text-slate-400">Giá Vốn (Entry)</span>
                <span className="font-bold text-white">${selectedPosition.entryPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs text-slate-400">Giá Hiện Tại</span>
                <span className="font-bold text-indigo-400">${selectedPosition.currentPrice?.toFixed(2)}</span>
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              {/* Stop Loss Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-red-400 flex items-center space-x-1">
                    <ShieldAlert size={16} />
                    <span>Stop Loss (Cắt lỗ)</span>
                  </label>
                  <span className="text-xs text-slate-500">Kích hoạt khi giá đi ngược xu hướng</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Không giới hạn"
                    value={slValue}
                    onChange={(e) => setSlValue(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-red-500/50 rounded-xl py-2 pl-7 pr-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all font-bold text-lg"
                  />
                  {slValue && (
                    <button 
                      onClick={() => setSlValue('')}
                      className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Xóa SL
                    </button>
                  )}
                </div>
                {/* Presets for SL */}
                <div className="flex space-x-2 pt-1">
                  <button 
                    onClick={() => applyPreset('SL', 0.01)}
                    className="px-2.5 py-1 bg-slate-950/40 hover:bg-red-500/10 border border-slate-800/80 hover:border-red-500/20 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 transition-all duration-200"
                  >
                    Lệch 1%
                  </button>
                  <button 
                    onClick={() => applyPreset('SL', 0.02)}
                    className="px-2.5 py-1 bg-slate-950/40 hover:bg-red-500/10 border border-slate-800/80 hover:border-red-500/20 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 transition-all duration-200"
                  >
                    Lệch 2%
                  </button>
                </div>
              </div>

              {/* Take Profit Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-green-400 flex items-center space-x-1">
                    <Target size={16} />
                    <span>Take Profit (Chốt lời)</span>
                  </label>
                  <span className="text-xs text-slate-500">Chốt lãi khi giá đạt mục tiêu mong đợi</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Không giới hạn"
                    value={tpValue}
                    onChange={(e) => setTpValue(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-green-500/50 rounded-xl py-2 pl-7 pr-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-all font-bold text-lg"
                  />
                  {tpValue && (
                    <button 
                      onClick={() => setTpValue('')}
                      className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Xóa TP
                    </button>
                  )}
                </div>
                {/* Presets for TP */}
                <div className="flex space-x-2 pt-1">
                  <button 
                    onClick={() => applyPreset('TP', 0.02)}
                    className="px-2.5 py-1 bg-slate-950/40 hover:bg-green-500/10 border border-slate-800/80 hover:border-green-500/20 rounded-lg text-xs font-semibold text-slate-400 hover:text-green-400 transition-all duration-200"
                  >
                    Mục tiêu 2%
                  </button>
                  <button 
                    onClick={() => applyPreset('TP', 0.05)}
                    className="px-2.5 py-1 bg-slate-950/40 hover:bg-green-500/10 border border-slate-800/80 hover:border-green-500/20 rounded-lg text-xs font-semibold text-slate-400 hover:text-green-400 transition-all duration-200"
                  >
                    Mục tiêu 5%
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPosition(null)}
                className="flex-1 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl py-2.5 font-bold transition-all duration-200 text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingSLTP}
                onClick={handleSaveSLTP}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl py-2.5 font-bold shadow-lg shadow-indigo-600/20 transition-all duration-200 text-sm flex items-center justify-center space-x-1"
              >
                {savingSLTP ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
