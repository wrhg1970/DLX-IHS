import React, { useState } from "react";
import { Truck, Plus, Mail, Phone, MapPin, Building, Globe, Search, SlidersHorizontal, BookOpen, Star, AlertCircle, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { hasPermission } from "../utils/permissionCheck";

const academicSubcats = [
  "Syllabus Académico",
  "Curso de Idiomas",
  "Certificación AP",
  "Tutorías y Consultorías",
  "Excursión / Programa Académico",
  "Plataforma Educativa",
  "Materiales y Libros"
];

export function Proveedores() {
  const { providers, addProvider, updateProvider, currentUser } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

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

  // Calculation of stats
  const totalCount = providers.length;
  const activeCount = providers.filter(p => p.status === 'Activo' || p.status === 'Al corriente').length;
  const academicCount = providers.filter(p => !p.providerType || p.providerType === 'Curriculum Académico').length;
  const extraCount = providers.filter(p => p.providerType === 'Servicios Extras').length;

  const filteredProviders = providers.filter(prov => {
    // 1. Dropdown filters
    if (filterType && prov.providerType !== filterType) return false;
    if (filterStatus && prov.status !== filterStatus) return false;
    if (filterCategory && prov.category !== filterCategory) return false;

    // 2. Global search across all fields
    if (!search) return true;
    const term = search.toLowerCase().trim();
    return (
      String(prov.commercialName || '').toLowerCase().includes(term) ||
      String(prov.legalName || '').toLowerCase().includes(term) ||
      String(prov.rfc || '').toLowerCase().includes(term) ||
      String(prov.phone || '').toLowerCase().includes(term) ||
      String(prov.email || '').toLowerCase().includes(term) ||
      String(prov.category || '').toLowerCase().includes(term) ||
      String(prov.subcategory || '').toLowerCase().includes(term) ||
      String(prov.city || '').toLowerCase().includes(term) ||
      String(prov.state || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">Proveedores</h2>
          <p className="text-sm text-slate-500 mt-1">Directorio de proveedores y control de tarifas de servicios</p>
        </div>
        {hasPermission(currentUser?.role, "Proveedores", "create") && (
          <button 
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition flex items-center uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir Proveedor
          </button>
        )}
      </div>

      {/* Header and statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Proveedores</p>
            <p className="text-lg font-bold font-sans text-slate-800">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Activos / Al Corriente</p>
            <p className="text-lg font-bold font-sans text-slate-800">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Currículum Académico</p>
            <p className="text-lg font-bold font-sans text-slate-800">{academicCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-sans">Servicios Extras</p>
            <p className="text-lg font-bold font-sans text-slate-800">{extraCount}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 py-1 bg-transparent shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar proveedor por nombre comercial, legal, RFC, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder-slate-450"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm cursor-pointer font-medium"
          >
            <option value="">Todos los Tipos</option>
            <option value="Curriculum Académico">Curriculum Académico</option>
            <option value="Servicios Extras">Servicios Extras</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm cursor-pointer font-medium"
          >
            <option value="">Todos los Estados</option>
            <option value="Activo">Activo</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm cursor-pointer font-medium"
          >
            <option value="">Todas las Categorías</option>
            <option value="Transporte">Transporte</option>
            <option value="Materiales">Materiales Didácticos</option>
            <option value="Tecnología">Tecnología y Software</option>
            <option value="Instalaciones">Mantenimiento de Instalaciones</option>
            <option value="Otro">Otro</option>
          </select>

          {(search || filterType || filterStatus || filterCategory) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterType("");
                setFilterStatus("");
                setFilterCategory("");
              }}
              className="text-xs text-rose-500 font-bold hover:text-rose-750 hover:bg-rose-55 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {filteredProviders.length > 0 ? (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f8fafc] text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Nombre / Empresa</th>
                  <th className="px-6 py-4">Categoría / Tipo</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredProviders.map((prov) => (
                  <tr key={prov.id} onClick={() => navigate(`/proveedores/${prov.id}`)} className="hover:bg-indigo-50/20 transition-all group cursor-pointer duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{prov.commercialName}</p>
                          <p className="text-[10px] uppercase tracking-widest font-mono text-slate-400 mt-0.5">{prov.rfc || "Sin RFC"}</p>
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
                        <p className="text-xs text-slate-400">{prov.subcategory || "Sin especificaciones"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-650">
                      {prov.email && (
                        <div className="flex items-center text-xs mb-1 font-medium hover:text-indigo-600 transition-colors">
                          <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> 
                          <span>{prov.email}</span>
                        </div>
                      )}
                      {prov.phone && (
                        <div className="flex items-center text-xs text-slate-500 font-mono">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          <span>{prov.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {prov.city ? (
                        <>
                          <div className="flex items-center text-xs mb-0.5 font-semibold text-slate-700">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" /> 
                            <span>{prov.city}, {prov.state}</span>
                          </div>
                          <div className="flex items-center text-[10px] text-slate-400 pl-4.5">
                            <span>{prov.country}</span>
                          </div>
                        </>
                      ) : <span className="text-slate-400 text-xs italic">Ubicación no provista</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-widest border uppercase ${
                        prov.status === 'Al corriente' || prov.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        prov.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {prov.status || "Activo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 flex flex-col items-center justify-center text-center flex-1">
            <div className="h-16 w-16 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
              <AlertCircle className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-700">Proveedores No Encontrados</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              No se han encontrado proveedores o registros guardados que coincidan con tus selecciones actuales.
            </p>
            {(search || filterType || filterStatus || filterCategory) && (
              <button 
                onClick={() => {
                  setSearch("");
                  setFilterType("");
                  setFilterStatus("");
                  setFilterCategory("");
                }}
                className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-705 border border-slate-200 px-4 py-2 rounded-xl text-xs uppercase font-extrabold tracking-wider transition cursor-pointer"
              >
                Restablecer Búsqueda
              </button>
            )}
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
                  <option value="Categoría Académica">Categoría Académica</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Materiales">Materiales Didácticos</option>
                  <option value="Tecnología">Tecnología y Software</option>
                  <option value="Instalaciones">Mantenimiento de Instalaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                {formData.category === "Categoría Académica" ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría Académica</label>
                    <select
                      name="subcategory"
                      value={academicSubcats.includes(formData.subcategory) ? formData.subcategory : (formData.subcategory ? "Otro" : "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Otro") {
                          setFormData({ ...formData, subcategory: "" });
                        } else {
                          setFormData({ ...formData, subcategory: val });
                        }
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-medium text-slate-700"
                    >
                      <option value="">Selecciona subcategoría...</option>
                      {academicSubcats.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="Otro">Otro (Especificar)</option>
                    </select>
                    
                    {(!academicSubcats.includes(formData.subcategory) || formData.subcategory === "") && (
                      <input
                        type="text"
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Especificar otra subcategoría académica..."
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría / Notas</label>
                    <input
                      type="text"
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      placeholder="Ej. Autobuses / Papelería"
                    />
                  </div>
                )}
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
                <select
                  required
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="México">México</option>
                  <option value="Australia">Australia</option>
                  <option value="Canadá">Canadá</option>
                  <option value="China">China</option>
                  <option value="España">España</option>
                  <option value="Estados Unidos de America">Estados Unidos de America</option>
                  <option value="Italia">Italia</option>
                  <option value="Reino Unido">Reino Unido</option>
                </select>
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
