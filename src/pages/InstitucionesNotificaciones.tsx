import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Send,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  CheckSquare,
  Square,
  Sparkles,
  Eye,
  X,
  Zap,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Check,
  Calendar,
  Layers,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Info
} from "lucide-react";
import { useAppContext, Institution, isColombia } from "../context/AppContext";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/storage";
import { Modal } from "../components/ui/Modal";
import { hasPermission } from "../utils/permissionCheck";

export interface InstitutionNotificationTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionNotificationAttachment {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType?: string;
  fileData?: string;
}

export interface InstitutionNotificationLog {
  id: string;
  institutionId?: number;
  institutionName: string;
  institutionTradeName?: string;
  country?: string;
  colombiaCalendar?: string;
  recipientEmail: string;
  recipientContact: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string;
  priority: "Informativa" | "Normal" | "Urgente";
  category: string;
  status: "Entregado" | "Leído" | "Respondido";
  attachments?: InstitutionNotificationAttachment[];
}

const SEED_NOTIFICATION_TEMPLATES: InstitutionNotificationTemplate[] = [
  {
    id: "inst_tpl_1",
    title: "Aviso de Corte y Facturación Mensual",
    category: "Finanzas y Facturación",
    subject: "Estado de Cuenta y Facturación Mensual - {{institucion}}",
    body: "Estimado/a {{contacto}},\n\nPor medio del presente comunicado le remitimos el corte y estado de cuenta correspondiente al periodo actual para {{institucion}} ({{pais}}).\n\nLe recordamos verificar los detalles de su facturación institucional y reportar su comprobante de pago a través de los canales administrativos autorizados.\n\nEn caso de requerir adenda especial o comprobante fiscal digitalizado, quedamos a su entera disposición.\n\nAtentamente,\nDirección de Finanzas y Cobranza Institucional"
  },
  {
    id: "inst_tpl_2",
    title: "Apertura de Ciclo Escolar (Calendario Escolar A / B)",
    category: "Académico",
    subject: "Apertura y Planificación de Periodo Escolar {{calendario}} - {{institucion}}",
    body: "Estimado/a {{contacto}},\n\nLe extendemos un cordial saludo a todo el cuerpo directivo de {{institucion}}.\n\nCon motivo del inicio del periodo académico correspondiente a {{calendario}}, les compartimos el cronograma oficial de altas de alumnos, registro de asignaturas de Bachillerato Dual y sesiones de inducción docente.\n\nAgradecemos validar la lista preliminar de matrículas antes de la fecha límite de acreditación.\n\nSaludos cordiales,\nCoordinación Académica Internacional"
  },
  {
    id: "inst_tpl_3",
    title: "Reporte Periódico de Progreso y Asistencia",
    category: "Académico",
    subject: "Reporte Académico Periódico y Calificaciones - {{institucion}}",
    body: "Estimado/a {{contacto}},\n\nPonemos a su disposición el corte consolidado de avance curricular, calificaciones intermedias y porcentaje de asistencia de los alumnos matriculados de {{institucion}}.\n\nPara consultar el desglose pormenorizado por clase, profesor o alumno, pueden ingresar al portal o solicitar una sesión de revisión personalizada con nuestro equipo pedagógico.\n\nAtentamente,\nDepartamento de Seguimiento Estudiantil"
  },
  {
    id: "inst_tpl_4",
    title: "Renovación de Membresía Institucional Anual",
    category: "Membresías",
    subject: "Aviso de Renovación de Membresía Anual - {{institucion}}",
    body: "Estimado/a {{contacto}},\n\nNos dirigimos a ustedes con el propósito de informarles sobre la próxima fecha de renovación de la membresía {{membresia}} correspondiente a {{institucion}}.\n\nLes adjuntamos la propuesta de continuidad con beneficios preferenciales en adquisición de créditos académicos y licencias docentes para el ciclo escolar entrante.\n\nAtentamente,\nDirección de Relaciones Institucionales"
  },
  {
    id: "inst_tpl_5",
    title: "Catálogo de Nuevas Materias y Créditos Duales",
    category: "Operaciones",
    subject: "Nuevo Catálogo de Clases Electivas y Cursos AP Disponibles",
    body: "Estimado/a {{contacto}},\n\nNos es grato presentarle la ampliación de nuestro catálogo curricular con nuevas asignaturas electivas y certificaciones Advanced Placement (AP) para los estudiantes de {{institucion}}.\n\nEl periodo de selección de créditos adicionales ya se encuentra habilitado en el sistema.\n\nSaludos cordiales,\nDirección Académica"
  },
  {
    id: "inst_tpl_6",
    title: "Comunicado Oficial de Plataforma y Mantenimiento",
    category: "Soporte y Plataforma",
    subject: "Comunicado Oficial: Ventana de Mantenimiento Preventivo",
    body: "Estimado equipo directivo de {{institucion}},\n\nLes notificamos que se llevará a cabo una ventana de mantenimiento preventivo y optimización de servidores este fin de semana.\n\nDurante este breve lapso los servicios de consulta podrían experimentar pausas momentáneas. Agradecemos su comprensión y colaboración.\n\nAtentamente,\nEquipo de Tecnología y Soporte"
  }
];

const SEED_NOTIFICATION_LOGS: InstitutionNotificationLog[] = [
  {
    id: "nlog_1",
    institutionId: 1,
    institutionName: "Colegio Bilingüe San José",
    institutionTradeName: "San José Academy",
    country: "México",
    recipientEmail: "m.gomez@sanjose.edu.mx",
    recipientContact: "Lic. María Gómez",
    subject: "Estado de Cuenta y Facturación Mensual - Colegio Bilingüe San José",
    body: "Se notificó el corte mensual y factura fiscal correspondiente a las colegiaturas del programa Dual.",
    sentAt: "2026-08-25 10:15",
    sentBy: "Admin Global",
    priority: "Normal",
    category: "Finanzas y Facturación",
    status: "Leído",
    attachments: [
      {
        id: "att_1",
        title: "Estado_Cuenta_Agosto_2026.pdf",
        fileName: "Estado_Cuenta_Agosto_2026.pdf",
        fileSize: "1.2 MB",
        fileType: "application/pdf"
      }
    ]
  },
  {
    id: "nlog_2",
    institutionId: 2,
    institutionName: "Gimnasio Moderno Bogotá",
    institutionTradeName: "Gimnasio Moderno",
    country: "Colombia",
    colombiaCalendar: "Calendario A",
    recipientEmail: "rectoria@gimnasiomoderno.edu.co",
    recipientContact: "Dr. Camilo Restrepo",
    subject: "Apertura y Planificación de Periodo Escolar Calendario A - Gimnasio Moderno Bogotá",
    body: "Notificación de cronograma lectivo para instituciones en Colombia bajo Calendario A (Ene/Feb - Nov).",
    sentAt: "2026-08-28 09:30",
    sentBy: "Admin Global",
    priority: "Urgente",
    category: "Académico",
    status: "Respondido"
  },
  {
    id: "nlog_3",
    institutionId: 3,
    institutionName: "Colegio Anglo Colombiano",
    institutionTradeName: "Anglo Colombiano",
    country: "Colombia",
    colombiaCalendar: "Calendario B",
    recipientEmail: "coordinacion@anglocolombiano.edu.co",
    recipientContact: "Dra. Patricia Salazar",
    subject: "Apertura y Planificación de Periodo Escolar Calendario B - Colegio Anglo Colombiano",
    body: "Envío de lineamientos para inicio de ciclo lectivo Calendario B (Ago/Sep - Jun).",
    sentAt: "2026-09-01 14:20",
    sentBy: "Admin Global",
    priority: "Normal",
    category: "Académico",
    status: "Entregado"
  }
];

export function InstitucionesNotificaciones() {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutions, catalogs, currentUser } = useAppContext();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<"Plantillas" | "Redactar" | "Masivo" | "Historial">("Plantillas");

  // Success / Feedback Message Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  // -------------------------------------------------------------
  // 1. TEMPLATES STATE & PERSISTENCE
  // -------------------------------------------------------------
  const [templates, setTemplates] = useState<InstitutionNotificationTemplate[]>(() => {
    const saved = safeLocalStorageGet<InstitutionNotificationTemplate[] | null>("inst_notif_templates_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return SEED_NOTIFICATION_TEMPLATES;
  });

  useEffect(() => {
    safeLocalStorageSet("inst_notif_templates_v1", templates);
  }, [templates]);

  // Filters for templates
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("Todas");

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InstitutionNotificationTemplate | null>(null);
  const [tplFormTitle, setTplFormTitle] = useState("");
  const [tplFormCategory, setTplFormCategory] = useState("Académico");
  const [tplFormSubject, setTplFormSubject] = useState("");
  const [tplFormBody, setTplFormBody] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<InstitutionNotificationTemplate | null>(null);

  // -------------------------------------------------------------
  // 2. NOTIFICATION LOGS STATE & PERSISTENCE
  // -------------------------------------------------------------
  const [notificationLogs, setNotificationLogs] = useState<InstitutionNotificationLog[]>(() => {
    const saved = safeLocalStorageGet<InstitutionNotificationLog[] | null>("inst_notif_logs_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return SEED_NOTIFICATION_LOGS;
  });

  useEffect(() => {
    safeLocalStorageSet("inst_notif_logs_v1", notificationLogs);
  }, [notificationLogs]);

  // Logs filters
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("Todas");
  const [logPriorityFilter, setLogPriorityFilter] = useState("Todas");
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<InstitutionNotificationLog | null>(null);

  // -------------------------------------------------------------
  // 3. COMPOSE (INDIVIDUAL NOTIFICATION) STATE
  // -------------------------------------------------------------
  const [recipientMode, setRecipientMode] = useState<"institution" | "manual">("institution");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualContact, setManualContact] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composePriority, setComposePriority] = useState<"Informativa" | "Normal" | "Urgente">("Normal");
  const [composeCategory, setComposeCategory] = useState("Académico");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<InstitutionNotificationAttachment[]>([]);
  const [attachSignature, setAttachSignature] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read URL query params on mount (e.g., if navigated from an institution detail with ?institutionId=2)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const instIdParam = params.get("institutionId");
    const subTabParam = params.get("tab");

    if (instIdParam) {
      setSelectedInstitutionId(instIdParam);
      setRecipientMode("institution");
      setActiveSubTab("Redactar");
    } else if (subTabParam === "masivo") {
      setActiveSubTab("Masivo");
    } else if (subTabParam === "redactar") {
      setActiveSubTab("Redactar");
    }
  }, [location.search]);

  // Selected Institution Object
  const currentSelectedInstitution = useMemo(() => {
    if (!selectedInstitutionId) return null;
    return institutions.find(i => i.id.toString() === selectedInstitutionId.toString()) || null;
  }, [selectedInstitutionId, institutions]);

  // Auto-fill or helper info when institution changes
  const effectiveRecipientEmail = useMemo(() => {
    if (recipientMode === "manual") return manualEmail;
    if (!currentSelectedInstitution) return "";
    return currentSelectedInstitution.email || currentSelectedInstitution.contactEmail || "";
  }, [recipientMode, manualEmail, currentSelectedInstitution]);

  const effectiveRecipientContact = useMemo(() => {
    if (recipientMode === "manual") return manualContact || manualName;
    if (!currentSelectedInstitution) return "";
    return currentSelectedInstitution.contact || currentSelectedInstitution.name;
  }, [recipientMode, manualContact, manualName, currentSelectedInstitution]);

  // -------------------------------------------------------------
  // 4. BULK BROADCAST (DIFUSIÓN MASIVA) STATE
  // -------------------------------------------------------------
  const [bulkFilterCountry, setBulkFilterCountry] = useState("Todas");
  const [bulkFilterCalendar, setBulkFilterCalendar] = useState("Todas");
  const [bulkFilterMembership, setBulkFilterMembership] = useState("Todas");
  const [bulkFilterStatus, setBulkFilterStatus] = useState("Todas");
  const [bulkSearch, setBulkSearch] = useState("");
  const [selectedBulkInstIds, setSelectedBulkInstIds] = useState<number[]>([]);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkPriority, setBulkPriority] = useState<"Informativa" | "Normal" | "Urgente">("Normal");
  const [bulkCategory, setBulkCategory] = useState("Comunicados Oficiales");
  const [isBulkDispatching, setIsBulkDispatching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkCurrentDispatchName, setBulkCurrentDispatchName] = useState("");

  // Filtered institutions for bulk view
  const filteredBulkInstitutions = useMemo(() => {
    return institutions.filter(inst => {
      // Search
      if (bulkSearch.trim()) {
        const query = bulkSearch.toLowerCase();
        const matchesName = inst.name.toLowerCase().includes(query);
        const matchesTrade = (inst.tradeName || "").toLowerCase().includes(query);
        const matchesContact = (inst.contact || "").toLowerCase().includes(query);
        const matchesEmail = (inst.email || inst.contactEmail || "").toLowerCase().includes(query);
        const matchesCode = (inst.institutionCode || "").toLowerCase().includes(query);
        if (!matchesName && !matchesTrade && !matchesContact && !matchesEmail && !matchesCode) {
          return false;
        }
      }

      // Country
      if (bulkFilterCountry !== "Todas") {
        if (inst.country?.trim() !== bulkFilterCountry) return false;
      }

      // Colombia Calendar
      if (bulkFilterCalendar !== "Todas") {
        if (bulkFilterCalendar === "Sin especificar") {
          if (inst.colombiaCalendar) return false;
        } else if (inst.colombiaCalendar !== bulkFilterCalendar) {
          return false;
        }
      }

      // Membership
      if (bulkFilterMembership !== "Todas") {
        if (inst.membershipId !== bulkFilterMembership) return false;
      }

      // Status
      if (bulkFilterStatus !== "Todas") {
        if (bulkFilterStatus === "Activa" && inst.active === false) return false;
        if (bulkFilterStatus === "Inactiva" && inst.active !== false) return false;
      }

      return true;
    });
  }, [institutions, bulkSearch, bulkFilterCountry, bulkFilterCalendar, bulkFilterMembership, bulkFilterStatus]);

  // Unique countries list for bulk filter
  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    institutions.forEach(i => {
      if (i.country?.trim()) set.add(i.country.trim());
    });
    return Array.from(set).sort();
  }, [institutions]);

  // -------------------------------------------------------------
  // HELPER: VARIABLE REPLACEMENT
  // -------------------------------------------------------------
  const interpolateVariables = (text: string, inst?: Institution | null, overrideContact?: string) => {
    if (!text) return "";
    let res = text;
    const instName = inst ? (inst.tradeName || inst.name) : (manualName || "Institución Educativa");
    const legalName = inst ? inst.name : (manualName || "Institución");
    const contact = overrideContact || (inst ? (inst.contact || "Director(a) / Coordinador(a)") : (manualContact || "Estimado(a)"));
    const email = inst ? (inst.email || inst.contactEmail || "") : manualEmail;
    const country = inst ? (inst.country || "México") : "General";
    const calendar = inst ? (inst.colombiaCalendar || (isColombia(inst.country) ? "Calendario Escolar" : "Ciclo Regular")) : "Ciclo Regular";
    const membershipName = inst?.membershipId ? (catalogs["Membresías"]?.find(m => m.id === inst.membershipId)?.name || "Membresía Oficial") : "Convenio Dual";
    const sender = currentUser?.name || "Administración Central";

    res = res.replace(/{{institucion}}/g, instName);
    res = res.replace(/{{nombre_colegio}}/g, instName);
    res = res.replace(/{{nombre_comercial}}/g, inst?.tradeName || instName);
    res = res.replace(/{{razon_social}}/g, legalName);
    res = res.replace(/{{contacto}}/g, contact);
    res = res.replace(/{{contacto_principal}}/g, contact);
    res = res.replace(/{{email}}/g, email);
    res = res.replace(/{{pais}}/g, country);
    res = res.replace(/{{calendario}}/g, calendar);
    res = res.replace(/{{membresia}}/g, membershipName);
    res = res.replace(/{{remitente}}/g, sender);
    res = res.replace(/{{fecha}}/g, new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }));
    return res;
  };

  // -------------------------------------------------------------
  // TEMPLATE CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTplFormTitle("");
    setTplFormCategory("Académico");
    setTplFormSubject("");
    setTplFormBody("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: InstitutionNotificationTemplate) => {
    setEditingTemplate(tpl);
    setTplFormTitle(tpl.title);
    setTplFormCategory(tpl.category);
    setTplFormSubject(tpl.subject);
    setTplFormBody(tpl.body);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplFormTitle.trim() || !tplFormSubject.trim() || !tplFormBody.trim()) {
      alert("Por favor completa el título, asunto y contenido de la plantilla.");
      return;
    }

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
        ...t,
        title: tplFormTitle.trim(),
        category: tplFormCategory,
        subject: tplFormSubject.trim(),
        body: tplFormBody.trim(),
        updatedAt: new Date().toISOString().slice(0, 10)
      } : t));
      showToast("Plantilla actualizada exitosamente");
    } else {
      const newTpl: InstitutionNotificationTemplate = {
        id: `inst_tpl_${Date.now()}`,
        title: tplFormTitle.trim(),
        category: tplFormCategory,
        subject: tplFormSubject.trim(),
        body: tplFormBody.trim(),
        createdAt: new Date().toISOString().slice(0, 10)
      };
      setTemplates(prev => [newTpl, ...prev]);
      showToast("Nueva plantilla creada exitosamente");
    }

    setIsTemplateModalOpen(false);
  };

  const handleDuplicateTemplate = (tpl: InstitutionNotificationTemplate) => {
    const clone: InstitutionNotificationTemplate = {
      ...tpl,
      id: `inst_tpl_${Date.now()}`,
      title: `${tpl.title} (Copia)`,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setTemplates(prev => [clone, ...prev]);
    showToast(`Plantilla "${tpl.title}" duplicada con éxito`);
  };

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
    setTemplateToDelete(null);
    showToast("Plantilla eliminada exitosamente");
  };

  const handleApplyTemplateToCompose = (tpl: InstitutionNotificationTemplate) => {
    const interpolatedSubj = interpolateVariables(tpl.subject, currentSelectedInstitution);
    const interpolatedBody = interpolateVariables(tpl.body, currentSelectedInstitution);
    setComposeSubject(interpolatedSubj);
    setComposeBody(interpolatedBody);
    setComposeCategory(tpl.category);
    setActiveSubTab("Redactar");
    showToast(`Plantilla "${tpl.title}" cargada en el redactor`);
  };

  const handleApplyTemplateToBulk = (tpl: InstitutionNotificationTemplate) => {
    setBulkSubject(tpl.subject);
    setBulkBody(tpl.body);
    setBulkCategory(tpl.category);
    setActiveSubTab("Masivo");
    showToast(`Plantilla "${tpl.title}" cargada para envío masivo`);
  };

  // -------------------------------------------------------------
  // COMPOSE / SEND INDIVIDUAL NOTIFICATION
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const newAtt: InstitutionNotificationAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: file.name,
        fileName: file.name,
        fileSize: `${sizeMb} MB`,
        fileType: file.type || "application/octet-stream"
      };
      setComposeAttachments(prev => [...prev, newAtt]);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("Archivo adjuntado correctamente");
  };

  const handleRemoveAttachment = (id: string) => {
    setComposeAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientMode === "institution" && !selectedInstitutionId) {
      alert("Por favor selecciona una institución destino.");
      return;
    }

    if (recipientMode === "manual" && (!manualEmail.trim() || !manualName.trim())) {
      alert("Por favor especifica el nombre y correo del destinatario manual.");
      return;
    }

    if (!composeSubject.trim() || !composeBody.trim()) {
      alert("Por favor completa el asunto y el mensaje de la notificación.");
      return;
    }

    const targetEmail = effectiveRecipientEmail || "notificaciones@institucion.edu";
    const targetContact = effectiveRecipientContact || "Contacto Institucional";
    const instName = currentSelectedInstitution ? (currentSelectedInstitution.tradeName || currentSelectedInstitution.name) : manualName;

    const newLog: InstitutionNotificationLog = {
      id: `nlog_${Date.now()}`,
      institutionId: currentSelectedInstitution ? currentSelectedInstitution.id : undefined,
      institutionName: instName,
      institutionTradeName: currentSelectedInstitution?.tradeName,
      country: currentSelectedInstitution?.country || "General",
      colombiaCalendar: currentSelectedInstitution?.colombiaCalendar,
      recipientEmail: targetEmail,
      recipientContact: targetContact,
      cc: showCc ? composeCc : undefined,
      bcc: showBcc ? composeBcc : undefined,
      subject: composeSubject.trim(),
      body: composeBody.trim(),
      sentAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      sentBy: currentUser?.name || "Admin Global",
      priority: composePriority,
      category: composeCategory,
      status: "Entregado",
      attachments: composeAttachments.length > 0 ? [...composeAttachments] : undefined
    };

    setNotificationLogs(prev => [newLog, ...prev]);
    showToast(`Notificación enviada con éxito a ${instName} (${targetEmail})`);

    // Reset composer form
    setComposeSubject("");
    setComposeBody("");
    setComposeAttachments([]);
    setActiveSubTab("Historial");
  };

  // -------------------------------------------------------------
  // BULK DISPATCH HANDLERS
  // -------------------------------------------------------------
  const handleToggleSelectAllBulk = () => {
    if (selectedBulkInstIds.length === filteredBulkInstitutions.length) {
      setSelectedBulkInstIds([]);
    } else {
      setSelectedBulkInstIds(filteredBulkInstitutions.map(i => i.id));
    }
  };

  const handleSelectOnlyWithEmail = () => {
    const withEmail = filteredBulkInstitutions
      .filter(i => !!(i.email || i.contactEmail))
      .map(i => i.id);
    setSelectedBulkInstIds(withEmail);
    showToast(`${withEmail.length} instituciones con correo registrado seleccionadas`);
  };

  const handleExecuteBulkDispatch = async () => {
    if (selectedBulkInstIds.length === 0) {
      alert("Por favor selecciona al menos una institución de la lista.");
      return;
    }

    if (!bulkSubject.trim() || !bulkBody.trim()) {
      alert("Por favor redacta el asunto y el mensaje para el envío masivo.");
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmas el envío masivo de notificaciones a ${selectedBulkInstIds.length} instituciones socias seleccionadas?`
    );
    if (!confirmed) return;

    setIsBulkDispatching(true);
    setBulkProgress(0);

    const targetInstitutions = institutions.filter(i => selectedBulkInstIds.includes(i.id));
    const total = targetInstitutions.length;
    const generatedLogs: InstitutionNotificationLog[] = [];

    for (let index = 0; index < total; index++) {
      const inst = targetInstitutions[index];
      setBulkCurrentDispatchName(inst.tradeName || inst.name);
      setBulkProgress(Math.round(((index + 1) / total) * 100));

      const personalizedSubject = interpolateVariables(bulkSubject, inst);
      const personalizedBody = interpolateVariables(bulkBody, inst);
      const email = inst.email || inst.contactEmail || "contacto@institucion.edu";
      const contact = inst.contact || "Dirección Institucional";

      generatedLogs.push({
        id: `nlog_bulk_${Date.now()}_${inst.id}`,
        institutionId: inst.id,
        institutionName: inst.tradeName || inst.name,
        institutionTradeName: inst.tradeName,
        country: inst.country || "México",
        colombiaCalendar: inst.colombiaCalendar,
        recipientEmail: email,
        recipientContact: contact,
        subject: personalizedSubject,
        body: personalizedBody,
        sentAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        sentBy: currentUser?.name || "Admin Global",
        priority: bulkPriority,
        category: bulkCategory,
        status: "Entregado"
      });

      // Brief asynchronous simulation delay for visual feedback
      await new Promise(r => setTimeout(r, 60));
    }

    setNotificationLogs(prev => [...generatedLogs, ...prev]);
    setIsBulkDispatching(false);
    setSelectedBulkInstIds([]);
    showToast(`¡Difusión masiva completada! ${total} notificaciones enviadas a instituciones clientes.`);
    setActiveSubTab("Historial");
  };

  // -------------------------------------------------------------
  // EXPORT HISTORY TO CSV
  // -------------------------------------------------------------
  const handleExportHistoryToCsv = () => {
    if (notificationLogs.length === 0) {
      alert("No hay registros en el historial para exportar.");
      return;
    }

    const headers = ["ID", "Fecha", "Institución", "País", "Calendario", "Contacto", "Correo", "Prioridad", "Categoría", "Asunto", "Estatus", "Remitente"];
    const rows = notificationLogs.map(l => [
      l.id,
      l.sentAt,
      `"${l.institutionName.replace(/"/g, '""')}"`,
      `"${(l.country || '').replace(/"/g, '""')}"`,
      `"${(l.colombiaCalendar || '').replace(/"/g, '""')}"`,
      `"${l.recipientContact.replace(/"/g, '""')}"`,
      `"${l.recipientEmail.replace(/"/g, '""')}"`,
      l.priority,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${l.subject.replace(/"/g, '""')}"`,
      l.status,
      `"${l.sentBy.replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Notificaciones_Instituciones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Reporte CSV generado y descargado");
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Instituciones</span>
            <span>/</span>
            <span className="text-indigo-600">Notificaciones Institucionales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notificaciones a Instituciones Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Gestión centralizada de comunicaciones, circulares oficiales, alertas de facturación y avisos de calendario escolar para colegios e instituciones socias.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate("/instituciones")}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Lista de Instituciones</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top KPIs & Quick Action Buttons (Exact structure to CRM Correos) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Notificaciones Enviadas</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono">{notificationLogs.length}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Tasa de Apertura</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">71.8%</span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Instituciones Activas</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">
              {institutions.filter(i => i.active !== false).length}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Plantillas Creadas</span>
            <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">{templates.length}</span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("Masivo");
              if (selectedBulkInstIds.length === 0) {
                const defaults = institutions.slice(0, 10).map(i => i.id);
                setSelectedBulkInstIds(defaults);
              }
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/10 transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Difusión Masiva a Instituciones</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("Redactar");
            }}
            className="bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-600/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Redactar Notificación</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTemplate}
            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-700" />
            <span>Nueva Plantilla</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-sm w-full sm:w-auto self-start">
        {[
          { id: "Plantillas", label: `📋 Plantillas (${templates.length})` },
          { id: "Redactar", label: "✉️ Redactar Individual" },
          { id: "Masivo", label: `⚡ Difusión Masiva (${selectedBulkInstIds.length > 0 ? selectedBulkInstIds.length : 'Todas'})` },
          { id: "Historial", label: `📬 Historial de Notificaciones (${notificationLogs.length})` }
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === sub.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: PLANTILLAS                                     */}
      {/* ========================================================= */}
      {activeSubTab === "Plantillas" && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  placeholder="Buscar plantillas por título, asunto, categoría o contenido..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                {templateSearch && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                <select
                  value={templateCategoryFilter}
                  onChange={e => setTemplateCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Todas">Todas las categorías</option>
                  <option value="Académico">Académico</option>
                  <option value="Finanzas y Facturación">Finanzas y Facturación</option>
                  <option value="Membresías">Membresías</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Soporte y Plataforma">Soporte y Plataforma</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenNewTemplate}
              className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Plantilla</span>
            </button>
          </div>

          {/* Dynamic Tags Cheat-Sheet Helper */}
          <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-3.5 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-bold">Variables dinámicas disponibles en plantillas:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{institucion}}"}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{contacto}}"}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{pais}}"}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{calendario}}"}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{membresia}}"}</span>
              <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">{"{{fecha}}"}</span>
            </div>
          </div>

          {/* Templates Grid */}
          {(() => {
            const filtered = templates.filter(t => {
              const matchesCat = templateCategoryFilter === "Todas" || t.category === templateCategoryFilter;
              const matchesQuery = !templateSearch.trim() ||
                t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
                t.subject.toLowerCase().includes(templateSearch.toLowerCase()) ||
                t.category.toLowerCase().includes(templateSearch.toLowerCase()) ||
                t.body.toLowerCase().includes(templateSearch.toLowerCase());
              return matchesCat && matchesQuery;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <h4 className="text-sm font-extrabold text-slate-700">No se encontraron plantillas</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No hay plantillas que coincidan con la búsqueda. Puedes crear una nueva plantilla para tus instituciones o reiniciar los filtros.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewTemplate}
                    className="px-4 py-2 bg-indigo-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Plantilla</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map(tpl => {
                  const getCategoryBadgeClass = (cat: string) => {
                    switch (cat) {
                      case "Académico":
                        return "bg-blue-50 text-blue-700 border-blue-200";
                      case "Finanzas y Facturación":
                        return "bg-emerald-50 text-emerald-700 border-emerald-200";
                      case "Membresías":
                        return "bg-purple-50 text-purple-700 border-purple-200";
                      case "Operaciones":
                        return "bg-amber-50 text-amber-700 border-amber-200";
                      case "Soporte y Plataforma":
                        return "bg-cyan-50 text-cyan-700 border-cyan-200";
                      default:
                        return "bg-slate-100 text-slate-700 border-slate-200";
                    }
                  };

                  return (
                    <div
                      key={tpl.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-300 transition-all group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(tpl.category)}`}>
                            {tpl.category}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateTemplate(tpl)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Duplicar Plantilla"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditTemplate(tpl)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Editar Plantilla"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTemplateToDelete(tpl)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Eliminar Plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
                          {tpl.title}
                        </h4>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600 space-y-1.5">
                          <p className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <span className="text-slate-400 font-medium font-mono">Asunto:</span>
                            <span>{tpl.subject}</span>
                          </p>
                          <p className="text-[11.5px] text-slate-500 whitespace-pre-line line-clamp-3 leading-relaxed font-sans">
                            {tpl.body}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplateToCompose(tpl)}
                          className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 hover:border-indigo-600 flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Usar en Redactar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTemplateToBulk(tpl)}
                          className="bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200 hover:border-amber-500 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                          title="Usar para Difusión Masiva"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Masivo</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: REDACTAR INDIVIDUAL                            */}
      {/* ========================================================= */}
      {activeSubTab === "Redactar" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <span>Redactor de Notificaciones Institucionales</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Envía notificaciones oficiales, circulares académicas o estados de cuenta a instituciones clientes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedInstitutionId("");
                  setManualEmail("");
                  setManualName("");
                  setComposeSubject("");
                  setComposeBody("");
                  setComposeAttachments([]);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Nuevo en Blanco</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5 text-xs">
            {/* Recipient Mode: Institución vs Manual */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Tipo de Destinatario *</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200 max-w-md">
                <button
                  type="button"
                  onClick={() => setRecipientMode("institution")}
                  className={`py-1.5 text-xs font-extrabold uppercase rounded-lg transition ${
                    recipientMode === "institution"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Institución Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("manual")}
                  className={`py-1.5 text-xs font-extrabold uppercase rounded-lg transition ${
                    recipientMode === "manual"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Manual / Externo
                </button>
              </div>
            </div>

            {/* Institution Selector */}
            {recipientMode === "institution" ? (
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  Seleccionar Institución Cliente *
                </label>
                <select
                  value={selectedInstitutionId}
                  onChange={e => {
                    setSelectedInstitutionId(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                  required
                >
                  <option value="">-- Seleccionar Institución Registrada --</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.tradeName ? `${inst.tradeName} (${inst.name})` : inst.name} - {inst.country || 'México'} {inst.colombiaCalendar ? `[🇨🇴 ${inst.colombiaCalendar}]` : ''} - Contacto: {inst.contact || 'S/N'}
                    </option>
                  ))}
                </select>

                {/* Selected Institution Card Details */}
                {currentSelectedInstitution && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {currentSelectedInstitution.tradeName || currentSelectedInstitution.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                          ID: #{currentSelectedInstitution.id}
                        </span>
                        {isColombia(currentSelectedInstitution.country) && currentSelectedInstitution.colombiaCalendar && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-amber-50 text-amber-900 border border-amber-300">
                            🇨🇴 {currentSelectedInstitution.colombiaCalendar}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span><strong>País:</strong> {currentSelectedInstitution.country}</span>
                        <span><strong>Contacto:</strong> {currentSelectedInstitution.contact || 'No asignado'}</span>
                        <span><strong>Correo:</strong> {currentSelectedInstitution.email || currentSelectedInstitution.contactEmail || 'Sin correo registrado'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/instituciones/${currentSelectedInstitution.id}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>Ver Ficha Institucional</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Nombre o Institución *</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Ej. Colegio Británico Internacional"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Correo Electrónico *</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    placeholder="directorio@institucion.edu"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* CC & CCO Fields */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3 text-[11px] font-bold text-indigo-600">
                <button
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="hover:underline flex items-center gap-1"
                >
                  {showCc ? "- Ocultar CC" : "+ Agregar CC (Copia)"}
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className="hover:underline flex items-center gap-1"
                >
                  {showBcc ? "- Ocultar CCO" : "+ Agregar CCO (Copia Oculta)"}
                </button>
              </div>

              {showCc && (
                <div className="animate-in fade-in">
                  <label className="block text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-1">Con Copia (CC)</label>
                  <input
                    type="text"
                    value={composeCc}
                    onChange={e => setComposeCc(e.target.value)}
                    placeholder="copia1@colegio.edu, copia2@colegio.edu"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              {showBcc && (
                <div className="animate-in fade-in">
                  <label className="block text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-1">Copia Oculta (CCO)</label>
                  <input
                    type="text"
                    value={composeBcc}
                    onChange={e => setComposeBcc(e.target.value)}
                    placeholder="auditoria@ihsdual.com"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Quick Template Picker & Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Cargar Plantilla</label>
                <select
                  onChange={e => {
                    const tpl = templates.find(t => t.id === e.target.value);
                    if (tpl) {
                      setComposeSubject(interpolateVariables(tpl.subject, currentSelectedInstitution));
                      setComposeBody(interpolateVariables(tpl.body, currentSelectedInstitution));
                      setComposeCategory(tpl.category);
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="" disabled>-- Cargar desde Plantilla --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Categoría</label>
                <select
                  value={composeCategory}
                  onChange={e => setComposeCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="Académico">Académico</option>
                  <option value="Finanzas y Facturación">Finanzas y Facturación</option>
                  <option value="Membresías">Membresías</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Soporte y Plataforma">Soporte y Plataforma</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Prioridad</label>
                <select
                  value={composePriority}
                  onChange={e => setComposePriority(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="Normal">Normal</option>
                  <option value="Informativa">Informativa</option>
                  <option value="Urgente">Alta / Urgente</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Asunto de la Notificación *</label>
              <input
                type="text"
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Ej. Notificación de Calendario Escolar y Apertura de Ciclo"
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                required
              />
            </div>

            {/* Variable insertion buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 font-bold">Insertar variable:</span>
              {[
                { tag: "{{institucion}}", label: "+ Institución" },
                { tag: "{{contacto}}", label: "+ Contacto" },
                { tag: "{{pais}}", label: "+ País" },
                { tag: "{{calendario}}", label: "+ Calendario" },
                { tag: "{{membresia}}", label: "+ Membresía" },
                { tag: "{{fecha}}", label: "+ Fecha" }
              ].map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setComposeBody(prev => prev + " " + item.tag)}
                  className="px-2 py-0.8 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md font-mono text-[10px] transition"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Mensaje / Cuerpo de la Notificación *</label>
              <textarea
                rows={9}
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Escribe aquí el contenido de la comunicación..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-normal text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed font-sans shadow-2xs"
                required
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archivos Adjuntos ({composeAttachments.length})</span>
                </span>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Adjuntar Archivo</span>
                  </button>
                </div>
              </div>

              {composeAttachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {composeAttachments.map(att => (
                    <div
                      key={att.id}
                      className="bg-white border border-slate-200 p-2 rounded-lg flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{att.fileName}</span>
                        <span className="text-[10px] text-slate-400">({att.fileSize})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachSignature}
                  onChange={e => setAttachSignature(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Incluir firma institucional del remitente</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {currentUser?.name || "Administración Central"}
              </span>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Vista Previa</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/10 transition flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Despachar Notificación</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: DIFUSIÓN MASIVA (BULK BROADCAST)               */}
      {/* ========================================================= */}
      {activeSubTab === "Masivo" && (
        <div className="space-y-6">
          {/* Target Audience Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Segmentación de Instituciones para Envío Masivo</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtra y selecciona las instituciones destinatarias por país, calendario escolar colombiano o tipo de membresía.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleSelectAllBulk}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {selectedBulkInstIds.length === filteredBulkInstitutions.length ? "Deseleccionar Todas" : `Seleccionar Todas (${filteredBulkInstitutions.length})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectOnlyWithEmail}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
                >
                  Solo con Email
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Country */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">País</label>
                <select
                  value={bulkFilterCountry}
                  onChange={e => {
                    const val = e.target.value;
                    setBulkFilterCountry(val);
                    if (!isColombia(val)) setBulkFilterCalendar("Todas");
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Todas">Todos los países</option>
                  {uniqueCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Colombia Calendar */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  🇨🇴 Calendario (Colombia)
                </label>
                <select
                  value={bulkFilterCalendar}
                  onChange={e => setBulkFilterCalendar(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Todas">Todos los calendarios</option>
                  <option value="Calendario A">🇨🇴 Calendario A (Ene-Nov)</option>
                  <option value="Calendario B">🇨🇴 Calendario B (Ago-Jun)</option>
                  <option value="Sin especificar">Sin especificar</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estatus</label>
                <select
                  value={bulkFilterStatus}
                  onChange={e => setBulkFilterStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Todas">Todas</option>
                  <option value="Activa">Solo Activas</option>
                  <option value="Inactiva">Inactivas</option>
                </select>
              </div>

              {/* Search text */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bulkSearch}
                    onChange={e => setBulkSearch(e.target.value)}
                    placeholder="Nombre, código o contacto..."
                    className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Selection Counter Bar */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
              <span className="font-bold text-slate-700">
                Mostrando <span className="text-indigo-600 font-mono">{filteredBulkInstitutions.length}</span> instituciones | Seleccionadas para despacho: <span className="text-amber-600 font-mono font-extrabold">{selectedBulkInstIds.length}</span>
              </span>

              {selectedBulkInstIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBulkInstIds([])}
                  className="text-slate-500 hover:text-rose-600 text-xs font-bold"
                >
                  Limpiar Selección
                </button>
              )}
            </div>

            {/* Institutions Table with Checkboxes */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredBulkInstitutions.length > 0 && selectedBulkInstIds.length === filteredBulkInstitutions.length}
                        onChange={handleToggleSelectAllBulk}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-2">Institución</th>
                    <th className="px-3 py-2">País / Calendario</th>
                    <th className="px-3 py-2">Contacto & Correo</th>
                    <th className="px-3 py-2">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredBulkInstitutions.map(inst => {
                    const isSelected = selectedBulkInstIds.includes(inst.id);
                    const email = inst.email || inst.contactEmail;

                    return (
                      <tr
                        key={inst.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBulkInstIds(prev => prev.filter(id => id !== inst.id));
                          } else {
                            setSelectedBulkInstIds(prev => [...prev, inst.id]);
                          }
                        }}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          isSelected ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedBulkInstIds(prev => prev.filter(id => id !== inst.id));
                              } else {
                                setSelectedBulkInstIds(prev => [...prev, inst.id]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          <div>{inst.tradeName || inst.name}</div>
                          {inst.tradeName && <div className="text-[10px] text-slate-400 font-normal">{inst.name}</div>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600">{inst.country || "México"}</span>
                            {isColombia(inst.country) && inst.colombiaCalendar && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-50 text-amber-900 border border-amber-300">
                                🇨🇴 {inst.colombiaCalendar}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-700">{inst.contact || "Sin contacto"}</div>
                          <div className={`text-[10px] ${email ? "text-slate-500" : "text-amber-600 font-semibold italic"}`}>
                            {email || "Sin correo"}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inst.active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {inst.active !== false ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mass Notification Composer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Mensaje de Difusión Masiva Personalizada</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cada institución recibirá el correo personalizado con su nombre, país y datos de contacto correspondientes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  onChange={e => {
                    const tpl = templates.find(t => t.id === e.target.value);
                    if (tpl) {
                      setBulkSubject(tpl.subject);
                      setBulkBody(tpl.body);
                      setBulkCategory(tpl.category);
                    }
                  }}
                  defaultValue=""
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>-- Cargar Plantilla --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Asunto Masivo *</label>
                <input
                  type="text"
                  value={bulkSubject}
                  onChange={e => setBulkSubject(e.target.value)}
                  placeholder="Ej. Comunicado Oficial: Inicio de Periodo Lectivo {{calendario}} - {{institucion}}"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Prioridad</label>
                  <select
                    value={bulkPriority}
                    onChange={e => setBulkPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Informativa">Informativa</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Categoría</label>
                  <select
                    value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 outline-none"
                  >
                    <option value="Comunicados Oficiales">Comunicados Oficiales</option>
                    <option value="Académico">Académico</option>
                    <option value="Finanzas y Facturación">Finanzas y Facturación</option>
                    <option value="Membresías">Membresías</option>
                    <option value="Soporte y Plataforma">Soporte y Plataforma</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Cuerpo del Mensaje *</label>
              <textarea
                rows={8}
                value={bulkBody}
                onChange={e => setBulkBody(e.target.value)}
                placeholder="Escribe el mensaje aquí. Puedes usar las variables {{institucion}}, {{contacto}}, {{pais}}, {{calendario}}, etc."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed shadow-2xs"
              />
            </div>

            {/* Preview of first selected institution */}
            {selectedBulkInstIds.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ejemplo de personalización para la 1ra institución seleccionada:</span>
                </div>
                {(() => {
                  const firstInst = institutions.find(i => i.id === selectedBulkInstIds[0]);
                  if (!firstInst) return null;
                  return (
                    <div className="bg-white p-3 rounded-lg border border-amber-200 text-slate-700 space-y-1 text-[11px]">
                      <p><strong>Destinatario:</strong> {firstInst.tradeName || firstInst.name} &lt;{firstInst.email || firstInst.contactEmail || 'correo@colegio.edu'}&gt;</p>
                      <p><strong>Asunto:</strong> {interpolateVariables(bulkSubject || "(Sin asunto)", firstInst)}</p>
                      <p className="whitespace-pre-line text-slate-500 pt-1 border-t border-slate-100">
                        {interpolateVariables(bulkBody || "(Sin mensaje)", firstInst)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Execute dispatch */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Se enviarán notificaciones a <strong className="text-slate-800">{selectedBulkInstIds.length}</strong> instituciones socias.
              </div>

              <button
                type="button"
                onClick={handleExecuteBulkDispatch}
                disabled={isBulkDispatching || selectedBulkInstIds.length === 0}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/10 transition flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {isBulkDispatching ? "Despachando notificaciones..." : `Despachar a ${selectedBulkInstIds.length} Instituciones`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: HISTORIAL DE NOTIFICACIONES                    */}
      {/* ========================================================= */}
      {activeSubTab === "Historial" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Buscar en historial por institución, correo, asunto o remitente..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => setLogSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={logStatusFilter}
                onChange={e => setLogStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="Todas">Todos los estatus</option>
                <option value="Entregado">Entregado</option>
                <option value="Leído">Leído</option>
                <option value="Respondido">Respondido</option>
              </select>

              <select
                value={logPriorityFilter}
                onChange={e => setLogPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="Todas">Todas las prioridades</option>
                <option value="Normal">Normal</option>
                <option value="Urgente">Urgente</option>
                <option value="Informativa">Informativa</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportHistoryToCsv}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {(() => {
            const filteredLogs = notificationLogs.filter(l => {
              const matchesStatus = logStatusFilter === "Todas" || l.status === logStatusFilter;
              const matchesPriority = logPriorityFilter === "Todas" || l.priority === logPriorityFilter;
              const query = logSearch.toLowerCase();
              const matchesSearch = !logSearch.trim() ||
                l.institutionName.toLowerCase().includes(query) ||
                l.recipientEmail.toLowerCase().includes(query) ||
                l.recipientContact.toLowerCase().includes(query) ||
                l.subject.toLowerCase().includes(query) ||
                l.sentBy.toLowerCase().includes(query);
              return matchesStatus && matchesPriority && matchesSearch;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                  <Mail className="w-10 h-10 mx-auto text-slate-300" />
                  <h4 className="text-sm font-extrabold text-slate-700">No hay registros de notificaciones</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No se encontraron registros que coincidan con los filtros aplicados.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Fecha & Hora</th>
                        <th className="px-4 py-3">Institución Destino</th>
                        <th className="px-4 py-3">Asunto & Mensaje</th>
                        <th className="px-4 py-3">Prioridad</th>
                        <th className="px-4 py-3">Estatus</th>
                        <th className="px-4 py-3">Remitente</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                            {log.sentAt}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>{log.institutionName}</span>
                              {log.country && isColombia(log.country) && log.colombiaCalendar && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-amber-50 text-amber-900 border border-amber-300">
                                  🇨🇴 {log.colombiaCalendar}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {log.recipientContact} &bull; {log.recipientEmail}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-bold text-slate-800 truncate">{log.subject}</div>
                            <div className="text-[11px] text-slate-500 truncate">{log.body}</div>
                            {log.attachments && log.attachments.length > 0 && (
                              <div className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5 font-bold">
                                <Paperclip className="w-3 h-3" />
                                <span>{log.attachments.length} archivo(s) adjunto(s)</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                              log.priority === "Urgente"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : log.priority === "Informativa"
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {log.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-max ${
                              log.status === "Respondido"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : log.status === "Leído"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              <Check className="w-3 h-3" />
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[11px]">
                            {log.sentBy}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedLogForDetail(log)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Ver Notificación"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (log.institutionId) {
                                    setSelectedInstitutionId(log.institutionId.toString());
                                    setRecipientMode("institution");
                                  } else {
                                    setRecipientMode("manual");
                                    setManualName(log.institutionName);
                                    setManualEmail(log.recipientEmail);
                                    setManualContact(log.recipientContact);
                                  }
                                  setComposeSubject(log.subject);
                                  setComposeBody(log.body);
                                  setComposePriority(log.priority);
                                  setActiveSubTab("Redactar");
                                  showToast("Datos cargados para reenvío");
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Reenviar / Usar como base"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT TEMPLATE                             */}
      {/* ========================================================= */}
      {isTemplateModalOpen && (
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title={editingTemplate ? "Editar Plantilla Institucional" : "Nueva Plantilla de Notificación"}
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Nombre de la Plantilla *</label>
              <input
                type="text"
                value={tplFormTitle}
                onChange={e => setTplFormTitle(e.target.value)}
                placeholder="Ej. Recordatorio de Pago Mensual"
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Categoría *</label>
              <select
                value={tplFormCategory}
                onChange={e => setTplFormCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Académico">Académico</option>
                <option value="Finanzas y Facturación">Finanzas y Facturación</option>
                <option value="Membresías">Membresías</option>
                <option value="Operaciones">Operaciones</option>
                <option value="Soporte y Plataforma">Soporte y Plataforma</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Asunto Predeterminado *</label>
              <input
                type="text"
                value={tplFormSubject}
                onChange={e => setTplFormSubject(e.target.value)}
                placeholder="Ej. Estado de Cuenta y Facturación - {{institucion}}"
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Cuerpo del Mensaje *</label>
                <span className="text-[10px] text-slate-400">Usa {"{{institucion}}"}, {"{{contacto}}"}, {"{{pais}}"}, {"{{calendario}}"}</span>
              </div>
              <textarea
                rows={7}
                value={tplFormBody}
                onChange={e => setTplFormBody(e.target.value)}
                placeholder="Estimado/a {{contacto}}, le informamos..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed font-sans"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-xs"
              >
                {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE TEMPLATE CONFIRMATION                       */}
      {/* ========================================================= */}
      {templateToDelete && (
        <Modal
          isOpen={!!templateToDelete}
          onClose={() => setTemplateToDelete(null)}
          title="Confirmar Eliminación de Plantilla"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              ¿Estás seguro de que deseas eliminar la plantilla <strong>"{templateToDelete.title}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider"
              >
                Eliminar Plantilla
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: LIVE PREVIEW                                       */}
      {/* ========================================================= */}
      {isPreviewModalOpen && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Vista Previa de la Notificación Institucional"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-slate-700">
              <p><strong>De:</strong> {currentUser?.name || "Administración Central"} &lt;{currentUser?.email || "notificaciones@ihsdual.com"}&gt;</p>
              <p><strong>Para:</strong> {effectiveRecipientContact || "Contacto"} &lt;{effectiveRecipientEmail || "correo@institucion.edu"}&gt;</p>
              {showCc && composeCc && <p><strong>CC:</strong> {composeCc}</p>}
              <p><strong>Prioridad:</strong> <span className="font-bold text-indigo-600">{composePriority}</span></p>
              <p className="pt-1 border-t border-slate-200 font-bold text-slate-900 text-sm">
                {composeSubject || "(Sin asunto)"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs font-sans min-h-[160px]">
              {composeBody || "(Sin contenido redactado)"}

              {attachSignature && (
                <div className="mt-6 pt-4 border-t border-slate-200 text-slate-600 space-y-0.5 text-[11px]">
                  <p className="font-bold text-slate-900">{currentUser?.name || "Equipo Directivo"}</p>
                  <p className="text-slate-500">IHS Manager &bull; Bachillerato Dual Internacional</p>
                  {currentUser?.email && <p className="text-indigo-600">{currentUser.email}</p>}
                </div>
              )}
            </div>

            {composeAttachments.length > 0 && (
              <div className="space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Archivos Adjuntos:</span>
                <div className="flex flex-wrap gap-2">
                  {composeAttachments.map(a => (
                    <span key={a.id} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      {a.fileName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW SENT NOTIFICATION DETAIL                      */}
      {/* ========================================================= */}
      {selectedLogForDetail && (
        <Modal
          isOpen={!!selectedLogForDetail}
          onClose={() => setSelectedLogForDetail(null)}
          title={`Detalle de Notificación - ${selectedLogForDetail.institutionName}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 text-[10px]">Fecha de Envío: {selectedLogForDetail.sentAt}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedLogForDetail.status === "Respondido" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {selectedLogForDetail.status}
                </span>
              </div>
              <p><strong>Institución:</strong> {selectedLogForDetail.institutionName} ({selectedLogForDetail.country || 'México'})</p>
              {selectedLogForDetail.colombiaCalendar && (
                <p><strong>Calendario Escolar:</strong> 🇨🇴 {selectedLogForDetail.colombiaCalendar}</p>
              )}
              <p><strong>Destinatario:</strong> {selectedLogForDetail.recipientContact} &lt;{selectedLogForDetail.recipientEmail}&gt;</p>
              <p><strong>Remitente:</strong> {selectedLogForDetail.sentBy}</p>
              <p><strong>Prioridad:</strong> {selectedLogForDetail.priority}</p>
              <div className="pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                {selectedLogForDetail.subject}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
              {selectedLogForDetail.body}
            </div>

            {selectedLogForDetail.attachments && selectedLogForDetail.attachments.length > 0 && (
              <div className="space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Archivos Adjuntos:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedLogForDetail.attachments.map(a => (
                    <span key={a.id} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      {a.fileName} ({a.fileSize})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: BULK DISPATCH PROGRESS                             */}
      {/* ========================================================= */}
      {isBulkDispatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Enviando Notificaciones Masivas...</h4>
                <p className="text-xs text-slate-500">Procesando cola de correos a instituciones socias</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 truncate max-w-[200px]">{bulkCurrentDispatchName}</span>
                <span className="text-amber-600 font-mono">{bulkProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${bulkProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Por favor no cierres esta ventana mientras se despachan las comunicaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
