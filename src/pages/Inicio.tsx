import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  UserPlus, 
  Building2, 
  DollarSign, 
  LayoutDashboard, 
  Truck, 
  List, 
  BarChart, 
  Filter, 
  CalendarDays,
  UserCheck,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { useAppContext, Task, TaskType } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function Inicio() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    tasks, 
    updateTask, 
    addTask, 
    students, 
    institutions, 
    users, 
    financialTransactions,
    payments
  } = useAppContext();

  // Selected date indicator
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedToday = today.toLocaleDateString('es-ES', options)
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter

  // Tasks statistics
  const completedTasksCount = tasks.filter(t => t.status === 'Completada').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Pendiente').length;

  // Active View Tab: "lista" | "calendario"
  const [activeSubView, setActiveSubView] = useState<"lista" | "calendario">("lista");

  // Filters state
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("Cualquiera");
  const [filterAssignee, setFilterAssignee] = useState<string>("Cualquiera");
  const [filterStatus, setFilterStatus] = useState<string>("Todas"); // "Todas", "Pendientes", "Completadas"
  const [filterDesde, setFilterDesde] = useState<string>("");
  const [filterHasta, setFilterHasta] = useState<string>("");

  // Expiring contracts list modal state
  const [isExpiringModalOpen, setIsExpiringModalOpen] = useState(false);

  // New task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    institutionId: '',
    userId: currentUser?.id?.toString() || '',
    type: 'Llamada' as TaskType
  });

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({
      title: taskForm.title,
      dueDate: taskForm.dueDate,
      status: 'Pendiente',
      institutionId: taskForm.institutionId ? Number(taskForm.institutionId) : undefined,
      userId: taskForm.userId ? Number(taskForm.userId) : undefined,
      type: taskForm.type
    });
    setIsTaskModalOpen(false);
    setTaskForm({ 
      title: '', 
      dueDate: new Date().toISOString().split('T')[0], 
      institutionId: '', 
      userId: currentUser?.id?.toString() || '', 
      type: 'Llamada' 
    });
  };

  const toggleTaskStatus = (id: number, currentStatus: "Pendiente" | "Completada") => {
    updateTask(id, { status: currentStatus === "Pendiente" ? "Completada" : "Pendiente" });
  };

  // Filter logic
  const filteredTasks = tasks.filter(t => {
    // Created by filter (using userId for mockup assignee/creator mapping simple match)
    if (filterCreatedBy !== "Cualquiera" && t.userId?.toString() !== filterCreatedBy) {
      return false;
    }
    // Responsable filter
    if (filterAssignee !== "Cualquiera" && t.userId?.toString() !== filterAssignee) {
      return false;
    }
    // Status filter
    if (filterStatus === "Pendientes" && t.status !== "Pendiente") return false;
    if (filterStatus === "Completadas" && t.status !== "Completada") return false;

    // Date range filters
    if (t.dueDate) {
      if (filterDesde && t.dueDate < filterDesde) return false;
      if (filterHasta && t.dueDate > filterHasta) return false;
    } else {
      if (filterDesde || filterHasta) return false; // Hide if range is specified and task has no due date
    }

    return true;
  });

  const pendingFilteredTasks = filteredTasks.filter(t => t.status === "Pendiente");
  const completedFilteredTasks = filteredTasks.filter(t => t.status === "Completada");

  const averageUsdRate = useMemo(() => {
    const usdRates = (financialTransactions || [])
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
  }, [financialTransactions]);

  const realIncomeTransactions = useMemo(() => {
    return financialTransactions
      .filter(tx => tx.type === 'income' && !(typeof tx.id === 'string' && tx.id.startsWith('tx-init-')))
      .reduce((acc, tx) => {
        const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
        const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;

        const txAmountMXN = isOrigUSD 
          ? (hasCustomRate 
              ? (tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate)
              : ((tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * averageUsdRate))
          : (tx.amountMXN || tx.amount);

        return acc + txAmountMXN;
      }, 0);
  }, [financialTransactions, averageUsdRate]);

  const realIncomeTransactionsUSD = useMemo(() => {
    return financialTransactions
      .filter(tx => tx.type === 'income' && !(typeof tx.id === 'string' && tx.id.startsWith('tx-init-')))
      .reduce((acc, tx) => {
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

        return acc + txAmountUSD;
      }, 0);
  }, [financialTransactions, averageUsdRate]);

  const realStudentPayments = (payments || [])
    .reduce((acc, p) => acc + (p.finalAmount || p.amount || 0), 0);

  const realStudentPaymentsUSD = (payments || [])
    .reduce((acc, p) => acc + ((p.finalAmount || p.amount || 0) / (p.exchangeRate || averageUsdRate)), 0);

  const totalIncomeMXN = realIncomeTransactions + realStudentPayments;
  const totalIncomeUSD = realIncomeTransactionsUSD + realStudentPaymentsUSD;

  const totalFinancialFlujoMXN = useMemo(() => {
    return (financialTransactions || []).reduce((acc, tx) => {
      const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
      const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;

      const txAmountMXN = isOrigUSD 
        ? (hasCustomRate 
            ? (tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate)
            : ((tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * averageUsdRate))
        : (tx.amountMXN || tx.amount);

      return acc + (txAmountMXN || 0);
    }, 0);
  }, [financialTransactions, averageUsdRate]);

  const expiringInstitutionsList = institutions.filter(inst => {
    if (!inst.membershipExpiration) return false;
    const expirationDate = new Date(inst.membershipExpiration);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // Expired or expiring within 30 days
  });

  const urgentTasksCount = tasks.filter(t => {
    if (t.status !== 'Pendiente') return false;
    if (!t.dueDate) return false;
    const taskDate = new Date(t.dueDate);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const taskMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    return taskMidnight <= todayMidnight;
  }).length;

  // Strategic Quick Action Handlers
  const handleQuickFilterUrgentTasks = () => {
    setFilterStatus("Pendientes");
    setFilterCreatedBy("Cualquiera");
    setFilterAssignee("Cualquiera");
    setFilterDesde("");
    const todayStr = today.toISOString().split('T')[0];
    setFilterHasta(todayStr);
    setActiveSubView("lista");
    setTimeout(() => {
      document.getElementById("agenda-tareas-section")?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleResetFilters = () => {
    setFilterCreatedBy("Cualquiera");
    setFilterAssignee("Cualquiera");
    setFilterStatus("Todas");
    setFilterDesde("");
    setFilterHasta("");
  };

  // Simple Month Calendar builder for mini calendar view (current month)
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const startOffset = getFirstDayOfMonth(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  const yearName = currentMonthDate.getFullYear();
  const monthName = currentMonthDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const calendarDays = [];
  // Padded empty offsets
  for (let s = 0; s < startOffset; s++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), d));
  }

  const navigateMonth = (direction: number) => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + direction, 1));
  };

  return (
    <div className="space-y-8 flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Large Top Hero Segment (Elegant Deep Banner matching the style) */}
      <div className="relative bg-gradient-to-r from-slate-900 via-[#132A53] to-[#0D1F3D] rounded-[28px] shadow-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Subtle decorative mesh background layer isolated to avoid cutting card shadow */}
        <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Inner Content with its padding */}
        <div className="relative z-10 p-8 md:p-10 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
          <div className="space-y-3">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight leading-none font-sans">
              ¡Buen día, <span className="text-sky-400 font-extrabold">{currentUser?.name || 'Administrador'}</span>!
            </h1>
            <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-md">
              Bienvenido a tu panel de control de <strong className="text-white font-bold leading-none">IHS Manager</strong>. 
              Todo lo que necesitas está a un click de distancia.
            </p>
            <div className="inline-flex items-center space-x-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl text-xs font-bold text-sky-300 transition-colors cursor-pointer mt-2 shadow-sm select-none">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>{formattedToday}</span>
            </div>
          </div>

          {/* Stats counter row of tasks on right */}
          <div className="flex items-center space-x-4 w-full md:w-auto shrink-0 mt-4 md:mt-0">
            <div className="flex-1 md:flex-none bg-slate-800/40 border border-slate-750 p-4 rounded-2xl w-32 md:w-36 text-center shadow-lg backdrop-blur-md">
              <span className="block text-white text-3xl font-black font-mono tracking-tight text-emerald-400">
                {completedTasksCount}
              </span>
              <span className="block text-slate-400 text-[9px] font-black tracking-widest uppercase mt-1">
                Tareas Listas
              </span>
            </div>
            <div className="flex-1 md:flex-none bg-slate-800/40 border border-slate-750 p-4 rounded-2xl w-32 md:w-36 text-center shadow-lg backdrop-blur-md">
              <span className="block text-white text-3xl font-black font-mono tracking-tight text-amber-500 animate-pulse">
                {pendingTasksCount}
              </span>
              <span className="block text-slate-400 text-[9px] font-black tracking-widest uppercase mt-1">
                Pendientes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5. Dynamic Strategic Summary Cards Block (Requested Component) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-1.5">
        
        {/* Card A: Ingresos Totales */}
        <div 
          onClick={() => navigate('/reportes')}
          className="relative bg-white border border-slate-200/80 hover:border-emerald-300 rounded-[24px] shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.015] cursor-pointer group flex flex-col justify-between h-[155px]"
        >
          {/* Background decoration with overflow-hidden isolated to avoid shadow cropping */}
          <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          
          <div className="relative z-10 p-6 flex flex-col justify-between h-full w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Ingresos Totales</span>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold shadow-sm shadow-emerald-500/10">
                <DollarSign className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <h4 className="text-xl md:text-2xl font-black text-slate-800 font-mono tracking-tight leading-none">
                ${totalIncomeMXN.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-bold font-sans">MXN</span>
              </h4>
              <p className="text-xs text-emerald-600 font-black font-mono leading-none">
                ≈ ${totalIncomeUSD.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] font-black font-sans uppercase">USD</span>
              </p>
              <div className="flex items-center text-[9px] font-bold text-slate-400 pt-1">
                <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
                <span>Ver flujos de caja y ledger general</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Instituciones con contratos por vencer */}
        <div 
          onClick={() => {
            if (expiringInstitutionsList.length > 0) {
              setIsExpiringModalOpen(true);
            } else {
              navigate('/instituciones');
            }
          }}
          className={`relative bg-white rounded-[24px] border shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.015] cursor-pointer group flex flex-col justify-between h-[155px] ${
            expiringInstitutionsList.length > 0 
              ? 'border-rose-200 hover:border-rose-400 bg-gradient-to-tr from-rose-50/20' 
              : 'border-slate-200/80 hover:border-slate-350'
          }`}
        >
          {/* Isolated background decorations */}
          <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/12 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          
          <div className="relative z-10 p-6 flex flex-col justify-between h-full w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Contratos Venciendo (30d)</span>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                expiringInstitutionsList.length > 0 
                  ? 'bg-rose-50 text-rose-600 shadow-rose-500/10' 
                  : 'bg-slate-50 text-slate-500'
              }`}>
                <AlertTriangle className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h4 className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${
                expiringInstitutionsList.length > 0 ? 'text-rose-605' : 'text-slate-800'
              }`}>
                {expiringInstitutionsList.length} {expiringInstitutionsList.length === 1 ? 'Socio' : 'Socios'}
              </h4>
              <span className="block text-[10px] font-bold text-slate-500">
                {expiringInstitutionsList.length > 0 
                  ? '⚠️ Requiere renovación inmediata (clic para ver)' 
                  : '✅ Todo en orden, sin renovaciones próximas'}
              </span>
            </div>
          </div>
        </div>

        {/* Card C: Tareas Urgentes */}
        <div 
          onClick={handleQuickFilterUrgentTasks}
          className={`relative bg-white rounded-[24px] border shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.015] cursor-pointer group flex flex-col justify-between h-[155px] ${
            urgentTasksCount > 0 
              ? 'border-amber-250 hover:border-amber-400 bg-gradient-to-tr from-amber-50/25' 
              : 'border-slate-200 hover:border-slate-350'
          }`}
        >
          {/* Isolated background decorations */}
          <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/12 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>

          <div className="relative z-10 p-6 flex flex-col justify-between h-full w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Tareas Urgentes</span>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                urgentTasksCount > 0 
                  ? 'bg-amber-50 text-amber-600 shadow-amber-500/10' 
                  : 'bg-slate-50 text-slate-500'
              }`}>
                <Clock className="w-5 h-5 text-amber-650" strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h4 className={`text-2xl md:text-3xl font-black font-mono tracking-tight leading-none ${
                urgentTasksCount > 0 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {urgentTasksCount} {urgentTasksCount === 1 ? 'Pendiente' : 'Pendientes'}
              </h4>
              <span className="block text-[10px] font-bold text-slate-500">
                {urgentTasksCount > 0 
                  ? '⚡ Vence hoy o retrasada (clic para filtrar)' 
                  : '🎉 Sin vencimientos urgentes acumulados'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Primary Core Modules Shortcuts (reminiscent of solicitation, client log and financial transactions reconciler) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Module 1: ALTA DE ALUMNO */}
        <div 
          onClick={() => navigate('/alumnos/nuevo')}
          className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 p-6 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer group flex items-center space-x-5"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/15 shrink-0 transition-transform group-hover:scale-105">
            <UserPlus className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 overflow-hidden">
            <h3 className="text-[#0a0a0a] font-black text-xs md:text-sm uppercase tracking-wider leading-snug">
              Inscribir Alumno
            </h3>
            <p className="text-slate-500 text-xs truncate">
              Gestión e ingreso de nuevos expedientes
            </p>
          </div>
        </div>

        {/* Module 2: ALTA DE INSTITUCIÓN */}
        <div 
          onClick={() => navigate('/instituciones/nueva')}
          className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-300 p-6 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer group flex items-center space-x-5"
        >
          <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/15 shrink-0 transition-transform group-hover:scale-105">
            <Building2 className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 overflow-hidden">
            <h3 className="text-[#0a0a0a] font-black text-xs md:text-sm uppercase tracking-wider leading-snug">
              Alta de Clientes
            </h3>
            <p className="text-slate-500 text-xs truncate">
              Registro y convenios con universidades
            </p>
          </div>
        </div>

        {/* Module 3: PAGOS Y COBROS */}
        <div 
          onClick={() => navigate('/finanzas')}
          className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 p-6 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer group flex items-center space-x-5"
        >
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/15 shrink-0 transition-transform group-hover:scale-105">
            <DollarSign className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 overflow-hidden">
            <h3 className="text-[#0a0a0a] font-black text-xs md:text-sm uppercase tracking-wider leading-snug">
              Pagos y Cobros
            </h3>
            <p className="text-slate-500 text-xs truncate">
              Conciliación bancaria y facturación
            </p>
          </div>
        </div>

      </div>

      {/* 3. Main Data Area: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid: Agenda and Tareas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Indicator Bar with Toggle */}
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-6 bg-indigo-600 rounded-full"></div>
              <h2 className="text-[#0a0a0a] font-black text-base uppercase tracking-wider flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                Agenda y Tareas
              </h2>
            </div>

            {/* Toggle Switch pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveSubView("lista")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeSubView === "lista" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Vista Lista
              </button>
              <button 
                onClick={() => setActiveSubView("calendario")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeSubView === "calendario" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Vista Calendario
              </button>
            </div>
          </div>

          {/* Agenda view body block */}
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-6">
            
            {/* Filter Sub-Section */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-slate-700">
                <Filter className="w-4 h-4 text-indigo-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filtrar Tareas</h4>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Creado por */}
                <div>
                  <label className="block text-[9 px] text-slate-400 font-bold uppercase tracking-wider mb-1">Creado por</label>
                  <select 
                    value={filterCreatedBy}
                    onChange={(e) => setFilterCreatedBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Cualquiera">Cualquiera</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id.toString()}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-[9 px] text-slate-400 font-bold uppercase tracking-wider mb-1">Responsable</label>
                  <select 
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Cualquiera">Cualquiera</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id.toString()}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-[9 px] text-slate-400 font-bold uppercase tracking-wider mb-1">Estado</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Pendientes">Pendientes</option>
                    <option value="Completadas">Completadas</option>
                  </select>
                </div>

                {/* Desde Fecha */}
                <div>
                  <label className="block text-[9 px] text-slate-400 font-bold uppercase tracking-wider mb-1">Desde Fecha</label>
                  <input 
                    type="date" 
                    value={filterDesde} 
                    onChange={e => setFilterDesde(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>

                {/* Hasta Fecha */}
                <div className="col-span-2 lg:col-span-1">
                  <label className="block text-[9 px] text-slate-400 font-bold uppercase tracking-wider mb-1">Hasta Fecha</label>
                  <input 
                    type="date" 
                    value={filterHasta} 
                    onChange={e => setFilterHasta(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>
              </div>
            </div>

            {/* Render List View vs Calendar View */}
            {activeSubView === "lista" ? (
              <div className="space-y-6">
                
                {/* 3a. TAREAS POR HACER */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                      Tareas Por Hacer ({pendingFilteredTasks.length})
                    </h3>
                  </div>

                  {pendingFilteredTasks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                      <p className="text-slate-400 text-xs font-medium">No hay tareas pendientes en este filtro.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {pendingFilteredTasks.map((task: Task) => {
                        const assignedTo = users.find(u => u.id === task.userId)?.name || "Sin asignar";
                        const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.status === 'Pendiente';
                        const badgeStyle = task.type === 'Llamada' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
                                           task.type === 'Correo' ? 'bg-purple-50 text-purple-700 border border-purple-200/50' :
                                           task.type === 'Visita' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                                           task.type === 'Meet' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50' :
                                           'bg-slate-100 text-slate-700 border border-slate-250/50';
                        const emoji = task.type === 'Llamada' ? '📞' :
                                      task.type === 'Correo' ? '✉️' :
                                      task.type === 'Visita' ? '📍' :
                                      task.type === 'Meet' ? '💻' : '📝';
                        return (
                          <div 
                            key={task.id} 
                            className={`p-4 rounded-2xl bg-white border shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-200 hover:scale-[1.005] group ${
                              isOverdue ? 'border-rose-200 shadow-rose-50/5' : 'border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-start space-x-3.5">
                              <button 
                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                className="mt-0.5 text-slate-400 hover:text-indigo-650 transition-colors shrink-0"
                              >
                                <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-600 hover:fill-indigo-50/30" />
                              </button>
                              <div className="space-y-1.5">
                                <p className="font-bold text-slate-800 text-sm">{task.title}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-500">
                                  {task.type && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${badgeStyle}`}>
                                      <span>{emoji}</span> {task.type}
                                    </span>
                                  )}
                                  <span className={`font-mono px-1.5 py-0.5 rounded-lg flex items-center ${
                                    isOverdue 
                                      ? 'text-rose-600 font-extrabold bg-rose-50 border border-rose-100 animate-pulse' 
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    Agenda: {task.dueDate || "Sin fecha"} {isOverdue ? "(Atrasada)" : ""}
                                  </span>
                                  <span className="flex items-center text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-150 font-semibold text-[9px]">
                                    <UserCheck className="w-3 h-3 mr-1 text-slate-400" /> {assignedTo}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3b. TAREAS REALIZADAS */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-550"></span>
                    <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                      Tareas Realizadas ({completedFilteredTasks.length})
                    </h3>
                  </div>

                  {completedFilteredTasks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                      <p className="text-slate-400 text-xs font-medium">Ninguna tarea ha sido completada en este filtro.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {completedFilteredTasks.map((task: Task) => {
                        const assignedTo = users.find(u => u.id === task.userId)?.name || "Sin asignar";
                        return (
                          <div 
                            key={task.id} 
                            className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 flex items-start justify-between opacity-75 hover:opacity-100 transition-opacity group"
                          >
                            <div className="flex items-start space-x-3.5">
                              <button 
                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                className="mt-0.5 text-emerald-600 shrink-0"
                              >
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                              </button>
                              <div className="space-y-1">
                                <p className="font-medium text-slate-500 line-through text-sm">{task.title}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400">
                                  {task.type && (
                                    <span className="bg-slate-200 text-slate-605 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider text-[8px]">
                                      {task.type}
                                    </span>
                                  )}
                                  <span className="font-mono">Fecha: {task.dueDate}</span>
                                  <span className="flex items-center">
                                    <UserCheck className="w-3 h-3 mr-1" /> {assignedTo}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* Miniature Month Calendar View Block */
              <div className="space-y-4">
                
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <button 
                    type="button" 
                    onClick={() => navigateMonth(-1)}
                    className="p-1 px-3 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 select-none"
                  >
                    Anterior
                  </button>
                  <span className="text-slate-800 text-xs font-black tracking-widest">{monthName} {yearName}</span>
                  <button 
                    type="button" 
                    onClick={() => navigateMonth(1)}
                    className="p-1 px-3 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 select-none"
                  >
                    Siguiente
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {/* Calendar Headers */}
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dayHeader, dhIdx) => (
                    <div key={dhIdx} className="text-[10px] font-black text-slate-400 uppercase py-1">{dayHeader}</div>
                  ))}
                  
                  {/* Calendar Matrix layout */}
                  {calendarDays.map((dayDate, dIdx) => {
                    if (!dayDate) {
                      return <div key={dIdx} className="aspect-square bg-slate-50/20 rounded-md"></div>;
                    }

                    const formattedDateStr = dayDate.toISOString().split('T')[0];
                    const dayTasks = tasks.filter(t => t.dueDate === formattedDateStr);
                    const pendingDayTasks = dayTasks.filter(t => t.status === 'Pendiente');
                    const hasPendingTasks = pendingDayTasks.length > 0;
                    const isCalendarToday = dayDate.getDate() === today.getDate() && 
                                            dayDate.getMonth() === today.getMonth() && 
                                            dayDate.getFullYear() === today.getFullYear();

                    return (
                      <div 
                        key={dIdx} 
                        className={`aspect-square p-1 rounded-xl flex flex-col justify-between items-center border transition-all ${
                          isCalendarToday
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/10'
                            : 'bg-white text-slate-800 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold leading-none">{dayDate.getDate()}</span>
                        {dayTasks.length > 0 && (
                          <div className="flex space-x-0.5 justify-center w-full">
                            <span className={`w-1.5 h-1.5 rounded-full ${isCalendarToday ? 'bg-sky-300' : hasPendingTasks ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            {dayTasks.length > 1 && (
                              <span className={`w-1.5 h-1.5 rounded-full ${isCalendarToday ? 'bg-white' : 'bg-slate-300'}`}></span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend or Quick summary header below calendar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-around text-[10px] font-bold text-slate-500">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>Pendientes</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Completadas</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>Hoy</span>
                </div>
              </div>
            )}

            {/* "+ AGREGAR NUEVA TAREA" button inside container */}
            <div className="pt-2 border-t border-slate-100">
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all bg-white hover:bg-slate-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Nueva Tarea
              </button>
            </div>

          </div>

        </div>

        {/* Right Grid: Navigation Shortcuts column matching the layout */}
        <div className="space-y-6">
          
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm h-[58px] shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-6 bg-slate-800 rounded-full"></div>
              <h2 className="text-[#0a0a0a] font-black text-base uppercase tracking-wider flex items-center">
                <Layers className="w-5 h-5 mr-2 text-slate-800" />
                Shortcuts
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Shortcut 1: DASHBOARD */}
            <Link 
              to="/dashboard" 
              className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-[#0a0a0a] tracking-wider leading-none">Dashboard</h4>
                  <p className="text-slate-400 text-[10px] leading-none select-none">Resumen de ventas y KPIs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350 transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>

            {/* Shortcut 2: PROVEEDORES */}
            <Link 
              to="/proveedores" 
              className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-[#0a0a0a] tracking-wider leading-none">Proveedores</h4>
                  <p className="text-slate-400 text-[10px] leading-none select-none">Gestión de partners</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350 transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>

            {/* Shortcut 3: CATÁLOGOS */}
            <Link 
              to="/catalogos" 
              className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold">
                  <List className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-[#0a0a0a] tracking-wider leading-none">Catálogos</h4>
                  <p className="text-slate-400 text-[10px] leading-none select-none">Países y tipos de cambio</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350 transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>

            {/* Shortcut 4: REPORTES */}
            <Link 
              to="/reportes" 
              className="p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold">
                  <BarChart className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-[#0a0a0a] tracking-wider leading-none">Reportes</h4>
                  <p className="text-slate-400 text-[10px] leading-none select-none">Análisis detallado de flujos</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350 transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>

          </div>

          {/* Quick Info Box for extra elegant styling (YTD or dynamic growth stats) */}
          <div className="bg-slate-900 border border-slate-800 rounded-[28px] text-white shadow-xl relative group">
            <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-sky-500/0 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
            </div>
            
            <div className="relative z-10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 leading-none">
                  Estadística Global
                </span>
                <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md leading-none">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.4%</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-2xl font-light tracking-tight text-white font-mono shrink-0">
                  {students.reduce((acc, inst) => acc + (inst.students || 0), 0).toLocaleString()}
                </span>
                <span className="block text-[10px] text-slate-400 font-semibold leading-none">
                  Alumnos en seguimiento activo
                </span>
              </div>

              <div className="h-px bg-slate-800 my-2"></div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl">
                  <span className="block font-black text-slate-350">{institutions.length}</span>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wide font-semibold mt-0.5">Socios</span>
                </div>
                <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl">
                  <span className="block font-black text-slate-350 font-mono">
                    ${(totalFinancialFlujoMXN / 1000).toFixed(0)}k
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wide font-semibold mt-0.5">MXN Flujo</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Dynamic Modal to Add Tarea */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Agregar Nueva Tarea">
        <form onSubmit={handleTaskSubmit} className="space-y-4 text-left">
          
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Título o Descripción de la Tarea *</label>
            <input 
              required 
              type="text" 
              value={taskForm.title} 
              onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ej. Llamar a Rectoría de la UANL" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Vencimiento *</label>
              <input 
                required 
                type="date" 
                value={taskForm.dueDate} 
                onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Tarea *</label>
              <select 
                value={taskForm.type} 
                onChange={e => setTaskForm({...taskForm, type: e.target.value as TaskType})} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-705"
              >
                <option value="Llamada">📞 Llamada</option>
                <option value="Correo">✉️ Correo</option>
                <option value="Visita">📍 Visita</option>
                <option value="Meet">💻 Videollamada Meet</option>
                <option value="Otro">📝 Otro / Seguimiento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Responsable / Asignado *</label>
              <select 
                required
                value={taskForm.userId} 
                onChange={e => setTaskForm({...taskForm, userId: e.target.value})} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-705 font-bold"
              >
                <option value="">Selecciona responsable...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id.toString()}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Universidad Relacionada (Opcional)</label>
              <select 
                value={taskForm.institutionId} 
                onChange={e => setTaskForm({...taskForm, institutionId: e.target.value})} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">Ninguna</option>
                {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(inst => (
                  <option key={inst.id} value={inst.id.toString()}>{inst.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsTaskModalOpen(false)} 
              className="px-5 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800 tracking-widest transition-colors select-none"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest text-white rounded-xl shadow-md shadow-indigo-650/15 transition-all flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Crear Tarea
            </button>
          </div>
          
        </form>
      </Modal>

      {/* Dynamic Modal to Show Expiring Contracts / Institutions */}
      <Modal 
        isOpen={isExpiringModalOpen} 
        onClose={() => setIsExpiringModalOpen(false)} 
        title="Socios con Convenios de Membresía por vencer"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-500 font-medium">
            Los siguientes socios estratégicos tienen su membresía o contrato registrado por expirar en los próximos 30 días, o ya vencido. Te recomendamos contactar a su gestor institucional para la firma de renovación.
          </p>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {expiringInstitutionsList.map(inst => {
              const remainsDays = inst.membershipExpiration 
                ? Math.ceil((new Date(inst.membershipExpiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) 
                : 0;

              return (
                <div 
                  key={inst.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm hover:shadow transition-all ${
                    remainsDays < 0 
                      ? 'bg-rose-50/40 border-rose-250' 
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden">
                    <h5 className="font-bold text-slate-900 text-sm truncate">{inst.name}</h5>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
                      <span className="flex items-center text-slate-400">
                        📍 {inst.country}
                      </span>
                      <span>•</span>
                      <span className="text-slate-550">
                        Contacto: {inst.contact || 'S/N'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider mb-1 text-center border ${
                      remainsDays < 0 
                        ? 'bg-rose-100 text-rose-800 border-rose-250' 
                        : remainsDays === 0 
                          ? 'bg-amber-100 text-amber-800 border-amber-250' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {remainsDays < 0 
                        ? 'Vencido' 
                        : remainsDays === 0 
                          ? 'Vence hoy' 
                          : `Vence en ${remainsDays}d`}
                    </span>
                    <button
                      onClick={() => {
                        setIsExpiringModalOpen(false);
                        navigate(`/instituciones/${inst.id}`);
                      }}
                      className="block text-[10px] font-black text-indigo-600 hover:text-indigo-800 hover:underline text-right mt-1"
                    >
                      Ver Detalle →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsExpiringModalOpen(false)} 
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 font-black text-xs uppercase tracking-widest text-white rounded-xl shadow-md transition-all select-none"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
