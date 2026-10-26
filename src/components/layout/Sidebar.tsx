import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAppContext } from "../../context/AppContext";
import { hasPermission, PermissionMenu } from "../../utils/permissionCheck";
import {
  Home,
  LayoutDashboard,
  Building2,
  GraduationCap,
  BookOpen,
  DollarSign,
  Truck,
  BarChart,
  List,
  Settings,
  CalendarDays,
  LogOut,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
  Landmark,
  Users,
  Briefcase,
  Sparkles,
  Megaphone,
  Mail,
  FolderOpen,
  CheckSquare,
  Clock,
  AlertCircle,
  ShieldCheck
} from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, students, companyInfo } = useAppContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const path = location.pathname;
    if (path.startsWith("/administracion") || path.startsWith("/finanzas") || path.startsWith("/reportes") || path.startsWith("/auditoria")) {
      initial["Administración"] = true;
    }
    if (path.startsWith("/proveedores") || path.startsWith("/clases")) {
      initial["Proveedores"] = true;
    }
    if (path.startsWith("/alumnos")) {
      initial["Alumnos"] = true;
    }
    if (path.startsWith("/instituciones")) {
      initial["Instituciones"] = true;
    }
    if (path.startsWith("/crm")) {
      initial["CRM"] = true;
    }
    return initial;
  });

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const studentEmailMatch = currentUser && currentUser.role === 'Alumno' && currentUser.email ? students.find(s => s.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase()) : null;
  const studentNameMatch = studentEmailMatch ? null : (currentUser && currentUser.role === 'Alumno' && currentUser.name ? students.find(s => 
    s.name && `${s.name} ${s.lastName || ''}`.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
  ) : null);
  const activeStudentRef = studentEmailMatch || studentNameMatch;
  const studentIdToUse = activeStudentRef ? activeStudentRef.id : (currentUser?.studentId || 1);

  interface NavItem {
    name: string;
    href?: string;
    icon: any;
    permission?: PermissionMenu;
    children?: {
      name: string;
      href: string;
      icon: any;
      permission?: PermissionMenu;
    }[];
  }

  const rawNavigation: NavItem[] = currentUser?.role === 'Alumno' ? [
    { name: "Mi Perfil Alumno", href: `/alumnos/${studentIdToUse}`, icon: GraduationCap }
  ] : currentUser?.role === 'Coordinador' ? [
    { name: "Mi Institución", href: `/instituciones/${currentUser.institutionId || 1}`, icon: Building2 },
    { name: "Alumnos de la Institución", href: "/alumnos", icon: GraduationCap },
    { name: "Extensión", href: "/alumnos/extension", icon: Clock }
  ] : [
    { name: "Inicio", href: "/", icon: Home },
    { name: "Dashboard de Alertas", href: "/alertas", icon: AlertCircle },
    { name: "Dashboard General", href: "/dashboard", icon: LayoutDashboard, permission: "Dashboard" as const },
    { name: "Agenda", href: "/agenda", icon: CalendarDays, permission: "Agenda" as const },
    {
      name: "CRM",
      icon: Briefcase,
      permission: "CRM" as const,
      children: [
        { name: "Dashboard de CRM", href: "/crm/dashboard", icon: LayoutDashboard, permission: "CRM - Dashboard" as const },
        { name: "Prospectos", href: "/crm", icon: Briefcase, permission: "CRM - Prospectos" as const },
        { name: "Campañas", href: "/crm/campanas", icon: Megaphone, permission: "CRM - Campañas" as const },
        { name: "Reportes", href: "/crm/reportes", icon: BarChart, permission: "CRM - Reportes" as const },
        { name: "Correos", href: "/crm/correos", icon: Mail, permission: "CRM - Correos" as const },
        { name: "Repositorio", href: "/crm/repositorio", icon: FolderOpen, permission: "CRM - Repositorio" as const },
        { name: "Tareas", href: "/crm/tareas", icon: CheckSquare, permission: "CRM - Tareas" as const },
      ]
    },
    {
      name: "Instituciones",
      icon: Building2,
      permission: "Instituciones" as const,
      children: [
        { name: "Dashboard de Instituciones", href: "/instituciones/dashboard", icon: LayoutDashboard, permission: "Instituciones" as const },
        { name: "Lista de Instituciones", href: "/instituciones", icon: Building2, permission: "Instituciones" as const },
        { name: "Notificaciones", href: "/instituciones/notificaciones", icon: Mail, permission: "Instituciones - Notificaciones" as const },
      ]
    },
    {
      name: "Alumnos",
      icon: GraduationCap,
      permission: "Alumnos" as const,
      children: [
        { name: "Dashboard de Alumnos", href: "/alumnos/dashboard", icon: LayoutDashboard, permission: "Alumnos" as const },
        { name: "Lista de Alumnos", href: "/alumnos", icon: GraduationCap, permission: "Alumnos" as const },
        { name: "Alumnos por Clase", href: "/alumnos/por-clase", icon: BookOpen, permission: "Clases" as const },
        { name: "Extensión", href: "/alumnos/extension", icon: Clock, permission: "Alumnos" as const },
      ]
    },
    { name: "Agentes", href: "/agentes", icon: Users, permission: "Agentes" as const },
    {
      name: "Proveedores",
      icon: Truck,
      permission: "Proveedores" as const,
      children: [
        { name: "Proveedores", href: "/proveedores", icon: Truck, permission: "Proveedores" as const },
        { name: "Clases y Créditos", href: "/clases", icon: BookOpen, permission: "Clases" as const },
        { name: "Servicios Extras", href: "/proveedores/servicios-extras", icon: Sparkles, permission: "Proveedores" as const },
      ]
    },
    {
      name: "Administración",
      icon: DollarSign,
      permission: "Administración" as const,
      children: [
        { name: "Administración", href: "/administracion", icon: DollarSign, permission: "Administración" as const },
        { name: "Finanzas", href: "/finanzas", icon: Landmark, permission: "Finanzas" as const },
        { name: "Reportes", href: "/reportes", icon: BarChart, permission: "Reportes" as const },
        { name: "Bitácora de Auditoría", href: "/auditoria", icon: ShieldCheck, permission: "Auditoría" as const },
      ]
    },
    { name: "Catálogos", href: "/catalogos", icon: List, permission: "Catálogos" as const },
  ];

  // Dynamically filter navigation based on role's view permissions
  const navigation = currentUser?.role === 'Alumno' || currentUser?.role === 'Coordinador' 
    ? rawNavigation 
    : rawNavigation
        .filter(item => !item.permission || hasPermission(currentUser?.role, item.permission, 'view'))
        .map(item => {
          if (item.children) {
            return {
              ...item,
              children: item.children.filter(child => !child.permission || hasPermission(currentUser?.role, child.permission, 'view'))
            };
          }
          return item;
        })
        .filter(item => !item.children || item.children.length > 0);

  return (
    <nav className="w-64 flex-shrink-0 bg-[#000000] flex flex-col border-r border-[#1a1a1a]">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-10">
          {companyInfo?.logoUrl ? (
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden border border-white/20 shrink-0">
              <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(99,102,241,0.65)] animate-pulse border border-indigo-400/30 shrink-0">
              {companyInfo?.commercialName ? companyInfo.commercialName.substring(0, 3).toUpperCase() : 'IHS'}
            </div>
          )}
          <span className="text-white font-semibold text-sm tracking-widest uppercase truncate max-w-[150px]">
            {companyInfo?.commercialName || 'DLX System'}
          </span>
        </div>
        
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[#666666] text-[10px] font-bold uppercase tracking-widest mb-2 border-b border-[#1a1a1a]">
            Aplicativo
          </div>
          {navigation.map((item) => {
            if (item.children) {
              const isOpen = openSubmenus[item.name] || false;
              const hasActiveChild = item.children.some(child => 
                location.pathname === child.href || (location.pathname.startsWith(child.href) && child.href !== '/')
              );
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={cn(
                      hasActiveChild
                        ? "bg-[#1a1a1a]/45 text-white"
                        : "text-[#888888] hover:text-white hover:bg-[#111111]",
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          hasActiveChild ? "text-indigo-400" : "opacity-70"
                        )}
                        strokeWidth={hasActiveChild ? 2.5 : 2}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#666666]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="pl-4 space-y-1 border-l border-[#1a1a1a] ml-5 animate-in slide-in-from-top-1 duration-150">
                      {item.children.map((child) => {
                        let isChildActive = location.pathname === child.href;
                        if (!isChildActive && child.href !== '/') {
                          if (child.href === '/alumnos') {
                            isChildActive = location.pathname.startsWith('/alumnos') && !location.pathname.startsWith('/alumnos/dashboard');
                          } else if (child.href === '/instituciones') {
                            isChildActive = location.pathname.startsWith('/instituciones') && !location.pathname.startsWith('/instituciones/dashboard');
                          } else {
                            isChildActive = location.pathname.startsWith(child.href);
                          }
                        }
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              isChildActive
                                ? "text-white font-semibold bg-[#1a1a1a]"
                                : "text-[#777777] hover:text-white hover:bg-[#111111]/50",
                              "flex items-center space-x-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors"
                            )}
                          >
                            <child.icon
                              className={cn(
                                "h-3.5 w-3.5 flex-shrink-0",
                                isChildActive ? "text-indigo-400" : "opacity-60"
                              )}
                              strokeWidth={isChildActive ? 2.5 : 2}
                              aria-hidden="true"
                            />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  isActive
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#888888] hover:text-white hover:bg-[#111111]",
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-indigo-400" : "opacity-70"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="mt-auto p-6 border-t border-[#1a1a1a] relative">
        {currentUser?.role !== 'Alumno' && currentUser?.role !== 'Coordinador' && hasPermission(currentUser?.role, "Configuración", "view") && (
          <Link to="/configuracion" className="flex items-center space-x-3 text-[#888888] hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-[#111111] mb-2">
            <Settings className="h-4 w-4 opacity-70" aria-hidden="true" />
            <span className="text-xs font-medium">Configuración</span>
          </Link>
        )}
        <button 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-full flex items-center justify-between px-3 py-3 mt-2 bg-[#111111] hover:bg-[#1a1a1a] transition-colors rounded-xl border border-[#1a1a1a]"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono shrink-0">
              {currentUser?.name?.substring(0, 2).toUpperCase() || 'WD'}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-xs text-white font-medium truncate">{currentUser?.name || 'Admin Global'}</p>
              <p className="text-[10px] text-[#666666] uppercase tracking-widest mt-0.5">{currentUser?.role || 'Activo'}</p>
            </div>
          </div>
          <ChevronUp className={cn("w-4 h-4 text-[#666666] transition-transform", showProfileMenu ? "rotate-180" : "")} />
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-full left-6 right-6 mb-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowProfileMenu(false);
                navigate('/perfil');
              }}
              className="w-full flex items-center px-4 py-2.5 text-xs font-medium text-[#888888] hover:text-white hover:bg-[#222222] transition-colors"
            >
              <UserIcon className="w-4 h-4 mr-3 opacity-70" />
              Configurar Perfil
            </button>
            <div className="h-px bg-[#2a2a2a] my-1" />
            <button 
              onClick={() => {
                setCurrentUser(null);
              }}
              className="w-full flex items-center px-4 py-2.5 text-xs font-medium text-rose-500 hover:text-white hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3 opacity-70" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
