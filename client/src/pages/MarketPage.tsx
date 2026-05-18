import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart2, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import OrderForm from '@/components/OrderForm';

// ── Commodity catalog ──────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { symbol: 'GCZ24', name: 'Gold',          unit: 'oz',    group: 'Metals',   color: '#f59e0b', base: 2150, tickSize: 0.1, tickValue: 10,  leverage: 10, contractSize: 100 },
  { symbol: 'SIZ24', name: 'Silver',         unit: 'oz',    group: 'Metals',   color: '#94a3b8', base: 25.5, tickSize: 0.005, tickValue: 25, leverage: 10, contractSize: 5000 },
  { symbol: 'CLZ24', name: 'Crude Oil',      unit: 'bbl',   group: 'Energy',   color: '#3b82f6', base: 78.5, tickSize: 0.01, tickValue: 10,  leverage: 10, contractSize: 1000 },
  { symbol: 'NGF25', name: 'Natural Gas',    unit: 'MMBtu', group: 'Energy',   color: '#22d3ee', base: 2.8,  tickSize: 0.001, tickValue: 10,  leverage: 10, contractSize: 10000 },
  { symbol: 'HGZ24', name: 'Copper',         unit: 'lb',    group: 'Metals',   color: '#f97316', base: 3.95, tickSize: 0.0005, tickValue: 12.5, leverage: 10, contractSize: 25000 },
  { symbol: 'ZCZ24', name: 'Corn',           unit: 'bu',    group: 'Agri',     color: '#84cc16', base: 470,  tickSize: 0.25, tickValue: 12.5,   leverage: 10, contractSize: 5000 },
  { symbol: 'ZSF25', name: 'Soybeans',       unit: 'bu',    group: 'Agri',     color: '#65a30d', base: 1020, tickSize: 0.25, tickValue: 12.5,   leverage: 10, contractSize: 5000 },
  { symbol: 'KCZ24', name: 'Coffee',         unit: 'lb',    group: 'Agri',     color: '#a16207', base: 185,  tickSize: 0.05, tickValue: 18.75,  leverage: 10, contractSize: 37500 },
];

// ── Price simulation ───────────────────────────────────────────────────────────
function simulatePrices(base: number, count = 60): { time: string; price: number }[] {
  let price = base;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    price += (Math.random() - 0.495) * base * 0.002;
    price = Math.max(price, base * 0.85);
    const t = new Date(now - (count - i) * 60000);
    return {
      time: t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0'),
      price: parseFloat(price.toFixed(2)),
    };
  });
}

function useLivePrice(base: number) {
  const [price, setPrice] = useState(base);
  const [change, setChange] = useState(0);
  const [history, setHistory] = useState<{ time: string; price: number }[]>(() => simulatePrices(base));
  const baseRef = useRef(base);

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.495) * baseRef.current * 0.002;
      setPrice(p => {
        const newP = Math.max(parseFloat((p + delta).toFixed(2)), baseRef.current * 0.5);
        setChange(parseFloat((((newP - baseRef.current) / baseRef.current) * 100).toFixed(2)));
        setHistory(h => {
          const now = new Date();
          const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
          return [...h.slice(-79), { time: timeStr, price: newP }];
        });
        return newP;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return { price, change, history };
}

// ── Single instrument row ──────────────────────────────────────────────────────
function InstrumentRow({ inst, onClick, isSelected }: { inst: typeof INSTRUMENTS[0]; onClick: () => void; isSelected: boolean }) {
  const { price, change } = useLivePrice(inst.base);
  const isUp = change >= 0;
  return (
    <tr
      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/30' : 'hover:bg-slate-700/50'}`}
      onClick={onClick}
    >
      <td>
        <div>
          <p className="font-bold text-white">{inst.symbol}</p>
          <p className="text-xs text-slate-400">{inst.name}</p>
        </div>
      </td>
      <td>
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          inst.group === 'Metals' ? 'bg-yellow-600/20 text-yellow-400'
          : inst.group === 'Energy' ? 'bg-blue-600/20 text-blue-400'
          : 'bg-green-600/20 text-green-400'
        }`}>
          {inst.group}
        </span>
      </td>
      <td className="font-mono font-bold text-white">{price.toFixed(inst.tickSize < 0.01 ? 3 : 2)}</td>
      <td>
        <div className={`flex items-center space-x-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="font-semibold text-sm">{isUp ? '+' : ''}{change}%</span>
        </div>
      </td>
      <td className="text-slate-300 text-sm">{inst.contractSize.toLocaleString()} {inst.unit}</td>
      <td className="text-slate-300 text-sm">{inst.tickSize} / ${inst.tickValue}</td>
      <td className="text-slate-300 text-sm">{inst.leverage}:1</td>
    </tr>
  );
}

// ── Chart for selected instrument ─────────────────────────────────────────────
function PriceChart({ inst }: { inst: typeof INSTRUMENTS[0] }) {
  const { price, change, history } = useLivePrice(inst.base);
  const isUp = change >= 0;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{inst.symbol} — {inst.name}</h3>
          <p className="text-slate-400 text-sm">{inst.group} · Size: {inst.contractSize.toLocaleString()} {inst.unit}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{price.toFixed(inst.tickSize < 0.01 ? 3 : 2)}</p>
          <p className={`text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {change}%
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
            formatter={(v: any) => [`$${v}`, inst.symbol]}
          />
          <ReferenceLine y={inst.base} stroke="#475569" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="price" stroke={inst.color} dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      {/* Key info */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-700">
        <div><p className="text-xs text-slate-400">Tick Size</p><p className="text-sm font-semibold text-white">{inst.tickSize}</p></div>
        <div><p className="text-xs text-slate-400">Tick Value</p><p className="text-sm font-semibold text-white">${inst.tickValue}</p></div>
        <div><p className="text-xs text-slate-400">Đòn bẩy</p><p className="text-sm font-semibold text-white">{inst.leverage}:1</p></div>
        <div><p className="text-xs text-slate-400">Ký quỹ / lot</p><p className="text-sm font-semibold text-white">${((price * inst.contractSize) / inst.leverage).toFixed(0)}</p></div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MarketPage() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
          <BarChart2 className="text-green-400" size={32} />
          <span>Thị trường hàng hóa</span>
        </h1>
        <p className="text-slate-400 mt-1">
          Bảng giá hợp đồng tương lai — Metals · Energy · Nông sản
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden p-0">
            <div className="px-6 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center space-x-2">
              <Activity size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-white">Live Prices</span>
              <span className="ml-auto flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400">Simulated</span>
              </span>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Hợp đồng</th>
                  <th>Nhóm</th>
                  <th>Giá</th>
                  <th>Thay đổi</th>
                  <th>Kích cỡ HĐ</th>
                  <th>Tick Size/Value</th>
                  <th>Đòn bẩy</th>
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map(inst => (
                  <InstrumentRow
                    key={inst.symbol}
                    inst={inst}
                    onClick={() => setSelected(inst)}
                    isSelected={inst.symbol === selected.symbol}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: chart + order form */}
        <div className="space-y-4">
          <PriceChart inst={selected} />
          <OrderForm preselectedSymbol={selected.symbol} />
        </div>
      </div>
    </div>
  );
}
