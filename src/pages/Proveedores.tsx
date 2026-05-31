import React, { useState } from "react";
import { Truck, Plus, Mail, Phone, MapPin, Building, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function Proveedores() {
  const { providers, addProvider, updateProvider } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    legalName: "",
    commercialName: "",
    rfc: "",
    phone: "",
    email: "",
    category: "",
    subcategory: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    country: "México",
    status: "Activo",
    providerType: "Curriculum Académico"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      legalName: "", commercialName: "", rfc: "", phone: "", email: "",
      category: "", subcategory: "", street: "", neighborhood: "",
      city: "", state: "", zipCode: "", country: "México", status: "Activo",
      providerType: "Curriculum Académico"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prov: any) => {
    setEditingId(prov.id);
    setFormData({ ...prov, providerType: prov.providerType || "Curriculum Académico" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProvider(editingId, formData);
    } else {
      addProvider(formData);
    }
    setIsModalOpen(false);
    // Reset form
    setFormData({
      legalName: "", commercialName: "", rfc: "", phone: "", email: "",
      category: "", subcategory: "", street: "", neighborhood: "",
      city: "", state: "", zipCode: "", country: "México", status: "Activo",
      providerType: "Curriculum Académico"
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Proveedores</h2>
          <p className="text-sm text-slate-500 mt-1">Directorio de proveedores de servicios</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition flex items-center uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir Proveedor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {providers.length > 0 ? (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Nombre</th>
                  <th className="px-6 py-4 border-b border-slate-100">Categoría</th>
                  <th className="px-6 py-4 border-b border-slate-100">Contacto</th>
                  <th className="px-6 py-4 border-b border-slate-100">Ubicación</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {providers.map((prov) => (
                  <tr key={prov.id} onClick={() => navigate(`/proveedores/${prov.id}`)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{prov.commercialName}</p>
                          <p className="text-[10px] uppercase tracking-widest font-mono text-slate-500 mt-0.5">{prov.rfc || "Sin RFC"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700">{prov.category || "General"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                            prov.providerType === "Servicios Extras"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}>
                            {prov.providerType || "Curriculum Académico"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{prov.subcategory}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {prov.email && <div className="flex items-center text-xs mb-1"><Mail className="w-3 h-3 mr-1 text-slate-400" /> {prov.email}</div>}
                      {prov.phone && <div className="flex items-center text-xs"><Phone className="w-3 h-3 mr-1 text-slate-400" /> {prov.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {prov.city ? (
                        <>
                          <div className="flex items-center text-xs mb-1 font-medium"><MapPin className="w-3 h-3 mr-1 text-slate-400" /> {prov.city}, {prov.state}</div>
                          <div className="flex items-center text-xs text-slate-400"><Globe className="w-3 h-3 mr-1 text-slate-300" /> {prov.country}</div>
                        </>
                      ) : <span className="text-slate-400 text-xs">Sin ubicación</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest border ${
                        prov.status === 'Al corriente' || prov.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        prov.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {(prov.status || "Activo").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center flex-1">
            <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
              <Truck className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Directorio Vacío</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Registra los proveedores de servicios del programa para gestionar pagos y documentación.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Proveedor" : "Añadir Nuevo Proveedor"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Información Básica */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Información Básica</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre Comercial</label>
                <input required type="text" name="commercialName" value={formData.commercialName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Ej. Transporte Escolar ABC" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Razón Social Legal</label>
                <input required type="text" name="legalName" value={formData.legalName} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Ej. Grupo Transportista ABC S.A. de C.V." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">RFC</label>
                <input required type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="contacto@empresa.com" />
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Servicio</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Proveedor</label>
                <select required name="providerType" value={formData.providerType} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-medium">
                  <option value="Curriculum Académico">Curriculum Académico</option>
                  <option value="Servicios Extras">Servicios Extras</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
                <select required name="category" value={formData.category} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white">
                  <option value="">Selecciona...</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Materiales">Materiales Didácticos</option>
                  <option value="Tecnología">Tecnología y Software</option>
                  <option value="Instalaciones">Mantenimiento de Instalaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría / Notas</label>
                <input type="text" name="subcategory" value={formData.subcategory} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Ej. Autobuses / Papelería" />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Dirección Fiscal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Calle y Número</label>
                <input required type="text" name="street" value={formData.street} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Colonia</label>
                <input required type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ciudad</label>
                <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código Postal (CP)</label>
                <input required type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">País</label>
                <input required type="text" name="country" value={formData.country} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-slate-50" readOnly />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado (Status)</label>
                <select required name="status" value={formData.status} onChange={handleChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white">
                  <option value="Activo">Activo</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors">Cancelar</button>
             <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all uppercase tracking-wider shadow-sm flex items-center">Guardar Proveedor</button>
           </div>
        </form>
      </Modal>

    </div>
  );
}
