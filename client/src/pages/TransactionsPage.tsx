import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, DollarSign, RefreshCw } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import toast from 'react-hot-toast';

type TabType = 'history' | 'deposit' | 'withdraw';

export default function TransactionsPage() {
  const authStore = useAuthStore();
  const store = useTradingStore();
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('history');
  const [formData, setFormData] = useState({ amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountId = authStore.account?._id;
      if (!accountId) { setLoading(false); return; }

      const [balanceData, txnData] = await Promise.all([
        tradingService.getBalance(accountId),
        tradingService.getTransactions(accountId),
      ]);
      setBalance(balanceData);
      store.setBalance(balanceData);
      setTransactions(txnData || []);
    } catch (error) {
      console.error('Error loading:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
    setSubmitting(true);
    try {
      const accountId = authStore.account?._id;
      if (!accountId) throw new Error('No account');
      await tradingService.deposit(accountId, amt, 'Nộp tiền');
      toast.success(`Nộp tiền $${amt.toLocaleString()} thành công`);
      setFormData({ amount: '' });
      await loadData();
      setTab('history');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
    if (balance && amt > balance.availableBalance) {
      toast.error('Insufficient available balance');
      return;
    }
    setSubmitting(true);
    try {
      const accountId = authStore.account?._id;
      if (!accountId) throw new Error('No account');
      await tradingService.withdraw(accountId, amt, 'Rút tiền');
      toast.success(`Rút tiền $${amt.toLocaleString()} thành công`);
      setFormData({ amount: '' });
      await loadData();
      setTab('history');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTxns = transactions.filter(tx => {
    if (filter === 'ALL') return true;
    return tx.type === filter;
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-20 bg-slate-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Giao dịch tài khoản</h1>
          <p className="text-slate-400 mt-1">Nộp tiền, rút tiền và lịch sử giao dịch</p>
        </div>
        <button
          onClick={loadData}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card border-l-4 border-blue-500">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Tổng số dư</p>
            <p className="text-2xl font-bold text-blue-400">
              ${(balance.totalBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card border-l-4 border-green-500">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Số dư khả dụng</p>
            <p className="text-2xl font-bold text-green-400">
              ${(balance.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card border-l-4 border-orange-500">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Đang phong toả (Ký quỹ)</p>
            <p className="text-2xl font-bold text-orange-400">
              ${(balance.frozenAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800 rounded-xl p-1 w-fit">
        {([
          { key: 'history', label: 'Lịch sử', icon: DollarSign },
          { key: 'deposit', label: 'Nộp tiền', icon: ArrowDownLeft },
          { key: 'withdraw', label: 'Rút tiền', icon: ArrowUpRight },
        ] as { key: TabType; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setFormData({ amount: '' }); }}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Deposit Form */}
      {tab === 'deposit' && (
        <div className="max-w-md">
          <div className="card space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Nộp tiền vào tài khoản</h3>
              <p className="text-slate-400 text-sm">Số tiền sẽ được cộng vào số dư khả dụng ngay lập tức</p>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Số tiền nộp (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ amount: e.target.value })}
                    placeholder="0.00"
                    step="any"
                    min="1"
                    className="input pl-7"
                    required
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex space-x-2">
                {[1000, 5000, 10000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFormData({ amount: String(amt) })}
                    className="flex-1 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-blue-600/30 hover:text-blue-300 transition-all"
                  >
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                <p className="text-xs text-green-400">
                  ✓ Demo: Tiền sẽ được ghi nhận ngay lập tức vào tài khoản
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn btn-success disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : '✓ Nộp tiền'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {tab === 'withdraw' && (
        <div className="max-w-md">
          <div className="card space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Rút tiền khỏi tài khoản</h3>
              <p className="text-slate-400 text-sm">
                Số dư khả dụng: <span className="text-green-400 font-semibold">
                  ${(balance?.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Số tiền rút (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ amount: e.target.value })}
                    placeholder="0.00"
                    step="any"
                    min="1"
                    max={balance?.availableBalance || 0}
                    className="input pl-7"
                    required
                  />
                </div>
              </div>

              <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-3">
                <p className="text-xs text-orange-400">
                  ⚠ Chỉ rút được số dư khả dụng. Số dư đang phong toả (ký quỹ) không thể rút.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn btn-danger disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : '↑ Rút tiền'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex space-x-2">
            {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'REALIZED_PNL'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {f === 'ALL' 
                  ? 'Tất cả' 
                  : f === 'DEPOSIT' 
                    ? 'Nộp tiền' 
                    : f === 'WITHDRAWAL'
                      ? 'Rút tiền'
                      : 'Khớp lệnh (PnL)'}
              </button>
            ))}
            <span className="ml-auto text-slate-400 text-sm self-center">
              {filteredTxns.length} giao dịch
            </span>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="card text-center py-16">
              <DollarSign size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg">Chưa có giao dịch nào</p>
              <p className="text-slate-500 text-sm mt-2">Nhấn "Nộp tiền" để bắt đầu</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Loại</th>
                    <th>Số tiền</th>
                    <th>Số dư trước</th>
                    <th>Số dư sau</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map(txn => {
                    const isDeposit = txn.type === 'DEPOSIT';
                    const isWithdrawal = txn.type === 'WITHDRAWAL';
                    const isRealizedPnL = txn.type === 'REALIZED_PNL';
                    const isProfit = isDeposit || (isRealizedPnL && txn.balanceAfter >= txn.balanceBefore);
                    
                    const colorClass = isProfit ? 'text-green-400' : 'text-red-400';
                    const amountSign = isProfit ? '+' : '-';
                    const Icon = isProfit ? ArrowDownLeft : ArrowUpRight;
                    
                    const typeLabel = isDeposit 
                      ? 'Nộp tiền' 
                      : isWithdrawal 
                        ? 'Rút tiền' 
                        : (txn.balanceAfter >= txn.balanceBefore ? 'Lợi nhuận' : 'Thua lỗ');

                    return (
                      <tr key={txn._id} title={txn.reason}>
                        <td className="font-mono text-xs text-slate-300" title={txn.transactionId}>
                          {txn.transactionId}
                        </td>
                        <td>
                          <div className={`flex items-center space-x-2 ${colorClass}`}>
                            <Icon size={14} />
                            <span className="text-xs font-semibold">{typeLabel}</span>
                          </div>
                        </td>
                        <td className={`font-bold ${colorClass}`}>
                          {amountSign}${ (txn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                        </td>
                        <td className="text-slate-400">
                          ${ (txn.balanceBefore || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                        </td>
                        <td className="text-white font-semibold">
                          ${ (txn.balanceAfter || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-600/20 text-green-400">
                            {txn.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">
                          {new Date(txn.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
