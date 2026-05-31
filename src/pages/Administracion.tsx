import React, { useState } from "react";
import { Download, ArrowUpRight, ArrowDownRight, CreditCard, LayoutDashboard } from "lucide-react";
import { useAppContext } from "../context/AppContext";

export function Administracion() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const { payments, students, enrollments, classes, providers, institutions } = useAppContext();

  // Calcular cuentas por cobrar (Ingresos proyectados - Pagado)
  const totalPagado = payments.reduce((sum, p) => sum + p.finalAmount, 0);
  
  const totalVendido = enrollments.reduce((sum, e) => {
    let cp = e.price;
    if (cp === undefined || cp === null) {
      const cl = classes.find(c => Number(c.id) === Number(e.classId));
      if (cl) {
        const student = students.find(s => Number(s.id) === Number(e.studentId));
        const instOfStudent = institutions.find(i => Number(i.id) === Number(student?.institutionId));
        const cType = cl.creditType;
        let valStr = "";
        if (instOfStudent) {
          if (cType === 'Medio Crédito') valStr = instOfStudent.priceHalfCredit || "";
          else if (cType === 'Crédito completo AP') valStr = instOfStudent.priceFullApCredit || "";
          else if (cType === 'Medio Crédito AP') valStr = instOfStudent.priceHalfApCredit || "";
          else if (cType === 'Crédito completo') valStr = instOfStudent.priceFullCredit || "";
        }
        if (valStr) {
          cp = parseFloat(valStr.replace(/[^0-9.-]+/g, "") || "0");
        } else {
          // Check if cl has countryRates
          const studentCountry = instOfStudent?.country?.trim() || student?.country?.trim();
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

  const cuentasPorCobrar = totalVendido - totalPagado;

  const totalCuentasPorPagar = enrollments.reduce((sum, e) => {
    const cl = classes.find(c => Number(c.id) === Number(e.classId));
    if (!cl) return sum;
    const student = students.find(s => Number(s.id) === Number(e.studentId));
    const instOfStudent = institutions.find(i => Number(i.id) === Number(student?.institutionId));
    const studentCountry = instOfStudent?.country?.trim() || student?.country?.trim();
    
    // Default fallback based on credit type
    const cType = cl.creditType;
    let cost = 300;
    if (cType === 'Medio Crédito') cost = 150;
    else if (cType === 'Crédito completo AP') cost = 350;
    else if (cType === 'Medio Crédito AP') cost = 175;

    // Check custom country rates for content provider / class
    if (studentCountry && cl.countryRates) {
      let rateForCountry = cl.countryRates[studentCountry];
      if (!rateForCountry) {
        const matchKey = Object.keys(cl.countryRates).find(
          (k) => k.toLowerCase() === studentCountry.toLowerCase()
        );
        if (matchKey) {
          rateForCountry = cl.countryRates[matchKey];
        }
      }
      if (rateForCountry && rateForCountry.cost) {
        const parsedCost = parseFloat(rateForCountry.cost.replace(/[^0-9.-]+/g, "") || "0");
        if (!isNaN(parsedCost) && parsedCost > 0) {
          cost = parsedCost;
        }
      }
    }
    return sum + cost;
  }, 0);

  const metricsByInstitution = institutions.map(inst => {
    const instStudents = students.filter(s => Number(s.institutionId) === Number(inst.id));
    const instStudentIds = instStudents.map(s => Number(s.id));
    
    // Ingresos Totales (Vendido)
    const instEnrollments = enrollments.filter(e => instStudentIds.includes(Number(e.studentId)));
    const ingresosTotales = instEnrollments.reduce((sum, e) => {
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

    // Cuentas por pagar (Costos)
    const cuentasPorPagar = instEnrollments.reduce((sum, e) => {
      const cl = classes.find(c => Number(c.id) === Number(e.classId));
      if (!cl) return sum;
      const student = students.find(s => Number(s.id) === Number(e.studentId));
      const studentCountry = inst?.country?.trim() || student?.country?.trim();

      const cType = cl.creditType;
      let cost = 300;
      if (cType === 'Medio Crédito') cost = 150;
      else if (cType === 'Crédito completo AP') cost = 350;
      else if (cType === 'Medio Crédito AP') cost = 175;

      if (studentCountry && cl.countryRates) {
        let rateForCountry = cl.countryRates[studentCountry];
        if (!rateForCountry) {
          const matchKey = Object.keys(cl.countryRates).find(
            (k) => k.toLowerCase() === studentCountry.toLowerCase()
          );
          if (matchKey) {
            rateForCountry = cl.countryRates[matchKey];
          }
        }
        if (rateForCountry && rateForCountry.cost) {
          const parsedCost = parseFloat(rateForCountry.cost.replace(/[^0-9.-]+/g, "") || "0");
          if (!isNaN(parsedCost) && parsedCost > 0) {
            cost = parsedCost;
          }
        }
      }
      return sum + cost;
    }, 0);

    // Ingresos recibidos (Pagado)
    const instPayments = payments.filter(p => instStudentIds.includes(Number(p.studentId)));
    const ingresosRecibidos = instPayments.reduce((sum, p) => sum + p.finalAmount, 0);

    const ingresosPorCobrar = ingresosTotales - ingresosRecibidos;
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

  const globalIngresosTotales = metricsByInstitution.reduce((sum, m) => sum + m.ingresosTotales, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/50 justify-between items-center">
        <div className="flex space-x-2">
          {[
            { name: "Dashboard", icon: LayoutDashboard },
            { name: "Pagos", icon: CreditCard },
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
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Resumen Financiero</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowDownRight className="h-16 w-16 text-emerald-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ingresos Recibidos</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${totalPagado.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Estimación de ventas: </span>
                    <strong className="text-slate-900 font-mono">${totalVendido.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <CreditCard className="h-16 w-16 text-amber-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cuentas por Cobrar</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${cuentasPorCobrar.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Total transacciones: </span>
                    <strong className="text-slate-900">{payments.length}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowUpRight className="h-16 w-16 text-red-500" />
                </div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cuentas por Pagar</h2>
                <p className="text-2xl font-bold text-slate-900 font-mono">${totalCuentasPorPagar.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 tracking-wider">USD</span></p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500">Proveedores: </span>
                    <strong className="text-slate-900">{providers.length}</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Docentes: </span>
                    <strong className="text-slate-900">14</strong>
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
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50">Institución</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Alumnos</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Ingresos Totales</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Ing. Recibidos</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Por Cobrar</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Cuentas por Pagar</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">Margen</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 text-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metricsByInstitution.map((m, i) => {
                        const pct = globalIngresosTotales > 0 ? (m.ingresosTotales / globalIngresosTotales) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">{m.inst.name}</span></td>
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
      </div>

    </div>
  );
}
