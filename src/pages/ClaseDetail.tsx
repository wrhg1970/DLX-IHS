import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, BookOpen, Calendar, Edit2, Download, GraduationCap, Users, Globe, Trash2, 
  CheckCircle2, XCircle, Clock, Award, Check, Search, Filter, AlertCircle, Archive, ArchiveRestore, X
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useAppContext, Enrollment, CourseGradeOutcome } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { hasPermission } from "../utils/permissionCheck";

export function ClaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    classes, students, institutions, enrollments, updateClass, deleteClass, 
    updateEnrollment, deleteEnrollment, providers, providerProductServices, currentUser 
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState("Información General");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Grade outcome modal state
  const [editingGradeEnrollment, setEditingGradeEnrollment] = useState<Enrollment | null>(null);
  const [gradeFormData, setGradeFormData] = useState<{
    gradeOutcome: CourseGradeOutcome;
    finalGrade: string;
    gradeDate: string;
    gradeNotes: string;
  }>({
    gradeOutcome: 'Pendiente',
    finalGrade: '',
    gradeDate: '',
    gradeNotes: '',
  });

  // Table filtering and selection state in enrolled students tab
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'Pass' | 'Fail' | 'Pendiente'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  
  const curso = classes.find(c => c.id === Number(id));
  
  const [formData, setFormData] = useState({
    name: curso?.name || '',
    code: curso?.code || '',
    creditType: curso?.creditType || 'Crédito completo' as 'Crédito completo' | 'Medio Crédito' | 'Crédito completo AP' | 'Medio Crédito AP',
    syllabus: curso?.syllabus || '',
    validity: curso?.validity || '',
    providerId: curso?.providerId || '',
    isArchived: curso?.isArchived || false,
  });

  const [countryRates, setCountryRates] = useState<Array<{ country: string; price: string; cost: string }>>([]);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryPrice, setNewCountryPrice] = useState('');
  const [newCountryCost, setNewCountryCost] = useState('');

  if (!curso) {
    return <div className="p-8 text-center text-slate-500">Clase no encontrada</div>;
  }

  const courseEnrollments = enrollments.filter(e => Number(e.classId) === Number(curso.id));

  const getStudentInfo = (studentId: number) => {
    const s = students.find(s => s.id === studentId);
    if (!s) return null;
    const inst = institutions.find(i => i.id === s.institutionId);
    return { ...s, instName: inst?.name || "Desconocida" };
  };

  // Outcome statistics for this course
  const totalCount = courseEnrollments.length;
  const passCount = courseEnrollments.filter(e => e.gradeOutcome === 'Pass').length;
  const failCount = courseEnrollments.filter(e => e.gradeOutcome === 'Fail').length;
  const pendingCount = courseEnrollments.filter(e => !e.gradeOutcome || e.gradeOutcome === 'Pendiente').length;
  const passRate = totalCount > 0 && (passCount + failCount > 0) 
    ? Math.round((passCount / (passCount + failCount)) * 100) 
    : 0;

  // Filtered enrolled students
  const filteredCourseEnrollments = useMemo(() => {
    return courseEnrollments.filter(env => {
      // Outcome filter
      const outcome = env.gradeOutcome || 'Pendiente';
      if (outcomeFilter !== 'all' && outcome !== outcomeFilter) {
        return false;
      }
      // Search filter
      if (searchStudent.trim() !== '') {
        const query = searchStudent.toLowerCase();
        const sti = getStudentInfo(env.studentId);
        const nameMatch = sti ? `${sti.name} ${sti.lastName || ''}`.toLowerCase().includes(query) : false;
        const codeMatch = sti ? `stu-108${sti.id}`.toLowerCase().includes(query) : false;
        const instMatch = sti ? sti.instName.toLowerCase().includes(query) : false;
        return nameMatch || codeMatch || instMatch;
      }
      return true;
    });
  }, [courseEnrollments, outcomeFilter, searchStudent, students, institutions]);

  // Quick set outcome for a single enrollment
  const handleQuickSetOutcome = (enrollmentId: number, outcome: CourseGradeOutcome) => {
    const updateData: Partial<Enrollment> = {
      gradeOutcome: outcome,
      ...(outcome === 'Pass' || outcome === 'Fail' ? {
        gradeDate: new Date().toISOString().split('T')[0],
      } : {})
    };
    updateEnrollment(enrollmentId, updateData);
  };

  // Open detailed grade edit modal
  const handleOpenGradeModal = (env: Enrollment) => {
    setEditingGradeEnrollment(env);
    setGradeFormData({
      gradeOutcome: env.gradeOutcome || 'Pendiente',
      finalGrade: env.finalGrade || '',
      gradeDate: env.gradeDate || new Date().toISOString().split('T')[0],
      gradeNotes: env.gradeNotes || '',
    });
  };

  // Submit grade edit modal
  const handleSaveGradeModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGradeEnrollment) return;

    updateEnrollment(editingGradeEnrollment.id, {
      gradeOutcome: gradeFormData.gradeOutcome,
      finalGrade: gradeFormData.finalGrade.trim() || undefined,
      gradeDate: gradeFormData.gradeDate || undefined,
      gradeNotes: gradeFormData.gradeNotes.trim() || undefined,
    });

    setEditingGradeEnrollment(null);
  };

  // Bulk set outcome for all selected students
  const handleBulkSetOutcome = (outcome: CourseGradeOutcome) => {
    if (selectedEnrollmentIds.length === 0) return;
    
    selectedEnrollmentIds.forEach(id => {
      updateEnrollment(id, {
        gradeOutcome: outcome,
        ...(outcome === 'Pass' || outcome === 'Fail' ? {
          gradeDate: new Date().toISOString().split('T')[0],
        } : {})
      });
    });

    const count = selectedEnrollmentIds.length;
    const label = outcome === 'Pass' ? 'Aprobados (Pass)' : outcome === 'Fail' ? 'Reprobados (Fail)' : 'Pendientes';
    setBulkFeedback(`Se marcaron ${count} estudiantes como ${label}.`);
    setSelectedEnrollmentIds([]);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollmentIds(filteredCourseEnrollments.map(e => e.id));
    } else {
      setSelectedEnrollmentIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedEnrollmentIds(prev => [...prev, id]);
    } else {
      setSelectedEnrollmentIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleOpenEditModal = () => {
    setFormData({
      name: curso.name || '',
      code: curso.code || '',
      creditType: curso.creditType || 'Crédito completo',
      syllabus: curso.syllabus || '',
      validity: curso.validity || '',
      providerId: curso.providerId || '',
      isArchived: curso.isArchived || false,
    });
    
    // Map existing countryRates Record to Array format
    const mappedRates: Array<{ country: string; price: string; cost: string }> = [];
    if (curso.countryRates) {
      Object.entries(curso.countryRates).forEach(([country, info]) => {
        const infoCast = info as { price: string; cost: string };
        mappedRates.push({
          country,
          price: infoCast.price || '0',
          cost: infoCast.cost || '0'
        });
      });
    }
    setCountryRates(mappedRates);
    setNewCountryName('');
    setNewCountryPrice('');
    setNewCountryCost('');
    setIsEditModalOpen(true);
  };

  const loadRatesFromProvider = () => {
    if (!formData.providerId) return;
    const selectedProvId = Number(formData.providerId);
    const serviceClass = providerProductServices?.find(
      ps => ps.providerId === selectedProvId && ['clase', 'clases'].includes(ps.productType.toLowerCase())
    );
    if (serviceClass && serviceClass.countryPrices) {
      const mappedRates = serviceClass.countryPrices.map(cp => {
        let price = '0';
        let cost = '0';
        if (formData.creditType === 'Crédito completo') {
          price = cp.priceFullCredit;
          cost = cp.costFullCredit;
        } else if (formData.creditType === 'Medio Crédito') {
          price = cp.priceHalfCredit;
          cost = cp.costHalfCredit;
        } else if (formData.creditType === 'Crédito completo AP') {
          price = cp.priceFullApCredit;
          cost = cp.costFullApCredit;
        } else if (formData.creditType === 'Medio Crédito AP') {
          price = cp.priceHalfApCredit;
          cost = cp.costHalfApCredit;
        }
        return {
          country: cp.country,
          price: price || '0',
          cost: cost || '0'
        };
      });
      setCountryRates(mappedRates);
    }
  };

  const handleAddCountryRate = () => {
    if (!newCountryName.trim()) return;
    setCountryRates(prev => [
      ...prev,
      { country: newCountryName.trim(), price: newCountryPrice || '0', cost: newCountryCost || '0' }
    ]);
    setNewCountryName('');
    setNewCountryPrice('');
    setNewCountryCost('');
  };

  const handleRemoveCountryRate = (index: number) => {
    setCountryRates(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRateChange = (index: number, field: 'price' | 'cost', value: string) => {
    setCountryRates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform Array back to Record
    const ratesMap: Record<string, { price: string; cost: string }> = {};
    countryRates.forEach(r => {
      ratesMap[r.country] = {
        price: r.price,
        cost: r.cost
      };
    });

    updateClass(curso.id, {
      ...formData,
      providerId: formData.providerId ? Number(formData.providerId) : undefined,
      countryRates: ratesMap
    });
    setToastMessage("Clase actualizada correctamente.");
    setIsEditModalOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDelete = () => {
    if (window.confirm("¿Está seguro de que desea eliminar esta clase? Esta acción desvinculará a los alumnos inscritos.")) {
      deleteClass(curso.id);
      navigate("/clases");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={() => navigate('/clases')}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <h2 className="text-xl font-bold text-slate-900">{curso.name}</h2>
              {curso.isArchived && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide">
                  <Archive className="w-3.5 h-3.5 text-amber-700" /> Clase Archivada
                </span>
              )}
              {curso.code && (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {curso.code}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center"><GraduationCap className="w-3.5 h-3.5 mr-1" /> {curso.creditType}</span>
              <span>•</span>
              <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> {courseEnrollments.length} alumnos inscritos</span>
              {passCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" /> {passCount} Aprobados (Pass)
                  </span>
                </>
              )}
              {failCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-700 font-semibold flex items-center">
                    <XCircle className="w-3 h-3 mr-0.5 text-rose-600" /> {failCount} Reprobados (Fail)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission(currentUser?.role, "Clases", "edit") && (
            curso.isArchived ? (
              <button 
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center cursor-pointer shadow-xs"
              >
                <ArchiveRestore className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Reactivar / Desarchivar
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition flex items-center cursor-pointer shadow-xs"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Archivar Clase
              </button>
            )
          )}
          {hasPermission(currentUser?.role, "Clases", "delete") && (
            <button 
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
            </button>
          )}
          {hasPermission(currentUser?.role, "Clases", "edit") && (
            <button 
              type="button"
              onClick={handleOpenEditModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Archived Notice Banner */}
      {curso.isArchived && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <Archive className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Esta clase se encuentra archivada:</strong> Está oculta de las búsquedas y selecciones estándar de nuevas asignaciones. Sus alumnos inscritos y registros históricos continúan accesibles.
            </span>
          </div>
          {hasPermission(currentUser?.role, "Clases", "edit") && (
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              className="underline font-bold text-amber-800 hover:text-amber-950 ml-4 whitespace-nowrap cursor-pointer"
            >
              Desarchivar ahora
            </button>
          )}
        </div>
      )}

      {/* Tabs Header */}
      <div className="px-6 border-b border-slate-200 bg-white flex space-x-6 text-sm font-semibold shrink-0">
        <button
          onClick={() => setActiveTab("Información General")}
          className={`py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === "Información General"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Información General
        </button>
        <button
          onClick={() => setActiveTab("Alumnos Inscritos")}
          className={`py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "Alumnos Inscritos"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Alumnos Inscritos y Evaluación
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "Alumnos Inscritos" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
          }`}>
            {courseEnrollments.length}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          
          {activeTab === "Información General" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tipo de Crédito</span>
                  <p className="text-base font-bold text-slate-900">{curso.creditType}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Clave de Clase</span>
                  <p className="text-base font-bold text-slate-900 font-mono">{curso.code || "N/A"}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alumnos Inscritos</span>
                  <p className="text-base font-bold text-indigo-600 font-mono">{courseEnrollments.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tasa de Aprobación</span>
                  <p className="text-base font-bold text-emerald-600 font-mono">{passRate}%</p>
                </div>
              </div>

              {/* Proveedor Académico */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Proveedor de Contenido</h3>
                {(() => {
                  const prov = providers.find(p => p.id === curso.providerId);
                  if (prov) {
                    return (
                      <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          🏢
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{prov.commercialName || prov.legalName}</p>
                          <p className="text-xs text-slate-500 font-medium">{prov.legalName || "Proveedor Oficial"}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="text-sm text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-4">
                      Sin proveedor asignado a esta clase.
                    </div>
                  );
                })()}
              </div>

              {/* Precios y Costos por País */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      Tarifario de Venta y Costo por País
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Precios fijados por región para esta clase.</p>
                  </div>
                </div>

                {curso.countryRates && Object.keys(curso.countryRates).length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left bg-white text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">País</th>
                          <th className="px-4 py-2.5 text-right">Precio de Venta (USD)</th>
                          <th className="px-4 py-2.5 text-right">Costo Base (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(curso.countryRates).map(([country, info]) => {
                          const infoCast = info as { price: string; cost: string };
                          return (
                            <tr key={country} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                                <span>🌎</span> {country}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600">
                                ${infoCast.price || '0'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-500">
                                ${infoCast.cost || '0'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                    No se han registrado tarifas regionales específicas para esta clase.
                  </p>
                )}
              </div>

              {/* Detalles Adicionales */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Detalles Adicionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Vigencia
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{curso.validity || "No especificada"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1" /> Syllabus
                    </p>
                    {curso.syllabus ? (
                      <a href={curso.syllabus} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center">
                        <Download className="w-3.5 h-3.5 mr-1" /> Ver Documento
                      </a>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No disponible</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Alumnos Inscritos" && (
             <div className="animate-in fade-in flex-1 flex flex-col min-h-0 space-y-4">
               
               {/* Summary Metric Cards for Outcomes */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                 <div 
                   onClick={() => setOutcomeFilter('all')}
                   className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                     outcomeFilter === 'all' 
                       ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                       : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                   }`}
                 >
                   <div className="flex items-center justify-between">
                     <span className={`text-[10px] font-black uppercase tracking-wider ${outcomeFilter === 'all' ? "text-slate-300" : "text-slate-400"}`}>
                       Total Inscritos
                     </span>
                     <Users className={`w-4 h-4 ${outcomeFilter === 'all' ? "text-slate-300" : "text-slate-400"}`} />
                   </div>
                   <p className="text-2xl font-black mt-1 font-mono">{totalCount}</p>
                 </div>

                 <div 
                   onClick={() => setOutcomeFilter('Pass')}
                   className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                     outcomeFilter === 'Pass' 
                       ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30" 
                       : "bg-white text-emerald-900 border-emerald-200 hover:border-emerald-300"
                   }`}
                 >
                   <div className="flex items-center justify-between">
                     <span className={`text-[10px] font-black uppercase tracking-wider ${outcomeFilter === 'Pass' ? "text-emerald-100" : "text-emerald-600"}`}>
                       Pass (Aprobados)
                     </span>
                     <CheckCircle2 className={`w-4 h-4 ${outcomeFilter === 'Pass' ? "text-emerald-100" : "text-emerald-600"}`} />
                   </div>
                   <div className="flex items-baseline justify-between mt-1">
                     <p className="text-2xl font-black font-mono">{passCount}</p>
                     <span className={`text-[10px] font-bold ${outcomeFilter === 'Pass' ? "text-emerald-200" : "text-emerald-600"}`}>
                       {totalCount > 0 ? `${Math.round((passCount / totalCount) * 100)}%` : '0%'}
                     </span>
                   </div>
                 </div>

                 <div 
                   onClick={() => setOutcomeFilter('Fail')}
                   className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                     outcomeFilter === 'Fail' 
                       ? "bg-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-500/30" 
                       : "bg-white text-rose-900 border-rose-200 hover:border-rose-300"
                   }`}
                 >
                   <div className="flex items-center justify-between">
                     <span className={`text-[10px] font-black uppercase tracking-wider ${outcomeFilter === 'Fail' ? "text-rose-100" : "text-rose-600"}`}>
                       Fail (Reprobados)
                     </span>
                     <XCircle className={`w-4 h-4 ${outcomeFilter === 'Fail' ? "text-rose-100" : "text-rose-600"}`} />
                   </div>
                   <div className="flex items-baseline justify-between mt-1">
                     <p className="text-2xl font-black font-mono">{failCount}</p>
                     <span className={`text-[10px] font-bold ${outcomeFilter === 'Fail' ? "text-rose-200" : "text-rose-600"}`}>
                       {totalCount > 0 ? `${Math.round((failCount / totalCount) * 100)}%` : '0%'}
                     </span>
                   </div>
                 </div>

                 <div 
                   onClick={() => setOutcomeFilter('Pendiente')}
                   className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                     outcomeFilter === 'Pendiente' 
                       ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30" 
                       : "bg-white text-amber-950 border-amber-200 hover:border-amber-300"
                   }`}
                 >
                   <div className="flex items-center justify-between">
                     <span className={`text-[10px] font-black uppercase tracking-wider ${outcomeFilter === 'Pendiente' ? "text-amber-100" : "text-amber-700"}`}>
                       Pendientes / En Curso
                     </span>
                     <Clock className={`w-4 h-4 ${outcomeFilter === 'Pendiente' ? "text-amber-100" : "text-amber-600"}`} />
                   </div>
                   <p className="text-2xl font-black mt-1 font-mono">{pendingCount}</p>
                 </div>
               </div>

               {/* Filter and Bulk Action Bar */}
               <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                 <div className="flex items-center space-x-2 flex-1 max-w-md">
                   <div className="relative w-full">
                     <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input
                       type="text"
                       placeholder="Buscar por nombre, ID o colegio..."
                       value={searchStudent}
                       onChange={(e) => setSearchStudent(e.target.value)}
                       className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                     />
                   </div>
                 </div>

                 {/* Outcome filter pill tabs */}
                 <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Filtrar:</span>
                   {(['all', 'Pass', 'Fail', 'Pendiente'] as const).map(tab => (
                     <button
                       key={tab}
                       onClick={() => setOutcomeFilter(tab)}
                       className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                         outcomeFilter === tab
                           ? "bg-indigo-600 text-white shadow-xs"
                           : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                       }`}
                     >
                       {tab === 'all' ? 'Todos' : tab === 'Pass' ? '✓ Pass' : tab === 'Fail' ? '✗ Fail' : '⏳ Pendiente'}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Bulk Action Alert Banner */}
               {selectedEnrollmentIds.length > 0 && (
                 <div className="bg-indigo-900 text-white px-4 py-3 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shrink-0">
                   <div className="flex items-center space-x-2">
                     <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                       {selectedEnrollmentIds.length}
                     </span>
                     <span className="text-xs font-bold">
                       {selectedEnrollmentIds.length === 1 ? "1 alumno seleccionado" : `${selectedEnrollmentIds.length} alumnos seleccionados`}
                     </span>
                   </div>
                   <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                     <button
                       onClick={() => handleBulkSetOutcome('Pass')}
                       className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shadow-xs"
                     >
                       <CheckCircle2 className="w-3.5 h-3.5" />
                       Marcar como Pass (Aprobado)
                     </button>
                     <button
                       onClick={() => handleBulkSetOutcome('Fail')}
                       className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shadow-xs"
                     >
                       <XCircle className="w-3.5 h-3.5" />
                       Marcar como Fail (Reprobado)
                     </button>
                     <button
                       onClick={() => handleBulkSetOutcome('Pendiente')}
                       className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                     >
                       Restablecer Pendiente
                     </button>
                     <button
                       onClick={() => setSelectedEnrollmentIds([])}
                       className="px-2.5 py-1.5 text-xs text-white/70 hover:text-white underline cursor-pointer"
                     >
                       Deseleccionar
                     </button>
                   </div>
                 </div>
               )}

               {bulkFeedback && (
                 <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0">
                   <Check className="w-4 h-4 text-emerald-600" />
                   {bulkFeedback}
                 </div>
               )}

               {/* Table */}
               {courseEnrollments.length > 0 ? (
                 <div className="border border-slate-200 rounded-2xl overflow-hidden flex-1 flex flex-col bg-white shadow-xs min-h-0">
                    <div className="overflow-auto flex-1">
                      <table className="w-full text-left bg-white border-collapse">
                        <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 sticky top-0 shadow-xs border-b border-slate-200 z-10">
                          <tr>
                            <th className="w-10 px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  filteredCourseEnrollments.length > 0 &&
                                  filteredCourseEnrollments.every(e => selectedEnrollmentIds.includes(e.id))
                                }
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 w-4 h-4 cursor-pointer"
                              />
                            </th>
                            <th className="px-5 py-3">Alumno</th>
                            <th className="px-5 py-3">Institución</th>
                            <th className="px-4 py-3">Periodo</th>
                            <th className="px-4 py-3 text-center">Resultado del Curso</th>
                            <th className="px-4 py-3 text-right">Definir Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCourseEnrollments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                                No se encontraron estudiantes con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredCourseEnrollments.map((env) => {
                              const sti = getStudentInfo(env.studentId);
                              if (!sti) return null;
                              const isSelected = selectedEnrollmentIds.includes(env.id);
                              const outcome = env.gradeOutcome || 'Pendiente';

                              return (
                                <tr 
                                  key={env.id} 
                                  className={`transition-colors ${
                                    isSelected 
                                      ? "bg-indigo-50/70 font-semibold" 
                                      : "hover:bg-slate-50/60"
                                  }`}
                                >
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleSelectRow(env.id, e.target.checked)}
                                      className="rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 w-4 h-4 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-5 py-3">
                                    <button 
                                      type="button"
                                      onClick={() => navigate(`/alumnos/${sti.id}`)}
                                      className="text-left group cursor-pointer"
                                    >
                                      <p className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                                        {sti.name} {sti.lastName}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                        STU-108{sti.id.toString().padStart(2, '0')}
                                      </p>
                                    </button>
                                  </td>
                                  <td className="px-5 py-3 text-xs text-slate-600 font-medium">
                                    {sti.instName}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                                    <div className="leading-tight">
                                      <span className="block text-[10px] text-slate-400">Inicio: {env.startDate || env.enrollmentDate || '-'}</span>
                                      <span className="block text-[10px] text-slate-400">Fin: {env.endDate || '-'}</span>
                                      {env.hasExtension && env.extensionDate && (
                                        <span className="block text-[10px] text-indigo-600 font-bold">Ext: {env.extensionDate}</span>
                                      )}
                                      <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                                        env.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        env.status === 'Extended' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        env.status === 'Ended' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        env.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        env.status === 'On hold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}>
                                        {env.status || 'Active'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {outcome === 'Pass' && (
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        Pass (Aprobado)
                                        {env.finalGrade && (
                                          <span className="ml-1 bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                            {env.finalGrade}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {outcome === 'Fail' && (
                                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                        Fail (Reprobado)
                                        {env.finalGrade && (
                                          <span className="ml-1 bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                            {env.finalGrade}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {outcome === 'Pendiente' && (
                                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        En Curso / Pendiente
                                      </span>
                                    )}
                                    {env.gradeNotes && (
                                      <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate mx-auto" title={env.gradeNotes}>
                                        {env.gradeNotes}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        type="button"
                                        title="Definir como Pass (Aprobado)"
                                        onClick={() => handleQuickSetOutcome(env.id, 'Pass')}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                                          outcome === 'Pass'
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200"
                                        }`}
                                      >
                                        <Check className="w-3 h-3" />
                                        Pass
                                      </button>
                                      <button
                                        type="button"
                                        title="Definir como Fail (Reprobado)"
                                        onClick={() => handleQuickSetOutcome(env.id, 'Fail')}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                                          outcome === 'Fail'
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200"
                                        }`}
                                      >
                                        <XCircle className="w-3 h-3" />
                                        Fail
                                      </button>
                                      <button
                                        type="button"
                                        title="Editar Calificación / Nota detallada"
                                        onClick={() => handleOpenGradeModal(env)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               ) : (
                 <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <GraduationCap className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-slate-700 font-bold mb-1">Sin alumnos inscritos</p>
                   <p className="text-xs text-slate-400">No hay estudiantes tomando esta clase actualmente.</p>
                 </div>
               )}
             </div>
          )}
          
        </div>
      </div>

      {/* Edit Grade Modal */}
      <Modal 
        isOpen={!!editingGradeEnrollment} 
        onClose={() => setEditingGradeEnrollment(null)} 
        title="Evaluación Académica y Calificación del Alumno"
      >
        {editingGradeEnrollment && (() => {
          const s = getStudentInfo(editingGradeEnrollment.studentId);
          return (
            <form onSubmit={handleSaveGradeModal} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{s?.name} {s?.lastName}</p>
                  <p className="text-[10px] text-slate-500">{s?.instName} • {curso.name}</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                  {curso.creditType}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Resultado del Curso <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGradeFormData(prev => ({ ...prev, gradeOutcome: 'Pass' }))}
                    className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      gradeFormData.gradeOutcome === 'Pass'
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 mb-1 ${gradeFormData.gradeOutcome === 'Pass' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs uppercase tracking-wider">Pass (Aprobó)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGradeFormData(prev => ({ ...prev, gradeOutcome: 'Fail' }))}
                    className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      gradeFormData.gradeOutcome === 'Fail'
                        ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle className={`w-5 h-5 mb-1 ${gradeFormData.gradeOutcome === 'Fail' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className="text-xs uppercase tracking-wider">Fail (Reprobó)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGradeFormData(prev => ({ ...prev, gradeOutcome: 'Pendiente' }))}
                    className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      gradeFormData.gradeOutcome === 'Pendiente'
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Clock className={`w-5 h-5 mb-1 ${gradeFormData.gradeOutcome === 'Pendiente' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs uppercase tracking-wider">En Curso</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Calificación / Nota Final (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 95/100, A+, 8.5"
                    value={gradeFormData.finalGrade}
                    onChange={(e) => setGradeFormData(prev => ({ ...prev, finalGrade: e.target.value }))}
                    className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Evaluación
                  </label>
                  <input
                    type="date"
                    value={gradeFormData.gradeDate}
                    onChange={(e) => setGradeFormData(prev => ({ ...prev, gradeDate: e.target.value }))}
                    className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notas u Observaciones del Desempeño
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Completó todos los proyectos finales con excelencia..."
                  value={gradeFormData.gradeNotes}
                  onChange={(e) => setGradeFormData(prev => ({ ...prev, gradeNotes: e.target.value }))}
                  className="w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGradeEnrollment(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition"
                >
                  Guardar Evaluación
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Edit Class Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Clase">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Clase</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Proveedor de Contenido Académico</label>
              <select
                required
                value={formData.providerId}
                onChange={e => setFormData({...formData, providerId: e.target.value})}
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
              >
                <option value="">Seleccionar Proveedor...</option>
                {providers.filter(p => !p.providerType || p.providerType === "Curriculum Académico").map(p => (
                  <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Clave</label>
              <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Crédito</label>
              <select
                required
                value={formData.creditType}
                onChange={e => setFormData({...formData, creditType: e.target.value as any})}
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
              >
                <option value="Crédito completo">Crédito completo</option>
                <option value="Medio Crédito">Medio Crédito</option>
                <option value="Crédito completo AP">Crédito completo AP</option>
                <option value="Medio Crédito AP">Medio Crédito AP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Vigencia</label>
              <input type="date" value={formData.validity} onChange={e => setFormData({...formData, validity: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estatus en Catálogo</label>
              <select
                value={formData.isArchived ? "true" : "false"}
                onChange={e => setFormData({...formData, isArchived: e.target.value === "true"})}
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
              >
                <option value="false">Activa (Visible en catálogo y asignaciones)</option>
                <option value="true">Archivada (Oculta del catálogo activo)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Syllabus (Enlace o Ref)</label>
              <input type="text" value={formData.syllabus} onChange={e => setFormData({...formData, syllabus: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      {/* Archive / Unarchive Modal */}
      {isArchiveModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsArchiveModalOpen(false)}
          title={curso.isArchived ? "Confirmar Reactivación de Clase" : "Confirmar Archivo de Clase"}
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${curso.isArchived ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'} space-y-2 text-xs leading-relaxed`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {curso.isArchived ? (
                  <>
                    <ArchiveRestore className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>¿Reactivar "{curso.name}"?</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>¿Archivar "{curso.name}"?</span>
                  </>
                )}
              </div>
              {curso.isArchived ? (
                <p>
                  Esta clase volverá a estar activa y visible en el catálogo general y en los formularios de inscripción de alumnos.
                </p>
              ) : (
                <div>
                  <p>
                    La clase se marcará como archivada y no aparecerá por defecto en el catálogo principal ni en las opciones para inscribir nuevos alumnos.
                  </p>
                  {courseEnrollments.length > 0 && (
                    <p className="mt-2 font-semibold text-amber-950 bg-amber-100/60 p-2 rounded border border-amber-300">
                      ℹ️ Sus <strong className="font-bold">{courseEnrollments.length} alumnos inscritos</strong> y todo el historial de evaluaciones se mantendrán seguros e intactos.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextStatus = !curso.isArchived;
                  updateClass(curso.id, { isArchived: nextStatus });
                  setToastMessage(
                    nextStatus 
                      ? `La clase "${curso.name}" ha sido archivada correctamente.` 
                      : `La clase "${curso.name}" ha sido reactivada con éxito.`
                  );
                  setIsArchiveModalOpen(false);
                  setTimeout(() => setToastMessage(null), 4000);
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors uppercase tracking-wider shadow-sm ${
                  curso.isArchived 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {curso.isArchived ? 'Reactivar Clase' : 'Archivar Clase'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
