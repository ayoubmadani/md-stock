import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Handoff from './pages/Handoff';
import HomePage from './pages/Home';
import StockPage from './pages/Stock';
import HistoryPage from './pages/History';
import AlertsPage from './pages/Alerts';
import ScanPage from './pages/Scan';
import ProductForm from './pages/ProductForm';

function Gate() {
  const { t } = useTranslation();
  const { token, stores, loading, logout } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
  if (!stores.length) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-gray-600 dark:text-zinc-300 max-w-xs">{t('no_store')}</p>
        <button onClick={logout} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">{t('logout')}</button>
      </div>
    );
  }
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/handoff" element={<Handoff />} />
          <Route element={<Gate />}>
            <Route index element={<HomePage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
