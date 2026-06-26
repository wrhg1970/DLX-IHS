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
import { Alumnos } from "./pages/Alumnos";
import { AlumnosDashboard } from "./pages/AlumnosDashboard";
import { AlumnosPorClase } from "./pages/AlumnosPorClase";
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
import { PermissionMenu, hasPermission } from "./utils/permissionCheck";

interface RoleGuardProps {
  allowedRoles: string[];
  fallbackTo: string;
  permission?: PermissionMenu;
  children: React.ReactElement;
}

function RoleGuard({ allowedRoles, fallbackTo, permission, children }: RoleGuardProps) {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Navigate to="/" replace />;
  
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={fallbackTo} replace />;
  }

  // Bypass extra permission check for Alumno and Coordinador basic access
  if (currentUser.role === "Alumno" || currentUser.role === "Coordinador") {
    return children;
  }

  if (permission && !hasPermission(currentUser.role, permission, "view")) {
    return <Navigate to={fallbackTo} replace />;
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
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos">
                <FormAlumno />
              </RoleGuard>
            } 
          />
          <Route 
            path="alumnos/editar/:id" 
            element={
              <RoleGuard allowedRoles={[...allRolesExceptStudentAndCoordinator, 'Coordinador']} fallbackTo={fallbackRoute} permission="Alumnos">
                <FormAlumno />
              </RoleGuard>
            } 
          />

          {/* Admin and other roles routes */}
          <Route 
            index 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Dashboard">
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
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Dashboard">
                <CRM />
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
            path="instituciones/nueva" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Instituciones">
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
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Alumnos">
                <AlumnosPorClase />
              </RoleGuard>
            } 
          />
          <Route 
            path="agentes" 
            element={
              <RoleGuard allowedRoles={allRolesExceptStudentAndCoordinator} fallbackTo={fallbackRoute} permission="Dashboard">
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
