import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  ArrowUpRight, 
  ChevronRight, 
  Search, 
  AlertCircle, 
  Building2, 
  PlusCircle,
  CreditCard,
  TrendingDown,
  TrendingUp,
  X,
  Edit3
} from 'lucide-react';
import { useAppContext, Task } from '../../context/AppContext';

interface DashboardAlertasProps {
  onOpenTaskModal?: (task?: Task) => void;
}

export type AlertCategory = 'todas' | 'recordatorios' | 'pagos';
export type AlertSeverity = 'all' | 'urgente' | 'proxima';

export function DashboardAlertas({ onOpenTaskModal }: DashboardAlertasProps) {
  const navigate = useNavigate();
  const { 
    tasks, 
    updateTask, 
    students, 
    institutions, 
    financialTransactions, 
    users
  } = useAppContext();

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<AlertCategory>('todas');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('all');

  // Today reference
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Average USD Rate for currency conversion
  const averageUsdRate = useMemo(() => {
    const usdRates = (financialTransactions || [])
      .map(t => {
        if (t.exchangeRate && t.exchangeRate > 1) return t.exchangeRate;
        if ((t.currency === 'USD' || t.originalCurrency === 'USD') && t.amount > 0 && t.amountMXN > t.amount) {
          return t.amountMXN / t.amount;
        }
        return null;
      })
      .filter((r): r is number => r !== null && r > 1);

    return usdRates.length > 0
      ? usdRates.reduce((acc, val) => acc + val, 0) / usdRates.length
      : 18.0;
  }, [financialTransactions]);

  // -------------------------------------------------------------
  // 1. RECORDATORIOS PENDIENTES
  // -------------------------------------------------------------
  const pendingTasksList = useMemo(() => {
    return tasks
      .filter(t => t.status === 'Pendiente')
      .map(t => {
        const dueDateObj = t.dueDate ? new Date(t.dueDate + 'T00:00:00') : null;
        let isOverdue = false;
        let isDueToday = false;
        let daysDiff = 0;
        let diffLabel = 'Sin fecha límite';

        if (dueDateObj) {
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const taskMidnight = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
          const timeDiff = taskMidnight.getTime() - todayMidnight.getTime();
          daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

          if (daysDiff < 0) {
            isOverdue = true;
            diffLabel = `Venció hace ${Math.abs(daysDiff)} ${Math.abs(daysDiff) === 1 ? 'día' : 'días'}`;
          } else if (daysDiff === 0) {
            isDueToday = true;
            diffLabel = 'Vence hoy';
          } else if (daysDiff === 1) {
            diffLabel = 'Vence mañana';
          } else {
            diffLabel = `Vence en ${daysDiff} días`;
          }
        }

        const linkedInst = t.institutionId ? institutions.find(i => i.id === t.institutionId) : null;
        const assignedUser = t.userId ? users.find(u => u.id === t.userId) : null;

        return {
          id: t.id,
          rawTask: t,
          title: t.title,
          dueDate: t.dueDate,
          dueDateObj,
          isOverdue,
          isDueToday,
          daysDiff,
          diffLabel,
          priority: t.priority || 'Media',
          type: t.type || 'Llamada',
          notes: t.notes,
          institutionName: linkedInst?.name || null,
          institutionId: t.institutionId,
          assignedName: assignedUser?.name || t.requestedBy || 'Sin asignar',
          requestedBy: t.requestedBy,
          severity: (isOverdue || isDueToday || t.priority === 'Alta') ? 'urgente' : 'proxima'
        };
      })
      .sort((a, b) => {
        // Overdue first, then today, then chronological
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.isDueToday && !b.isDueToday) return -1;
        if (!a.isDueToday && b.isDueToday) return 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
      });
  }, [tasks, today, institutions, users]);

  // -------------------------------------------------------------
  // 2. PAGOS PRÓXIMOS (Finanzas & Membresías)
  // -------------------------------------------------------------
  interface PaymentAlertItem {
    id: string;
    concept: string;
    entityName: string;
    entityType: 'Institución' | 'Proveedor' | 'Estudiante' | 'General';
    targetId?: number | string;
    targetRoute?: string;
    institutionId?: number;
    amountMXN: number;
    amountUSD: number;
    currency: string;
    dueDate: string;
    diffDays: number;
    diffLabel: string;
    isOverdue: boolean;
    type: 'income' | 'expense';
    status: 'Pendiente' | 'Programado' | 'Por Vencer';
    severity: 'urgente' | 'proxima';
  }

  const upcomingPaymentsList = useMemo(() => {
    const list: PaymentAlertItem[] = [];
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // A) Transactions with status 'Programado' or 'Pendiente'
    financialTransactions.forEach(tx => {
      if (tx.status === 'Programado' || tx.status === 'Pendiente') {
        const txDate = tx.date ? new Date(tx.date + 'T00:00:00') : todayMidnight;
        const diffTime = txDate.getTime() - todayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays < 0;

        let diffLabel = '';
        if (diffDays < 0) {
          diffLabel = `Atrasado ${Math.abs(diffDays)}d`;
        } else if (diffDays === 0) {
          diffLabel = 'Vence hoy';
        } else if (diffDays === 1) {
          diffLabel = 'Vence mañana';
        } else {
          diffLabel = `En ${diffDays} días`;
        }

        let entityName = tx.description || 'Transacción financiera';
        let entityType: PaymentAlertItem['entityType'] = 'General';
        let targetRoute = '/finanzas';
        let targetId: string | number | undefined = tx.id;
        let resolvedInstId: number | undefined = tx.institutionId ? Number(tx.institutionId) : undefined;

        if (tx.institutionId) {
          const inst = institutions.find(i => i.id === tx.institutionId);
          if (inst) {
            entityName = inst.commercialName || inst.name;
            entityType = 'Institución';
            targetRoute = `/instituciones/${inst.id}`;
            targetId = inst.id;
            resolvedInstId = inst.id;
          }
        } else if (tx.studentId) {
          const stud = students.find(s => s.id === tx.studentId);
          if (stud) {
            entityName = `${stud.name} ${stud.lastName || ''}`.trim();
            entityType = 'Estudiante';
            targetRoute = `/alumnos/${stud.id}`;
            targetId = stud.id;
            if (stud.institutionId) {
              resolvedInstId = Number(stud.institutionId);
            }
          }
        }

        const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
        const amountMXN = tx.amountMXN || (isOrigUSD ? tx.amount * averageUsdRate : tx.amount);
        const amountUSD = isOrigUSD ? tx.amount : (amountMXN / averageUsdRate);

        list.push({
          id: `tx-${tx.id}`,
          concept: tx.description || (tx.type === 'income' ? 'Cobro Programado' : 'Pago Programado'),
          entityName,
          entityType,
          targetId,
          targetRoute,
          institutionId: resolvedInstId,
          amountMXN,
          amountUSD,
          currency: tx.currency || 'MXN',
          dueDate: tx.date || todayStr,
          diffDays,
          diffLabel,
          isOverdue,
          type: tx.type,
          status: tx.status as any,
          severity: (isOverdue || diffDays <= 7) ? 'urgente' : 'proxima'
        });
      }
    });

    // B) Institutions with upcoming/expired memberships or course payments
    institutions.forEach(inst => {
      // 1. Membership expiration
      if (inst.membershipExpiration) {
        const expDate = new Date(inst.membershipExpiration + 'T00:00:00');
        const diffTime = expDate.getTime() - todayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Show if expired or expiring within next 45 days
        if (diffDays <= 45) {
          const isOverdue = diffDays < 0;
          let diffLabel = '';
          if (diffDays < 0) {
            diffLabel = `Membresía vencida hace ${Math.abs(diffDays)}d`;
          } else if (diffDays === 0) {
            diffLabel = 'Membresía vence hoy';
          } else {
            diffLabel = `Membresía vence en ${diffDays}d`;
          }

          const membFee = parseFloat(inst.membershipPrice || '0') || 1500;
          list.push({
            id: `inst-memb-${inst.id}`,
            concept: `Renovación Convenio Membresía (${inst.membershipId || 'Anual'})`,
            entityName: inst.commercialName || inst.name,
            entityType: 'Institución',
            targetId: inst.id,
            targetRoute: `/instituciones/${inst.id}`,
            institutionId: inst.id,
            amountMXN: membFee * averageUsdRate,
            amountUSD: membFee,
            currency: 'USD',
            dueDate: inst.membershipExpiration,
            diffDays,
            diffLabel,
            isOverdue,
            type: 'income',
            status: isOverdue ? 'Pendiente' : 'Por Vencer',
            severity: (isOverdue || diffDays <= 15) ? 'urgente' : 'proxima'
          });
        }
      }

      // 2. Scheduled Membership Payment Start Date
      if (inst.membershipPaymentStartDate) {
        const pDate = new Date(inst.membershipPaymentStartDate + 'T00:00:00');
        const diffTime = pDate.getTime() - todayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= -60) {
          const isOverdue = diffDays < 0;
          const fee = parseFloat(inst.membershipPrice || '0') || 1000;
          list.push({
            id: `inst-paystart-${inst.id}`,
            concept: `Cobro Cuota Membresía (${inst.membershipPaymentMethod || 'Transferencia'})`,
            entityName: inst.commercialName || inst.name,
            entityType: 'Institución',
            targetId: inst.id,
            targetRoute: `/instituciones/${inst.id}`,
            institutionId: inst.id,
            amountMXN: fee * averageUsdRate,
            amountUSD: fee,
            currency: 'USD',
            dueDate: inst.membershipPaymentStartDate,
            diffDays,
            diffLabel: isOverdue ? `Atrasado ${Math.abs(diffDays)}d` : `Cobro en ${diffDays}d`,
            isOverdue,
            type: 'income',
            status: isOverdue ? 'Pendiente' : 'Programado',
            severity: (isOverdue || diffDays <= 7) ? 'urgente' : 'proxima'
          });
        }
      }
    });

    // Deduplicate by ID and sort chronologically
    const seen = new Set<string>();
    return list
      .filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [financialTransactions, institutions, students, today, todayStr, averageUsdRate]);

  // -------------------------------------------------------------
  // Institution-filtered Feeds
  // -------------------------------------------------------------
  const instFilteredTasks = useMemo(() => {
    if (selectedInstitutionId === 'all') return pendingTasksList;
    return pendingTasksList.filter(t => t.institutionId !== undefined && String(t.institutionId) === selectedInstitutionId);
  }, [pendingTasksList, selectedInstitutionId]);

  const instFilteredPayments = useMemo(() => {
    if (selectedInstitutionId === 'all') return upcomingPaymentsList;
    return upcomingPaymentsList.filter(p => p.institutionId !== undefined && String(p.institutionId) === selectedInstitutionId);
  }, [upcomingPaymentsList, selectedInstitutionId]);

  // -------------------------------------------------------------
  // Search & Severity Filtered Alert Feeds
  // -------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    return instFilteredTasks.filter(t => {
      if (severityFilter === 'urgente' && t.severity !== 'urgente') return false;
      if (severityFilter === 'proxima' && t.severity !== 'proxima') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchInst = t.institutionName?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchAssignee = t.assignedName.toLowerCase().includes(q);
        if (!matchTitle && !matchInst && !matchNotes && !matchAssignee) return false;
      }
      return true;
    });
  }, [instFilteredTasks, severityFilter, searchTerm]);

  const filteredPayments = useMemo(() => {
    return instFilteredPayments.filter(p => {
      if (severityFilter === 'urgente' && p.severity !== 'urgente') return false;
      if (severityFilter === 'proxima' && p.severity !== 'proxima') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchConcept = p.concept.toLowerCase().includes(q);
        const matchEntity = p.entityName.toLowerCase().includes(q);
        if (!matchConcept && !matchEntity) return false;
      }
      return true;
    });
  }, [instFilteredPayments, severityFilter, searchTerm]);

  // Overall Counts (derived from institution-filtered alerts)
  const totalTasksCount = instFilteredTasks.length;
  const urgentTasksCount = instFilteredTasks.filter(t => t.severity === 'urgente').length;

  const totalPaymentsCount = instFilteredPayments.length;
  const totalPaymentsAmountMXN = instFilteredPayments.reduce((sum, p) => sum + (p.type === 'income' ? p.amountMXN : 0), 0);

  const grandTotalAlerts = totalTasksCount + totalPaymentsCount;

  // Toggle Task Completion
  const handleToggleTask = (id: number) => {
    updateTask(id, { status: 'Completada' });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden space-y-0">
      
      {/* 1. Header Banner of Dashboard de Alertas */}
      <div className="bg-gradient-to-r from-slate-900 via-[#162746] to-[#0d1e38] text-white p-6 md:p-8 relative overflow-hidden">
        {/* Subtle decorative mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider font-sans text-white">
                Dashboard de Alertas
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                {grandTotalAlerts} {grandTotalAlerts === 1 ? 'Alerta Activa' : 'Alertas Activas'}
              </span>
            </div>
            <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">
              Monitoreo centralizado y proactivo de recordatorios pendientes y pagos y cobros próximos a vencer.
            </p>
          </div>

          {/* Quick Metrics summary cards row */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* 1. Recordatorios Metric */}
            <div 
              onClick={() => setActiveCategory('recordatorios')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
                activeCategory === 'recordatorios' 
                  ? 'bg-white/15 border-indigo-400 shadow-md ring-2 ring-indigo-400/40' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center text-amber-400 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-[10px] font-black uppercase tracking-wider">Recordatorios</span>
              </div>
              <span className="block text-2xl font-black font-mono text-white leading-none">
                {totalTasksCount}
              </span>
              <span className="block text-[9px] font-bold text-amber-300/90 mt-1">
                {urgentTasksCount} urgentes
              </span>
            </div>

            {/* 2. Pagos Metric */}
            <div 
              onClick={() => setActiveCategory('pagos')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
                activeCategory === 'pagos' 
                  ? 'bg-white/15 border-emerald-400 shadow-md ring-2 ring-emerald-400/40' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center text-emerald-400 mb-1">
                <DollarSign className="w-4 h-4 mr-0.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">Pagos</span>
              </div>
              <span className="block text-2xl font-black font-mono text-white leading-none">
                {totalPaymentsCount}
              </span>
              <span className="block text-[9px] font-bold text-emerald-300/90 mt-1">
                ${(totalPaymentsAmountMXN / 1000).toFixed(0)}k MXN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Navigation Bar */}
      <div className="p-5 md:p-6 bg-slate-50/70 border-b border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Segmented Category Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveCategory('todas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'todas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <span>🔔 Todas</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-slate-700 font-bold">
                {grandTotalAlerts}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('recordatorios')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'recordatorios'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Recordatorios</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono font-bold">
                {totalTasksCount}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('pagos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'pagos'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pagos Próximos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold">
                {totalPaymentsCount}
              </span>
            </button>
          </div>

          {/* Filters: Institute, Search and Severity */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
            {/* Institute Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-xs focus-within:ring-2 focus-within:ring-indigo-500">
              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                value={selectedInstitutionId}
                onChange={e => setSelectedInstitutionId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[190px]"
              >
                <option value="all">🏢 Todos los Institutos ({institutions.length})</option>
                {[...institutions]
                  .sort((a, b) => (a.commercialName || a.name || '').localeCompare(b.commercialName || b.name || '', 'es'))
                  .map(inst => (
                    <option key={inst.id} value={String(inst.id)}>
                      🏢 {inst.commercialName || inst.name}
                    </option>
                  ))}
              </select>
              {selectedInstitutionId !== 'all' && (
                <button 
                  type="button"
                  onClick={() => setSelectedInstitutionId('all')} 
                  className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                  title="Limpiar filtro de instituto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar en alertas..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 shadow-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as AlertSeverity)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="all">Todas las prioridades</option>
              <option value="urgente">⚡ Solo Críticas / Urgentes</option>
              <option value="proxima">📅 Próximas a vencer</option>
            </select>
          </div>

        </div>

        {/* Active Institute Filter Banner */}
        {selectedInstitutionId !== 'all' && (
          <div className="flex items-center justify-between bg-indigo-50/90 border border-indigo-200/90 rounded-2xl px-4 py-2.5 text-xs text-indigo-950 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Filtrado por Instituto: <strong className="font-black text-indigo-900">{institutions.find(i => String(i.id) === selectedInstitutionId)?.commercialName || institutions.find(i => String(i.id) === selectedInstitutionId)?.name || 'Instituto Seleccionado'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                {grandTotalAlerts} {grandTotalAlerts === 1 ? 'alerta encontrada' : 'alertas encontradas'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInstitutionId('all')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ver todos los institutos</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Alerts Main Content Display */}
      <div className="p-6 md:p-8 space-y-8">

        {/* -------------------------------------------------------------------- */}
        {/* A) SECTION: RECORDATORIOS PENDIENTES */}
        {/* -------------------------------------------------------------------- */}
        {(activeCategory === 'todas' || activeCategory === 'recordatorios') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-6 bg-amber-500 rounded-full"></span>
                <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-amber-500" />
                  Recordatorios y Tareas Pendientes ({filteredTasks.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenTaskModal && (
                  <button
                    onClick={() => onOpenTaskModal()}
                    className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Nueva Tarea</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/agenda')}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition flex items-center gap-0.5 cursor-pointer ml-3"
                >
                  <span>Ver Agenda</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                <p className="text-slate-400 text-xs font-medium">No hay recordatorios pendientes en este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map(task => {
                  const badgeColor = task.type === 'Llamada' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                                     task.type === 'Correo' ? 'bg-purple-50 text-purple-700 border-purple-200/60' :
                                     task.type === 'Visita' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                                     task.type === 'Meet' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                     'bg-slate-100 text-slate-700 border-slate-200/60';

                  const priorityBadge = task.priority === 'Alta' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold'
                    : task.priority === 'Baja'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                      : 'bg-amber-50 text-amber-700 border-amber-200 font-bold';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3 group ${
                        task.isOverdue 
                          ? 'border-rose-300 bg-rose-50/15 ring-1 ring-rose-300/40' 
                          : task.isDueToday 
                            ? 'border-amber-300 bg-amber-50/15' 
                            : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${badgeColor}`}>
                            {task.type}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityBadge}`}>
                            {task.priority === 'Alta' ? '🔴 Alta' : task.priority === 'Baja' ? '🟢 Baja' : '🟡 Media'}
                          </span>
                        </div>

                        {/* Title & Notes */}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {task.title}
                          </h4>
                          {task.notes && (
                            <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                              {task.notes}
                            </p>
                          )}
                        </div>

                        {/* Institution / Entity if assigned */}
                        {task.institutionName && (
                          <div className="flex items-center text-[11px] font-bold text-indigo-700 bg-indigo-50/70 px-2 py-1 rounded-lg">
                            <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{task.institutionName}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action / Due date info */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            task.isOverdue ? 'text-rose-600 font-extrabold' : task.isDueToday ? 'text-amber-600 font-extrabold' : 'text-slate-500'
                          }`}>
                            {task.diffLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Por: {task.assignedName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onOpenTaskModal && (
                            <button
                              onClick={() => onOpenTaskModal(task.rawTask)}
                              title="Editar Tarea"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                            title="Marcar como realizada"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Hecha</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* B) SECTION: PAGOS PRÓXIMOS */}
        {/* -------------------------------------------------------------------- */}
        {(activeCategory === 'todas' || activeCategory === 'pagos') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-6 bg-emerald-600 rounded-full"></span>
                <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
                  Pagos y Cobros Próximos ({filteredPayments.length})
                </h3>
              </div>
              <button
                onClick={() => navigate('/finanzas')}
                className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver Módulo Finanzas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                <p className="text-slate-400 text-xs font-medium">No hay cobros ni pagos programados en este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPayments.map(p => {
                  const isIncome = p.type === 'income';
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3 ${
                        p.isOverdue 
                          ? 'border-rose-300 bg-rose-50/15 ring-1 ring-rose-300/40' 
                          : p.diffDays <= 7 
                            ? 'border-emerald-300 bg-emerald-50/15' 
                            : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header Status & Type */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            isIncome 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {isIncome ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isIncome ? 'Cobro / Ingreso' : 'Pago / Egreso'}
                          </span>

                          <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border ${
                            p.isOverdue 
                              ? 'bg-rose-100 text-rose-800 border-rose-200 font-mono' 
                              : 'bg-slate-100 text-slate-700 border-slate-200 font-mono'
                          }`}>
                            {p.status}
                          </span>
                        </div>

                        {/* Concept & Entity */}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                            {p.concept}
                          </h4>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{p.entityName}</span>
                          </p>
                        </div>

                        {/* Amount Box */}
                        <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl space-y-0.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto Previsto:</span>
                            <span className={`text-base font-black font-mono leading-none ${isIncome ? 'text-emerald-700' : 'text-slate-800'}`}>
                              ${p.amountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold font-sans text-slate-500">MXN</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-right text-slate-400 font-mono font-medium">
                            ≈ ${p.amountUSD.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </p>
                        </div>
                      </div>

                      {/* Bottom Info & Navigation */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            p.isOverdue ? 'text-rose-600 font-extrabold' : 'text-slate-600'
                          }`}>
                            {p.diffLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Fecha: {p.dueDate}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            if (p.targetRoute) navigate(p.targetRoute);
                            else navigate('/finanzas');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200/80"
                        >
                          <span>Detalle</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
