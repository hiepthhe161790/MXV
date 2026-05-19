import api from './api';

export interface CreateOrderRequest {
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  limitPrice?: number;
  stopPrice?: number;
  idempotencyKey?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  orderType: string;
  status?: string;
  state?: string;
  filledQuantity: number;
  executedPrice?: number;
  averagePrice?: number;
  createdAt: string;
}

export interface Position {
  _id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  openQuantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  marginUsed: number;
  leverage: number;
  status: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: string;
  createdAt: string;
}

export interface Balance {
  totalBalance: number;
  frozenAmount: number;
  availableBalance: number;
  marginLevel: number;
  marginStatus: string;
}

const unwrapResponse = <T>(response: any): T => response.data?.data ?? response.data;

export const tradingService = {
  // Orders
  createOrder: async (data: CreateOrderRequest): Promise<any> => {
    const response = await api.post('/orders', data);
    return unwrapResponse<any>(response);
  },

  getOrder: async (orderId: string): Promise<any> => {
    const response = await api.get(`/orders/${orderId}`);
    return unwrapResponse<any>(response);
  },

  getOrders: async (accountId?: string): Promise<any> => {
    const response = await api.get('/orders', { params: { accountId } });
    return unwrapResponse<any>(response);
  },

  cancelOrder: async (orderId: string): Promise<any> => {
    const response = await api.delete(`/orders/${orderId}`);
    return unwrapResponse<any>(response);
  },

  // Positions
  getPositions: async (accountId?: string): Promise<any> => {
    const response = await api.get('/positions', { params: { accountId } });
    return unwrapResponse<any>(response);
  },

  getPositionSummary: async (accountId?: string): Promise<any> => {
    const response = await api.get('/positions/summary', { params: { accountId } });
    return unwrapResponse<any>(response);
  },

  closePosition: async (accountId: string, symbol: string, closePrice: number): Promise<any> => {
    const response = await api.post(`/positions/${accountId}/${symbol}/close`, { closePrice });
    return unwrapResponse<any>(response);
  },

  // Transactions
  deposit: async (accountId: string, amount: number, reason?: string): Promise<any> => {
    const response = await api.post('/transactions/deposit', { accountId, amount, reason });
    return unwrapResponse<any>(response);
  },

  withdraw: async (accountId: string, amount: number, reason?: string): Promise<any> => {
    const response = await api.post('/transactions/withdraw', { accountId, amount, reason });
    return unwrapResponse<any>(response);
  },

  getBalance: async (accountId?: string): Promise<any> => {
    const response = await api.get('/transactions/balance', { params: { accountId } });
    return unwrapResponse<any>(response);
  },

  getTransactions: async (accountId?: string, limit = 50): Promise<any> => {
    const response = await api.get('/transactions', { params: { accountId, limit } });
    return unwrapResponse<any>(response);
  },

  // Risk
  getRiskStatus: async (accountId: string): Promise<any> => {
    const response = await api.get('/risk/status', { params: { accountId } });
    return unwrapResponse<any>(response);
  },

  // Audit Logs
  getAuditLogs: async (params?: { accountId?: string; eventType?: string; limit?: number }): Promise<any> => {
    const response = await api.get('/audit-logs', { params });
    return unwrapResponse<any>(response);
  },

  // EOD Settlement
  triggerEODSettlement: async (): Promise<any> => {
    const response = await api.post('/settlement/eod', {});
    return unwrapResponse<any>(response);
  },
};
