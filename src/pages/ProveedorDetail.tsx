import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building, MapPin, Phone, Mail, Network, Landmark, Receipt, Plus, Users, BookOpen, Trash2 } from "lucide-react";
import { useAppContext, ProviderProductService } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { FinancialTransactionForm } from "../components/FinancialTransactionForm";

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
  const catalogProductTypes = (catalogs['Tipo de Producto'] || []).map(item => item.name);
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
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-xl flex flex-col overflow-hidden max-h-full">
        
        {/* Header content */}
        <div className="px-8 pt-8 pb-4 relative">
          <div className="absolute top-6 right-6 flex items-center space-x-3">
            <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button onClick={() => navigate('/proveedores')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-[#e47352] rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-[#e47352]/20">
              {providerInitials}
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#3f2a24] font-bold tracking-tight">{provider.commercialName || (provider as any).name}</h1>
              <p className="text-sm text-slate-500 italic mt-0.5">{provider.legalName || (provider as any).name}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 mt-10 border-b border-slate-200">
            {mainTabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`py-3 text-sm font-bold transition-all relative ${
                  activeTab === tab.name 
                    ? 'text-[#e47352]' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="flex items-center">
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </div>
                {activeTab === tab.name && (
                  <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#e47352]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 py-6 bg-white min-h-[400px]">
          
          {activeTab === "Información General" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Información Registrada</h3>
                 <button onClick={() => setIsEditModalOpen(true)} className="flex items-center text-[#e47352] bg-[#e47352]/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e47352]/20 transition-colors">
                   <svg width="14" height="14" className="mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                   Editar
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Razón Social</h4>
                    <p className="text-sm text-slate-800 font-medium">{provider.legalName}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">RFC</h4>
                    <p className="text-sm text-slate-800 font-medium font-mono">{provider.rfc || "No especificado"}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contacto Principal</h4>
                    <p className="text-sm text-slate-800 font-medium mb-1"><Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> {provider.phone}</p>
                    <p className="text-sm text-slate-800 font-medium"><Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> {provider.email}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría</h4>
                    <p className="text-sm text-slate-800 font-medium">{provider.category} {provider.subcategory && <span className="text-slate-500 font-normal">({provider.subcategory})</span>}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Proveedor</h4>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border ${
                      provider.providerType === "Servicios Extras"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}>
                      {provider.providerType || "Curriculum Académico"}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dirección</h4>
                    <p className="text-sm text-slate-800 font-medium">{provider.street}</p>
                    <p className="text-sm text-slate-800 font-medium">{provider.neighborhood}</p>
                    <p className="text-sm text-slate-800 font-medium">{provider.city}, {provider.state} {provider.zipCode}</p>
                    <p className="text-sm text-slate-500 mt-1">{provider.country}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado</h4>
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase mt-1 ${
                      provider.status === 'Al corriente' || provider.status === 'Activo' ? 'bg-emerald-50 text-emerald-600' : 
                      provider.status === 'Pendiente' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {provider.status || "Activo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Contactos" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contactos Registrados</h3>
                <button onClick={() => setIsContactModalOpen(true)} className="flex items-center text-[#e47352] bg-[#e47352]/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e47352]/20 transition-colors">
                  <Plus className="w-4 h-4 mr-1.5" /> Añadir Contacto
                </button>
              </div>
              
              {provContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {provContacts.map(contact => (
                    <div key={contact.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-start space-x-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                          {contact.name[0]}{contact.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{contact.name} {contact.lastName}</p>
                          <p className="text-sm text-[#e47352] font-medium mb-3">{contact.position} {contact.area && <span className="text-slate-400 font-normal"> • {contact.area}</span>}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center text-sm text-slate-600">
                              <Mail className="w-4 h-4 mr-2 text-slate-400" />
                              <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 hover:underline">{contact.email}</a>
                            </div>
                            <div className="flex items-center text-sm text-slate-600">
                              <Phone className="w-4 h-4 mr-2 text-slate-400" />
                              <a href={`tel:${contact.phone}`} className="hover:text-indigo-600 hover:underline">{contact.phone}</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <Network className="w-12 h-12 text-slate-300 mb-4 stroke-1" />
                  <p className="text-slate-500 font-medium">No hay contactos registrados</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Cuentas Bancarias" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cuentas Bancarias Registradas</h3>
                <button onClick={() => setIsBankModalOpen(true)} className="flex items-center text-[#e47352] bg-[#e47352]/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e47352]/20 transition-colors">
                  <Plus className="w-4 h-4 mr-1.5" /> Añadir Cuenta
                </button>
              </div>
              
              {provBankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {provBankAccounts.map(account => (
                    <div key={account.id} className="border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row justify-between sm:items-center hover:border-slate-300 transition-colors bg-white group">
                      <div className="flex items-center space-x-5 mb-4 sm:mb-0">
                        <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#e47352]/5 group-hover:text-[#e47352] transition-colors">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{account.bankName}</p>
                          <p className="text-sm text-slate-500">Beneficiario: <span className="font-medium text-slate-700">{account.accountName}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Número de Cuenta</p>
                          <p className="font-mono text-slate-800 font-medium">{account.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">CLABE / IBAN</p>
                          <p className="font-mono text-slate-800 font-medium">{account.clabe}</p>
                        </div>
                        {account.reference && (
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Referencia</p>
                            <p className="text-slate-800 font-medium">{account.reference}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <Landmark className="w-12 h-12 text-slate-300 mb-4 stroke-1" />
                  <p className="text-slate-500 font-medium">No hay cuentas bancarias registradas</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Pagos" && (
            <div className="animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Pagos</h3>
                <button onClick={() => openPaymentModal()} className="flex items-center text-[#e47352] bg-[#e47352]/10 px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#e47352]/20 transition-colors">
                  <Plus className="w-4 h-4 mr-1.5" /> Nuevo Pago
                </button>
              </div>
            
              {provPayments.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Concepto</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Monto</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {provPayments.map((payment) => (
                        <tr key={payment.id} onClick={() => openPaymentModal(payment)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4 font-medium text-slate-700">{payment.date}</td>
                          <td className="px-6 py-4 text-slate-800 font-medium">
                            {payment.description || "Pago general"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${payment.status === 'Aplicado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {payment.status || 'Aplicado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 text-base">
                            ${payment.amount.toLocaleString()} {payment.currency}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Está seguro de que desea eliminar permanentemente este pago a proveedor por un monto de $${payment.amount.toLocaleString()} ${payment.currency}? Esta acción no se puede deshacer.`)) {
                                  deleteFinancialTransaction(payment.id);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors inline-flex items-center"
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
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mb-4 stroke-1" />
                  <p className="text-slate-500 font-medium">No hay pagos registrados para este proveedor</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Alumnos Inscritos" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Estudiantes Vinculados</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Listado de alumnos inscritos en las clases o servicios provistos por este colaborador</p>
                </div>
              </div>

              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Alumnos</p>
                    <p className="text-xl font-bold font-mono text-slate-800">{enrolledStudents.length}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <span className="text-[10px] font-black">ACT</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Activos / Cursando</p>
                    <p className="text-xl font-bold font-mono text-emerald-700">{activeEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <span className="text-[10px] font-black">COMP</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Completados</p>
                    <p className="text-xl font-bold font-mono text-blue-700">{completedEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
                  <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <span className="text-[10px] font-black">HOLD</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#925f1a] tracking-wider">On hold</p>
                    <p className="text-xl font-bold font-mono text-amber-750">{onHoldEnrollmentsCount}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
                  <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                    <span className="text-[10px] font-black">WITH</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#8d2a2a] tracking-wider">Withdrawn</p>
                    <p className="text-xl font-bold font-mono text-rose-700">{withdrawnEnrollmentsCount}</p>
                  </div>
                </div>
              </div>

              {providerEnrollments.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Alumno</th>
                        <th className="px-6 py-4">Clase / Programa</th>
                        <th className="px-6 py-4 text-center">Estatus</th>
                        <th className="px-6 py-4">Línea de Tiempo</th>
                        <th className="px-6 py-4 text-center">Créditos</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
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
                          statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                        }

                        const studentInitials = `${student.name[0] || 'A'}${student.lastName ? student.lastName[0] : ''}`.toUpperCase();

                        return (
                          <tr 
                            key={env.id} 
                            onClick={() => navigate(`/alumnos/${student.id}`)}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                                  {studentInitials}
                                </div>
                                <div className="leading-tight">
                                  <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors font-sans">
                                    {student.name} {student.lastName}
                                  </p>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    {student.studentCustomId && (
                                      <span className="text-[9px] font-mono text-[#e47352] bg-orange-50 px-1 py-0.2 rounded border border-orange-100 font-semibold leading-none uppercase">
                                        {student.studentCustomId}
                                      </span>
                                    )}
                                    {inst && (
                                      <span className="text-[10px] text-slate-500 font-medium">
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
                                  <p className="font-semibold text-slate-850 text-xs leading-none mb-1">{cItem.name}</p>
                                  {cItem.code && (
                                    <span className="text-[9.5px] text-slate-500 font-mono tracking-wider">{cItem.code}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs font-sans">Clase desvinculada (ID: {env.classId})</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColor}`}>
                                {statusVal}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-0.5 text-[11px] font-mono text-slate-500">
                                {env.enrollmentDate && (
                                  <p>
                                    <span className="font-sans text-slate-400 font-semibold uppercase text-[9px]">Inscrito:</span> {env.enrollmentDate}
                                  </p>
                                )}
                                <p>
                                  <span className="font-sans text-slate-400 font-semibold uppercase text-[9px]">Clases:</span> {env.startDate || env.activationDate || '-'} al {env.endDate || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-150 shadow-sm leading-none whitespace-nowrap">
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
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <Users className="w-12 h-12 text-slate-300 mb-4 stroke-1" />
                  <p className="text-slate-500 font-medium font-sans">No hay alumnos inscritos en los servicios de este proveedor</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">Si creas clases asignadas a este proveedor e inscribes alumnos en su respectiva ficha o agenda, aparecerán aquí de forma automática.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Productos" && (
            <div className="animate-in fade-in duration-300 space-y-8">
              
              {/* 1. Tarifario Base por Tipo de Producto */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 rounded-3xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">1. Tarifario Estándar por Tipo de Producto</h3>
                  <p className="text-xs text-slate-500 mt-1">Configura los precios de venta (ingresos) y costos de adquisición (egresos) de este proveedor por tarifa para cada tipo general de producto.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(catalogProductTypes.length > 0 ? catalogProductTypes : ["Clase", "Plataforma", "Examen", "Certificación"]).map((type) => {
                    const typeConfig = providerProductServices.find(
                      ps => ps.providerId === provider.id && ps.productType === type
                    );
                    const hasRates = typeConfig && typeConfig.countryPrices && typeConfig.countryPrices.length > 0;

                    return (
                      <div key={type} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              (type === 'Clase' || type === 'Syllabus Académico') && "bg-blue-50 text-blue-700 border border-blue-200",
                              (type === 'Plataforma' || type === 'Curso de Idiomas') && "bg-purple-50 text-purple-700 border border-purple-200",
                              (type === 'Examen' || type === 'Certificación AP') && "bg-orange-50 text-orange-700 border border-orange-200",
                              !['Clase', 'Plataforma', 'Examen', 'Syllabus Académico', 'Curso de Idiomas', 'Certificación AP'].includes(type) && "bg-teal-50 text-teal-705 text-teal-700 border border-teal-200",
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
                              className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 px-2.5 py-1.5 rounded-lg transition"
                            >
                              {hasRates ? "Configurar Tarifas" : "+ Añadir Tarifa"}
                            </button>
                          </div>

                          {/* List of Country rates for this type */}
                          <div className="mt-4 space-y-2">
                            {hasRates ? (
                              <div className="space-y-2 overflow-y-auto max-h-36 pr-1 custom-scrollbar">
                                {typeConfig.countryPrices.map((cp, cpIdx) => (
                                  <div key={cpIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                      <span className="text-xs font-bold text-slate-800">{cp.country}</span>
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => {
                                            setCountryForm({ ...cp });
                                            setSelectedProductTypeForCountry(type);
                                            setIsCountryModalOpen(true);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-800 p-0.5 text-[10px]"
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
                                          className="text-rose-500 hover:text-rose-700 p-0.5 text-[10px]"
                                          title="Eliminar tarifa"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-600">
                                      {['clase', 'clases'].includes(type.toLowerCase()) ? (
                                        <>
                                          <div>
                                            <span className="font-medium text-slate-400">Ventas (Completo/Medio/AP):</span>
                                            <div className="font-mono text-slate-700">
                                              ${cp.priceFullCredit || "0"} / ${cp.priceHalfCredit || "0"} / AP: ${cp.priceFullApCredit || "0"}
                                            </div>
                                          </div>
                                          <div>
                                            <span className="font-medium text-slate-400">Costos (Completo/Medio/AP):</span>
                                            <div className="font-mono text-slate-700 text-rose-600">
                                              ${cp.costFullCredit || "0"} / ${cp.costHalfCredit || "0"} / AP: ${cp.costFullApCredit || "0"}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            <span className="font-medium text-slate-400">Precio Venta:</span>
                                            <div className="font-mono font-bold text-slate-800 text-xs">
                                              ${cp.priceFullCredit || cp.priceFullApCredit || "0"}
                                            </div>
                                          </div>
                                          <div>
                                            <span className="font-medium text-slate-400">Costo Venta:</span>
                                            <div className="font-mono font-bold text-rose-600 text-xs">
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
                              <div className="text-[11px] text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
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
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3">Clave</th>
                          <th className="px-6 py-3">Nombre</th>
                          <th className="px-6 py-3">Tipo de Crédito</th>
                          <th className="px-6 py-3">Vigencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {providerClasses.map((cl) => (
                          <tr key={cl.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3 font-mono font-bold text-slate-900">{cl.code || 'SIN CLAVE'}</td>
                            <td className="px-6 py-3 font-semibold text-slate-800">{cl.name}</td>
                            <td className="px-6 py-3">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-700 font-bold whitespace-nowrap">
                                {cl.creditType || 'Crédito completo'}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-mono text-slate-500">{cl.validity || 'Sin vigencia'}</td>
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
                  <option value="Transporte">Transporte</option>
                  <option value="Materiales">Materiales Didácticos</option>
                  <option value="Educación">Educación</option>
                  <option value="Tecnología">Tecnología y Software</option>
                  <option value="Instalaciones">Mantenimiento de Instalaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subcategoría</label>
                <input type="text" value={editForm.subcategory} onChange={e => setEditForm({...editForm, subcategory: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
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
                <input required type="text" value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
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
