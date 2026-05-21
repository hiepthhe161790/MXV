import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore, useTradingStore } from '@/context/store';
import { tradingService } from '@/services/tradingService';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import toast from 'react-hot-toast';

const BASE_PRICES: Record<string, number> = {
  'GCZ24': 2150,
  'SIZ24': 25.5,
  'CLZ24': 78.5,
  'NGF25': 2.8,
  'HGZ24': 3.95,
  'ZCZ24': 470,
  'ZSF25': 1020,
  'KCZ24': 185,
};

export default function OrderForm({ preselectedSymbol }: { preselectedSymbol?: string }) {
  const { account } = useAuthStore();
  const { prices } = useMarketSocket();
  const { orders, setOrders } = useTradingStore();

  // Track if user has manually edited the limit price (to avoid overwriting their input)
  const [userEditedPrice, setUserEditedPrice] = useState(false);

  const [formData, setFormData] = useState({
    symbol: preselectedSymbol || 'GCZ24',
    side: 'BUY',
    quantity: 1,
    orderType: 'LIMIT',
    // Start with base price; live price will override once WebSocket delivers it
    limitPrice: BASE_PRICES[preselectedSymbol || 'GCZ24'],
    stopPrice: '',
  });

  const [loading, setLoading] = useState(false);

  // Sync when preselectedSymbol changes (user clicked a different instrument in the table)
  useEffect(() => {
    if (preselectedSymbol) {
      const livePrice = prices[preselectedSymbol]?.price ?? BASE_PRICES[preselectedSymbol] ?? 0;
      setFormData((prev) => ({
        ...prev,
        symbol: preselectedSymbol,
        limitPrice: livePrice,
      }));
      // Reset user-edit flag when symbol changes so live price can auto-populate
      setUserEditedPrice(false);
    }
  }, [preselectedSymbol]);

  // Auto-update limitPrice when the live price for the selected symbol first arrives from WebSocket
  // Only fires if user hasn't manually changed the price
  useEffect(() => {
    if (userEditedPrice) return;
    const livePrice = prices[formData.symbol]?.price;
    if (livePrice && livePrice > 0) {
      setFormData((prev) => ({ ...prev, limitPrice: livePrice }));
    }
  }, [prices[formData.symbol]?.price]);

  // Handle manual dropdown selection
  const handleSymbolChange = (symbol: string) => {
    const livePrice = prices[symbol]?.price ?? BASE_PRICES[symbol] ?? 0;
    setFormData((prev) => ({
      ...prev,
      symbol,
      limitPrice: livePrice,
    }));
    setUserEditedPrice(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?._id) {
      toast.error('Bạn cần đăng nhập trước khi tạo lệnh');
      return;
    }

    setLoading(true);

    try {
      // Generate unique idempotency key to prevent duplicate orders
      const idempotencyKey = `${account._id}-${formData.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        accountId: account._id,
        symbol: formData.symbol,
        side: formData.side as 'BUY' | 'SELL',
        quantity: formData.quantity,
        orderType: formData.orderType as 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT',
        limitPrice:
          formData.orderType === 'LIMIT' || formData.orderType === 'STOP_LIMIT'
            ? Number(formData.limitPrice)
            : undefined,
        stopPrice:
          formData.orderType === 'STOP' || formData.orderType === 'STOP_LIMIT'
            ? Number(formData.stopPrice)
            : undefined,
        idempotencyKey,
      };

      const order = await tradingService.createOrder(payload);
      toast.success('Order created successfully');
      setOrders([...(orders || []), order]);
      // Reset form after successful order
      setFormData({
        symbol: preselectedSymbol || 'GCZ24',
        side: 'BUY',
        quantity: 1,
        orderType: 'LIMIT',
        limitPrice: BASE_PRICES[preselectedSymbol || 'GCZ24'],
        stopPrice: '',
      });
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to create order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <Plus size={20} />
        <span>Create Order</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Symbol and Side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Symbol</label>
            <select
              value={formData.symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="input"
            >
              <option value="GCZ24">GCZ24 — Gold</option>
              <option value="SIZ24">SIZ24 — Silver</option>
              <option value="CLZ24">CLZ24 — Crude Oil</option>
              <option value="NGF25">NGF25 — Natural Gas</option>
              <option value="HGZ24">HGZ24 — Copper</option>
              <option value="ZCZ24">ZCZ24 — Corn</option>
              <option value="ZSF25">ZSF25 — Soybeans</option>
              <option value="KCZ24">KCZ24 — Coffee</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Side</label>
            <select
              value={formData.side}
              onChange={(e) => setFormData({ ...formData, side: e.target.value })}
              className="input"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>

        {/* Quantity and Order Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) })
              }
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Type</label>
            <select
              value={formData.orderType}
              onChange={(e) =>
                setFormData({ ...formData, orderType: e.target.value })
              }
              className="input"
            >
              <option value="MARKET">Market</option>
              <option value="LIMIT">Limit</option>
              <option value="STOP">Stop Loss</option>
              <option value="STOP_LIMIT">Stop Limit</option>
            </select>
          </div>
        </div>

        {/* Limit Price */}
        {(formData.orderType === 'LIMIT' || formData.orderType === 'STOP_LIMIT') && (
          <div>
            <label className="block text-sm text-slate-300 mb-2">Limit Price</label>
            <input
              type="number"
              step="any"
              value={formData.limitPrice}
              onChange={(e) => {
                setUserEditedPrice(true);
                setFormData({ ...formData, limitPrice: parseFloat(e.target.value) });
              }}
              className="input"
              placeholder="Enter limit price"
            />
          </div>
        )}

        {/* Stop Price */}
        {(formData.orderType === 'STOP' || formData.orderType === 'STOP_LIMIT') && (
          <div>
            <label className="block text-sm text-slate-300 mb-2">Stop Price</label>
            <input
              type="number"
              step="any"
              value={formData.stopPrice}
              onChange={(e) =>
                setFormData({ ...formData, stopPrice: e.target.value })
              }
              className="input"
              placeholder="Enter stop price"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
