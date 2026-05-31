import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, Mail, Shield, Save } from 'lucide-react';

export function Perfil() {
  const { currentUser, updateUser, setCurrentUser } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
  });
  
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      updateUser(currentUser.id, formData);
      setCurrentUser({ ...currentUser, ...formData });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex-1 overflow-auto animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Mi Perfil</h2>
          <p className="text-sm text-slate-500">Actualiza tu información personal y configuraciones de cuenta.</p>
        </div>

        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
          <div className="h-32 bg-indigo-600/10 border-b border-slate-200 flex items-end px-8 pb-6">
            <div className="flex items-center space-x-6 translate-y-12">
              <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{currentUser.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold tracking-widest uppercase">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-slate-50"
                      value={formData.email}
                      required
                      disabled // Email disabled for simulation
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center">
                    <Shield className="w-3 h-3 mr-1" /> Contacta al admin para cambiar tu correo.
                  </p>
                </div>
              </div>

              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium flex items-center">
                  ¡Perfil actualizado correctamente!
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition uppercase tracking-wider flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
