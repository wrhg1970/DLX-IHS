import React, { useState } from "react";
import { Search, Filter, Trash2, Archive, AlertTriangle, CheckCircle, HelpCircle, SlidersHorizontal } from "lucide-react";
import { useAppContext, Institution, resolveCreditPrices } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/ui/Modal";

export function Instituciones() {
  const { 
    institutions, 
    catalogs, 
    students, 
    contacts, 
    tasks, 
    enrollments, 
    classes, 
    financialTransactions, 
    deleteInstitution, 
    updateInstitution,
    clearAllInstitutions,
    providerProductServices,
    providers,
    currentUser
  } = useAppContext();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todas");
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // New Filters
  const [filterCountry, setFilterCountry] = useState("Todas");
  const [filterMembership, setFilterMembership] = useState("Todas");
  const [filterProvider, setFilterProvider] = useState("Todas");
  const [filterModality, setFilterModality] = useState("Todas");
  const [filterType, setFilterType] = useState("Todas");
  const [filterActive, setFilterActive] = useState("Todas");

  // Selection & Bulk Modification State
  const [selectedInstIds, setSelectedInstIds] = useState<number[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [showBulkSuccessToast, setShowBulkSuccessToast] = useState(false);

  const [bulkFields, setBulkFields] = useState({
    updateType: false,
    updateTarifas: false,
    updateProvider: false,
    updateMembership: false,
    updatePaymentMethod: false,
    updateMembershipExpiration: false,
    updateActive: false,
  });

  const [bulkValues, setBulkValues] = useState({
    institutionTypeId: "",
    tarifasId: "",
    mainProviderId: "",
    membershipId: "",
    paymentMethod: "",
    membershipExpiration: "",
    active: true,
  });

  const isSuperAdmin = currentUser?.role?.toLowerCase()?.includes('super') || 
                       currentUser?.role?.toLowerCase()?.includes('admin principal') || 
                       currentUser?.role?.toLowerCase()?.includes('director');

  // Helper inside the page to check pending balances & associated records
  const getInstStats = (instId: number) => {
    const instStudents = students.filter(s => s.institutionId === instId);
    const instStudentIds = instStudents.map(s => s.id);
    const instContacts = contacts.filter(c => c.institutionId === instId);
    const instTasks = tasks.filter(t => t.institutionId === instId);

    // Ingresos Totales (Vendido)
    const instEnrollments = enrollments.filter(e => instStudentIds.includes(e.studentId));
    const totalVendido = instEnrollments.reduce((sum, e) => {
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

    // Ingresos Recibidos (Pagado)
    const instPayments = financialTransactions.filter(p => 
      (p.institutionId === instId || (p.studentId && instStudentIds.includes(p.studentId))) && 
      p.type === 'income' && 
      (p.status === 'Aplicado' || p.status === 'Pagado')
    );
    const totalPagado = instPayments.reduce((sum, p) => sum + p.amountMXN, 0);

    // Costo Clases (Cargos)
    const totalCost = instEnrollments.reduce((sum, e) => {
      const cl = classes.find(c => c.id === e.classId);
      if (!cl) return sum;
      const cType = cl.creditType;
      let cost = 300;
      if (cType === 'Medio Crédito') cost = 150;
      else if (cType === 'Crédito completo AP') cost = 350;
      else if (cType === 'Medio Crédito AP') cost = 175;
      return sum + cost;
    }, 0);

    // Egresos Pagados
    const instExpenses = financialTransactions.filter(p => p.studentId && instStudentIds.includes(p.studentId) && p.type === 'expense');
    const egresosPagados = instExpenses.reduce((sum, p) => sum + p.amountMXN, 0);

    const totalPorRecaudar = Math.max(0, totalVendido - totalPagado); // Accounts receivable (Pending client payments)
    const saldoPorPagar = Math.max(0, totalCost - egresosPagados); // Accounts payable (Pending charges/costs)

    const numStudents = instStudents.length;
    const numContacts = instContacts.length;
    const numTasks = instTasks.length;

    const hasPendingBalances = totalPorRecaudar > 0 || saldoPorPagar > 0;
    const hasAssociatedRecords = numStudents > 0 || numContacts > 0 || numTasks > 0;

    return {
      numStudents,
      numContacts,
      numTasks,
      totalPorRecaudar,
      saldoPorPagar,
      hasPendingBalances,
      hasAssociatedRecords
    };
  };

  const currentStats = selectedInst ? getInstStats(selectedInst.id) : null;

  const handleActionClick = (inst: Institution, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInst(inst);
    setIsConfirmModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedInst(null);
    setIsConfirmModalOpen(false);
  };

  const executeArchive = () => {
    if (selectedInst) {
      updateInstitution(selectedInst.id, { status: "Archivada" });
      handleCloseModal();
    }
  };

  const executeDelete = () => {
    if (selectedInst) {
      deleteInstitution(selectedInst.id);
      handleCloseModal();
    }
  };

  // Selection toggle lists
  const toggleSelectInst = (instId: number) => {
    setSelectedInstIds(prev => 
      prev.includes(instId) 
        ? prev.filter(id => id !== instId) 
        : [...prev, instId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredInstitutions.map(i => i.id);
    const allSelected = filteredIds.every(id => selectedInstIds.includes(id));
    
    if (allSelected) {
      setSelectedInstIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedInstIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleApplyBulkChanges = () => {
    const updatedData: Partial<Institution> = {};
    
    if (bulkFields.updateType) {
      updatedData.institutionTypeId = bulkValues.institutionTypeId || undefined;
    }
    if (bulkFields.updateTarifas) {
      updatedData.tarifasId = bulkValues.tarifasId || undefined;
    }
    if (bulkFields.updateProvider) {
      updatedData.mainProviderId = bulkValues.mainProviderId ? Number(bulkValues.mainProviderId) : undefined;
    }
    if (bulkFields.updateMembership) {
      updatedData.membershipId = bulkValues.membershipId || undefined;
    }
    if (bulkFields.updatePaymentMethod) {
      updatedData.paymentMethod = bulkValues.paymentMethod || undefined;
    }
    if (bulkFields.updateMembershipExpiration) {
      updatedData.membershipExpiration = bulkValues.membershipExpiration || undefined;
    }
    if (bulkFields.updateActive) {
      updatedData.active = bulkValues.active;
    }

    selectedInstIds.forEach((id) => {
      updateInstitution(id, updatedData);
    });

    setSelectedInstIds([]);
    setIsBulkEditModalOpen(false);
    
    // Show success banner
    setShowBulkSuccessToast(true);
    setTimeout(() => setShowBulkSuccessToast(false), 4000);
  };

  // Extract unique countries
  const countries = Array.from(
    new Set(
      institutions
        .map((inst) => inst.country)
        .filter(Boolean)
        .map((c) => c.trim())
    )
  ).sort();

  // Filter application
  const filteredInstitutions = institutions.filter((inst) => {
    // Determine dynamic billing/account status
    const stats = getInstStats(inst.id);
    const resolvedStatus = (inst.status === 'Archivada' || inst.status === 'Archivado') 
      ? inst.status 
      : (stats.totalPorRecaudar > 0 ? 'Pendiente' : 'Al corriente');

    // Search matches against name, tradeName, country, contact
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      inst.name.toLowerCase().includes(searchString) ||
      (inst.tradeName || '').toLowerCase().includes(searchString) ||
      inst.country.toLowerCase().includes(searchString) ||
      (inst.contact || '').toLowerCase().includes(searchString);

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus !== "Todas") {
      if (filterStatus === "Archivada") {
        if (resolvedStatus !== "Archivada" && resolvedStatus !== "Archivado") return false;
      } else if (resolvedStatus !== filterStatus) {
        return false;
      }
    }

    // New Country filter
    if (filterCountry !== "Todas" && inst.country?.trim() !== filterCountry) return false;

    // New Membership filter
    if (filterMembership !== "Todas" && inst.membershipId !== filterMembership) return false;

    // New Provider filter
    if (filterProvider !== "Todas" && inst.mainProviderId !== Number(filterProvider)) return false;

    // New Modality filter
    if (filterModality !== "Todas" && inst.modality !== filterModality) return false;

    // New Type filter
    if (filterType !== "Todas" && inst.institutionTypeId !== filterType) return false;

    // Active status filter
    if (filterActive !== "Todas") {
      const instIsActive = inst.active !== false;
      if (filterActive === "Activas" && !instIsActive) return false;
      if (filterActive === "Inactivas" && instIsActive) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 flex flex-col flex-1 min-h-0 relative pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, país o contacto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* Status selector filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {["Todas", "Al corriente", "Pendiente", "Archivada"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`py-1 px-3.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
                  filterStatus === st 
                    ? "bg-white text-slate-800 shadow-xs" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {institutions.length > 0 && (
            <button 
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="border border-rose-250 bg-rose-50/40 hover:bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              title="Borrar todas las instituciones permanentemente"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar Todas
            </button>
          )}

          <button 
            onClick={() => navigate('/instituciones/nueva')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition uppercase tracking-wider"
          >
            + Añadir Institución
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER DRAWER PANEL */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            Filtros Avanzados
          </h4>
          {(filterCountry !== "Todas" || filterMembership !== "Todas" || filterProvider !== "Todas" || filterModality !== "Todas" || filterType !== "Todas" || filterActive !== "Todas") && (
            <button
              onClick={() => {
                setFilterCountry("Todas");
                setFilterMembership("Todas");
                setFilterProvider("Todas");
                setFilterModality("Todas");
                setFilterType("Todas");
                setFilterActive("Todas");
              }}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-widest"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* País Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">País</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todos los Países</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Membresía Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membresía</label>
            <select
              value={filterMembership}
              onChange={(e) => setFilterMembership(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todas las Membresías</option>
              {(catalogs['Membresías'] || []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Proveedor Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todos los Proveedores</option>
              {(providers || []).map((p) => (
                <option key={p.id} value={p.id}>{p.commercialName || p.name}</option>
              ))}
            </select>
          </div>

          {/* Modalidad Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modalidad</label>
            <select
              value={filterModality}
              onChange={(e) => setFilterModality(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todas las Modalidades</option>
              {(catalogs['Modalidades'] || []).map((m) => (
                <option key={m.id || m.name} value={m.name || m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Institución Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo Institución</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todos los Tipos</option>
              {(catalogs['Tipos de Institución'] || []).map((ti) => (
                <option key={ti.id} value={ti.id}>{ti.name}</option>
              ))}
            </select>
          </div>

          {/* Estado de Actividad Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activa</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
            >
              <option value="Todas">Todas</option>
              <option value="Activas">Activas</option>
              <option value="Inactivas">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        <div className="overflow-auto flex-1 h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-center w-12" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={filteredInstitutions.length > 0 && filteredInstitutions.every(i => selectedInstIds.includes(i.id))}
                      onChange={handleSelectAllFiltered}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">País</th>
                <th className="px-6 py-3">Membresía</th>
                <th className="px-6 py-3">Contacto Ppal.</th>
                <th className="px-6 py-3 text-center">Alumnos</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs bg-white">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-12 text-center text-slate-400">
                    Ninguna institución coincide con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst) => {
                  const stats = getInstStats(inst.id);
                  const resolvedStatus = (inst.status === 'Archivada' || inst.status === 'Archivado')
                    ? inst.status
                    : (stats.totalPorRecaudar > 0 ? 'Pendiente' : 'Al corriente');

                  return (
                    <tr key={inst.id} onClick={() => navigate(`/instituciones/${inst.id}`)} className="hover:bg-slate-50 cursor-pointer group">
                      {isSuperAdmin && (
                        <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedInstIds.includes(inst.id)}
                            onChange={() => toggleSelectInst(inst.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-3 border-l-[3px] border-transparent group-hover:text-indigo-600 transition-colors">
                        <div className="font-semibold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                          <span>{inst.tradeName ? inst.tradeName : inst.name}</span>
                          {(inst.isCorporativo || inst.institutionTypeId === '4') && (
                            <span className="bg-slate-100 text-slate-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-slate-200 shadow-xs leading-none">
                              Corp
                            </span>
                          )}
                          <span className={`${
                            inst.active !== false 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          } text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none shadow-xs`}>
                            {inst.active !== false ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        {inst.tradeName && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                            {inst.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-500">{inst.country}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {inst.membershipId 
                          ? <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">{catalogs['Membresías']?.find(m => m.id === inst.membershipId)?.name || 'Desconocida'}</span>
                          : <span className="text-slate-400 text-[10px] italic">Ninguna</span>
                        }
                      </td>
                      <td className="px-6 py-3 text-slate-600 font-medium font-sans">
                        <div>{inst.contact}</div>
                        {inst.contactPhone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                            {inst.contactPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center font-mono">
                        {students.filter(s => s.institutionId === inst.id).length}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                          resolvedStatus === 'Al corriente' ? 'bg-green-100 text-green-700' : 
                          resolvedStatus === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 
                          resolvedStatus === 'Archivada' || resolvedStatus === 'Archivado' ? 'bg-slate-100 text-slate-500 border border-slate-200 font-semibold' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {resolvedStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button 
                          onClick={(e) => handleActionClick(inst, e)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors flex items-center justify-center ml-auto border border-transparent hover:border-slate-200/50"
                          title="Borrar o Archivar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Mostrando {filteredInstitutions.length} de {institutions.length} instituciones</span>
        </div>
      </div>

      {/* ACTION & CONFIRMATION MODAL */}
      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={handleCloseModal} 
        title={`Confirmar Acción: ${selectedInst?.name || ""}`}
      >
        {selectedInst && currentStats && (
          <div className="space-y-4">
            
            {/* Institution Stats Summary */}
            <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50 space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Análisis de la Institución</h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Alumnos Vinculados:</p>
                  <p className="font-extrabold text-slate-800 text-sm">{currentStats.numStudents} alumnos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Contactos Registrados:</p>
                  <p className="font-extrabold text-slate-800 text-sm">{currentStats.numContacts} contactos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Tareas de Seguimiento:</p>
                  <p className="font-extrabold text-slate-800 text-sm">{currentStats.numTasks} tareas</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Estatus Actual:</p>
                  <p className="font-extrabold text-slate-800 text-sm uppercase">{selectedInst.status}</p>
                </div>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-medium">Saldos por Cobrar (Venta):</p>
                  <p className={`font-extrabold ${currentStats.totalPorRecaudar > 0 ? "text-amber-600" : "text-slate-700"}`}>
                    ${currentStats.totalPorRecaudar.toLocaleString()} MXN
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-400 font-medium">Saldos por Pagar (Costos):</p>
                  <p className={`font-extrabold ${currentStats.saldoPorPagar > 0 ? "text-rose-600" : "text-slate-700"}`}>
                    ${currentStats.saldoPorPagar.toLocaleString()} MXN
                  </p>
                </div>
              </div>
            </div>

            {/* Decision Rule Section */}
            {currentStats.hasPendingBalances ? (
              /* Case 1: Has pending financial balances -> CAN ONLY ARCHIVE */
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-2">
                <div className="flex items-start gap-2 text-amber-850">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700">Acción Requerida: Archivar</p>
                    <p className="font-medium mt-1 leading-relaxed">
                      Esta institución tiene <strong>pagos o cargos pendientes</strong> (${currentStats.totalPorRecaudar.toLocaleString()} MXN / ${currentStats.saldoPorPagar.toLocaleString()} MXN). 
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                      Para garantizar la consistencia de los balances fiscales y contables, no se puede eliminar de forma permanente. Únicamente se permite archivar para suspender operaciones sin perder el historial.
                    </p>
                  </div>
                </div>
              </div>
            ) : currentStats.hasAssociatedRecords ? (
              /* Case 2: Has associated records but NO accounts receivable/payable -> ARCHIVE OPTION RECOMMENDED BUT DELETION ALLOWED WITH CRITICAL CASCADE NOTICE */
              <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 space-y-2">
                <div className="flex items-start gap-2 text-indigo-850">
                  <HelpCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">Apto para Borrar o Archivar</p>
                    <p className="font-medium mt-1 leading-relaxed">
                      La institución no tiene saldos contables pendientes, pero sí tiene de forma activa <strong>{currentStats.numStudents} alumnos</strong> o <strong>{currentStats.numContacts} contactos</strong>.
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                      • Si la <strong>archivas</strong>, se suspenderá su operación activa pero conservarás a sus alumnos y contactos en el CRM.
                    </p>
                    <p className="mt-1 leading-relaxed text-red-650 font-bold">
                      • Si la <strong>eliminas por completo</strong>, estos datos se desconectarán. Elige la opción deseada.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Case 3: Empty & no pending balances -> CAN FREELY PURGE */
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-250 space-y-2">
                <div className="flex items-start gap-2 text-emerald-850">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Apto para Eliminar</p>
                    <p className="font-medium mt-1 leading-relaxed">
                      Esta institución está en limpio. No tiene alumnos, contactos ni deudas activas registrados.
                    </p>
                    <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                      Se puede eliminar por completo de la base de datos de manera irreversible con total seguridad.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
              {currentStats.hasPendingBalances ? (
                // Only archive is selectable
                <button
                  onClick={executeArchive}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archivar Institución (Mantener Historial Contable)
                </button>
              ) : (
                // Both or only delete depending on presence of components
                <div className="space-y-2">
                  <button
                    onClick={executeArchive}
                    className="w-full border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Archive className="w-4 h-4" />
                    Archivar en su lugar (Recomendado)
                  </button>
                  <button
                    onClick={executeDelete}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar por Completo de la Base de Datos
                  </button>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
            </div>

          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        title="⚠️ Eliminar TODAS las Instituciones"
      >
        <div className="space-y-4">
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-2">
            <div className="flex items-start gap-2 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0 animate-bounce" />
              <div className="text-xs">
                <p className="font-black uppercase tracking-wider text-[11px] text-rose-700">Acción Crítica e Irreversible</p>
                <p className="font-semibold text-slate-700 mt-1 leading-relaxed">
                  Estás a punto de borrar permanentemente <strong>todas las {institutions.length} instituciones</strong> de la base de datos de manera definitiva.
                </p>
                <p className="mt-1 leading-relaxed text-slate-600 font-medium">
                  • Esto eliminará las instituciones de todos los listados de la plataforma.<br />
                  • Sus registros de CRM, tarifas registradas, y datos base se perderán.<br />
                  • Alumnos y contratos asociados ya no tendrán una institución a la que hacer referencia.
                </p>
                <p className="mt-2.5 leading-relaxed text-rose-700 font-black uppercase text-[10px] tracking-widest">
                  ¿Estás absolutamente seguro de continuar con la eliminación masiva?
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                clearAllInstitutions();
                setIsDeleteAllModalOpen(false);
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/10"
            >
              <Trash2 className="w-4 h-4" />
              Sí, Borrar las {institutions.length} Instituciones
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteAllModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* FLOATING ACTION TOOLBAR FOR SUPER ADMIN BULK CHANGES */}
      {isSuperAdmin && selectedInstIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-850 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-full shrink-0">
              {selectedInstIds.length}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">
              Escuelas Seleccionadas
            </span>
          </div>
          
          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkFields({
                  updateType: false,
                  updateTarifas: false,
                  updateProvider: false,
                  updateMembership: false,
                  updatePaymentMethod: false,
                  updateMembershipExpiration: false,
                  updateActive: false,
                });
                setBulkValues({
                  institutionTypeId: "",
                  tarifasId: "",
                  mainProviderId: "",
                  membershipId: "",
                  paymentMethod: "",
                  membershipExpiration: "",
                  active: true,
                });
                setIsBulkEditModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Cambio Masivo
            </button>
            <button
              onClick={() => setSelectedInstIds([])}
              className="hover:bg-slate-800 text-slate-400 hover:text-white rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      <Modal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        title="✏️ Edición Masiva de Instituciones"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-850 leading-relaxed">
            <span className="font-extrabold text-[10px] uppercase tracking-wider block mb-1 text-indigo-900">Modo de Modificación Masiva</span>
            Vas a actualizar <strong className="font-black text-indigo-950 text-sm">{selectedInstIds.length}</strong> instituciones seleccionadas al mismo tiempo. Activa la casilla de cada propiedad para incluirla en la actualización:
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            {/* Tipo de Institución */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateType"
                checked={bulkFields.updateType}
                onChange={(e) => setBulkFields({ ...bulkFields, updateType: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateType" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Tipo de Institución
                </label>
                <select
                  disabled={!bulkFields.updateType}
                  value={bulkValues.institutionTypeId}
                  onChange={(e) => setBulkValues({ ...bulkValues, institutionTypeId: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Tipo --</option>
                  {(catalogs['Tipos de Institución'] || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tarifas */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateTarifas"
                checked={bulkFields.updateTarifas}
                onChange={(e) => setBulkFields({ ...bulkFields, updateTarifas: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateTarifas" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Tarifas (País)
                </label>
                <select
                  disabled={!bulkFields.updateTarifas}
                  value={bulkValues.tarifasId}
                  onChange={(e) => setBulkValues({ ...bulkValues, tarifasId: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Tarifas --</option>
                  {(catalogs['Tarifas Países'] || []).map((tp) => (
                    <option key={tp.id} value={tp.id}>{tp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Proveedor Principal */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateProvider"
                checked={bulkFields.updateProvider}
                onChange={(e) => setBulkFields({ ...bulkFields, updateProvider: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateProvider" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Proveedor Principal
                </label>
                <select
                  disabled={!bulkFields.updateProvider}
                  value={bulkValues.mainProviderId}
                  onChange={(e) => setBulkValues({ ...bulkValues, mainProviderId: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {(providers || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.commercialName || p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Membresía */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateMembership"
                checked={bulkFields.updateMembership}
                onChange={(e) => setBulkFields({ ...bulkFields, updateMembership: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateMembership" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Membresía
                </label>
                <select
                  disabled={!bulkFields.updateMembership}
                  value={bulkValues.membershipId}
                  onChange={(e) => setBulkValues({ ...bulkValues, membershipId: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Membresía --</option>
                  {(catalogs['Membresías'] || []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updatePaymentMethod"
                checked={bulkFields.updatePaymentMethod}
                onChange={(e) => setBulkFields({ ...bulkFields, updatePaymentMethod: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updatePaymentMethod" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Método de Pago
                </label>
                <select
                  disabled={!bulkFields.updatePaymentMethod}
                  value={bulkValues.paymentMethod}
                  onChange={(e) => setBulkValues({ ...bulkValues, paymentMethod: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Seleccionar Método --</option>
                  {(catalogs['Métodos de Pago'] || []).map((mp) => (
                    <option key={mp.id || mp.name} value={mp.name || mp.id}>{mp.name || mp.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vigencia Membresía */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateMembershipExpiration"
                checked={bulkFields.updateMembershipExpiration}
                onChange={(e) => setBulkFields({ ...bulkFields, updateMembershipExpiration: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateMembershipExpiration" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Vigencia Membresía
                </label>
                <input
                  type="date"
                  disabled={!bulkFields.updateMembershipExpiration}
                  value={bulkValues.membershipExpiration}
                  onChange={(e) => setBulkValues({ ...bulkValues, membershipExpiration: e.target.value })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                />
              </div>
            </div>

            {/* Activa */}
            <div className="pt-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="updateActive"
                checked={bulkFields.updateActive}
                onChange={(e) => setBulkFields({ ...bulkFields, updateActive: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="updateActive" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                  Activa
                </label>
                <select
                  disabled={!bulkFields.updateActive}
                  value={bulkValues.active ? "true" : "false"}
                  onChange={(e) => setBulkValues({ ...bulkValues, active: e.target.value === "true" })}
                  className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                >
                  <option value="true">Sí (Activa)</option>
                  <option value="false">No (Inactiva)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={handleApplyBulkChanges}
              disabled={!Object.values(bulkFields).some(Boolean)}
              className="flex-1 bg-indigo-600 disabled:bg-slate-200 disabled:cursor-not-allowed hover:bg-indigo-700 text-white rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Aplicar Cambios Masivos
            </button>
            <button
              type="button"
              onClick={() => setIsBulkEditModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST NOTIFICATION ON SUCCESS */}
      {showBulkSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CheckCircle className="w-5 h-5 text-white" />
          <div className="text-xs">
            <span className="font-bold block">¡Cambios Aplicados con Éxito!</span>
            <span className="opacity-90">Las escuelas seleccionadas han sido actualizadas masivamente.</span>
          </div>
        </div>
      )}

    </div>
  );
}
