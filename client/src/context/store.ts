import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  account: any;
  login: (token: string, account: any) => void;
  logout: () => void;
  setAccount: (account: any) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  let initialAccount = null;
  try {
    const storedAccount = localStorage.getItem('account');
    if (storedAccount) {
      initialAccount = JSON.parse(storedAccount);
    }
  } catch (e) {
    console.error('Failed to parse account from localStorage', e);
  }

  return {
    isAuthenticated: !!localStorage.getItem('token'),
    token: localStorage.getItem('token'),
    account: initialAccount,

    login: (token: string, account: any) => {
      localStorage.setItem('token', token);
      localStorage.setItem('account', JSON.stringify(account));
      set({ isAuthenticated: true, token, account });
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('account');
      set({ isAuthenticated: false, token: null, account: null });
    },

    setAccount: (account: any) => {
      if (account) {
        localStorage.setItem('account', JSON.stringify(account));
      } else {
        localStorage.removeItem('account');
      }
      set({ account });
    },
  };
});

interface TradingState {
  balance: number;
  availableBalance: number;
  frozenAmount: number;
  marginLevel: number;
  positions: any[];
  orders: any[];
  setBalance: (data: any) => void;
  setPositions: (positions: any[]) => void;
  setOrders: (orders: any[]) => void;
  updatePosition: (symbol: string, updates: any) => void;
  updateOrder: (orderId: string, updates: any) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  balance: 0,
  availableBalance: 0,
  frozenAmount: 0,
  marginLevel: 0,
  positions: [],
  orders: [],

  setBalance: (data: any) =>
    set({
      balance: data.totalBalance,
      availableBalance: data.availableBalance,
      frozenAmount: data.frozenAmount,
      marginLevel: data.marginLevel,
    }),

  setPositions: (positions: any[]) => set({ positions }),
  setOrders: (orders: any[]) => set({ orders }),

  updatePosition: (symbol: string, updates: any) =>
    set((state) => ({
      positions: state.positions.map((p) =>
        p.symbol === symbol ? { ...p, ...updates } : p
      ),
    })),

  updateOrder: (orderId: string, updates: any) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.orderId === orderId ? { ...o, ...updates } : o
      ),
    })),
}));
