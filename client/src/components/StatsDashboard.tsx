import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import toast from 'react-hot-toast';

interface StatCard {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}

export default function StatsDashboard() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const accountId = authStore.account?._id;
        if (!accountId) {
          setLoading(false);
          return;
        }

        const balanceData = await tradingService.getBalance(accountId);
        store.setBalance(balanceData);

        const positionsSummary = await tradingService.getPositionSummary(accountId);

        setStats([
          {
            label: 'Total Balance',
            value: `$${balanceData.totalBalance?.toLocaleString() || 0}`,
            icon: <Zap className="w-6 h-6 text-blue-400" />,
          },
          {
            label: 'Available Balance',
            value: `$${balanceData.availableBalance?.toLocaleString() || 0}`,
            icon: <TrendingUp className="w-6 h-6 text-green-400" />,
          },
          {
            label: 'Unrealized P&L',
            value: `$${positionsSummary.totalUnrealizedPnL?.toLocaleString() || 0}`,
            change: positionsSummary.totalUnrealizedPnL,
            icon: <Activity className="w-6 h-6 text-purple-400" />,
          },
          {
            label: 'Open Positions',
            value: `${positionsSummary.totalPositions || 0}`,
            icon: <TrendingDown className="w-6 h-6 text-orange-400" />,
          },
          {
            label: 'Margin Level',
            value: `${balanceData.marginLevel ?? 100}%`,
            change: (balanceData.marginLevel ?? 100) >= 200 ? 1 : -1,
            icon: <Activity className="w-6 h-6 text-yellow-400" />,
          },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error loading stats:', error);
        toast.error('Failed to load dashboard stats');
        setLoading(false);
      }
    };


    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-32 bg-slate-700"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="card animate-slideInUp hover:shadow-lg transition-shadow"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              {stat.change !== undefined && (
                <p
                  className={`text-xs mt-2 ${
                    stat.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.change >= 0 ? '+' : ''}
                  {stat.change?.toFixed(2)}
                </p>
              )}
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
