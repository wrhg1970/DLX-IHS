import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Mail, Phone, MapPin, FileText, Upload } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const tabs = [
  "Información General",
  "Contactos",
  "Campus Asociados",
  "Información Bancaria",
  "Documentos",
  "Estudiantes",
  "Administración"
];

export function FormInstitucion() {
  const navigate = useNavigate();
  const { catalogs, addInstitution, users, addContact, providers } = useAppContext();
  const [activeTab, setActiveTab] = useState("Información General");

  // Form State
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [country, setCountry] = useState("");
  const [contact, setContact] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [institutionTypeId, setInstitutionTypeId] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [membershipExpiration, setMembershipExpiration] = useState("");
  const [agentId, setAgentId] = useState<number | "">("");
  const [modality, setModality] = useState("");
  const [status, setStatus] = useState("Al corriente");
  const [membershipPrice, setMembershipPrice] = useState("");
  const [priceFullCredit, setPriceFullCredit] = useState("");
  const [priceHalfCredit, setPriceHalfCredit] = useState("");
  const [priceFullApCredit, setPriceFullApCredit] = useState("");
  const [priceHalfApCredit, setPriceHalfApCredit] = useState("");
  const [payWithIva, setPayWithIva] = useState(false);
  const [isCorporativo, setIsCorporativo] = useState(false);
  const [active, setActive] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [membershipPaymentMethod, setMembershipPaymentMethod] = useState("");
  const [membershipPaymentAccount, setMembershipPaymentAccount] = useState("");
  const [membershipPaymentCount, setMembershipPaymentCount] = useState<number | "">("");
  const [membershipPaymentStartDate, setMembershipPaymentStartDate] = useState("");
  const [coursePaymentMethod, setCoursePaymentMethod] = useState("");
  const [coursePaymentAccount, setCoursePaymentAccount] = useState("");
  const [coursePaymentCount, setCoursePaymentCount] = useState<number | "">("");
  const [coursePaymentStartDate, setCoursePaymentStartDate] = useState("");
  const [priceObservations, setPriceObservations] = useState("");

  // New Address / General fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [tarifasId, setTarifasId] = useState("");
  const [mainProviderId, setMainProviderId] = useState<number | "">("");

  // Local Lists for Unsaved Entity
  const [localContacts, setLocalContacts] = useState<{ name: string; lastName: string; position: string; area: string; email: string; phone: string }[]>([]);
  const [localCampus, setLocalCampus] = useState<{ id: string; name: string; cityCountry: string; contact: string; phone: string }[]>([]);
  const [localDocuments, setLocalDocuments] = useState<{ id: string; name: string; fileSize: string; uploadDate: string }[]>([]);

  // Sub-forms Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", lastName: "", position: "", area: "", email: "", phone: "" });

  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [campusForm, setCampusForm] = useState({ name: "", cityCountry: "", contact: "", phone: "" });

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docName, setDocName] = useState("");

  const handleSave = () => {
    // 1. Create main institution
    const newInstId = addInstitution({
      name: name || "Nueva Institución",
      tradeName: tradeName || undefined,
      country: country || "Desconocido",
      contact: contact || "Pendiente",
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      contactPosition: contactPosition || undefined,
      institutionTypeId: institutionTypeId || undefined,
      students: 0,
      status: status,
      membershipId: membershipId || undefined,
      membershipExpiration: membershipExpiration || undefined,
      agentId: agentId ? Number(agentId) : undefined,
      modality: modality || undefined,
      payWithIva: payWithIva,
      isCorporativo: isCorporativo,
      active: active,
      paymentMethod: paymentMethod || undefined,
      paymentAccount: paymentAccount || undefined,
      membershipPaymentMethod: membershipPaymentMethod || undefined,
      membershipPaymentAccount: membershipPaymentAccount || undefined,
      membershipPaymentCount: membershipPaymentCount ? Number(membershipPaymentCount) : undefined,
      membershipPaymentStartDate: membershipPaymentStartDate || undefined,
      coursePaymentMethod: coursePaymentMethod || undefined,
      coursePaymentAccount: coursePaymentAccount || undefined,
      coursePaymentCount: coursePaymentCount ? Number(coursePaymentCount) : undefined,
      coursePaymentStartDate: coursePaymentStartDate || undefined,
      priceObservations: priceObservations || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
      phone: phone || undefined,
      email: email || undefined,
      tarifasId: tarifasId || undefined,
      mainProviderId: mainProviderId ? Number(mainProviderId) : undefined,
      campusList: localCampus,
      documentsList: localDocuments
    });

    // 2. Link local contacts to newly created institution ID
    localContacts.forEach(c => {
      addContact({
        name: c.name,
        lastName: c.lastName,
        position: c.position,
        area: c.area,
        email: c.email,
        phone: c.phone,
        institutionId: newInstId
      });
    });

    navigate('/instituciones');
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalContacts(prev => [...prev, contactForm]);
    setContactForm({ name: "", lastName: "", position: "", area: "", email: "", phone: "" });
    setIsContactModalOpen(false);
  };

  const handleAddCampus = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalCampus(prev => [...prev, {
      ...campusForm,
      id: Math.random().toString(36).substr(2, 9)
    }]);
    setCampusForm({ name: "", cityCountry: "", contact: "", phone: "" });
    setIsCampusModalOpen(false);
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setLocalDocuments(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: docName,
      fileSize: (Math.random() * (4.5 - 0.5) + 0.5).toFixed(1) + " MB",
      uploadDate: new Date().toISOString().split('T')[0]
    }]);
    setDocName("");
    setIsDocModalOpen(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      setLocalDocuments(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: droppedFile.name,
        fileSize: (droppedFile.size / (1024 * 1024)).toFixed(2) + " MB",
        uploadDate: new Date().toISOString().split('T')[0]
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-4 px-1">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/instituciones')}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight border-b-0 pb-0">Añadir Institución</h1>
            <p className="text-xs text-slate-500 font-medium">Completa los detalles de la nueva institución.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/instituciones')}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </button>
        </div>
      </div>

      <div className="flex-1 flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-56 bg-slate-50 border-r border-slate-100 flex flex-col pt-2 shrink-0">
          {tabs.filter(tab => tab !== "Campus Asociados" || isCorporativo).map((tab) => {
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left px-5 py-3 text-xs font-bold tracking-wide uppercase transition-colors border-l-2 relative ${
                  activeTab === tab
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                    : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {activeTab === "Información General" && (
            <div className="max-w-3xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre Legal de la Institución <span className="text-rose-500">*</span></label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required placeholder="Ej. Universidad Tecnológica de México" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre Comercial</label>
                  <input type="text" value={tradeName} onChange={e => setTradeName(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre comercial o acrónimo" />
                </div>
              </div>
              
              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Ubicación y Datos de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Dirección</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Calle, Número, Colonia" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ciudad</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ciudad" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado / Provincia</label>
                    <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Estado" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Código Postal</label>
                    <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="CP" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">País</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="México, España, etc." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Teléfono Institucional</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="+52 ..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Correo electrónico General</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="info@institucion.com" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Contacto Principal y Gestor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre Contacto Principal</label>
                    <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Puesto del Contacto Principal</label>
                    <input type="text" value={contactPosition} onChange={e => setContactPosition(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Directora Académica, Admisiones" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Correo Contacto Principal</label>
                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="contacto@institucion.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Teléfono Contacto Principal</label>
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="Teléfono del contacto" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Agente / Gestor Asignado</label>
                    <select value={agentId} onChange={e => setAgentId(e.target.value ? Number(e.target.value) : '')} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Ninguno / Sin Asignar</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo de Institución</label>
                  <select value={institutionTypeId} onChange={e => setInstitutionTypeId(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">Seleccionar tipo...</option>
                    {catalogs['Tipos de Institución']?.map(ti => (
                      <option key={ti.id} value={ti.id}>{ti.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Modalidad (Catalogado)</label>
                  <select value={modality} onChange={e => setModality(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">Seleccionar modalidad...</option>
                    {catalogs['Modalidades']?.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tarifas (Tarifas Países)</label>
                  <select value={tarifasId} onChange={e => setTarifasId(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">Seleccionar Tarifa País...</option>
                    {catalogs['Tarifas Países']?.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Proveedor Principal</label>
                  <select value={mainProviderId} onChange={e => setMainProviderId(e.target.value ? Number(e.target.value) : '')} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer">
                    <option value="">Seleccionar Proveedor...</option>
                    {providers.filter(p => !p.providerType || p.providerType === "Curriculum Académico").map(p => (
                      <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
                    ))}
                  </select>
                </div>
                <div className="pb-2 flex flex-col gap-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={isCorporativo} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsCorporativo(checked);
                          if (!checked && activeTab === "Campus Asociados") {
                            setActiveTab("Información General");
                          }
                        }} 
                      />
                      <div className={`block w-9 h-5 rounded-full transition-colors ${isCorporativo ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isCorporativo ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">¿Es Corporativo?</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={active} 
                        onChange={(e) => setActive(e.target.checked)} 
                      />
                      <div className={`block w-9 h-5 rounded-full transition-colors ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                      <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${active ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activa</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Membresía</label>
                  <select value={membershipId} onChange={e => setMembershipId(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">Seleccionar...</option>
                    {catalogs['Membresías']?.map(m => (
                      <option key={m.id} value={m.id}>{m.name} {m.amount ? `($${m.amount} ${m.currency})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vigencia (Expiración)</label>
                  <input type="date" value={membershipExpiration} onChange={e => setMembershipExpiration(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Sección Sombreada: Precios */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-6 space-y-4">
                <div className="border-b border-slate-150 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Esquema de Precios y Pagos</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Los precios e importes para esta institución se calculan automáticamente basándose en la Membresía y las Tarifas de Paises de arriba.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 h-full pt-4 md:col-span-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={payWithIva} 
                          onChange={(e) => setPayWithIva(e.target.checked)} 
                        />
                        <div className={`block w-9 h-5 rounded-full transition-colors ${payWithIva ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${payWithIva ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pago con IVA</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Método de Pago</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value)} 
                      className="w-full border border-slate-200 bg-white rounded p-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="">Seleccionar método...</option>
                      {catalogs['Métodos de Pago']?.map(mp => (
                        <option key={mp.id} value={mp.name}>{mp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Cuenta Pago</label>
                    <select 
                      value={paymentAccount} 
                      onChange={e => setPaymentAccount(e.target.value)} 
                      className="w-full border border-slate-200 bg-white rounded p-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {catalogs['Cuentas bancarias']?.map(cb => {
                        const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                        return <option key={cb.id} value={cb.name}>{label}</option>;
                      })}
                    </select>
                  </div>

                  {/* Nueva sección: Forma de Pago */}
                  <div className="md:col-span-2 border-t border-slate-200/80 pt-4 mt-2 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-dashed border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <span>💳</span> Forma de Pago
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-150/85">
                      {/* Forma de pago membresía */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-widest pl-1 border-l-2 border-indigo-600">Forma de Pago Membresía</p>
                        
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Forma de Pago</label>
                            <select 
                              value={membershipPaymentMethod} 
                              onChange={e => setMembershipPaymentMethod(e.target.value)} 
                              className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Métodos de Pago']?.map(mp => (
                                <option key={mp.id} value={mp.name}>{mp.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cuenta de cobro</label>
                            <select 
                              value={membershipPaymentAccount} 
                              onChange={e => setMembershipPaymentAccount(e.target.value)} 
                              className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Cuentas bancarias']?.map(cb => {
                                const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                                return <option key={cb.id} value={cb.name}>{label}</option>;
                              })}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Número de pagos</label>
                              <input 
                                type="number" 
                                min="1"
                                placeholder="Ej. 1"
                                value={membershipPaymentCount || ""} 
                                onChange={e => setMembershipPaymentCount(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-700 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Fecha de inicio</label>
                              <input 
                                type="date" 
                                value={membershipPaymentStartDate} 
                                onChange={e => setMembershipPaymentStartDate(e.target.value)} 
                                className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-705 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Forma de pago cursos */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-widest pl-1 border-l-2 border-amber-600">Forma de Pago Cursos</p>
                        
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Forma de Pago</label>
                            <select 
                              value={coursePaymentMethod} 
                              onChange={e => setCoursePaymentMethod(e.target.value)} 
                              className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Métodos de Pago']?.map(mp => (
                                <option key={mp.id} value={mp.name}>{mp.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cuenta de cobro</label>
                            <select 
                              value={coursePaymentAccount} 
                              onChange={e => setCoursePaymentAccount(e.target.value)} 
                              className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Cuentas bancarias']?.map(cb => {
                                const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                                return <option key={cb.id} value={cb.name}>{label}</option>;
                              })}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Número de pagos</label>
                              <input 
                                type="number" 
                                min="1"
                                placeholder="Ej. 1"
                                value={coursePaymentCount || ""} 
                                onChange={e => setCoursePaymentCount(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-700 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Fecha de inicio</label>
                              <input 
                                type="date" 
                                value={coursePaymentStartDate} 
                                onChange={e => setCoursePaymentStartDate(e.target.value)} 
                                className="w-full border border-slate-200 bg-slate-50 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-705 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Observaciones comerciales</label>
                    <textarea value={priceObservations} onChange={e => setPriceObservations(e.target.value)} rows={2} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-sans" placeholder="Notas sobre condiciones comerciales, cargos, etc."></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Contactos" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Contactos Directos de la Institución</h3>
                  <p className="text-xs text-slate-500">Contactos de control que se registrarán junto con la institución.</p>
                </div>
                <button 
                  onClick={() => setIsContactModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-indigo-100 transition flex items-center cursor-pointer font-sans"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Contacto
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Nombre</th>
                      <th className="px-4 py-3 border-b border-slate-200">Apellido</th>
                      <th className="px-4 py-3 border-b border-slate-200">Puesto / Área</th>
                      <th className="px-4 py-3 border-b border-slate-200">Email</th>
                      <th className="px-4 py-3 border-b border-slate-200">Teléfono</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {localContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay contactos añadidos aún en este formulario. Haz clic en "+ Añadir Contacto".</td>
                      </tr>
                    ) : (
                      localContacts.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                          <td className="px-4 py-3 text-slate-850">{c.lastName}</td>
                          <td className="px-4 py-3 text-slate-600">{c.position} ({c.area})</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{c.email}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{c.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setLocalContacts(prev => prev.filter((_, i) => i !== idx))} 
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Marketing" && (
            <div className="max-w-xl space-y-6">
              <p className="text-sm text-slate-600 mb-6">Enlaces a las redes sociales de la institución.</p>
              
              {["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok"].map((network) => (
                <div key={network}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{network}</label>
                  <input type="url" placeholder="https://" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              ))}
            </div>
          )}

          {activeTab === "Campus Asociados" && (
            <div className="space-y-4 font-sans">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Sedes o Campus Secundarios</h3>
                  <p className="text-xs text-slate-500 font-medium">Registra los campus o planteles pertenecientes a esta institución.</p>
                </div>
                <button 
                  onClick={() => setIsCampusModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-indigo-100 transition flex items-center cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Campus
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Nombre del Campus</th>
                      <th className="px-4 py-3 border-b border-slate-200">Ciudad / País</th>
                      <th className="px-4 py-3 border-b border-slate-200">Contacto Asignado</th>
                      <th className="px-4 py-3 border-b border-slate-200 font-mono">Teléfono</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {localCampus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay campus añadidos aún. Haz clic en "+ Añadir Campus".</td>
                      </tr>
                    ) : (
                      localCampus.map((camp, idx) => (
                        <tr key={camp.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{camp.name}</td>
                          <td className="px-4 py-3 text-slate-700">{camp.cityCountry}</td>
                          <td className="px-4 py-3 text-slate-650">{camp.contact}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{camp.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setLocalCampus(prev => prev.filter(c => c.id !== camp.id))} 
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Información Bancaria" && (
            <div className="max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre de la Cuenta</label>
                  <input type="text" value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Banco</label>
                  <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">No. Cuenta / IBAN</label>
                  <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cuentas vinculadas (Catálogo)</label>
                  <select className="w-full border border-slate-200 bg-white rounded p-2 text-sm outline-none">
                    <option value="">Seleccionar cuenta contable...</option>
                    {catalogs['Cuentas bancarias']?.map(cb => (
                      <option key={cb.id} value={cb.id}>{cb.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">SWIFT / BIC</label>
                  <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono tracking-widest uppercase" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "Documentos" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Repositorio de Documentos</h3>
                  <p className="text-xs text-slate-500 font-medium">Sube acuerdos de confidencialidad, convenios, etc.</p>
                </div>
                <button 
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-indigo-100 transition flex items-center cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Subir Documento
                </button>
              </div>

              {/* Drag and Drop Container */}
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer"
              >
                 <div className="w-10 h-10 bg-white text-slate-400 rounded-full flex items-center justify-center shadow-xs border border-slate-100 mb-2">
                   <Upload className="w-5 h-5 text-indigo-500" />
                 </div>
                 <p className="text-sm font-medium text-slate-700">Arrastra archivos aquí o haz clic en "Subir Documento"</p>
                 <p className="text-[11px] text-slate-400 mt-0.5">Soporta PDF, JPG, PNG o DOCX hasta 10MB</p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                <table className="w-full text-left font-sans">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Nombre del Archivo</th>
                      <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                      <th className="px-4 py-3 border-b border-slate-200">Fecha de Carga</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {localDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No hay documentos de la institución registrados aún en esta carga.</td>
                      </tr>
                    ) : (
                      localDocuments.map((doc, idx) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-700 flex items-center">
                            <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                            {doc.name}
                          </td>
                          <td className="px-4 py-3 text-slate-605 font-mono">{doc.fileSize}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{doc.uploadDate}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setLocalDocuments(prev => prev.filter(d => d.id !== doc.id))} 
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "Estudiantes" && (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-2">No se pueden gestionar estudiantes en una institución no guardada.</p>
              <p className="text-sm text-slate-400">Guarda primero para habilitar esta sección.</p>
            </div>
          )}

          {activeTab === "Administración" && (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-2">No hay pagos asociados aún.</p>
              <p className="text-sm text-slate-400">Guarda la institución para poder registrar pagos.</p>
            </div>
          )}

        </div>
      </div>

      {/* Sub-form modal: Contact */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100">Añadir Contacto</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre</label>
                  <input type="text" required value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Apellido</label>
                  <input type="text" required value={contactForm.lastName} onChange={e => setContactForm(prev => ({ ...prev, lastName: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Puesto</label>
                  <input type="text" required value={contactForm.position} onChange={e => setContactForm(prev => ({ ...prev, position: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Área</label>
                  <input type="text" required value={contactForm.area} onChange={e => setContactForm(prev => ({ ...prev, area: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Correo electrónico</label>
                <input type="email" required value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono</label>
                <input type="tel" required value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 uppercase hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase">Insertar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-form modal: Campus */}
      {isCampusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100">Añadir Campus</h3>
            <form onSubmit={handleAddCampus} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Comercial del Campus</label>
                <input type="text" required value={campusForm.name} onChange={e => setCampusForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Campus Monterrey Sur" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Ciudad / País</label>
                <input type="text" required value={campusForm.cityCountry} onChange={e => setCampusForm(prev => ({ ...prev, cityCountry: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Monterrey, México" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Contacto del Campus</label>
                <input type="text" required value={campusForm.contact} onChange={e => setCampusForm(prev => ({ ...prev, contact: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono Directo</label>
                <input type="tel" required value={campusForm.phone} onChange={e => setCampusForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono" placeholder="+52 ..." />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCampusModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 uppercase hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase">Insertar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-form modal: Document */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100">Subir Documento</h3>
            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Técnico de Acuerdo / Archivo</label>
                <input type="text" required value={docName} onChange={e => setDocName(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. NDA_Universidad_Firmado.pdf" />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 uppercase hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase">Cargar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
