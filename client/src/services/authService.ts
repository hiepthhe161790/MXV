import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    expiresIn: string;
    account: {
      _id: string;
      accountNumber: string;
      email: string;
      balance: number;
      status: string;
    };
  };
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/accounts/login', data);
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<any> => {
    const response = await api.post('/accounts/register', data);
    return response.data;
  },

  getProfile: async (): Promise<any> => {
    const response = await api.get('/accounts/profile');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};
