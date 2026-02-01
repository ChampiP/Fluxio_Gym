import React, { useState, useEffect } from 'react';
import { Product, Client } from '../types';
import { api } from '../services/api';
import { Plus, ShoppingBag, Trash2, Search, DollarSign, Package, X } from 'lucide-react';

interface ProductsProps {
  primaryColor: string;
}

export const Products: React.FC<ProductsProps> = ({ primaryColor }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Product Form (Use string | number for inputs to allow empty state)
  const [formData, setFormData] = useState({ 
      id: '', name: '', price: '' as string | number, stock: '' as string | number, category: 'bebidas' 
  });
  
  // Sell Form
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellClientId, setSellClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [p, c] = await Promise.all([api.getProducts(), api.getClients()]);
    setProducts(p);
    setClients(c);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price === '' || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await api.saveProduct({
        id: formData.id || '',
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category as any
      });
      setIsFormOpen(false);
      setFormData({ id: '', name: '', price: '', stock: '', category: 'bebidas' });
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      await api.deleteProduct(id);
      loadData();
    }
  };

  const handleSell = async () => {
    if (!selectedProduct || isSubmitting) return;

    if (!window.confirm(`¿Confirmas la venta de ${sellQty}x ${selectedProduct.name}?`)) {
        return;
    }

    setIsSubmitting(true);
    try {
      await api.sellProduct(selectedProduct.id, sellQty, sellClientId || undefined);
      setIsSellOpen(false);
      setSelectedProduct(null);
      setSellQty(1);
      setSellClientId('');
      setClientSearch('');
      alert('Venta realizada correctamente');
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewForm = () => {
      setFormData({ id: '', name: '', price: '', stock: '', category: 'bebidas' });
      setIsFormOpen(true);
  };

  const filteredClientsForSale = clients.filter(c => 
    c.firstName.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.lastName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tienda</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Gestiona y vende productos</p>
        </div>
        <button 
          onClick={openNewForm}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-white font-bold shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus size={20} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col relative group">
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1">
                  <Trash2 size={18} />
                </button>
             </div>
             <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-lg ${product.stock > 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                  <Package size={24} />
                </div>
                <div>
                   <h3 className="font-bold text-lg text-slate-900 dark:text-white">{product.name}</h3>
                   <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">{product.category}</span>
                </div>
             </div>
             <div className="mt-auto flex items-end justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                <div>
                   <p className="text-xs text-slate-400 mb-1">Stock</p>
                   <p className={`font-bold ${product.stock < 10 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{product.stock} un.</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">S/. {product.price}</p>
                   <button 
                     onClick={() => { setSelectedProduct(product); setIsSellOpen(true); }}
                     disabled={product.stock === 0}
                     className="mt-2 text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 rounded-md font-bold disabled:opacity-50"
                   >
                     Vender
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Agregar Producto</h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg outline-none text-slate-900 dark:text-white" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Precio (S/.)</label>
                  <input type="number" step="0.5" required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg outline-none text-slate-900 dark:text-white" 
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Inicial</label>
                  <input type="number" required className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg outline-none text-slate-900 dark:text-white" 
                    value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                 <select 
                   className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-2 rounded-lg outline-none text-slate-900 dark:text-white"
                   value={formData.category}
                   onChange={e => setFormData({...formData, category: e.target.value as any})}
                 >
                   <option value="suplementos">Suplementos</option>
                   <option value="bebidas">Bebidas</option>
                   <option value="ropa">Ropa</option>
                   <option value="otros">Otros</option>
                 </select>
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

      {/* Sell Modal */}
      {isSellOpen && selectedProduct && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setIsSellOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
             <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Vender Producto</h2>
             <p className="text-slate-500 mb-6">{selectedProduct.name} - S/. {selectedProduct.price}</p>
             
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cantidad</label>
                   <div className="flex items-center space-x-3">
                      <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold text-xl">-</button>
                      <span className="text-xl font-bold w-10 text-center text-slate-900 dark:text-white">{sellQty}</span>
                      <button onClick={() => setSellQty(Math.min(selectedProduct.stock, sellQty + 1))} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg font-bold text-xl">+</button>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente (Opcional)</label>
                   {!sellClientId ? (
                     <>
                       <input 
                         type="text" 
                         placeholder="Buscar cliente..." 
                         className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 p-2 rounded-lg outline-none mb-2 text-slate-900 dark:text-white"
                         value={clientSearch}
                         onChange={e => setClientSearch(e.target.value)}
                       />
                       {clientSearch && (
                         <div className="max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            {filteredClientsForSale.slice(0, 5).map(c => (
                              <div key={c.id} onClick={() => setSellClientId(c.id)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-sm">
                                {c.firstName} {c.lastName}
                              </div>
                            ))}
                         </div>
                       )}
                     </>
                   ) : (
                     <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                        <span className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                          {clients.find(c => c.id === sellClientId)?.firstName} {clients.find(c => c.id === sellClientId)?.lastName}
                        </span>
                        <button onClick={() => setSellClientId('')}><X size={16} className="text-blue-500" /></button>
                     </div>
                   )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                   <div>
                     <p className="text-xs text-slate-500">Total a Pagar</p>
                     <p className="text-2xl font-bold text-slate-900 dark:text-white">S/. {selectedProduct.price * sellQty}</p>
                   </div>
                   <button 
                     onClick={handleSell}
                     disabled={isSubmitting}
                     className="px-6 py-3 text-white rounded-lg shadow-md font-bold text-lg disabled:opacity-50" 
                     style={{ backgroundColor: primaryColor }}
                   >
                     {isSubmitting ? '...' : 'Cobrar'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};