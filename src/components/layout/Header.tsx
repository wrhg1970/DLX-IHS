import { Search } from "lucide-react";
import { useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
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

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-10 shadow-sm">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{pathName}</h1>
        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-widest hidden sm:inline-block shadow-sm">
          Sistema Operativo
        </span>
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-48 sm:w-64 bg-slate-50 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-xs shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>
    </header>
  );
}
