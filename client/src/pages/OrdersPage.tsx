import { useEffect, useState } from 'react';
import { CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const store = useTradingStore();
  const authStore = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const accountId = authStore.account?._id;
        if (!accountId) {
          setLoading(false);
          return;
        }
        const response = await tradingService.getOrders(accountId);
        const orderData = response || [];
        setOrders(orderData);
        store.setOrders(orderData);
      } catch (error) {
        console.error('Error loading orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await tradingService.cancelOrder(orderId);
      setOrders(orders.filter((o) => o._id !== orderId));
      toast.success('Order cancelled');
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FILLED':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'PENDING':
        return <Clock size={18} className="text-yellow-400" />;
      case 'CANCELLED':
        return <XCircle size={18} className="text-red-400" />;
      default:
        return <Clock size={18} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILLED':
        return 'text-green-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'CANCELLED':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'ALL') return true;
    return order.status === filter;
  });

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading orders...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-slate-400 mt-2">View and manage all your trading orders</p>
        </div>
        <button className="btn btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>New Order</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 flex-wrap">
        {['ALL', 'PENDING', 'FILLED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition-all ${filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">No orders found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Filled</th>
                <th>Price</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td className="font-mono text-sm" title={order._id}>
                    {order._id ? order._id.substring(0, 8).toUpperCase() : 'N/A'}
                  </td>
                  <td className="font-bold">{order.symbol}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${order.side === 'BUY'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                        }`}
                    >
                      {order.side}
                    </span>
                  </td>
                  <td className="text-sm">{order.orderType}</td>
                  <td>{order.quantity}</td>
                  <td>
                    <div className={`flex items-center space-x-2 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="text-sm">{order.status}</span>
                    </div>
                  </td>
                  <td>{order.filledQuantity}</td>
                  <td>${order.executedPrice?.toFixed(2) || '-'}</td>
                  <td className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td>
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
