import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, Filter, Download, Plus, Search, DollarSign, TrendingUp, TrendingDown, RefreshCcw, Landmark, MapPin, SearchX, X, UploadCloud, FileText, CheckCircle, Trash2, Save, Edit, Eye, User, ShieldAlert, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Modal } from '../components/ui/Modal';
import { FinancialTransaction, StatementTransaction } from '../context/AppContext';
import { FinancialTransactionForm } from '../components/FinancialTransactionForm';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
const CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP'];

export function Finanzas() {
  const { 
    syncErrors,
    currentUser, users, financialTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction, catalogs,
    bankAccounts, providers, students, institutions, classes, enrollments,
    accountStatements, statementTransactions, addAccountStatement, deleteAccountStatement, updateStatementTransaction, deleteStatementTransaction
  } = useAppContext();

  const isCoordinator = currentUser?.role === 'Coordinador';
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Ingresos' | 'Egresos' | 'OCR' | 'Errores'>(
    currentUser?.role === 'Coordinador' ? 'Ingresos' : 'Dashboard'
  );

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewCurrency, setViewCurrency] = useState<'MXN' | 'USD'>('MXN');
  const [providerFilter, setProviderFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [bankAccountFilter, setBankAccountFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [statementToDelete, setStatementToDelete] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [selectedOcrToLink, setSelectedOcrToLink] = useState<StatementTransaction | null>(null);

  // States for viewing transaction details and Authorization requirements
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);
  const [isAuthConfirmOpen, setIsAuthConfirmOpen] = useState(false);
  const [authActionType, setAuthActionType] = useState<'edit' | 'delete' | null>(null);
  const [authTargetTx, setAuthTargetTx] = useState<any>(null);
  const [authCheckboxApproved, setAuthCheckboxApproved] = useState(false);
  const [authConfirmationInput, setAuthConfirmationInput] = useState('');

  // Pagination states to handle large amount of transactions instantly
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Optimized Maps for O(1) Lookups (Huge Loading & Rendering Performance Improvement)
  const categoriesMap = useMemo(() => new Map((catalogs['Categorías'] || []).map(c => [c.id, c])), [catalogs]);
  const subcategoriesMap = useMemo(() => new Map((catalogs['Subcategorías'] || []).map(s => [s.id, s])), [catalogs]);
  const studentsMap = useMemo(() => new Map((students || []).map(s => [s.id, s])), [students]);
  const institutionsMap = useMemo(() => new Map((institutions || []).map(i => [i.id, i])), [institutions]);
  const providersMap = useMemo(() => new Map((providers || []).map(p => [p.id, p])), [providers]);
  const usersMap = useMemo(() => new Map((users || []).map(u => [u.id, u])), [users]);

  const isSuperAdmin = currentUser?.role?.toLowerCase()?.includes('super') || 
                       currentUser?.role?.toLowerCase()?.includes('admin principal') || 
                       currentUser?.role?.toLowerCase()?.includes('director') ||
                       currentUser?.role?.toLowerCase()?.includes('coordinador') ||
                       currentUser?.role?.toLowerCase()?.includes('finanzas') ||
                       currentUser?.role?.toLowerCase()?.includes('academia');

  const handleEditWithAuth = (tx: any) => {
    // Para editar no se necesita previa autorizacion, se abre directo
    setViewingTransaction(null);
    setEditingTransaction(tx);
    setFormType(tx.type);
    setIsModalOpen(true);
  };

  const handleConfirmScheduledPayment = (tx: any) => {
    setViewingTransaction(null);
    setEditingTransaction({ ...tx, status: 'Aplicado' });
    setFormType(tx.type);
    setIsModalOpen(true);
  };

  const handleDeleteWithAuth = (tx: any) => {
    setAuthActionType('delete');
    setAuthTargetTx(tx);
    setAuthCheckboxApproved(false);
    setAuthConfirmationInput('');
    setIsAuthConfirmOpen(true);
  };

  const handleAuthConfirmSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authCheckboxApproved || authConfirmationInput.trim().toUpperCase() !== 'AUTORIZAR') {
      return;
    }
    
    setIsAuthConfirmOpen(false);
    
    if (authActionType === 'delete' && authTargetTx) {
      setViewingTransaction(null);
      deleteFinancialTransaction(authTargetTx.id);
    }
    
    setAuthActionType(null);
    setAuthTargetTx(null);
  };

  const [modalRelationType, setModalRelationType] = useState<'none' | 'institution' | 'homeschool'>('none');
  const [modalInstId, setModalInstId] = useState<string>('');
  const [modalStudentId, setModalStudentId] = useState<string>('');
  const [modalCategoryId, setModalCategoryId] = useState<string>('');
  const [modalSubcategory, setModalSubcategory] = useState<string>('');

  React.useEffect(() => {
    if (selectedOcrToLink) {
      setModalCategoryId(selectedOcrToLink.categoryId || '');
      setModalSubcategory(selectedOcrToLink.subcategory || '');
      
      if (selectedOcrToLink.studentId) {
        setModalRelationType('homeschool');
        setModalStudentId(selectedOcrToLink.studentId.toString());
        setModalInstId('');
      } else if (selectedOcrToLink.institutionId) {
        setModalRelationType('institution');
        setModalInstId(selectedOcrToLink.institutionId.toString());
        setModalStudentId('');
      } else {
        setModalRelationType('none');
        setModalInstId('');
        setModalStudentId('');
      }
    }
  }, [selectedOcrToLink]);

  const [selectedFinTxIds, setSelectedFinTxIds] = useState<string[]>([]);
  const [massEditCategory, setMassEditCategory] = useState<boolean>(false);
  const [massEditSubcategory, setMassEditSubcategory] = useState<boolean>(false);
  const [massEditCurrency, setMassEditCurrency] = useState<boolean>(false);
  const [massEditExchangeRate, setMassEditExchangeRate] = useState<boolean>(false);
  const [massEditDate, setMassEditDate] = useState<boolean>(false);
  const [massEditBankAccount, setMassEditBankAccount] = useState<boolean>(false);
  const [massEditStatus, setMassEditStatus] = useState<boolean>(false);

  const [massCategoryValue, setMassCategoryValue] = useState<string>('');
  const [massSubcategoryValue, setMassSubcategoryValue] = useState<string>('');
  const [massCurrencyValue, setMassCurrencyValue] = useState<string>('');
  const [massExchangeRateValue, setMassExchangeRateValue] = useState<string>('');
  const [massDateValue, setMassDateValue] = useState<string>('');
  const [massBankAccountValue, setMassBankAccountValue] = useState<string>('');
  const [massStatusValue, setMassStatusValue] = useState<string>('');

  const [isMassUpdateConfirmOpen, setIsMassUpdateConfirmOpen] = useState(false);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);
  const [massActionError, setMassActionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!massEditCategory) setMassCategoryValue('');
    if (!massEditSubcategory) setMassSubcategoryValue('');
    if (!massEditCurrency) setMassCurrencyValue('');
    if (!massEditExchangeRate) setMassExchangeRateValue('');
    if (!massEditDate) setMassDateValue('');
    if (!massEditBankAccount) setMassBankAccountValue('');
    if (!massEditStatus) setMassStatusValue('');
  }, [massEditCategory, massEditSubcategory, massEditCurrency, massEditExchangeRate, massEditDate, massEditBankAccount, massEditStatus]);

  React.useEffect(() => {
    setSelectedFinTxIds([]);
    setMassEditCategory(false);
    setMassEditSubcategory(false);
    setMassEditCurrency(false);
    setMassEditExchangeRate(false);
    setMassEditDate(false);
    setMassEditBankAccount(false);
    setMassEditStatus(false);
  }, [activeTab, dateRange, viewCurrency, providerFilter, clientFilter, categoryFilter, subcategoryFilter, institutionFilter, bankAccountFilter, statusFilter, searchTerm]);

  const handleToggleSelectAllFin = () => {
    const visibleIds = filteredTransactions.map(tx => tx.id);
    const allSelected = visibleIds.every(id => selectedFinTxIds.includes(id));
    if (allSelected) {
      setSelectedFinTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedFinTxIds(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleApplyMassChange = () => {
    setMassActionError(null);
    
    const fieldsToApply = [];
    if (massEditCategory) fieldsToApply.push('Categoría');
    if (massEditSubcategory) fieldsToApply.push('Subcategoría');
    if (massEditCurrency) fieldsToApply.push('Moneda');
    if (massEditExchangeRate) fieldsToApply.push('Tipo de Cambio');
    if (massEditDate) fieldsToApply.push('Fecha');
    if (massEditBankAccount) fieldsToApply.push('Cuenta de Pago');
    if (massEditStatus) fieldsToApply.push('Estado');

    if (fieldsToApply.length === 0) {
      setMassActionError('Por favor selecciona al menos un campo para modificar.');
      return;
    }

    if (massEditCategory && !massCategoryValue) {
      setMassActionError('Por favor selecciona una categoría.');
      return;
    }
    if (massEditSubcategory && !massSubcategoryValue) {
      setMassActionError('Por favor selecciona una subcategoría.');
      return;
    }
    if (massEditCurrency && !massCurrencyValue) {
      setMassActionError('Por favor selecciona una moneda.');
      return;
    }
    if (massEditExchangeRate) {
      const parsed = parseFloat(massExchangeRateValue);
      if (isNaN(parsed) || parsed <= 0) {
        setMassActionError('Por favor ingresa un tipo de cambio válido mayor a 0.');
        return;
      }
    }
    if (massEditDate && !massDateValue) {
      setMassActionError('Por favor selecciona una fecha válida.');
      return;
    }
    if (massEditBankAccount && !massBankAccountValue) {
      setMassActionError('Por favor selecciona una cuenta de pago.');
      return;
    }
    if (massEditStatus && !massStatusValue) {
      setMassActionError('Por favor selecciona un estado.');
      return;
    }

    setIsMassUpdateConfirmOpen(true);
  };

  const executeMassChange = () => {
    const updateData: Partial<FinancialTransaction> = {};

    if (massEditCategory) {
      updateData.categoryId = massCategoryValue;
      const firstSub = catalogs['Subcategorías']?.find(s => s.parentId === massCategoryValue);
      updateData.subcategory = firstSub ? firstSub.id : '';
    }

    if (massEditSubcategory) {
      updateData.subcategory = massSubcategoryValue;
    }

    if (massEditCurrency) {
      updateData.currency = massCurrencyValue as any;
    }

    if (massEditExchangeRate) {
      updateData.exchangeRate = parseFloat(massExchangeRateValue);
    }

    if (massEditDate) {
      updateData.date = massDateValue;
    }

    if (massEditBankAccount) {
      updateData.bankAccountId = massBankAccountValue;
    }

    if (massEditStatus) {
      updateData.status = massStatusValue as any;
    }

    selectedFinTxIds.forEach(id => {
      const dataToApply = { ...updateData };
      const currentTx = filteredTransactions.find(tx => tx.id === id);
      if (currentTx) {
        let newCurrency = dataToApply.currency !== undefined ? dataToApply.currency : currentTx.currency;
        let newRate = dataToApply.exchangeRate !== undefined ? dataToApply.exchangeRate : currentTx.exchangeRate;
        
        if (dataToApply.currency !== undefined || dataToApply.exchangeRate !== undefined) {
          const baseAmt = currentTx.originalAmount || currentTx.amount;
          const ivaToUse = currentTx.iva || 0;
          
          if (newCurrency === 'MXN') {
            dataToApply.amountMXN = baseAmt + ivaToUse;
            dataToApply.finalAmount = (baseAmt + ivaToUse) / (newRate || 1);
            dataToApply.amount = baseAmt + ivaToUse;
          } else {
            dataToApply.amountMXN = baseAmt * (newRate || 1);
            dataToApply.finalAmount = baseAmt;
            dataToApply.amount = baseAmt;
          }
        }
      }
      updateFinancialTransaction(id, dataToApply);
    });
    
    setSelectedFinTxIds([]);
    setMassEditCategory(false);
    setMassEditSubcategory(false);
    setMassEditCurrency(false);
    setMassEditExchangeRate(false);
    setMassEditDate(false);
    setMassEditBankAccount(false);
    setMassEditStatus(false);
    setMassCategoryValue('');
    setMassSubcategoryValue('');
    setMassCurrencyValue('');
    setMassExchangeRateValue('');
    setMassDateValue('');
    setMassBankAccountValue('');
    setMassStatusValue('');
    setIsMassUpdateConfirmOpen(false);
  };

  const handleDeleteMass = () => {
    if (selectedFinTxIds.length === 0) return;
    setMassActionError(null);
    setIsMassDeleteConfirmOpen(true);
  };

  const executeMassDelete = () => {
    selectedFinTxIds.forEach(id => {
      deleteFinancialTransaction(id);
    });
    setSelectedFinTxIds([]);
    setIsMassDeleteConfirmOpen(false);
  };

  const visibleFinancialTransactions = useMemo(() => {
    if (currentUser?.role === 'Coordinador') {
      const coordInstId = currentUser?.institutionId;
      return (financialTransactions || []).filter(tx => 
        tx.type === 'income' && (
          tx.institutionId === coordInstId ||
          (tx.studentId && students.find(s => s.id === tx.studentId)?.institutionId === coordInstId)
        )
      );
    }
    return financialTransactions || [];
  }, [financialTransactions, currentUser, students]);

  const exchangeRateUSD = 18.0;

  const averageUsdRate = useMemo(() => {
    const usdRates = visibleFinancialTransactions
      .map(t => {
        if (t.exchangeRate && t.exchangeRate > 1) {
          return t.exchangeRate;
        }
        if ((t.currency === 'USD' || t.originalCurrency === 'USD') && t.amount > 0 && t.amountMXN > t.amount) {
          return t.amountMXN / t.amount;
        }
        return null;
      })
      .filter((r): r is number => r !== null && r > 1);

    return usdRates.length > 0
      ? usdRates.reduce((acc, val) => acc + val, 0) / usdRates.length
      : 18.0;
  }, [visibleFinancialTransactions]);

  const filteredTransactions = useMemo(() => {
    return visibleFinancialTransactions.filter(tx => {
      let matches = true;
      if (activeTab === 'Ingresos' && tx.type !== 'income') matches = false;
      if (activeTab === 'Egresos' && tx.type !== 'expense') matches = false;
      if (dateRange.start && tx.date < dateRange.start) matches = false;
      if (dateRange.end && tx.date > dateRange.end) matches = false;
      if (providerFilter && tx.providerId?.toString() !== providerFilter) matches = false;
      if (clientFilter && tx.studentId?.toString() !== clientFilter) matches = false;
      if (categoryFilter && tx.categoryId !== categoryFilter) matches = false;
      if (subcategoryFilter && tx.subcategory !== subcategoryFilter) matches = false;
      if (statusFilter && tx.status !== statusFilter) matches = false;
      if (institutionFilter) {
        const studentObj = tx.studentId ? studentsMap.get(tx.studentId) : null;
        const txInstId = tx.institutionId?.toString() || studentObj?.institutionId?.toString();
        if (txInstId !== institutionFilter) matches = false;
      }
      if (bankAccountFilter) {
        if (bankAccountFilter === 'efectivo') {
          const hasAccount = bankAccounts?.some(acc => 
            tx.bankAccountId?.toString() === acc.id.toString() || 
            tx.bankAccountId?.toString() === acc.bankName ||
            (acc.bankName === "Banorte" && tx.bankAccountId === "Banorte") ||
            (acc.bankName === "WellsFargo USA" && tx.bankAccountId === "WellsFargo USA")
          );
          if (hasAccount && tx.bankAccountId !== 'Efectivo / Caja General') {
            matches = false;
          }
        } else {
          const matchedAcc = bankAccounts?.find(b => b.id.toString() === bankAccountFilter || b.bankName === bankAccountFilter);
          if (matchedAcc) {
            const isAccTx = tx.bankAccountId?.toString() === matchedAcc.id.toString() || 
                            tx.bankAccountId?.toString() === matchedAcc.bankName ||
                            (matchedAcc.bankName === "Banorte" && tx.bankAccountId === "Banorte") ||
                            (matchedAcc.bankName === "WellsFargo USA" && tx.bankAccountId === "WellsFargo USA");
            if (!isAccTx) matches = false;
          } else {
            if (tx.bankAccountId?.toString() !== bankAccountFilter) matches = false;
          }
        }
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        if (!tx.description.toLowerCase().includes(lowerSearch) && 
            !tx.subcategory.toLowerCase().includes(lowerSearch)) {
          matches = false;
        }
      }
      return matches;
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [visibleFinancialTransactions, activeTab, dateRange, providerFilter, clientFilter, categoryFilter, subcategoryFilter, statusFilter, institutionFilter, bankAccountFilter, bankAccounts, searchTerm, sortOrder, studentsMap]);

  // Reset pagination on any filter trigger or search trigger
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateRange, providerFilter, clientFilter, categoryFilter, subcategoryFilter, statusFilter, institutionFilter, bankAccountFilter, searchTerm, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const paymentErrors = useMemo(() => {
    const errorsList: Array<{
      id: string;
      tx: any;
      type: 'amount_zero' | 'exchange_rate_invalid' | 'orphan_tx' | 'missing_category' | 'invalid_date';
      typeName: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
      originalEntry: string;
    }> = [];

    visibleFinancialTransactions.forEach((tx) => {
      // 1. Amount <= 0
      if (!tx.amount || tx.amount <= 0) {
        errorsList.push({
          id: `${tx.id}-amount`,
          tx,
          type: 'amount_zero',
          typeName: 'Monto Inválido',
          description: `Monto inválido ($${tx.amount || 0}) para la transacción: "${tx.description}". Debe ser mayor que cero.`,
          severity: 'high',
          originalEntry: tx.description
        });
      }

      // 2. Exchange rate 0/negative in USD
      if (tx.currency === 'USD' && (!tx.exchangeRate || tx.exchangeRate <= 0)) {
        errorsList.push({
          id: `${tx.id}-rate`,
          tx,
          type: 'exchange_rate_invalid',
          typeName: 'T.C. Inválido',
          description: `Tipo de cambio inválido o nulo (${tx.exchangeRate || 0}) para transacción en USD ("${tx.description}").`,
          severity: 'medium',
          originalEntry: tx.description
        });
      }

      // 3. Orphan transaction (no relation)
      if (!tx.studentId && !tx.providerId && !tx.institutionId && !tx.agentId) {
        errorsList.push({
          id: `${tx.id}-orphan`,
          tx,
          type: 'orphan_tx',
          typeName: 'Transacción Huérfana',
          description: `Transacción huérfana ("${tx.description}"). No está vinculada a ningún Alumno, Institución, Agente ni Proveedor.`,
          severity: 'high',
          originalEntry: tx.description
        });
      }

      // 4. Missing classification
      if (!tx.categoryId || tx.categoryId.trim() === '') {
        errorsList.push({
          id: `${tx.id}-category`,
          tx,
          type: 'missing_category',
          typeName: 'Sin Categoría',
          description: `Clasificación faltante. La transacción "${tx.description}" no tiene una categoría asignada.`,
          severity: 'medium',
          originalEntry: tx.description
        });
      }

      // 5. Invalid date or future date
      if (!tx.date || isNaN(Date.parse(tx.date))) {
        errorsList.push({
          id: `${tx.id}-date`,
          tx,
          type: 'invalid_date',
          typeName: 'Fecha Inválida',
          description: `Formato de fecha inválido o vacío para la transacción "${tx.description}".`,
          severity: 'high',
          originalEntry: tx.description
        });
      } else {
        const txTime = new Date(tx.date).getTime();
        const nowTime = new Date().getTime();
        if (txTime > nowTime + 86400000 * 2) { // Allow up to 2 days future for timezones
          errorsList.push({
            id: `${tx.id}-future-date`,
            tx,
            type: 'invalid_date',
            typeName: 'Fecha Futura',
            description: `Alerta de fecha futura (${tx.date}) vinculada a la transacción "${tx.description}".`,
            severity: 'low',
            originalEntry: tx.description
          });
        }
      }
    });

    return errorsList;
  }, [visibleFinancialTransactions]);

  const getTxAmountInAccountCurrency = (tx: any, targetCurrency: 'MXN' | 'USD') => {
    if (tx.currency === targetCurrency) {
      return tx.amount;
    }
    const rate = tx.exchangeRate || 18.0;
    if (targetCurrency === 'MXN') {
      return tx.amountMXN || (tx.amount * rate);
    } else {
      return (tx.amountMXN || tx.amount) / (rate > 0 ? rate : 18.0);
    }
  };

  const accountStats = useMemo(() => {
    const list = bankAccounts || [];
    
    const statsMap = list.map(acc => {
      let income = 0;
      let expense = 0;
      let opCount = 0;
      const accCurrency = (acc.currency || 'MXN') as 'MXN' | 'USD';

      filteredTransactions.forEach(tx => {
        const isMatched = tx.bankAccountId?.toString() === acc.id.toString() || 
                          tx.bankAccountId?.toString() === acc.bankName ||
                          (acc.bankName.includes("Banorte") && tx.bankAccountId?.toString().includes("Banorte")) ||
                          (acc.bankName.includes("WellsFargo") && tx.bankAccountId?.toString().toLowerCase().includes("wellsfargo")) ||
                          (acc.bankName.includes("WellsFargo") && tx.bankAccountId?.toString().toLowerCase().includes("wf")) ||
                          (acc.bankName.includes("BBVA") && tx.bankAccountId?.toString().includes("BBVA")) ||
                          (acc.bankName === "Banorte PEM MXN" && tx.bankAccountId === "Banorte") ||
                          (acc.bankName === "WellsFargo USD" && tx.bankAccountId === "WellsFargo USA");

        if (isMatched) {
          opCount++;
          const amountInAccCurr = getTxAmountInAccountCurrency(tx, accCurrency);
          if (tx.type === 'income') {
            income += amountInAccCurr;
          } else {
            expense += amountInAccCurr;
          }
        }
      });

      return {
        id: acc.id.toString(),
        name: acc.bankName,
        number: acc.accountNumber || acc.clabe || 'No esp.',
        currency: accCurrency,
        income,
        expense,
        balance: income - expense,
        opCount
      };
    });

    let cashIncome = 0;
    let cashExpense = 0;
    let cashOpCount = 0;
    filteredTransactions.forEach(tx => {
      const hasAccount = list.some(acc => 
        tx.bankAccountId?.toString() === acc.id.toString() || 
        tx.bankAccountId?.toString() === acc.bankName ||
        (acc.bankName.includes("Banorte") && tx.bankAccountId?.toString().includes("Banorte")) ||
        (acc.bankName.includes("WellsFargo") && tx.bankAccountId?.toString().toLowerCase().includes("wellsfargo")) ||
        (acc.bankName.includes("WellsFargo") && tx.bankAccountId?.toString().toLowerCase().includes("wf")) ||
        (acc.bankName.includes("BBVA") && tx.bankAccountId?.toString().includes("BBVA")) ||
        (acc.bankName === "Banorte PEM MXN" && tx.bankAccountId === "Banorte") ||
        (acc.bankName === "WellsFargo USD" && tx.bankAccountId === "WellsFargo USA")
      );

      if (!hasAccount) {
        cashOpCount++;
        const amountInMXN = tx.amountMXN || tx.amount;
        if (tx.type === 'income') {
          cashIncome += amountInMXN;
        } else {
          cashExpense += amountInMXN;
        }
      }
    });

    return [
      ...statsMap,
      {
        id: 'efectivo',
        name: 'Efectivo / Caja General',
        number: 'Caja General',
        currency: 'MXN' as const,
        income: cashIncome,
        expense: cashExpense,
        balance: cashIncome - cashExpense,
        opCount: cashOpCount
      }
    ];
  }, [filteredTransactions, bankAccounts]);

  const stats = useMemo(() => {
    let incomeMXN = 0;
    let incomeUSD = 0;
    let expenseMXN = 0;
    let ivaMXNTotal = 0;
    let ivaUSDTotal = 0;
    let totalIncomeMXNCompleto = 0;
    let totalIncomeUSDCompleto = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
        const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;

        const txAmountMXN = isOrigUSD 
          ? (hasCustomRate 
              ? (tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate)
              : ((tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * averageUsdRate))
          : (tx.amountMXN || tx.amount);

        const txAmountUSD = isOrigUSD
          ? (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount)
          : (hasCustomRate 
              ? (txAmountMXN / tx.exchangeRate)
              : (txAmountMXN / averageUsdRate));

        let ivaMXN = 0;
        let ivaUSD = 0;
        if (tx.iva !== undefined) {
          ivaMXN = tx.iva * (tx.currency === 'MXN' ? 1 : (isOrigUSD ? (hasCustomRate ? tx.exchangeRate : averageUsdRate) : (tx.exchangeRate || 18.0)));
          ivaUSD = isOrigUSD 
            ? tx.iva 
            : (hasCustomRate ? tx.iva / tx.exchangeRate : tx.iva / averageUsdRate);
        } else {
          const student = tx.studentId ? studentsMap.get(tx.studentId) : null;
          const matchedInstId = tx.institutionId || student?.institutionId;
          const matchedInst = matchedInstId ? institutionsMap.get(Number(matchedInstId)) : null;
          if (matchedInst?.payWithIva) {
            ivaMXN = txAmountMXN * 0.16;
            ivaUSD = txAmountUSD * 0.16;
          }
        }
        ivaMXNTotal += ivaMXN;
        ivaUSDTotal += ivaUSD;
        incomeMXN += (txAmountMXN - ivaMXN);
        incomeUSD += (txAmountUSD - ivaUSD);
        totalIncomeMXNCompleto += txAmountMXN;
        totalIncomeUSDCompleto += txAmountUSD;
      } else {
        expenseMXN += tx.amountMXN;
      }
    });

    const conversion = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
    
    return {
      income: incomeMXN * conversion,
      expense: expenseMXN * conversion,
      profit: (incomeMXN - expenseMXN) * conversion,
      ivaMXNTotal,
      ivaUSDTotal,
      totalIncomeMXNCompleto,
      totalIncomeUSDCompleto,
      incomeMXN,
      incomeUSD
    };
  }, [filteredTransactions, viewCurrency, institutionsMap, studentsMap, averageUsdRate]);

  const chartData = useMemo(() => {
    // group by month
    const monthly: Record<string, { month: string, Ingresos: number, Egresos: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const monthObj = new Date(tx.date);
      const month = `${monthObj.getFullYear()}-${String(monthObj.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[month]) monthly[month] = { month, Ingresos: 0, Egresos: 0 };
      
      const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
      if (tx.type === 'income') {
        let ivaMXN = 0;
        if (tx.currency === 'MXN') {
          if (tx.iva !== undefined) {
            ivaMXN = tx.iva;
          } else {
            const student = tx.studentId ? studentsMap.get(tx.studentId) : null;
            const matchedInstId = tx.institutionId || student?.institutionId;
            const matchedInst = matchedInstId ? institutionsMap.get(Number(matchedInstId)) : null;
            if (matchedInst?.payWithIva) {
              ivaMXN = tx.amountMXN * 0.16;
            }
          }
        }
        monthly[month].Ingresos += (tx.amountMXN - ivaMXN) * conv;
      } else {
        monthly[month].Egresos += tx.amountMXN * conv;
      }
    });

    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions, viewCurrency, institutionsMap, studentsMap]);

  const pieData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(tx => {
      const cat = categoriesMap.get(tx.categoryId)?.name || 'Otros';
      if (!cats[cat]) cats[cat] = 0;
      const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
      cats[cat] += tx.amountMXN * conv;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions, categoriesMap, viewCurrency]);

  const annualChartData = useMemo(() => {
    const yearStr = selectedYear.toString();
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, '0');
      const monthLabel = `${yearStr}-${monthNum}`;
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      return {
        monthKey: monthLabel,
        name: monthNames[i],
        Ingresos: 0,
        Egresos: 0
      };
    });

    filteredTransactions.forEach(tx => {
      if (!tx.date || !tx.date.startsWith(yearStr)) return;
      const monthPart = tx.date.split('-')[1];
      const monthIdx = parseInt(monthPart, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
        if (tx.type === 'income') {
          let ivaMXN = 0;
          if (tx.currency === 'MXN') {
            if (tx.iva !== undefined) {
              ivaMXN = tx.iva;
            } else {
              const student = tx.studentId ? studentsMap.get(tx.studentId) : null;
              const matchedInstId = tx.institutionId || student?.institutionId;
              const matchedInst = matchedInstId ? institutionsMap.get(Number(matchedInstId)) : null;
              if (matchedInst?.payWithIva) {
                ivaMXN = tx.amountMXN * 0.16;
              }
            }
          }
          monthsData[monthIdx].Ingresos += (tx.amountMXN - ivaMXN) * conv;
        } else {
          monthsData[monthIdx].Egresos += tx.amountMXN * conv;
        }
      }
    });

    return monthsData;
  }, [filteredTransactions, selectedYear, viewCurrency, institutionsMap, studentsMap]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    visibleFinancialTransactions.forEach(tx => {
      if (tx.date) {
        const yr = new Date(tx.date).getFullYear();
        if (!isNaN(yr)) {
          years.add(yr);
        }
      }
    });
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [visibleFinancialTransactions]);

  const handleClearFilters = () => {
    setDateRange({ start: '', end: '' });
    setProviderFilter('');
    setClientFilter('');
    setCategoryFilter('');
    setSubcategoryFilter('');
    setInstitutionFilter('');
    setBankAccountFilter('');
    setStatusFilter('');
    setSearchTerm('');
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Descripción', 'Monto Original', 'Moneda', 'TC', 'Monto MXN'];
    const rows = filteredTransactions.map(tx => [
      tx.date,
      tx.type === 'income' ? 'Ingreso' : 'Egreso',
      catalogs['Categorías']?.find(c => c.id === tx.categoryId)?.name || '',
      catalogs['Subcategorías']?.find(s => s.id === tx.subcategory)?.name || tx.subcategory,
      tx.description,
      tx.amount.toString(),
      tx.currency,
      tx.exchangeRate.toString(),
      tx.amountMXN.toString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transacciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddBtnClick = (type: 'income' | 'expense') => {
    setEditingTransaction(null);
    setFormType(type);
    setIsModalOpen(true);
  };
  const handleEditTransaction = (tx: any) => {
    setEditingTransaction(tx);
    setFormType(tx.type);
    setIsModalOpen(true);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [selectedOcrIds, setSelectedOcrIds] = useState<string[]>([]);
  const [ocrTabType, setOcrTabType] = useState<'all' | 'income' | 'expense'>('all');

  // Bulk action states
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkSubcategory, setBulkSubcategory] = useState<string>('');
  const [bulkType, setBulkType] = useState<string>('');

  const handleApplyBulkChanges = () => {
    if (selectedOcrIds.length === 0) return;
    
    selectedOcrIds.forEach(id => {
      const updates: any = {};
      if (bulkCategoryId) {
        updates.categoryId = bulkCategoryId;
        updates.subcategory = bulkSubcategory;
      }
      if (bulkType) {
        updates.type = bulkType as 'income' | 'expense';
      }
      updateStatementTransaction(id, updates);
    });
    
    // Clear selections so changes are visible without residual drop-down values
    setBulkCategoryId('');
    setBulkSubcategory('');
    setBulkType('');
  };

  const handleBulkDeleteOcr = () => {
    if (selectedOcrIds.length === 0) return;
    if (window.confirm(`¿Seguro que desea ignorar/eliminar las ${selectedOcrIds.length} transacciones seleccionadas del estado de cuenta?`)) {
      selectedOcrIds.forEach(id => {
        deleteStatementTransaction(id);
      });
      setSelectedOcrIds([]);
    }
  };

  const parseStatementLocally = (file: File, serverError?: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string || '';
        const lines = text.split(/\r?\n/);
        const extracted: any[] = [];
        const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/;
        
        for (const line of lines) {
          if (!line.trim()) continue;
          const matchDate = line.match(dateRegex);
          if (matchDate) {
            const dateStr = matchDate[0];
            const parts = line.split(/[,;\t]/);
            let description = 'TRANSFERENCIA BANCARIA';
            let amount = 1000;
            
            if (parts.length > 1) {
              const numParts = parts.map(p => {
                const cleaned = p.replace(/[^0-9.-]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
              });
              
              const textParts = parts.filter(p => isNaN(parseFloat(p.trim())) && p.trim().length > 3);
              if (textParts.length > 0) {
                description = textParts[0].trim().toUpperCase();
              }
              
              const validNums = numParts.filter((n): n is number => n !== null && n > 0);
              if (validNums.length > 0) {
                amount = validNums[0];
              }
            }
            
            const type = description.includes('PAGO') || description.includes('COMPRA') || description.includes('EGRESO') || description.includes('RETIRO') || description.includes('COMISION') ? 'expense' : 'income';
            
            extracted.push({
              date: dateStr.replace(/\//g, '-'),
              description,
              amount,
              type
            });
          }
        }
        
        if (extracted.length < 3) {
          // Reject with server error or clear format error rather than injecting mock May transactions
          const errorMsg = serverError 
            ? `El servicio de OCR en la nube falló: ${serverError}` 
            : "No se pudieron extraer transacciones de este archivo. Asegúrese de que sea un estado de cuenta bancario válido o un formato estructurado.";
          reject(new Error(errorMsg));
          return;
        }
        
        resolve(extracted);
      };
      reader.onerror = () => {
        reject(new Error("Error leyendo el archivo localmente."));
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      
      let finalTransactions: any[] = [];
      let isFallbackUsed = false;

      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/parse-statement', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          let errText = '';
          try {
            const errJson = await response.json();
            errText = errJson.error || JSON.stringify(errJson);
          } catch {
            errText = await response.text();
          }
          throw new Error(`Error en el servidor OCR: ${errText}`);
        }
        
        let extractedData = await response.json();
        
        if (!Array.isArray(extractedData)) {
          extractedData = [];
        }
        finalTransactions = extractedData;
      } catch (error: any) {
        console.warn("Backend OCR not available (e.g. Vercel SPA deployment). Switching to high-fidelity browser client-parser fallback.", error);
        isFallbackUsed = true;
        finalTransactions = await parseStatementLocally(file, error?.message || String(error));
      }

      try {
        const processedTx: Omit<StatementTransaction, "id" | "statementId" | "saved" | "reconciled">[] = finalTransactions.map((item: any) => {
          const descClean = (item.description || '').toLowerCase();
          
          let matchedStudentId: number | undefined = undefined;
          let matchedInstitutionId: number | undefined = undefined;

          // 1. Search for students
          for (const s of students) {
            const fullNameClean = `${s.name || ''} ${s.lastName || ''}`.toLowerCase().trim();
            const preferredClean = (s.preferredName || '').toLowerCase().trim();
            const lastNameClean = (s.lastName || '').toLowerCase().trim();
            const firstNameClean = (s.name || '').toLowerCase().trim();

            if (fullNameClean && fullNameClean.length > 5 && descClean.includes(fullNameClean)) {
              matchedStudentId = s.id;
              matchedInstitutionId = s.institutionId || undefined;
              break;
            } else if (preferredClean && preferredClean.length > 3 && descClean.includes(preferredClean)) {
              matchedStudentId = s.id;
              matchedInstitutionId = s.institutionId || undefined;
              break;
            } else if (firstNameClean && firstNameClean.length > 3 && lastNameClean && lastNameClean.length > 3 && 
                       descClean.includes(firstNameClean) && descClean.includes(lastNameClean)) {
              matchedStudentId = s.id;
              matchedInstitutionId = s.institutionId || undefined;
              break;
            }
          }

          // 2. If no student matched, search for institutions by name/tradeName
          if (!matchedStudentId) {
            for (const inst of institutions) {
              const instNameClean = (inst.name || '').toLowerCase().trim();
              const tradeNameClean = (inst.tradeName || '').toLowerCase().trim();

              if (instNameClean && instNameClean.length > 3 && descClean.includes(instNameClean)) {
                matchedInstitutionId = inst.id;
                break;
              } else if (tradeNameClean && tradeNameClean.length > 3 && descClean.includes(tradeNameClean)) {
                matchedInstitutionId = inst.id;
                break;
              }
            }
          }

          return {
            date: item.date || new Date().toISOString().split('T')[0],
            description: item.description || 'Desconocido',
            amount: Number(item.amount) || 0,
            type: item.type === 'income' ? 'income' : 'expense',
            categoryId: catalogs['Categorías']?.find(c => !c.type || c.type === 'anual' || c.type === (item.type === 'income' ? 'income' : 'expense'))?.id || '',
            subcategory: '',
            studentId: matchedStudentId,
            institutionId: matchedInstitutionId,
          };
        });

        let inC = 0;
        let exC = 0;
        processedTx.forEach(t => t.type === 'income' ? inC += t.amount : exC += t.amount);

        addAccountStatement({
          filename: file.name + (isFallbackUsed ? " (Extractor Local)" : ""),
          totalOperations: processedTx.length,
          totalIncome: inC,
          totalExpense: exC
        }, processedTx);
        
      } catch (error: any) {
        console.error("Local parsing instantiation error:", error);
        alert(`Hubo un error al procesar el estado de cuenta: ${error.message || String(error)}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveStatementTransaction = (stTx: StatementTransaction) => {
    // Find linked student
    const matchedStudent = stTx.studentId ? students.find(s => s.id === stTx.studentId) : undefined;
    const isHomeschool = matchedStudent?.modality?.toLowerCase() === 'homeschool';
    
    // Homeschool students generate commission for the agent, so we map agentId
    const resolvedAgentId = (isHomeschool && matchedStudent?.agentId) 
      ? Number(matchedStudent.agentId) 
      : currentUser?.id;

    // Add to actual financial transactions
    addFinancialTransaction({
      agentId: resolvedAgentId,
      date: stTx.date,
      description: stTx.description,
      amount: stTx.amount,
      currency: 'MXN', // assume MXN for simple OCR
      exchangeRate: 1.0,
      categoryId: stTx.categoryId,
      subcategory: stTx.subcategory,
      paymentMethod: 'Transferencia',
      type: stTx.type,
      status: 'Aplicado',
      studentId: stTx.studentId,
      institutionId: stTx.institutionId,
    });
    
    // Mark as saved and reconciled
    updateStatementTransaction(stTx.id, { saved: true, reconciled: true });
  };

  const handleToggleOcrId = (id: string) => {
    setSelectedOcrIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleAllOcr = (filteredTxs: StatementTransaction[]) => {
    const unsaved = filteredTxs.filter(t => !t.saved).map(t => t.id);
    if (selectedOcrIds.length === unsaved.length && unsaved.length > 0) {
      setSelectedOcrIds([]);
    } else {
      setSelectedOcrIds(unsaved);
    }
  };

  const handleBulkSaveOcr = () => {
    const txsToSave = statementTransactions.filter(t => selectedOcrIds.includes(t.id) && !t.saved);
    txsToSave.forEach(stTx => {
      handleSaveStatementTransaction(stTx);
    });
    setSelectedOcrIds([]);
  };

  const handleSaveModalLink = (reconcileAfterSaving?: boolean) => {
    if (!selectedOcrToLink) return;

    const updateData: Partial<StatementTransaction> = {
      categoryId: modalCategoryId,
      subcategory: modalSubcategory,
    };
    
    if (modalRelationType === 'institution') {
      updateData.institutionId = modalInstId ? Number(modalInstId) : undefined;
      updateData.studentId = undefined; // clear student
    } else if (modalRelationType === 'homeschool') {
      updateData.studentId = modalStudentId ? Number(modalStudentId) : undefined;
      // Fetch if this student is connected to an institution, otherwise clear
      const selectedSt = students.find(s => s.id === Number(modalStudentId));
      updateData.institutionId = selectedSt?.institutionId;
    } else {
      updateData.studentId = undefined;
      updateData.institutionId = undefined;
    }

    // Update the transaction details
    updateStatementTransaction(selectedOcrToLink.id, updateData);

    if (reconcileAfterSaving) {
      const updatedTx: StatementTransaction = {
        ...selectedOcrToLink,
        ...updateData,
      };
      handleSaveStatementTransaction(updatedTx);
    }

    setSelectedOcrToLink(null);
  };

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat('es-MX', { style: 'currency', currency: viewCurrency }).format(val);
    if (viewCurrency === 'USD') {
      const equivMXN = val * exchangeRateUSD;
      const formattedMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(equivMXN);
      return `${formatted} USD (${formattedMXN} MXN)`;
    }
    return `${formatted} MXN`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Finanzas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión integral de ingresos y egresos multidivisa.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {currentUser?.role !== 'Coordinador' && (
              <button
                onClick={() => setActiveTab('Dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => setActiveTab('Ingresos')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Ingresos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {currentUser?.role === 'Coordinador' ? 'Ingresos / Historial de Pagos' : 'Ingresos'}
            </button>
            {currentUser?.role !== 'Coordinador' && (
              <>
                <button
                  onClick={() => setActiveTab('Egresos')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Egresos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Egresos
                </button>
                <button
                  onClick={() => setActiveTab('OCR')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'OCR' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  OCR / Conciliación
                </button>
                <button
                  onClick={() => setActiveTab('Errores')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'Errores' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span>Control de Errores</span>
                  {(paymentErrors.length > 0 || syncErrors.length > 0) && (
                    <span className="flex h-5 px-1.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                      {paymentErrors.length + syncErrors.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
          
          {(activeTab === 'Dashboard' || activeTab === 'Ingresos' || activeTab === 'Egresos') && (
            <>
              <div className="relative group">
                <select 
                  value={viewCurrency} 
                  onChange={(e) => setViewCurrency(e.target.value as 'MXN'|'USD')}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-xl text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="MXN">Ver en MXN</option>
                  <option value="USD">Ver en USD</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <RefreshCcw className="w-4 h-4" />
                </div>
              </div>
              <button 
                onClick={() => handleAddBtnClick('income')}
                className="flex items-center bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4 mr-2" /> Ingreso
              </button>
              {currentUser?.role !== 'Coordinador' && (
                <button 
                  onClick={() => handleAddBtnClick('expense')}
                  className="flex items-center bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20"
                >
                  <Plus className="w-4 h-4 mr-2" /> Egreso
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {(activeTab === 'Dashboard' || activeTab === 'Ingresos' || activeTab === 'Egresos') && (
        <>
          <div className={`grid grid-cols-1 ${currentUser?.role === 'Coordinador' ? 'max-w-md' : 'md:grid-cols-3'} gap-6`}>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Ventas Totales</p>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(stats.totalIncomeMXNCompleto)} MXN
              </h2>
              <p className="text-lg font-bold text-indigo-600 tracking-tight">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalIncomeUSDCompleto)} USD
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1 text-xs text-slate-550 font-medium border-t border-slate-100 pt-2.5">
              <div>
                IVA: <span className="font-bold text-emerald-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(stats.ivaMXNTotal)} MXN</span>
                <span className="text-slate-400 font-normal ml-1">({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.ivaUSDTotal)} USD)</span>
              </div>
              <div className="text-[10.5px] text-slate-450">
                Subtotal (sin IVA): <span className="font-semibold text-slate-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(stats.incomeMXN)} MXN</span>
                <span className="text-slate-400 font-normal ml-1">({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.incomeUSD)} USD)</span>
              </div>
            </div>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-500 absolute bottom-6 right-6 opacity-80" />
        </div>
        {currentUser?.role !== 'Coordinador' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Egresos Totales</p>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.expense)}</h2>
            </div>
            <TrendingDown className="w-6 h-6 text-rose-500 absolute bottom-6 right-6 opacity-80" />
          </div>
        )}
        {currentUser?.role !== 'Coordinador' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="absolute md:right-10 right-0 top-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full"></div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-1">Utilidad Neta</p>
              <h2 className="text-3xl font-black text-white tracking-tight">{formatCurrency(stats.profit)}</h2>
            </div>
            <DollarSign className="w-6 h-6 text-indigo-400 absolute bottom-6 right-6 opacity-80" />
          </div>
        )}
      </div>

      {/* Resumen por Cuenta de Pago */}
      {(activeTab === 'Dashboard' || activeTab === 'Egresos') && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden my-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-500" />
                Saldos y Resumen por Cuenta de Pago
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">Saldos nativos desglosados y calculados con precisión por cuenta y divisa de registro habitual.</p>
            </div>
            {bankAccountFilter && (
              <button
                onClick={() => setBankAccountFilter('')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
              >
                Mostrar todas las cuentas
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {accountStats.map(acc => {
              const isSelected = bankAccountFilter === acc.id;
              return (
                <div 
                  key={acc.id} 
                  onClick={() => setBankAccountFilter(isSelected ? '' : acc.id)}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden group flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-600/10' 
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className={`font-black text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {acc.name}
                        </h4>
                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {acc.number}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : acc.currency === 'USD' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {acc.currency}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>Ingresos:</span>
                        <span className={`font-semibold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: acc.currency }).format(acc.income)} {acc.currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>Egresos:</span>
                        <span className={`font-semibold ${isSelected ? 'text-white' : 'text-rose-500'}`}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: acc.currency }).format(acc.expense)} {acc.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-5 pt-3 border-t uppercase tracking-wide flex justify-between items-end ${isSelected ? 'border-white/10' : 'border-slate-100'}`}>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>Monto Final (Saldo)</span>
                      <p className={`text-xl font-black mt-0.5 leading-none ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: acc.currency }).format(acc.balance)} <span className="text-xs font-bold">{acc.currency}</span>
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none ${
                      isSelected 
                        ? 'bg-white/15 text-white' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    }`}>
                      {acc.opCount} op.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen Especial de Ingresos por Cuenta y Moneda */}
      {activeTab === 'Ingresos' && (
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden my-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                Ingresos Recaudados (Separados por Cuenta y Divisa Oficial)
              </h3>
              <p className="text-emerald-800/80 text-xs mt-0.5">Control de cobros y pagos de clientes agrupados estrictamente por cuenta de destino y divisa de registro habitual.</p>
            </div>
            {bankAccountFilter && (
              <button
                onClick={() => setBankAccountFilter('')}
                className="text-xs font-black text-emerald-700 bg-white hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-xs cursor-pointer"
              >
                Todas las cuentas
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {accountStats.map(acc => {
              const isSelected = bankAccountFilter === acc.id;
              return (
                <div 
                  key={acc.id} 
                  onClick={() => setBankAccountFilter(isSelected ? '' : acc.id)}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden group flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-600/10' 
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className={`font-black text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {acc.name}
                        </h4>
                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {acc.number}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : acc.currency === 'USD' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {acc.currency}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-5 pt-3 border-t uppercase tracking-wide flex justify-between items-end ${isSelected ? 'border-white/10' : 'border-slate-100'}`}>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>Ingresos Recaudados</span>
                      <p className={`text-xl font-black mt-0.5 leading-none ${isSelected ? 'text-white' : 'text-emerald-750'}`}>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: acc.currency }).format(acc.income)} <span className="text-xs font-bold">{acc.currency}</span>
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none ${
                        isSelected 
                          ? 'bg-white/15 text-white' 
                          : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                      }`}
                    >
                      {acc.opCount} dep.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-6">Tendencia Mensual</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value / 1000}k`} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-6">Egresos por Categoría</h3>
          <div className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No hay datos suficientes
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Financiero Anual Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Resumen Financiero Anual</h3>
            <p className="text-slate-500 text-xs mt-1">Comparativa de ingresos y egresos totales acumulados mensualmente.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annualChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value / 1000}k`} />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="Ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Egresos" name="Egresos" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar transacción..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
              />
            </div>
            
            <input 
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            
            <select 
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubcategoryFilter('');
              }}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Categorías</option>
              {catalogs['Categorías']?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {categoryFilter && (
              <select 
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
              >
                <option value="">Subcategorías</option>
                {catalogs['Subcategorías']
                  ?.filter(s => s.parentId === categoryFilter)
                  ?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            )}

            <select 
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Instituciones</option>
              {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(i => (
                <option key={i.id} value={i.id.toString()}>{i.name}</option>
              ))}
            </select>

            <select 
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Alumnos</option>
              {students.map(s => (
                <option key={s.id} value={s.id.toString()}>{s.name} {s.lastName || ''}</option>
              ))}
            </select>

            <select 
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Proveedores</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>

            <select 
              value={bankAccountFilter}
              onChange={(e) => setBankAccountFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[180px]"
            >
              <option value="">Todas las Cuentas</option>
              {bankAccounts?.map(a => (
                <option key={a.id} value={a.id.toString()}>{a.bankName} ({a.currency || 'MXN'})</option>
              ))}
              <option value="efectivo">Efectivo / Caja General</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Todos los Estados</option>
              <option value="Aplicado">Aplicado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado</option>
              <option value="Programado">Programado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleClearFilters}
              className="text-slate-500 hover:bg-slate-200 px-3 py-2 rounded-xl text-sm font-bold transition flex items-center"
            >
              <X className="w-4 h-4 mr-1" /> Limpiar
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition flex items-center"
            >
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </button>
          </div>
        </div>
        
        {isSuperAdmin && selectedFinTxIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-5 animate-fadeIn flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shadow-sm select-none">
                {selectedFinTxIds.length}
              </div>
              <div>
                <h4 className="font-extrabold text-indigo-900 text-sm">Cambios Masivos</h4>
                <p className="text-xs text-indigo-600 font-medium">Actualiza o elimina los registros seleccionados en lote.</p>
                {massActionError && (
                  <p className="text-xs text-rose-600 font-bold mt-1 bg-red-100/50 border border-red-200 rounded-lg px-2 py-0.5 animate-fadeIn">
                    ⚠️ {massActionError}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                
                {/* Categoría */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <input
                    type="checkbox"
                    checked={massEditCategory}
                    onChange={(e) => setMassEditCategory(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-category"
                  />
                  <label htmlFor="mass-chk-category" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Categoría
                  </label>
                  {massEditCategory && (
                    <select
                      value={massCategoryValue}
                      onChange={(e) => setMassCategoryValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto max-w-[150px]"
                    >
                      <option value="">-- Seleccionar --</option>
                      {catalogs['Categorías']
                        ?.filter(c => !c.type || c.type === 'anual' || (activeTab === 'Ingresos' ? c.type === 'income' : activeTab === 'Egresos' ? c.type === 'expense' : true))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
                    </select>
                  )}
                </div>

                {/* Subcategoría */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <input
                    type="checkbox"
                    checked={massEditSubcategory}
                    onChange={(e) => setMassEditSubcategory(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-subcategory"
                  />
                  <label htmlFor="mass-chk-subcategory" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Subcategoría
                  </label>
                  {massEditSubcategory && (
                    <select
                      value={massSubcategoryValue}
                      onChange={(e) => setMassSubcategoryValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto max-w-[150px]"
                    >
                      <option value="">-- Seleccionar --</option>
                      {catalogs['Subcategorías']
                        ?.filter(s => {
                          if (!massCategoryValue) return true;
                          return s.parentId === massCategoryValue;
                        })
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))
                      }
                    </select>
                  )}
                </div>

                {/* Moneda */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <input
                    type="checkbox"
                    checked={massEditCurrency}
                    onChange={(e) => setMassEditCurrency(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-currency"
                  />
                  <label htmlFor="mass-chk-currency" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Moneda
                  </label>
                  {massEditCurrency && (
                    <select
                      value={massCurrencyValue}
                      onChange={(e) => setMassCurrencyValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto"
                    >
                      <option value="">-- Sel. --</option>
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  )}
                </div>

                {/* Tipo de Cambio */}
                <div className="flex items-center gap-2 min-w-[160px]">
                  <input
                    type="checkbox"
                    checked={massEditExchangeRate}
                    onChange={(e) => setMassEditExchangeRate(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-exrate"
                  />
                  <label htmlFor="mass-chk-exrate" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Tipo Cambio
                  </label>
                  {massEditExchangeRate && (
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Ej. 18.5"
                      value={massExchangeRateValue}
                      onChange={(e) => setMassExchangeRateValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20 ml-auto"
                    />
                  )}
                </div>

                {/* Fecha */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <input
                    type="checkbox"
                    checked={massEditDate}
                    onChange={(e) => setMassEditDate(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-date"
                  />
                  <label htmlFor="mass-chk-date" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Fecha
                  </label>
                  {massEditDate && (
                    <input
                      type="date"
                      value={massDateValue}
                      onChange={(e) => setMassDateValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto"
                    />
                  )}
                </div>

                {/* Cuenta de Pago */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <input
                    type="checkbox"
                    checked={massEditBankAccount}
                    onChange={(e) => setMassEditBankAccount(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-bank"
                  />
                  <label htmlFor="mass-chk-bank" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Cuenta de Pago
                  </label>
                  {massEditBankAccount && (
                    <select
                      value={massBankAccountValue}
                      onChange={(e) => setMassBankAccountValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto max-w-[150px]"
                    >
                      <option value="">-- Sel. Cuenta --</option>
                      {bankAccounts?.map(a => (
                        <option key={a.id} value={a.id.toString()}>{a.bankName}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Estado */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <input
                    type="checkbox"
                    checked={massEditStatus}
                    onChange={(e) => setMassEditStatus(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    id="mass-chk-status"
                  />
                  <label htmlFor="mass-chk-status" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Estado
                  </label>
                  {massEditStatus && (
                    <select
                      value={massStatusValue}
                      onChange={(e) => setMassStatusValue(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-750 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-auto max-w-[150px]"
                    >
                      <option value="">-- Sel. Estado --</option>
                      <option value="Aplicado">Aplicado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Programado">Programado</option>
                    </select>
                  )}
                </div>

                {/* ACCIONES */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleApplyMassChange}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer border-0"
                  >
                    Aplicar Cambios Seleccionados
                  </button>
                  <div className="h-4 w-px bg-slate-200 self-center"></div>
                  <button
                    onClick={handleDeleteMass}
                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 border border-rose-200 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Borrar Seleccionados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                {isSuperAdmin && (
                  <th className="p-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedFinTxIds.includes(tx.id))}
                      onChange={handleToggleSelectAllFin}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-4 font-bold cursor-pointer hover:bg-slate-50 select-none transition-all"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <span className="text-slate-500 font-normal">
                      {sortOrder === 'desc' ? ' ▼' : ' ▲'}
                    </span>
                  </div>
                </th>
                <th className="p-4 font-bold">Detalle</th>
                <th className="p-4 font-bold">Categoría</th>
                <th className="p-4 font-bold">Relacionado</th>
                <th className="p-4 font-bold text-right">Monto Original</th>
                <th className="p-4 font-bold text-right pt-4">T.C.</th>
                <th className="p-4 font-bold text-right text-emerald-700">IVA en MXN</th>
                <th className="p-4 font-bold text-right text-indigo-700">Monto Total</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-right text-indigo-700">Monto Total {viewCurrency}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedTransactions.map(tx => {
                const cat = categoriesMap.get(tx.categoryId);
                const subCat = subcategoriesMap.get(tx.subcategory)?.name || tx.subcategory;
                const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);

                // Relacionado logic
                const matchedStudent = tx.studentId ? studentsMap.get(tx.studentId) : null;
                const matchedInst = tx.institutionId ? institutionsMap.get(tx.institutionId) : null;
                const matchedProvider = tx.providerId ? providersMap.get(tx.providerId) : null;

                let relatedName = '-';
                let relatedType = ''; // 'alumno' | 'institucion' | 'proveedor'
                if (matchedStudent) {
                  relatedName = `${matchedStudent.name} ${matchedStudent.lastName || ''}`.trim();
                  relatedType = 'alumno';
                } else if (matchedInst) {
                  relatedName = matchedInst.name;
                  relatedType = 'institucion';
                } else if (matchedProvider) {
                  relatedName = matchedProvider.legalName || matchedProvider.name;
                  relatedType = 'proveedor';
                }

                // IVA en MXN logic
                const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
                const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;
                
                const txAmountMXN = isOrigUSD 
                  ? (hasCustomRate 
                      ? (tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate)
                      : ((tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * averageUsdRate))
                  : (tx.amountMXN || tx.amount);

                let ivaMXN = 0;
                let originalIva = 0;
                if (tx.iva !== undefined) {
                  originalIva = tx.iva;
                  ivaMXN = tx.iva * (tx.currency === 'MXN' ? 1 : (isOrigUSD ? (hasCustomRate ? tx.exchangeRate : averageUsdRate) : (tx.exchangeRate || 18.0)));
                } else {
                  const studentObj = tx.studentId ? studentsMap.get(tx.studentId) : null;
                  const matchedInstId = tx.institutionId || studentObj?.institutionId;
                  const matchedInstObj = matchedInstId ? institutionsMap.get(Number(matchedInstId)) : null;
                  if (matchedInstObj?.payWithIva) {
                    originalIva = tx.amount * 0.16;
                    ivaMXN = txAmountMXN * 0.16;
                  }
                }

                // Monto Total logic
                const totalOriginal = tx.currency === 'MXN' ? tx.amount : (tx.amount + originalIva);

                return (
                  <tr key={tx.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedFinTxIds.includes(tx.id) ? 'bg-indigo-50/40' : ''}`}>
                    {isSuperAdmin && (
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedFinTxIds.includes(tx.id)}
                          onChange={() => {
                            setSelectedFinTxIds(prev => 
                              prev.includes(tx.id) 
                                ? prev.filter(id => id !== tx.id) 
                                : [...prev, tx.id]
                            );
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{tx.date}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{tx.description}</div>
                      <div className="text-xs text-slate-400 mt-1">{tx.paymentMethod}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className="font-medium text-slate-700">{cat?.name || 'Sin Categoría'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 ml-4">{subCat}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      {relatedType === 'alumno' && (
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                            <span className="truncate max-w-[150px]" title={relatedName}>{relatedName}</span>
                          </div>
                          <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5 ml-3">Alumno</div>
                        </div>
                      )}
                      {relatedType === 'institucion' && (
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span>
                            <span className="truncate max-w-[150px]" title={relatedName}>{relatedName}</span>
                          </div>
                          <div className="text-[10px] text-violet-600 font-bold uppercase tracking-wider mt-0.5 ml-3">Institución</div>
                        </div>
                      )}
                      {relatedType === 'proveedor' && (
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                            <span className="truncate max-w-[150px]" title={relatedName}>{relatedName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 ml-3">Proveedor</div>
                        </div>
                      )}
                      {!relatedType && (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium">
                      <span className="text-slate-800">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.amount) + " " + tx.currency + (tx.currency === 'USD' ? " (~" + new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(txAmountMXN) + " MXN)" : "")}</span>
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400">
                      {isOrigUSD 
                        ? (hasCustomRate ? `${tx.exchangeRate.toFixed(2)} (Registrado)` : `${averageUsdRate.toFixed(2)} (Promedio)`)
                        : tx.exchangeRate.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-semibold text-emerald-600">
                      {ivaMXN > 0 ? (
                        <span>{formatCurrency(ivaMXN)}</span>
                      ) : (
                        <span className="text-slate-350">$0.00</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-extrabold text-indigo-700">
                      <span>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(totalOriginal) + " " + tx.currency}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.status === 'Aplicado' || tx.status === 'Pagado'
                          ? 'bg-emerald-50 text-emerald-750 border border-emerald-100'
                          : tx.status === 'Programado'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {tx.status === 'Aplicado' || tx.status === 'Pagado' ? 'Pagado' : tx.status}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(() => {
                        const totalMXNFull = tx.currency === 'MXN' ? txAmountMXN : (txAmountMXN + ivaMXN);
                        return (
                          <span>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(totalMXNFull * conv)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setViewingTransaction(tx)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Ver detalle">
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        {tx.status === 'Programado' && (
                          <button 
                            onClick={() => handleConfirmScheduledPayment(tx)} 
                            className="p-2 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" 
                            title="Confirmar/Aplicar Pago Programado"
                          >
                            <CheckCircle className="w-4.5 h-4.5" />
                          </button>
                        )}
                        {isSuperAdmin ? (
                          <>
                            <button onClick={() => handleEditWithAuth(tx)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar registro (Superusuario)">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteWithAuth(tx)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar registro (Superusuario)">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="p-1.5 text-[10px] text-slate-300 font-mono select-none" title="Edición/Eliminación restringida a Superusuario">🔒</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 11 : 10} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <SearchX className="w-8 h-8 text-slate-300 mb-3" />
                      <p>No se encontraron transacciones con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredTransactions.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando <span className="font-bold text-slate-705">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(filteredTransactions.length, currentPage * itemsPerPage)}</span> de <span className="font-bold text-slate-705">{filteredTransactions.length}</span> transacciones
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-xs font-mono font-medium text-slate-600 bg-white border border-slate-200 rounded-lg">
                Pág. {currentPage} de {Math.ceil(filteredTransactions.length / itemsPerPage)}
              </span>
              <button
                disabled={currentPage >= Math.ceil(filteredTransactions.length / itemsPerPage)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTransactions.length / itemsPerPage), prev + 1))}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'OCR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10"></div>
              <h3 className="font-bold text-slate-800 mb-2">Importar Estado de Cuenta</h3>
              <p className="text-sm text-slate-500 mb-6">Sube tu estado de cuenta bancario en PDF o Excel. El sistema identificará los movimientos automáticamente.</p>
              
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50 transition-colors relative">
                {isUploading ? (
                  <>
                    <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-indigo-600">Procesando documento...</p>
                    <p className="text-xs text-slate-500 mt-1">Extrayendo transacciones</p>
                  </>
                ) : (
                  <>
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.csv,.xlsx" />
                    <UploadCloud className="w-8 h-8 text-indigo-500 mb-3" />
                    <p className="text-sm font-bold text-slate-700">Haz clic o arrastra un archivo</p>
                    <p className="text-xs text-slate-500 mt-1">Formatos soportados: PDF, CSV, Excel</p>
                  </>
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4">Historial de Documentos Procesados</h3>
              <div className="flex-1 overflow-auto bg-slate-50 rounded-xl border border-slate-100 p-2">
                {accountStatements.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay documentos procesados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accountStatements.slice().reverse().map(stmt => (
                      <div 
                        key={stmt.id} 
                        onClick={() => setSelectedStatementId(stmt.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedStatementId === stmt.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}
                      >
                        <div className="flex justify-between items-center group">
                          <div className="flex items-center">
                            <FileText className={`w-5 h-5 mr-3 ${selectedStatementId === stmt.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <div>
                              <p className="font-bold text-sm text-slate-800">{stmt.filename}</p>
                              <p className="text-xs text-slate-500">{new Date(stmt.uploadDate).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-600">{stmt.totalOperations} Operaciones</p>
                              <div className="flex gap-2 text-[10px] mt-1 font-medium">
                                <span className="text-emerald-600">+{formatCurrency(stmt.totalIncome)}</span>
                                <span className="text-rose-600">-{formatCurrency(stmt.totalExpense)}</span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatementToDelete(stmt.id);
                              }}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Eliminar documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedStatementId && (() => {
            const ocrTxs = statementTransactions.filter(t => t.statementId === selectedStatementId);
            const selectedTxs = ocrTxs.filter(t => selectedOcrIds.includes(t.id));

            // Incomes (Ingresos)
            const incomes = ocrTxs.filter(t => t.type === 'income');
            const incomesCount = incomes.length;
            const incomesAmount = incomes.reduce((sum, t) => sum + t.amount, 0);
            const incomesSaved = incomes.filter(t => t.saved);
            const incomesSavedCount = incomesSaved.length;
            const incomesSavedAmount = incomesSaved.reduce((sum, t) => sum + t.amount, 0);

            // Expenses (Egresos)
            const expenses = ocrTxs.filter(t => t.type === 'expense');
            const expensesCount = expenses.length;
            const expensesAmount = expenses.reduce((sum, t) => sum + t.amount, 0);
            const expensesSaved = expenses.filter(t => t.saved);
            const expensesSavedCount = expensesSaved.length;
            const expensesSavedAmount = expensesSaved.reduce((sum, t) => sum + t.amount, 0);

            // Totals
            const totalCount = ocrTxs.length;
            const totalSavedCount = ocrTxs.filter(t => t.saved).length;
            const totalSavedAmount = ocrTxs.filter(t => t.saved).reduce((sum, t) => sum + t.amount, 0);
            const totalAmount = incomesAmount + expensesAmount; // total absolute sum

            // Filter transactions for the list based on the active tab
            const activeTxs = ocrTxs.filter(t => {
              if (ocrTabType === 'income') return t.type === 'income';
              if (ocrTabType === 'expense') return t.type === 'expense';
              return true;
            });

            const activeUnsavedTxs = activeTxs.filter(t => !t.saved);

            return (
              <div className="space-y-6 mt-6">
                {/* KPI Cards section for Live Reconciliation Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Incomes Progress Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ingresos del Documento</span>
                        <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(incomesAmount)}</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {incomesCount} TRANSAC.
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Conciliación:</span>
                        <span className="font-bold text-slate-700">{incomesSavedCount} / {incomesCount} transac.</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium font-semibold text-slate-500">Monto Conciliado:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(incomesSavedAmount)} / {formatCurrency(incomesAmount)}</span>
                      </div>
                      {/* Minimalist progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${incomesAmount > 0 ? (incomesSavedAmount / incomesAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Progress Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Egresos del Documento</span>
                        <p className="text-xl font-bold text-rose-600 mt-1">{formatCurrency(expensesAmount)}</p>
                      </div>
                      <span className="bg-rose-50 text-rose-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {expensesCount} TRANSAC.
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Conciliación:</span>
                        <span className="font-bold text-slate-700">{expensesSavedCount} / {expensesCount} transac.</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium font-semibold text-slate-500">Monto Conciliado:</span>
                        <span className="font-bold text-rose-600">{formatCurrency(expensesSavedAmount)} / {formatCurrency(expensesAmount)}</span>
                      </div>
                      {/* Minimalist progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                        <div 
                          className="bg-rose-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${expensesAmount > 0 ? (expensesSavedAmount / expensesAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* General Summary Progress Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[100px] -z-0"></div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block relative z-10">Progreso Total de Conciliación</span>
                      <div className="flex justify-between items-end mt-2 relative z-10">
                        <span className="text-2xl font-black">{totalCount > 0 ? Math.round((totalSavedCount / totalCount) * 100) : 0}%</span>
                        <span className="text-xs text-indigo-300 font-mono">{totalSavedCount} de {totalCount} operaciones</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2.5 mt-3 overflow-hidden">
                        <div 
                          className="bg-indigo-400 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${totalCount > 0 ? (totalSavedCount / totalCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 mt-4 pt-3 border-t border-white/10 flex justify-between relative z-10">
                      <span>Monto Total Conciliado:</span>
                      <span className="font-bold text-indigo-300">{formatCurrency(totalSavedAmount)} de {formatCurrency(incomesAmount + expensesAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Highly requested Express Payment Load explanation notice */}
                {activeUnsavedTxs.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50/80 to-indigo-50/35 border border-amber-205/60 rounded-2xl p-4 flex gap-3.5 items-start shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-extrabold text-slate-805 uppercase tracking-wider text-[11px] block mb-0.5">💡 Carga de Pagos Ultrarrápida Interconectada con Bitácora</span>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        Para agilizar la carga masiva de los datos de este estado de cuenta, puedes presionar el botón <strong className="font-bold text-slate-800">"Carga Express ({activeUnsavedTxs.length})"</strong> que se encuentra abajo en el panel. 
                        Esto importará todas las transacciones pendientes a la contabilidad general de inmediato en background. 
                        Cualquier inconsistencia detectada (como montos vacíos, falta de clasificación o nexo huerfano con alumnos/proveedores) se registrará automáticamente en la <strong className="font-bold text-indigo-700">Bitácora de Errores</strong>, donde podrás editarlas y corregirlas masivamente cuando lo desees, optimizando el tiempo y agilizando la operación.
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Table card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Table header and controls */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <h3 className="font-extrabold text-slate-800 flex items-center text-sm mr-2">
                        <CheckCircle className="w-4 h-4 mr-2 text-indigo-500" />
                        Operaciones del Documento
                      </h3>
                      {/* Segmented Filter Control */}
                      <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => { setOcrTabType('all'); setSelectedOcrIds([]); }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${ocrTabType === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Todas ({ocrTxs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOcrTabType('income'); setSelectedOcrIds([]); }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${ocrTabType === 'income' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Ingresos ({incomes.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOcrTabType('expense'); setSelectedOcrIds([]); }}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${ocrTabType === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Egresos ({expenses.length})
                        </button>
                      </div>
                    </div>

                    {/* Action buttons and selection totals */}
                    {(() => {
                      const selectedTxsInActive = activeTxs.filter(t => selectedOcrIds.includes(t.id));
                      const selectedCount = selectedOcrIds.length;
                      const selectedSum = selectedTxsInActive.reduce((sum, tx) => sum + tx.amount, 0);

                      return (
                        <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto justify-end">
                          <div className="text-right text-xs">
                            <p className="text-indigo-600 font-bold">Seleccionado: <span className="font-extrabold">{formatCurrency(selectedSum)}</span> ({selectedCount} op.)</p>
                          </div>
                          
                          {activeUnsavedTxs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Deseas realizar la carga Express de las ${activeUnsavedTxs.length} transacciones restantes? Cualquier inconsistencia (como falta de categoría o alumno huérfano) se registrará en la Bitácora de Errores automáticamente.`)) {
                                  activeUnsavedTxs.forEach(st => handleSaveStatementTransaction(st));
                                  setSelectedOcrIds([]);
                                }
                              }}
                              className="flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                              title="Importar todas las transacciones as-is de inmediato. Los errores o campos faltantes se enviarán directamente a la Bitácora para corrección rápida."
                            >
                              <UploadCloud className="w-4 h-4 mr-1.5" /> Carga Express ({activeUnsavedTxs.length})
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const txsToSave = activeTxs.filter(t => selectedOcrIds.includes(t.id) && !t.saved);
                              txsToSave.forEach(st => handleSaveStatementTransaction(st));
                              setSelectedOcrIds([]);
                            }}
                            disabled={selectedCount === 0}
                            className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${selectedCount > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Conciliar ({selectedCount})
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {selectedOcrIds.length > 0 && (
                    <div className="bg-indigo-50/75 border-b border-indigo-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className="text-xs font-extrabold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Edición Masiva ({selectedOcrIds.length} seleccionados)
                        </span>
                        
                        {/* Bulk type setting */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo:</label>
                          <select
                            value={bulkType}
                            onChange={(e) => setBulkType(e.target.value)}
                            className="bg-white border border-indigo-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Mantener original</option>
                            <option value="income">Ingreso</option>
                            <option value="expense">Egreso</option>
                          </select>
                        </div>

                        {/* Bulk category setting */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Categoría:</label>
                          <select
                            value={bulkCategoryId}
                            onChange={(e) => {
                              setBulkCategoryId(e.target.value);
                              setBulkSubcategory('');
                            }}
                            className="bg-white border border-indigo-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px]"
                          >
                            <option value="">Mantener original</option>
                            {catalogs['Categorías']?.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Bulk subcategory setting */}
                        {bulkCategoryId && (
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Subcategoría:</label>
                            <select
                              value={bulkSubcategory}
                              onChange={(e) => setBulkSubcategory(e.target.value)}
                              className="bg-white border border-indigo-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px]"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Subcategorías']?.filter(s => s.parentId === bulkCategoryId).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleApplyBulkChanges}
                          disabled={!bulkCategoryId && !bulkType}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            bulkCategoryId || bulkType 
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs' 
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Aplicar cambios
                        </button>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const txsToSave = activeTxs.filter(t => selectedOcrIds.includes(t.id) && !t.saved);
                            txsToSave.forEach(st => handleSaveStatementTransaction(st));
                            setSelectedOcrIds([]);
                          }}
                          className="flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Conciliar {selectedOcrIds.length}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteOcr}
                          className="flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Ignorar ({selectedOcrIds.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOcrIds([])}
                          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table itself */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                          <th className="p-4 font-bold text-center w-10">
                            <input 
                              type="checkbox" 
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                              checked={activeUnsavedTxs.length > 0 && selectedOcrIds.length === activeUnsavedTxs.length}
                              onChange={() => {
                                const unsavedIds = activeUnsavedTxs.map(t => t.id);
                                if (selectedOcrIds.length === unsavedIds.length && unsavedIds.length > 0) {
                                  setSelectedOcrIds([]);
                                } else {
                                  setSelectedOcrIds(unsavedIds);
                                }
                              }}
                              disabled={activeUnsavedTxs.length === 0}
                            />
                          </th>
                          <th className="p-4 font-bold">Fecha</th>
                          <th className="p-4 font-bold">Descripción</th>
                          <th className="p-4 font-bold">Categoría</th>
                          <th className="p-4 font-bold">Subcategoría</th>
                          <th className="p-4 font-bold text-right">Monto</th>
                          <th className="p-4 font-bold text-center">Estado</th>
                          <th className="p-4 font-bold text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {activeTxs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                              No se encontraron transacciones en esta categoría.
                            </td>
                          </tr>
                        ) : (
                          activeTxs.map(tx => {
                            return (
                              <tr key={tx.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedOcrIds.includes(tx.id) ? 'bg-indigo-50/50' : ''}`}>
                                <td className="p-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedOcrIds.includes(tx.id)}
                                    onChange={() => handleToggleOcrId(tx.id)}
                                    disabled={tx.saved}
                                  />
                                </td>
                                <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{tx.date}</td>
                                <td className="p-4 text-slate-800">
                                  <div className="font-bold">{tx.description}</div>
                                  {(tx.institutionId || tx.studentId) && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {tx.institutionId && (
                                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-violet-100">
                                          <Landmark className="w-3 h-3" />
                                          {institutions.find(i => i.id === tx.institutionId)?.name || `Institución #${tx.institutionId}`}
                                        </span>
                                      )}
                                      {tx.studentId && (() => {
                                        const matchedS = students.find(s => s.id === tx.studentId);
                                        return (
                                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                                            <User className="w-3 h-3" />
                                            {matchedS?.name || `Estudiante #${tx.studentId}`}
                                            <span className="text-[9px] text-indigo-400 font-normal italic">(Homeschool)</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <select 
                                    disabled={tx.saved}
                                    value={tx.categoryId} 
                                    onChange={(e) => updateStatementTransaction(tx.id, { categoryId: e.target.value, subcategory: '' })}
                                    className="w-full border border-slate-200 rounded p-1 text-xs outline-none bg-white font-medium text-slate-700"
                                  >
                                    <option value="">Seleccionar...</option>
                                    {catalogs['Categorías']?.filter(c => !c.type || c.type === 'anual' || c.type === tx.type).map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <select 
                                    disabled={tx.saved || !tx.categoryId}
                                    value={tx.subcategory} 
                                    onChange={(e) => updateStatementTransaction(tx.id, { subcategory: e.target.value })}
                                    className="w-full border border-slate-200 rounded p-1 text-xs outline-none bg-white text-slate-600"
                                  >
                                    <option value="">Seleccionar...</option>
                                    {catalogs['Subcategorías']?.filter(s => s.parentId === tx.categoryId).map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </td>
                                <td className="p-4 text-center">
                                  {tx.saved ? (
                                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                      Conciliado
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-center whitespace-nowrap">
                                  {!tx.saved ? (
                                    <div className="flex justify-center items-center gap-1">
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedOcrToLink(tx)} 
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-100 bg-white rounded-lg transition-all shadow-xs" 
                                        title="Ver detalles y Vincular"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleSaveStatementTransaction(tx)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-100 bg-white rounded-lg transition-all shadow-xs" title="Conciliar esta transacción">
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => deleteStatementTransaction(tx.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 border border-slate-100 bg-white rounded-lg transition-all shadow-xs" title="Ignorar transación">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center items-center gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedOcrToLink(tx)} 
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 border border-slate-150 bg-white rounded-lg transition-all shadow-xs" 
                                        title="Ver detalles"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'Errores' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Tabla de Errores e Inconsistencias de Pagos: Bitácora de Errores */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Bitácora de Errores e Inconsistencias de Carga de Pagos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Validación de registros con inconsistencias de montos, tipos de cambio, clasificación o nexos huérfanos.</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-lg ${paymentErrors.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {paymentErrors.length === 0 ? 'Datos 100% Correctos' : `${paymentErrors.length} Registros con Falla`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    <th className="p-4">Detalle / Pago</th>
                    <th className="p-4">Tipo Inconsistencia</th>
                    <th className="p-4">Descripción de la Falla</th>
                    <th className="p-4 text-center">Fecha</th>
                    <th className="p-4 text-center">Monto</th>
                    <th className="p-4 text-center">Gravedad</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paymentErrors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center p-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-100 font-bold lg:text-lg">
                            ✓
                          </div>
                          <p className="font-bold text-sm text-slate-705">¡Limpieza de datos óptima!</p>
                          <p className="text-xs text-slate-400 mt-0.5">Todos los pagos cargados tienen clasificaciones asignadas, montos positivos, entidades relacionadas y tipos de cambio válidos.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paymentErrors.map((err) => (
                      <tr key={err.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          {err.originalEntry}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            err.type === 'amount_zero' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            err.type === 'exchange_rate_invalid' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            err.type === 'orphan_tx' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            err.type === 'missing_category' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                            'bg-slate-50 text-slate-700'
                          }`}>
                            {err.typeName}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium max-w-sm">
                          {err.description}
                        </td>
                        <td className="p-4 text-center text-slate-500 text-xs font-mono">
                          {err.tx?.date || '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-750">
                          {formatCurrency(err.tx?.amount || 0)} <span className="text-[10px] text-slate-400">{err.tx?.currency}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            err.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                            err.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-sky-100 text-sky-700'
                          }`}>
                            {err.severity === 'high' ? 'Grave' : err.severity === 'medium' ? 'Mediana' : 'Baja'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleEditWithAuth(err.tx)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-indigo-100 hover:border-indigo-200 transition-all cursor-pointer"
                          >
                            Corregir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETALLES DE TRANSACCIÓN MODAL */}
      <Modal isOpen={!!viewingTransaction} onClose={() => setViewingTransaction(null)} title="Detalle del Pago / Transacción Financiera" size="2xl">
        {viewingTransaction && (() => {
          const tx = viewingTransaction;
          const cat = catalogs['Categorías']?.find(c => c.id === tx.categoryId);
          const subCat = catalogs['Subcategorías']?.find(s => s.id === tx.subcategory)?.name || tx.subcategory;
          const student = students.find(s => s.id === tx.studentId);
          const provider = providers.find(p => p.id === tx.providerId);
          const inst = institutions.find(i => i.id === tx.institutionId);
          const agent = users.find(u => u.id === tx.agentId);

          return (
            <div className="space-y-6 p-1 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{tx.description}</h3>
                    <p className="text-xs text-slate-450 mt-0.5">ID de Transacción: <span className="font-mono font-medium text-indigo-600">{tx.id}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    tx.status === 'Aplicado' || tx.status === 'Pagado'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      : tx.status === 'Programado'
                      ? 'bg-amber-50 text-amber-800 border border-amber-100'
                      : 'bg-rose-50 text-rose-800 border border-rose-100'
                  }`}>
                    {tx.status === 'Aplicado' || tx.status === 'Pagado' ? 'Pagado' : tx.status}
                  </span>
                </div>
              </div>

              {/* Grid with transaction details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo de Movimiento</span>
                  <p className={`font-extrabold mt-0.5 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? 'Ingreso (Cobro o Recaudación)' : 'Egreso (Gasto o Pago)'}
                  </p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Fecha del Registro</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{tx.date}</p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Categoría</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{cat?.name || 'Varios / No asignado'}</p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Subcategoría</span>
                  <p className="font-medium text-slate-600 mt-0.5">{subCat || 'No asignada'}</p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Monto Original Capturado</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {new Intl.NumberFormat('es-MX', { 
                      style: 'currency', 
                      currency: tx.originalCurrency || tx.currency 
                    }).format(tx.originalAmount !== undefined ? tx.originalAmount : tx.amount)} {tx.originalCurrency || tx.currency}
                  </p>
                </div>

                {tx.originalCurrency && tx.originalCurrency !== tx.currency && (
                  <div>
                    <span className="block text-[10px] font-black uppercase text-amber-600 tracking-wider">Monto Registrado en Cuenta ({tx.currency})</span>
                    <p className="font-bold text-amber-800 mt-0.5">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.amount)} {tx.currency}
                    </p>
                  </div>
                )}

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo de Cambio / Conversión</span>
                  <p className="font-mono text-slate-600 mt-0.5 text-xs">
                    {(() => {
                      const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
                      const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;
                      if (isOrigUSD) {
                        if (hasCustomRate) {
                          return `1 USD = ${tx.exchangeRate.toFixed(4)} MXN`;
                        }
                        return `1 USD = ${averageUsdRate.toFixed(4)} MXN (Promedio USD)`;
                      }
                      return `1 USD = ${tx.exchangeRate?.toFixed(4)} MXN`;
                    })()}
                  </p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Monto en Pesos (MXN)</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">
                    {(() => {
                      const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
                      const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;
                      if (isOrigUSD) {
                        if (hasCustomRate) {
                          return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate);
                        }
                        const origAmt = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
                        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(origAmt * averageUsdRate);
                      }
                      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(tx.amountMXN);
                    })()}
                  </p>
                  {(tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency)) && (
                    <span className="text-[10px] text-indigo-650 font-bold block mt-0.5">
                      {tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0
                        ? "* Calculado utilizando el Tipo de Cambio registrado"
                        : "* Calculado utilizando el Tipo de Cambio promedio de USD"}
                    </span>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-wider">IVA en USD</span>
                  <p className="font-extrabold text-emerald-600 mt-0.5">
                    {(() => {
                      const exchangeRate = tx.exchangeRate || exchangeRateUSD || 18.0;
                      if (tx.currency === 'USD') {
                        const totalIva = tx.iva !== undefined ? tx.iva : (inst?.payWithIva ? tx.amount * 0.16 : 0);
                        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(totalIva);
                      } else {
                        const totalIvaMXN = tx.iva !== undefined ? tx.iva : (inst?.payWithIva ? tx.amount * 0.16 : 0);
                        const totalIvaUSD = exchangeRate > 0 ? (totalIvaMXN / exchangeRate) : 0;
                        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(totalIvaUSD);
                      }
                    })()}
                  </p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Método de Pago</span>
                  <p className="font-medium text-slate-700 mt-0.5">{tx.paymentMethod || 'No especificado'}</p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Cuenta Bancaria Destino/Origen</span>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {(() => {
                      const bankAccountObj = bankAccounts?.find(
                        b => b.id === Number(tx.bankAccountId) || b.id.toString() === tx.bankAccountId?.toString()
                      );
                      return bankAccountObj 
                        ? `${bankAccountObj.bankName} (${bankAccountObj.currency}) — Acc/CLABE: ${bankAccountObj.accountNumber || bankAccountObj.clabe || 'No especificada'}`
                        : tx.bankAccountId || 'Efectivo / Caja General';
                    })()}
                  </p>
                </div>

                {tx.iva !== undefined ? (
                  <div className="col-span-1 md:col-span-2 bg-emerald-50/60 border border-emerald-100/75 p-3 rounded-xl">
                    <span className="block text-[10px] font-black uppercase text-emerald-800 tracking-wider">Monto de IVA Registrado (16%)</span>
                    <p className="font-extrabold text-emerald-950 mt-0.5">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.iva)} {tx.currency} (Base: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.amount)} {tx.currency})
                    </p>
                  </div>
                ) : (inst?.payWithIva && (
                  <div className="col-span-1 md:col-span-2 bg-emerald-50/40 border border-emerald-100/70 p-3 rounded-xl">
                    <span className="block text-[10px] font-black uppercase text-emerald-800 tracking-wider">Monto de IVA Estimado (16%)</span>
                    <p className="font-extrabold text-emerald-950 mt-0.5">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.amount * 0.16)} {tx.currency} (Calculado s/ Base: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: tx.currency }).format(tx.amount)} {tx.currency})
                    </p>
                  </div>
                ))}

                <div className="col-span-1 md:col-span-2 border-t border-slate-50 pt-3">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tercero Relacionado</span>
                  <p className="font-bold text-slate-700 mt-0.5">
                    {student ? `👦 Alumno: ${student.name} ${student.lastName} (Tel: ${student.phone || 'N/A'})` : 
                     provider ? `🏢 Proveedor: ${provider.legalName} (RFC: ${provider.taxId || 'N/A'})` :
                     inst ? `🏫 Colegio/Institución: ${inst.name}` : 'Ninguno asignado'}
                  </p>
                </div>

                {tx.taxId && (
                  <div className="col-span-1 md:col-span-2">
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Folio Fiscal (UUID / Factura)</span>
                    <p className="font-mono text-xs text-slate-700 mt-0.5 p-1.5 bg-slate-50 rounded border border-slate-100">{tx.taxId}</p>
                  </div>
                )}

                {tx.attachmentUrl && (
                  <div className="col-span-1 md:col-span-2">
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Archivo Comprobante</span>
                    <div className="flex items-center gap-2 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <span className="text-xs font-medium text-slate-600 truncate">{tx.attachmentUrl}</span>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert(`Descargando comprobante de pago: ${tx.attachmentUrl}`); }} className="ml-auto text-xs font-bold text-indigo-600 hover:underline">Descargar</a>
                    </div>
                  </div>
                )}

                {agent && (
                  <div className="col-span-1 md:col-span-2 border-t border-slate-50 pt-3 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Operador Registrante</span>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">{agent.name} ({agent.email})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Rol: {agent.role}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar inside Detail Modal */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingTransaction(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    Cerrar Ventana
                  </button>
                  {tx.status === 'Programado' && (
                    <button
                      onClick={() => handleConfirmScheduledPayment(tx)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmar Pago
                    </button>
                  )}
                </div>

                {isSuperAdmin ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditWithAuth(tx)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center shadow-xs"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Editar Pago
                    </button>
                    <button
                      onClick={() => handleDeleteWithAuth(tx)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition flex items-center shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar Pago
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Edición y borrado restringidos a Superadministrador
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* AUTORIZACIÓN PREVIA MODAL */}
      <Modal isOpen={isAuthConfirmOpen} onClose={() => { setIsAuthConfirmOpen(false); setAuthActionType(null); setAuthTargetTx(null); }} title="🔑 Validación de Autorización Requerida">
        <form onSubmit={handleAuthConfirmSubmit} className="p-4 space-y-4 text-left">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">Control de Seguridad y Auditoría Administrativa</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Usted está intentando <strong>{authActionType === 'delete' ? 'ELIMINAR' : 'EDITAR'}</strong> un registro de pago/cobro histórico de forma permanente. 
                Por políticas de cumplimiento financiero, esta operación requiere declarar que cuenta con la <strong>autorización previa y explícita de la Dirección General</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={authCheckboxApproved}
                onChange={(e) => setAuthCheckboxApproved(e.target.checked)}
                className="mt-1 border-slate-300 rounded text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-slate-600 font-medium select-none leading-relaxed">
                Declaro bajo protesta de decir verdad que esta modificación/eliminación de registro financiero histórico cuenta con la autorización gerencial correspondiente y ha sido validada.
              </span>
            </label>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Para confirmar su autorización, escriba la palabra <strong className="font-black text-slate-700 select-all">AUTORIZAR</strong>:
              </label>
              <input
                type="text"
                required
                placeholder="Escriba aquí..."
                value={authConfirmationInput}
                onChange={(e) => setAuthConfirmationInput(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-extrabold focus:ring-2 focus:ring-amber-500 bg-white shadow-inner tracking-widest outline-none text-slate-800 uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAuthConfirmOpen(false);
                setAuthActionType(null);
                setAuthTargetTx(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!authCheckboxApproved || authConfirmationInput.trim().toUpperCase() !== 'AUTORIZAR'}
              className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-600/20"
            >
              Proceder (Autorizado)
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingTransaction ? 'Editar' : 'Registrar'} Pago`} size="3xl">
        <FinancialTransactionForm 
          initialType={formType} 
          initialData={editingTransaction} 
          onSuccess={() => setIsModalOpen(false)} 
        />
      </Modal>

      <Modal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} title="Confirmar Eliminación">
        <div className="p-4 text-center">
          <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar registro financiero?</h3>
          <p className="text-slate-500 text-sm mb-6">
            Esta acción eliminará permanentemente esta transacción de sus registros. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setTransactionToDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (transactionToDelete) {
                  deleteFinancialTransaction(transactionToDelete);
                  setTransactionToDelete(null);
                }
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!statementToDelete} onClose={() => setStatementToDelete(null)} title="Confirmar Eliminación">
        <div className="p-4 text-center">
          <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar documento?</h3>
          <p className="text-slate-500 text-sm mb-6">
            Esta acción eliminará el documento y todas las operaciones importadas que no hayan sido conciliadas todavía. ¿Deseas continuar?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setStatementToDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (statementToDelete) {
                  deleteAccountStatement(statementToDelete);
                  if (selectedStatementId === statementToDelete) {
                    setSelectedStatementId(null);
                  }
                  setStatementToDelete(null);
                }
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE CAMBIO MASIVO */}
      <Modal isOpen={isMassUpdateConfirmOpen} onClose={() => setIsMassUpdateConfirmOpen(false)} title="Confirmar Cambio Masivo">
        <div className="p-4 text-center">
          <RefreshCcw className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">¿Aplicar cambio en lote?</h3>
          <p className="text-slate-500 text-sm mb-6">
            ¿Seguro que deseas actualizar los campos seleccionados con los nuevos valores en los <strong className="font-extrabold text-slate-800">{selectedFinTxIds.length}</strong> registros financieros seleccionados?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsMassUpdateConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeMassChange}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              Sí, actualizar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN MASIVA */}
      <Modal isOpen={isMassDeleteConfirmOpen} onClose={() => setIsMassDeleteConfirmOpen(false)} title="Confirmar Eliminación Masiva">
        <div className="p-4 text-center">
          <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-850 mb-2">¿Eliminar registros en lote?</h3>
          <p className="text-slate-500 text-sm mb-6">
            ¿Seguro que deseas ELIMINAR permanentemente los <strong className="font-black text-rose-600">{selectedFinTxIds.length}</strong> registros seleccionados de finanzas? Esta acción es irreversible y no se puede deshacer.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsMassDeleteConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeMassDelete}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-500/20"
            >
              Sí, eliminar todos
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Detalle y Vinculación OCR */}
      <Modal 
        isOpen={!!selectedOcrToLink} 
        onClose={() => setSelectedOcrToLink(null)} 
        title="Detalles y Vinculación de Operación"
        size="3xl"
      >
        {selectedOcrToLink && (
          <div className="space-y-6 pt-2">
            
            {/* Info Card de la Transacción */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3.5">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                  selectedOcrToLink.type === 'income' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {selectedOcrToLink.type === 'income' ? 'Ingreso' : 'Egreso'}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">{selectedOcrToLink.date}</span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Descripción del Banco</span>
                <p className="text-sm font-bold text-slate-700 leading-snug">{selectedOcrToLink.description}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Monto de la Operación</span>
                  <p className={`text-lg font-black ${selectedOcrToLink.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedOcrToLink.type === 'income' ? '+' : '-'}{formatCurrency(selectedOcrToLink.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Estado actual</span>
                  <span className={`text-xs font-bold inline-flex items-center px-2 py-0.5 rounded-full ${
                    selectedOcrToLink.saved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedOcrToLink.saved ? 'Conciliado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clasificación de Categorías */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Categoría</label>
                <select
                  disabled={selectedOcrToLink.saved}
                  value={modalCategoryId}
                  onChange={(e) => {
                    setModalCategoryId(e.target.value);
                    setModalSubcategory('');
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar...</option>
                  {catalogs['Categorías']?.filter(c => !c.type || c.type === 'anual' || c.type === selectedOcrToLink.type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subcategoría</label>
                <select
                  disabled={selectedOcrToLink.saved || !modalCategoryId}
                  value={modalSubcategory}
                  onChange={(e) => setModalSubcategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar...</option>
                  {catalogs['Subcategorías']?.filter(s => s.parentId === modalCategoryId).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Opciones de Vinculación */}
            <div className="space-y-4 pt-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Tipo de Vinculación</label>
              
              {/* Segmented Select buttons */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  disabled={selectedOcrToLink.saved}
                  onClick={() => setModalRelationType('none')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalRelationType === 'none' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  } disabled:opacity-50`}
                >
                  Sin Vinculación
                </button>
                <button
                  type="button"
                  disabled={selectedOcrToLink.saved}
                  onClick={() => setModalRelationType('institution')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalRelationType === 'institution' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-700'
                  } disabled:opacity-50`}
                >
                  Institución
                </button>
                <button
                  type="button"
                  disabled={selectedOcrToLink.saved}
                  onClick={() => setModalRelationType('homeschool')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalRelationType === 'homeschool' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-700'
                  } disabled:opacity-50`}
                >
                  Alumno Homeschool
                </button>
              </div>

              {/* Conditionally rendered Inputs based on selected relation type */}
              {modalRelationType === 'institution' && (
                <div className="animate-in fade-in duration-200 bg-violet-50/50 border border-violet-100 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-violet-700">Seleccionar Institución</label>
                    <select
                      disabled={selectedOcrToLink.saved}
                      value={modalInstId}
                      onChange={(e) => setModalInstId(e.target.value)}
                      className="w-full border border-violet-200 rounded-xl px-3 py-2.5 text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                    >
                      <option value="">-- Buscar / Seleccionar Institución --</option>
                      {[...institutions]
                        .filter(inst => inst.active !== false)
                        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
                        .map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.tradeName ? `${inst.tradeName} (${inst.name})` : inst.name} {inst.institutionCode ? ` [${inst.institutionCode}]` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-violet-600/80">
                    Al guardar, esta transacción bancaria se relacionará con la institución elegida para un control detallado de egresos o ingresos corporativos.
                  </p>
                </div>
              )}

              {modalRelationType === 'homeschool' && (
                <div className="animate-in fade-in duration-200 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-emerald-800">Seleccionar Alumno Homeschool</label>
                    <select
                      disabled={selectedOcrToLink.saved}
                      value={modalStudentId}
                      onChange={(e) => setModalStudentId(e.target.value)}
                      className="w-full border border-emerald-200 rounded-xl px-3 py-2.5 text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                    >
                      <option value="">-- Buscar / Seleccionar Alumno Homeschool --</option>
                      {students
                        .filter(s => s.modality?.toLowerCase() === 'homeschool')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.studentCustomId ? ` - ID: ${s.studentCustomId}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Display commission and agent info if a student is picked */}
                  {modalStudentId && (() => {
                    const matchedS = students.find(s => s.id === Number(modalStudentId));
                    const studentAgent = users.find(u => u.id === matchedS?.agentId);
                    const studentEnrollments = enrollments.filter(e => e.studentId === matchedS?.id);
                    const enrolledClasses = studentEnrollments.map(e => {
                      const cls = classes.find(c => c.id === e.classId);
                      return cls ? { ...cls, enrollmentStatus: e.status } : null;
                    }).filter((c): c is NonNullable<typeof c> => c !== null);
                    
                    return (
                      <div className="bg-white border border-emerald-200/55 rounded-xl p-3 text-xs space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-medium">Nombre del Alumno:</span>
                          <span className="font-extrabold text-slate-800 text-right">{matchedS?.name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-medium">Agente asignado:</span>
                          <span className="font-extrabold text-slate-800">
                            {studentAgent ? studentAgent.name : <span className="text-slate-400 italic">No asignado</span>}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500 font-medium">Modalidad:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                            {matchedS?.modality || 'Homeschool'}
                          </span>
                        </div>
                        <div className="border-b border-slate-100 pb-2 space-y-1.5">
                          <span className="text-slate-500 font-medium block">Clases Inscritas:</span>
                          {enrolledClasses.length > 0 ? (
                            <div className="space-y-1 pl-1">
                              {enrolledClasses.map(cls => (
                                <div key={cls.id} className="flex justify-between items-center text-[11px] bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-700">{cls.name}</span>
                                    {cls.code && <span className="text-[9px] text-slate-400 font-mono">{cls.code}</span>}
                                  </div>
                                  {cls.enrollmentStatus && (
                                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                                      cls.enrollmentStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      cls.enrollmentStatus === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {cls.enrollmentStatus}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px] pl-1">No hay clases inscritas en el sistema.</p>
                          )}
                        </div>
                        <div className="mt-1 pt-1.5 text-[11px] text-emerald-600/90 leading-tight">
                          💡 <strong>Comisión de Agente:</strong> Al conciliar el pago, se generará honorarios automáticos para <strong>{studentAgent ? studentAgent.name : 'el agente asignado'}</strong>.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedOcrToLink(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              
              {!selectedOcrToLink.saved && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveModalLink(false)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    Guardar Vinculación
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveModalLink(true)}
                    className="px-4 py-2 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-colors"
                  >
                    Guardar y Conciliar
                  </button>
                </div>
              )}
            </div>
            
          </div>
        )}
      </Modal>
    </div>
  );
}
