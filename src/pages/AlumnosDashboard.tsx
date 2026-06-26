import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  GraduationCap, 
  Users, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  Building2, 
  Award, 
  Calendar,
  Filter,
  X,
  TrendingUp,
  Mail,
  SlidersHorizontal
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export function AlumnosDashboard() {
  const { students, enrollments, classes, institutions, providers } = useAppContext();
  const navigate = useNavigate();

  // Filter states
  const [selectedInstId, setSelectedInstId] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filtered Students & Enrollments
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (selectedInstId !== 'all' && student.institutionId !== Number(selectedInstId)) {
        return false;
      }
      if (selectedGender !== 'all' && student.gender?.toLowerCase() !== selectedGender.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'all' && student.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [students, selectedInstId, selectedGender, selectedStatus]);

  const filteredStudentIds = useMemo(() => new Set(filteredStudents.map(s => s.id)), [filteredStudents]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(e => filteredStudentIds.has(e.studentId));
  }, [enrollments, filteredStudentIds]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredStudents.length;
    const active = filteredStudents.filter(s => s.status?.toLowerCase().includes('act')).length;
    const inactive = filteredStudents.filter(s => s.status?.toLowerCase().includes('inac') || s.status?.toLowerCase().includes('baja')).length;
    
    // Students enrolled in at least one class
    const withEnrollments = filteredStudents.filter(s => 
      enrollments.some(e => e.studentId === s.id)
    ).length;

    const totalInscriptions = filteredEnrollments.length;
    const activeInscriptions = filteredEnrollments.filter(e => e.status === 'Active').length;

    return {
      total,
      active,
      inactive,
      withEnrollments,
      totalInscriptions,
      activeInscriptions
    };
  }, [filteredStudents, filteredEnrollments, enrollments]);

  // Chart Data: Students per Institution
  const studentsPerInstitutionData = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredStudents.forEach(s => {
      counts[s.institutionId] = (counts[s.institutionId] || 0) + 1;
    });

    return Object.entries(counts).map(([instId, count]) => {
      const dbInst = institutions.find(i => i.id === Number(instId));
      return {
        name: dbInst?.name || `Inst. ID ${instId}`,
        colegio: dbInst?.commercialName || dbInst?.name || `ID ${instId}`,
        alumnos: count
      };
    }).sort((a, b) => b.alumnos - a.alumnos);
  }, [filteredStudents, institutions]);

  // Chart Data: Enrollments per Class
  const classEnrollmentData = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredEnrollments.forEach(e => {
      counts[e.classId] = (counts[e.classId] || 0) + 1;
    });

    return Object.entries(counts).map(([cId, count]) => {
      const cls = classes.find(c => c.id === Number(cId));
      return {
        name: cls?.name || `Clase ID ${cId}`,
        inscritos: count
      };
    }).sort((a, b) => b.inscritos - a.inscritos).slice(0, 10);
  }, [filteredEnrollments, classes]);

  // Chart Data: School Year (Grado) Distribution
  const schoolYearData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const yr = s.schoolYear || 'Sin especificar';
      counts[yr] = (counts[yr] || 0) + 1;
    });

    return Object.entries(counts).map(([yr, count]) => ({
      name: yr,
      alumnos: count
    })).sort((a, b) => b.alumnos - a.alumnos);
  }, [filteredStudents]);

  // Chart Data: Student Status (Progress breakdown)
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const st = s.status || 'Sin Estado';
      counts[st] = (counts[st] || 0) + 1;
    });

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }));
  }, [filteredStudents]);

  // Gender Distribution
  const genderDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const g = s.gender || 'Sin especificar';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredStudents]);

  // Nationality Top count
  const topNationalities = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      if (s.nationality) counts[s.nationality] = (counts[s.nationality] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredStudents]);

  // Recent Enrollments (Last 5)
  const recentEnrollmentsMapped = useMemo(() => {
    // Sort recent enrollments. Since we don't have auto timestamp parsed, 
    // we can sort by enrollment ID descending (highest ID usually means newer)
    const sorted = [...filteredEnrollments].sort((a, b) => b.id - a.id).slice(0, 5);
    return sorted.map(e => {
      const student = students.find(s => s.id === e.studentId);
      const cls = classes.find(c => c.id === e.classId);
      return {
        id: e.id,
        studentName: student ? `${student.name} ${student.lastName || ''}`.trim() : 'Estudiante Desconocido',
        studentId: e.studentId,
        className: cls?.name || 'Clase Desconocida',
        classId: e.classId,
        date: e.enrollmentDate || e.startDate || 'Sin fecha',
        status: e.status || 'Active',
        price: e.price || 0
      };
    });
  }, [filteredEnrollments, students, classes]);

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Filtros Avanzados del Dashboard</span>
          </div>
          {(selectedInstId !== 'all' || selectedGender !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSelectedInstId('all');
                setSelectedGender('all');
                setSelectedStatus('all');
              }}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Quitar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Institution Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Filtro de Institución</label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Todas las Instituciones (Global)</option>
              {[...institutions].sort((a, b) => (a.commercialName || a.name || '').localeCompare(b.commercialName || b.name || '', 'es')).map(inst => (
                <option key={inst.id} value={inst.id}>{inst.commercialName || inst.name}</option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Género del Alumno</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Cualquier Género</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
              <option value="Sin especificar">No especificado</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estatus Administrativo</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/70 transition outline-none text-slate-700"
            >
              <option value="all">Cualquier Estatus</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Alumnos Registrados</p>
            <span className="text-3xl font-light text-slate-800 tracking-tight">{kpis.total.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">Alumnos en el segmento actual</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Alumnos Activos</p>
            <span className="text-3xl font-light text-emerald-600 tracking-tight">{kpis.active.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">
              {kpis.total > 0 ? `${((kpis.active / kpis.total) * 100).toFixed(1)}%` : '0%'} del total
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Alumnos Inscritos</p>
            <span className="text-3xl font-light text-indigo-600 tracking-tight">{kpis.withEnrollments.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">
               {kpis.total > 0 ? `${((kpis.withEnrollments / kpis.total) * 100).toFixed(1)}%` : '0%'} con clases
            </p>
          </div>
          <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Inscripciones Activas</p>
            <span className="text-3xl font-light text-blue-600 tracking-tight">{kpis.activeInscriptions.toLocaleString()}</span>
            <p className="text-[10px] text-slate-400 mt-1">
              De {kpis.totalInscriptions} inscripciones históricas
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart A: Alumnos por Institución */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Alumnos por Institución de Origen</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Concentración de matrícula estudiantil en colegios y universidades</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            {studentsPerInstitutionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Sin datos que mostrar con los filtros aplicados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsPerInstitutionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="colegio" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="alumnos" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28}>
                    {studentsPerInstitutionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Clases con más Inscripciones */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Clases de Mayor Popularidad (Top 10)</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Inscripciones confirmadas por curso académico</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            {classEnrollmentData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Sin inscripciones registradas en el segmento actual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classEnrollmentData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="#94a3b8" width={90} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="inscritos" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel 1: Estatus de Alumnos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Segmentación Administrativa</h4>
            <div className="space-y-3.5">
              {statusDistribution.map((item, index) => {
                const percentage = kpis.total > 0 ? ((item.value / kpis.total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-900 font-bold">{item.value} <span className="text-slate-400 text-[10px] font-normal">({percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
              {statusDistribution.length === 0 && (
                <p className="text-slate-400 text-xs italic">No hay alumnos registrados.</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Años escolares y Grados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Distribución por Año Escolar</h4>
            <div className="space-y-3 max-h-[220px] overflow-auto pr-1">
              {schoolYearData.slice(0, 6).map((item) => {
                const percentage = kpis.total > 0 ? ((item.alumnos / kpis.total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-600 font-sans">{item.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400">({percentage}%)</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 min-w-8 text-center px-1.5 py-0.5 rounded">{item.alumnos}</span>
                    </div>
                  </div>
                );
              })}
              {schoolYearData.length === 0 && (
                <p className="text-slate-400 text-xs italic text-center py-6">Sin registros de año escolar</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Demográficos claves (Nacionalidad y Género) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Nacionalidad de Alumnos</h4>
              <div className="flex flex-wrap gap-1.5">
                {topNationalities.map(n => (
                  <span key={n.name} className="inline-flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 text-indigo-700 font-bold text-[10px] px-2 py-1 rounded">
                    🌎 {n.name} ({n.count})
                  </span>
                ))}
                {topNationalities.length === 0 && (
                  <p className="text-slate-400 text-[11px] italic">Sin especificación disponible</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Distribución de Género</h4>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                {genderDistribution.map(g => (
                  <div key={g.name} className="p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{g.name}</p>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{g.value}</p>
                  </div>
                ))}
                {genderDistribution.length === 0 && (
                  <p className="text-slate-400 text-[11px] italic col-span-2">Sin datos de género</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Enrollments Stream / Historial */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Inscripciones Recientes</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Últimas inscripciones de clases académicas sincronizadas en el sistema</p>
          </div>
          <button 
            onClick={() => navigate('/alumnos')}
            className="text-indigo-600 hover:text-indigo-800 font-bold uppercase text-[10px] tracking-widest border border-indigo-100 hover:bg-slate-50 px-3 py-1.5 rounded transition"
          >
            Ver Todos los Alumnos →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Alumno</th>
                <th className="px-6 py-3">Clase Académica</th>
                <th className="px-6 py-3">Fecha Inscripción</th>
                <th className="px-6 py-3 text-right">Precio Pactado</th>
                <th className="px-6 py-3 text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentEnrollmentsMapped.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    No se han registrado inscripciones en este segmento estudiantil.
                  </td>
                </tr>
              ) : (
                recentEnrollmentsMapped.map((rec) => (
                  <tr 
                    key={rec.id}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                    onClick={() => navigate(`/alumnos/${rec.studentId}`)}
                  >
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        📚 {rec.className}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                      {rec.date}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-medium text-slate-800">
                      ${rec.price.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        rec.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        rec.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border border-indigo-105' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {rec.status === 'Active' ? 'Activo' : rec.status === 'Completed' ? 'Completado' : 'Cancelado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
