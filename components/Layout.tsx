import React from 'react';
import { AppSettings } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  QrCode,
  Menu,
  Moon,
  Sun,
  ShoppingBag
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  settings: AppSettings;
  onToggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, onLogout, settings, onToggleDarkMode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    const isActive = activeView === id;
    return (
      <button
        onClick={() => {
          onNavigate(id);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive 
            ? 'text-white shadow-md font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
        }`}
        style={isActive ? { backgroundColor: settings.primaryColor } : {}}
      >
        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 shadow-sm p-4 flex justify-between items-center z-20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
           {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />}
           <span className="font-bold text-xl text-slate-800 dark:text-white">{settings.gymName}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-700 dark:text-slate-200">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100 dark:border-slate-700">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
          ) : (
            <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
              <Users size={20} />
            </div>
          )}
          <span className="font-bold text-xl text-slate-900 dark:text-white truncate">{settings.gymName}</span>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="checkin" icon={QrCode} label="Asistencia" />
          <NavItem id="clients" icon={Users} label="Clientes" />
          <NavItem id="products" icon={ShoppingBag} label="Tienda" />
          <NavItem id="memberships" icon={CreditCard} label="Membresías" />
          <NavItem id="settings" icon={Settings} label="Configuración" />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          {/* Dark Mode Toggle */}
          <button 
            onClick={onToggleDarkMode}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
          >
            {settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{settings.darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};