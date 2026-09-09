import { Search, User, Landmark, BookOpen, X, Bell, DollarSign, Sparkles, CheckCheck, Trash2, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications, 
  RealtimeNotification 
} from "../../utils/realtimeNotifications";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { students, institutions, classes } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time notifications state
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(() => getStoredNotifications());
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'finance' | 'sales'>('all');
  const notifRef = useRef<HTMLDivElement>(null);
  const [activeToast, setActiveToast] = useState<RealtimeNotification | null>(null);

  // Sync notifications on mount and via custom event
  useEffect(() => {
    const handleNotifEvent = (e: any) => {
      const all = getStoredNotifications();
      setNotifications(all);
      if (e.detail && e.detail.title) {
        setActiveToast(e.detail);
        setTimeout(() => {
          setActiveToast(prev => prev?.id === e.detail.id ? null : prev);
        }, 6000);
      }
    };

    window.addEventListener('ihs-realtime-notification', handleNotifEvent);
    return () => window.removeEventListener('ihs-realtime-notification', handleNotifEvent);
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'finance') return n.type === 'finance';
    if (notifFilter === 'sales') return n.type === 'sales';
    return true;
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key closes dropdown
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  let pathName = "Sistema";
  if (location.pathname === "/") pathName = "Dashboard Ejecutivo";
  else if (location.pathname.startsWith("/instituciones/nueva")) pathName = "Añadir Institución";
  else if (location.pathname.match(/^\/instituciones\/\d+/)) pathName = "Perfil de Institución";
  else if (location.pathname.startsWith("/instituciones")) pathName = "Instituciones";
  else if (location.pathname.startsWith("/alumnos/nuevo")) pathName = "Registrar Alumno";
  else if (location.pathname.startsWith("/alumnos/editar/")) pathName = "Editar Alumno";
  else if (location.pathname.startsWith("/alumnos/")) pathName = "Perfil de Alumno";
  else if (location.pathname.startsWith("/alumnos")) pathName = "Alumnos Globales";
  else if (location.pathname.startsWith("/clases/")) pathName = "Detalle de Clase";
  else if (location.pathname.startsWith("/clases")) pathName = "Clases & Créditos";
  else if (location.pathname.startsWith("/administracion")) pathName = "Administración";
  else if (location.pathname.startsWith("/finanzas")) pathName = "Finanzas";
  else if (location.pathname.startsWith("/proveedores")) pathName = "Proveedores";
  else if (location.pathname.startsWith("/reportes")) pathName = "Reportes";
  else if (location.pathname.startsWith("/catalogos")) pathName = "Catálogos";
  else if (location.pathname.startsWith("/configuracion")) pathName = "Configuración";
  else if (location.pathname.startsWith("/perfil")) pathName = "Mi Perfil";

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredStudents = cleanQuery
    ? students.filter(s => 
        s.name?.toLowerCase().includes(cleanQuery) ||
        s.lastName?.toLowerCase().includes(cleanQuery) ||
        s.studentCustomId?.toLowerCase().includes(cleanQuery) ||
        s.email?.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const filteredInstitutions = cleanQuery
    ? institutions.filter(inst => 
        inst.name?.toLowerCase().includes(cleanQuery) ||
        inst.tradeName?.toLowerCase().includes(cleanQuery) ||
        inst.institutionCode?.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const filteredClasses = cleanQuery
    ? classes.filter(cls => 
        cls.name?.toLowerCase().includes(cleanQuery) ||
        cls.code?.toLowerCase().includes(cleanQuery) ||
        cls.subject?.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : [];

  const hasResults = filteredStudents.length > 0 || filteredInstitutions.length > 0 || filteredClasses.length > 0;

  const handleSelectResult = (path: string) => {
    navigate(path);
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-40 shadow-xs">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{pathName}</h1>
        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-widest hidden sm:inline-block shadow-sm">
          Sistema Operativo
        </span>
      </div>
      <div className="flex items-center space-x-6 relative" ref={dropdownRef} id="global-search-container">
        <div className="relative group" id="global-search-input-wrapper">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            id="global-search-input"
            type="text" 
            placeholder="Buscar alumnos, clases o instituciones..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-64 sm:w-80 bg-slate-50 border border-slate-200 rounded-full py-2 pl-10 pr-10 text-xs shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
          />
          {searchQuery && (
            <button 
              id="clear-global-search-btn"
              onClick={() => {
                setSearchQuery("");
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Floating live search results dropdown */}
        {isOpen && searchQuery && (
          <div id="global-search-dropdown" className="absolute right-0 top-12 w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[480px] flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center" id="global-search-dropdown-header">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Resultados de Búsqueda</span>
              <span className="text-[10px] font-medium text-slate-400">Esc para cerrar</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-3.5" id="global-search-dropdown-results">
              {!hasResults && (
                <div className="py-8 px-4 text-center" id="global-search-no-results">
                  <p className="text-xs font-medium text-slate-400">No se encontraron resultados para "{searchQuery}"</p>
                </div>
              )}

              {/* Alumnos Section */}
              {filteredStudents.length > 0 && (
                <div id="search-section-students">
                  <div className="px-2.5 pb-1 text-[9.5px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <User className="h-3 w-3" /> Alumnos
                  </div>
                  <div className="space-y-0.5">
                    {filteredStudents.map(student => (
                      <button
                        id={`search-student-result-${student.id}`}
                        key={student.id}
                        onClick={() => handleSelectResult(`/alumnos/${student.id}`)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors flex justify-between items-center group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600">
                            {student.name} {student.lastName || ''}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
                            {student.studentCustomId ? `ID: ${student.studentCustomId}` : `Fid: ${student.id}`} • {student.modality || 'Homeschool'}
                          </p>
                        </div>
                        <span className="text-[9.5px] bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 font-bold px-2 py-0.5 rounded-md transition-colors shrink-0">
                          Ver Perfil
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Instituciones Section */}
              {filteredInstitutions.length > 0 && (
                <div id="search-section-institutions">
                  <div className="px-2.5 pb-1 text-[9.5px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                    <Landmark className="h-3 w-3" /> Instituciones
                  </div>
                  <div className="space-y-0.5">
                    {filteredInstitutions.map(inst => (
                      <button
                        id={`search-institution-result-${inst.id}`}
                        key={inst.id}
                        onClick={() => handleSelectResult(`/instituciones/${inst.id}`)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors flex justify-between items-center group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600">
                            {inst.tradeName || inst.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
                            {inst.institutionCode ? `Código: ${inst.institutionCode}` : 'Sin código'} • {inst.name}
                          </p>
                        </div>
                        <span className="text-[9.5px] bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 font-bold px-2 py-0.5 rounded-md transition-colors shrink-0">
                          Ver Perfil
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clases Section */}
              {filteredClasses.length > 0 && (
                <div id="search-section-classes">
                  <div className="px-2.5 pb-1 text-[9.5px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Clases
                  </div>
                  <div className="space-y-0.5">
                    {filteredClasses.map(cls => (
                      <button
                        id={`search-class-result-${cls.id}`}
                        key={cls.id}
                        onClick={() => handleSelectResult(`/clases/${cls.id}`)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors flex justify-between items-center group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600">
                            {cls.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
                            {cls.code ? `Código: ${cls.code}` : 'Sin código'} • {cls.subject || 'Materia'}
                          </p>
                        </div>
                        <span className="text-[9.5px] bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 font-bold px-2 py-0.5 rounded-md transition-colors shrink-0">
                          Ver Clase
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-time Notification Center Bell */}
        <div className="relative" ref={notifRef} id="notification-center-container">
          <button 
            type="button"
            id="notification-center-bell-btn"
            onClick={() => setIsNotifOpen(prev => !prev)}
            className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title="Centro de Notificaciones en Tiempo Real"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div 
              id="notification-dropdown-panel"
              className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[480px]"
            >
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 tracking-tight">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsAsRead();
                        setNotifications(getStoredNotifications());
                      }}
                      className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Leídas</span>
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAllNotifications();
                        setNotifications([]);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                      title="Limpiar todas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center px-3 py-1.5 bg-slate-100/60 border-b border-slate-150 text-[10.5px] font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    notifFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('finance')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    notifFilter === 'finance' ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>Finanzas ({notifications.filter(n => n.type === 'finance').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('sales')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    notifFilter === 'sales' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Ventas ({notifications.filter(n => n.type === 'sales').length})</span>
                </button>
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Sin notificaciones pendientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Las alertas del equipo de Finanzas & Cobranza y Ventas aparecerán aquí en tiempo real.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        setNotifications(getStoredNotifications());
                        if (notif.actionUrl) {
                          navigate(notif.actionUrl);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                        !notif.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'finance' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            💰
                          </div>
                        ) : notif.type === 'sales' ? (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            🎉
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs ${!notif.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'} truncate`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-[9.5px] text-slate-400 font-medium">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                            {notif.team || 'Equipo IHS'}
                          </span>
                          <span>
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Real-time Toast Notification Alert */}
      {activeToast && (
        <div 
          id="realtime-toast-alert"
          onClick={() => {
            if (activeToast.actionUrl) navigate(activeToast.actionUrl);
            setActiveToast(null);
          }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700 flex items-start gap-3.5 animate-in slide-in-from-top-3 duration-300 cursor-pointer"
        >
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
            {activeToast.type === 'finance' ? <DollarSign className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                {activeToast.team || 'Notificación IHS'}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveToast(null);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-bold text-white mt-0.5 truncate">
              {activeToast.title}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>
            <p className="text-[10px] text-indigo-400 font-bold mt-1">
              Haz clic para ver detalles en CRM →
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
