import { useEffect, useState } from 'react';
import StatsDashboard from '@/components/StatsDashboard';
import QuickActions from '@/components/QuickActions';
import OrderForm from '@/components/OrderForm';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import { Zap, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const { prices, isConnected } = useMarketSocket();
  const [eodLoading, setEodLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Seed initial Gold (GCZ24) price history and P&L history for charts
  const [goldHistory, setGoldHistory] = useState<{ time: string; price: number; pnl: number }[]>(() => {
    let price = 2150;
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => {
      price += (Math.random() - 0.495) * 1.5;
      const t = new Date(now - (30 - i) * 60000);
      return {
        time: t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0'),
        price: parseFloat(price.toFixed(2)),
        pnl: 0,
      };
    });
  });

  // Pull real recent activities (deposits, withdrawals, order fills)
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const accountId = authStore.account?._id;
        if (!accountId) return;

        const [txs, ords] = await Promise.all([
          tradingService.getTransactions(accountId, 10),
          tradingService.getOrders(accountId),
        ]);

        const items: any[] = [];
        
        // Map transactions
        (txs || []).forEach((t: any) => {
          items.push({
            type: t.type,
            message: `${t.type === 'DEPOSIT' ? 'Nạp tiền' : 'Rút tiền'} $${t.amount.toLocaleString()} — ${t.status.toLowerCase()}`,
            time: new Date(t.createdAt).toLocaleTimeString(),
            rawTime: new Date(t.createdAt).getTime(),
          });
        });

        // Map orders
        (ords || []).forEach((o: any) => {
          const status = o.state || o.status || 'PENDING';
          const price = o.averagePrice && o.averagePrice > 0 ? o.averagePrice : (o.limitPrice || o.executedPrice || 0);
          items.push({
            type: `ORDER_${status}`,
            message: `Khớp lệnh ${o.side} ${o.quantity} ${o.symbol} tại $${price.toLocaleString()} (${o.orderType})`,
            time: new Date(o.createdAt).toLocaleTimeString(),
            rawTime: new Date(o.createdAt).getTime(),
          });
        });

        // Sort latest first
        items.sort((a, b) => b.rawTime - a.rawTime);
        setActivities(items.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch recent activities:', err);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update dynamic gold price and store P&L history over time
  useEffect(() => {
    const goldFeed = prices['GCZ24'];
    if (goldFeed) {
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
      const totalUnrealizedPnL = store.positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);

      setGoldHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.price === goldFeed.price && last.pnl === totalUnrealizedPnL) {
          return prev;
        }
        return [
          ...prev.slice(-39),
          {
            time: timeStr,
            price: goldFeed.price,
            pnl: parseFloat(totalUnrealizedPnL.toFixed(2)),
          },
        ];
      });
    }
  }, [prices, store.positions]);

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
          <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
            <span>Trading Dashboard</span>
            {isConnected && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-normal animate-pulse">Live</span>}
          </h1>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Biểu đồ Vàng giao ngay (GCZ24)</h3>
              <p className="text-sm font-mono text-slate-300">
                Giá hiện tại: <span className="font-bold text-green-400">${(prices['GCZ24']?.price ?? 2150).toFixed(2)}</span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={goldHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* P&L Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Profit & Loss thời gian thực</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={goldHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  fill="rgba(16, 185, 129, 0.1)"
                  isAnimationActive={false}
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
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Activity size={18} className="text-blue-400" />
          <span>Hoạt động gần đây</span>
        </h3>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Chưa có giao dịch hoặc lệnh nào được tạo gần đây.</div>
          ) : (
            activities.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/80 transition-colors border border-slate-700"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{activity.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded font-mono ${
                  activity.type.includes('FILLED') || activity.type === 'DEPOSIT' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : activity.type.includes('REJECTED') || activity.type.includes('CANCELED')
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {activity.type}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
