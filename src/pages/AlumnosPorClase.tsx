import React, { useState, useMemo } from "react";
import { useAppContext, Enrollment, resolveCreditPrices, CourseGradeOutcome } from "../context/AppContext";
import { getEnrollmentStatusBadge, EnrollmentStatus } from "../utils/enrollmentStatus";
import { Modal } from "../components/ui/Modal";
import { 
  BookOpen, 
  GraduationCap, 
  Truck, 
  Calendar, 
  DollarSign, 
  Search, 
  Check, 
  Edit3, 
  Info, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Sliders, 
  Building2,
  Trash2,
  XCircle,
  Clock,
  Award
} from "lucide-react";

export function AlumnosPorClase() {
  const { 
    enrollments, 
    students, 
    classes, 
    providers, 
    institutions, 
    updateEnrollment,
    deleteEnrollment,
    catalogs,
    providerProductServices
  } = useAppContext();

  // Filter States
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedGradeOutcome, setSelectedGradeOutcome] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selection state (stores enrollment IDs)
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);

  // Bulk Edit Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // Bulk Edit Form state (which fields are active and their values)
  const [bulkFields, setBulkFields] = useState({
    updateProvider: false,
    updateClass: false,
    updateEnrollmentDate: false,
    updateActivationDate: false,
    updateStatus: false,
    updatePrice: false,
    updateGradeOutcome: false,
    updateFinalGrade: false,
  });

  const [bulkValues, setBulkValues] = useState({
    providerId: "",
    classId: "",
    enrollmentDate: "",
    activationDate: "",
    status: "Active" as "Active" | "Completed" | "On hold" | "Withdrawn",
    price: "",
    gradeOutcome: "Pass" as CourseGradeOutcome,
    finalGrade: "",
  });

  // Derived Enrollments with Student, Class, and Provider info
  const enrichedEnrollments = useMemo(() => {
    return enrollments.map((env) => {
      const student = students.find((s) => s.id === env.studentId);
      const cls = classes.find((c) => c.id === env.classId);
      const provider = providers.find((p) => p.id === env.providerId);
      const institution = student ? institutions.find((i) => i.id === student.institutionId) : null;

      return {
        ...env,
        studentName: student ? `${student.name} ${student.lastName || ""}`.trim() : "Alumno Desconocido",
        studentEmail: student?.email || "Sin correo",
        institutionName: institution?.name || "Sin Institución",
        className: cls?.name || "Clase Desconocida",
        classCode: cls?.code || "",
        providerName: provider ? (provider.commercialName || provider.legalName) : "Sin Proveedor",
      };
    });
  }, [enrollments, students, classes, providers, institutions]);

  // Overall counts
  const totalEnriched = enrichedEnrollments.length;
  const passEnriched = enrichedEnrollments.filter(e => e.gradeOutcome === 'Pass').length;
  const failEnriched = enrichedEnrollments.filter(e => e.gradeOutcome === 'Fail').length;
  const pendingEnriched = enrichedEnrollments.filter(e => !e.gradeOutcome || e.gradeOutcome === 'Pendiente').length;

  // Filtered list
  const filteredEnrollments = useMemo(() => {
    return enrichedEnrollments.filter((env) => {
      // Filter by Class
      if (selectedClassId !== "all" && String(env.classId) !== selectedClassId) {
        return false;
      }
      // Filter by Provider
      if (selectedProviderId !== "all" && String(env.providerId) !== selectedProviderId) {
        return false;
      }
      // Filter by Status
      if (selectedStatus !== "all" && env.status !== selectedStatus) {
        return false;
      }
      // Filter by Grade Outcome (Pass / Fail / Pendiente)
      if (selectedGradeOutcome !== "all") {
        const currentOutcome = env.gradeOutcome || "Pendiente";
        if (currentOutcome !== selectedGradeOutcome) {
          return false;
        }
      }
      // Filter by Search Query (Name, email, class or provider)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = env.studentName.toLowerCase().includes(query);
        const matchesEmail = env.studentEmail.toLowerCase().includes(query);
        const matchesClass = env.className.toLowerCase().includes(query) || env.classCode.toLowerCase().includes(query);
        const matchesProvider = env.providerName.toLowerCase().includes(query);
        const matchesInstitution = env.institutionName.toLowerCase().includes(query);
        
        return matchesName || matchesEmail || matchesClass || matchesProvider || matchesInstitution;
      }

      return true;
    });
  }, [enrichedEnrollments, selectedClassId, selectedProviderId, selectedStatus, selectedGradeOutcome, searchQuery]);

  // Handle Select All checkbox click
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredEnrollments.map((env) => env.id);
      setSelectedEnrollmentIds(allIds);
    } else {
      setSelectedEnrollmentIds([]);
    }
  };

  // Handle single row checkbox click
  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedEnrollmentIds((prev) => [...prev, id]);
    } else {
      setSelectedEnrollmentIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Quick Outcome Set
  const handleQuickOutcome = (id: number, outcome: CourseGradeOutcome) => {
    updateEnrollment(id, {
      gradeOutcome: outcome,
      ...(outcome === 'Pass' || outcome === 'Fail' ? {
        gradeDate: new Date().toISOString().split("T")[0]
      } : {})
    });
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedClassId("all");
    setSelectedProviderId("all");
    setSelectedStatus("all");
    setSelectedGradeOutcome("all");
    setSearchQuery("");
    setSelectedEnrollmentIds([]);
  };

  const getAgreedPrice = (env: Enrollment, classId: number, _providerId: number | undefined) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return env.price || 0;
    const student = students.find((s) => s.id === env.studentId);
    const institution = student ? institutions.find((i) => i.id === student.institutionId) : null;
    const country = institution?.country;
    if (country && cls.countryRates && cls.countryRates[country]) {
      const rate = cls.countryRates[country];
      const parsed = parseFloat(rate.price);
      if (!isNaN(parsed)) return parsed;
    }
    return env.price || 0;
  };

  // Open bulk edit modal
  const handleOpenBulkModal = () => {
    setBulkFields({
      updateProvider: false,
      updateClass: false,
      updateEnrollmentDate: false,
      updateActivationDate: false,
      updateStatus: false,
      updatePrice: false,
      updateGradeOutcome: false,
      updateFinalGrade: false,
    });
    setBulkValues({
      providerId: providers[0]?.id ? String(providers[0].id) : "",
      classId: classes[0]?.id ? String(classes[0].id) : "",
      enrollmentDate: new Date().toISOString().split("T")[0],
      activationDate: new Date().toISOString().split("T")[0],
      status: "Active",
      price: "",
      gradeOutcome: "Pass",
      finalGrade: "",
    });
    setIsBulkModalOpen(true);
  };

  // Submit bulk edits
  const handleApplyBulkUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEnrollmentIds.length === 0) return;

    selectedEnrollmentIds.forEach((id) => {
      const currentEnv = enrollments.find(e => e.id === id);
      if (!currentEnv) return;

      const updatedProviderId = bulkFields.updateProvider && bulkValues.providerId 
        ? Number(bulkValues.providerId) 
        : currentEnv.providerId;

      const updatedClassId = bulkFields.updateClass && bulkValues.classId 
        ? Number(bulkValues.classId) 
        : currentEnv.classId;

      const updatedEnrollmentDate = bulkFields.updateEnrollmentDate && bulkValues.enrollmentDate 
        ? bulkValues.enrollmentDate 
        : currentEnv.enrollmentDate;

      const updatedActivationDate = bulkFields.updateActivationDate && bulkValues.activationDate 
        ? bulkValues.activationDate 
        : currentEnv.activationDate;

      const updatedStatus = bulkFields.updateStatus && bulkValues.status 
        ? bulkValues.status 
        : currentEnv.status;

      let finalPrice = currentEnv.price;
      if (bulkFields.updatePrice && bulkValues.price !== "") {
        finalPrice = Number(bulkValues.price);
      } else if (bulkFields.updateProvider || bulkFields.updateClass) {
        finalPrice = getAgreedPrice(currentEnv, updatedClassId || currentEnv.classId, updatedProviderId || currentEnv.providerId);
      }

      const itemUpdateData: Partial<Enrollment> = {};
      if (bulkFields.updateProvider) itemUpdateData.providerId = updatedProviderId;
      if (bulkFields.updateClass) itemUpdateData.classId = updatedClassId;
      if (bulkFields.updateEnrollmentDate) itemUpdateData.enrollmentDate = updatedEnrollmentDate;
      if (bulkFields.updateActivationDate) itemUpdateData.activationDate = updatedActivationDate;
      if (bulkFields.updateStatus) itemUpdateData.status = updatedStatus;
      
      if (bulkFields.updateGradeOutcome) {
        itemUpdateData.gradeOutcome = bulkValues.gradeOutcome;
        if (bulkValues.gradeOutcome === 'Pass' || bulkValues.gradeOutcome === 'Fail') {
          itemUpdateData.gradeDate = new Date().toISOString().split("T")[0];
        }
      }
      if (bulkFields.updateFinalGrade) {
        itemUpdateData.finalGrade = bulkValues.finalGrade;
      }

      if (bulkFields.updatePrice || bulkFields.updateProvider || bulkFields.updateClass) {
        itemUpdateData.price = finalPrice;
      }

      updateEnrollment(id, itemUpdateData);
    });

    const studentCount = selectedEnrollmentIds.length;
    setSelectedEnrollmentIds([]);
    setIsBulkModalOpen(false);

    setBulkSuccessMessage(
      `Se modificaron correctamente los datos de ${studentCount} alumnos/inscripciones seleccionadas.`
    );
    setTimeout(() => setBulkSuccessMessage(null), 7000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-0 flex flex-col flex-1">
      {/* Top Identity Banner */}
      <div className="bg-slate-900 border-b border-slate-800 -mx-6 -mt-6 px-8 py-8 mb-8 rounded-b-3xl shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-400/20 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-900/40">
                Académico & Operaciones
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Alumnos por Clase
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Visualiza alumnos inscritos agrupados por clase, define aprobación (Pass/Fail) y realiza modificaciones masivas de proveedores, fechas, status y calificaciones de manera consolidada.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6 flex-1 flex flex-col min-h-0">
        
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div 
            onClick={() => setSelectedGradeOutcome("all")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedGradeOutcome === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedGradeOutcome === "all" ? "text-slate-300" : "text-slate-400"}`}>
                Total Inscripciones
              </span>
              <GraduationCap className={`w-4 h-4 ${selectedGradeOutcome === "all" ? "text-slate-300" : "text-slate-400"}`} />
            </div>
            <p className="text-2xl font-black mt-1 font-mono">{totalEnriched}</p>
          </div>

          <div 
            onClick={() => setSelectedGradeOutcome("Pass")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedGradeOutcome === "Pass"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30"
                : "bg-white text-emerald-900 border-emerald-200 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedGradeOutcome === "Pass" ? "text-emerald-100" : "text-emerald-600"}`}>
                Pass (Aprobados)
              </span>
              <CheckCircle2 className={`w-4 h-4 ${selectedGradeOutcome === "Pass" ? "text-emerald-100" : "text-emerald-600"}`} />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black font-mono">{passEnriched}</p>
              <span className={`text-[10px] font-bold ${selectedGradeOutcome === "Pass" ? "text-emerald-200" : "text-emerald-600"}`}>
                {totalEnriched > 0 ? `${Math.round((passEnriched / totalEnriched) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div 
            onClick={() => setSelectedGradeOutcome("Fail")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedGradeOutcome === "Fail"
                ? "bg-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-500/30"
                : "bg-white text-rose-900 border-rose-200 hover:border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedGradeOutcome === "Fail" ? "text-rose-100" : "text-rose-600"}`}>
                Fail (Reprobados)
              </span>
              <XCircle className={`w-4 h-4 ${selectedGradeOutcome === "Fail" ? "text-rose-100" : "text-rose-600"}`} />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black font-mono">{failEnriched}</p>
              <span className={`text-[10px] font-bold ${selectedGradeOutcome === "Fail" ? "text-rose-200" : "text-rose-600"}`}>
                {totalEnriched > 0 ? `${Math.round((failEnriched / totalEnriched) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div 
            onClick={() => setSelectedGradeOutcome("Pendiente")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedGradeOutcome === "Pendiente"
                ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30"
                : "bg-white text-amber-950 border-amber-200 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedGradeOutcome === "Pendiente" ? "text-amber-100" : "text-amber-700"}`}>
                En Curso / Pendiente
              </span>
              <Clock className={`w-4 h-4 ${selectedGradeOutcome === "Pendiente" ? "text-amber-100" : "text-amber-600"}`} />
            </div>
            <p className="text-2xl font-black mt-1 font-mono">{pendingEnriched}</p>
          </div>
        </div>

        {/* Bulk Success Badge */}
        {bulkSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-350">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                {bulkSuccessMessage}
              </span>
            </div>
            <button 
              onClick={() => setBulkSuccessMessage(null)} 
              className="text-emerald-500 hover:text-emerald-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters Panel */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Filtros de Búsqueda
              </h2>
            </div>
            {(selectedClassId !== "all" || selectedProviderId !== "all" || selectedStatus !== "all" || selectedGradeOutcome !== "all" || searchQuery !== "") && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 transition tracking-wider cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search query */}
            <div className="relative sm:col-span-2 md:col-span-1">
              <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Buscar Alumno o Clase
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ej. Antonia Soto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
                />
              </div>
            </div>

            {/* Class filter */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Clase / Curso
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
              >
                <option value="all" style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">Todas las Clases ({classes.length})</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">
                    {cls.name} ({cls.code || 'S/C'}){cls.isArchived ? ' [Archivada]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Proveedor
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
              >
                <option value="all" style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">Todos los Proveedores</option>
                {providers.map((prov) => (
                  <option key={prov.id} value={prov.id} style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">
                    {prov.commercialName || prov.legalName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Estado Inscripción
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
              >
                <option value="all">Todos los Estados</option>
                <option value="Active">Active (Vigente)</option>
                <option value="Ended">Ended (Expirada)</option>
                <option value="Extended">Extended (Extendida)</option>
                <option value="Completed">Completed (Calificada Pass/Fail)</option>
                <option value="On hold">On hold</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            {/* Outcome Filter */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Resultado Académico
              </label>
              <select
                value={selectedGradeOutcome}
                onChange={(e) => setSelectedGradeOutcome(e.target.value)}
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
              >
                <option value="all">Todos los Resultados</option>
                <option value="Pass">✓ Pass (Aprobado)</option>
                <option value="Fail">✗ Fail (Reprobado)</option>
                <option value="Pendiente">⏳ En Curso / Pendiente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Rows Count & Floating Action Bar */}
        {selectedEnrollmentIds.length > 0 && (
          <div className="bg-indigo-900 rounded-3xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-indigo-700 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 text-white">
                <Sliders className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-indigo-200">Acción Masiva</p>
                <p className="text-sm font-black mt-0.5">
                  Hay {selectedEnrollmentIds.length} {selectedEnrollmentIds.length === 1 ? "alumno / inscripción seleccionada" : "alumnos / inscripciones seleccionadas"}
                </p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setSelectedEnrollmentIds([])}
                className="px-3 py-2 border border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 text-white font-extrabold uppercase tracking-widest text-[10px] rounded-xl transition cursor-pointer"
              >
                Deseleccionar
              </button>
              <button
                onClick={handleOpenBulkModal}
                className="px-4 py-2 bg-white text-indigo-950 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-100 hover:scale-102 active:scale-98 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-950" />
                Modificar Datos / Pass-Fail
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 bg-rose-600 border border-rose-500 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-102 active:scale-98 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                Borrar
              </button>
            </div>
          </div>
        )}

        {/* Result Table Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/40">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resultados de la consulta</p>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mt-0.5">
                Viendo {filteredEnrollments.length} alumnos inscritos en clases
              </h3>
            </div>
            {selectedEnrollmentIds.length > 0 && (
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 text-[10px] font-black rounded-full border border-indigo-100">
                {selectedEnrollmentIds.length} Seleccionados
              </span>
            )}
          </div>

          <div className="overflow-x-auto flex-1 min-h-0">
            {filteredEnrollments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                <Info className="w-12 h-12 text-slate-300 mb-4" />
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Sin registros encontrados</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Ningún alumno cumple con los filtros activos. Intenta modificando los criterios de consulta.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100 text-left border-collapse table-auto">
                <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100 font-black text-[9px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-3.5 text-center bg-slate-100">
                      <input
                        type="checkbox"
                        checked={
                          filteredEnrollments.length > 0 &&
                          filteredEnrollments.every((e) => selectedEnrollmentIds.includes(e.id))
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-3.5">Alumno</th>
                    <th className="px-5 py-3.5">Clase / Curso</th>
                    <th className="px-4 py-3.5">Proveedor</th>
                    <th className="px-4 py-3.5">Periodo</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-center">Resultado (Pass/Fail)</th>
                    <th className="px-5 py-3.5 text-right">Precio Acordado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-700 bg-white">
                  {filteredEnrollments.map((env, index) => {
                    const isSelected = selectedEnrollmentIds.includes(env.id);
                    const outcome = env.gradeOutcome || 'Pendiente';

                    return (
                      <tr
                        key={`${env.id}-${index}`}
                        className={`transition duration-155 ${
                          isSelected 
                            ? "bg-indigo-50 hover:bg-indigo-100/80 border-l-4 border-l-indigo-600 font-bold shadow-sm" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(env.id, e.target.checked)}
                            className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Student Name */}
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">
                              {env.studentName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              {env.institutionName}
                            </p>
                          </div>
                        </td>

                        {/* Class Name */}
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-semibold text-slate-700 text-xs">
                              {env.className}
                            </p>
                            {env.classCode && (
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.2 font-bold border border-slate-200/50 mt-0.5 inline-block">
                                {env.classCode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-mono font-medium text-slate-700 text-[11px]">{env.providerName}</span>
                          </div>
                        </td>

                        {/* Period */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1 text-slate-600 text-[10px] font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{env.enrollmentDate || env.startDate || "N/A"}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const badge = getEnrollmentStatusBadge(env.status || "Active");
                            return (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.badgeClass}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Grade Outcome with Quick Toggles */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {outcome === 'Pass' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Pass
                                {env.finalGrade && (
                                  <span className="ml-1 bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-mono text-[9px]">
                                    {env.finalGrade}
                                  </span>
                                )}
                              </span>
                            )}
                            {outcome === 'Fail' && (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Fail
                                {env.finalGrade && (
                                  <span className="ml-1 bg-rose-200 text-rose-900 px-1 py-0.2 rounded font-mono text-[9px]">
                                    {env.finalGrade}
                                  </span>
                                )}
                              </span>
                            )}
                            {outcome === 'Pendiente' && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Pendiente
                              </span>
                            )}

                            {/* Quick toggle action buttons */}
                            <button
                              type="button"
                              title="Marcar Pass"
                              onClick={() => handleQuickOutcome(env.id, 'Pass')}
                              className={`p-1 rounded text-[10px] transition cursor-pointer ${
                                outcome === 'Pass' 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Marcar Fail"
                              onClick={() => handleQuickOutcome(env.id, 'Fail')}
                              className={`p-1 rounded text-[10px] transition cursor-pointer ${
                                outcome === 'Fail' 
                                  ? 'bg-rose-600 text-white' 
                                  : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Agreed Price */}
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                            ${(env.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Modificación Masiva de Alumnos por Clase"
        size="lg"
      >
        <form onSubmit={handleApplyBulkUpdate} className="space-y-5">
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-black text-indigo-950 uppercase tracking-wide">Paso de Modificación de Datos</p>
              <p className="text-indigo-900 mt-0.5 font-medium">
                Selecciona la(s) casilla(s) de los campos que deseas actualizar colectivamente para los <span className="font-bold underline">{selectedEnrollmentIds.length} alumnos</span> elegidos. Los campos desmarcados permanecerán con sus valores individuales intactos.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1 max-h-[50vh] overflow-y-auto pr-1">
            
            {/* Field: Pass / Fail Outcome */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updateGradeOutcome ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updateGradeOutcome}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateGradeOutcome: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updateGradeOutcome ? "text-indigo-950" : "text-slate-600"}`}>
                    Definir Resultado Académico (Pass / Fail)
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!bulkFields.updateGradeOutcome}
                  onClick={() => setBulkValues(prev => ({ ...prev, gradeOutcome: 'Pass' }))}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    bulkValues.gradeOutcome === 'Pass' && bulkFields.updateGradeOutcome
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Pass (Aprobado)
                </button>

                <button
                  type="button"
                  disabled={!bulkFields.updateGradeOutcome}
                  onClick={() => setBulkValues(prev => ({ ...prev, gradeOutcome: 'Fail' }))}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    bulkValues.gradeOutcome === 'Fail' && bulkFields.updateGradeOutcome
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Fail (Reprobado)
                </button>

                <button
                  type="button"
                  disabled={!bulkFields.updateGradeOutcome}
                  onClick={() => setBulkValues(prev => ({ ...prev, gradeOutcome: 'Pendiente' }))}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    bulkValues.gradeOutcome === 'Pendiente' && bulkFields.updateGradeOutcome
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Pendiente
                </button>
              </div>
            </div>

            {/* Field: Final Grade Score */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updateFinalGrade ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updateFinalGrade}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateFinalGrade: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updateFinalGrade ? "text-indigo-950" : "text-slate-600"}`}>
                    Modificar Nota / Calificación Final
                  </span>
                </label>
              </div>
              <input
                type="text"
                disabled={!bulkFields.updateFinalGrade}
                required={bulkFields.updateFinalGrade}
                placeholder="Ej. 95/100, A+, 10"
                value={bulkValues.finalGrade}
                onChange={(e) => setBulkValues(prev => ({ ...prev, finalGrade: e.target.value }))}
                style={{ color: bulkFields.updateFinalGrade ? "#000000" : "#64748b", backgroundColor: bulkFields.updateFinalGrade ? "#ffffff" : "#f1f5f9" }}
                className="block w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition"
              />
            </div>

            {/* Field: Proveedor */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updateProvider ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updateProvider}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateProvider: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updateProvider ? "text-indigo-950" : "text-slate-600"}`}>
                    Modificar Proveedor de Servicio
                  </span>
                </label>
              </div>
              <select
                disabled={!bulkFields.updateProvider}
                value={bulkValues.providerId}
                onChange={(e) => setBulkValues(prev => ({ ...prev, providerId: e.target.value }))}
                style={{ color: bulkFields.updateProvider ? "#000000" : "#64748b", backgroundColor: bulkFields.updateProvider ? "#ffffff" : "#f1f5f9" }}
                className="block w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition"
              >
                {providers.map((prov) => (
                  <option key={prov.id} value={prov.id} style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">
                    {prov.commercialName || prov.legalName}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Clase / Curso */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updateClass ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updateClass}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateClass: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updateClass ? "text-indigo-950" : "text-slate-600"}`}>
                    Modificar Clase / Curso Asignado
                  </span>
                </label>
              </div>
              <select
                disabled={!bulkFields.updateClass}
                value={bulkValues.classId}
                onChange={(e) => setBulkValues(prev => ({ ...prev, classId: e.target.value }))}
                style={{ color: bulkFields.updateClass ? "#000000" : "#64748b", backgroundColor: bulkFields.updateClass ? "#ffffff" : "#f1f5f9" }}
                className="block w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} style={{ color: "#000000", backgroundColor: "#ffffff" }} className="bg-white text-slate-900 font-semibold py-2">
                    {cls.name} ({cls.code || 'S/C'}){cls.isArchived ? ' [Archivada]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Estado */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updateStatus ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updateStatus}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateStatus: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updateStatus ? "text-indigo-950" : "text-slate-600"}`}>
                    Modificar Estado de Inscripción
                  </span>
                </label>
              </div>
              <select
                disabled={!bulkFields.updateStatus}
                value={bulkValues.status}
                onChange={(e) => setBulkValues(prev => ({ ...prev, status: e.target.value as any }))}
                style={{ color: bulkFields.updateStatus ? "#000000" : "#64748b", backgroundColor: bulkFields.updateStatus ? "#ffffff" : "#f1f5f9" }}
                className="block w-full rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition"
              >
                <option value="Active">Active (Vigente)</option>
                <option value="Ended">Ended (Expirada)</option>
                <option value="Extended">Extended (Extendida)</option>
                <option value="Completed">Completed (Calificada Pass/Fail)</option>
                <option value="On hold">On hold</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            {/* Field: Precio Acordado */}
            <div className={`p-5 rounded-2xl border transition duration-200 ${bulkFields.updatePrice ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-sm" : "border-slate-300 bg-slate-50/50"}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkFields.updatePrice}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updatePrice: e.target.checked }))}
                    className="rounded-md text-indigo-600 focus:ring-indigo-600 border-slate-400 w-5 h-5 cursor-pointer"
                  />
                  <span className={`text-xs font-black uppercase tracking-wider ${bulkFields.updatePrice ? "text-indigo-950" : "text-slate-600"}`}>
                    Modificar Precio Acordado
                  </span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className={`font-mono text-xs font-bold ${bulkFields.updatePrice ? "text-slate-800" : "text-slate-400"}`}>$</span>
                </div>
                <input
                  type="number"
                  step="any"
                  disabled={!bulkFields.updatePrice}
                  required={bulkFields.updatePrice}
                  placeholder="Ej. 1500"
                  value={bulkValues.price}
                  onChange={(e) => setBulkValues(prev => ({ ...prev, price: e.target.value }))}
                  style={{ color: bulkFields.updatePrice ? "#000000" : "#64748b", backgroundColor: bulkFields.updatePrice ? "#ffffff" : "#f1f5f9" }}
                  className="block w-full pl-8 rounded-xl border border-slate-350 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition"
                />
              </div>
            </div>

          </div>

          {/* Form Actions footer */}
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!Object.values(bulkFields).some((field) => field === true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Aplicar Cambios Masivos
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Eliminación de Inscripciones"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-start gap-2.5 animate-in fade-in duration-300">
            <Info className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div className="text-xs text-rose-950">
              <p className="font-bold uppercase tracking-wide">¿Está seguro de que desea eliminar las inscripciones?</p>
              <p className="mt-1 font-medium leading-relaxed opacity-90">
                Está a punto de de eliminar <span className="font-bold underline">{selectedEnrollmentIds.length} alumnos/inscripciones</span> de sus respectivas clases. Esta acción removerá el vínculo de los alumnos con estas clases de forma permanente.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-[35vh] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
              Alumnos a desvincular:
            </p>
            {selectedEnrollmentIds.map((id) => {
              const env = enrichedEnrollments.find(e => e.id === id);
              if (!env) return null;
              return (
                <div key={id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm animate-in zoom-in-95 duration-200">
                  <div>
                    <p className="font-bold text-slate-800">{env.studentName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{env.className}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full inline-block">
                    Se desvinculará
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Actions footer */}
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                selectedEnrollmentIds.forEach((id) => {
                  deleteEnrollment(id);
                });
                const count = selectedEnrollmentIds.length;
                setSelectedEnrollmentIds([]);
                setIsDeleteModalOpen(false);
                setBulkSuccessMessage(`Se eliminaron correctamente ${count} inscripciones de clases.`);
                setTimeout(() => setBulkSuccessMessage(null), 7000);
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Sí, Eliminar de las Clases
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
