import React, { useMemo, useState, useEffect } from 'react';
import { Client, AttendanceLog, Transaction, AppSettings, Membership } from '../types';
import { Users, AlertCircle, TrendingUp, CheckCircle, Clock, DollarSign, Eye, EyeOff, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { generateInvoice } from '../services/invoice';

interface DashboardProps {
  clients: Client[];
  logs: AttendanceLog[];
  transactions: Transaction[];
  primaryColor: string;
  memberships?: Membership[];
}

export const Dashboard: React.FC<DashboardProps> = ({ clients, logs, transactions, primaryColor }) => {
  const [showIncome, setShowIncome] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
     api.getSettings().then(setSettings);
  }, []);

  // Stats Calculation
  const stats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const now = new Date();
    const expiringSoon = clients.filter(c => {
      if (!c.membershipExpiryDate) return false;
      const expiry = new Date(c.membershipExpiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5;
    });

    const checkInsToday = logs.filter(l => {
        const logDate = new Date(l.timestamp);
        return logDate.toDateString() === now.toDateString() && l.success;
    }).length;

    const totalIncome = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalClients: clients.length,
      activeClients,
      expiringCount: expiringSoon.length,
      expiringList: expiringSoon,
      checkInsToday,
      totalIncome
    };
  }, [clients, logs, transactions]);

  // Chart Data
  const attendanceData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const count = logs.filter(l => {
         const logDate = new Date(l.timestamp);
         return logDate.toDateString() === d.toDateString() && l.success;
      }).length;
      data.push({ name: days[d.getDay()], valor: count });
    }
    return data;
  }, [logs]);

  const StatCard = ({ title, value, icon: Icon, colorClass, isMoney = false }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <div className="flex items-center space-x-2 mt-1">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isMoney ? (
              showIncome ? `S/. ${value.toLocaleString()}` : '*****'
            ) : value}
          </h3>
          {isMoney && (
            <button onClick={() => setShowIncome(!showIncome)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              {showIncome ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
      </div>
      <div className={`p-3 rounded-full ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );

  const handleDownload = (tx: Transaction) => {
      if (!settings) return;
      const client = clients.find(c => c.id === tx.clientId);
      const membership = client?.activeMembershipId ? memberships?.find(m => m.id === client.activeMembershipId) : undefined;
      generateInvoice(tx, settings, client, membership);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel General</h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Resumen de la actividad de tu gimnasio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Ingresos" 
          value={stats.totalIncome} 
          icon={DollarSign} 
          colorClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          isMoney
        />
        <StatCard 
          title="Clientes Activos" 
          value={stats.activeClients} 
          icon={CheckCircle} 
          colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
        />
        <StatCard 
          title="Asistencias Hoy" 
          value={stats.checkInsToday} 
          icon={TrendingUp} 
          colorClass="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" 
        />
        <StatCard 
          title="Por Vencer (5 días)" 
          value={stats.expiringCount} 
          icon={Clock} 
          colorClass="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800 dark:text-white">Asistencia Semanal</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#1e293b' }}
                />
                <Bar dataKey="valor" fill={primaryColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiring List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">Membresías por vencer</h3>
            <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.expiringList.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4 font-medium">Todo en orden, no hay vencimientos próximos.</p>
            ) : (
              stats.expiringList.map(client => {
                const daysLeft = Math.ceil((new Date(client.membershipExpiryDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{client.firstName} {client.lastName}</p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-500 font-semibold">Vence en {daysLeft} días</p>
                    </div>
                    <span className="text-xs font-mono bg-white dark:bg-slate-700 px-2 py-1 rounded border border-yellow-200 dark:border-slate-600 text-yellow-800 dark:text-yellow-500 font-bold">
                      {client.humanId}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

       {/* Recent Transactions Mini List */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">Últimas Transacciones</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                   <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="pb-3 font-semibold">Cliente</th>
                      <th className="pb-3 font-semibold">Concepto</th>
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold text-right">Monto</th>
                      <th className="pb-3 font-semibold text-right">Recibo</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                   {transactions.length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-center text-slate-400">Sin transacciones registradas</td></tr>
                   ) : transactions.slice(0, 5).map(t => (
                      <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50">
                         <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{t.clientName}</td>
                         <td className="py-3 text-slate-600 dark:text-slate-400">
                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">{t.itemDescription}</span>
                         </td>
                         <td className="py-3 text-slate-500 dark:text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                         <td className="py-3 text-right font-bold text-green-600 dark:text-green-400">+S/. {t.amount}</td>
                         <td className="py-3 text-right">
                             <button 
                                onClick={() => handleDownload(t)}
                                className="text-slate-400 hover:text-blue-500 p-1" 
                                title="Descargar Recibo"
                             >
                                 <FileText size={18} />
                             </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};