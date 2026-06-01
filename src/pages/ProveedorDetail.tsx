import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building, MapPin, Phone, Mail, Network, Landmark, Receipt, Plus, Users, BookOpen, Trash2 } from "lucide-react";
import { useAppContext, ProviderProductService } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { FinancialTransactionForm } from "../components/FinancialTransactionForm";

const academicSubcats = [
  "Syllabus Académico",
  "Curso de Idiomas",
  "Certificación AP",
  "Tutorías y Consultorías",
  "Excursión / Programa Académico",
  "Plataforma Educativa",
  "Materiales y Libros"
];

export function ProveedorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    providers, contacts, bankAccounts, financialTransactions, addContact, addBankAccount, updateProvider, deleteFinancialTransaction, students, enrollments, classes, institutions,
    providerProductServices, addProviderProductService, updateProviderProductService, deleteProviderProductService,
    catalogs
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState("Información General");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const provider = providers.find(p => p.id === Number(id));

  const [contactForm, setContactForm] = useState({
    name: '', lastName: '', position: '', area: '', email: '', phone: ''
  });

  const [bankForm, setBankForm] = useState({
    bankName: '', accountName: '', accountNumber: '', clabe: '', reference: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    date: '', amount: '', tax: '', exchangeRate: '1.0', finalAmount: '', bankAccountId: '', concept: '', reference: ''
  });

  // Product and country rate states and helper
  const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

  // Dynamic product type defaults from catalogs list
  const catalogProductTypes = (catalogs['Tipo de Producto'] || [])
    .filter(item => !item.providerIds || item.providerIds.length === 0 || item.providerIds.includes(Number(id)))
    .map(item => item.name);
  const defaultProductType = catalogProductTypes.includes('Syllabus Académico') 
    ? 'Syllabus Académico' 
    : (catalogProductTypes[0] || 'Syllabus Académico');

  // Rate configurations for Product Types
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [selectedProductTypeForCountry, setSelectedProductTypeForCountry] = useState<string | null>(null);
  const [countryForm, setCountryForm] = useState({
    country: '',
    priceFullCredit: '',
    priceHalfCredit: '',
    priceFullApCredit: '',
    priceHalfApCredit: '',
    costFullCredit: '',
    costHalfCredit: '',
    costFullApCredit: '',
    costHalfApCredit: '',
  });

  const handleCountrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductTypeForCountry || !provider) return;
    
    // Find if the base type service setup already exists for this provider and productType
    let baseTypeProd = providerProductServices.find(
      p => p.providerId === provider.id && p.productType === selectedProductTypeForCountry
    );

    const isClase = ['clase', 'clases'].includes(selectedProductTypeForCountry?.toLowerCase() || '');
    const newRate = {
      country: countryForm.country,
      priceFullCredit: countryForm.priceFullCredit,
      priceHalfCredit: isClase ? countryForm.priceHalfCredit : '',
      priceFullApCredit: isClase ? countryForm.priceFullApCredit : '',
      priceHalfApCredit: isClase ? countryForm.priceHalfApCredit : '',
      costFullCredit: countryForm.costFullCredit,
      costHalfCredit: isClase ? countryForm.costHalfCredit : '',
      costFullApCredit: isClase ? countryForm.costFullApCredit : '',
      costHalfApCredit: isClase ? countryForm.costHalfApCredit : '',
    };

    if (!baseTypeProd) {
      addProviderProductService({
        providerId: provider.id,
        name: selectedProductTypeForCountry,
        productType: selectedProductTypeForCountry,
        countryPrices: [newRate]
      });
    } else {
      let updatedRates = [...(baseTypeProd.countryPrices || [])];
      const existingIndex = updatedRates.findIndex(r => r.country.toLowerCase() === countryForm.country.toLowerCase());
      if (existingIndex > -1) {
        updatedRates[existingIndex] = newRate;
      } else {
        updatedRates.push(newRate);
      }
      updateProviderProductService(baseTypeProd.id, { countryPrices: updatedRates });
    }

    setIsCountryModalOpen(false);
    setSelectedProductTypeForCountry(null);
    setCountryForm({
      country: '',
      priceFullCredit: '',
      priceHalfCredit: '',
      priceFullApCredit: '',
      priceHalfApCredit: '',
      costFullCredit: '',
      costHalfCredit: '',
      costFullApCredit: '',
      costHalfApCredit: '',
    });
  };

  const handleDeleteCountryRate = (productType: string, countryName: string) => {
    if (!provider) return;
    const baseTypeProd = providerProductServices.find(
      p => p.providerId === provider.id && p.productType === productType
    );
    if (!baseTypeProd) return;
    const updatedRates = (baseTypeProd.countryPrices || []).filter(r => r.country.toLowerCase() !== countryName.toLowerCase());
    updateProviderProductService(baseTypeProd.id, { countryPrices: updatedRates });
  };

  if (!provider) {
    return <div className="p-8 text-center text-slate-500">Proveedor no encontrado</div>;
  }

  const provContacts = contacts.filter(c => c.providerId === provider.id);
  const provBankAccounts = bankAccounts.filter(b => b.providerId === provider.id);
  const provPayments = financialTransactions.filter(p => p.providerId === provider.id && p.type === 'expense');

  // Alumnos inscritos en sus clases o servicios
  const providerClasses = classes?.filter(c => c.providerId === provider.id) || [];
  const providerClassIds = providerClasses.map(c => c.id);
  const providerEnrollments = enrollments?.filter(e => 
    providerClassIds.includes(e.classId) || e.providerId === provider.id
  ) || [];
  const enrolledStudentIds = Array.from(new Set(providerEnrollments.map(e => e.studentId)));
  const enrolledStudents = students?.filter(s => enrolledStudentIds.includes(s.id)) || [];

  const activeEnrollmentsCount = providerEnrollments.filter(e => e.status === 'Active' || !e.status).length;
  const completedEnrollmentsCount = providerEnrollments.filter(e => e.status === 'Completed').length;
  const onHoldEnrollmentsCount = providerEnrollments.filter(e => e.status === 'On hold').length;
  const withdrawnEnrollmentsCount = providerEnrollments.filter(e => e.status === 'Withdrawn').length;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContact({ ...contactForm, providerId: provider.id });
    setIsContactModalOpen(false);
    setContactForm({ name: '', lastName: '', position: '', area: '', email: '', phone: '' });
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBankAccount({ ...bankForm, providerId: provider.id });
    setIsBankModalOpen(false);
    setBankForm({ bankName: '', accountName: '', accountNumber: '', clabe: '', reference: '' });
  };

  const openPaymentModal = (payment?: any) => {
    setEditingPayment(payment || null);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const mainTabs = [
    { name: "Información General", icon: Building },
    { name: "Contactos", icon: Network },
    { name: "Productos", icon: BookOpen },
    { name: "Alumnos Inscritos", icon: Users },
    { name: "Cuentas Bancarias", icon: Landmark },
    { name: "Pagos", icon: Receipt },
  ];

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    legalName: provider.legalName || (provider as any).name || '',
    commercialName: provider.commercialName || (provider as any).name || '',
    rfc: provider.rfc || '',
    phone: provider.phone || '',
    email: provider.email || '',
    category: provider.category || '',
    subcategory: provider.subcategory || '',
    street: provider.street || '',
    neighborhood: provider.neighborhood || '',
    city: provider.city || '',
    state: provider.state || '',
    zipCode: provider.zipCode || '',
    country: provider.country || '',
    status: provider.status || 'Activo',
    providerType: provider.providerType || 'Curriculum Académico'
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProvider(provider.id, editForm);
    setIsEditModalOpen(false);
  };

  const providerInitials = (provider.commercialName || (provider as any).name || "X").substring(0, 2).toUpperCase();

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-full">
      <div className="bg-[#f8fafc] w-full max-w-5xl rounded-3xl shadow-xl flex flex-col overflow-hidden max-h-full border border-slate-200">
        
        {/* Header content */}
        <div className="bg-white px-8 pt-8 pb-1 relative border-b border-slate-100">
          <div className="absolute top-6 right-6 flex items-center space-x-2">
            <button 
              onClick={() => setIsEditModalOpen(true)} 
              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-all duration-150 border border-indigo-100 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Editar proveedor"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              <span>Editar</span>
            </button>
            <button 
              onClick={() => navigate('/proveedores')} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 flex items-center justify-center cursor-pointer"
              title="Volver"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
 
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#e47352] to-[#f08566] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-orange-500/10">
              {providerInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-sans">
                  {provider.commercialName || (provider as any).name}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest border uppercase ${
                  provider.status === 'Al corriente' || provider.status === 'Activo' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : provider.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {provider.status || "Activo"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider font-mono">
                {provider.legalName || (provider as any).name}
              </p>
            </div>
          </div>
 
          {/* Tabs */}
          <div className="flex space-x-1 mt-8 border-b border-slate-100 overflow-x-auto scrollbar-none">
            {mainTabs.map(tab => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`py-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
                    isSelected 
                      ? 'text-[#e47352] border-[#e47352] bg-orange-50/20' 
                      : 'text-slate-450 border-transparent hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isSelected ? 'text-[#e47352]' : 'text-slate-400'}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
 
        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 py-6 bg-slate-50 min-h-[420px]">
          
          {activeTab === "Información General" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Panel 1: Perfil y Datos Legales */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Building className="w-4 h-4 text-[#e47352]" />
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Identificación Legal</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nombre Comercial</h4>
                      <p className="text-sm text-slate-800 font-bold mt-0.5">{provider.commercialName}</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Razón Social Legal</h4>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">{provider.legalName}</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RFC / Tax ID</h4>
                      <p className="text-xs text-indigo-700 font-semibold font-mono bg-indigo-50 border border-indigo-100 rounded px-2 py-1 mt-1 inline-block uppercase">
                        {provider.rfc || "No registrado"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Categoría de Servicios</h4>
                      <p className="text-xs text-slate-800 font-bold mt-0.5">
                        {provider.category || "General"}
                        {provider.subcategory && (
                          <span className="text-slate-400 font-normal"> ({provider.subcategory})</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Proveedor</h4>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                        provider.providerType === "Servicios Extras"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}>
                        {provider.providerType || "Curriculum Académico"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Información de Contacto */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <Phone className="w-4 h-4 text-[#e47352]" />
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Contacto Directo</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Teléfono de Enlace</h4>
                      <p className="text-sm text-slate-800 font-bold font-mono mt-1 flex items-center">
                        <span className="bg-emerald-50 text-emerald-700 p-1 rounded mr-2 border border-emerald-150">
                          <Phone className="w-3.5 h-3.5" />
                        </span>
                        {provider.phone || "Sin teléfono registrado"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Correo Institucional</h4>
                      <p className="text-xs text-slate-700 font-medium mt-1 flex items-center">
                        <span className="bg-blue-50 text-blue-700 p-1 rounded mr-2 border border-blue-150">
                          <Mail className="w-3.5 h-3.5" />
                        </span>
                        <a href={`mailto:${provider.email}`} className="hover:text-indigo-600 hover:underline break-all font-semibold select-all">
                          {provider.email || "Sin correo registrado"}
                        </a>
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2">
                      <a 
                        href={`mailto:${provider.email}`}
                        className="w-full text-center bg-slate-900 text-white rounded-xl py-2 px-3 hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar Correo</span>
                      </a>
                      <a 
                        href={`tel:${provider.phone}`}
                        className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Marcar Teléfono</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Dirección Fiscal */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <MapPin className="w-4 h-4 text-[#e47352]" />
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">Domicilio Fiscal</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Calle y Colonia</h4>
                      <p className="text-xs text-slate-800 font-bold mt-1">
                        {provider.street || "S/N"}
                        {provider.neighborhood && <span className="block font-medium text-slate-500 mt-0.5">Col. {provider.neighborhood}</span>}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estado, Ciudad & CP</h4>
                      <p className="text-xs text-slate-700 font-semibold mt-1">
                        {provider.city ? `${provider.city}, ${provider.state || ""}` : "No provisto"}
                        {provider.zipCode && <span className="block font-mono text-[#e47352] mt-0.5">C.P. {provider.zipCode}</span>}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">País</h4>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        🌍 {provider.country || "México"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {activeTab === "Contactos" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-sans">Contactos de Enlace</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Gestión de personas responsables de cuentas, soporte académico o facturación</p>
                </div>
                <button 
                  onClick={() => setIsContactModalOpen(true)} 
                  className="bg-[#e47352] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition flex items-center justify-center cursor-pointer shadow-sm shadow-orange-500/10"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Añadir Contacto
                </button>
              </div>
              
              {provContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {provContacts.map(contact => {
                    const initials = `${contact.name[0] || ""}${contact.lastName[0] || ""}`.toUpperCase();
                    return (
                      <div key={contact.id} className="border border-slate-200 bg-white rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start space-x-4">
                          <div className="h-10 w-10 rounded-xl bg-orange-100 text-[#e47352] flex items-center justify-center font-bold text-sm shrink-0 border border-orange-200">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{contact.name} {contact.lastName}</p>
                            <p className="text-xs text-[#e47352] font-semibold mt-0.5">
                              {contact.position} 
                              {contact.area && <span className="text-slate-400 font-normal"> • {contact.area}</span>}
                            </p>
                            
                            <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                              <div className="flex items-center text-xs text-slate-650 hover:text-indigo-600">
                                <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <a href={`mailto:${contact.email}`} className="hover:underline font-mono truncate">{contact.email}</a>
                              </div>
                              <div className="flex items-center text-xs text-slate-650 hover:text-indigo-600">
                                <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                <a href={`tel:${contact.phone}`} className="hover:underline font-mono">{contact.phone}</a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-350 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <Users className="w-6 h-6 stroke-1.5" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No hay contactos registrados</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">Crea contactos directos para agilizar la correspondencia o el soporte con este proveedor.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Cuentas Bancarias" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-sans">Cuentas Bancarias</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Monitorea y configura las cuentas destinadas a egresos y transferencias</p>
                </div>
                <button 
                  onClick={() => setIsBankModalOpen(true)} 
                  className="bg-[#e47352] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition flex items-center justify-center cursor-pointer shadow-sm shadow-orange-500/10"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Añadir Cuenta
                </button>
              </div>
              
              {provBankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {provBankAccounts.map(account => (
                    <div key={account.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-[#e47352]/50 hover:shadow-md transition-all duration-200 bg-white relative overflow-hidden group">
                      
                      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-12 -translate-y-12 group-hover:bg-orange-50/40 transition-colors z-0" />

                      <div className="relative z-10">
                        <div className="flex items-center space-x-3.5 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#e47352] group-hover:border-orange-100 transition-colors duration-200">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-850 text-sm tracking-tight">{account.bankName}</p>
                            <p className="text-xs text-slate-500 italic mt-0.5">Beneficiario: <b className="text-slate-700 font-medium">{account.accountName}</b></p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase text-[9px]">Número de Cuenta</span>
                            <span className="font-mono text-slate-800 font-semibold select-all bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100">{account.accountNumber}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase text-[9px]">CLABE Interbancaria</span>
                            <span className="font-mono text-slate-800 font-semibold select-all bg-slate-55 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100">{account.clabe}</span>
                          </div>
                          {account.reference && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 uppercase text-[9px]">Referencia Interna</span>
                              <span className="text-indigo-650 font-bold bg-indigo-50/50 rounded px-1.5 py-0.5">{account.reference}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-slate-350 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <Landmark className="w-6 h-6 stroke-1.5" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No hay cuentas bancarias registradas</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">Configura cuentas bancarias para ligar los cobros, compras y pagos directamente a sus CLABEs.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Pagos" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-sans">Historial de Pagos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Control financiero, liquidaciones e historial de erogaciones aplicadas</p>
                </div>
                <button 
                  onClick={() => openPaymentModal()} 
                  className="bg-[#e47352] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition flex items-center justify-center cursor-pointer shadow-sm shadow-orange-500/10"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Registrar Egresos / Pagos
                </button>
              </div>
            
              {provPayments.length > 0 ? (
                <div className="bg-white border border-slate-200/85 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8fafc] text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Fecha de Operación</th>
                        <th className="px-6 py-4">Concepto del Gasto</th>
                        <th className="px-6 py-4 text-center">Estatus</th>
                        <th className="px-6 py-4 text-right">Monto Erogado</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {provPayments.map((payment) => (
                        <tr key={payment.id} onClick={() => openPaymentModal(payment)} className="hover:bg-indigo-50/15 transition-all cursor-pointer group">
                          <td className="px-6 py-4 font-semibold text-slate-700 font-mono text-xs">{payment.date}</td>
                          <td className="px-6 py-4 text-slate-800 font-bold group-hover:text-indigo-650 transition-colors">
                            {payment.description || "Pago general"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                              payment.status === 'Aplicado' 
                                ? 'bg-emerald-50 text-[#0f573f] border-emerald-100' 
                                : 'bg-amber-50 text-[#7a4c10] border-amber-100'
                            }`}>
                              {payment.status || 'Aplicado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-black text-slate-800 text-sm">
                            ${payment.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} {payment.currency}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Está seguro de que desea eliminar permanentemente este pago a proveedor por un monto de $${payment.amount.toLocaleString()} ${payment.currency}? Esta acción no se puede deshacer.`)) {
                                  deleteFinancialTransaction(payment.id);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 transition-colors inline-flex items-center cursor-pointer border border-transparent hover:border-rose-100"
                              title="Eliminar Pago"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-slate-350 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <Receipt className="w-6 h-6 stroke-1.5" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No hay pagos o egresos registrados para este proveedor</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">Puedes ingresar aquí pagos periódicos, erogaciones extraordinarias de caja o transferencias.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Alumnos Inscritos" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Estudiantes Vinculados</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Listado de alumnos inscritos en las clases o servicios provistos por este colaborador</p>
                </div>
              </div>

              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex items-center space-x-3.5 col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Estudiantes</p>
                    <p className="text-xl font-black font-mono text-slate-850">{enrolledStudents.length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-extrabold text-[10px]">
                    ACT
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Activos</p>
                    <p className="text-xl font-black font-mono text-emerald-600">{activeEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-extrabold text-[10px]">
                    CMP
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Completados</p>
                    <p className="text-xl font-black font-mono text-blue-605 text-blue-600">{completedEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-extrabold text-[10px]">
                    HLD
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">On Hold</p>
                    <p className="text-xl font-black font-mono text-amber-600">{onHoldEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 bg-rose-55 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 font-extrabold text-[10px]">
                    WDR
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Withdrawn</p>
                    <p className="text-xl font-black font-mono text-rose-600">{withdrawnEnrollmentsCount}</p>
                  </div>
                </div>
              </div>

              {providerEnrollments.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead className="bg-[#f8fafc] text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Estudiante / Alumno</th>
                        <th className="px-6 py-4">Clase o Programa Académico</th>
                        <th className="px-6 py-4 text-center">Estatus</th>
                        <th className="px-6 py-4">Línea de Tiempo</th>
                        <th className="px-6 py-4 text-center">Créditos</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-105 divide-slate-100">
                      {providerEnrollments.map((env) => {
                        const student = students?.find(s => s.id === env.studentId);
                        const cItem = classes?.find(c => c.id === env.classId);
                        const inst = student ? institutions?.find(i => i.id === student.institutionId) : null;

                        if (!student) return null;

                        const statusVal = env.status || 'Active';
                        let statusColor = "bg-slate-50 text-slate-600 border-slate-100";
                        if (statusVal === 'Active') {
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                        } else if (statusVal === 'Completed') {
                          statusColor = "bg-blue-50 text-blue-700 border-blue-100";
                        } else if (statusVal === 'On hold') {
                          statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                        } else if (statusVal === 'Withdrawn') {
                          statusColor = "bg-slate-100 text-slate-705 border-slate-200";
                        }

                        const studentInitials = `${student.name[0] || 'A'}${student.lastName ? student.lastName[0] : ''}`.toUpperCase();

                        return (
                          <tr 
                            key={env.id} 
                            onClick={() => navigate(`/alumnos/${student.id}`)}
                            className="hover:bg-indigo-50/15 transition-all cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#e47352] font-black text-xs flex items-center justify-center border border-orange-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors">
                                  {studentInitials}
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-650 transition-colors font-sans">
                                    {student.name} {student.lastName}
                                  </p>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    {student.studentCustomId && (
                                      <span className="text-[8px] font-black font-mono text-[#e47352] bg-orange-50 px-1 py-0.2 rounded border border-orange-100 leading-none uppercase">
                                        {student.studentCustomId}
                                      </span>
                                    )}
                                    {inst && (
                                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                                        🏫 {inst.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {cItem ? (
                                <div>
                                  <p className="font-bold text-slate-800 text-xs leading-none mb-1 group-hover:text-indigo-600 transition-colors">{cItem.name}</p>
                                  {cItem.code && (
                                    <span className="text-[9px] text-[#e47352] bg-orange-50/55 rounded px-1 font-mono tracking-wider font-semibold">{cItem.code}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs font-sans">Clase desvinculada (ID: {env.classId})</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-widest ${statusColor}`}>
                                {statusVal}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-0.5 text-[10px] font-mono text-slate-500">
                                {env.enrollmentDate && (
                                  <p>
                                    <span className="font-sans text-slate-400 font-bold uppercase text-[9px] mr-1">Inscrito:</span>{env.enrollmentDate}
                                  </p>
                                )}
                                <p>
                                  <span className="font-sans text-slate-400 font-bold uppercase text-[9px] mr-1">Vigencia:</span>{env.startDate || env.activationDate || '-'} al {env.endDate || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 shadow-sm leading-none whitespace-nowrap">
                                {cItem?.creditType || `${cItem?.credits || 0} CR`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-slate-350 bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <Users className="w-6 h-6 stroke-1.5" />
                  </div>
                  <p className="text-slate-700 font-bold text-sm">No hay alumnos inscritos en los servicios de este proveedor</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm leading-relaxed">Si creas clases asignadas a este proveedor e inscribes alumnos en su respectiva ficha o agenda, aparecerán aquí de forma automática.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Productos" && (
            <div className="animate-in fade-in duration-300 space-y-8">
              
              {/* 1. Tarifario Base por Tipo de Producto */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-6 shadow-sm">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-sans">1. Tarifario Estándar por Tipo de Producto</h3>
                  <p className="text-xs text-slate-500 mt-1">Configura los precios de venta (ingresos) y costos de adquisición (egresos) de este proveedor por tarifa para cada tipo general de producto.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(catalogProductTypes.length > 0 ? catalogProductTypes : ["Clase", "Plataforma", "Examen", "Certificación"]).map((type) => {
                    const typeConfig = providerProductServices.find(
                      ps => ps.providerId === provider.id && ps.productType === type
                    );
                    const hasRates = typeConfig && typeConfig.countryPrices && typeConfig.countryPrices.length > 0;

                    return (
                      <div key={type} className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 hover:bg-white hover:border-[#e47352]/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              (type === 'Clase' || type === 'Syllabus Académico') && "bg-blue-50 text-blue-700 border border-blue-200",
                              (type === 'Plataforma' || type === 'Curso de Idiomas') && "bg-purple-50 text-purple-700 border border-purple-200",
                              (type === 'Examen' || type === 'Certificación AP') && "bg-orange-50 text-orange-700 border border-orange-200",
                              !['Clase', 'Plataforma', 'Examen', 'Syllabus Académico', 'Curso de Idiomas', 'Certificación AP'].includes(type) && "bg-teal-50 text-teal-700 border border-teal-200",
                            )}>
                              {type}
                            </span>
                            
                            <button
                              onClick={() => {
                                setSelectedProductTypeForCountry(type);
                                setCountryForm({
                                  country: '',
                                  priceFullCredit: '',
                                  priceHalfCredit: '',
                                  priceFullApCredit: '',
                                  priceHalfApCredit: '',
                                  costFullCredit: '',
                                  costHalfCredit: '',
                                  costFullApCredit: '',
                                  costHalfApCredit: '',
                                });
                                setIsCountryModalOpen(true);
                              }}
                              className="text-[10px] font-black text-[#e47352] bg-orange-50 border border-orange-200/50 hover:bg-orange-100 hover:text-orange-700 px-3 py-1.5 rounded-xl transition cursor-pointer"
                            >
                              {hasRates ? "Configurar Tarifas" : "+ Añadir Tarifa"}
                            </button>
                          </div>

                          {/* List of Country rates for this type */}
                          <div className="mt-4 space-y-2">
                            {hasRates ? (
                              <div className="space-y-3 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                                {typeConfig.countryPrices.map((cp, cpIdx) => (
                                  <div key={cpIdx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col hover:border-indigo-150 transition-colors">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                      <span className="text-xs font-bold text-slate-800 flex items-center">
                                        🌍 {cp.country}
                                      </span>
                                      <div className="flex items-center space-x-1 font-mono text-[9px]">
                                        <button
                                          onClick={() => {
                                            setCountryForm({
                                              ...cp,
                                              country: '', // Clear the country so they can pick a new target tariff country
                                            });
                                            setSelectedProductTypeForCountry(type);
                                            setIsCountryModalOpen(true);
                                          }}
                                          className="text-emerald-600 hover:text-emerald-800 font-bold px-1 py-0.5 rounded hover:bg-emerald-50 cursor-pointer"
                                          title="Duplicar tarifa"
                                        >
                                          Duplicar
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          onClick={() => {
                                            setCountryForm({ ...cp });
                                            setSelectedProductTypeForCountry(type);
                                            setIsCountryModalOpen(true);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-850 font-bold px-1 py-0.5 rounded hover:bg-indigo-50 cursor-pointer"
                                          title="Editar tarifa"
                                        >
                                          Editar
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          onClick={() => {
                                            if (confirm(`¿Eliminar las tarifas de ${cp.country} para ${type}?`)) {
                                              handleDeleteCountryRate(type, cp.country);
                                            }
                                          }}
                                          className="text-rose-500 hover:text-rose-700 font-bold px-1 py-0.5 rounded hover:bg-rose-50 cursor-pointer"
                                          title="Eliminar tarifa"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-650">
                                      {['clase', 'clases'].includes(type.toLowerCase()) ? (
                                        <>
                                          <div>
                                            <span className="font-bold text-slate-400 text-[8px] uppercase">Ventas (Comp/Med/AP):</span>
                                            <div className="font-mono text-slate-800 font-bold mt-0.5">
                                              ${cp.priceFullCredit || "0"} / ${cp.priceHalfCredit || "0"} / AP: ${cp.priceFullApCredit || "0"}
                                            </div>
                                          </div>
                                          <div>
                                            <span className="font-bold text-slate-400 text-[8px] uppercase">Costos (Comp/Med/AP):</span>
                                            <div className="font-mono text-rose-650 font-bold mt-0.5">
                                              ${cp.costFullCredit || "0"} / ${cp.costHalfCredit || "0"} / AP: ${cp.costFullApCredit || "0"}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            <span className="font-bold text-slate-400 text-[8px] uppercase">Precio Venta:</span>
                                            <div className="font-mono font-black text-slate-850 text-xs mt-0.5">
                                              ${cp.priceFullCredit || cp.priceFullApCredit || "0"}
                                            </div>
                                          </div>
                                          <div>
                                            <span className="font-bold text-slate-400 text-[8px] uppercase">Costo Adquisición:</span>
                                            <div className="font-mono font-black text-rose-650 text-xs mt-0.5">
                                              ${cp.costFullCredit || cp.costFullApCredit || "0"}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center">
                                Sin tarifas configuradas para este tipo de producto.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real / Linked Classes Section */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-900 px-6 py-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest text-[#cbd5e1]">Listado de Clases o Productos Académicos Oficiales</h3>
                  <p className="text-[11px] mt-0.5 text-slate-400">Clases configuradas en la institución que están vinculadas a este proveedor</p>
                </div>
                
                {providerClasses && providerClasses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white min-w-[500px]">
                      <thead className="bg-[#f8fafc] text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Clave de Clase</th>
                          <th className="px-6 py-4">Nombre Oficial</th>
                          <th className="px-6 py-4">Tipo de Crédito</th>
                          <th className="px-6 py-4">Vigencia del Servicio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {providerClasses.map((cl) => (
                          <tr key={cl.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-mono font-black text-[#e47352] text-xs">
                              <span className="bg-orange-50 px-2 py-1 rounded border border-orange-100">{cl.code || 'SIN CLAVE'}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">{cl.name}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-750 font-black uppercase tracking-wider whitespace-nowrap">
                                {cl.creditType || 'Crédito completo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{cl.validity || 'Sin vigencia'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-450 italic text-xs">
                    No hay clases oficiales vinculadas directamente con este proveedor comercial en este momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button 
            onClick={() => navigate('/proveedores')}
            className="px-6 py-2.5 bg-[#0f172a] text-white rounded-xl font-bold text-sm tracking-wide hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title="Añadir Contacto">
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
              <input required type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Apellidos</label>
              <input required type="text" value={contactForm.lastName} onChange={e => setContactForm({...contactForm, lastName: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Puesto / Cargo</label>
              <input required type="text" value={contactForm.position} onChange={e => setContactForm({...contactForm, position: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Área / Departamento</label>
              <input type="text" value={contactForm.area} onChange={e => setContactForm({...contactForm, area: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input required type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
              <input required type="tel" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-indigo-700">Guardar Contacto</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)} title="Añadir Cuenta Bancaria">
        <form onSubmit={handleBankSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Banco</label>
              <input required type="text" value={bankForm.bankName} onChange={e => setBankForm({...bankForm, bankName: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre de la Cuenta (Beneficiario)</label>
              <input required type="text" value={bankForm.accountName} onChange={e => setBankForm({...bankForm, accountName: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Cuenta</label>
              <input required type="text" value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CLABE / IBAN</label>
              <input required type="text" value={bankForm.clabe} onChange={e => setBankForm({...bankForm, clabe: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Referencia (Opcional)</label>
              <input type="text" value={bankForm.reference} onChange={e => setBankForm({...bankForm, reference: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-indigo-700">Guardar Cuenta</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} title="Registrar Pago a Proveedor">
        <FinancialTransactionForm 
          initialType="expense" 
          initialData={editingPayment} 
          fixedProviderId={provider.id}
          onSuccess={closePaymentModal} 
        />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Proveedor">
        <form onSubmit={handleEditSubmit} className="space-y-6">
          
          {/* Información Básica */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Información Básica</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre Comercial</label>
                <input required type="text" value={editForm.commercialName} onChange={e => setEditForm({...editForm, commercialName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Razón Social Legal</label>
                <input required type="text" value={editForm.legalName} onChange={e => setEditForm({...editForm, legalName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">RFC</label>
                <input required type="text" value={editForm.rfc} onChange={e => setEditForm({...editForm, rfc: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                <input required type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Servicio</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Proveedor</label>
                <select required value={editForm.providerType} onChange={e => setEditForm({...editForm, providerType: e.target.value as any})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-medium">
                  <option value="Curriculum Académico">Curriculum Académico</option>
                  <option value="Servicios Extras">Servicios Extras</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
                <select required value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white">
                  <option value="">Selecciona...</option>
                  <option value="Categoría Académica">Categoría Académica</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Materiales">Materiales Didácticos</option>
                  <option value="Educación">Educación</option>
                  <option value="Tecnología">Tecnología y Software</option>
                  <option value="Instalaciones">Mantenimiento de Instalaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                {editForm.category === "Categoría Académica" ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría Académica</label>
                    <select
                      value={academicSubcats.includes(editForm.subcategory) ? editForm.subcategory : (editForm.subcategory ? "Otro" : "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Otro") {
                          setEditForm({ ...editForm, subcategory: "" });
                        } else {
                          setEditForm({ ...editForm, subcategory: val });
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
                    
                    {(!academicSubcats.includes(editForm.subcategory) || editForm.subcategory === "") && (
                      <input
                        type="text"
                        value={editForm.subcategory}
                        onChange={e => setEditForm({ ...editForm, subcategory: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Especificar otra subcategoría académica..."
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría</label>
                    <input type="text" value={editForm.subcategory} onChange={e => setEditForm({...editForm, subcategory: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
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
                <input required type="text" value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Colonia</label>
                <input required type="text" value={editForm.neighborhood} onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ciudad</label>
                <input required type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                <input required type="text" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código Postal (CP)</label>
                <input required type="text" value={editForm.zipCode} onChange={e => setEditForm({...editForm, zipCode: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">País</label>
                <select
                  required
                  value={editForm.country}
                  onChange={e => setEditForm({...editForm, country: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="México">México</option>
                  <option value="Estados Unidos de America">Estados Unidos de America</option>
                  <option value="Canadá">Canadá</option>
                  <option value="España">España</option>
                  <option value="Reino Unido">Reino Unido</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado (Status)</label>
                <select required value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white">
                  <option value="Activo">Activo</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
             <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors">Cancelar</button>
             <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all uppercase tracking-wider shadow-sm">Guardar Cambios</button>
           </div>
        </form>
      </Modal>

      {/* Country Pricing Modal */}
      <Modal isOpen={isCountryModalOpen} onClose={() => setIsCountryModalOpen(false)} title="Configurar Precios y Costos por Tarifa">
        <form onSubmit={handleCountrySubmit} className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            Ingresa los costos y precios para la tarifa seleccionada. Si ya existe un registro para esta tarifa, se reemplazará con los nuevos valores.
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tarifa (País) <span className="text-rose-500">*</span></label>
            <select 
              required 
              value={countryForm.country} 
              onChange={e => setCountryForm({...countryForm, country: e.target.value})} 
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 cursor-pointer" 
            >
              <option value="">Seleccionar Tarifa...</option>
              {catalogs['Tarifas Países']?.map(tp => (
                <option key={tp.id} value={tp.name}>{tp.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <h5 className="text-[11px] font-extrabold text-[#1e293b] uppercase tracking-widest border-b border-slate-150 pb-1">Precios de Venta (Ingresos)</h5>
            {['clase', 'clases'].includes(selectedProductTypeForCountry?.toLowerCase() || '') ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Crédito Completo ($)</label>
                  <input required type="text" placeholder="Ej. 500" value={countryForm.priceFullCredit} onChange={e => setCountryForm({...countryForm, priceFullCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Medio Crédito ($)</label>
                  <input required type="text" placeholder="Ej. 250" value={countryForm.priceHalfCredit} onChange={e => setCountryForm({...countryForm, priceHalfCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Crédito AP ($)</label>
                  <input required type="text" placeholder="Ej. 600" value={countryForm.priceFullApCredit} onChange={e => setCountryForm({...countryForm, priceFullApCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Medio Crédito AP ($)</label>
                  <input required type="text" placeholder="Ej. 300" value={countryForm.priceHalfApCredit} onChange={e => setCountryForm({...countryForm, priceHalfApCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio de Venta Único ($) <span className="text-rose-500">*</span></label>
                <input required type="text" placeholder="Ej. 850" value={countryForm.priceFullCredit} onChange={e => setCountryForm({...countryForm, priceFullCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h5 className="text-[11px] font-extrabold text-[#111111] uppercase tracking-widest border-b border-slate-150 pb-1">Costos de Adquisición (Cuentas por Pagar)</h5>
            {['clase', 'clases'].includes(selectedProductTypeForCountry?.toLowerCase() || '') ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Crédito Completo ($)</label>
                  <input required type="text" placeholder="Ej. 300" value={countryForm.costFullCredit} onChange={e => setCountryForm({...countryForm, costFullCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Medio Crédito ($)</label>
                  <input required type="text" placeholder="Ej. 150" value={countryForm.costHalfCredit} onChange={e => setCountryForm({...countryForm, costHalfCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Crédito AP ($)</label>
                  <input required type="text" placeholder="Ej. 350" value={countryForm.costFullApCredit} onChange={e => setCountryForm({...countryForm, costFullApCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Medio Crédito AP ($)</label>
                  <input required type="text" placeholder="Ej. 175" value={countryForm.costHalfApCredit} onChange={e => setCountryForm({...countryForm, costHalfApCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo de Adquisición Único ($) <span className="text-rose-500">*</span></label>
                <input required type="text" placeholder="Ej. 400" value={countryForm.costFullCredit} onChange={e => setCountryForm({...countryForm, costFullCredit: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-indigo-700">Guardar Cambios</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
