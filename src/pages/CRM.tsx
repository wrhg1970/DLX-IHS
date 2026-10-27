import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CreditCard,
  Receipt,
  CheckCircle,
  Building2, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Circle,
  Video,
  AlertCircle, 
  AlertTriangle,
  ShieldAlert,
  Calendar, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Briefcase, 
  FileText,
  FileSpreadsheet,
  HelpCircle,
  X,
  UserCheck,
  Activity as ActivityIcon,
  MousePointerClick,
  Settings,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Database,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Megaphone,
  Target,
  Send,
  Inbox,
  PieChart,
  BarChart2,
  Check,
  CheckSquare,
  MapPin,
  Sparkles,
  Brain,
  Copy,
  Loader2,
  MessageSquare,
  FileCheck,
  Paperclip,
  Bell,
  Zap,
  GraduationCap,
  BookOpen,
  Link as LinkIcon,
  ExternalLink,
  FolderOpen,
  UploadCloud,
  Share2,
  SlidersHorizontal
} from "lucide-react";
import { useAppContext, TaskType, cleanForFirestore, generateUniqueId } from "../context/AppContext";
import { hasPermission, PermissionMenu } from "../utils/permissionCheck";
import { db } from "../lib/firebase";
import { Modal } from "../components/ui/Modal";
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  Cell, 
  Tooltip, 
  LabelList,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { dispatchRealtimeNotification } from "../utils/realtimeNotifications";
import { safeLocalStorageSet, safeLocalStorageGet } from "../utils/storage";

// Type definition for Lead
export interface CRMContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export type CRMLeadType = 'Institución Potencial' | 'Persona Potencial' | 'Redes Sociales';

export interface CRMLead {
  id: string;
  idLead?: string; // e.g. "LD-001" or original ID from spreadsheet/source
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  source: string; // e.g. "Recomendación", "Feria Educativa", "Campaña Digital", "Llamada Fría", "LinkedIn", "Redes Sociales"
  status: string;
  type: CRMLeadType;
  value: number; // Est. value in USD
  assignedTo?: string; // Agent name/ID
  notes: string;
  createdAt: string;
  contacts?: CRMContactPerson[];
  englishExamScore?: string; // Calificación de Examen Inglés (ej. "85/100", "B2", "TOEFL 85")
  englishExamDate?: string; // Fecha de presentación del examen
  programOfInterest?: string; // Programa de Interés (Homeschool)
  gradeToTake?: string; // Grado a cursar (para Prospecto Individual)
  creditsToTake?: string; // Créditos por cursar (para Prospecto Individual)
  mallaPaymentStatus?: 'Pendiente' | 'Pagado' | 'Exento'; // Estatus de pago de Malla Curricular
  mallaPaymentDate?: string; // Fecha de confirmación de pago
  mallaPaymentAmount?: number; // Monto pagado en USD
  mallaPaymentRef?: string; // Folio o número de referencia del comprobante
  mallaPaymentMethod?: string; // Método de pago utilizado (ej. Transferencia, Tarjeta, Stripe)
  mallaPaymentNotes?: string; // Observaciones de tesorería / finanzas
  isDuplicate?: boolean;
  duplicateReason?: string;
  duplicateMatchedWith?: string;
}

// Helper to detect if a prospect is duplicate against an existing list
export function detectLeadDuplicate(
  candidate: { idLead?: string; name?: string; email?: string; phone?: string },
  existingList: CRMLead[]
): { isDuplicate: boolean; reason?: string; matchedWith?: string } {
  const normStr = (val?: string) => (val || "").trim().toLowerCase();
  const normDigits = (val?: string) => (val || "").replace(/\D/g, "");

  const candId = normStr(candidate.idLead);
  const candEmail = normStr(candidate.email);
  const candName = normStr(candidate.name);
  const candPhone = normDigits(candidate.phone);

  for (const existing of existingList) {
    // 1. By idLead if both have it
    const exId = normStr(existing.idLead);
    if (candId && exId && candId === exId) {
      return {
        isDuplicate: true,
        reason: `Mismo ID (${existing.idLead})`,
        matchedWith: existing.name
      };
    }

    // 2. By email if both have it
    const exEmail = normStr(existing.email);
    if (candEmail && exEmail && candEmail === exEmail) {
      return {
        isDuplicate: true,
        reason: `Mismo correo (${existing.email})`,
        matchedWith: existing.name
      };
    }

    // 3. By name if both have non-empty name
    const exName = normStr(existing.name);
    if (candName && exName && candName === exName) {
      return {
        isDuplicate: true,
        reason: `Mismo nombre ("${existing.name}")`,
        matchedWith: existing.name
      };
    }

    // 4. By phone if both have at least 7 numeric digits
    const exPhone = normDigits(existing.phone);
    if (candPhone.length >= 7 && exPhone.length >= 7 && candPhone === exPhone) {
      return {
        isDuplicate: true,
        reason: `Mismo teléfono (${existing.phone})`,
        matchedWith: existing.name
      };
    }
  }

  return { isDuplicate: false };
}

// Pipeline Stages list for Instituciones
export const DEFAULT_INSTITUTION_STAGES = [
  "Leads",
  "Primer contacto",
  "Presentación",
  "Malla curricular y boletines",
  "Diagnostico y propuesta",
  "Revisión",
  "Firma",
  "Cliente",
  "Sin Interes",
  "Futuro",
  "Perdido"
];

// Pipeline Stages list for Particulares
export const DEFAULT_PARTICULAR_STAGES = [
  "Leads",
  "Primer contacto",
  "Presentación",
  "Examen Inglés",
  "Pago",
  "Malla curricular y boletines",
  "Diagnóstico y propuesta",
  "Revisión",
  "Firma",
  "Sin Interes",
  "Futuro",
  "Perdido"
];

// Pipeline Stages list for Redes Sociales
export const DEFAULT_REDES_SOCIALES_STAGES = [
  "Mensaje 1",
  "Mensaje 2",
  "Mensaje 3",
  "Mensaje 4",
  "Mensaje 5",
  "Perdido"
];

// Backward-compatible default pipeline stages
export const DEFAULT_PIPELINE_STAGES = DEFAULT_INSTITUTION_STAGES;

// Helper to normalize legacy statuses to the new pipeline stages
const normalizeLeadStatus = (status: string, type: CRMLeadType = 'Institución Potencial'): string => {
  if (!status) return type === 'Redes Sociales' ? "Mensaje 1" : "Leads";
  const trimmed = status.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower === "mensaje 1" || lower === "mensaje1" || lower === "m1") return "Mensaje 1";
  if (lower === "mensaje 2" || lower === "mensaje2" || lower === "m2") return "Mensaje 2";
  if (lower === "mensaje 3" || lower === "mensaje3" || lower === "m3") return "Mensaje 3";
  if (lower === "mensaje 4" || lower === "mensaje4" || lower === "m4") return "Mensaje 4";
  if (lower === "mensaje 5" || lower === "mensaje5" || lower === "m5") return "Mensaje 5";

  if (lower === "captación" || lower === "captacion" || lower === "nuevo" || lower === "lead" || lower === "leads") {
    return type === 'Redes Sociales' ? "Mensaje 1" : "Leads";
  }
  if (lower === "primer filtro" || lower === "contactado" || lower === "primer contacto") return "Primer contacto";
  if (lower === "demostración" || lower === "demostracion" || lower === "presentación" || lower === "presentacion") return "Presentación";
  if (lower === "propuesta" || lower === "diagnostico y propuesta" || lower === "diagnóstico y propuesta") {
    return type === "Institución Potencial" ? "Diagnostico y propuesta" : "Diagnóstico y propuesta";
  }
  if (lower === "cierre" || lower === "ganado" || lower === "firma") return "Firma";
  if (lower === "cliente" || lower === "clientes") return "Cliente";
  if (lower === "sin interes" || lower === "sin interés") return "Sin Interes";
  if (lower === "futuro") return "Futuro";
  if (lower === "perdido") return "Perdido";
  if (lower === "malla curricular y boletines") return "Malla curricular y boletines";
  if (lower === "examen inglés" || lower === "examen ingles") return "Examen Inglés";
  if (lower === "pago") return "Pago";
  if (lower === "revisión" || lower === "revision") return "Revisión";
  
  return status;
};

// Helper to get stage badge colors with high visual contrast and distinction
export const getStageBadgeColor = (stage: string): string => {
  switch (stage) {
    case "Mensaje 1":
      return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Mensaje 2":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Mensaje 3":
      return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    case "Mensaje 4":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "Mensaje 5":
      return "bg-pink-50 text-pink-700 border border-pink-200";
    case "Leads":
      return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Primer contacto":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Presentación":
      return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    case "Examen Inglés":
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "Pago":
      return "bg-teal-50 text-teal-700 border border-teal-200";
    case "Malla curricular y boletines":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "Diagnostico y propuesta":
    case "Diagnóstico y propuesta":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Revisión":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "Firma":
    case "Cierre":
      return "bg-teal-50 text-teal-700 border border-teal-200";
    case "Cliente":
      return "bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold";
    case "Sin Interes":
    case "Sin Interés":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    case "Futuro":
      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "Perdido":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
};

// Initial default seed leads
const SEED_LEADS: CRMLead[] = [
  {
    id: "lead-1",
    name: "Colegio Hamilton-Bilingual School",
    contactName: "Directora Sylvia Estrada",
    email: "sylvia.estrada@hamilton.edu.mx",
    phone: "+52 55 4567 8901",
    country: "México",
    source: "Feria Educativa",
    status: "Leads",
    type: "Institución Potencial",
    value: 4500,
    assignedTo: "Sofía Martínez",
    notes: "Interesados en incorporar programa piloto de 30 alumnos para cursos de invierno.",
    createdAt: "2026-05-10"
  },
  {
    id: "lead-2",
    name: "Instituto Oxford de Monterrey",
    contactName: "Ing. Roberto Cavazos",
    email: "rcavazos@oxfordmty.edu",
    phone: "+52 81 2345 6789",
    country: "México",
    source: "Recomendación",
    status: "Revisión",
    type: "Institución Potencial",
    value: 12500,
    assignedTo: "Carlos Ruiz",
    notes: "Revisando costos de envío de material complementario y membresías anuales con 10% de descuento por volumen.",
    createdAt: "2026-05-12"
  },
  {
    id: "lead-3",
    name: "Lycee Franco-Mexicain (Potential)",
    contactName: "Madame Sophie Dubois",
    email: "s.dubois@lfm.edu.mx",
    phone: "+52 55 1122 3344",
    country: "México",
    source: "LinkedIn",
    status: "Leads",
    type: "Institución Potencial",
    value: 8000,
    assignedTo: "Sofía Martínez",
    notes: "Contacto inicial mediante LinkedIn Sales Navigator. Mostró interés en validación académica doble norteamericana.",
    createdAt: "2026-05-24"
  },
  {
    id: "lead-4",
    name: "Colegio Vista Hermosa",
    contactName: "Lic. Andrea Lomelí",
    email: "andrea.lomeli@vistahermosa.edu.mx",
    phone: "+52 55 9876 5432",
    country: "México",
    source: "Campaña Digital",
    status: "Leads",
    type: "Institución Potencial",
    value: 15000,
    assignedTo: "Sofía Martínez",
    notes: "¡Contrato de membresía institucional anual firmado hoy! Pendiente asignación de agente de onboarding.",
    createdAt: "2026-05-05"
  },
  {
    id: "lead-5",
    name: "Familia Gaxiola Ruiz",
    contactName: "Sra. Patricia Ruiz",
    email: "patty.ruiz@gmail.com",
    phone: "+52 66 7712 3456",
    country: "México",
    source: "Campaña Digital",
    status: "Examen Inglés",
    type: "Persona Potencial",
    value: 1200,
    assignedTo: "Admin Global",
    programOfInterest: "Transfer",
    notes: "Madre de familia buscando créditos de convalidación para su hijo deportista de alto rendimiento.",
    createdAt: "2026-05-22",
    englishExamScore: "B2 (85/100)",
    englishExamDate: "2026-05-24"
  },
  {
    id: "lead-6",
    name: "Colegio Americano de Guadalajara (Potential)",
    contactName: "Director Thomas Vance",
    email: "t.vance@asg.edu.mx",
    phone: "+52 33 4455 6677",
    country: "México",
    source: "Llamada Fría",
    status: "Leads",
    type: "Institución Potencial",
    value: 6500,
    assignedTo: "Carlos Ruiz",
    notes: "Decidieron continuar con su proveedor actual de soporte de bachillerato internacional.",
    createdAt: "2026-04-10"
  },
  {
    id: "lead-7",
    name: "Colegio Bilingüe San Jerónimo",
    contactName: "Profra. Martha Morales",
    email: "martham@sanjeronimo.edu.mx",
    phone: "+52 81 9988 7766",
    country: "México",
    source: "Llamada Fría",
    status: "Perdido",
    type: "Institución Potencial",
    value: 5000,
    assignedTo: "Carlos Ruiz",
    notes: "Decidieron no renovar contrato este ciclo por restricciones presupuestarias internas.",
    createdAt: "2026-03-15"
  },
  {
    id: "lead-rs-1",
    name: "Colegio Bilingüe San Jerónimo (@sanjeronimo_edu)",
    contactName: "Coordinación de Admisiones",
    email: "contacto@sanjeronimo.edu.mx",
    phone: "+52 55 9876 5432",
    country: "México",
    source: "Redes Sociales",
    status: "Mensaje 1",
    type: "Redes Sociales",
    value: 3500,
    assignedTo: "Sofía Martínez",
    notes: "Contacto inicial establecido mediante mensaje directo en Instagram. Solicitan información sobre convenios.",
    createdAt: "2026-10-18"
  },
  {
    id: "lead-rs-2",
    name: "Academia Moderna Cumbres (@cumbres_edu)",
    contactName: "Lic. Karla Valenzuela",
    email: "karla.valenzuela@cumbres.edu.mx",
    phone: "+52 81 8765 4321",
    country: "México",
    source: "Redes Sociales",
    status: "Mensaje 2",
    type: "Redes Sociales",
    value: 4000,
    assignedTo: "Carlos Ruiz",
    notes: "Enviado catálogo y folleto institucional en segundo mensaje de seguimiento.",
    createdAt: "2026-10-15"
  }
];

const getDaysDifference = (dateString: string) => {
  if (!dateString) return 999;
  const dateVal = new Date(dateString);
  if (isNaN(dateVal.getTime())) return 999;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateVal.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - dateVal.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const isLeadInactive = (lead: CRMLead, leadTasks: { dueDate: string }[], slaLimitDays?: number | null) => {
  // If explicitly N/A (null), no inactivity alert
  if (slaLimitDays === null) return false;
  const limit = (slaLimitDays !== undefined && slaLimitDays !== null) ? slaLimitDays : 7;
  if (limit <= 0) return false;

  const createdDaysAgo = getDaysDifference(lead.createdAt);
  if (createdDaysAgo <= limit) return false;
  
  const hasRecentOrFutureTask = leadTasks.some(task => {
    const taskDaysAgo = getDaysDifference(task.dueDate);
    return taskDaysAgo <= limit;
  });
  
  return !hasRecentOrFutureTask;
};

export interface CRMCampaign {
  id: string;
  name: string;
  channel: "Email" | "LinkedIn" | "WhatsApp" | "Evento" | "Llamadas";
  status: "Activa" | "En Diseño" | "Pausada" | "Finalizada";
  budget: number;
  startDate: string;
  endDate: string;
  targetAudience: string;
  targetLeads: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  convertedLeads: number;
  estimatedRevenue: number;
}

export interface CRMEmailTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CRMEmailAttachment {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType?: string;
  fileData?: string;
  category?: string;
  sourceType?: "repositorio" | "archivo_externo" | "enlace_externo";
  externalUrl?: string;
}

export interface CRMEmailLog {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string;
  status: "Entregado" | "Leído" | "Respondido";
  attachments?: CRMEmailAttachment[];
}

const SEED_CAMPAIGNS: CRMCampaign[] = [
  {
    id: "camp_1",
    name: "Campaña Colegios Bilingües México 2026",
    channel: "Email",
    status: "Activa",
    budget: 2500,
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    targetAudience: "Directores y Coordinadores de Colegios Privados Bilingües",
    targetLeads: 50,
    sentCount: 450,
    openedCount: 280,
    clickedCount: 145,
    convertedLeads: 42,
    estimatedRevenue: 125000
  },
  {
    id: "camp_2",
    name: "Webinar Bachillerato Dual e Innovación AP",
    channel: "Evento",
    status: "Activa",
    budget: 1200,
    startDate: "2026-08-01",
    endDate: "2026-08-25",
    targetAudience: "Rectores e Instituciones de Educación Media Superior",
    targetLeads: 30,
    sentCount: 320,
    openedCount: 210,
    clickedCount: 110,
    convertedLeads: 28,
    estimatedRevenue: 84000
  },
  {
    id: "camp_3",
    name: "Estrategia Outreach LinkedIn Directores",
    channel: "LinkedIn",
    status: "Activa",
    budget: 800,
    startDate: "2026-06-15",
    endDate: "2026-10-15",
    targetAudience: "Perfiles de Directores Generales en LinkedIn",
    targetLeads: 25,
    sentCount: 850,
    openedCount: 420,
    clickedCount: 95,
    convertedLeads: 19,
    estimatedRevenue: 57000
  },
  {
    id: "camp_4",
    name: "Newsletter Informativo Plan Académico Q3",
    channel: "Email",
    status: "Finalizada",
    budget: 400,
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    targetAudience: "Base de contactos existentes e instituciones potenciales",
    targetLeads: 20,
    sentCount: 1200,
    openedCount: 610,
    clickedCount: 230,
    convertedLeads: 14,
    estimatedRevenue: 42000
  }
];

const SEED_EMAIL_TEMPLATES: CRMEmailTemplate[] = [
  {
    id: "tpl_1",
    title: "Presentación Oficial del Bachillerato Dual",
    category: "Primer Contacto",
    subject: "Propuesta de Innovación Académica para {{nombre_colegio}}",
    body: "Estimado/a {{contacto_principal}},\n\nEs un gusto saludarle en representación de nuestro equipo. Deseamos presentarle nuestro Programa de Bachillerato Dual acreditado internacionalmente para los alumnos de {{nombre_colegio}}.\n\nEste modelo permite a sus estudiantes obtener una doble titulación oficial y prepararse para universidades de alto nivel. Nos encantaría agendar una breve reunión de 15 minutos esta semana para compartirle los beneficios para su institución.\n\nAtentamente,\nEquipo Académico Dual"
  },
  {
    id: "tpl_2",
    title: "Envío de Cotización y Propuesta Económica",
    category: "Propuesta",
    subject: "Propuesta Económica y Plan de Convenio - {{nombre_colegio}}",
    body: "Estimado/a {{contacto_principal}},\n\nAdjunto a este correo encontrará la propuesta económica formal y el plan de convenio proyectado para {{nombre_colegio}} por un valor estimado de ${{monto_estimado}} USD.\n\nQuedamos a su entera disposición para revisar cualquier ajuste requeridos por el consejo directivo.\n\nSaludos cordiales,\nDirección de Convenios"
  },
  {
    id: "tpl_3",
    title: "Confirmación y Recordatorio de Reunión",
    category: "Agendamiento",
    subject: "Confirmación de Cita Informativa: Bachillerato Dual x {{nombre_colegio}}",
    body: "Hola {{contacto_principal}},\n\nConfirmamos nuestra reunión agendada para revisar los detalles del programa en {{nombre_colegio}}.\n\nLe enviamos el enlace directivo de videoconferencia y la agenda de la presentación. Esperamos saludarle pronto.\n\nAtentamente,\nAsesoría Comercial"
  },
  {
    id: "tpl_4",
    title: "Reactivación e Inactividad de Prospecto",
    category: "Seguimiento",
    subject: "¿Aún con interés en impulsar el Bachillerato Dual en {{nombre_colegio}}?",
    body: "Estimado/a {{contacto_principal}},\n\nHace un tiempo conversamos sobre la posibilidad de integrar el Bachillerato Dual en {{nombre_colegio}}.\n\nQueríamos saber si tienen espacio en su agenda para una actualización rápida sobre las nuevas becas e incentivos docentes disponibles para este ciclo escolar.\n\nAtentamente,\nAtención a Instituciones"
  }
];

const SEED_EMAIL_LOGS: CRMEmailLog[] = [
  {
    id: "elog_1",
    leadId: "1",
    leadName: "Colegio Bilingüe San José",
    leadEmail: "m.gomez@sanjose.edu.mx",
    subject: "Propuesta de Innovación Académica para Colegio Bilingüe San José",
    body: "Presentación oficial enviada a dirección con el Convenio Marco Institucional adjunto.",
    sentAt: "2026-08-10 10:30",
    sentBy: "Admin Global",
    status: "Leído",
    attachments: [
      {
        id: "doc-rep-1",
        title: "Convenio Marco Institucional - Bachillerato Dual",
        fileName: "Convenio_Marco_Dual_2026.pdf",
        fileSize: "2.4 MB",
        fileType: "application/pdf",
        category: "Contratos y Convenios"
      }
    ]
  },
  {
    id: "elog_2",
    leadId: "2",
    leadName: "Instituto Americano de Monterrey",
    leadEmail: "r.mendoza@americanomty.edu.mx",
    subject: "Propuesta Económica y Plan de Convenio - Instituto Americano de Monterrey",
    body: "Cotización formal y propuesta de acreditación adjuntadas para evaluación por el consejo.",
    sentAt: "2026-08-11 15:45",
    sentBy: "Juan Pérez",
    status: "Respondido",
    attachments: [
      {
        id: "doc-rep-2",
        title: "Propuesta Comercial Bachillerato Internacional",
        fileName: "Propuesta_Comercial_2026.pdf",
        fileSize: "1.8 MB",
        fileType: "application/pdf",
        category: "Propuestas Comerciales"
      },
      {
        id: "doc-rep-3",
        title: "Acreditación Curricular Cognia & College Board",
        fileName: "Acreditaciones_Certificadas_2026.pdf",
        fileSize: "3.1 MB",
        fileType: "application/pdf",
        category: "Acreditaciones y Licencias"
      }
    ]
  },
  {
    id: "elog_3",
    leadId: "3",
    leadName: "Lycée Français de Guadalajara",
    leadEmail: "c.dubois@lyceegdl.edu.mx",
    subject: "Confirmación de Cita Informativa",
    body: "Agenda de videoconferencia enviada para reunión virtual.",
    sentAt: "2026-08-12 09:15",
    sentBy: "Admin Global",
    status: "Entregado",
    attachments: []
  }
];

export interface CRMRepositoryDocument {
  id: string;
  title: string;
  date: string; // Fecha (automaticamente)
  category: string; // Categoria (del catalogo)
  fileName: string;
  fileSize: string;
  fileType: string;
  fileData?: string;
  externalUrl?: string;
  sourceType?: "repositorio" | "archivo_externo" | "enlace_externo";
  validityDate?: string | null; // Vigencia
  hasValidity: boolean;
  leadId?: string;
  leadName?: string;
  notes?: string;
  uploadedBy: string;
  createdAt: string;
}

const SEED_REPOSITORY_DOCS: CRMRepositoryDocument[] = [
  {
    id: "doc-rep-1",
    title: "Convenio Marco Institucional - Bachillerato Dual",
    date: "2026-08-01",
    category: "Contratos y Convenios",
    fileName: "Convenio_Marco_Dual_2026.pdf",
    fileSize: "2.4 MB",
    fileType: "application/pdf",
    validityDate: "2027-08-01",
    hasValidity: true,
    leadId: "1",
    leadName: "Colegio Bilingüe San José",
    notes: "Convenio firmado por representación legal y dirección académica.",
    uploadedBy: "Admin Global",
    createdAt: "2026-08-01"
  },
  {
    id: "doc-rep-2",
    title: "Propuesta Comercial & Plan de Convalidaciones 2026",
    date: "2026-07-15",
    category: "Propuestas Comerciales",
    fileName: "Propuesta_Comercial_Bachillerato_Dual.pdf",
    fileSize: "1.8 MB",
    fileType: "application/pdf",
    validityDate: "2026-09-30",
    hasValidity: true,
    leadId: "2",
    leadName: "Instituto Americano de Monterrey",
    notes: "Propuesta enviada para aprobación del comité financiero.",
    uploadedBy: "Carlos Ruiz",
    createdAt: "2026-07-15"
  },
  {
    id: "doc-rep-3",
    title: "Certificación de Acreditación Internacional Cognia",
    date: "2026-05-10",
    category: "Acreditaciones y Licencias",
    fileName: "Certificado_Acreditacion_Cognia_US.pdf",
    fileSize: "3.1 MB",
    fileType: "application/pdf",
    validityDate: "2028-12-31",
    hasValidity: true,
    leadName: "General / Corporativo",
    notes: "Certificación de validez internacional oficial.",
    uploadedBy: "Admin Global",
    createdAt: "2026-05-10"
  },
  {
    id: "doc-rep-4",
    title: "Cédula de Identificación Fiscal RFC Corporativo",
    date: "2026-01-10",
    category: "Documentación Legal y Fiscal",
    fileName: "CIF_RFC_Empresarial_2026.pdf",
    fileSize: "512 KB",
    fileType: "application/pdf",
    validityDate: null,
    hasValidity: false,
    leadName: "General / Corporativo",
    notes: "Documento oficial del SAT.",
    uploadedBy: "Admin Global",
    createdAt: "2026-01-10"
  }
];

export type CRMTab = "Analytics" | "Kanban" | "Tabla" | "Campanas" | "Reportes" | "Correos" | "Repositorio" | "Tareas" | "Importar";

export function CRM({ initialTab }: { initialTab?: CRMTab } = {}) {
  const location = useLocation();
  const navigate = useNavigate();

  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    users, 
    currentUser, 
    catalogs,
    addCatalogItem,
    notifyTaskAssignee,
    notifyTaskDeadline,
    triggerDeadlineScan,
    taskNotificationConfig,
    teams,
    institutions,
    addInstitution
  } = useAppContext();
  
  const isSuperAdmin = React.useMemo(() => {
    const r = (currentUser?.role || '').trim().toLowerCase();
    return r === 'superadministrador' || 
           r === 'admin principal' || 
           r === 'director' || 
           r.includes('super') || 
           r.includes('admin') ||
           hasPermission(currentUser?.role, 'CRM', 'delete');
  }, [currentUser]);

  const slaCatalog = catalogs['Fases y Alertas de Inactividad (SLA)'];
  const getLeadSlaRule = (status: string) => {
    return slaCatalog?.find(s => {
      const sName = (s.name || '').toLowerCase().trim();
      const stName = (status || '').toLowerCase().trim();
      return sName === stName || sName.includes(stName) || stName.includes(sName) || (stName === 'captación' && (sName.includes('inicio') || sName.includes('captac') || sName.includes('lead')));
    });
  };

  const getLeadSlaLimit = (status: string) => {
    const item = getLeadSlaRule(status);
    return item !== undefined ? item.slaDays : 3;
  };

  const getLeadSlaIndicator = (status: string) => {
    const item = getLeadSlaRule(status);
    if (status === "Captación") {
      return item ? item.name : "Captación (Inicio)";
    }
    return item ? item.name : status;
  };
  
  // States of Leads
  const [leads, setLeads] = useState<CRMLead[]>(() => {
    const saved = safeLocalStorageGet<CRMLead[] | null>("crm_leads_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map((l: CRMLead) => {
        const normalized = normalizeLeadStatus(l.status, l.type);
        return {
          ...l,
          status: normalized as CRMLead["status"]
        };
      });
    }
    return SEED_LEADS.map(l => {
      const normalized = normalizeLeadStatus(l.status, l.type);
      return { ...l, status: normalized as CRMLead["status"] };
    });
  });

  // Hide/Show "Perdido" status in Kanban and lists
  const [hideLostStage, setHideLostStage] = useState<boolean>(() => {
    const saved = safeLocalStorageGet<string | null>("crm_hide_lost_stage", null);
    return saved !== null ? saved === "true" : false;
  });

  useEffect(() => {
    safeLocalStorageSet("crm_hide_lost_stage", String(hideLostStage));
  }, [hideLostStage]);

  useEffect(() => {
    safeLocalStorageSet("crm_leads_v1", leads);
  }, [leads]);

  const [activeTab, setActiveTab] = useState<CRMTab>(() => {
    const path = location.pathname;
    if (path.endsWith("/dashboard")) return "Analytics";
    if (path.endsWith("/campanas")) return "Campanas";
    if (path.endsWith("/reportes")) return "Reportes";
    if (path.endsWith("/correos")) return "Correos";
    if (path.endsWith("/repositorio")) return "Repositorio";
    if (path.endsWith("/tareas")) return "Tareas";
    return initialTab || "Kanban";
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/dashboard")) {
      setActiveTab("Analytics");
    } else if (path.endsWith("/campanas")) {
      setActiveTab("Campanas");
    } else if (path.endsWith("/reportes")) {
      setActiveTab("Reportes");
    } else if (path.endsWith("/correos")) {
      setActiveTab("Correos");
    } else if (path.endsWith("/repositorio")) {
      setActiveTab("Repositorio");
    } else if (path.endsWith("/tareas")) {
      setActiveTab("Tareas");
    } else if (path === "/crm") {
      if (initialTab) setActiveTab(initialTab);
    }
  }, [location.pathname, initialTab]);

  // Card view layout mode: "tarjetas" (detailed) vs "compacta" (compact)
  const [cardViewMode, setCardViewMode] = useState<"tarjetas" | "compacta">(() => {
    const saved = safeLocalStorageGet<string>("crm_card_view_mode", "tarjetas");
    return (saved === "compacta" || saved === "tarjetas") ? saved : "tarjetas";
  });

  useEffect(() => {
    safeLocalStorageSet("crm_card_view_mode", cardViewMode);
  }, [cardViewMode]);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<CRMCampaign[]>(() => {
    const saved = safeLocalStorageGet<CRMCampaign[] | null>("crm_campaigns_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return SEED_CAMPAIGNS;
  });

  useEffect(() => {
    safeLocalStorageSet("crm_campaigns_v1", campaigns);
  }, [campaigns]);

  // Campaign Modal & Form state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CRMCampaign | null>(null);
  const [campaignFilterStatus, setCampaignFilterStatus] = useState<string>("Todas");
  const [campaignFilterChannel, setCampaignFilterChannel] = useState<string>("Todos");

  // Form states for Campaign
  const [formCampName, setFormCampName] = useState("");
  const [formCampChannel, setFormCampChannel] = useState<CRMCampaign["channel"]>("Email");
  const [formCampStatus, setFormCampStatus] = useState<CRMCampaign["status"]>("Activa");
  const [formCampBudget, setFormCampBudget] = useState<number | "">(1000);
  const [formCampStartDate, setFormCampStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCampEndDate, setFormCampEndDate] = useState(new Date(Date.now() + 30*86400000).toISOString().split("T")[0]);
  const [formCampAudience, setFormCampAudience] = useState("");
  const [formCampTargetLeads, setFormCampTargetLeads] = useState<number | "">(20);

  // Email Hub State & Custom Templates
  const [emailTemplates, setEmailTemplates] = useState<CRMEmailTemplate[]>(() => {
    const saved = safeLocalStorageGet<CRMEmailTemplate[] | null>("crm_email_templates_v2", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return SEED_EMAIL_TEMPLATES;
  });

  useEffect(() => {
    safeLocalStorageSet("crm_email_templates_v2", emailTemplates);
  }, [emailTemplates]);

  // Template Search & Category Filter
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("Todas");

  // Template Modal State (Create & Edit)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CRMEmailTemplate | null>(null);
  const [formTplTitle, setFormTplTitle] = useState("");
  const [formTplCategory, setFormTplCategory] = useState("Primer Contacto");
  const [formTplCustomCategory, setFormTplCustomCategory] = useState("");
  const [formTplSubject, setFormTplSubject] = useState("");
  const [formTplBody, setFormTplBody] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<CRMEmailTemplate | null>(null);

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<CRMEmailLog[]>(() => {
    const saved = safeLocalStorageGet<CRMEmailLog[] | null>("crm_email_logs_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return SEED_EMAIL_LOGS;
  });

  useEffect(() => {
    safeLocalStorageSet("crm_email_logs_v1", emailLogs);
  }, [emailLogs]);

  const [emailActiveSubTab, setEmailActiveSubTab] = useState<"Redactar" | "Plantillas" | "Historial" | "Masivo">("Plantillas");
  
  // Email Composer Form state
  const [composeRecipientType, setComposeRecipientType] = useState<"lead" | "manual">("lead");
  const [composeLeadId, setComposeLeadId] = useState<string>("");
  const [composeManualName, setComposeManualName] = useState<string>("");
  const [composeManualEmail, setComposeManualEmail] = useState<string>("");
  const [composeCc, setComposeCc] = useState<string>("");
  const [composeBcc, setComposeBcc] = useState<string>("");
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [composeTemplateId, setComposeTemplateId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [composeSelectedDocIds, setComposeSelectedDocIds] = useState<string[]>([]);
  const [composeExternalAttachments, setComposeExternalAttachments] = useState<CRMEmailAttachment[]>([]);
  const composeFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [composeAttachSignature, setComposeAttachSignature] = useState<boolean>(true);

  const currentUserSignature = React.useMemo(() => {
    if (!currentUser) return undefined;
    if (currentUser.includeSignatureInEmails === false) return undefined;
    return {
      enabled: true,
      name: currentUser.name,
      title: currentUser.title,
      department: currentUser.department,
      phone: currentUser.signaturePhone || currentUser.phone,
      email: currentUser.email,
      website: currentUser.signatureWebsite,
      signatureImage: currentUser.signatureImage,
      signatureType: currentUser.signatureType || "drawn",
      signatureText: currentUser.signatureText,
      signatureFont: currentUser.signatureFont,
      disclaimer: currentUser.signatureDisclaimer
    };
  }, [currentUser]);

  const [isAttachPickerModalOpen, setIsAttachPickerModalOpen] = useState(false);
  const [attachPickerTarget, setAttachPickerTarget] = useState<"compose" | "bulk">("compose");
  const [attachSearchTerm, setAttachSearchTerm] = useState("");
  const [attachCategoryFilter, setAttachCategoryFilter] = useState("Todas");
  const [attachLeadFilter, setAttachLeadFilter] = useState("Todos");
  const [viewingEmailLog, setViewingEmailLog] = useState<CRMEmailLog | null>(null);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  // External Link Modal State (Nube / Google Drive / URL)
  const [isExternalLinkModalOpen, setIsExternalLinkModalOpen] = useState<boolean>(false);
  const [externalLinkTarget, setExternalLinkTarget] = useState<"compose" | "bulk" | "repo">("compose");
  const [externalLinkUrl, setExternalLinkUrl] = useState<string>("");
  const [externalLinkTitle, setExternalLinkTitle] = useState<string>("");
  const [externalLinkCategory, setExternalLinkCategory] = useState<string>("Propuestas Comerciales");
  const [externalLinkLeadId, setExternalLinkLeadId] = useState<string>("");
  const [externalLinkNotes, setExternalLinkNotes] = useState<string>("");
  const [externalLinkSaveToRepo, setExternalLinkSaveToRepo] = useState<boolean>(true);

  // Bulk / Mass Email State
  const [bulkEmailSelectedLeadIds, setBulkEmailSelectedLeadIds] = useState<string[]>([]);
  const [bulkEmailStageFilter, setBulkEmailStageFilter] = useState<string>("Todos");
  const [bulkEmailCountryFilter, setBulkEmailCountryFilter] = useState<string>("Todos");
  const [bulkEmailSourceFilter, setBulkEmailSourceFilter] = useState<string>("Todos");
  const [bulkEmailTypeFilter, setBulkEmailTypeFilter] = useState<string>("Institución Potencial");
  const [bulkEmailSearchTerm, setBulkEmailSearchTerm] = useState<string>("");
  const [bulkEmailCc, setBulkEmailCc] = useState<string>("");
  const [bulkEmailBcc, setBulkEmailBcc] = useState<string>("");
  const [showBulkCc, setShowBulkCc] = useState<boolean>(false);
  const [showBulkBcc, setShowBulkBcc] = useState<boolean>(false);
  const [bulkEmailTemplateId, setBulkEmailTemplateId] = useState<string>("");

  // Email Deletion & Selection state (Superadministrador)
  const [emailLogToDelete, setEmailLogToDelete] = useState<CRMEmailLog | null>(null);
  const [selectedEmailLogIds, setSelectedEmailLogIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState<string>("Propuesta Oficial de Alianza de Bachillerato Dual para {{nombre_colegio}}");
  const [bulkEmailBody, setBulkEmailBody] = useState<string>(
    "Estimado/a {{contacto_principal}},\n\nReciba un cordial saludo de parte de nuestro equipo directivo y académico.\n\nNos ponemos en contacto institucional con {{nombre_colegio}} para presentarles nuestra propuesta de acreditación y programa de Bachillerato Dual estadounidense, diseñado para potenciar el perfil académico y global de sus estudiantes en {{ciudad}}.\n\nContamos con validaciones internacionales y convenios de homologación que facilitan el acceso a universidades globales de alto prestigio.\n\nAdjuntamos la documentación y propuesta informativa para su respectivo análisis directivo.\n\nQuedamos a su entera disposición para agendar una breve sesión virtual informativa.\n\nAtentamente,\n{{remitente}}"
  );
  const [bulkEmailSelectedDocIds, setBulkEmailSelectedDocIds] = useState<string[]>([]);
  const [bulkEmailExternalAttachments, setBulkEmailExternalAttachments] = useState<CRMEmailAttachment[]>([]);
  const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [bulkEmailCreateTask, setBulkEmailCreateTask] = useState<boolean>(true);
  const [bulkEmailSending, setBulkEmailSending] = useState<boolean>(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState<{ current: number; total: number; currentSchoolName: string } | null>(null);
  const [bulkEmailPreviewLeadId, setBulkEmailPreviewLeadId] = useState<string>("");
  const [bulkEmailSummaryModal, setBulkEmailSummaryModal] = useState<{
    totalSent: number;
    schoolNames: string[];
    subject: string;
    attachCount: number;
  } | null>(null);

  // Report Period Filter State
  const [reportPeriodFilter, setReportPeriodFilter] = useState<string>("Q3 2026");

  // Repository Documents State
  const [repositoryDocs, setRepositoryDocs] = useState<CRMRepositoryDocument[]>(() => {
    const saved = safeLocalStorageGet<CRMRepositoryDocument[] | null>("crm_repository_docs_v1", null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return SEED_REPOSITORY_DOCS;
  });

  useEffect(() => {
    safeLocalStorageSet("crm_repository_docs_v1", repositoryDocs);
  }, [repositoryDocs]);

  // Repository Filters
  const [repoSearchTerm, setRepoSearchTerm] = useState("");
  const [repoCategoryFilter, setRepoCategoryFilter] = useState("Todas");
  const [repoValidityFilter, setRepoValidityFilter] = useState("Todas");

  // Repository Modal State
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [editingRepoDoc, setEditingRepoDoc] = useState<CRMRepositoryDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<CRMRepositoryDocument | null>(null);

  // Repository Form State
  const [formRepoSourceType, setFormRepoSourceType] = useState<"archivo_local" | "enlace_externo">("archivo_local");
  const [formRepoExternalUrl, setFormRepoExternalUrl] = useState<string>("");
  const [formRepoTitle, setFormRepoTitle] = useState("");
  const [formRepoDate, setFormRepoDate] = useState(new Date().toISOString().split("T")[0]); // Fecha automáticamente
  const [formRepoCategory, setFormRepoCategory] = useState("");
  const [formRepoFileName, setFormRepoFileName] = useState("");
  const [formRepoFileSize, setFormRepoFileSize] = useState("");
  const [formRepoFileType, setFormRepoFileType] = useState("");
  const [formRepoFileData, setFormRepoFileData] = useState<string | undefined>(undefined);
  const [formRepoHasValidity, setFormRepoHasValidity] = useState(false);
  const [formRepoValidityDate, setFormRepoValidityDate] = useState("");
  const [formRepoLeadId, setFormRepoLeadId] = useState("");
  const [formRepoNotes, setFormRepoNotes] = useState("");

  const handleOpenNewRepoDoc = () => {
    setEditingRepoDoc(null);
    setFormRepoSourceType("archivo_local");
    setFormRepoExternalUrl("");
    setFormRepoTitle("");
    setFormRepoDate(new Date().toISOString().split("T")[0]); // Automatic date
    const docCats = catalogs['Categorías de Documentos'] || [];
    setFormRepoCategory(docCats.length > 0 ? docCats[0].name : "Contratos y Convenios");
    setFormRepoFileName("");
    setFormRepoFileSize("");
    setFormRepoFileType("");
    setFormRepoFileData(undefined);
    setFormRepoHasValidity(false);
    setFormRepoValidityDate("");
    setFormRepoLeadId("");
    setFormRepoNotes("");
    setIsRepoModalOpen(true);
  };

  const handleOpenEditRepoDoc = (doc: CRMRepositoryDocument) => {
    setEditingRepoDoc(doc);
    setFormRepoSourceType(doc.sourceType === "enlace_externo" || doc.externalUrl ? "enlace_externo" : "archivo_local");
    setFormRepoExternalUrl(doc.externalUrl || "");
    setFormRepoTitle(doc.title);
    setFormRepoDate(doc.date || new Date().toISOString().split("T")[0]);
    setFormRepoCategory(doc.category);
    setFormRepoFileName(doc.fileName);
    setFormRepoFileSize(doc.fileSize);
    setFormRepoFileType(doc.fileType);
    setFormRepoFileData(doc.fileData);
    setFormRepoHasValidity(doc.hasValidity);
    setFormRepoValidityDate(doc.validityDate || "");
    setFormRepoLeadId(doc.leadId || "");
    setFormRepoNotes(doc.notes || "");
    setIsRepoModalOpen(true);
  };

  const handleRepoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormRepoFileName(file.name);
    let sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    if (file.size > 1024 * 1024) {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }
    setFormRepoFileSize(sizeStr);
    setFormRepoFileType(file.type || "application/pdf");

    if (!formRepoTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormRepoTitle(nameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormRepoFileData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRepoDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRepoTitle.trim()) {
      alert("Por favor ingresa un título o nombre para el documento.");
      return;
    }
    if (formRepoSourceType === "enlace_externo") {
      if (!formRepoExternalUrl.trim()) {
        alert("Por favor introduce el enlace (URL) del documento externo.");
        return;
      }
    } else {
      if (!formRepoFileName && !editingRepoDoc) {
        alert("Por favor selecciona un archivo de documento para subir.");
        return;
      }
    }

    let finalExternalUrl = formRepoExternalUrl.trim();
    if (formRepoSourceType === "enlace_externo" && finalExternalUrl && !/^https?:\/\//i.test(finalExternalUrl)) {
      finalExternalUrl = `https://${finalExternalUrl}`;
    }

    const selectedLead = leads.find(l => l.id === formRepoLeadId);

    if (editingRepoDoc) {
      setRepositoryDocs(prev => prev.map(d => d.id === editingRepoDoc.id ? {
        ...d,
        title: formRepoTitle,
        category: formRepoCategory,
        fileName: formRepoSourceType === "enlace_externo" ? (formRepoFileName || "Enlace Externo Nube") : (formRepoFileName || d.fileName),
        fileSize: formRepoSourceType === "enlace_externo" ? "Enlace Nube" : (formRepoFileSize || d.fileSize),
        fileType: formRepoSourceType === "enlace_externo" ? "application/url" : (formRepoFileType || d.fileType),
        fileData: formRepoSourceType === "enlace_externo" ? undefined : (formRepoFileData !== undefined ? formRepoFileData : d.fileData),
        externalUrl: formRepoSourceType === "enlace_externo" ? finalExternalUrl : undefined,
        sourceType: formRepoSourceType,
        hasValidity: formRepoHasValidity,
        validityDate: formRepoHasValidity ? formRepoValidityDate : null,
        leadId: formRepoLeadId || undefined,
        leadName: selectedLead ? selectedLead.name : (formRepoLeadId === "" ? "General / Corporativo" : d.leadName),
        notes: formRepoNotes
      } : d));
    } else {
      const newDoc: CRMRepositoryDocument = {
        id: `doc-rep-${Date.now()}`,
        title: formRepoTitle,
        date: formRepoDate || new Date().toISOString().split("T")[0],
        category: formRepoCategory || "Contratos y Convenios",
        fileName: formRepoSourceType === "enlace_externo" ? (formRepoFileName || "Enlace Externo Nube") : formRepoFileName,
        fileSize: formRepoSourceType === "enlace_externo" ? "Enlace Nube" : (formRepoFileSize || "120 KB"),
        fileType: formRepoSourceType === "enlace_externo" ? "application/url" : (formRepoFileType || "application/pdf"),
        fileData: formRepoSourceType === "enlace_externo" ? undefined : formRepoFileData,
        externalUrl: formRepoSourceType === "enlace_externo" ? finalExternalUrl : undefined,
        sourceType: formRepoSourceType,
        hasValidity: formRepoHasValidity,
        validityDate: formRepoHasValidity ? formRepoValidityDate : null,
        leadId: formRepoLeadId || undefined,
        leadName: selectedLead ? selectedLead.name : "General / Corporativo",
        notes: formRepoNotes,
        uploadedBy: currentUser?.name || "Admin Global",
        createdAt: new Date().toISOString().split("T")[0]
      };
      setRepositoryDocs(prev => [newDoc, ...prev]);
    }

    setIsRepoModalOpen(false);
  };

  const handleDeleteRepoDoc = (doc: CRMRepositoryDocument) => {
    setDocToDelete(doc);
  };

  const handleConfirmDeleteRepoDoc = () => {
    if (!docToDelete) return;
    setRepositoryDocs(prev => prev.filter(d => d.id !== docToDelete.id));
    setComposeSelectedDocIds(prev => prev.filter(id => id !== docToDelete.id));
    setBulkEmailSelectedDocIds(prev => prev.filter(id => id !== docToDelete.id));
    setDocToDelete(null);
  };

  const handleDownloadDoc = (doc: CRMRepositoryDocument) => {
    if (doc.externalUrl) {
      window.open(doc.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (doc.fileData) {
      const link = document.createElement("a");
      link.href = doc.fileData;
      link.download = doc.fileName || `${doc.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Descargando documento: ${doc.fileName}`);
    }
  };

  const getDocValidityStatus = (doc: CRMRepositoryDocument) => {
    if (!doc.hasValidity || !doc.validityDate) {
      return { status: "Sin Vigencia", label: "Sin Vigencia", badge: "bg-slate-100 text-slate-700 border-slate-200" };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(doc.validityDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "Vencido", label: `Vencido (hace ${Math.abs(diffDays)}d)`, badge: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (diffDays <= 30) {
      return { status: "Próximo a Vencer", label: `Próximo a Vencer (${diffDays}d)`, badge: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { status: "Vigente", label: `Vigente (${doc.validityDate})`, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  // CRM Tasks Filter State
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"Todas" | "Pendiente" | "Completada">("Todas");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("Todos");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("Todas");
  const [taskLeadFilter, setTaskLeadFilter] = useState<string>("Todos");
  const [taskTeamFilter, setTaskTeamFilter] = useState<string>("Todos");
  const [taskUserFilter, setTaskUserFilter] = useState<string>("Todos");

  // CRM Task Modal & Form State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const [formTaskTitle, setFormTaskTitle] = useState("");
  const [formTaskLeadId, setFormTaskLeadId] = useState("");
  const [formTaskType, setFormTaskType] = useState<TaskType>("Llamada");
  const [formTaskPriority, setFormTaskPriority] = useState<"Alta" | "Media" | "Baja">("Media");
  const [formTaskDueDate, setFormTaskDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTaskAssignedTo, setFormTaskAssignedTo] = useState<number | undefined>(users[0]?.id);
  const [formTaskTeamId, setFormTaskTeamId] = useState<string>("");
  const [formTaskUserIds, setFormTaskUserIds] = useState<number[]>([]);
  const [formTaskNotes, setFormTaskNotes] = useState("");

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setFormTaskTitle("");
    setFormTaskLeadId("");
    setFormTaskType("Llamada");
    setFormTaskPriority("Media");
    setFormTaskDueDate(new Date().toISOString().split("T")[0]);
    setFormTaskAssignedTo(users[0]?.id);
    setFormTaskTeamId("");
    setFormTaskUserIds(users[0]?.id ? [users[0].id] : []);
    setFormTaskNotes("");
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: any) => {
    setEditingTask(task);
    setFormTaskTitle(task.title || "");
    setFormTaskLeadId(task.leadId ? String(task.leadId) : "");
    setFormTaskType(task.type || "Llamada");
    setFormTaskPriority(task.priority || "Media");
    setFormTaskDueDate(task.dueDate || new Date().toISOString().split("T")[0]);
    setFormTaskAssignedTo(task.userId || users[0]?.id);
    setFormTaskTeamId(task.teamId ? String(task.teamId) : "");
    const initialUserIds = task.userIds && task.userIds.length > 0
      ? task.userIds
      : (task.userId ? [task.userId] : (users[0]?.id ? [users[0].id] : []));
    setFormTaskUserIds(initialUserIds);
    setFormTaskNotes(task.notes || "");
    setIsTaskModalOpen(true);
  };

  const handleTeamSelectChangeInCRM = (selectedTeamIdStr: string) => {
    if (!selectedTeamIdStr) {
      setFormTaskTeamId("");
      return;
    }
    const tId = Number(selectedTeamIdStr);
    const teamMembers = users.filter(u => u.teamId === tId).map(u => u.id);
    setFormTaskTeamId(selectedTeamIdStr);
    if (teamMembers.length > 0) {
      setFormTaskUserIds(teamMembers);
      setFormTaskAssignedTo(teamMembers[0]);
    }
  };

  const handleToggleUserInTaskFormInCRM = (userId: number) => {
    setFormTaskUserIds(prev => {
      const exists = prev.includes(userId);
      const updated = exists ? prev.filter(id => id !== userId) : [...prev, userId];
      if (updated.length > 0 && (!formTaskAssignedTo || !updated.includes(formTaskAssignedTo))) {
        setFormTaskAssignedTo(updated[0]);
      }
      return updated;
    });
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTaskTitle.trim()) return;

    const resolvedPrimaryUserId = formTaskUserIds.length > 0 ? formTaskUserIds[0] : formTaskAssignedTo;
    const resolvedTeamId = formTaskTeamId ? Number(formTaskTeamId) : undefined;
    const resolvedUserIds = formTaskUserIds.length > 0 ? formTaskUserIds : (resolvedPrimaryUserId ? [resolvedPrimaryUserId] : []);

    if (editingTask) {
      updateTask(editingTask.id, {
        title: formTaskTitle.trim(),
        leadId: formTaskLeadId ? formTaskLeadId : undefined,
        type: formTaskType,
        priority: formTaskPriority,
        dueDate: formTaskDueDate,
        userId: resolvedPrimaryUserId,
        userIds: resolvedUserIds,
        teamId: resolvedTeamId,
        notes: formTaskNotes.trim()
      });
    } else {
      addTask({
        title: formTaskTitle.trim(),
        dueDate: formTaskDueDate,
        status: "Pendiente",
        type: formTaskType,
        priority: formTaskPriority,
        leadId: formTaskLeadId ? formTaskLeadId : undefined,
        userId: resolvedPrimaryUserId,
        userIds: resolvedUserIds,
        teamId: resolvedTeamId,
        notes: formTaskNotes.trim()
      });
    }

    setIsTaskModalOpen(false);
  };

  const handleToggleTaskStatus = (task: any) => {
    const isAssigned = (task.userId !== undefined && task.userId !== null && Number(task.userId) === Number(currentUser?.id)) ||
      (task.userIds && task.userIds.includes(Number(currentUser?.id)));

    if (!isSuperAdmin && !isAssigned) {
      alert("Solo los usuarios asignados a esta tarea o el super administrador pueden cambiar su estado de finalización.");
      return;
    }

    const nextStatus = task.status === "Completada" ? "Pendiente" : "Completada";
    updateTask(task.id, { status: nextStatus });
  };

  const [isScanningTasks, setIsScanningTasks] = useState(false);

  const handleManualDeadlineScan = async () => {
    setIsScanningTasks(true);
    try {
      const results = await triggerDeadlineScan();
      const notified = results.filter(r => r.notified).length;
      if (notified > 0) {
        alert(`🔔 Escaneo de Vencimientos: Se enviaron ${notified} alertas automáticas a los responsables.`);
      } else {
        alert(`✅ Escaneo de Vencimientos: Todas las tareas están al día. No hubo tareas pendientes dentro del umbral de ${taskNotificationConfig?.deadlineReminderDaysBefore || 2} días que requirieran recordatorio.`);
      }
    } catch (err: any) {
      alert("Error al escanear vencimientos: " + (err.message || String(err)));
    } finally {
      setIsScanningTasks(false);
    }
  };

  const handleDeleteTaskConfirm = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.leadId || !activityForm.title.trim()) return;

    const leadObj = leads.find(l => l.id === activityForm.leadId);
    const assignedUser = leadObj ? users.find(u => u.name === leadObj.assignedTo) : null;
    const targetUserId = activityForm.userId !== undefined ? activityForm.userId : (assignedUser?.id || currentUser?.id || users[0]?.id);
    
    addTask({
      title: `${activityForm.title} - ${leadObj ? leadObj.name : "CRM"}`,
      dueDate: activityForm.dueDate,
      status: "Pendiente",
      type: activityForm.type,
      priority: activityForm.priority || "Media",
      leadId: activityForm.leadId,
      userId: targetUserId,
      requestedBy: currentUser?.name || "Admin Principal",
      notes: activityForm.notes || undefined
    });

    setIsActivityModalOpen(false);
    setActivityForm({
      leadId: "",
      title: "",
      type: "Llamada",
      priority: "Media",
      dueDate: new Date().toISOString().split("T")[0],
      syncAgenda: true,
      userId: undefined,
      notes: ""
    });
    alert("¡Actividad programada y vinculada exitosamente con el prospecto!");
  };

  // Campaign Handlers
  const handleOpenNewCampaign = () => {
    setEditingCampaign(null);
    setFormCampName("");
    setFormCampChannel("Email");
    setFormCampStatus("Activa");
    setFormCampBudget(1000);
    setFormCampStartDate(new Date().toISOString().split("T")[0]);
    setFormCampEndDate(new Date(Date.now() + 30*86400000).toISOString().split("T")[0]);
    setFormCampAudience("");
    setFormCampTargetLeads(20);
    setIsCampaignModalOpen(true);
  };

  const handleOpenEditCampaign = (camp: CRMCampaign) => {
    setEditingCampaign(camp);
    setFormCampName(camp.name);
    setFormCampChannel(camp.channel);
    setFormCampStatus(camp.status);
    setFormCampBudget(camp.budget);
    setFormCampStartDate(camp.startDate);
    setFormCampEndDate(camp.endDate);
    setFormCampAudience(camp.targetAudience);
    setFormCampTargetLeads(camp.targetLeads);
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCampName.trim()) return;

    if (editingCampaign) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? {
        ...c,
        name: formCampName,
        channel: formCampChannel,
        status: formCampStatus,
        budget: Number(formCampBudget) || 0,
        startDate: formCampStartDate,
        endDate: formCampEndDate,
        targetAudience: formCampAudience,
        targetLeads: Number(formCampTargetLeads) || 0
      } : c));
    } else {
      const newCamp: CRMCampaign = {
        id: `camp_${generateUniqueId()}`,
        name: formCampName,
        channel: formCampChannel,
        status: formCampStatus,
        budget: Number(formCampBudget) || 0,
        startDate: formCampStartDate,
        endDate: formCampEndDate,
        targetAudience: formCampAudience,
        targetLeads: Number(formCampTargetLeads) || 0,
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        convertedLeads: 0,
        estimatedRevenue: 0
      };
      setCampaigns(prev => [newCamp, ...prev]);
    }
    setIsCampaignModalOpen(false);
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta campaña comercial?")) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleToggleCampaignStatus = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === "Activa" ? "Pausada" : "Activa";
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // Email Handlers & Template Management
  const handleStartNewBlankEmail = (preselectedLeadId?: string) => {
    setComposeTemplateId("");
    setComposeSubject("");
    setComposeBody("");
    setComposeCc("");
    setComposeBcc("");
    setShowCc(false);
    setShowBcc(false);
    setComposeSelectedDocIds([]);
    if (preselectedLeadId) {
      setComposeRecipientType("lead");
      setComposeLeadId(preselectedLeadId);
    } else {
      setComposeRecipientType("lead");
      setComposeLeadId("");
      setComposeManualName("");
      setComposeManualEmail("");
    }
    setActiveTab("Correos");
    setEmailActiveSubTab("Redactar");
  };

  // Superadmin Email Deletion handlers
  const isUserSuperAdmin = 
    !currentUser?.role || 
    currentUser?.role === 'Superadministrador' || 
    currentUser?.role === 'Admin Principal' || 
    currentUser?.role?.toLowerCase()?.includes('super');

  const handleDeleteSingleEmailLog = (logId: string) => {
    setEmailLogs(prev => prev.filter(l => l.id !== logId));
    setSelectedEmailLogIds(prev => prev.filter(id => id !== logId));
    if (viewingEmailLog?.id === logId) {
      setViewingEmailLog(null);
    }
    setEmailLogToDelete(null);
    setEmailSuccessMsg("Correo enviado eliminado permanentemente del historial.");
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleBatchDeleteEmailLogs = () => {
    if (selectedEmailLogIds.length === 0) return;
    const count = selectedEmailLogIds.length;
    setEmailLogs(prev => prev.filter(l => !selectedEmailLogIds.includes(l.id)));
    if (viewingEmailLog && selectedEmailLogIds.includes(viewingEmailLog.id)) {
      setViewingEmailLog(null);
    }
    setSelectedEmailLogIds([]);
    setIsBatchDeleteModalOpen(false);
    setEmailSuccessMsg(`Se eliminaron ${count} correos enviados del historial.`);
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleClearAllEmailLogs = () => {
    setEmailLogs([]);
    setSelectedEmailLogIds([]);
    setViewingEmailLog(null);
    setIsClearAllModalOpen(false);
    setEmailSuccessMsg("Se vació completamente el historial de correos enviados.");
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleToggleSelectAllEmailLogs = () => {
    if (selectedEmailLogIds.length === emailLogs.length) {
      setSelectedEmailLogIds([]);
    } else {
      setSelectedEmailLogIds(emailLogs.map(l => l.id));
    }
  };

  const handleToggleSelectEmailLog = (logId: string) => {
    setSelectedEmailLogIds(prev => 
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setFormTplTitle("");
    setFormTplCategory("Primer Contacto");
    setFormTplCustomCategory("");
    setFormTplSubject("");
    setFormTplBody("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: CRMEmailTemplate) => {
    setEditingTemplate(tpl);
    setFormTplTitle(tpl.title);
    const standardCategories = ["Primer Contacto", "Propuesta", "Seguimiento", "Agendamiento", "Cierre", "Acreditación", "Convenio", "Inactividad"];
    if (standardCategories.includes(tpl.category)) {
      setFormTplCategory(tpl.category);
      setFormTplCustomCategory("");
    } else {
      setFormTplCategory("Otro");
      setFormTplCustomCategory(tpl.category);
    }
    setFormTplSubject(tpl.subject);
    setFormTplBody(tpl.body);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTplTitle.trim() || !formTplSubject.trim()) return;

    const finalCategory = formTplCategory === "Otro" && formTplCustomCategory.trim()
      ? formTplCustomCategory.trim()
      : formTplCategory;

    if (editingTemplate) {
      setEmailTemplates(prev => prev.map(t => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: formTplTitle.trim(),
            category: finalCategory,
            subject: formTplSubject,
            body: formTplBody,
            updatedAt: new Date().toISOString().split("T")[0]
          };
        }
        return t;
      }));
      setEmailSuccessMsg(`Plantilla "${formTplTitle.trim()}" actualizada exitosamente`);
    } else {
      const newTpl: CRMEmailTemplate = {
        id: `tpl_${generateUniqueId()}`,
        title: formTplTitle.trim(),
        category: finalCategory,
        subject: formTplSubject,
        body: formTplBody,
        createdAt: new Date().toISOString().split("T")[0]
      };
      setEmailTemplates(prev => [newTpl, ...prev]);
      setEmailSuccessMsg(`Nueva plantilla "${formTplTitle.trim()}" creada exitosamente`);
    }

    setTimeout(() => setEmailSuccessMsg(null), 3500);
    setIsTemplateModalOpen(false);
  };

  const handleDuplicateTemplate = (tpl: CRMEmailTemplate) => {
    const duplicated: CRMEmailTemplate = {
      id: `tpl_${generateUniqueId()}`,
      title: `Copia de ${tpl.title}`,
      category: tpl.category,
      subject: tpl.subject,
      body: tpl.body,
      createdAt: new Date().toISOString().split("T")[0]
    };
    setEmailTemplates(prev => [duplicated, ...prev]);
    setEmailSuccessMsg(`Plantilla duplicada: "${duplicated.title}"`);
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleDeleteTemplate = (tpl: CRMEmailTemplate) => {
    setEmailTemplates(prev => prev.filter(t => t.id !== tpl.id));
    if (composeTemplateId === tpl.id) {
      setComposeTemplateId("");
    }
    setTemplateToDelete(null);
    setEmailSuccessMsg(`Plantilla "${tpl.title}" eliminada`);
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleInsertVariableInTemplate = (varTag: string, field: "subject" | "body") => {
    if (field === "subject") {
      setFormTplSubject(prev => prev ? `${prev} ${varTag}` : varTag);
    } else {
      setFormTplBody(prev => prev ? `${prev} ${varTag}` : varTag);
    }
  };

  const handleInsertVariableInComposer = (varTag: string, field: "subject" | "body") => {
    if (field === "subject") {
      setComposeSubject(prev => prev ? `${prev} ${varTag}` : varTag);
    } else {
      setComposeBody(prev => prev ? `${prev} ${varTag}` : varTag);
    }
  };

  const handleSaveComposerAsTemplate = () => {
    setEditingTemplate(null);
    setFormTplTitle(composeSubject ? `Plantilla: ${composeSubject.substring(0, 35)}` : "Nueva Plantilla Personalizada");
    setFormTplCategory("Personalizado");
    setFormTplCustomCategory("");
    setFormTplSubject(composeSubject);
    setFormTplBody(composeBody);
    setIsTemplateModalOpen(true);
  };

  const handleSelectTemplateForCompose = (tpl: CRMEmailTemplate) => {
    setComposeTemplateId(tpl.id);
    let subj = tpl.subject;
    let bdy = tpl.body;

    const selectedLead = composeRecipientType === "lead" ? leads.find(l => l.id === composeLeadId) : null;
    const currentUserName = currentUser?.name || "Equipo Académico";

    if (selectedLead) {
      subj = subj.replace(/\{\{nombre_colegio\}\}/g, selectedLead.name)
                 .replace(/\{\{contacto_principal\}\}/g, selectedLead.contactName || "Directivo")
                 .replace(/\{\{monto_estimado\}\}/g, selectedLead.value.toLocaleString("en-US"))
                 .replace(/\{\{correo_electronico\}\}/g, selectedLead.email || "")
                 .replace(/\{\{telefono\}\}/g, selectedLead.phone || "")
                 .replace(/\{\{ciudad\}\}/g, selectedLead.country || "")
                 .replace(/\{\{remitente\}\}/g, currentUserName);

      bdy = bdy.replace(/\{\{nombre_colegio\}\}/g, selectedLead.name)
               .replace(/\{\{contacto_principal\}\}/g, selectedLead.contactName || "Directivo")
               .replace(/\{\{monto_estimado\}\}/g, selectedLead.value.toLocaleString("en-US"))
               .replace(/\{\{correo_electronico\}\}/g, selectedLead.email || "")
               .replace(/\{\{telefono\}\}/g, selectedLead.phone || "")
               .replace(/\{\{ciudad\}\}/g, selectedLead.country || "")
               .replace(/\{\{remitente\}\}/g, currentUserName);
    } else {
      subj = subj.replace(/\{\{remitente\}\}/g, currentUserName);
      bdy = bdy.replace(/\{\{remitente\}\}/g, currentUserName);
    }

    setComposeSubject(subj);
    setComposeBody(bdy);
    setEmailActiveSubTab("Redactar");
  };

  const handleSelectLeadForCompose = (leadId: string) => {
    setComposeLeadId(leadId);
    const selectedLead = leads.find(l => l.id === leadId);
    if (selectedLead) {
      const tpl = emailTemplates.find(t => t.id === composeTemplateId);
      const currentUserName = currentUser?.name || "Equipo Académico";
      if (tpl) {
        let subj = tpl.subject.replace(/\{\{nombre_colegio\}\}/g, selectedLead.name)
                              .replace(/\{\{contacto_principal\}\}/g, selectedLead.contactName || "Directivo")
                              .replace(/\{\{monto_estimado\}\}/g, selectedLead.value.toLocaleString("en-US"))
                              .replace(/\{\{correo_electronico\}\}/g, selectedLead.email || "")
                              .replace(/\{\{telefono\}\}/g, selectedLead.phone || "")
                              .replace(/\{\{ciudad\}\}/g, selectedLead.country || "")
                              .replace(/\{\{remitente\}\}/g, currentUserName);

        let bdy = tpl.body.replace(/\{\{nombre_colegio\}\}/g, selectedLead.name)
                          .replace(/\{\{contacto_principal\}\}/g, selectedLead.contactName || "Directivo")
                          .replace(/\{\{monto_estimado\}\}/g, selectedLead.value.toLocaleString("en-US"))
                          .replace(/\{\{correo_electronico\}\}/g, selectedLead.email || "")
                          .replace(/\{\{telefono\}\}/g, selectedLead.phone || "")
                          .replace(/\{\{ciudad\}\}/g, selectedLead.country || "")
                          .replace(/\{\{remitente\}\}/g, currentUserName);

        setComposeSubject(subj);
        setComposeBody(bdy);
      }
    }
  };

  const handleTriggerSlaEmailForLead = (lead: CRMLead) => {
    const rule = getLeadSlaRule(lead.status);
    setActiveTab("Correos");
    setEmailActiveSubTab("Redactar");
    setComposeRecipientType("lead");
    setComposeLeadId(lead.id);

    const targetTplId = rule?.emailTemplateId || (rule?.hasSecondaryAction && rule?.secondaryAction === "Enviar correo" ? rule.secondaryEmailTemplateId : undefined);
    const matchedTpl = emailTemplates.find(t => t.id === targetTplId) || emailTemplates[0];

    if (matchedTpl) {
      setComposeTemplateId(matchedTpl.id);
      const currentUserName = currentUser?.name || "Equipo Académico";
      const subj = matchedTpl.subject.replace(/\{\{nombre_colegio\}\}/g, lead.name)
                                    .replace(/\{\{contacto_principal\}\}/g, lead.contactName || "Directivo")
                                    .replace(/\{\{monto_estimado\}\}/g, lead.value.toLocaleString("en-US"))
                                    .replace(/\{\{correo_electronico\}\}/g, lead.email || "")
                                    .replace(/\{\{telefono\}\}/g, lead.phone || "")
                                    .replace(/\{\{ciudad\}\}/g, lead.country || "")
                                    .replace(/\{\{remitente\}\}/g, currentUserName);

      const bdy = matchedTpl.body.replace(/\{\{nombre_colegio\}\}/g, lead.name)
                                .replace(/\{\{contacto_principal\}\}/g, lead.contactName || "Directivo")
                                .replace(/\{\{monto_estimado\}\}/g, lead.value.toLocaleString("en-US"))
                                .replace(/\{\{correo_electronico\}\}/g, lead.email || "")
                                .replace(/\{\{telefono\}\}/g, lead.phone || "")
                                .replace(/\{\{ciudad\}\}/g, lead.country || "")
                                .replace(/\{\{remitente\}\}/g, currentUserName);

      setComposeSubject(subj);
      setComposeBody(bdy);
    }
  };

  const handleExecuteSlaActionForLead = (lead: CRMLead) => {
    const rule = getLeadSlaRule(lead.status);
    if (!rule) {
      dispatchRealtimeNotification({
        type: "warning",
        title: "SLA Vencido",
        message: `El registro en fase "${lead.status}" ha superado el tiempo límite.`
      });
      return;
    }

    const hasEmail = rule.actionOnAlert === "Enviar correo a contacto" || (rule.hasSecondaryAction && rule.secondaryAction === "Enviar correo");
    const hasMove = rule.actionOnAlert === "Mover a otra etapa" || (rule.hasSecondaryAction && rule.secondaryAction === "Mover a otra etapa");
    const destStage = (rule.actionOnAlert === "Mover a otra etapa" ? rule.targetStage : rule.secondaryTargetStage) || "";

    if (hasMove && destStage) {
      const updated = leads.map(l => l.id === lead.id ? { ...l, status: destStage as any } : l);
      setLeads(updated);
      safeLocalStorageSet("crm_leads_v1", updated);
      dispatchRealtimeNotification({
        type: "success",
        title: "Etapa Actualizada por SLA",
        message: `El prospecto "${lead.name}" se movió a la etapa "${destStage}".`
      });
      if (hasEmail) {
        handleTriggerSlaEmailForLead(lead);
      }
      return;
    }

    if (hasEmail) {
      handleTriggerSlaEmailForLead(lead);
      return;
    }

    dispatchRealtimeNotification({
      type: "warning",
      title: "Alerta SLA Vencido",
      message: `Fase "${lead.status}" (${rule.slaDays || 3}d). Acción: ${rule.actionOnAlert || 'Alerta en Dashboard'}${rule.hasSecondaryAction && rule.secondaryAction ? ` + ${rule.secondaryAction}` : ''}.`
    });
  };

  const handleOpenAttachPicker = (target: "compose" | "bulk") => {
    setAttachPickerTarget(target);
    setAttachSearchTerm("");
    setAttachCategoryFilter("Todas");
    setAttachLeadFilter("Todos");
    setIsAttachPickerModalOpen(true);
  };

  const handleToggleAttachDoc = (docId: string) => {
    if (attachPickerTarget === "bulk") {
      setBulkEmailSelectedDocIds(prev => 
        prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
      );
    } else {
      setComposeSelectedDocIds(prev => 
        prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
      );
    }
  };

  const handleSelectAllFilteredAttachDocs = (docs: CRMRepositoryDocument[]) => {
    const docIds = docs.map(d => d.id);
    if (attachPickerTarget === "bulk") {
      setBulkEmailSelectedDocIds(prev => Array.from(new Set([...prev, ...docIds])));
    } else {
      setComposeSelectedDocIds(prev => Array.from(new Set([...prev, ...docIds])));
    }
  };

  const handleClearAllAttachments = (target?: "compose" | "bulk") => {
    const effectiveTarget = target || attachPickerTarget;
    if (effectiveTarget === "bulk") {
      setBulkEmailSelectedDocIds([]);
      setBulkEmailExternalAttachments([]);
    } else {
      setComposeSelectedDocIds([]);
      setComposeExternalAttachments([]);
    }
  };

  const handleRemoveAttachment = (id: string, isExternal: boolean = false) => {
    if (isExternal) {
      setComposeExternalAttachments(prev => prev.filter(att => att.id !== id));
    } else {
      setComposeSelectedDocIds(prev => prev.filter(docId => docId !== id));
    }
  };

  const handleRemoveBulkAttachment = (id: string, isExternal: boolean = false) => {
    if (isExternal) {
      setBulkEmailExternalAttachments(prev => prev.filter(att => att.id !== id));
    } else {
      setBulkEmailSelectedDocIds(prev => prev.filter(docId => docId !== id));
    }
  };

  const handleUploadExternalFile = (e: React.ChangeEvent<HTMLInputElement>, target: "compose" | "bulk") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      let sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      if (file.size > 1024 * 1024) {
        sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileData = typeof reader.result === "string" ? reader.result : undefined;
        const newAttachment: CRMEmailAttachment = {
          id: `ext_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileName: file.name,
          fileSize: sizeStr,
          fileType: file.type || "application/octet-stream",
          fileData,
          category: "Archivo Externo",
          sourceType: "archivo_externo"
        };

        if (target === "bulk") {
          setBulkEmailExternalAttachments(prev => [...prev, newAttachment]);
        } else {
          setComposeExternalAttachments(prev => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleOpenExternalLinkModal = (target: "compose" | "bulk" | "repo") => {
    setExternalLinkTarget(target);
    setExternalLinkUrl("");
    setExternalLinkTitle("");
    const docCats = catalogs['Categorías de Documentos'] || [];
    setExternalLinkCategory(docCats.length > 0 ? docCats[0].name : "Propuestas Comerciales");
    setExternalLinkLeadId("");
    setExternalLinkNotes("");
    setExternalLinkSaveToRepo(true);
    setIsExternalLinkModalOpen(true);
  };

  const handleSaveExternalLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalLinkUrl.trim()) {
      alert("Por favor introduce el enlace (URL) del documento.");
      return;
    }

    let validUrl = externalLinkUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    const title = externalLinkTitle.trim() || "Documento Externo en la Nube";
    let cloudBrand = "Enlace Web";
    if (validUrl.includes("drive.google.com") || validUrl.includes("docs.google.com")) cloudBrand = "Google Drive";
    else if (validUrl.includes("sharepoint") || validUrl.includes("onedrive") || validUrl.includes("1drv.ms")) cloudBrand = "OneDrive";
    else if (validUrl.includes("dropbox.com")) cloudBrand = "Dropbox";
    else if (validUrl.includes("box.com")) cloudBrand = "Box";

    const newAtt: CRMEmailAttachment = {
      id: `ext_link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title,
      fileName: `${cloudBrand} - ${title}`,
      fileSize: "Enlace Nube",
      fileType: "application/url",
      externalUrl: validUrl,
      category: externalLinkCategory,
      sourceType: "enlace_externo"
    };

    if (externalLinkTarget === "bulk") {
      setBulkEmailExternalAttachments(prev => [...prev, newAtt]);
    } else if (externalLinkTarget === "compose") {
      setComposeExternalAttachments(prev => [...prev, newAtt]);
    }

    if (externalLinkSaveToRepo || externalLinkTarget === "repo") {
      const associatedLead = leads.find(l => l.id === externalLinkLeadId);
      const newRepoDoc: CRMRepositoryDocument = {
        id: `doc-rep-${Date.now()}`,
        title: title,
        date: new Date().toISOString().split("T")[0],
        category: externalLinkCategory,
        leadId: externalLinkLeadId || undefined,
        leadName: associatedLead ? associatedLead.name : (externalLinkLeadId ? undefined : "General / Corporativo"),
        fileName: `${cloudBrand} - ${title}`,
        fileSize: "Enlace Nube",
        fileType: "application/url",
        externalUrl: validUrl,
        sourceType: "enlace_externo",
        hasValidity: false,
        uploadedBy: currentUser?.name || "Asesor CRM",
        notes: externalLinkNotes || `Documento externo alojado en ${cloudBrand}`,
        createdAt: new Date().toISOString().split("T")[0]
      };
      setRepositoryDocs(prev => [newRepoDoc, ...prev]);
    }

    setIsExternalLinkModalOpen(false);
  };

  const handleSelectTemplateForBulk = (tpl: CRMEmailTemplate) => {
    setBulkEmailTemplateId(tpl.id);
    setBulkEmailSubject(tpl.subject);
    setBulkEmailBody(tpl.body);
  };

  const handleInsertVariableInBulk = (varTag: string, field: "subject" | "body") => {
    if (field === "subject") {
      setBulkEmailSubject(prev => prev ? `${prev} ${varTag}` : varTag);
    } else {
      setBulkEmailBody(prev => prev ? `${prev} ${varTag}` : varTag);
    }
  };

  const handleToggleSelectBulkLead = (leadId: string) => {
    setBulkEmailSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleToggleSelectAllBulkLeads = (matchingLeads: CRMLead[]) => {
    const matchingIds = matchingLeads.map(l => l.id);
    const allSelected = matchingIds.length > 0 && matchingIds.every(id => bulkEmailSelectedLeadIds.includes(id));
    if (allSelected) {
      setBulkEmailSelectedLeadIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      setBulkEmailSelectedLeadIds(prev => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  const handleSelectOnlyWithEmailBulkLeads = (matchingLeads: CRMLead[]) => {
    const validIds = matchingLeads.filter(l => l.email && l.email.includes("@")).map(l => l.id);
    setBulkEmailSelectedLeadIds(validIds);
  };

  const handleStartBulkFromTableSelection = (leadIds: string[]) => {
    setActiveTab("Correos");
    setEmailActiveSubTab("Masivo");
    setBulkEmailSelectedLeadIds(leadIds);
    if (leadIds.length > 0) {
      setBulkEmailPreviewLeadId(leadIds[0]);
    }
  };

  const handleExecuteBulkEmailSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bulkEmailSelectedLeadIds.length === 0) {
      alert("Por favor selecciona al menos un colegio o institución para el envío masivo.");
      return;
    }

    if (!bulkEmailSubject.trim()) {
      alert("Por favor escribe un asunto para el correo masivo.");
      return;
    }

    if (!bulkEmailBody.trim()) {
      alert("Por favor escribe el cuerpo del mensaje para el envío masivo.");
      return;
    }

    const targetLeads = leads.filter(l => bulkEmailSelectedLeadIds.includes(l.id));
    const leadsWithEmail = targetLeads.filter(l => l.email && l.email.includes("@"));

    if (leadsWithEmail.length === 0) {
      alert("Ninguno de los colegios seleccionados tiene una dirección de correo electrónico válida.");
      return;
    }

    // Combine attachments from repository docs and external attachments
    const repoAttachments: CRMEmailAttachment[] = bulkEmailSelectedDocIds.map(docId => {
      const doc = repositoryDocs.find(d => d.id === docId);
      if (!doc) return null;
      return {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        fileData: doc.fileData,
        externalUrl: doc.externalUrl,
        category: doc.category,
        sourceType: doc.sourceType || (doc.externalUrl ? "enlace_externo" : "repositorio")
      };
    }).filter((a): a is CRMEmailAttachment => a !== null);

    const attachments: CRMEmailAttachment[] = [...repoAttachments, ...bulkEmailExternalAttachments];

    // Retrieve saved SMTP configuration if available
    let smtpConfig: any = {};
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) smtpConfig = JSON.parse(saved);
    } catch (err) {
      console.error("Error reading smtp credentials", err);
    }

    setBulkEmailSending(true);

    const newLogs: CRMEmailLog[] = [];
    const sentSchoolNames: string[] = [];
    const currentUserName = currentUser?.name || "Admin Global";
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const todayDate = new Date().toISOString().split("T")[0];

    for (let i = 0; i < leadsWithEmail.length; i++) {
      const lead = leadsWithEmail[i];
      setBulkEmailProgress({
        current: i + 1,
        total: leadsWithEmail.length,
        currentSchoolName: lead.name
      });

      // Personalize subject and body for this specific school
      const personalizedSubject = bulkEmailSubject
        .replace(/\{\{nombre_colegio\}\}/g, lead.name)
        .replace(/\{\{contacto_principal\}\}/g, lead.contactName || "Directivo")
        .replace(/\{\{monto_estimado\}\}/g, lead.value ? lead.value.toLocaleString("en-US") : "0")
        .replace(/\{\{correo_electronico\}\}/g, lead.email || "")
        .replace(/\{\{telefono\}\}/g, lead.phone || "")
        .replace(/\{\{ciudad\}\}/g, lead.country || "")
        .replace(/\{\{remitente\}\}/g, currentUserName);

      const personalizedBody = bulkEmailBody
        .replace(/\{\{nombre_colegio\}\}/g, lead.name)
        .replace(/\{\{contacto_principal\}\}/g, lead.contactName || "Directivo")
        .replace(/\{\{monto_estimado\}\}/g, lead.value ? lead.value.toLocaleString("en-US") : "0")
        .replace(/\{\{correo_electronico\}\}/g, lead.email || "")
        .replace(/\{\{telefono\}\}/g, lead.phone || "")
        .replace(/\{\{ciudad\}\}/g, lead.country || "")
        .replace(/\{\{remitente\}\}/g, currentUserName);

      // Attempt API dispatch
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smtpHost: smtpConfig.host,
            smtpPort: smtpConfig.port,
            smtpUser: smtpConfig.user,
            smtpPass: smtpConfig.pass,
            smtpFromEmail: smtpConfig.fromEmail,
            smtpFromName: smtpConfig.fromName || "IHS CRM",
            to: lead.email,
            cc: bulkEmailCc.trim() || undefined,
            bcc: bulkEmailBcc.trim() || undefined,
            subject: personalizedSubject,
            body: personalizedBody,
            attachments: attachments,
            senderSignature: currentUserSignature
          })
        });
      } catch (apiErr) {
        console.warn("Bulk email dispatch warning:", apiErr);
      }

      const logItem: CRMEmailLog = {
        id: `elog_${generateUniqueId()}_${i}`,
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email || "",
        cc: bulkEmailCc.trim() || undefined,
        bcc: bulkEmailBcc.trim() || undefined,
        subject: personalizedSubject,
        body: personalizedBody,
        sentAt: nowStr,
        sentBy: currentUserName,
        status: "Entregado",
        attachments: attachments
      };

      newLogs.push(logItem);
      sentSchoolNames.push(lead.name);

      // Add Task/Activity to CRM
      if (bulkEmailCreateTask) {
        const assignedUser = users.find(u => u.name === lead.assignedTo);
        const targetUserId = assignedUser?.id || currentUser?.id || users[0]?.id;

        const attachCount = attachments.length;
        const attachText = attachCount > 0 ? ` (${attachCount} adjunto${attachCount > 1 ? "s" : ""})` : "";

        addTask({
          title: `Difusión Masiva: ${personalizedSubject}${attachText}`,
          dueDate: todayDate,
          status: "Completada",
          type: "Correo",
          priority: "Media",
          leadId: lead.id,
          userId: targetUserId,
          requestedBy: currentUserName,
          notes: `Campaña de Difusión Masiva enviada a ${lead.name}.\nCuerpo:\n${personalizedBody.substring(0, 300)}...`
        });
      }

      // Small delay for smooth visual progress
      await new Promise(r => setTimeout(r, 100));
    }

    setEmailLogs(prev => [...newLogs, ...prev]);
    setBulkEmailSending(false);
    setBulkEmailProgress(null);

    setBulkEmailSummaryModal({
      totalSent: leadsWithEmail.length,
      schoolNames: sentSchoolNames,
      subject: bulkEmailSubject,
      attachCount: attachments.length
    });

    setBulkEmailSelectedDocIds([]);
    setBulkEmailExternalAttachments([]);
  };

  const handleQuickSendDocByEmail = (doc: CRMRepositoryDocument) => {
    setComposeSelectedDocIds([doc.id]);
    if (doc.leadId) {
      setComposeRecipientType("lead");
      setComposeLeadId(doc.leadId);
    }
    setComposeSubject(`Documentación: ${doc.title}`);
    setComposeBody(`Estimado/a,\n\nAdjunto comparto con ustedes el documento "${doc.title}" (${doc.fileName}, ${doc.fileSize}) para su revisión y seguimiento.\n\nQuedo a su entera disposición para cualquier aclaración.\n\nSaludos cordiales,\n${currentUser?.name || "Atención CRM"}`);
    setActiveTab("Correos");
    setEmailActiveSubTab("Redactar");
    setEmailSuccessMsg(`Documento "${doc.title}" adjuntado al redactor de correos`);
    setTimeout(() => setEmailSuccessMsg(null), 3500);
  };

  const handleDownloadAttachmentFile = (att: CRMEmailAttachment) => {
    if (att.externalUrl) {
      window.open(att.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (att.fileData) {
      const link = document.createElement("a");
      link.href = att.fileData;
      link.download = att.fileName || `${att.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([`Documento:\nTítulo: ${att.title}\nArchivo: ${att.fileName}\nCategoría: ${att.category || "General"}\nTamaño: ${att.fileSize}\n\nDocumento emitido y gestionado mediante el CRM.`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = att.fileName || `${att.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetEmail = "";
    let targetName = "";
    let targetLeadId = "";
    const selectedLead = composeRecipientType === "lead" ? leads.find(l => l.id === composeLeadId) : null;

    if (composeRecipientType === "lead") {
      if (!selectedLead) {
        alert("Por favor selecciona un prospecto de la lista.");
        return;
      }
      targetEmail = selectedLead.email || "contacto@ejemplo.com";
      targetName = selectedLead.name;
      targetLeadId = selectedLead.id;
    } else {
      if (!composeManualEmail.trim()) {
        alert("Por favor introduce un correo electrónico de destino válido.");
        return;
      }
      targetEmail = composeManualEmail.trim();
      targetName = composeManualName.trim() || targetEmail;
      targetLeadId = "manual";
    }

    if (!composeSubject.trim()) {
      alert("Por favor escribe un asunto para el correo.");
      return;
    }
    
    // Combine attachments from repository docs and external attachments
    const repoAttachments: CRMEmailAttachment[] = composeSelectedDocIds.map(docId => {
      const doc = repositoryDocs.find(d => d.id === docId);
      if (!doc) return null;
      return {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        fileData: doc.fileData,
        externalUrl: doc.externalUrl,
        category: doc.category,
        sourceType: doc.sourceType || (doc.externalUrl ? "enlace_externo" : "repositorio")
      };
    }).filter((a): a is CRMEmailAttachment => a !== null);

    const attachments: CRMEmailAttachment[] = [...repoAttachments, ...composeExternalAttachments];

    let finalBody = composeBody;
    const externalLinks = attachments.filter(a => a.externalUrl);
    if (externalLinks.length > 0) {
      finalBody += "\n\n---\nDocumentos y Recursos Externos Adjuntos:\n" + 
        externalLinks.map(l => `• ${l.title}: ${l.externalUrl}`).join("\n");
    }

    // Retrieve saved SMTP configuration if available
    let smtpConfig: any = {};
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) smtpConfig = JSON.parse(saved);
    } catch (err) {
      console.error("Error reading smtp credentials", err);
    }

    // Try sending real email via server API
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          smtpUser: smtpConfig.user,
          smtpPass: smtpConfig.pass,
          smtpFromEmail: smtpConfig.fromEmail,
          smtpFromName: smtpConfig.fromName || "IHS CRM",
          to: targetEmail,
          cc: composeCc.trim() || undefined,
          bcc: composeBcc.trim() || undefined,
          subject: composeSubject,
          body: finalBody,
          attachments: attachments,
          senderSignature: composeAttachSignature ? currentUserSignature : undefined
        })
      });
    } catch (apiErr) {
      console.warn("Real email API dispatch notice: ", apiErr);
    }

    const newLog: CRMEmailLog = {
      id: `elog_${generateUniqueId()}`,
      leadId: targetLeadId,
      leadName: targetName,
      leadEmail: targetEmail,
      cc: composeCc.trim() || undefined,
      bcc: composeBcc.trim() || undefined,
      subject: composeSubject,
      body: finalBody,
      sentAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      sentBy: currentUser?.name || "Admin Global",
      status: "Entregado",
      attachments: attachments
    };

    setEmailLogs(prev => [newLog, ...prev]);

    const attachCount = attachments.length;
    const attachText = attachCount > 0 ? ` (con ${attachCount} documento${attachCount > 1 ? "s" : ""} adjunto${attachCount > 1 ? "s" : ""})` : "";

    if (selectedLead) {
      const assignedUser = users.find(u => u.name === selectedLead.assignedTo);
      const targetUserId = assignedUser?.id || currentUser?.id || users[0]?.id;

      addTask({
        title: `Correo enviado: ${composeSubject}${attachText}`,
        dueDate: new Date().toISOString().split("T")[0],
        status: "Completada",
        type: "Correo",
        priority: "Media",
        leadId: selectedLead.id,
        userId: targetUserId,
        requestedBy: currentUser?.name || "Sistema",
        notes: composeBody ? `Cuerpo del correo:\n${composeBody.substring(0, 300)}...` : undefined
      });
    }

    setEmailSuccessMsg(`Correo enviado exitosamente a ${targetName} (${targetEmail})${attachCount > 0 ? ` con ${attachCount} archivo(s) adjunto(s)` : ""}`);
    setTimeout(() => setEmailSuccessMsg(null), 4500);

    setComposeSubject("");
    setComposeBody("");
    setComposeCc("");
    setComposeBcc("");
    setShowCc(false);
    setShowBcc(false);
    setComposeSelectedDocIds([]);
    setComposeExternalAttachments([]);
    setComposeManualName("");
    setComposeManualEmail("");
    setEmailActiveSubTab("Historial");
  };

  // Pipeline Stages state for Instituciones and Particulares
  const [institutionStages, setInstitutionStages] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_stages_instituciones_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes("Cliente")) {
            const firmaIdx = parsed.indexOf("Firma");
            if (firmaIdx !== -1) {
              parsed.splice(firmaIdx + 1, 0, "Cliente");
            } else {
              parsed.push("Cliente");
            }
          }
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing crm_stages_instituciones_v2", e);
      }
    }
    return DEFAULT_INSTITUTION_STAGES;
  });

  const [particularStages, setParticularStages] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_stages_particulares_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error parsing crm_stages_particulares_v2", e);
      }
    }
    return DEFAULT_PARTICULAR_STAGES;
  });

  const [redesSocialesStages, setRedesSocialesStages] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_stages_redes_sociales_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error parsing crm_stages_redes_sociales_v1", e);
      }
    }
    return DEFAULT_REDES_SOCIALES_STAGES;
  });

  // Current active pipeline tab for Kanban view & Config modal
  const [kanbanPipelineType, setKanbanPipelineType] = useState<CRMLeadType>('Institución Potencial');
  const [configPipelineType, setConfigPipelineType] = useState<CRMLeadType>('Institución Potencial');

  // Helpers to get stages for specific type or current active view
  const getStagesForType = (type: CRMLeadType) => {
    if (type === 'Persona Potencial') return particularStages;
    if (type === 'Redes Sociales') return redesSocialesStages;
    return institutionStages;
  };

  const activePipelineStages = kanbanPipelineType === 'Persona Potencial' 
    ? particularStages 
    : kanbanPipelineType === 'Redes Sociales'
      ? redesSocialesStages
      : institutionStages;
  const pipelineStages = activePipelineStages; // alias for backward compatibility

  const allPipelineStages = Array.from(new Set([...institutionStages, ...particularStages, ...redesSocialesStages]));

  const [newStageName, setNewStageName] = useState("");

  const handleAddStage = (targetType: CRMLeadType = configPipelineType) => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    const currentList = targetType === 'Persona Potencial' 
      ? particularStages 
      : targetType === 'Redes Sociales'
        ? redesSocialesStages
        : institutionStages;
    if (currentList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("Esta etapa ya existe en este pipeline.");
      return;
    }
    const updated = [...currentList];
    const insertIndex = updated.indexOf("Perdido");
    if (insertIndex !== -1) {
      updated.splice(insertIndex, 0, trimmed);
    } else {
      updated.push(trimmed);
    }

    if (targetType === 'Persona Potencial') {
      setParticularStages(updated);
      safeLocalStorageSet("crm_stages_particulares_v2", updated);
    } else if (targetType === 'Redes Sociales') {
      setRedesSocialesStages(updated);
      safeLocalStorageSet("crm_stages_redes_sociales_v1", updated);
    } else {
      setInstitutionStages(updated);
      safeLocalStorageSet("crm_stages_instituciones_v2", updated);
    }
    setNewStageName("");
  };

  const handleRemoveStage = (stage: string, targetType: CRMLeadType = configPipelineType) => {
    const defaultList = targetType === 'Persona Potencial' 
      ? DEFAULT_PARTICULAR_STAGES 
      : targetType === 'Redes Sociales'
        ? DEFAULT_REDES_SOCIALES_STAGES
        : DEFAULT_INSTITUTION_STAGES;
    if (defaultList.includes(stage)) {
      alert("No se puede eliminar una etapa esencial predeterminada del sistema.");
      return;
    }
    const fallbackStage = targetType === 'Redes Sociales' ? "Mensaje 1" : "Leads";
    if (window.confirm(`¿Estás seguro de que deseas eliminar la etapa personalizada "${stage}"? Todos los prospectos de este estado volverán automáticamente a la etapa "${fallbackStage}".`)) {
      const currentList = targetType === 'Persona Potencial' 
        ? particularStages 
        : targetType === 'Redes Sociales'
          ? redesSocialesStages
          : institutionStages;
      const updated = currentList.filter(s => s !== stage);
      if (targetType === 'Persona Potencial') {
        setParticularStages(updated);
        safeLocalStorageSet("crm_stages_particulares_v2", updated);
      } else if (targetType === 'Redes Sociales') {
        setRedesSocialesStages(updated);
        safeLocalStorageSet("crm_stages_redes_sociales_v1", updated);
      } else {
        setInstitutionStages(updated);
        safeLocalStorageSet("crm_stages_instituciones_v2", updated);
      }
      
      // Move any leads of this state back to initial stage
      setLeads(prev => prev.map(l => (l.status === stage && l.type === targetType) ? { ...l, status: fallbackStage } : l));
    }
  };
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sourceFilter, setSourceFilter] = useState("Todos");

  // Lead modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [viewingLead, setViewingLead] = useState<CRMLead | null>(null);

  // Consultor IA Gemini state for viewing lead modal
  const [leadDetailTab, setLeadDetailTab] = useState<"ficha" | "consultor">("ficha");
  const [aiActionLoading, setAiActionLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ action: string; content: string; timestamp: string } | null>(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [copiedAi, setCopiedAi] = useState(false);

  // Reset Consultor IA state when viewingLead changes
  useEffect(() => {
    if (viewingLead) {
      setLeadDetailTab("ficha");
      setAiResult(null);
      setAiCustomPrompt("");
      setCopiedAi(false);
    }
  }, [viewingLead?.id]);

  const handleRunAiConsultant = async (actionName: string, customText?: string) => {
    if (!viewingLead) return;
    setAiActionLoading(true);
    setCopiedAi(false);
    
    try {
      const leadActivities = tasks.filter(t => t.leadId === Number(viewingLead.id) || t.leadId === (viewingLead.id as any));
      const response = await fetch('/api/crm/ai-consultant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: actionName,
          customPrompt: customText,
          lead: viewingLead,
          activities: leadActivities
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al comunicarse con Gemini Consultor IA");
      }

      setAiResult({
        action: data.action || actionName,
        content: data.result || "No se obtuvo respuesta de Gemini.",
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      });
    } catch (err: any) {
      console.error("AI Consultant error:", err);
      setAiResult({
        action: actionName,
        content: `⚠️ Error al generar respuesta: ${err.message || String(err)}. Por favor reintenta en unos instantes.`,
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      });
    } finally {
      setAiActionLoading(false);
    }
  };
  
  // Lead Form state
  const [leadForm, setLeadForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "México",
    source: "Recomendación",
    status: "Leads",
    type: "Institución Potencial" as CRMLead["type"],
    value: 3000,
    notes: "",
    assignedTo: "Admin Global",
    contacts: [] as CRMContactPerson[],
    englishExamScore: "",
    englishExamDate: "",
    programOfInterest: "",
    gradeToTake: "",
    creditsToTake: ""
  });

  // Quick inline add Programas Homeschool from within Lead Form
  const [isAddingProgramInline, setIsAddingProgramInline] = useState(false);
  const [inlineProgramName, setInlineProgramName] = useState("");
  const [inlineProgramDesc, setInlineProgramDesc] = useState("");

  const handleQuickAddProgram = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineProgramName.trim()) return;
    const name = inlineProgramName.trim();
    const desc = inlineProgramDesc.trim() || undefined;
    addCatalogItem("Programas Homeschool", {
      name,
      description: desc
    });
    setLeadForm(prev => ({ ...prev, programOfInterest: name }));
    setInlineProgramName("");
    setInlineProgramDesc("");
    setIsAddingProgramInline(false);
  };

  // Action/Activity modal state
    // Payment Confirmation Modal & Automation State
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] = useState(false);
  const [paymentLeadTarget, setPaymentLeadTarget] = useState<CRMLead | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">(1100);
  const [paymentMethod, setPaymentMethod] = useState<string>("Transferencia Bancaria");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // AUTOMATION 1: Trigger Task & Email for Finanzas & Cobranza when individual prospect moves to "Pago"
  const triggerFinanzasMallaTaskAndEmail = async (lead: CRMLead) => {
    const finanzasTeam = teams.find(t => t.id === 3 || t.name.toLowerCase().includes("finanzas") || t.name.toLowerCase().includes("cobranza"));
    const finanzasUsers = users.filter(u => u.teamId === (finanzasTeam?.id || 3) || u.role === "Finanzas");
    const primaryFinanzasUserId = finanzasUsers[0]?.id || 2;
    const finanzasUserIds = finanzasUsers.length > 0 ? finanzasUsers.map(u => u.id) : [primaryFinanzasUserId];

    // 1. Create Task for Finanzas
    addTask({
      title: `💰 Cobrar pago de Malla Curricular - ${lead.name}`,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      status: "Pendiente",
      type: "Llamada",
      priority: "Alta",
      leadId: lead.id,
      teamId: finanzasTeam?.id || 3,
      userId: primaryFinanzasUserId,
      userIds: finanzasUserIds,
      requestedBy: currentUser?.name || "Sistema Automatizado CRM",
      notes: `El prospecto individual "${lead.name}" completó la etapa de Examen de Inglés (${lead.englishExamScore || 'Aprobado'}) y avanzó a "Pago".\n\nAcción requerida: Gestionar el cobro de la Malla Curricular ($${lead.value ? lead.value.toLocaleString("en-US") : "0"} USD) y emitir ficha o enlace de pago.\n\n• Contacto: ${lead.contactName || lead.name}\n• Email: ${lead.email || 'Sin correo'}\n• Teléfono: ${lead.phone || 'Sin teléfono'}\n• Programa: ${lead.programOfInterest || 'Homeschool'}`
    });

    // 2. Send Email to Finanzas team
    const targetEmails = finanzasUsers.map(u => u.email).filter(Boolean);
    const finanzasRecipient = targetEmails.length > 0 ? targetEmails.join(", ") : "finanzas@ihs.com";

    const emailSubject = `💰 [Finanzas & Cobranza] Solicitud de Cobro de Malla Curricular: ${lead.name}`;
    const emailBody = `Estimado Equipo de Finanzas & Cobranza,

El prospecto individual ha avanzado de la etapa "Examen Inglés" a "Pago" y requiere la gestión de cobro de su Malla Curricular:

• Prospecto: ${lead.name}
• Contacto Directo: ${lead.contactName || lead.name}
• Correo Electrónico: ${lead.email || "No registrado"}
• Teléfono / WhatsApp: ${lead.phone || "No registrado"}
• Programa de Interés: ${lead.programOfInterest || "Bachillerato Dual / Homeschool"}
• Calificación Examen de Inglés: ${lead.englishExamScore || "Aprobado"}
• Monto Estimado a Cobrar: $${lead.value ? lead.value.toLocaleString("en-US") : "0"} USD
• Agente Comercial: ${lead.assignedTo || "Admin Global"}
• Fecha de Notificación: ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}

Acciones requeridas:
1. Generar la ficha de depósito o enlace de pago correspondiente a la Malla Curricular.
2. Contactar al prospecto o confirmar la recepción de su comprobante de pago.
3. Una vez verificado el pago, confirmarlo en el CRM para avanzar automáticamente a la etapa "Malla Curricular".

Atentamente,
Sistema Automatizado CRM
International Homeschool`;

    let smtpConfig: any = {};
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) smtpConfig = JSON.parse(saved);
    } catch (err) {
      console.error("Error reading smtp credentials", err);
    }

    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          smtpUser: smtpConfig.user,
          smtpPass: smtpConfig.pass,
          smtpFromEmail: smtpConfig.fromEmail,
          smtpFromName: smtpConfig.fromName || "IHS CRM Automatización",
          to: finanzasRecipient,
          subject: emailSubject,
          body: emailBody
        })
      });
    } catch (apiErr) {
      console.warn("Automation email dispatch warning:", apiErr);
    }

    const logItem: CRMEmailLog = {
      id: `elog_${generateUniqueId()}`,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: finanzasRecipient,
      subject: emailSubject,
      body: emailBody,
      sentAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      sentBy: "Sistema CRM (Automatización)",
      status: "Entregado"
    };
    setEmailLogs(prev => [logItem, ...prev]);

    // 3. Real-time in-app notification for Finanzas & Cobranza
    dispatchRealtimeNotification({
      title: `💰 Cobro Malla Curricular: ${lead.name}`,
      message: `El prospecto individual "${lead.name}" avanzó a "Pago". Se creó tarea con vencimiento a 48 horas ($${lead.value ? lead.value.toLocaleString("en-US") : "0"} USD).`,
      type: 'finance',
      team: 'Finanzas & Cobranza',
      leadId: lead.id,
      leadName: lead.name,
      actionUrl: '/crm'
    });

    setEmailSuccessMsg(`✅ Prospecto movido a "Pago". Se creó automáticamente la tarea y se envió el correo al Equipo de Finanzas & Cobranza para cobrar la Malla Curricular.`);
    setTimeout(() => setEmailSuccessMsg(null), 8000);
  };

  // AUTOMATION 2: Trigger Task & Email for Comercial / Ventas when payment is confirmed and lead moves to "Malla Curricular"
  const triggerComercialMallaPaidTaskAndEmail = async (
    lead: CRMLead, 
    paymentInfo?: { amount: number; method: string; ref: string; date: string; notes: string }
  ) => {
    const comercialTeam = teams.find(t => t.id === 1 || t.name.toLowerCase().includes("comercial") || t.name.toLowerCase().includes("ventas"));
    const comercialUsers = users.filter(u => u.teamId === (comercialTeam?.id || 1) || u.role === "Superadministrador" || u.role === "Director");
    const primaryComercialUserId = comercialUsers[0]?.id || 1;
    const comercialUserIds = comercialUsers.length > 0 ? comercialUsers.map(u => u.id) : [primaryComercialUserId];

    const payAmount = paymentInfo?.amount !== undefined ? paymentInfo.amount : (lead.value || 0);
    const payRef = paymentInfo?.ref || `TRF-${Math.floor(100000 + Math.random() * 900000)}`;
    const payMethod = paymentInfo?.method || "Transferencia Bancaria";
    const payDate = paymentInfo?.date || new Date().toISOString().split("T")[0];

    // 1. Create Task for Comercial / Ventas
    addTask({
      title: `🎉 Pago Confirmado: Entregar Malla Curricular - ${lead.name}`,
      dueDate: new Date().toISOString().split("T")[0],
      status: "Pendiente",
      type: "Correo",
      priority: "Alta",
      leadId: lead.id,
      teamId: comercialTeam?.id || 1,
      userId: primaryComercialUserId,
      userIds: comercialUserIds,
      requestedBy: currentUser?.name || "Equipo de Finanzas & Cobranza",
      notes: `¡Pago de Malla Curricular validado! El Equipo de Finanzas & Cobranza confirmó el pago de ${lead.name}.\n\n• Monto: $${payAmount.toLocaleString("en-US")} USD\n• Folio / Ref: ${payRef}\n• Método: ${payMethod}\n• Fecha: ${payDate}\n\nAcción Comercial Requerida: El prospecto ha avanzado automáticamente a la etapa "Malla curricular y boletines". Proceder de inmediato con el envío de la malla curricular personalizada y boletines correspondientes.`
    });

    // 2. Send Email to Comercial / Ventas team
    const targetEmails = comercialUsers.map(u => u.email).filter(Boolean);
    const comercialRecipient = targetEmails.length > 0 ? targetEmails.join(", ") : "admin@ihs.com";

    const emailSubject = `🎓 [Ventas & Comercial] Pago Confirmado de Malla Curricular: ${lead.name} (Avanzado a Malla Curricular)`;
    const emailBody = `Estimado Equipo Comercial / Ventas,

Les informamos que el Equipo de Finanzas & Cobranza ha validado y confirmado exitosamente el pago de la Malla Curricular para el siguiente prospecto:

• Prospecto: ${lead.name}
• Contacto: ${lead.contactName || lead.name}
• Correo Electrónico: ${lead.email || "No registrado"}
• Teléfono / WhatsApp: ${lead.phone || "No registrado"}
• Programa: ${lead.programOfInterest || "Bachillerato Dual / Homeschool"}
• Monto Pagado: $${payAmount.toLocaleString("en-US")} USD
• Folio / Referencia: ${payRef}
• Método de Pago: ${payMethod}
• Fecha de Pago: ${payDate}
• Observaciones: ${paymentInfo?.notes || "Pago validado y acreditado en tesorería."}
• Nueva Etapa del Pipeline: Malla curricular y boletines

El prospecto ha sido avanzado automáticamente en el CRM a la etapa "Malla curricular y boletines". Por favor procedan con la entrega de la malla curricular y continuar el acompañamiento hacia la firma.

Atentamente,
Departamento de Finanzas & Cobranza
International Homeschool CRM`;

    let smtpConfig: any = {};
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) smtpConfig = JSON.parse(saved);
    } catch (err) {
      console.error("Error reading smtp credentials", err);
    }

    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          smtpUser: smtpConfig.user,
          smtpPass: smtpConfig.pass,
          smtpFromEmail: smtpConfig.fromEmail,
          smtpFromName: smtpConfig.fromName || "IHS Finanzas & Cobranza",
          to: comercialRecipient,
          subject: emailSubject,
          body: emailBody
        })
      });
    } catch (apiErr) {
      console.warn("Automation email dispatch warning:", apiErr);
    }

    const logItem: CRMEmailLog = {
      id: `elog_${generateUniqueId()}`,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: comercialRecipient,
      subject: emailSubject,
      body: emailBody,
      sentAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      sentBy: "Finanzas & Cobranza (Automatización)",
      status: "Entregado"
    };
    setEmailLogs(prev => [logItem, ...prev]);

    // 3. Real-time in-app notification for Comercial / Ventas
    dispatchRealtimeNotification({
      title: `🎉 Pago Confirmado: ${lead.name}`,
      message: `Finanzas confirmó el pago de ${lead.name}. Avanzó a "Malla curricular y boletines". Tarea de entrega comercial asignada.`,
      type: 'sales',
      team: 'Comercial / Ventas',
      leadId: lead.id,
      leadName: lead.name,
      actionUrl: '/crm'
    });

    setEmailSuccessMsg(`🎉 ¡Pago de Malla Curricular confirmado! El prospecto avanzó a "Malla curricular y boletines" y se notificó al Equipo Comercial / Ventas en tarea y correo.`);
    setTimeout(() => setEmailSuccessMsg(null), 8000);
  };

  // AUTOMATION 3: General trigger for ANY lead (including institutions/schools) moving to "Pago"
  const triggerGeneralFinanzasPaymentTaskAndNotification = async (lead: CRMLead) => {
    const finanzasTeam = teams.find(t => t.id === 3 || t.name.toLowerCase().includes("finanzas") || t.name.toLowerCase().includes("cobranza"));
    const finanzasUsers = users.filter(u => u.teamId === (finanzasTeam?.id || 3) || u.role === "Finanzas");
    const primaryFinanzasUserId = finanzasUsers[0]?.id || 2;
    const finanzasUserIds = finanzasUsers.length > 0 ? finanzasUsers.map(u => u.id) : [primaryFinanzasUserId];

    // 1. Create Task for Finanzas with exactly 48-hour due date
    addTask({
      title: `💰 Cobro y facturación de prospecto - ${lead.name}`,
      dueDate: new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0],
      status: "Pendiente",
      type: "Llamada",
      priority: "Alta",
      leadId: lead.id,
      teamId: finanzasTeam?.id || 3,
      userId: primaryFinanzasUserId,
      userIds: finanzasUserIds,
      requestedBy: currentUser?.name || "Sistema CRM Automatizado",
      notes: `El prospecto "${lead.name}" avanzó a la etapa "Pago".\n\nAcción requerida (Vencimiento: 48 horas):\n• Monto Estimado: $${lead.value ? lead.value.toLocaleString("en-US") : "0"} USD\n• Contacto: ${lead.contactName || lead.name}\n• Email: ${lead.email || 'Sin correo'}\n• Teléfono: ${lead.phone || 'Sin teléfono'}\n\nEmitir comprobante, orden de pago o factura y dar seguimiento de cobro.`
    });

    // 2. Real-time in-app notification for Finanzas & Cobranza
    dispatchRealtimeNotification({
      title: `💰 Nuevo Prospecto en Pago: ${lead.name}`,
      message: `El prospecto "${lead.name}" avanzó a "Pago". Se creó tarea con vencimiento a 48 horas para Finanzas & Cobranza.`,
      type: 'finance',
      team: 'Finanzas & Cobranza',
      leadId: lead.id,
      leadName: lead.name,
      actionUrl: '/crm'
    });

    setEmailSuccessMsg(`✅ Prospecto movido a "Pago". Se creó tarea con vencimiento a 48 horas y notificación para Finanzas & Cobranza.`);
    setTimeout(() => setEmailSuccessMsg(null), 8000);
  };

  // Open Payment Confirmation Modal
  const handleOpenPaymentConfirmModal = (lead: CRMLead) => {
    setPaymentLeadTarget(lead);
    setPaymentAmount(lead.value || 1100);
    setPaymentMethod("Transferencia Bancaria");
    setPaymentRef(`TRF-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setIsPaymentConfirmModalOpen(true);
  };

  // Confirm Payment and Advance to Malla Curricular
  const handleConfirmPaymentAndAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLeadTarget) return;

    setIsProcessingPayment(true);
    const numericAmount = Number(paymentAmount) || paymentLeadTarget.value || 1100;
    const finalRef = paymentRef.trim() || `TRF-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalMethod = paymentMethod || "Transferencia Bancaria";
    const finalDate = paymentDate || new Date().toISOString().split("T")[0];
    const finalNotes = paymentNotes.trim();

    const paymentInfo = {
      amount: numericAmount,
      method: finalMethod,
      ref: finalRef,
      date: finalDate,
      notes: finalNotes
    };

    // Update lead status to "Malla curricular y boletines" with payment records
    setLeads(prev => prev.map(l => {
      if (l.id === paymentLeadTarget.id) {
        return {
          ...l,
          status: "Malla curricular y boletines",
          mallaPaymentStatus: "Pagado" as const,
          mallaPaymentDate: finalDate,
          mallaPaymentAmount: numericAmount,
          mallaPaymentRef: finalRef,
          mallaPaymentMethod: finalMethod,
          mallaPaymentNotes: finalNotes
        };
      }
      return l;
    }));

    if (viewingLead && viewingLead.id === paymentLeadTarget.id) {
      setViewingLead(prev => prev ? {
        ...prev,
        status: "Malla curricular y boletines",
        mallaPaymentStatus: "Pagado",
        mallaPaymentDate: finalDate,
        mallaPaymentAmount: numericAmount,
        mallaPaymentRef: finalRef,
        mallaPaymentMethod: finalMethod,
        mallaPaymentNotes: finalNotes
      } : null);
    }

    // Trigger Comercial / Ventas task and email
    await triggerComercialMallaPaidTaskAndEmail(paymentLeadTarget, paymentInfo);

    setIsProcessingPayment(false);
    setIsPaymentConfirmModalOpen(false);
    setPaymentLeadTarget(null);
  };

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<{
    leadId: string;
    title: string;
    type: TaskType;
    priority?: "Alta" | "Media" | "Baja";
    dueDate: string;
    syncAgenda: boolean;
    userId?: number;
    notes?: string;
  }>({
    leadId: "",
    title: "",
    type: "Llamada" as TaskType,
    priority: "Media",
    dueDate: new Date().toISOString().split("T")[0],
    syncAgenda: true,
    userId: undefined,
    notes: ""
  });

  // Config Modal State for stages reordering
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  // State for confirm deletion of lead
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);
  const [isConfirmWipeModalOpen, setIsConfirmWipeModalOpen] = useState(false);

  // Tab control inside Edit Lead Modal
  const [leadModalTab, setLeadModalTab] = useState<"info" | "actividades">("info");

  // Form states for adding new activity / logging contact inside detail modal
  const [logTitle, setLogTitle] = useState("");
  const [logType, setLogType] = useState<TaskType>("Llamada");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logNotes, setLogNotes] = useState("");
  const [activityFilter, setActivityFilter] = useState<"Todas" | "Pendiente" | "Completada">("Todas");

  // States for bulk selection/updates and bulk delete
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    assignedTo: "",
    status: "",
    type: "",
    source: "",
    value: "",
    city: "",
    state: "",
    country: "",
    englishExamScore: "",
    mallaPaymentStatus: "",
    appendNote: ""
  });
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [showBulkSuccessBanner, setShowBulkSuccessBanner] = useState(false);
  const [bulkAppliedSummary, setBulkAppliedSummary] = useState<{
    count: number;
    fields: { field: string; value: string }[];
    leadNames: string[];
  } | null>(null);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLeads = () => {
    const filteredIds = filteredLeads.map(l => l.id);
    const allSelectedInFiltered = filteredLeads.length > 0 && filteredIds.every(id => selectedLeadIds.includes(id));
    if (allSelectedInFiltered) {
      setSelectedLeadIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => {
        const otherSelected = prev.filter(id => !filteredIds.includes(id));
        return [...otherSelected, ...filteredIds];
      });
    }
  };

  const initiateBulkUpdateConfirm = () => {
    if (selectedLeadIds.length === 0) return;
    
    const { assignedTo, status, type, source, value, city, state, country, englishExamScore, mallaPaymentStatus, appendNote } = bulkUpdateForm;
    if (!assignedTo && !status && !type && !source && !value.trim() && !city.trim() && !state.trim() && !country.trim() && !englishExamScore.trim() && !mallaPaymentStatus && !appendNote.trim()) {
      alert("Por favor selecciona o llena al menos un campo para actualizar de forma masiva.");
      return;
    }

    const fieldsToChange: { field: string; value: string }[] = [];
    if (assignedTo) fieldsToChange.push({ field: "Agente Responsable", value: assignedTo === "--quitar--" ? "Sin asignar" : assignedTo });
    if (status) fieldsToChange.push({ field: "Estatus de Pipeline", value: status });
    if (type) fieldsToChange.push({ field: "Tipo de Prospecto", value: type });
    if (source) fieldsToChange.push({ field: "Origen", value: source });
    if (value.trim() && !isNaN(Number(value))) fieldsToChange.push({ field: "Valor Estimado USD", value: `$${Number(value).toLocaleString("en-US")} USD` });
    if (city.trim()) fieldsToChange.push({ field: "Ciudad", value: city.trim() });
    if (state.trim()) fieldsToChange.push({ field: "Estado", value: state.trim() });
    if (country.trim()) fieldsToChange.push({ field: "País", value: country.trim() });
    if (englishExamScore.trim()) fieldsToChange.push({ field: "Examen Inglés", value: englishExamScore.trim() });
    if (mallaPaymentStatus) fieldsToChange.push({ field: "Estatus Malla Curricular", value: mallaPaymentStatus });
    if (appendNote.trim()) fieldsToChange.push({ field: "Agregar Nota al Historial", value: appendNote.trim() });

    const selectedLeadsList = leads.filter(l => selectedLeadIds.includes(l.id));
    const leadNames = selectedLeadsList.map(l => l.name);

    setBulkAppliedSummary({
      count: selectedLeadIds.length,
      fields: fieldsToChange,
      leadNames
    });

    setShowBulkConfirmModal(true);
    setShowBulkSuccessBanner(false);
  };

  const executeBulkUpdate = () => {
    if (!bulkAppliedSummary) return;

    const { assignedTo, status, type, source, value, city, state, country, englishExamScore, mallaPaymentStatus, appendNote } = bulkUpdateForm;
    const nowStr = new Date().toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const authorName = currentUser?.name || 'Superadministrador';

    setLeads(prev =>
      prev.map(lead => {
        if (selectedLeadIds.includes(lead.id)) {
          const updated = { ...lead };
          if (assignedTo) updated.assignedTo = assignedTo === "--quitar--" ? "" : assignedTo;
          if (status) updated.status = status;
          if (type) updated.type = type as CRMLeadType;
          if (source) updated.source = source;
          if (value.trim() !== "" && !isNaN(Number(value))) updated.value = Number(value);
          if (city.trim() !== "") updated.city = city.trim();
          if (state.trim() !== "") updated.state = state.trim();
          if (country.trim() !== "") updated.country = country.trim();
          if (englishExamScore.trim() !== "") updated.englishExamScore = englishExamScore.trim();
          if (mallaPaymentStatus) updated.mallaPaymentStatus = mallaPaymentStatus as 'Pendiente' | 'Pagado' | 'Exento';
          if (appendNote.trim() !== "") {
            const newEntry = `[${nowStr} - ${authorName}]: ${appendNote.trim()}`;
            updated.notes = updated.notes ? `${updated.notes}\n${newEntry}` : newEntry;
          }
          return updated;
        }
        return lead;
      })
    );

    dispatchRealtimeNotification({
      title: "Modificación Masiva de Prospectos",
      message: `Se actualizaron satisfactoriamente ${selectedLeadIds.length} prospectos en el CRM.`,
      type: "lead"
    });

    setShowBulkConfirmModal(false);
    setShowBulkEditModal(false);
    setShowBulkSuccessBanner(true);

    setSelectedLeadIds([]);
    setBulkUpdateForm({
      assignedTo: "",
      status: "",
      type: "",
      source: "",
      value: "",
      city: "",
      state: "",
      country: "",
      englishExamScore: "",
      mallaPaymentStatus: "",
      appendNote: ""
    });
  };

  const executeBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    setIsBulkDeleting(true);

    const count = selectedLeadIds.length;
    setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));

    dispatchRealtimeNotification({
      title: "Eliminación Masiva Exitosa",
      message: `Se eliminaron permanentemente ${count} prospectos del CRM por ${currentUser?.name || 'Superadministrador'}.`,
      type: "lead"
    });

    setSelectedLeadIds([]);
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);
  };

  // Reset selection when filters change (preserves selection across tabs)
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [searchTerm, typeFilter, statusFilter, sourceFilter]);

  const handleLogContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !logTitle.trim() || !logDate) return;

    const assignedUser = users.find(u => u.name === editingLead.assignedTo);
    const targetUserId = assignedUser?.id || currentUser?.id || users[0]?.id;

    // 1. Create completed task in central Agenda context
    addTask({
      title: `CRM Contacto: ${logTitle} - ${editingLead.name} (${editingLead.contactName})`,
      dueDate: logDate,
      status: "Completada", // Directly completed
      type: logType,
      priority: "Media",
      leadId: editingLead.id,
      notes: logNotes,
      userId: targetUserId,
      requestedBy: currentUser?.name || "Admin Principal"
    });

    // 2. Format history entry to prepend to Lead Notes
    const timestamp = new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const activityEntry = `[${logType} - ${logDate} (${timestamp})]: ${logTitle}. Notas: ${logNotes}`;
    const updatedNotes = `${activityEntry}\n${editingLead.notes}`;

    // Update leads lists in state
    const updatedLeads = leads.map(l => l.id === editingLead.id ? { ...l, notes: updatedNotes } : l);
    setLeads(updatedLeads);
    safeLocalStorageSet("crm_leads_v1", updatedLeads);
    
    // Maintain the open editingLead reference so the UI renders it instantly
    setEditingLead(prev => prev ? { ...prev, notes: updatedNotes } : null);

    // Reset log contact form states
    setLogTitle("");
    setLogNotes("");
    alert(`¡Contacto registrado exitosamente y sincronizado en la Agenda central!`);
  };

  const handleMoveStageUp = (index: number, targetType: CRMLeadType = configPipelineType) => {
    if (index === 0) return;
    const currentList = targetType === 'Persona Potencial' 
      ? particularStages 
      : targetType === 'Redes Sociales' 
        ? redesSocialesStages 
        : institutionStages;
    const updated = [...currentList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    if (targetType === 'Persona Potencial') {
      setParticularStages(updated);
      safeLocalStorageSet("crm_stages_particulares_v2", updated);
    } else if (targetType === 'Redes Sociales') {
      setRedesSocialesStages(updated);
      safeLocalStorageSet("crm_stages_redes_sociales_v1", updated);
    } else {
      setInstitutionStages(updated);
      safeLocalStorageSet("crm_stages_instituciones_v2", updated);
    }
  };

  const handleMoveStageDown = (index: number, targetType: CRMLeadType = configPipelineType) => {
    const currentList = targetType === 'Persona Potencial' 
      ? particularStages 
      : targetType === 'Redes Sociales' 
        ? redesSocialesStages 
        : institutionStages;
    if (index === currentList.length - 1) return;
    const updated = [...currentList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    if (targetType === 'Persona Potencial') {
      setParticularStages(updated);
      safeLocalStorageSet("crm_stages_particulares_v2", updated);
    } else if (targetType === 'Redes Sociales') {
      setRedesSocialesStages(updated);
      safeLocalStorageSet("crm_stages_redes_sociales_v1", updated);
    } else {
      setInstitutionStages(updated);
      safeLocalStorageSet("crm_stages_instituciones_v2", updated);
    }
  };

  const handleStageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStageIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleStageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleStageDrop = (e: React.DragEvent, targetIndex: number, targetType: CRMLeadType = configPipelineType) => {
    e.preventDefault();
    if (draggedStageIndex === null) return;
    const currentList = targetType === 'Persona Potencial' 
      ? particularStages 
      : targetType === 'Redes Sociales' 
        ? redesSocialesStages 
        : institutionStages;
    const updated = [...currentList];
    const draggedItem = updated[draggedStageIndex];
    updated.splice(draggedStageIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    if (targetType === 'Persona Potencial') {
      setParticularStages(updated);
      safeLocalStorageSet("crm_stages_particulares_v2", updated);
    } else if (targetType === 'Redes Sociales') {
      setRedesSocialesStages(updated);
      safeLocalStorageSet("crm_stages_redes_sociales_v1", updated);
    } else {
      setInstitutionStages(updated);
      safeLocalStorageSet("crm_stages_instituciones_v2", updated);
    }
    setDraggedStageIndex(null);
  };

  // Import State representation
  const [importReport, setImportReport] = useState<{
    total: number;
    success: number;
    errors: { rowNum: number; msg: string; data: string }[];
  } | null>(null);

  // Google Sheets & Advanced Import states
  const [importSubTab, setImportSubTab] = useState<'sheets-url' | 'sheets-paste' | 'csv-file'>('sheets-url');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>("https://docs.google.com/spreadsheets/d/1iiXXWQFiHTfdqPBWtk_RhD_2GTiE3gPTLWOjeszdZgc/edit?usp=sharing");
  const [sheetsPastedText, setSheetsPastedText] = useState<string>("");
  const [isFetchingSheets, setIsFetchingSheets] = useState<boolean>(false);
  const [sheetsFetchError, setSheetsFetchError] = useState<{
    message: string;
    isRestricted?: boolean;
    helpInstructions?: string[];
  } | null>(null);
  const [parsedPreviewLeads, setParsedPreviewLeads] = useState<CRMLead[]>([]);
  const [previewSelectedIndices, setPreviewSelectedIndices] = useState<number[]>([]);
  const [targetImportType, setTargetImportType] = useState<CRMLeadType>("Institución Potencial");
  const [targetImportStage, setTargetImportStage] = useState<string>("Leads");
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string | null> | null>(null);
  const [importSuccessBanner, setImportSuccessBanner] = useState<string | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [rawPreviewRecords, setRawPreviewRecords] = useState<any[]>([]);
  const [selectedColumnMapping, setSelectedColumnMapping] = useState<{
    idLead: string;
    name: string;
    contactName: string;
  }>({ idLead: "", name: "", contactName: "" });

  const annotateLeadsWithDuplicates = (incomingList: CRMLead[], existingCrmLeads: CRMLead[]) => {
    const annotated: CRMLead[] = [];
    const seenBatch: CRMLead[] = [];

    for (const lead of incomingList) {
      const dupInCrm = detectLeadDuplicate(lead, existingCrmLeads);
      const dupInBatch = detectLeadDuplicate(lead, seenBatch);

      if (dupInCrm.isDuplicate) {
        annotated.push({
          ...lead,
          isDuplicate: true,
          duplicateReason: `Ya existe en el CRM (${dupInCrm.reason})`,
          duplicateMatchedWith: dupInCrm.matchedWith
        });
      } else if (dupInBatch.isDuplicate) {
        annotated.push({
          ...lead,
          isDuplicate: true,
          duplicateReason: `Repetido en la hoja (${dupInBatch.reason})`,
          duplicateMatchedWith: dupInBatch.matchedWith
        });
      } else {
        const cleanItem: CRMLead = {
          ...lead,
          isDuplicate: false,
          duplicateReason: undefined,
          duplicateMatchedWith: undefined
        };
        annotated.push(cleanItem);
        seenBatch.push(cleanItem);
      }
    }
    return annotated;
  };

  const handleOverrideColumnMapping = (key: 'idLead' | 'name' | 'contactName', newHeaderName: string) => {
    const updated = { ...selectedColumnMapping, [key]: newHeaderName };
    setSelectedColumnMapping(updated);

    const headersList = sheetHeaders;
    const idxNewId = updated.idLead ? headersList.indexOf(updated.idLead) : -1;
    const idxNewName = updated.name ? headersList.indexOf(updated.name) : -1;
    const idxNewContact = updated.contactName ? headersList.indexOf(updated.contactName) : -1;

    setParsedPreviewLeads(prev => {
      const remapped = prev.map((lead, i) => {
        const rawRec = rawPreviewRecords[i];
        const rawRow = rawRec?.rawRow || [];
        const newIdLead = idxNewId !== -1 && rawRow[idxNewId] !== undefined ? rawRow[idxNewId].trim() : (newHeaderName === "" && key === 'idLead' ? undefined : lead.idLead);
        const newName = idxNewName !== -1 && rawRow[idxNewName] !== undefined ? rawRow[idxNewName].trim() : lead.name;
        
        let finalContact = lead.contactName;
        if (idxNewContact !== -1 && rawRow[idxNewContact] !== undefined) {
          const val = rawRow[idxNewContact].trim();
          if (val && val !== newIdLead) {
            finalContact = val;
          } else {
            finalContact = newName || lead.name || "Contacto Principal";
          }
        } else if (newHeaderName === "" && key === 'contactName') {
          finalContact = newName || lead.name || "Contacto Principal";
        } else if (newName && (!lead.contactName || lead.contactName === "Contacto Principal")) {
          finalContact = newName;
        }

        return {
          ...lead,
          idLead: newIdLead || undefined,
          name: newName || lead.name,
          contactName: finalContact || newName || "Contacto Principal"
        };
      });

      const annotated = annotateLeadsWithDuplicates(remapped, leads);
      setPreviewSelectedIndices(annotated.map((r, i) => (!r.isDuplicate ? i : -1)).filter(i => i !== -1));
      return annotated;
    });
  };

  const [crmFirebaseSyncCompleted, setCrmFirebaseSyncCompleted] = useState(false);
  const prevLeadsRef = React.useRef<CRMLead[]>(leads);

  // Pull CRM leads from Firestore or push existing local leads if Firestore is empty
  useEffect(() => {
    async function initCRMSync() {
      try {
        const { getDocs, collection, doc, setDoc } = await import('firebase/firestore');
        
        const snap = await getDocs(collection(db, "crmLeads"));
        if (!snap.empty) {
          const remoteLeads: CRMLead[] = [];
          snap.forEach(d => {
            const data = d.data() as CRMLead;
            const normalized = normalizeLeadStatus(data.status, data.type);
            remoteLeads.push({
              ...data,
              status: normalized as CRMLead["status"]
            });
          });
          setLeads(remoteLeads);
        } else if (leads.length > 0) {
          for (const item of leads) {
            await setDoc(doc(db, "crmLeads", String(item.id)), cleanForFirestore(item));
          }
        }
        setCrmFirebaseSyncCompleted(true);
      } catch (err) {
        console.error("Error setting up CRM leads initial sync:", err);
        setCrmFirebaseSyncCompleted(true);
      }
    }
    initCRMSync();
  }, []);

  // Incremental CRM leads sync to Firestore (only updates modified or deleted items)
  useEffect(() => {
    if (!crmFirebaseSyncCompleted) {
      prevLeadsRef.current = leads;
      return;
    }

    const addedOrUpdated = leads.filter(item => {
      const prev = prevLeadsRef.current.find(p => p.id === item.id);
      return !prev || JSON.stringify(prev) !== JSON.stringify(item);
    });

    const deleted = prevLeadsRef.current.filter(prev => !leads.some(item => item.id === prev.id));

    if (addedOrUpdated.length > 0 || deleted.length > 0) {
      import('firebase/firestore').then(async ({ doc, setDoc, deleteDoc }) => {
        addedOrUpdated.forEach(item => {
          setDoc(doc(db, "crmLeads", String(item.id)), cleanForFirestore(item)).catch(err => {
            console.error(`Error saving crmLeads/${item.id} to Firestore`, err);
          });
        });

        deleted.forEach(item => {
          deleteDoc(doc(db, "crmLeads", String(item.id))).catch(err => {
            console.error(`Error deleting crmLeads/${item.id} from Firestore`, err);
          });
        });
      });
    }

    prevLeadsRef.current = leads;
  }, [leads, crmFirebaseSyncCompleted]);

  // Calculations for dashboard
  const isWonStatus = (status: string) => status === "Cierre" || status === "Ganado";
  const isLostStatus = (status: string) => status === "Perdido" || status === "Sin Interes";

  const totalValue = leads
    .filter(l => !isLostStatus(l.status))
    .reduce((sum, lead) => sum + lead.value, 0);

  const wonValue = leads
    .filter(l => isWonStatus(l.status))
    .reduce((sum, lead) => sum + lead.value, 0);

  const activeLeadsCount = leads.filter(l => !isWonStatus(l.status) && !isLostStatus(l.status)).length;
  const wonLeadsCount = leads.filter(l => isWonStatus(l.status)).length;

  // Agent performance calculation (managed leads, success rate, and total value of won proposals)
  const agentPerformance = React.useMemo(() => {
    // Get unique list of agents
    const uniqueAgents = Array.from(new Set(leads.map(l => l.assignedTo || "Sin asignar").filter(Boolean)));
    if (uniqueAgents.length === 0) {
      uniqueAgents.push("Admin Global");
    }
    return uniqueAgents.map(agent => {
      const agentLeads = leads.filter(l => (l.assignedTo || "Sin asignar") === agent);
      const totalLeads = agentLeads.length;
      const wonLeads = agentLeads.filter(l => isWonStatus(l.status));
      const wonCount = wonLeads.length;
      const totalWonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
      const successRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
      return {
        agent,
        totalLeads,
        wonCount,
        successRate,
        totalWonValue
      };
    }).sort((a, b) => b.totalWonValue - a.totalWonValue);
  }, [leads]);

  // Funnel and Conversion analytics calculations
  const funnelData = React.useMemo(() => {
    return pipelineStages.map((stage, idx) => {
      // B2B Funnel convention: a lead in stage X is counted as having passed through all previous stages
      const cumulativeCount = leads.filter(l => {
        const stageIdx = pipelineStages.indexOf(l.status);
        return stageIdx >= idx;
      }).length;

      return {
        name: stage,
        value: cumulativeCount,
        currentCount: leads.filter(l => l.status === stage).length
      };
    });
  }, [leads, pipelineStages]);

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setLeadModalTab("info");
    const defaultInitialStages = getStagesForType(kanbanPipelineType);
    const defaultInitialStatus = defaultInitialStages[0] || (kanbanPipelineType === "Redes Sociales" ? "Mensaje 1" : "Leads");
    setLeadForm({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      country: "México",
      source: kanbanPipelineType === "Redes Sociales" ? "Redes Sociales" : "Recomendación",
      status: defaultInitialStatus,
      type: kanbanPipelineType,
      value: 3000,
      notes: "",
      assignedTo: users[0]?.name || "Admin Global",
      contacts: [],
      englishExamScore: "",
      englishExamDate: "",
      programOfInterest: "",
      gradeToTake: "",
      creditsToTake: ""
    });
    setIsAddingProgramInline(false);
    setInlineProgramName("");
    setInlineProgramDesc("");
    setIsLeadModalOpen(true);
  };

  const handleOpenEditLead = (lead: CRMLead) => {
    setEditingLead(lead);
    setLeadModalTab("info"); // Default to main details tab
    setLeadForm({
      name: lead.name,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      website: lead.website || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country,
      source: lead.source,
      status: lead.status,
      type: lead.type,
      value: lead.value,
      notes: lead.notes,
      assignedTo: lead.assignedTo || "Admin Global",
      contacts: lead.contacts || [],
      englishExamScore: lead.englishExamScore || "",
      englishExamDate: lead.englishExamDate || "",
      programOfInterest: lead.programOfInterest || "",
      gradeToTake: lead.gradeToTake || "",
      creditsToTake: lead.creditsToTake !== undefined ? String(lead.creditsToTake) : ""
    });
    setIsAddingProgramInline(false);
    setInlineProgramName("");
    setInlineProgramDesc("");
    setIsLeadModalOpen(true);
  };

  const handleSaveLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      // Check if moving from Revisión to Firma for Institución Potencial
      const isMovingRevisionToFirma = 
        leadForm.type === "Institución Potencial" &&
        (editingLead.status === "Revisión" || editingLead.status === "Revision") &&
        (leadForm.status === "Firma" || leadForm.status === "Cierre");

      const isMovingToCliente =
        leadForm.type === "Institución Potencial" &&
        editingLead.status !== "Cliente" &&
        leadForm.status === "Cliente";

      const updatedLeadObj: CRMLead = {
        ...editingLead,
        name: leadForm.name,
        contactName: leadForm.contactName,
        email: leadForm.email,
        phone: leadForm.phone,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        country: leadForm.country,
        source: leadForm.source,
        status: isMovingRevisionToFirma ? "Firma" : leadForm.status,
        type: leadForm.type,
        value: Number(leadForm.value),
        notes: leadForm.notes,
        assignedTo: leadForm.assignedTo,
        contacts: leadForm.contacts,
        englishExamScore: leadForm.englishExamScore,
        englishExamDate: leadForm.englishExamDate,
        programOfInterest: leadForm.programOfInterest || undefined,
        gradeToTake: leadForm.type === "Persona Potencial" ? (leadForm.gradeToTake?.trim() || undefined) : undefined,
        creditsToTake: leadForm.type === "Persona Potencial" ? (leadForm.creditsToTake?.trim() || undefined) : undefined,
        website: leadForm.type === "Persona Potencial" ? undefined : (leadForm.website?.trim() || undefined)
      };

      if (isMovingRevisionToFirma) {
        setLeads(prev => prev.map(l => l.id === editingLead.id ? updatedLeadObj : l));
        setIsLeadModalOpen(false);
        setPendingFirmaTransition({ lead: updatedLeadObj, isConfirmationFromFirma: false });
        return;
      }

      if (isMovingToCliente) {
        setLeads(prev => prev.map(l => l.id === editingLead.id ? updatedLeadObj : l));
        setIsLeadModalOpen(false);
        setPendingFirmaTransition({ lead: updatedLeadObj, isConfirmationFromFirma: true });
        return;
      }

      // Edit
      setLeads(prev => prev.map(l => l.id === editingLead.id ? updatedLeadObj : l));

      // Trigger automation if changed to "Pago" from modal
      if (editingLead.status !== "Pago" && leadForm.status === "Pago") {
        const updatedLead: CRMLead = {
          ...editingLead,
          name: leadForm.name,
          contactName: leadForm.contactName,
          email: leadForm.email,
          phone: leadForm.phone,
          status: leadForm.status,
          type: leadForm.type,
          value: Number(leadForm.value),
          programOfInterest: leadForm.programOfInterest || undefined,
          englishExamScore: leadForm.englishExamScore
        };
        if (leadForm.type === "Persona Potencial") {
          triggerFinanzasMallaTaskAndEmail(updatedLead);
        } else {
          triggerGeneralFinanzasPaymentTaskAndNotification(updatedLead);
        }
      }
    } else {
      // New
      const newLead: CRMLead = {
        id: `lead-${generateUniqueId()}`,
        name: leadForm.name,
        contactName: leadForm.contactName,
        email: leadForm.email,
        phone: leadForm.phone,
        website: leadForm.type === "Persona Potencial" ? undefined : (leadForm.website?.trim() || undefined),
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        country: leadForm.country,
        source: leadForm.source,
        status: leadForm.status,
        type: leadForm.type,
        value: Number(leadForm.value),
        notes: leadForm.notes,
        assignedTo: leadForm.assignedTo,
        createdAt: new Date().toISOString().split("T")[0],
        contacts: leadForm.contacts,
        englishExamScore: leadForm.englishExamScore,
        englishExamDate: leadForm.englishExamDate,
        programOfInterest: leadForm.programOfInterest || undefined,
        gradeToTake: leadForm.type === "Persona Potencial" ? (leadForm.gradeToTake?.trim() || undefined) : undefined,
        creditsToTake: leadForm.type === "Persona Potencial" ? (leadForm.creditsToTake?.trim() || undefined) : undefined
      };
      setLeads(prev => [newLead, ...prev]);
    }
    setIsLeadModalOpen(false);
  };

  const handleDeleteLead = (id: string) => {
    setLeadToDeleteId(id);
  };

  const confirmDeleteLead = () => {
    if (leadToDeleteId) {
      setLeads(prev => prev.filter(l => l.id !== leadToDeleteId));
      setLeadToDeleteId(null);
    }
  };

  const handleWipeAllLeads = () => {
    setLeads([]);
    safeLocalStorageSet("crm_leads_v1", []);
    setIsConfirmWipeModalOpen(false);
  };

  const handleRestoreDemoLeads = () => {
    if (window.confirm("¿Deseas restaurar la información de demostración original en el CRM?")) {
      setLeads(SEED_LEADS);
      safeLocalStorageSet("crm_leads_v1", SEED_LEADS);
    }
  };

  // Status order flow for Kanban board columns
  const DEFAULT_STATUS_COLUMNS = DEFAULT_PIPELINE_STAGES;

  // State for pending transition to Firma / Cliente with institution creation prompt
  const [pendingFirmaTransition, setPendingFirmaTransition] = useState<{
    lead: CRMLead;
    isConfirmationFromFirma?: boolean;
  } | null>(null);

  const handleConfirmCreateInstitution = (lead: CRMLead) => {
    // Look up assigned user for agentId
    const assignedUser = users.find(
      u => u.name.toLowerCase() === (lead.assignedTo || "").toLowerCase() ||
           u.email.toLowerCase() === (lead.assignedTo || "").toLowerCase()
    );

    // Create new institution with the data already present in the lead
    const newInstitutionPayload = {
      name: lead.name,
      tradeName: lead.name,
      institutionCode: `INST-${Math.floor(1000 + Math.random() * 9000)}`,
      country: lead.country || "México",
      state: lead.state || "",
      city: lead.city || "",
      address: lead.address || "",
      contact: lead.contactName || "Contacto Principal",
      contactEmail: lead.email || "",
      email: lead.email || "",
      contactPhone: lead.phone || "",
      phone: lead.phone || "",
      students: 0,
      status: "Activo",
      revenue: lead.value || 0,
      agentId: assignedUser?.id,
      createdAt: new Date().toISOString().split("T")[0],
      active: true,
      documentsList: [],
      campusList: []
    };

    const newInstId = addInstitution(newInstitutionPayload);

    // Lead in CRM advances to stage "Cliente"
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "Cliente" } : l));
    if (viewingLead && viewingLead.id === lead.id) {
      setViewingLead(prev => prev ? { ...prev, status: "Cliente" } : null);
    }

    dispatchRealtimeNotification({
      type: "success",
      title: "Institución Creada Exitosamente",
      message: `Se ha registrado la nueva institución "${lead.name}" (ID #${newInstId}) en el sistema y el prospecto avanzó a la etapa "Cliente".`
    });

    setPendingFirmaTransition(null);
  };

  const handleRejectFirmaTransition = () => {
    if (!pendingFirmaTransition) return;
    const { lead } = pendingFirmaTransition;

    // Set lead status to Firma
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "Firma" } : l));
    if (viewingLead && viewingLead.id === lead.id) {
      setViewingLead(prev => prev ? { ...prev, status: "Firma" } : null);
    }

    dispatchRealtimeNotification({
      type: "info",
      title: "Prospecto en Etapa Firma",
      message: `La institución "${lead.name}" queda registrada en la etapa Firma. Podrás confirmarla en cualquier momento para darla de alta oficialmente.`
    });

    setPendingFirmaTransition(null);
  };

  const handleMoveStatus = (leadId: string, nextStatus: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const oldStatus = targetLead.status;

    // Transition: Revisión -> Firma for Institución Potencial
    const isOldRevision = oldStatus === "Revisión" || oldStatus === "Revision";
    const isNextFirma = nextStatus === "Firma" || nextStatus === "Cierre";

    if (targetLead.type === "Institución Potencial" && isOldRevision && isNextFirma) {
      setPendingFirmaTransition({ lead: targetLead, isConfirmationFromFirma: false });
      return;
    }

    // Transition: Firma -> Cliente for Institución Potencial
    if (targetLead.type === "Institución Potencial" && (oldStatus === "Firma" || oldStatus === "Cierre") && nextStatus === "Cliente") {
      setPendingFirmaTransition({ lead: targetLead, isConfirmationFromFirma: true });
      return;
    }

    // Case 1: Moving to "Pago"
    if (nextStatus === "Pago" && oldStatus !== "Pago") {
      if (targetLead.type === "Persona Potencial") {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus, mallaPaymentStatus: l.mallaPaymentStatus || "Pendiente" } : l));
        if (viewingLead && viewingLead.id === leadId) {
          setViewingLead(prev => prev ? { ...prev, status: nextStatus, mallaPaymentStatus: prev.mallaPaymentStatus || "Pendiente" } : null);
        }
        triggerFinanzasMallaTaskAndEmail({ ...targetLead, status: nextStatus });
        return;
      } else {
        // Institutional / B2B lead moving to Pago -> 48h task and realtime alert for Finanzas & Cobranza
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus } : l));
        if (viewingLead && viewingLead.id === leadId) {
          setViewingLead(prev => prev ? { ...prev, status: nextStatus } : null);
        }
        triggerGeneralFinanzasPaymentTaskAndNotification({ ...targetLead, status: nextStatus });
        return;
      }
    }

    // Case 2: Moving to "Malla curricular y boletines"
    if ((oldStatus === "Pago" || targetLead.mallaPaymentStatus !== "Pagado") && (nextStatus === "Malla curricular y boletines" || nextStatus === "Malla Curricular")) {
      // Open payment confirmation modal so user or finance staff confirms receipt and generates task/email
      handleOpenPaymentConfirmModal(targetLead);
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus } : l));
    if (viewingLead && viewingLead.id === leadId) {
      setViewingLead(prev => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  // Program Activity (linking with general Agenda)
  const handleOpenNewActivity = (leadId: string) => {
    setActivityForm({
      leadId: leadId,
      title: "",
      type: "Llamada",
      dueDate: new Date().toISOString().split("T")[0],
      syncAgenda: true
    });
    setIsActivityModalOpen(true);
  };

  // Download fully customized CSV Template for CRM
  const downloadCrmTemplate = () => {
    const csvContent = "\ufeffTipo(Institucion Potencial o Persona Potencial),Nombre,Contacto,Email,Telefono,Website,Direccion,Ciudad,Estado,Pais,Origen,Status,Valor Estimado(Numero),Agente,Calificacion Examen Ingles,Fecha Examen Ingles,Programa de Interes,Notas\n" +
      "Institución Potencial,Colegio Británico de Puebla,Lic. Regina Mendoza,r.mendoza@britanico.edu.mx,+52 22 2345 6789,https://britanicopuebla.edu.mx,Av. 15 de Mayo 1234,Puebla,Puebla,México,Campaña Digital,Captación,5000,Admin Global,,,,Interesados de realizar prueba piloto de créditos AP.\n" +
      "Persona Potencial,Enrique San Román,Enrique San Román,enrique.sr@outlook.com,+52 55 5678 1234,https://enriquesr.me,Calle Reforma 45,Ciudad de México,CDMX,México,LinkedIn,Primer Filtro,1100,Daniel Altamirano,88/100 (B2),2026-05-18,Full High School,Hijo requiere convalidación internacional de materias de preparatoria.\n" +
      "Institución Potencial,Universidad Humanitas,Dr. Fernando Salazar,f.salazar@humanitas.edu.mx,+52 33 1111 2222,https://humanitas.edu.mx,Av. Patria 450,Guadalajara,Jalisco,México,Recomendación,Demostración,8000,Admin Global,,,,Discusión institucional abierta para revalidación directa de materias de inglés.";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_crm_prospectos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real, interactive CSV Uploader with progress simulator and validator
  const handleCrmTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportReport({
          total: 0,
          success: 0,
          errors: [{ rowNum: 1, msg: "El archivo cargado está vacío o no tiene registros de datos.", data: "" }]
        });
        return;
      }

      // Analyze the header row to determine column indexes
      const cleanStr = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const isIdHeader = (cleanH: string) => {
        return cleanH === "id" || 
               cleanH === "id lead" || 
               cleanH === "lead id" || 
               cleanH === "id_lead" || 
               cleanH === "lead_id" || 
               cleanH === "idlead" || 
               cleanH === "folio" || 
               cleanH === "codigo" || 
               cleanH === "cve" || 
               cleanH === "no" || 
               cleanH === "no." || 
               cleanH === "num" || 
               cleanH === "numero" ||
               cleanH.startsWith("id ") || 
               cleanH.endsWith(" id") || 
               cleanH.startsWith("id_") ||
               cleanH.startsWith("id-");
      };

      const rawHeaders = lines[0]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(h => h.replace(/^"|"$/g, '').trim());
      const headers = rawHeaders.map(h => cleanStr(h));

      const idxId = headers.findIndex(h => isIdHeader(h));
      const idxTipo = headers.findIndex(h => !isIdHeader(h) && h.includes("tipo"));
      const idxInstitution = headers.findIndex(h => !isIdHeader(h) && (
        h.includes("institucion") || h.includes("colegio") || h.includes("escuela") || h.includes("universidad") || h.includes("razon social") || h.includes("empresa")
      ));
      const idxContact = headers.findIndex(h => !isIdHeader(h) && (
        h === "contacto" || h.includes("contacto") || h.includes("responsable") || h.includes("director") || h.includes("coordinador")
      ));
      const idxGeneralName = headers.findIndex(h => !isIdHeader(h) && !h.includes("contacto") && !h.includes("tipo") && (
        h === "nombre" || h === "nombre completo" || h.includes("nombre del prospecto") || h === "prospecto" || h === "particular" || h === "alumno"
      ));

      let idxNombre = -1;
      let finalIdxContact = idxContact;
      if (idxInstitution !== -1) {
        idxNombre = idxInstitution;
        if (finalIdxContact === -1 && idxGeneralName !== -1 && idxGeneralName !== idxInstitution) {
          finalIdxContact = idxGeneralName;
        }
      } else if (idxGeneralName !== -1) {
        idxNombre = idxGeneralName;
      } else {
        idxNombre = headers.findIndex((h, idx) => !isIdHeader(h) && idx !== idxContact);
      }
      if (idxNombre === -1) idxNombre = 0;

      const idxEmail = headers.findIndex(h => !isIdHeader(h) && (h === "email" || h === "correo" || h.includes("correo") || h.includes("mail")));
      const idxTelefono = headers.findIndex(h => !isIdHeader(h) && (h === "telefono" || h.includes("tel") || h.includes("movil") || h.includes("celular") || h.includes("whatsapp")));
      const idxWebsite = headers.findIndex(h => !isIdHeader(h) && (h.includes("website") || h.includes("web") || h.includes("url") || h.includes("sitio")));
      const idxDireccion = headers.findIndex(h => !isIdHeader(h) && (h.includes("direccion") || h.includes("calle")));
      const idxCiudad = headers.findIndex(h => !isIdHeader(h) && (h === "ciudad" || h.includes("ciudad") || h.includes("municipio") || h === "city"));
      const idxEstado = headers.findIndex(h => !isIdHeader(h) && (h === "estado" || (h.includes("estado") && !h.includes("status") && !h.includes("fase") && !h.includes("etapa"))));
      const idxPais = headers.findIndex(h => !isIdHeader(h) && (h.includes("pais") || h === "country"));
      const idxOrigen = headers.findIndex(h => !isIdHeader(h) && (h.includes("origen") || h.includes("procedencia") || h.includes("fuente") || h.includes("source")));
      const idxStatus = headers.findIndex(h => !isIdHeader(h) && (h.includes("status") || h.includes("etapa") || h.includes("fase") || h.includes("estatus")));
      const idxValor = headers.findIndex(h => !isIdHeader(h) && (h.includes("valor") || h.includes("estimado") || h.includes("monto") || h.includes("presupuesto")));
      const idxAgente = headers.findIndex(h => !isIdHeader(h) && (h.includes("agente") || h.includes("asignado")));
      const idxEnglishScore = headers.findIndex(h => !isIdHeader(h) && (h.includes("calificacion") || (h.includes("ingles") && (h.includes("score") || h.includes("examen") || h.includes("nota")))));
      const idxEnglishDate = headers.findIndex(h => !isIdHeader(h) && ((h.includes("fecha") && h.includes("ingles")) || (h.includes("date") && h.includes("english"))));
      const idxProgramOfInterest = headers.findIndex(h => !isIdHeader(h) && (h.includes("programa") || h.includes("interes") || h.includes("homeschool")));
      const idxNotas = headers.findIndex(h => !isIdHeader(h) && (h.includes("notas") || h.includes("comentarios") || h.includes("observaciones")));

      let successCount = 0;
      const errors: { rowNum: number; msg: string; data: string }[] = [];
      const newLeadsFromCsv: CRMLead[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const line = lines[i];
        
        // Split by comma ignoring commas inside quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length < 2) {
          errors.push({
            rowNum,
            msg: "La fila no cuenta con datos suficientes.",
            data: line
          });
          continue;
        }

        const getValue = (idx: number, fallback: string = ""): string => {
          if (idx !== -1 && idx < cols.length) {
            return cols[idx] !== undefined && cols[idx] !== null ? cols[idx] : fallback;
          }
          return fallback;
        };

        const rawId = getValue(idxId, "");
        let name = getValue(idxNombre, "");

        // If name is empty or identical to ID Lead, find another non-ID text cell
        if (!name || (rawId && name === rawId)) {
          for (let c = 0; c < cols.length; c++) {
            if (c !== idxId && c !== idxEmail && c !== idxTelefono && cols[c] && cols[c].trim() !== rawId) {
              name = cols[c].trim();
              break;
            }
          }
        }

        let contactName = getValue(finalIdxContact, "");
        if (contactName === rawId) {
          contactName = "";
        }
        if (!contactName && name) {
          contactName = name;
        }

        const typeRaw = getValue(idxTipo, "Institución Potencial");
        const email = getValue(idxEmail, "comercial@institucion.com");
        const phone = getValue(idxTelefono, "No proporcionado");
        const website = getValue(idxWebsite, "");
        const address = getValue(idxDireccion, "");
        const city = getValue(idxCiudad, "");
        const state = getValue(idxEstado, "");
        const country = getValue(idxPais, "México");
        const source = getValue(idxOrigen, "Recomendación");
        const statusRaw = getValue(idxStatus, "Captación");
        const valueNum = getValue(idxValor, "3000") ? (Number(getValue(idxValor, "3000")) || 3000) : 3000;
        const agent = getValue(idxAgente, users[0]?.name || "Admin Global");
        let notes = getValue(idxNotas, "Importado mediante planilla CSV.");
        if (rawId) {
          notes = notes ? `[ID Lead: ${rawId}] ${notes}` : `[ID Lead: ${rawId}] Importado mediante planilla CSV.`;
        }

        // Type matching safety
        const mappedType: CRMLead["type"] = typeRaw.toLowerCase().includes("redes") || typeRaw.toLowerCase().includes("social")
          ? "Redes Sociales"
          : typeRaw.toLowerCase().includes("persona") || typeRaw.toLowerCase().includes("particular")
            ? "Persona Potencial" 
            : "Institución Potencial";

        // Status matching safety - allows dynamic pipeline stages now!
        const normalizedRawStatus = normalizeLeadStatus(statusRaw, mappedType);
        const typeStages = getStagesForType(mappedType);
        const mappedStatus: CRMLead["status"] = (typeStages.includes(normalizedRawStatus)
          ? normalizedRawStatus
          : (typeStages.find(stage => stage.toLowerCase() === statusRaw.toLowerCase()) || typeStages[0] || "Leads")) as CRMLead["status"];

        if (!name) {
          errors.push({
            rowNum,
            msg: "El Nombre o Razón Social del prospecto está vacío.",
            data: line
          });
          continue;
        }

        const englishScore = getValue(idxEnglishScore, "");
        const englishDate = getValue(idxEnglishDate, "");
        const progOfInterest = getValue(idxProgramOfInterest, "");
        newLeadsFromCsv.push({
          id: `lead-csv-${generateUniqueId()}-${i}`,
          idLead: rawId || undefined,
          name,
          contactName: contactName || name || "Contacto Principal",
          email: email || "comercial@institucion.com",
          phone: phone || "No proporcionado",
          website,
          address,
          city,
          state,
          country,
          source,
          status: mappedStatus,
          type: mappedType,
          value: valueNum,
          assignedTo: agent,
          notes,
          createdAt: new Date().toISOString().split("T")[0],
          englishExamScore: englishScore || undefined,
          englishExamDate: englishDate || undefined,
          programOfInterest: mappedType === "Persona Potencial" ? (progOfInterest || undefined) : undefined
        });

        successCount++;
      }

      if (newLeadsFromCsv.length > 0) {
        setLeads(prev => [...newLeadsFromCsv, ...prev]);
      }

      setImportReport({
        total: lines.length - 1,
        success: successCount,
        errors
      });
    };

    reader.readAsText(file, "UTF-8");
  };

  // Google Sheets Fetching & Analysis
  const handleFetchGoogleSheets = async (mode: 'url' | 'paste') => {
    setIsFetchingSheets(true);
    setSheetsFetchError(null);
    setImportSuccessBanner(null);

    try {
      const payload = mode === 'url' ? { url: googleSheetsUrl } : { rawText: sheetsPastedText };
      const response = await fetch('/api/crm/import-google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSheetsFetchError({
          message: data.message || data.error || 'No se pudo leer la hoja de cálculo de Google.',
          isRestricted: data.isRestricted,
          helpInstructions: data.helpInstructions
        });
        setParsedPreviewLeads([]);
        setPreviewSelectedIndices([]);
        return;
      }

      const rawRecords: CRMLead[] = (data.records || []).map((r: any, idx: number) => ({
        ...r,
        id: `lead-gs-${generateUniqueId()}-${idx}`,
        idLead: r.idLead || undefined,
        name: r.name,
        contactName: r.contactName || r.name || "Contacto Principal",
        type: targetImportType,
        status: (targetImportStage || "Leads") as CRMLead["status"],
        assignedTo: r.assignedTo || users[0]?.name || "Admin Global",
        createdAt: new Date().toISOString().split("T")[0]
      }));

      const records = annotateLeadsWithDuplicates(rawRecords, leads);
      const onlyNewIndices = records.map((r, i) => (!r.isDuplicate ? i : -1)).filter(i => i !== -1);

      setParsedPreviewLeads(records);
      setPreviewSelectedIndices(onlyNewIndices);
      setDetectedColumns(data.detectedMapping || null);
      setSheetHeaders(data.headers || []);
      setRawPreviewRecords(data.records || []);
      setSelectedColumnMapping({
        idLead: data.detectedMapping?.idLead || "",
        name: data.detectedMapping?.name || "",
        contactName: data.detectedMapping?.contactName || data.detectedMapping?.name || ""
      });

      const duplicateCount = records.length - onlyNewIndices.length;
      if (onlyNewIndices.length === 0) {
        dispatchRealtimeNotification({
          type: "warning",
          title: "Todos los Prospectos ya Existen",
          message: `Se detectaron ${records.length} registros en la hoja, pero todos ya se encuentran registrados en el CRM o están duplicados. No hay nuevos prospectos por importar.`
        });
      } else {
        dispatchRealtimeNotification({
          type: "success",
          title: "Hoja de Cálculo Procesada",
          message: `Se detectaron ${records.length} registros: ${onlyNewIndices.length} nuevos listos para importar${duplicateCount > 0 ? ` (${duplicateCount} duplicados omitidos automáticamente)` : ""}.`
        });
      }
    } catch (err: any) {
      console.error("Error fetching Google Sheets:", err);
      setSheetsFetchError({
        message: err.message || "Error de red al consultar el servidor."
      });
      setParsedPreviewLeads([]);
      setPreviewSelectedIndices([]);
    } finally {
      setIsFetchingSheets(false);
    }
  };

  const handleConfirmImportGoogleSheets = () => {
    if (parsedPreviewLeads.length === 0 || previewSelectedIndices.length === 0) return;

    // Filter strictly to non-duplicates among the selected indices
    const selectedLeads = parsedPreviewLeads
      .filter((lead, idx) => previewSelectedIndices.includes(idx) && !lead.isDuplicate)
      .map(lead => ({
        ...lead,
        type: targetImportType,
        status: (targetImportStage || lead.status || "Leads") as CRMLead["status"]
      }));

    if (selectedLeads.length === 0) {
      alert("No hay prospectos nuevos para importar (todos los seleccionados ya existen en el CRM o están duplicados).");
      return;
    }

    // Extra strict check to ensure no duplicates slip through against current leads state
    const strictlyNewLeads: CRMLead[] = [];
    const seenNew: CRMLead[] = [];
    let duplicateSkipped = 0;

    for (const item of selectedLeads) {
      const dupInCrm = detectLeadDuplicate(item, leads);
      const dupInBatch = detectLeadDuplicate(item, seenNew);
      if (!dupInCrm.isDuplicate && !dupInBatch.isDuplicate) {
        const { isDuplicate, duplicateReason, duplicateMatchedWith, ...cleanLead } = item;
        strictlyNewLeads.push(cleanLead as CRMLead);
        seenNew.push(cleanLead as CRMLead);
      } else {
        duplicateSkipped++;
      }
    }

    if (strictlyNewLeads.length === 0) {
      alert("Todos los prospectos seleccionados ya existen en el CRM. No se agregaron duplicados.");
      return;
    }

    const updated = [...strictlyNewLeads, ...leads];
    setLeads(updated);
    safeLocalStorageSet("crm_leads_v1", updated);

    dispatchRealtimeNotification({
      type: "success",
      title: "Contactos Importados al CRM",
      message: `Se agregaron ${strictlyNewLeads.length} nuevos prospectos al CRM exitosamente.${duplicateSkipped > 0 ? ` Se omitieron ${duplicateSkipped} duplicados.` : ""}`
    });

    const dupMsg = duplicateSkipped > 0 ? ` (Se omitieron ${duplicateSkipped} duplicados automáticamente).` : "";
    setImportSuccessBanner(`¡Se importaron ${strictlyNewLeads.length} prospectos nuevos exitosamente a la cartera del CRM!${dupMsg}`);
    setParsedPreviewLeads([]);
    setPreviewSelectedIndices([]);
    setSheetsPastedText("");
  };

  // Filtered leads calculation
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.gradeToTake ? lead.gradeToTake.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      (lead.creditsToTake ? String(lead.creditsToTake).toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      (lead.programOfInterest ? lead.programOfInterest.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      (lead.englishExamScore ? lead.englishExamScore.toLowerCase().includes(searchTerm.toLowerCase()) : false);

    const matchesType = typeFilter === "Todos" || lead.type === typeFilter;
    const matchesStatus = statusFilter === "Todos" 
      ? (!hideLostStage || lead.status !== "Perdido")
      : lead.status === statusFilter;
    const matchesSource = sourceFilter === "Todos" || lead.source === sourceFilter;

    return matchesSearch && matchesType && matchesStatus && matchesSource;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full space-y-6">
      
      {/* Visual Title Header & Financial KPIs Banner - Only visible on Dashboard de CRM (Analytics) */}
      {activeTab === "Analytics" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                Módulo Comercial Integrado
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-2 tracking-tight">Prospectos</h2>
              <p className="text-xs text-slate-500 mt-1">
                Gestión comercial de Colegios, Universidades y Clientes Potenciales antes del registro oficial en el sistema.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              {leads.length === 0 ? (
                <button 
                  onClick={handleRestoreDemoLeads}
                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 bg-white border border-indigo-250 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
                >
                  <Database className="w-4 h-4 mr-1.5" />
                  Restaurar Demo
                </button>
              ) : (
                <button 
                  onClick={() => setIsConfirmWipeModalOpen(true)}
                  className="text-rose-650 hover:text-rose-800 hover:bg-rose-50/50 bg-white border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
                  title="Borrar toda la información del CRM"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Borrar Todo
                </button>
              )}
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-150 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-1.5 text-slate-500" />
                Configurar Etapas
              </button>
              <button 
                onClick={downloadCrmTemplate}
                className="text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-150 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar Plantilla
              </button>
              <button
                onClick={handleOpenNewLead}
                className="bg-indigo-600 text-white hover:bg-indigo-750 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5 mr-1.5" />
                Nuevo Lead / Prospecto
              </button>
            </div>
          </div>

          {/* Financial KPIs Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Prospectos Activos</span>
                <Building2 className="w-4.5 h-4.5 text-indigo-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-800 font-mono">{activeLeadsCount}</span>
                <span className="text-xs text-slate-450 font-semibold">instituciones/personas</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Leads Ganados</span>
                <Award className="w-4.5 h-4.5 text-emerald-500 animate-bounce" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-600 font-mono">{wonLeadsCount}</span>
                <span className="text-xs text-emerald-500/70 font-semibold font-mono">
                  ({leads.length > 0 ? Math.round((wonLeadsCount / leads.length) * 100) : 0}% efectividad)
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-indigo-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Valor Estimado Pipeline</span>
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-850 font-mono text-slate-800">
                ${totalValue.toLocaleString("en-US")} <span className="text-xs font-normal text-slate-400">USD</span>
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Ingreso Cerrado</span>
                <DollarSign className="w-4.5 h-4.5 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-purple-700 font-mono">
                ${wonValue.toLocaleString("en-US")} <span className="text-xs font-normal text-purple-400">USD</span>
              </p>
            </div>
          </div>
        </>
      )}

      {/* Main Tabs Selection */}
      <div className="border border-slate-200 bg-white rounded-2xl flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden shadow-sm">
        
        {/* Navigation Bar & Filters */}
        <div className="flex flex-col border-b border-slate-150 shrink-0">
          {/* Global Automation Notification Toast Banner */}
          {emailSuccessMsg && (
            <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setEmailSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex border-b border-slate-100 px-6 pt-3 shrink-0 overflow-x-auto">
            {[
              { id: "Analytics", label: "Dashboard de CRM", route: "/crm/dashboard", menu: "CRM - Dashboard" as PermissionMenu },
              { id: "Kanban", label: "Prospectos", route: "/crm", menu: "CRM - Prospectos" as PermissionMenu },
              { id: "Tabla", label: "Listado Detallado", route: "/crm", menu: "CRM - Prospectos" as PermissionMenu },
              { id: "Campanas", label: "Campañas", route: "/crm/campanas", menu: "CRM - Campañas" as PermissionMenu },
              { id: "Reportes", label: "Reportes", route: "/crm/reportes", menu: "CRM - Reportes" as PermissionMenu },
              { id: "Correos", label: "Correos", route: "/crm/correos", menu: "CRM - Correos" as PermissionMenu },
              { id: "Repositorio", label: "Repositorio", route: "/crm/repositorio", menu: "CRM - Repositorio" as PermissionMenu },
              { id: "Tareas", label: "Tareas", route: "/crm/tareas", menu: "CRM - Tareas" as PermissionMenu },
              { id: "Importar", label: "Importar de Google Sheets / CSV", route: "/crm", menu: "CRM - Prospectos" as PermissionMenu }
            ]
            .filter(tab => hasPermission(currentUser?.role, tab.menu, "view"))
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setImportReport(null);
                  if (location.pathname !== tab.route && (tab.id === "Analytics" || tab.id === "Campanas" || tab.id === "Reportes" || tab.id === "Correos" || tab.id === "Repositorio" || tab.id === "Tareas" || (tab.id === "Kanban" && location.pathname !== "/crm"))) {
                    navigate(tab.route);
                  }
                }}
                className={`py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 transition -mb-px whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Filters - Visible on Kanban and Table */}
          {(activeTab === "Kanban" || activeTab === "Tabla") && (
            <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center text-xs">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar prospecto, contacto, notas..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-700 shadow-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
                {/* Type filter */}
                <div>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                  >
                    <option value="Todos">Todos los Tipos</option>
                    <option value="Institución Potencial">Instituciones Potenciales</option>
                    <option value="Persona Potencial">Contactos Particulares / Prospectos Individuales</option>
                    <option value="Redes Sociales">Redes Sociales</option>
                  </select>
                </div>

                {/* Source Filter */}
                <div>
                  <select 
                    value={sourceFilter} 
                    onChange={e => setSourceFilter(e.target.value)}
                    className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                  >
                    <option value="Todos">Todos los Orígenes</option>
                    <option value="Recomendación">Recomendación</option>
                    <option value="Feria Educativa">Feria Educativa</option>
                    <option value="Campaña Digital">Campaña Digital</option>
                    <option value="Llamada Fría">Llamada Fría</option>
                    <option value="LinkedIn">LinkedIn Sales</option>
                  </select>
                </div>

                {/* Status selector (only on Table tab) */}
                {activeTab === "Tabla" && (
                  <div>
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      className="border border-slate-200 bg-white rounded-lg p-2 font-semibold text-slate-600 outline-none"
                    >
                      <option value="Todos">Todos los Estatus</option>
                      {allPipelineStages.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hide / Show "Perdido" status toggle button */}
                <button
                  type="button"
                  onClick={() => setHideLostStage(!hideLostStage)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 ${
                    hideLostStage
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-extrabold shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                  }`}
                  title={hideLostStage ? "Haz clic para mostrar la columna y prospectos con estatus Perdido" : "Haz clic para ocultar la columna y prospectos con estatus Perdido"}
                >
                  {hideLostStage ? <EyeOff className="w-3.5 h-3.5 text-rose-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{hideLostStage ? "Perdidos Ocultos" : "Ocultar Perdidos"}</span>
                </button>

                {/* View Mode Toggle: Vista Tarjetas vs Vista Compacta */}
                <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-250 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => setCardViewMode("tarjetas")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cardViewMode === "tarjetas"
                        ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Vista de Tarjetas con detalle completo"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vista Tarjetas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardViewMode("compacta")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cardViewMode === "compacta"
                        ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Vista Compacta de alta densidad"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vista Compacta</span>
                  </button>
                </div>

                {/* Quick Add Lead Button */}
                <button
                  type="button"
                  onClick={handleOpenNewLead}
                  className="bg-indigo-600 hover:bg-indigo-750 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center shadow-xs cursor-pointer shrink-0 ml-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nuevo Lead
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Tabs Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/20">

          {/* STICKY BATCH ACTIONS BAR (VISIBLE ACROSS KANBAN AND TABLA WHEN LEADS ARE SELECTED BY SUPERADMIN) */}
          {isSuperAdmin && selectedLeadIds.length > 0 && (
            <div className="sticky top-0 z-30 mb-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-xl border border-indigo-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white font-black text-xs h-7 px-3 rounded-full flex items-center justify-center shadow-inner">
                    {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'prospecto seleccionado' : 'prospectos seleccionados'}
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-xs tracking-wide flex items-center gap-2">
                      <span>Operaciones Masivas de Superadministrador</span>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                        Superadmin
                      </span>
                    </h4>
                    <p className="text-[11px] text-indigo-200/80 font-medium">
                      Aplica modificaciones conjuntas o elimina definitivamente los registros seleccionados.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Modificaciones Masivas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-rose-500/50 hover:shadow-rose-600/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-200" />
                    <span>Borrar Masivo ({selectedLeadIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartBulkFromTableSelection(selectedLeadIds)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-300" />
                    <span className="hidden sm:inline">Correo Masivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLeadIds([])}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMPTY STATE WARNING / RESTORE TRIGGER */}
          {leads.length === 0 && (
            <div className="bg-slate-50/50 border border-dashed border-slate-250 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                <Database className="w-8 h-8 text-slate-300 animate-pulse" />
              </div>
              <div className="max-w-md">
                <h4 className="text-slate-800 font-extrabold text-base tracking-tight">Base de Datos del CRM Vacía</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-sans">
                  Se ha borrado toda la información de prospectos y clientes potenciales de este CRM. Puedes subir nuevos registros mediante importación de archivos CSV, capturar un prospecto individual de forma manual, o sencillamente restaurar la información de demostración para realizar pruebas de visualización del pipeline interactivo.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleRestoreDemoLeads}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Restaurar Leads Demo
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewLead}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Crear Lead Manual
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: KANBAN PIPELINE */}
          {activeTab === "Kanban" && (
            <div className="space-y-4 min-w-0 w-full">
              {/* Pipeline Selector Switcher Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setKanbanPipelineType("Institución Potencial");
                      setTypeFilter("Institución Potencial");
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanbanPipelineType === "Institución Potencial"
                        ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Instituciones ({leads.filter(l => l.type === "Institución Potencial").length})</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {institutionStages.length} etapas
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKanbanPipelineType("Persona Potencial");
                      setTypeFilter("Persona Potencial");
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanbanPipelineType === "Persona Potencial"
                        ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Particulares ({leads.filter(l => l.type === "Persona Potencial").length})</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {particularStages.length} etapas
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKanbanPipelineType("Redes Sociales");
                      setTypeFilter("Redes Sociales");
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kanbanPipelineType === "Redes Sociales"
                        ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-pink-600" />
                    <span>Redes Sociales ({leads.filter(l => l.type === "Redes Sociales").length})</span>
                    <span className="text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {redesSocialesStages.length} etapas
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHideLostStage(!hideLostStage)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      hideLostStage
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-black shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                    }`}
                    title={hideLostStage ? "Mostrar columna y prospectos con estatus Perdido" : "Ocultar columna y prospectos con estatus Perdido"}
                  >
                    {hideLostStage ? <EyeOff className="w-3.5 h-3.5 text-rose-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{hideLostStage ? "Estatus Perdido (Oculto)" : "Ocultar Perdidos"}</span>
                    {hideLostStage && (
                      <span className="text-[10px] bg-rose-200/70 text-rose-800 px-1.5 py-0.2 rounded-full font-mono font-black">
                        {leads.filter(l => l.status === "Perdido" && (typeFilter === "Todos" ? l.type === kanbanPipelineType : l.type === typeFilter)).length}
                      </span>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    Visualizando pipeline de <strong>{kanbanPipelineType === "Institución Potencial" ? "Instituciones" : kanbanPipelineType === "Redes Sociales" ? "Redes Sociales" : "Particulares"}</strong>
                  </span>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={toggleSelectAllLeads}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                      }`}
                      title="Seleccionar o deseleccionar todos los prospectos filtrados para edición o borrado masivo"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>
                        {filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))
                          ? "Deseleccionar Todos"
                          : `Seleccionar Todos (${filteredLeads.length})`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setConfigPipelineType(kanbanPipelineType);
                      setIsConfigModalOpen(true);
                    }}
                    className="text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center shadow-2xs cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Configurar Etapas
                  </button>
                </div>
              </div>

              {/* Kanban Horizontal Columns Scroll Area */}
              <div className="flex gap-4 pb-4 overflow-x-auto w-full min-w-0 items-start">
                {activePipelineStages.filter(col => !hideLostStage || col !== "Perdido").map((column) => {
                  const leadsInCol = filteredLeads.filter(l => l.status === column && (typeFilter === "Todos" ? l.type === kanbanPipelineType : l.type === typeFilter));
                  const sumValue = leadsInCol.reduce((s, curr) => s + curr.value, 0);
                  const badgeColor = getStageBadgeColor(column);
                  const defaultStagesList = kanbanPipelineType === "Persona Potencial"
                    ? DEFAULT_PARTICULAR_STAGES
                    : kanbanPipelineType === "Redes Sociales"
                      ? DEFAULT_REDES_SOCIALES_STAGES
                      : DEFAULT_INSTITUTION_STAGES;
                  const isCoreStage = defaultStagesList.includes(column);

                  return (
                    <div 
                      key={column} 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("leadId");
                        if (draggedId) {
                          handleMoveStatus(draggedId, column);
                        }
                      }}
                      className="w-72 shrink-0 bg-slate-50/80 border border-slate-250 p-3.5 rounded-2xl flex flex-col space-y-3 max-h-[580px]"
                    >
                      
                      {/* Column HeaderInfo */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-150">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${badgeColor}`}>
                              {column}
                            </span>
                            {/* Trash button for custom stage deletion */}
                            {!isCoreStage && (
                              <button
                                onClick={() => handleRemoveStage(column, kanbanPipelineType)}
                                title="Eliminar Etapa Personalizada"
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest block uppercase">
                            ${sumValue.toLocaleString("en-US")} USD
                          </p>
                        </div>
                        <span className="text-xs bg-slate-200/50 text-slate-600 font-black px-2 py-0.5 rounded-full">
                          {leadsInCol.length}
                        </span>
                      </div>

                      {/* Column Card Container list */}
                      <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1 flex-1">
                        {leadsInCol.length > 0 ? (
                          leadsInCol.map((lead) => {
                            const leadTasks = tasks.filter(t => t.leadId?.toString() === lead.id.toString());
                            const slaLimit = getLeadSlaLimit(lead.status);
                            const isInactive = isLeadInactive(lead, leadTasks, slaLimit);
                            const leadStages = getStagesForType(lead.type);
                            const currentStageIdx = leadStages.indexOf(lead.status);
                            const canAdvance = currentStageIdx !== -1 && currentStageIdx < leadStages.length - 1;
                            
                            if (cardViewMode === "compacta") {
                              return (
                                <div
                                  key={lead.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", lead.id);
                                    e.dataTransfer.setData("leadId", lead.id);
                                  }}
                                  className={`bg-white border p-2.5 rounded-xl shadow-2xs hover:shadow-sm transition-all space-y-1.5 group cursor-grab active:cursor-grabbing ${
                                    selectedLeadIds.includes(lead.id)
                                      ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/40 shadow-xs"
                                      : isInactive 
                                        ? "border-rose-300 border-l-3 border-l-rose-500 bg-rose-50/20" 
                                        : "border-slate-200 hover:border-indigo-300"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {isSuperAdmin && (
                                        <input
                                          type="checkbox"
                                          checked={selectedLeadIds.includes(lead.id)}
                                          onChange={() => toggleSelectLead(lead.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                                          title="Seleccionar prospecto para acción masiva"
                                        />
                                      )}
                                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase shrink-0 ${
                                        lead.type === "Persona Potencial" 
                                          ? "bg-slate-100 text-slate-600 border border-slate-200" 
                                          : lead.type === "Redes Sociales"
                                            ? "bg-pink-50 text-pink-700 border border-pink-200"
                                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                      }`}>
                                        {lead.type === "Persona Potencial" ? "Persona" : lead.type === "Redes Sociales" ? "Redes" : "Inst."}
                                      </span>
                                      {lead.idLead && (
                                        <span className="inline-flex px-1.5 py-0.2 rounded font-mono font-bold text-[8.5px] bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                                          {lead.idLead}
                                        </span>
                                      )}
                                      <h5 className="font-bold text-slate-800 text-[11.5px] tracking-tight truncate group-hover:text-indigo-700 transition-colors" title={lead.name}>
                                        {lead.name}
                                      </h5>
                                    </div>
                                    <p className="text-xs font-black text-indigo-600 font-mono shrink-0">
                                      ${lead.value.toLocaleString("en-US")}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 gap-1">
                                    <span className="truncate flex items-center font-medium" title={lead.contactName || "Sin contacto principal"}>
                                      <Users className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" />
                                      {lead.contactName || "Sin contacto"}
                                    </span>
                                    {isInactive ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExecuteSlaActionForLead(lead);
                                        }}
                                        title={`SLA Vencido (${slaLimit}d): ${getLeadSlaRule(lead.status)?.actionOnAlert || 'Alerta en Dashboard'}${getLeadSlaRule(lead.status)?.emailTemplateTitle ? ` [${getLeadSlaRule(lead.status)?.emailTemplateTitle}]` : ''}${getLeadSlaRule(lead.status)?.hasSecondaryAction && getLeadSlaRule(lead.status)?.secondaryAction ? ` + ${getLeadSlaRule(lead.status)?.secondaryAction}` : ''}. Haz clic para ejecutar.`}
                                        className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-extrabold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 animate-pulse shrink-0 gap-0.5 cursor-pointer transition shadow-2xs"
                                      >
                                        <AlertCircle className="w-2.5 h-2.5" /> Sin Act.
                                      </button>
                                    ) : (
                                      <span className="text-[9.5px] text-slate-400 font-medium truncate max-w-[85px]" title={lead.assignedTo ? `Asignado a ${lead.assignedTo}` : "Sin asignar"}>
                                        👤 {lead.assignedTo || "S/A"}
                                      </span>
                                    )}
                                  </div>

                                  {lead.programOfInterest && (
                                    <div className="flex items-center gap-1 text-[8.5px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded-md mt-0.5">
                                      <GraduationCap className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                      <span className="truncate">Prog: <strong className="font-bold">{lead.programOfInterest}</strong></span>
                                    </div>
                                  )}
                                  {lead.englishExamScore && (
                                    <div className="flex items-center gap-1 text-[8.5px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded-md mt-0.5">
                                      <Award className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
                                      <span className="truncate">Inglés: <strong className="font-bold font-mono">{lead.englishExamScore}</strong></span>
                                    </div>
                                  )}

                                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[9.5px]">
                                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]" title={lead.city ? `${lead.city}, ${lead.state || lead.country}` : lead.country}>
                                      📍 {lead.city ? `${lead.city}, ` : ""}{lead.state ? `${lead.state}` : lead.country}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => setViewingLead(lead)}
                                        title="Ver Detalle de la Institución"
                                        className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenNewActivity(lead.id)}
                                        title="Agendar en Agenda"
                                        className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold transition cursor-pointer"
                                      >
                                        <Calendar className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenEditLead(lead)}
                                        title="Editar"
                                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLead(lead.id)}
                                        title="Eliminar"
                                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                      {canAdvance && (
                                        <button
                                          onClick={() => {
                                            handleMoveStatus(lead.id, leadStages[currentStageIdx + 1]);
                                          }}
                                          title={`Avanzar a ${leadStages[currentStageIdx + 1]}`}
                                          className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition cursor-pointer"
                                        >
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick action when in Firma stage */}
                                  {lead.type === "Institución Potencial" && (lead.status === "Firma" || lead.status === "Cierre") && (
                                    <button
                                      type="button"
                                      onClick={() => setPendingFirmaTransition({ lead, isConfirmationFromFirma: true })}
                                      title="Confirmar firma y crear Institución oficial (Avanzar a Cliente)"
                                      className="w-full mt-1.5 py-1 px-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-100" />
                                      <span>Crear Institución</span>
                                    </button>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={lead.id} 
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", lead.id);
                                  e.dataTransfer.setData("leadId", lead.id);
                                }}
                                className={`bg-white border p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all space-y-3 group cursor-grab active:cursor-grabbing ${
                                  selectedLeadIds.includes(lead.id)
                                    ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/30 shadow-indigo-100/50"
                                    : isInactive 
                                      ? "border-rose-300 border-l-4 border-l-rose-500 bg-rose-50/10" 
                                      : "border-slate-200"
                                }`}
                              >
                                <div className="flex justify-between items-start flex-wrap gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isSuperAdmin && (
                                      <input
                                        type="checkbox"
                                        checked={selectedLeadIds.includes(lead.id)}
                                        onChange={() => toggleSelectLead(lead.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                                        title="Seleccionar prospecto para acción masiva"
                                      />
                                    )}
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                      lead.type === "Persona Potencial" 
                                        ? "bg-[#f8fafc] text-slate-600 border border-slate-200" 
                                        : lead.type === "Redes Sociales"
                                          ? "bg-pink-50 text-pink-700 border border-pink-200"
                                          : "bg-indigo-50/60 text-indigo-700 border border-indigo-100"
                                    }`}>
                                      {lead.type === "Persona Potencial" ? "Persona" : lead.type === "Redes Sociales" ? "Redes Sociales" : "Institución"}
                                    </span>
                                    {isInactive && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExecuteSlaActionForLead(lead);
                                        }}
                                        title={`SLA Vencido (${slaLimit}d): ${getLeadSlaRule(lead.status)?.actionOnAlert || 'Alerta en Dashboard'}${getLeadSlaRule(lead.status)?.emailTemplateTitle ? ` [${getLeadSlaRule(lead.status)?.emailTemplateTitle}]` : ''}${getLeadSlaRule(lead.status)?.hasSecondaryAction && getLeadSlaRule(lead.status)?.secondaryAction ? ` + ${getLeadSlaRule(lead.status)?.secondaryAction}` : ''}. Haz clic para ejecutar.`}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 gap-1 animate-pulse cursor-pointer transition shadow-2xs"
                                      >
                                        <AlertCircle className="w-2.5 h-2.5" /> Sin Actividad
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs font-black text-indigo-600 font-mono">${lead.value.toLocaleString("en-US")} USD</p>
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {lead.idLead && (
                                      <span className="inline-flex px-1.5 py-0.2 rounded font-mono font-bold text-[8.5px] bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                                        {lead.idLead}
                                      </span>
                                    )}
                                    <h5 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                      {lead.name}
                                    </h5>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center">
                                    <Users className="w-3 h-3 mr-1 opacity-60 shrink-0" /> {lead.contactName || "Sin contacto principal"}
                                  </p>
                                  {lead.phone && (
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                                      <Phone className="w-3 h-3 mr-1 opacity-60 shrink-0" /> {lead.phone}
                                    </p>
                                  )}
                                  {lead.website && lead.type !== "Persona Potencial" && (
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5 truncate">
                                      <span className="mr-1 text-xs opacity-60 shrink-0">🌐</span>
                                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-650 font-medium truncate">
                                        {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                                      </a>
                                    </p>
                                  )}
                                  {(lead.gradeToTake || lead.creditsToTake) && (
                                    <div className="flex items-center gap-1 flex-wrap mt-1">
                                      {lead.gradeToTake && (
                                        <span className="inline-flex items-center gap-1 text-[8px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                                          <GraduationCap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                          <span>Grado: <strong>{lead.gradeToTake}</strong></span>
                                        </span>
                                      )}
                                      {lead.creditsToTake && (
                                        <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md font-semibold">
                                          <BookOpen className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                          <span>Créditos: <strong>{lead.creditsToTake}</strong></span>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {lead.contacts && lead.contacts.length > 0 && (
                                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[9px]">
                                      <span className="text-indigo-650 font-bold flex items-center">
                                        <Users className="w-2.5 h-2.5 mr-1 text-indigo-500 shrink-0" /> {lead.contacts.length} {lead.contacts.length === 1 ? "contacto adicional" : "contactos adicionales"}
                                      </span>
                                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold text-[8px]">
                                        + Ver
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {lead.englishExamScore && (
                                  <div className="mt-1.5 p-1.5 bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200 rounded-lg flex items-center justify-between text-[10px]">
                                    <span className="text-cyan-900 font-bold flex items-center gap-1">
                                      <Award className="w-3 h-3 text-cyan-600 shrink-0" />
                                      Examen Inglés:
                                    </span>
                                    <span className="bg-white text-cyan-950 font-black font-mono px-2 py-0.5 rounded border border-cyan-200 shadow-2xs">
                                      {lead.englishExamScore}
                                    </span>
                                  </div>
                                )}

                                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[10px] text-slate-500">
                                  <span>Asignado: <strong className="font-bold text-slate-600">{lead.assignedTo || "S/A"}</strong></span>
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold truncate max-w-[120px]" title={lead.state || lead.country}>
                                    {lead.city ? `${lead.city}, ` : ""}{lead.state ? `${lead.state}` : lead.country}
                                  </span>
                                </div>

                              {/* Kanban Quick controls */}
                              <div className="pt-2 border-t border-dashed border-slate-150 flex justify-between items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setViewingLead(lead)}
                                  title="Ver Ficha Técnica de la Institución"
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center transition shadow-xs cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver Detalle
                                </button>
                                <button 
                                  onClick={() => handleOpenNewActivity(lead.id)}
                                  title="Programar Llamada o Recordatorio en la Agenda"
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1 rounded transition cursor-pointer"
                                >
                                  <Calendar className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleOpenEditLead(lead)}
                                  title="Editar Prospecto"
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1 rounded transition cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteLead(lead.id)}
                                  title="Eliminar Prospecto"
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                
                                {/* Advance State directly button */}
                                {canAdvance && (
                                  <button 
                                    onClick={() => {
                                      handleMoveStatus(lead.id, leadStages[currentStageIdx + 1]);
                                    }}
                                    title={`Avanzar a ${leadStages[currentStageIdx + 1]}`}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded transition cursor-pointer"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Prominent Action Button for Institutions in Firma stage */}
                              {lead.type === "Institución Potencial" && (lead.status === "Firma" || lead.status === "Cierre") && (
                                <button
                                  type="button"
                                  onClick={() => setPendingFirmaTransition({ lead, isConfirmationFromFirma: true })}
                                  title="Confirmar firma y crear Institución oficial (Avanzar a Cliente)"
                                  className="w-full mt-2 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
                                  <span>Confirmar Firma y Crear Institución</span>
                                </button>
                              )}
                            </div>
                          );
                        })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <Clock className="w-5 h-5 text-slate-300 animate-spin" />
                            <p className="text-[10px] text-slate-400 italic text-center mt-2 px-4 leading-relaxed">Sin prospectos en este estado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Special Column to add custom stages */}
                <div className="w-72 shrink-0 bg-white border border-dashed border-slate-300 hover:border-indigo-400 p-5 rounded-2xl flex flex-col space-y-4 justify-center items-center h-[280px] transition-colors leading-relaxed group shadow-sm bg-slate-50/10">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <h6 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Añadir Etapa</h6>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Crea nuevos estados de negociación para {kanbanPipelineType === "Institución Potencial" ? "Instituciones" : kanbanPipelineType === "Redes Sociales" ? "Redes Sociales" : "Particulares"}.</p>
                  </div>
                  <div className="w-full space-y-2 pt-1">
                    <input 
                      type="text"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Ej. Diagnóstico Especial..."
                      className="w-full bg-white border border-slate-250 outline-none rounded-xl p-2 h-9 text-xs text-slate-700 hover:border-slate-300 focus:border-indigo-500 font-sans shadow-sm"
                    />
                    <button
                      onClick={() => handleAddStage(kanbanPipelineType)}
                      disabled={!newStageName.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-750 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold h-9 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center shadow-md shadow-indigo-600/10"
                    >
                      + Agregar a {kanbanPipelineType === "Institución Potencial" ? "Instituciones" : kanbanPipelineType === "Redes Sociales" ? "Redes Sociales" : "Particulares"}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DETAILED LIST (TABULAR) */}
          {activeTab === "Tabla" && (
            <>
              {/* BANNER DE ÉXITO MASIVO */}
              {showBulkSuccessBanner && bulkAppliedSummary && (
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-350 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-500 rounded-lg text-white shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-emerald-950 font-bold text-sm">¡Cambios Masivos Aplicados Exitosamente!</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBulkSuccessBanner(false);
                            setBulkAppliedSummary(null);
                          }}
                          className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/50 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-emerald-800 text-[11.5px] mt-1 leading-relaxed">
                        Se han actualizado correctamente los datos clave de <strong>{bulkAppliedSummary.count}</strong> instituciones/prospectos seleccionados.
                      </p>
                      
                      <div className="mt-3 bg-white/70 p-2.5 rounded-lg border border-emerald-100/50 max-w-2xl">
                        <p className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest mb-1.5 font-mono">Detalle de los cambios:</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {bulkAppliedSummary.fields.map((f, i) => (
                            <div key={i} className="text-xs text-emerald-800">
                              <span className="font-semibold text-emerald-950">{f.field}:</span> {f.value}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-emerald-600 italic mt-2 border-t border-emerald-100/30 pt-1.5 font-sans">
                          Afectados: {bulkAppliedSummary.leadNames.slice(0, 5).join(", ")}
                          {bulkAppliedSummary.leadNames.length > 5 ? ` y ${bulkAppliedSummary.leadNames.length - 5} instituciones más.` : "."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL DE CONFIRMACIÓN MASIVA */}
              {showBulkConfirmModal && bulkAppliedSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between pb-3.5 border-b border-rose-100/10">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-slate-900 font-black text-sm uppercase tracking-wide">Confirmar Edición Masiva</h3>
                          <p className="text-slate-500 text-[10.5px] font-medium mt-0.5">Revisa cuidadosamente los valores antes de aplicar los cambios.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBulkConfirmModal(false)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="py-4 space-y-3.5">
                      <div className="bg-amber-50/50 border border-amber-100/60 p-3 rounded-xl text-slate-705 text-xs leading-relaxed">
                        Estás a punto de modificar un total de <strong className="text-amber-900 font-extrabold">{bulkAppliedSummary.count}</strong> registros seleccionados. Esta operación reemplazará los valores actuales.
                      </div>

                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">CAMPOS QUE SE ACTUALIZARÁN:</h5>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-[8.5px] text-slate-400 font-bold uppercase">
                              <th className="pb-1 w-[40%]">Campo de CRM</th>
                              <th className="pb-1 w-[60%]">Nuevo Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {bulkAppliedSummary.fields.map((f, i) => (
                              <tr key={i} className="py-1">
                                <td className="py-1.5 font-bold text-slate-500">{f.field}</td>
                                <td className="py-1.5 text-indigo-700 font-bold font-mono text-[11.5px]">{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1.5">
                          INSTITUCIONES SELECCIONADAS ({bulkAppliedSummary.count})
                        </h5>
                        <div className="max-h-[110px] overflow-y-auto border border-slate-150 rounded-xl p-2 bg-slate-50/30 text-[10.5px] text-slate-600 space-y-1 divide-y divide-slate-100 font-mono">
                          {bulkAppliedSummary.leadNames.map((name, index) => (
                            <div key={index} className="pt-1.5 first:pt-0 pb-1.5 flex items-center justify-between">
                              <span className="font-semibold text-slate-700">
                                {index + 1}. {name}
                              </span>
                              <span className="bg-amber-50 text-amber-700 text-[7.5px] font-extrabold px-1.5 rounded uppercase shrink-0">Cambiar</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowBulkConfirmModal(false)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={executeBulkUpdate}
                        className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar y Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedLeadIds.length > 0 && (
                <div className="bg-indigo-50/80 border border-indigo-150 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white font-black text-xs h-6 w-6 rounded-full flex items-center justify-center shadow-sm">
                        {selectedLeadIds.length}
                      </div>
                      <div>
                        <h4 className="text-slate-850 font-bold text-sm">Cambios Masivos Seleccionados</h4>
                        <p className="text-slate-500 text-[10px] font-medium font-sans">
                          Aplica cambios a todos los registros seleccionados en una sola acción. Deja en blanco los campos que no deseas modificar.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkEditModal(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        title="Abrir modal completo de modificaciones masivas"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Modificaciones Masivas</span>
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowBulkDeleteModal(true)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-rose-500/50"
                          title="Eliminar permanentemente todos los prospectos seleccionados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar Masivo ({selectedLeadIds.length})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartBulkFromTableSelection(selectedLeadIds)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        title="Redactar y enviar correo masivo a todos los prospectos seleccionados"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar Correo Masivo ({selectedLeadIds.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedLeadIds([])}
                        className="px-2.5 py-1.5 text-slate-650 hover:text-slate-800 font-bold text-xs bg-white border border-slate-200 rounded-lg hover:shadow-sm transition cursor-pointer"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>

                  {/* Advanced inline Form Grid for quick entry */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-indigo-100">
                    {/* 1. Agente Responsable */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agente Responsable</label>
                      <select
                        value={bulkUpdateForm.assignedTo}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        <option value="Admin Global">Admin Global</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Estatus del Pipeline */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estatus Pipeline</label>
                      <select
                        value={bulkUpdateForm.status}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        {allPipelineStages.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Origen */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Origen</label>
                      <select
                        value={bulkUpdateForm.source}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      >
                        <option value="">-- Sin cambios --</option>
                        <option value="Recomendación">Recomendación</option>
                        <option value="Feria Educativa">Feria Educativa</option>
                        <option value="Campaña Digital">Campaña Digital</option>
                        <option value="Llamada Fría">Llamada Fría</option>
                        <option value="LinkedIn">LinkedIn Sales</option>
                      </select>
                    </div>

                    {/* 4. Ciudad */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ciudad</label>
                      <input
                        type="text"
                        placeholder="Ej. Guadalajara"
                        value={bulkUpdateForm.city}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>

                    {/* 5. Estado */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                      <input
                        type="text"
                        placeholder="Ej. Jalisco"
                        value={bulkUpdateForm.state}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>

                    {/* 6. País */}
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">País</label>
                      <input
                        type="text"
                        placeholder="Ej. México"
                        value={bulkUpdateForm.country}
                        onChange={e => setBulkUpdateForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full border border-slate-200 bg-white rounded-lg p-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-semibold shadow-inner-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3.5 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={initiateBulkUpdateConfirm}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm hover:shadow-indigo-600/10 cursor-pointer"
                    >
                      Confirmar y Aplicar Cambios
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs table-fixed">
                    <thead className="bg-[#0f172a] text-slate-300 text-[9px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-2 text-center w-[5%]">
                          <input
                            type="checkbox"
                            checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                            onChange={toggleSelectAllLeads}
                            className="h-3.5 w-3.5 text-indigo-100 border-slate-500 bg-slate-800 rounded cursor-pointer focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-2 py-2 w-[32%]">Prospecto / Cliente / Origen</th>
                        <th className="px-2 py-2 w-[33%]">Contacto & Responsable</th>
                        <th className="px-2 py-2 text-center w-[10%]">Estatus</th>
                        <th className="px-2 py-2 text-right w-[10%]">Valor Estimado</th>
                        <th className="px-2 py-2 text-center w-[10%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredLeads.length > 0 ? (
                        filteredLeads.map((lead) => {
                          let badgeColor = "bg-slate-100 text-slate-600";
                          if (lead.status === "Leads" || lead.status === "Captación") badgeColor = "bg-sky-50 text-sky-700 border border-sky-150";
                          if (lead.status === "Primer contacto" || lead.status === "Primer Filtro") badgeColor = "bg-blue-50 text-blue-700 border border-blue-150";
                          if (lead.status === "Presentación" || lead.status === "Demostración") badgeColor = "bg-purple-50 text-purple-700 border border-purple-150";
                          if (lead.status === "Examen Inglés") badgeColor = "bg-cyan-50 text-cyan-700 border border-cyan-150";
                          if (lead.status === "Pago") badgeColor = "bg-violet-50 text-violet-700 border border-violet-150";
                          if (lead.status === "Malla curricular y boletines") badgeColor = "bg-indigo-50 text-indigo-700 border border-indigo-150";
                          if (lead.status.includes("Diagnostico") || lead.status.includes("Diagnóstico") || lead.status === "Propuesta") badgeColor = "bg-amber-50 text-amber-700 border border-amber-150";
                          if (lead.status === "Revisión") badgeColor = "bg-orange-50 text-orange-700 border border-orange-150";
                          if (lead.status === "Firma" || lead.status === "Cierre") badgeColor = "bg-teal-50 text-teal-700 border border-teal-150";
                          if (lead.status === "Cliente") badgeColor = "bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold";
                          if (lead.status === "Sin Interes") badgeColor = "bg-slate-100 text-slate-600 border border-slate-200";
                          if (lead.status === "Futuro") badgeColor = "bg-teal-50 text-teal-700 border border-teal-150";
                          if (lead.status === "Perdido") badgeColor = "bg-rose-50 text-rose-700 border border-rose-150";

                          const leadTasks = tasks.filter(t => t.leadId?.toString() === lead.id.toString());
                          const slaLimit = getLeadSlaLimit(lead.status);
                          const isInactive = isLeadInactive(lead, leadTasks, slaLimit);

                          return (
                            <tr key={lead.id} className={`hover:bg-indigo-50/15 transition-all text-slate-705 ${isInactive ? 'bg-rose-50/25 border-l-2 border-l-rose-500' : ''}`}>
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.includes(lead.id)}
                                  onChange={() => toggleSelectLead(lead.id)}
                                  className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded cursor-pointer focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2 leading-tight">
                              <div className="space-y-0.5 max-w-full overflow-hidden">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setViewingLead(lead)}
                                    className="font-bold text-indigo-600 hover:text-indigo-800 text-xs flex items-center flex-wrap gap-1 cursor-pointer text-left focus:outline-none group/name truncate"
                                    title="Ver Ficha Técnica de la Institución"
                                  >
                                    {lead.type === "Institución Potencial" ? (
                                      <Building2 className="w-3 h-3 text-indigo-550 shrink-0 group-hover/name:scale-110 transition-transform" />
                                    ) : lead.type === "Redes Sociales" ? (
                                      <Share2 className="w-3 h-3 text-pink-500 shrink-0 group-hover/name:scale-110 transition-transform" />
                                    ) : (
                                      <Users className="w-3 h-3 text-slate-500 shrink-0 group-hover/name:scale-110 transition-transform" />
                                    )}
                                    {lead.idLead && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono font-bold text-[8.5px] bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
                                        {lead.idLead}
                                      </span>
                                    )}
                                    <span className="underline decoration-indigo-200 group-hover/name:decoration-indigo-600 decoration-1.5 underline-offset-1 truncate">{lead.name}</span>
                                  </button>
                                  {isInactive && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExecuteSlaActionForLead(lead);
                                      }}
                                      title={`SLA Vencido (${slaLimit}d): ${getLeadSlaRule(lead.status)?.actionOnAlert || 'Alerta en Dashboard'}${getLeadSlaRule(lead.status)?.emailTemplateTitle ? ` [${getLeadSlaRule(lead.status)?.emailTemplateTitle}]` : ''}${getLeadSlaRule(lead.status)?.hasSecondaryAction && getLeadSlaRule(lead.status)?.secondaryAction ? ` + ${getLeadSlaRule(lead.status)?.secondaryAction}` : ''}. Haz clic para ejecutar.`}
                                      className="inline-flex items-center px-1 py-0.5 rounded text-[7px] font-extrabold uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 gap-0.5 shrink-0 animate-pulse cursor-pointer transition"
                                    >
                                      <AlertCircle className="w-1.5 h-1.5" /> Sin Actividad
                                    </button>
                                  )}
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium font-mono truncate">
                                  {lead.type} • {lead.country}{lead.state ? `, ${lead.state}` : ""}
                                </p>
                                <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500">
                                  {lead.website && lead.type !== "Persona Potencial" && (
                                    <a 
                                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-indigo-650 hover:underline hover:text-indigo-850 inline-flex items-center gap-0.5 font-semibold truncate"
                                    >
                                      🌐 {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                                    </a>
                                  )}
                                  {lead.website && lead.type !== "Persona Potencial" && <span className="text-slate-300">•</span>}
                                  <span className="truncate">Origen: <strong>{lead.source}</strong></span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 leading-tight">
                              <div className="space-y-0.5 max-w-full overflow-hidden">
                                <p className="font-bold text-slate-800 text-[11px] truncate">{lead.contactName}</p>
                                <p className="text-[9px] text-slate-400 font-mono truncate">{lead.email}</p>
                                <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500">
                                  <span className="truncate">Agente: <strong className="text-slate-700">{lead.assignedTo || "Sin asignar"}</strong></span>
                                  {lead.address && <span className="text-slate-350">•</span>}
                                  {lead.address && (
                                    <span className="italic truncate" title={lead.address}>📍 {lead.address}</span>
                                  )}
                                </div>
                                {lead.programOfInterest && (
                                  <div className="mt-1 flex items-center gap-1 text-[8px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded-md w-fit font-semibold">
                                    <GraduationCap className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span>Programa: <strong className="font-bold text-indigo-950">{lead.programOfInterest}</strong></span>
                                  </div>
                                )}
                                {(lead.gradeToTake || lead.creditsToTake) && (
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    {lead.gradeToTake && (
                                      <span className="inline-flex items-center gap-1 text-[8px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                                        <GraduationCap className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span>Grado: <strong className="font-bold text-amber-950">{lead.gradeToTake}</strong></span>
                                      </span>
                                    )}
                                    {lead.creditsToTake && (
                                      <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md font-semibold">
                                        <BookOpen className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                        <span>Créditos: <strong className="font-bold text-emerald-950">{lead.creditsToTake}</strong></span>
                                      </span>
                                    )}
                                  </div>
                                )}
                                {lead.englishExamScore && (
                                  <div className="mt-1 flex items-center gap-1 text-[8px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded-md w-fit font-semibold">
                                    <Award className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
                                    <span>Calificación Inglés: <strong className="font-bold font-mono text-cyan-950">{lead.englishExamScore}</strong></span>
                                  </div>
                                )}
                                {lead.contacts && lead.contacts.length > 0 && (
                                  <div className="mt-0.5 pt-0.5 border-t border-slate-100">
                                    <span className="text-[7.5px] text-indigo-600 font-bold uppercase tracking-wider block">Contactos ({lead.contacts.length}):</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {lead.contacts.slice(0, 2).map((c, idx) => (
                                        <span key={idx} className="bg-slate-50 text-slate-600 text-[7.5px] px-1 py-0.2 rounded border border-slate-100 inline-block font-sans truncate max-w-[120px]">
                                          {c.name} ({c.role})
                                        </span>
                                      ))}
                                      {lead.contacts.length > 2 && (
                                        <span className="text-slate-400 text-[7.5px] font-bold">+{lead.contacts.length - 2}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                {lead.status}
                              </span>
                              <div className="mt-1">
                                <span className="inline-block text-[7.5px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded" title={`Indicador SLA: ${getLeadSlaIndicator(lead.status)} (${slaLimit} días límite)`}>
                                  {getLeadSlaIndicator(lead.status)} ({slaLimit}d)
                                </span>
                              </div>
                              {lead.type === "Persona Potencial" && lead.status === "Pago" && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentConfirmModal(lead)}
                                  className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8px] uppercase tracking-wider transition cursor-pointer shadow-2xs"
                                >
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>Cobrar</span>
                                </button>
                              )}
                              {lead.type === "Persona Potencial" && lead.mallaPaymentStatus === "Pagado" && (
                                <div className="mt-0.5">
                                  <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded text-[7.5px] font-bold">
                                    ✓ Pagado
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <p className="font-bold text-indigo-650 text-[10.5px] font-mono">${lead.value.toLocaleString("en-US")}</p>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1 shrink-0">
                                {lead.type === "Institución Potencial" && (lead.status === "Firma" || lead.status === "Cierre") && (
                                  <button 
                                    type="button"
                                    onClick={() => setPendingFirmaTransition({ lead, isConfirmationFromFirma: true })}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide transition shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Confirmar firma y crear Institución oficial (Pasar a Cliente)"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Crear Inst.</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => setViewingLead(lead)}
                                  className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wide transition shrink-0 flex items-center gap-1 cursor-pointer"
                                  title="Ver Ficha Técnica"
                                >
                                  <Eye className="w-3 h-3 text-indigo-600" />
                                  <span>Detalle</span>
                                </button>
                                <button 
                                  onClick={() => handleOpenNewActivity(lead.id)}
                                  className="text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 p-0.5 rounded transition shrink-0 cursor-pointer"
                                  title="Agendar en Agenda"
                                >
                                  <Calendar className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleOpenEditLead(lead)}
                                  className="text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-0.5 rounded transition shrink-0"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="text-rose-650 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-300 p-0.5 rounded transition shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-medium italic">
                          No se encontraron prospectos que coincidan con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* TAB 3: IMPORTACIÓN GOOGLE SHEETS & CSV */}
          {activeTab === "Importar" && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Success Notification Banner */}
              {importSuccessBanner && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold">{importSuccessBanner}</span>
                  </div>
                  <button 
                    onClick={() => setImportSuccessBanner(null)}
                    className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Main Import Selector Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight">Importación de Contactos al CRM</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Importa prospectos e instituciones de forma automática desde Google Sheets o planillas CSV con mapeo inteligente de columnas.
                      </p>
                    </div>
                  </div>

                  {/* Sub-tab Navigation */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setImportSubTab('sheets-url')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        importSubTab === 'sheets-url'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Google Sheets (Enlace)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSubTab('sheets-paste')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        importSubTab === 'sheets-paste'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Pegar Celdas (Ctrl+V)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSubTab('csv-file')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        importSubTab === 'csv-file'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Archivo CSV / Excel
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Google Sheets URL Direct Sync */}
                {importSubTab === 'sheets-url' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Enlace de la Hoja de Google Sheets
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={googleSheetsUrl}
                            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full pl-3.5 pr-24 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                          />
                          <a
                            href={googleSheetsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-50 transition"
                            title="Abrir en Google Drive"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFetchGoogleSheets('url')}
                          disabled={isFetchingSheets || !googleSheetsUrl.trim()}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                        >
                          {isFetchingSheets ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Extrayendo...</span>
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="w-4 h-4" />
                              <span>Conectar y Extraer Contactos</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">
                        El sistema lee automáticamente los nombres de las columnas ("Nombre", "Contacto", "Correo", "Teléfono", "Ciudad", etc.) para asociar los datos en el CRM.
                      </p>
                    </div>

                    {/* Google Sheets Permission Guidance Card (When Restricted or Error) */}
                    {sheetsFetchError && (
                      <div className="bg-amber-50/70 border border-amber-250 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                              {sheetsFetchError.isRestricted ? "Acceso Restringido en Google Drive" : "Atención con el Enlace"}
                            </h4>
                            <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                              {sheetsFetchError.message}
                            </p>
                          </div>
                        </div>

                        {sheetsFetchError.isRestricted && (
                          <div className="bg-white/90 border border-amber-200 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-800">
                              Pasos para habilitar la sincronización directa en Google Sheets:
                            </p>
                            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                              <li>Abre tu hoja en Google Sheets con el botón <strong>"Abrir"</strong> en la parte superior.</li>
                              <li>Haz clic en el botón azul <strong className="text-indigo-600">"Compartir"</strong> ubicado en la esquina superior derecha de Google Sheets.</li>
                              <li>Bajo <strong>"Acceso general"</strong>, cambia la opción de <em>"Restringido"</em> a <strong className="text-emerald-700">"Cualquier persona con el enlace"</strong> (con permiso de <em>Lector</em>).</li>
                              <li>Presiona <strong>"Listo"</strong> en Google Sheets y regresa aquí a presionar <strong className="text-emerald-700">"Conectar y Extraer Contactos"</strong>.</li>
                            </ol>

                            <div className="pt-2 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <span className="text-[11px] text-slate-500 font-medium">
                                ¿No tienes permisos de administrador para cambiar el enlace?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setImportSubTab('sheets-paste');
                                  setSheetsFetchError(null);
                                }}
                                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Usar opción directa: Copiar y Pegar Celdas
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Direct Cell Paste (Ctrl+C from Sheets, Ctrl+V here) */}
                {importSubTab === 'sheets-paste' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-1.5">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Método directo sin cambiar permisos de Google Drive:
                      </p>
                      <p className="text-slate-500">
                        1. Abre tu hoja de Google Sheets en tu navegador.
                        <br />
                        2. Selecciona con el cursor las celdas que deseas importar (incluyendo la fila de títulos si la tienes) y presiona <strong className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">Ctrl + C</strong> (o Cmd+C en Mac).
                        <br />
                        3. Haz clic en el área inferior y presiona <strong className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">Ctrl + V</strong>.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Pega aquí los datos copiados de Google Sheets:
                      </label>
                      <textarea
                        value={sheetsPastedText}
                        onChange={(e) => setSheetsPastedText(e.target.value)}
                        placeholder={`Nombre Institución\tContacto\tEmail\tTelefono\tCiudad\nColegio San Patricio\tLic. Andrea Ruiz\tandrea@sanpatricio.edu.mx\t5512345678\tMonterrey\nInstituto Cumbres\tIng. Roberto Garza\troberto@cumbres.edu.mx\t8123456789\tGuadalajara`}
                        rows={7}
                        className="w-full p-3.5 bg-slate-50 border border-slate-250 rounded-xl font-mono text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition whitespace-pre overflow-x-auto"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Detecta automáticamente columnas separadas por tabuladores de Google Sheets o comas.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFetchGoogleSheets('paste')}
                        disabled={isFetchingSheets || !sheetsPastedText.trim()}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        {isFetchingSheets ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Procesar Celdas Copiadas</span>
                          </>
                        )}
                      </button>
                    </div>

                    {sheetsFetchError && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 font-medium">
                        {sheetsFetchError.message}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 3: CSV File Upload */}
                {importSubTab === 'csv-file' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Plantilla CSV oficial del CRM</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Descarga nuestra plantilla prediseñada con todas las columnas recomendadas.</p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadCrmTemplate}
                        className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        Descargar Plantilla CSV
                      </button>
                    </div>

                    {/* Upload Dropzone */}
                    <div className="bg-white border border-slate-250 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center border-dashed relative hover:border-indigo-400 hover:bg-indigo-50/5 transition group">
                      <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Cargar planilla CSV de Prospectos</h4>
                      <p className="text-[11px] text-slate-400 mt-1 mb-4">Soporta archivos codificados en .csv (Unicode, UTF-8)</p>
                      
                      <label className="bg-indigo-600 hover:bg-indigo-750 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow-md">
                        Seleccionar Archivo
                        <input 
                          type="file" 
                          accept=".csv"
                          onChange={handleCrmTemplateUpload}
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {/* CSV Import Results Report */}
                    {importReport && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-120 uppercase">
                            Resultado de última importación CSV
                          </span>
                          <button 
                            onClick={() => setImportReport(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 transition cursor-pointer"
                          >
                            Cerrar Reporte
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-center">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Registros Detectados</span>
                            <span className="text-xl font-mono font-black text-slate-700 mt-1 block">{importReport.total}</span>
                          </div>
                          <div className="bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-150 text-center">
                            <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Prospectos Importados</span>
                            <span className="text-xl font-mono font-black text-emerald-700 mt-1 block">✓ {importReport.success}</span>
                          </div>
                          <div className={`p-3.5 rounded-xl border text-center ${importReport.errors.length > 0 ? "bg-rose-50/20 border-rose-200" : "bg-slate-50/50 border-slate-200"}`}>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${importReport.errors.length > 0 ? "text-rose-600" : "text-slate-400"}`}>Errores de Validación</span>
                            <span className={`text-xl font-mono font-black mt-1 block ${importReport.errors.length > 0 ? "text-rose-700" : "text-slate-500"}`}>{importReport.errors.length}</span>
                          </div>
                        </div>

                        {importReport.errors.length > 0 && (
                          <div className="border border-rose-200 bg-rose-50/5 rounded-xl overflow-hidden mt-3 max-h-56 overflow-y-auto">
                            <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 text-xs font-extrabold text-rose-800 uppercase tracking-wider">
                              Detalle de filas rechazadas
                            </div>
                            <div className="divide-y divide-rose-100 text-xs text-sans">
                              {importReport.errors.map((err, idx) => (
                                <div key={idx} className="p-3 bg-white hover:bg-rose-50/10 transition-all">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="bg-slate-750 text-slate-100 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                      Fila #{err.rowNum}
                                    </span>
                                    <span className="text-rose-700 font-bold bg-rose-100/65 px-2 py-0.5 rounded text-[10px]">
                                      {err.msg}
                                    </span>
                                  </div>
                                  <p className="bg-slate-50 p-2 border border-slate-150 rounded font-mono text-[9px] text-slate-500 overflow-x-auto">
                                    {err.data}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {importReport.success > 0 && (
                          <div className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-150 p-4 rounded-xl text-xs text-emerald-800 leading-relaxed font-semibold">
                            🎉 ¡Registro Completado! Se han agregado {importReport.success} registros exitosamente a la base local del CRM.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Preview Table & Confirmation Section */}
              {parsedPreviewLeads.length > 0 && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          Vista Previa de Contactos
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                          Total en Hoja: {parsedPreviewLeads.length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Nuevos para Importar: {parsedPreviewLeads.filter(l => !l.isDuplicate).length}
                        </span>
                        {parsedPreviewLeads.some(l => l.isDuplicate) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-250">
                            Duplicados Omitidos: {parsedPreviewLeads.filter(l => l.isDuplicate).length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Solo se importarán los contactos <strong>nuevos</strong> al CRM. Los duplicados se descartan automáticamente para evitar registros repetidos.
                      </p>
                    </div>

                    {/* Target Pipeline & Stage Settings */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Tipo de Prospecto
                        </label>
                        <select
                          value={targetImportType}
                          onChange={(e) => setTargetImportType(e.target.value as any)}
                          className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="Institución Potencial">Institución Potencial (B2B)</option>
                          <option value="Persona Potencial">Persona Potencial (B2C)</option>
                          <option value="Redes Sociales">Redes Sociales</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Etapa Inicial
                        </label>
                        <select
                          value={targetImportStage}
                          onChange={(e) => setTargetImportStage(e.target.value)}
                          className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          {getStagesForType(targetImportType).map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Detected Mappings Indicator */}
                  {detectedColumns && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Columnas Detectadas:</span>
                      {detectedColumns.idLead && (
                        <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 font-mono font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          ID Lead: <strong>{detectedColumns.idLead}</strong>
                        </span>
                      )}
                      {detectedColumns.name && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                          Nombre: <strong>{detectedColumns.name}</strong>
                        </span>
                      )}
                      {detectedColumns.contactName && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                          Contacto: <strong>{detectedColumns.contactName}</strong>
                        </span>
                      )}
                      {detectedColumns.email && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                          Correo: <strong>{detectedColumns.email}</strong>
                        </span>
                      )}
                      {detectedColumns.phone && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                          Teléfono: <strong>{detectedColumns.phone}</strong>
                        </span>
                      )}
                      {detectedColumns.city && (
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                          Ciudad: <strong>{detectedColumns.city}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Optional Column Re-Mapping Selectors */}
                  {sheetHeaders.length > 0 && (
                    <div className="bg-indigo-50/30 border border-indigo-150/80 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-black text-[10.5px] text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-indigo-600" />
                          Ajustar Mapeo de Columnas (Si tu tabla usa otros títulos)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Cambia la columna correspondiente y la vista previa se actualizará en tiempo real
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Columna ID Lead (Código / Folio):
                          </label>
                          <select
                            value={selectedColumnMapping.idLead}
                            onChange={(e) => handleOverrideColumnMapping('idLead', e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- Sin ID Lead --</option>
                            {sheetHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Columna Nombre / Institución:
                          </label>
                          <select
                            value={selectedColumnMapping.name}
                            onChange={(e) => handleOverrideColumnMapping('name', e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                          >
                            {sheetHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Columna Contacto Principal:
                          </label>
                          <select
                            value={selectedColumnMapping.contactName}
                            onChange={(e) => handleOverrideColumnMapping('contactName', e.target.value)}
                            className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- Sin Contacto --</option>
                            {sheetHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  {(() => {
                    const newIndices = parsedPreviewLeads.map((l, i) => (!l.isDuplicate ? i : -1)).filter(i => i !== -1);
                    const allNewSelected = newIndices.length > 0 && newIndices.every(i => previewSelectedIndices.includes(i));
                    const duplicateCount = parsedPreviewLeads.filter(l => l.isDuplicate).length;

                    return (
                      <>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                                <th className="p-3 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allNewSelected}
                                    disabled={newIndices.length === 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setPreviewSelectedIndices(newIndices);
                                      } else {
                                        setPreviewSelectedIndices([]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                                    title={newIndices.length === 0 ? "No hay prospectos nuevos para seleccionar" : "Seleccionar todos los prospectos nuevos"}
                                  />
                                </th>
                                <th className="p-3 w-28">ID Lead</th>
                                <th className="p-3">Nombre / Institución</th>
                                <th className="p-3">Contacto</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Ciudad / País</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {parsedPreviewLeads.map((lead, idx) => {
                                const isSelected = previewSelectedIndices.includes(idx);
                                const isDup = lead.isDuplicate;

                                if (isDup) {
                                  return (
                                    <tr
                                      key={idx}
                                      className="bg-amber-50/20 text-slate-500 hover:bg-amber-50/30 transition opacity-80"
                                      title={lead.duplicateReason || "Prospecto duplicado"}
                                    >
                                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={false}
                                          disabled={true}
                                          className="rounded border-slate-300 text-slate-300 opacity-40 cursor-not-allowed"
                                        />
                                      </td>
                                      <td className="p-3 font-mono text-[11px]">
                                        {lead.idLead ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-slate-100 border border-slate-200 text-slate-600">
                                            {lead.idLead}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 font-sans text-xs">—</span>
                                        )}
                                      </td>
                                      <td className="p-3 font-semibold text-slate-700">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="line-through decoration-slate-400 text-slate-600">{lead.name || "Sin Nombre"}</span>
                                          <span className="inline-flex items-center gap-1 w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-250">
                                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                            Duplicado: {lead.duplicateReason}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-slate-500">
                                        {lead.contactName || "—"}
                                      </td>
                                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                                        {lead.email || "—"}
                                      </td>
                                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                                        {lead.phone || "—"}
                                      </td>
                                      <td className="p-3 text-slate-400">
                                        {lead.city ? `${lead.city}, ${lead.country}` : lead.country || "—"}
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr
                                    key={idx}
                                    onClick={() => {
                                      setPreviewSelectedIndices(prev =>
                                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                      );
                                    }}
                                    className={`transition cursor-pointer ${
                                      isSelected ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "bg-white hover:bg-slate-50 opacity-60"
                                    }`}
                                  >
                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          setPreviewSelectedIndices(prev =>
                                            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                          );
                                        }}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-mono text-[11px]">
                                      {lead.idLead ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                                          {lead.idLead}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 font-sans text-xs">—</span>
                                      )}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">
                                      <div className="flex items-center gap-1.5">
                                        <span>{lead.name || "Sin Nombre"}</span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                          Nuevo
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-slate-600">
                                      {lead.contactName || "—"}
                                    </td>
                                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                                      {lead.email || "—"}
                                    </td>
                                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                                      {lead.phone || "—"}
                                    </td>
                                    <td className="p-3 text-slate-500">
                                      {lead.city ? `${lead.city}, ${lead.country}` : lead.country || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Actions Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setParsedPreviewLeads([]);
                                setPreviewSelectedIndices([]);
                              }}
                              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              Cancelar vista previa
                            </button>
                            {duplicateCount > 0 && (
                              <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-250 flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                {duplicateCount} duplicado(s) se omitirán automáticamente.
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleConfirmImportGoogleSheets}
                            disabled={previewSelectedIndices.length === 0}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar e Importar {previewSelectedIndices.length} Prospecto(s) Nuevo(s)</span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: METRICAS Y ANALYTICS */}
          {activeTab === "Analytics" && (
            <div className="space-y-6">
              
              {/* KPIs Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Tasa Global de Conversión</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      {leads.length > 0 ? ((wonLeadsCount / leads.length) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-sans">de {leads.length} leads</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${leads.length > 0 ? (wonLeadsCount / leads.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Ticket Promedio Cerrado</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      ${wonLeadsCount > 0 
                        ? Math.round(wonValue / wonLeadsCount).toLocaleString("en-US") 
                        : 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Promedio por cada negociación ganada</p>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Volumen Activo Estimado</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-indigo-600 font-mono">
                      ${leads.filter(l => l.status !== "Ganado" && l.status !== "Perdido").reduce((s, c) => s + c.value, 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Total en etapas activas en negociación</p>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Leads de Adquisición Digital</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-purple-600 font-mono">
                      {leads.filter(l => l.source === "Campaña Digital" || l.source === "LinkedIn").length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">campañas online</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Provenientes de LinkedIn y Campaña</p>
                </div>
              </div>

              {/* Grid 1: Funnel Chart and Step Conversion table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Funnel chart widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center lg:col-span-2">
                  <div className="w-full flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                        Embudo de Conversión Comercial (Funnel Chart)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Volumen acumulativo del pipeline comercial por etapa de captación.</p>
                    </div>
                  </div>

                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                          formatter={(value: any, name: any) => [`${value} Prospectos`, `Etapa: ${name}`]} 
                        />
                        <Funnel
                          dataKey="value"
                          data={funnelData}
                          isAnimationActive
                        >
                          <LabelList position="right" fill="#475569" dataKey="name" fontStyle="bold" fontSize={11} />
                          {funnelData.map((entry, index) => {
                            const colors = ['#38bdf8', '#60a5fa', '#3b82f6', '#6366f1', '#10b981', '#ef4444'];
                            const fill = colors[index % colors.length];
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Step dropoff analysis table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Retención de Tráfico
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retención por etapas en el pipeline activo.</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {funnelData.map((stage, idx) => {
                      const initialVolume = funnelData[0]?.value || 1;
                      const conversionRateToInitial = Math.round((stage.value / initialVolume) * 100);
                      
                      return (
                        <div key={stage.name} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 truncate max-w-[150px]">{stage.name}</span>
                            <div className="flex items-center space-x-2 font-mono text-[10px]">
                              <span className="text-slate-500 font-bold">({stage.value} leads)</span>
                              <span className="text-indigo-600 font-black">{conversionRateToInitial}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${conversionRateToInitial}%`,
                                backgroundColor: idx === 0 ? '#38bdf8' : idx === 1 ? '#60a5fa' : idx === 2 ? '#3b82f6' : idx === 3 ? '#6366f1' : idx === 4 ? '#10b981' : '#f43f5e'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid 2: Agent Performance and Value breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Agent Performance Widget */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center">
                      <Award className="w-4 h-4 mr-2 text-indigo-500" />
                      Rendimiento de Gestores y Agentes Comerciales
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Métricas unificadas de conversión, volumen de propuestas y captación por gestor responsable.</p>
                  </div>

                  <div className="divide-y divide-slate-150 max-h-[400px] overflow-y-auto pr-1">
                    {agentPerformance.map((item, idx) => {
                      const initialColors = ["bg-emerald-50 text-emerald-700 border border-emerald-100", "bg-indigo-50 text-indigo-700 border border-indigo-100", "bg-purple-50 text-purple-700 border border-purple-100", "bg-amber-50 text-amber-700 border border-amber-100"];
                      const fallbackColor = "bg-slate-50 text-slate-700 border border-slate-200";
                      const colorBadge = initialColors[idx % initialColors.length] || fallbackColor;

                      return (
                        <div key={item.agent} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 uppercase border ${colorBadge}`}>
                              {item.agent.charAt(0)}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-800 text-xs">{item.agent}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {item.totalLeads} leads asignados • {item.wonCount} ganados
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6 justify-between md:justify-end">
                            {/* Conversion Rate indicator */}
                            <div className="space-y-1 text-right">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Tasa de Éxito</span>
                              <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">
                                {item.successRate.toFixed(1)}%
                              </span>
                            </div>

                            {/* Total Won proposals values in USD */}
                            <div className="space-y-1 text-right">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Propuestas Ganadas</span>
                              <span className="text-xs font-black text-indigo-600 font-mono">
                                ${item.totalWonValue.toLocaleString("en-US")} USD
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proposals Won chart par agent value */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      Ingreso Cerrado Ganado por Agente (USD)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Visualización del valor total de propuestas convertidas exitosamente.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="agent" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                          formatter={(value: any) => [`$${value.toLocaleString()} USD`, 'Valor Cerrado']}
                        />
                        <Bar dataKey="totalWonValue" radius={[4, 4, 0, 0]}>
                          {agentPerformance.map((entry, index) => {
                            const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: CAMPAÑAS */}
          {activeTab === "Campanas" && (
            <div className="space-y-6">
              {/* Header KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Campañas Totales</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">{campaigns.length}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">({campaigns.filter(c => c.status === "Activa").length} Activas)</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Presupuesto Invertido</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">
                      ${campaigns.reduce((acc, c) => acc + c.budget, 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">USD</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Leads Generados</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-indigo-600 font-mono">
                      {campaigns.reduce((acc, c) => acc + c.convertedLeads, 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">prospectos</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Retorno Estimado (Pipeline)</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-purple-700 font-mono">
                      ${campaigns.reduce((acc, c) => acc + c.estimatedRevenue, 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-[10px] text-purple-500 font-semibold font-mono">USD</span>
                  </div>
                </div>
              </div>

              {/* Action Bar & Filters */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select
                    value={campaignFilterStatus}
                    onChange={e => setCampaignFilterStatus(e.target.value)}
                    className="border border-slate-200 bg-white rounded-xl p-2 font-bold text-slate-700 outline-none"
                  >
                    <option value="Todas">Todos los Estados</option>
                    <option value="Activa">Activa</option>
                    <option value="En Diseño">En Diseño</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Finalizada">Finalizada</option>
                  </select>

                  <select
                    value={campaignFilterChannel}
                    onChange={e => setCampaignFilterChannel(e.target.value)}
                    className="border border-slate-200 bg-white rounded-xl p-2 font-bold text-slate-700 outline-none"
                  >
                    <option value="Todos">Todos los Canales</option>
                    <option value="Email">Email Marketing</option>
                    <option value="LinkedIn">LinkedIn Outreach</option>
                    <option value="WhatsApp">WhatsApp / SMS</option>
                    <option value="Evento">Evento / Webinar</option>
                    <option value="Llamadas">Llamadas Directas</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenNewCampaign}
                  className="bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Campaña
                </button>
              </div>

              {/* Campaigns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {campaigns
                  .filter(c => campaignFilterStatus === "Todas" || c.status === campaignFilterStatus)
                  .filter(c => campaignFilterChannel === "Todos" || c.channel === campaignFilterChannel)
                  .map(camp => {
                    let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                    if (camp.status === "Activa") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (camp.status === "En Diseño") statusColor = "bg-sky-50 text-sky-700 border-sky-200";
                    if (camp.status === "Pausada") statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                    if (camp.status === "Finalizada") statusColor = "bg-purple-50 text-purple-700 border-purple-200";

                    const progressPct = camp.targetLeads > 0 ? Math.min(100, Math.round((camp.convertedLeads / camp.targetLeads) * 100)) : 0;

                    return (
                      <div key={camp.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border border-indigo-100 flex items-center gap-1">
                                <Megaphone className="w-3 h-3" /> {camp.channel}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                                {camp.status}
                              </span>
                            </div>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{camp.name}</h3>
                            <p className="text-[11px] text-slate-500">{camp.targetAudience}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleCampaignStatus(camp.id)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
                              title={camp.status === "Activa" ? "Pausar campaña" : "Activar campaña"}
                            >
                              {camp.status === "Activa" ? <Circle className="w-4 h-4 text-amber-600 fill-amber-100" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            </button>
                            <button
                              onClick={() => handleOpenEditCampaign(camp)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer"
                              title="Editar campaña"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(camp.id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Eliminar campaña"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-500 uppercase tracking-wider">Meta de Prospectos:</span>
                            <span className="text-indigo-700 font-mono">{camp.convertedLeads} / {camp.targetLeads} leads ({progressPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase block font-sans">Presupuesto</span>
                            <span className="text-xs font-black text-slate-700">${camp.budget.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase block font-sans">Enviados</span>
                            <span className="text-xs font-black text-slate-700">{camp.sentCount}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase block font-sans">Interacciones</span>
                            <span className="text-xs font-black text-slate-700">{camp.openedCount}</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                            <span className="text-[8.5px] text-emerald-600 font-bold uppercase block font-sans">Retorno EST</span>
                            <span className="text-xs font-black text-emerald-700">${camp.estimatedRevenue.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-mono">
                          <span>📅 Fechas: {camp.startDate} al {camp.endDate}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB: REPORTES */}
          {activeTab === "Reportes" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-indigo-600" />
                    Reportes Ejecutivos de Ventas y CRM
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Diagnósticos detallados de rendimiento de equipo, SLA y canales comerciales.</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={reportPeriodFilter}
                    onChange={e => setReportPeriodFilter(e.target.value)}
                    className="border border-slate-200 bg-slate-50 rounded-xl p-2 font-bold text-xs text-slate-700 outline-none"
                  >
                    <option value="Q3 2026">T3 (Jul - Sep 2026)</option>
                    <option value="Q2 2026">T2 (Abr - Jun 2026)</option>
                    <option value="Año 2026">Año 2026 Completo</option>
                  </select>

                  <button
                    onClick={() => alert("Generando y descargando reporte ejecutivo en PDF...")}
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Exportar PDF
                  </button>
                </div>
              </div>

              {/* Report Section 1: Agente Comercial Performance */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  1. Reporte de Desempeño por Agente Comercial
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 text-[10px] tracking-wider">
                        <th className="p-3">Agente / Ejecutivo</th>
                        <th className="p-3 text-center">Leads Asignados</th>
                        <th className="p-3 text-center">En Proceso</th>
                        <th className="p-3 text-center">Ganados</th>
                        <th className="p-3 text-center">Tasa Cierre %</th>
                        <th className="p-3 text-right">Monto Ganado ($ USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {agentPerformance.map(ag => (
                        <tr key={ag.agent} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {ag.agent.substring(0, 2).toUpperCase()}
                            </div>
                            {ag.agent}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{ag.totalLeads}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{ag.inProgressLeads}</td>
                          <td className="p-3 text-center font-mono font-extrabold text-emerald-600">{ag.wonLeads}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600">{ag.winRate}%</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700">${ag.totalWonValue.toLocaleString()} USD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Report Section 2: SLA & Stage Health Diagnostic */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  2. Diagnóstico de Cumplimiento SLA e Inactividad
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 text-[10px] tracking-wider">
                        <th className="p-3">Etapa del Pipeline</th>
                        <th className="p-3 text-center">Límite SLA (Días)</th>
                        <th className="p-3 text-center">Prospectos Activos</th>
                        <th className="p-3 text-center">Prospectos Inactivos</th>
                        <th className="p-3 text-center">Cumplimiento SLA %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {pipelineStages.map(stage => {
                        const stageLeads = leads.filter(l => l.status === stage);
                        const slaLimit = getLeadSlaLimit(stage);
                        const inactiveCount = stageLeads.filter(l => {
                          const leadTasks = tasks.filter(t => t.leadId?.toString() === l.id.toString());
                          return isLeadInactive(l, leadTasks, slaLimit);
                        }).length;

                        const compliance = stageLeads.length > 0 ? Math.round(((stageLeads.length - inactiveCount) / stageLeads.length) * 100) : 100;

                        return (
                          <tr key={stage} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-bold text-slate-800">{stage}</td>
                            <td className="p-3 text-center font-mono">
                              {slaLimit !== undefined && slaLimit !== null ? (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{slaLimit} días</span>
                              ) : (
                                <span className="text-slate-400 font-semibold">N/A</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700">{stageLeads.length}</td>
                            <td className="p-3 text-center font-mono">
                              {inactiveCount > 0 ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-black animate-pulse">
                                  {inactiveCount} inactivos
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold">0</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono font-bold">
                              <span className={compliance >= 80 ? "text-emerald-600" : compliance >= 60 ? "text-amber-600" : "text-rose-600"}>
                                {compliance}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CORREOS */}
          {activeTab === "Correos" && (
            <div className="space-y-6">
              {emailSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{emailSuccessMsg}</span>
                </div>
              )}

              {/* Header KPIs & Quick Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Correos Enviados</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono">{emailLogs.length}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Tasa de Apertura</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">64.2%</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Tasa de Respuesta</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">28.5%</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Plantillas Creadas</span>
                    <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">{emailTemplates.length}</span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailActiveSubTab("Masivo");
                      if (bulkEmailSelectedLeadIds.length === 0) {
                        const defaultSchools = leads.filter(l => l.type === "Institución Potencial" && l.email).map(l => l.id);
                        if (defaultSchools.length > 0) setBulkEmailSelectedLeadIds(defaultSchools);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/10 transition cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Envío Masivo a Colegios</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartNewBlankEmail()}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-600/10 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Redactar Correo</span>
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

              {/* Email Sub-Tabs Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-sm w-full sm:w-auto self-start">
                {[
                  { id: "Plantillas", label: `📋 Plantillas (${emailTemplates.length})` },
                  { id: "Redactar", label: "✉️ Redactar Individual" },
                  { id: "Masivo", label: `⚡ Difusión Masiva a Colegios (${bulkEmailSelectedLeadIds.length})` },
                  { id: "Historial", label: `📬 Historial de Envíos (${emailLogs.length})` }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setEmailActiveSubTab(sub.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                      emailActiveSubTab === sub.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* SUB TAB 1: PLANTILLAS DE CORREO */}
              {emailActiveSubTab === "Plantillas" && (
                <div className="space-y-4">
                  {/* Filters & Search Toolbar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={templateSearchTerm}
                          onChange={e => setTemplateSearchTerm(e.target.value)}
                          placeholder="Buscar plantillas por título, asunto o categoría..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition"
                        />
                        {templateSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setTemplateSearchTerm("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Filter */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                        <select
                          value={templateCategoryFilter}
                          onChange={e => setTemplateCategoryFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Todas">Todas las categorías</option>
                          <option value="Primer Contacto">Primer Contacto</option>
                          <option value="Propuesta">Propuesta</option>
                          <option value="Seguimiento">Seguimiento</option>
                          <option value="Agendamiento">Agendamiento</option>
                          <option value="Cierre">Cierre</option>
                          <option value="Acreditación">Acreditación</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>
                    </div>

                    {/* Button: Nueva Plantilla */}
                    <button
                      type="button"
                      onClick={handleOpenNewTemplate}
                      className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Nueva Plantilla</span>
                    </button>
                  </div>

                  {/* Grid of Templates */}
                  {(() => {
                    const filteredTemplates = emailTemplates.filter(tpl => {
                      const matchesCategory = templateCategoryFilter === "Todas" || tpl.category === templateCategoryFilter;
                      const matchesSearch = !templateSearchTerm.trim() || 
                        tpl.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                        tpl.subject.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                        tpl.category.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                        tpl.body.toLowerCase().includes(templateSearchTerm.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    if (filteredTemplates.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                          <FileText className="w-10 h-10 mx-auto text-slate-300" />
                          <h4 className="text-sm font-extrabold text-slate-700">No se encontraron plantillas de correo</h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            No hay plantillas que coincidan con los filtros seleccionados. Puedes crear una nueva plantilla o reiniciar la búsqueda.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            {(templateSearchTerm || templateCategoryFilter !== "Todas") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTemplateSearchTerm("");
                                  setTemplateCategoryFilter("Todas");
                                }}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                              >
                                Limpiar Filtros
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleOpenNewTemplate}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Crear Plantilla</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {filteredTemplates.map(tpl => {
                          const getCategoryBadgeClass = (cat: string) => {
                            switch (cat) {
                              case "Primer Contacto":
                                return "bg-blue-50 text-blue-700 border-blue-200";
                              case "Propuesta":
                                return "bg-emerald-50 text-emerald-700 border-emerald-200";
                              case "Seguimiento":
                                return "bg-amber-50 text-amber-700 border-amber-200";
                              case "Agendamiento":
                                return "bg-cyan-50 text-cyan-700 border-cyan-200";
                              case "Cierre":
                                return "bg-purple-50 text-purple-700 border-purple-200";
                              default:
                                return "bg-indigo-50 text-indigo-700 border-indigo-200";
                            }
                          };

                          return (
                            <div
                              key={tpl.id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-300 transition-all group"
                            >
                              <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.8 rounded-full border ${getCategoryBadgeClass(tpl.category)}`}>
                                    {tpl.category}
                                  </span>

                                  {/* Quick Action Icons: Edit, Duplicate, Delete */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateTemplate(tpl)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      title="Duplicar Plantilla"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditTemplate(tpl)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                      title="Editar Plantilla"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTemplateToDelete(tpl)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                                  <p className="font-bold text-slate-800 text-xs">
                                    <span className="text-slate-400 font-medium mr-1 font-mono">Asunto:</span>
                                    {tpl.subject}
                                  </p>
                                  <p className="text-[11.5px] text-slate-500 whitespace-pre-line line-clamp-3 leading-relaxed font-sans">
                                    {tpl.body}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleSelectTemplateForCompose(tpl)}
                                  className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 hover:border-indigo-600 flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Usar esta Plantilla</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTemplate(tpl)}
                                  className="p-2 text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
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

              {/* SUB TAB 2: REDACTAR NUEVO CORREO */}
              {emailActiveSubTab === "Redactar" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 max-w-4xl">
                  {/* Header of Redactar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-600" />
                        Redactor de Comunicaciones
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Envía correos personalizados a prospectos del CRM o a contactos externos con registro automático de actividad.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartNewBlankEmail()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        title="Limpiar campos para escribir desde cero"
                      >
                        <X className="w-3.5 h-3.5 text-slate-500" />
                        <span>Nuevo en Blanco</span>
                      </button>

                      {(composeSubject || composeBody) && (
                        <button
                          type="button"
                          onClick={handleSaveComposerAsTemplate}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          title="Guardar este mensaje como plantilla reutilizable"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Guardar como Plantilla</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-4 text-xs font-sans">
                    {/* Recipient Type Selector (Prospecto CRM vs Manual) */}
                    <div className="space-y-2">
                      <label className="block text-slate-700 font-bold">Tipo de Destinatario *</label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200 max-w-md">
                        <button
                          type="button"
                          onClick={() => setComposeRecipientType("lead")}
                          className={`py-2 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            composeRecipientType === "lead"
                              ? "bg-white text-indigo-700 shadow-xs border border-indigo-100"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Prospecto del CRM</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposeRecipientType("manual")}
                          className={`py-2 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            composeRecipientType === "manual"
                              ? "bg-white text-indigo-700 shadow-xs border border-indigo-100"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Destinatario Directo / Externo</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipient Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {composeRecipientType === "lead" ? (
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            Seleccionar Prospecto CRM *
                          </label>
                          <select
                            value={composeLeadId}
                            onChange={e => handleSelectLeadForCompose(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white cursor-pointer"
                            required
                          >
                            <option value="">-- Seleccionar Prospecto --</option>
                            {leads.map(l => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.contactName || "Sin contacto"} - {l.email})
                              </option>
                            ))}
                          </select>

                          {/* Selected Lead Info Preview */}
                          {(() => {
                            const selectedLead = leads.find(l => l.id === composeLeadId);
                            if (!selectedLead) return null;
                            return (
                              <div className="mt-2 p-2.5 bg-indigo-50/60 border border-indigo-150 rounded-xl flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-bold text-indigo-950 block">{selectedLead.name}</span>
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    {selectedLead.contactName} • {selectedLead.email}
                                  </span>
                                </div>
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[9.5px] font-extrabold font-mono">
                                  {selectedLead.status}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Nombre del Destinatario</label>
                              <input
                                type="text"
                                value={composeManualName}
                                onChange={e => setComposeManualName(e.target.value)}
                                placeholder="Ej. Lic. Carlos Ruiz"
                                className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Correo Electrónico *</label>
                              <input
                                type="email"
                                required
                                value={composeManualEmail}
                                onChange={e => setComposeManualEmail(e.target.value)}
                                placeholder="carlos@colegio.edu.mx"
                                className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Template Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-700 font-bold">Cargar Plantilla Guardada</label>
                          <button
                            type="button"
                            onClick={handleOpenNewTemplate}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Crear Nueva
                          </button>
                        </div>
                        <select
                          value={composeTemplateId}
                          onChange={e => {
                            const tpl = emailTemplates.find(t => t.id === e.target.value);
                            if (tpl) {
                              handleSelectTemplateForCompose(tpl);
                            } else {
                              setComposeTemplateId("");
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white cursor-pointer"
                        >
                          <option value="">-- Personalizado (Escribir sin plantilla) --</option>
                          {emailTemplates.map(t => (
                            <option key={t.id} value={t.id}>
                              [{t.category}] {t.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* CC and BCC Toggle Buttons & Input Fields */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-600" />
                          Copias del Correo (Opcional):
                        </span>
                        <div className="flex items-center gap-2">
                          {!showCc && !composeCc && (
                            <button
                              type="button"
                              onClick={() => setShowCc(true)}
                              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-[10.5px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Agregar Copia (CC)</span>
                            </button>
                          )}
                          {!showBcc && !composeBcc && (
                            <button
                              type="button"
                              onClick={() => setShowBcc(true)}
                              className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200 text-[10.5px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Agregar Copia Oculta (CCO / BCC)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* CC Field */}
                      {(showCc || composeCc) && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-indigo-900 font-mono">
                              Con Copia (CC):
                            </label>
                            <button
                              type="button"
                              onClick={() => { setComposeCc(""); setShowCc(false); }}
                              className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer flex items-center gap-0.5"
                            >
                              <X className="w-3 h-3" /> Quitar CC
                            </button>
                          </div>
                          <input
                            type="text"
                            value={composeCc}
                            onChange={e => setComposeCc(e.target.value)}
                            placeholder="ejemplo1@colegio.edu.mx, direccion@colegio.edu.mx"
                            className="w-full border border-indigo-200 rounded-xl p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500 bg-white placeholder:text-slate-400"
                          />
                          <p className="text-[10px] text-slate-400 font-sans">
                            Los destinatarios en CC recibirán una copia visible del mensaje. Separa múltiples correos con comas.
                          </p>
                        </div>
                      )}

                      {/* BCC Field */}
                      {(showBcc || composeBcc) && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-purple-900 font-mono">
                              Con Copia Oculta (CCO / BCC):
                            </label>
                            <button
                              type="button"
                              onClick={() => { setComposeBcc(""); setShowBcc(false); }}
                              className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer flex items-center gap-0.5"
                            >
                              <X className="w-3 h-3" /> Quitar CCO
                            </button>
                          </div>
                          <input
                            type="text"
                            value={composeBcc}
                            onChange={e => setComposeBcc(e.target.value)}
                            placeholder="auditoria@ihseducation.com, direccion.general@ihseducation.com"
                            className="w-full border border-purple-200 rounded-xl p-2 font-mono text-xs text-slate-800 outline-none focus:border-purple-500 bg-white placeholder:text-slate-400"
                          />
                          <p className="text-[10px] text-slate-400 font-sans">
                            Los destinatarios en CCO recibirán una copia privada sin que los demás participantes lo vean.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* DYNAMIC VARIABLES INSERTION BAR */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider font-mono">
                            Variables Dinámicas para Asunto y Mensaje
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Haz clic para insertar en el texto</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: "{{nombre_colegio}}", label: "🏫 Institución" },
                          { tag: "{{contacto_principal}}", label: "👤 Contacto Principal" },
                          { tag: "{{monto_estimado}}", label: "💵 Monto Proyectado" },
                          { tag: "{{correo_electronico}}", label: "✉️ Email Lead" },
                          { tag: "{{telefono}}", label: "📞 Teléfono Lead" },
                          { tag: "{{ciudad}}", label: "📍 Ciudad/País" },
                          { tag: "{{remitente}}", label: "💼 Tu Nombre (Asesor)" }
                        ].map(item => (
                          <div key={item.tag} className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-600 px-1.5">{item.label}</span>
                            <button
                              type="button"
                              onClick={() => handleInsertVariableInComposer(item.tag, "subject")}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded transition cursor-pointer"
                              title="Insertar en Asunto"
                            >
                              + Asunto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertVariableInComposer(item.tag, "body")}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded ml-0.5 transition cursor-pointer"
                              title="Insertar en Cuerpo"
                            >
                              + Mensaje
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Asunto */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Asunto del Correo *</label>
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={e => setComposeSubject(e.target.value)}
                        placeholder="Ej. Propuesta Oficial de Bachillerato Dual para {{nombre_colegio}}..."
                        className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
                        required
                      />
                    </div>

                    {/* Cuerpo del Mensaje */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-slate-700 font-bold">Cuerpo del Mensaje *</label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Las variables &#123;&#123;...&#125;&#125; se sustituirán automáticamente al seleccionar el prospecto.
                        </span>
                      </div>
                      <textarea
                        rows={7}
                        value={composeBody}
                        onChange={e => setComposeBody(e.target.value)}
                        placeholder="Escribe aquí el contenido del mensaje o selecciona una plantilla..."
                        className="w-full border border-slate-200 rounded-xl p-3 font-sans text-slate-700 outline-none focus:border-indigo-500 leading-relaxed bg-white"
                        required
                      />
                    </div>

                    {/* SECCIÓN DE ARCHIVOS ADJUNTOS DEL REPOSITORIO Y FUENTES EXTERNAS */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                      {/* Hidden File Input for External Files */}
                      <input
                        type="file"
                        multiple
                        ref={composeFileInputRef}
                        onChange={e => handleUploadExternalFile(e, "compose")}
                        className="hidden"
                      />

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-xl">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                              Documentos Adjuntos del Repositorio y Fuentes Externas
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                {composeSelectedDocIds.length + composeExternalAttachments.length} adjunto{(composeSelectedDocIds.length + composeExternalAttachments.length) !== 1 ? "s" : ""}
                              </span>
                            </h4>
                            <p className="text-[10.5px] text-slate-500">
                              Anexa convenios y propuestas del Repositorio central, sube archivos locales de tu equipo o añade enlaces a la nube (Google Drive, OneDrive).
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons: Repository, Local File Upload, External Cloud Link */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {(composeSelectedDocIds.length > 0 || composeExternalAttachments.length > 0) && (
                            <button
                              type="button"
                              onClick={handleClearAllAttachments}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                            >
                              Quitar todos
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAttachPicker("compose")}
                            className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            title="Explorar y seleccionar documentos guardados en el Repositorio Central"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Repositorio</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => composeFileInputRef.current?.click()}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                            title="Subir documentos o archivos directamente desde tu computadora"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Subir Archivo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenExternalLinkModal("compose")}
                            className="bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                            title="Anexar enlace externo o archivo en la nube (Google Drive, OneDrive, Dropbox, etc.)"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>Enlace Externo / Nube</span>
                          </button>
                        </div>
                      </div>

                      {/* LISTA DE ARCHIVOS ADJUNTADOS (REPOSITORIO + EXTERNOS) */}
                      {(composeSelectedDocIds.length > 0 || composeExternalAttachments.length > 0) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* 1. Documentos del Repositorio */}
                          {composeSelectedDocIds.map(docId => {
                            const doc = repositoryDocs.find(d => d.id === docId);
                            if (!doc) return null;
                            const isCloudLink = doc.sourceType === "enlace_externo" || !!doc.externalUrl;

                            return (
                              <div
                                key={doc.id}
                                className="bg-white border border-indigo-200/90 hover:border-indigo-400 p-2.5 rounded-xl flex items-start justify-between gap-2 shadow-2xs group transition"
                              >
                                <div className="flex items-start space-x-2.5 min-w-0">
                                  <div className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                    {isCloudLink ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-bold text-slate-800 text-[11.5px] truncate max-w-[210px]" title={doc.title}>
                                        {doc.title}
                                      </h5>
                                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded font-mono">
                                        Repositorio
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                      <span className="truncate max-w-[120px]">{doc.fileName}</span>
                                      <span>•</span>
                                      <span>{doc.fileSize}</span>
                                    </div>
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.2 rounded mt-1">
                                      {doc.category}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                    title={doc.externalUrl ? "Abrir enlace en nueva pestaña" : "Previsualizar / Descargar"}
                                  >
                                    {doc.externalUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(doc.id, false)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                                    title="Quitar adjunto"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* 2. Documentos Externos (Archivos Locales y Enlaces Nube) */}
                          {composeExternalAttachments.map(extAtt => {
                            const isCloudLink = extAtt.sourceType === "enlace_externo" || !!extAtt.externalUrl;

                            return (
                              <div
                                key={extAtt.id}
                                className={`bg-white border p-2.5 rounded-xl flex items-start justify-between gap-2 shadow-2xs group transition ${
                                  isCloudLink ? "border-sky-200/90 hover:border-sky-400" : "border-emerald-200/90 hover:border-emerald-400"
                                }`}
                              >
                                <div className="flex items-start space-x-2.5 min-w-0">
                                  <div className={`p-1.5 border rounded-lg shrink-0 mt-0.5 ${
                                    isCloudLink ? "bg-sky-50 border-sky-100 text-sky-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                  }`}>
                                    {isCloudLink ? <ExternalLink className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-bold text-slate-800 text-[11.5px] truncate max-w-[210px]" title={extAtt.title}>
                                        {extAtt.title}
                                      </h5>
                                      <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded font-mono border ${
                                        isCloudLink ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}>
                                        {isCloudLink ? "Enlace Nube" : "Archivo Local"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                      <span className="truncate max-w-[120px]">{extAtt.fileName}</span>
                                      <span>•</span>
                                      <span>{extAtt.fileSize}</span>
                                    </div>
                                    {extAtt.externalUrl && (
                                      <a
                                        href={extAtt.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9.5px] text-sky-600 hover:underline font-mono truncate max-w-[180px] block mt-0.5"
                                      >
                                        {extAtt.externalUrl}
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachmentFile(extAtt)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                    title={extAtt.externalUrl ? "Abrir enlace en nueva pestaña" : "Descargar / Ver"}
                                  >
                                    {extAtt.externalUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(extAtt.id, true)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                                    title="Quitar adjunto"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div
                            onClick={() => handleOpenAttachPicker("compose")}
                            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1"
                          >
                            <FolderOpen className="w-5 h-5 text-indigo-600" />
                            <p className="font-bold text-slate-800 text-xs">Del Repositorio</p>
                            <p className="text-[10px] text-slate-400">Convenios, acreditaciones y propuestas oficiales</p>
                          </div>

                          <div
                            onClick={() => composeFileInputRef.current?.click()}
                            className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1"
                          >
                            <UploadCloud className="w-5 h-5 text-emerald-600" />
                            <p className="font-bold text-slate-800 text-xs">Archivo de tu Computadora</p>
                            <p className="text-[10px] text-slate-400">PDF, Word, Excel o imágenes locales</p>
                          </div>

                          <div
                            onClick={() => handleOpenExternalLinkModal("compose")}
                            className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-white hover:bg-sky-50/40 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1"
                          >
                            <LinkIcon className="w-5 h-5 text-sky-600" />
                            <p className="font-bold text-slate-800 text-xs">Enlace Nube / Externo</p>
                            <p className="text-[10px] text-slate-400">Google Drive, OneDrive, Dropbox o web</p>
                          </div>
                        </div>
                      )}

                      {/* SUGERENCIAS RÁPIDAS DE DOCUMENTOS */}
                      {repositoryDocs.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/70">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                            ⚡ Sugerencias rápidas del repositorio:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {repositoryDocs
                              .filter(d => !composeSelectedDocIds.includes(d.id))
                              .slice(0, 4)
                              .map(d => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleToggleAttachDoc(d.id)}
                                  className="inline-flex items-center gap-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 px-2 py-1 rounded-lg text-[10.5px] font-medium transition cursor-pointer shadow-2xs"
                                >
                                  <Plus className="w-3 h-3 text-indigo-600" />
                                  <span className="truncate max-w-[180px]">{d.title}</span>
                                  <span className="text-[9.5px] text-slate-400 font-mono">({d.fileSize})</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Firma Electrónica del Remitente */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={composeAttachSignature}
                          onChange={(e) => setComposeAttachSignature(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>✍️ Adjuntar mi Firma Electrónica</span>
                          {currentUserSignature ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                              ✓ Configurada ({currentUser?.name})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-medium">
                              Pie de firma estándar
                            </span>
                          )}
                        </span>
                      </label>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        {composeAttachSignature && currentUserSignature?.signatureImage && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span>Sello digital incluido</span>
                          </span>
                        )}
                        <span className="text-slate-400">• Administra tu firma en "Mi Perfil"</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-400 font-mono">
                        {(composeSelectedDocIds.length > 0 || composeExternalAttachments.length > 0) ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Correo listo para enviar con {composeSelectedDocIds.length + composeExternalAttachments.length} adjunto(s) ({composeSelectedDocIds.length} repositorio, {composeExternalAttachments.length} externos)
                          </span>
                        ) : (
                          <span>Sin documentos adjuntos</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-750 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 transition"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar Correo y Registrar en CRM</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUB TAB: DIFUSIÓN Y ENVÍO MASIVO A COLEGIOS */}
              {emailActiveSubTab === "Masivo" && (() => {
                const bulkAvailableCountries = Array.from(new Set(leads.map(l => l.country).filter(Boolean))).sort();
                const bulkAvailableSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean))).sort();

                const filteredBulkLeads = leads.filter(lead => {
                  const matchesType = bulkEmailTypeFilter === "Todos" ? true : lead.type === bulkEmailTypeFilter;
                  const matchesStage = bulkEmailStageFilter === "Todos" ? true : lead.status === bulkEmailStageFilter;
                  const matchesCountry = bulkEmailCountryFilter === "Todos" ? true : lead.country === bulkEmailCountryFilter;
                  const matchesSource = bulkEmailSourceFilter === "Todos" ? true : lead.source === bulkEmailSourceFilter;
                  const matchesSearch = 
                    lead.name.toLowerCase().includes(bulkEmailSearchTerm.toLowerCase()) ||
                    (lead.contactName && lead.contactName.toLowerCase().includes(bulkEmailSearchTerm.toLowerCase())) ||
                    (lead.email && lead.email.toLowerCase().includes(bulkEmailSearchTerm.toLowerCase())) ||
                    (lead.country && lead.country.toLowerCase().includes(bulkEmailSearchTerm.toLowerCase()));

                  return matchesType && matchesStage && matchesCountry && matchesSource && matchesSearch;
                });

                const selectedBulkLeadsList = leads.filter(l => bulkEmailSelectedLeadIds.includes(l.id));
                const selectedBulkLeadsWithEmail = selectedBulkLeadsList.filter(l => l.email && l.email.includes("@"));
                const selectedBulkLeadsWithoutEmail = selectedBulkLeadsList.filter(l => !l.email || !l.email.includes("@"));
                const totalEstimatedValue = selectedBulkLeadsList.reduce((acc, l) => acc + (l.value || 0), 0);

                const previewLead = leads.find(l => l.id === bulkEmailPreviewLeadId) || selectedBulkLeadsList[0] || leads[0];
                const previewSubject = previewLead ? bulkEmailSubject
                  .replace(/\{\{nombre_colegio\}\}/g, previewLead.name)
                  .replace(/\{\{contacto_principal\}\}/g, previewLead.contactName || "Directivo")
                  .replace(/\{\{monto_estimado\}\}/g, previewLead.value ? previewLead.value.toLocaleString("en-US") : "0")
                  .replace(/\{\{correo_electronico\}\}/g, previewLead.email || "correo@colegio.edu")
                  .replace(/\{\{telefono\}\}/g, previewLead.phone || "+52 55 0000 0000")
                  .replace(/\{\{ciudad\}\}/g, previewLead.country || "Ciudad de México")
                  .replace(/\{\{remitente\}\}/g, currentUser?.name || "Equipo Académico")
                  : bulkEmailSubject;

                const previewBody = previewLead ? bulkEmailBody
                  .replace(/\{\{nombre_colegio\}\}/g, previewLead.name)
                  .replace(/\{\{contacto_principal\}\}/g, previewLead.contactName || "Directivo")
                  .replace(/\{\{monto_estimado\}\}/g, previewLead.value ? previewLead.value.toLocaleString("en-US") : "0")
                  .replace(/\{\{correo_electronico\}\}/g, previewLead.email || "correo@colegio.edu")
                  .replace(/\{\{telefono\}\}/g, previewLead.phone || "+52 55 0000 0000")
                  .replace(/\{\{ciudad\}\}/g, previewLead.country || "Ciudad de México")
                  .replace(/\{\{remitente\}\}/g, currentUser?.name || "Equipo Académico")
                  : bulkEmailBody;

                return (
                  <div className="space-y-6">
                    {/* Header Summary Banner */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                              <Zap className="w-5 h-5" />
                            </span>
                            <div>
                              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                                Difusión Masiva y Campañas de Correo a Colegios
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Selecciona prospectos, personaliza las etiquetas dinámicas por institución y despacha comunicaciones masivas con adjuntos oficiales.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Counters */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="bg-indigo-50 border border-indigo-150 rounded-xl px-3.5 py-2 text-center">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block font-mono">Seleccionados</span>
                            <span className="text-base font-black text-indigo-700">{selectedBulkLeadsList.length}</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-150 rounded-xl px-3.5 py-2 text-center">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block font-mono">Con Email Válido</span>
                            <span className="text-base font-black text-emerald-700">{selectedBulkLeadsWithEmail.length}</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-150 rounded-xl px-3.5 py-2 text-center">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block font-mono">Valor Total</span>
                            <span className="text-base font-black text-amber-800">${totalEstimatedValue.toLocaleString("en-US")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Warnings if any selected without email */}
                      {selectedBulkLeadsWithoutEmail.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Aviso: </span>
                            <span>
                              {selectedBulkLeadsWithoutEmail.length} de los {selectedBulkLeadsList.length} colegios seleccionados no tienen una dirección de correo válida registrada (ej. {selectedBulkLeadsWithoutEmail.slice(0, 3).map(l => l.name).join(", ")}). Estos serán omitidos automáticamente durante el envío masivo.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Main Two-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* COLUMN 1: SEGMENTACIÓN Y SELECCIÓN DE COLEGIOS (5 Cols) */}
                      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span>1. Segmentación de Colegios ({filteredBulkLeads.length})</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {selectedBulkLeadsList.length} seleccionados
                          </span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={bulkEmailSearchTerm}
                            onChange={e => setBulkEmailSearchTerm(e.target.value)}
                            placeholder="Buscar por colegio, contacto, país o email..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition"
                          />
                          {bulkEmailSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setBulkEmailSearchTerm("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Filters Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Filter Stage */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Etapa Pipeline</label>
                            <select
                              value={bulkEmailStageFilter}
                              onChange={e => setBulkEmailStageFilter(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 bg-white font-semibold outline-none focus:border-indigo-500"
                            >
                              <option value="Todos">Todas las Etapas</option>
                              {allPipelineStages.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filter Country */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">País / Región</label>
                            <select
                              value={bulkEmailCountryFilter}
                              onChange={e => setBulkEmailCountryFilter(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 bg-white font-semibold outline-none focus:border-indigo-500"
                            >
                              <option value="Todos">Todos los Países</option>
                              {bulkAvailableCountries.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filter Type */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Tipo de Registro</label>
                            <select
                              value={bulkEmailTypeFilter}
                              onChange={e => setBulkEmailTypeFilter(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 bg-white font-semibold outline-none focus:border-indigo-500"
                            >
                              <option value="Todos">Todos los Tipos</option>
                              <option value="Institución Potencial">Institución Potencial (Colegios)</option>
                              <option value="Alumno Potencial">Alumnos Potenciales</option>
                            </select>
                          </div>

                          {/* Filter Source */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Origen del Prospecto</label>
                            <select
                              value={bulkEmailSourceFilter}
                              onChange={e => setBulkEmailSourceFilter(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 bg-white font-semibold outline-none focus:border-indigo-500"
                            >
                              <option value="Todos">Todos los Orígenes</option>
                              {bulkAvailableSources.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Fast Select Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAllBulkLeads(filteredBulkLeads)}
                            className="text-indigo-600 hover:text-indigo-800 text-[10.5px] font-bold hover:underline cursor-pointer"
                          >
                            {filteredBulkLeads.length > 0 && filteredBulkLeads.every(l => bulkEmailSelectedLeadIds.includes(l.id))
                              ? "Deseleccionar mostrados"
                              : `Seleccionar visibles (${filteredBulkLeads.length})`}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectOnlyWithEmailBulkLeads(filteredBulkLeads)}
                              className="text-emerald-600 hover:text-emerald-800 text-[10.5px] font-bold hover:underline cursor-pointer"
                              title="Seleccionar solo los colegios visibles que tienen email"
                            >
                              Solo con Email ({filteredBulkLeads.filter(l => l.email && l.email.includes("@")).length})
                            </button>
                            {bulkEmailSelectedLeadIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setBulkEmailSelectedLeadIds([])}
                                className="text-rose-600 hover:text-rose-800 text-[10.5px] font-bold hover:underline cursor-pointer"
                              >
                                Limpiar ({bulkEmailSelectedLeadIds.length})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive List of Schools */}
                        <div className="max-h-[500px] overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                          {filteredBulkLeads.map(lead => {
                            const isSelected = bulkEmailSelectedLeadIds.includes(lead.id);
                            const hasValidEmail = lead.email && lead.email.includes("@");

                            return (
                              <div
                                key={lead.id}
                                onClick={() => handleToggleSelectBulkLead(lead.id)}
                                className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? "bg-indigo-50/80 border-indigo-300 shadow-2xs"
                                    : "bg-white border-slate-200 hover:border-indigo-200"
                                }`}
                              >
                                <div className="flex items-start space-x-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectBulkLead(lead.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-1 shrink-0"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-extrabold text-slate-800 text-xs truncate max-w-[200px]" title={lead.name}>
                                        {lead.name}
                                      </h5>
                                      {lead.country && (
                                        <span className="text-[9.5px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                          {lead.country}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                      {lead.contactName ? (
                                        <span>👤 {lead.contactName}</span>
                                      ) : (
                                        <span className="text-slate-400 italic">Sin contacto registrado</span>
                                      )}
                                    </div>

                                    <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                                      {hasValidEmail ? (
                                        <span className="text-indigo-600 font-mono font-semibold truncate max-w-[220px]">
                                          ✉️ {lead.email}
                                        </span>
                                      ) : (
                                        <span className="text-rose-600 font-bold bg-rose-50 border border-rose-150 px-1.5 py-0.2 rounded text-[9.5px]">
                                          ⚠️ Sin correo registrado
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                                      <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                        {lead.status}
                                      </span>
                                      {lead.value > 0 && (
                                        <span className="text-emerald-700 font-mono font-bold">
                                          ${lead.value.toLocaleString("en-US")} USD
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBulkEmailPreviewLeadId(lead.id);
                                  }}
                                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 px-2 py-1 rounded-lg shrink-0 transition"
                                  title="Previsualizar cómo recibirá este colegio el correo"
                                >
                                  Previsualizar
                                </button>
                              </div>
                            );
                          })}

                          {filteredBulkLeads.length === 0 && (
                            <div className="p-8 text-center text-slate-400 space-y-1">
                              <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                              <p className="font-bold text-slate-600 text-xs">No se encontraron colegios con estos filtros</p>
                              <p className="text-[11px] text-slate-400">Intenta restablecer la búsqueda o filtros de país/etapa</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLUMN 2: REDACCIÓN DEL MENSAJE, ETIQUETAS, ADJUNTOS Y ENVÍO (7 Cols) */}
                      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                            <Mail className="w-4 h-4 text-indigo-600" />
                            <span>2. Contenido del Mensaje Masivo</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">Personalización por etiquetas</span>
                        </div>

                        <form onSubmit={handleExecuteBulkEmailSend} className="space-y-4">
                          {/* Template Loader */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                                Cargar Plantilla Institucional
                              </label>
                              <button
                                type="button"
                                onClick={handleOpenNewTemplate}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Crear Nueva Plantilla
                              </button>
                            </div>
                            <select
                              value={bulkEmailTemplateId}
                              onChange={e => {
                                const tpl = emailTemplates.find(t => t.id === e.target.value);
                                if (tpl) {
                                  handleSelectTemplateForBulk(tpl);
                                } else {
                                  setBulkEmailTemplateId("");
                                }
                              }}
                              className="w-full border border-slate-200 rounded-xl p-2 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white cursor-pointer text-xs"
                            >
                              <option value="">-- Redacción Personalizada (Sin plantilla) --</option>
                              {emailTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                  [{t.category}] {t.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Dynamic Variables Insertion Bar */}
                          <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                <span className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider font-mono">
                                  Variables Dinámicas para Colegios
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">Inserta con 1 clic</span>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-snug">
                              Al enviar, cada variable será sustituida automáticamente por la información respectiva de cada colegio destinatario.
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {[
                                { tag: "{{nombre_colegio}}", label: "🏫 Institución" },
                                { tag: "{{contacto_principal}}", label: "👤 Directivo/Contacto" },
                                { tag: "{{monto_estimado}}", label: "💵 Monto USD" },
                                { tag: "{{correo_electronico}}", label: "✉️ Email" },
                                { tag: "{{telefono}}", label: "📞 Teléfono" },
                                { tag: "{{ciudad}}", label: "📍 Ciudad/País" },
                                { tag: "{{remitente}}", label: "💼 Tu Nombre" }
                              ].map(item => (
                                <div key={item.tag} className="inline-flex items-center bg-white border border-indigo-200 rounded-lg p-0.5 shadow-2xs">
                                  <span className="text-[10px] font-bold text-slate-700 px-1.5">{item.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertVariableInBulk(item.tag, "subject")}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded transition cursor-pointer"
                                    title="Insertar en Asunto"
                                  >
                                    + Asunto
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertVariableInBulk(item.tag, "body")}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded ml-0.5 transition cursor-pointer"
                                    title="Insertar en Mensaje"
                                  >
                                    + Mensaje
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* CC and BCC for Bulk Mail */}
                          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                Copias para la Difusión Masiva (Opcional):
                              </span>
                              <div className="flex items-center gap-2">
                                {!showBulkCc && !bulkEmailCc && (
                                  <button
                                    type="button"
                                    onClick={() => setShowBulkCc(true)}
                                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+ Copia (CC)</span>
                                  </button>
                                )}
                                {!showBulkBcc && !bulkEmailBcc && (
                                  <button
                                    type="button"
                                    onClick={() => setShowBulkBcc(true)}
                                    className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200 text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+ Copia Oculta (CCO)</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {(showBulkCc || bulkEmailCc) && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10.5px] font-bold text-indigo-900 font-mono">
                                    Con Copia (CC):
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => { setBulkEmailCc(""); setShowBulkCc(false); }}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer flex items-center gap-0.5"
                                  >
                                    <X className="w-3 h-3" /> Quitar
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={bulkEmailCc}
                                  onChange={e => setBulkEmailCc(e.target.value)}
                                  placeholder="coordinacion@ihs.com, admisiones@ihs.com"
                                  className="w-full border border-indigo-200 rounded-xl p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500 bg-white"
                                />
                              </div>
                            )}

                            {(showBulkBcc || bulkEmailBcc) && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10.5px] font-bold text-purple-900 font-mono">
                                    Con Copia Oculta (CCO / BCC):
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => { setBulkEmailBcc(""); setShowBulkBcc(false); }}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer flex items-center gap-0.5"
                                  >
                                    <X className="w-3 h-3" /> Quitar
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={bulkEmailBcc}
                                  onChange={e => setBulkEmailBcc(e.target.value)}
                                  placeholder="auditoria@ihseducation.com, direccion@ihseducation.com"
                                  className="w-full border border-purple-200 rounded-xl p-2 font-mono text-xs text-slate-800 outline-none focus:border-purple-500 bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {/* Subject Field */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">
                                Asunto del Correo Masivo *
                              </label>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {bulkEmailSubject.length} caracteres
                              </span>
                            </div>
                            <input
                              type="text"
                              required
                              value={bulkEmailSubject}
                              onChange={e => setBulkEmailSubject(e.target.value)}
                              placeholder="Ej: Oportunidad de Alianza de Bachillerato Dual para {{nombre_colegio}}"
                              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white text-xs"
                            />
                          </div>

                          {/* Body Field */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">
                                Cuerpo del Correo Masivo *
                              </label>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {bulkEmailBody.length} caracteres
                              </span>
                            </div>
                            <textarea
                              rows={8}
                              required
                              value={bulkEmailBody}
                              onChange={e => setBulkEmailBody(e.target.value)}
                              placeholder="Escribe el mensaje institucional aquí..."
                              className="w-full border border-slate-200 rounded-xl p-3 font-medium text-slate-700 outline-none focus:border-indigo-500 bg-white text-xs leading-relaxed font-sans"
                            />
                          </div>

                          {/* Repositorio y Fuentes Externas Adjuntos Section */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            {/* Hidden File Input for External Files in Bulk */}
                            <input
                              type="file"
                              multiple
                              ref={bulkFileInputRef}
                              onChange={e => handleUploadExternalFile(e, "bulk")}
                              className="hidden"
                            />

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-xl">
                                  <Paperclip className="w-4 h-4" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-2">
                                    Documentos Adjuntos (Repositorio y Fuentes Externas)
                                    <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                      {bulkEmailSelectedDocIds.length + bulkEmailExternalAttachments.length}
                                    </span>
                                  </label>
                                  <p className="text-[10.5px] text-slate-500">
                                    Se adjuntarán automáticamente en el envío masivo para todos los destinatarios seleccionados.
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {(bulkEmailSelectedDocIds.length > 0 || bulkEmailExternalAttachments.length > 0) && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearAllAttachments("bulk")}
                                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    Quitar todos
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenAttachPicker("bulk")}
                                  className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                                  title="Explorar el Repositorio Central"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>Repositorio</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => bulkFileInputRef.current?.click()}
                                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                                  title="Subir archivo local de tu computadora"
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Subir Archivo</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenExternalLinkModal("bulk")}
                                  className="bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                                  title="Anexar enlace externo o nube (Google Drive, OneDrive, etc.)"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span>Enlace Nube</span>
                                </button>
                              </div>
                            </div>

                            {(bulkEmailSelectedDocIds.length > 0 || bulkEmailExternalAttachments.length > 0) ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                  <span>
                                    {bulkEmailSelectedDocIds.length + bulkEmailExternalAttachments.length} archivo(s) se adjuntarán a todos los destinatarios ({bulkEmailSelectedDocIds.length} repositorio, {bulkEmailExternalAttachments.length} externos)
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* 1. Documentos del Repositorio */}
                                  {bulkEmailSelectedDocIds.map(docId => {
                                    const doc = repositoryDocs.find(d => d.id === docId);
                                    if (!doc) return null;
                                    const isCloudLink = doc.sourceType === "enlace_externo" || !!doc.externalUrl;

                                    return (
                                      <div
                                        key={doc.id}
                                        className="bg-white border border-indigo-200/90 hover:border-indigo-400 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                                      >
                                        <div className="flex items-center space-x-2 min-w-0">
                                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                            {isCloudLink ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <h6 className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]" title={doc.title}>
                                                {doc.title}
                                              </h6>
                                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] font-extrabold uppercase px-1 py-0.2 rounded font-mono">
                                                Repo
                                              </span>
                                            </div>
                                            <p className="text-[9.5px] text-slate-400 font-mono">{doc.fileSize} • {doc.category}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center space-x-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadDoc(doc)}
                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                            title={doc.externalUrl ? "Abrir enlace" : "Descargar"}
                                          >
                                            {doc.externalUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveBulkAttachment(doc.id, false)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                                            title="Quitar de la difusión"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* 2. Documentos Externos */}
                                  {bulkEmailExternalAttachments.map(extAtt => {
                                    const isCloudLink = extAtt.sourceType === "enlace_externo" || !!extAtt.externalUrl;

                                    return (
                                      <div
                                        key={extAtt.id}
                                        className={`bg-white border rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs ${
                                          isCloudLink ? "border-sky-200/90 hover:border-sky-400" : "border-emerald-200/90 hover:border-emerald-400"
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 min-w-0">
                                          <div className={`p-1.5 rounded-lg shrink-0 ${
                                            isCloudLink ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
                                          }`}>
                                            {isCloudLink ? <ExternalLink className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <h6 className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]" title={extAtt.title}>
                                                {extAtt.title}
                                              </h6>
                                              <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded font-mono border ${
                                                isCloudLink ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              }`}>
                                                {isCloudLink ? "Nube" : "Local"}
                                              </span>
                                            </div>
                                            <p className="text-[9.5px] text-slate-400 font-mono">{extAtt.fileSize} • {extAtt.fileName}</p>
                                          </div>
                                        </div>

                                        <div className="flex items-center space-x-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadAttachmentFile(extAtt)}
                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                            title={extAtt.externalUrl ? "Abrir enlace" : "Descargar"}
                                          >
                                            {extAtt.externalUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveBulkAttachment(extAtt.id, true)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                                            title="Quitar de la difusión"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div
                                  onClick={() => handleOpenAttachPicker("bulk")}
                                  className="border border-dashed border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-0.5"
                                >
                                  <FolderOpen className="w-4 h-4 text-indigo-600" />
                                  <p className="font-bold text-slate-700 text-xs">Repositorio</p>
                                  <p className="text-[9.5px] text-slate-400">Dossiers y convenios centrales</p>
                                </div>

                                <div
                                  onClick={() => bulkFileInputRef.current?.click()}
                                  className="border border-dashed border-emerald-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-0.5"
                                >
                                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                                  <p className="font-bold text-slate-700 text-xs">Archivo de Equipo</p>
                                  <p className="text-[9.5px] text-slate-400">PDF, Word o imagen local</p>
                                </div>

                                <div
                                  onClick={() => handleOpenExternalLinkModal("bulk")}
                                  className="border border-dashed border-sky-200 hover:border-sky-400 bg-white hover:bg-sky-50/20 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-0.5"
                                >
                                  <LinkIcon className="w-4 h-4 text-sky-600" />
                                  <p className="font-bold text-slate-700 text-xs">Enlace Nube</p>
                                  <p className="text-[9.5px] text-slate-400">Google Drive, OneDrive o URL</p>
                                </div>
                              </div>
                            )}

                            {/* Quick suggestions */}
                            {repositoryDocs.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/70">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                                  ⚡ Sugerencias de adjuntos del repositorio:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {repositoryDocs
                                    .filter(d => !bulkEmailSelectedDocIds.includes(d.id))
                                    .slice(0, 3)
                                    .map(d => (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => {
                                          setAttachPickerTarget("bulk");
                                          handleToggleAttachDoc(d.id);
                                        }}
                                        className="inline-flex items-center gap-1 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3 text-indigo-600" />
                                        <span className="truncate max-w-[150px]">{d.title}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Live Preview Box */}
                          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-emerald-400" />
                                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                                  Previsualización en Vivo de la Personalización
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-mono">Colegio:</span>
                                <select
                                  value={bulkEmailPreviewLeadId || (selectedBulkLeadsList[0]?.id || "")}
                                  onChange={e => setBulkEmailPreviewLeadId(e.target.value)}
                                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold outline-none"
                                >
                                  {selectedBulkLeadsList.map(l => (
                                    <option key={l.id} value={l.id}>
                                      {l.name}
                                    </option>
                                  ))}
                                  {selectedBulkLeadsList.length === 0 && leads.slice(0, 5).map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs font-mono">
                              <div className="text-[11px]">
                                <span className="text-slate-500">Para:</span>{" "}
                                <span className="text-indigo-300 font-bold">
                                  {previewLead?.email || "colegio@dominio.edu.mx"}
                                </span>{" "}
                                <span className="text-slate-400">({previewLead?.name})</span>
                              </div>
                              <div className="text-[11px]">
                                <span className="text-slate-500">Asunto:</span>{" "}
                                <span className="text-slate-100 font-bold">{previewSubject}</span>
                              </div>
                              <div className="p-3 bg-slate-800/80 rounded-xl text-slate-300 text-xs font-sans whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                                {previewBody}
                              </div>
                            </div>
                          </div>

                          {/* Task Automation Option */}
                          <div className="flex items-center space-x-2 pt-1">
                            <input
                              type="checkbox"
                              id="bulkEmailCreateTask"
                              checked={bulkEmailCreateTask}
                              onChange={e => setBulkEmailCreateTask(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor="bulkEmailCreateTask" className="text-xs font-bold text-slate-700 cursor-pointer">
                              Registrar automáticamente una Actividad / Tarea completada en el CRM para cada colegio destinatario
                            </label>
                          </div>

                          {/* Submit Button */}
                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-slate-500 font-medium font-mono">
                              {selectedBulkLeadsWithEmail.length > 0 ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Listo para enviar a {selectedBulkLeadsWithEmail.length} colegio(s)
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-rose-500" />
                                  Selecciona al menos 1 colegio con correo válido
                                </span>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={bulkEmailSending || selectedBulkLeadsWithEmail.length === 0}
                              className={`px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                                bulkEmailSending || selectedBulkLeadsWithEmail.length === 0
                                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                                  : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-[0.98]"
                              }`}
                            >
                              {bulkEmailSending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Despachando Correos...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4" />
                                  <span>Enviar Correo Masivo a {selectedBulkLeadsWithEmail.length} Colegios</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SUB TAB 4: HISTORIAL DE ENVÍOS */}
              {emailActiveSubTab === "Historial" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-indigo-600" />
                        Registro de Comunicaciones Enviadas ({emailLogs.length})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Historial completo de mensajes emitidos a prospectos e instituciones.
                        {isUserSuperAdmin && (
                          <span className="ml-1.5 text-indigo-600 font-semibold">
                            (Permiso de Superadministrador: Puedes eliminar registros individuales o en lote)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {isUserSuperAdmin && emailLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsClearAllModalOpen(true)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                          title="Vaciar todo el historial de correos enviados"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Vaciar Historial</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartNewBlankEmail()}
                        className="bg-indigo-600 hover:bg-indigo-750 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Redactar Otro</span>
                      </button>
                    </div>
                  </div>

                  {/* Batch Selection Banner for SuperAdmin */}
                  {isUserSuperAdmin && selectedEmailLogIds.length > 0 && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-900 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                        <span className="font-bold">
                          {selectedEmailLogIds.length} correo{selectedEmailLogIds.length > 1 ? "s" : ""} seleccionado{selectedEmailLogIds.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedEmailLogIds([])}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 cursor-pointer text-xs transition"
                        >
                          Desmarcar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBatchDeleteModalOpen(true)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar {selectedEmailLogIds.length} Seleccionados</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {emailLogs.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-700 text-sm">No hay registros de correos enviados</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Los correos emitidos a través del redactor o de la difusión masiva quedarán registrados automáticamente aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 text-[10px] tracking-wider">
                            {isUserSuperAdmin && (
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={emailLogs.length > 0 && selectedEmailLogIds.length === emailLogs.length}
                                  onChange={handleToggleSelectAllEmailLogs}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  title="Seleccionar todos los correos"
                                />
                              </th>
                            )}
                            <th className="p-3">Prospecto / Destinatario</th>
                            <th className="p-3">Asunto</th>
                            <th className="p-3 text-center">Adjuntos Repositorio</th>
                            <th className="p-3 text-center">Fecha y Hora</th>
                            <th className="p-3 text-center">Remitente</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-center w-28">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {emailLogs.map(log => {
                            const hasAttachments = log.attachments && log.attachments.length > 0;
                            const isSelected = selectedEmailLogIds.includes(log.id);

                            return (
                              <tr key={log.id} className={`transition ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/80"}`}>
                                {isUserSuperAdmin && (
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectEmailLog(log.id)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    />
                                  </td>
                                )}
                                <td className="p-3">
                                  <p className="font-bold text-slate-800">{log.leadName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{log.leadEmail}</p>
                                  {log.cc && (
                                    <p className="text-[9.5px] text-indigo-600 font-mono mt-0.5 truncate max-w-xs" title={`CC: ${log.cc}`}>
                                      <span className="font-bold text-indigo-800">CC:</span> {log.cc}
                                    </p>
                                  )}
                                  {log.bcc && (
                                    <p className="text-[9.5px] text-purple-600 font-mono mt-0.5 truncate max-w-xs" title={`CCO: ${log.bcc}`}>
                                      <span className="font-bold text-purple-800">CCO:</span> {log.bcc}
                                    </p>
                                  )}
                                </td>
                                <td className="p-3 font-semibold text-slate-700 max-w-xs truncate">{log.subject}</td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  {hasAttachments ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingEmailLog(log)}
                                      className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-0.8 rounded-full text-[10px] font-extrabold cursor-pointer transition"
                                      title="Ver archivos adjuntos"
                                    >
                                      <Paperclip className="w-3 h-3 text-indigo-600" />
                                      <span>{log.attachments!.length} adjunto{log.attachments!.length > 1 ? "s" : ""}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 font-mono text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono text-slate-500">{log.sentAt}</td>
                                <td className="p-3 text-center font-semibold text-slate-600">{log.sentBy}</td>
                                <td className="p-3 text-center">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                                    {log.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setViewingEmailLog(log)}
                                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                                      title="Ver Detalle del Correo"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Ver</span>
                                    </button>

                                    {isUserSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => setEmailLogToDelete(log)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                                        title="Eliminar este correo enviado (Superadministrador)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: REPOSITORIO DE DOCUMENTOS */}
          {activeTab === "Repositorio" && (
            <div className="space-y-6">
              {/* Header KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Documentos Registrados</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-slate-800 font-mono">{repositoryDocs.length}</span>
                    <span className="text-[10px] text-slate-400 font-medium">archivos en repositorio</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Documentos Vigentes</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-emerald-600 font-mono">
                      {repositoryDocs.filter(d => getDocValidityStatus(d).status === "Vigente").length}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">vigentes</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Próximos a Vencer (≤30d)</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-amber-600 font-mono">
                      {repositoryDocs.filter(d => getDocValidityStatus(d).status === "Próximo a Vencer").length}
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold">requieren atención</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Vencidos / Por Renovar</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-rose-600 font-mono">
                      {repositoryDocs.filter(d => getDocValidityStatus(d).status === "Vencido").length}
                    </span>
                    <span className="text-[10px] text-rose-600 font-bold">vencidos</span>
                  </div>
                </div>
              </div>

              {/* Action Bar & Filters */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={repoSearchTerm}
                      onChange={e => setRepoSearchTerm(e.target.value)}
                      placeholder="Buscar título, archivo, institución..."
                      className="w-full border border-slate-200 bg-white rounded-xl pl-9 pr-3 py-2 font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={repoCategoryFilter}
                    onChange={e => setRepoCategoryFilter(e.target.value)}
                    className="w-full sm:w-auto border border-slate-200 bg-white rounded-xl p-2 font-bold text-slate-700 outline-none"
                  >
                    <option value="Todas">Todas las Categorías</option>
                    {(catalogs['Categorías de Documentos'] || []).map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    {(catalogs['Categorías de Documentos'] || []).length === 0 && (
                      <>
                        <option value="Contratos y Convenios">Contratos y Convenios</option>
                        <option value="Propuestas Comerciales">Propuestas Comerciales</option>
                        <option value="Acreditaciones y Licencias">Acreditaciones y Licencias</option>
                        <option value="Documentación Legal y Fiscal">Documentación Legal y Fiscal</option>
                        <option value="Comprobantes y Facturación">Comprobantes y Facturación</option>
                        <option value="Manuales y Políticas">Manuales y Políticas</option>
                        <option value="Otros Documentos">Otros Documentos</option>
                      </>
                    )}
                  </select>

                  <select
                    value={repoValidityFilter}
                    onChange={e => setRepoValidityFilter(e.target.value)}
                    className="w-full sm:w-auto border border-slate-200 bg-white rounded-xl p-2 font-bold text-slate-700 outline-none"
                  >
                    <option value="Todas">Todas las Vigencias</option>
                    <option value="Vigente">Vigente</option>
                    <option value="Próximo a Vencer">Próximo a Vencer</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Sin Vigencia">Sin Vigencia</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenNewRepoDoc}
                  className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Subir Documento
                </button>
              </div>

              {/* Documents Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200 text-[10px] tracking-wider">
                        <th className="p-3.5">Documento / Título</th>
                        <th className="p-3.5">Fecha Carga (Auto)</th>
                        <th className="p-3.5">Categoría</th>
                        <th className="p-3.5">Prospecto / Institución</th>
                        <th className="p-3.5">Vigencia & Estatus</th>
                        <th className="p-3.5">Subido Por</th>
                        <th className="p-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {repositoryDocs
                        .filter(doc => {
                          const matchesSearch = 
                            doc.title.toLowerCase().includes(repoSearchTerm.toLowerCase()) ||
                            doc.fileName.toLowerCase().includes(repoSearchTerm.toLowerCase()) ||
                            (doc.leadName && doc.leadName.toLowerCase().includes(repoSearchTerm.toLowerCase())) ||
                            (doc.notes && doc.notes.toLowerCase().includes(repoSearchTerm.toLowerCase()));

                          const matchesCategory = repoCategoryFilter === "Todas" || doc.category === repoCategoryFilter;

                          const validityInfo = getDocValidityStatus(doc);
                          const matchesValidity = repoValidityFilter === "Todas" || validityInfo.status === repoValidityFilter;

                          return matchesSearch && matchesCategory && matchesValidity;
                        })
                        .map(doc => {
                          const valStatus = getDocValidityStatus(doc);

                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5">
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                                    <FileText className="w-4.5 h-4.5" />
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{doc.title}</h4>
                                    <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                                      <span className="truncate max-w-[180px]">{doc.fileName}</span>
                                      <span>•</span>
                                      <span>{doc.fileSize}</span>
                                    </div>
                                    {doc.notes && (
                                      <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">{doc.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {doc.date}
                                </span>
                              </td>

                              <td className="p-3.5 whitespace-nowrap">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider">
                                  {doc.category}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className="font-bold text-slate-700 text-xs block">
                                  {doc.leadName || "General / Corporativo"}
                                </span>
                              </td>

                              <td className="p-3.5 whitespace-nowrap">
                                <div className="space-y-1">
                                  <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${valStatus.badge}`}>
                                    {valStatus.label}
                                  </span>
                                  {doc.hasValidity && doc.validityDate && (
                                    <p className="text-[10px] text-slate-400 font-mono">Vence: {doc.validityDate}</p>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 whitespace-nowrap">
                                <span className="font-semibold text-slate-600 text-xs">{doc.uploadedBy}</span>
                              </td>

                              <td className="p-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => handleQuickSendDocByEmail(doc)}
                                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                                    title="Enviar este Documento por Correo a un Prospecto"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                                    title="Ver / Descargar Documento"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditRepoDoc(doc)}
                                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                    title="Editar Documento"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteRepoDoc(doc)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                    title="Eliminar Documento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {repositoryDocs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-slate-600 text-xs">No hay documentos registrados en el repositorio</p>
                            <p className="text-[11px] mt-1">Haz clic en "+ Subir Documento" para agregar expedientes, convenios o propuestas.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CRM TAREAS CONCENTRATOR */}
          {activeTab === "Tareas" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Action Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-indigo-800/40">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                      <CheckSquare className="w-5 h-5" />
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Gestión Concentrada de Tareas y Seguimiento
                    </h3>
                  </div>
                  <p className="text-indigo-200 text-xs font-medium max-w-2xl leading-relaxed">
                    Concentra todas las tareas del CRM (realizadas y por hacer). Todas las actividades creadas se sincronizan aquí con alertas automáticas por Correo y WhatsApp a los responsables asignados.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      taskNotificationConfig?.emailEnabled || taskNotificationConfig?.whatsappEnabled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      <Bell className="w-3 h-3" />
                      {taskNotificationConfig?.emailEnabled && taskNotificationConfig?.whatsappEnabled
                        ? "Notificaciones Activas (Email + WhatsApp)"
                        : taskNotificationConfig?.emailEnabled
                        ? "Notificaciones Activas (Solo Email)"
                        : taskNotificationConfig?.whatsappEnabled
                        ? "Notificaciones Activas (Solo WhatsApp)"
                        : "Notificaciones Desactivadas"}
                    </span>
                    <span className="text-indigo-300 text-[10px] font-mono">
                      Umbral de aviso: {taskNotificationConfig?.deadlineReminderDaysBefore || 2} días antes
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isScanningTasks}
                    onClick={handleManualDeadlineScan}
                    className="bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    title="Escanear tareas próximas a vencer y despachar recordatorios a responsables"
                  >
                    {isScanningTasks ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                        <span>Escaneando...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span>Escanear Vencimientos</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenNewTask}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-500/30 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nueva Tarea</span>
                  </button>
                </div>
              </div>

              {/* Indicator KPIs */}
              {(() => {
                const totalTasksCount = tasks.length;
                const pendingTasksCount = tasks.filter(t => t.status === "Pendiente").length;
                const completedTasksCount = tasks.filter(t => t.status === "Completada").length;
                
                const todayStr = new Date().toISOString().split("T")[0];
                const overdueTasksCount = tasks.filter(t => t.status === "Pendiente" && t.dueDate && t.dueDate < todayStr).length;
                
                const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Total Tareas</span>
                        <List className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="text-2xl font-black text-slate-800 font-mono block">{totalTasksCount}</span>
                      <p className="text-[10px] text-slate-400 font-medium">Registradas en el CRM</p>
                    </div>

                    <div className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest font-mono">Por Hacer (Pendientes)</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-2xl font-black text-amber-700 font-mono block">{pendingTasksCount}</span>
                      <p className="text-[10px] text-amber-600 font-medium">Requieren seguimiento</p>
                    </div>

                    <div className="bg-white border border-emerald-200/80 p-4 rounded-2xl shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest font-mono">Realizadas</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-2xl font-black text-emerald-700 font-mono block">{completedTasksCount}</span>
                      <p className="text-[10px] text-emerald-600 font-medium">Completadas con éxito</p>
                    </div>

                    <div className="bg-white border border-rose-200/80 p-4 rounded-2xl shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest font-mono">Vencidas</span>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      </div>
                      <span className="text-2xl font-black text-rose-700 font-mono block">{overdueTasksCount}</span>
                      <p className="text-[10px] text-rose-600 font-medium">Fecha anterior a hoy</p>
                    </div>

                    <div className="bg-white border border-indigo-200/80 p-4 rounded-2xl shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest font-mono">Tasa Cumplimiento</span>
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="text-2xl font-black text-indigo-700 font-mono block">{completionRate}%</span>
                      <p className="text-[10px] text-indigo-600 font-medium">Efectividad general</p>
                    </div>
                  </div>
                );
              })()}

              {/* Search & Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Search text */}
                  <div className="lg:col-span-2 relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                      placeholder="Buscar por título, notas o prospecto..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>

                  {/* Status filter */}
                  <div>
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todas">Estatus: Todas</option>
                      <option value="Pendiente">⏳ Por Hacer (Pendiente)</option>
                      <option value="Completada">✅ Realizada (Completada)</option>
                    </select>
                  </div>

                  {/* Type filter */}
                  <div>
                    <select
                      value={taskTypeFilter}
                      onChange={(e) => setTaskTypeFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todos">Tipo: Todos</option>
                      <option value="Llamada">📞 Llamada</option>
                      <option value="Correo">✉️ Correo</option>
                      <option value="Visita">📍 Visita Presencial</option>
                      <option value="Meet">📹 Videollamada Meet</option>
                      <option value="Otro">📄 Otro / General</option>
                    </select>
                  </div>

                  {/* Priority filter */}
                  <div>
                    <select
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todas">Prioridad: Todas</option>
                      <option value="Alta">🔴 Prioridad Alta</option>
                      <option value="Media">🟡 Prioridad Media</option>
                      <option value="Baja">⚪ Prioridad Baja</option>
                    </select>
                  </div>

                  {/* Team Filter */}
                  <div>
                    <select
                      value={taskTeamFilter}
                      onChange={(e) => setTaskTeamFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todos">👥 Equipo: Todos</option>
                      {teams.map(t => (
                        <option key={t.id} value={String(t.id)}>👥 {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Second filter line: User + Lead */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 items-center">
                  {/* Responsible User Filter */}
                  <div>
                    <select
                      value={taskUserFilter}
                      onChange={(e) => setTaskUserFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todos">👤 Responsable: Todos</option>
                      {users.map(u => (
                        <option key={u.id} value={String(u.id)}>{u.name}</option>
                      ))}
                      <option value="unassigned">Sin Asignar</option>
                    </select>
                  </div>

                  {/* Additional Lead filter */}
                  <div className="flex items-center space-x-2 w-full">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={taskLeadFilter}
                      onChange={(e) => setTaskLeadFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Todos">🏢 Todos los Prospectos</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    {(taskSearchTerm || taskStatusFilter !== "Todas" || taskTypeFilter !== "Todos" || taskPriorityFilter !== "Todas" || taskLeadFilter !== "Todos" || taskTeamFilter !== "Todos" || taskUserFilter !== "Todos") && (
                      <button
                        onClick={() => {
                          setTaskSearchTerm("");
                          setTaskStatusFilter("Todas");
                          setTaskTypeFilter("Todos");
                          setTaskPriorityFilter("Todas");
                          setTaskLeadFilter("Todos");
                          setTaskTeamFilter("Todos");
                          setTaskUserFilter("Todos");
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition underline cursor-pointer"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Concentrado General de Tareas ({
                        tasks.filter(t => {
                          const matchedLead = leads.find(l => String(l.id) === String(t.leadId));
                          const leadName = matchedLead ? matchedLead.name : "";

                          const matchesSearch = 
                            t.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                            (t.notes && t.notes.toLowerCase().includes(taskSearchTerm.toLowerCase())) ||
                            leadName.toLowerCase().includes(taskSearchTerm.toLowerCase());

                          const matchesStatus = taskStatusFilter === "Todas" || t.status === taskStatusFilter;
                          const matchesType = taskTypeFilter === "Todos" || t.type === taskTypeFilter;
                          const matchesPriority = taskPriorityFilter === "Todas" || t.priority === taskPriorityFilter;
                          const matchesLead = taskLeadFilter === "Todos" || String(t.leadId) === String(taskLeadFilter);
                          
                          const matchesTeam = taskTeamFilter === "Todos" || (
                            t.teamId !== undefined && String(t.teamId) === String(taskTeamFilter)
                          ) || (
                            t.userIds && t.userIds.some((uid: number) => {
                              const u = users.find(user => user.id === uid);
                              return u && String(u.teamId) === String(taskTeamFilter);
                            })
                          );

                          const matchesUser = taskUserFilter === "Todos" || (
                            taskUserFilter === "unassigned" 
                              ? (!t.userId && (!t.userIds || t.userIds.length === 0))
                              : (
                                String(t.userId) === taskUserFilter ||
                                (t.userIds && t.userIds.includes(Number(taskUserFilter)))
                              )
                          );

                          return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesLead && matchesTeam && matchesUser;
                        }).length
                      })
                    </h3>
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    Sincronización en tiempo real
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        <th className="p-3.5 text-center w-12">Estado</th>
                        <th className="p-3.5">Tarea / Actividad</th>
                        <th className="p-3.5">Prospecto / Institución</th>
                        <th className="p-3.5">Tipo & Prioridad</th>
                        <th className="p-3.5">Fecha Realización</th>
                        <th className="p-3.5">Equipo & Asignados</th>
                        <th className="p-3.5 text-center w-28">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {tasks
                        .filter(t => {
                          const matchedLead = leads.find(l => String(l.id) === String(t.leadId));
                          const leadName = matchedLead ? matchedLead.name : "";

                          const matchesSearch = 
                            t.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                            (t.notes && t.notes.toLowerCase().includes(taskSearchTerm.toLowerCase())) ||
                            leadName.toLowerCase().includes(taskSearchTerm.toLowerCase());

                          const matchesStatus = taskStatusFilter === "Todas" || t.status === taskStatusFilter;
                          const matchesType = taskTypeFilter === "Todos" || t.type === taskTypeFilter;
                          const matchesPriority = taskPriorityFilter === "Todas" || t.priority === taskPriorityFilter;
                          const matchesLead = taskLeadFilter === "Todos" || String(t.leadId) === String(taskLeadFilter);

                          const matchesTeam = taskTeamFilter === "Todos" || (
                            t.teamId !== undefined && String(t.teamId) === String(taskTeamFilter)
                          ) || (
                            t.userIds && t.userIds.some((uid: number) => {
                              const u = users.find(user => user.id === uid);
                              return u && String(u.teamId) === String(taskTeamFilter);
                            })
                          );

                          const matchesUser = taskUserFilter === "Todos" || (
                            taskUserFilter === "unassigned" 
                              ? (!t.userId && (!t.userIds || t.userIds.length === 0))
                              : (
                                String(t.userId) === taskUserFilter ||
                                (t.userIds && t.userIds.includes(Number(taskUserFilter)))
                              )
                          );

                          return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesLead && matchesTeam && matchesUser;
                        })
                        .map(task => {
                          const matchedLead = leads.find(l => String(l.id) === String(task.leadId));
                          const todayStr = new Date().toISOString().split("T")[0];
                          const isOverdue = task.status === "Pendiente" && task.dueDate && task.dueDate < todayStr;
                          const assignedIds = task.userIds && task.userIds.length > 0 
                            ? task.userIds 
                            : (task.userId ? [task.userId] : []);
                          const assignedUser = users.find(u => u.id === (task.userId || assignedIds[0]));

                          const getTypeIcon = (type?: string) => {
                            switch(type) {
                              case "Llamada": return <Phone className="w-3.5 h-3.5 text-blue-600" />;
                              case "Correo": return <Mail className="w-3.5 h-3.5 text-purple-600" />;
                              case "Visita": return <MapPin className="w-3.5 h-3.5 text-emerald-600" />;
                              case "Meet": return <Video className="w-3.5 h-3.5 text-indigo-600" />;
                              default: return <FileText className="w-3.5 h-3.5 text-slate-500" />;
                            }
                          };

                          return (
                            <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Toggle Checkbox */}
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleTaskStatus(task)}
                                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                    task.status === "Completada"
                                      ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                                      : "bg-white text-slate-300 border-slate-300 hover:border-indigo-500 hover:text-indigo-500"
                                  }`}
                                  title={task.status === "Completada" ? "Marcar como pendiente" : "Marcar como realizada"}
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </button>
                              </td>

                              {/* Task Title & Notes */}
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className={`font-bold text-xs leading-snug block ${
                                    task.status === "Completada" ? "line-through text-slate-400" : "text-slate-800"
                                  }`}>
                                    {task.title}
                                  </span>
                                  {task.notes && (
                                    <p className="text-[10.5px] text-slate-500 italic line-clamp-1">{task.notes}</p>
                                  )}
                                </div>
                              </td>

                              {/* Linked Lead */}
                              <td className="p-3.5 whitespace-nowrap">
                                {matchedLead ? (
                                  <button
                                    onClick={() => {
                                      setViewingLead(matchedLead);
                                      setIsLeadModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg text-[11px] font-bold text-indigo-800 transition cursor-pointer"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{matchedLead.name}</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-semibold italic">
                                    General / Sin prospecto
                                  </span>
                                )}
                              </td>

                              {/* Type & Priority Badges */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                    {getTypeIcon(task.type)}
                                    {task.type || "General"}
                                  </span>

                                  {task.priority && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider border ${
                                      task.priority === "Alta"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : task.priority === "Media"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}>
                                      {task.priority}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Due Date & Overdue Tag */}
                              <td className="p-3.5 whitespace-nowrap font-mono">
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {task.dueDate}
                                  </span>
                                  {isOverdue && (
                                    <span className="block text-[9px] font-black text-rose-600 uppercase tracking-widest">
                                      ⚠️ Vencida
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Assignee & Team */}
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="space-y-1">
                                  {task.teamId && (() => {
                                    const tObj = teams.find(t => t.id === task.teamId);
                                    return tObj ? (
                                      <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200/80 mb-0.5">
                                        <Users className="w-3 h-3" />
                                        <span>{tObj.name}</span>
                                      </div>
                                    ) : null;
                                  })()}

                                  {assignedIds.length === 0 ? (
                                    <span className="font-bold text-slate-400 text-xs italic block">
                                      Sin Asignar
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      {assignedIds.map(uid => {
                                        const u = users.find(user => user.id === uid);
                                        if (!u) return null;
                                        const uTeam = teams.find(t => t.id === u.teamId);
                                        return (
                                          <div key={uid} className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-800 text-xs">
                                              {u.name}
                                            </span>
                                            {uTeam && !task.teamId && (
                                              <span className="text-[9px] text-slate-400 font-normal">
                                                ({uTeam.name})
                                              </span>
                                            )}
                                            <div className="flex items-center gap-1">
                                              {u.email ? (
                                                <span title={`Email activo: ${u.email}`} className="text-indigo-600 bg-indigo-50 p-0.5 rounded cursor-help">
                                                  <Mail className="w-3 h-3" />
                                                </span>
                                              ) : null}
                                              {(u.phone || (u as any).cellphone) ? (
                                                <span title={`WhatsApp activo: ${u.phone || (u as any).cellphone}`} className="text-emerald-600 bg-emerald-50 p-0.5 rounded cursor-help">
                                                  <MessageSquare className="w-3 h-3" />
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => handleToggleTaskStatus(task)}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                      task.status === "Completada"
                                        ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                    }`}
                                    title={task.status === "Completada" ? "Marcar como Pendiente" : "Marcar Completada"}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>

                                  {/* Re-send assignment notification */}
                                  <button
                                    onClick={async () => {
                                      const confirmSend = window.confirm(`¿Reenviar notificación de asignación a los responsables por Email y WhatsApp?`);
                                      if (!confirmSend) return;
                                      const res = await notifyTaskAssignee(task, { force: true });
                                      if (res.notified) {
                                        alert(`✅ Notificación de asignación despachada a los responsables por: ${res.channels.join(" y ")}`);
                                      } else {
                                        alert(`⚠️ No se pudo enviar notificación: ${res.reason || "Canales inactivos o sin datos de contacto"}`);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                                    title="Reenviar Notificación Automática (Email/WhatsApp)"
                                  >
                                    <Bell className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditTask(task)}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                                    title="Editar Tarea"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setTaskToDelete(task)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                    title="Eliminar Tarea"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {tasks.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            <CheckSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-slate-600 text-xs">No hay tareas registradas en el sistema</p>
                            <p className="text-[11px] mt-1">Haz clic en "+ Nueva Tarea" para programar una actividad o seguimiento.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT CRM LEAD */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title={editingLead ? `${editingLead.name} - Detalles` : "Crear Nuevo Prospecto CRM"}
        size="5xl"
      >
        <div className="space-y-4 font-sans text-xs">
          {/* TAB BAR FOR EXISTING LEADS */}
          {editingLead && (
            <div className="flex border-b border-slate-200 gap-1 mb-2">
              <button
                type="button"
                onClick={() => setLeadModalTab("info")}
                className={`flex-1 pb-2.5 pt-1 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  leadModalTab === "info"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                📋 Datos Básicos
              </button>
              <button
                type="button"
                onClick={() => setLeadModalTab("actividades")}
                className={`flex-1 pb-2.5 pt-1 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  leadModalTab === "actividades"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                ⚡ Actividades y Contactos
                {(() => {
                  const leadTasksCount = tasks.filter(t => t.leadId === editingLead.id).length;
                  if (leadTasksCount > 0) {
                    return (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        {leadTasksCount}
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>
            </div>
          )}

          {(!editingLead || leadModalTab === "info") ? (
            <form onSubmit={handleSaveLeadSubmit} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* COLUMNA IZQUIERDA: DATOS DE CONTACTO Y DIRECCIÓN (col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* SECCIÓN 1: IDENTIFICACIÓN Y CONTACTO */}
                  <div className="bg-slate-50/50 hover:bg-slate-55/40 border border-slate-150 rounded-xl p-4 space-y-3.5 transition-colors">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1" /> Datos de Identificación y Contacto
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {leadForm.type === "Institución Potencial" 
                          ? "Nombre de la Institución Educativa" 
                          : leadForm.type === "Redes Sociales"
                            ? "Nombre / Perfil de Redes Sociales (ej. @colegio_inter)"
                            : "Nombre Completo del Particular"}
                      </label>
                      <input 
                        type="text"
                        required
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder={
                          leadForm.type === "Institución Potencial" 
                            ? "Colegio Interamericano" 
                            : leadForm.type === "Redes Sociales"
                              ? "@colegio_bilingue o Perfil de Redes"
                              : "Juan Alarcón Díaz"
                        }
                      />
                    </div>

                    {leadForm.type === "Institución Potencial" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contacto Principal</label>
                          <input 
                            type="text"
                            required
                            value={leadForm.contactName}
                            onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                            placeholder="Dra. Sylvia Estrada"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Website / URL</label>
                          <input 
                            type="text"
                            value={leadForm.website}
                            onChange={(e) => setLeadForm({ ...leadForm, website: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-[11px]"
                            placeholder="https://institucion.edu"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contacto / Padre / Tutor</label>
                          <input 
                            type="text"
                            required
                            value={leadForm.contactName}
                            onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                            placeholder="Padre, Madre o Tutor"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-indigo-500" /> Grado a Cursar
                          </label>
                          <input 
                            type="text"
                            value={leadForm.gradeToTake}
                            onChange={(e) => setLeadForm({ ...leadForm, gradeToTake: e.target.value })}
                            className="w-full border border-indigo-250 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-indigo-950 shadow-2xs"
                            placeholder="Ej. 9° Grado, 3° Secundaria, 10th..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-500" /> Créditos por Cursar
                          </label>
                          <input 
                            type="text"
                            value={leadForm.creditsToTake}
                            onChange={(e) => setLeadForm({ ...leadForm, creditsToTake: e.target.value })}
                            className="w-full border border-indigo-250 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-indigo-950 shadow-2xs"
                            placeholder="Ej. 6 Créditos, 4 Full Credits..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                        <input 
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                          placeholder="contacto@institucion.edu"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono Móvil / Fijo</label>
                        <input 
                          type="text"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                          placeholder="+52 55 1234 5678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: DIRECCIÓN Y GEOGRAFÍA */}
                  <div className="bg-slate-50/50 hover:bg-slate-55/40 border border-slate-150 rounded-xl p-4 space-y-3.5 transition-colors">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1" /> Ubicación Geográfica
                    </h4>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calle y Número (Dirección)</label>
                      <input 
                        type="text"
                        value={leadForm.address}
                        onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="Av. Juárez #105, Col. Centro"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Ciudad</label>
                        <input 
                          type="text"
                          value={leadForm.city}
                          onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Puebla"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado / Prov.</label>
                        <input 
                          type="text"
                          value={leadForm.state}
                          onChange={(e) => setLeadForm({ ...leadForm, state: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Puebla"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">País</label>
                        <input 
                          type="text"
                          value={leadForm.country}
                          onChange={(e) => setLeadForm({ ...leadForm, country: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                          placeholder="México"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN PROGRAMA DE INTERÉS (HOMESCHOOL) - EXCLUSIVO PARA PROSPECTO INDIVIDUAL */}
                  {leadForm.type === "Persona Potencial" && (
                    <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-4 space-y-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-indigo-600" /> Programa de Interés (Homeschool)
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                            Prospecto Individual
                          </span>
                          {!isAddingProgramInline && (
                            <button
                              type="button"
                              onClick={() => setIsAddingProgramInline(true)}
                              className="text-[10px] text-indigo-700 bg-white hover:bg-indigo-100/80 border border-indigo-300 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3" /> Nuevo Programa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline quick program adder */}
                      {isAddingProgramInline && (
                        <div className="bg-white border border-indigo-200 rounded-xl p-3 space-y-2.5 shadow-xs animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
                              + Añadir Nuevo Programa al Catálogo Homeschool
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingProgramInline(false);
                                setInlineProgramName("");
                                setInlineProgramDesc("");
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">Nombre del Programa <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                value={inlineProgramName}
                                onChange={(e) => setInlineProgramName(e.target.value)}
                                placeholder="Ej. Dual Diploma Express, Summer Course..."
                                className="w-full border border-indigo-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">Descripción (Opcional)</label>
                              <input
                                type="text"
                                value={inlineProgramDesc}
                                onChange={(e) => setInlineProgramDesc(e.target.value)}
                                placeholder="Breve descripción del programa..."
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingProgramInline(false);
                                setInlineProgramName("");
                                setInlineProgramDesc("");
                              }}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAddProgram()}
                              disabled={!inlineProgramName.trim()}
                              className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                              Guardar y Seleccionar
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Seleccionar Programa de Interés (Catálogo Homeschool)
                        </label>
                        <select
                          value={leadForm.programOfInterest || ""}
                          onChange={(e) => setLeadForm({ ...leadForm, programOfInterest: e.target.value })}
                          className="w-full border border-indigo-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-950 shadow-2xs"
                        >
                          <option value="">-- Seleccionar Programa de Interés --</option>
                          {(catalogs['Programas Homeschool'] || []).map((prog) => (
                            <option key={prog.id} value={prog.name}>
                              {prog.name} {prog.description ? `— ${prog.description}` : ""}
                            </option>
                          ))}
                        </select>
                        {leadForm.programOfInterest && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-indigo-700 bg-indigo-100/50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            <span className="font-bold">Programa seleccionado:</span>
                            <span className="font-semibold">{leadForm.programOfInterest}</span>
                            {catalogs['Programas Homeschool']?.find(p => p.name === leadForm.programOfInterest)?.description && (
                              <span className="text-slate-500 text-[10px]">
                                • {catalogs['Programas Homeschool']?.find(p => p.name === leadForm.programOfInterest)?.description}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Grado a Cursar
                          </label>
                          <input 
                            type="text"
                            value={leadForm.gradeToTake}
                            onChange={(e) => setLeadForm({ ...leadForm, gradeToTake: e.target.value })}
                            className="w-full border border-indigo-250 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-950 shadow-2xs"
                            placeholder="Ej. 9° Grado / 3° Secundaria, 10th..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Créditos por Cursar
                          </label>
                          <input 
                            type="text"
                            value={leadForm.creditsToTake}
                            onChange={(e) => setLeadForm({ ...leadForm, creditsToTake: e.target.value })}
                            className="w-full border border-indigo-250 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-950 shadow-2xs"
                            placeholder="Ej. 6 Créditos, 4.0, 1 Full Credit..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN EVALUACIÓN ACADÉMICA / CALIFICACIÓN EXAMEN INGLÉS */}
                  {(leadForm.type === "Persona Potencial" || leadForm.status === "Examen Inglés" || leadForm.englishExamScore) && (
                    <div className="bg-cyan-50/40 border border-cyan-200/80 rounded-xl p-4 space-y-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-800 flex items-center">
                          <Award className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Evaluación Académica & Examen de Inglés
                        </h4>
                        <span className="text-[9px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded-full border border-cyan-200">
                          {leadForm.type === "Persona Potencial" ? "Prospecto Individual" : "Evaluación de Inglés"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Calificación de Examen Inglés
                          </label>
                          <input 
                            type="text"
                            value={leadForm.englishExamScore}
                            onChange={(e) => setLeadForm({ ...leadForm, englishExamScore: e.target.value })}
                            className="w-full border border-cyan-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-cyan-500 bg-white font-bold text-slate-800 shadow-2xs"
                            placeholder="Ej. 85/100, B2 Intermedio Alto, TOEFL 85, 9.0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Fecha de Presentación (Opcional)
                          </label>
                          <input 
                            type="date"
                            value={leadForm.englishExamDate}
                            onChange={(e) => setLeadForm({ ...leadForm, englishExamDate: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {leadForm.type === "Institución Potencial" && (
                    <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-750 flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1" /> Contactos del Colegio / Institución
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setLeadForm(prev => ({
                              ...prev,
                              contacts: [
                                ...(prev.contacts || []),
                                { name: "", role: "", phone: "", email: "" }
                              ]
                            }));
                          }}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-750 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>+ Agregar Contacto</span>
                        </button>
                      </div>

                      {(!leadForm.contacts || leadForm.contacts.length === 0) ? (
                        <div className="text-center py-4 bg-white/65 border border-dashed border-slate-300 rounded-lg text-slate-400">
                          Sin contactos adicionales. Haz clic en "+ Agregar Contacto" para registrar otros enlaces clave.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {leadForm.contacts.map((contact, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 relative space-y-2.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setLeadForm(prev => ({
                                    ...prev,
                                    contacts: (prev.contacts || []).filter((_, idx) => idx !== index)
                                  }));
                                }}
                                className="absolute top-2.5 right-2.5 text-slate-350 hover:text-rose-600 transition p-1 hover:bg-rose-50 rounded-md cursor-pointer"
                                title="Eliminar contacto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[9px] font-black uppercase text-indigo-500 block tracking-wider">Contacto #{index + 1}</span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nombre Completo</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.name}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].name = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white text-slate-755 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: Lic. Regina Mendoza"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Puesto / Cargo</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.role}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].role = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white text-slate-755 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: Control Escolar / Directora"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teléfono</label>
                                  <input
                                    type="text"
                                    value={contact.phone}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].phone = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: +52 55 1234 5678"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</label>
                                  <input
                                    type="email"
                                    value={contact.email}
                                    onChange={(e) => {
                                      const updated = [...(leadForm.contacts || [])];
                                      updated[index].email = e.target.value;
                                      setLeadForm({ ...leadForm, contacts: updated });
                                    }}
                                    className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-mono focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej: r.mendoza@britanico.edu.mx"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* COLUMNA DERECHA: PARAMETRIZACIÓN COMERCIAL (col-span-5) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* SECCIÓN 3: CONFIGURACIÓN COMERCIAL */}
                  <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-4 space-y-3.5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none"></div>
                    
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-800 flex items-center relative z-10">
                      <Settings className="w-3.5 h-3.5 mr-1" /> Parámetros Negociación & CRM
                    </h4>

                    <div className="relative z-10">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Prospecto</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newType = "Institución Potencial";
                            const newStages = getStagesForType(newType);
                            const currentStatusValid = newStages.includes(leadForm.status);
                            setLeadForm({ 
                              ...leadForm, 
                              type: newType,
                              status: currentStatusValid ? leadForm.status : newStages[0]
                            });
                          }}
                          className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            leadForm.type === "Institución Potencial"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-black"
                              : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                          }`}
                        >
                          🏫 Institución (Colegio)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newType = "Persona Potencial";
                            const newStages = getStagesForType(newType);
                            const currentStatusValid = newStages.includes(leadForm.status);
                            setLeadForm({ 
                              ...leadForm, 
                              type: newType,
                              status: currentStatusValid ? leadForm.status : newStages[0]
                            });
                          }}
                          className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            leadForm.type === "Persona Potencial"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-black"
                              : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                          }`}
                        >
                          👤 Particular / Alumno
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newType = "Redes Sociales";
                            const newStages = getStagesForType(newType);
                            const currentStatusValid = newStages.includes(leadForm.status);
                            setLeadForm({ 
                              ...leadForm, 
                              type: newType,
                              status: currentStatusValid ? leadForm.status : newStages[0]
                            });
                          }}
                          className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            leadForm.type === "Redes Sociales"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-black"
                              : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                          }`}
                        >
                          📱 Redes Sociales
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Estatus del Pipeline ({leadForm.type === "Institución Potencial" ? "Institución" : leadForm.type === "Redes Sociales" ? "Redes Sociales" : "Particular"})
                        </label>
                        <select 
                          value={leadForm.status}
                          onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white font-bold text-slate-705"
                        >
                          {getStagesForType(leadForm.type).map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Origen / Fuente</label>
                        <select 
                          value={leadForm.source}
                          onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white text-slate-705 font-medium"
                        >
                          <option value="Recomendación">Recomendación</option>
                          <option value="Feria Educativa">Feria Educativa</option>
                          <option value="Campaña Digital">Campaña Digital</option>
                          <option value="Llamada Fría">Llamada Fría</option>
                          <option value="LinkedIn">LinkedIn Sales Navigator</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Estimado (USD)</label>
                        <input 
                          type="number"
                          min="0"
                          value={leadForm.value}
                          onChange={(e) => setLeadForm({ ...leadForm, value: Number(e.target.value) })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white font-mono font-bold text-slate-800"
                          placeholder="4000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agente Asignado</label>
                        <select 
                          value={leadForm.assignedTo}
                          onChange={(e) => setLeadForm({ ...leadForm, assignedTo: e.target.value })}
                          className="w-full border border-slate-250 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-550 bg-white text-slate-705 font-bold"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                          <option value="Admin Global">Admin Global</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 4: COMENTARIOS */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bitácora Inicial / Observaciones</label>
                    <textarea 
                      value={leadForm.notes}
                      onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 bg-white min-h-[95px] leading-relaxed text-slate-700"
                      placeholder="Registra acuerdos preliminares, necesidades de revalidación de materias..."
                    />
                  </div>

                </div>

              </div>

              {/* PIE DEL DIÁLOGO DE EDICIÓN */}
              <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  Guardar Prospecto
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* CONTACT LOGGING FORM */}
              <form onSubmit={handleLogContact} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4 shadow-sm relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <ActivityIcon className="w-4 h-4" />
                    </span>
                    Registrar Contacto o Interacción Realizada
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    ¿Hablaste con el prospecto? Registra la interacción para actualizar el historial y reflejarlo como tarea completada en la Agenda central.
                  </p>
                </div>

                <div className="space-y-3 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Título / Motivo del Contacto</label>
                    <input
                      type="text"
                      required
                      value={logTitle}
                      onChange={(e) => setLogTitle(e.target.value)}
                      placeholder="Ej: Llamada de presentación de programas, Reunión de seguimiento..."
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-150 focus:border-indigo-400 outline-none transition font-medium shadow-sm"
                    />
                  </div>

                  {/* PILL SELECTOR FOR CHANNELS */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Canal de Comunicación</label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                      {(["Llamada", "Correo", "Visita", "Meet", "Otro"] as const).map((type) => {
                        const isSelected = logType === type;
                        const config = {
                          Llamada: { icon: Phone, label: "Llamada", color: "bg-emerald-50 text-emerald-700 border-emerald-200 border-2" },
                          Correo: { icon: Mail, label: "Correo", color: "bg-blue-50 text-blue-700 border-blue-200 border-2" },
                          Visita: { icon: Globe, label: "Visita", color: "bg-amber-50 text-amber-700 border-amber-200 border-2" },
                          Meet: { icon: Video, label: "Meet", color: "bg-purple-50 text-purple-700 border-purple-200 border-2" },
                          Otro: { icon: FileText, label: "Otro", color: "bg-slate-50 text-slate-700 border-slate-200 border-2" }
                        }[type];
                        const Icon = config.icon;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setLogType(type)}
                            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                          >
                            <Icon className={`w-4 h-4 mb-1 ${isSelected ? "text-white" : "text-slate-400"}`} />
                            <span className="text-[10px] font-bold leading-none">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fecha de Interacción</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLogDate(new Date().toISOString().split("T")[0])}
                            className="text-[9px] font-extrabold text-indigo-600 hover:underline"
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() - 1);
                              setLogDate(d.toISOString().split("T")[0]);
                            }}
                            className="text-[9px] font-extrabold text-slate-505 hover:underline"
                          >
                            Ayer
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        required
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-150 outline-none transition shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Acuerdos / Notas Cortas</label>
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        required
                        placeholder="Qué se habló, dudas planteadas..."
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-150 outline-none transition h-[42px] resize-none font-medium shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1 relative z-10">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Registrar Contacto
                  </button>
                </div>
              </form>

              {/* UNIFIED DESIGN-CENTRIC TIMELINE */}
              <div className="space-y-4">
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Historial de Tareas y Pendientes
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Actividades programadas vinculadas desde la Agenda central</p>
                    </div>

                    {/* TIMELINE FILTER PILLS */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-full">
                      {(["Todas", "Pendiente", "Completada"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActivityFilter(tab)}
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activityFilter === tab
                              ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {tab === "Todas" ? "Todas" : tab === "Pendiente" ? "Pendientes" : "Completadas"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative pl-6 max-h-[340px] overflow-y-auto space-y-4 pr-1.5 scrollbar-thin">
                    {/* LEFT CONNECTOR LINE */}
                    <div className="absolute left-[9px] top-3.5 bottom-3 text-slate-100 w-0.5 bg-slate-200 pointer-events-none"></div>

                    {(() => {
                      const leadTasks = tasks.filter(t => t.leadId === editingLead.id);
                      const filteredTasks = leadTasks.filter(t => {
                        if (activityFilter === "Todas") return true;
                        return t.status === activityFilter;
                      });

                      if (filteredTasks.length === 0) {
                        return (
                          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-xs text-slate-600">No se encontraron actividades</p>
                            <p className="text-[10px] max-w-xs mx-auto mt-0.5">Define filtros diferentes o usa el formulario anterior para registrar contactos.</p>
                          </div>
                        );
                      }

                      return filteredTasks.sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((t) => {
                        const isDone = t.status === "Completada";
                        
                        // Icon mapping
                        const iconConfig = {
                          Llamada: { icon: Phone, color: "bg-emerald-50 text-emerald-600 border-emerald-100", accent: "border-l-emerald-500" },
                          Correo: { icon: Mail, color: "bg-blue-50 text-blue-600 border-blue-100", accent: "border-l-blue-500" },
                          Visita: { icon: Globe, color: "bg-amber-50 text-amber-600 border-amber-100", accent: "border-l-amber-500" },
                          Meet: { icon: Video, color: "bg-purple-50 text-purple-600 border-purple-100", accent: "border-l-purple-500" },
                          Otro: { icon: FileText, color: "bg-slate-50 text-slate-600 border-slate-100", accent: "border-l-slate-400" }
                        }[t.type || "Otro"];
                        const Icon = iconConfig.icon;

                        return (
                          <div 
                            key={t.id} 
                            className={`p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs relative overflow-hidden flex items-start gap-3 transition hover:shadow-sm border-l-4 ${iconConfig.accent} ${
                              isDone ? "opacity-75 bg-slate-50/50" : ""
                            }`}
                          >
                            {/* TIMELINE BULLET NODE */}
                            <div className="absolute -left-[22px] top-4.5 w-2.5 h-2.5 rounded-full ring-4 ring-white border border-slate-300 bg-indigo-500 z-10"></div>

                            {/* DYNAMIC CHECKBOX STATUS TOGGLE */}
                            <button
                              type="button"
                              onClick={() => {
                                const isAssigned = t.userId !== undefined && t.userId !== null && Number(t.userId) === Number(currentUser?.id);

                                if (!isSuperAdmin && !isAssigned) {
                                  alert("Solo el usuario asignado a esta tarea o el super administrador pueden cambiar su estado de finalización.");
                                  return;
                                }
                                updateTask(t.id, { status: isDone ? "Pendiente" : "Completada" });
                              }}
                              title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                              className="mt-1 shrink-0 text-slate-400 hover:text-indigo-600 transition"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500 shrink-0" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`p-1 rounded-md shrink-0 text-[10px] ${iconConfig.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </span>
                                    <p className={`font-bold text-xs text-slate-800 leading-snug ${isDone ? "line-through text-slate-500" : ""}`}>
                                      {t.title}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-450 font-bold mt-1.5 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                                    Programada: {t.dueDate}
                                  </p>
                                </div>

                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0 ${
                                  isDone ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                                }`}>
                                  {t.status}
                                </span>
                              </div>

                              {t.notes && (
                                <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium italic text-[11px] text-slate-600 relative">
                                  <span className="absolute top-1.5 right-2 text-[8px] text-slate-400 uppercase tracking-widest font-extrabold not-italic">notas</span>
                                  <p className="pr-6 whitespace-pre-wrap">"{t.notes}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* DIGEST BITACORA / NOTES HISTORY FORMATTING */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Historial Narrativo / Bitácora de Observaciones
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Solo lectura
                    </span>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl max-h-48 overflow-y-auto shadow-inner">
                    {editingLead.notes ? (
                      <div className="space-y-3">
                        {editingLead.notes.split("\n").filter(line => line.trim().length > 0).map((line, idx) => {
                          const isSpecialEntry = line.startsWith("[");
                          return (
                            <div 
                              key={idx} 
                              className={`text-[11px] leading-relaxed font-medium ${
                                isSpecialEntry 
                                  ? "bg-white p-2.5 rounded-xl border border-slate-100 text-slate-700 font-semibold shadow-xs" 
                                  : "text-slate-650 pl-2 border-l-2 border-slate-300"
                              }`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic text-center py-3">
                        Sin notas u observaciones guardadas aún para este prospecto.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsLeadModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
                  >
                    Cerrar Detalles
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: PROGRAM CRM ACTIVITY linked with central agenda */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="CRM: Programar Actividad / Seguimiento"
      >
        <form onSubmit={handleActivitySubmit} className="space-y-4 font-sans text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-250 mb-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Lead Asociado</span>
            <p className="text-xs font-black text-slate-700 mt-0.5">
              {leads.find(l => l.id === activityForm.leadId)?.name}
            </p>
            <p className="text-[10px] text-slate-550 mt-0.5">
              Contacto: {leads.find(l => l.id === activityForm.leadId)?.contactName}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título de la Actividad</label>
            <input 
              type="text"
              required
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              placeholder="Llamada de seguimiento, Presentación demostrativa, Enviar cotización..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Tarea</label>
              <select 
                value={activityForm.type}
                onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as TaskType })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
              >
                <option value="Llamada">📞 Llamada Telefónica</option>
                <option value="Correo">✉️ Correo Electrónico</option>
                <option value="Visita">📍 Visita Presencial</option>
                <option value="Meet">📹 Videollamada Google Meet</option>
                <option value="Otro">📄 Otro / Pendiente General</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Fecha de Realización</label>
              <input 
                type="date"
                required
                value={activityForm.dueDate}
                onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prioridad</label>
              <select 
                value={activityForm.priority || "Media"}
                onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value as "Alta" | "Media" | "Baja" })}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
              >
                <option value="Alta">🔴 Alta</option>
                <option value="Media">🟡 Media</option>
                <option value="Baja">⚪ Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Responsable Asignado</label>
            <select
              value={activityForm.userId !== undefined ? String(activityForm.userId) : (
                (() => {
                  const leadObj = leads.find(l => l.id === activityForm.leadId);
                  const assignedUser = leadObj ? users.find(u => u.name === leadObj.assignedTo) : null;
                  return assignedUser ? String(assignedUser.id) : (currentUser ? String(currentUser.id) : (users[0] ? String(users[0].id) : ""));
                })()
              )}
              onChange={(e) => setActivityForm({ ...activityForm, userId: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-700"
            >
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas / Instrucciones Adicionales</label>
            <textarea
              value={activityForm.notes || ""}
              onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
              placeholder="Detalles sobre lo que se debe preparar o acordar con el prospecto..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16"
            />
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl flex items-start space-x-3.5">
            <input 
              type="checkbox"
              id="syncAgenda"
              checked={activityForm.syncAgenda}
              onChange={(e) => setActivityForm({ ...activityForm, syncAgenda: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
            />
            <div className="space-y-0.5">
              <label htmlFor="syncAgenda" className="font-extrabold text-indigo-900 cursor-pointer block">
                Sincronizar con la Agenda General del Sistema
              </label>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Si está marcado, la tarea se registrará en el listado de Calendario/Agenda central y será visible en el Dashboard de Bienvenida para el agente respectivo.
              </p>
            </div>
          </div>

          {/* Notificación al Responsable Banner */}
          {(() => {
            const leadObj = leads.find(l => l.id === activityForm.leadId);
            const assignedUser = leadObj ? users.find(u => u.name === leadObj.assignedTo) : null;
            const targetUserId = activityForm.userId !== undefined ? activityForm.userId : (assignedUser?.id || currentUser?.id || users[0]?.id);
            const userObj = users.find(u => u.id === targetUserId);
            const isEmailOn = taskNotificationConfig?.emailEnabled;
            const isWhatsAppOn = taskNotificationConfig?.whatsappEnabled;

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wide">
                      Avisos Inmediatos y Recordatorio de Vencimiento
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {userObj?.name || "Sin asignar"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 font-medium">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isEmailOn && userObj?.email ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span>Email: <strong className="font-mono text-slate-800">{userObj?.email || "Sin email"}</strong></span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isWhatsAppOn && (userObj?.phone || (userObj as any)?.cellphone) ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span>WhatsApp: <strong className="font-mono text-slate-800">{userObj?.phone || (userObj as any)?.cellphone || "Sin teléfono"}</strong></span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end space-x-2.5 pt-4">
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold animate-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 opacity-90 hover:opacity-100 text-white rounded-lg font-bold transition flex items-center"
            >
              Programar Actividad
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: PIPELINE STAGES REORDERING & SETTINGS */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configuración de Etapas del Pipeline"
      >
        <div className="space-y-5 font-sans text-xs">
          <div>
            <p className="text-slate-500 leading-relaxed text-xs">
              Define y ordena las etapas de negociación para cada tipo de prospecto. 
              <strong> Haz clic y arrastra </strong> las etapas desde el controlador vertical <GripVertical className="inline w-3 h-3 text-slate-400" /> para cambiar el orden de prioridad visual en el Kanban, o utiliza las <strong>flechas de ordenamiento</strong>. Los cambios se guardarán automáticamente.
            </p>
          </div>

          {/* Pipeline Type Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setConfigPipelineType('Institución Potencial')}
              className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                configPipelineType === 'Institución Potencial'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Instituciones ({institutionStages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigPipelineType('Persona Potencial')}
              className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                configPipelineType === 'Persona Potencial'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Particulares ({particularStages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigPipelineType('Redes Sociales')}
              className={`flex-1 py-2 rounded-lg font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                configPipelineType === 'Redes Sociales'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-pink-600" />
              <span>Redes Sociales ({redesSocialesStages.length})</span>
            </button>
          </div>

          {/* Quick Stage Creation Form */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Crear Nueva Etapa Personalizada en {configPipelineType === 'Persona Potencial' ? 'Particulares' : configPipelineType === 'Redes Sociales' ? 'Redes Sociales' : 'Instituciones'}
            </span>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Ej. Propuesta Enviada, Demostración..."
                className="flex-1 bg-white border border-slate-250 outline-none rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 font-sans shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleAddStage(configPipelineType)}
                disabled={!newStageName.trim()}
                className="bg-indigo-600 hover:bg-indigo-750 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shrink-0"
              >
                + Agregar
              </button>
            </div>
          </div>

          {/* Draggable & Sortable List */}
          <div className="space-y-2">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">
              Orden de Prioridad ({configPipelineType === 'Persona Potencial' ? 'Pipeline Particulares' : configPipelineType === 'Redes Sociales' ? 'Pipeline Redes Sociales' : 'Pipeline Instituciones'})
            </span>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {getStagesForType(configPipelineType).map((stage, index) => {
                const defaultList = configPipelineType === 'Persona Potencial' 
                  ? DEFAULT_PARTICULAR_STAGES 
                  : configPipelineType === 'Redes Sociales'
                    ? DEFAULT_REDES_SOCIALES_STAGES
                    : DEFAULT_INSTITUTION_STAGES;
                const isCore = defaultList.includes(stage);
                const currentStageList = getStagesForType(configPipelineType);
                
                return (
                  <div
                    key={stage}
                    draggable
                    onDragStart={(e) => handleStageDragStart(e, index)}
                    onDragOver={(e) => handleStageDragOver(e, index)}
                    onDrop={(e) => handleStageDrop(e, index, configPipelineType)}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl transition shadow-sm cursor-grab active:cursor-grabbing group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="text-slate-400 cursor-grab active:cursor-grabbing p-0.5">
                        <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-700 leading-none text-xs">{stage}</span>
                        {isCore ? (
                          <span className="ml-2 inline-block bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider scale-90">Predeterminada</span>
                        ) : (
                          <span className="ml-2 inline-block bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider scale-90">Personalizada</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Arrow controls */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStageUp(index, configPipelineType)}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Subir prioridad"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === currentStageList.length - 1}
                        onClick={() => handleMoveStageDown(index, configPipelineType)}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 p-1 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Bajar prioridad"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove custom stage directly within config */}
                      {!isCore && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(stage, configPipelineType)}
                          className="text-slate-400 hover:text-rose-600 px-1.5 py-1 hover:bg-rose-50 rounded transition cursor-pointer ml-1"
                          title="Eliminar Etapa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(false)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md shadow-indigo-600/15 uppercase tracking-wider text-xs cursor-pointer"
            >
              Listo • Aplicar Cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: MODIFICACIONES MASIVAS (SUPERADMIN) */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        title={`Modificaciones Masivas (${selectedLeadIds.length} Seleccionados)`}
        size="3xl"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="bg-indigo-50/70 border border-indigo-150 p-3.5 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-extrabold text-indigo-950 text-xs">Panel de Edición en Lote</h5>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                Selecciona únicamente los campos que deseas actualizar para los <strong className="text-indigo-900 font-extrabold">{selectedLeadIds.length} prospectos seleccionados</strong>. Los campos que dejes en blanco o marcados como "Sin cambios" conservarán sus valores originales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {/* 1. Agente Responsable */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agente Responsable
              </label>
              <select
                value={bulkUpdateForm.assignedTo}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              >
                <option value="">-- Sin cambios --</option>
                <option value="--quitar--">Quitar asignación (Sin asignar)</option>
                <option value="Admin Global">Admin Global</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Estatus del Pipeline */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estatus de Pipeline
              </label>
              <select
                value={bulkUpdateForm.status}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              >
                <option value="">-- Sin cambios --</option>
                {allPipelineStages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* 3. Tipo de Prospecto */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Prospecto
              </label>
              <select
                value={bulkUpdateForm.type}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              >
                <option value="">-- Sin cambios --</option>
                <option value="Institución Potencial">Institución Potencial</option>
                <option value="Persona Potencial">Persona Potencial</option>
                <option value="Redes Sociales">Redes Sociales</option>
              </select>
            </div>

            {/* 4. Origen / Fuente */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Origen / Fuente
              </label>
              <select
                value={bulkUpdateForm.source}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, source: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              >
                <option value="">-- Sin cambios --</option>
                <option value="Recomendación">Recomendación</option>
                <option value="Feria Educativa">Feria Educativa</option>
                <option value="Campaña Digital">Campaña Digital</option>
                <option value="Llamada Fría">Llamada Fría</option>
                <option value="LinkedIn">LinkedIn Sales</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Sitio Web">Sitio Web Oficial</option>
              </select>
            </div>

            {/* 5. Valor Estimado USD */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor Estimado (USD)
              </label>
              <input
                type="number"
                placeholder="Ej. 15000"
                value={bulkUpdateForm.value}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, value: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
            </div>

            {/* 6. Examen de Inglés */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Puntuación Examen Inglés
              </label>
              <input
                type="text"
                placeholder="Ej. B2, TOEFL 85, Aprobado"
                value={bulkUpdateForm.englishExamScore}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, englishExamScore: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
            </div>

            {/* 7. Ciudad */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ciudad
              </label>
              <input
                type="text"
                placeholder="Ej. Guadalajara"
                value={bulkUpdateForm.city}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, city: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
            </div>

            {/* 8. Estado */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado / Provincia
              </label>
              <input
                type="text"
                placeholder="Ej. Jalisco"
                value={bulkUpdateForm.state}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, state: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
            </div>

            {/* 9. País */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                País
              </label>
              <input
                type="text"
                placeholder="Ej. México"
                value={bulkUpdateForm.country}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, country: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
            </div>

            {/* 10. Pago Malla Curricular */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estatus Pago Malla Curricular
              </label>
              <select
                value={bulkUpdateForm.mallaPaymentStatus}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, mallaPaymentStatus: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              >
                <option value="">-- Sin cambios --</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
                <option value="Exento">Exento / No Aplica</option>
              </select>
            </div>

            {/* 11. Agregar Nota / Observación */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agregar Nota al Historial Comercial
              </label>
              <input
                type="text"
                placeholder="Ej. Contacto de seguimiento masivo realizado por dirección"
                value={bulkUpdateForm.appendNote}
                onChange={e => setBulkUpdateForm(prev => ({ ...prev, appendNote: e.target.value }))}
                className="w-full border border-slate-250 bg-white rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium shadow-xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Se anexará con fecha y firma a las notas existentes sin borrarlas.
              </span>
            </div>
          </div>

          {/* Selected leads preview list */}
          <div className="pt-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-1.5">
              Prospectos Seleccionados ({selectedLeadIds.length})
            </span>
            <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/60 divide-y divide-slate-150 text-[11px]">
              {leads.filter(l => selectedLeadIds.includes(l.id)).map(l => (
                <div key={l.id} className="py-1 flex items-center justify-between text-slate-700">
                  <span className="font-semibold">{l.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{l.type}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                      {l.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowBulkEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={initiateBulkUpdateConfirm}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Revisar y Aplicar Cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRMACIÓN BORRADO MASIVO (SUPERADMIN) */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Eliminación Masiva de Prospectos"
        size="2xl"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start space-x-3.5 bg-rose-50 border border-rose-200 p-4 rounded-2xl">
            <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
              <Trash2 className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h6 className="font-black text-rose-900 uppercase tracking-wider text-xs">
                ⚠️ Acción Irreversible de Superadministrador
              </h6>
              <p className="text-rose-700 mt-1 leading-relaxed text-xs">
                ¿Estás seguro de que deseas eliminar permanentemente a los <strong className="font-extrabold underline text-rose-950">{selectedLeadIds.length} prospectos comerciales</strong> seleccionados?
              </p>
              <p className="text-rose-600/90 mt-1.5 text-[11px] leading-relaxed">
                Esta acción eliminará de forma inmediata y definitiva todos los registros seleccionados, su información de contacto, historial de tareas, propuestas y métricas comerciales tanto de este dispositivo como de la base de datos central en la nube (Firestore).
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                Registros a Eliminar Definitivamente ({selectedLeadIds.length})
              </span>
              <span className="text-[10px] font-bold text-rose-600 font-mono">
                Total: {selectedLeadIds.length} prospectos
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto border border-rose-150 rounded-xl p-2.5 bg-rose-50/20 divide-y divide-rose-100/60 text-[11px]">
              {leads.filter(l => selectedLeadIds.includes(l.id)).map((lead, idx) => (
                <div key={lead.id} className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                      <strong className="text-slate-850 font-bold truncate">{lead.name}</strong>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                        {lead.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate pl-4">
                      {lead.contactName || "Sin contacto"} • {lead.city ? `${lead.city}, ` : ""}{lead.country}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold text-rose-700 block">
                      ${lead.value?.toLocaleString("en-US") || 0} USD
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">
              Operación autorizada para: <strong>{currentUser?.name || "Superadministrador"}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                disabled={isBulkDeleting}
                className="px-4.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? "Eliminando..." : `Sí, Eliminar ${selectedLeadIds.length} Prospectos`}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE LEAD MODAL */}
      <Modal
        isOpen={leadToDeleteId !== null}
        onClose={() => setLeadToDeleteId(null)}
        title="Confirmación de Eliminación"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start space-x-3 bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h6 className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px]">Acción Irreversible</h6>
              <p className="text-rose-700 mt-1 leading-relaxed text-xs">
                ¿Estás seguro de que deseas eliminar permanentemente al prospecto <strong className="font-bold underline">{leads.find(l => l.id === leadToDeleteId)?.name}</strong>? Todo su historial de contacto, ofertas comerciales y datos de seguimiento serán removidos del CRM de forma definitiva.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLeadToDeleteId(null)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteLead}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar de por vida
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM WIPE ALL CRM DATA MODAL */}
      <Modal
        isOpen={isConfirmWipeModalOpen}
        onClose={() => setIsConfirmWipeModalOpen(false)}
        title="Borrar Toda la Información del CRM"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-start space-x-3 bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h6 className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px]">¿Vaciar Base de Datos Comercial?</h6>
              <p className="text-rose-700 mt-1 leading-relaxed text-xs">
                Esta acción eliminará <strong className="font-extrabold underline block">TODOS los prospectos ({leads.length}), campos adicionales, correos, teléfonos, notas e historial comercial</strong> de forma definitiva de tu navegador y del almacenamiento local.
              </p>
            </div>
          </div>
          
          <p className="text-slate-500 leading-relaxed text-[11px] font-medium bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
            * Se recomienda descargar la plantilla CSV actual o exportar tus datos antes de proceder si deseas tener una copia de respaldo. Una vez borrado, no se podrá recuperar la información.
          </p>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfirmWipeModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleWipeAllLeads}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              SÍ, VACIAR EL CRM
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CREAR / EDITAR CAMPAÑA */}
      <Modal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        title={editingCampaign ? "Editar Campaña Comercial" : "Crear Nueva Campaña Comercial"}
        size="2xl"
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nombre de la Campaña *</label>
            <input
              type="text"
              value={formCampName}
              onChange={e => setFormCampName(e.target.value)}
              placeholder="Ej. Campaña Colegios Bilingües Q4"
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Canal de Difusión *</label>
              <select
                value={formCampChannel}
                onChange={e => setFormCampChannel(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="Email">Email Marketing</option>
                <option value="LinkedIn">LinkedIn Outreach</option>
                <option value="WhatsApp">WhatsApp / SMS</option>
                <option value="Evento">Evento / Webinar</option>
                <option value="Llamadas">Llamadas Directas</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Estado de la Campaña *</label>
              <select
                value={formCampStatus}
                onChange={e => setFormCampStatus(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="Activa">Activa</option>
                <option value="En Diseño">En Diseño</option>
                <option value="Pausada">Pausada</option>
                <option value="Finalizada">Finalizada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Presupuesto ($ USD)</label>
              <input
                type="number"
                value={formCampBudget}
                onChange={e => setFormCampBudget(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="1000"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Meta de Leads</label>
              <input
                type="number"
                value={formCampTargetLeads}
                onChange={e => setFormCampTargetLeads(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="20"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={formCampStartDate}
                onChange={e => setFormCampStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Fecha Fin</label>
              <input
                type="date"
                value={formCampEndDate}
                onChange={e => setFormCampEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Público Objetivo / Descripción</label>
            <textarea
              rows={3}
              value={formCampAudience}
              onChange={e => setFormCampAudience(e.target.value)}
              placeholder="Ej. Directores y coordinadores de colegios bilingües privados en México..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCampaignModalOpen(false)}
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/10"
            >
              {editingCampaign ? "Guardar Cambios" : "Crear Campaña"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VER DETALLE / FICHA TÉCNICA DE INSTITUCIÓN PROSPECTO */}
      <Modal
        isOpen={!!viewingLead}
        onClose={() => setViewingLead(null)}
        title={`Ficha Técnica - ${viewingLead?.name || "Institución Prospecto"}`}
        size="3xl"
      >
        {viewingLead && (
          <div className="space-y-6 font-sans">
            {/* Top Banner / Hero */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                    {viewingLead.type === "Institución Potencial" ? (
                      <Building2 className="w-7 h-7 text-indigo-300" />
                    ) : viewingLead.type === "Redes Sociales" ? (
                      <Share2 className="w-7 h-7 text-pink-300" />
                    ) : (
                      <Users className="w-7 h-7 text-indigo-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {viewingLead.idLead && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 font-mono">
                          ID: {viewingLead.idLead}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        {viewingLead.type}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Etapa: {viewingLead.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-300" />
                        SLA: {getLeadSlaIndicator(viewingLead.status)} ({getLeadSlaLimit(viewingLead.status) ?? 3}d)
                      </span>
                    </div>
                    <h3 className="text-xl font-black mt-1.5 tracking-tight text-white">{viewingLead.name}</h3>
                    <p className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                      <span>📍 {viewingLead.city ? `${viewingLead.city}, ` : ""}{viewingLead.state ? `${viewingLead.state}, ` : ""}{viewingLead.country}</span>
                      <span>•</span>
                      <span>Origen: <strong>{viewingLead.source}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-white/10 p-3.5 rounded-xl border border-white/10 shrink-0 backdrop-blur-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Valor Estimado Pipeline</p>
                  <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    ${viewingLead.value.toLocaleString("en-US")} <span className="text-xs font-normal text-emerald-200">USD</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Callout if in Firma stage for institution */}
            {viewingLead.type === "Institución Potencial" && (viewingLead.status === "Firma" || viewingLead.status === "Cierre") && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Institución en Etapa de Firma</p>
                    <p className="text-[11px] text-slate-600">
                      ¿Deseas formalizar esta institución y registrarla en el sistema? Pasará a la etapa <strong className="font-bold text-emerald-800">Cliente</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = viewingLead;
                    setViewingLead(null);
                    setPendingFirmaTransition({ lead: current, isConfirmationFromFirma: true });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                  <span>Confirmar Firma y Crear Institución</span>
                </button>
              </div>
            )}

            {/* Modal Navigation Tabs Header */}
            <div className="flex border-b border-slate-200 gap-1 pt-1">
              <button
                type="button"
                onClick={() => setLeadDetailTab("ficha")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  leadDetailTab === "ficha"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Expediente & Ficha Técnica</span>
              </button>

              <button
                type="button"
                onClick={() => setLeadDetailTab("consultor")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer relative ${
                  leadDetailTab === "consultor"
                    ? "border-purple-600 text-purple-700 bg-purple-50/60 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-purple-700 hover:bg-purple-50/30 rounded-t-xl"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span>Consultor IA</span>
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                  Gemini
                </span>
              </button>
            </div>

            {/* TAB 1: FICHA TÉCNICA */}
            {leadDetailTab === "ficha" && (
              <div className="space-y-6">
                {/* Quick Actions Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-600">
                    <span className="text-slate-400 font-bold">Responsable:</span>
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-800 flex items-center gap-1">
                      👤 {viewingLead.assignedTo || "Sin Asignar"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const currentLead = viewingLead;
                        setViewingLead(null);
                        handleOpenNewActivity(currentLead.id);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Agendar Cita / Tarea</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const currentLead = viewingLead;
                        setViewingLead(null);
                        setComposeLeadId(currentLead.id);
                        setActiveTab("Correos");
                        setEmailActiveSubTab("Redactar");
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-purple-700 font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Enviar Correo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const currentLead = viewingLead;
                        setViewingLead(null);
                        handleOpenEditLead(currentLead);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Información</span>
                    </button>
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Card 1: Contacto Principal */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>Contacto Principal</span>
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        Titular Directivo
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</p>
                        <p className="font-bold text-slate-800 text-sm">{viewingLead.contactName || "No especificado"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</p>
                          {viewingLead.email ? (
                            <a href={`mailto:${viewingLead.email}`} className="font-semibold text-indigo-600 hover:underline font-mono truncate block">
                              {viewingLead.email}
                            </a>
                          ) : (
                            <p className="text-slate-400 italic">Sin correo registrado</p>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono / WhatsApp</p>
                          {viewingLead.phone ? (
                            <p className="font-bold text-slate-700 font-mono">{viewingLead.phone}</p>
                          ) : (
                            <p className="text-slate-400 italic">Sin teléfono</p>
                          )}
                        </div>
                      </div>

                      {viewingLead.website && viewingLead.type !== "Persona Potencial" && (
                        <div className="pt-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sitio Web Oficial</p>
                          <a
                            href={viewingLead.website.startsWith("http") ? viewingLead.website : `https://${viewingLead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{viewingLead.website}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Ubicación & Datos de Sede */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>Ubicación & Sede</span>
                      </h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                        {viewingLead.country}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección Física</p>
                        <p className="font-medium text-slate-700 mt-0.5">{viewingLead.address || "No especificada"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudad</p>
                          <p className="font-semibold text-slate-800">{viewingLead.city || "N/D"}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado / Provincia</p>
                          <p className="font-semibold text-slate-800">{viewingLead.state || "N/D"}</p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Creación / Registro</p>
                        <p className="font-mono text-slate-600 text-[11px]">
                          {viewingLead.createdAt ? new Date(viewingLead.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : "Fecha no disponible"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alerta de Inactividad (SLA)</p>
                        <p className="font-bold text-indigo-700 text-xs mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Indicador: <strong>{getLeadSlaIndicator(viewingLead.status)}</strong></span>
                          <span className="text-slate-400 font-normal font-mono">({getLeadSlaLimit(viewingLead.status) !== undefined ? `${getLeadSlaLimit(viewingLead.status)}d límite` : 'Sin límite'})</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Contacts Section */}
                {viewingLead.contacts && viewingLead.contacts.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs border-b border-slate-100 pb-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Contactos Adicionales / Directorio ({viewingLead.contacts.length})</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {viewingLead.contacts.map((c, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between space-y-1">
                          <div>
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-800 text-xs">{c.name}</p>
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-md">
                                {c.role || "Contacto"}
                              </span>
                            </div>
                            {c.email && (
                              <p className="text-[10px] text-indigo-600 font-mono mt-1 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>{c.email}</span>
                              </p>
                            )}
                            {c.phone && (
                              <p className="text-[10px] text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{c.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Workflow Banner / Voucher (For Persona Potencial) */}
                {viewingLead.type === "Persona Potencial" && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                      <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Gestión Financiera - Malla Curricular</span>
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        viewingLead.mallaPaymentStatus === "Pagado"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : viewingLead.status === "Pago"
                          ? "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {viewingLead.mallaPaymentStatus === "Pagado" ? "✓ Pago Confirmado" : viewingLead.status === "Pago" ? "⏳ Cobro Pendiente en Finanzas" : "Etapa: " + viewingLead.status}
                      </span>
                    </div>

                    {viewingLead.status === "Pago" && viewingLead.mallaPaymentStatus !== "Pagado" && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs">El prospecto completó el Examen de Inglés y requiere el cobro de la Malla Curricular.</p>
                          <p className="text-[10.5px] text-amber-800 font-sans">
                            El Equipo de Finanzas & Cobranza tiene la tarea activa para recaudar el pago de <strong>${viewingLead.value?.toLocaleString("en-US")} USD</strong>.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentConfirmModal(viewingLead)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Confirmar Pago de Malla</span>
                        </button>
                      </div>
                    )}

                    {viewingLead.mallaPaymentStatus === "Pagado" && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-800">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Comprobante de Pago Acreditado en Tesorería</span>
                          </p>
                          <span className="font-mono font-black text-sm text-emerald-700">
                            ${(viewingLead.mallaPaymentAmount || viewingLead.value)?.toLocaleString("en-US")} USD
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] pt-1 border-t border-emerald-200/60 font-sans">
                          <div>
                            <span className="text-emerald-800/80 font-bold block uppercase text-[9px]">Método:</span>
                            <span className="font-semibold text-slate-800">{viewingLead.mallaPaymentMethod || "Transferencia Bancaria"}</span>
                          </div>
                          <div>
                            <span className="text-emerald-800/80 font-bold block uppercase text-[9px]">Folio / Referencia:</span>
                            <span className="font-mono font-bold text-slate-900">{viewingLead.mallaPaymentRef || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-emerald-800/80 font-bold block uppercase text-[9px]">Fecha de Pago:</span>
                            <span className="font-semibold text-slate-800">{viewingLead.mallaPaymentDate || "N/A"}</span>
                          </div>
                        </div>
                        {viewingLead.mallaPaymentNotes && (
                          <p className="text-[10px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-150 italic mt-1">
                            Notas: "{viewingLead.mallaPaymentNotes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Academic & English Exam Evaluation Card (Especially for Persona Potencial) */}
                {(viewingLead.type === "Persona Potencial" || viewingLead.englishExamScore || viewingLead.programOfInterest || viewingLead.gradeToTake) && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                      <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs">
                        <Award className="w-4 h-4 text-cyan-600" />
                        <span>Evaluación Académica & Examen de Inglés</span>
                      </h4>
                      <span className="text-[10px] bg-cyan-50 text-cyan-700 font-bold px-2 py-0.5 rounded-full border border-cyan-100">
                        {viewingLead.type === "Persona Potencial" ? "Prospecto Individual" : "Evaluación"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100">
                        <p className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">Calificación Examen Inglés</p>
                        <p className="font-extrabold text-cyan-950 font-mono text-sm mt-0.5">
                          {viewingLead.englishExamScore || "Pendiente"}
                        </p>
                        {viewingLead.englishExamDate && (
                          <p className="text-[9.5px] text-cyan-700 font-sans mt-0.5">
                            Fecha: {viewingLead.englishExamDate}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Programa de Interés</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingLead.programOfInterest || "Homeschool Internacional"}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grado / Créditos</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {viewingLead.gradeToTake ? `Grado: ${viewingLead.gradeToTake}` : "N/D"}
                          {viewingLead.creditsToTake ? ` (${viewingLead.creditsToTake} créditos)` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes & Observations Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Notas & Observaciones del Prospecto</span>
                  </h4>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {viewingLead.notes || "Sin notas u observaciones registradas."}
                  </p>
                </div>

                {/* Tareas & Actividades Relacionadas */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xs">
                      <ActivityIcon className="w-4 h-4 text-indigo-600" />
                      <span>Historial de Actividades & Tareas ({tasks.filter(t => t.leadId === Number(viewingLead.id) || t.leadId === (viewingLead.id as any)).length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const currentLead = viewingLead;
                        setViewingLead(null);
                        handleOpenNewActivity(currentLead.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nueva Tarea</span>
                    </button>
                  </div>

                  {tasks.filter(t => t.leadId === Number(viewingLead.id) || t.leadId === (viewingLead.id as any)).length === 0 ? (
                    <p className="text-center py-3 text-slate-400 text-xs italic">
                      No hay actividades ni tareas registradas para este prospecto.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {tasks
                        .filter(t => t.leadId === Number(viewingLead.id) || t.leadId === (viewingLead.id as any))
                        .map(task => (
                          <div key={task.id} className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${task.completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{task.title}</p>
                                <p className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span>{task.type}</span>
                                  <span>•</span>
                                  <span>{task.dueDate}</span>
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              task.completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {task.completed ? "Completada" : "Pendiente"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CONSULTOR IA GEMINI */}
            {leadDetailTab === "consultor" && (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-purple-800/40">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-purple-500/20 border border-purple-400/30 rounded-xl">
                      <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white flex items-center gap-2">
                        <span>Consultor Comercial Inteligente Gemini</span>
                        <span className="bg-purple-500/30 text-purple-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-400/30">
                          IA Avanzada
                        </span>
                      </h4>
                      <p className="text-xs text-purple-200/90 mt-1 leading-relaxed">
                        Analiza la información del prospecto <strong>{viewingLead.name}</strong>, su etapa en el pipeline ({viewingLead.status}) y actividades históricas para obtener recomendaciones estratégicas y redactar comunicaciones de alto impacto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Predefined Action Prompts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    disabled={aiActionLoading}
                    onClick={() => handleRunAiConsultant("Análisis de Oportunidad")}
                    className="p-3 bg-white hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <Brain className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold text-slate-400">Estrategia</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">Diagnóstico & Estrategia</p>
                  </button>

                  <button
                    type="button"
                    disabled={aiActionLoading}
                    onClick={() => handleRunAiConsultant("Redactar Email de Seguimiento")}
                    className="p-3 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <Mail className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold text-slate-400">Email</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">Email de Seguimiento</p>
                  </button>

                  <button
                    type="button"
                    disabled={aiActionLoading}
                    onClick={() => handleRunAiConsultant("Sugerir Siguiente Paso")}
                    className="p-3 bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <Target className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold text-slate-400">Acción</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">Siguiente Mejor Paso</p>
                  </button>

                  <button
                    type="button"
                    disabled={aiActionLoading}
                    onClick={() => handleRunAiConsultant("Manejo de Objeciones")}
                    className="p-3 bg-white hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <Zap className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold text-slate-400">Cierre</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">Manejo de Objeciones</p>
                  </button>
                </div>

                {/* Custom AI Prompt Input */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    O escribe una consulta personalizada para el Consultor IA:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && aiCustomPrompt.trim() && !aiActionLoading) {
                          handleRunAiConsultant("Consulta Personalizada", aiCustomPrompt.trim());
                        }
                      }}
                      placeholder="Ej. ¿Cómo estructurar la propuesta de valor para cerrar la inscripción?"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-purple-500 text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={!aiCustomPrompt.trim() || aiActionLoading}
                      onClick={() => handleRunAiConsultant("Consulta Personalizada", aiCustomPrompt.trim())}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {aiActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Consultar</span>
                    </button>
                  </div>
                </div>

                {/* AI Response Card */}
                {aiActionLoading && (
                  <div className="bg-white border border-purple-200 rounded-xl p-8 flex flex-col items-center justify-center space-y-3 text-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Gemini está analizando los datos del prospecto...</p>
                      <p className="text-xs text-slate-500 mt-0.5">Generando recomendaciones estratégicas en tiempo real.</p>
                    </div>
                  </div>
                )}

                {aiResult && !aiActionLoading && (
                  <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="font-extrabold text-xs text-slate-800">{aiResult.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({aiResult.timestamp})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiResult.content);
                          setCopiedAi(true);
                          setTimeout(() => setCopiedAi(false), 2500);
                        }}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAi ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Texto</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/60 p-3.5 rounded-lg border border-slate-150">
                      {aiResult.content}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingLead(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CONFIRMACIÓN DE PAGO DE MALLA CURRICULAR */}
      <Modal
        isOpen={isPaymentConfirmModalOpen}
        onClose={() => {
          if (!isProcessingPayment) {
            setIsPaymentConfirmModalOpen(false);
            setPaymentLeadTarget(null);
          }
        }}
        title="Confirmación de Pago de Malla Curricular"
        size="lg"
      >
        {paymentLeadTarget && (
          <form onSubmit={handleConfirmPaymentAndAdvance} className="space-y-4 font-sans text-xs">
            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl space-y-1 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Prospecto</span>
                <span className="text-[9px] bg-emerald-200/60 font-bold px-2 py-0.5 rounded-full text-emerald-900">
                  {paymentLeadTarget.type}
                </span>
              </div>
              <p className="text-sm font-black text-slate-800">{paymentLeadTarget.name}</p>
              <p className="text-[11px] text-slate-600">Contacto: {paymentLeadTarget.contactName || paymentLeadTarget.name} ({paymentLeadTarget.email || "Sin correo"})</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monto Recaudado ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="1100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Método de Pago *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria (Wire/SPEI)</option>
                  <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                  <option value="Stripe / Pasarela Online">Stripe / Pasarela Online</option>
                  <option value="Depósito en Efectivo">Depósito en Efectivo</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Otro">Otro Método</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Folio / Referencia Bancaria *
                </label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Ej. TRF-982341 / SPEI-0012"
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha de Pago *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notas / Observaciones de Tesorería
              </label>
              <textarea
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ej. Pago validado en cuenta HSBC por Tesorería. Comprobante archivado."
                className="w-full p-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 space-y-0.5">
              <p className="font-bold text-[11px]">⚡ Automatización Comercial al Confirmar:</p>
              <ul className="list-disc list-inside text-[10.5px] text-amber-800 space-y-0.5">
                <li>El lead avanzará de <strong>"Pago"</strong> a <strong>"Malla curricular y boletines"</strong>.</li>
                <li>Se creará una tarea comercial prioritaria y se enviará notificación al equipo de ventas.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => {
                  setIsPaymentConfirmModalOpen(false);
                  setPaymentLeadTarget(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md shadow-emerald-600/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Acreditando Pago...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Acreditar Pago y Avanzar Lead</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: EXPLORAR / ADJUNTAR DOCUMENTOS DEL REPOSITORIO Y FUENTES EXTERNAS */}
      <Modal
        isOpen={isAttachPickerModalOpen}
        onClose={() => setIsAttachPickerModalOpen(false)}
        title="Explorar Repositorio Central y Anexar Documentos"
        size="3xl"
      >
        <div className="space-y-4 font-sans text-xs">
          {/* Target Notification Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-indigo-950">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold text-xs text-indigo-900">
                  {attachPickerTarget === "bulk" ? "Anexando a Difusión Masiva" : "Anexando a Correo Individual"}
                </p>
                <p className="text-[10.5px] text-indigo-700">
                  Selecciona los documentos que deseas anexar al mensaje. También puedes subir un archivo local o vincular un recurso en la nube.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (attachPickerTarget === "bulk") {
                    bulkFileInputRef.current?.click();
                  } else {
                    composeFileInputRef.current?.click();
                  }
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Subir un archivo desde tu equipo"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Archivo Local</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenExternalLinkModal(attachPickerTarget);
                }}
                className="bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Anexar enlace externo o nube (Google Drive, OneDrive)"
              >
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>+ Enlace Nube</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={attachSearchTerm}
                onChange={e => setAttachSearchTerm(e.target.value)}
                placeholder="Buscar por título, archivo..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <select
                value={attachCategoryFilter}
                onChange={e => setAttachCategoryFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="Todas">Todas las Categorías</option>
                {(catalogs['Categorías de Documentos'] || []).map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                {(catalogs['Categorías de Documentos'] || []).length === 0 && (
                  <>
                    <option value="Contratos y Convenios">Contratos y Convenios</option>
                    <option value="Propuestas Comerciales">Propuestas Comerciales</option>
                    <option value="Acreditaciones y Licencias">Acreditaciones y Licencias</option>
                    <option value="Documentación Legal y Fiscal">Documentación Legal y Fiscal</option>
                    <option value="Comprobantes y Facturación">Comprobantes y Facturación</option>
                    <option value="Manuales y Políticas">Manuales y Políticas</option>
                    <option value="Otros Documentos">Otros Documentos</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <select
                value={attachLeadFilter}
                onChange={e => setAttachLeadFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Todos los Prospectos / General</option>
                <option value="general">Solo General / Corporativo</option>
                {leads.slice(0, 30).map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtered Documents List */}
          {(() => {
            const currentSelected = attachPickerTarget === "bulk" ? bulkEmailSelectedDocIds : composeSelectedDocIds;
            const filteredDocs = repositoryDocs.filter(doc => {
              const matchesSearch =
                doc.title.toLowerCase().includes(attachSearchTerm.toLowerCase()) ||
                doc.fileName.toLowerCase().includes(attachSearchTerm.toLowerCase()) ||
                (doc.leadName && doc.leadName.toLowerCase().includes(attachSearchTerm.toLowerCase())) ||
                (doc.notes && doc.notes.toLowerCase().includes(attachSearchTerm.toLowerCase()));

              const matchesCat = attachCategoryFilter === "Todas" || doc.category === attachCategoryFilter;

              let matchesLead = true;
              if (attachLeadFilter === "general") {
                matchesLead = !doc.leadId || doc.leadName === "General / Corporativo";
              } else if (attachLeadFilter !== "Todos") {
                matchesLead = doc.leadName === attachLeadFilter;
              }

              return matchesSearch && matchesCat && matchesLead;
            });

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
                  <span>{filteredDocs.length} documento(s) disponible(s) • {currentSelected.length} seleccionado(s)</span>
                  <div className="flex items-center gap-2">
                    {filteredDocs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectAllFilteredAttachDocs(filteredDocs)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        Seleccionar todos los visibles
                      </button>
                    )}
                    {currentSelected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearAllAttachments(attachPickerTarget)}
                        className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredDocs.map(doc => {
                    const isSelected = currentSelected.includes(doc.id);
                    const isCloudLink = doc.sourceType === "enlace_externo" || !!doc.externalUrl;
                    const valStatus = getDocValidityStatus(doc);

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleAttachDoc(doc.id)}
                        className={`p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div onClick
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none"
                          />
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isCloudLink ? "bg-sky-50 text-sky-600 border border-sky-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          }`}>
                            {isCloudLink ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-slate-800 text-xs truncate max-w-[280px]" title={doc.title}>
                                {doc.title}
                              </h5>
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                                {doc.category}
                              </span>
                              {isCloudLink && (
                                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono">
                                  Enlace Nube
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span className="truncate max-w-[150px]">{doc.fileName}</span>
                              <span>•</span>
                              <span>{doc.fileSize}</span>
                              <span>•</span>
                              <span>{doc.leadName || "General / Corporativo"}</span>
                            </div>
                            {doc.notes && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">{doc.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${valStatus.badge}`}>
                            {valStatus.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDoc(doc);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title={doc.externalUrl ? "Abrir enlace en nueva pestaña" : "Descargar / Previsualizar"}
                          >
                            {doc.externalUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredDocs.length === 0 && (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-bold text-slate-600 text-xs">No se encontraron documentos en el repositorio</p>
                      <p className="text-[11px] text-slate-400">Intenta cambiar los filtros o sube un archivo directamente desde tu equipo.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-mono font-medium">
              {attachPickerTarget === "bulk"
                ? `${bulkEmailSelectedDocIds.length} documento(s) del repositorio seleccionados`
                : `${composeSelectedDocIds.length} documento(s) del repositorio seleccionados`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAttachPickerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => setIsAttachPickerModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar y Adjuntar</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: ANEXAR ENLACE EXTERNO O NUBE (GOOGLE DRIVE / ONEDRIVE / WEB) */}
      <Modal
        isOpen={isExternalLinkModalOpen}
        onClose={() => setIsExternalLinkModalOpen(false)}
        title="Anexar Enlace Externo o Recurso en la Nube"
        size="lg"
      >
        <form onSubmit={handleSaveExternalLink} className="space-y-4 font-sans text-xs">
          <div className="bg-sky-50/80 border border-sky-200 p-3 rounded-xl flex items-start gap-2.5 text-sky-950">
            <LinkIcon className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-xs text-sky-900">
                Vincular Documento Externo ({externalLinkTarget === "bulk" ? "Difusión Masiva" : "Correo Individual"})
              </p>
              <p className="text-[10.5px] text-sky-700 leading-relaxed">
                Pega el enlace compartido de Google Drive, OneDrive, Dropbox, SharePoint o cualquier sitio web oficial. Los destinatarios podrán abrirlo y consultarlo directamente.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Título o Nombre Descriptivo del Documento *
            </label>
            <input
              type="text"
              required
              value={externalLinkTitle}
              onChange={e => setExternalLinkTitle(e.target.value)}
              placeholder="Ej. Convenio Marco Bachillerato Dual 2026 (Google Drive)"
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
              URL del Enlace Externo o Nube *
            </label>
            <input
              type="url"
              required
              value={externalLinkUrl}
              onChange={e => setExternalLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... o https://onedrive.live.com/..."
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500 bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Asegúrate de que los permisos del enlace en Google Drive u OneDrive permitan la lectura o descarga pública para los destinatarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Categoría Institucional
              </label>
              <select
                value={externalLinkCategory}
                onChange={e => setExternalLinkCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="Contratos y Convenios">Contratos y Convenios</option>
                <option value="Propuestas Comerciales">Propuestas Comerciales</option>
                <option value="Acreditaciones y Licencias">Acreditaciones y Licencias</option>
                <option value="Documentación Legal y Fiscal">Documentación Legal y Fiscal</option>
                <option value="Comprobantes y Facturación">Comprobantes y Facturación</option>
                <option value="Manuales y Políticas">Manuales y Políticas</option>
                <option value="Otros Documentos">Otros Documentos</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Asociar a Prospecto / Colegio (Opcional)
              </label>
              <select
                value={externalLinkLeadId}
                onChange={e => setExternalLinkLeadId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="">General / Corporativo</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="extLinkSaveToRepo"
              checked={externalLinkSaveToRepo}
              onChange={e => setExternalLinkSaveToRepo(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <div>
              <label htmlFor="extLinkSaveToRepo" className="font-bold text-indigo-950 text-xs cursor-pointer block">
                Guardar también en el Repositorio Central
              </label>
              <p className="text-[10px] text-indigo-700 leading-normal">
                Registra este recurso en la pestaña Repositorio para que quede disponible para todo el equipo en futuros envíos y campañas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsExternalLinkModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-sky-600/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Anexar Enlace al Correo</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SUBIR / EDITAR DOCUMENTO EN REPOSITORIO CENTRAL */}
      <Modal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        title={editingRepoDoc ? "Editar Documento del Repositorio" : "Subir Documento al Repositorio Central"}
        size="2xl"
      >
        <form onSubmit={handleSaveRepoDoc} className="space-y-4 font-sans text-xs">
          {/* Source Type Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
              Tipo de Origen del Documento *
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFormRepoSourceType("archivo_local")}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  formRepoSourceType === "archivo_local"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Archivo de tu Equipo</span>
              </button>

              <button
                type="button"
                onClick={() => setFormRepoSourceType("enlace_externo")}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  formRepoSourceType === "enlace_externo"
                    ? "bg-white text-sky-700 shadow-sm border border-slate-200/80 font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Enlace Nube / Externo</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Título del Documento *
            </label>
            <input
              type="text"
              required
              value={formRepoTitle}
              onChange={e => setFormRepoTitle(e.target.value)}
              placeholder="Ej. Convenio Marco de Bachillerato Dual 2026-2027"
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
            />
          </div>

          {/* File Upload OR External URL */}
          {formRepoSourceType === "archivo_local" ? (
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Archivo Local (PDF, Word, Excel, Imagen) {editingRepoDoc ? "(Opcional si no se reemplaza)" : "*"}
              </label>
              <input
                type="file"
                required={!editingRepoDoc && !formRepoFileData}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFormRepoFileName(file.name);
                  setFormRepoFileType(file.type || "application/pdf");
                  const sizeKb = Math.round(file.size / 1024);
                  setFormRepoFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);

                  const reader = new FileReader();
                  reader.onload = (loadEvt) => {
                    const res = loadEvt.target?.result as string;
                    if (res) {
                      setFormRepoFileData(res);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full border border-slate-200 rounded-xl p-2 font-mono text-xs text-slate-700 bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {formRepoFileName && (
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cargado: <strong>{formRepoFileName}</strong> ({formRepoFileSize})</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                URL del Enlace Externo (Google Drive, OneDrive, Dropbox, Web) *
              </label>
              <input
                type="url"
                required
                value={formRepoExternalUrl}
                onChange={e => setFormRepoExternalUrl(e.target.value)}
                placeholder="https://drive.google.com/... o https://onedrive.live.com/..."
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-indigo-500 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enlace a documento en nube accesible para los destinatarios y el equipo comercial.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Categoría *
              </label>
              <select
                value={formRepoCategory}
                onChange={e => setFormRepoCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                {(catalogs['Categorías de Documentos'] || []).map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                {(catalogs['Categorías de Documentos'] || []).length === 0 && (
                  <>
                    <option value="Contratos y Convenios">Contratos y Convenios</option>
                    <option value="Propuestas Comerciales">Propuestas Comerciales</option>
                    <option value="Acreditaciones y Licencias">Acreditaciones y Licencias</option>
                    <option value="Documentación Legal y Fiscal">Documentación Legal y Fiscal</option>
                    <option value="Comprobantes y Facturación">Comprobantes y Facturación</option>
                    <option value="Manuales y Políticas">Manuales y Políticas</option>
                    <option value="Otros Documentos">Otros Documentos</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                Prospecto / Institución Asociada
              </label>
              <select
                value={formRepoLeadId}
                onChange={e => setFormRepoLeadId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="">General / Corporativo (Aplica a todos)</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Validity Toggle */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formRepoHasVal"
                checked={formRepoHasValidity}
                onChange={e => setFormRepoHasValidity(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="formRepoHasVal" className="font-bold text-slate-800 text-xs cursor-pointer">
                Este documento tiene fecha de vencimiento / vigencia obligatoria
              </label>
            </div>

            {formRepoHasValidity && (
              <div className="pt-2">
                <label className="block text-slate-600 font-bold mb-1 text-[10px] uppercase tracking-wider">
                  Fecha de Vencimiento de Vigencia *
                </label>
                <input
                  type="date"
                  required={formRepoHasValidity}
                  value={formRepoValidityDate}
                  onChange={e => setFormRepoValidityDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800 outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
              Notas / Descripción Adicional
            </label>
            <textarea
              rows={2}
              value={formRepoNotes}
              onChange={e => setFormRepoNotes(e.target.value)}
              placeholder="Detalles sobre el uso, cláusulas clave o instrucciones para el equipo comercial..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRepoModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingRepoDoc ? "Guardar Cambios" : "Guardar en Repositorio"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE DOCUMENTO DEL REPOSITORIO */}
      <Modal
        isOpen={docToDelete !== null}
        onClose={() => setDocToDelete(null)}
        title="Eliminar Documento del Repositorio"
      >
        <div className="space-y-4 font-sans text-xs">
          <p className="text-slate-600 leading-relaxed">
            ¿Estás seguro de que deseas eliminar permanentemente el documento{" "}
            <strong className="text-slate-900 font-extrabold font-mono">
              "{docToDelete?.title}"
            </strong>{" "}
            del Repositorio Central? Si está seleccionado en la redacción o difusión de correos, también será deseleccionado.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDocToDelete(null)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteRepoDoc}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sí, Eliminar Documento</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRMAR CREACIÓN DE INSTITUCIÓN (REVISIÓN -> FIRMA / CLIENTE) */}
      <Modal
        isOpen={pendingFirmaTransition !== null}
        onClose={handleRejectFirmaTransition}
        title="Formalización de Institución y Cambio de Etapa"
        size="lg"
      >
        {pendingFirmaTransition && (
          <div className="space-y-5 font-sans text-xs">
            {/* Header / Question Callout */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {pendingFirmaTransition.isConfirmationFromFirma ? "Confirmación de Firma" : "De Revisión a Firma"}
                </span>
                <span className="text-slate-300 text-[10px] font-mono">
                  CRM Pipeline
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                ¿Deseas crear una nueva institución con los datos que ya se tienen?
              </h3>
              <p className="text-[11.5px] text-indigo-150 leading-relaxed">
                La institución <strong className="text-white font-black">{pendingFirmaTransition.lead.name}</strong> está lista para formalizarse. El sistema puede darla de alta automáticamente en el catálogo oficial de Instituciones.
              </p>
            </div>

            {/* Summary card with existing lead data */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="font-extrabold text-slate-800 text-xs">
                    Datos a registrar como Institución Oficial
                  </span>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                  ID: {pendingFirmaTransition.lead.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Nombre de la Institución</span>
                  <p className="font-extrabold text-slate-800">{pendingFirmaTransition.lead.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Contacto Titular</span>
                  <p className="font-bold text-slate-700">{pendingFirmaTransition.lead.contactName || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Correo Electrónico</span>
                  <p className="font-mono text-slate-700">{pendingFirmaTransition.lead.email || "Sin correo"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Teléfono / WhatsApp</span>
                  <p className="font-mono text-slate-700">{pendingFirmaTransition.lead.phone || "Sin teléfono"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Ubicación</span>
                  <p className="text-slate-700">
                    {pendingFirmaTransition.lead.city ? `${pendingFirmaTransition.lead.city}, ` : ""}
                    {pendingFirmaTransition.lead.state ? `${pendingFirmaTransition.lead.state}, ` : ""}
                    {pendingFirmaTransition.lead.country}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Valor Estimado / Agente</span>
                  <p className="text-slate-700">
                    <strong className="text-indigo-650 font-mono">${pendingFirmaTransition.lead.value.toLocaleString()} USD</strong>
                    {" • "}
                    <span>{pendingFirmaTransition.lead.assignedTo || "Sin asignar"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation of both options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Si respondes SÍ:</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-snug">
                  Se crea la nueva institución oficial en el sistema y este registro en el CRM avanza automáticamente a la etapa <strong className="font-black text-emerald-950 uppercase">Cliente</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-black">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Si respondes NO:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  La institución queda en la etapa <strong className="font-bold text-slate-800 uppercase">Firma</strong> en el CRM. Podrás confirmarla en cualquier momento para darla de alta y pasarla a Cliente.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleRejectFirmaTransition}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>No, mantener en Etapa Firma</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmCreateInstitution(pendingFirmaTransition.lead)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>Sí, crear Institución y pasar a Cliente</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CRM;
