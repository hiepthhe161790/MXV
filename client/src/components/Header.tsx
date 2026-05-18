import React from 'react';
import { Bell, Settings, User } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';

export default function Header() {
  const { account } = useAuthStore();
  const { marginLevel } = useTradingStore();

  const getMarginStatus = () => {
    if (marginLevel >= 100) return 'safe';
    if (marginLevel >= 50) return 'warning';
    return 'danger';
  };

  const statusColor = {
    safe: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Welcome, {account?.kyc?.fullName || 'Trader'}
        </h2>
        <p className="text-xs text-slate-400">Account: {account?.accountNumber}</p>
      </div>

      <div className="flex items-center space-x-6">
        {/* Margin Status */}
        <div className="text-right">
          <p className="text-xs text-slate-400">Margin Level</p>
          <p className={`text-lg font-semibold ${statusColor[getMarginStatus()]}`}>
            {(marginLevel ?? 0).toFixed(2)}%
          </p>
        </div>

        {/* Icons */}
        <button className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
          <Settings size={20} />
        </button>

        <button className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
