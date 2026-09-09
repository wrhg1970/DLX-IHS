import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Lock, GraduationCap, DollarSign } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { PermissionMenu } from '../../utils/permissionCheck';

interface AccessDeniedProps {
  permission?: PermissionMenu;
  action?: string;
  fallbackTo?: string;
  message?: string;
}

export function AccessDenied({ permission, action = 'view', fallbackTo = '/', message }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const role = currentUser?.role || 'Invitado';
  const isAcademicRole = ['academia', 'académico', 'academico', 'coordinador académico'].includes(role.toLowerCase().trim());
  const isFinancialRole = ['finanzas', 'administrativo', 'administración', 'administracion', 'director financiero'].includes(role.toLowerCase().trim());

  const actionLabel = action === 'create' ? 'crear registros en' : action === 'edit' ? 'modificar datos de' : action === 'delete' ? 'eliminar en' : 'visualizar';

  return (
    <div id="access-denied-container" className="flex-1 min-h-[500px] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Shield Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Acceso Restringido
        </h2>
        
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {message || (
            <>
              No cuentas con los permisos requeridos para {actionLabel} el módulo{' '}
              <span className="font-semibold text-slate-800">{permission || 'solicitado'}</span>.
            </>
          )}
        </p>

        {/* Role and Policy Details Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Tu rol activo:</span>
            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {role}
            </span>
          </div>

          <div className="h-px bg-slate-200/60" />

          <div className="text-xs text-slate-600 leading-relaxed flex items-start space-x-2.5">
            {isAcademicRole ? (
              <>
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Política de Separación de Funciones:</strong> El perfil <em>Académico</em> gestiona planes de estudio, acreditaciones y seguimiento de estudiantes. Toda información financiera, cobros, facturación y conciliación administrativa está restringida al departamento Administrativo.
                </span>
              </>
            ) : isFinancialRole ? (
              <>
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Política de Separación de Funciones:</strong> El perfil <em>Administrativo / Finanzas</em> supervisa la tesorería, cobros y facturación institucional. Las asignaturas, currícula y acreditaciones académicas están restringidas al departamento Académico.
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Este módulo está restringido de acuerdo con la matriz de roles y permisos configurada en el sistema. Solicita acceso a tu Superadministrador si requieres autorización.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-access-denied-back"
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver atrás</span>
          </button>
          
          <button
            id="btn-access-denied-home"
            type="button"
            onClick={() => navigate(fallbackTo)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Inicio</span>
          </button>
        </div>

      </div>
    </div>
  );
}
