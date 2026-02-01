import React, { useState } from 'react';
import { Membership } from '../types';
import { Plus, Trash2, Tag } from 'lucide-react';

interface MembershipsProps {
  memberships: Membership[];
  onSave: (m: Membership) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  primaryColor: string;
}

export const Memberships: React.FC<MembershipsProps> = ({ memberships, onSave, onDelete, primaryColor }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use 'string | number' type to allow empty strings during editing
  const [formData, setFormData] = useState({
    id: '', name: '', description: '', cost: '' as string | number, durationDays: '' as string | number
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.cost === '' || formData.durationDays === '' || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSave({
        id: formData.id || '', // API handles ID generation if empty
        name: formData.name,
        description: formData.description || '',
        cost: Number(formData.cost),
        durationDays: Number(formData.durationDays)
      });
      setIsFormOpen(false);
      setFormData({ id: '', name: '', description: '', cost: '', durationDays: 30 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este plan de membresía? Esta acción no se puede deshacer.')) {
      await onDelete(id);
    }
  };

  const openNewForm = () => {
    setFormData({ id: '', name: '', description: '', cost: '', durationDays: 30 }); 
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Membresías</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Configura los planes y precios</p>
        </div>
        <button 
          onClick={openNewForm}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus size={20} />
          <span>Crear Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memberships.map(plan => (
          <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col relative group hover:shadow-md transition-all">
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDeleteClick(plan.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1">
                  <Trash2 size={18} />
                </button>
             </div>
             <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Tag size={20} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
             </div>
             <p className="text-slate-600 dark:text-slate-400 text-sm flex-1 mb-4 font-medium">{plan.description}</p>
             <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
               <div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 block font-bold uppercase">Duración</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{plan.durationDays} días</span>
               </div>
               <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">S/. {plan.cost}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Plan de Membresía</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Plan</label>
                <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white" rows={2}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Costo (S/.)</label>
                  <input type="number" required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white" 
                    value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Días de Duración</label>
                  <input type="number" required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white" 
                    value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white rounded-lg shadow-md font-bold disabled:opacity-50" 
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};