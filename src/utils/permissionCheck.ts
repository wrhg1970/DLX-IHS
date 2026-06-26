export type PermissionMenu = 
  | "Dashboard" 
  | "Agenda" 
  | "Instituciones" 
  | "Alumnos" 
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

const DEFAULT_PERMS: Permission = { view: true, create: true, edit: true, delete: true };
const NO_PERMS: Permission = { view: false, create: false, edit: false, delete: false };

export const DEFAULT_MENUS: PermissionMenu[] = [
  "Dashboard",
  "Agenda",
  "Instituciones",
  "Alumnos",
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
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, ["Administración", "Finanzas", "Reportes", "Proveedores"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '3', 
    name: 'Academia', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, ["Clases", "Alumnos", "Instituciones", "Agenda"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '4', 
    name: 'Ventas', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, ["Instituciones", "Alumnos", "Dashboard"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '5', 
    name: 'Alumno', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, m === "Alumnos" ? { view: true, create: false, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  },
  { 
    id: '6', 
    name: 'Coordinador', 
    permissions: Object.fromEntries(DEFAULT_MENUS.map(m => [m, ["Alumnos", "Instituciones", "Clases"].includes(m) ? { view: true, create: true, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, Permission>
  }
];

export function getSystemRoles(): Role[] {
  const saved = localStorage.getItem("system_roles");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing system_roles in permissionCheck", e);
    }
  }
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
  const foundRole = roles.find(r => r.name.trim().toLowerCase() === normRole);
  
  if (!foundRole) {
    // If not configured, check against default roles list with fallback
    const defaultRole = DEFAULT_ROLES.find(r => r.name.trim().toLowerCase() === normRole);
    if (defaultRole) {
      return defaultRole.permissions[menu]?.[action] ?? false;
    }
    return false;
  }
  
  return foundRole.permissions[menu]?.[action] ?? false;
}
