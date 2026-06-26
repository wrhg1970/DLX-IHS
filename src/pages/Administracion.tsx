import React, { useState } from "react";
import { Download, ArrowUpRight, ArrowDownRight, CreditCard, LayoutDashboard, History, Search, FileText, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function Administracion() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const { payments, students, enrollments, classes, providers, institutions, auditLogs, financialTransactions, providerProductServices, catalogs } = useAppContext();
  const navigate = useNavigate();

  // Filter states for analysis
  const [selectedInst, setSelectedInst] = useState<string>("all");
  const [onlyWithStudents, setOnlyWithStudents] = useState<boolean>(false);

  const normalizeCountryName = (c: string) => {
    return (c || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // removes accents
      .replace(/ñ/g, "n")
      .trim();
  };

  const resolveProviderClassCost = (
    providerId: any,
    creditType: string | undefined,
    countryRef: string,
    providerProductServices: any[] | undefined
  ) => {
    if (!providerId || !providerProductServices) return 0;
    
    // Find product service for Classes (could be plural "clases" or singular "clase")
    const serviceClass = providerProductServices.find(
      ps => Number(ps.providerId) === Number(providerId) &&
        ['clase', 'clases'].includes((ps.productType || "").toLowerCase().trim())
    );
    
    if (!serviceClass || !serviceClass.countryPrices) return 0;
    
    // Find matching country
    const normCountryRef = normalizeCountryName(countryRef);
    const cpData = serviceClass.countryPrices.find(
      (p: any) => normalizeCountryName(p.country) === normCountryRef
    );
    
    if (!cpData) return 0;
    
    const typeStr = (creditType || "").toLowerCase().trim();
    const isAp = typeStr.includes("ap");
    
    let costStr = "0";
    if (typeStr.includes("medio") || typeStr.includes("half")) {
      costStr = isAp ? cpData.costHalfApCredit : cpData.costHalfCredit;
    } else {
      // defaults to Full/Completo
      costStr = isAp ? cpData.costFullApCredit : cpData.costFullCredit;
    }
    
    return parseFloat(String(costStr || "0").replace(/[^0-9.-]+/g, "") || "0");
  };

  // Helper to get USD without IVA (and convert MXN with IVA to USD without IVA if payWithIva is true)
  const getUSDWithoutIva = (p: { currency: string; amount: number; amountMXN?: number; exchangeRate?: number }, inst: any) => {
    if (p.currency === 'USD') {
      return p.amount;
    } else {
      const amtMXN = p.amountMXN !== undefined ? p.amountMXN : p.amount;
      const baseMXNWithoutIva = inst?.payWithIva ? amtMXN / 1.16 : amtMXN;
      const rate = (p.exchangeRate && p.exchangeRate !== 1) ? p.exchangeRate : (Math.abs(baseMXNWithoutIva - 3768) < 5 ? 18.84 : 18.5);
      return baseMXNWithoutIva / rate;
    }
  };

  // Calculate metrics per school/institution
  const metricsByInstitution = React.useMemo(() => {
    return institutions.map(inst => {
      const instStudents = students.filter(s => Number(s.institutionId) === Number(inst.id));
      const instStudentIds = instStudents.map(s => Number(s.id));
      
      // Enrolled courses (Prices are all in USD)
      const instEnrollments = enrollments.filter(e => instStudentIds.includes(Number(e.studentId)));
      const totalVendidoUSD = instEnrollments.reduce((sum, e) => {
        let cp = e.price;
        if (cp === undefined || cp === null) {
          const cl = classes.find(c => Number(c.id) === Number(e.classId));
          if (cl) {
            const student = students.find(s => Number(s.id) === Number(e.studentId));
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
              // Check if cl has countryRates
              const studentCountry = inst?.country?.trim() || student?.country?.trim();
              let rateForCountry = null;
              if (studentCountry && cl.countryRates) {
                rateForCountry = cl.countryRates[studentCountry];
                if (!rateForCountry) {
                  const matchKey = Object.keys(cl.countryRates).find(
                    (k) => k.toLowerCase() === studentCountry.toLowerCase()
                  );
                  if (matchKey) {
                    rateForCountry = cl.countryRates[matchKey];
                  }
                }
              }
              if (rateForCountry && rateForCountry.price) {
                cp = parseFloat(rateForCountry.price.replace(/[^0-9.-]+/g, "") || "0");
              } else {
                if (cType === 'Medio Crédito') cp = 250;
                else if (cType === 'Crédito completo AP') cp = 600;
                else if (cType === 'Medio Crédito AP') cp = 300;
                else cp = 500;
              }
            }
          } else {
            cp = 0;
          }
        }
        return sum + (cp || 0);
      }, 0);

      // Membership Projections (This is in USD)
      const activeMemb = catalogs?.['Membresías']?.find((m: any) => m.id === inst?.membershipId);
      const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
      const customMembPrice = inst?.membershipPrice ? parseFloat((inst.membershipPrice || "").replace(/[^0-9.-]+/g, "")) : null;
      const finalMembUnitAmount = customMembPrice !== null && !isNaN(customMembPrice) ? customMembPrice : membUnitAmount;
      const totalMembUSD = finalMembUnitAmount;

      // COMBINED REVENUE PROJECTIONS
      const ingresosTotales = totalVendidoUSD + totalMembUSD;

      // Received payments (income)
      const instPaymentsList = (financialTransactions || []).filter(p => 
        (Number(p.institutionId) === Number(inst.id) || (p.studentId && instStudentIds.includes(Number(p.studentId)))) && 
        p.type === 'income' && 
        (p.status === 'Aplicado' || p.status === 'Pagado')
      );

      // Divide payments into membership vs courses to compute outstanding balances exactly like in details
      const membPayments = instPaymentsList.filter(p => 
        p.subcategory === 'sub_membresia' || 
        (p.concept && (p.concept.toLowerCase().includes('membresía') || p.concept.toLowerCase().includes('membresia'))) ||
        (p.description && (p.description.toLowerCase().includes('membresía') || p.description.toLowerCase().includes('membresia')))
      );
      const coursesPayments = instPaymentsList.filter(p => !membPayments.includes(p));

      const coursesPaidUSD = coursesPayments.reduce((sum, p) => sum + getUSDWithoutIva(p, inst), 0);
      const membPaidUSD = membPayments.reduce((sum, p) => sum + getUSDWithoutIva(p, inst), 0);
      
      const coursesPendingUSD = Math.max(0, totalVendidoUSD - coursesPaidUSD);
      const membPendingUSD = Math.max(0, totalMembUSD - membPaidUSD);
      
      // Total por Recaudar (Por Cobrar)
      const ingresosPorCobrar = coursesPendingUSD + membPendingUSD;

      // Total received / paid
      const ingresosRecibidos = instPaymentsList.reduce((sum, p) => sum + getUSDWithoutIva(p, inst), 0);

      // Total class costs to providers (in USD)
      const cuentasPorPagar = instEnrollments.reduce((sum, e) => {
        const cl = classes.find(c => Number(c.id) === Number(e.classId));
        if (!cl) return sum;

        const provId = e.providerId || cl.providerId;
        const tariffId = inst?.tarifasId;
        const countryRef = catalogs?.['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || inst?.country || 'Default';

        let resolvedCost = resolveProviderClassCost(provId, cl.creditType, countryRef, providerProductServices);

        let countryRate = null;
        if (countryRef && cl.countryRates) {
          countryRate = cl.countryRates[countryRef];
          if (!countryRate) {
            const matchKey = Object.keys(cl.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
            if (matchKey) countryRate = cl.countryRates[matchKey];
          }
        }

        if (!resolvedCost && countryRate?.cost) {
          resolvedCost = parseFloat(countryRate.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
        }

        if (!resolvedCost && cl.cost) {
          resolvedCost = parseFloat(cl.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
        }

        // Default fallbacks if not found
        if (!resolvedCost) {
          const typeStr = (cl.creditType || "").toLowerCase().trim();
          const isAp = typeStr.includes("ap");
          const isHalf = typeStr.includes("medio") || typeStr.includes("half");

          if (isHalf) {
            resolvedCost = isAp ? 175 : 150;
          } else {
            resolvedCost = isAp ? 350 : 300;
          }
        }

        return sum + resolvedCost;
      }, 0);

      const margen = ingresosTotales - cuentasPorPagar;

      return {
        inst,
        numAlumnos: instStudents.length,
        ingresosTotales,
        ingresosRecibidos,
        ingresosPorCobrar,
        cuentasPorPagar,
        margen
      };
    });
  }, [institutions, students, enrollments, classes, financialTransactions, providerProductServices, catalogs]);

  // Filter metrics based on chosen selections
  const filteredMetrics = React.useMemo(() => {
    return metricsByInstitution.filter(m => {
      // Filter by selection
      if (selectedInst !== 'all' && Number(m.inst.id) !== Number(selectedInst)) {
        return false;
      }
      // Filter by "only with students"
      if (onlyWithStudents && m.numAlumnos === 0) {
        return false;
      }
      return true;
    });
  }, [metricsByInstitution, selectedInst, onlyWithStudents]);

  const [instSortField, setInstSortField] = useState<'name' | 'alumnos' | 'ingresosTotales' | 'ingresosRecibidos' | 'margen'>('name');
  const [instSortOrder, setInstSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'alumnos' | 'ingresosTotales' | 'ingresosRecibidos' | 'margen') => {
    if (instSortField === field) {
      setInstSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setInstSortField(field);
      setInstSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedMetricsByInstitution = React.useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      let compA: any;
      let compB: any;

      if (instSortField === 'name') {
        compA = a.inst.name.toLowerCase();
        compB = b.inst.name.toLowerCase();
      } else if (instSortField === 'alumnos') {
        compA = a.numAlumnos;
        compB = b.numAlumnos;
      } else if (instSortField === 'ingresosTotales') {
        compA = a.ingresosTotales;
        compB = b.ingresosTotales;
      } else if (instSortField === 'ingresosRecibidos') {
        compA = a.ingresosRecibidos;
        compB = b.ingresosRecibidos;
      } else if (instSortField === 'margen') {
        compA = a.margen;
        compB = b.margen;
      } else {
        compA = 0;
        compB = 0;
      }

      if (compA < compB) return instSortOrder === 'asc' ? -1 : 1;
      if (compA > compB) return instSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMetrics, instSortField, instSortOrder]);

  const globalIngresosTotales = sortedMetricsByInstitution.reduce((sum, m) => sum + m.ingresosTotales, 0);

  // Aggregated metrics from filtered institutions
  const displayTotalVendido = React.useMemo(() => {
    return filteredMetrics.reduce((sum, m) => sum + m.ingresosTotales, 0);
  }, [filteredMetrics]);

  const displayTotalPagado = React.useMemo(() => {
    return filteredMetrics.reduce((sum, m) => sum + m.ingresosRecibidos, 0);
  }, [filteredMetrics]);

  const displayCuentasPorCobrar = displayTotalVendido - displayTotalPagado;

  const displayCuentasPorPagar = React.useMemo(() => {
    return filteredMetrics.reduce((sum, m) => sum + m.cuentasPorPagar, 0);
  }, [filteredMetrics]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/50 justify-between items-center">
        <div className="flex space-x-2">
          {[
            { name: "Dashboard", icon: LayoutDashboard },
            { name: "Pagos", icon: CreditCard },
            { name: "Auditoría", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center px-6 py-4 text-xs font-bold tracking-widest uppercase transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.name 
                    ? "border-indigo-600 text-indigo-600 bg-white" 
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </div>
        <div className="py-2">
          <button className="flex items-center bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="h-3 w-3 mr-1.5" />
            Exportar Reporte
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto bg-slate-50">
        {activeTab === "Dashboard" && (
          <div className="animate-in fade-in duration-300 space-y-6 w-full max-w-7xl mx-auto">
            {/* Filters bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Filtros de Análisis</h3>
                <p className="text-xs text-slate-500">Filtra los resultados del dashboard por institución e inscripciones.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Institución</label>
                  <select
                    value={selectedInst}
                    onChange={(e) => setSelectedInst(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer min-w-[200px]"
                  >
                    <option value="all">Todas las instituciones</option>
                    {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Alumnos Inscritos</label>
                  <select
                    value={onlyWithStudents ? "yes" : "no"}
                    onChange={(e) => setOnlyWithStudents(e.target.value === "yes")}
                    className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="no">Mostrar todos los institutos</option>
                    <option value="yes">Solo institutos con alumnos inscritos</option>
                  </select>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Resumen Financiero</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Ingresos Totales (Proyectado) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <TrendingUp className="h-16 w-16 text-indigo-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ingresos Totales (Proyectado)</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${displayTotalVendido.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Incluye clases y membresías</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Ingresos Recibidos */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowDownRight className="h-16 w-16 text-emerald-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ingresos Recibidos</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${displayTotalPagado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Monto cobrado al momento</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Total por Recaudar (Por Cobrar) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <CreditCard className="h-16 w-16 text-amber-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total por Recaudar (Por Cobrar)</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${displayCuentasPorCobrar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Pendiente de cobro</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Total por Pagar (Costos de Clases) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowUpRight className="h-16 w-16 text-red-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total por Pagar (Costos de Clases)</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${displayCuentasPorPagar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Costos de docentes y proveedores</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8">
               <h3 className="text-md font-bold text-slate-800 tracking-tight mb-4">Desglose por Institución</h3>
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-1 hover:text-slate-800 uppercase tracking-wider font-bold text-[10px] outline-none focus:outline-none cursor-pointer"
                          >
                            Institución
                            <span className="text-xs">{instSortField === 'name' ? (instSortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">
                          <button
                            onClick={() => handleSort('alumnos')}
                            className="ml-auto flex items-center gap-1 hover:text-slate-800 uppercase tracking-wider font-bold text-[10px] outline-none focus:outline-none cursor-pointer"
                          >
                            Alumnos
                            <span className="text-xs">{instSortField === 'alumnos' ? (instSortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">
                          <button
                            onClick={() => handleSort('ingresosTotales')}
                            className="ml-auto flex items-center gap-1 hover:text-slate-800 uppercase tracking-wider font-bold text-[10px] outline-none focus:outline-none cursor-pointer"
                          >
                            Ingresos Totales
                            <span className="text-xs">{instSortField === 'ingresosTotales' ? (instSortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">
                          <button
                            onClick={() => handleSort('ingresosRecibidos')}
                            className="ml-auto flex items-center gap-1 hover:text-slate-800 uppercase tracking-wider font-bold text-[10px] outline-none focus:outline-none cursor-pointer"
                          >
                            Ing. Recibidos
                            <span className="text-xs">{instSortField === 'ingresosRecibidos' ? (instSortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Por Cobrar</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Cuentas por Pagar</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">
                          <button
                            onClick={() => handleSort('margen')}
                            className="ml-auto flex items-center gap-1 hover:text-slate-800 uppercase tracking-wider font-bold text-[10px] outline-none focus:outline-none cursor-pointer"
                          >
                            Margen
                            <span className="text-xs">{instSortField === 'margen' ? (instSortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                          </button>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedMetricsByInstitution.map((m, i) => {
                        const pct = globalIngresosTotales > 0 ? (m.ingresosTotales / globalIngresosTotales) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => navigate(`/instituciones/${m.inst.id}`)}
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 cursor-pointer text-left focus:outline-none group"
                              >
                                {m.inst.name}
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 inline-block" />
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-slate-600 font-mono">{m.numAlumnos}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-slate-900 font-mono">${m.ingresosTotales.toLocaleString()}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-emerald-600 font-mono">${m.ingresosRecibidos.toLocaleString()}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-amber-600 font-mono">${m.ingresosPorCobrar.toLocaleString()}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-red-600 font-mono">${m.cuentasPorPagar.toLocaleString()}</span></td>
                            <td className="px-6 py-4 text-right"><span className="text-sm text-indigo-600 font-mono">${m.margen.toLocaleString()}</span></td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-mono flex items-center justify-end text-slate-600">
                                {pct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === "Pagos" && (
          <div className="animate-in fade-in duration-300 w-full max-w-7xl mx-auto flex flex-col h-full">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4">Registro Histórico de Pagos</h2>
            {payments.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Alumno</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Cantidad</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">T. Cambio</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">IVA</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Cantidad Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => {
                      const student = students.find(s => s.id === p.studentId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">TRX-{p.id.toString().slice(-4)}</span>
                          </td>
                          <td className="px-6 py-4">
                            {student ? (
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{student.name} {student.lastName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">STU-108{student.id.toString().padStart(2, '0')}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Desconocido</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-700">{p.date}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-slate-600 font-mono">${p.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-slate-600 font-mono">{p.exchangeRate ? `$${p.exchangeRate.toLocaleString()}` : "1"}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-slate-600 font-mono">${p.tax.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-slate-900 font-mono">${p.finalAmount.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
               <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-sm max-w-5xl mx-auto w-full">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <CreditCard className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-600 font-medium mb-1">Sin pagos registrados en el sistema</p>
                <p className="text-xs text-slate-400">Los pagos realizados por los alumnos aparecerán aquí.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === "Auditoría" && (
          <div className="animate-in fade-in duration-300 w-full max-w-7xl mx-auto flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Historial de Auditoría</h2>
                <p className="text-xs text-slate-500 mt-1">Bitácora oficial de cambios y tracking de modificaciones críticas de la base de datos de pagos, cuotas y proveedores.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar modificaciones..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs w-full sm:w-60 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <select
                  value={auditTypeFilter}
                  onChange={(e) => setAuditTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="all">Todas las entidades</option>
                  <option value="payments">Pagos y Transacciones</option>
                  <option value="providers">Proveedores y Tarifas</option>
                </select>
              </div>
            </div>

            {/* List / Table of audit logs */}
            {(() => {
              const logs = auditLogs || [];
              const filtered = logs.filter(log => {
                if (auditTypeFilter === 'payments') {
                  if (log.entityType !== 'financialTransaction' && log.entityType !== 'payment') return false;
                } else if (auditTypeFilter === 'providers') {
                  if (log.entityType !== 'provider' && log.entityType !== 'providerProductService') return false;
                }
                
                if (auditSearch.trim()) {
                  const term = auditSearch.toLowerCase();
                  const inDesc = log.description?.toLowerCase().includes(term);
                  const inName = log.entityName?.toLowerCase().includes(term);
                  const inUser = log.userName?.toLowerCase().includes(term);
                  return inDesc || inName || inUser;
                }
                return true;
              });

              if (filtered.length > 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Fecha y Hora</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Entidad</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Usuario</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-left">Detalle de Modificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(log => {
                          const isPayment = log.entityType === 'payment' || log.entityType === 'financialTransaction';
                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-semibold text-slate-600">
                                  {new Date(log.date).toLocaleString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-black uppercase tracking-wider inline-block px-2 py-0.5 rounded-full w-max ${
                                    isPayment ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  }`}>
                                    {isPayment ? 'PAGO / TRANSACCIÓN' : 'PROVEEDOR / TARIFAS'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900 mt-1 max-w-[200px] truncate">{log.entityName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                    {log.userName?.charAt(0).toUpperCase() || 'S'}
                                  </div>
                                  <span className="text-xs text-slate-700 font-semibold">{log.userName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-2 max-w-3xl">
                                  <p className="text-xs text-slate-800 leading-relaxed font-semibold">{log.description}</p>
                                  {log.fieldsChanged && log.fieldsChanged.length > 0 && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1">
                                      {log.fieldsChanged.map((f, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
                                          <span className="text-slate-500 font-bold uppercase tracking-wider">{f.fieldName}:</span>
                                          <span className="text-red-500 line-through truncate">{f.oldValue}</span>
                                          <span className="text-emerald-600 font-bold truncate">→ {f.newValue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return (
                <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-sm max-w-5xl mx-auto w-full">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <History className="w-8 h-8 text-slate-400 animate-pulse" />
                  </div>
                  <p className="text-slate-600 font-semibold mb-1">Sin historial de auditoría registrado</p>
                  <p className="text-xs text-slate-400">Las modificaciones de montos o fechas de pagos y proveedores se listarán aquí detalladamente.</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
}
