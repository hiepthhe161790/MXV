import '@/styles/globals.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// Public pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Protected pages
import DashboardPage from '@/pages/DashboardPage';
import MarketPage from '@/pages/MarketPage';
import OrdersPage from '@/pages/OrdersPage';
import PositionsPage from '@/pages/PositionsPage';
import TransactionsPage from '@/pages/TransactionsPage';
import RiskMonitorPage from '@/pages/RiskMonitorPage';
import AuditLogPage from '@/pages/AuditLogPage';
import { useEffect } from 'react';
import { useAuthStore } from '@/context/store';
import { authService } from '@/services/authService';

export default function App() {
  const { isAuthenticated, account, setAccount, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !account) {
      authService.getProfile()
        .then((res) => {
          setAccount(res);
        })
        .catch(() => {
          logout();
        });
    }
  }, [isAuthenticated, account, setAccount, logout]);

  return (
    <>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes (inside layout) */}
          <Route element={<Layout />}>
            <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/market"       element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
            <Route path="/orders"       element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/positions"    element={<ProtectedRoute><PositionsPage /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
            <Route path="/risk"         element={<ProtectedRoute><RiskMonitorPage /></ProtectedRoute>} />
            <Route path="/audit"        element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
          </Route>

          {/* Redirects */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
        }}
      />
    </>
  );
}
