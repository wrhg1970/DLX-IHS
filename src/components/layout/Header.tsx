import { Search, User, Landmark, BookOpen, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../context/AppContext";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { students, institutions, classes } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      </div>
    </header>
  );
}
