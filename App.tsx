import React, { useState, useEffect } from 'react';
import { api } from './services/api-supabase';
import { Client, Membership, AttendanceLog, AppSettings, Transaction } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Clients } from './views/Clients';
import { Memberships } from './views/Memberships';
import { CheckIn } from './views/CheckIn';
import { Products } from './views/Products';
import { Settings } from './views/Settings';
import { Login } from './views/Login';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Global State
  const [clients, setClients] = useState<Client[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ gymName: 'GymFlex', primaryColor: '#3b82f6', logoUrl: null, darkMode: false });
  const [loading, setLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    loadData();
  }, []); // Cargar al inicio, no depende de auth para simplificar, auth se maneja en render

  // Apply Dark Mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, m, l, t, s, p] = await Promise.all([
        api.getClients(),
        api.getMemberships(),
        api.getLogs(),
        api.getTransactions(),
        api.getSettings(),
        api.getProducts()
      ]);
      setClients(c);
      setMemberships(m);
      setLogs(l);
      setTransactions(t);
      setSettings(s);
      setProducts(p);
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (data: any) => {
    await api.createClient(data);
    loadData();
  };

  const handleRenewMembership = async (clientId: string, membershipId: string) => {
    await api.renewMembership(clientId, membershipId);
    loadData();
  };

  const handleSaveMembership = async (membership: Membership) => {
    await api.saveMembership(membership);
    loadData();
  };

  const handleDeleteMembership = async (id: string) => {
    await api.deleteMembership(id);
    loadData();
  };

  const handleCheckIn = async (humanId: string) => {
    const result = await api.checkIn(humanId);
    // Solo recargamos logs para eficiencia
    const l = await api.getLogs();
    setLogs(l);
    return result;
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await api.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const toggleDarkMode = async () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    await api.saveSettings(newSettings);
  };

  const handleSaveProduct = async (product: any) => {
    await api.saveProduct(product);
    const p = await api.getProducts();
    setProducts(p);
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    const p = await api.getProducts();
    setProducts(p);
  };

  const handleSellProduct = async (productId: string, quantity: number, clientId?: string) => {
    await api.sellProduct(productId, quantity, clientId);
    loadData(); // Recargamos todo para actualizar stock y transacciones
  };

  // --- Render ---
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: settings.primaryColor }}></div>
      </div>
    );
  }

  return (
    <Layout
      activeView={currentView}
      onNavigate={setCurrentView}
      onLogout={() => setIsAuthenticated(false)}
      settings={settings}
      onToggleDarkMode={toggleDarkMode}
    >
      {currentView === 'dashboard' && (
        <Dashboard
          clients={clients}
          logs={logs}
          transactions={transactions}
          primaryColor={settings.primaryColor}
          memberships={memberships}
        />
      )}
      {currentView === 'clients' && (
        <Clients
          clients={clients}
          memberships={memberships}
          onCreateClient={handleCreateClient}
          onRenewMembership={handleRenewMembership}
          primaryColor={settings.primaryColor}
        />
      )}
      {currentView === 'products' && (
        <Products
          primaryColor={settings.primaryColor}
          products={products}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
          onSell={handleSellProduct}
          clients={clients}
        />
      )}
      {currentView === 'memberships' && (
        <Memberships
          memberships={memberships}
          onSave={handleSaveMembership}
          onDelete={handleDeleteMembership}
          primaryColor={settings.primaryColor}
        />
      )}
      {currentView === 'checkin' && (
        <CheckIn
          onCheckIn={handleCheckIn}
          logs={logs}
          primaryColor={settings.primaryColor}
        />
      )}
      {currentView === 'settings' && (
        <Settings settings={settings} onSave={handleSaveSettings} />
      )}
    </Layout>
  );
};

export default App;