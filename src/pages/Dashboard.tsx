import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export function Dashboard() {
  const { institutions, students, classes, enrollments, providers, financialTransactions } = useAppContext();
  const [dashboardView, setDashboardView] = useState<'performance' | 'cobranza'>('performance');
  const [semaforoFilter, setSemaforoFilter] = useState<'all' | 'rojo' | 'amarillo' | 'verde'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  const institutionMetrics = institutions.map(inst => {
    const instStudentsList = students.filter(s => Number(s.institutionId) === Number(inst.id));
    const instStudentIds = instStudentsList.map(s => Number(s.id));
    const instEnrollments = enrollments.filter(e => instStudentIds.includes(Number(e.studentId)));
    
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

  const totalStudents = institutionMetrics.reduce((acc, inst) => acc + inst.alumnosCount, 0);
  const totalExpectedRevenue = institutionMetrics.reduce((acc, inst) => acc + inst.revenueValue, 0);
  const formattedRevenue = totalExpectedRevenue >= 1000000
    ? (totalExpectedRevenue / 1000000).toFixed(2) + 'M'
    : totalExpectedRevenue.toLocaleString();

  // Filter and sort for premium top-performing institutions (only with students, ordered desc)
  const premiumInstitutionMetrics = useMemo(() => {
    return institutionMetrics
      .filter(inst => inst.alumnosCount > 0)
      .sort((a, b) => b.alumnosCount - a.alumnosCount);
  }, [institutionMetrics]);

  // Calculation of institutions by country
  const institutionsByCountry = useMemo(() => {
    const countryMap = new Map<string, number>();
    institutions.forEach(inst => {
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
  }, [institutions]);

  const totalCountryInstitutions = useMemo(() => {
    return institutionsByCountry.reduce((acc, item) => acc + item.count, 0);
  }, [institutionsByCountry]);

  // Calculation of active students per provider
  const providerStudentsMetric = useMemo(() => {
    const activeEnrollments = enrollments.filter(e => e.status !== 'Withdrawn');
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
  }, [enrollments, classes, providers]);

  const totalProviderStudents = useMemo(() => {
    return providerStudentsMetric.reduce((acc, item) => acc + item.count, 0);
  }, [providerStudentsMetric]);

  // Create collection metrics for "semáforo de cobranza"
  const collectionMetrics = useMemo(() => {
    return institutions.map(inst => {
      const instStudents = students.filter(s => Number(s.institutionId) === Number(inst.id));
      const instStudentIds = instStudents.map(s => s.id);

      // Total vendido/esperado de inscripciones calculado con precios reales pactados
      const instEnrollments = enrollments.filter(e => instStudentIds.includes(e.studentId));
      const activeEnrollments = instEnrollments.filter(e => e.status !== 'Withdrawn');
      
      const totalVendido = activeEnrollments.length > 0
        ? activeEnrollments.reduce((sum, e) => sum + getAgreedPrice(e), 0)
        : (inst.revenue || 0);

      // Total pagado/recaudado calculado con transacciones reales liquidadas de cobranza
      const instPayments = financialTransactions.filter(p => 
        (Number(p.institutionId) === Number(inst.id) || (p.studentId && instStudentIds.includes(p.studentId))) && 
        p.type === 'income' && 
        (p.status === 'Aplicado' || p.status === 'Pagado')
      );
      const totalPagado = instPayments.reduce((sum, p) => sum + p.amountMXN, 0);

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
  }, [institutions, students, enrollments, classes, financialTransactions]);

  const sortedCobranzaMetrics = useMemo(() => {
    return [...collectionMetrics]
      .sort((a, b) => b.percentagePending - a.percentagePending);
  }, [collectionMetrics]);

  const totalPagadoReal = useMemo(() => {
    return collectionMetrics.reduce((acc, inst) => acc + (inst.totalPagado || 0), 0);
  }, [collectionMetrics]);

  const formattedPagadoReal = totalPagadoReal >= 1000000
    ? (totalPagadoReal / 1000000).toFixed(2) + 'M'
    : totalPagadoReal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const data = [
    { name: 'Ene', ingresos: 180000 },
    { name: 'Feb', ingresos: 195000 },
    { name: 'Mar', ingresos: 210000 },
    { name: 'Abr', ingresos: 205000 },
    { name: 'May', ingresos: 230000 },
    { name: 'Jun', ingresos: 245000 },
  ];

  return (
    <div className="space-y-8 flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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
            <span className="text-4xl font-light text-slate-800 tracking-tight">${formattedRevenue}</span>
            <span className="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded text-xs font-semibold">Meta 85%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Pagos Recibidos (Cobranza)</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">${formattedPagadoReal}</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
              {totalExpectedRevenue > 0 ? ((totalPagadoReal / totalExpectedRevenue) * 100).toFixed(1) : '0'}%
            </span>
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
                    <th className="px-6 py-4 font-semibold tracking-widest text-right border-b border-slate-100">Ingresos Esperados</th>
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
                      <tr key={inst.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3.5 font-semibold text-slate-800 border-b border-slate-50">{inst.name}</td>
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
                        <td className="px-6 py-3.5 text-right font-mono font-medium text-slate-800 border-b border-slate-50">${inst.revenueValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
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
                    <th className="px-6 py-4 font-semibold tracking-widest border-b border-slate-100">Institución</th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right">Total Vendido</th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right">Recaudado</th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-right">Pendiente</th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-center">% Pendiente</th>
                    <th className="px-6 py-4 font-bold tracking-widest border-b border-slate-100 text-center">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {collectionMetrics
                    .filter(inst => {
                      const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (inst.country?.toLowerCase() || '').includes(searchQuery.toLowerCase());
                      const matchesSemaforo = semaforoFilter === 'all' || inst.semaforoColor === semaforoFilter;
                      return matchesSearch && matchesSemaforo;
                    })
                    .sort((a, b) => b.percentagePending - a.percentagePending)
                    .map(inst => (
                      <tr key={inst.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3 border-b border-slate-50">
                          <p className="font-bold text-slate-800 leading-snug">{inst.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="font-mono">{inst.country || 'Sin especificar'}</span>
                            <span>•</span>
                            <span>{inst.alumnosCount} alumnos</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-mono font-bold text-right border-b border-slate-50 text-slate-800">
                          ${inst.totalVendido.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-mono font-semibold text-right border-b border-slate-50 text-emerald-600">
                          ${inst.totalPagado.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-mono font-black text-right border-b border-slate-50 text-slate-900 bg-slate-50/40">
                          ${inst.saldoPendiente.toLocaleString()}
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
                    ))}
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
                      if (lower.includes('usa') || lower.includes('eeuu') || lower.includes('estados unidos') || lower.includes('united states')) return '🇺🇸';
                      if (lower.includes('canadá') || lower.includes('canada')) return '🇨🇦';
                      if (lower.includes('españa') || lower.includes('spain')) return '🇪🇸';
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
