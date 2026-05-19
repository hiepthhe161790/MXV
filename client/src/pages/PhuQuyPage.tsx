import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Database, 
  Calendar, 
  ShieldCheck, 
  Award,
  Sparkles,
  Info,
  Maximize2,
  Download,
  QrCode,
  X
} from 'lucide-react';
import { phuQuyService, PhuQuyGoldPrice, PhuQuyQRProduct, PhuQuyStatus } from '@/services/phuQuyService';
import { toast } from 'react-hot-toast';

export default function PhuQuyPage() {
  // State variables
  const [prices, setPrices] = useState<PhuQuyGoldPrice[]>([]);
  const [pricesSource, setPricesSource] = useState<string>('cache');
  const [pricesTimestamp, setPricesTimestamp] = useState<string | null>(null);
  
  const [qrSerial, setQrSerial] = useState<string>('');
  const [qrResult, setQrResult] = useState<PhuQuyQRProduct | null>(null);
  const [qrSource, setQrSource] = useState<string | null>(null);
  const [zoomQR, setZoomQR] = useState<boolean>(false);
  
  const [status, setStatus] = useState<PhuQuyStatus | null>(null);
  
  // Loading states
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [loadingQR, setLoadingQR] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Quick search examples
  const examples = ['CBETDRX12', 'SJC1L-MOCK', '0000541H3N1'];

  // Load initial data
  useEffect(() => {
    fetchPrices();
    fetchStatus();
  }, []);

  const fetchPrices = async () => {
    setLoadingPrices(true);
    try {
      const res = await phuQuyService.getPriceList();
      if (res && res.data) {
        setPrices(res.data);
        setPricesSource(res.source);
        setPricesTimestamp(res.timestamp ? new Date(res.timestamp).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách giá vàng');
    } finally {
      setLoadingPrices(false);
    }
  };

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await phuQuyService.getIntegrationStatus();
      if (res && res.data) {
        setStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleManualSync = async () => {
    setLoadingPrices(true);
    const syncToast = toast.loading('Đang gửi yêu cầu đồng bộ với Portal Phú Quý...');
    try {
      const res = await phuQuyService.manualSync();
      if (res && res.data) {
        setPrices(res.data);
        setPricesSource(res.source);
        setPricesTimestamp(res.timestamp ? new Date(res.timestamp).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN'));
        
        toast.success(`Đồng bộ thành công (${res.source === 'live' ? 'Kết nối trực tiếp' : 'Giả lập Sandbox'})`, { id: syncToast });
        fetchStatus();
      } else {
        toast.error('Đồng bộ thất bại', { id: syncToast });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống khi đồng bộ', { id: syncToast });
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleQRSearch = async (e?: React.FormEvent, directSerial?: string) => {
    if (e) e.preventDefault();
    const searchVal = directSerial || qrSerial;
    
    if (!searchVal.trim()) {
      toast.error('Vui lòng nhập mã QR hoặc số Serial');
      return;
    }

    setLoadingQR(true);
    setQrResult(null);
    setQrSource(null);
    
    try {
      const res = await phuQuyService.searchQR(searchVal);
      if (res.success && res.data) {
        setQrResult(res.data);
        setQrSource(res.source);
        toast.success(`Tra cứu thành công (${res.source === 'cache' ? 'Từ cache DB' : 'Từ đối tác Phú Quý'})`);
        fetchStatus(); // Refresh cache stats
      } else {
        toast.error(res.message || 'Không tìm thấy thông tin sản phẩm');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tra cứu sản phẩm');
    } finally {
      setLoadingQR(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'live':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"><CheckCircle2 size={12} /> Trực Tiếp (Live API)</span>;
      case 'cache':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"><Database size={12} /> Cache Hệ Thống (Offline Safe)</span>;
      case 'sandbox':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"><Sparkles size={12} /> Giả lập Sandbox</span>;
      default:
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">Mặc định</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/10">
              <Coins size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Cổng Tích Hợp Portal Phú Quý</h1>
          </div>
          <p className="text-sm text-slate-400">
            Tra cứu bảng giá vàng thời gian thực và xác thực nguồn gốc sản phẩm vàng Phú Quý thông qua MSB Gateway.
          </p>
        </div>
        
        <button
          onClick={handleManualSync}
          disabled={loadingPrices}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-500 hover:to-amber-600 active:scale-95 transition-all text-sm font-semibold shadow-lg shadow-amber-600/15 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`mr-1 ${loadingPrices ? 'animate-spin' : ''}`} />
          <span>Đồng bộ giá trực tiếp</span>
        </button>
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Connection Health */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-400 group-hover:scale-110 transition-transform">
            <Server size={80} />
          </div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Server size={16} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-400">Kết Nối Đối Tác</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold text-white">
              {status?.mockMode ? 'Chế độ Sandbox' : 'Kết nối MSB'}
            </h3>
            <span className={`w-2.5 h-2.5 rounded-full ${status?.connectionStatus === 'ERROR' ? 'bg-red-400 animate-pulse' : 'bg-green-400 animate-pulse'}`} />
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate">
            Base URL: <span className="font-mono text-slate-400">{status?.baseUrl}</span>
          </p>
        </div>

        {/* Card 2: Bearer Token status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-400 group-hover:scale-110 transition-transform">
            <ShieldCheck size={80} />
          </div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck size={16} className="text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-400">Bearer Token JWT</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold text-white">
              {status?.tokenCached ? 'Đã kích hoạt' : 'Chưa lấy'}
            </h3>
            {status?.tokenCached && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                {status?.tokenTimeRemainingMinutes} phút
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tự động làm mới sau: <span className="text-slate-400">1 giờ 45 phút</span>
          </p>
        </div>

        {/* Card 3: Cache MongoDB Statistics */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-400 group-hover:scale-110 transition-transform">
            <Database size={80} />
          </div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Database size={16} className="text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-400">Dữ liệu MongoDB Cache</span>
          </div>
          <div className="flex items-baseline space-x-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">{status?.cacheStats?.pricesCached || 0}</span>
              <span className="text-xs text-slate-500">giá</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">{status?.cacheStats?.qrsCached || 0}</span>
              <span className="text-xs text-slate-500">sản phẩm</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tránh gián đoạn: <span className="text-slate-400">Sẵn sàng phục vụ ngoại tuyến</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Price Table and QR Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Gold Pricing - 7 spans */}
        <div className="lg:col-span-7 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Coins className="text-amber-500" size={18} />
              <h2 className="text-lg font-bold text-white">Bảng Giá Vàng Niêm Yết Phú Quý</h2>
            </div>
            {getSourceBadge(pricesSource)}
          </div>

          <div className="p-4 bg-slate-900/40 border-b border-slate-700 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>Cập nhật lần cuối: <span className="text-slate-200 font-medium font-mono">{pricesTimestamp || '--:--'}</span></span>
            </div>
            <div className="flex items-center space-x-1">
              <Info size={12} className="text-slate-500" />
              <span>Đơn vị: <span className="font-semibold text-slate-200">VND</span></span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loadingPrices && prices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="animate-spin text-amber-500" size={32} />
                <span className="text-sm text-slate-400">Đang đồng bộ giá vàng từ Portal Phú Quý...</span>
              </div>
            ) : prices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
                <AlertTriangle size={32} />
                <span>Không có dữ liệu giá vàng. Vui lòng bấm Đồng bộ giá.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/20 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700">
                    <th className="px-5 py-3.5">Mã SP</th>
                    <th className="px-5 py-3.5">Tên sản phẩm</th>
                    <th className="px-5 py-3.5">Đơn vị</th>
                    <th className="px-5 py-3.5 text-right">Giá mua vào</th>
                    <th className="px-5 py-3.5 text-right">Giá bán ra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {prices.map((item) => (
                    <tr 
                      key={item.goods_id} 
                      className="hover:bg-slate-700/30 transition-all group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-xs text-amber-400 group-hover:text-amber-300">
                        {item.goods_id}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-white">
                        {item.name}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300">
                        {item.unit_name}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold font-mono text-emerald-400 text-right">
                        {formatCurrency(item.buy_price)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold font-mono text-rose-400 text-right">
                        {formatCurrency(item.sell_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="p-4 bg-slate-900/30 border-t border-slate-700 text-xs text-slate-500 leading-relaxed">
            * Cổng Gateway của chúng tôi tự động lưu dữ liệu bảng giá vào cơ sở dữ liệu MongoDB. Trường hợp máy chủ API đối tác Phú Quý bị gián đoạn kết nối, hệ thống sẽ tự động cung cấp mức giá giao dịch gần nhất từ Cache để đảm bảo trải nghiệm giao dịch liên tục.
          </div>
        </div>

        {/* Right Column: QR/Serial lookup certificate - 5 spans */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Lookup Input Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Search className="text-amber-500" size={18} />
              Tra cứu thông tin sản phẩm vàng
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Nhập mã QR hoặc số Serial (có trên bao bì kiểm định của Phú Quý) để tra cứu thông tin chứng thư vàng chính hãng.
            </p>

            <form onSubmit={handleQRSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: CBETDRX12..."
                  value={qrSerial}
                  onChange={(e) => setQrSerial(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 font-mono"
                />
                <button
                  type="submit"
                  disabled={loadingQR}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {loadingQR ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                </button>
              </div>

              {/* Quick links examples */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Mã thử nhanh:</span>
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setQrSerial(ex);
                      handleQRSearch(undefined, ex);
                    }}
                    className="text-[11px] font-mono bg-slate-700 hover:bg-slate-600 text-amber-400 hover:text-white px-2 py-0.5 rounded transition-all border border-slate-600"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Verification Result Display */}
          {loadingQR ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-slate-400 space-y-3 shadow-xl">
              <RefreshCw className="animate-spin text-amber-500" size={32} />
              <span className="text-sm">Đang kiểm định chứng thư sản phẩm...</span>
            </div>
          ) : qrResult ? (
            /* Premium Certificate Card */
            <div className="bg-slate-800 border-2 border-amber-500/60 rounded-xl p-5 shadow-2xl relative overflow-hidden group">
              {/* Gold security background patterns */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Golden border decorative frame */}
              <div className="border border-amber-500/20 rounded-lg p-4 relative">
                {/* Stamp */}
                <div className="absolute top-2 right-2 border-2 border-emerald-500/40 text-emerald-400/80 rounded-full px-2.5 py-1 text-[9px] uppercase font-bold tracking-widest rotate-12 pointer-events-none flex items-center gap-1 font-mono">
                  <Award size={10} /> Đã Kiểm Định
                </div>

                <div className="flex flex-col items-center mb-4 text-center">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} /> Phú Quý Authentication <Sparkles size={10} />
                  </span>
                  <h3 className="text-base font-bold text-white uppercase mt-0.5">Chứng Thư Xác Thực Sản Phẩm</h3>
                  <div className="h-0.5 w-12 bg-amber-500/50 mt-1.5" />
                </div>

                {/* Visual QR Code Display Section */}
                <div className="my-5 flex flex-col items-center justify-center p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl relative group/qr overflow-hidden shadow-inner">
                  {/* Glowing secure badge and scanning lines */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan shadow-[0_0_8px_rgba(245,158,11,0.8)] pointer-events-none" />
                  
                  {/* Corner brackets */}
                  <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-500/30 rounded-tl" />
                  <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-500/30 rounded-tr" />
                  <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-500/30 rounded-bl" />
                  <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-500/30 rounded-br" />

                  {/* QR Image Container with premium frame */}
                  <div className="relative p-3.5 bg-white rounded-xl shadow-lg border border-amber-500/10 transition-all duration-300 group-hover/qr:scale-105 group-hover/qr:shadow-amber-500/10 group-hover/qr:shadow-2xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrResult.QrCode)}&color=0f172a&bgcolor=ffffff`}
                      alt="Mã QR Phú Quý"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                    
                    {/* Hover actions menu */}
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm opacity-0 group-hover/qr:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 rounded-xl">
                      <button
                        onClick={() => setZoomQR(true)}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-all shadow-md active:scale-95"
                      >
                        <Maximize2 size={12} />
                        <span>Phóng to</span>
                      </button>
                      
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrResult.QrCode)}&color=000000&bgcolor=ffffff`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <Download size={12} />
                        <span>Tải mã QR</span>
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-slate-400">
                    <QrCode size={14} className="text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Bảo mật mã QR: {qrResult.QrCode}</span>
                  </div>
                </div>

                {/* Grid of specifications */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Tên sản phẩm</span>
                    <span className="font-bold text-white text-right max-w-[200px] truncate">{qrResult.TenSanPham}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Mã sản phẩm</span>
                    <span className="font-semibold text-amber-300 font-mono">{qrResult.MaSP}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Số Serial</span>
                    <span className="font-semibold text-white font-mono">{qrResult.Serial}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Mã QR Code</span>
                    <span className="text-slate-300 font-mono text-[11px]">{qrResult.QrCode}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Chất liệu</span>
                    <span className="font-medium text-white">{qrResult.ChatLieu}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Hàm lượng</span>
                    <span className="font-bold text-amber-400">{qrResult.HamLuong}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Khối lượng</span>
                    <span className="font-medium text-slate-200">{qrResult.KL_gram} ({qrResult.KL_Chi})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Xuất xứ</span>
                    <span className="text-slate-200">{qrResult.XuatXu}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Ngày xuất xưởng</span>
                    <span className="text-slate-300 font-mono">{qrResult.NgayXuatXuong ? new Date(qrResult.NgayXuatXuong).toLocaleDateString('vi-VN') : '30 ngày trước'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
                    <span className="text-slate-400">Ngày kiểm định</span>
                    <span className="text-slate-300 font-mono">{new Date(qrResult.NgayKiemDinh).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Đơn vị kiểm định</span>
                    <span className="text-slate-300 italic">{qrResult.DonviKD}</span>
                  </div>
                </div>

                {/* Footer seal validation */}
                <div className="mt-4 bg-slate-900/60 rounded-lg p-2.5 flex items-center space-x-2.5 border border-slate-700/50">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider leading-none">Chất lượng được bảo đảm</p>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">Nguồn cấp: {qrSource === 'cache' ? 'Mạng an toàn DB Cache' : 'Trực tiếp đối tác'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Blank state */
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 shadow-xl border-dashed">
              <Award size={48} className="text-slate-600 mb-3" />
              <p className="text-sm font-semibold">Chưa có thông tin tra cứu</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                Nhập số Serial ở trên hoặc bấm vào các mã thử nhanh để hiển thị chứng nhận bảo chứng chất lượng vàng Phú Quý.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
