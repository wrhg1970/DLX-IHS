/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "./context/AppContext";
import { Login } from "./pages/Login";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Inicio } from "./pages/Inicio";
import { Dashboard } from "./pages/Dashboard";
import { FormInstitucion } from "./pages/FormInstitucion";
import { InstitucionDetail } from "./pages/InstitucionDetail";
import { Instituciones } from "./pages/Instituciones";
import { InstitucionesDashboard } from "./pages/InstitucionesDashboard";
import { InstitucionesNotificaciones } from "./pages/InstitucionesNotificaciones";
import { Alumnos } from "./pages/Alumnos";
import { AlumnosDashboard } from "./pages/AlumnosDashboard";
import { AlumnosPorClase } from "./pages/AlumnosPorClase";
import { AlumnosExtension } from "./pages/AlumnosExtension";
import { FormAlumno } from "./pages/FormAlumno";
import { AlumnoDetail } from "./pages/AlumnoDetail";
import { Clases } from "./pages/Clases";
import { ClaseDetail } from "./pages/ClaseDetail";
import { Administracion } from "./pages/Administracion";
import { Proveedores } from "./pages/Proveedores";
import { ProveedorDetail } from "./pages/ProveedorDetail";
import { ServiciosExtras } from "./pages/ServiciosExtras";
import { Reportes } from "./pages/Reportes";
import { Catalogos } from "./pages/Catalogos";
import { Configuracion } from "./pages/Configuracion";
import { Agenda } from "./pages/Agenda";
import { Perfil } from "./pages/Perfil";
import { Finanzas } from "./pages/Finanzas";
import { Agentes } from "./pages/Agentes";
import { CRM } from "./pages/CRM";
import { PermissionMenu, hasPermission, Permission } from "./utils/permissionCheck";
import { AccessDenied } from "./components/ui/AccessDenied";

interface RoleGuardProps {
  allowedRoles?: string[];
  fallbackTo?: string;
  permission?: PermissionMenu;
  action?: keyof Permission;
  children: React.ReactElement;
}

function RoleGuard({ allowedRoles, fallbackTo = "/", permission, action = "view", children }: RoleGuardProps) {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Navigate to="/" replace />;
  
  const normRole = currentUser.role?.trim().toLowerCase() || '';

  // Superadmin, Admin Principal, Director bypass all restrictions
  if (normRole === 'superadministrador' || normRole === 'admin principal' || normRole === 'director') {
    return children;
  }

  // Alumno strict sandbox: only student profile
  if (currentUser.role === "Alumno") {
    if (permission === "Alumnos" && action === "view") {
      return children;
    }
    return <AccessDenied permission={permission} action={action} fallbackTo={fallbackTo} message="El portal de alumnos tiene acceso exclusivo a tu expediente personal y calificaciones." />;
  }

  // Coordinador strict sandbox: only their institution and assigned students
  if (currentUser.role === "Coordinador") {
    if (permission === "Instituciones" || permission === "Alumnos" || permission === "Clases") {
      return children;
    }
    return <AccessDenied permission={permission} action={action} fallbackTo={fallbackTo} message="El perfil de Coordinador Institucional solo tiene acceso a los alumnos y datos académicos de su sede." />;
  }

  // Check centralized permission system
  if (permission && !hasPermission(currentUser.role, permission, action)) {
    return <AccessDenied permission={permission} action={action} fallbackTo={fallbackTo} />;
  }

  // Check allowed roles if specified (with alias support)
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = allowedRoles.some(r => {
      const rLower = r.toLowerCase().trim();
      if (rLower === normRole) return true;
      if (['academia', 'académico', 'academico'].includes(rLower) && ['academia', 'académico', 'academico', 'coordinador académico'].includes(normRole)) return true;
      if (['finanzas', 'administrativo', 'administración', 'administracion'].includes(rLower) && ['finanzas', 'administrativo', 'administración', 'administracion', 'director financiero'].includes(normRole)) return true;
      return false;
    });

    if (!isRoleAllowed) {
      return <AccessDenied permission={permission} action={action} fallbackTo={fallbackTo} />;
    }
  }
  
  return children;
}

export default function App() {
  const { currentUser, students } = useAppContext();

  if (!currentUser) {
    return <Login />;
  }

  // Define fallback routes based on role
  const getFallbackRoute = () => {
    if (currentUser.role === 'Alumno') {
      const emailMatch = currentUser.email ? students.find(s => s.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase()) : null;
      const nameMatch = emailMatch ? null : students.find(s => 
        currentUser.name && s.name && `${s.name} ${s.lastName || ''}`.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      );
      const activeStudent = emailMatch || nameMatch;
      return `/alumnos/${activeStudent ? activeStudent.id : (currentUser.studentId || 1)}`;
    }
    if (currentUser.role === 'Coordinador') {
      return `/instituciones/${currentUser.institutionId || 1}`;
    }
    return "/";
  };

  const fallbackRoute = getFallbackRoute();
  const allRolesExceptStudentAndCoordinator = ['Superadministrador', 'Finanzas', 'Academia', 'Ventas', 'Admin Principal', 'Director Financiero', 'Coordinador Académico'];

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          {/* Public or shared profile route */}
          <Route path="perfil" element={<Perfil />} />

          {/* Alumno only has access to their specific student detail */}
          <Route 
            path="alumnos/:id" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Alumno', 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos">
                <AlumnoDetail />
              </RoleGuard>
            } 
          />

          {/* Coordinador and regular admins have access to Institution detail */}
          <Route 
            path="instituciones/:id" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Instituciones">
                <InstitucionDetail />
              </RoleGuard>
            } 
          />

          {/* Coordinador and regular admins have access to Alumnos list, new and edit student */}
          <Route 
            path="alumnos" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos">
                <Alumnos />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/nuevo" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos" action="create">
                <FormAlumno />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/editar/:id" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos" action="edit">
                <FormAlumno />
              </RoleGuard>
            } 
          />

          {/* Admin and other roles routes */}
          <Route 
            index 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute}>
                <Inicio />
              </RoleGuard>
            } 
          />
          <Route 
            path="dashboard" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Dashboard">
                <Dashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="agenda" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Agenda">
                <Agenda />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Prospectos">
                <CRM initialTab="Kanban" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/dashboard" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Dashboard">
                <CRM initialTab="Analytics" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/campanas" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Campañas">
                <CRM initialTab="Campanas" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/reportes" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Reportes">
                <CRM initialTab="Reportes" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/correos" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Correos">
                <CRM initialTab="Correos" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/repositorio" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Repositorio">
                <CRM initialTab="Repositorio" />
              </RoleGuard>
            } 
          />
          <Route 
            path="crm/tareas" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="CRM - Tareas">
                <CRM initialTab="Tareas" />
              </RoleGuard>
            } 
          />
          <Route 
            path="instituciones" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Instituciones">
                <Instituciones />
              </RoleGuard>
            } 
          />
          <Route 
            path="instituciones/dashboard" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Instituciones">
                <InstitucionesDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="instituciones/notificaciones" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Instituciones - Notificaciones">
                <InstitucionesNotificaciones />
              </RoleGuard>
            } 
          />
          <Route 
            path="instituciones/nueva" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Instituciones" action="create">
                <FormFormInstitucionGuard />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/dashboard" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Alumnos">
                <AlumnosDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/por-clase" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Clases">
                <AlumnosPorClase />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/extension" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos">
                <AlumnosExtension />
              </RoleGuard>
            } 
          />
          <Route 
            path="agentes" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Agentes">
                <Agentes />
              </RoleGuard>
            } 
          />
          <Route 
            path="clases" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Clases">
                <Clases />
              </RoleGuard>
            } 
          />
          <Route 
            path="clases/:id" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Clases">
                <ClaseDetail />
              </RoleGuard>
            } 
          />
          <Route 
            path="administracion" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Administración">
                <Administracion />
              </RoleGuard>
            } 
          />
          <Route 
            path="proveedores" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Proveedores">
                <Proveedores />
              </RoleGuard>
            } 
          />
          <Route 
            path="proveedores/servicios-extras" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Proveedores">
                <ServiciosExtras />
              </RoleGuard>
            } 
          />
          <Route 
            path="proveedores/:id" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Proveedores">
                <ProveedorDetail />
              </RoleGuard>
            } 
          />
          <Route 
            path="reportes" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Reportes">
                <Reportes />
              </RoleGuard>
            } 
          />
          <Route 
            path="finanzas" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Finanzas">
                <Finanzas />
              </RoleGuard>
            } 
          />
          <Route 
            path="catalogos" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Catálogos">
                <Catalogos />
              </RoleGuard>
            } 
          />
          <Route 
            path="configuracion" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Configuración">
                <Configuracion />
              </RoleGuard>
            } 
          />

          {/* Direct wild card fallback */}
          <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Simple wrapper so we can lazy guard newly instantiated institutions page
function FormFormInstitucionGuard() {
  return <FormInstitucion />;
}
