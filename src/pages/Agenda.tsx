import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Video, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  MessageSquare,
  AlertCircle,
  Trash2
} from "lucide-react";
import { useAppContext, TaskType, Task } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

export function Agenda() {
  const { tasks, updateTask, addTask, deleteTask, institutions, users, currentUser } = useAppContext();
  const [view, setView] = useState<"dia" | "semanal" | "calendario">("semanal");
  const [selectedDayCode, setSelectedDayCode] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [currentNotes, setCurrentNotes] = useState<string>("");

  // States for scheduling a future activity from within task details
  const [showFutureForm, setShowFutureForm] = useState(false);
  const [futureTitle, setFutureTitle] = useState("");
  const [futureType, setFutureType] = useState<TaskType>("Llamada");
  const [futureDate, setFutureDate] = useState("");

  // Global filters
  const [filterUser, setFilterUser] = useState<string>("Todos");
  const [filterRequestor, setFilterRequestor] = useState<string>("Todos");
  const [filterType, setFilterType] = useState<string>("Todos");
  const [filterPriority, setFilterPriority] = useState<string>("Todos");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    dueDate: '',
    institutionId: '',
    userId: '',
    type: 'Llamada' as TaskType,
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
    requestedBy: ''
  });

  const taskTypeOptions: { type: TaskType; label: string; icon: any; color: string }[] = [
    { type: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-blue-600' },
    { type: 'Correo', label: 'Correo', icon: Mail, color: 'text-amber-600' },
    { type: 'Visita', label: 'Visita', icon: MapPin, color: 'text-rose-600' },
    { type: 'Meet', label: 'Meet', icon: Video, color: 'text-indigo-600' },
    { type: 'Otro', label: 'Otro', icon: FileText, color: 'text-slate-600' },
  ];

  // Dynamically obtain unique requestor options from all existing tasks
  const uniqueRequestors = Array.from(
    new Set(
      tasks
        .map(t => t.requestedBy)
        .filter((r): r is string => !!r && r.trim().length > 0)
    )
  ).sort();

  // Unified global filtering engine
  const filteredTasks = tasks.filter(t => {
    // 1. Filter by Assigned User (userId)
    if (filterUser !== "Todos") {
      if (filterUser === "Ninguno") {
        if (t.userId !== undefined && t.userId !== null) return false;
      } else if (String(t.userId) !== filterUser) {
        return false;
      }
    }

    // 2. Filter by Requestor/Who requested (requestedBy)
    if (filterRequestor !== "Todos") {
      const req = t.requestedBy || "Sin registrar";
      if (req !== filterRequestor) return false;
    }

    // 3. Filter by Action Type
    if (filterType !== "Todos" && (t.type || "Otro") !== filterType) {
      return false;
    }

    // 4. Filter by Priority
    if (filterPriority !== "Todos") {
      const prio = t.priority || "Media";
      if (prio !== filterPriority) return false;
    }

    return true;
  });

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({
      title: taskForm.title,
      dueDate: taskForm.dueDate,
      status: 'Pendiente',
      institutionId: taskForm.institutionId ? Number(taskForm.institutionId) : undefined,
      userId: taskForm.userId ? Number(taskForm.userId) : undefined,
      type: taskForm.type,
      priority: taskForm.priority,
      requestedBy: taskForm.requestedBy.trim() || "Admin Principal"
    });
    setIsTaskModalOpen(false);
    setTaskForm({ title: '', dueDate: '', institutionId: '', userId: '', type: 'Llamada', priority: 'Media', requestedBy: '' });
  };

  const toggleTaskStatus = (id: number, currentStatus: "Pendiente" | "Completada") => {
    updateTask(id, { status: currentStatus === "Pendiente" ? "Completada" : "Pendiente" });
  };

  const handleOpenTaskDetail = (task: Task) => {
    setActiveTask(task);
    setCurrentNotes(task.notes || "");
    setShowFutureForm(false);
    setFutureTitle("");
    setFutureDate("");
    setFutureType("Llamada");
  };

  const getMatchedLead = (task: Task | null) => {
    if (!task) return null;
    const savedLeadsStr = localStorage.getItem("crm_leads_v1");
    if (!savedLeadsStr) return null;
    try {
      const crmLeads = JSON.parse(savedLeadsStr);
      return crmLeads.find((l: any) => 
        (task.leadId && l.id === task.leadId) ||
        l.id === task.leadId ||
        task.title.includes(l.name)
      ) || null;
    } catch (e) {
      return null;
    }
  };

  const handleScheduleFutureActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !futureTitle.trim() || !futureDate) return;

    // 1. Find matched Lead from localStorage so we update physical lead notes too
    const savedLeadsStr = localStorage.getItem("crm_leads_v1");
    let matchedLead: any = null;
    let leadId = activeTask.leadId;

    if (savedLeadsStr) {
      try {
        const crmLeads = JSON.parse(savedLeadsStr);
        const leadIndex = crmLeads.findIndex((l: any) => 
          (activeTask.leadId && l.id === activeTask.leadId) ||
          l.id === activeTask.leadId ||
          activeTask.title.includes(l.name)
        );

        if (leadIndex !== -1) {
          matchedLead = crmLeads[leadIndex];
          leadId = matchedLead.id;

          const timestamp = new Date().toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
          
          const noteHeader = `[Tarea Futura programada para ${futureDate}: "${futureTitle}" (${futureType})]`;
          matchedLead.notes = `${noteHeader}\n${matchedLead.notes}`;
          crmLeads[leadIndex] = matchedLead;
          localStorage.setItem("crm_leads_v1", JSON.stringify(crmLeads));
        }
      } catch (err) {
        console.error("Error scheduling future activity in CRM:", err);
      }
    }

    // 2. Add task to Agenda
    const finalTitle = matchedLead 
      ? `CRM: ${futureTitle} - ${matchedLead.name} (${matchedLead.contactName})`
      : futureTitle;

    addTask({
      title: finalTitle,
      dueDate: futureDate,
      status: "Pendiente",
      type: futureType,
      userId: activeTask.userId || users[0]?.id,
      leadId: leadId || undefined,
      notes: ""
    });

    setFutureTitle("");
    setFutureDate("");
    setFutureType("Llamada");
    setShowFutureForm(false);
    alert(`¡Nueva actividad futura programada y guardada exitosamente!`);
  };

  const handleSaveNotes = () => {
    if (!activeTask) return;
    updateTask(activeTask.id, { notes: currentNotes });

    // Try to update matched CRM Lead if available
    const savedLeadsStr = localStorage.getItem("crm_leads_v1");
    if (savedLeadsStr) {
      try {
        const crmLeads = JSON.parse(savedLeadsStr);
        const leadIndex = crmLeads.findIndex((l: any) => 
          (activeTask.leadId && l.id === activeTask.leadId) ||
          l.id === activeTask.leadId ||
          activeTask.title.includes(l.name)
        );

        if (leadIndex !== -1) {
          const matchedLead = crmLeads[leadIndex];
          const timestamp = new Date().toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
          const noteHeader = `[Nota de Agenda ${timestamp}]: ${currentNotes}`;
          
          matchedLead.notes = `${noteHeader}\n${matchedLead.notes}`;
          crmLeads[leadIndex] = matchedLead;
          localStorage.setItem("crm_leads_v1", JSON.stringify(crmLeads));
        }
      } catch (err) {
        console.error("Error updating CRM notes:", err);
      }
    }
    setActiveTask(null);
  };

  // Day View specific helpers
  const dayTasks = filteredTasks.filter(t => t.dueDate === selectedDayCode);
  const parsedSelectedDayDate = new Date(`${selectedDayCode}T00:00:00`);

  const handlePrevDay = () => {
    const prev = new Date(parsedSelectedDayDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDayCode(prev.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const next = new Date(parsedSelectedDayDate);
    next.setDate(next.getDate() + 1);
    setSelectedDayCode(next.toISOString().split("T")[0]);
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).replace(/^\w/, c => c.toUpperCase());
  };

  // Basic weekly view implementation (next 7 days)
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const next7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(t => {
      if (!t.dueDate) return false;
      const tDate = new Date(`${t.dueDate}T00:00:00`);
      return tDate.getDate() === date.getDate() && 
             tDate.getMonth() === date.getMonth() && 
             tDate.getFullYear() === date.getFullYear();
    });
  };

  // Calendar logic
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const buildCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 (Sun) to 6 (Sat)
    
    // adjust so week starts on Monday, if desired. We'll stick to Sunday start for simplicity or Monday start? Let's stick with Sunday = 0
    const days = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);
    
    // Add prev month padded days
    for (let i = 0; i < firstDay; i++) {
        days.push({ 
            date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1), 
            isCurrentMonth: false 
        });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ 
            date: new Date(year, month, i), 
            isCurrentMonth: true 
        });
    }

    // Add next month padded days
    const remainingSlots = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
        days.push({ 
            date: new Date(year, month + 1, i), 
            isCurrentMonth: false 
        });
    }

    return days;
  };

  const calendarDays = buildCalendarDays();
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/50 justify-between items-center h-16">
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button 
            onClick={() => setView("dia")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${view === "dia" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Vista por Día
          </button>
          <button 
            onClick={() => setView("semanal")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${view === "semanal" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Vista Semanal
          </button>
          <button 
            onClick={() => setView("calendario")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${view === "calendario" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Mes Completo
          </button>
        </div>
        <div>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm hover:bg-indigo-700 transition"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Persistent Filters Section */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-3 shrink-0 shadow-xs relative z-20">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filtros Avanzados de Agenda
          </h3>
          {(filterUser !== "Todos" || filterRequestor !== "Todos" || filterType !== "Todos" || filterPriority !== "Todos") && (
            <button
              onClick={() => {
                setFilterUser("Todos");
                setFilterRequestor("Todos");
                setFilterType("Todos");
                setFilterPriority("Todos");
              }}
              className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1 transition"
            >
              🧹 Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* FILTER 1: SOLICITANTE */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quién Solicitó</label>
            <select
              value={filterRequestor}
              onChange={(e) => setFilterRequestor(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 font-semibold outline-none transition"
            >
              <option value="Todos">📣 Todos los Solicitantes</option>
              {Array.from(new Set([
                "Admin Principal", 
                "Coordinador Académico", 
                "Director Financiero",
                "Particular / Alumno",
                ...uniqueRequestors
              ])).map(req => (
                <option key={req} value={req}>{req}</option>
              ))}
              <option value="Sin registrar">✏️ Sin registrar / CRM</option>
            </select>
          </div>

          {/* FILTER 2: RESPONSABLE ASIGNADO */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsable Asignado</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 font-semibold outline-none transition"
            >
              <option value="Todos">👤 Todos los Responsables</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>👤 {u.name}</option>
              ))}
              <option value="Ninguno">❌ Sin Asignar</option>
            </select>
          </div>

          {/* FILTER 3: TIPO DE ACCION */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Acción / Canal</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 font-semibold outline-none transition"
            >
              <option value="Todos">📞 Todos los Canales</option>
              <option value="Llamada">📞 Llamada Telefónica</option>
              <option value="Correo">✉️ Correo Electrónico</option>
              <option value="Visita">📍 Visita Presencial</option>
              <option value="Meet">💻 Meet (Videollamada)</option>
              <option value="Otro">✏️ Otro / Nota Interna</option>
            </select>
          </div>

          {/* FILTER 4: PRIORIDAD */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridad</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50/50 hover:bg-white text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-indigo-500 font-bold outline-none transition"
            >
              <option value="Todos font-medium">⚡ Todas las Prioridades</option>
              <option value="Alta" className="text-red-650 font-bold">🔴 Alta</option>
              <option value="Media" className="text-amber-650 font-bold">🟡 Media</option>
              <option value="Baja" className="text-emerald-650 font-bold">🟢 Baja</option>
            </select>
          </div>
        </div>

        {/* COUNTER HUD */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span>
            Mostrando <strong className="font-extrabold text-slate-700">{filteredTasks.length}</strong> de <strong className="font-semibold text-slate-500">{tasks.length}</strong> tareas totales en la Agenda
          </span>
          {(filterUser !== "Todos" || filterRequestor !== "Todos" || filterType !== "Todos" || filterPriority !== "Todos") && (
            <span className="text-indigo-650 font-extrabold bg-indigo-50 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
              Filtro Activo
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-slate-50/50 p-6 flex flex-col">
        
        {view === "dia" && (
          <div className="max-w-4xl mx-auto flex flex-col h-full space-y-4 min-h-0 w-full overflow-hidden">
            {/* Header / Date Navigator */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm shrink-0 gap-3">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePrevDay} 
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
                  title="Día Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center sm:text-left">
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center justify-center sm:justify-start">
                    <CalendarIcon className="w-5 h-5 mr-2 text-indigo-600 shrink-0" />
                    <span>{formatDateLabel(parsedSelectedDayDate)}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {dayTasks.length} {dayTasks.length === 1 ? "actividad programada" : "actividades programadas"}
                  </p>
                </div>
                <button 
                  onClick={handleNextDay} 
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
                  title="Día Siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500">Ir a fecha:</span>
                <input 
                  type="date" 
                  value={selectedDayCode} 
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDayCode(e.target.value);
                    }
                  }} 
                  className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Content for the Day */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Plan del Día</h3>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    {dayTasks.filter(t => t.status === "Completada").length} Completadas
                  </span>
                  <span className="flex items-center text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                    {dayTasks.filter(t => t.status === "Pendiente").length} Pendientes
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                <div className="relative z-10 space-y-4">
                  {dayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <CalendarIcon className="w-8 h-8" />
                      </div>
                      <h4 className="text-slate-700 font-bold text-base">No hay actividades programadas</h4>
                      <p className="text-slate-500 text-xs mt-1 max-w-sm">
                        Relájate o aprovecha para organizar tus prospectos del CRM o programar nuevas llamadas con colegios potenciales.
                      </p>
                      <button 
                        onClick={() => setIsTaskModalOpen(true)}
                        className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-sm transition"
                      >
                        Crear una Actividad
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {dayTasks.map((t) => (
                        <div 
                          key={t.id} 
                          onClick={() => handleOpenTaskDetail(t)}
                          className={`p-4 rounded-xl border transition cursor-pointer ${
                            t.status === "Completada" 
                              ? "bg-slate-50/70 border-slate-200/50 opacity-70" 
                              : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
                          } group flex items-start gap-4 relative overflow-hidden`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                toggleTaskStatus(t.id, t.status); 
                              }} 
                              className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-full focus:outline-none"
                            >
                              {t.status === "Completada" ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                            </button>
                            {(currentUser?.role === 'Superadministrador' || currentUser?.role === 'Academia' || currentUser?.role === 'Admin Principal') && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  deleteTask(t.id);
                                  if (activeTask?.id === t.id) setActiveTask(null);
                                }} 
                                className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:outline-none"
                                title="Eliminar actividad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const typeInfo = taskTypeOptions.find(opt => opt.type === (t.type || 'Otro')) || taskTypeOptions[4];
                                  const Icon = typeInfo.icon;
                                  return (
                                    <div className={`${typeInfo.color} shrink-0 bg-slate-100 p-1.5 rounded-lg`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                  );
                                })()}
                                <h4 className={`text-base font-bold ${t.status === "Completada" ? "line-through text-slate-500" : "text-slate-800"}`}>
                                  {t.title}
                                </h4>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {t.leadId && (
                                  <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-805 border border-amber-200/40 rounded px-2 py-0.5 font-bold uppercase tracking-wider">
                                    <MessageSquare className="w-3 h-3 mr-1 text-amber-500" />
                                    Sincronizado CRM
                                  </span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                                  (t.priority || "Media") === "Alta" ? "bg-rose-50 text-rose-700 border border-rose-200/60" :
                                  (t.priority || "Media") === "Media" ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                                  "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                }`}>
                                  ⚡ {(t.priority || "Media")}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  t.status === "Completada" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                            </div>

                            {/* Activity Notes section */}
                            <div className="mt-3 text-sm text-slate-605">
                              {t.notes ? (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 font-medium italic text-slate-600 relative">
                                  <p className="line-clamp-3">"{t.notes}"</p>
                                  <span className="absolute top-2 right-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold not-italic">notas</span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No hay notas. Haz clic para entrar a la actividad y poner notas o comentarios.</p>
                              )}
                            </div>

                            {/* Associated links */}
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <div className="inline-flex items-center text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60 font-semibold">
                                <span className="text-slate-400 mr-1.5 font-extrabold uppercase text-[9px]">Solicitó:</span>
                                <span className="truncate">{t.requestedBy || "Admin Principal"}</span>
                              </div>
                              {t.institutionId && (
                                <div className="inline-flex items-center text-xs bg-slate-100 text-slate-705 px-2.5 py-1 rounded-md border border-slate-200 font-semibold">
                                  <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M19 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><path d="M19 7h6"/><path d="M19 11h6"/></svg>
                                  <span className="truncate">{institutions.find(i => i.id === t.institutionId)?.name || "Institución"}</span>
                                </div>
                              )}
                              {t.userId && (
                                <div className="inline-flex items-center text-xs bg-indigo-50 text-indigo-705 px-2.5 py-1 rounded-md border border-indigo-100 font-semibold">
                                  <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  <span className="truncate">{users.find(u => u.id === t.userId)?.name || "Usuario"}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "semanal" && (
          <div className="max-w-7xl mx-auto flex flex-col h-full space-y-4 min-h-0 w-full overflow-hidden">
             <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm shrink-0">
               <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center">
                 <CalendarIcon className="w-5 h-5 mr-2 text-indigo-600" />
                 Próximos 7 Días
               </h2>
               <div className="hidden md:flex text-sm text-slate-500 font-medium">
                 {today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
               </div>
             </div>
             
             <div className="flex-1 w-full flex space-x-4 overflow-x-auto pb-4 snap-x hide-scrollbar items-stretch">
              {next7Days.map((date, idx) => {
                const dayTasks = getTasksForDate(date);
                const isToday = idx === 0;
                
                return (
                  <div key={idx} className={`snap-start min-w-[280px] md:min-w-[0] md:flex-1 shrink-0 bg-slate-100/50 rounded-2xl flex flex-col overflow-hidden border ${isToday ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-md bg-indigo-50/10' : 'border-slate-200 shadow-sm hover:border-slate-300'} transition-all`}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${isToday ? 'bg-indigo-50/90 border-indigo-200' : 'bg-white border-slate-100'} shrink-0`}>
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                        </span>
                        <div className="flex items-baseline space-x-1 mt-0.5">
                          <span className={`text-2xl font-bold tracking-tight ${isToday ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {date.getDate()}
                          </span>
                          <span className={`text-sm font-semibold ${isToday ? 'text-indigo-700/80' : 'text-slate-500'}`}>
                            {date.toLocaleDateString('es-ES', { month: 'short' }).replace(/^\w/, c => c.toUpperCase())}
                          </span>
                        </div>
                      </div>
                      {isToday && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                          Hoy
                        </span>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto relative">
                      {/* Subtly patterned background */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                      
                      <div className="relative z-10 space-y-3 flex flex-col h-full">
                        {dayTasks.length === 0 ? (
                          <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-white/40 mt-2">
                            <Check className="w-5 h-5 text-slate-300 mb-1" />
                            <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Sin tareas</p>
                          </div>
                        ) : (
                          dayTasks.map(t => (
                            <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className={`p-3.5 rounded-xl border ${t.status === 'Completada' ? 'bg-slate-50/80 border-slate-200/60 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:shadow hover:border-indigo-300'} group flex items-start gap-3 transition-all relative overflow-hidden cursor-pointer`}>
                              {t.status === 'Pendiente' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>}
                              <div className="flex flex-col items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(t.id, t.status); }} className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-full">
                                  {t.status === 'Completada' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                                </button>
                                {(currentUser?.role === 'Superadministrador' || currentUser?.role === 'Academia' || currentUser?.role === 'Admin Principal') && (
                                  <button onClick={(e) => { 
                                      e.stopPropagation(); 
                                      deleteTask(t.id);
                                      if (activeTask?.id === t.id) setActiveTask(null);
                                    }} 
                                    className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Eliminar actividad"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {(() => {
                                    const typeInfo = taskTypeOptions.find(opt => opt.type === (t.type || 'Otro')) || taskTypeOptions[4];
                                    const Icon = typeInfo.icon;
                                    return (
                                      <div className={`${typeInfo.color} shrink-0`}>
                                        <Icon className="w-3.5 h-3.5" />
                                      </div>
                                    );
                                  })()}
                                  <p className={`text-sm font-bold leading-snug ${t.status === 'Completada' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{t.title}</p>
                                </div>
                                
                                {t.notes && (
                                  <p className="text-[10px] text-slate-500 italic line-clamp-1 bg-slate-50/80 px-1.5 py-1 rounded border border-slate-100 mt-1">
                                    "{t.notes}"
                                  </p>
                                )}

                                  <div className="flex flex-wrap gap-1 mt-2.5">
                                    <div className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded border font-extrabold uppercase ${
                                      (t.priority || "Media") === "Alta" ? "bg-rose-50 text-rose-700 border-rose-200/50" :
                                      (t.priority || "Media") === "Media" ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                                      "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                                    }`}>
                                      ⚡ {(t.priority || "Media")}
                                    </div>
                                    <div className="inline-flex items-center text-[9px] bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/65 font-medium max-w-full">
                                      <span className="text-[8px] font-extrabold uppercase text-slate-400 mr-1">Sol:</span>
                                      <span className="truncate">{t.requestedBy || "Admin Principal"}</span>
                                    </div>
                                    {t.leadId && (
                                      <div className="inline-flex items-center text-[9px] bg-amber-50 text-amber-850 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">
                                        <MessageSquare className="w-2.5 h-2.5 mr-1 text-amber-500" />
                                        <span>CRM</span>
                                      </div>
                                    )}
                                    {t.institutionId && (
                                      <div className="inline-flex items-center text-[9px] bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded border border-slate-200/65 font-medium max-w-full">
                                        <svg className="w-2.5 h-2.5 mr-1 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M19 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><path d="M19 7h6"/><path d="M19 11h6"/></svg>
                                        <span className="truncate">{institutions.find(i => i.id === t.institutionId)?.name || "Institución"}</span>
                                      </div>
                                    )}
                                    {t.userId && (
                                      <div className="inline-flex items-center text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100/60 font-medium max-w-full">
                                        <svg className="w-2.5 h-2.5 mr-1 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        <span className="truncate">{users.find(u => u.id === t.userId)?.name || "Usuario"}</span>
                                      </div>
                                    )}
                                  </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === "calendario" && (
           <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col space-y-4 min-h-0">
             <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm shrink-0">
               <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
                 {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
               </h2>
               <div className="flex bg-slate-100 rounded-lg p-1">
                 <button onClick={prevMonth} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest transition">&lt; Mes Anterior</button>
                 <button onClick={nextMonth} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest transition border-l border-slate-200">Siguiente &gt;</button>
               </div>
             </div>

             <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
               <div className="grid grid-cols-7 border-b border-slate-100 shrink-0 bg-slate-50">
                 {weekDays.map(day => (
                   <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100 last:border-r-0">
                     {day}
                   </div>
                 ))}
               </div>
               <div className="flex-1 grid grid-cols-7 grid-rows-6">
                 {calendarDays.map((dayObj, idx) => {
                   const { date, isCurrentMonth } = dayObj;
                   const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                   const dayTasks = getTasksForDate(date);

                   return (
                     <div key={idx} className={`border-b border-r border-slate-100 p-2 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/50'} ${isToday ? 'bg-indigo-50/30' : ''}`}>
                       <div className="flex justify-between items-start mb-1">
                         <span className={`text-xs font-bold p-1 min-w-[24px] text-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : (isCurrentMonth ? 'text-slate-700' : 'text-slate-400')}`}>
                           {date.getDate()}
                         </span>
                       </div>
                       <div className="flex-1 overflow-y-auto space-y-1 pr-1 hide-scrollbar">
                         {dayTasks.map(t => (
                           <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className={`text-[10px] truncate px-1.5 py-1 rounded cursor-pointer transition ${t.status === 'Completada' ? 'bg-slate-100 text-slate-400 line-through opacity-60' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 font-medium'}`} title="Ver notas y detalles">
                             {t.title}
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           </div>
        )}

      </div>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Nueva Tarea">
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título de la tarea</label>
            <input required type="text" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Llamar para seguimiento..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Tipo de Tarea</label>
            <div className="grid grid-cols-5 gap-2">
              {taskTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = taskForm.type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setTaskForm({...taskForm, type: opt.type})}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de vencimiento</label>
            <input required type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asociar a Institución (Opcional)</label>
            <select value={taskForm.institutionId} onChange={e => setTaskForm({...taskForm, institutionId: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Ninguna</option>
              {institutions.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asignar a Usuario (Opcional)</label>
            <select value={taskForm.userId} onChange={e => setTaskForm({...taskForm, userId: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Ninguno</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Quién Solicitó (Solicitante)</label>
            <input 
              type="text" 
              value={taskForm.requestedBy} 
              onChange={e => setTaskForm({...taskForm, requestedBy: e.target.value})} 
              className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ej. Coordinador Académico, Alumno Particular, etc." 
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {["Coordinador Académico", "Director Financiero", "Particular / Alumno", "Admin Principal"].map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setTaskForm({...taskForm, requestedBy: sug})}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-650 px-2.5 py-1 rounded-lg font-bold transition-all"
                >
                  ➕ {sug}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Prioridad de la tarea</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'Alta', color: 'bg-rose-50 text-rose-700 border-rose-300', activeColor: 'ring-2 ring-rose-400 bg-rose-100 border-rose-500 font-extrabold', label: '🔴 Alta' },
                { level: 'Media', color: 'bg-amber-50 text-amber-700 border-amber-300', activeColor: 'ring-2 ring-amber-450 bg-amber-100 border-amber-500 font-extrabold', label: '🟡 Media' },
                { level: 'Baja', color: 'bg-emerald-50 text-emerald-700 border-emerald-305', activeColor: 'ring-2 ring-emerald-400 bg-emerald-100 border-emerald-500 font-extrabold', label: '🟢 Baja' }
              ].map((prio) => {
                const isSelected = taskForm.priority === prio.level;
                return (
                  <button
                    key={prio.level}
                    type="button"
                    onClick={() => setTaskForm({...taskForm, priority: prio.level as any})}
                    className={`py-2 px-3 text-xs rounded-xl border text-center transition-all ${
                      isSelected ? prio.activeColor : `${prio.color} hover:opacity-90`
                    }`}
                  >
                    {prio.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DETALLES Y NOTAS DE ACTIVIDAD */}
      <Modal isOpen={!!activeTask} onClose={() => setActiveTask(null)} title="Detalles y Notas de la Actividad" size="2xl">
        {activeTask && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  activeTask.status === "Completada" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {activeTask.status}
                </span>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  (activeTask.priority || "Media") === "Alta" ? "bg-rose-50 text-rose-700 border-rose-200" :
                  (activeTask.priority || "Media") === "Media" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  ⚡ Prioridad: {(activeTask.priority || "Media")}
                </span>
              </div>
              
              <h3 className="text-base font-bold text-slate-800 mt-1">{activeTask.title}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50 text-xs font-semibold text-slate-600">
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                  <span>Vencimiento: <strong className="font-extrabold text-slate-800">{activeTask.dueDate}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Solicitado por: <strong className="font-extrabold text-slate-800">{activeTask.requestedBy || "Admin Principal"}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>Responsable: <strong className="font-extrabold text-slate-800">{users.find(u => u.id === activeTask.userId)?.name || "Sin asignar"}</strong></span>
                </p>
                {activeTask.institutionId && (
                  <p className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M19 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><path d="M19 7h6"/><path d="M19 11h6"/></svg>
                    <span>Institución: <strong className="font-extrabold text-slate-800">{institutions.find(i => i.id === activeTask.institutionId)?.name}</strong></span>
                  </p>
                )}
              </div>

              {activeTask.leadId && (
                <div className="mt-3 flex items-center p-2.5 bg-amber-50 rounded-lg border border-amber-200/50 text-amber-850 text-xs font-semibold gap-1.5 leading-snug">
                  <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-extrabold uppercase text-[10px] block text-amber-700">Sincronización con CRM Activa</span>
                    Las notas escritas aquí se guardarán automáticamente en la sección de comentarios del Prospecto en el CRM.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Notas de Seguimiento / Comentarios</label>
              <textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Ingresa notas detalladas del contacto: qué se habló, compromisos, fechas clave..."
                className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 outline-none transition font-medium text-slate-700"
              />
            </div>

            {/* FUTURE ACTIVITY CREATION FORM COLLAPSIBLE */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 bg-slate-50/20">
              <button
                type="button"
                onClick={() => setShowFutureForm(!showFutureForm)}
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 text-xs font-bold uppercase tracking-wider transition-colors border-b border-slate-200/60"
              >
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-650" />
                  <span>📅 Programar Siguiente Actividad Futura</span>
                </div>
                <span className="text-[10px] text-indigo-600 bg-white border border-indigo-150 px-2 py-0.5 rounded font-extrabold lowercase">
                  {showFutureForm ? "ocultar" : "configurar"}
                </span>
              </button>

              {showFutureForm && (
                <div className="p-4 bg-white space-y-3 border-t border-slate-100">
                  {(() => {
                    const matched = getMatchedLead(activeTask);
                    return matched ? (
                      <div className="bg-amber-50 border border-amber-100/60 p-2.5 rounded-lg text-amber-900 text-xs font-semibold">
                        Se vinculará automáticamente al Prospecto de CRM: <strong className="font-extrabold underline">{matched.name}</strong>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg text-slate-500 text-xs font-medium">
                        Esta actividad no tiene un prospecto de CRM asociado inicialmente. La próxima actividad se guardará de forma general en la Agenda.
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Título de la Próxima Actividad</label>
                    <input
                      type="text"
                      required
                      value={futureTitle}
                      onChange={(e) => setFutureTitle(e.target.value)}
                      placeholder="Ej: Enviar propuesta final, Segunda llamada..."
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 bg-white outline-none font-medium text-slate-750 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Actividad</label>
                      <select
                        value={futureType}
                        onChange={(e) => setFutureType(e.target.value as TaskType)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 bg-white outline-none font-medium text-slate-750 transition"
                      >
                        <option value="Llamada">📞 Llamada</option>
                        <option value="Correo">✉️ Correo</option>
                        <option value="Visita">📍 Visita</option>
                        <option value="Meet">💻 Meet (Videollamada)</option>
                        <option value="Otro">✏️ Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Programada</label>
                      <input
                        type="date"
                        required
                        value={futureDate}
                        onChange={(e) => setFutureDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-150 focus:border-indigo-500 bg-white outline-none font-bold text-slate-750 transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        handleScheduleFutureActivity(e);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded text-xs tracking-wider uppercase transition shadow-sm"
                    >
                      Programar y Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => {
                  toggleTaskStatus(activeTask.id, activeTask.status);
                  // Update active task instance as well to toggle visual state inside modal instantly
                  setActiveTask(prev => prev ? { ...prev, status: prev.status === "Pendiente" ? "Completada" : "Pendiente" } : null);
                }} 
                className={`w-full sm:w-auto px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 ${
                  activeTask.status === "Completada" 
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200" 
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{activeTask.status === "Completada" ? "Marcar Pendiente" : "Completar Actividad"}</span>
              </button>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end items-center">
                {(currentUser?.role === 'Superadministrador' || currentUser?.role === 'Academia' || currentUser?.role === 'Admin Principal') && (
                  <button 
                    type="button" 
                    onClick={() => {
                      deleteTask(activeTask.id);
                      setActiveTask(null);
                    }} 
                    className="px-3 py-2 shrink-0 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg uppercase tracking-wider transition-colors flex items-center"
                    title="Eliminar acción"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Eliminar
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setActiveTask(null)} 
                  className="px-3 py-2 shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveNotes} 
                  className="px-3 py-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase tracking-wider shadow-sm transition flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Guardar Notas
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
