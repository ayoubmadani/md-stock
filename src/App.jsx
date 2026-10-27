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
import ProductShow from './pages/ProductShow';
import OrdersPage from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderForm from './pages/OrderForm';
import MorePage from './pages/More';
import CategoriesPage from './pages/Categories';
import DomainsPage from './pages/Domains';
import WalletPage from './pages/Wallet';
import ProfitPage from './pages/Profit';
import AbandonedPage from './pages/Abandoned';
import MetaPage from './pages/Meta';
import PixelsPage from './pages/Pixels';
import StoresPage from './pages/Stores';
import StoreForm from './pages/StoreForm';
import ThemesPage from './pages/Themes';
import SubscriptionPage from './pages/Subscription';
import TeamPage from './pages/Team';
import DeliveryPage from './pages/Delivery';
import ConfirmationPage from './pages/Confirmation';
import MessagesPage from './pages/Messages';
import LandingPagesPage from './pages/LandingPages';
import ApiKeysPage from './pages/ApiKeys';
import DeliveryRatesPage from './pages/DeliveryRates';
import PosPage from './pages/Pos';
import CustomersPage from './pages/Customers';
import TasksPage from './pages/Tasks';
import CustomerDetail from './pages/CustomerDetail';
import RequirePerm from './components/RequirePerm';
import TrialOffer from './components/TrialOffer';

function Gate() {
  const { t } = useTranslation();
  const { token, stores, loading, logout } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
  // حساب جديد بلا متجر: إنشاء أول متجر مباشرة (+ عرض التجربة المجانية)
  if (!stores.length) {
    return (
      <div className="min-h-dvh p-4 pb-8 space-y-4">
        <div className="max-w-xl mx-auto flex items-start justify-between gap-3 pt-2">
          <div>
            <h1 className="text-xl font-black">{t('onboarding.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">{t('onboarding.subtitle')}</p>
          </div>
          <button onClick={logout} className="shrink-0 text-sm font-semibold text-gray-400">{t('logout')}</button>
        </div>
        <StoreForm onboarding />
        <TrialOffer />
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
            <Route path="stock" element={<RequirePerm perm="product.crud"><StockPage /></RequirePerm>} />
            <Route path="alerts" element={<RequirePerm perm="product.crud"><AlertsPage /></RequirePerm>} />
            <Route path="history" element={<RequirePerm perm="product.crud"><HistoryPage /></RequirePerm>} />
            <Route path="scan" element={<RequirePerm perm={['product.crud', 'order.view']}><ScanPage /></RequirePerm>} />
            <Route path="orders" element={<RequirePerm perm="order.view"><OrdersPage /></RequirePerm>} />
            <Route path="orders/new" element={<RequirePerm perm="order.manage"><OrderForm /></RequirePerm>} />
            <Route path="orders/:id/edit" element={<RequirePerm perm="order.manage"><OrderForm /></RequirePerm>} />
            <Route path="orders/:id" element={<RequirePerm perm="order.view"><OrderDetail /></RequirePerm>} />
            <Route path="more" element={<MorePage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="meta" element={<RequirePerm perm="product.crud"><MetaPage /></RequirePerm>} />
            <Route path="pixels" element={<PixelsPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="stores/new" element={<StoreForm />} />
            <Route path="stores/:id" element={<StoreForm />} />
            <Route path="themes" element={<ThemesPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="confirmation" element={<ConfirmationPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="landing" element={<LandingPagesPage />} />
            <Route path="keys" element={<ApiKeysPage />} />
            <Route path="rates" element={<DeliveryRatesPage />} />
            <Route path="pos" element={<RequirePerm perm="order.manage"><PosPage /></RequirePerm>} />
            <Route path="pos/:orderId" element={<RequirePerm perm="order.manage"><PosPage /></RequirePerm>} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="customers" element={<RequirePerm perm="order.view"><CustomersPage /></RequirePerm>} />
            <Route path="customers/:id" element={<RequirePerm perm="order.view"><CustomerDetail /></RequirePerm>} />
            <Route path="abandoned" element={<RequirePerm perm="order.view"><AbandonedPage /></RequirePerm>} />
            <Route path="profit" element={<RequirePerm perm="product.crud"><ProfitPage /></RequirePerm>} />
            <Route path="categories" element={<RequirePerm perm="category.crud"><CategoriesPage /></RequirePerm>} />
            <Route path="domains" element={<RequirePerm perm="domain.crud"><DomainsPage /></RequirePerm>} />
            <Route path="products/new" element={<RequirePerm perm="product.crud"><ProductForm /></RequirePerm>} />
            <Route path="products/:id" element={<RequirePerm perm="product.crud"><ProductForm /></RequirePerm>} />
            <Route path="products/:id/show" element={<RequirePerm perm="product.crud"><ProductShow /></RequirePerm>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
