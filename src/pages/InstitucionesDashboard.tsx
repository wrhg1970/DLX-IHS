import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { 
  Building2, 
  GraduationCap, 
  DollarSign, 
  CheckCircle, 
  X,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Zap,
  TrendingUp,
  CreditCard,
  Layers,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useAppContext, resolveCreditPrices } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export function InstitucionesDashboard() {
  const { 
    institutions, 
    catalogs, 
    students, 
    contacts, 
    enrollments, 
    classes, 
    financialTransactions,
    providerProductServices,
    providers
  } = useAppContext();
  
  const navigate = useNavigate();

  // Filter States
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterMembership, setFilterMembership] = useState<string>('all');
  const [filterModality, setFilterModality] = useState<string>('all');

  // Helper to compute institution statistics
  const getInstStats = (instId: number) => {
    const instStudents = students.filter(s => s.institutionId === instId);
    const instStudentIds = instStudents.map(s => s.id);
    const instContacts = contacts.filter(c => c.institutionId === instId);

    // Ingresos Totales (Vendido) - treating class prices in USD converted to MXN
    const instEnrollments = enrollments.filter(e => instStudentIds.includes(e.studentId));
    const totalVendidoUSD = instEnrollments.reduce((sum, e) => {
      let cp = e.price;
      if (cp === undefined || cp === null) {
        const cl = classes.find(c => c.id === e.classId);
        if (cl) {
          const cType = cl.creditType;
          const inst = institutions.find(i => i.id === instId);
          let valStr = "";
          if (inst) {
            const resolvedPrices = resolveCreditPrices(inst.tarifasId, catalogs, inst.mainProviderId, providerProductServices);
            if (cType === 'Medio Crédito') valStr = resolvedPrices.priceHalfCredit || "";
            else if (cType === 'Crédito completo AP') valStr = resolvedPrices.priceFullApCredit || "";
            else if (cType === 'Medio Crédito AP') valStr = resolvedPrices.priceHalfApCredit || "";
            else if (cType === 'Crédito completo') valStr = resolvedPrices.priceFullCredit || "";
          }
          if (valStr) {
            cp = parseFloat(valStr.replace(/[^0-9.-]+/g, "") || "0");
          } else {
            if (cType === 'Medio Crédito') cp = 250;
            else if (cType === 'Crédito completo AP') cp = 600;
            else if (cType === 'Medio Crédito AP') cp = 300;
            else cp = 500;
          }
        } else {
          cp = 0;
        }
      }
      return sum + (cp || 0);
    }, 0);
    const totalVendidoMXN = totalVendidoUSD * 18.5;

    // Membership in USD converted to MXN
    const inst = institutions.find(i => i.id === instId);
    const activeMemb = catalogs['Membresías']?.find((m: any) => m.id === inst?.membershipId);
    const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
    const customMembPrice = inst?.membershipPrice ? parseFloat((inst.membershipPrice || "").replace(/[^0-9.-]+/g, "")) : null;
    const finalMembUnitAmount = customMembPrice !== null && !isNaN(customMembPrice) ? customMembPrice : membUnitAmount;
    const totalMembUSD = finalMembUnitAmount;
    const totalMembMXN = totalMembUSD * 18.5;

    // Combined Projected Ingresos in MXN
    const totalVendido = totalVendidoMXN + totalMembMXN;

    // Ingresos Recibidos (Pagado) - always in MXN
    const instPayments = financialTransactions.filter(p => 
      (p.institutionId === instId || (p.studentId && instStudentIds.includes(p.studentId))) && 
      p.type === 'income' && 
      (p.status === 'Aplicado' || p.status === 'Pagado')
    );
    const totalPagado = instPayments.reduce((sum, p) => sum + p.amountMXN, 0);

    // Costo Clases to providers (USD converted to MXN)
    const totalCostUSD = instEnrollments.reduce((sum, e) => {
      const cl = classes.find(c => c.id === e.classId);
      if (!cl) return sum;
      const cType = cl.creditType;
      let cost = 300;
      if (cType === 'Medio Crédito') cost = 150;
      else if (cType === 'Crédito completo AP') cost = 350;
      else if (cType === 'Medio Crédito AP') cost = 175;
      return sum + cost;
    }, 0);
    const totalCost = totalCostUSD * 18.5;

    const instExpenses = financialTransactions.filter(p => p.studentId && instStudentIds.includes(p.studentId) && p.type === 'expense');
    const egresosPagados = instExpenses.reduce((sum, p) => sum + p.amountMXN, 0);

    const totalPorRecaudar = Math.max(0, totalVendido - totalPagado);
    const saldoPorPagar = Math.max(0, totalCost - egresosPagados);

    return {
      numStudents: instStudents.length,
      numContacts: instContacts.length,
      totalVendido,
      totalPagado,
      totalCost,
      totalPorRecaudar,
      saldoPorPagar,
    };
  };

  // 1. Filtered Dataset
  const filteredInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      if (filterCountry !== 'all' && inst.country?.trim() !== filterCountry) {
        return false;
      }
      if (filterMembership !== 'all' && inst.membershipId !== filterMembership) {
        return false;
      }
      if (filterModality !== 'all' && inst.modality !== filterModality) {
        return false;
      }
      return true;
    });
  }, [institutions, filterCountry, filterMembership, filterModality]);

  // Unique country values
  const uniqueCountries = useMemo(() => {
    const countriesSet = new Set<string>();
    institutions.forEach(i => {
      if (i.country) countriesSet.add(i.country.trim());
    });
    return Array.from(countriesSet).sort();
  }, [institutions]);

  // Unique membership values
  const uniqueMemberships = useMemo(() => {
    const memsSet = new Set<string>();
    institutions.forEach(i => {
      if (i.membershipId) memsSet.add(i.membershipId);
    });
    return Array.from(memsSet).sort();
  }, [institutions]);

  // Unique modality values
  const uniqueModalities = useMemo(() => {
    const modSet = new Set<string>();
    institutions.forEach(i => {
      if (i.modality) modSet.add(i.modality);
    });
    return Array.from(modSet).sort();
  }, [institutions]);

  // Combined KPIs
  const kpis = useMemo(() => {
    let totalVend = 0;
    let totalPag = 0;
    let totalPend = 0;
    let totalStudCount = 0;

    filteredInstitutions.forEach(inst => {
      const stats = getInstStats(inst.id);
      totalVend += stats.totalVendido;
      totalPag += stats.totalPagado;
      totalPend += stats.totalPorRecaudar;
      
      // Sum student counts actually linked
      totalStudCount += stats.numStudents;
    });

    const activeCount = filteredInstitutions.filter(inst => {
      const stats = getInstStats(inst.id);
      const isArchived = inst.status === 'Archivada' || inst.status === 'Archivado';
      return !isArchived;
    }).length;

    return {
      total: filteredInstitutions.length,
      active: activeCount,
      archived: filteredInstitutions.length - activeCount,
      totalVendido: totalVend,
      totalPagado: totalPag,
      totalPorRecaudar: totalPend,
      totalStudentsLinked: totalStudCount
    };
  }, [filteredInstitutions, students, enrollments, classes, catalogs, providerProductServices]);

  // Charts data: Location Distribution (by Country or City)
  const locationChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInstitutions.forEach(i => {
      const c = i.country || 'Sin especificar';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [filteredInstitutions]);

  // Charts data: Billing status distribution
  const statusChartData = useMemo(() => {
    let alCorriente = 0;
    let pendiente = 0;
    let archivada = 0;

    filteredInstitutions.forEach(inst => {
      const stats = getInstStats(inst.id);
      if (inst.status === 'Archivada' || inst.status === 'Archivado') {
        archivada++;
      } else if (stats.totalPorRecaudar > 0) {
        pendiente++;
      } else {
        alCorriente++;
      }
    });

    return [
      { name: 'Al corriente (Sin Deudas)', value: alCorriente, color: '#10b981' },
      { name: 'Con Saldos Pendientes', value: pendiente, color: '#f59e0b' },
      { name: 'Historial Archivado', value: archivada, color: '#64748b' },
    ].filter(item => item.value > 0);
  }, [filteredInstitutions]);

  // Charts data: Top 10 Institutions by Revenue (Vendido)
  const topInstByRevenueData = useMemo(() => {
    return filteredInstitutions.map(inst => {
      const stats = getInstStats(inst.id);
      return {
        name: inst.name,
        commercialName: inst.commercialName || inst.name,
        vendido: stats.totalVendido,
        pagado: stats.totalPagado,
        estudiantes: stats.numStudents
      };
    }).sort((a, b) => b.vendido - a.vendido).slice(0, 8);
  }, [filteredInstitutions]);

  // Modality Breakdown
  const modalityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInstitutions.forEach(i => {
      const mod = i.modality || 'No especificada';
      counts[mod] = (counts[mod] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredInstitutions]);

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top filter control strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Filtros Avanzados de Instituciones</span>
          </div>
          {(filterCountry !== 'all' || filterMembership !== 'all' || filterModality !== 'all') && (
            <button
              onClick={() => {
                setFilterCountry('all');
                setFilterMembership('all');
                setFilterModality('all');
              }}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Quitar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Country Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">País</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Todos los Países</option>
              {uniqueCountries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Membership Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nivel de Membresía / Premium</label>
            <select
              value={filterMembership}
              onChange={(e) => setFilterMembership(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Cualquier Membresía</option>
              {uniqueMemberships.map(mem => {
                const name = catalogs['Membresías']?.find(m => m.id === mem)?.name || mem;
                return (
                  <option key={mem} value={mem}>{name}</option>
                );
              })}
            </select>
          </div>

          {/* Modality Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Modalidad de Facturación</label>
            <select
              value={filterModality}
              onChange={(e) => setFilterModality(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Cualquier Modalidad</option>
              {uniqueModalities.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Info blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Instituciones</p>
            <span className="text-3xl font-light text-slate-800 tracking-tight">{kpis.total.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpis.active} activas · {kpis.archived} archivadas
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Estudiantes Vinculados</p>
            <span className="text-3xl font-light text-emerald-600 tracking-tight">{kpis.totalStudentsLinked.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">
              Alumnos registrados en estas sedes
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Ingresos Facturados</p>
            <span className="text-2xl font-semibold text-indigo-600 tracking-tight">
              ${kpis.totalVendido.toLocaleString("es-MX", { maximumFractionDigits: 0 })} <span className="text-xs text-slate-400 font-normal">MXN</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Venta bruta calculada por inscripciones
            </p>
          </div>
          <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Por Recaudar (Cuentas por Cobrar)</p>
            <span className={`text-2xl font-semibold tracking-tight ${kpis.totalPorRecaudar > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              ${kpis.totalPorRecaudar.toLocaleString("es-MX", { maximumFractionDigits: 0 })} <span className="text-xs text-slate-400 font-normal">MXN</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Cobros correspondientes pendientes
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart A: Top 8 Institutions by gross tuition volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[380px]">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Volumen Financiero por Institución (Top 8)</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Comparativa de valor total pactado (Vendido) vs montos liquidados (Pagado)</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            {topInstByRevenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Sin datos financieros en el segmento actual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topInstByRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="commercialName" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toLocaleString("es-MX")}`, '']}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="vendido" name="Vendido (Pactado)" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pagado" name="Pagado (Ingresado)" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Distribution map/graph by Country */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[380px]">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Distribución Geográfica</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Asignación y volumen de instituciones por país o territorio</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            {locationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Sin datos geográficos definidos.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} layout="vertical" margin={{ top: 5, right: 15, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" name="Instituciones" fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={16}>
                    {locationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Advanced info partitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Partition 1: Billing and Ledger status distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">Estado de Cobros (Saldos)</h4>
            <div className="space-y-4">
              {statusChartData.map((item, index) => {
                const percentage = kpis.total > 0 ? ((item.value / kpis.total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-900 font-bold">{item.value} <span className="text-slate-400 text-[10px] font-normal">({percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
              {statusChartData.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-6">No hay datos en esta categoría.</p>
              )}
            </div>
          </div>
        </div>

        {/* Partition 2: Billing modalities frequency */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">Modalidades de Factura contratadas</h4>
            <div className="space-y-3.5">
              {modalityDistribution.map((item) => {
                const valPercent = kpis.total > 0 ? ((item.value / kpis.total) * 105 / 1.05).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-600">{item.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400">{valPercent}%</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.value}</span>
                    </div>
                  </div>
                );
              })}
              {modalityDistribution.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-6">Sin modalidades especificadas en el sistema.</p>
              )}
            </div>
          </div>
        </div>

        {/* Partition 3: Elite tiers memberships count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Membresías Elite & Licencias</h4>
            <div className="space-y-3">
              {uniqueMemberships.map(mem => {
                const count = filteredInstitutions.filter(i => i.membershipId === mem).length;
                const name = catalogs['Membresías']?.find(m => m.id === mem)?.name || mem;
                return (
                  <div key={mem} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-3.5 h-3.5 text-indigo-500 fill-indigo-100" />
                      <span className="font-semibold text-slate-700">{name}</span>
                    </div>
                    <span className="font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{count}</span>
                  </div>
                );
              })}
              {uniqueMemberships.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-6">Sin niveles de membresías registradas.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Fast table lists: Institutions Overview and Health */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cuadro de Control de Instituciones</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Saldos correspondientes, matrículas registradas y nivel de suscripción</p>
          </div>
          <button 
            onClick={() => navigate('/instituciones')}
            className="text-indigo-600 hover:text-indigo-800 font-bold uppercase text-[10px] tracking-widest border border-indigo-100 hover:bg-slate-50 px-3 py-1.5 rounded transition"
          >
            Ver Todas las Instituciones →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Nombre Tradicional</th>
                <th className="px-6 py-3">Ubicación</th>
                <th className="px-6 py-3 text-center">Alumnos</th>
                <th className="px-6 py-3 text-right">Vendido (Bruto)</th>
                <th className="px-6 py-3 text-right">Saldo Pendiente</th>
                <th className="px-6 py-3 text-center">Membresía</th>
                <th className="px-6 py-3 text-center">Estado Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-105 text-xs">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">
                    No se han registrado instituciones que concuerden con los criterios.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.slice(0, 10).map((inst) => {
                  const stats = getInstStats(inst.id);
                  const isArchived = inst.status === 'Archivada' || inst.status === 'Archivado';
                  const isPendiente = stats.totalPorRecaudar > 0;
                  
                  return (
                    <tr 
                      key={inst.id}
                      className="hover:bg-slate-50/50 transition cursor-pointer"
                      onClick={() => navigate(`/instituciones/${inst.id}`)}
                    >
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {inst.commercialName || inst.name}
                        {inst.tradeName && inst.tradeName !== inst.name && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{inst.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          🌎 {inst.country || 'No especificado'}
                          {inst.city && <span className="text-slate-300">/ {inst.city}</span>}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-semibold">
                        {stats.numStudents}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                        ${stats.totalVendido.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-medium">
                        <span className={isPendiente ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                          ${stats.totalPorRecaudar.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 border border-indigo-110 text-indigo-700">
                          ⚡ {catalogs['Membresías']?.find(m => m.id === inst.membershipId)?.name || (inst.membershipId ? inst.membershipId : 'Básica')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isArchived ? 'bg-slate-100 text-slate-600' :
                          isPendiente ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-110'
                        }`}>
                          {isArchived ? 'Archivado' : isPendiente ? 'Pendiente' : 'Al Corriente'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
