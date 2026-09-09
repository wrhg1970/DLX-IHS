import React, { useState, useMemo, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { 
  Sparkles, 
  PlusCircle, 
  Search, 
  Info, 
  Calendar, 
  DollarSign, 
  Edit, 
  Trash2, 
  AlertCircle,
  Building2,
  User,
  Mail,
  FileText,
  MapPin,
  UploadCloud,
  FileDown,
  Trash,
  ChevronRight,
  Sparkle,
  Users,
  Key,
  BookOpen
} from "lucide-react";

interface ServiceConfig {
  id: string; // Internal tab ID
  name: string; // Human name
  productType: string; // Matches Tipo de Producto
  defaultProviderId: number; // Prepopulated provider ID
  description: string;
  badgeColor: string;
  accentColor: string;
  iconBg: string;
}

const SERVICES: ServiceConfig[] = [
  {
    id: "certificacion_ingles",
    name: "Certificación de Inglés",
    productType: "Certificación Ingles",
    defaultProviderId: 3, // ITEP
    description: "Evaluaciones de aptitud y certificación de dominio de inglés (TOEFL, ITEP).",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    accentColor: "border-blue-500 hover:border-blue-500",
    iconBg: "bg-blue-100 text-blue-600"
  },
  {
    id: "university_admission",
    name: "University Admission",
    productType: "University Admission",
    defaultProviderId: 5, // Estudiantes Embajadores
    description: "Asesoramiento completo y preparación de solicitudes para admisiones universitarias internacionales.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    accentColor: "border-purple-500 hover:border-purple-500",
    iconBg: "bg-purple-100 text-purple-600"
  },
  {
    id: "centro_idiomas_digital",
    name: "Centro de Idiomas Digital",
    productType: "Centro de Idiomas Digital",
    defaultProviderId: 5, // Estudiantes Embajadores
    description: "Acceso y aprendizaje autodidacta de lenguas a través de plataformas interactivas en línea.",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    accentColor: "border-rose-500 hover:border-rose-500",
    iconBg: "bg-rose-100 text-rose-600"
  },
  {
    id: "schmoop",
    name: "Schmoop",
    productType: "Schmoop",
    defaultProviderId: 6, // Schmoop
    description: "Plataforma de recursos de preparación para exámenes estandarizados, guías de estudio y cursos AP.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    accentColor: "border-amber-500 hover:border-amber-500",
    iconBg: "bg-amber-100 text-amber-600"
  },
  {
    id: "iivvo",
    name: "iivvo",
    productType: "iivvo",
    defaultProviderId: 6, // Default to Schmoop or let user choose other
    description: "Servicio complementario premium de orientación y herramientas de soporte académico.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentColor: "border-emerald-500 hover:border-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600"
  }
];

export function ServiciosExtras() {
  const { 
    institutions,
    students, 
    classes, 
    providers, 
    enrollments, 
    addEnrollment, 
    deleteEnrollment, 
    updateEnrollment, 
    addClass,
    addActivity,
    updateStudent
  } = useAppContext();

  const [activeServiceTab, setActiveServiceTab] = useState<string>("certificacion_ingles");
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<any>(null);
  
  // Search state for students lists inside tabs
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const activeService = useMemo(() => {
    return SERVICES.find(s => s.id === activeServiceTab) || SERVICES[0];
  }, [activeServiceTab]);

  // Specific service helpers
  const isCredentialsService = useMemo(() => {
    return activeService.id === "centro_idiomas_digital" || activeService.id === "schmoop";
  }, [activeService]);

  const isUniversityService = useMemo(() => {
    return activeService.id === "university_admission";
  }, [activeService]);

  // Bulk Enrollment State
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [bulkStudentSearch, setBulkStudentSearch] = useState("");
  const [bulkFormData, setBulkFormData] = useState<Record<number, {
    email: string;
    curp: string;
    birthDate: string;
    lugar: "Escuela" | "Casa";
    usuario: string;
    contrasena: string;
    area: string;
    destino: string;
  }>>({});

  // Form State
  const [enrollForm, setEnrollForm] = useState({
    institutionId: "",
    studentId: "",
    providerId: "",
    enrollmentDate: new Date().toISOString().split('T')[0],
    activationDate: new Date().toISOString().split('T')[0],
    endDate: "",
    status: "Active" as "Active" | "Completed" | "On hold" | "Withdrawn",
    price: "",
    notes: "",
    curp: "",
    lugar: "Escuela" as "Escuela" | "Casa",
    resultadoUrl: "",
    resultadoFileName: "",
    email: "",
    birthDate: "",
    usuario: "",
    contrasena: "",
    area: "",
    destino: ""
  });

  // Calculate Representative Class Names for the 5 Extra Services
  const getServiceClassName = (service: ServiceConfig) => {
    return `Servicio Extra - ${service.name}`;
  };

  // Helper code to calculate age based on local timestamp
  const calculateAge = (birthDateStr: string | undefined): number | null => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date(); // Accurate current system year 2026
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Helper: Find or create standard class representing the service under the provider
  const ensureServiceClassExists = (service: ServiceConfig, providerId: number): number => {
    const className = getServiceClassName(service);
    const existing = classes.find(c => c.name === className && Number(c.providerId) === providerId);
    
    if (existing) {
      return existing.id;
    }

    // Creating class dynamically to support native enrollments structure
    const newId = classes.length > 0 ? Math.max(...classes.map(c => Number(c.id))) + 1 : 1;
    addClass({
      name: className,
      code: `EXT-${service.name.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 8)}`,
      creditType: "Crédito completo",
      syllabus: `Syllabus automático para el Servicio Extra: ${service.name}`,
      validity: "2030-12-31",
      providerId: providerId
    });

    return newId;
  };

  // Filter and alphabetically sort active students of selected institution
  const filteredAndSortedFormStudents = useMemo(() => {
    if (!enrollForm.institutionId) return [];
    return students
      .filter(s => 
        Number(s.institutionId) === Number(enrollForm.institutionId) &&
        ["activo", "active"].includes((s.status || "").toLowerCase())
      )
      .sort((a, b) => {
        const nameA = `${a.name} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.name} ${b.lastName || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB, "es");
      });
  }, [students, enrollForm.institutionId]);

  // Handle selected student change
  const handleStudentSelect = (studentIdStr: string) => {
    const sId = Number(studentIdStr);
    if (!sId) {
      setEnrollForm(prev => ({
        ...prev,
        studentId: "",
        email: "",
        curp: "",
        birthDate: ""
      }));
      return;
    }
    const student = students.find(s => s.id === sId);
    if (student) {
      setEnrollForm(prev => ({
        ...prev,
        studentId: studentIdStr,
        email: student.email || "",
        curp: student.curp || "",
        birthDate: student.birthDate || "",
        usuario: "",
        contrasena: "",
        area: "",
        destino: ""
      }));
    }
  };

  // Specific methods for managing bulk student registrations
  const updateBulkStudentField = (studentId: number, field: string, value: any) => {
    setBulkFormData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleToggleBulkStudent = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
      setBulkFormData(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    } else {
      setSelectedStudentIds(prev => [...prev, studentId]);
      setBulkFormData(prev => ({
        ...prev,
        [studentId]: {
          email: student.email || "",
          curp: student.curp || "",
          birthDate: student.birthDate || "",
          lugar: "Escuela" as "Escuela" | "Casa",
          usuario: "",
          contrasena: "",
          area: "",
          destino: ""
        }
      }));
    }
  };

  const handleSelectAllBulkStudents = () => {
    const toAdd: number[] = [];
    const newBulkData = { ...bulkFormData };
    
    filteredAndSortedFormStudents.forEach(s => {
      toAdd.push(s.id);
      if (!newBulkData[s.id]) {
        newBulkData[s.id] = {
          email: s.email || "",
          curp: s.curp || "",
          birthDate: s.birthDate || "",
          lugar: "Escuela",
          usuario: "",
          contrasena: "",
          area: "",
          destino: ""
        };
      }
    });

    setSelectedStudentIds(toAdd);
    setBulkFormData(newBulkData);
  };

  const handleDeselectAllBulkStudents = () => {
    setSelectedStudentIds([]);
    setBulkFormData({});
  };

  // Enrolled students inside the active service with calculated metadata
  const enrolledStudentsInActiveService = useMemo(() => {
    const className = getServiceClassName(activeService);
    
    // Find all class IDs for this service (e.g. "Servicio Extra - Schmoop" created dynamically or manually)
    const matchingClassIds = classes
      .filter(c => c.name === className || c.name.toLowerCase() === activeService.name.toLowerCase())
      .map(c => Number(c.id));

    // Get enrollment objects that tie directly to these classes
    const activeEnrollments = enrollments.filter(e => matchingClassIds.includes(Number(e.classId)));

    return activeEnrollments.map(env => {
      const student = students.find(s => s.id === env.studentId);
      const provider = providers.find(p => p.id === env.providerId);
      const classItem = classes.find(c => c.id === env.classId);

      const activeCurp = env.curp || student?.curp || "-";
      const studentAge = calculateAge(student?.birthDate);

      return {
        ...env,
        studentName: student ? `${student.name} ${student.lastName || ""}`.trim() : "Alumno Desconocido",
        studentEmail: (env as any).email || student?.email || "Sin correo",
        studentPhone: student?.phone || "Sin teléfono",
        studentModalidad: student?.modality || "No especificada",
        providerName: provider ? (provider.commercialName || provider.legalName) : "Sin Proveedor",
        className: classItem?.name || activeService.name,
        curp: activeCurp,
        edad: studentAge,
        lugar: env.lugar || "Escuela",
        resultadoUrl: env.resultadoUrl,
        resultadoFileName: env.resultadoFileName
      };
    }).filter(env => {
      if (!studentSearchQuery) return true;
      const term = studentSearchQuery.toLowerCase();
      return env.studentName.toLowerCase().includes(term) || 
             env.studentEmail.toLowerCase().includes(term) ||
             env.providerName.toLowerCase().includes(term) ||
             env.curp.toLowerCase().includes(term);
    });
  }, [activeService, enrollments, students, providers, classes, studentSearchQuery]);

  const handleOpenEnrollModal = (enrollmentToEdit: any = null) => {
    setIsMultiSelect(false);
    setSelectedStudentIds([]);
    setBulkStudentSearch("");
    setBulkFormData({});

    if (enrollmentToEdit) {
      setEditingEnrollment(enrollmentToEdit);
      const studentObj = students.find(s => s.id === enrollmentToEdit.studentId);
      setEnrollForm({
        institutionId: studentObj ? String(studentObj.institutionId) : "",
        studentId: String(enrollmentToEdit.studentId),
        providerId: String(enrollmentToEdit.providerId || ""),
        enrollmentDate: enrollmentToEdit.enrollmentDate || "",
        activationDate: enrollmentToEdit.activationDate || enrollmentToEdit.startDate || "",
        endDate: enrollmentToEdit.endDate || "",
        status: enrollmentToEdit.status || "Active",
        price: String(enrollmentToEdit.price || ""),
        notes: enrollmentToEdit.notes || "",
        curp: enrollmentToEdit.curp || studentObj?.curp || "",
        lugar: enrollmentToEdit.lugar || "Escuela",
        resultadoUrl: enrollmentToEdit.resultadoUrl || "",
        resultadoFileName: enrollmentToEdit.resultadoFileName || "",
        email: enrollmentToEdit.email || studentObj?.email || "",
        birthDate: studentObj?.birthDate || "",
        usuario: enrollmentToEdit.usuario || "",
        contrasena: enrollmentToEdit.contrasena || "",
        area: enrollmentToEdit.area || "",
        destino: enrollmentToEdit.destino || ""
      });
    } else {
      setEditingEnrollment(null);
      setEnrollForm({
        institutionId: "",
        studentId: "",
        providerId: String(activeService.defaultProviderId),
        enrollmentDate: new Date().toISOString().split('T')[0],
        activationDate: new Date().toISOString().split('T')[0],
        endDate: "",
        status: "Active",
        price: "",
        notes: "",
        curp: "",
        lugar: "Escuela",
        resultadoUrl: "",
        resultadoFileName: "",
        email: "",
        birthDate: "",
        usuario: "",
        contrasena: "",
        area: "",
        destino: ""
      });
    }
    setIsEnrollModalOpen(true);
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isMultiSelect) {
      if (selectedStudentIds.length === 0) {
        alert("Favor de seleccionar al menos un alumno para inscribir.");
        return;
      }
      if (!enrollForm.providerId) return;

      const providerId = Number(enrollForm.providerId);
      const classId = ensureServiceClassExists(activeService, providerId);

      selectedStudentIds.forEach(studentId => {
        const studentData = bulkFormData[studentId] || {
          email: "",
          curp: "",
          birthDate: "",
          lugar: "Escuela" as "Escuela" | "Casa",
          usuario: "",
          contrasena: "",
          area: "",
          destino: ""
        };

        const selectedStudent = students.find(s => s.id === studentId);

        // 1. Sync updated fields with student database
        if (selectedStudent) {
          const updatesToMerge: any = {};
          if (studentData.email && studentData.email !== selectedStudent.email) {
            updatesToMerge.email = studentData.email;
          }
          if (studentData.curp && studentData.curp !== selectedStudent.curp) {
            updatesToMerge.curp = studentData.curp;
          }
          if (studentData.birthDate && studentData.birthDate !== selectedStudent.birthDate) {
            updatesToMerge.birthDate = studentData.birthDate;
          }

          if (Object.keys(updatesToMerge).length > 0) {
            updateStudent(studentId, updatesToMerge);
          }
        }

        const payload = {
          classId: classId,
          studentId: studentId,
          providerId: providerId,
          startDate: enrollForm.activationDate,
          activationDate: enrollForm.activationDate,
          enrollmentDate: enrollForm.enrollmentDate,
          endDate: enrollForm.endDate,
          status: enrollForm.status,
          price: enrollForm.price ? Number(enrollForm.price) : undefined,
          notes: enrollForm.notes,
          curp: studentData.curp,
          lugar: studentData.lugar,
          resultadoUrl: enrollForm.resultadoUrl,
          resultadoFileName: enrollForm.resultadoFileName,
          usuario: studentData.usuario || "",
          contrasena: studentData.contrasena || "",
          area: studentData.area || "",
          destino: studentData.destino || ""
        };

        addEnrollment(payload);

        addActivity({
          institutionId: selectedStudent?.institutionId || 1,
          studentId: studentId,
          date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
          description: `Servicios Extras [Inscripción Múltiple]: Alumno inscrito en el servicio extra "${activeService.name}" con estatus "${payload.status}".`
        });
      });

      setIsEnrollModalOpen(false);
      setEditingEnrollment(null);
      setSelectedStudentIds([]);
      setBulkFormData({});
    } else {
      if (!enrollForm.studentId || !enrollForm.providerId) return;

      const studentId = Number(enrollForm.studentId);
      const providerId = Number(enrollForm.providerId);
      const selectedStudent = students.find(s => s.id === studentId);

      // 1. Check if email/birthdate/curp are updated and require sync with original student profile
      if (selectedStudent) {
        const updatesToMerge: any = {};
        if (enrollForm.email && enrollForm.email !== selectedStudent.email) {
          updatesToMerge.email = enrollForm.email;
        }
        if (enrollForm.curp && enrollForm.curp !== selectedStudent.curp) {
          updatesToMerge.curp = enrollForm.curp;
        }
        if (enrollForm.birthDate && enrollForm.birthDate !== selectedStudent.birthDate) {
          updatesToMerge.birthDate = enrollForm.birthDate;
        }

        if (Object.keys(updatesToMerge).length > 0) {
          updateStudent(studentId, updatesToMerge);
        }
      }

      // 2. Ensure representative class exists in catalog
      const classId = ensureServiceClassExists(activeService, providerId);

      const payload = {
        classId: classId,
        studentId: studentId,
        providerId: providerId,
        startDate: enrollForm.activationDate,
        activationDate: enrollForm.activationDate,
        enrollmentDate: enrollForm.enrollmentDate,
        endDate: enrollForm.endDate,
        status: enrollForm.status,
        price: enrollForm.price ? Number(enrollForm.price) : undefined,
        notes: enrollForm.notes,
        curp: enrollForm.curp,
        lugar: enrollForm.lugar,
        resultadoUrl: enrollForm.resultadoUrl,
        resultadoFileName: enrollForm.resultadoFileName,
        usuario: enrollForm.usuario || "",
        contrasena: enrollForm.contrasena || "",
        area: enrollForm.area || "",
        destino: enrollForm.destino || ""
      };

      if (editingEnrollment) {
        updateEnrollment(editingEnrollment.id, payload);
        
        addActivity({
          institutionId: selectedStudent?.institutionId || 1,
          studentId: studentId,
          date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
          description: `Servicios Extras: Se actualizó la inscripción para "${activeService.name}" de manera externa.`
        });
      } else {
        addEnrollment(payload);

        addActivity({
          institutionId: selectedStudent?.institutionId || 1,
          studentId: studentId,
          date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
          description: `Servicios Extras: Alumno inscrito en el servicio extra "${activeService.name}" con estatus "${payload.status}".`
        });
      }

      setIsEnrollModalOpen(false);
      setEditingEnrollment(null);
    }
  };

  const handleDeleteEnrollment = (id: number, studentName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la inscripción de "${studentName}" en "${activeService.name}"?`)) {
      deleteEnrollment(id);
    }
  };

  // Drag and Drop process
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setEnrollForm(prev => ({
        ...prev,
        resultadoUrl: reader.result as string,
        resultadoFileName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearUploadedFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEnrollForm(prev => ({
      ...prev,
      resultadoUrl: "",
      resultadoFileName: ""
    }));
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header Block with Premium branding */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1e233d] to-[#0f111a] p-6 rounded-2xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Sparkles className="w-96 h-96 text-white" />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Proveedores de Servicios Especiales
            </div>
            <h1 id="servicios-extras-heading" className="text-2xl font-black tracking-tight font-sans">
              Servicios Extras
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
              Consola unificada para inscripciones y control académico de productos externos. Administre Certificaciones TOEFL/iTEP, Schmoop, iivvo, consultoría de admisiones y licencias digitales con sincronización directa e historial.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Grid Layout: Left Tabs Selection & Right Detailed Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Left column: Services selection cards */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
            Servicios Disponibles
          </h2>
          <div className="space-y-2">
            {SERVICES.map((serv) => {
              const className = getServiceClassName(serv);
              const matchingClassIds = classes
                .filter(c => c.name === className || c.name.toLowerCase() === serv.name.toLowerCase())
                .map(c => Number(c.id));
              
              const countEnrollments = enrollments.filter(e => matchingClassIds.includes(Number(e.classId))).length;
              const isActive = activeServiceTab === serv.id;

              return (
                <button
                  key={serv.id}
                  onClick={() => {
                    setActiveServiceTab(serv.id);
                    setStudentSearchQuery("");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 outline-none flex items-start gap-3 relative cursor-pointer ${
                    isActive 
                      ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/10" 
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${serv.iconBg} shrink-0`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                        Módulo
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-250">
                        {countEnrollments} Alumnos
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mt-0.5">
                      {serv.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {serv.description}
                    </p>
                  </div>

                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-l" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Students list and interaction panel */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active Service Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${activeService.badgeColor}`}>
                  Servicio Activo
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Enfoque: {activeService.name}
                </h2>
                <p className="text-xs text-slate-500 max-w-xl">
                  {activeService.description}
                </p>
              </div>

              <button
                onClick={() => handleOpenEnrollModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Inscribir Alumno a {activeService.name}
              </button>
            </div>

            {/* In-tab search & stats */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Buscar alumnos por nombre, email, proveedor o CURP...`}
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 font-medium placeholder-slate-400"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center shrink-0 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total en vista:</span>
                <strong className="text-xs font-black text-indigo-600 font-mono">
                  {enrolledStudentsInActiveService.length} Alumnos
                </strong>
              </div>
            </div>

            {/* List of enrolled students */}
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Alumno</th>
                      <th className="px-4 py-3">CURP / Edad</th>
                      <th className="px-4 py-3">Lugar</th>
                      <th className="px-4 py-3">Proveedor Especial</th>
                      {isCredentialsService && <th className="px-4 py-3">Credenciales</th>}
                      {isUniversityService && <th className="px-4 py-3">Área / Destino</th>}
                      <th className="px-4 py-3">Fecha Inicio / Fin</th>
                      <th className="px-4 py-3 text-center">Resultado</th>
                      <th className="px-4 py-3">Estatus</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {enrolledStudentsInActiveService.length === 0 ? (
                      <tr>
                        <td colSpan={isCredentialsService || isUniversityService ? 9 : 8} className="px-4 py-12 text-center text-slate-400 italic">
                          No hay alumnos inscritos en "{activeService.name}" que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      enrolledStudentsInActiveService.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{item.studentName}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{item.studentEmail}</span>
                              <span className="text-[9px] text-indigo-600 font-medium">{item.studentModalidad}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-slate-700">{item.curp}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.edad !== null ? `${item.edad} años` : "Edad no especificada"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.lugar === "Casa" 
                                ? "bg-amber-50 text-amber-700 border-amber-150"
                                : "bg-sky-50 text-sky-700 border-sky-150"
                            }`}>
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              {item.lugar}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {item.providerName}
                          </td>
                          {isCredentialsService && (
                            <td className="px-4 py-3">
                              <div className="flex flex-col text-[11px] gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-[170px]">
                                <span className="font-semibold text-slate-800 flex items-center gap-1">
                                  <Key className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <code className="bg-white rounded px-1.5 py-0.5 text-[10px] font-mono select-all border border-slate-200 truncate shadow-sm" title={item.usuario}>{item.usuario || "S.U."}</code>
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium pl-4 truncate" title="Contraseña">Pass: {item.contrasena || "S.N."}</span>
                              </div>
                            </td>
                          )}
                          {isUniversityService && (
                            <td className="px-4 py-3">
                              <div className="flex flex-col text-[11px] gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-[170px]">
                                <span className="font-bold text-slate-800 flex items-center gap-1 truncate" title={item.area}>
                                  <BookOpen className="w-3 h-3 text-purple-500 shrink-0" />
                                  {item.area || "Sin área"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium pl-4 truncate" title={item.destino}>Destino: {item.destino || "S.N."}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium text-slate-600">
                            <div className="flex flex-col text-[11px]">
                              <span><strong>Inicio:</strong> {item.startDate || item.activationDate || "-"}</span>
                              <span><strong>Fin:</strong> {item.endDate || "Indefinida"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.resultadoUrl ? (
                              <a
                                href={item.resultadoUrl}
                                download={item.resultadoFileName || "Certificado.pdf"}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold px-2 py-1 rounded text-[10px] shadow-sm transition-colors cursor-pointer"
                                title={`Descargar: ${item.resultadoFileName}`}
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                Descargar
                              </a>
                            ) : (
                              <span className="text-slate-300 italic text-[10px]">Sin archivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
                              item.status === "Active" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : item.status === "Completed"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : item.status === "On hold"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}>
                              {item.status === "Active" ? "Activo" : 
                               item.status === "Completed" ? "Completado" : 
                               item.status === "On hold" ? "Pausa" : "Baja/Retirado"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleOpenEnrollModal(item)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                title="Editar inscripción"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEnrollment(item.id, item.studentName)}
                                className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded cursor-pointer"
                                title="Eliminar inscripción"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note of instructions */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700 mb-0.5">Nota de Funcionamiento Técnico: </p>
                <p className="leading-relaxed">
                  Las inscripciones son totalmente persistentes. Al guardar, los datos de contacto y el número identificador único <strong className="font-mono">CURP</strong> se sincronizan de manera cruzada con el registro definitivo del alumno para evitar inconsistencias de captura. Puede descargar los resultados del examen directamente haciendo uso de la columna "Resultado".
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Optimized Wide Enrollment Modal */}
      {isEnrollModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsEnrollModalOpen(false);
            setEditingEnrollment(null);
          }}
          size="4xl"
          title={editingEnrollment ? `Editar Inscripción: ${activeService.name}` : `Formulario de Inscripción: ${activeService.name}`}
        >
          <form onSubmit={handleEnrollSubmit} className="space-y-6">
            
            {/* Alert / Summary */}
            <div className="bg-indigo-50/60 border border-indigo-150 text-indigo-950 p-4 rounded-xl text-xs leading-relaxed flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block mb-0.5">Asignación de Servicio Especial</span>
                <p>Está registrando la incorporación de un estudiante a <strong>{activeService.name}</strong>. Complete cada campo para el correcto control financiero, administrativo y la carga de comprobantes oficiales.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form Panel: Alumno & Fondeo */}
              <div className="lg:col-span-6 space-y-4">
                
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Building2 className="w-4 h-4" /> 1. Filtros y Búsqueda de Alumno
                </h3>

                {/* 1. Institucion Selection (MANDATORY) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Institución de Estudiante <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={enrollForm.institutionId}
                    onChange={e => {
                      setEnrollForm({
                        ...enrollForm,
                        institutionId: e.target.value,
                        studentId: "",
                        email: "",
                        curp: "",
                        birthDate: "",
                        usuario: "",
                        contrasena: "",
                        area: "",
                        destino: ""
                      });
                      setIsMultiSelect(false);
                      setSelectedStudentIds([]);
                      setBulkFormData({});
                    }}
                    className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="">Seleccione una Institución primero...</option>
                    {[...institutions]
                      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
                      .map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.country || "Ubicación s.n."})
                        </option>
                      ))}
                  </select>
                </div>

                {/* 1b. Multi-select toggle (Only when adding, not when editing) */}
                {!editingEnrollment && enrollForm.institutionId && (
                  <div className="bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between transition-colors animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">¿Inscribir múltiples alumnos?</span>
                        <span className="text-[10px] text-slate-500">Permite registrar un lote completo de alumnos de esta escuela a la vez.</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMultiSelect}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsMultiSelect(checked);
                          setSelectedStudentIds([]);
                          setBulkFormData({});
                          setEnrollForm(prev => ({
                            ...prev,
                            studentId: "",
                            email: "",
                            curp: "",
                            birthDate: "",
                            usuario: "",
                            contrasena: "",
                            area: "",
                            destino: ""
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                )}

                {isMultiSelect ? (
                  /* MULTISELECTION CHECKS COMPONENT */
                  <div className="space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-750 uppercase tracking-wider">
                        Seleccionar alumnos de la escuela <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllBulkStudents}
                          className="text-[9px] text-indigo-700 hover:text-indigo-900 font-extrabold uppercase bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded cursor-pointer transition-all"
                        >
                          Seleccionar Todos
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllBulkStudents}
                          className="text-[9px] text-slate-500 hover:text-slate-700 font-extrabold uppercase bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-all"
                        >
                          Deseleccionar
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar alumnos por de esta escuela..."
                        value={bulkStudentSearch}
                        onChange={(e) => setBulkStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-755 placeholder-slate-400"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-xl max-h-[190px] overflow-y-auto p-2.5 bg-white space-y-1 divide-y divide-slate-100">
                      {filteredAndSortedFormStudents.filter(s => {
                        if (!bulkStudentSearch) return true;
                        const t = bulkStudentSearch.toLowerCase();
                        return `${s.name} ${s.lastName || ""}`.toLowerCase().includes(t) || (s.email || "").toLowerCase().includes(t);
                      }).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">No se encontraron estudiantes activos.</p>
                      ) : (
                        filteredAndSortedFormStudents
                          .filter(s => {
                            if (!bulkStudentSearch) return true;
                            const t = bulkStudentSearch.toLowerCase();
                            return `${s.name} ${s.lastName || ""}`.toLowerCase().includes(t) || (s.email || "").toLowerCase().includes(t);
                          })
                          .map(student => {
                            const isChecked = selectedStudentIds.includes(student.id);
                            return (
                              <label
                                key={student.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? "bg-indigo-50/40" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleBulkStudent(student.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div className="text-xs min-w-0 flex-1">
                                  <p className="font-bold text-slate-800 truncate">{student.name} {student.lastName || ""}</p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">{student.email || "Sin email"}</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-500">
                                  {student.modality || "Fondera"}
                                </span>
                              </label>
                            );
                          })
                      )}
                    </div>
                    
                    <div className="bg-slate-100 p-2.5 rounded-xl text-[10px] text-slate-650 flex justify-between items-center border border-slate-200/50">
                      <span>Alumnos en lista de inscripción:</span>
                      <strong className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-120">
                        {selectedStudentIds.length} Alumnos
                      </strong>
                    </div>

                  </div>
                ) : (
                  /* SINGLE STUDENT SELECTION (STANDARD WORKFLOW) */
                  <div className="space-y-4 animate-in fade-in">
                    {/* 2. Student Selection with filters (ONLY ACTIVE) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Seleccionar Alumno (Solo Activos) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        disabled={!enrollForm.institutionId || !!editingEnrollment}
                        value={enrollForm.studentId}
                        onChange={e => handleStudentSelect(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 disabled:bg-slate-55 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {!enrollForm.institutionId && (
                          <option value="">Seleccione la institución antes del alumno...</option>
                        )}
                        {enrollForm.institutionId && filteredAndSortedFormStudents.length === 0 && (
                          <option value="">No hay alumnos activos para esta institución</option>
                        )}
                        {enrollForm.institutionId && filteredAndSortedFormStudents.length > 0 && (
                          <>
                            <option value="">Seleccionar Alumno...</option>
                            {filteredAndSortedFormStudents.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.lastName || ""} ({s.modality || "Fondera"})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>

                    {/* Academic Profile Sync Sections (Fields prefill dynamically) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-3.5">
                      <span className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">
                        Sincronización de Perfil (Captura Directa)
                      </span>

                      {/* Mail & CURP */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Email Académico</label>
                          <div className="relative">
                            <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="email"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.email}
                              onChange={e => setEnrollForm({...enrollForm, email: e.target.value})}
                              className="w-full border border-slate-200 bg-white rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed"
                              placeholder="comunicacion@alumno.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">CURP Oficial</label>
                          <div className="relative">
                            <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.curp}
                              onChange={e => setEnrollForm({...enrollForm, curp: e.target.value.toUpperCase()})}
                              maxLength={18}
                              className="w-full border border-slate-200 bg-white rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                              placeholder="CURP18DIGITOS"
                            />
                          </div>
                        </div>
                      </div>

                      {/* BirthDate & Live Calculated Age */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Fecha Nacimiento</label>
                          <input
                            type="date"
                            required
                            disabled={!enrollForm.studentId}
                            value={enrollForm.birthDate}
                            onChange={e => setEnrollForm({...enrollForm, birthDate: e.target.value})}
                            className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="p-2 border border-indigo-100 bg-indigo-50/40 rounded-lg flex items-center justify-between text-indigo-950">
                          <span className="text-[10px] font-semibold">Edad Calculada:</span>
                          <strong className="text-xs font-black">
                            {enrollForm.birthDate ? `${calculateAge(enrollForm.birthDate)} años` : "S.N."}
                          </strong>
                        </div>
                      </div>

                      {/* Conditional single student credentials fields: user & password */}
                      {isCredentialsService && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/60 animate-in fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Usuario / Licencia</label>
                            <input
                              type="text"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.usuario}
                              onChange={e => setEnrollForm({...enrollForm, usuario: e.target.value})}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                              placeholder="Capturar usuario"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Contraseña</label>
                            <input
                              type="text"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.contrasena}
                              onChange={e => setEnrollForm({...enrollForm, contrasena: e.target.value})}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                              placeholder="Capturar clave"
                            />
                          </div>
                        </div>
                      )}

                      {/* Conditional single student university fields: area & destino */}
                      {isUniversityService && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 p-3 rounded-lg border border-purple-100/60 animate-in fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">Área de Estudios</label>
                            <input
                              type="text"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.area}
                              onChange={e => setEnrollForm({...enrollForm, area: e.target.value})}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                              placeholder="Ej: Ingeniería"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">Destino Universitario</label>
                            <input
                              type="text"
                              required
                              disabled={!enrollForm.studentId}
                              value={enrollForm.destino}
                              onChange={e => setEnrollForm({...enrollForm, destino: e.target.value})}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                              placeholder="Ej: España, Canadá"
                            />
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Place of Service / Lugar */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Lugar del Servicio <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={!enrollForm.studentId}
                          onClick={() => setEnrollForm({...enrollForm, lugar: "Escuela"})}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            enrollForm.lugar === "Escuela"
                              ? "bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/10 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <Building2 className="w-4 h-4 shrink-0" />
                          Desde Escuela
                        </button>
                        <button
                          type="button"
                          disabled={!enrollForm.studentId}
                          onClick={() => setEnrollForm({...enrollForm, lugar: "Casa"})}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            enrollForm.lugar === "Casa"
                              ? "bg-amber-50 border-amber-550 text-amber-850 ring-2 ring-amber-500/10 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          Desde Casa
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Right Form Panel: Certifications / Providers options & Documents upload */}
              <div className="lg:col-span-6 space-y-4">
                
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Calendar className="w-4 h-4" /> 2. Proveedor Especial & Certificados
                </h3>

                {/* English Certification specifics: ITEP or TOEFL card selection */}
                {activeService.id === "certificacion_ingles" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Seleccionar Certificación de Inglés <span className="text-rose-500">*</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* ITEP card (Provider ID: 3) */}
                      <button
                        type="button"
                        onClick={() => setEnrollForm({...enrollForm, providerId: "3"})}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all h-[95px] cursor-pointer ${
                          enrollForm.providerId === "3"
                            ? "bg-blue-50/80 border-blue-600 text-blue-700 ring-2 ring-blue-500/10 shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${enrollForm.providerId === "3" ? "text-blue-700" : "text-slate-400"}`}>
                            Evaluador Oficial
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${enrollForm.providerId === "3" ? "border-blue-600 bg-blue-650" : "border-slate-300"}`}>
                            {enrollForm.providerId === "3" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <div className="mt-1">
                          <h4 className="font-black text-sm text-slate-800">iTEP</h4>
                          <span className="text-[10px] text-slate-500 font-medium">International Test of English Proficiency</span>
                        </div>
                      </button>

                      {/* TOEFL card (Provider ID: 4) */}
                      <button
                        type="button"
                        onClick={() => setEnrollForm({...enrollForm, providerId: "4"})}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all h-[95px] cursor-pointer ${
                          enrollForm.providerId === "4"
                            ? "bg-[#e2edff] border-[#1a5fb4] text-[#1a5fb4] ring-2 ring-blue-500/10 shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${enrollForm.providerId === "4" ? "text-blue-700" : "text-slate-400"}`}>
                            Evaluador Oficial
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${enrollForm.providerId === "4" ? "border-[#1a5fb4] bg-[#1a5fb4]" : "border-slate-300"}`}>
                            {enrollForm.providerId === "4" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <div className="mt-1">
                          <h4 className="font-black text-sm text-slate-800">TOEFL iBT</h4>
                          <span className="text-[10px] text-slate-500 font-medium">Educational Testing Service (ETS)</span>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard providers selector for other services */
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Proveedor Prestador <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={enrollForm.providerId}
                      onChange={e => setEnrollForm({...enrollForm, providerId: e.target.value})}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                    >
                      <option value="">Seleccionar Proveedor...</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.commercialName || p.legalName} ({p.providerType || "General"})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      Sugerencia predefinida para este servicio: <strong>{providers.find(p => p.id === activeService.defaultProviderId)?.commercialName || "Proveedor Especializado"}</strong>.
                    </p>
                  </div>
                )}

                {/* File Upload component (Resultado) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subir Archivo de Resultados / Diploma / Certificado
                  </label>

                  {enrollForm.resultadoUrl ? (
                    <div className="border border-emerald-200 bg-emerald-50/50 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{enrollForm.resultadoFileName}</p>
                          <span className="text-[10px] text-slate-500 block">Certificado cargado satisfactoriamente</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearUploadedFile}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Eliminar archivo"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        dragActive 
                          ? "border-indigo-500 bg-indigo-50/40" 
                          : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Haz clic para agregar o arrastra tu archivo aquí
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Formatos aceptados: PDF, JPG, PNG de hasta 5MB
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Dates & Pricing Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">Fecha de Inscripción</label>
                    <input 
                      required 
                      type="date" 
                      value={enrollForm.enrollmentDate} 
                      onChange={e => setEnrollForm({...enrollForm, enrollmentDate: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono font-semibold" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider mb-1">F. de Activación (Inicio)</label>
                    <input 
                      required 
                      type="date" 
                      value={enrollForm.activationDate} 
                      onChange={e => setEnrollForm({...enrollForm, activationDate: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono font-semibold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-655 uppercase tracking-wider mb-1">Precio Acordado ($)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">$</span>
                      <input
                        type="number"
                        placeholder="Ej: 2450"
                        value={enrollForm.price}
                        onChange={e => setEnrollForm({...enrollForm, price: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-655 uppercase tracking-wider mb-1">Estatus del Servicio</label>
                    <select
                      required
                      value={enrollForm.status}
                      onChange={e => setEnrollForm({...enrollForm, status: e.target.value as any})}
                      className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                    >
                      <option value="Active">Activo</option>
                      <option value="Completed">Completado</option>
                      <option value="On hold">En Espera / Pausa</option>
                      <option value="Withdrawn">Baja / Retirado</option>
                    </select>
                  </div>
                </div>

              </div>

            </div>

            {/* 3. Configuración Particular de Alumnos (Visible ONLY in Multi-Select Mode when at least 1 student is selected) */}
            {isMultiSelect && selectedStudentIds.length > 0 && (
              <div className="space-y-4 border-t border-slate-200 pt-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Configuración Académica Particular ({selectedStudentIds.length} Alumnos Seleccionados)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Modifique el correo, CURP, fechas de nacimiento, claves de acceso o áreas de estudios para cada estudiante seleccionado de forma independiente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudentIds.map((studentId) => {
                    const student = students.find(s => s.id === studentId);
                    if (!student) return null;

                    const studentData = bulkFormData[studentId] || {
                      email: "",
                      curp: "",
                      birthDate: "",
                      lugar: "Escuela" as "Escuela" | "Casa",
                      usuario: "",
                      contrasena: "",
                      area: "",
                      destino: ""
                    };

                    return (
                      <div key={studentId} className="bg-slate-50 border border-slate-250 rounded-xl p-4 shadow-sm relative space-y-3.5 hover:border-indigo-200 transition-all">
                        
                        {/* Card Header with delete toggle */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {student.name} {student.lastName || ""}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{student.email || "Sin email registrado"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleBulkStudent(studentId)}
                            className="p-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                            title="Quitar"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Profile Sync fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Académico</label>
                            <input
                              type="email"
                              required
                              value={studentData.email}
                              onChange={e => updateBulkStudentField(studentId, "email", e.target.value)}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                              placeholder="correo@alumno.com"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CURP Oficial</label>
                            <input
                              type="text"
                              required
                              value={studentData.curp}
                              onChange={e => updateBulkStudentField(studentId, "curp", e.target.value.toUpperCase())}
                              maxLength={18}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono"
                              placeholder="CURP18DIGITOS"
                            />
                          </div>
                        </div>

                        {/* Birthdate & Lugar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">F. de Nacimiento</label>
                            <input
                              type="date"
                              required
                              value={studentData.birthDate}
                              onChange={e => updateBulkStudentField(studentId, "birthDate", e.target.value)}
                              className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Lugar Servicio</label>
                            <div className="grid grid-cols-2 border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => updateBulkStudentField(studentId, "lugar", "Escuela")}
                                className={`py-1.5 text-[10px] font-extrabold cursor-pointer transition-all ${
                                  studentData.lugar === "Escuela"
                                    ? "bg-indigo-650 text-white"
                                    : "text-slate-650 hover:bg-slate-50"
                                }`}
                              >
                                Escuela
                              </button>
                              <button
                                type="button"
                                onClick={() => updateBulkStudentField(studentId, "lugar", "Casa")}
                                className={`py-1.5 text-[10px] font-extrabold cursor-pointer transition-all ${
                                  studentData.lugar === "Casa"
                                    ? "bg-amber-605 bg-amber-600 text-white"
                                    : "text-slate-655 hover:bg-slate-50"
                                }`}
                              >
                                Casa
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Credentials elements (usuario, contrasena) */}
                        {isCredentialsService && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/60 transition-all">
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">Usuario / Licencia</label>
                              <input
                                type="text"
                                required
                                value={studentData.usuario}
                                onChange={e => updateBulkStudentField(studentId, "usuario", e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
                                placeholder="Escribe el usuario"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-950 uppercase mb-1">Contraseña</label>
                              <input
                                type="text"
                                required
                                value={studentData.contrasena}
                                onChange={e => updateBulkStudentField(studentId, "contrasena", e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
                                placeholder="Escribe la contraseña"
                              />
                            </div>
                          </div>
                        )}

                        {/* University Admission elements (area, destino) */}
                        {isUniversityService && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 p-2.5 rounded-lg border border-purple-100/60 transition-all">
                            <div>
                              <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">Área estudios</label>
                              <input
                                type="text"
                                required
                                value={studentData.area}
                                onChange={e => updateBulkStudentField(studentId, "area", e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
                                placeholder="Ej: Ingeniería"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">Destino Universitario</label>
                              <input
                                type="text"
                                required
                                value={studentData.destino}
                                onChange={e => updateBulkStudentField(studentId, "destino", e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
                                placeholder="Ej: Canadá"
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Observaciones Académicas / Licencias Asignadas</label>
              <textarea
                placeholder="Ingresar claves de acceso, folios internos de validación u observaciones sobre el avance del estudiante..."
                value={enrollForm.notes}
                onChange={e => setEnrollForm({...enrollForm, notes: e.target.value})}
                className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none min-h-[70px] text-slate-800 font-medium"
              />
            </div>

            {/* Action controls */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEnrollModalOpen(false);
                  setEditingEnrollment(null);
                }}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors uppercase tracking-wider shadow-md hover:shadow-lg flex items-center gap-1 cursor-pointer font-sans"
              >
                {editingEnrollment ? 'Guardar Cambios' : 'Confirmar Inscripción'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
}
