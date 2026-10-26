import React, { useState, useMemo } from "react";
import { useAppContext, AuditLog, AuditActionType, AuditSeverity } from "../context/AppContext";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Settings,
  PlusCircle,
  Edit3,
  Cloud,
  User,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Eye,
  X,
  FileText,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  List,
  GitCommit,
  Building2,
  GraduationCap,
  BookOpen,
  DollarSign,
  Shield
} from "lucide-react";

export function Auditoria() {
  const { auditLogs, addAuditLog, clearAuditLogs, currentUser } = useAppContext();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  // Modals
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Manual log form state
  const [manualForm, setManualForm] = useState({
    entityType: "institution",
    entityId: "",
    entityName: "",
    actionType: "settings_change" as AuditActionType,
    severity: "alta" as AuditSeverity,
    description: "",
    notes: ""
  });

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(query);
        const matchUser = log.userName?.toLowerCase().includes(query) || log.userEmail?.toLowerCase().includes(query) || String(log.userId || "").toLowerCase().includes(query);
        const matchEntity = log.entityName?.toLowerCase().includes(query) || String(log.entityId || "").toLowerCase().includes(query) || log.entityType?.toLowerCase().includes(query);
        const matchId = log.id?.toLowerCase().includes(query);
        if (!matchDesc && !matchUser && !matchEntity && !matchId) {
          return false;
        }
      }

      // 2. Action type filter
      if (actionFilter !== "all") {
        if (log.actionType !== actionFilter) {
          return false;
        }
      }

      // 3. Entity type filter
      if (entityFilter !== "all") {
        if (log.entityType !== entityFilter) {
          return false;
        }
      }

      // 4. Severity filter
      if (severityFilter !== "all") {
        if (log.severity !== severityFilter) {
          return false;
        }
      }

      // 5. Date range filter
      if (dateRangeFilter !== "all" && log.date) {
        const logTime = new Date(log.date).getTime();
        const now = Date.now();
        if (dateRangeFilter === "today") {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          if (logTime < oneDayAgo) return false;
        } else if (dateRangeFilter === "7days") {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (logTime < sevenDaysAgo) return false;
        } else if (dateRangeFilter === "30days") {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (logTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [auditLogs, searchTerm, actionFilter, entityFilter, severityFilter, dateRangeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const criticalDeletes = auditLogs.filter(l => l.actionType === "delete" || l.severity === "critica").length;
    const settingsModifications = auditLogs.filter(l => l.actionType === "settings_change").length;
    
    // Unique users
    const uniqueUserIds = new Set(auditLogs.map(l => l.userId || l.userName || l.userEmail).filter(Boolean));
    const activeUsersCount = uniqueUserIds.size;

    return { total, criticalDeletes, settingsModifications, activeUsersCount };
  }, [auditLogs]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["ID", "Fecha y Hora", "ID Usuario", "Usuario", "Email", "Rol", "Tipo de Acción", "Severidad", "Tipo de Entidad", "ID Entidad", "Nombre Entidad", "Descripción", "Cambios"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.date ? new Date(log.date).toLocaleString("es-MX") : "",
      log.userId || "N/A",
      `"${(log.userName || "").replace(/"/g, '""')}"`,
      log.userEmail || "",
      log.userRole || "",
      log.actionType || "general",
      log.severity || "media",
      log.entityType || "",
      log.entityId || "",
      `"${(log.entityName || "").replace(/"/g, '""')}"`,
      `"${(log.description || "").replace(/"/g, '""')}"`,
      log.fieldsChanged ? `"${log.fieldsChanged.map(f => `${f.fieldName}: ${f.oldValue} -> ${f.newValue}`).join("; ").replace(/"/g, '""')}"` : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bitacora_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print / PDF
  const handlePrint = () => {
    window.print();
  };

  // Submit manual log
  const handleSaveManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.description.trim()) return;

    addAuditLog({
      actionType: manualForm.actionType,
      severity: manualForm.severity,
      entityType: manualForm.entityType,
      entityId: manualForm.entityId || "MANUAL",
      entityName: manualForm.entityName || "Acción Registrada",
      description: manualForm.description + (manualForm.notes ? ` (Justificación: ${manualForm.notes})` : ""),
      userId: currentUser?.id || "admin-1",
      userName: currentUser?.name || "Administrador",
      userEmail: currentUser?.email || "admin@sistema.com",
      userRole: currentUser?.role || "Superadministrador"
    });

    setShowManualModal(false);
    setManualForm({
      entityType: "institution",
      entityId: "",
      entityName: "",
      actionType: "settings_change",
      severity: "alta",
      description: "",
      notes: ""
    });
  };

  // Helpers for Action Badges
  const getActionBadge = (type?: AuditActionType) => {
    switch (type) {
      case "delete":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3 h-3 text-rose-600" />
            Eliminación
          </span>
        );
      case "settings_change":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Settings className="w-3 h-3 text-amber-600" />
            Configuración
          </span>
        );
      case "create":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            Creación
          </span>
        );
      case "restore":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <RotateCcw className="w-3 h-3 text-teal-600" />
            Restauración
          </span>
        );
      case "backup":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Cloud className="w-3 h-3 text-indigo-600" />
            Respaldo
          </span>
        );
      case "update":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Edit3 className="w-3 h-3 text-blue-600" />
            Modificación
          </span>
        );
    }
  };

  // Helper for Severity Badge
  const getSeverityBadge = (severity?: AuditSeverity) => {
    switch (severity) {
      case "critica":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">
            Crítica
          </span>
        );
      case "alta":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white">
            Alta
          </span>
        );
      case "media":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
            Media
          </span>
        );
      case "baja":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
            Baja
          </span>
        );
    }
  };

  // Helper for Entity Icon
  const getEntityIcon = (entityType?: string) => {
    switch (entityType) {
      case "institution":
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case "student":
        return <GraduationCap className="w-4 h-4 text-emerald-500" />;
      case "class":
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "payment":
      case "financialTransaction":
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      case "user":
        return <User className="w-4 h-4 text-purple-500" />;
      case "role":
        return <Shield className="w-4 h-4 text-rose-500" />;
      case "backup":
        return <Cloud className="w-4 h-4 text-sky-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  // Relative time formatter
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return "Justo ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
  };

  const isSuperAdmin = currentUser?.role?.toLowerCase().includes("super") || currentUser?.role?.toLowerCase().includes("admin principal");

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Bitácora de Auditoría
              </h1>
              <p className="text-sm text-gray-500">
                Registro inmutable de acciones críticas, modificaciones de configuración institucional y eventos de seguridad.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center flex-wrap gap-2 print:hidden">
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            Registrar Incidencia
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            Imprimir
          </button>

          {isSuperAdmin && auditLogs.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-sm"
              title="Purgar bitácora (Solo Superadministradores)"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              Purgar
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Total Logs */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Eventos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Trazabilidad activa
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
            <FileText className="w-6 h-6 text-slate-700" />
          </div>
        </div>

        {/* Critical Deletions */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Eliminaciones Críticas</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{stats.criticalDeletes}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Registros eliminados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
            <Trash2 className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        {/* Settings Changes */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Cambios de Configuración</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.settingsModifications}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-amber-500" />
              Parámetros institucionales
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
            <Settings className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Usuarios Responsables</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.activeUsersCount}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              Cuentas auditadas
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <User className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario (ID o nombre), descripción, entidad o ID de registro..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "timeline"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              Línea de Tiempo
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Acción
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="all">Todas las acciones</option>
              <option value="delete">Eliminaciones</option>
              <option value="settings_change">Cambios de Configuración</option>
              <option value="update">Modificaciones</option>
              <option value="create">Creaciones</option>
              <option value="backup">Respaldos</option>
              <option value="restore">Restauraciones</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Entidad
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="all">Todas las entidades</option>
              <option value="institution">Institución</option>
              <option value="student">Alumno</option>
              <option value="class">Clase / Materia</option>
              <option value="payment">Pago</option>
              <option value="financialTransaction">Transacción Financiera</option>
              <option value="provider">Proveedor</option>
              <option value="user">Usuario</option>
              <option value="role">Rol de Seguridad</option>
              <option value="company">Configuración Institucional</option>
              <option value="backup">Respaldo</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Severidad
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="all">Todas las severidades</option>
              <option value="critica">Crítica (Rojo)</option>
              <option value="alta">Alta (Ámbar)</option>
              <option value="media">Media (Azul)</option>
              <option value="baja">Baja (Gris)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Rango Temporal
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="all">Histórico completo</option>
              <option value="today">Hoy (Últimas 24h)</option>
              <option value="7days">Últimos 7 días</option>
              <option value="30days">Últimos 30 días</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || actionFilter !== "all" || entityFilter !== "all" || severityFilter !== "all" || dateRangeFilter !== "all") && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Mostrando <strong className="text-gray-900">{filteredLogs.length}</strong> de {auditLogs.length} eventos registrados.
            </span>
            <button
              onClick={() => {
                setSearchTerm("");
                setActionFilter("all");
                setEntityFilter("all");
                setSeverityFilter("all");
                setDateRangeFilter("all");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Main View: Table vs Timeline */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No se encontraron registros de auditoría</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No hay eventos que coincidan con los filtros de búsqueda seleccionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Usuario Responsable</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Entidad Afectada</th>
                    <th className="py-3 px-4">Descripción de la Acción</th>
                    <th className="py-3 px-4">Severidad</th>
                    <th className="py-3 px-4 text-right">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => {
                    const formattedDate = log.date ? new Date(log.date).toLocaleString("es-MX", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }) : "N/A";

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/75 transition-colors group cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-gray-900 text-xs font-medium">
                            {formattedDate}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {getRelativeTime(log.date)}
                          </div>
                        </td>

                        {/* User info */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0">
                              {(log.userName || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                <span>{log.userName || "Administrador"}</span>
                                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                                  ID: {log.userId || "1"}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-400 truncate max-w-[170px]">
                                {log.userEmail || log.userRole || "wrhg1970@gmail.com"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.actionType)}
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {getEntityIcon(log.entityType)}
                            <div>
                              <span className="font-medium text-gray-900 block truncate max-w-[180px]">
                                {log.entityName || `ID ${log.entityId}`}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-mono">
                                {log.entityType} #{log.entityId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4">
                          <p className="text-gray-700 line-clamp-2 text-xs leading-relaxed max-w-md">
                            {log.description}
                          </p>
                          {log.fieldsChanged && log.fieldsChanged.length > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                              <Edit3 className="w-2.5 h-2.5" />
                              {log.fieldsChanged.length} campo(s) modificado(s)
                            </span>
                          )}
                        </td>

                        {/* Severity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Action Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No hay eventos en este periodo o filtro.
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4 space-y-6">
              {filteredLogs.map((log) => {
                const isCrit = log.severity === "critica";
                const isHigh = log.severity === "alta";
                const dotColor = isCrit ? "bg-red-500 ring-red-100" : isHigh ? "bg-amber-500 ring-amber-100" : "bg-indigo-500 ring-indigo-100";

                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ${dotColor} ring-4 transition-transform group-hover:scale-125`}
                    />

                    {/* Timeline Card */}
                    <div
                      onClick={() => setSelectedLog(log)}
                      className="bg-slate-50/70 hover:bg-white border border-gray-200/80 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log.actionType)}
                          {getSeverityBadge(log.severity)}
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            {getEntityIcon(log.entityType)}
                            {log.entityName || `Entidad #${log.entityId}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {log.date ? new Date(log.date).toLocaleString("es-MX") : "N/A"}
                          <span className="text-indigo-600 font-sans font-medium">
                            ({getRelativeTime(log.date)})
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-800 leading-relaxed font-normal mb-2">
                        {log.description}
                      </p>

                      {/* User Footnote */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            Realizado por: <strong className="text-gray-900">{log.userName || "Admin"}</strong> (ID: {log.userId || "1"})
                          </span>
                          {log.userEmail && <span className="text-gray-400">• {log.userEmail}</span>}
                        </div>
                        <span className="text-indigo-600 font-medium group-hover:underline flex items-center gap-1">
                          Inspeccionar <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAIL INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-indigo-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Detalle de Registro de Auditoría
                    <span className="text-xs font-mono font-normal text-indigo-200 bg-white/10 px-2 py-0.5 rounded">
                      {selectedLog.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Evidencia inmutable del sistema para trazabilidad y conformidad.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Header tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {getActionBadge(selectedLog.actionType)}
                {getSeverityBadge(selectedLog.severity)}
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  {selectedLog.date ? new Date(selectedLog.date).toLocaleString("es-MX") : "Sin fecha"}
                </span>
                {selectedLog.ipAddress && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    IP: {selectedLog.ipAddress}
                  </span>
                )}
              </div>

              {/* Action Description */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Descripción de la Acción
                </h4>
                <p className="text-sm text-slate-900 leading-relaxed font-medium">
                  {selectedLog.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User responsible card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    Usuario Responsable
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedLog.userName || "Administrador"}
                    </p>
                    <p className="text-gray-600 flex items-center gap-1">
                      <span className="text-gray-400">ID Usuario:</span>
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">
                        {selectedLog.userId || "admin-1"}
                      </span>
                    </p>
                    {selectedLog.userEmail && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">Email:</span> {selectedLog.userEmail}
                      </p>
                    )}
                    {selectedLog.userRole && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">Rol:</span> {selectedLog.userRole}
                      </p>
                    )}
                  </div>
                </div>

                {/* Entity affected card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    {getEntityIcon(selectedLog.entityType)}
                    Entidad Afectada
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedLog.entityName || `Entidad #${selectedLog.entityId}`}
                    </p>
                    <p className="text-gray-600 flex items-center gap-1">
                      <span className="text-gray-400">Tipo de Entidad:</span>
                      <span className="font-mono uppercase font-bold text-gray-700">
                        {selectedLog.entityType}
                      </span>
                    </p>
                    <p className="text-gray-600 flex items-center gap-1">
                      <span className="text-gray-400">ID Registro:</span>
                      <span className="font-mono text-gray-800">
                        {selectedLog.entityId}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Changed Fields Diff Viewer */}
              {selectedLog.fieldsChanged && selectedLog.fieldsChanged.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    Parámetros y Campos Modificados (Diff)
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
                        <tr>
                          <th className="p-2.5">Campo / Configuración</th>
                          <th className="p-2.5">Valor Anterior</th>
                          <th className="p-2.5">Nuevo Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedLog.fieldsChanged.map((f, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-2.5 font-semibold text-gray-900">{f.fieldName}</td>
                            <td className="p-2.5">
                              <span className="bg-rose-50 text-rose-800 font-mono px-2 py-0.5 rounded border border-rose-200 block truncate max-w-[200px]">
                                {f.oldValue || "—"}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="bg-emerald-50 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200 block truncate max-w-[200px]">
                                {f.newValue || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                  alert("Datos del evento copiados al portapapeles en formato JSON.");
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm transition-colors"
              >
                Copiar JSON
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MANUAL INCIDENT / ACTION MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Registrar Acción / Incidencia Manual</h3>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualLog} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Acción</label>
                  <select
                    value={manualForm.actionType}
                    onChange={(e) => setManualForm({ ...manualForm, actionType: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="settings_change">Cambio de Configuración</option>
                    <option value="delete">Eliminación / Purgado</option>
                    <option value="update">Modificación de Registro</option>
                    <option value="create">Creación Especial</option>
                    <option value="restore">Restauración</option>
                    <option value="backup">Respaldo Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Severidad</label>
                  <select
                    value={manualForm.severity}
                    onChange={(e) => setManualForm({ ...manualForm, severity: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="critica">Crítica (Rojo)</option>
                    <option value="alta">Alta (Ámbar)</option>
                    <option value="media">Media (Azul)</option>
                    <option value="baja">Baja (Gris)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Entidad Afectada</label>
                  <select
                    value={manualForm.entityType}
                    onChange={(e) => setManualForm({ ...manualForm, entityType: e.target.value })}
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="institution">Institución</option>
                    <option value="student">Alumno</option>
                    <option value="class">Clase</option>
                    <option value="payment">Pago / Finanzas</option>
                    <option value="user">Usuario</option>
                    <option value="role">Rol de Seguridad</option>
                    <option value="company">Configuración Institucional</option>
                    <option value="system">Sistema General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre / ID de Entidad</label>
                  <input
                    type="text"
                    value={manualForm.entityName}
                    onChange={(e) => setManualForm({ ...manualForm, entityName: e.target.value })}
                    placeholder="Ej. Colegio Hidalgo / #994"
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción Detallada de la Acción <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="Detalla con precisión el cambio o acción crítica ejecutada..."
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Justificación Administrativa / Ticket / Folio
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Ej. Ticket SEC-2026-44 o autorización por Dirección"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors"
                >
                  Registrar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM PURGE MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">¿Deseas purgar la bitácora de auditoría?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Esta acción vaciará los registros actuales. Por seguridad, se creará automáticamente un registro inmutable documentando el vaciado por tu usuario.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow"
              >
                Confirmar Purgado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
