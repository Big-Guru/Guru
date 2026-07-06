import React, { useState } from 'react';
import { Package, Plus, Search, Edit3, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { ProductConfig } from '../types';
import ProductFormModal from './ProductFormModal';

export default function ProductsList() {
  const { products, deleteProduct } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductConfig | null>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product: ProductConfig) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${name}" ?`)) {
      deleteProduct(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-2xl shadow-inner border border-indigo-100/50">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Produits</h1>
            <p className="text-slate-500 font-medium mt-1">Gestion du catalogue et grille tarifaire</p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouveau Produit
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="group bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 relative flex flex-col min-h-[220px] overflow-hidden"
          >
            {/* Background Blob */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                        DÉP: {product.departement}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                        {product.defaultEntity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                  <span>Intégration / Périodicité:</span>
                  <span className="text-slate-900 font-bold">{product.maintenancePeriodicity}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                  <span>Règles Tarifaires:</span>
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                    {product.pricingRules?.length || 0} règle(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Hover Overlay */}
            <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20 pointer-events-none group-hover:pointer-events-auto">
              <button
                onClick={() => handleEdit(product)}
                className="p-3 bg-white text-blue-600 rounded-full shadow-lg hover:bg-blue-50 hover:scale-110 transition-transform"
                title="Modifier"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(product.id, product.name)}
                className="p-3 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50 hover:scale-110 transition-transform"
                title="Supprimer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 border-dashed rounded-3xl">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-slate-500">Commencez par ajouter votre premier produit au catalogue.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
