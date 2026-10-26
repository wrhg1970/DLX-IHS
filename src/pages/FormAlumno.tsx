import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User, MapPin, Users, Mail, Phone, Calendar, Flag, Hash, Bell } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { hasPermission } from "../utils/permissionCheck";

const tabs = [
  "Información Personal",
  "Contacto y Nacimiento",
  "Dirección",
  "Padres y Tutores",
  "Notificaciones",
  "Becas"
];

export function FormAlumno() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const { institutions, students, addStudent, updateStudent, catalogs, currentUser, users } = useAppContext();

  const canAccess = isEditing 
    ? hasPermission(currentUser?.role, "Alumnos", "edit")
    : hasPermission(currentUser?.role, "Alumnos", "create");

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-3xl border border-slate-200">
        <div className="text-rose-500 font-extrabold text-lg mb-2">Acceso Denegado</div>
        <p className="text-slate-500 text-sm max-w-md">No tienes los permisos necesarios para {isEditing ? "editar" : "registrar"} un alumno. Contacta al administrador si crees que esto es un error.</p>
        <button onClick={() => navigate('/alumnos')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-indigo-700 transition">Volver a Alumnos</button>
      </div>
    );
  }

  const activeInstitutions = institutions.filter(inst => inst.active !== false);
  const defaultInstId = activeInstitutions[0]?.id || institutions[0]?.id || 1;

  const isAlumno = currentUser?.role === "Alumno";
  const isCoordinador = currentUser?.role === "Coordinador";

  const [activeTab, setActiveTab] = useState("Información Personal");

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    preferredName: '',
    gender: '',
    email: '',
    phone: '',
    birthDate: '',
    nationality: '',
    passport: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    parentName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    parentRelation: '',
    institutionId: isCoordinador ? (currentUser?.institutionId || defaultInstId) : defaultInstId,
    status: 'Activo',
    studentCustomId: '',
    modality: '',
    schoolYear: '',
    agentId: '',
    notificationPayment: {
      alumno: true,
      instituto: false,
      agente: false
    },
    notificationAcademic: {
      alumno: true,
      instituto: false,
      agente: false
    },
    hasScholarship: false,
    scholarshipType: 'Monto' as 'Monto' | 'Porcentaje',
    scholarshipValue: '',
    scholarshipTarget: 'Estudiante' as 'Estudiante' | 'Escuela'
  });

  useEffect(() => {
    if (isEditing) {
      const student = students.find(s => s.id === Number(id));
      if (student) {
        setFormData({
          name: student.name || '',
          lastName: student.lastName || '',
          preferredName: student.preferredName || '',
          gender: student.gender || '',
          email: student.email || '',
          phone: student.phone || '',
          birthDate: student.birthDate || '',
          nationality: student.nationality || '',
          passport: student.passport || '',
          address: student.address || '',
          city: student.city || '',
          state: student.state || '',
          zipCode: student.zipCode || '',
          country: student.country || '',
          parentName: student.parentName || '',
          parentLastName: student.parentLastName || '',
          parentEmail: student.parentEmail || '',
          parentPhone: student.parentPhone || '',
          parentRelation: student.parentRelation || '',
          institutionId: isCoordinador ? (currentUser?.institutionId || defaultInstId) : (student.institutionId || defaultInstId),
          status: student.status || 'Activo',
          studentCustomId: student.studentCustomId || '',
          modality: student.modality || '',
          schoolYear: student.schoolYear || '',
          agentId: student.agentId ? student.agentId.toString() : '',
          notificationPayment: student.notificationPayment || {
            alumno: true,
            instituto: false,
            agente: false
          },
          notificationAcademic: student.notificationAcademic || {
            alumno: true,
            instituto: false,
            agente: false
          },
          hasScholarship: student.hasScholarship || false,
          scholarshipType: student.scholarshipType || 'Monto',
          scholarshipValue: student.scholarshipValue !== undefined ? student.scholarshipValue.toString() : '',
          scholarshipTarget: student.scholarshipTarget || 'Estudiante'
        });
      }
    } else if (isCoordinador && currentUser?.institutionId) {
      setFormData(prev => ({ ...prev, institutionId: currentUser.institutionId }));
    }
  }, [id, isEditing, students, institutions, isCoordinador, currentUser, defaultInstId]);

  const isHomeschool = (formData.modality || '').trim().toLowerCase() === 'homeschool';
  const showHomeschoolFields = !isEditing 
    ? isHomeschool 
    : (isHomeschool || Boolean(formData.phone || formData.passport || formData.address || formData.parentPhone));

  const visibleTabs = tabs.filter(tab => tab !== "Dirección" || showHomeschoolFields);

  useEffect(() => {
    if (!showHomeschoolFields && activeTab === "Dirección") {
      setActiveTab("Información Personal");
    }
  }, [showHomeschoolFields, activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      phone: (!isEditing && !isHomeschool) ? '' : formData.phone,
      passport: (!isEditing && !isHomeschool) ? '' : formData.passport,
      address: (!isEditing && !isHomeschool) ? '' : formData.address,
      city: (!isEditing && !isHomeschool) ? '' : formData.city,
      state: (!isEditing && !isHomeschool) ? '' : formData.state,
      zipCode: (!isEditing && !isHomeschool) ? '' : formData.zipCode,
      country: (!isEditing && !isHomeschool) ? '' : formData.country,
      parentPhone: (!isEditing && !isHomeschool) ? '' : formData.parentPhone,
      institutionId: Number(formData.institutionId),
      agentId: formData.agentId ? Number(formData.agentId) : undefined,
      hasScholarship: formData.hasScholarship,
      scholarshipType: formData.scholarshipType,
      scholarshipValue: formData.scholarshipValue ? Number(formData.scholarshipValue) : 0,
      scholarshipTarget: formData.scholarshipTarget
    };
    if (isEditing) {
      updateStudent(Number(id), cleanData);
    } else {
      addStudent(cleanData);
    }
    navigate(isEditing ? `/alumnos/${id}` : '/alumnos');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-4">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={() => navigate(isEditing ? `/alumnos/${id}` : '/alumnos')}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {isEditing ? "Editar Alumno" : "Registrar Alumno"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isEditing ? "Actualiza los detalles del estudiante." : "Completa los detalles del nuevo estudiante."}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            type="button"
            onClick={() => navigate(isEditing ? `/alumnos/${id}` : '/alumnos')}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </button>
        </div>
      </div>

      <div className="flex-1 flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-0">
        {/* Sidebar Nav */}
        <div className="w-56 bg-slate-50 border-r border-slate-100 flex flex-col pt-2 shrink-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`text-left px-5 py-3 text-xs font-bold tracking-wide uppercase transition-colors border-l-2 ${
                activeTab === tab
                  ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                  : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
                  {activeTab === "Información Personal" && (
            <div className="max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre(s) *</label>
                  <input required name="name" value={formData.name} onChange={handleChange} disabled={isAlumno} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Apellidos *</label>
                  <input required name="lastName" value={formData.lastName} onChange={handleChange} disabled={isAlumno} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Preferred Name <User className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="preferredName" value={formData.preferredName} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sexo</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} disabled={isAlumno} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="No Binario">No Binario</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ID/Username</label>
                  <input name="studentCustomId" value={formData.studentCustomId} onChange={handleChange} disabled={isAlumno} placeholder="Ej. STU-10801" type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Modalidad</label>
                  <select name="modality" value={formData.modality} onChange={handleChange} disabled={isAlumno} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
                    <option value="">Seleccionar modalidad...</option>
                    {(catalogs['Modalidades'] || []).map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  {!isEditing && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isHomeschool 
                        ? "Modalidad Homeschool: habilitados campos de Teléfono Móvil, Pasaporte/ID, Dirección y Teléfono Celular de emergencia." 
                        : "Solo en modalidad Homeschool se solicitan Teléfono Móvil, Pasaporte/ID, Dirección y Teléfono Celular de emergencia."}
                    </p>
                  )}
                </div>
                {(formData.modality?.toLowerCase() === 'homeschool' || formData.modality === 'Homeschool') && (
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Agente *</label>
                    <select name="agentId" value={formData.agentId} onChange={handleChange} required className="w-full border border-indigo-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="">Seleccionar agente...</option>
                      {users
                        .filter(u => u.role === 'Agente' || u.role === 'Vendedor')
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Grado Escolar</label>
                  <input name="schoolYear" value={formData.schoolYear} onChange={handleChange} disabled={isAlumno} placeholder="Ej. 10º Grado" type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Institución Origen *</label>
                <select name="institutionId" value={formData.institutionId} onChange={handleChange} disabled={isCoordinador || isAlumno} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
                  {[...institutions]
                    .filter(inst => inst.active !== false || inst.id === Number(formData.institutionId))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
                    .map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} {inst.active === false ? " (Inactiva)" : ""}
                      </option>
                    ))}
                </select>
              </div>

            </div>
          )}

          {activeTab === "Contacto y Nacimiento" && (
            <div className="max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className={showHomeschoolFields ? "" : "col-span-2"}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Correo Electrónico <Mail className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                {showHomeschoolFields && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                      Teléfono Móvil <Phone className="w-3 h-3 ml-1 text-slate-400" />
                    </label>
                    <input name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Fecha Nacimiento <Calendar className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="birthDate" value={formData.birthDate} onChange={handleChange} type="date" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Nacionalidad <Flag className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="nationality" value={formData.nationality} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                {showHomeschoolFields && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                      Pasaporte / ID # <Hash className="w-3 h-3 ml-1 text-slate-400" />
                    </label>
                    <input name="passport" value={formData.passport} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" />
                  </div>
                )}
              </div>
            </div>
          )}

          {showHomeschoolFields && activeTab === "Dirección" && (
            <div className="max-w-2xl space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Calle y Número <MapPin className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="address" value={formData.address} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ciudad</label>
                  <input name="city" value={formData.city} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado</label>
                  <input name="state" value={formData.state} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Código Postal (CP)</label>
                  <input name="zipCode" value={formData.zipCode} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">País</label>
                  <input name="country" value={formData.country} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "Padres y Tutores" && (
            <div className="max-w-2xl space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-lg mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Contacto de Emergencia / Tutor 1</h3>
                    <p className="text-xs text-slate-500">Principal responsable del estudiante</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre(s)</label>
                  <input name="parentName" value={formData.parentName} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Apellidos</label>
                  <input name="parentLastName" value={formData.parentLastName} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Relación / Parentesco</label>
                  <select name="parentRelation" value={formData.parentRelation} onChange={handleChange} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Seleccionar...</option>
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className={showHomeschoolFields ? "" : "col-span-2"}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                      Correo Electrónico <Mail className="w-3 h-3 ml-1 text-slate-400" />
                    </label>
                    <input name="parentEmail" value={formData.parentEmail} onChange={handleChange} type="email" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  {showHomeschoolFields && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                        Teléfono Celular <Phone className="w-3 h-3 ml-1 text-slate-400" />
                      </label>
                      <input name="parentPhone" value={formData.parentPhone} onChange={handleChange} type="tel" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Notificaciones" && (
            <div className="max-w-2xl space-y-6 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start space-x-3">
                <Bell className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Canales de Envíos Directos</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Configura quiénes deben recibir cada tipo de alerta. Esto filtra a quiénes les llega una notificación y garantiza que sólo las alertas de "Alumno" lleguen al estudiante de forma directa.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Notificación de Pago */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Notificación de Pago</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Destinatarios que recibirán recordatorios de deudas, colegiaturas y avisos de cobro.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationPayment.alumno}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPayment: {
                            ...prev.notificationPayment,
                            alumno: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Alumno</p>
                        <p className="text-[10px] text-slate-400">Recibe directo</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationPayment.instituto}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPayment: {
                            ...prev.notificationPayment,
                            instituto: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Instituto</p>
                        <p className="text-[10px] text-slate-400">Notifica a institución</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationPayment.agente}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPayment: {
                            ...prev.notificationPayment,
                            agente: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Agente</p>
                        <p className="text-[10px] text-slate-400">Notifica a agente/asesor</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notificación Académica */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Notificación Académica</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Destinatarios que recibirán notas, reportes y avisos de progreso escolar.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationAcademic.alumno}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationAcademic: {
                            ...prev.notificationAcademic,
                            alumno: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Alumno</p>
                        <p className="text-[10px] text-slate-400">Recibe directo</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationAcademic.instituto}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationAcademic: {
                            ...prev.notificationAcademic,
                            instituto: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Instituto</p>
                        <p className="text-[10px] text-slate-400">Notifica a institución</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.notificationAcademic.agente}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationAcademic: {
                            ...prev.notificationAcademic,
                            agente: e.target.checked
                          }
                        }))}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Agente</p>
                        <p className="text-[10px] text-slate-400">Notifica a agente/asesor</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Becas" && (
            <div className="max-w-2xl space-y-6 animate-in fade-in">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start space-x-3 mb-6">
                <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Administración de Becas</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Configura descuentos especiales para este estudiante. Las becas pueden ser de monto fijo (USD) o de un porcentaje que se deducirá de los montos correspondientes del estudiante o la escuela.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Toggle de Beca */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Activar Beca</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Habilita o deshabilita la beca para este alumno.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, hasScholarship: !prev.hasScholarship }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.hasScholarship ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        formData.hasScholarship ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formData.hasScholarship && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Tipo de Beca */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo de Beca</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, scholarshipType: 'Monto' }))}
                            className={`p-3 text-xs font-bold border rounded-lg transition-all ${
                              formData.scholarshipType === 'Monto'
                                ? 'border-indigo-650 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            Monto Fijo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, scholarshipType: 'Porcentaje' }))}
                            className={`p-3 text-xs font-bold border rounded-lg transition-all ${
                              formData.scholarshipType === 'Porcentaje'
                                ? 'border-indigo-650 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            Porcentaje (%)
                          </button>
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {formData.scholarshipType === 'Porcentaje' ? 'Porcentaje de Beca (%)' : 'Monto de Beca (USD)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                            {formData.scholarshipType === 'Porcentaje' ? '%' : '$'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={formData.scholarshipType === 'Porcentaje' ? "100" : undefined}
                            step="any"
                            name="scholarshipValue"
                            value={formData.scholarshipValue}
                            onChange={handleChange}
                            placeholder={formData.scholarshipType === 'Porcentaje' ? 'Ej. 20' : 'Ej. 150'}
                            className="w-full border border-slate-200 rounded p-2 pl-7 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={formData.hasScholarship}
                          />
                        </div>
                      </div>

                      {/* Beneficiario de Beca (A quién se le aplica) */}
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Aplicar Beca a (Se descuenta de)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition ${
                            formData.scholarshipTarget === 'Estudiante'
                              ? 'border-indigo-650 bg-indigo-50/50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="scholarshipTarget"
                              value="Estudiante"
                              checked={formData.scholarshipTarget === 'Estudiante'}
                              onChange={() => setFormData(prev => ({ ...prev, scholarshipTarget: 'Estudiante' }))}
                              className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Estudiante</p>
                              <p className="text-[10px] text-slate-400 font-semibold">Se deduce del pago del Estudiante (Colegiatura / Programa)</p>
                            </div>
                          </label>

                          <label className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition ${
                            formData.scholarshipTarget === 'Escuela'
                              ? 'border-indigo-650 bg-indigo-50/50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="scholarshipTarget"
                              value="Escuela"
                              checked={formData.scholarshipTarget === 'Escuela'}
                              onChange={() => setFormData(prev => ({ ...prev, scholarshipTarget: 'Escuela' }))}
                              className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Escuela (Institución)</p>
                              <p className="text-[10px] text-slate-400 font-semibold">Se deduce de lo que la Escuela tiene que pagar por el alumno</p>
                            </div>
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </form>
  );
}
