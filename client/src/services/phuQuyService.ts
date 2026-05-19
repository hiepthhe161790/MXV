import api from './api';

export interface PhuQuyGoldPrice {
  goods_id: string;
  name: string;
  unit_name: string;
  buy_price: number;
  sell_price: number;
  isFound: boolean;
}

export interface PhuQuyPriceResponse {
  success: boolean;
  message: string;
  source: 'live' | 'cache' | 'sandbox' | 'default';
  timestamp: string;
  data: PhuQuyGoldPrice[];
}

export interface PhuQuyQRProduct {
  QrCode: string;
  Serial: string;
  NgayXuatXuong?: string;
  ChatLieu: string;
  XuatXu: string;
  KL_Chi: string;
  KL_gram: string;
  HamLuong: number;
  TenSanPham: string;
  MaSP: string;
  NgayKiemDinh: string;
  DonviKD: string;
}

export interface PhuQuyQRResponse {
  success: boolean;
  message: string;
  source: 'live' | 'cache' | 'sandbox' | 'failed';
  timestamp: string;
  data?: PhuQuyQRProduct;
}

export interface PhuQuyStatus {
  baseUrl: string;
  mockMode: boolean;
  connectionStatus: 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS';
  lastSyncTime: string | null;
  lastSyncError: string | null;
  tokenCached: boolean;
  tokenTimeRemainingMinutes: number;
  cacheStats: {
    pricesCached: number;
    qrsCached: number;
  };
}

export interface PhuQuyStatusResponse {
  success: boolean;
  data: PhuQuyStatus;
}

export const phuQuyService = {
  /**
   * Retrieves gold price list (automatically syncs or pulls from MongoDB cache)
   */
  async getPriceList(): Promise<PhuQuyPriceResponse> {
    const response = await api.get<PhuQuyPriceResponse>('/phuquy/pricelist');
    return response.data;
  },

  /**
   * Performs an authenticity lookup by QR serial number
   */
  async searchQR(qrSerial: string): Promise<PhuQuyQRResponse> {
    const response = await api.get<PhuQuyQRResponse>(`/phuquy/qr-search?qr_serial=${encodeURIComponent(qrSerial)}`);
    return response.data;
  },

  /**
   * Manually triggers a real-time price synchronization with partner server
   */
  async manualSync(): Promise<PhuQuyPriceResponse> {
    const response = await api.post<{ success: boolean; message: string; data: PhuQuyPriceResponse }>('/phuquy/sync');
    return response.data.data;
  },

  /**
   * Retrieves current gateway health status and cache statistics
   */
  async getIntegrationStatus(): Promise<PhuQuyStatusResponse> {
    const response = await api.get<PhuQuyStatusResponse>('/phuquy/status');
    return response.data;
  },
};
