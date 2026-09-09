import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, Clock, Award, Send, 
  Globe, Check, ChevronRight, Plus, Trash2, Edit3, 
  ExternalLink, FileCheck, DollarSign, 
  GraduationCap, Mail, Save, FileText,
  Bookmark, CheckSquare, Square, FileCheck2
} from 'lucide-react';
import { 
  Student, 
  UniversityAdmissionData, 
  AdmissionStepStatus, 
  AdmissionUniversityOption,
  AdmissionDocumentCheckItem,
  AdmissionScholarshipItem,
  AdmissionApplicationItem,
  useAppContext,
} from '../context/AppContext';
import { hasPermission } from '../utils/permissionCheck';

interface UniversityAdmissionsProcessProps {
  student: Student;
}

const DEFAULT_DOCUMENTS: Omit<AdmissionDocumentCheckItem, 'id'>[] = [
  { name: 'Boleta oficial de calificaciones / Transcripts apostillados', required: true, received: false },
  { name: 'Carta de recomendación académica (Profesor 1)', required: true, received: false },
  { name: 'Carta de recomendación académica (Profesor 2 / Consejero)', required: false, received: false },
  { name: 'Ensayo Personal / Common App Essay / Statement of Purpose', required: true, received: false },
  { name: 'Certificación oficial de inglés (TOEFL / IELTS / Duolingo / iTEP)', required: true, received: false },
  { name: 'Copia a color de Pasaporte vigente', required: true, received: false },
  { name: 'Currículum extracurricular / Resumen de actividades', required: false, received: false },
  { name: 'Certificación financiera / Bank Statement de soporte', required: true, received: false },
];

export const UniversityAdmissionsProcess: React.FC<UniversityAdmissionsProcessProps> = ({ student }) => {
  const { updateStudent, currentUser } = useAppContext();
  const canEdit = hasPermission(currentUser?.role, 'Alumnos', 'edit');

  // Initialize process state from student or default structure
  const [data, setData] = useState<UniversityAdmissionData>(() => {
    const existing = student.universityAdmissionProcess;
    return {
      counselorName: existing?.counselorName || '',
      counselorEmail: existing?.counselorEmail || '',
      targetDegree: existing?.targetDegree || '',
      targetTerm: existing?.targetTerm || '',
      overallNotes: existing?.overallNotes || '',
      startDateStep: {
        status: existing?.startDateStep?.status || 'en_proceso',
        date: existing?.startDateStep?.date || new Date().toISOString().split('T')[0],
        counselor: existing?.startDateStep?.counselor || '',
        targetCountries: existing?.startDateStep?.targetCountries || 'Estados Unidos, Canadá',
        notes: existing?.startDateStep?.notes || '',
      },
      formFillingStep: {
        status: existing?.formFillingStep?.status || 'pendiente',
        completionDate: existing?.formFillingStep?.completionDate || '',
        formUrl: existing?.formFillingStep?.formUrl || '',
        interestsSummary: existing?.formFillingStep?.interestsSummary || '',
        notes: existing?.formFillingStep?.notes || '',
      },
      meetingStep: {
        status: existing?.meetingStep?.status || 'pendiente',
        meetingDate: existing?.meetingStep?.meetingDate || '',
        meetingTime: existing?.meetingStep?.meetingTime || '',
        modality: existing?.meetingStep?.modality || 'Virtual (Zoom/Meet)',
        attendees: existing?.meetingStep?.attendees || 'Alumno y Padres de Familia',
        meetingLink: existing?.meetingStep?.meetingLink || '',
        summaryNotes: existing?.meetingStep?.summaryNotes || '',
      },
      profileEvaluationStep: {
        status: existing?.profileEvaluationStep?.status || 'pendiente',
        evaluationDate: existing?.profileEvaluationStep?.evaluationDate || '',
        gpaScore: existing?.profileEvaluationStep?.gpaScore || '3.7 / 4.0 (9.2 MEX)',
        englishProficiency: existing?.profileEvaluationStep?.englishProficiency || 'C1 Avanzado (TOEFL 95+ / iTEP 5.0)',
        standardizedTests: existing?.profileEvaluationStep?.standardizedTests || 'SAT / Duolingo English Test',
        topMajors: existing?.profileEvaluationStep?.topMajors || 'Business Administration / International Relations',
        extracurricularStrengths: existing?.profileEvaluationStep?.extracurricularStrengths || 'Modelo ONU, Voluntariado Comunitario, Equipo de Debate',
        counselorRecommendations: existing?.profileEvaluationStep?.counselorRecommendations || '',
      },
      optionsReviewStep: {
        status: existing?.optionsReviewStep?.status || 'pendiente',
        reviewDate: existing?.optionsReviewStep?.reviewDate || '',
        options: existing?.optionsReviewStep?.options || [
          { id: 'opt-1', name: 'University of British Columbia', country: 'Canadá', program: 'Bachelor of Commerce', category: 'Dream / Reach', status: 'Seleccionada', costPerYear: '$38,000 CAD', deadline: '2027-01-15' },
          { id: 'opt-2', name: 'University of Alberta', country: 'Canadá', program: 'Business Economics', category: 'Target', status: 'Seleccionada', costPerYear: '$32,000 CAD', deadline: '2027-02-01' },
          { id: 'opt-3', name: 'Arizona State University', country: 'Estados Unidos', program: 'Global Management (Thunderbird)', category: 'Target', status: 'Seleccionada', costPerYear: '$34,000 USD', deadline: '2027-02-15' },
          { id: 'opt-4', name: 'Florida International University', country: 'Estados Unidos', program: 'International Business', category: 'Safety', status: 'Seleccionada', costPerYear: '$22,000 USD', deadline: '2027-03-01' }
        ],
        notes: existing?.optionsReviewStep?.notes || '',
      },
      documentsRequestStep: {
        status: existing?.documentsRequestStep?.status || 'pendiente',
        requestDate: existing?.documentsRequestStep?.requestDate || '',
        deadline: existing?.documentsRequestStep?.deadline || '',
        documents: existing?.documentsRequestStep?.documents || DEFAULT_DOCUMENTS.map((d, i) => ({ ...d, id: `doc-${i+1}` })),
        notes: existing?.documentsRequestStep?.notes || '',
      },
      scholarshipsReviewStep: {
        status: existing?.scholarshipsReviewStep?.status || 'pendiente',
        reviewDate: existing?.scholarshipsReviewStep?.reviewDate || '',
        scholarships: existing?.scholarshipsReviewStep?.scholarships || [
          { id: 'sch-1', name: 'International Major Entrance Scholarship (IMES)', institutionOrProvider: 'UBC', type: 'Mérito Académico', amount: '$10,000 CAD/año', status: 'En trámite', deadline: '2027-01-15' },
          { id: 'sch-2', name: 'New American University Scholarship', institutionOrProvider: 'ASU', type: 'Mérito Académico', amount: '$12,500 USD/año', status: 'En trámite', deadline: '2027-02-01' }
        ],
        totalEstimatedScholarship: existing?.scholarshipsReviewStep?.totalEstimatedScholarship || '$22,500 USD estimado',
        notes: existing?.scholarshipsReviewStep?.notes || '',
      },
      applicationSubmittedStep: {
        status: existing?.applicationSubmittedStep?.status || 'pendiente',
        submissionDate: existing?.applicationSubmittedStep?.submissionDate || '',
        applications: existing?.applicationSubmittedStep?.applications || [
          { id: 'app-1', universityName: 'University of British Columbia', platform: 'EducationPlannerBC', applicationId: 'EPBC-883921', submissionDate: '', decisionType: 'Regular Decision', status: 'Enviada' },
          { id: 'app-2', universityName: 'Arizona State University', platform: 'Common App', applicationId: 'CA-948102', submissionDate: '', decisionType: 'Rolling', status: 'Enviada' }
        ],
        notes: existing?.applicationSubmittedStep?.notes || '',
      },
      acceptanceLetterStep: {
        status: existing?.acceptanceLetterStep?.status || 'pendiente',
        decisionDate: existing?.acceptanceLetterStep?.decisionDate || '',
        acceptedUniversity: existing?.acceptanceLetterStep?.acceptedUniversity || '',
        officialMajor: existing?.acceptanceLetterStep?.officialMajor || '',
        scholarshipAwarded: existing?.acceptanceLetterStep?.scholarshipAwarded || '',
        letterFileUrl: existing?.acceptanceLetterStep?.letterFileUrl || '',
        depositPaid: existing?.acceptanceLetterStep?.depositPaid || false,
        depositAmount: existing?.acceptanceLetterStep?.depositAmount || '$500 USD',
        notes: existing?.acceptanceLetterStep?.notes || '',
      },
      programStartDateStep: {
        status: existing?.programStartDateStep?.status || 'pendiente',
        classesStartDate: existing?.programStartDateStep?.classesStartDate || '',
        orientationDate: existing?.programStartDateStep?.orientationDate || '',
        visaStatus: existing?.programStartDateStep?.visaStatus || 'En trámite',
        housingStatus: existing?.programStartDateStep?.housingStatus || 'En trámite',
        finalNotes: existing?.programStartDateStep?.finalNotes || '',
      }
    };
  });

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // New item modal/inline states
  const [newUniName, setNewUniName] = useState('');
  const [newUniCountry, setNewUniCountry] = useState('Estados Unidos');
  const [newUniProgram, setNewUniProgram] = useState('');
  const [newUniCategory, setNewUniCategory] = useState<'Dream / Reach' | 'Target' | 'Safety'>('Target');
  const [newUniCost, setNewUniCost] = useState('');
  const [showAddUni, setShowAddUni] = useState(false);

  const [newDocName, setNewDocName] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(true);
  const [showAddDoc, setShowAddDoc] = useState(false);

  const [newSchName, setNewSchName] = useState('');
  const [newSchProvider, setNewSchProvider] = useState('');
  const [newSchAmount, setNewSchAmount] = useState('');
  const [newSchType, setNewSchType] = useState<'Mérito Académico' | 'Deportiva' | 'Necesidad Financiera' | 'Talento / Otra'>('Mérito Académico');
  const [showAddSch, setShowAddSch] = useState(false);

  const [newAppName, setNewAppName] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState('Common App');
  const [newAppId, setNewAppId] = useState('');
  const [showAddApp, setShowAddApp] = useState(false);

  // Define the 10 steps configuration
  const stepsList = useMemo(() => [
    {
      index: 0,
      id: 'step_1',
      title: 'Fecha de inicio',
      subtitle: 'Arranque del proceso y asignación de asesor',
      status: data.startDateStep?.status || 'pendiente',
      date: data.startDateStep?.date,
      icon: Calendar,
    },
    {
      index: 1,
      id: 'step_2',
      title: 'Llenado formulario',
      subtitle: 'Cuestionario de perfil e intereses del estudiante',
      status: data.formFillingStep?.status || 'pendiente',
      date: data.formFillingStep?.completionDate,
      icon: FileText,
    },
    {
      index: 2,
      id: 'step_3',
      title: 'Reunión 1-1',
      subtitle: 'Entrevista y sesión de diagnóstico inicial',
      status: data.meetingStep?.status || 'pendiente',
      date: data.meetingStep?.meetingDate,
      icon: UsersIcon,
    },
    {
      index: 3,
      id: 'step_4',
      title: 'Evaluación Perfil',
      subtitle: 'Análisis de GPA, idiomas y fortalezas académicas',
      status: data.profileEvaluationStep?.status || 'pendiente',
      date: data.profileEvaluationStep?.evaluationDate,
      icon: Award,
    },
    {
      index: 4,
      id: 'step_5',
      title: 'Revisión de opciones',
      subtitle: 'Selección de universidades objetivo y programas',
      status: data.optionsReviewStep?.status || 'pendiente',
      date: data.optionsReviewStep?.reviewDate,
      icon: Globe,
    },
    {
      index: 5,
      id: 'step_6',
      title: 'Solicitud documentos',
      subtitle: 'Checklist de expedientes, ensayos y cartas',
      status: data.documentsRequestStep?.status || 'pendiente',
      date: data.documentsRequestStep?.requestDate,
      icon: FileCheck,
    },
    {
      index: 6,
      id: 'step_7',
      title: 'Revisión de becas',
      subtitle: 'Evaluación de mérito, ayuda financiera y postulaciones',
      status: data.scholarshipsReviewStep?.status || 'pendiente',
      date: data.scholarshipsReviewStep?.reviewDate,
      icon: DollarSign,
    },
    {
      index: 7,
      id: 'step_8',
      title: 'Aplicación enviada',
      subtitle: 'Envío de solicitudes a través de portales oficiales',
      status: data.applicationSubmittedStep?.status || 'pendiente',
      date: data.applicationSubmittedStep?.submissionDate,
      icon: Send,
    },
    {
      index: 8,
      id: 'step_9',
      title: 'Carta Aceptación',
      subtitle: 'Recepción de cartas de admisión y paquete de becas',
      status: data.acceptanceLetterStep?.status || 'pendiente',
      date: data.acceptanceLetterStep?.decisionDate,
      icon: GraduationCap,
    },
    {
      index: 9,
      id: 'step_10',
      title: 'Fecha inicio',
      subtitle: 'Matrícula, visado e inicio de clases universitarias',
      status: data.programStartDateStep?.status || 'pendiente',
      date: data.programStartDateStep?.classesStartDate,
      icon: CheckCircle2,
    },
  ], [data]);

  // Calculate overall metrics
  const completedStepsCount = stepsList.filter(s => s.status === 'completado').length;
  const inProgressStepsCount = stepsList.filter(s => s.status === 'en_proceso').length;
  const progressPercent = Math.round((completedStepsCount / stepsList.length) * 100);

  // Save changes to student record
  const handleSave = (updatedData: UniversityAdmissionData = data) => {
    updateStudent(student.id, {
      universityAdmissionProcess: updatedData
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  // Helper to change a specific step's status
  const handleStepStatusChange = (stepKey: keyof UniversityAdmissionData, newStatus: AdmissionStepStatus) => {
    const updated = {
      ...data,
      [stepKey]: {
        ...(data[stepKey] as any),
        status: newStatus
      }
    };
    setData(updated);
    handleSave(updated);
  };

  // Step 5: Add University
  const handleAddUniversity = () => {
    if (!newUniName.trim()) return;
    const newOpt: AdmissionUniversityOption = {
      id: `uni-${Date.now()}`,
      name: newUniName.trim(),
      country: newUniCountry,
      program: newUniProgram.trim() || 'General Studies',
      category: newUniCategory,
      status: 'Seleccionada',
      costPerYear: newUniCost.trim() || 'Por cotizar',
    };
    const updatedOptions = [...(data.optionsReviewStep?.options || []), newOpt];
    const updated = {
      ...data,
      optionsReviewStep: {
        ...data.optionsReviewStep,
        options: updatedOptions
      }
    };
    setData(updated as any);
    handleSave(updated as any);
    setNewUniName('');
    setNewUniProgram('');
    setNewUniCost('');
    setShowAddUni(false);
  };

  const handleRemoveUniversity = (id: string) => {
    const updatedOptions = (data.optionsReviewStep?.options || []).filter(u => u.id !== id);
    const updated = {
      ...data,
      optionsReviewStep: {
        ...data.optionsReviewStep,
        options: updatedOptions
      }
    };
    setData(updated as any);
    handleSave(updated as any);
  };

  // Step 6: Toggle document
  const handleToggleDocReceived = (docId: string) => {
    const docs = (data.documentsRequestStep?.documents || []).map(doc => {
      if (doc.id === docId) {
        const nextReceived = !doc.received;
        return {
          ...doc,
          received: nextReceived,
          receivedDate: nextReceived ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return doc;
    });

    const allMandatoryReceived = docs.filter(d => d.required).every(d => d.received);
    const updated = {
      ...data,
      documentsRequestStep: {
        ...data.documentsRequestStep,
        documents: docs,
        status: allMandatoryReceived ? ('completado' as AdmissionStepStatus) : (docs.some(d => d.received) ? 'en_proceso' as AdmissionStepStatus : data.documentsRequestStep?.status || 'pendiente')
      }
    };
    setData(updated as any);
    handleSave(updated as any);
  };

  // Step 6: Add document
  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    const newDoc: AdmissionDocumentCheckItem = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      required: newDocRequired,
      received: false
    };
    const docs = [...(data.documentsRequestStep?.documents || []), newDoc];
    const updated = {
      ...data,
      documentsRequestStep: {
        ...data.documentsRequestStep,
        documents: docs
      }
    };
    setData(updated as any);
    handleSave(updated as any);
    setNewDocName('');
    setShowAddDoc(false);
  };

  const handleRemoveDocument = (docId: string) => {
    const docs = (data.documentsRequestStep?.documents || []).filter(d => d.id !== docId);
    const updated = {
      ...data,
      documentsRequestStep: {
        ...data.documentsRequestStep,
        documents: docs
      }
    };
    setData(updated as any);
    handleSave(updated as any);
  };

  // Step 7: Add Scholarship
  const handleAddScholarship = () => {
    if (!newSchName.trim()) return;
    const newSch: AdmissionScholarshipItem = {
      id: `sch-${Date.now()}`,
      name: newSchName.trim(),
      institutionOrProvider: newSchProvider.trim() || 'Universidad',
      type: newSchType,
      amount: newSchAmount.trim() || '$0',
      status: 'En trámite'
    };
    const schs = [...(data.scholarshipsReviewStep?.scholarships || []), newSch];
    const updated = {
      ...data,
      scholarshipsReviewStep: {
        ...data.scholarshipsReviewStep,
        scholarships: schs
      }
    };
    setData(updated as any);
    handleSave(updated as any);
    setNewSchName('');
    setNewSchProvider('');
    setNewSchAmount('');
    setShowAddSch(false);
  };

  const handleRemoveScholarship = (schId: string) => {
    const schs = (data.scholarshipsReviewStep?.scholarships || []).filter(s => s.id !== schId);
    const updated = {
      ...data,
      scholarshipsReviewStep: {
        ...data.scholarshipsReviewStep,
        scholarships: schs
      }
    };
    setData(updated as any);
    handleSave(updated as any);
  };

  // Step 8: Add Application
  const handleAddApplication = () => {
    if (!newAppName.trim()) return;
    const newApp: AdmissionApplicationItem = {
      id: `app-${Date.now()}`,
      universityName: newAppName.trim(),
      platform: newAppPlatform,
      applicationId: newAppId.trim() || undefined,
      submissionDate: new Date().toISOString().split('T')[0],
      decisionType: 'Regular Decision',
      status: 'Enviada'
    };
    const apps = [...(data.applicationSubmittedStep?.applications || []), newApp];
    const updated = {
      ...data,
      applicationSubmittedStep: {
        ...data.applicationSubmittedStep,
        applications: apps,
        status: 'completado' as AdmissionStepStatus
      }
    };
    setData(updated as any);
    handleSave(updated as any);
    setNewAppName('');
    setNewAppId('');
    setShowAddApp(false);
  };

  const handleRemoveApplication = (appId: string) => {
    const apps = (data.applicationSubmittedStep?.applications || []).filter(a => a.id !== appId);
    const updated = {
      ...data,
      applicationSubmittedStep: {
        ...data.applicationSubmittedStep,
        applications: apps
      }
    };
    setData(updated as any);
    handleSave(updated as any);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Información de University Admissions guardada exitosamente</span>
        </div>
      )}

      {/* Top Banner & Overall Progress */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Programa University Admission
              </span>
              <span className="text-xs text-slate-400 font-semibold">• 10 Etapas del Proceso</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Acompañamiento de Admisión Universitaria
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Seguimiento integral paso a paso desde el diagnóstico de perfil, postulación a universidades y becas, hasta la carta de aceptación e inicio de cursos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleSave()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Guardar Avance
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Key Stats */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Progreso Total</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-white">{progressPercent}%</span>
              <span className="text-[11px] text-indigo-300 font-semibold">{completedStepsCount} de 10 pasos</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Etapas en Curso</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-amber-400">{inProgressStepsCount}</span>
              <span className="text-[11px] text-slate-300 font-semibold">etapas activas</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {stepsList[activeStepIndex]?.title}
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Opciones Universidades</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-indigo-300">{data.optionsReviewStep?.options?.length || 0}</span>
              <span className="text-[11px] text-slate-300 font-semibold">postulaciones</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {data.optionsReviewStep?.options?.[0]?.name || 'Por definir'}
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Carta de Aceptación</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-sm font-black px-2 py-0.5 rounded ${
                data.acceptanceLetterStep?.status === 'completado' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {data.acceptanceLetterStep?.status === 'completado' ? '¡Admitido!' : 'En Proceso'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {data.acceptanceLetterStep?.acceptedUniversity || 'Pendiente de resolución'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stepper Layout: Left Navigation / Timeline + Right Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Step Navigation Cards (Left Column - 4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Etapas del Proceso (10)</span>
            <span className="text-[10px] font-bold text-slate-400">{completedStepsCount}/10 completados</span>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {stepsList.map((step) => {
              const isSelected = activeStepIndex === step.index;
              const StepIcon = step.icon;

              let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
              let badgeLabel = "Pendiente";
              if (step.status === 'completado') {
                badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                badgeLabel = "Completado";
              } else if (step.status === 'en_proceso') {
                badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                badgeLabel = "En Proceso";
              }

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepIndex(step.index)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    step.status === 'completado'
                      ? 'bg-emerald-600 text-white'
                      : step.status === 'en_proceso'
                        ? 'bg-amber-500 text-white'
                        : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                  }`}>
                    {step.status === 'completado' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{step.index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                        {step.title}
                      </h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {step.subtitle}
                    </p>
                    {step.date && (
                      <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="w-2.5 h-2.5" /> {step.date}
                      </p>
                    )}
                  </div>

                  <ChevronRight className={`w-4 h-4 shrink-0 self-center ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Working Area (Right Column - 8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs min-h-[600px] flex flex-col justify-between">
            
            {/* Step Header & Quick Status Switcher */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {activeStepIndex + 1}
                    </span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Paso {activeStepIndex + 1} de 10
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {stepsList[activeStepIndex]?.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {stepsList[activeStepIndex]?.subtitle}
                  </p>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const keys: Array<keyof UniversityAdmissionData> = [
                        'startDateStep', 'formFillingStep', 'meetingStep', 'profileEvaluationStep',
                        'optionsReviewStep', 'documentsRequestStep', 'scholarshipsReviewStep',
                        'applicationSubmittedStep', 'acceptanceLetterStep', 'programStartDateStep'
                      ];
                      handleStepStatusChange(keys[activeStepIndex], 'pendiente');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      stepsList[activeStepIndex]?.status === 'pendiente'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pendiente
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const keys: Array<keyof UniversityAdmissionData> = [
                        'startDateStep', 'formFillingStep', 'meetingStep', 'profileEvaluationStep',
                        'optionsReviewStep', 'documentsRequestStep', 'scholarshipsReviewStep',
                        'applicationSubmittedStep', 'acceptanceLetterStep', 'programStartDateStep'
                      ];
                      handleStepStatusChange(keys[activeStepIndex], 'en_proceso');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      stepsList[activeStepIndex]?.status === 'en_proceso'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    En Proceso
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const keys: Array<keyof UniversityAdmissionData> = [
                        'startDateStep', 'formFillingStep', 'meetingStep', 'profileEvaluationStep',
                        'optionsReviewStep', 'documentsRequestStep', 'scholarshipsReviewStep',
                        'applicationSubmittedStep', 'acceptanceLetterStep', 'programStartDateStep'
                      ];
                      handleStepStatusChange(keys[activeStepIndex], 'completado');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      stepsList[activeStepIndex]?.status === 'completado'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Completado
                  </button>
                </div>
              </div>

              {/* STEP 1: FECHA DE INICIO */}
              {activeStepIndex === 0 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Inicio del Proceso</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={data.startDateStep?.date || ''}
                        onChange={e => setData({
                          ...data,
                          startDateStep: { ...data.startDateStep, date: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asesor / Counselor Asignado</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: Lic. Mariana Garza (Estudiantes Embajadores)"
                        value={data.startDateStep?.counselor || ''}
                        onChange={e => setData({
                          ...data,
                          startDateStep: { ...data.startDateStep, counselor: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Países y Destinos Universitarios de Interés</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      placeholder="Ej: Estados Unidos, Canadá, Reino Unido, España"
                      value={data.startDateStep?.targetCountries || ''}
                      onChange={e => setData({
                        ...data,
                        startDateStep: { ...data.startDateStep, targetCountries: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notas Iniciales de Apertura</label>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      placeholder="Objetivos del alumno, expectativas familiares y consideraciones clave..."
                      value={data.startDateStep?.notes || ''}
                      onChange={e => setData({
                        ...data,
                        startDateStep: { ...data.startDateStep, notes: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: LLENADO FORMULARIO */}
              {activeStepIndex === 1 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Llenado / Recepción</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={data.formFillingStep?.completionDate || ''}
                        onChange={e => setData({
                          ...data,
                          formFillingStep: { ...data.formFillingStep, completionDate: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Enlace al Formulario / Expediente Digital</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="https://forms.gle/... o enlace a drive"
                        value={data.formFillingStep?.formUrl || ''}
                        onChange={e => setData({
                          ...data,
                          formFillingStep: { ...data.formFillingStep, formUrl: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Resumen de Intereses y Preferencias Académicas</label>
                    <textarea
                      rows={4}
                      disabled={!canEdit}
                      placeholder="Áreas de estudio de mayor interés, presupuesto anual estimado, vida en campus, etc."
                      value={data.formFillingStep?.interestsSummary || ''}
                      onChange={e => setData({
                        ...data,
                        formFillingStep: { ...data.formFillingStep, interestsSummary: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: REUNION 1-1 */}
              {activeStepIndex === 2 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de la Reunión</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={data.meetingStep?.meetingDate || ''}
                        onChange={e => setData({
                          ...data,
                          meetingStep: { ...data.meetingStep, meetingDate: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora programada</label>
                      <input
                        type="time"
                        disabled={!canEdit}
                        value={data.meetingStep?.meetingTime || ''}
                        onChange={e => setData({
                          ...data,
                          meetingStep: { ...data.meetingStep, meetingTime: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modalidad</label>
                      <select
                        disabled={!canEdit}
                        value={data.meetingStep?.modality || 'Virtual (Zoom/Meet)'}
                        onChange={e => setData({
                          ...data,
                          meetingStep: { ...data.meetingStep, modality: e.target.value as any } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                      >
                        <option value="Virtual (Zoom/Meet)">Virtual (Zoom/Meet)</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Telefónica">Telefónica</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asistentes</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: Alumno, Madre y Consejero Académico"
                        value={data.meetingStep?.attendees || ''}
                        onChange={e => setData({
                          ...data,
                          meetingStep: { ...data.meetingStep, attendees: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Enlace de Videollamada</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="https://zoom.us/j/... o https://meet.google.com/..."
                        value={data.meetingStep?.meetingLink || ''}
                        onChange={e => setData({
                          ...data,
                          meetingStep: { ...data.meetingStep, meetingLink: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Minuta y Acuerdos de la Reunión 1-1</label>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      placeholder="Conclusiones principales de la sesión, compromisos y próximos pasos acordados..."
                      value={data.meetingStep?.summaryNotes || ''}
                      onChange={e => setData({
                        ...data,
                        meetingStep: { ...data.meetingStep, summaryNotes: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: EVALUACION PERFIL */}
              {activeStepIndex === 3 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">GPA / Promedio Calculado</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: 3.8 / 4.0 (9.4 MEX)"
                        value={data.profileEvaluationStep?.gpaScore || ''}
                        onChange={e => setData({
                          ...data,
                          profileEvaluationStep: { ...data.profileEvaluationStep, gpaScore: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nivel de Inglés Evaluado</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: C1 Avanzado (TOEFL 98 / iTEP 5.2)"
                        value={data.profileEvaluationStep?.englishProficiency || ''}
                        onChange={e => setData({
                          ...data,
                          profileEvaluationStep: { ...data.profileEvaluationStep, englishProficiency: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Exámenes Estandarizados</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: SAT 1320 / ACT 29 / Test Optional"
                        value={data.profileEvaluationStep?.standardizedTests || ''}
                        onChange={e => setData({
                          ...data,
                          profileEvaluationStep: { ...data.profileEvaluationStep, standardizedTests: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Carreras y Áreas de Especialidad Sugeridas</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      placeholder="Ej: Computer Science, Software Engineering, Data Science"
                      value={data.profileEvaluationStep?.topMajors || ''}
                      onChange={e => setData({
                        ...data,
                        profileEvaluationStep: { ...data.profileEvaluationStep, topMajors: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fortalezas Extracurriculares y Liderazgo</label>
                    <textarea
                      rows={2}
                      disabled={!canEdit}
                      placeholder="Deportes, voluntariados, artes, competencias, premios..."
                      value={data.profileEvaluationStep?.extracurricularStrengths || ''}
                      onChange={e => setData({
                        ...data,
                        profileEvaluationStep: { ...data.profileEvaluationStep, extracurricularStrengths: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Dictamen y Recomendaciones del Consejero</label>
                    <textarea
                      rows={2}
                      disabled={!canEdit}
                      placeholder="Estrategia recomendada para balancear opciones Dream, Target y Safety..."
                      value={data.profileEvaluationStep?.counselorRecommendations || ''}
                      onChange={e => setData({
                        ...data,
                        profileEvaluationStep: { ...data.profileEvaluationStep, counselorRecommendations: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: REVISION DE OPCIONES */}
              {activeStepIndex === 4 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Universidades Candidatas y Seleccionadas</h4>
                      <p className="text-[11px] text-slate-500">Opciones categorizadas en Dream (Alcance), Target (Meta) y Safety (Segura).</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowAddUni(!showAddUni)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Universidad
                      </button>
                    )}
                  </div>

                  {/* Add University Inline Form */}
                  {showAddUni && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nombre de la Universidad *</label>
                          <input
                            type="text"
                            placeholder="Ej: University of Toronto"
                            value={newUniName}
                            onChange={e => setNewUniName(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">País</label>
                          <input
                            type="text"
                            placeholder="Ej: Canadá"
                            value={newUniCountry}
                            onChange={e => setNewUniCountry(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Programa / Carrera</label>
                          <input
                            type="text"
                            placeholder="Ej: BSc Computer Science"
                            value={newUniProgram}
                            onChange={e => setNewUniProgram(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Categoría</label>
                          <select
                            value={newUniCategory}
                            onChange={e => setNewUniCategory(e.target.value as any)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none font-semibold"
                          >
                            <option value="Dream / Reach">Dream / Reach (Alcance)</option>
                            <option value="Target">Target (Objetivo Principal)</option>
                            <option value="Safety">Safety (Segura)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Costo Estimado / Año</label>
                          <input
                            type="text"
                            placeholder="Ej: $35,000 USD"
                            value={newUniCost}
                            onChange={e => setNewUniCost(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddUni(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddUniversity}
                          className="px-4 py-1 text-xs bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Guardar Universidad
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Universities Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-2.5">Universidad</th>
                          <th className="p-2.5">País</th>
                          <th className="p-2.5">Programa</th>
                          <th className="p-2.5">Categoría</th>
                          <th className="p-2.5">Costo Estimado</th>
                          <th className="p-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.optionsReviewStep?.options || []).map((uni) => {
                          let catBadge = "bg-blue-50 text-blue-700 border-blue-200";
                          if (uni.category === 'Dream / Reach') catBadge = "bg-purple-50 text-purple-700 border-purple-200";
                          if (uni.category === 'Safety') catBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";

                          return (
                            <tr key={uni.id} className="hover:bg-slate-50/70">
                              <td className="p-2.5 font-bold text-slate-900">{uni.name}</td>
                              <td className="p-2.5 text-slate-600">{uni.country}</td>
                              <td className="p-2.5 text-slate-700">{uni.program}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catBadge}`}>
                                  {uni.category}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-slate-600">{uni.costPerYear || '—'}</td>
                              <td className="p-2.5 text-right">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUniversity(uni.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                    title="Eliminar de lista"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(data.optionsReviewStep?.options || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                              No hay universidades registradas aún. Haz clic en "Agregar Universidad".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 6: SOLICITUD DOCUMENTOS */}
              {activeStepIndex === 5 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Checklist de Expediente y Documentación</h4>
                      <p className="text-[11px] text-slate-500">Marca los documentos recibidos para habilitar el envío de aplicaciones.</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowAddDoc(!showAddDoc)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Requisito
                      </button>
                    )}
                  </div>

                  {/* Add Document Inline Form */}
                  {showAddDoc && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nombre del Documento / Requisito *</label>
                          <input
                            type="text"
                            placeholder="Ej: Portafolio de Artes en PDF"
                            value={newDocName}
                            onChange={e => setNewDocName(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="newDocReq"
                            checked={newDocRequired}
                            onChange={e => setNewDocRequired(e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          <label htmlFor="newDocReq" className="text-xs font-bold text-slate-700 cursor-pointer">Obligatorio</label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddDoc(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddDocument}
                          className="px-4 py-1 text-xs bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Agregar al Checklist
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Checklist Items */}
                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                    {(data.documentsRequestStep?.documents || []).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => canEdit && handleToggleDocReceived(doc.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                          doc.received
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            doc.received ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {doc.received ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${doc.received ? 'text-emerald-950 line-through' : 'text-slate-800'}`}>
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                              {doc.required ? (
                                <span className="text-amber-700 font-semibold">• Obligatorio</span>
                              ) : (
                                <span className="text-slate-400">• Opcional</span>
                              )}
                              {doc.receivedDate && (
                                <span className="text-emerald-700 font-mono">Recibido el {doc.receivedDate}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocument(doc.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Eliminar requisito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 7: REVISION DE BECAS */}
              {activeStepIndex === 6 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Opciones de Becas y Ayuda Financiera</h4>
                      <p className="text-[11px] text-slate-500">Becas de mérito académico, necesidad económica, deportivas y talento.</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowAddSch(!showAddSch)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Beca
                      </button>
                    )}
                  </div>

                  {/* Add Scholarship Form */}
                  {showAddSch && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Nombre de la Beca *</label>
                          <input
                            type="text"
                            placeholder="Ej: International Presidential Scholarship"
                            value={newSchName}
                            onChange={e => setNewSchName(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Universidad u Organismo</label>
                          <input
                            type="text"
                            placeholder="Ej: Arizona State University"
                            value={newSchProvider}
                            onChange={e => setNewSchProvider(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Tipo de Beca</label>
                          <select
                            value={newSchType}
                            onChange={e => setNewSchType(e.target.value as any)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none font-semibold"
                          >
                            <option value="Mérito Académico">Mérito Académico</option>
                            <option value="Deportiva">Deportiva</option>
                            <option value="Necesidad Financiera">Necesidad Financiera</option>
                            <option value="Talento / Otra">Talento / Otra</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Monto Estimado</label>
                          <input
                            type="text"
                            placeholder="Ej: $15,000 USD/año"
                            value={newSchAmount}
                            onChange={e => setNewSchAmount(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddSch(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddScholarship}
                          className="px-4 py-1 text-xs bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Guardar Beca
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scholarships List */}
                  <div className="space-y-2">
                    {(data.scholarshipsReviewStep?.scholarships || []).map((sch) => (
                      <div key={sch.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{sch.name}</span>
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              {sch.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            Institución: <span className="text-slate-700 font-semibold">{sch.institutionOrProvider}</span> • Monto: <span className="text-emerald-700 font-mono font-bold">{sch.amount}</span>
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveScholarship(sch.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 8: APLICACION ENVIADA */}
              {activeStepIndex === 7 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Postulaciones Universitarias Enviadas</h4>
                      <p className="text-[11px] text-slate-500">Folios de confirmación y estado en portales de admisión.</p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setShowAddApp(!showAddApp)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar Envío
                      </button>
                    )}
                  </div>

                  {/* Add App Form */}
                  {showAddApp && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Universidad *</label>
                          <input
                            type="text"
                            placeholder="Ej: University of British Columbia"
                            value={newAppName}
                            onChange={e => setNewAppName(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Plataforma</label>
                          <input
                            type="text"
                            placeholder="Ej: Common App / Portal Directo"
                            value={newAppPlatform}
                            onChange={e => setNewAppPlatform(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">ID de Aplicación / Folio</label>
                          <input
                            type="text"
                            placeholder="Ej: CA-889123"
                            value={newAppId}
                            onChange={e => setNewAppId(e.target.value)}
                            className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddApp(false)}
                          className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddApplication}
                          className="px-4 py-1 text-xs bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                        >
                          Guardar Aplicación
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Applications Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(data.applicationSubmittedStep?.applications || []).map((app) => (
                      <div key={app.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">{app.platform}</span>
                            <h5 className="text-xs font-bold text-slate-900">{app.universityName}</h5>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveApplication(app.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100 font-mono">
                          {app.applicationId && <p>ID: <span className="font-bold text-slate-800">{app.applicationId}</span></p>}
                          <p>Fecha de envío: {app.submissionDate || new Date().toISOString().split('T')[0]}</p>
                          <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            {app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 9: CARTA ACEPTACION */}
              {activeStepIndex === 8 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Resolución Oficial de Admisión</h4>
                      <p className="text-[11px] text-emerald-800">Registra los datos de la carta de aceptación emitida por la universidad.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Universidad que Admitió al Estudiante</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: University of British Columbia"
                        value={data.acceptanceLetterStep?.acceptedUniversity || ''}
                        onChange={e => setData({
                          ...data,
                          acceptanceLetterStep: { ...data.acceptanceLetterStep, acceptedUniversity: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Carrera / Programa Oficial</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: Bachelor of Commerce (Honours)"
                        value={data.acceptanceLetterStep?.officialMajor || ''}
                        onChange={e => setData({
                          ...data,
                          acceptanceLetterStep: { ...data.acceptanceLetterStep, officialMajor: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Beca / Ayuda Financiera Otorgada</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Ej: $10,000 CAD anuales renovables"
                        value={data.acceptanceLetterStep?.scholarshipAwarded || ''}
                        onChange={e => setData({
                          ...data,
                          acceptanceLetterStep: { ...data.acceptanceLetterStep, scholarshipAwarded: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Enlace a Carta de Aceptación (PDF)</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="https://... enlace al documento oficial"
                        value={data.acceptanceLetterStep?.letterFileUrl || ''}
                        onChange={e => setData({
                          ...data,
                          acceptanceLetterStep: { ...data.acceptanceLetterStep, letterFileUrl: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 10: FECHA INICIO */}
              {activeStepIndex === 9 && (
                <div className="pt-6 space-y-4 animate-in fade-in">
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Matrícula e Inicio del Ciclo Universitario</h4>
                      <p className="text-[11px] text-indigo-800">Cierre de proceso: fechas clave para la llegada y bienvenida del alumno al campus.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Inicio de Clases Universitarias</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={data.programStartDateStep?.classesStartDate || ''}
                        onChange={e => setData({
                          ...data,
                          programStartDateStep: { ...data.programStartDateStep, classesStartDate: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Semana de Orientación (Welcome Week)</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={data.programStartDateStep?.orientationDate || ''}
                        onChange={e => setData({
                          ...data,
                          programStartDateStep: { ...data.programStartDateStep, orientationDate: e.target.value } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estatus de Visa de Estudiante</label>
                      <select
                        disabled={!canEdit}
                        value={data.programStartDateStep?.visaStatus || 'En trámite'}
                        onChange={e => setData({
                          ...data,
                          programStartDateStep: { ...data.programStartDateStep, visaStatus: e.target.value as any } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                      >
                        <option value="No requerida">No requerida (Nacionalidad local)</option>
                        <option value="En trámite">En trámite / Cita consular agendada</option>
                        <option value="Aprobada / Emitida">Aprobada / Emitida</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Alojamiento / Housing</label>
                      <select
                        disabled={!canEdit}
                        value={data.programStartDateStep?.housingStatus || 'En trámite'}
                        onChange={e => setData({
                          ...data,
                          programStartDateStep: { ...data.programStartDateStep, housingStatus: e.target.value as any } as any
                        })}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                      >
                        <option value="En trámite">En trámite / Solicitud enviada</option>
                        <option value="Campus Dorms">Residencia Universitaria (On-campus)</option>
                        <option value="Off-campus">Alojamiento Externo (Off-campus)</option>
                        <option value="Confirmado">Confirmado y Reservado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notas de Cierre y Recomendaciones Finales</label>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      placeholder="Instrucciones previas al viaje, contacto de emergencia institucional y despedida de consejería..."
                      value={data.programStartDateStep?.finalNotes || ''}
                      onChange={e => setData({
                        ...data,
                        programStartDateStep: { ...data.programStartDateStep, finalNotes: e.target.value } as any
                      })}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stepper Navigation Bar */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Etapa Anterior
              </button>

              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                Paso {activeStepIndex + 1} de {stepsList.length}
              </div>

              {activeStepIndex < stepsList.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(prev => Math.min(stepsList.length - 1, prev + 1))}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  Siguiente Etapa →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleSave()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Finalizar y Guardar
                </button>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

// Helper component for users icon to avoid any import issues
const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
