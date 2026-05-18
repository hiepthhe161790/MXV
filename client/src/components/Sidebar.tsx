import { Link, useLocation } from 'react-router-dom';
import { BarChart3, TrendingUp, Wallet, History, LogOut, Shield, ScrollText, BarChart2 } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';

const menuItems = [
  { icon: BarChart3,  label: 'Dashboard',     path: '/dashboard' },
  { icon: BarChart2,  label: 'Thị trường',    path: '/market' },
  { icon: TrendingUp, label: 'Vị thế',        path: '/positions' },
  { icon: Wallet,     label: 'Lệnh',          path: '/orders' },
  { icon: History,    label: 'Giao dịch',     path: '/transactions' },
  { icon: Shield,     label: 'Risk Monitor',  path: '/risk' },
  { icon: ScrollText, label: 'Audit Log',     path: '/audit' },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { marginLevel } = useTradingStore();

  const getMarginColor = () => {
    if (marginLevel >= 200 || marginLevel === 0) return 'text-green-400';
    if (marginLevel >= 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">MVX Trading</h1>
            <p className="text-xs text-slate-400">Phái sinh hàng hóa</p>
          </div>
        </div>
        {marginLevel > 0 && (
          <div className="mt-3 bg-slate-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400">Margin Level</p>
            <p className={`text-sm font-bold ${getMarginColor()}`}>{marginLevel.toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-2 mb-3 px-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">Backend connected</span>
        </div>
        <button
          onClick={() => { logout(); window.location.href = '/login'; }}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
