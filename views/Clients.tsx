
import React, { useState, useEffect, useRef } from 'react';
import { Client, Membership, Transaction, AppSettings } from '../types';
import { Plus, Search, Filter, MoreHorizontal, User, Calendar, X, MessageCircle, FileText, Download, Activity, Ruler, CreditCard, ChevronRight, Edit, Check, Trash2 } from 'lucide-react';
import { api } from '../services/api-supabase';
import { generateInvoice } from '../services/invoice';
import { isValidEmail, isValidDNI, isValidPhone, sanitizeInput, rateLimiter } from '../utils/security';
import html2canvas from 'html2canvas';

interface ClientsProps {
  clients: Client[];
  memberships: Membership[];
  onCreateClient: (data: any) => Promise<void>;
  onRenewMembership: (clientId: string, planId: string) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  primaryColor: string;
}

export const Clients: React.FC<ClientsProps> = ({ clients, memberships, onCreateClient, onRenewMembership, onDeleteClient, primaryColor }) => {
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
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'measurements' | 'card' | 'installments'>('info');

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: ''
  });

  // Measurements Form State
  const [measurementForm, setMeasurementForm] = useState({
    weight: '', height: '', chest: '', waist: '', arm: ''
  });

  // Client History State
  const [clientHistory, setClientHistory] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Installment State
  const [clientInstallmentPlans, setClientInstallmentPlans] = useState<any[]>([]);
  const [installmentPayments, setInstallmentPayments] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | null>(null);
  
  // Manual installment configuration
  const [installmentConfig, setInstallmentConfig] = useState({
    installments: 2,
    interestRate: 0,
    isEnabled: false
  });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
  }>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    onCancel: () => {} 
  });

  // Custom Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'info' 
  });

  // Custom Prompt Modal State
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    inputValue: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    options?: string[];
  }>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    inputValue: '',
    onConfirm: () => {}, 
    onCancel: () => {} 
  });

  // Helper function to show custom confirmation
  const showConfirmation = (title: string, message: string, onConfirm: () => void, isDestructive: boolean = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      isDestructive
    });
  };

  // Helper function to show custom alert
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Function to download credential as image
  const downloadCredentialImage = async () => {
    if (!selectedClient) return;
    
    try {
      const credentialElement = document.getElementById('credential-card');
      if (!credentialElement) {
        showAlert('Error', 'No se pudo encontrar la credencial para descargar', 'error');
        return;
      }

      // Capture the credential element as canvas
      const canvas = await html2canvas(credentialElement, {
        backgroundColor: null,
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create filename: id:humanId_firstName+lastName.png
          const firstName = selectedClient.firstName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const lastName = selectedClient.lastName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const filename = `id:${selectedClient.humanId}_${firstName}${lastName}.png`;

          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          showAlert('Éxito', `Credencial descargada como ${filename}`, 'success');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading credential:', error);
      showAlert('Error', 'No se pudo descargar la credencial. Inténtalo de nuevo.', 'error');
    }
  };

  // Helper function to show custom prompt
  const showPrompt = (title: string, message: string, defaultValue: string = '', options?: string[]) => {
    return new Promise<string | null>((resolve) => {
      setPromptModal({
        isOpen: true,
        title,
        message,
        inputValue: defaultValue,
        onConfirm: (value: string) => {
          setPromptModal(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
        onCancel: () => {
          setPromptModal(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        },
        options
      });
    });
  };

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (selectedClient) {
      // Reset edit mode when selecting new client
      setIsEditMode(false);
      setEditFormData({
        firstName: '', lastName: '', phone: '', email: '', address: ''
      });
      
      // Reset tab when opening new client
      if (activeTab === 'card' || activeTab === 'measurements') {
        // Keep tab if it makes sense, or reset. Let's keep it if browsing.
      }

      api.getTransactions().then(txs => {
        const history = txs.filter(t => t.clientId === selectedClient.id);
        setClientHistory(history);
      });

      // Cargar planes de cuotas del cliente
      api.getClientInstallmentPlans(selectedClient.id).then(plans => {
        setClientInstallmentPlans(plans);
      }).catch(err => {
        console.error('Error loading installment plans:', err);
        setClientInstallmentPlans([]);
      });
    } else {
      setClientHistory([]);
      setClientInstallmentPlans([]);
      setInstallmentPayments([]);
      setSelectedPlan(null);
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
      showAlert('Límite de Solicitudes', 'Demasiadas solicitudes. Por favor espera un momento.', 'warning');
      return;
    }

    // Validaciones de seguridad
    if (!isValidDNI(formData.dni)) {
      showAlert('DNI Inválido', 'DNI inválido. Debe tener 8 dígitos.', 'error');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      showAlert('Teléfono Inválido', 'Teléfono inválido. Formato: 999999999', 'error');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      showAlert('Email Inválido', 'Email inválido.', 'error');
      return;
    }

    if (formData.initialMembershipId) {
      showConfirmation(
        'Confirmar Registro',
        '¿Confirmas registrar al cliente y realizar el cobro de la membresía seleccionada?',
        async () => {
          await processClientRegistration();
        }
      );
      return;
    }

    await processClientRegistration();
  };

  const processClientRegistration = async () => {
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
        const membership = memberships.find(m => m.id === formData.initialMembershipId);
        
        if (installmentConfig.isEnabled && installmentConfig.installments > 1 && membership) {
          // Crear plan de cuotas para la membresía inicial
          const interestRate = installmentConfig.interestRate / 100;
          await api.createInstallmentPlan({
            clientId: newClient.id,
            membershipId: formData.initialMembershipId,
            totalAmount: membership.cost,
            installmentCount: installmentConfig.installments,
            interestRate: interestRate
          });
        } else {
          // Asignar membresía completa tradicional
          await onRenewMembership(newClient.id, formData.initialMembershipId);
        }
      }

      // Recargar datos para actualizar la lista
      await onCreateClient(newClient);

      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', dni: '', email: '', phone: '', address: '', initialMembershipId: '' });
      setInstallmentConfig({ installments: 2, interestRate: 0, isEnabled: false });
      showAlert('Éxito', 'Cliente registrado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating client:', error);
      showAlert('Error', 'Ocurrió un error al guardar el cliente. Por favor intente de nuevo.', 'error');
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

  const handleEdit = () => {
    if (selectedClient) {
      setEditFormData({
        firstName: selectedClient.firstName,
        lastName: selectedClient.lastName,
        phone: selectedClient.phone,
        email: selectedClient.email || '',
        address: selectedClient.address || ''
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      firstName: '', lastName: '', phone: '', email: '', address: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;

    // Validaciones básicas
    if (!editFormData.firstName.trim() || !editFormData.lastName.trim()) {
      showAlert('Datos Obligatorios', 'Nombre y apellido son obligatorios', 'error');
      return;
    }

    if (!editFormData.phone.trim()) {
      showAlert('Datos Obligatorios', 'El teléfono es obligatorio', 'error');
      return;
    }

    try {
      const updatedClient: Client = {
        ...selectedClient,
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim(),
        address: editFormData.address.trim()
      };

      await api.updateClient(updatedClient);
      
      // Actualizar el cliente seleccionado
      setSelectedClient(updatedClient);
      
      // Recargar la lista de clientes
      onCreateClient(updatedClient);
      
      setIsEditMode(false);
      showAlert('Éxito', 'Datos del cliente actualizados exitosamente', 'success');
    } catch (error) {
      console.error('Error updating client:', error);
      showAlert('Error', 'Error al actualizar los datos del cliente', 'error');
    }
  };

  const handleRenew = async (planId: string) => {
    if (selectedClient && !renewingPlanId) {
      const membership = memberships.find(m => m.id === planId);
      if (!membership) return;

      let confirmMessage = '';
      let paymentType = 'full';

      if (installmentConfig.isEnabled && installmentConfig.installments > 1) {
        const interestRate = installmentConfig.interestRate / 100; // Convert percentage to decimal
        const totalWithInterest = membership.cost * (1 + interestRate);
        const monthlyAmount = Math.round((totalWithInterest / installmentConfig.installments) * 100) / 100;
        
        confirmMessage = `¿Confirmas crear plan de ${installmentConfig.installments} cuotas de S/.${monthlyAmount} c/u?\nTotal: S/.${totalWithInterest.toFixed(2)} (${installmentConfig.interestRate}% interés)`;
        paymentType = 'installments';
      } else {
        confirmMessage = `¿Confirmas el pago completo de S/.${membership.cost}?`;
      }

      showConfirmation(
        'Confirmar Renovación',
        confirmMessage,
        async () => {
          await processRenewal(planId, paymentType, membership);
        }
      );
      return;
    }
  };

  const processRenewal = async (planId: string, paymentType: string, membership: any) => {
    setRenewingPlanId(planId);
    try {
        if (paymentType === 'installments') {
          // Crear plan de cuotas con configuración manual
          const interestRate = installmentConfig.interestRate / 100;
          await api.createInstallmentPlan({
            clientId: selectedClient.id,
            membershipId: planId,
            totalAmount: membership.cost,
            installmentCount: installmentConfig.installments,
            interestRate: interestRate
          });
          
          // Recargar planes de cuotas
          const updatedPlans = await api.getClientInstallmentPlans(selectedClient.id);
          setClientInstallmentPlans(updatedPlans);
          
          showAlert('Éxito', 'Plan de cuotas creado exitosamente', 'success');
        } else {
          // Pago completo tradicional
          await onRenewMembership(selectedClient.id, planId);
          showAlert('Éxito', 'Membresía asignada con éxito', 'success');
        }

        const txs = await api.getTransactions();
        setClientHistory(txs.filter(t => t.clientId === selectedClient.id));

        // Solo obtener el cliente actualizado específico en lugar de todos
        try {
          const allClients = await api.getClients();
          const updated = allClients.find(c => c.id === selectedClient.id);
          if (updated) setSelectedClient(updated);
        } catch (error) {
          // Si falla, refrescar el cliente del prop
          const updated = clients.find(c => c.id === selectedClient.id);
          if (updated) setSelectedClient(updated);
        }

        // Reset configuration
        setExpandedMembershipId(null);
        setInstallmentConfig({ installments: 2, interestRate: 0, isEnabled: false });

      } catch (error) {
        console.error('Error processing payment:', error);
        showAlert('Error', 'Error al procesar el pago', 'error');
      } finally {
        setRenewingPlanId(null);
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

  const downloadReceipt = async (tx: Transaction) => {
    if (settings && selectedClient) {
      const membership = memberships.find(m => m.id === selectedClient.activeMembershipId);
      
      // Verificar si es un pago de cuota buscando en la descripción
      let installmentInfo = null;
      if (tx.itemDescription.includes('Cuota')) {
        const match = tx.itemDescription.match(/Cuota (\d+)\/(\d+)/);
        if (match) {
          const currentPayment = parseInt(match[1]);
          const totalPayments = parseInt(match[2]);
          
          // Intentar obtener información del plan de cuotas si existe
          try {
            const plans = await api.getClientInstallmentPlans(selectedClient.id);
            const relatedPlan = plans.find(plan => 
              plan.membershipId === selectedClient.activeMembershipId &&
              plan.installmentCount === totalPayments
            );
            
            if (relatedPlan) {
              installmentInfo = {
                planId: relatedPlan.id,
                currentPayment: currentPayment,
                totalPayments: totalPayments,
                monthlyAmount: relatedPlan.installmentAmount,
                totalAmount: relatedPlan.totalAmount,
                interestRate: relatedPlan.interestRate
              };
            }
          } catch (error) {
            console.warn('No se pudo obtener información del plan de cuotas', error);
          }
        }
      }
      
      generateInvoice(tx, settings, selectedClient, membership, installmentInfo);
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

                {/* Configuración de cuotas para nuevo cliente */}
                {formData.initialMembershipId && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        💳 Pago en cuotas
                      </label>
                      <input
                        type="checkbox"
                        checked={installmentConfig.isEnabled}
                        onChange={(e) => setInstallmentConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                    </div>

                    {installmentConfig.isEnabled && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Cuotas</label>
                            <select
                              value={installmentConfig.installments}
                              onChange={(e) => setInstallmentConfig(prev => ({ ...prev, installments: parseInt(e.target.value) }))}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              <option value={2}>2 cuotas</option>
                              <option value={3}>3 cuotas</option>
                              <option value={4}>4 cuotas</option>
                              <option value={6}>6 cuotas</option>
                              <option value={12}>12 cuotas</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Interés (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              step="0.5"
                              value={installmentConfig.interestRate}
                              onChange={(e) => setInstallmentConfig(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        
                        {/* Preview */}
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-slate-600 dark:text-slate-400 border border-blue-200 dark:border-blue-800">
                          <strong>Preview:</strong> 
                          {(() => {
                            const membership = memberships.find(m => m.id === formData.initialMembershipId);
                            if (membership) {
                              const interestRate = installmentConfig.interestRate / 100;
                              const total = membership.cost * (1 + interestRate);
                              const monthly = (total / installmentConfig.installments).toFixed(2);
                              return ` ${installmentConfig.installments} cuotas de S/.${monthly} = Total S/.${total.toFixed(2)}`;
                            }
                            return '';
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setInstallmentConfig({ installments: 2, interestRate: 0, isEnabled: false });
                  }} 
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
                >
                  Cancelar
                </button>
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
                <button
                  onClick={() => setActiveTab('installments')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'installments' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Calendar size={16} /> Cuotas
                </button>
              </div>
            </div>

            <div className="p-6">

              {/* --- TAB: GENERAL INFO --- */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Información Personal</h3>
                        {!isEditMode ? (
                          <button 
                            onClick={handleEdit}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                          >
                            <Edit size={14} /> Editar
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={handleCancelEdit}
                              className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 text-sm font-medium"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium flex items-center gap-1"
                            >
                              <Check size={14} /> Guardar
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {!isEditMode ? (
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
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Nombre</label>
                              <input
                                type="text"
                                value={editFormData.firstName}
                                onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Apellido</label>
                              <input
                                type="text"
                                value={editFormData.lastName}
                                onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Teléfono</label>
                            <input
                              type="text"
                              value={editFormData.phone}
                              onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Email</label>
                            <input
                              type="email"
                              value={editFormData.email}
                              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Dirección</label>
                            <input
                              type="text"
                              value={editFormData.address}
                              onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Membresía Actual</h3>
                      {selectedClient.activeMembershipId ? (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-green-900 dark:text-green-300 text-lg">
                                {memberships.find(m => m.id === selectedClient.activeMembershipId)?.name || 'Plan Desconocido'}
                              </p>
                              <div className="flex items-center text-green-700 dark:text-green-400 text-sm mt-1 font-medium">
                                <Calendar size={14} className="mr-1" />
                                <span>Vence: {new Date(selectedClient.membershipExpiryDate!).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-green-700 dark:text-green-300 bg-white dark:bg-green-900/50 border border-green-100 dark:border-green-700 px-2 py-1 rounded text-xs font-bold shadow-sm">
                                ACTIVO
                              </div>
                              <button
                                onClick={async () => {
                                  if (window.confirm('¿Eliminar la membresía activa de este cliente?')) {
                                    try {
                                      const updatedClient = { ...selectedClient, activeMembershipId: null, membershipStartDate: null, membershipExpiryDate: null, status: 'inactive' as const };
                                      await api.updateClient(updatedClient);
                                      setSelectedClient(updatedClient);
                                    } catch (error) {
                                      console.error('Error removing membership:', error);
                                    }
                                  }
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                title="Eliminar membresía"
                              >
                                <X size={14} />
                              </button>
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
                    
                    {/* Configuración de cuotas */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <label className="font-medium text-slate-700 dark:text-slate-300">
                          💳 Pago en cuotas
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={installmentConfig.isEnabled}
                            onChange={(e) => setInstallmentConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {installmentConfig.isEnabled && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                              Número de cuotas
                            </label>
                            <select
                              value={installmentConfig.installments}
                              onChange={(e) => setInstallmentConfig(prev => ({ ...prev, installments: parseInt(e.target.value) }))}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              <option value={2}>2 cuotas</option>
                              <option value={3}>3 cuotas</option>
                              <option value={4}>4 cuotas</option>
                              <option value={6}>6 cuotas</option>
                              <option value={12}>12 cuotas</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                              Interés (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              step="0.5"
                              value={installmentConfig.interestRate}
                              onChange={(e) => setInstallmentConfig(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3">
                      {memberships.map(plan => {
                        // Calcular preview de cuotas si están habilitadas
                        let installmentPreview = null;
                        if (installmentConfig.isEnabled && installmentConfig.installments > 1) {
                          const interestRate = installmentConfig.interestRate / 100;
                          const totalWithInterest = plan.cost * (1 + interestRate);
                          const monthlyAmount = Math.round((totalWithInterest / installmentConfig.installments) * 100) / 100;
                          installmentPreview = {
                            monthly: monthlyAmount,
                            total: totalWithInterest.toFixed(2)
                          };
                        }
                        
                        return (
                          <div key={plan.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className={`p-3 rounded-lg transition-all ${
                              renewingPlanId === plan.id ? 'bg-blue-50 border-blue-500 opacity-70' : 
                              'hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{plan.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {plan.durationDays} días
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900 dark:text-white text-lg">
                                    S/. {plan.cost}
                                  </p>
                                  {installmentPreview && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                      {installmentConfig.installments}x S/.{installmentPreview.monthly}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {installmentPreview && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                                  <strong>Vista previa:</strong> {installmentConfig.installments} cuotas de S/.{installmentPreview.monthly} = Total S/.{installmentPreview.total}
                                  {installmentConfig.interestRate > 0 && (
                                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                                      ({installmentConfig.interestRate}% interés)
                                    </span>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => handleRenew(plan.id)}
                                disabled={!!renewingPlanId}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded transition-colors"
                              >
                                {renewingPlanId === plan.id ? '⏳ Procesando...' : 
                                 installmentConfig.isEnabled ? `📅 Asignar con ${installmentConfig.installments} cuotas` : 
                                 '💰 Asignar pago completo'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
                  <div className="flex items-center justify-center" style={{ perspective: '1000px' }}>
                    {/* Card Front - Dimensiones de tarjeta de crédito estándar */}
                    <div 
                      id="credential-card" 
                      className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl text-white relative overflow-hidden"
                      style={{
                        width: '85.60mm',
                        height: '53.98mm',
                        borderRadius: '3.18mm',
                        padding: '4mm',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {/* Patrón de fondo moderno */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur-3xl"></div>
                      </div>

                      {/* Líneas decorativas */}
                      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
                        <div className="absolute top-4 right-0 w-full h-px bg-white"></div>
                        <div className="absolute top-8 right-0 w-3/4 h-px bg-white"></div>
                        <div className="absolute top-12 right-0 w-1/2 h-px bg-white"></div>
                      </div>

                      <div className="relative z-10 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-black text-base tracking-wider uppercase" style={{ fontSize: '4.5mm', lineHeight: '1.2' }}>
                              {settings?.gymName || 'CENTRAL GYM'}
                            </h3>
                            <p className="text-slate-300 uppercase tracking-widest" style={{ fontSize: '2mm', fontWeight: '500' }}>
                              Membresía Oficial
                            </p>
                          </div>
                          {settings?.logoUrl ? (
                            <div className="bg-white rounded-md p-1 shadow-lg" style={{ width: '11mm', height: '11mm' }}>
                              <img src={settings.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                            </div>
                          ) : (
                            <div className="bg-white rounded-md p-1.5 shadow-lg" style={{ width: '11mm', height: '11mm' }}>
                              <Activity className="text-slate-900 w-full h-full" />
                            </div>
                          )}
                        </div>

                        {/* Content - Distribución mejorada */}
                        <div className="flex-1 flex items-center justify-between gap-2">
                          {/* Info del cliente */}
                          <div className="flex items-center gap-2 flex-1">
                            <div 
                              className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg flex items-center justify-center border border-slate-500 shadow-lg flex-shrink-0"
                              style={{ width: '16mm', height: '16mm' }}
                            >
                              <User size={28} className="text-slate-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-400 uppercase tracking-wide" style={{ fontSize: '2mm', fontWeight: '600' }}>
                                Nombre
                              </p>
                              <p className="font-bold truncate leading-tight" style={{ fontSize: '3.5mm' }}>
                                {selectedClient.firstName} {selectedClient.lastName}
                              </p>
                              <p className="text-slate-400 uppercase tracking-wide mt-1" style={{ fontSize: '2mm', fontWeight: '600' }}>
                                ID Socio
                              </p>
                              <p className="font-mono font-black tracking-wider" style={{ fontSize: '4mm', letterSpacing: '1px' }}>
                                {selectedClient.humanId}
                              </p>
                            </div>
                          </div>

                          {/* QR Code - Más grande y prominente */}
                          <div className="bg-white rounded-lg shadow-2xl flex-shrink-0" style={{ padding: '2mm' }}>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FLUXGYM:${selectedClient.humanId}`}
                              alt="QR Code"
                              style={{ width: '22mm', height: '22mm', display: 'block' }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center border-t border-slate-700 pt-1 mt-auto">
                          <p className="text-slate-400 uppercase tracking-widest" style={{ fontSize: '1.8mm', fontWeight: '600' }}>
                            Presentar este código al ingreso
                          </p>
                        </div>
                      </div>

                      {/* Efecto holográfico sutil */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-5 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md mx-auto">
                      Esta es la credencial digital del cliente. Puede descargarla y enviarla por WhatsApp para que la presente desde su celular.
                    </p>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                      onClick={downloadCredentialImage}
                    >
                      <Download size={18} /> Descargar Imagen
                    </button>
                  </div>
                </div>
              )}

              {/* --- TAB: CUOTAS --- */}
              {activeTab === 'installments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Planes de Cuotas</h3>
                  </div>

                  {clientInstallmentPlans.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        No hay planes de cuotas activos
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                        Los planes de cuotas aparecerán aquí cuando el cliente adquiera una membresía con pago fraccionado
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {clientInstallmentPlans.map((plan: any) => (
                        <div key={plan.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">
                                {memberships.find(m => m.id === plan.membershipId)?.name || 'Plan Desconocido'}
                              </h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {plan.installmentCount} cuotas de S/. {plan.installmentAmount}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                                plan.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                plan.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                plan.status === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {plan.status === 'completed' ? 'COMPLETADO' :
                                 plan.status === 'active' ? 'ACTIVO' :
                                 plan.status === 'overdue' ? 'VENCIDO' : plan.status.toUpperCase()}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Total: S/. {plan.totalAmount}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            Creado: {new Date(plan.createdAt).toLocaleDateString()} • 
                            Interés: {(plan.interestRate * 100).toFixed(1)}%
                          </div>
                          
                          <button
                            onClick={async () => {
                              setSelectedPlan(plan);
                              try {
                                const payments = await api.getInstallmentPayments(plan.id);
                                setInstallmentPayments(payments);
                              } catch (error) {
                                console.error('Error loading payments:', error);
                                setInstallmentPayments([]);
                              }
                            }}
                            className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Ver pagos →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Panel de pagos del plan seleccionado */}
                  {selectedPlan && (
                    <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          Pagos del Plan - {memberships.find(m => m.id === selectedPlan.membershipId)?.name}
                        </h4>
                        <button
                          onClick={() => {
                            setSelectedPlan(null);
                            setInstallmentPayments([]);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid gap-3">
                        {installmentPayments.map((payment: any) => (
                          <div key={payment.id} className={`flex justify-between items-center p-3 rounded-lg border-l-4 ${
                            payment.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                            payment.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                            'bg-slate-50 dark:bg-slate-900/30 border-slate-300 dark:border-slate-600'
                          }`}>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                Cuota #{payment.installmentNumber}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Vence: {new Date(payment.dueDate).toLocaleDateString()}
                                {payment.paidDate && (
                                  <span className="ml-2 text-green-600 dark:text-green-400">
                                    • Pagado: {new Date(payment.paidDate).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                              {payment.paymentMethod && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                                  Método: {payment.paymentMethod}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-slate-900 dark:text-white">
                                S/. {payment.amount}
                              </p>
                              {payment.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    const method = await showPrompt(
                                      'Método de Pago',
                                      'Selecciona el método de pago:',
                                      'cash',
                                      ['cash', 'card', 'transfer', 'yape', 'plin']
                                    );
                                    
                                    if (method && ['cash', 'card', 'transfer', 'yape', 'plin'].includes(method)) {
                                      try {
                                        const paymentResult = await api.markInstallmentAsPaid(payment.id, method as any);
                                        
                                        // Recargar pagos
                                        const updatedPayments = await api.getInstallmentPayments(selectedPlan.id);
                                        setInstallmentPayments(updatedPayments);
                                        
                                        // Actualizar solo el cliente específico en lugar de recargar todos
                                        try {
                                          const updatedClient = clients.map(c => {
                                            if (c.id === selectedClient.id) {
                                              // Actualizar el estado del cliente si es necesario
                                              return { ...c, status: 'active' as const };
                                            }
                                            return c;
                                          });
                                          const updated = updatedClient.find(c => c.id === selectedClient.id);
                                          if (updated) setSelectedClient(updated);
                                        } catch (error) {
                                          console.warn('Could not update client state optimally');
                                        }
                                        
                                        showAlert('Éxito', 'Pago registrado exitosamente', 'success');
                                      } catch (error) {
                                        console.error('Error marking payment:', error);
                                        showAlert('Error', 'Error al registrar el pago', 'error');
                                      }
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded font-medium mt-1"
                                >
                                  Marcar Pagado
                                </button>
                              )}
                              {payment.status === 'paid' && (
                                <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                  ✓ Pagado
                                </span>
                              )}
                              {payment.status === 'overdue' && (
                                <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                                  ⚠ Vencido
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between">
              <button
                onClick={() => {
                  if (selectedClient && window.confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) {
                    onDeleteClient(selectedClient.id);
                    setSelectedClient(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
              >
                Eliminar Cliente
              </button>
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

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                {confirmModal.title}
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-line">
                {confirmModal.message}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={confirmModal.onCancel}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${
                    confirmModal.isDestructive 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  alertModal.type === 'success' ? 'bg-green-100 text-green-600' :
                  alertModal.type === 'error' ? 'bg-red-100 text-red-600' :
                  alertModal.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {alertModal.type === 'success' ? '✓' :
                   alertModal.type === 'error' ? '✗' :
                   alertModal.type === 'warning' ? '⚠' : 'ℹ'}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {alertModal.title}
                </h3>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                {alertModal.message}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompt Modal */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                {promptModal.title}
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {promptModal.message}
              </div>
              
              {promptModal.options ? (
                <select
                  value={promptModal.inputValue}
                  onChange={(e) => setPromptModal(prev => ({ ...prev, inputValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white mb-6"
                >
                  {promptModal.options.map(option => (
                    <option key={option} value={option}>
                      {option === 'cash' ? 'Efectivo' :
                       option === 'card' ? 'Tarjeta' :
                       option === 'transfer' ? 'Transferencia' :
                       option === 'yape' ? 'Yape' :
                       option === 'plin' ? 'Plin' : option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={promptModal.inputValue}
                  onChange={(e) => setPromptModal(prev => ({ ...prev, inputValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white mb-6"
                  autoFocus
                />
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={promptModal.onCancel}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => promptModal.onConfirm(promptModal.inputValue)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
