import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export default function QuickActions() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');

  const handleDeposit = () => {
    console.log('Depositing:', { amount, bankCode });
  };

  const handleWithdraw = () => {
    console.log('Withdrawing:', { amount, bankCode });
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 bg-slate-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded transition-all ${
            activeTab === 'deposit'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus size={18} />
          <span>Deposit</span>
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded transition-all ${
            activeTab === 'withdraw'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Minus size={18} />
          <span>Withdraw</span>
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Bank</label>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="input"
          >
            <option value="">Select a bank</option>
            <option value="MB">MB Bank</option>
            <option value="TCB">Techcombank</option>
            <option value="VCB">VietcomBank</option>
            <option value="ACB">ACB Bank</option>
          </select>
        </div>

        <button
          onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
          className={`w-full btn ${
            activeTab === 'deposit' ? 'btn-primary' : 'btn-danger'
          }`}
        >
          {activeTab === 'deposit' ? 'Deposit Now' : 'Withdraw Now'}
        </button>
      </div>
    </div>
  );
}
