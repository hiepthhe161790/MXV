import { useEffect, useState } from 'react';
import StatsDashboard from '@/components/StatsDashboard';
import QuickActions from '@/components/QuickActions';
import OrderForm from '@/components/OrderForm';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import { Zap, TrendingUp, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const priceData = [
  { time: '00:00', price: 2100, pnl: 0 },
  { time: '04:00', price: 2105, pnl: 250 },
  { time: '08:00', price: 2098, pnl: -100 },
  { time: '12:00', price: 2110, pnl: 500 },
  { time: '16:00', price: 2108, pnl: 400 },
  { time: '20:00', price: 2115, pnl: 750 },
];

export default function DashboardPage() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const [eodLoading, setEodLoading] = useState(false);

  const handleEOD = async () => {
    setEodLoading(true);
    try {
      await tradingService.triggerEODSettlement();
      toast.success('EOD Settlement đã hoàn thành');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'EOD Settlement thất bại');
    } finally {
      setEodLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-slate-400 mt-1">Tổng quan hệ thống giao dịch hàng hóa phái sinh</p>
        </div>
        <button
          onClick={handleEOD}
          disabled={eodLoading}
          className="btn btn-secondary flex items-center space-x-2 text-sm disabled:opacity-50"
        >
          <Zap size={16} />
          <span>{eodLoading ? 'Processing...' : 'EOD Settlement'}</span>
        </button>
      </div>

      {/* Stats Dashboard */}
      <StatsDashboard />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Market Price</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* P&L Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Profit & Loss</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  fill="rgba(16, 185, 129, 0.1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="space-y-6">
          <OrderForm />
          <QuickActions />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { type: 'ORDER_FILLED', message: 'Order #ORD-2024-001 filled at $2,110', time: '5m ago' },
            { type: 'POSITION_OPENED', message: 'Opened LONG position on GCZ24', time: '15m ago' },
            { type: 'DEPOSIT', message: 'Deposit of $5,000 confirmed', time: '1h ago' },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div>
                <p className="text-sm text-white">{activity.message}</p>
                <p className="text-xs text-slate-400">{activity.time}</p>
              </div>
              <div className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                {activity.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
