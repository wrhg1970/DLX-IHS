import { useState } from "react";
import { GraduationCap, Search, Filter, ChevronRight, ArrowUp, ArrowDown, Trash2, FileText, Download, Check, Settings, X, Info } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

export function Alumnos() {
  const { students, institutions, deleteStudent, updateStudent, currentUser, catalogs } = useAppContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filterInst, setFilterInst] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Multi-select and bulk editing states for Super Administrators
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [bulkEnable, setBulkEnable] = useState({
    modality: false,
    schoolYear: false,
    gender: false,
    state: false,
    institutionId: false,
    country: false,
    city: false,
    status: false
  });
  const [bulkForm, setBulkForm] = useState({
    modality: '',
    schoolYear: '',
    gender: '',
    state: '',
    institutionId: '',
    country: '',
    city: '',
    status: ''
  });

  // UI Dialog / Alert states to bypass iframe limitations
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [pendingBulkUpdates, setPendingBulkUpdates] = useState<any>(null);
  const [studentToArchive, setStudentToArchive] = useState<any>(null);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [showBulkDeleteConfirmModal, setShowBulkDeleteConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role?.toLowerCase()?.includes('super') || 
                       currentUser?.role?.toLowerCase()?.includes('admin principal') || 
                       currentUser?.role?.toLowerCase()?.includes('director') ||
                       currentUser?.role?.toLowerCase()?.includes('coordinador') ||
                       currentUser?.role?.toLowerCase()?.includes('finanzas') ||
                       currentUser?.role?.toLowerCase()?.includes('academia');

  const getInstName = (id: number) => {
    return institutions.find(i => i.id === id)?.name || "Desconocida";
  };

  const baseStudents = currentUser?.role === 'Coordinador'
    ? students.filter(student => student.institutionId === currentUser.institutionId)
    : students;

  const filteredStudents = baseStudents.filter(student => {
    // 1. Dropdown filters
    if (filterInst && String(student.institutionId || '') !== filterInst) return false;
    if (filterStatus && String(student.status || '') !== filterStatus) return false;
    if (filterCountry && String(student.country || '') !== filterCountry) return false;

    // 2. Global search across all fields
    if (!search) return true;
    const term = search.toLowerCase().trim();
    
    const instName = getInstName(student.institutionId) || '';

    return (
      String(student.name || '').toLowerCase().includes(term) ||
      String(student.lastName || '').toLowerCase().includes(term) ||
      String(student.preferredName || '').toLowerCase().includes(term) ||
      String(student.gender || '').toLowerCase().includes(term) ||
      String(student.email || '').toLowerCase().includes(term) ||
      String(student.phone || '').toLowerCase().includes(term) ||
      String(student.birthDate || '').toLowerCase().includes(term) ||
      String(student.nationality || '').toLowerCase().includes(term) ||
      String(student.passport || '').toLowerCase().includes(term) ||
      String(student.address || '').toLowerCase().includes(term) ||
      String(student.city || '').toLowerCase().includes(term) ||
      String(student.state || '').toLowerCase().includes(term) ||
      String(student.zipCode || '').toLowerCase().includes(term) ||
      String(student.country || '').toLowerCase().includes(term) ||
      String(student.parentName || '').toLowerCase().includes(term) ||
      String(student.parentLastName || '').toLowerCase().includes(term) ||
      String(student.parentEmail || '').toLowerCase().includes(term) ||
      String(student.parentPhone || '').toLowerCase().includes(term) ||
      String(student.parentRelation || '').toLowerCase().includes(term) ||
      String(student.studentCustomId || '').toLowerCase().includes(term) ||
      String(student.modality || '').toLowerCase().includes(term) ||
      String(student.schoolYear || '').toLowerCase().includes(term) ||
      String(student.status || '').toLowerCase().includes(term) ||
      String(instName).toLowerCase().includes(term) ||
      String(student.id || '').includes(term)
    );
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const nameA = `${a.name || ''} ${a.lastName || ''}`.trim().toLowerCase();
    const nameB = `${b.name || ''} ${b.lastName || ''}`.trim().toLowerCase();
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB, 'es');
    } else {
      return nameB.localeCompare(nameA, 'es');
    }
  });

  const handleToggleSelect = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.some(item => String(item) === String(id))
        ? prev.filter(item => String(item) !== String(id))
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const sortedIds = sortedStudents.map(s => s.id);
    const allSelected = sortedIds.every(id => selectedStudentIds.some(sel => String(sel) === String(id)));
    if (allSelected) {
      const sortedIdStrings = sortedIds.map(String);
      setSelectedStudentIds(prev => prev.filter(id => !sortedIdStrings.includes(String(id))));
    } else {
      setSelectedStudentIds(prev => {
        const union = new Set([...prev.map(String), ...sortedIds.map(String)]);
        return Array.from(union).map(id => isNaN(Number(id)) ? id : Number(id));
      });
    }
  };

  const handleApplyBulkUpdate = () => {
    const updates: any = {};
    if (bulkEnable.modality) {
      updates.modality = bulkForm.modality;
    }
    if (bulkEnable.schoolYear) {
      updates.schoolYear = bulkForm.schoolYear;
    }
    if (bulkEnable.gender) {
      updates.gender = bulkForm.gender;
    }
    if (bulkEnable.state) {
      updates.state = bulkForm.state;
    }
    if (bulkEnable.institutionId) {
      updates.institutionId = Number(bulkForm.institutionId);
    }
    if (bulkEnable.country) {
      updates.country = bulkForm.country;
    }
    if (bulkEnable.city) {
      updates.city = bulkForm.city;
    }
    if (bulkEnable.status) {
      updates.status = bulkForm.status;
    }

    const enabledCount = Object.values(bulkEnable).filter(Boolean).length;
    if (enabledCount === 0) {
      setAlertMessage("Por favor, marca la casilla correspondiente al campo que deseas cambiar para habilitarlo antes de aplicar.");
      return;
    }

    setPendingBulkUpdates(updates);
    setShowBulkConfirmModal(true);
  };

  const executeBulkUpdate = () => {
    if (!pendingBulkUpdates) return;
    updateStudent(selectedStudentIds, pendingBulkUpdates);
    
    setSuccessMessage(`¡Cambios masivos aplicados con éxito a ${selectedStudentIds.length} alumnos!`);
    
    // Reset selections and form
    setSelectedStudentIds([]);
    setPendingBulkUpdates(null);
    setShowBulkConfirmModal(false);
    setBulkEnable({
      modality: false,
      schoolYear: false,
      gender: false,
      state: false,
      institutionId: false,
      country: false,
      city: false,
      status: false
    });
    setBulkForm({
      modality: '',
      schoolYear: '',
      gender: '',
      state: '',
      institutionId: '',
      country: '',
      city: '',
      status: ''
    });

    // Clear alert
    setAlertMessage(null);

    // Auto-clear success toast
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleBulkDeleteClick = () => {
    if (selectedStudentIds.length === 0) return;
    setShowBulkDeleteConfirmModal(true);
  };

  const executeBulkDelete = () => {
    selectedStudentIds.forEach(id => {
      deleteStudent(id);
    });
    setSuccessMessage(`Se han eliminado con éxito ${selectedStudentIds.length} alumnos.`);
    setSelectedStudentIds([]);
    setShowBulkDeleteConfirmModal(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleExportCSV = () => {
    // Define headers
    const headers = [
      "ID",
      "Nombre",
      "Apellidos",
      "Nombre Preferido",
      "Género",
      "Email",
      "Teléfono",
      "Fecha Nacimiento",
      "Nacionalidad",
      "Pasaporte",
      "Dirección",
      "Ciudad",
      "Estado_Provincia",
      "Código Postal",
      "País",
      "Nombre Padre/Tutor",
      "Apellido Padre/Tutor",
      "Email Padre/Tutor",
      "Teléfono Padre/Tutor",
      "Parentesco",
      "ID Estudiante Personalizado",
      "Institución Origen",
      "Año Escolar",
      "Status"
    ];

    const escapeCSVValue = (val: any) => {
      if (val === undefined || val === null) return "";
      let str = String(val).replace(/"/g, '""');
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = sortedStudents.map(student => {
      return [
        student.id,
        student.name,
        student.lastName || "",
        student.preferredName || "",
        student.gender || "",
        student.email || "",
        student.phone || "",
        student.birthDate || "",
        student.nationality || "",
        student.passport || "",
        student.address || "",
        student.city || "",
        student.state || "",
        student.zipCode || "",
        student.country || "",
        student.parentName || "",
        student.parentLastName || "",
        student.parentEmail || "",
        student.parentPhone || "",
        student.relationship || "",
        student.studentCustomId || "",
        getInstName(student.institutionId),
        student.schoolYear || "",
        student.status
      ].map(escapeCSVValue).join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_alumnos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alumno, ID o correo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
          </div>
          {currentUser?.role !== 'Coordinador' && (
            <select 
              value={filterInst}
              onChange={(e) => setFilterInst(e.target.value)}
              className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm"
            >
              <option value="">Todas las Inst.</option>
              {[...institutions]
                .filter(inst => inst.active !== false)
                .sort((a, b) => a.name.localeCompare(b.name, "es"))
                .map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
            </select>
          )}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm"
          >
            <option value="">Cualquier Status</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <select 
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none shadow-sm"
          >
            <option value="">Todos los Paises</option>
            <option value="México">México</option>
            <option value="España">España</option>
            <option value="Japón">Japón</option>
            <option value="Colombia">Colombia</option>
            <option value="EAU">EAU</option>
            <option value="China">China</option>
            <option value="Brasil">Brasil</option>
          </select>
        </div>
        <div className="flex space-x-2 ml-4 shrink-0">
          <button 
            onClick={handleExportCSV}
            className="bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm hover:bg-slate-50 transition flex items-center space-x-1.5"
            title="Exportar Alumnos Filtrados a CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button 
            onClick={() => navigate('/alumnos/nuevo')}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
          >
            + Registrar Alumno
          </button>
        </div>
      </div>

      {/* Bulk editing card for Super Administrators */}
      {isSuperAdmin && selectedStudentIds.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl shadow-sm space-y-3 animate-in slide-in-from-top-4 duration-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide block">Panel de Cambios Masivos</span>
                <span className="text-[11px] text-indigo-700 font-medium">{selectedStudentIds.length} alumnos seleccionados para actualización masiva</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedStudentIds([])}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              title="Limpiar Selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Modalidad */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.modality} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, modality: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Modalidad</span>
              </label>
              <select 
                value={bulkForm.modality}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, modality: val }));
                  setBulkEnable(prev => ({ ...prev, modality: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              >
                <option value="">Seleccionar...</option>
                {(catalogs?.['Modalidades'] || []).map((m: any) => (
                  <option key={m.id || m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Año Escolar */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.schoolYear} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, schoolYear: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Año Escolar</span>
              </label>
              <input 
                type="text"
                placeholder="Ej. 10º Grado"
                value={bulkForm.schoolYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, schoolYear: val }));
                  setBulkEnable(prev => ({ ...prev, schoolYear: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              />
            </div>

            {/* Sexo / Género */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.gender} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, gender: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Sexo</span>
              </label>
              <select 
                value={bulkForm.gender}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, gender: val }));
                  setBulkEnable(prev => ({ ...prev, gender: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              >
                <option value="">Seleccionar...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Estado */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.state} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, state: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Estado</span>
              </label>
              <input 
                type="text"
                placeholder="Ej. CDMX"
                value={bulkForm.state}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, state: val }));
                  setBulkEnable(prev => ({ ...prev, state: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              />
            </div>

            {/* País */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.country} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, country: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">País</span>
              </label>
              <select 
                value={bulkForm.country}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, country: val }));
                  setBulkEnable(prev => ({ ...prev, country: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              >
                <option value="">Seleccionar...</option>
                <option value="México">México</option>
                <option value="España">España</option>
                <option value="Japón">Japón</option>
                <option value="Colombia">Colombia</option>
                <option value="EAU">EAU</option>
                <option value="China">China</option>
                <option value="Brasil">Brasil</option>
              </select>
            </div>

            {/* Ciudad */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.city} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, city: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Ciudad</span>
              </label>
              <input 
                type="text"
                placeholder="Ej. Monterrey"
                value={bulkForm.city}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, city: val }));
                  setBulkEnable(prev => ({ ...prev, city: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              />
            </div>

            {/* Status */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.status} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, status: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Status</span>
              </label>
              <select 
                value={bulkForm.status}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, status: val }));
                  setBulkEnable(prev => ({ ...prev, status: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              >
                <option value="">Seleccionar...</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Archivado">Archivado</option>
              </select>
            </div>

            {/* Institución */}
            <div className="bg-white/85 p-2.5 rounded-lg border border-indigo-50/50 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition">
              <label className="flex items-center space-x-2 mb-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={bulkEnable.institutionId} 
                  onChange={(e) => setBulkEnable(prev => ({ ...prev, institutionId: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Institución</span>
              </label>
              <select 
                value={bulkForm.institutionId}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkForm(prev => ({ ...prev, institutionId: val }));
                  setBulkEnable(prev => ({ ...prev, institutionId: val !== '' }));
                }}
                className="w-full border border-slate-200 rounded p-1 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium hover:border-indigo-200 transition"
              >
                <option value="">Seleccionar...</option>
                {[...institutions]
                  .filter(inst => inst.active !== false)
                  .sort((a, b) => a.name.localeCompare(b.name, "es"))
                  .map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button 
              onClick={handleBulkDeleteClick}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider shadow transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar seleccionados</span>
            </button>
            <button 
              onClick={handleApplyBulkUpdate}
              className="bg-indigo-600 text-white px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider shadow hover:bg-indigo-700 transition flex items-center space-x-1.5 animate-pulse"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar cambios masivos</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        <div className="overflow-auto flex-1 h-[400px]">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {isSuperAdmin && (
                  <th className="px-6 py-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.some(sel => String(sel) === String(s.id)))}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      title="Seleccionar todos los alumnos filtrados"
                    />
                  </th>
                )}
                <th 
                  className="px-6 py-3 cursor-pointer select-none text-indigo-600 hover:text-indigo-800 transition-colors" 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Nombre y Apellido</span>
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3">ID Estudiante</th>
                <th className="px-6 py-3">Año Escolar</th>
                <th className="px-6 py-3">Institución Origen</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs bg-white">
              {sortedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => navigate(`/alumnos/${student.id}`)}>
                  {isSuperAdmin && (
                    <td className="px-6 py-3 text-center w-12" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedStudentIds.some(id => String(id) === String(student.id))}
                        onChange={() => handleToggleSelect(student.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-3 font-semibold text-slate-900 border-l-[3px] border-transparent group-hover:border-indigo-500">
                    <div>
                      {student.name} {student.lastName || ''}
                      <span className="block font-normal text-[10px] text-slate-500 mt-0.5">{student.email}</span>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px] text-slate-500">
                        {student.modality && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Modality: {student.modality}</span>}
                        {student.gender && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Sexo: {student.gender}</span>}
                        {student.country && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">País: {student.country}</span>}
                        {student.state && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Edo: {student.state}</span>}
                        {student.city && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Cd: {student.city}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-[10px]">
                    {student.studentCustomId || `STU-108${student.id.toString().padStart(2, '0')}`}
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-medium font-semibold">
                    {student.schoolYear || <span className="text-slate-300 italic">No asignado</span>}
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-medium">{getInstName(student.institutionId)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                      student.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {student.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end items-center space-x-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentToArchive(student);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition flex items-center"
                        title="Archivar alumno"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> Archivar
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentToDelete(student);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-700 transition flex items-center"
                        title="Eliminar alumno"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                      </button>
                      <div className="w-px h-3 bg-slate-200 mx-1"></div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/alumnos/${student.id}`); }}
                        className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition flex items-center"
                      >
                        Ver Perfil <ChevronRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Mostrando {filteredStudents.length} de {students.length} alumnos registrados</span>
          <div className="flex items-center space-x-1">
            <button className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white hover:bg-slate-50 font-medium disabled:opacity-50" disabled>Anterior</button>
            <button className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white hover:bg-slate-50 font-medium disabled:opacity-50" disabled>Siguiente</button>
          </div>
        </div>
      </div>

      {/* Toast Notification for Success */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 z-[60] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white/20 p-1.5 rounded-lg text-white">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold tracking-wide">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="ml-3 hover:opacity-80 text-white/80 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Notification for Alert */}
      {alertMessage && (
        <div className="fixed bottom-5 right-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 z-[60] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white/20 p-1.5 rounded-lg text-white">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold tracking-wide">{alertMessage}</p>
          <button onClick={() => setAlertMessage(null)} className="ml-3 hover:opacity-80 text-white/80 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Update Modal Overlay */}
      {showBulkConfirmModal && pendingBulkUpdates && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-slate-850">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl shrink-0">
                <Settings className="w-6 h-6 animate-spin-slow" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">¿Confirmar actualización masiva?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Estás a punto de modificar un total de <strong className="text-indigo-600">{selectedStudentIds.length}</strong> {selectedStudentIds.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'} con las siguientes propiedades:
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-100 font-medium text-slate-700">
              {Object.entries(pendingBulkUpdates).map(([key, value]) => {
                let displayKey = key;
                let displayVal = String(value);
                if (key === 'modality') displayKey = 'Modalidad';
                if (key === 'schoolYear') displayKey = 'Año Escolar';
                if (key === 'gender') displayKey = 'Sexo';
                if (key === 'state') displayKey = 'Estado';
                if (key === 'country') displayKey = 'País';
                if (key === 'city') displayKey = 'Ciudad';
                if (key === 'status') displayKey = 'Status';
                if (key === 'institutionId') {
                  displayKey = 'Institución';
                  const inst = institutions.find(i => i.id === Number(value));
                  displayVal = inst ? inst.name : `ID: ${value}`;
                }
                return (
                  <div key={key} className="flex justify-between py-1 border-b border-slate-200/50 last:border-b-0">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">{displayKey}</span>
                    <span className="text-slate-800 font-semibold">{displayVal || <em className="text-slate-400 font-normal">Vacio / Por asignar</em>}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Esta acción sobrescribirá los valores existentes para todos los alumnos seleccionados y se guardará automáticamente en el sistema.
            </p>

            <div className="flex items-center space-x-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkConfirmModal(false);
                  setPendingBulkUpdates(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeBulkUpdate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center space-x-1"
              >
                <span>Confirmar y Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal Overlay */}
      {studentToArchive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">¿Archivar alumno?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás seguro de que deseas archivar al alumno <strong className="text-slate-950">{studentToArchive.name} {studentToArchive.lastName || ''}</strong>? Su estatus pasará a ser <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase">Archivado</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setStudentToArchive(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateStudent(studentToArchive.id, { status: "Archivado" });
                  setSuccessMessage(`Se ha archivado con éxito a "${studentToArchive.name}".`);
                  setStudentToArchive(null);
                  setTimeout(() => setSuccessMessage(null), 4000);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Archivar Alumno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal Overlay */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="bg-rose-100 text-rose-700 p-2.5 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">¿Eliminar alumno de forma permanente?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás completamente seguro de que deseas eliminar a <strong className="text-slate-950">{studentToDelete.name} {studentToDelete.lastName || ''}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStudent(studentToDelete.id);
                  setSuccessMessage(`Se ha eliminado con éxito a "${studentToDelete.name}".`);
                  setStudentToDelete(null);
                  setTimeout(() => setSuccessMessage(null), 4000);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" id="custom-delete-confirm-bulk-students">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-start space-x-3">
              <div className="bg-rose-100 text-rose-700 p-2.5 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">¿Eliminar alumnos seleccionados?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás completamente seguro de que deseas eliminar permanentemente a los <strong className="text-rose-600">{selectedStudentIds.length}</strong> alumnos seleccionados? Esta acción purgará sus registros oficiales, inscripciones y antecedentes de forma definitiva de la base de datos digital.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirmModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Sí, Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
