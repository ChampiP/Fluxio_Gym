import React, { useState, useEffect } from 'react';
import { api } from './services/api';
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
  const [settings, setSettings] = useState<AppSettings>({ gymName: 'GymFlex', primaryColor: '#3b82f6', logoUrl: null, darkMode: false });
  const [loading, setLoading] = useState(true);

  // Initial Data Load
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
    setLoading(true);
    try {
      const [c, m, l, t, s] = await Promise.all([
        api.getClients(),
        api.getMemberships(),
        api.getLogs(),
        api.getTransactions(),
        api.getSettings()
      ]);
      setClients(c);
      setMemberships(m);
      setLogs(l);
      setTransactions(t);
      setSettings(s);
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleCreateClient = async (data: any) => {
    const newClient = await api.createClient(data);
    setClients(prev => [...prev, newClient]);
  };

  const handleRenewMembership = async (clientId: string, planId: string) => {
    await api.renewMembership(clientId, planId);
    // Refresh clients and transactions
    const updatedClients = await api.getClients();
    const updatedTransactions = await api.getTransactions();
    setClients(updatedClients);
    setTransactions(updatedTransactions);
  };

  const handleSaveMembership = async (m: Membership) => {
    await api.saveMembership(m);
    const updated = await api.getMemberships();
    setMemberships(updated);
  };

  const handleDeleteMembership = async (id: string) => {
    await api.deleteMembership(id);
    const updated = await api.getMemberships();
    setMemberships(updated);
  };

  const handleCheckIn = async (humanId: string) => {
    const result = await api.checkIn(humanId);
    // Refresh logs
    const updatedLogs = await api.getLogs();
    setLogs(updatedLogs);
    return result;
  };

  const handleSaveSettings = async (s: AppSettings) => {
    await api.saveSettings(s);
    setSettings(s);
  };

  const toggleDarkMode = async () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    await api.saveSettings(newSettings);
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
        <Products primaryColor={settings.primaryColor} />
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