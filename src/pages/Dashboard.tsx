import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';

export function Dashboard() {
  const { institutions, students, classes, enrollments, providers } = useAppContext();
  
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
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Pagos Proveedores</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-4xl font-light text-slate-800 tracking-tight">$1.12M</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">Pendiente</span>
          </div>
        </div>
      </div>

      {/* Main Data Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Table Column */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Instituciones Top Performance</h3>
            <button className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-800 transition-colors">Ver Catálogo →</button>
          </div>
          <div className="overflow-auto flex-1 h-[300px] lg:h-auto px-2">
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
