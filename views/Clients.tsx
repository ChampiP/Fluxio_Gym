
import React, { useState, useEffect, useRef } from 'react';
import { Client, Membership, Transaction, AppSettings } from '../types';
import { Plus, Search, Filter, MoreHorizontal, User, Calendar, X, MessageCircle, FileText, Download, Activity, Ruler, CreditCard, ChevronRight } from 'lucide-react';
import { api } from '../services/api-supabase';
import { generateInvoice } from '../services/invoice';
import { isValidEmail, isValidDNI, isValidPhone, sanitizeInput, rateLimiter } from '../utils/security';

interface ClientsProps {
  clients: Client[];
  memberships: Membership[];
  onCreateClient: (data: any) => Promise<void>;
  onRenewMembership: (clientId: string, planId: string) => Promise<void>;
  primaryColor: string;
}

export const Clients: React.FC<ClientsProps> = ({ clients, memberships, onCreateClient, onRenewMembership, primaryColor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('active');
  const [membershipFilter, setMembershipFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renewingPlanId, setRenewingPlanId] = useState<string | null>(null);

  // New Client Form State
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dni: '', email: '', phone: '', address: '', initialMembershipId: ''
  });

  // Client Details Tab State
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'measurements' | 'card'>('info');

  // Measurements Form State
  const [measurementForm, setMeasurementForm] = useState({
    weight: '', height: '', chest: '', waist: '', arm: ''
  });

  // Client History State
  const [clientHistory, setClientHistory] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (selectedClient) {
      // Reset tab when opening new client
      if (activeTab === 'card' || activeTab === 'measurements') {
        // Keep tab if it makes sense, or reset. Let's keep it if browsing.
      }

      api.getTransactions().then(txs => {
        const history = txs.filter(t => t.clientId === selectedClient.id);
        setClientHistory(history);
      });
    } else {
      setClientHistory([]);
      setActiveTab('info');
    }
  }, [selectedClient]);


  const filteredClients = clients.filter(c => {
    const matchesSearch = c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dni.includes(searchTerm) ||
      c.humanId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesMembership = membershipFilter === 'all' || c.activeMembershipId === membershipFilter;

    return matchesSearch && matchesStatus && matchesMembership;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Rate limiting
    if (!rateLimiter.canMakeRequest('create-client')) {
      alert('Demasiadas solicitudes. Por favor espera un momento.');
      return;
    }

    // Validaciones de seguridad
    if (!isValidDNI(formData.dni)) {
      alert('DNI inválido. Debe tener 8 dígitos.');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      alert('Teléfono inválido. Formato: 999999999');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      alert('Email inválido.');
      return;
    }

    if (formData.initialMembershipId) {
      if (!window.confirm('¿Confirmas registrar al cliente y realizar el cobro de la membresía seleccionada?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Sanitizar inputs
      const newClient = await api.createClient({
        firstName: sanitizeInput(formData.firstName.trim()),
        lastName: sanitizeInput(formData.lastName.trim()),
        dni: formData.dni.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim()
      });

      if (formData.initialMembershipId) {
        await onRenewMembership(newClient.id, formData.initialMembershipId);
      }

      // Recargar datos para actualizar la lista
      await onCreateClient(newClient);

      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', dni: '', email: '', phone: '', address: '', initialMembershipId: '' });
      alert('✅ Cliente registrado exitosamente');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('❌ Ocurrió un error al guardar el cliente. Por favor intente de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !measurementForm.weight) return;

    try {
      const updatedClient = await api.addMeasurement(selectedClient.id, {
        weight: Number(measurementForm.weight),
        height: measurementForm.height ? Number(measurementForm.height) : undefined,
        chest: measurementForm.chest ? Number(measurementForm.chest) : undefined,
        waist: measurementForm.waist ? Number(measurementForm.waist) : undefined,
        arm: measurementForm.arm ? Number(measurementForm.arm) : undefined,
      });

      if (updatedClient) {
        setSelectedClient(updatedClient);
        setMeasurementForm({ weight: '', height: '', chest: '', waist: '', arm: '' });
        alert('Medidas registradas');
      }
    } catch (error) {
      alert('Error al guardar medidas');
    }
  };

  const handleRenew = async (planId: string) => {
    if (selectedClient && !renewingPlanId) {
      if (!window.confirm('¿Estás seguro de renovar este plan? Se generará un cobro y un registro.')) {
        return;
      }

      setRenewingPlanId(planId);
      try {
        await onRenewMembership(selectedClient.id, planId);
        const txs = await api.getTransactions();
        setClientHistory(txs.filter(t => t.clientId === selectedClient.id));
        alert('Membresía renovada con éxito.');

        // Refresh selected client data from global list (passed as prop, might need manual refresh or callback if not auto-updating)
        // Ideally App.tsx updates clients, and this component re-renders. 
        // For immediate feedback in modal, we might need to refetch specific client or wait for prop update.
        const allClients = await api.getClients();
        const updated = allClients.find(c => c.id === selectedClient.id);
        if (updated) setSelectedClient(updated);

      } catch (error) {
        alert('Error al renovar membresía.');
      } finally {
        setRenewingPlanId(null);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMembershipFilter('all');
  };

  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return -1;
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
  };

  const sendWhatsAppReminder = (client: Client) => {
    if (!client.phone) {
      alert('Este cliente no tiene número de teléfono registrado.');
      return;
    }
    const days = getDaysRemaining(client.membershipExpiryDate);
    const message = `Hola ${client.firstName}, te recordamos que tu membresía en GymFlex vence en ${days} días. ¡Te esperamos para renovar! 💪`;
    const url = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const downloadReceipt = (tx: Transaction) => {
    if (settings && selectedClient) {
      const membership = memberships.find(m => m.id === selectedClient.activeMembershipId);
      generateInvoice(tx, settings, selectedClient, membership);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Administra tus suscriptores</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus size={20} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 border border-slate-200 dark:border-slate-700">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o código..."
            className="flex-1 bg-transparent py-3 outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="expired">Vencidos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={membershipFilter}
              onChange={e => setMembershipFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
            >
              <option value="all">Todas las Membresías</option>
              {memberships.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-sm border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-bold">Código</th>
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold">Membresía</th>
                <th className="p-4 font-bold">Estado</th>
                <th className="p-4 font-bold text-center">Días Rest.</th>
                <th className="p-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredClients.map(client => {
                const daysLeft = getDaysRemaining(client.membershipExpiryDate);
                const isWarning = daysLeft >= 0 && daysLeft <= 5;

                return (
                  <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{client.humanId}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{client.firstName} {client.lastName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{client.dni}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-medium">
                      {client.activeMembershipId
                        ? memberships.find(m => m.id === client.activeMembershipId)?.name || 'Desconocido'
                        : <span className="text-slate-400">-</span>
                      }
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${client.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                        client.status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {client.status === 'active' ? 'Activo' : client.status === 'expired' ? 'Vencido' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {client.membershipExpiryDate ? (
                        <span className={`font-bold ${isWarning ? 'text-yellow-600 dark:text-yellow-400' : daysLeft < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {daysLeft < 0 ? '0' : daysLeft}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 flex items-center space-x-2">
                      {isWarning && (
                        <button
                          onClick={() => sendWhatsAppReminder(client)}
                          title="Enviar recordatorio WhatsApp"
                          className="flex items-center space-x-1 px-2 py-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-md transition-colors mr-2"
                        >
                          <MessageCircle size={16} />
                          <span className="text-xs font-bold hidden md:inline">WhatsApp</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User size={40} className="text-slate-300 dark:text-slate-600" />
                      <p>No se encontraron clientes con estos filtros</p>
                      <button onClick={clearFilters} className="text-blue-500 hover:text-blue-600 text-sm font-bold">
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Registrar Nuevo Cliente</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Fields (omitted for brevity, same as before) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Apellidos</label>
                  <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">DNI / ID</label>
                <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email (Opcional)</label>
                <input type="email" className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección (Opcional)</label>
                <input type="text" className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej: Av. Principal 123, Apt 4B" />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Membresía Inicial (Opcional)</label>
                <select
                  className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  value={formData.initialMembershipId}
                  onChange={e => setFormData({ ...formData, initialMembershipId: e.target.value })}
                >
                  <option value="">-- Seleccionar Plan --</option>
                  {memberships.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - S/. {m.cost}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancelar</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-lg shadow-md hover:opacity-90 font-bold disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Guardando...' : formData.initialMembershipId ? 'Guardar y Cobrar' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail Modal with Tabs */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up border border-slate-200 dark:border-slate-700 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedClient.firstName} {selectedClient.lastName}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 font-bold">{selectedClient.humanId}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{selectedClient.dni}</span>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'info' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('measurements')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'measurements' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Ruler size={16} /> Medidas
                </button>
                <button
                  onClick={() => setActiveTab('card')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'card' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <CreditCard size={16} /> Credencial
                </button>
              </div>
            </div>

            <div className="p-6">

              {/* --- TAB: GENERAL INFO --- */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Información Personal</h3>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Teléfono</p>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedClient.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email</p>
                          <p className="text-slate-900 dark:text-white font-medium break-all">{selectedClient.email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dirección</p>
                          <p className="text-slate-900 dark:text-white font-medium">{selectedClient.address || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Membresía Actual</h3>
                      {selectedClient.activeMembershipId ? (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-green-900 dark:text-green-300 text-lg">
                                {memberships.find(m => m.id === selectedClient.activeMembershipId)?.name || 'Plan Desconocido'}
                              </p>
                              <div className="flex items-center text-green-700 dark:text-green-400 text-sm mt-1 font-medium">
                                <Calendar size={14} className="mr-1" />
                                <span>Vence: {new Date(selectedClient.membershipExpiryDate!).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="text-green-700 dark:text-green-300 bg-white dark:bg-green-900/50 border border-green-100 dark:border-green-700 px-2 py-1 rounded text-xs font-bold shadow-sm">
                              ACTIVO
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-400 dark:text-slate-500 font-medium">
                          Sin membresía activa
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Renovar / Asignar Plan</h3>
                    <div className="grid gap-3">
                      {memberships.map(plan => (
                        <button
                          key={plan.id}
                          disabled={!!renewingPlanId}
                          onClick={() => handleRenew(plan.id)}
                          className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all group ${renewingPlanId === plan.id ? 'bg-blue-50 border-blue-500 opacity-70' : 'border-slate-100 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">{plan.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{plan.durationDays} días</p>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-lg">
                            {renewingPlanId === plan.id ? '...' : `S/. ${plan.cost}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-l border-slate-100 dark:border-slate-700 pl-6">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Historial de Pagos</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {clientHistory.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No hay transacciones registradas.</p>
                      ) : (
                        clientHistory.map(tx => (
                          <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center group">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-sm">{tx.itemDescription}</p>
                              <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right flex items-center space-x-2">
                              <span className="block font-bold text-slate-700 dark:text-slate-300">S/. {tx.amount}</span>
                              <button
                                onClick={() => downloadReceipt(tx)}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                title="Descargar Recibo"
                              >
                                <FileText size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB: MEASUREMENTS --- */}
              {activeTab === 'measurements' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Registrar Nueva Medida</h3>
                    <form onSubmit={handleAddMeasurement} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
                        <input type="number" step="0.1" required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 outline-none dark:text-white"
                          value={measurementForm.weight} onChange={e => setMeasurementForm({ ...measurementForm, weight: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Altura (cm)</label>
                          <input type="number" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 outline-none dark:text-white"
                            value={measurementForm.height} onChange={e => setMeasurementForm({ ...measurementForm, height: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cintura (cm)</label>
                          <input type="number" step="0.5" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 outline-none dark:text-white"
                            value={measurementForm.waist} onChange={e => setMeasurementForm({ ...measurementForm, waist: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pecho (cm)</label>
                          <input type="number" step="0.5" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 outline-none dark:text-white"
                            value={measurementForm.chest} onChange={e => setMeasurementForm({ ...measurementForm, chest: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brazo (cm)</label>
                          <input type="number" step="0.5" className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2 outline-none dark:text-white"
                            value={measurementForm.arm} onChange={e => setMeasurementForm({ ...measurementForm, arm: e.target.value })} />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 mt-2">
                        Guardar Registro
                      </button>
                    </form>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Progreso Histórico</h3>
                    {!selectedClient.measurements || selectedClient.measurements.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <Activity size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 dark:text-slate-500 font-medium">No hay registros de medidas aún.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-bold">
                            <tr>
                              <th className="p-3">Fecha</th>
                              <th className="p-3">Peso</th>
                              <th className="p-3">IMC</th>
                              <th className="p-3">Cintura</th>
                              <th className="p-3">Brazo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {selectedClient.measurements.map(m => {
                              // Calc BMI if height exists
                              const bmi = m.height ? (m.weight / Math.pow(m.height / 100, 2)).toFixed(1) : '-';
                              return (
                                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                  <td className="p-3 dark:text-slate-300">{new Date(m.date).toLocaleDateString()}</td>
                                  <td className="p-3 font-bold dark:text-white">{m.weight} kg</td>
                                  <td className="p-3 text-slate-500">{bmi}</td>
                                  <td className="p-3 text-slate-500">{m.waist ? `${m.waist} cm` : '-'}</td>
                                  <td className="p-3 text-slate-500">{m.arm ? `${m.arm} cm` : '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- TAB: CREDENTIAL / CARD --- */}
              {activeTab === 'card' && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="max-w-sm w-full perspective-1000">
                    {/* Card Front */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl text-white relative overflow-hidden border border-slate-700">
                      {/* Decorative circles */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="font-bold text-xl tracking-wider uppercase">{settings?.gymName || 'GYM FLEX'}</h3>
                            <p className="text-xs text-slate-400">MEMBRESÍA OFICIAL</p>
                          </div>
                          {settings?.logoUrl ? (
                            <img src={settings.logoUrl} className="h-10 w-10 object-contain bg-white rounded-md p-0.5" alt="Logo" />
                          ) : (
                            <Activity className="text-white opacity-80" />
                          )}
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                          <div className="h-20 w-20 bg-slate-700 rounded-lg flex items-center justify-center border-2 border-slate-600">
                            <User size={40} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Nombre</p>
                            <p className="font-bold text-lg leading-tight mb-2">{selectedClient.firstName} {selectedClient.lastName}</p>
                            <p className="text-sm text-slate-400">ID Socio</p>
                            <p className="font-mono font-bold tracking-widest">{selectedClient.humanId}</p>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg inline-block float-right">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedClient.humanId}`}
                            alt="QR Code"
                            className="h-20 w-20"
                          />
                        </div>
                        <div className="clear-both"></div>

                        <div className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-widest">
                          Presentar este código al ingreso
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md mx-auto">
                      Esta es la credencial digital del cliente. Puede descargarla y enviarla por WhatsApp para que la presente desde su celular.
                    </p>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                      onClick={() => alert("Función de descarga simulada. En producción esto descargaría la imagen del div.")}
                    >
                      <Download size={18} /> Descargar Imagen
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
