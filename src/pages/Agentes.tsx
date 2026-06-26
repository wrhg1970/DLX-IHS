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
  AlertCircle,
  Printer,
  Download,
  Wallet,
  FileText,
  Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext, User as AppUser, AgentBankAccount, generateUniqueId, ExtraCommission } from "../context/AppContext";
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
    catalogs,
    enrollments,
    classes,
    bankAccounts,
    addFinancialTransaction
  } = useAppContext();

  // Selected agent state
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(() => {
    return users.length > 0 ? users[0].id : null;
  });

  const [agentToDelete, setAgentToDelete] = useState<{ id: number; name: string } | null>(null);

  // Current sub-tab details
  const [activeTab, setActiveTab] = useState<'perfil' | 'banco' | 'instituciones' | 'pagos' | 'comisiones_extras'>('perfil');
  const [paymentSubTab, setPaymentSubTab] = useState<'recibidos' | 'por_recibir'>('recibidos');
  const [paymentTopTab, setPaymentTopTab] = useState<'cobros' | 'liquidaciones'>('cobros');

  // Commission payout form states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCommForPayout, setSelectedCommForPayout] = useState<any | null>(null);
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payoutMethod, setPayoutMethod] = useState<string>('Transferencia');
  const [payoutBankAccountId, setPayoutBankAccountId] = useState<string>('');
  const [payoutAmountUSD, setPayoutAmountUSD] = useState<number | ''>('');
  const [payoutExchangeRate, setPayoutExchangeRate] = useState<number>(18.0);
  const [payoutAmountMXN, setPayoutAmountMXN] = useState<number | ''>('');
  const [payoutComments, setPayoutComments] = useState<string>('');
  
  // Report filter states
  const [reportInstFilter, setReportInstFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  // Commission modal and form states
  const [editingCommissionInstId, setEditingCommissionInstId] = useState<number | null>(null);
  const [membershipCommType, setMembershipCommType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [membershipCommValue, setMembershipCommValue] = useState<number | ''>('');
  const [membershipCommCurrency, setMembershipCommCurrency] = useState<string>('USD');
  const [courseCommType, setCourseCommType] = useState<'percentage' | 'fixed' | 'per_course' | 'none'>('none');
  const [courseCommValue, setCourseCommValue] = useState<number | ''>('');
  const [courseCommCurrency, setCourseCommCurrency] = useState<string>('USD');

  // Multi-select and search states for extra commission institutions
  const [selectedExtraInstIds, setSelectedExtraInstIds] = useState<number[]>([]);
  const [instSearchQuery, setInstSearchQuery] = useState('');

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
      id: "acc_" + generateUniqueId(),
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

  const handleRegisterPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !selectedCommForPayout) return;

    const amtUSD = Number(payoutAmountUSD);
    const amtMXN = Number(payoutAmountMXN);

    if (!amtUSD || amtUSD <= 0) {
      alert("Por favor ingresa una cantidad en USD válida.");
      return;
    }

    if (!payoutExchangeRate || payoutExchangeRate <= 0) {
      alert("Por favor ingresa un tipo de cambio válido.");
      return;
    }

    if (!amtMXN || amtMXN <= 0) {
      alert("Por favor ingresa o calcula un importe en MXN válido.");
      return;
    }

    // 1. Constraint: Cannot pay more than available remaining balance
    const activeComm = extraCommissionsWithBalances.find(c => c.id === selectedCommForPayout.id);
    if (!activeComm) return;

    // Remaining limit in MXN:
    const remainingMXN = activeComm.remainingMXN;
    if (amtMXN > remainingMXN + 1) { // 1 MXP trace tolerance
      alert(`No puedes registrar este pago. El importe ingresado ($${amtMXN.toLocaleString('es-MX')} MXN) supera la comisión máxima disponible por pagar para esta institución ($${remainingMXN.toLocaleString('es-MX')} MXN).`);
      return;
    }

    // 2. Select bank platform or custom bank Account text
    const selectedBank = bankAccounts?.find(a => a.id.toString() === payoutBankAccountId);
    const bankLabel = selectedBank 
      ? `${selectedBank.bankName} - No SCTA: ${selectedBank.accountNumber || ''} (${selectedBank.currency || 'MXN'})`
      : payoutBankAccountId || 'Transferencia Directa';

    // 3. Define transaction status
    const todayStr = new Date().toISOString().split('T')[0];
    const computedStatus = payoutDate > todayStr ? 'Programado' : 'Aplicado';

    let categoryObj = catalogs['Categorías de Finanzas']?.find((c: any) => c.type === 'expense') || { id: 'cat_administrativos' };
    
    // Add transaction as expense
    const conceptLabel = activeComm.category === 'course' ? 'Curso' : activeComm.category === 'membership' ? 'Membresía' : 'Especial';
    const description = `Pago Comisión Extra (${conceptLabel}) - ${institutions.find(i => i.id === activeComm.institutionId)?.name || 'Institución'}${payoutComments ? ` - ${payoutComments}` : ''}`;

    const payoutTxData: any = {
      type: 'expense' as const,
      date: payoutDate,
      description,
      amount: amtUSD,
      currency: 'USD' as const,
      exchangeRate: payoutExchangeRate,
      status: computedStatus as any,
      categoryId: categoryObj.id || 'cat_administrativos',
      subcategory: 'Comisiones de Agentes',
      paymentMethod: payoutMethod,
      bankAccountId: payoutBankAccountId || '',
      agentId: selectedAgent.id,
      institutionId: activeComm.institutionId,
      originalAmount: amtUSD,
      originalCurrency: 'USD' as const,
    };

    // Embed customized properties with flexibility
    payoutTxData.commissionCategory = activeComm.category;
    payoutTxData.commissionId = activeComm.id;

    addFinancialTransaction(payoutTxData);

    // Reset and close
    setShowPayoutModal(false);
    setSelectedCommForPayout(null);
    setPayoutAmountUSD('');
    setPayoutAmountMXN('');
    setPayoutComments('');
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

  const usdRate = useMemo(() => {
    const usdTx = financialTransactions.find(t => 
      (t.currency === 'USD' || t.originalCurrency === 'USD') && 
      t.amount > 0 && 
      t.amountMXN && 
      t.amountMXN > t.amount
    );
    if (usdTx) {
      return usdTx.amountMXN / usdTx.amount;
    }
    return 18.0; // standard fallback
  }, [financialTransactions]);

  const extraCommissionsDetails = useMemo(() => {
    if (!selectedAgent || !selectedAgent.extraCommissions) return [];

    return selectedAgent.extraCommissions.map(comm => {
      const inst = institutions.find(i => i.id === comm.institutionId);
      const instStudents = students.filter(s => s.institutionId === comm.institutionId);
      const studentIds = instStudents.map(s => s.id);
      const instEnrollments = enrollments.filter(e => studentIds.includes(e.studentId));
      const totalCourses = instEnrollments.length;

      let calculatedAmount = 0;
      let calculatedAmountMXN = 0;

      if (comm.category === 'course') {
        if (comm.type === 'percentage') {
          // percentage applies to course prices
          instEnrollments.forEach(e => {
            const classObj = classes.find(c => c.id === e.classId);
            const enrolledPrice = e.price ?? (classObj?.price ? Number(classObj.price.toString().replace(/[^0-9.]/g, '')) : 0);
            calculatedAmount += enrolledPrice * (comm.value / 100);
          });
          // Assuming course prices are USD based. Convert to MXN:
          calculatedAmountMXN = calculatedAmount * usdRate;
        } else { // fixed
          // fixed amount per course
          calculatedAmount = totalCourses * comm.value;
          if (comm.currency === 'USD') {
            calculatedAmountMXN = calculatedAmount * usdRate;
          } else {
            calculatedAmountMXN = calculatedAmount;
          }
        }
      } else if (comm.category === 'membership') {
        const membershipPrice = inst?.membershipPrice ? Number(inst.membershipPrice.toString().replace(/[^0-9.]/g, '')) : 0;
        if (comm.type === 'percentage') {
          calculatedAmount = membershipPrice * (comm.value / 100);
          calculatedAmountMXN = calculatedAmount * usdRate;
        } else {
          calculatedAmount = comm.value;
          if (comm.currency === 'USD') {
            calculatedAmountMXN = calculatedAmount * usdRate;
          } else {
            calculatedAmountMXN = calculatedAmount;
          }
        }
      } else { // special
        if (comm.type === 'percentage') {
          const revenue = inst?.revenue ?? 0;
          calculatedAmount = revenue * (comm.value / 100);
          calculatedAmountMXN = calculatedAmount * usdRate;
        } else {
          calculatedAmount = comm.value;
          if (comm.currency === 'USD') {
            calculatedAmountMXN = calculatedAmount * usdRate;
          } else {
            calculatedAmountMXN = calculatedAmount;
          }
        }
      }

      return {
        ...comm,
        totalCourses,
        calculatedAmount,
        calculatedAmountMXN
      };
    });
  }, [selectedAgent, institutions, students, enrollments, classes, usdRate]);

  const extraSums = useMemo(() => {
    let courseSumMXN = 0;
    let membershipSumMXN = 0;
    let specialSumMXN = 0;
    extraCommissionsDetails.forEach(c => {
      if (c.category === 'course') {
        courseSumMXN += c.calculatedAmountMXN;
      } else if (c.category === 'membership') {
        membershipSumMXN += c.calculatedAmountMXN;
      } else {
        specialSumMXN += c.calculatedAmountMXN;
      }
    });
    return {
      courseSumMXN,
      membershipSumMXN,
      specialSumMXN,
      totalSumMXN: courseSumMXN + membershipSumMXN + specialSumMXN
    };
  }, [extraCommissionsDetails]);

  // Dynamic calculations for the selected agent
  const agentFinancials = useMemo(() => {
    if (!selectedAgent) return { receivedPayments: [], pendingPayments: [], receivedSum: 0, pendingSum: 0 };
    
    // We list all the transactions representing Student Payments associated with this agent
    const agentTxs = financialTransactions.filter(tx => tx.agentId === selectedAgent.id && tx.type === 'income');
    
    const receivedPayments = agentTxs.filter(tx => tx.status === 'Aplicado');
    const physicalPending = agentTxs.filter(tx => tx.status === 'Pendiente');
    
    // Map extra commissions into virtual pending transactions so they visualize and aggregate
    const virtualPending = extraCommissionsDetails.map((comm) => {
      const instObj = institutions.find(i => i.id === comm.institutionId);
      const isPercentage = comm.type === 'percentage';
      
      let conceptLabel = '';
      if (comm.category === 'course') {
        conceptLabel = 'Curso';
      } else if (comm.category === 'membership') {
        conceptLabel = 'Membresía';
      } else {
        conceptLabel = 'Especial';
      }

      const desc = `Comisión Extra (${conceptLabel}) - ${instObj?.name || `Institución #${comm.institutionId}`}`;
      
      const txObj: any = {
        id: `virtual_extra_${comm.id}`,
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        status: 'Pendiente',
        description: desc,
        studentId: undefined, // "Global"
        paymentMethod: 'Comisión Extra',
        amount: comm.calculatedAmount,
        currency: isPercentage ? 'USD' : comm.currency,
        amountMXN: comm.calculatedAmountMXN
      };

      return txObj;
    });

    const pendingPayments = [...physicalPending, ...virtualPending];
    
    const receivedSum = receivedPayments.reduce((acc, tx) => acc + tx.amountMXN, 0);
    const pendingSum = pendingPayments.reduce((acc, tx) => acc + tx.amountMXN, 0);

    return {
      receivedPayments,
      pendingPayments,
      receivedSum,
      pendingSum
    };
  }, [financialTransactions, selectedAgent, extraCommissionsDetails, institutions]);

  // Track payments made to this agent as commission payouts (expenses/egresos)
  const agentPayouts = useMemo(() => {
    if (!selectedAgent) return { paidSumMXN: 0, scheduledSumMXN: 0, balanceSumMXN: 0, transactions: [] };

    // Expenses with agentId matching this agent
    const payouts = financialTransactions.filter(tx => 
      tx.agentId === selectedAgent.id && 
      tx.type === 'expense' &&
      tx.subcategory === 'Comisiones de Agentes'
    );

    const paidTxs = payouts.filter(tx => tx.status === 'Aplicado' || tx.status === 'Pagado');
    const scheduledTxs = payouts.filter(tx => tx.status === 'Programado' || tx.status === 'Pendiente');

    const paidSumMXN = paidTxs.reduce((acc, tx) => acc + (tx.amountMXN || 0), 0);
    const scheduledSumMXN = scheduledTxs.reduce((acc, tx) => acc + (tx.amountMXN || 0), 0);
    
    const totalAssignedMXN = extraSums.totalSumMXN;
    const balanceSumMXN = Math.max(0, totalAssignedMXN - paidSumMXN - scheduledSumMXN);

    return {
      paidSumMXN,
      scheduledSumMXN,
      balanceSumMXN,
      transactions: payouts
    };
  }, [financialTransactions, selectedAgent, extraSums]);

  // Combine extra commissions with their corresponding paid/scheduled ratios
  const extraCommissionsWithBalances = useMemo(() => {
    if (!selectedAgent) return [];
    return extraCommissionsDetails.map(comm => {
      const payoutsForThis = financialTransactions.filter(tx => 
        tx.agentId === selectedAgent.id && 
        tx.type === 'expense' &&
        tx.subcategory === 'Comisiones de Agentes' &&
        tx.institutionId === comm.institutionId &&
        (tx as any).commissionCategory === comm.category
      );

      const paidMXN = payoutsForThis
        .filter(tx => tx.status === 'Aplicado' || tx.status === 'Pagado')
        .reduce((sum, tx) => sum + (tx.amountMXN || 0), 0);

      const scheduledMXN = payoutsForThis
        .filter(tx => tx.status === 'Programado' || tx.status === 'Pendiente')
        .reduce((sum, tx) => sum + (tx.amountMXN || 0), 0);

      // Remaining commission to pay/receive
      const remainingMXN = Math.max(0, comm.calculatedAmountMXN - paidMXN - scheduledMXN);

      return {
        ...comm,
        paidMXN,
        scheduledMXN,
        remainingMXN,
        payouts: payoutsForThis
      };
    });
  }, [extraCommissionsDetails, financialTransactions, selectedAgent]);

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
              {(['perfil', 'banco', 'instituciones', 'pagos', 'comisiones_extras'] as const).map(tab => (
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
                  {tab === 'comisiones_extras' && 'Comisiones Extras'}
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

                  {/* TAB 4: PAGOS (DIVIDED INTO COBROS & LIQUIDACIONES) */}
                  {activeTab === 'pagos' && (
                    <div className="space-y-6">
                      
                      {/* Sub-tab selection with beautiful minimalist pill-selector */}
                      <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-fit font-sans border border-slate-200/50">
                        <button
                          onClick={() => setPaymentTopTab('cobros')}
                          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            paymentTopTab === 'cobros'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          Ventas & Cobros de Alumnos
                        </button>
                        <button
                          onClick={() => setPaymentTopTab('liquidaciones')}
                          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            paymentTopTab === 'liquidaciones'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Liquidación de Comisiones (Egresos)
                        </button>
                      </div>

                      {paymentTopTab === 'cobros' ? (
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
                      ) : (
                        // TAB DE LIQUIDACIONES (EGRESOS)
                        <div className="space-y-6">
                          
                          {/* Tarjetas de Resumen Financiero de Liquidaciones */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-sans">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alta de Comisiones</p>
                              <p className="text-lg font-black text-slate-800 font-mono mt-1">
                                ${extraSums.totalSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Comisión extra total asignada</p>
                            </div>

                            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Pagado (Egresos)
                              </p>
                              <p className="text-lg font-black text-emerald-900 font-mono mt-1">
                                ${agentPayouts.paidSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </p>
                              <p className="text-[9px] text-emerald-600/80 font-semibold mt-0.5">Importes aplicados y liquidados</p>
                            </div>

                            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Programado (A Futuro)
                              </p>
                              <p className="text-lg font-black text-indigo-900 font-mono mt-1">
                                ${agentPayouts.scheduledSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </p>
                              <p className="text-[9px] text-indigo-600/80 font-semibold mt-0.5">Pagos programados a futuro</p>
                            </div>

                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/50">
                              <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">Por Recibir / Liquidar</p>
                              <p className="text-lg font-black text-amber-900 font-mono mt-1">
                                ${agentPayouts.balanceSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                              </p>
                              <p className="text-[9px] text-amber-600 font-semibold mt-0.5">Saldo restante asignado disponible</p>
                            </div>
                          </div>

                          {/* Sección: Tabla de Control de Límites por Institución */}
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                Control de Saldos & Límites por Institución
                              </h3>
                              <p className="text-[10.5px] text-slate-400 mt-1">No puedes pagar más comisiones por institución de las dadas de alta.</p>
                            </div>

                            <div className="overflow-x-auto text-xs">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/30 border-b border-slate-100">
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Institución</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Concepto Extra</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Comisión Alta (MXN)</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Pagado (MXN)</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Por Recibir / Pagar</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {extraCommissionsWithBalances.map((comm) => {
                                    const instObj = institutions.find(i => i.id === comm.institutionId);
                                    const canPay = comm.remainingMXN > 1;

                                    return (
                                      <tr key={comm.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-5 py-4 font-bold text-slate-900">
                                          {instObj?.name || `Institución #${comm.institutionId}`}
                                        </td>
                                        <td className="px-5 py-4">
                                          <div className="space-y-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                              comm.category === 'course' 
                                                ? 'bg-blue-50 text-blue-700 border border-blue-100/30' 
                                                : comm.category === 'membership'
                                                ? 'bg-purple-50 text-purple-700 border border-purple-100/30'
                                                : 'bg-amber-50 text-amber-700 border border-amber-100/30'
                                            }`}>
                                              {comm.category === 'course' && 'Por Curso'}
                                              {comm.category === 'membership' && 'Por Membresía'}
                                              {comm.category === 'special' && 'Especial'}
                                              {!comm.category && 'Especial'}
                                            </span>
                                            {comm.category === 'course' && (
                                              <p className="text-[10px] text-slate-500 font-bold pl-1">
                                                Cursos: <span className="font-mono text-slate-700">{comm.totalCourses}</span>
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                                          ${comm.calculatedAmountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono text-emerald-600 font-bold">
                                          ${comm.paidMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                          {comm.scheduledMXN > 0 && (
                                            <p className="text-[10px] text-indigo-500 font-bold mt-0.5">
                                              +${comm.scheduledMXN.toLocaleString('es-MX')} Prog.
                                            </p>
                                          )}
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono font-black text-slate-900">
                                          <span className={comm.remainingMXN <= 0 ? 'text-slate-400 line-through' : 'text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/40'}>
                                            ${comm.remainingMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                          </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                          {canPay ? (
                                            <button
                                              onClick={() => {
                                                setSelectedCommForPayout(comm);
                                                // Pre-calculate initial payout value (max 1000 USD converted or corresponding)
                                                const maxUSD = Math.round((comm.remainingMXN / usdRate) * 100) / 100;
                                                setPayoutAmountUSD(maxUSD);
                                                setPayoutExchangeRate(usdRate);
                                                setPayoutAmountMXN(comm.remainingMXN);
                                                setPayoutDate(new Date().toISOString().split('T')[0]);
                                                setShowPayoutModal(true);
                                              }}
                                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 mx-auto cursor-pointer"
                                            >
                                              <Plus className="w-3 h-3" />
                                              Pagar Comisión
                                            </button>
                                          ) : (
                                            <span className="text-[10px] text-emerald-650 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100 font-bold">
                                              Totalmente Liquidada
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {extraCommissionsWithBalances.length === 0 && (
                                    <tr>
                                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                                        <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        No hay comisiones extras configuradas para este agente aún.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Historial de Transacciones de Egresos de Comisiones */}
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                              <div>
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                  Historial de Payouts Realizados (Egresos)
                                </h3>
                                <p className="text-[10px] text-slate-400">Pagos liquidados o programados transferidos de las cuentas de la plataforma.</p>
                              </div>
                            </div>

                            <div className="overflow-x-auto text-xs">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/30 border-b border-slate-100">
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider w-24">Fecha Payout</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Concepto en Egresos</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider">Via de Pago</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Monto USD</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">T. Cambio</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-right">Total MXN</th>
                                    <th className="px-5 py-3 font-black text-slate-400 uppercase tracking-wider text-center">Estatus</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                                  {agentPayouts.transactions.map((tx) => {
                                    const bankObj = bankAccounts?.find(b => b.id.toString() === tx.bankAccountId?.toString());
                                    const isFuture = tx.status === 'Programado' || new Date(tx.date) > new Date();

                                    return (
                                      <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-slate-400 font-normal">{tx.date}</td>
                                        <td className="px-5 py-3.5">
                                          <div>
                                            <p className="font-bold text-slate-900 leading-tight">{tx.description}</p>
                                            {bankObj && (
                                              <p className="text-[9px] text-indigo-500 font-bold mt-0.5">
                                                Cuenta origen: {bankObj.bankName} ({bankObj.currency}) No: {bankObj.accountNumber}
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 font-bold">{tx.paymentMethod}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-slate-500 font-bold">
                                          ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono text-slate-400 font-normal">
                                          ${tx.exchangeRate.toFixed(4)}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">
                                          ${tx.amountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                            isFuture || tx.status === 'Programado'
                                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          }`}>
                                            {isFuture || tx.status === 'Programado' ? 'Programado (Futuro)' : 'Aplicado (Pagado)'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {agentPayouts.transactions.length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                                        No se han registrado pagos de comisiones a este agente todavía.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* REPORTE IMPRIMIBLE Y DESCARGABLE DE COMISIONES */}
                          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 font-sans print:bg-white print:text-slate-950 print:p-0 print:shadow-none">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4 print:border-b-2 print:border-slate-300">
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 print:text-indigo-900">
                                  <FileText className="w-4 h-4" />
                                  Reporte Consolidado de Comisiones
                                </h4>
                                <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
                                  Resumen de importes liquidados, programados y pendientes de recibir del agente <strong>{selectedAgent.name}</strong>.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 print:hidden">
                                <button
                                  onClick={() => {
                                    // print target simulation or call default browser print
                                    window.print();
                                  }}
                                  className="bg-slate-800 hover:bg-slate-705 border border-slate-700 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-slate-300 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Imprimir Reporte
                                </button>
                                <button
                                  onClick={() => {
                                    // Export simple CSV file
                                    let csvContent = "data:text/csv;charset=utf-8,";
                                    csvContent += "REPORTE DE COMISIONES - AGENTE: " + selectedAgent.name + "\r\n";
                                    csvContent += "Fecha de Emisión: " + new Date().toLocaleDateString('es-MX') + "\r\n\r\n";
                                    csvContent += "INSTITUCION,CONCEPTO,ESTADO,ASIGNADO (MXN),PAGADO (MXN),POR RECIBIR (MXN)\r\n";
                                    
                                    extraCommissionsWithBalances.forEach(comm => {
                                      const instName = institutions.find(i => i.id === comm.institutionId)?.name || 'N/A';
                                      const concept = comm.category === 'course' ? 'Curso' : comm.category === 'membership' ? 'Membresía' : 'Especial';
                                      const isLiqui = comm.remainingMXN <= 0 ? 'Liquidada' : 'Pendiente';
                                      csvContent += `"${instName}","${concept}","${isLiqui}",${comm.calculatedAmountMXN},${comm.paidMXN},${comm.remainingMXN}\r\n`;
                                    });

                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute("download", `comisiones_${selectedAgent.name.replace(/\s+/g, '_')}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Exportar CSV
                                </button>
                              </div>
                            </div>

                            {/* Filtros de Reporte interactivos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-3.5 rounded-2xl print:hidden">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filtrar Institución</label>
                                <select
                                  value={reportInstFilter}
                                  onChange={(e) => setReportInstFilter(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-750 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="all">Todas las instituciones</option>
                                  {[...extraCommissionsWithBalances]
                                    .sort((a, b) => {
                                      const nameA = institutions.find(i => i.id === a.institutionId)?.name || "";
                                      const nameB = institutions.find(i => i.id === b.institutionId)?.name || "";
                                      return nameA.localeCompare(nameB, "es");
                                    })
                                    .map(c => {
                                      const inst = institutions.find(i => i.id === c.institutionId);
                                      return (
                                        <option key={c.id} value={c.institutionId.toString()}>
                                          {inst ? inst.name : `Institución #${c.institutionId}`}
                                        </option>
                                      );
                                    })}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filtrar Estatus de Cuenta</label>
                                <select
                                  value={reportStatusFilter}
                                  onChange={(e) => setReportStatusFilter(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-750 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="all">Ver todo el balance</option>
                                  <option value="liquidated">Totalmente Liquidadas</option>
                                  <option value="pending">Con Saldo por Recibir</option>
                                </select>
                              </div>
                            </div>

                            {/* Listado del Balance del Reporte */}
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                              {extraCommissionsWithBalances
                                .filter(c => reportInstFilter === 'all' || c.institutionId.toString() === reportInstFilter)
                                .filter(c => {
                                  if (reportStatusFilter === 'liquidated') return c.remainingMXN <= 0;
                                  if (reportStatusFilter === 'pending') return c.remainingMXN > 0;
                                  return true;
                                })
                                .map((comm) => {
                                  const instObj = institutions.find(i => i.id === comm.institutionId);
                                  const conceptLabel = comm.category === 'course' ? 'Curso' : comm.category === 'membership' ? 'Membresía' : 'Especial';
                                  const isLiqui = comm.remainingMXN <= 0;

                                  return (
                                    <div key={comm.id} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:border-b print:bg-white print:text-slate-950">
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <p className="font-bold text-xs text-white print:text-slate-900">
                                            {instObj?.name || `Institución #${comm.institutionId}`}
                                          </p>
                                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                                            isLiqui ? 'bg-emerald-950 text-emerald-400 border border-emerald-900 print:bg-emerald-50 print:text-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-900 print:bg-amber-50 print:text-amber-800'
                                          }`}>
                                            {isLiqui ? 'Liquidada' : 'Por Recibir'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 print:text-slate-500">
                                          Concepto: <strong className="text-slate-250 print:text-slate-700">{conceptLabel}</strong>
                                          {comm.category === 'course' && ` (${comm.totalCourses} cursos)`}
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-3 gap-4 text-right font-mono text-[10.5px]">
                                        <div>
                                          <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Asignada</span>
                                          <span className="font-bold text-slate-300 print:text-slate-700">
                                            ${comm.calculatedAmountMXN.toLocaleString('es-MX')}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Pagada</span>
                                          <span className="font-bold text-emerald-400 print:text-emerald-700">
                                            ${comm.paidMXN.toLocaleString('es-MX')}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Por Recibir</span>
                                          <span className={`font-black ${isLiqui ? 'text-slate-500' : 'text-amber-400 print:text-amber-700'}`}>
                                            ${comm.remainingMXN.toLocaleString('es-MX')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                              {extraCommissionsWithBalances.length === 0 && (
                                <p className="text-center py-6 text-xs text-slate-400 italic">No hay datos en el reporte para mostrar.</p>
                              )}
                            </div>

                          </div>

                        </div>
                      )}

                    </div>
                  )}

                  {/* TAB 5: COMISIONES EXTRAS */}
                  {activeTab === 'comisiones_extras' && (
                    <div className="space-y-6">
                      
                      {/* Cabecera explicativa */}
                      <div className="bg-white p-5 border border-slate-200 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Comisiones Extras del Agente</h3>
                        <p className="text-[11px] text-slate-400">Determina comisiones específicas o complementarias para instituciones seleccionadas. Estas comisiones se configuran y registran de forma independiente al esquema general.</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* FORMULARIO DE NUEVA COMISIÓN EXTRA */}
                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs space-y-4 h-fit">
                          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <Plus className="w-3.5 h-3.5" />
                            Nueva Comisión Extra
                          </h4>
                          
                          <div className="space-y-3 font-sans">
                            {/* Selector de Instituciones (Multi-select con buscador y estado) */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institución / Instituciones</label>
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                  {selectedExtraInstIds.length} seleccionadas
                                </span>
                              </div>

                              {/* Buscador de instituciones */}
                              <input
                                type="text"
                                placeholder="🔍 Buscar institución..."
                                value={instSearchQuery}
                                onChange={(e) => setInstSearchQuery(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-t-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                              />

                              {/* Lista de Checkboxes scrollable */}
                              <div className="border-x border-b border-slate-200 bg-white rounded-b-xl max-h-48 overflow-y-auto p-2.5 space-y-2">
                                {/* Botones rápidos */}
                                <div className="flex justify-between border-b border-slate-105 pb-1.5 mb-2 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = institutions
                                        .filter(inst => {
                                          const query = instSearchQuery.toLowerCase();
                                          return (inst.name || '').toLowerCase().includes(query) || (inst.country || '').toLowerCase().includes(query);
                                        })
                                        .map(inst => inst.id);
                                      // Union of currently selected and filtered
                                      setSelectedExtraInstIds(prev => Array.from(new Set([...prev, ...filtered])));
                                    }}
                                    className="text-indigo-650 hover:text-indigo-800 cursor-pointer text-[10px]"
                                  >
                                    Seleccionar todo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Deselect all
                                      setSelectedExtraInstIds([]);
                                    }}
                                    className="text-red-500 hover:text-red-700 cursor-pointer text-[10px]"
                                  >
                                    Deseleccionar todo
                                  </button>
                                </div>

                                {(() => {
                                  const filteredInsts = [...institutions]
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
                                    .filter(inst => {
                                      const query = instSearchQuery.toLowerCase();
                                      return (inst.name || '').toLowerCase().includes(query) || (inst.country || '').toLowerCase().includes(query);
                                    });

                                  if (filteredInsts.length === 0) {
                                    return <p className="text-center text-slate-400 text-[10px] py-2">No se encontraron instituciones.</p>;
                                  }

                                  return filteredInsts.map(inst => {
                                    const isChecked = selectedExtraInstIds.includes(inst.id);
                                    return (
                                      <label key={inst.id} className="flex items-start gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedExtraInstIds(prev => prev.filter(id => id !== inst.id));
                                            } else {
                                              setSelectedExtraInstIds(prev => [...prev, inst.id]);
                                            }
                                          }}
                                          className="mt-0.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500"
                                        />
                                        <div className="text-xs leading-tight">
                                          <p className="font-bold text-slate-700">{inst.name}</p>
                                          <p className="text-[9px] text-slate-400 font-semibold">{inst.country || 'N/A'}</p>
                                        </div>
                                      </label>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* Categoría / Concepto */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Concepto / Aplicación</label>
                              <select
                                id="extra-commission-category"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                defaultValue="course"
                              >
                                <option value="course">Por Curso</option>
                                <option value="membership">Por Membresía</option>
                                <option value="special">Especial</option>
                              </select>
                            </div>

                            {/* Tipo de Comisión */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Comisión</label>
                              <select
                                id="extra-commission-type"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                defaultValue="percentage"
                                onChange={(e) => {
                                  const currencySelect = document.getElementById('extra-commission-currency') as HTMLSelectElement;
                                  if (currencySelect) {
                                    if (e.target.value === 'percentage') {
                                      currencySelect.value = '%';
                                      currencySelect.disabled = true;
                                    } else {
                                      currencySelect.value = 'USD';
                                      currencySelect.disabled = false;
                                    }
                                  }
                                }}
                              >
                                <option value="percentage">% Porcentaje</option>
                                <option value="fixed">Monto Fijo</option>
                              </select>
                            </div>

                            {/* Fila: Valor y Moneda */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor / Comisión</label>
                                <input
                                  id="extra-commission-value"
                                  type="number"
                                  placeholder="0.00"
                                  min="0"
                                  step="any"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Moneda</label>
                                <select
                                  id="extra-commission-currency"
                                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold outline-none appearance-none disabled:bg-slate-150 disabled:text-slate-400 cursor-pointer"
                                  defaultValue="%"
                                  disabled
                                >
                                  <option value="%">% Porcentaje</option>
                                  {currencyOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Botón de Agregar */}
                            <button
                              type="button"
                              onClick={() => {
                                const typeSelect = document.getElementById('extra-commission-type') as HTMLSelectElement;
                                const catSelect = document.getElementById('extra-commission-category') as HTMLSelectElement;
                                const valInput = document.getElementById('extra-commission-value') as HTMLInputElement;
                                const currSelect = document.getElementById('extra-commission-currency') as HTMLSelectElement;

                                if (!typeSelect || !valInput || !currSelect || !catSelect) return;
                                const valueVal = valInput.value;

                                if (selectedExtraInstIds.length === 0) {
                                  alert('Por favor, selecciona al menos una institución.');
                                  return;
                                }
                                if (!valueVal || isNaN(Number(valueVal)) || Number(valueVal) < 0) {
                                  alert('Por favor, introduce un valor válido para la comisión.');
                                  return;
                                }

                                const currentExtraList = selectedAgent.extraCommissions ? [...selectedAgent.extraCommissions] : [];
                                
                                // Check if commission already exists for this institution AND category
                                const duplicates: string[] = [];
                                selectedExtraInstIds.forEach(id => {
                                  const exists = currentExtraList.some(x => x.institutionId === id && x.category === catSelect.value);
                                  if (exists) {
                                    const instObj = institutions.find(i => i.id === id);
                                    duplicates.push(instObj?.name || `ID #${id}`);
                                  }
                                });

                                if (duplicates.length > 0) {
                                  const conceptText = catSelect.value === 'course' ? 'Por Curso' : catSelect.value === 'membership' ? 'Por Membresía' : 'Especial';
                                  if (!confirm(`Las siguientes instituciones ya cuentan con una comisión extra del concepto "${conceptText}":\n${duplicates.join(', ')}\n\n¿Deseas sobreescribirlas?`)) {
                                    return;
                                  }
                                }

                                selectedExtraInstIds.forEach(instId => {
                                  const newItem: ExtraCommission = {
                                    id: 'ec_' + generateUniqueId(),
                                    institutionId: instId,
                                    type: typeSelect.value as 'percentage' | 'fixed',
                                    value: Number(valueVal),
                                    currency: currSelect.value,
                                    category: catSelect.value as 'course' | 'membership' | 'special'
                                  };

                                  const duplicateIndex = currentExtraList.findIndex(x => x.institutionId === instId && x.category === newItem.category);
                                  if (duplicateIndex !== -1) {
                                    currentExtraList[duplicateIndex] = newItem;
                                  } else {
                                    currentExtraList.push(newItem);
                                  }
                                });

                                updateUser(selectedAgent.id, { extraCommissions: currentExtraList });

                                // Clean form
                                setSelectedExtraInstIds([]);
                                setInstSearchQuery('');
                                valInput.value = '';
                                catSelect.value = 'course';
                              }}
                              className="w-full mt-3 flex items-center justify-center space-x-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Agregar Comisión ({selectedExtraInstIds.length})</span>
                            </button>
                          </div>
                        </div>

                        {/* LISTADO DE COMISIONES EXTRAS DE ESTE AGENTE */}
                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs lg:col-span-2 flex flex-col min-h-[300px]">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Comisiones Especiales Registradas ({(selectedAgent.extraCommissions || []).length})</h4>
                          
                          <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  <th className="px-4 py-3">Institución</th>
                                  <th className="px-4 py-3">Concepto</th>
                                  <th className="px-4 py-3">Tipo de Comisión</th>
                                  <th className="px-4 py-3 text-right">Comisión</th>
                                  <th className="px-4 py-3 text-right">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                {extraCommissionsDetails.map((comm) => {
                                  const instObj = institutions.find(i => i.id === comm.institutionId);
                                  return (
                                    <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3.5">
                                        <div className="flex items-start space-x-2">
                                          <div className="p-1 bg-slate-100 text-slate-500 rounded shrink-0 mt-0.5">
                                            <Building2 className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-900 leading-tight">{instObj?.name || `Institución #${comm.institutionId}`}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{instObj?.country || "N/A"}</p>
                                          </div>
                                        </div>
                                      </td>
                                      
                                      <td className="px-4 py-3.5">
                                        <div className="space-y-1">
                                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            comm.category === 'course' 
                                              ? 'bg-blue-50 text-blue-700 border border-blue-100/30' 
                                              : comm.category === 'membership'
                                              ? 'bg-purple-50 text-purple-700 border border-purple-100/30'
                                              : 'bg-amber-50 text-amber-700 border border-amber-100/30'
                                          }`}>
                                            {comm.category === 'course' && 'Por Curso'}
                                            {comm.category === 'membership' && 'Por Membresía'}
                                            {comm.category === 'special' && 'Especial'}
                                            {!comm.category && 'Especial'}
                                          </span>
                                          {comm.category === 'course' && (
                                            <p className="text-[10px] text-slate-500 font-bold pl-1 mt-1">
                                              Total Cursos: <span className="text-slate-800 font-mono">{comm.totalCourses}</span>
                                            </p>
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          comm.type === 'percentage' 
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/30' 
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100/30'
                                        }`}>
                                          {comm.type === 'percentage' ? '% Porcentaje de Venta' : 'Monto Fijo Asignado'}
                                        </span>
                                      </td>

                                      <td className="px-4 py-3.5 text-right font-mono text-slate-900">
                                        <div className="space-y-1 text-right">
                                          <p className="font-black text-xs">
                                            {comm.type === 'percentage' 
                                              ? `${comm.value}%` 
                                              : `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: comm.currency || 'USD' }).format(comm.value)} ${comm.currency}`
                                            }
                                          </p>
                                          <p className="text-[10px] font-bold text-indigo-600">
                                            Total: ${comm.calculatedAmountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                          </p>
                                        </div>
                                      </td>

                                      <td className="px-4 py-3.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedComms = (selectedAgent.extraCommissions || []).filter(x => x.id !== comm.id);
                                            updateUser(selectedAgent.id, { extraCommissions: updatedComms });
                                          }}
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                          title="Eliminar comisión extra"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {extraCommissionsDetails.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                                      <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                      <p className="font-bold text-xs text-slate-400">No hay comisiones extras registradas para este agente.</p>
                                      <p className="text-[10px] text-slate-300 max-w-xs mx-auto mt-1">Utiliza el panel lateral de la izquierda para agregar su primera comisión específica.</p>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Resumen de totales de comisiones extras */}
                           {extraCommissionsDetails.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl font-sans">
                               <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cursos ({extraCommissionsDetails.filter(c => c.category === 'course').reduce((acc, c) => acc + c.totalCourses, 0)} cursos)</p>
                                 <p className="text-xs font-bold text-slate-800 font-mono">${extraSums.courseSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Membresías</p>
                                 <p className="text-xs font-bold text-slate-800 font-mono">${extraSums.membershipSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Especiales</p>
                                 <p className="text-xs font-bold text-slate-800 font-mono">${extraSums.specialSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
                               </div>
                               <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100/40">
                                 <p className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider">Sumatoria de Comisiones</p>
                                 <p className="text-sm font-black text-indigo-700 font-mono">${extraSums.totalSumMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
                               </div>
                             </div>
                           )}
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

      {/* MODAL LIQUIDACIÓN / PAGO DE COMISIONES */}
      <AnimatePresence>
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-slate-900 tracking-tight">Programar o Registrar Liquidación</h3>
                <p className="text-xs text-slate-400">Genera la salida/egresos correspondientes con verificación de límites por concepto.</p>
              </div>

              {selectedCommForPayout && (() => {
                const instObj = institutions.find(i => i.id === selectedCommForPayout.institutionId);
                const activeComm = extraCommissionsWithBalances.find(c => c.id === selectedCommForPayout.id);
                const limitMXN = activeComm ? activeComm.remainingMXN : 0;

                return (
                  <form onSubmit={handleRegisterPayout} className="space-y-4 font-sans text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Concepto de Comisión</p>
                      <p className="font-extrabold text-slate-800 text-[11px]">
                        {instObj?.name || 'Institución'}
                      </p>
                      <div className="flex justify-between items-center text-slate-500 font-semibold pt-1">
                        <span>Monto Configurado: ${activeComm?.calculatedAmountMXN.toLocaleString('es-MX')} MXN</span>
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100/30">
                          Máximo por pagar: ${limitMXN.toLocaleString('es-MX')} MXN
                        </span>
                      </div>
                    </div>

                    {/* Fecha de Pago */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Fecha de Pago / Liquidación</label>
                      <input
                        type="date"
                        value={payoutDate}
                        onChange={(e) => setPayoutDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        required
                      />
                      <p className="text-[10px] text-indigo-600 mt-1 font-semibold">
                        💡 Si eliges una fecha a futuro, el pago se guardará como <strong className="font-bold text-indigo-700">"Programado"</strong> y se devengará en esa fecha.
                      </p>
                    </div>

                    {/* Forma de Pago y Cuenta Origen */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Forma de Pago</label>
                        <select
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer appearance-none"
                        >
                          <option value="Transferencia">Transferencia Bancaria</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Cheque">Cheque Nominativo</option>
                          <option value="Tarjeta">Tarjeta de Crédito Corporativa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Cuenta de Origen</label>
                        <select
                          value={payoutBankAccountId}
                          onChange={(e) => setPayoutBankAccountId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer appearance-none"
                        >
                          <option value="">-- Sin cuenta asignada --</option>
                          {bankAccounts?.map(bank => (
                            <option key={bank.id} value={bank.id.toString()}>
                              {bank.bankName} - No: {bank.accountNumber || ''} ({bank.currency || 'MXN'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Importes Conversor USD/MXN */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Monto (USD)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={payoutAmountUSD}
                          onChange={(e) => {
                            const usd = Number(e.target.value);
                            setPayoutAmountUSD(e.target.value);
                            if (usd && payoutExchangeRate) {
                              const mxnAmt = Math.min(limitMXN, Math.round(usd * Number(payoutExchangeRate) * 100) / 100);
                              setPayoutAmountMXN(mxnAmt.toString());
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Tipo de Cambio</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={payoutExchangeRate}
                          onChange={(e) => {
                            const rate = Number(e.target.value);
                            setPayoutExchangeRate(e.target.value);
                            if (Number(payoutAmountUSD) && rate) {
                              const mxnAmt = Math.min(limitMXN, Math.round(Number(payoutAmountUSD) * rate * 100) / 100);
                              setPayoutAmountMXN(mxnAmt.toString());
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                          placeholder="e.g. 18.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Monto (MXN)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={payoutAmountMXN}
                          onChange={(e) => {
                            const mxnVal = Number(e.target.value);
                            setPayoutAmountMXN(e.target.value);
                            if (mxnVal && payoutExchangeRate) {
                              const usdVal = Math.round((mxnVal / Number(payoutExchangeRate)) * 100) / 100;
                              setPayoutAmountUSD(usdVal.toString());
                            }
                          }}
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-mono ${
                            Number(payoutAmountMXN) > limitMXN + 1 ? 'border-red-300 text-red-900 bg-red-55' : 'border-slate-200'
                          }`}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {/* Alerta de exceso de límite en tiempo real */}
                    {Number(payoutAmountMXN) > limitMXN + 1 && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-1.5 text-red-800 text-[10.5px] font-bold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-650" />
                        <span>El total ingresado en pesos (${Number(payoutAmountMXN).toLocaleString('es-MX')} MXN) supera el saldo disponible (${limitMXN.toLocaleString('es-MX')} MXN). Se impedirá la ejecución al enviar el formulario.</span>
                      </div>
                    )}

                    {/* Comentarios */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1">Comentarios / Observaciones</label>
                      <textarea
                        value={payoutComments}
                        onChange={(e) => setPayoutComments(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
                        placeholder="Escribe comentarios, folio o banco de depósito"
                      />
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPayoutModal(false);
                          setSelectedCommForPayout(null);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-500 cursor-pointer"
                      >
                        Cerrar
                      </button>
                      <button
                        type="submit"
                        disabled={Number(payoutAmountMXN) > limitMXN + 1}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer animate-none"
                      >
                        {payoutDate > new Date().toISOString().split('T')[0] ? 'Programar Pago a Futuro' : 'Registrar Pago (Egresos)'}
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
