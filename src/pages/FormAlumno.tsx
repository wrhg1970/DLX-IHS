import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User, MapPin, Users, Mail, Phone, Calendar, Flag, Hash, Bell } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const tabs = [
  "Información Personal",
  "Contacto y Nacimiento",
  "Dirección",
  "Padres y Tutores",
  "Notificaciones"
];

export function FormAlumno() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const { institutions, students, addStudent, updateStudent, catalogs, currentUser } = useAppContext();
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
    notificationPayment: {
      alumno: true,
      instituto: false,
      agente: false
    },
    notificationAcademic: {
      alumno: true,
      instituto: false,
      agente: false
    }
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
          notificationPayment: student.notificationPayment || {
            alumno: true,
            instituto: false,
            agente: false
          },
          notificationAcademic: student.notificationAcademic || {
            alumno: true,
            instituto: false,
            agente: false
          }
        });
      }
    } else if (isCoordinador && currentUser?.institutionId) {
      setFormData(prev => ({ ...prev, institutionId: currentUser.institutionId }));
    }
  }, [id, isEditing, students, institutions, isCoordinador, currentUser, defaultInstId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateStudent(Number(id), { ...formData, institutionId: Number(formData.institutionId) });
    } else {
      addStudent({ ...formData, institutionId: Number(formData.institutionId) });
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
          {tabs.map((tab) => (
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">ID Estudiante</label>
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
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Año Escolar</label>
                  <input name="schoolYear" value={formData.schoolYear} onChange={handleChange} disabled={isAlumno} placeholder="Ej. 10º Grado" type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Institución Origen *</label>
                <select name="institutionId" value={formData.institutionId} onChange={handleChange} disabled={isCoordinador || isAlumno} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed">
                  {institutions
                    .filter(inst => inst.active !== false || inst.id === Number(formData.institutionId))
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Correo Electrónico * <Mail className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Teléfono Móvil <Phone className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                </div>
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
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                    Pasaporte / ID <Hash className="w-3 h-3 ml-1 text-slate-400" />
                  </label>
                  <input name="passport" value={formData.passport} onChange={handleChange} type="text" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "Dirección" && (
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                      Correo Electrónico <Mail className="w-3 h-3 ml-1 text-slate-400" />
                    </label>
                    <input name="parentEmail" value={formData.parentEmail} onChange={handleChange} type="email" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                      Teléfono Célular <Phone className="w-3 h-3 ml-1 text-slate-400" />
                    </label>
                    <input name="parentPhone" value={formData.parentPhone} onChange={handleChange} type="tel" className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                  </div>
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

        </div>
      </div>
    </form>
  );
}
