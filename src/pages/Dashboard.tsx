import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  UserPlus,
  CalendarPlus,
  FileBarChart2,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { institutions, students, classes, enrollments, providers, financialTransactions, payments } = useAppContext();
  const [dashboardView, setDashboardView] = useState<'performance' | 'cobranza'>('performance');
  const [semaforoFilter, setSemaforoFilter] = useState<'all' | 'rojo' | 'amarillo' | 'verde'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstId, setSelectedInstId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'alumnos-desc' | 'alumnos-asc' | 'nombre-asc' | 'nombre-desc' | 'ingresos-desc'>('alumnos-desc');

  const [cobranzaSort, setCobranzaSort] = useState<{
    key: 'institucion' | 'recaudado' | 'pendiente' | 'percentagePending';
    direction: 'asc' | 'desc';
  }>({ key: 'percentagePending', direction: 'desc' });

  const handleCobranzaSort = (key: 'institucion' | 'recaudado' | 'pendiente' | 'percentagePending') => {
    setCobranzaSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const renderSortIcon = (key: 'institucion' | 'recaudado' | 'pendiente' | 'percentagePending') => {
    if (cobranzaSort.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-350 shrink-0 ml-1 inline-block" />;
    }
    if (cobranzaSort.direction === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1 inline-block" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1 inline-block" />;
  };

  // Filter core context arrays based on selected institution
  const filteredStudents = useMemo(() => {
    if (selectedInstId === 'all') return students;
    return students.filter(s => Number(s.institutionId) === Number(selectedInstId));
  }, [students, selectedInstId]);

  const filteredStudentIds = useMemo(() => {
    return filteredStudents.map(s => s.id);
  }, [filteredStudents]);

  const filteredEnrollments = useMemo(() => {
    if (selectedInstId === 'all') return enrollments;
    return enrollments.filter(e => filteredStudentIds.includes(e.studentId));
  }, [enrollments, filteredStudentIds, selectedInstId]);

  const filteredInstitutions = useMemo(() => {
    if (selectedInstId === 'all') return institutions;
    return institutions.filter(i => Number(i.id) === Number(selectedInstId));
  }, [institutions, selectedInstId]);

  const filteredFinancialTransactions = useMemo(() => {
    if (selectedInstId === 'all') return financialTransactions;
    return financialTransactions.filter(tx => {
      if (tx.institutionId && Number(tx.institutionId) === Number(selectedInstId)) return true;
      if (tx.studentId && filteredStudentIds.includes(tx.studentId)) return true;
      return false;
    });
  }, [financialTransactions, selectedInstId, filteredStudentIds]);

  const filteredPayments = useMemo(() => {
    if (selectedInstId === 'all') return payments;
    return (payments || []).filter(p => p.studentId && filteredStudentIds.includes(p.studentId));
  }, [payments, filteredStudentIds, selectedInstId]);

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
  
  // Resolve price for enrollment if null, using catalog pricing fallback
  const getAgreedPrice = (e: any) => {
    let cp = e.price;
    if (cp === undefined || cp === null) {
      const cl = classes.find(c => Number(c.id) === Number(e.classId));
      if (cl) {
        const student = students.find(s => Number(s.id) === Number(e.studentId));
        const inst = student ? institutions.find(i => Number(i.id) === Number(student.institutionId)) : null;
        const cType = cl.creditType;
        let valStr = "";
        if (inst) {
          if (cType === 'Medio Crédito') valStr = inst.priceHalfCredit || "";
          else if (cType === 'Crédito completo AP') valStr = inst.priceFullApCredit || "";
          else if (cType === 'Medio Crédito AP') valStr = inst.priceHalfApCredit || "";
          else if (cType === 'Crédito completo') valStr = inst.priceFullCredit || "";
        }
        if (valStr) {
          cp = parseFloat(valStr.replace(/[^0-9.-]+/g, "") || "0");
        } else {
          cp = parseFloat((cl.price || "0").replace(/[^0-9.-]+/g, "") || "0");
        }
      } else {
        cp = 0;
      }
    }
    return cp;
  };

  // Convert institutions into dynamic rows mapped with real real DB state
  const institutionMetrics = useMemo(() => {
    return filteredInstitutions.map(inst => {
      const instStudentsList = filteredStudents.filter(s => Number(s.institutionId) === Number(inst.id));
      const instStudentIds = instStudentsList.map(s => Number(s.id));
      const instEnrollments = filteredEnrollments.filter(e => instStudentIds.includes(Number(e.studentId)));
      
      // Fallback to static count only if we don't have registered items yet
      const alumnosCount = instStudentsList.length || inst.students || 0;
      
      const activeEnrollments = instEnrollments.filter(e => e.status !== 'Withdrawn');
      const dynamicRevenue = activeEnrollments.length > 0
        ? activeEnrollments.reduce((sum, e) => sum + getAgreedPrice(e), 0)
        : (inst.revenue || 0);

      return {
        ...inst,
        alumnosCount,
        revenueValue: dynamicRevenue
      };
    });
  }, [filteredInstitutions, filteredStudents, filteredEnrollments]);

  const totalStudents = useMemo(() => {
    return institutionMetrics.reduce((acc, inst) => acc + inst.alumnosCount, 0);
  }, [institutionMetrics]);

  const totalExpectedRevenue = useMemo(() => {
    return institutionMetrics.reduce((acc, inst) => acc + inst.revenueValue, 0);
  }, [institutionMetrics]);

  const formattedRevenue = useMemo(() => {
    return totalExpectedRevenue >= 1000000
      ? (totalExpectedRevenue / 1000000).toFixed(2) + 'M'
      : totalExpectedRevenue.toLocaleString();
  }, [totalExpectedRevenue]);

  // Filter and sort for premium top-performing institutions (only with students, ordered desc)
  const premiumInstitutionMetrics = useMemo(() => {
    return [...institutionMetrics]
      .filter(inst => inst.alumnosCount > 0)
      .sort((a, b) => {
        if (sortKey === 'nombre-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortKey === 'nombre-desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortKey === 'alumnos-asc') {
          return a.alumnosCount - b.alumnosCount;
        }
        if (sortKey === 'ingresos-desc') {
          return b.revenueValue - a.revenueValue;
        }
        // Default to alumnos-desc
        return b.alumnosCount - a.alumnosCount;
      });
  }, [institutionMetrics, sortKey]);

  // Calculation of institutions by country
  const institutionsByCountry = useMemo(() => {
    const countryMap = new Map<string, number>();
    filteredInstitutions.forEach(inst => {
      const country = inst.country?.trim() || 'Sin especificar';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    
    const results = Array.from(countryMap.entries()).map(([name, count]) => ({
      name,
      count
    }));
    
    // Sort by count descending
    results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return results;
  }, [filteredInstitutions]);

  const totalCountryInstitutions = useMemo(() => {
    return institutionsByCountry.reduce((acc, item) => acc + item.count, 0);
  }, [institutionsByCountry]);

  // Calculation of active students per provider
  const providerStudentsMetric = useMemo(() => {
    const activeEnrollments = filteredEnrollments.filter(e => e.status !== 'Withdrawn');
    const providerMap = new Map<number, Set<number>>();

    activeEnrollments.forEach(e => {
      let resolvedProviderId = e.providerId;
      if (!resolvedProviderId) {
        const cl = classes.find(c => Number(c.id) === Number(e.classId));
        resolvedProviderId = cl?.providerId;
      }
      
      if (resolvedProviderId) {
        if (!providerMap.has(resolvedProviderId)) {
          providerMap.set(resolvedProviderId, new Set());
        }
        providerMap.get(resolvedProviderId)!.add(e.studentId);
      }
    });

    const results = providers.map(p => {
      const studentSet = providerMap.get(p.id);
      const count = studentSet ? studentSet.size : 0;
      return {
        id: p.id,
        name: p.commercialName || p.legalName || `Proveedor ${p.id}`,
        count
      };
    });

    // Sort by count descending
    results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return results;
  }, [filteredEnrollments, classes, providers]);

  const totalProviderStudents = useMemo(() => {
    return providerStudentsMetric.reduce((acc, item) => acc + item.count, 0);
  }, [providerStudentsMetric]);

  // Create collection metrics for "semáforo de cobranza"
  const collectionMetrics = useMemo(() => {
    return filteredInstitutions.map(inst => {
      const instStudents = filteredStudents.filter(s => Number(s.institutionId) === Number(inst.id));
      const instStudentIds = instStudents.map(s => s.id);

      // Total vendido/esperado de inscripciones calculado con precios reales pactados
      const instEnrollments = filteredEnrollments.filter(e => instStudentIds.includes(e.studentId));
      const activeEnrollments = instEnrollments.filter(e => e.status !== 'Withdrawn');
      
      const totalVendido = activeEnrollments.length > 0
        ? activeEnrollments.reduce((sum, e) => sum + getAgreedPrice(e), 0)
        : (inst.revenue || 0);

      // Total pagado/recaudado de las transacciones (financialTransactions) (ignoring initial mock transactions)
      const instTxPayments = filteredFinancialTransactions.filter(p => 
        !String(p.id).startsWith('tx-init-') &&
        (Number(p.institutionId) === Number(inst.id) || (p.studentId && instStudentIds.includes(p.studentId))) && 
        p.type === 'income' && 
        (p.status === 'Aplicado' || p.status === 'Pagado')
      );
      const totalTxPagadoUSD = instTxPayments.reduce((sum, p) => {
        const isOrigUSD = p.originalCurrency === 'USD' || (p.currency === 'USD' && !p.originalCurrency);
        const hasCustomRate = p.exchangeRate !== undefined && p.exchangeRate !== 1 && p.exchangeRate !== 0;

        const txAmountMXN = isOrigUSD 
          ? (hasCustomRate 
              ? (p.amountMXN || (p.originalAmount !== undefined ? p.originalAmount : p.amount) * p.exchangeRate)
              : ((p.originalAmount !== undefined ? p.originalAmount : p.amount) * averageUsdRate))
          : (p.amountMXN || p.amount);

        const txAmountUSD = isOrigUSD
          ? (p.originalAmount !== undefined ? p.originalAmount : p.amount)
          : (hasCustomRate ? txAmountMXN / p.exchangeRate : txAmountMXN / averageUsdRate);

        return sum + txAmountUSD;
      }, 0);

      // Pagos de alumnos reales en el listado de payments
      const instStudentPayments = filteredPayments.filter(p => 
        p.studentId && instStudentIds.includes(p.studentId)
      );
      const totalStudentPagadoUSD = instStudentPayments.reduce((sum, p) => {
        const rate = p.exchangeRate || averageUsdRate || 18.0;
        return sum + ((p.finalAmount || p.amount || 0) / rate);
      }, 0);

      const totalPagado = totalTxPagadoUSD + totalStudentPagadoUSD;

      const saldoPendiente = Math.max(0, totalVendido - totalPagado);
      const percentagePending = totalVendido > 0 ? (saldoPendiente / totalVendido) * 100 : 0;

      // Classicate traffic light status
      let semaforoColor: 'red' | 'yellow' | 'green' = 'green';
      if (percentagePending > 50) {
        semaforoColor = 'red';
      } else if (percentagePending > 15) {
        semaforoColor = 'yellow';
      }

      return {
        ...inst,
        alumnosCount: instStudents.length,
        totalVendido,
        totalPagado,
        saldoPendiente,
        percentagePending,
        semaforoColor
      };
    });
  }, [filteredInstitutions, filteredStudents, filteredEnrollments, filteredFinancialTransactions, filteredPayments, averageUsdRate]);

  const sortedCobranzaMetrics = useMemo(() => {
    const list = collectionMetrics.filter(inst => {
      const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (inst.country?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const semaforoColorTranslation: Record<string, string> = {
        rojo: 'red',
        amarillo: 'yellow',
        verde: 'green'
      };
      const matchesSemaforo = semaforoFilter === 'all' || inst.semaforoColor === semaforoColorTranslation[semaforoFilter];
      return matchesSearch && matchesSemaforo;
    });

    return [...list]
      .sort((a, b) => {
        let comparison = 0;
        if (cobranzaSort.key === 'institucion') {
          comparison = a.name.localeCompare(b.name);
        } else if (cobranzaSort.key === 'recaudado') {
          comparison = (a.totalPagado || 0) - (b.totalPagado || 0);
        } else if (cobranzaSort.key === 'pendiente') {
          comparison = (a.saldoPendiente || 0) - (b.saldoPendiente || 0);
        } else if (cobranzaSort.key === 'percentagePending') {
          comparison = (a.percentagePending || 0) - (b.percentagePending || 0);
        }

        return cobranzaSort.direction === 'asc' ? comparison : -comparison;
      });
  }, [collectionMetrics, searchQuery, semaforoFilter, cobranzaSort]);

  const totalPagadoReal = useMemo(() => {
    return collectionMetrics.reduce((acc, inst) => acc + (inst.totalPagado || 0), 0);
  }, [collectionMetrics]);

  const formattedPagadoReal = useMemo(() => {
    return totalPagadoReal >= 1000000
      ? (totalPagadoReal / 1000000).toFixed(2) + 'M'
      : totalPagadoReal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, [totalPagadoReal]);

  // Dynamic monthly income vs expenses computation for Recharts BarChart
  const monthlyFinanceData = useMemo(() => {
    // Standard Spanish month labels
    const monthsInSpanish = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    const currentYear = new Date().getFullYear();
    
    // Default current/recent months if no transactions exist to populate nicely
    for (let m = 0; m < 12; m++) {
      const monthKey = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      monthlyMap[monthKey] = { income: 0, expense: 0 };
    }

    // Dynamic identifier for robust year-month pattern parsing
    const getYearMonthKey = (dateStr: string): string | null => {
      if (!dateStr) return null;
      const clean = dateStr.trim();
      const parts = clean.includes('/') ? clean.split('/') : clean.split('-');
      if (parts.length >= 2) {
        // YYYY-MM-DD or YYYY/MM/DD
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}`;
        }
        // DD-MM-YYYY or DD/MM/YYYY
        if (parts.length >= 3 && parts[2].substring(0, 4).length === 4) {
          return `${parts[2].substring(0, 4)}-${parts[1].padStart(2, '0')}`;
        }
      }
      return null;
    };
    
    // Process real transactions
    filteredFinancialTransactions.forEach(tx => {
      if (!tx.date) return;
      if (typeof tx.id === 'string' && tx.id.startsWith('tx-init-')) return;
      const monthKey = getYearMonthKey(tx.date);
      if (monthKey) {
        const isOrigUSD = tx.originalCurrency === 'USD' || (tx.currency === 'USD' && !tx.originalCurrency);
        const hasCustomRate = tx.exchangeRate !== undefined && tx.exchangeRate !== 1 && tx.exchangeRate !== 0;

        const txAmountMXN = isOrigUSD 
          ? (hasCustomRate 
              ? (tx.amountMXN || (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * tx.exchangeRate)
              : ((tx.originalAmount !== undefined ? tx.originalAmount : tx.amount) * averageUsdRate))
          : (tx.amountMXN || tx.amount);
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { income: 0, expense: 0 };
        }
        
        if (tx.type === 'income') {
          monthlyMap[monthKey].income += txAmountMXN;
        } else if (tx.type === 'expense') {
          monthlyMap[monthKey].expense += txAmountMXN;
        }
      }
    });

    // Process real student payments as additional incomes/revenues
    const resolvedPayments = filteredPayments || [];
    resolvedPayments.forEach(p => {
      if (!p.date) return;
      const monthKey = getYearMonthKey(p.date);
      if (monthKey) {
        const amount = p.finalAmount || p.amount || 0;
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { income: 0, expense: 0 };
        }
        
        // If a payment has a providerId and no studentId, it can be counted as expense, otherwise income
        if (p.providerId && !p.studentId) {
          monthlyMap[monthKey].expense += amount;
        } else {
          monthlyMap[monthKey].income += amount;
        }
      }
    });
    
    // Convert map to array and sort chronologically
    const sortedKeys = Object.keys(monthlyMap).sort();
    
    // Map to formatted array for Recharts
    const records = sortedKeys.map(key => {
      const parts = key.split('-');
      const year = parts[0];
      const monthNum = parts[1];
      const monthIdx = parseInt(monthNum, 10) - 1;
      const label = `${monthsInSpanish[monthIdx] || 'Mes'} ${year.substring(2)}`;
      
      return {
        key,
        name: label,
        Ingresos: Math.round(monthlyMap[key].income),
        Egresos: Math.round(monthlyMap[key].expense),
        Balance: Math.round(monthlyMap[key].income - monthlyMap[key].expense)
      };
    });
    
    // Filter records to only show those that have actual transactions (Ingresos or Egresos > 0)
    const activeRecords = records.filter(r => r.Ingresos > 0 || r.Egresos > 0);
    
    // If we have active records with actual data, return them (up to the last 6 months)
    if (activeRecords.length > 0) {
      return activeRecords.slice(-6);
    }
    
    // Fallback: If no transactions have been registered yet, show past or present months of the current year
    return records.filter(r => {
      const currentMonth = new Date().getMonth() + 1;
      const parts = r.key.split('-');
      const y = parts[0];
      const mStr = parts[1];
      const isCurrentYear = parseInt(y, 10) === currentYear;
      const isPastOrPresentMonth = parseInt(mStr, 10) <= currentMonth;
      return isCurrentYear && isPastOrPresentMonth;
    }).slice(-6);
  }, [filteredFinancialTransactions, filteredPayments, averageUsdRate]);

  const currentChartTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    monthlyFinanceData.forEach(d => {
      totalIn += d.Ingresos || 0;
      totalOut += d.Egresos || 0;
    });
    return {
      ingresos: totalIn,
      egresos: totalOut,
      balance: totalIn - totalOut
    };
  }, [monthlyFinanceData]);

  return (
    <div className="space-y-8 flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header and Filter/Ordering Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-sans text-slate-800 tracking-tight">Dashboard General</h1>
          <p className="text-xs text-slate-500 mt-1">Monitoreo en tiempo real de alumnos, cobranza y balance operativo consolidado.</p>
        </div>
        
        {/* Modern Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto items-stretch sm:items-center">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Instituto:</span>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer max-w-[200px]"
            >
              <option value="all">🏢 Todos los Institutos ({institutions.length})</option>
              {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(inst => (
                <option key={inst.id} value={inst.id}>
                  🏢 {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Ordenar por:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer"
            >
              <option value="alumnos-desc">👥 Alumnos (Mayor a Menor)</option>
              <option value="alumnos-asc">👥 Alumnos (Menor a Mayor)</option>
              <option value="nombre-asc">🔤 Nombre (A-Z)</option>
              <option value="nombre-desc">🔤 Nombre (Z-A)</option>
              <option value="ingresos-desc">💰 Ingresos (Mayor a Menor)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid Card Segment */}
      <div className="space-y-3 shrink-0">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Add student */}
          <div 
            onClick={() => navigate('/alumnos/nuevo')}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-400 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group flex items-start space-x-4 select-none"
          >
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5 font-bold" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Registrar Alumno</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Inscribe un nuevo expediente homeschool o regular</p>
            </div>
          </div>

          {/* Card 2: Schedule class */}
          <div 
            onClick={() => navigate('/clases')}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-emerald-400 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group flex items-start space-x-4 select-none"
          >
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarPlus className="w-5 h-5 font-bold" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">Programar Clases</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Asigna materias y coordina horarios de profesores</p>
            </div>
          </div>

          {/* Card 3: Monthly Reports */}
          <div 
            onClick={() => navigate('/reportes')}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-amber-400 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group flex items-start space-x-4 select-none"
          >
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileBarChart2 className="w-5 h-5 font-bold" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">Reportes Mensuales</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Analiza estadísticas de cobranza y rendimiento académico</p>
            </div>
          </div>

          {/* Card 4: Finanzas reconciliation */}
          <div 
            onClick={() => navigate('/finanzas')}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-violet-400 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group flex items-start space-x-4 select-none"
          >
            <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 font-bold" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-violet-600 transition-colors">Escanear Facturas/OCR</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Sube y extrae transacciones bancarias automáticamente</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Instituciones Activas</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">{institutions.length}</span>
            <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">↑ 12%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Alumnos Globales</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">{totalStudents.toLocaleString()}</span>
            <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">↑ 4.2k</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Ingresos Esperados</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">${formattedRevenue} <span className="text-xs font-bold text-slate-400">USD</span></span>
            <span className="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded text-xs font-semibold">Meta 85%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Pagos Recibidos (Cobranza)</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">${formattedPagadoReal} <span className="text-xs font-bold text-slate-400">USD</span></span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
              {totalExpectedRevenue > 0 ? ((totalPagadoReal / totalExpectedRevenue) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      </div>

      {/* BarChart Visualizer: Ingresos vs Egresos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase text-[10px] tracking-widest">Balance Financiero Operativo</h3>
              <p className="text-slate-400 text-[11px] font-sans font-medium">Flujo consolidado de ingresos frente a egresos en los últimos meses autorizados</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></span>Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>Egresos</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyFinanceData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'medium' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={v => `$${v >= 1000 ? (v / 1000) + 'k' : v}`}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'medium' }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataObj = payload[0].payload;
                      const bal = dataObj.Ingresos - dataObj.Egresos;
                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-lg text-xs leading-5">
                          <p className="font-extrabold text-slate-400 mb-1 font-mono tracking-wider">{dataObj.name}</p>
                          <p className="flex justify-between gap-4 font-medium"><span className="text-slate-350">Ingresos:</span> <span className="font-mono font-bold text-emerald-400">${dataObj.Ingresos.toLocaleString()}</span></p>
                          <p className="flex justify-between gap-4 font-medium"><span className="text-slate-350">Egresos:</span> <span className="font-mono font-bold text-rose-400">${dataObj.Egresos.toLocaleString()}</span></p>
                          <div className="border-t border-slate-800 mt-1.5 pt-1 flex justify-between gap-4 text-[11px] font-black uppercase tracking-wider">
                            <span>Balance:</span>
                            <span className={bal >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              ${bal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="Ingresos" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={32}
                />
                <Bar 
                  dataKey="Egresos" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Balance Breakdown Widget */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between font-sans">
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#4f46e5] block mb-1">Resumen del Periodo</span>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-4">Métricas consolidadas de las operaciones financieras del periodo visible</p>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Ingresos</span>
                <span className="text-lg font-bold text-slate-800 font-mono">${currentChartTotals.ingresos.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Egresos</span>
                <span className="text-lg font-bold text-slate-800 font-mono">${currentChartTotals.egresos.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className={`p-4 rounded-xl border text-center transition-colors ${
              currentChartTotals.balance >= 0 
                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50/50 border-rose-100 text-rose-800"
            }`}>
              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 opacity-80">Superávit Consolidado</span>
              <span className="text-xl font-black font-mono leading-none">
                ${currentChartTotals.balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Table Column */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
          {/* Dual Tab Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-10 shrink-0">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl self-start select-none">
              <button
                type="button"
                onClick={() => setDashboardView('performance')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-0 cursor-pointer ${
                  dashboardView === 'performance'
                    ? 'bg-white text-indigo-750 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent font-bold'
                }`}
              >
                Top Performance
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('cobranza')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                  dashboardView === 'cobranza'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent font-bold'
                }`}
              >
                Semáforo de Cobranza
              </button>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                {dashboardView === 'performance' ? "Comportamiento del Alumnado" : "Control de Cartera de Clientes"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {dashboardView === 'performance' 
                  ? `${premiumInstitutionMetrics.length} de ${institutions.length} activas` 
                  : `${collectionMetrics.length} evaluadas`
                }
              </span>
            </div>
          </div>

          {/* Filtering Controls exclusively for Cobranza view */}
          {dashboardView === 'cobranza' && (
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="relative w-full sm:w-1/2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar institución..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-indigo-550 focus:border-indigo-500 outline-none placeholder:text-slate-400 font-semibold text-slate-800 bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto self-start sm:self-center pr-2">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase shrink-0 font-mono">Semáforo:</span>
                {(['all', 'rojo', 'amarillo', 'verde'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => setSemaforoFilter(color)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize transition-all whitespace-nowrap cursor-pointer ${
                      semaforoFilter === color
                        ? color === 'all'
                          ? 'bg-slate-800 border-slate-800 text-white'
                          : color === 'rojo'
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : color === 'amarillo'
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-emerald-600 border-emerald-600 text-white'
                        : color === 'all'
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : color === 'rojo'
                        ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50'
                        : color === 'amarillo'
                        ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50'
                    }`}
                  >
                    {color === 'all' ? 'Ver Todos' : color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-auto flex-1 h-[300px] lg:h-auto px-2">
            {dashboardView === 'performance' ? (
              <table className="w-full text-left border-collapse">
                <thead className="text-slate-400 text-[10px] uppercase font-bold sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-widest border-b border-slate-100">Nombre Institución</th>
                    <th className="px-6 py-4 font-semibold tracking-widest border-b border-slate-100">Ubicación</th>
                    <th className="px-6 py-4 font-semibold tracking-widest text-right border-b border-slate-100">Alumnos</th>
                    <th className="px-6 py-4 font-semibold tracking-widest text-center border-b border-slate-100">Estado Pago</th>
                    <th className="px-6 py-4 font-semibold tracking-widest text-right border-b border-slate-100">Ingresos Esperados (USD)</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {premiumInstitutionMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No hay instituciones con alumnos registrados actualmente
                      </td>
                    </tr>
                  ) : (
                    premiumInstitutionMetrics.map(inst => (
                      <tr 
                        key={inst.id} 
                        onClick={() => navigate(`/instituciones/${inst.id}`)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        title="Ver Perfil de Institución"
                      >
                        <td className="px-6 py-3.5 font-semibold text-slate-800 border-b border-slate-50 group-hover:text-indigo-600 group-hover:underline">{inst.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 border-b border-slate-50">{inst.country}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-slate-600 border-b border-slate-50">{inst.alumnosCount.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-center border-b border-slate-50">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest border ${
                            inst.status === 'Al corriente' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            inst.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {inst.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-medium text-slate-800 border-b border-slate-50">${inst.revenueValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              // Semáforo de Cobranza View
              <table className="w-full text-left border-collapse">
                <thead className="text-slate-400 text-[10px] uppercase font-bold sticky top-0 bg-white z-10">
                  <tr>
                    <th 
                      onClick={() => handleCobranzaSort('institucion')}
                      className="px-6 py-4 font-semibold tracking-widest border-b border-slate-100 cursor-pointer select-none hover:bg-slate-50/80 transition"
                      title="Ordenar por Institución"
                    >
                      <div className="flex items-center gap-1">
                        Institución
                        {renderSortIcon('institucion')}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right select-none">Total Vendido (USD)</th>
                    <th 
                      onClick={() => handleCobranzaSort('recaudado')}
                      className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right cursor-pointer select-none hover:bg-slate-50/80 transition"
                      title="Ordenar por Recaudado"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Recaudado (USD)
                        {renderSortIcon('recaudado')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleCobranzaSort('pendiente')}
                      className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right cursor-pointer select-none hover:bg-slate-50/80 transition"
                      title="Ordenar por Pendiente"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Pendiente (USD)
                        {renderSortIcon('pendiente')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleCobranzaSort('percentagePending')}
                      className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-center cursor-pointer select-none hover:bg-slate-50/80 transition"
                      title="Ordenar por % Pendiente"
                    >
                      <div className="flex items-center justify-center gap-1">
                        % Pendiente
                        {renderSortIcon('percentagePending')}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-center select-none">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {sortedCobranzaMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No se encontraron instituciones con los criterios seleccionados
                      </td>
                    </tr>
                  ) : (
                    sortedCobranzaMetrics.map(inst => (
                      <tr 
                        key={inst.id} 
                        onClick={() => navigate(`/instituciones/${inst.id}`)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                        title="Ver Perfil de Institución"
                      >
                        <td className="px-6 py-3 border-b border-slate-50">
                          <p className="font-bold text-slate-800 leading-snug group-hover:text-indigo-650 group-hover:underline">{inst.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="font-mono">{inst.country || 'Sin especificar'}</span>
                            <span>•</span>
                            <span>{inst.alumnosCount} alumnos</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-mono font-bold text-right border-b border-slate-50 text-slate-800">
                          ${inst.totalVendido.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD
                        </td>
                        <td className="px-6 py-3 font-mono font-semibold text-right border-b border-slate-50 text-emerald-600">
                          ${inst.totalPagado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </td>
                        <td className="px-6 py-3 font-mono font-black text-right border-b border-slate-50 text-slate-900 bg-slate-50/40">
                          ${inst.saldoPendiente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </td>
                        <td className="px-6 py-3 border-b border-slate-50 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-extrabold text-[11px] text-slate-700">
                              {inst.percentagePending.toFixed(1)}%
                            </span>
                            <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 hidden md:inline-block">
                              <div 
                                className={`h-full rounded-full ${
                                  inst.semaforoColor === 'red' ? 'bg-rose-500' : 
                                  inst.semaforoColor === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${inst.percentagePending}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 border-b border-slate-50 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                            inst.semaforoColor === 'red' 
                              ? 'bg-rose-50 border-rose-100 text-rose-700 animate-pulse font-extrabold' 
                              : inst.semaforoColor === 'yellow' 
                              ? 'bg-amber-50 border-amber-100 text-amber-700' 
                              : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              inst.semaforoColor === 'red' ? 'bg-rose-600 animate-ping' : 
                              inst.semaforoColor === 'yellow' ? 'bg-amber-500' : 'bg-emerald-600'
                            }`} />
                            {inst.semaforoColor === 'red' ? 'CRÍTICO' : inst.semaforoColor === 'yellow' ? 'PREVENTIVO' : 'SALUDABLE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Analytics Column */}
        <div className="space-y-8 flex flex-col animate-in fade-in duration-300">
          {/* Alumnos por Proveedor */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-6 uppercase text-[10px] tracking-widest">Alumnos por Proveedor</h3>
            <div className="space-y-5 max-h-[320px] overflow-auto pr-1">
              {providerStudentsMetric.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hay proveedores registrados o asignados</p>
              ) : (
                providerStudentsMetric.map((item, index) => {
                  const percentage = totalProviderStudents > 0 
                    ? Math.round((item.count / totalProviderStudents) * 100) 
                    : 0;
                  
                  // Color selection for nice design pairing
                  const colors = ['bg-indigo-600', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-purple-500'];
                  const barColor = colors[index % colors.length];

                  return (
                    <div key={item.id} className="group/item">
                      <div className="flex justify-between text-xs mb-2 font-medium">
                        <span className="text-slate-600 truncate max-w-[170px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-slate-900 font-mono font-semibold">
                          {item.count} {item.count === 1 ? 'Alumno' : 'Alumnos'} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`${barColor} h-full rounded-full transition-all duration-500`} 
                          style={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Instituciones por País */}
          <div className="bg-[#0a0a0a] text-white p-8 rounded-2xl shadow-xl flex-1 relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
            <div>
              <h3 className="font-bold text-xs mb-6 text-slate-400 uppercase tracking-widest relative z-10">Instituciones por País</h3>
              <div className="space-y-4 relative z-10 max-h-[300px] overflow-auto pr-1">
                {institutionsByCountry.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No hay instituciones registradas o con país asignado</p>
                ) : (
                  institutionsByCountry.map((item, index) => {
                    const percentage = totalCountryInstitutions > 0 
                      ? Math.round((item.count / totalCountryInstitutions) * 100) 
                      : 0;
                    
                    // Colors chosen to look spectacular against a rich black canvas
                    const colors = ['bg-indigo-500', 'bg-emerald-400', 'bg-rose-400', 'bg-amber-400', 'bg-sky-400', 'bg-purple-400'];
                    const barColor = colors[index % colors.length];

                    // Flag Emojis mapping for aesthetic design pairing
                    const getCountryFlag = (name: string) => {
                      const lower = name.toLowerCase();
                      if (lower.includes('méxico') || lower.includes('mexico')) return '🇲🇽';
                      if (lower.includes('usa') || lower.includes('eeuu') || lower.includes('estados unidos') || lower.includes('united states') || lower.includes('america')) return '🇺🇸';
                      if (lower.includes('canadá') || lower.includes('canada')) return '🇨🇦';
                      if (lower.includes('españa') || lower.includes('spain')) return '🇪🇸';
                      if (lower.includes('reino unido') || lower.includes('uk') || lower.includes('united kingdom')) return '🇬🇧';
                      if (lower.includes('australia')) return '🇦🇺';
                      if (lower.includes('colombia')) return '🇨🇴';
                      if (lower.includes('perú') || lower.includes('peru')) return '🇵🇪';
                      if (lower.includes('argentina')) return '🇦🇷';
                      if (lower.includes('chile')) return '🇨🇱';
                      if (lower.includes('ecuador')) return '🇪🇨';
                      if (lower.includes('panamá') || lower.includes('panama')) return '🇵🇦';
                      if (lower.includes('brasil') || lower.includes('brazil')) return '🇧🇷';
                      return '🌐';
                    };

                    return (
                      <div key={item.name} className="group/country">
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span className="text-slate-300 flex items-center gap-1.5 truncate max-w-[170px]" title={item.name}>
                            <span className="text-sm shrink-0">{getCountryFlag(item.name)}</span>
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="text-white font-mono font-semibold">
                            {item.count} {item.count === 1 ? 'Inst.' : 'Inst.'} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`${barColor} h-full rounded-full transition-all duration-500`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
