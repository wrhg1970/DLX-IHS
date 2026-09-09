export type PermissionMenu = 
  | "Dashboard" 
  | "Agenda" 
  | "CRM"
  | "CRM - Dashboard"
  | "CRM - Prospectos"
  | "CRM - Campañas"
  | "CRM - Reportes"
  | "CRM - Correos"
  | "CRM - Repositorio"
  | "CRM - Tareas"
  | "Instituciones" 
  | "Instituciones - Notificaciones"
  | "Alumnos" 
  | "Agentes"
  | "Clases" 
  | "Administración" 
  | "Proveedores" 
  | "Finanzas" 
  | "Reportes" 
  | "Catálogos" 
  | "Configuración";

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<PermissionMenu, Permission>;
}

export const DEFAULT_PERMS: Permission = { view: true, create: true, edit: true, delete: true };
export const NO_PERMS: Permission = { view: false, create: false, edit: false, delete: false };

export const DEFAULT_MENUS: PermissionMenu[] = [
  "Dashboard",
  "Agenda",
  "CRM",
  "CRM - Dashboard",
  "CRM - Prospectos",
  "CRM - Campañas",
  "CRM - Reportes",
  "CRM - Correos",
  "CRM - Repositorio",
  "CRM - Tareas",
  "Instituciones",
  "Instituciones - Notificaciones",
  "Alumnos",
  "Agentes",
  "Clases",
  "Administración",
  "Proveedores",
  "Finanzas",
  "Reportes",
  "Catálogos",
  "Configuración"
];

export const DEFAULT_ROLES: Role[] = [
  { 
    id: '1', 
    name: 'Superadministrador', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, { ...DEFAULT_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '2', 
    name: 'Finanzas', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => {
      if (m === "Dashboard") return [m, { view: true, create: false, edit: false, delete: false }];
      if (["Administración", "Finanzas", "Reportes"].includes(m)) return [m, { ...DEFAULT_PERMS }];
      if (["Instituciones", "Instituciones - Notificaciones", "Alumnos", "Proveedores", "Catálogos"].includes(m)) return [m, { view: true, create: false, edit: true, delete: false }];
      return [m, { ...NO_PERMS }];
    })) as Record<PermissionMenu, Permission>
  },
  { 
    id: '2b', 
    name: 'Administrativo', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => {
      if (m === "Dashboard") return [m, { view: true, create: false, edit: false, delete: false }];
      if (["Administración", "Finanzas", "Reportes"].includes(m)) return [m, { ...DEFAULT_PERMS }];
      if (["Instituciones", "Instituciones - Notificaciones", "Alumnos", "Proveedores", "Catálogos"].includes(m)) return [m, { view: true, create: false, edit: true, delete: false }];
      return [m, { ...NO_PERMS }];
    })) as Record<PermissionMenu, Permission>
  },
  { 
    id: '3', 
    name: 'Academia', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => {
      if (["Clases", "Alumnos", "Instituciones", "Instituciones - Notificaciones", "Agenda", "Proveedores"].includes(m)) return [m, { view: true, create: true, edit: true, delete: false }];
      return [m, { ...NO_PERMS }];
    })) as Record<PermissionMenu, Permission>
  },
  { 
    id: '3b', 
    name: 'Académico', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => {
      if (["Clases", "Alumnos", "Instituciones", "Instituciones - Notificaciones", "Agenda", "Proveedores"].includes(m)) return [m, { view: true, create: true, edit: true, delete: false }];
      return [m, { ...NO_PERMS }];
    })) as Record<PermissionMenu, Permission>
  },
  { 
    id: '4', 
    name: 'Ventas', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => {
      if ([
        "CRM", 
        "CRM - Dashboard", 
        "CRM - Prospectos", 
        "CRM - Campañas", 
        "CRM - Reportes", 
        "CRM - Correos", 
        "CRM - Repositorio", 
        "CRM - Tareas", 
        "Agentes", 
        "Agenda"
      ].includes(m)) return [m, { ...DEFAULT_PERMS }];
      if (["Instituciones", "Instituciones - Notificaciones", "Alumnos"].includes(m)) return [m, { view: true, create: true, edit: true, delete: false }];
      return [m, { ...NO_PERMS }];
    })) as Record<PermissionMenu, Permission>
  },
  { 
    id: '5', 
    name: 'Alumno', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, m === "Alumnos" ? { view: true, create: false, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '6', 
    name: 'Coordinador', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, ["Alumnos", "Instituciones", "Instituciones - Notificaciones", "Clases"].includes(m) ? { view: true, create: true, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  }
];

let inMemorySystemRoles: Role[] | null = null;

export function setInMemorySystemRoles(roles: Role[]) {
  if (Array.isArray(roles) && roles.length > 0) {
    inMemorySystemRoles = roles;
    try {
      localStorage.setItem("system_roles", JSON.stringify(roles));
    } catch (e) {
      console.warn("Could not save system_roles to localStorage", e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('system_roles_updated', { detail: roles }));
    }
  }
}

export function getSystemRoles(): Role[] {
  if (inMemorySystemRoles && inMemorySystemRoles.length > 0) {
    return inMemorySystemRoles;
  }

  const saved = typeof window !== 'undefined' ? localStorage.getItem("system_roles") : null;
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Role[];
      let updated = false;
      const migrated = parsed.map(r => {
        const normRole = r.name.trim().toLowerCase();
        const defaultRole = DEFAULT_ROLES.find(dr => dr.name.trim().toLowerCase() === normRole);
        
        // Ensure all DEFAULT_MENUS are defined in r.permissions
        DEFAULT_MENUS.forEach(menu => {
          if (!r.permissions[menu]) {
            if (defaultRole && defaultRole.permissions[menu]) {
              r.permissions[menu] = { ...defaultRole.permissions[menu] };
            } else if (normRole.includes('super') || normRole.includes('director') || normRole.includes('admin principal')) {
              r.permissions[menu] = { ...DEFAULT_PERMS };
            } else if (menu.startsWith("CRM") && normRole === 'ventas') {
              r.permissions[menu] = { ...DEFAULT_PERMS };
            } else if (menu === "Agentes" && normRole === 'ventas') {
              r.permissions[menu] = { ...DEFAULT_PERMS };
            } else if (menu === "Instituciones - Notificaciones") {
              r.permissions[menu] = r.permissions["Instituciones"] ? { ...r.permissions["Instituciones"] } : { ...DEFAULT_PERMS };
            } else {
              r.permissions[menu] = { ...NO_PERMS };
            }
            updated = true;
          }
        });

        // Ensure Ventas role has all CRM screens enabled and does NOT have Dashboard by default
        if (normRole === 'ventas') {
          const crmMenus: PermissionMenu[] = [
            "CRM", 
            "CRM - Dashboard", 
            "CRM - Prospectos", 
            "CRM - Campañas", 
            "CRM - Reportes", 
            "CRM - Correos", 
            "CRM - Repositorio", 
            "CRM - Tareas", 
            "Agentes"
          ];
          crmMenus.forEach(m => {
            if (!r.permissions[m] || !r.permissions[m].view) {
              r.permissions[m] = { ...DEFAULT_PERMS };
              updated = true;
            }
          });
          // If Ventas previously had Dashboard erroneously enabled, disable it so only Dashboard users see company income
          if (r.permissions["Dashboard"] && r.permissions["Dashboard"].view) {
            r.permissions["Dashboard"] = { ...NO_PERMS };
            updated = true;
          }
        }
        
        return r;
      });

      // Ensure all DEFAULT_ROLES exist
      DEFAULT_ROLES.forEach(dr => {
        if (!migrated.some(r => r.name.trim().toLowerCase() === dr.name.trim().toLowerCase())) {
          migrated.push({ ...dr });
          updated = true;
        }
      });

      inMemorySystemRoles = migrated;
      if (updated && typeof window !== 'undefined') {
        localStorage.setItem("system_roles", JSON.stringify(migrated));
      }
      return migrated;
    } catch (e) {
      console.error("Error parsing system_roles in permissionCheck", e);
    }
  }

  inMemorySystemRoles = DEFAULT_ROLES;
  return DEFAULT_ROLES;
}

/**
 * Checks if a user role has permission for a specific menu and action
 */
export function hasPermission(
  roleName: string | undefined, 
  menu: PermissionMenu, 
  action: keyof Permission = 'view'
): boolean {
  if (!roleName) return false;
  
  // Normalize role name for safety (lowercase comparison)
  const normRole = roleName.trim().toLowerCase();
  
  // Superadministrador or Admin Principal has access to everything by default
  if (normRole === 'superadministrador' || normRole === 'admin principal' || normRole === 'director') {
    return true;
  }
  
  const roles = getSystemRoles();
  
  // 1. Direct match with configured system roles
  let roleToCheck = roles.find(r => r.name.trim().toLowerCase() === normRole);
  
  // 2. Direct match with DEFAULT_ROLES
  if (!roleToCheck) {
    roleToCheck = DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === normRole);
  }

  // 3. Robust alias mapping for canonical roles
  if (!roleToCheck) {
    if (['académico', 'academico', 'academia', 'coordinador académico', 'coordinacion academica', 'docente', 'profesor'].includes(normRole)) {
      roleToCheck = roles.find(r => r.name.trim().toLowerCase() === 'academia' || r.name.trim().toLowerCase() === 'académico') ||
                    DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === 'academia');
    } else if (['administrativo', 'administración', 'administracion', 'finanzas', 'director financiero', 'contabilidad', 'tesoreria', 'tesorería'].includes(normRole)) {
      roleToCheck = roles.find(r => r.name.trim().toLowerCase() === 'finanzas' || r.name.trim().toLowerCase() === 'administrativo') ||
                    DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === 'finanzas');
    } else if (['ventas', 'comercial', 'ejecutivo de ventas', 'asesor comercial'].includes(normRole)) {
      roleToCheck = roles.find(r => r.name.trim().toLowerCase() === 'ventas') ||
                    DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === 'ventas');
    } else if (['alumno', 'estudiante'].includes(normRole)) {
      roleToCheck = roles.find(r => r.name.trim().toLowerCase() === 'alumno') ||
                    DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === 'alumno');
    } else if (['coordinador', 'coordinador institucion', 'coordinador institucional'].includes(normRole)) {
      roleToCheck = roles.find(r => r.name.trim().toLowerCase() === 'coordinador') ||
                    DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === 'coordinador');
    }
  }

  if (!roleToCheck) return false;

  // Direct check
  if (roleToCheck.permissions[menu]?.[action] !== undefined) {
    // If it's a CRM sub-menu, check if the specific permission exists, otherwise fallback to "CRM"
    if (menu.startsWith("CRM - ") && !roleToCheck.permissions[menu]?.[action]) {
      return roleToCheck.permissions["CRM"]?.[action] ?? false;
    }
    // If it's an Instituciones sub-menu, check if specific permission exists, otherwise fallback to "Instituciones"
    if (menu.startsWith("Instituciones - ") && !roleToCheck.permissions[menu]?.[action]) {
      return roleToCheck.permissions["Instituciones"]?.[action] ?? false;
    }
    return roleToCheck.permissions[menu]?.[action] ?? false;
  }
  
  // Fallback for CRM sub-menus if not defined
  if (menu.startsWith("CRM - ")) {
    return roleToCheck.permissions["CRM"]?.[action] ?? false;
  }
  // Fallback for Instituciones sub-menus if not defined
  if (menu.startsWith("Instituciones - ")) {
    return roleToCheck.permissions["Instituciones"]?.[action] ?? false;
  }
  
  return false;
}

/**
 * Convenience helper: checks if the current role has view access to financial / administrative data
 * (strictly false for pure Academic / Student roles)
 */
export function canViewFinancials(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const norm = roleName.trim().toLowerCase();
  if (norm === 'superadministrador' || norm === 'admin principal' || norm === 'director') return true;
  return hasPermission(roleName, "Finanzas", "view") || hasPermission(roleName, "Administración", "view");
}

/**
 * Convenience helper: checks if the current role has view access to administrative data
 */
export function canViewAdministrative(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const norm = roleName.trim().toLowerCase();
  if (norm === 'superadministrador' || norm === 'admin principal' || norm === 'director') return true;
  return hasPermission(roleName, "Administración", "view");
}

/**
 * Convenience helper: checks if the current role has access to academic classes, credits and curriculum
 * (strictly false for pure Financial / Administrative / Commercial roles without explicit permissions)
 */
export function canViewAcademic(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const norm = roleName.trim().toLowerCase();
  if (norm === 'superadministrador' || norm === 'admin principal' || norm === 'director') return true;
  if (norm === 'alumno' || norm === 'coordinador') return true;
  return hasPermission(roleName, "Clases", "view");
}

/**
 * Convenience helper: checks if the current role can edit academic evaluations, grades, enrollments and curriculum
 */
export function canEditAcademic(roleName: string | undefined): boolean {
  if (!roleName) return false;
  const norm = roleName.trim().toLowerCase();
  if (norm === 'superadministrador' || norm === 'admin principal' || norm === 'director') return true;
  return hasPermission(roleName, "Clases", "edit");
}

