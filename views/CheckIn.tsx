import React, { useState, useRef, useEffect } from 'react';
import { AttendanceLog, Client } from '../types';
import { ArrowRight, CheckCircle, XCircle, Clock, AlertTriangle, Search, X } from 'lucide-react';
import { api } from '../services/api';

interface CheckInProps {
  onCheckIn: (id: string) => Promise<{ success: boolean; message: string; client?: any; isWarning?: boolean }>;
  logs: AttendanceLog[];
  primaryColor: string;
}

export const CheckIn: React.FC<CheckInProps> = ({ onCheckIn, logs, primaryColor }) => {
  const [inputId, setInputId] = useState('');
  const [lastStatus, setLastStatus] = useState<{ success: boolean; message: string; clientName?: string; isWarning?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Recover Code State
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverDni, setRecoverDni] = useState('');
  const [foundClient, setFoundClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!isRecoverOpen) {
      inputRef.current?.focus();
    }
  }, [lastStatus, isRecoverOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;

    setIsLoading(true);
    const result = await onCheckIn(inputId.trim());
    setLastStatus({
      success: result.success,
      message: result.message,
      clientName: result.client ? `${result.client.firstName} ${result.client.lastName}` : undefined,
      isWarning: result.isWarning
    });
    setIsLoading(false);
    setInputId('');
    
    // Clear status after 4 seconds
    setTimeout(() => {
      setLastStatus(null);
    }, 4000);
  };

  const handleSearchClient = async () => {
    if (!recoverDni) return;
    const clients = await api.getClients();
    const client = clients.find(c => c.dni.includes(recoverDni) || c.firstName.toLowerCase().includes(recoverDni.toLowerCase()));
    setFoundClient(client || null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-8">
      {/* Input Section */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 relative">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Registro de Asistencia</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Ingresa tu código de acceso</p>

        <form onSubmit={handleSubmit} className="w-full max-w-sm relative z-10">
          <div className="relative">
             <input 
              ref={inputRef}
              type="text" 
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-center text-5xl font-mono tracking-widest p-6 border-4 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-opacity-20 outline-none transition-all uppercase text-slate-900 dark:text-white font-bold placeholder-slate-300 dark:placeholder-slate-600"
              style={{ borderColor: inputId ? primaryColor : undefined, ['--tw-ring-color' as any]: primaryColor }}
              placeholder="1000a"
              disabled={isLoading}
             />
             <button 
               type="submit"
               disabled={isLoading}
               className="absolute right-3 top-3 bottom-3 aspect-square rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-colors"
             >
               <ArrowRight size={28} />
             </button>
          </div>
          <button 
            type="button"
            onClick={() => setIsRecoverOpen(true)}
            className="w-full mt-4 text-sm text-slate-400 hover:text-blue-500 underline text-center"
          >
            ¿Olvidaste tu código? Recupéralo aquí
          </button>
        </form>

        <div className="mt-12 w-full max-w-sm h-32 flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-slate-900 dark:border-white"></div>
          ) : lastStatus ? (
             <div className={`text-center p-6 rounded-2xl w-full animate-fade-in border-2 ${
               lastStatus.isWarning ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
               lastStatus.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' : 
               'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
             }`}>
                {lastStatus.isWarning ? (
                  <AlertTriangle className="mx-auto mb-2 text-yellow-600 dark:text-yellow-400" size={48} />
                ) : lastStatus.success ? (
                  <CheckCircle className="mx-auto mb-2 text-green-600 dark:text-green-400" size={48} /> 
                ) : (
                  <XCircle className="mx-auto mb-2 text-red-600 dark:text-red-400" size={48} />
                )}
                <h3 className="font-bold text-xl">{lastStatus.message}</h3>
                {lastStatus.clientName && <p className="text-base opacity-90 font-medium mt-1">{lastStatus.clientName}</p>}
             </div>
          ) : (
            <div className="text-center text-slate-300 dark:text-slate-600">
               <Clock size={48} className="mx-auto mb-3" />
               <p className="font-medium text-lg">Esperando ingreso...</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs Section */}
      <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-lg">Últimos Ingresos</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {logs.slice(0, 15).map(log => (
            <div key={log.id} className={`bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm text-sm border-l-4 ${log.isWarning ? 'border-yellow-400' : log.success ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex justify-between items-start">
                 <span className="font-bold text-slate-800 dark:text-white">{log.clientName}</span>
                 <span className="text-xs text-slate-400 font-medium">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className={`text-xs mt-1 font-medium ${log.isWarning ? 'text-yellow-600' : 'text-slate-500 dark:text-slate-400'}`}>{log.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recover Modal */}
      {isRecoverOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => { setIsRecoverOpen(false); setFoundClient(null); setRecoverDni(''); }}
        >
           <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recuperar Código</h3>
                 <button onClick={() => { setIsRecoverOpen(false); setFoundClient(null); setRecoverDni(''); }} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>
              <div className="space-y-4">
                 <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="DNI o Nombre" 
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none"
                      value={recoverDni}
                      onChange={e => setRecoverDni(e.target.value)}
                    />
                    <button onClick={handleSearchClient} className="bg-blue-600 text-white px-3 rounded-lg">
                      <Search size={20} />
                    </button>
                 </div>
                 {foundClient ? (
                   <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 text-center">
                      <p className="text-sm text-green-800 dark:text-green-300 font-bold mb-1">{foundClient.firstName} {foundClient.lastName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Tu código es:</p>
                      <p className="text-3xl font-mono font-bold text-slate-900 dark:text-white tracking-widest">{foundClient.humanId}</p>
                   </div>
                 ) : recoverDni && (
                    <p className="text-sm text-center text-slate-400">No se encontró el cliente.</p>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};