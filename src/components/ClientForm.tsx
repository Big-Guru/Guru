import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const ALGERIA_WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
  "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt",
  "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
];

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, addClient, updateClient } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    wilaya: '',
    effectif: 0,
    effectifType: 'PRIVE' as any,
    nif: '',
    nis: '',
    rc: '',
    ai: ''
  });

  useEffect(() => {
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData({
          name: client.name || '',
          address: client.address || '',
          wilaya: client.wilaya || '',
          effectif: client.effectif || 0,
          effectifType: (client.effectifType as 'UNIVERSITE' | 'EH_DA' | 'PUBLIC' | 'PRIVE') || 'UNIVERSITE',
          nif: client.nif || '',
          nis: client.nis || '',
          rc: client.rc || '',
          ai: client.ai || ''
        });
      }
    }
  }, [id, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      await updateClient(id, formData);
    } else {
      await addClient(formData);
    }
    navigate('/clients');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 flex flex-col">
      <div className="flex items-center gap-4 shrink-0">
        <Link to="/clients" className="p-2 hover:bg-slate-200 rounded transition-colors group">
          <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-800" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">{id ? 'Modifier le Client' : 'Ajouter un Client'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-700">Informations Principales</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nom Exact de l'Entité</label>
            <input 
              required
              type="text" 
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Adresse Exacte</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Wilaya</label>
                <select 
                  required
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.wilaya}
                  onChange={e => setFormData({ ...formData, wilaya: e.target.value })}
                >
                  <option value="" disabled>Sélectionner une wilaya</option>
                  {ALGERIA_WILAYAS.map((wilaya) => (
                    <option key={wilaya} value={wilaya}>
                      {wilaya}
                    </option>
                  ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nombre d'effectif</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.effectif}
                  onChange={e => setFormData({ ...formData, effectif: parseInt(e.target.value) || 0 })}
                />
             </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Type d'établissement</label>
                <select
                  required
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.effectifType}
                  onChange={e => setFormData({ ...formData, effectifType: e.target.value as any })}
                >
                  <optgroup label="Type Standard">
                    <option value="PRIVE">Privé</option>
                    <option value="PUBLIC">Public</option>
                  </optgroup>
                  <optgroup label="Par Plage Numérique">
                    <option value="UNIVERSITE">Université</option>
                    <option value="EH_DA">EH/DA</option>
                  </optgroup>
                </select>
              </div>
          </div>
        </div>

        <div className="bg-slate-50 border-y border-slate-200 px-6 py-4 text-sm font-bold text-slate-700">
          Informations Administratives
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">NIF</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.nif}
                  onChange={e => setFormData({ ...formData, nif: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">NIS</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.nis}
                  onChange={e => setFormData({ ...formData, nis: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">N° Agrément / RC</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.rc}
                  onChange={e => setFormData({ ...formData, rc: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Article d'Imposition (AI)</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.ai}
                  onChange={e => setFormData({ ...formData, ai: e.target.value })}
                />
             </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
          <button type="submit" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
