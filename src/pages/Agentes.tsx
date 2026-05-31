import React, { useMemo, useState } from "react";
import { 
  Users, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Plus, 
  Trash2, 
  Building2, 
  CreditCard, 
  Calendar, 
  Search, 
  Save, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  ArrowUpRight,
  Hand,
  Briefcase,
  DollarSign,
  Check,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext, User as AppUser, AgentBankAccount } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function Agentes() {
  const { 
    users, 
    addUser, 
    updateUser, 
    deleteUser, 
    institutions, 
    students, 
    financialTransactions,
    updateInstitution,
    catalogs
  } = useAppContext();

  // Selected agent state
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(() => {
    return users.length > 0 ? users[0].id : null;
  });

  const [agentToDelete, setAgentToDelete] = useState<{ id: number; name: string } | null>(null);

  // Current sub-tab details
  const [activeTab, setActiveTab] = useState<'perfil' | 'banco' | 'instituciones' | 'pagos'>('perfil');
  const [paymentSubTab, setPaymentSubTab] = useState<'recibidos' | 'por_recibir'>('recibidos');

  // Commission modal and form states
  const [editingCommissionInstId, setEditingCommissionInstId] = useState<number | null>(null);
  const [membershipCommType, setMembershipCommType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [membershipCommValue, setMembershipCommValue] = useState<number | ''>('');
  const [membershipCommCurrency, setMembershipCommCurrency] = useState<string>('USD');
  const [courseCommType, setCourseCommType] = useState<'percentage' | 'fixed' | 'per_course' | 'none'>('none');
  const [courseCommValue, setCourseCommValue] = useState<number | ''>('');
  const [courseCommCurrency, setCourseCommCurrency] = useState<string>('USD');

  // Search filter for agents list
  const [agentSearch, setAgentSearch] = useState('');

  // Add agent modal / inline form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    email: '',
    role: 'Agente',
    phone: '',
    rfc: '',
    address: ''
  });

  // Edit personal info state for active agent
  const selectedAgent = useMemo(() => {
    return users.find(u => u.id === selectedAgentId) || null;
  }, [users, selectedAgentId]);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    rfc: '',
    address: ''
  });

  // Sync edit form when active agent changes
  React.useEffect(() => {
    if (selectedAgent) {
      setEditForm({
        name: selectedAgent.name || '',
        email: selectedAgent.email || '',
        role: selectedAgent.role || 'Agente',
        phone: selectedAgent.phone || '',
        rfc: selectedAgent.rfc || '',
        address: selectedAgent.address || ''
      });
    }
  }, [selectedAgent]);

  // Bank account attachment form state
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: '',
    clabe: '',
    accountNo: '',
    currency: 'MXN'
  });

  // Add agent submit handler
  const handleAddAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentData.name || !newAgentData.email) return;
    
    // Call Context action
    addUser({
      name: newAgentData.name,
      email: newAgentData.email,
      role: newAgentData.role,
      phone: newAgentData.phone,
      rfc: newAgentData.rfc,
      address: newAgentData.address,
      bankAccounts: [],
      institutionIds: []
    });

    setNewAgentData({
      name: '',
      email: '',
      role: 'Agente',
      phone: '',
      rfc: '',
      address: ''
    });
    setShowAddModal(false);
  };

  // Save changes to personal information
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    
    updateUser(selectedAgent.id, {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      phone: editForm.phone,
      rfc: editForm.rfc,
      address: editForm.address
    });
    
    alert("Perfil guardado con éxito.");
  };

  // Set agent for deletion and show confirmation dialog
  const handleDeleteAgent = (id: number, name: string) => {
    setAgentToDelete({ id, name });
  };

  // Perform actual agent deletion
  const performDeleteAgent = () => {
    if (!agentToDelete) return;
    const { id } = agentToDelete;

    // Clean up agent association from institutions first
    institutions.forEach(inst => {
      if (inst.agentId === id) {
        updateInstitution(inst.id, { agentId: undefined });
      }
    });

    // Call context to delete user
    deleteUser(id);
    
    // Select another agent block
    const remaining = users.filter(u => u.id !== id);
    if (remaining.length > 0) {
      setSelectedAgentId(remaining[0].id);
    } else {
      setSelectedAgentId(null);
    }

    setAgentToDelete(null);
  };

  // Bank account actions
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    if (!newBank.bankName || !newBank.accountNo) return;

    const updatedBankAccounts = selectedAgent.bankAccounts ? [...selectedAgent.bankAccounts] : [];
    const newAcc: AgentBankAccount = {
      id: "acc_" + Date.now(),
      bankName: newBank.bankName,
      clabe: newBank.clabe,
      accountNo: newBank.accountNo,
      currency: newBank.currency
    };
    updatedBankAccounts.push(newAcc);

    updateUser(selectedAgent.id, { bankAccounts: updatedBankAccounts });
    setNewBank({ bankName: '', clabe: '', accountNo: '', currency: 'MXN' });
    setShowAddBank(false);
  };

  const handleDeleteBankAccount = (id: string) => {
    if (!selectedAgent || !selectedAgent.bankAccounts) return;
    if (confirm("¿Estás seguro de eliminar esta cuenta bancaria?")) {
      const updated = selectedAgent.bankAccounts.filter(acc => acc.id !== id);
      updateUser(selectedAgent.id, { bankAccounts: updated });
    }
  };

  // Institution assignments
  const handleToggleInstitution = (instId: number) => {
    if (!selectedAgent) return;
    const currentList = selectedAgent.institutionIds || [];
    if (currentList.includes(instId)) {
      updateInstitution(instId, { agentId: undefined });
    } else {
      updateInstitution(instId, { agentId: selectedAgent.id });
    }
  };

  const handleSaveCommission = () => {
    if (editingCommissionInstId === null) return;
    updateInstitution(editingCommissionInstId, {
      membershipCommissionType: membershipCommType,
      membershipCommissionValue: membershipCommValue === '' ? undefined : Number(membershipCommValue),
      membershipCommissionCurrency: membershipCommCurrency,
      courseCommissionType: courseCommType,
      courseCommissionValue: courseCommValue === '' ? undefined : Number(courseCommValue),
      courseCommissionCurrency: courseCommCurrency
    });
    setEditingCommissionInstId(null);
  };

  // Currency options parser
  const currencyOptions = useMemo(() => {
    const list = catalogs['Monedas'] || [];
    if (list.length === 0) {
      return ['USD', 'MXN', 'EUR', 'CAD', 'GBP'];
    }
    return list.map(item => {
      const parts = item.name.trim().split(' ');
      return parts[0] || item.name;
    });
  }, [catalogs]);

  // Filter systems
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(agentSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(agentSearch.toLowerCase()) ||
                          u.role.toLowerCase().includes(agentSearch.toLowerCase());
      return matchSearch;
    });
  }, [users, agentSearch]);

  // Dynamic calculations for the selected agent
  const agentFinancials = useMemo(() => {
    if (!selectedAgent) return { receivedPayments: [], pendingPayments: [], receivedSum: 0, pendingSum: 0 };
    
    // We list all the transactions representing Student Payments associated with this agent
    const agentTxs = financialTransactions.filter(tx => tx.agentId === selectedAgent.id && tx.type === 'income');
    
    const receivedPayments = agentTxs.filter(tx => tx.status === 'Aplicado');
    const pendingPayments = agentTxs.filter(tx => tx.status === 'Pendiente');
    
    const receivedSum = receivedPayments.reduce((acc, tx) => acc + tx.amountMXN, 0);
    const pendingSum = pendingPayments.reduce((acc, tx) => acc + tx.amountMXN, 0);

    return {
      receivedPayments,
      pendingPayments,
      receivedSum,
      pendingSum
    };
  }, [financialTransactions, selectedAgent]);

  // Dynamically detected institutions logic
  const detectedInstitutions = useMemo(() => {
    if (!selectedAgent) return [];
    
    // Find students whose transactions have this agent associated
    const agentTxs = financialTransactions.filter(tx => tx.agentId === selectedAgent.id && tx.studentId);
    const studentIds = Array.from(new Set(agentTxs.map(tx => tx.studentId)));
    
    // Map to institutions
    const instIds = new Set<number>();
    studentIds.forEach(stId => {
      const student = students.find(s => s.id === stId);
      if (student) {
        instIds.add(student.institutionId);
      }
    });

    return Array.from(instIds).map(id => {
      const instObj = institutions.find(i => i.id === id);
      return {
        id,
        name: instObj?.name || `Institución #${id}`,
        country: instObj?.country || "Desconocido",
        status: instObj?.status || 'Al corriente'
      };
    });
  }, [selectedAgent, financialTransactions, students, institutions]);

  // Explicitly linked institutions logic (the linkage is managed in the Institutions section)
  const linkedInstitutions = useMemo(() => {
    if (!selectedAgent) return [];
    return institutions.filter(inst => 
      inst.agentId === selectedAgent.id
    );
  }, [selectedAgent, institutions]);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-slate-50/50 p-6 md:p-8 overflow-hidden gap-6 font-sans">
      
      {/* 1. AGENTS DIRECTORY PANEL (LEFT) */}
      <div className="w-full md:w-80 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col shrink-0 min-h-0">
        
        {/* Header with Title and Add Button */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Directorio
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agentes y Gestores</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20"
            title="Registrar Nuevo Agente"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Directory List Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {filteredUsers.map((user) => {
            const isSelected = selectedAgentId === user.id;
            return (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedAgentId(user.id);
                  setActiveTab('perfil');
                }}
                className={`w-full flex items-center p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-indigo-500/10 border-indigo-200 text-indigo-950 font-black shadow-sm"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                }`}
              >
                {/* Initials Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black font-mono transition-colors ${
                  isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                
                {/* Bio brief */}
                <div className="ml-3 overflow-hidden">
                  <p className={`text-xs font-bold truncate leading-tight ${isSelected ? "text-indigo-950" : "text-slate-800"}`}>
                    {user.name}
                  </p>
                  <span className={`text-[9px] font-black tracking-widest uppercase mt-0.5 block ${
                    isSelected ? "text-indigo-500" : "text-slate-400"
                  }`}>
                    {user.role}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Sin colaboradores fundados</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN DETAIL CARD (RIGHT) */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col min-h-0 overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Header Profiler */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-base font-black font-mono shadow-md">
                  {selectedAgent.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">{selectedAgent.name}</h1>
                    <button
                      onClick={() => handleDeleteAgent(selectedAgent.id, selectedAgent.name)}
                      className="p-1 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar este Agente completo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2.5 mt-1">
                    <span className="px-2 py-0.5 bg-indigo-100/60 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-indigo-200/20">
                      ID #{selectedAgent.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">|</span>
                    <span className="text-xs font-semibold text-slate-500">{selectedAgent.role}</span>
                  </div>
                </div>
              </div>

              {/* Header Right Metric (Dynamic Balance) */}
              <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none mb-1">Monto de Venta Cobrado</p>
                  <p className="text-sm font-black text-emerald-950 leading-none">${agentFinancials.receivedSum.toLocaleString()} MXN</p>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR SECTION */}
            <div className="border-b border-slate-100 px-6 py-2 bg-white flex space-x-4 shrink-0 overflow-x-auto scrollbar-none">
              {(['perfil', 'banco', 'instituciones', 'pagos'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3.5 px-1.5 border-b-2 text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "border-indigo-600 text-slate-900"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === 'perfil' && 'Información Personal'}
                  {tab === 'banco' && 'Cuentas de Banco'}
                  {tab === 'instituciones' && 'Instituciones'}
                  {tab === 'pagos' && 'Pagos'}
                </button>
              ))}
            </div>

            {/* DETAIL DISPLAY WORKSPACE (Scrollable content) */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/20">

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  
                  {/* TAB 1: INFORMACIÓN PERSONAL */}
                  {activeTab === 'perfil' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl bg-white p-6 border border-slate-200/60 rounded-2xl shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Rol en la empresa</label>
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                          >
                            <option value="Agente">Agente de Ventas</option>
                            <option value="Representante">Representante Institucional</option>
                            <option value="Finanzas">Administración Financiera</option>
                            <option value="Superadministrador">Superadministrador</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Teléfono Directo</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={editForm.phone}
                              placeholder="Ej: +52 55 5555 5555"
                              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Identificación Fiscal (RFC / CIF / Tax ID)</label>
                          <input
                            type="text"
                            value={editForm.rfc}
                            placeholder="Ej: VEMA830214H31"
                            onChange={(e) => setEditForm(prev => ({ ...prev, rfc: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Dirección de Oficina / Domicilio</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <textarea
                              rows={3}
                              value={editForm.address}
                              placeholder="Av. Paseo de la Reforma, CDMX, México"
                              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: CUENTAS DE BANCO */}
                  {activeTab === 'banco' && (
                    <div className="space-y-6">
                      
                      <div className="flex justify-between items-center bg-white p-4 border border-slate-200/60 rounded-2xl">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Cuentas Bancarias de Dispersión</h3>
                          <p className="text-[11px] text-slate-400">Datos bancarios oficiales para dispersar honorarios y comisiones.</p>
                        </div>
                        <button
                          onClick={() => setShowAddBank(prev => !prev)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {showAddBank ? 'Cancelar' : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar Cuenta</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Add account form drawer */}
                      {showAddBank && (
                        <motion.form 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          onSubmit={handleAddBankAccount} 
                          className="bg-white border border-[#eaeaea] p-5 rounded-2xl space-y-4 shadow-xs"
                        >
                          <p className="text-xs font-black text-indigo-950">Nueva Cuenta Bancaria</p>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Banco</label>
                              <input
                                type="text"
                                value={newBank.bankName}
                                onChange={(e) => setNewBank(prev => ({ ...prev, bankName: e.target.value }))}
                                placeholder="Ej: BBVA Bancomer"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Número de Cuenta</label>
                              <input
                                type="text"
                                value={newBank.accountNo}
                                onChange={(e) => setNewBank(prev => ({ ...prev, accountNo: e.target.value }))}
                                placeholder="0123456789"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CLABE (18 dígitos)</label>
                              <input
                                type="text"
                                value={newBank.clabe}
                                onChange={(e) => setNewBank(prev => ({ ...prev, clabe: e.target.value }))}
                                placeholder="012180012345678901"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Moneda</label>
                              <select
                                value={newBank.currency}
                                onChange={(e) => setNewBank(prev => ({ ...prev, currency: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                              >
                                <option value="MXN">Pesos (MXN)</option>
                                <option value="USD">Dólares (USD)</option>
                                <option value="EUR">Euros (EUR)</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-2">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all"
                            >
                              Guardar Cuenta
                            </button>
                          </div>
                        </motion.form>
                      )}

                      {/* Bank Accounts list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedAgent.bankAccounts && selectedAgent.bankAccounts.length > 0 ? (
                          selectedAgent.bankAccounts.map((acc) => (
                            <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs flex justify-between items-start">
                              <div className="space-y-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200/50">
                                  {acc.currency}
                                </span>
                                <p className="text-sm font-black text-slate-800 tracking-tight leading-none mt-1">{acc.bankName}</p>
                                <div className="space-y-1 text-xs text-slate-500">
                                  <p><span className="font-bold text-slate-400 text-[10px] uppercase">Cuenta:</span> {acc.accountNo}</p>
                                  {acc.clabe && (
                                    <p><span className="font-bold text-slate-400 text-[10px] uppercase">CLABE:</span> <span className="font-mono">{acc.clabe}</span></p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteBankAccount(acc.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                title="Eliminar cuenta bancaria"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-xs font-bold text-slate-900 mb-1">Sin cuentas bancarias</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">Agrega los datos de cobro de este agente para un flujo de comisiones transparente.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 3: LISTADO DE INSTITUCIONES */}
                  {activeTab === 'instituciones' && (
                    <div className="space-y-6">
                      
                      {/* Subtitle explanation */}
                      <div className="bg-white p-5 border border-slate-250/50 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Instituciones Vinculadas</h3>
                        <p className="text-[11px] text-slate-400">Muestra las instituciones de correspondencia asignadas a este agente. La vinculación se gestiona desde la sección de Instituciones.</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Cartera de Instituciones Vinculadas */}
                        <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col min-h-[300px]">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Cartera de Instituciones Vinculadas ({linkedInstitutions.length})</h4>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                            {linkedInstitutions.map((i) => {
                              // Determine commission summary text for membership and courses
                              const hasMemb = i.membershipCommissionType && i.membershipCommissionType !== 'none';
                              const hasCourse = i.courseCommissionType && i.courseCommissionType !== 'none';

                              let membText = 'Membresía: Sin comisión';
                              if (hasMemb) {
                                if (i.membershipCommissionType === 'percentage') {
                                  membText = `Membresía: ${i.membershipCommissionValue}%`;
                                } else {
                                  membText = `Membresía: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: i.membershipCommissionCurrency || 'USD', maximumFractionDigits: 2 }).format(i.membershipCommissionValue || 0)} ${i.membershipCommissionCurrency || 'USD'}`;
                                }
                              }

                              let courseText = 'Cursos: Sin comisión';
                              if (hasCourse) {
                                if (i.courseCommissionType === 'percentage') {
                                  courseText = `Cursos: ${i.courseCommissionValue}%`;
                                } else if (i.courseCommissionType === 'per_course') {
                                  courseText = `Cursos: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: i.courseCommissionCurrency || 'USD', maximumFractionDigits: 2 }).format(i.courseCommissionValue || 0)} ${i.courseCommissionCurrency || 'USD'} p/curso`;
                                } else {
                                  courseText = `Cursos: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: i.courseCommissionCurrency || 'USD', maximumFractionDigits: 2 }).format(i.courseCommissionValue || 0)} ${i.courseCommissionCurrency || 'USD'}`;
                                }
                              }

                              return (
                                <div key={i.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-100/50 rounded-xl transition-all">
                                  <div className="flex items-start space-x-2.5">
                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-800 leading-tight">{i.name}</h5>
                                      <p className="text-[9px] text-slate-400">{i.country}</p>
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${hasMemb ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                          {membText}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${hasCourse ? 'bg-amber-50 text-amber-705 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                          {courseText}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setEditingCommissionInstId(i.id);
                                      setMembershipCommType(i.membershipCommissionType || 'none');
                                      setMembershipCommValue(i.membershipCommissionValue ?? '');
                                      setMembershipCommCurrency(i.membershipCommissionCurrency || 'USD');
                                      setCourseCommType(i.courseCommissionType || 'none');
                                      setCourseCommValue(i.courseCommissionValue ?? '');
                                      setCourseCommCurrency(i.courseCommissionCurrency || 'USD');
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-305 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md transition-all flex items-center justify-center gap-1 shrink-0 self-end sm:self-center cursor-pointer"
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    Definir Comisión
                                  </button>
                                </div>
                              );
                            })}

                            {linkedInstitutions.length === 0 && (
                              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl">
                                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-500 mb-1">Sin instituciones vinculadas</p>
                                <p className="text-[10px] text-slate-400">Este agente no tiene asignaciones asignadas directamente. Para vincular instituciones, navega a la sección de <strong className="text-indigo-600">Instituciones</strong>.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Direct & Dynamic Summary */}
                        <div className="space-y-4">
                          
                          {/* Dynamic Detection */}
                          <div className="bg-white p-5 border border-slate-250/50 rounded-2xl shadow-xs">
                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Vínculos Dinámicos de Transacción
                            </h4>
                            <p className="text-[11px] text-slate-400 mb-3">Detectados de forma automática según la participación del agente en inscripciones o cobranzas activas.</p>
                            
                            <div className="space-y-2">
                              {detectedInstitutions.map((inst) => (
                                <div key={inst.id} className="flex items-center justify-between bg-violet-50/50 border border-violet-100/30 px-3 py-2.5 rounded-xl text-xs">
                                  <div className="flex items-center space-x-2 text-violet-950 font-bold">
                                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                                    <span>{inst.name}</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-violet-500 bg-violet-100/50 px-1.5 py-0.5 rounded">Activa</span>
                                </div>
                              ))}
                              {detectedInstitutions.length === 0 && (
                                <p className="text-xs text-slate-400 italic font-medium">No se han detectado vínculos dinámicos en cobros históricos.</p>
                              )}
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* TAB 4: PAGOS (DIVIDED INTO RECIBIDOS & POR RECIBIR) */}
                  {activeTab === 'pagos' && (
                    <div className="space-y-5">
                      
                      {/* High level visual cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPaymentSubTab('recibidos')}
                          className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            paymentSubTab === 'recibidos'
                              ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-1.5">
                              <CheckCircle2 className={`w-4 h-4 ${paymentSubTab === 'recibidos' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Pagos Recibidos (Aplicados)</span>
                            </div>
                            <p className="text-xl font-black">${agentFinancials.receivedSum.toLocaleString()} MXN</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => setPaymentSubTab('por_recibir')}
                          className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            paymentSubTab === 'por_recibir'
                              ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-1.5">
                              <Clock className={`w-4 h-4 ${paymentSubTab === 'por_recibir' ? 'text-amber-400' : 'text-amber-500'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Pagos Por Recibir (Pendientes)</span>
                            </div>
                            <p className="text-xl font-black">${agentFinancials.pendingSum.toLocaleString()} MXN</p>
                          </div>
                        </button>
                      </div>

                      {/* Transaction table */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            {paymentSubTab === 'recibidos' ? 'Cobros históricos procesados' : 'Cuentas por cobrar asignadas'}
                          </h3>
                        </div>

                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/30 border-b border-slate-100">
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider w-24">Fecha</th>
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Concepto</th>
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Estudiante</th>
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Vía / Método</th>
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Importe original</th>
                                <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Importe MXN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                              {(paymentSubTab === 'recibidos' ? agentFinancials.receivedPayments : agentFinancials.pendingPayments).map((tx) => {
                                const stObj = students.find(s => s.id === tx.studentId);
                                return (
                                  <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-slate-400 font-normal">{tx.date}</td>
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center space-x-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'Aplicado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <p className="font-bold text-slate-900">{tx.description}</p>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      {stObj ? `${stObj.name} ${stObj.lastName || ''}` : <span className="text-slate-400 italic">Global</span>}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500">{tx.paymentMethod || 'Transferencia'}</td>
                                    <td className="px-5 py-3.5 text-right font-mono text-slate-500 font-bold">
                                      {tx.amount.toLocaleString()} {tx.currency}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">
                                      ${tx.amountMXN.toLocaleString()} MXN
                                    </td>
                                  </tr>
                                );
                              })}

                              {(paymentSubTab === 'recibidos' ? agentFinancials.receivedPayments : agentFinancials.pendingPayments).length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                                    No hay registros de cobro {paymentSubTab === 'recibidos' ? 'aplicados' : 'pendientes'} para este gestor.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Users className="w-12 h-12 text-slate-300 animate-bounce mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">Selecciona un Gestor del directorio</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">Utiliza el listado izquierdo para auditar la información personal, cuentas bancarias de cobro, asignaciones institucionales y control de ingresos de cada gestor.</p>
          </div>
        )}
      </div>

      {/* 3. ADD AGENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-slate-100"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-slate-900 tracking-tight">Agregar Nuevo Colaborador</h3>
                <p className="text-xs text-slate-400">Registra un nuevo agente o vendedor en el sistema de comisiones.</p>
              </div>

              <form onSubmit={handleAddAgentSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={newAgentData.name}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ej: David García"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newAgentData.email}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="email@ihs.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Rol Operativo</label>
                  <select
                    value={newAgentData.role}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer appearance-none"
                  >
                    <option value="Agente">Agente de Ventas</option>
                    <option value="Representante">Representante Institucional</option>
                    <option value="Finanzas">Administración Financiera</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={newAgentData.phone}
                      onChange={(e) => setNewAgentData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="+52..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Tax ID / RFC</label>
                    <input
                      type="text"
                      value={newAgentData.rfc}
                      onChange={(e) => setNewAgentData(prev => ({ ...prev, rfc: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="XAXX010101000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Dirección</label>
                  <input
                    type="text"
                    value={newAgentData.address}
                    onChange={(e) => setNewAgentData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Domicilio general"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                  >
                    Agregar Agente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIGURACIÓN COMISIONES */}
      <Modal 
        isOpen={editingCommissionInstId !== null} 
        onClose={() => setEditingCommissionInstId(null)} 
        title="Definir Comisión del Agente"
      >
        <div className="space-y-4 p-1">
          {editingCommissionInstId !== null && (() => {
            const inst = institutions.find(i => i.id === editingCommissionInstId);
            return (
              <>
                <div className="pb-3 border-b border-slate-100 font-sans">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institución Seleccionada</h4>
                  <p className="text-sm font-bold text-slate-800">{inst?.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{inst?.country}</p>
                </div>

                <div className="space-y-5 font-sans">
                  
                  {/* REGLA DE NEGOCIO NOTIFICATION */}
                  <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex items-start gap-2.5">
                    <span className="text-sm shrink-0">💡</span>
                    <div className="text-[10px] text-indigo-950 font-medium leading-relaxed">
                      <p className="font-bold uppercase tracking-wider text-[9px] text-indigo-700 mb-0.5">Regla de Pago de Comisiones</p>
                      Las comisiones correspondientes se generan y procesan **únicamente cuando el pago asociado (membresía o curso) ha sido liquidado en su totalidad**.
                    </div>
                  </div>

                  {/* SECCIÓN 1: COMISIÓN MEMBRESÍA */}
                  <div className="bg-slate-50/50 p-4 border border-slate-200/80 rounded-xl space-y-3">
                    <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest pl-1.5 border-l-2 border-indigo-500">
                      1. Comisión por Membresía
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                        <select 
                          value={membershipCommType} 
                          onChange={(e) => {
                            const val = e.target.value as 'percentage' | 'fixed' | 'none';
                            setMembershipCommType(val);
                            if (val === 'percentage') {
                              setMembershipCommCurrency('%');
                            } else if (membershipCommCurrency === '%') {
                              setMembershipCommCurrency('USD');
                            }
                          }} 
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer text-slate-750"
                        >
                          <option value="none">Sin comisión</option>
                          <option value="percentage">% Porcentaje</option>
                          <option value="fixed">Monto Fijo</option>
                        </select>
                      </div>

                      {membershipCommType !== 'none' && (
                        <>
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Monto / %</label>
                            <input 
                              type="number" 
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={membershipCommValue} 
                              onChange={(e) => setMembershipCommValue(e.target.value === '' ? '' : Number(e.target.value))} 
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
                            <select 
                              value={membershipCommCurrency} 
                              onChange={(e) => setMembershipCommCurrency(e.target.value)} 
                              disabled={membershipCommType === 'percentage'}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                            >
                              {membershipCommType === 'percentage' ? (
                                <option value="%">% Porcentaje</option>
                              ) : (
                                currencyOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))
                              )}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN 2: COMISIÓN CURSOS */}
                  <div className="bg-slate-50/50 p-4 border border-slate-200/80 rounded-xl space-y-3">
                    <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest pl-1.5 border-l-2 border-amber-500">
                      2. Comisión por Cursos
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                        <select 
                          value={courseCommType} 
                          onChange={(e) => {
                            const val = e.target.value as 'percentage' | 'fixed' | 'per_course' | 'none';
                            setCourseCommType(val);
                            if (val === 'percentage') {
                              setCourseCommCurrency('%');
                            } else if (courseCommCurrency === '%') {
                              setCourseCommCurrency('USD');
                            }
                          }} 
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer text-slate-750"
                        >
                          <option value="none">Sin comisión</option>
                          <option value="percentage">% Venta (Porcentaje)</option>
                          <option value="fixed">Monto Fijo Único</option>
                          <option value="per_course">Monto por Curso</option>
                        </select>
                      </div>

                      {courseCommType !== 'none' && (
                        <>
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Monto / %</label>
                            <input 
                              type="number" 
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={courseCommValue} 
                              onChange={(e) => setCourseCommValue(e.target.value === '' ? '' : Number(e.target.value))} 
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
                            <select 
                              value={courseCommCurrency} 
                              onChange={(e) => setCourseCommCurrency(e.target.value)} 
                              disabled={courseCommType === 'percentage'}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                            >
                              {courseCommType === 'percentage' ? (
                                <option value="%">% Porcentaje</option>
                              ) : (
                                currencyOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))
                              )}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 font-sans">
                  <button
                    type="button"
                    onClick={() => setEditingCommissionInstId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCommission}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Guardar Comisiones
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      <Modal 
        isOpen={agentToDelete !== null} 
        onClose={() => setAgentToDelete(null)} 
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="text-[13px] font-semibold leading-relaxed">
              ¿Estás seguro de que deseas eliminar al agente <strong className="font-black text-red-950">"{agentToDelete?.name}"</strong>?
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Esta acción removerá permanentemente al agente de la base de datos de colaboradores. Además, desligará automáticamente a este agente de todas las instituciones asociadas y comisiones pendientes. Esta acción <strong className="text-slate-700 font-bold">no se puede deshacer</strong>.
          </p>
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setAgentToDelete(null)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-500 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={performDeleteAgent}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10 cursor-pointer"
            >
              Confirmar Eliminación
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
