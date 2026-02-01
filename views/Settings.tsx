import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Save, Upload } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
    alert('Configuración guardada correctamente.');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Configuración del Sistema</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Logo del Gimnasio</label>
                <div className="flex items-center space-x-6">
                <div className="h-24 w-24 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-500 overflow-hidden relative group">
                    {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Preview" className="h-full w-full object-contain" />
                    ) : (
                    <span className="text-gray-400 dark:text-slate-500 text-xs text-center p-2">Sin Logo</span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                </div>
                <div>
                    <input 
                    type="file" 
                    accept="image/*" 
                    id="logo-upload" 
                    className="hidden" 
                    onChange={handleFileChange}
                    />
                    <label 
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                    >
                    <Upload size={16} />
                    <span>Subir Imagen</span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">PNG, JPG hasta 2MB</p>
                </div>
                </div>
            </div>

            {/* General Info */}
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre Comercial</label>
                    <input 
                    type="text" 
                    required
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 dark:text-white"
                    value={form.gymName}
                    onChange={e => setForm({...form, gymName: e.target.value})}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Color Principal</label>
                    <div className="flex items-center space-x-3">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#111827'].map(color => (
                        <button
                        key={color}
                        type="button"
                        onClick={() => setForm({...form, primaryColor: color})}
                        className={`w-8 h-8 rounded-full border-2 ${form.primaryColor === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        />
                    ))}
                    <input 
                       type="color" 
                       value={form.primaryColor} 
                       onChange={e => setForm({...form, primaryColor: e.target.value})}
                       className="h-8 w-10 p-0 border-0 rounded overflow-hidden"
                    />
                    </div>
                </div>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-slate-700" />

          {/* Legal Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Datos de Facturación (Legal)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Razón Social</label>
                    <input 
                    type="text" 
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 dark:text-white"
                    value={form.businessName || ''}
                    onChange={e => setForm({...form, businessName: e.target.value})}
                    placeholder="EJ: GIMNASIO PERU S.A.C."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">RUC</label>
                    <input 
                    type="text" 
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 dark:text-white"
                    value={form.ruc || ''}
                    onChange={e => setForm({...form, ruc: e.target.value})}
                    placeholder="20123456789"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Dirección Fiscal</label>
                    <input 
                    type="text" 
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 dark:text-white"
                    value={form.address || ''}
                    onChange={e => setForm({...form, address: e.target.value})}
                    placeholder="Av. Principal 123, Distrito, Provincia"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Teléfono de Contacto</label>
                    <input 
                    type="text" 
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 dark:text-white"
                    value={form.phone || ''}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    />
                </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg text-white font-medium shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ backgroundColor: form.primaryColor }}
            >
              <Save size={18} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};