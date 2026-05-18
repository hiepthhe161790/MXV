import { useEffect, useState, useCallback } from 'react';
import { Shield, AlertTriangle, TrendingDown, Activity, RefreshCw, Zap } from 'lucide-react';
import { useAuthStore } from '@/context/store';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface RiskStatus {
  accountId: string;
  balance: number;
  frozenBalance: number;
  availableBalance: number;
  equity: number;
  totalMarginUsed: number;
  totalUnrealizedPnL: number;
  totalExposure: number;
  marginLevel: number;
  marginStatus: 'HEALTHY' | 'WARNING' | 'DANGER';
  openPositions: number;
  maxExposureLimit: number;
  exposureUsedPct: number;
}

const RISK_RULES = [
  { label: 'Đòn bẩy tối đa', value: '10:1', detail: 'MAX_LEVERAGE = 10' },
  { label: 'Ký quỹ tối thiểu', value: '10%', detail: 'MIN_MARGIN_REQUIREMENT = 10%' },
  { label: 'Giới hạn exposure', value: '$100,000', detail: 'MAX_EXPOSURE_PER_ACCOUNT' },
  { label: 'Ngưỡng Margin Call', value: '≤ 20%', detail: 'MARGIN_CALL_THRESHOLD' },
  { label: 'Ngưỡng Auto-Liquidation', value: '≤ 5%', detail: 'LIQUIDATION_THRESHOLD' },
];

export default function RiskMonitorPage() {
  const { account } = useAuthStore();
  const [risk, setRisk] = useState<RiskStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadRisk = useCallback(async () => {
    if (!account?._id) { setLoading(false); return; }
    try {
      const res = await api.get('/risk/status', { params: { accountId: account._id } });
      setRisk(res.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Risk status error:', err);
    } finally {
      setLoading(false);
    }
  }, [account?._id]);

  useEffect(() => {
    loadRisk();
    const interval = setInterval(loadRisk, 5000);
    return () => clearInterval(interval);
  }, [loadRisk]);

  const getMarginColor = (level: number) => {
    if (level >= 200) return 'text-green-400';
    if (level >= 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMarginBg = (level: number) => {
    if (level >= 200) return 'bg-green-500';
    if (level >= 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      HEALTHY: 'bg-green-600/20 text-green-400 border border-green-600/30',
      WARNING: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30',
      DANGER:  'bg-red-600/20 text-red-400 border border-red-600/30',
    };
    return map[status] || map.HEALTHY;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-700 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-32 bg-slate-700" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Shield className="text-blue-400" size={32} />
            <span>Risk Monitor</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Theo dõi rủi ro, margin level và giới hạn exposure theo thời gian thực
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button onClick={loadRisk} className="btn btn-secondary flex items-center space-x-2">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {!risk ? (
        <div className="card text-center py-16">
          <Shield size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Không có dữ liệu risk. Hãy đặt lệnh để bắt đầu theo dõi.</p>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          {risk.marginStatus !== 'HEALTHY' && (
            <div className={`rounded-xl p-4 flex items-center space-x-4 ${
              risk.marginStatus === 'DANGER'
                ? 'bg-red-900/30 border border-red-600/50'
                : 'bg-yellow-900/30 border border-yellow-600/50'
            }`}>
              <AlertTriangle size={24} className={risk.marginStatus === 'DANGER' ? 'text-red-400' : 'text-yellow-400'} />
              <div>
                <p className={`font-semibold ${risk.marginStatus === 'DANGER' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {risk.marginStatus === 'DANGER' ? '🚨 NGUY HIỂM: Margin Level dưới ngưỡng liquidation!' : '⚠️ CẢNH BÁO: Margin Call sắp xảy ra!'}
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  {risk.marginStatus === 'DANGER'
                    ? 'Vị thế có thể bị thanh lý cưỡng bức. Cần nộp thêm tiền hoặc đóng bớt vị thế ngay!'
                    : 'Margin Level đang dưới 20%. Cần bổ sung ký quỹ để tránh bị Margin Call.'}
                </p>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Margin Level — main card */}
            <div className="card col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm uppercase tracking-wider">Margin Level</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(risk.marginStatus)}`}>
                  {risk.marginStatus}
                </span>
              </div>
              <p className={`text-5xl font-bold ${getMarginColor(risk.marginLevel)}`}>
                {risk.marginLevel.toFixed(1)}%
              </p>
              <div className="mt-4 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getMarginBg(risk.marginLevel)}`}
                  style={{ width: `${Math.min(risk.marginLevel, 200) / 2}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>5% (Liquidation)</span>
                <span>20% (Margin Call)</span>
                <span>100%+</span>
              </div>
            </div>

            <div className="card">
              <p className="text-slate-400 text-sm mb-2">Vốn chủ sở hữu (Equity)</p>
              <p className="text-2xl font-bold text-white">${risk.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between"><span>Số dư:</span><span>${risk.balance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Unrealized P&L:</span>
                  <span className={risk.totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {risk.totalUnrealizedPnL >= 0 ? '+' : ''}${risk.totalUnrealizedPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <p className="text-slate-400 text-sm mb-2">Ký quỹ đang sử dụng</p>
              <p className="text-2xl font-bold text-orange-400">${risk.totalMarginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between"><span>Đang phong toả:</span><span>${risk.frozenBalance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Khả dụng:</span><span className="text-green-400">${risk.availableBalance.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="card">
              <p className="text-slate-400 text-sm mb-2">Tổng Exposure</p>
              <p className="text-2xl font-bold text-purple-400">${risk.totalExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Giới hạn: $100,000</span>
                  <span>{risk.exposureUsedPct}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${risk.exposureUsedPct > 80 ? 'bg-red-500' : risk.exposureUsedPct > 50 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(risk.exposureUsedPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <p className="text-slate-400 text-sm mb-2">Vị thế đang mở</p>
              <p className="text-2xl font-bold text-blue-400">{risk.openPositions}</p>
              <p className="text-xs text-slate-500 mt-2">Positions đang active</p>
            </div>

            <div className="card">
              <p className="text-slate-400 text-sm mb-2">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${risk.totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {risk.totalUnrealizedPnL >= 0 ? '+' : ''}${risk.totalUnrealizedPnL.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-2">Lợi nhuận chưa thực hiện</p>
            </div>
          </div>

          {/* Risk Rules */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Activity size={20} className="text-blue-400" />
              <span>Quy tắc Risk Engine</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {RISK_RULES.map((rule, i) => (
                <div key={i} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400">{rule.label}</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">{rule.value}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1">{rule.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Event Flow */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Zap size={20} className="text-yellow-400" />
              <span>Luồng sự kiện Risk (Event Flow)</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {['Đặt lệnh', '→', 'Risk Check', '→', 'OMS Validate', '→', 'Matching Engine', '→', 'Fill Order', '→', 'Position Update', '→', 'Margin Recalculate', '→', 'Alert nếu cần'].map((step, i) => (
                step === '→'
                  ? <span key={i} className="text-slate-500">→</span>
                  : <span key={i} className="px-3 py-1.5 bg-slate-700 rounded-lg text-slate-200 border border-slate-600">{step}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
