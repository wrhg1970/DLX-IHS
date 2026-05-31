import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, Filter, Download, Plus, Search, DollarSign, TrendingUp, TrendingDown, RefreshCcw, Landmark, MapPin, SearchX, X, UploadCloud, FileText, CheckCircle, Trash2, Save, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Modal } from '../components/ui/Modal';
import { FinancialTransaction, StatementTransaction } from '../context/AppContext';
import { FinancialTransactionForm } from '../components/FinancialTransactionForm';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
const CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP'];

export function Finanzas() {
  const { 
    currentUser, users, financialTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction, catalogs,
    bankAccounts, providers, students,
    accountStatements, statementTransactions, addAccountStatement, deleteAccountStatement, updateStatementTransaction, deleteStatementTransaction
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Ingresos' | 'Egresos' | 'OCR'>('Dashboard');

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewCurrency, setViewCurrency] = useState<'MXN' | 'USD'>('MXN');
  const [providerFilter, setProviderFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [statementToDelete, setStatementToDelete] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');

  const exchangeRateUSD = 18.0;

  const filteredTransactions = useMemo(() => {
    return financialTransactions.filter(tx => {
      let matches = true;
      if (activeTab === 'Ingresos' && tx.type !== 'income') matches = false;
      if (activeTab === 'Egresos' && tx.type !== 'expense') matches = false;
      if (dateRange.start && tx.date < dateRange.start) matches = false;
      if (dateRange.end && tx.date > dateRange.end) matches = false;
      if (providerFilter && tx.providerId?.toString() !== providerFilter) matches = false;
      if (clientFilter && tx.studentId?.toString() !== clientFilter) matches = false;
      if (categoryFilter && tx.categoryId !== categoryFilter) matches = false;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        if (!tx.description.toLowerCase().includes(lowerSearch) && 
            !tx.subcategory.toLowerCase().includes(lowerSearch)) {
          matches = false;
        }
      }
      return matches;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialTransactions, activeTab, dateRange, providerFilter, clientFilter, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    let incomeMXN = 0;
    let expenseMXN = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') incomeMXN += tx.amountMXN;
      else expenseMXN += tx.amountMXN;
    });

    const conversion = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
    
    return {
      income: incomeMXN * conversion,
      expense: expenseMXN * conversion,
      profit: (incomeMXN - expenseMXN) * conversion
    };
  }, [filteredTransactions, viewCurrency]);

  const chartData = useMemo(() => {
    // group by month
    const monthly: Record<string, { month: string, Ingresos: number, Egresos: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const monthObj = new Date(tx.date);
      const month = `${monthObj.getFullYear()}-${String(monthObj.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[month]) monthly[month] = { month, Ingresos: 0, Egresos: 0 };
      
      const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
      if (tx.type === 'income') {
        monthly[month].Ingresos += tx.amountMXN * conv;
      } else {
        monthly[month].Egresos += tx.amountMXN * conv;
      }
    });

    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions, viewCurrency]);

  const pieData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(tx => {
      const cat = catalogs['Categorías']?.find(c => c.id === tx.categoryId)?.name || 'Otros';
      if (!cats[cat]) cats[cat] = 0;
      const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);
      cats[cat] += tx.amountMXN * conv;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions, catalogs, viewCurrency]);

  const handleClearFilters = () => {
    setDateRange({ start: '', end: '' });
    setProviderFilter('');
    setClientFilter('');
    setCategoryFilter('');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/parse-statement', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Error al procesar el documento');
        }
        
        let extractedData = await response.json();
        
        if (!Array.isArray(extractedData)) {
          extractedData = [];
        }
        
        const processedTx: Omit<StatementTransaction, "id" | "statementId" | "saved" | "reconciled">[] = extractedData.map((item: any) => ({
          date: item.date || new Date().toISOString().split('T')[0],
          description: item.description || 'Desconocido',
          amount: Number(item.amount) || 0,
          type: item.type === 'income' ? 'income' : 'expense',
          categoryId: catalogs['Categorías']?.find(c => !c.type || c.type === 'anual' || c.type === (item.type === 'income' ? 'income' : 'expense'))?.id || '',
          subcategory: '',
        }));

        let inC = 0;
        let exC = 0;
        processedTx.forEach(t => t.type === 'income' ? inC += t.amount : exC += t.amount);

        addAccountStatement({
          filename: file.name,
          totalOperations: processedTx.length,
          totalIncome: inC,
          totalExpense: exC
        }, processedTx);
        
      } catch (error) {
        console.error("Upload error:", error);
        alert('Hubo un error al procesar el estado de cuenta. Por favor intente con otro archivo.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveStatementTransaction = (stTx: StatementTransaction) => {
    // Add to actual financial transactions
    addFinancialTransaction({
      agentId: currentUser?.id,
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: viewCurrency }).format(val);
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
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('Ingresos')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Ingresos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ingresos
            </button>
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
              <button 
                onClick={() => handleAddBtnClick('expense')}
                className="flex items-center bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20"
              >
                <Plus className="w-4 h-4 mr-2" /> Egreso
              </button>
            </>
          )}
        </div>
      </div>

      {(activeTab === 'Dashboard' || activeTab === 'Ingresos' || activeTab === 'Egresos') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Ventas Totales</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.income)}</h2>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-500 absolute bottom-6 right-6 opacity-80" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Egresos Totales</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.expense)}</h2>
          </div>
          <TrendingDown className="w-6 h-6 text-rose-500 absolute bottom-6 right-6 opacity-80" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute md:right-10 right-0 top-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-1">Utilidad Neta</p>
            <h2 className="text-3xl font-black text-white tracking-tight">{formatCurrency(stats.profit)}</h2>
          </div>
          <DollarSign className="w-6 h-6 text-indigo-400 absolute bottom-6 right-6 opacity-80" />
        </div>
      </div>

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
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
            >
              <option value="">Categorías</option>
              {catalogs['Categorías']?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-4 font-bold">Fecha</th>
                <th className="p-4 font-bold">Detalle</th>
                <th className="p-4 font-bold">Categoría</th>
                <th className="p-4 font-bold">Relacionado</th>
                <th className="p-4 font-bold text-right">Monto Original</th>
                <th className="p-4 font-bold text-right pt-4">T.C.</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-right">Monto {viewCurrency}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredTransactions.map(tx => {
                const cat = catalogs['Categorías']?.find(c => c.id === tx.categoryId);
                const subCat = catalogs['Subcategorías']?.find(s => s.id === tx.subcategory)?.name || tx.subcategory;
                const related = tx.type === 'income' 
                  ? students.find(s => s.id === tx.studentId)?.name
                  : providers.find(p => p.id === tx.providerId)?.legalName;
                const conv = viewCurrency === 'MXN' ? 1 : (1 / exchangeRateUSD);

                return (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                      {related || '-'}
                    </td>
                    <td className="p-4 text-right font-medium">
                      <span className="text-slate-800">{new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency }).format(tx.amount)}</span>
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400">
                     {tx.exchangeRate.toFixed(2)}
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
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amountMXN * conv)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditTransaction(tx)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar registro">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTransactionToDelete(tx.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar registro">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
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
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right text-xs">
                            <p className="text-indigo-600 font-bold">Seleccionado: <span className="font-extrabold">{formatCurrency(selectedSum)}</span> ({selectedCount} op.)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const txsToSave = activeTxs.filter(t => selectedOcrIds.includes(t.id) && !t.saved);
                              txsToSave.forEach(st => handleSaveStatementTransaction(st));
                              setSelectedOcrIds([]);
                            }}
                            disabled={selectedCount === 0}
                            className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${selectedCount > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
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
                                <td className="p-4 font-bold text-slate-800">{tx.description}</td>
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
                                      <button onClick={() => handleSaveStatementTransaction(tx)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-100 bg-white rounded-lg transition-all shadow-xs" title="Conciliar esta transacción">
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => deleteStatementTransaction(tx.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 border border-slate-100 bg-white rounded-lg transition-all shadow-xs" title="Ignorar transación">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingTransaction ? 'Editar' : 'Registrar'} Pago`}>
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
    </div>
  );
}
