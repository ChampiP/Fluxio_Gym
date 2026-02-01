import React, { useState, useEffect } from 'react';
import { api } from './services/api-supabase';
import { supabase } from './services/supabase';
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
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);

  // Global State
  const [clients, setClients] = useState<Client[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ gymName: 'GymFlex', primaryColor: '#3b82f6', logoUrl: null, darkMode: false });
  const [loading, setLoading] = useState(false);

  // Auth State Management
  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
      }
      setAuthLoading(false);
    });

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          setIsAuthenticated(true);
          loadData(); // Cargar datos cuando el usuario se autentique
        } else {
          setUser(null);
          setIsAuthenticated(false);
          // Limpiar datos cuando el usuario cierre sesión
          setClients([]);
          setMemberships([]);
          setLogs([]);
          setTransactions([]);
          setProducts([]);
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Apply Dark Mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const loadData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      // Fix any clients without humanId first
      await api.fixClientHumanIds();
      
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

  const handleCreateClient = async (createdClient?: any) => {
    // Solo recargar datos si se proporciona el cliente creado
    if (createdClient) {
      loadData();
    }
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // El estado se manejará automáticamente por el listener
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // --- Render ---

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={() => {}} />; // onLogin se maneja automáticamente por el auth listener
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
      onLogout={handleLogout}
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