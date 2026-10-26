import { Settings, Shield, Users, Bell, FileSpreadsheet, Download, Upload, Edit2, Trash2, X, Building, FileText, Save, Image as ImageIcon, MapPin, Globe, DollarSign, Send, Mail, MessageSquare, Calendar, Sparkles, Clock, AlertTriangle, CheckCircle, Check, Copy, Key, Eye, Database, RotateCcw, CheckCircle2, AlertCircle, Loader2, RefreshCw, CheckSquare, Zap, Plus, Search, Filter, GraduationCap, School, SlidersHorizontal, Info, ArrowRightCircle, Cloud, HardDrive, ExternalLink } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useAppContext, resolveCreditPrices, generateUniqueId } from "../context/AppContext";
import { safeLocalStorageGet } from "../utils/storage";
import { PermissionMenu, DEFAULT_MENUS as menus, DEFAULT_ROLES, getSystemRoles, NO_PERMS, DEFAULT_PERMS, Role } from "../utils/permissionCheck";
import {
  getTaskNotificationConfig,
  saveTaskNotificationConfig,
  TaskNotificationConfig,
  DEFAULT_TASK_NOTIFICATION_CONFIG,
  sendRealNotificationEmail,
  sendRealNotificationWhatsApp,
  sendTaskAssignmentNotification,
  sendTaskDeadlineNotification,
  safeParseJsonResponse
} from "../utils/notifications";
import { compressLogoImage, validateImageFile } from "../utils/imageUtils";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  isGoogleDriveTokenAvailable,
  getSavedConnectedDriveEmail,
  listGoogleDriveBackups,
  downloadGoogleDriveBackup,
  deleteGoogleDriveBackup,
  DriveBackupFile,
  BackupScheduleConfig
} from "../utils/googleDriveBackup";

export function Configuracion() {
  const [activeTab, setActiveTab] = useState("Usuarios");
  const [importState, setImportState] = useState<{
    active: boolean;
    type: string;
    progress: number;
    total: number;
    rowNumber: number;
    success: number;
    errorCount: number;
    errors: Array<{ rowNum: number; msg: string; data: string }>;
    results?: Array<{
      rowNum: number;
      status: 'success' | 'error';
      msg?: string;
      data: string;
      identifier?: string;
      details?: string;
    }>;
  } | null>(null);

  const [previewState, setPreviewState] = useState<{
    type: string;
    headers: string[];
    rows: string[][];
  } | null>(null);

  const [importFilter, setImportFilter] = useState<'all' | 'success' | 'error'>('all');
  const [importSearch, setImportSearch] = useState('');
  const [expandedRawRows, setExpandedRawRows] = useState<Record<number, boolean>>({});

  // Backup and Google Drive state variables
  const [backupRestoreFile, setBackupRestoreFile] = useState<File | null>(null);
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [backupGenerating, setBackupGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Drive connection & cloud files state
  const [driveConnectedEmail, setDriveConnectedEmail] = useState<string | null>(() => getSavedConnectedDriveEmail());
  const [isDriveTokenValid, setIsDriveTokenValid] = useState<boolean>(() => isGoogleDriveTokenAvailable());
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isBackingUpToDrive, setIsBackingUpToDrive] = useState(false);
  const [driveBackupsList, setDriveBackupsList] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveFileToDelete, setDriveFileToDelete] = useState<DriveBackupFile | null>(null);
  const [isDeletingDriveFile, setIsDeletingDriveFile] = useState(false);
  const [driveFileToRestore, setDriveFileToRestore] = useState<{ file: DriveBackupFile; data: any } | null>(null);
  const [isFetchingDriveRestore, setIsFetchingDriveRestore] = useState(false);

  const { 
    institutions, addInstitution, addStudent, addClass, addPayment, addProvider, 
    users, addUser, updateUser, deleteUser,
    companyInfo, updateCompanyInfo,
    companyDocuments, addCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
    currentUser,
    students, classes, addEnrollment, addActivity,
    catalogs, providerProductServices,
    providers, enrollments, financialTransactions,
    addFinancialTransaction, bankAccounts,
    tasks, triggerDeadlineScan, notifyTaskAssignee, notifyTaskDeadline,
    backups, triggerFullBackup, restoreBackup, deleteBackup,
    backupSchedule, updateBackupSchedule, triggerGoogleDriveBackup,
    systemRoles, updateSystemRoles, restoreDefaultRoles, addSystemRole, deleteSystemRole,
    dbMetrics, resetDbMetrics,
    teams,
    addCatalogItem, updateCatalogItem, deleteCatalogItem
  } = useAppContext();

  // Local schedule form state initialized from context
  const [schedForm, setSchedForm] = useState<BackupScheduleConfig>(backupSchedule);

  useEffect(() => {
    if (backupSchedule) {
      setSchedForm(backupSchedule);
    }
  }, [backupSchedule]);

  // Listen to Google Drive auth state changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const email = getSavedConnectedDriveEmail();
      setDriveConnectedEmail(email);
      setIsDriveTokenValid(isGoogleDriveTokenAvailable());
      if (e.detail?.connected) {
        refreshDriveFiles();
      }
    };
    window.addEventListener('google-drive-auth-changed', handleAuthChange);
    return () => window.removeEventListener('google-drive-auth-changed', handleAuthChange);
  }, []);

  const refreshDriveFiles = async () => {
    if (!isGoogleDriveTokenAvailable()) return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveBackupsList(files);
    } catch (err) {
      console.error("Error cargando archivos de Google Drive:", err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Respaldos" && isGoogleDriveTokenAvailable()) {
      refreshDriveFiles();
    }
  }, [activeTab]);

  // Permiso específico para Super Administrador
  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || "").trim().toLowerCase();
    const email = (currentUser.email || "").trim().toLowerCase();
    return (
      role.includes("super") ||
      role === "super admin" ||
      role === "super administrador" ||
      role === "superadministrador" ||
      role === "admin" ||
      role === "administrador" ||
      email === "wrhg1970@gmail.com" ||
      email === "admin@ihs.com" ||
      currentUser.id === 1 ||
      currentUser.id === 6
    );
  }, [currentUser]);

  // CSV formatting and trigger browser download
  const exportToCSV = (filename: string, headers: string[], rows: any[][]) => {
    const content = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          let cleanVal = val === null || val === undefined ? '' : String(val);
          // Escape quotes
          cleanVal = cleanVal.replace(/"/g, '""');
          // Wrap in quotes if commas, quotes, or newlines exist
          if (/[",\n\r]/.test(cleanVal)) {
            cleanVal = `"${cleanVal}"`;
          }
          return cleanVal;
        }).join(',')
      )
    ].join('\n');

    // Add UTF-8 BOM so Excel opens Spanish characters (ñ, accended vowels) correctly
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF trigger using dynamic printable tab window with browser print styles
  const exportToPDF = (title: string, headers: string[], rows: any[][]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes (popups) para exportar a PDF.');
      return;
    }

    const rowsHtml = rows.map((row, idx) => `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100">
        ${row.map(val => `<td class="px-3 py-2 text-[11px] text-slate-700">${val === null || val === undefined ? '' : String(val)}</td>`).join('')}
      </tr>
    `).join('');

    const headersHtml = headers.map(h => `
      <th class="px-3 py-2.5 bg-slate-100 border-b border-slate-200 text-left text-[10px] uppercase font-bold text-slate-600 tracking-wider">
        ${h}
      </th>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { padding: 1.5cm; }
              .no-print { display: none; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          </style>
        </head>
        <body class="bg-white p-8">
          <div class="max-w-5xl mx-auto space-y-6">
            <!-- Header -->
            <div class="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 class="text-2xl font-black text-indigo-900 tracking-tight">\${(companyInfo?.commercialName || 'IHS MANAGER').toUpperCase()} - SISTEMA GENERAL</h1>
                <p class="text-xs text-slate-500 mt-1">Exportación oficial de datos administrativos y escolares</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                  ${title}
                </span>
                <p class="text-[10px] text-slate-400 mt-1.5 font-medium">Fecha: ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES')}</p>
              </div>
            </div>
            
            <!-- Methods print control -->
            <div class="no-print bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center mb-4">
              <span class="text-xs text-slate-650 font-bold text-slate-600">✓ Vista previa generada de forma segura. Listo para guardar como PDF o imprimir.</span>
              <button 
                onclick="window.print()" 
                class="bg-indigo-600 hover:bg-indigo-750 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Imprimir / Guardar como PDF
              </button>
            </div>

            <!-- Table Container -->
            <div class="overflow-x-auto border border-slate-200 rounded-xl">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr>
                    ${headersHtml}
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="border-t border-slate-100 pt-6 flex justify-between items-center text-[10px] text-slate-400">
              <span>© ${new Date().getFullYear()} IHS Manager. Todos los derechos reservados.</span>
              <span>Generado por: ${currentUser?.name || 'Administrador'}</span>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Main list export multiplexer
  const handleExportList = (type: string, format: 'csv' | 'pdf') => {
    let title = "";
    let headers: string[] = [];
    let rows: any[][] = [];

    if (type === "Instituciones") {
      title = "Listado de Instituciones Socias";
      headers = ["ID", "Nombre Comercial", "Institución (Razón Social)", "País", "Membresía", "Productor / Cuentas", "Fecha Registro", "Estatus"];
      rows = institutions.map(i => [
        i.id,
        i.tradeName || i.name,
        i.name,
        i.country ? (i.country.toLowerCase().includes('colombia') && i.colombiaCalendar ? `${i.country} (${i.colombiaCalendar})` : i.country) : "ND",
        i.membershipId ? (catalogs['Membresías']?.find(m => m.id === i.membershipId)?.name || 'Especial') : 'Ninguna',
        i.producerName || "ND",
        i.registrationDate || "ND",
        i.status || "Activo"
      ]);
    } else if (type === "Alumnos") {
      title = "Listado General de Alumnos";
      headers = ["ID", "Nombre", "Apellidos", "Institución", "Celular", "Correo", "Estado Alumno", "Grupo Sanguíneo"];
      rows = students.map(s => {
        const instName = institutions.find(i => i.id === s.institutionId)?.tradeName || institutions.find(i => i.id === s.institutionId)?.name || "Sin vincular";
        return [
          s.id,
          s.name,
          s.surname || "",
          instName,
          s.cellphone || "",
          s.email || "",
          s.status || "Activo",
          s.bloodType || "ND"
        ];
      });
    } else if (type === "Clases") {
      title = "Oferta de Clases Extraescolares y Precios";
      headers = ["ID Clase", "Nombre de la Clase", "Créditos", "Costo Base (USD)", "Categoría", "Institución Asignada", "Cupo Máx", "Estatus"];
      rows = classes.map(c => {
        const instName = institutions.find(i => i.id === c.institutionId)?.tradeName || institutions.find(i => i.id === c.institutionId)?.name || "Todas";
        return [
          c.id,
          c.name,
          c.credits || 0,
          `$${(c.pricingBase || 0).toLocaleString()}`,
          c.category || "General",
          instName,
          c.maxStudents || "Ilimitado",
          c.status || "Activa"
        ];
      });
    } else if (type === "Proveedores") {
      title = "Listado de Proveedores Registrados";
      headers = ["ID", "Nombre Comercial", "País / Pabellón", "Servicios Contratados", "Contacto Ppal.", "Teléfono", "Estatus"];
      rows = providers.map(p => [
        p.id,
        p.tradeName || p.name,
        p.country || "ND",
        p.servicesProvided || "ND",
        p.contactPerson || "ND",
        p.phone || "",
        p.status || "Activo"
      ]);
    } else if (type === "Inscripciones") {
      title = "Control General de Inscripciones de Alumnos";
      headers = ["ID Inscripción", "Nombre Alumno", "Clase / Taller", "Tarifa Pactada (USD)", "Fecha Inscripción", "Estatus"];
      const allEnrollments = enrollments || [];
      rows = allEnrollments.map(e => {
        const student = students.find(s => s.id === e.studentId);
        const nameStr = student ? `${student.name} ${student.surname || ''}` : "Alumno ID: " + e.studentId;
        const claseStr = classes.find(c => c.id === e.classId)?.name || "Clase ID: " + e.classId;
        return [
          e.id,
          nameStr,
          claseStr,
          `$${(e.agreedSessionPrice || 0).toLocaleString()}`,
          e.enrollmentDate || "ND",
          e.status || "Activa"
        ];
      });
    } else if (type === "Transacciones") {
      title = "Libro Diario de Transacciones Financieras";
      headers = ["ID Transacción", "Fecha", "Tipo de Movimiento", "Monto (MXN)", "Categoría", "Concepto de Operación", "Referencia Bancaria", "Facturado"];
      const allTransactions = financialTransactions.filter(t => !(typeof t.id === 'string' && t.id.startsWith('tx-init-')));
      rows = allTransactions.map(t => [
        t.id,
        t.date || "ND",
        t.type === 'income' ? 'Ingreso (+)' : 'Egreso (-)',
        `$${(t.amountMXN || t.amount || 0).toLocaleString()}`,
        t.category || "Otros",
        t.description || "Sin descripción",
        t.reference || "",
        t.isInvoiced ? "Sí" : "No"
      ]);
    }

    if (rows.length === 0) {
      alert("No hay registros en esta categoría para exportar.");
      return;
    }

    if (format === 'csv') {
      const filename = `${type.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(filename, headers, rows);
    } else if (format === 'pdf') {
      exportToPDF(title, headers, rows);
    }
  };

  const [companyForm, setCompanyForm] = useState(companyInfo);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');

  // Sincronizar formulario si companyInfo cambia (p.ej. al cargar desde Firestore)
  useEffect(() => {
    if (companyInfo) {
      setCompanyForm(companyInfo);
    }
  }, [companyInfo]);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [newDoc, setNewDoc] = useState({ name: '', date: '', validity: '', url: '' });

  // Estados para Notificaciones Avanzadas de Pagos Pendientes
  const [notifSubtab, setNotifSubtab] = useState<"config" | "pending" | "history" | "rules">("config");
  const [customRules, setCustomRules] = useState<Array<{
    id: string;
    name: string;
    financialState: string; // "Pendiente" | "Atrasado" | "Vencido / Mora" | "Parcialmente Pagado"
    minAmount: number;
    allowedRoles: string[]; // e.g., ["Alumno", "Coordinador"]
    channel: string; // "Email" | "WhatsApp" | "Push Notification" | "SMS" | "Llamada"
    triggerDays: number;
    enabled: boolean;
    subject: string;
    body: string;
  }>>(() => {
    const saved = localStorage.getItem("custom_notification_rules");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "rule_1",
        name: "Recordatorio Automático: Alerta de Mora a Alumnos de Idiomas",
        financialState: "Vencido / Mora",
        minAmount: 1000,
        allowedRoles: ["Alumno"],
        channel: "WhatsApp & Push",
        triggerDays: 10,
        enabled: true,
        subject: "Alerta de Cuenta en Mora",
        body: "Aviso importante, tu cuenta presenta una mora de {monto}. Solicita un plan de pago."
      },
      {
        id: "rule_2",
        name: "Aviso de Factura Pendiente a Coordinador de Institución",
        financialState: "Pendiente",
        minAmount: 5000,
        allowedRoles: ["Coordinador"],
        channel: "Email",
        triggerDays: 5,
        enabled: true,
        subject: "Factura Pendiente de Pago - Validación Convenio",
        body: "Señor Coordinador de {nombre_institucion}, le recordamos el pago pendiente de {monto}."
      }
    ];
  });

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleConfirmOpen, setRuleConfirmOpen] = useState(false);
  const [ruleSuccessBanner, setRuleSuccessBanner] = useState<string | null>(null);
  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    financialState: "Pendiente",
    minAmount: 0,
    allowedRoles: [] as string[],
    channel: "Email",
    triggerDays: 1,
    subject: "",
    body: ""
  });

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");
  const [ruleRoleFilter, setRuleRoleFilter] = useState("Todos");
  const [ruleChannelFilter, setRuleChannelFilter] = useState("Todos");
  const [ruleTestedResults, setRuleTestedResults] = useState<{
    ruleName: string;
    matches: Array<{ name: string; status: string; balance: string; type: string }>;
  } | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    id: string;
    target: string;
    type: string;
    title: string;
    triggerDays: number;
    channel: string;
    enabled: boolean;
    subject: string;
    body: string;
  } | null>(null);

  const DEFAULT_REMINDER_TEMPLATES = [
    {
      id: "student_pre",
      target: "Alumno",
      type: "Preventivo",
      title: "Recordatorio de Pago de Colegiatura",
      triggerDays: 5,
      channel: "Email & Push",
      enabled: true,
      subject: "Aviso de Próximo Vencimiento de Mensualidad",
      body: "Hola {nombre_alumno}, te recordamos que el pago de tu colegiatura por un monto de {monto} vence el {fecha_limite}. Agradecemos tu puntual aportación para seguir disfrutando de tus clases."
    },
    {
      id: "student_post",
      target: "Alumno",
      type: "Cobro Atrasado",
      title: "Reclamación de Colegiatura Atrasada",
      triggerDays: 1,
      channel: "Email, WhatsApp & Push",
      enabled: true,
      subject: "Urgente: Pago de Colegiatura Vencido",
      body: "Estimado/a {nombre_alumno}, te informamos que tu saldo de colegiatura por un monto de {monto} presenta un retraso de pago. Su vencimiento fue el {fecha_limite}. Por favor realiza tu pago a la brevedad para evitar recargos o la suspensión del servicio."
    },
    {
      id: "inst_pre",
      target: "Institución",
      type: "Preventivo",
      title: "Aviso de Facturación de Convenio",
      triggerDays: 7,
      channel: "Email",
      enabled: true,
      subject: "Notificación de Próxima Factura de Servicios",
      body: "Estimada institución {nombre_institucion}, le recordamos que el pago de su próxima de factura mensual de aportación por {monto} vence el {fecha_limite}. Los datos de transferencia y la factura ya están disponibles en su panel."
    },
    {
      id: "inst_post",
      target: "Institución",
      type: "Cobro Atrasado",
      title: "Cobro de Factura Vencida",
      triggerDays: 3,
      channel: "Email & Teléfono",
      enabled: true,
      subject: "AVISO DE COBRO: Factura de Convenio Atrasada",
      body: "Estimado/a Coordinador/a de {nombre_institucion}, hacemos de su conocimiento que la factura correspondiente a su convenio por {monto} venció el {fecha_limite} y se encuentra pendiente de liquidar. Le solicitamos realizar el depósito y subir el comprobante hoy mismo."
    }
  ];

  const [reminderTemplates, setReminderTemplates] = useState<Array<{
    id: string;
    target: string;
    type: string;
    title: string;
    triggerDays: number;
    channel: string;
    enabled: boolean;
    subject: string;
    body: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem("reminder_templates_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_REMINDER_TEMPLATES;
  });

  const saveReminderTemplates = (updated: typeof reminderTemplates) => {
    setReminderTemplates(updated);
    try {
      localStorage.setItem("reminder_templates_v1", JSON.stringify(updated));
    } catch {}
  };

  // Eliminación de Notificación de Pago por Super Admin
  const handleDeleteReminderTemplate = (tplId: string, tplTitle: string) => {
    if (!isSuperAdmin) {
      alert("Solo el Super Administrador tiene autorización para borrar notificaciones de pagos.");
      return;
    }
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la notificación de pago "${tplTitle}"?`)) {
      const updated = reminderTemplates.filter(t => t.id !== tplId);
      saveReminderTemplates(updated);
      triggerToast(`Notificación de pago "${tplTitle}" eliminada exitosamente.`);
    }
  };

  const handleOpenCreateReminderTemplate = () => {
    if (!isSuperAdmin) {
      alert("Solo el Super Administrador puede crear nuevas notificaciones de pagos.");
      return;
    }
    setEditingTemplateId("new");
    setTemplateForm({
      id: `notif_${generateUniqueId()}`,
      target: "Alumno",
      type: "Preventivo",
      title: "Nueva Notificación de Cobro",
      triggerDays: 3,
      channel: "Email & Push",
      enabled: true,
      subject: "Aviso de Pago Pendiente",
      body: "Estimado/a {nombre_alumno}, le informamos que presenta un pago pendiente por {monto} con fecha límite {fecha_limite}."
    });
  };

  // Eliminación de Remitente por Super Admin (SMTP y WhatsApp)
  const handleDeleteSmtpRemitente = () => {
    if (!isSuperAdmin) {
      alert("Solo el Super Administrador tiene autorización para borrar el remitente.");
      return;
    }
    if (confirm("¿Estás seguro de que deseas borrar los datos del remitente y restablecer la configuración de correo (SMTP)?")) {
      const emptyConfig = {
        host: "",
        port: "",
        user: "",
        pass: "",
        fromName: "",
        fromEmail: ""
      };
      setSmtpConfig(emptyConfig);
      try {
        localStorage.removeItem("smtp_credentials");
      } catch {}
      updateCompanyInfo({
        ...companyInfo,
        smtpConfig: emptyConfig
      } as any);
      triggerToast("Configuración del remitente de correo borrada exitosamente.");
    }
  };

  const handleDeleteWhatsappRemitente = () => {
    if (!isSuperAdmin) {
      alert("Solo el Super Administrador tiene autorización para borrar el remitente.");
      return;
    }
    if (confirm("¿Estás seguro de que deseas borrar el número remitente y credenciales de WhatsApp?")) {
      const emptyConfig = {
        provider: "meta" as const,
        apiUrl: "",
        phoneNumberId: "",
        accessToken: ""
      };
      setWhatsappConfig(emptyConfig);
      try {
        localStorage.removeItem("whatsapp_credentials");
      } catch {}
      triggerToast("Configuración del remitente de WhatsApp borrada exitosamente.");
    }
  };

  // Bitácora de Envíos: Inicia de cero como solicitado por el usuario y es inmutable
  const [notifHistory, setNotifHistory] = useState<Array<{
    id: number | string;
    date: string;
    recipient: string;
    target: "Alumno" | "Institución";
    type: "Preventivo" | "Cobro Atrasado";
    campaignName: string;
    channel: string;
    subject: string;
    amount: string;
  }>>(() => {
    try {
      const resetDone = localStorage.getItem("notif_history_reset_zero_v3");
      if (!resetDone) {
        localStorage.setItem("notif_history_v1", JSON.stringify([]));
        localStorage.setItem("notif_history_reset_zero_v3", "true");
        return [];
      }
      const saved = localStorage.getItem("notif_history_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addNotifHistoryEntry = (entry: {
    id: number | string;
    date: string;
    recipient: string;
    target: "Alumno" | "Institución";
    type: "Preventivo" | "Cobro Atrasado";
    campaignName: string;
    channel: string;
    subject: string;
    amount: string;
  }) => {
    setNotifHistory(prev => {
      const updated = [entry, ...prev];
      try {
        localStorage.setItem("notif_history_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Cola de Bandeja de Envíos: elementos descartados por Super Admin
  const [dismissedPendingIds, setDismissedPendingIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dismissed_pending_notifs_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleDismissPendingNotif = (notifKey: string, desc: string) => {
    if (!isSuperAdmin) {
      alert("Solo el Super Administrador puede descartar notificaciones de la bandeja de envíos.");
      return;
    }
    if (confirm(`¿Descartar y borrar la notificación pendiente para "${desc}" de la bandeja?`)) {
      setDismissedPendingIds(prev => {
        const updated = [...prev, notifKey];
        try {
          localStorage.setItem("dismissed_pending_notifs_v1", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      triggerToast(`Notificación para "${desc}" descartada.`);
    }
  };

  const [smtpConfig, setSmtpConfig] = useState(() => {
    if ((companyInfo as any)?.smtpConfig) {
      return (companyInfo as any).smtpConfig;
    }
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      host: "smtp.gmail.com",
      port: "587",
      user: "",
      pass: "",
      fromEmail: companyInfo?.contactEmail || "",
      fromName: companyInfo?.commercialName || "Instituto de Humanidades y Ciencias"
    };
  });

  // Keep smtpConfig updated if loaded from cloud Firestore
  useEffect(() => {
    if ((companyInfo as any)?.smtpConfig) {
      setSmtpConfig((companyInfo as any).smtpConfig);
    }
  }, [(companyInfo as any)?.smtpConfig]);

  const [testEmail, setTestEmail] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const sendRealNotificationEmail = async (toEmail: string, toName: string, subject: string, body: string, allowFallback = true) => {
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          smtpUser: smtpConfig.user,
          smtpPass: smtpConfig.pass,
          smtpFromEmail: smtpConfig.fromEmail || companyInfo?.contactEmail,
          smtpFromName: smtpConfig.fromName || companyInfo?.commercialName,
          to: toEmail,
          subject: subject,
          body: body,
          allowFallback: allowFallback
        })
      });
      const { isJson, data, rawText } = await safeParseJsonResponse(res);
      if (isJson && data) {
        if (!res.ok && !data.simulated) {
          throw new Error(data.error || "Error al conectar con el servidor de correo.");
        }
        return { 
          success: data.success !== false, 
          simulated: data.simulated, 
          message: data.message, 
          warning: data.warning, 
          error: data.error,
          technicalError: data.technicalError
        };
      }

      if (res.status === 413 || rawText.includes("PayloadTooLargeError")) {
        return { success: false, error: "El correo o sus datos adjuntos exceden el límite de tamaño permitido." };
      }

      if (allowFallback) {
        return { 
          success: true, 
          simulated: true, 
          message: `[Simulación] Correo registrado para <${toEmail}>.` 
        };
      }

      return { 
        success: false, 
        error: `Error del servidor (${res.status}): No se pudo procesar la solicitud de correo.` 
      };
    } catch (err: any) {
      console.error("Real email dispatch error: ", err);
      return { success: false, error: err.message || "Error al enviar el correo." };
    }
  };

  const [whatsappConfig, setWhatsappConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("whatsapp_credentials");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      provider: "meta",
      apiUrl: "https://graph.facebook.com/v19.0",
      phoneNumberId: "",
      accessToken: "",
      testPhone: ""
    };
  });

  const [taskNotifConfig, setTaskNotifConfig] = useState<TaskNotificationConfig>(getTaskNotificationConfig);
  const [testPhone, setTestPhone] = useState("");
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [isTestingTaskNotif, setIsTestingTaskNotif] = useState(false);
  const [isScanningDeadlines, setIsScanningDeadlines] = useState(false);
  const [taskTestRecipientEmail, setTaskTestRecipientEmail] = useState("");
  const [taskTestRecipientPhone, setTaskTestRecipientPhone] = useState("");
  const [activeTemplateTab, setActiveTemplateTab] = useState<"assignment" | "deadline">("assignment");

  const sendRealNotificationWhatsApp = async (toPhone: string, body: string) => {
    try {
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: whatsappConfig.provider,
          apiUrl: whatsappConfig.apiUrl,
          phoneNumberId: whatsappConfig.phoneNumberId,
          accessToken: whatsappConfig.accessToken,
          to: toPhone,
          message: body
        })
      });
      const { isJson, data } = await safeParseJsonResponse(res);
      if (isJson && data) {
        if (!res.ok && !data.simulated) {
          throw new Error(data.error || "Error de red al enviar WhatsApp");
        }
        return { success: data.success !== false, simulated: data.simulated, message: data.message };
      }
      return { success: true, simulated: true, message: `[Simulación] WhatsApp registrado para ${toPhone}` };
    } catch (err: any) {
      console.error("Real WhatsApp dispatch error: ", err);
      return { success: false, error: err.message };
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyInfo(companyForm);
    triggerToast("Información de la empresa y logotipo guardados correctamente.", "success");
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      triggerToast(validation.error || "Archivo de imagen inválido.", "error");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const compressedDataUrl = await compressLogoImage(file);
      setCompanyForm(prev => ({ ...prev, logoUrl: compressedDataUrl }));
      triggerToast("Logotipo cargado correctamente. Recuerda hacer clic en 'Guardar Cambios'.", "success");
    } catch (err: any) {
      console.error("Error al procesar el logotipo:", err);
      triggerToast("Ocurrió un error al procesar la imagen seleccionada.", "error");
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setCompanyForm(prev => ({ ...prev, logoUrl: '' }));
    triggerToast("Logotipo removido. Guarda los cambios para aplicar.", "success");
  };

  const handleApplyLogoUrl = () => {
    if (!tempLogoUrl.trim()) return;
    setCompanyForm(prev => ({ ...prev, logoUrl: tempLogoUrl.trim() }));
    setTempLogoUrl('');
    setShowLogoUrlInput(false);
    triggerToast("URL de logotipo asignada. Recuerda guardar los cambios.", "success");
  };

  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [viewingCompanyDoc, setViewingCompanyDoc] = useState<any | null>(null);
  const [activeCompanyPdfUrl, setActiveCompanyPdfUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const rawData = viewingCompanyDoc?.fileData || (viewingCompanyDoc?.url?.startsWith('data:application/pdf') ? viewingCompanyDoc.url : null);
    if (rawData?.startsWith('data:application/pdf')) {
      try {
        const parts = rawData.split(',');
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setActiveCompanyPdfUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Error creating company PDF blob URL:", e);
        setActiveCompanyPdfUrl(rawData);
      }
    } else {
      setActiveCompanyPdfUrl(viewingCompanyDoc?.url || null);
    }
  }, [viewingCompanyDoc]);

  const [docUploadType, setDocUploadType] = useState<"file" | "url">("file");

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processAndSave = (base64Data?: string, fileName?: string, fileSize?: string) => {
      addCompanyDocument({
        ...newDoc,
        url: base64Data || newDoc.url || '',
        fileData: base64Data,
        fileName: fileName,
        fileSize: fileSize || 'Carga Directa',
        uploadedBy: currentUser?.name || 'Usuario'
      });
      setDocModalOpen(false);
      setNewDoc({ name: '', date: '', validity: '', url: '' });
      setSelectedDocFile(null);
    };

    if (selectedDocFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const sizeStr = (selectedDocFile.size / (1024 * 1024)).toFixed(2) + " MB";
        processAndSave(evt.target?.result as string, selectedDocFile.name, sizeStr);
      };
      reader.readAsDataURL(selectedDocFile);
    } else {
      processAndSave();
    }
  };

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [generatedPassInfo, setGeneratedPassInfo] = useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWelcomeBody, setCopiedWelcomeBody] = useState(false);
  const [isSendingCredentialsEmail, setIsSendingCredentialsEmail] = useState(false);
  const [credentialsEmailResult, setCredentialsEmailResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [isWelcomeEmailModalOpen, setIsWelcomeEmailModalOpen] = useState(false);
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<any>(null);
  const [welcomeEmailSubject, setWelcomeEmailSubject] = useState("");
  const [welcomeEmailBody, setWelcomeEmailBody] = useState("");
  const [isSendingWelcomeEmail, setIsSendingWelcomeEmail] = useState(false);
  const [welcomeEmailResult, setWelcomeEmailResult] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [welcomePasswordToInclude, setWelcomePasswordToInclude] = useState("");
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: string;
    teamId?: number;
    studentId?: number;
    institutionId?: number;
  }>({ name: '', email: '', role: '', teamId: undefined, studentId: undefined, institutionId: undefined });

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("system_preferences");
      if (saved) {
        return {
          language: "es",
          theme: "light",
          timezone: "America/Mexico_City",
          currency: "MXN",
          dateFormat: "DD/MM/YYYY",
          timeFormat: "12h",
          paymentExceededEnabled: true,
          paymentThreshold: 5000,
          paymentEmailChannel: true,
          paymentSystemChannel: true,
          invoicePaidEnabled: true,
          invoiceEmailChannel: true,
          invoiceSystemChannel: true,
          ...JSON.parse(saved)
        };
      }
    } catch (e) {}
    return {
      language: "es",
      theme: "light",
      timezone: "America/Mexico_City",
      currency: "MXN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h",
      paymentExceededEnabled: true,
      paymentThreshold: 5000,
      paymentEmailChannel: true,
      paymentSystemChannel: true,
      invoicePaidEnabled: true,
      invoiceEmailChannel: true,
      invoiceSystemChannel: true
    };
  });

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Estados y funciones para Gestión Integral de SLA (CRM, Instituciones, Alumnos)
  const [slaModuleTab, setSlaModuleTab] = useState<"todos" | "crm" | "instituciones" | "alumnos">("todos");
  const [slaSearchQuery, setSlaSearchQuery] = useState("");
  const [slaPriorityFilter, setSlaPriorityFilter] = useState<string>("todas");
  const [slaStatusFilter, setSlaStatusFilter] = useState<string>("todos");
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [editingSlaId, setEditingSlaId] = useState<string | null>(null);
  const [slaSimulatorDays, setSlaSimulatorDays] = useState<number>(4);
  const [slaSimulatorSelectedId, setSlaSimulatorSelectedId] = useState<string>("");

  // Listado de etapas para Redes Sociales
  const getRedesSocialesStages = () => {
    let list = [
      "Mensaje 1",
      "Mensaje 2",
      "Mensaje 3",
      "Mensaje 4",
      "Mensaje 5",
      "Perdido"
    ];
    try {
      const saved = localStorage.getItem("crm_stages_redes_sociales_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
        }
      }
    } catch {
      // ignore
    }
    return list;
  };

  // Listado de etapas para Instituciones (Pipeline Principal CRM)
  const getInstitucionesStages = () => {
    let list = [
      "Leads",
      "Primer contacto",
      "Presentación",
      "Malla curricular y boletines",
      "Diagnostico y propuesta",
      "Examen Inglés",
      "Revisión",
      "Firma",
      "Cliente",
      "Sin Interes",
      "Futuro",
      "Perdido"
    ];
    try {
      const saved = localStorage.getItem("crm_stages_instituciones_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
        }
      }
    } catch {
      // ignore
    }
    return list;
  };

  // Listado de etapas para Particulares / Personas Potenciales
  const getParticularesStages = () => {
    let list = [
      "Leads",
      "Primer contacto",
      "Presentación",
      "Diagnóstico y propuesta",
      "Examen Inglés",
      "Revisión",
      "Firma",
      "Cliente",
      "Sin Interés",
      "Futuro",
      "Perdido"
    ];
    try {
      const saved = localStorage.getItem("crm_stages_particulares_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
        }
      }
    } catch {
      // ignore
    }
    return list;
  };

  // Listado de etapas disponibles según el módulo
  const getAvailableStagesForModule = (mod: string) => {
    if (mod === 'instituciones') {
      return [
        "Captación",
        "Convenio Firmado",
        "Integración Curricular",
        "Activa con Alumnos",
        "Inactiva / Sin Matrícula",
        "Pausada",
        "Revisión Jurídica",
        "Baja Definitiva"
      ];
    }
    if (mod === 'alumnos') {
      return [
        "Inscrito",
        "Cursando",
        "Examen Pendiente",
        "Seguimiento Académico",
        "Calificado",
        "Egresado",
        "Baja Temporal"
      ];
    }
    // Para CRM incluye etapas de Redes Sociales, Instituciones y Particulares
    const redes = getRedesSocialesStages();
    const inst = getInstitucionesStages();
    const part = getParticularesStages();
    return Array.from(new Set([...redes, ...inst, ...part]));
  };

  // Plantillas de correo disponibles para automatización de SLA
  const availableSlaTemplates = React.useMemo(() => {
    const list = [
      { id: "tpl_sla_reminder", title: "Recordatorio Automático de Inactividad (SLA Vencido)", subject: "Aviso de seguimiento de proceso para {{nombre_contacto}}", category: "SLA / Inactividad", body: "Estimado/a {{nombre_contacto}},\n\nHemos detectado que el proceso comercial de su institución se encuentra en espera. Nos gustaría coordinar una breve llamada para continuar con los siguientes pasos del programa." },
      { id: "tpl_primer_contacto", title: "Presentación Oficial del Bachillerato Dual", subject: "Propuesta de Innovación Académica para {{nombre_colegio}}", category: "Primer Contacto", body: "Estimado equipo directivo, compartimos la propuesta oficial y modelo pedagógico de Bachillerato Dual Americano." },
      { id: "tpl_seguimiento", title: "Seguimiento tras Reunión de Presentación", subject: "Próximos pasos para la incorporación del programa", category: "Seguimiento", body: "Agradecemos el tiempo dedicado a la presentación. Adjuntamos el resumen de acuerdos y fechas estimadas." },
      { id: "tpl_propuesta", title: "Envío de Propuesta y Malla Curricular", subject: "Malla curricular y propuesta económica para {{nombre_colegio}}", category: "Propuesta", body: "Compartimos la propuesta integral con el desglose de malla curricular y estructura de costos." },
      { id: "tpl_examen_ingles", title: "Invitación a Examen Diagnóstico de Inglés", subject: "Acceso a prueba diagnóstica de nivel de inglés", category: "Académico", body: "El enlace de acceso para la aplicación de la prueba diagnóstica se encuentra activo." },
      { id: "tpl_documentacion", title: "Aviso de Documentación Pendiente", subject: "Requerimiento de documentación para formalización", category: "Operaciones", body: "Le recordamos que se requiere la entrega de los documentos pendientes para completar la fase actual." },
      { id: "tpl_reactivacion", title: "Reactivación de Contacto sin Respuesta", subject: "¿Aún estás interesado en el programa de Bachillerato Dual?", category: "Reactivación", body: "Hola, queremos consultar si continúan interesados en explorar la implementación del programa este ciclo." },
      { id: "tpl_inst_sla", title: "Aviso Institucional de SLA Superado", subject: "Actualización sobre el estatus de su institución", category: "Instituciones", body: "Notificación automática del sistema: El tiempo estipulado para la revisión del convenio ha concluido." },
      { id: "tpl_alumno_sla", title: "Recordatorio de Entrega y Evaluación en Plataforma", subject: "Importante: Pendiente de entrega académica", category: "Alumnos", body: "Estimado alumno/tutor: Tienes actividades con fecha límite superada en la plataforma." }
    ];

    try {
      const crmSaved = safeLocalStorageGet<any[]>("crm_email_templates_v2", []);
      if (Array.isArray(crmSaved)) {
        crmSaved.forEach(st => {
          if (st && st.id && !list.some(b => b.id === st.id)) {
            list.push({
              id: st.id,
              title: st.title || "Plantilla personalizada",
              subject: st.subject || "",
              category: st.category || "CRM",
              body: st.body || ""
            });
          }
        });
      }
      const instSaved = safeLocalStorageGet<any[]>("inst_notif_templates_v1", []);
      if (Array.isArray(instSaved)) {
        instSaved.forEach(it => {
          if (it && it.id && !list.some(b => b.id === it.id)) {
            list.push({
              id: it.id,
              title: it.title || "Plantilla institucional",
              subject: it.subject || "",
              category: it.category || "Instituciones",
              body: it.content || ""
            });
          }
        });
      }
    } catch {
      // ignore
    }

    return list;
  }, []);

  const [slaForm, setSlaForm] = useState<{
    name: string;
    description: string;
    slaDays: number | null;
    module: "crm" | "instituciones" | "alumnos";
    priority: "alta" | "media" | "baja";
    responsibleRole: string;
    actionOnAlert: string;
    isActive: boolean;
    emailTemplateId: string;
    emailTemplateTitle: string;
    targetStage: string;
    hasSecondaryAction: boolean;
    secondaryAction: string;
    secondaryEmailTemplateId: string;
    secondaryEmailTemplateTitle: string;
    secondaryTargetStage: string;
  }>({
    name: "",
    description: "",
    slaDays: 3,
    module: "crm",
    priority: "alta",
    responsibleRole: "Ventas",
    actionOnAlert: "Alerta en Dashboard y Correo al Ejecutivo",
    isActive: true,
    emailTemplateId: "tpl_sla_reminder",
    emailTemplateTitle: "Recordatorio Automático de Inactividad (SLA Vencido)",
    targetStage: "Futuro",
    hasSecondaryAction: false,
    secondaryAction: "Mover a otra etapa",
    secondaryEmailTemplateId: "tpl_sla_reminder",
    secondaryEmailTemplateTitle: "Recordatorio Automático de Inactividad (SLA Vencido)",
    secondaryTargetStage: "Futuro"
  });

  const rawSlaCatalog = catalogs['Fases y Alertas de Inactividad (SLA)'] || [];
  const normalizedSlaList = rawSlaCatalog.map(item => {
    let mod = item.module;
    if (!mod) {
      const sName = (item.name || '').toLowerCase();
      if (sName.includes('convenio') || sName.includes('campus') || sName.includes('colegio') || sName.includes('sede') || sName.includes('factura') || sName.includes('instituc')) {
        mod = 'instituciones';
      } else if (sName.includes('alumno') || sName.includes('inscrip') || sName.includes('inglés') || sName.includes('ingles') || sName.includes('kárdex') || sName.includes('kardex') || sName.includes('admision') || sName.includes('admisión')) {
        mod = 'alumnos';
      } else {
        mod = 'crm';
      }
    }
    return {
      ...item,
      module: mod,
      priority: item.priority || (item.slaDays && item.slaDays <= 3 ? 'alta' : 'media'),
      responsibleRole: item.responsibleRole || (mod === 'crm' ? 'Ventas' : mod === 'instituciones' ? 'Coordinación Institucional' : 'Admisiones'),
      actionOnAlert: item.actionOnAlert || 'Alerta en Dashboard',
      isActive: item.isActive !== false,
      emailTemplateId: item.emailTemplateId || '',
      emailTemplateTitle: item.emailTemplateTitle || '',
      targetStage: item.targetStage || '',
      hasSecondaryAction: item.hasSecondaryAction === true,
      secondaryAction: item.secondaryAction || '',
      secondaryEmailTemplateId: item.secondaryEmailTemplateId || '',
      secondaryEmailTemplateTitle: item.secondaryEmailTemplateTitle || '',
      secondaryTargetStage: item.secondaryTargetStage || ''
    };
  });

  const handleOpenCreateSla = (modulePref: "crm" | "instituciones" | "alumnos" = "crm") => {
    setEditingSlaId(null);
    const stages = getAvailableStagesForModule(modulePref);
    setSlaForm({
      name: "",
      description: "",
      slaDays: 3,
      module: modulePref,
      priority: "alta",
      responsibleRole: modulePref === "crm" ? "Ventas" : modulePref === "instituciones" ? "Coordinación Institucional" : "Admisiones",
      actionOnAlert: "Alerta en Dashboard y Correo al Ejecutivo",
      isActive: true,
      emailTemplateId: "tpl_sla_reminder",
      emailTemplateTitle: "Recordatorio Automático de Inactividad (SLA Vencido)",
      targetStage: stages[stages.length - 2] || "Futuro",
      hasSecondaryAction: false,
      secondaryAction: "Mover a otra etapa",
      secondaryEmailTemplateId: "tpl_sla_reminder",
      secondaryEmailTemplateTitle: "Recordatorio Automático de Inactividad (SLA Vencido)",
      secondaryTargetStage: stages[stages.length - 2] || "Futuro"
    });
    setSlaModalOpen(true);
  };

  const handleOpenEditSla = (item: any) => {
    setEditingSlaId(item.id);
    const mod = (item.module as any) || "crm";
    const stages = getAvailableStagesForModule(mod);
    setSlaForm({
      name: item.name || "",
      description: item.description || "",
      slaDays: item.slaDays !== undefined ? item.slaDays : 3,
      module: mod,
      priority: (item.priority as any) || "media",
      responsibleRole: item.responsibleRole || "Operaciones",
      actionOnAlert: item.actionOnAlert || "Alerta en Dashboard",
      isActive: item.isActive !== false,
      emailTemplateId: item.emailTemplateId || "tpl_sla_reminder",
      emailTemplateTitle: item.emailTemplateTitle || "Recordatorio Automático de Inactividad (SLA Vencido)",
      targetStage: item.targetStage || stages[stages.length - 2] || "Futuro",
      hasSecondaryAction: item.hasSecondaryAction === true,
      secondaryAction: item.secondaryAction || "Mover a otra etapa",
      secondaryEmailTemplateId: item.secondaryEmailTemplateId || "tpl_sla_reminder",
      secondaryEmailTemplateTitle: item.secondaryEmailTemplateTitle || "Recordatorio Automático de Inactividad (SLA Vencido)",
      secondaryTargetStage: item.secondaryTargetStage || stages[stages.length - 2] || "Futuro"
    });
    setSlaModalOpen(true);
  };

  const handleSaveSla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slaForm.name.trim()) {
      triggerToast("Ingresa un nombre para la fase o regla SLA", "error");
      return;
    }

    try {
      const payload = {
        name: slaForm.name.trim(),
        description: slaForm.description.trim(),
        slaDays: slaForm.slaDays,
        module: slaForm.module,
        priority: slaForm.priority,
        responsibleRole: slaForm.responsibleRole,
        actionOnAlert: slaForm.actionOnAlert,
        isActive: slaForm.isActive,
        emailTemplateId: slaForm.emailTemplateId,
        emailTemplateTitle: slaForm.emailTemplateTitle,
        targetStage: slaForm.targetStage,
        hasSecondaryAction: slaForm.hasSecondaryAction,
        secondaryAction: slaForm.hasSecondaryAction ? slaForm.secondaryAction : "",
        secondaryEmailTemplateId: slaForm.hasSecondaryAction ? slaForm.secondaryEmailTemplateId : "",
        secondaryEmailTemplateTitle: slaForm.hasSecondaryAction ? slaForm.secondaryEmailTemplateTitle : "",
        secondaryTargetStage: slaForm.hasSecondaryAction ? slaForm.secondaryTargetStage : ""
      };

      if (editingSlaId) {
        updateCatalogItem('Fases y Alertas de Inactividad (SLA)', editingSlaId, payload);
        triggerToast("Acuerdo SLA actualizado con éxito");
      } else {
        addCatalogItem('Fases y Alertas de Inactividad (SLA)', payload);
        triggerToast("Nueva regla SLA registrada exitosamente");
      }
      setSlaModalOpen(false);
    } catch (err) {
      triggerToast("Error al guardar la regla SLA", "error");
    }
  };

  const handleDeleteSla = (item: any) => {
    setDeleteConfirm({
      title: "Eliminar Acuerdo SLA",
      message: `¿Estás seguro de que deseas eliminar la regla SLA "${item.name}"? Los procesos asociados no contarán con alerta de vencimiento automática.`,
      onConfirm: () => {
        deleteCatalogItem('Fases y Alertas de Inactividad (SLA)', item.id);
        triggerToast("Regla SLA eliminada");
      }
    });
  };

  const handleQuickDaysUpdate = (item: any, delta: number) => {
    const current = item.slaDays === null || item.slaDays === undefined ? 3 : item.slaDays;
    const nextVal = Math.max(1, current + delta);
    updateCatalogItem('Fases y Alertas de Inactividad (SLA)', item.id, { slaDays: nextVal });
    triggerToast(`SLA de "${item.name}" ajustado a ${nextVal} días`);
  };

  const handleToggleSlaActive = (item: any) => {
    const nextStatus = item.isActive === false ? true : false;
    updateCatalogItem('Fases y Alertas de Inactividad (SLA)', item.id, { isActive: nextStatus });
    triggerToast(nextStatus ? `SLA "${item.name}" activado` : `SLA "${item.name}" pausado`);
  };

  const handleResetSlaDefaults = () => {
    setDeleteConfirm({
      title: "Restablecer SLAs Recomendados",
      message: "¿Deseas restablecer y sincronizar los SLAs estándar recomendados para CRM, Instituciones y Alumnos? Se mantendrán tus registros y se completarán las fases faltantes.",
      onConfirm: () => {
        const defaultSuite: any[] = [
          // CRM
          { id: 'sla_1', name: 'Captación (Inicio)', description: 'Prospecto recién identificado - Etapa de Inicio (SLA 3 días)', slaDays: 3, module: 'crm', priority: 'alta', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Correo al Ejecutivo', isActive: true },
          { id: 'sla_2', name: 'Prospecto Calificado', description: 'Colegio que cumple perfil para el programa dual', slaDays: 5, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_3', name: 'Primer contacto', description: 'Contacto inicial por correo, teléfono o LinkedIn', slaDays: 3, module: 'crm', priority: 'alta', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Correo', isActive: true },
          { id: 'sla_4', name: 'Contacto establecido', description: 'Interés confirmado por el colegio, se solicita cita', slaDays: 4, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_5', name: 'Reunión agendada', description: 'Cita programada en Google Calendar con directivos', slaDays: 5, module: 'crm', priority: 'alta', responsibleRole: 'Dirección Comercial', actionOnAlert: 'Notificación de Calendario y Alerta', isActive: true },
          { id: 'sla_6', name: 'Presentación realizada', description: 'Demostración del programa académico y plan dual', slaDays: 3, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_7', name: 'Propuesta enviada', description: 'Cotización formal y propuesta académica enviada', slaDays: 10, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard y Recordatorio', isActive: true },
          { id: 'sla_8', name: 'Seguimiento', description: 'Llamadas periódicas para atender dudas de directores', slaDays: 7, module: 'crm', priority: 'media', responsibleRole: 'Ventas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_9', name: 'Negociación', description: 'Ajustes de convenio y revisión legal de contratos', slaDays: 15, module: 'crm', priority: 'alta', responsibleRole: 'Dirección / Legal', actionOnAlert: 'Alerta Crítica y Notificación a Dirección', isActive: true },
          { id: 'sla_10', name: 'Convenio firmado', description: 'Convenio de Bachillerato Dual firmado oficialmente', slaDays: 5, module: 'crm', priority: 'alta', responsibleRole: 'Dirección General', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_11', name: 'Implementación', description: 'Capacitación docente e inducción a alumnos', slaDays: 30, module: 'crm', priority: 'media', responsibleRole: 'Operaciones', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_12', name: 'Cliente activo', description: 'Colegio operando de forma regular el plan dual', slaDays: null, module: 'crm', priority: 'baja', responsibleRole: 'Coordinación', actionOnAlert: 'Monitoreo Periódico', isActive: true },
          { id: 'sla_crm_inbound', name: 'Lead Inbound / Redes Sociales', description: 'Primer mensaje o formulario web de contacto recibido', slaDays: 1, module: 'crm', priority: 'alta', responsibleRole: 'Marketing / Ventas', actionOnAlert: 'Alerta Inmediata y Notificación WhatsApp', isActive: true },

          // Instituciones
          { id: 'sla_inst_1', name: 'Validación Documentos Legales y Fiscales', description: 'Revisión y cotejo de Acta Constitutiva, CIF y Poder Notarial', slaDays: 5, module: 'instituciones', priority: 'media', responsibleRole: 'Administración / Legal', actionOnAlert: 'Alerta en Dashboard y Correo a Sede', isActive: true },
          { id: 'sla_inst_2', name: 'Revisión y Firma de Convenio Marco', description: 'Validación de firmas y envío de contraparte legal firmada', slaDays: 10, module: 'instituciones', priority: 'alta', responsibleRole: 'Dirección General', actionOnAlert: 'Alerta Crítica a Dirección', isActive: true },
          { id: 'sla_inst_3', name: 'Configuración de Campus y Sede Dual', description: 'Creación de campus en sistema, asignación de claves y accesos', slaDays: 4, module: 'instituciones', priority: 'media', responsibleRole: 'Soporte de Sistemas', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_inst_4', name: 'Capacitación a Coordinadores de Sede', description: 'Sesión de onboarding y capacitación para el portal de sede', slaDays: 5, module: 'instituciones', priority: 'media', responsibleRole: 'Coordinación Académica', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_inst_5', name: 'Atención a Tickets y Consultas de Sede', description: 'Resolución de solicitudes técnicas, administrativas o de soporte', slaDays: 2, module: 'instituciones', priority: 'alta', responsibleRole: 'Atención a Sedes', actionOnAlert: 'Alerta Urgente por Correo y Dashboard', isActive: true },
          { id: 'sla_inst_6', name: 'Emisión y Cobro de Póliza Inicial / Factura', description: 'Generación de factura mensual o anual y envío de datos fiscales', slaDays: 3, module: 'instituciones', priority: 'alta', responsibleRole: 'Finanzas y Facturación', actionOnAlert: 'Alerta a Finanzas y Correo a Escuela', isActive: true },
          { id: 'sla_inst_7', name: 'Auditoría y Renovación Anual de Membresía', description: 'Revisión de metas de alumnos, renovación de licencia y actualización', slaDays: 15, module: 'instituciones', priority: 'media', responsibleRole: 'Dirección Comercial', actionOnAlert: 'Alerta en Dashboard', isActive: true },

          // Alumnos
          { id: 'sla_alum_1', name: 'Inscripción y Alta en Plataforma', description: 'Registro completo de alumno, matrícula institucional y usuario', slaDays: 2, module: 'alumnos', priority: 'alta', responsibleRole: 'Admisiones', actionOnAlert: 'Alerta en Dashboard y Correo al Alumno', isActive: true },
          { id: 'sla_alum_2', name: 'Validación de Expediente y Kárdex', description: 'Cotejo de boletas previas, CURP/DNI y comprobante académico', slaDays: 4, module: 'alumnos', priority: 'media', responsibleRole: 'Control Escolar', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_alum_3', name: 'Aplicación y Calificación de Examen de Inglés', description: 'Evaluación diagnóstica de nivel de idioma y entrega de resultado', slaDays: 3, module: 'alumnos', priority: 'alta', responsibleRole: 'Departamento de Idiomas', actionOnAlert: 'Notificación de Calificación Lista', isActive: true },
          { id: 'sla_alum_4', name: 'Asignación de Grupo y Horario Académico', description: 'Asignación de grupo de Bachillerato Dual o programa Homeschool', slaDays: 3, module: 'alumnos', priority: 'media', responsibleRole: 'Coordinación Académica', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_alum_5', name: 'University Admission / Carta de Aceptación', description: 'Gestión de credenciales y carta oficial de admisión con universidad asociada', slaDays: 7, module: 'alumnos', priority: 'alta', responsibleRole: 'Consejería Universitaria', actionOnAlert: 'Alerta y Notificación a Padres/Alumno', isActive: true },
          { id: 'sla_alum_6', name: 'Emisión de Certificado Dual Americano', description: 'Revisión de créditos completos, validación con USA y emisión oficial', slaDays: 15, module: 'alumnos', priority: 'alta', responsibleRole: 'Registro y Certificaciones', actionOnAlert: 'Alerta de Estatus de Titulación', isActive: true },
          { id: 'sla_alum_7', name: 'Tramitación de Bajas o Cambios de Asignatura', description: 'Procesamiento de cambio de materia, horario o baja justificada', slaDays: 3, module: 'alumnos', priority: 'media', responsibleRole: 'Control Escolar', actionOnAlert: 'Alerta en Dashboard', isActive: true },
          { id: 'sla_alum_8', name: 'Entrega de Reporte Bimestral de Calificaciones', description: 'Cierre de ciclo, subida de notas y entrega de boleta bimestral', slaDays: 5, module: 'alumnos', priority: 'media', responsibleRole: 'Dirección Académica', actionOnAlert: 'Alerta a Coordinadores', isActive: true }
        ];

        defaultSuite.forEach(item => {
          const exists = rawSlaCatalog.some(s => s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase());
          if (!exists) {
            addCatalogItem('Fases y Alertas de Inactividad (SLA)', item);
          } else {
            const found = rawSlaCatalog.find(s => s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase());
            if (found) {
              updateCatalogItem('Fases y Alertas de Inactividad (SLA)', found.id, {
                module: item.module,
                priority: found.priority || item.priority,
                responsibleRole: found.responsibleRole || item.responsibleRole,
                actionOnAlert: found.actionOnAlert || item.actionOnAlert,
                isActive: found.isActive !== undefined ? found.isActive : true
              });
            }
          }
        });
        triggerToast("Matriz de SLAs sincronizada con valores recomendados");
      }
    });
  };

  const handleExportSlaMatrixCSV = () => {
    const headers = ["ID", "Fase / Proceso", "Módulo", "Límite SLA (Días)", "Prioridad", "Rol Responsable", "Acción al Exceder", "Estado", "Descripción"];
    const rows = normalizedSlaList.map(s => [
      s.id,
      s.name,
      s.module === "crm" ? "CRM & Prospectos" : s.module === "instituciones" ? "Instituciones Socias" : s.module === "alumnos" ? "Alumnos & Académico" : "General",
      s.slaDays !== null && s.slaDays !== undefined ? `${s.slaDays} días` : "Sin límite",
      (s.priority || "media").toUpperCase(),
      s.responsibleRole || "Operaciones",
      s.actionOnAlert || "Alerta en Dashboard",
      s.isActive === false ? "Pausado" : "Activo",
      s.description || ""
    ]);
    exportToCSV("Matriz_Acuerdos_SLA_Dual_System.csv", headers, rows);
    triggerToast("Matriz SLA descargada en formato CSV");
  };

  const handleExportSlaMatrixPDF = () => {
    const headers = ["ID", "Fase / Proceso", "Módulo", "SLA (Días)", "Prioridad", "Responsable", "Acción de Alerta", "Estado"];
    const rows = normalizedSlaList.map(s => [
      s.id,
      s.name,
      s.module === "crm" ? "CRM" : s.module === "instituciones" ? "Instituciones" : s.module === "alumnos" ? "Alumnos" : "General",
      s.slaDays !== null && s.slaDays !== undefined ? `${s.slaDays} d` : "N/A",
      (s.priority || "media").toUpperCase(),
      s.responsibleRole || "Operaciones",
      s.actionOnAlert || "Alerta Dashboard",
      s.isActive === false ? "Inactivo" : "Activo"
    ]);
    exportToPDF("Matriz de Acuerdos de Nivel de Servicio (SLA) - Bachillerato Dual", headers, rows);
  };

  const handlePreferencesSave = () => {
    try {
      localStorage.setItem("system_preferences", JSON.stringify(preferences));
      triggerToast("Preferencias actualizadas con éxito");
    } catch (e) {
      triggerToast("Error al guardar las preferencias", "error");
    }
  };

  const handleSendCredentialsEmail = async () => {
    if (!generatedPassInfo) return;
    setIsSendingCredentialsEmail(true);
    setCredentialsEmailResult(null);

    const subject = "Tus credenciales de acceso para el Sistema IHS";
    const body = `Hola,\n\nSe ha configurado tu cuenta de acceso en el sistema de IHS (Instituto de Humanidades y Ciencias).\n\nAquí tienes tus credenciales para ingresar:\n• Portal: ${window.location.origin}\n• Correo electrónico: ${generatedPassInfo.email}\n• Contraseña temporal: ${generatedPassInfo.pass}\n\nNota: Por motivos de seguridad, te sugerimos o se te solicitará cambiar tu contraseña en tu primer acceso.\n\nSaludos cordiales,\nEquipo IHS`;

    const res = await sendRealNotificationEmail(generatedPassInfo.email, generatedPassInfo.email, subject, body, true);
    setIsSendingCredentialsEmail(false);
    if (res.success) {
      const msg = res.simulated
        ? (res.warning ? `Registrado en bitácora: ${res.warning}` : "¡Credenciales registradas con éxito en el sistema! (Modo Simulación: configura tu SMTP en la pestaña Notificaciones para despacho directo a buzón externo).")
        : "¡Credenciales enviadas correctamente por correo electrónico real!";
      setCredentialsEmailResult({ success: true, msg });
      triggerToast(res.simulated ? "Credenciales procesadas" : "Correo enviado con éxito", "success");
    } else {
      setCredentialsEmailResult({ success: false, msg: `No se pudo enviar vía SMTP: ${res.error || "Error de conexión"}. Puedes copiar las credenciales o abrir tu cliente de correo abajo.` });
      triggerToast("Aviso: Revisa la configuración SMTP", "error");
    }
  };

  const handleOpenWelcomeEmailModal = (user: any) => {
    setSelectedUserForEmail(user);
    const pass = user.password || "ihs123";
    setWelcomePasswordToInclude(pass);
    setWelcomeEmailResult(null);
    setWelcomeEmailSubject("Bienvenido a IHS - Tus credenciales de acceso");
    
    const body = `Hola ${user.name || "Usuario"},\n\nTe damos una cordial bienvenida al sistema de IHS (Instituto de Humanidades y Ciencias).\n\nSe ha configurado tu acceso para tu primer ingreso con las siguientes credenciales:\n• Portal: ${window.location.origin}\n• Correo electrónico: ${user.email}\n• Contraseña provisional: ${pass}\n\nPor favor, ingresa a la plataforma utilizando el enlace anterior.\n\nNota: Por motivos de seguridad, te sugerimos actualizar tu contraseña después de tu primer ingreso en la sección de Perfil/Configuración.\n\nSaludos cordiales,\nEquipo IHS`;
    
    setWelcomeEmailBody(body);
    setIsWelcomeEmailModalOpen(true);
  };

  const handleSendWelcomeEmail = async () => {
    if (!selectedUserForEmail) return;
    setIsSendingWelcomeEmail(true);
    setWelcomeEmailResult(null);
    
    // Save updated password in app state if changed
    if (welcomePasswordToInclude !== selectedUserForEmail.password) {
      updateUser(selectedUserForEmail.id, { 
        password: welcomePasswordToInclude,
        requirePasswordChange: true 
      });
    }

    const res = await sendRealNotificationEmail(
      selectedUserForEmail.email,
      selectedUserForEmail.name || selectedUserForEmail.email,
      welcomeEmailSubject,
      welcomeEmailBody,
      true
    );
    
    setIsSendingWelcomeEmail(false);
    if (res.success) {
      const msg = res.simulated
        ? (res.warning ? `Registrado en bitácora: ${res.warning}` : "¡Correo generado y registrado en bitácora con éxito!")
        : "¡Correo de bienvenida enviado exitosamente por correo real!";
      setWelcomeEmailResult({ success: true, msg });
      triggerToast(res.simulated ? "Correo procesado" : "¡Correo enviado con éxito!", "success");
      setTimeout(() => {
        setIsWelcomeEmailModalOpen(false);
      }, 1500);
    } else {
      setWelcomeEmailResult({ success: false, msg: `Error al enviar: ${res.error || "Revisa la configuración SMTP en Notificaciones."}` });
      triggerToast(`Error al enviar: ${res.error || "Revisa la configuración SMTP"}`, "error");
    }
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let userPayload: any = { ...userForm };
    let generatedPass = '';

    if (!editingUserId) {
      if (autoGeneratePassword) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 4; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        generatedPass = `IHS-${randomPart}`;
        userPayload = {
          ...userPayload,
          password: generatedPass,
          requirePasswordChange: true,
          requireEmailVerification: requireEmailVerification,
          emailVerified: !requireEmailVerification
        };
      } else {
        generatedPass = customPassword || 'ihs123';
        userPayload = {
          ...userPayload,
          password: generatedPass,
          requirePasswordChange: requirePasswordChange,
          requireEmailVerification: requireEmailVerification,
          emailVerified: !requireEmailVerification
        };
      }
    } else {
      // Editing user - update requirePasswordChange and requireEmailVerification if provided
      userPayload = {
        ...userPayload,
        requirePasswordChange: requirePasswordChange,
        requireEmailVerification: requireEmailVerification
      };
      if (customPassword) {
        userPayload.password = customPassword;
      }
    }

    if (editingUserId) {
      updateUser(editingUserId, userPayload);
      triggerToast("Usuario actualizado con éxito", "success");
      setIsUserModalOpen(false);
    } else {
      addUser(userPayload);
      triggerToast("Usuario añadido al sistema con éxito", "success");
      setGeneratedPassInfo({ email: userForm.email, pass: generatedPass || 'ihs123' });
    }
    
    setUserForm({ name: '', email: '', role: '', teamId: undefined, studentId: undefined, institutionId: undefined });
    setAutoGeneratePassword(true);
    setCustomPassword("");
    setRequirePasswordChange(true);
    setRequireEmailVerification(true);
    setEditingUserId(null);
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserForm({ 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      teamId: user.teamId ? Number(user.teamId) : undefined,
      studentId: user.studentId ? Number(user.studentId) : undefined, 
      institutionId: user.institutionId ? Number(user.institutionId) : undefined 
    });
    setCustomPassword("");
    setRequirePasswordChange(user.requirePasswordChange ?? false);
    setRequireEmailVerification(user.requireEmailVerification ?? false);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      deleteUser(id);
    }
  };

  const [roles, setRoles] = useState<Role[]>(() => {
    return systemRoles && systemRoles.length > 0 ? systemRoles : getSystemRoles();
  });

  useEffect(() => {
    if (systemRoles && systemRoles.length > 0) {
      setRoles(systemRoles);
    }
  }, [systemRoles]);

  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim() === '') return;
    
    const newRolePermissions = Object.fromEntries(menus.map(m => [m, { view: false, create: false, edit: false, delete: false }])) as Record<PermissionMenu, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;
    
    try {
      const createdRole = await addSystemRole({
        name: newRoleName.trim(),
        permissions: newRolePermissions
      });
      setSelectedRoleId(createdRole.id);
      setIsRoleModalOpen(false);
      setNewRoleName("");
      triggerToast(`¡El rol "${createdRole.name}" ha sido creado y sincronizado con Firestore en la nube!`);
    } catch (err) {
      console.error("Error creating role:", err);
      triggerToast("Error al crear el rol", "error");
    }
  };

  const handleSavePermissions = async () => {
    setIsSavingRoles(true);
    try {
      await updateSystemRoles(roles);
      triggerToast("¡Permisos guardados y sincronizados con la base de datos en la nube (Firestore)!");
    } catch (err) {
      console.error("Error saving roles to cloud:", err);
      triggerToast("Error al guardar permisos en la nube", "error");
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleRestoreDefaultRoles = async () => {
    if (confirm("¿Estás seguro de restaurar todos los roles y permisos a sus configuraciones estándar? Esto sincronizará los valores por defecto en la nube.")) {
      try {
        await restoreDefaultRoles();
        triggerToast("¡Roles restaurados a los valores estándar y guardados en la nube!");
      } catch (err) {
        console.error("Error restoring roles:", err);
        triggerToast("Error al restaurar roles", "error");
      }
    }
  };

  const [selectedRoleId, setSelectedRoleId] = useState('1');
  const selectedRoleData = roles.find(r => r.id === selectedRoleId) || roles[0];

  const togglePermission = (roleId: string, menu: string, perm: 'view' | 'create' | 'edit' | 'delete') => {
    setRoles(prev => prev.map(r => {
      if (r.id !== roleId) return r;
      const currentMenuPerms = r.permissions[menu as PermissionMenu] || { ...NO_PERMS };
      const newValue = !currentMenuPerms[perm];
      
      const newMenuPerms = { ...currentMenuPerms, [perm]: newValue };
      
      if (perm === 'view' && !newValue) {
        newMenuPerms.create = false;
        newMenuPerms.edit = false;
        newMenuPerms.delete = false;
      }

      return {
        ...r,
        permissions: {
          ...r.permissions,
          [menu]: newMenuPerms
        }
      };
    }));
  };

  const startImporting = async (type: string, headers: string[], rows: string[][]) => {
    const totalRecords = rows.length;
    setImportState({
      active: true,
      type,
      progress: 0,
      total: totalRecords,
      rowNumber: 0,
      success: 0,
      errorCount: 0,
      errors: [],
      results: []
    });

    let currentSuccess = 0;
    let currentErrorCount = 0;
    const collectedErrors: Array<{ rowNum: number; msg: string; data: string }> = [];
    const collectedResults: Array<{
      rowNum: number;
      status: 'success' | 'error';
      msg?: string;
      data: string;
      identifier?: string;
      details?: string;
    }> = [];

    // Process rows asynchronously with short yield so the UI is responsive
    for (let i = 0; i < rows.length; i++) {
      const data = rows[i];
      const rowNum = i + 2; // Human 1-indexed count representing sheet row (headers is row 1)

      // Visual delay to simulate/render the progress bar smoothly
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 10 : 30));

      try {
        switch (type) {
          case "Instituciones": {
            if (!data[0] || !data[0].trim()) {
              throw new Error("El 'Nombre Legal de la Institución' es un dato obligatorio.");
            }
            if (!data[6] || !data[6].trim()) {
              throw new Error("El 'País' es un dato obligatorio.");
            }
            
            // Resilient modality mapper mapping spreadsheet names like "Anual"/"Dual" into the correct application modality
            const rawModality = (data[14] || '').trim();
            let resolvedModality = rawModality;
            if (rawModality) {
              const cleanMod = rawModality.toLowerCase();
              // Look up first by exact or partial catalog match
              const match = catalogs['Modalidades']?.find((m: any) => 
                m.name.toLowerCase() === cleanMod || 
                cleanMod.includes(m.name.toLowerCase()) ||
                m.name.toLowerCase().includes(cleanMod)
              );
              if (match) {
                resolvedModality = match.name;
              } else {
                // Heuristic rules for common spreadsheet patterns
                if (cleanMod.includes('dual') || cleanMod.includes('anual') || cleanMod.includes('completo')) {
                  resolvedModality = 'Dual';
                } else if (cleanMod.includes('ap') || cleanMod.includes('apid')) {
                  resolvedModality = 'APID';
                } else if (cleanMod.includes('home') || cleanMod.includes('casa') || cleanMod.includes('indep')) {
                  resolvedModality = 'Homeschool';
                } else if (cleanMod.includes('trans') || cleanMod.includes('cred')) {
                  resolvedModality = 'Transfer';
                } else if (cleanMod.includes('complem') || cleanMod.includes('extra')) {
                  resolvedModality = 'Complementaria';
                } else if (catalogs['Modalidades'] && catalogs['Modalidades'].length > 0) {
                  resolvedModality = catalogs['Modalidades'][0].name;
                }
              }
            } else if (catalogs['Modalidades'] && catalogs['Modalidades'].length > 0) {
              resolvedModality = catalogs['Modalidades'][0].name;
            }

            // Resilient country tariffs mapping resolving "Tarifa-MX-01" or country name synonyms to official catalog country-tariff IDs in active memory
            const rawTarifas = (data[15] || '').trim();
            let resolvedTarifasId = undefined;
            if (rawTarifas) {
              const cleanTar = rawTarifas.toLowerCase();
              // Try to find if user provided an ID that matches
              let found = catalogs['Tarifas Países']?.find((tp: any) => 
                tp.id.toString() === cleanTar || 
                tp.id.toString().toLowerCase() === cleanTar
              );
              
              if (!found) {
                // Try to find if user provided a Name or part of a Country name
                found = catalogs['Tarifas Países']?.find((tp: any) => 
                  tp.name.toLowerCase() === cleanTar || 
                  cleanTar.includes(tp.name.toLowerCase()) ||
                  tp.name.toLowerCase().includes(cleanTar)
                );
              }

              if (!found) {
                // Heuristics for common country synonyms or tariff codes
                if (cleanTar.includes('mex') || cleanTar.includes('mx') || cleanTar.includes('méx') || cleanTar.includes('tarifa-mx')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'méxico');
                } else if (cleanTar.includes('lat') || cleanTar.includes('america') || cleanTar.includes('américa')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'latam');
                } else if (cleanTar.includes('colombia a') || cleanTar.includes('colombia_a')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'colombia a');
                } else if (cleanTar.includes('colombia b') || cleanTar.includes('colombia_b')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'colombia b');
                } else if (cleanTar.includes('colombia')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase().includes('colombia'));
                } else if (cleanTar.includes('china')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'china');
                } else if (cleanTar.includes('home') || cleanTar.includes('house') || cleanTar.includes('hs')) {
                  found = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'homeschool');
                }
              }

              resolvedTarifasId = found ? found.id : catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'méxico')?.id || catalogs['Tarifas Países']?.[0]?.id;
            } else {
              // Try matching country name column first
              const rawCountry = (data[6] || '').trim().toLowerCase();
              let matchedCountryTar = catalogs['Tarifas Países']?.find((tp: any) => 
                tp.name.toLowerCase() === rawCountry || 
                rawCountry.includes(tp.name.toLowerCase()) ||
                tp.name.toLowerCase().includes(rawCountry)
              );
              if (!matchedCountryTar && (rawCountry.includes('mex') || rawCountry.includes('mx') || rawCountry.includes('méx'))) {
                matchedCountryTar = catalogs['Tarifas Países']?.find((tp: any) => tp.name.toLowerCase() === 'méxico');
              }
              resolvedTarifasId = matchedCountryTar ? matchedCountryTar.id : catalogs['Tarifas Países']?.[0]?.id || '1';
            }

            // Resilient mapping for Tipo de Institución
            const rawInstType = (data[13] || '').trim();
            let resolvedInstitutionTypeId = undefined;
            if (rawInstType) {
              const cleanType = rawInstType.toLowerCase();
              const foundType = catalogs['Tipos de Institución']?.find((ti: any) => 
                ti.id.toString() === cleanType || 
                ti.name.toLowerCase() === cleanType ||
                cleanType.includes(ti.name.toLowerCase()) ||
                ti.name.toLowerCase().includes(cleanType)
              );
              if (foundType) {
                resolvedInstitutionTypeId = foundType.id;
              } else {
                if (cleanType.includes('col') || cleanType.includes('internacional') || cleanType.includes('priv') || cleanType.includes('pub')) {
                  resolvedInstitutionTypeId = '1';
                } else if (cleanType.includes('home') || cleanType.includes('casa')) {
                  resolvedInstitutionTypeId = '2';
                } else {
                  resolvedInstitutionTypeId = catalogs['Tipos de Institución']?.[0]?.id || '1';
                }
              }
            } else {
              resolvedInstitutionTypeId = catalogs['Tipos de Institución']?.[0]?.id || '1';
            }

            // Resilient mapping for Proveedor Principal (matching by ID or Name substrings)
            const rawProvider = (data[16] || '').trim();
            let resolvedProviderId = undefined;
            if (rawProvider) {
              const numericProvId = Number(rawProvider);
              const matchedProvider = providers.find(p =>
                (!isNaN(numericProvId) && p.id === numericProvId) ||
                (p.commercialName && p.commercialName.toLowerCase() === rawProvider.toLowerCase()) ||
                (p.legalName && p.legalName.toLowerCase() === rawProvider.toLowerCase()) ||
                (p.commercialName && p.commercialName.toLowerCase().includes(rawProvider.toLowerCase())) ||
                (p.legalName && p.legalName.toLowerCase().includes(rawProvider.toLowerCase()))
              );
              if (matchedProvider) {
                resolvedProviderId = matchedProvider.id;
              } else if (!isNaN(numericProvId) && numericProvId > 0) {
                resolvedProviderId = numericProvId;
              }
            }

            // Resilient mapping for Membresías (matching ID, Name, or Synonyms)
            const rawMembership = (data[17] || '').trim();
            let resolvedMembershipId = 'memb_4';
            if (rawMembership) {
              const cleanMemb = rawMembership.toLowerCase();
              const foundMemb = catalogs['Membresías']?.find((m: any) => 
                m.id.toString() === cleanMemb || 
                m.name.toLowerCase() === cleanMemb ||
                cleanMemb.includes(m.name.toLowerCase()) ||
                m.name.toLowerCase().includes(cleanMemb)
              );
              if (foundMemb) {
                resolvedMembershipId = foundMemb.id;
              } else {
                if (cleanMemb.includes('2000') || cleanMemb.includes('prem') || cleanMemb.includes('plat') || cleanMemb.includes('high')) {
                  resolvedMembershipId = 'memb_1';
                } else if (cleanMemb.includes('1000') || cleanMemb.includes('gold') || cleanMemb.includes('oro') || cleanMemb.includes('mid')) {
                  resolvedMembershipId = 'memb_2';
                } else if (cleanMemb.includes('500') || cleanMemb.includes('silv') || cleanMemb.includes('plata') || cleanMemb.includes('bas')) {
                  resolvedMembershipId = 'memb_3';
                } else if (cleanMemb.includes('sin') || cleanMemb.includes('no') || cleanMemb.includes('ning') || cleanMemb.includes('free')) {
                  resolvedMembershipId = 'memb_4';
                } else {
                  resolvedMembershipId = catalogs['Membresías']?.[0]?.id || 'memb_4';
                }
              }
            }

            // Resilient mapping for Método de Pago
            const rawPaymentMethod = (data[20] || '').trim();
            let resolvedPaymentMethod = undefined;
            if (rawPaymentMethod) {
              const cleanPay = rawPaymentMethod.toLowerCase();
              const foundPay = catalogs['Métodos de Pago']?.find((mp: any) => 
                mp.id.toLowerCase() === cleanPay || 
                mp.name.toLowerCase() === cleanPay ||
                cleanPay.includes(mp.name.toLowerCase()) ||
                mp.name.toLowerCase().includes(cleanPay)
              );
              if (foundPay) {
                resolvedPaymentMethod = foundPay.name;
              } else {
                if (cleanPay.includes('trans') || cleanPay.includes('banc') || cleanPay.includes('wire') || cleanPay.includes('depo')) {
                  resolvedPaymentMethod = 'Transferencia';
                } else if (cleanPay.includes('tarj') || cleanPay.includes('cred') || cleanPay.includes('card') || cleanPay.includes('deb')) {
                  resolvedPaymentMethod = 'Tarjeta de Crédito';
                } else if (cleanPay.includes('efect') || cleanPay.includes('cash')) {
                  resolvedPaymentMethod = 'Efectivo';
                } else {
                  resolvedPaymentMethod = rawPaymentMethod;
                }
              }
            } else {
              resolvedPaymentMethod = 'Transferencia';
            }
            
            addInstitution({
              name: data[0] || '',
              tradeName: data[1] || undefined,
              address: data[2] || undefined,
              city: data[3] || undefined,
              state: data[4] || undefined,
              zipCode: data[5] || undefined,
              country: data[6] || '',
              colombiaCalendar: (data[6] || '').toLowerCase().includes('colombia')
                ? (data[23] && (data[23].includes('B') || data[23].toLowerCase().includes('calendario b')) ? 'Calendario B' : data[23] ? 'Calendario A' : undefined)
                : undefined,
              phone: data[7] || undefined,
              email: data[8] || undefined,
              contact: data[9] || '',
              contactPosition: data[10] || undefined,
              contactEmail: data[11] || undefined,
              contactPhone: data[12] || undefined,
              institutionTypeId: resolvedInstitutionTypeId,
              modality: resolvedModality,
              tarifasId: resolvedTarifasId,
              mainProviderId: resolvedProviderId,
              membershipId: resolvedMembershipId,
              membershipExpiration: data[18] || undefined,
              payWithIva: data[19] ? ['si', 'sì', 'yes', 'true', '1'].includes(data[19].toLowerCase().trim()) : false,
              paymentMethod: resolvedPaymentMethod,
              paymentAccount: data[21] || undefined,
              priceObservations: data[22] || undefined,
              status: 'Al corriente',
              students: 0
            });
            break;
          }
          case "Alumnos": {
            if (!data[0] || !data[0].trim()) {
              throw new Error("El 'Nombre' del alumno es un dato obligatorio.");
            }
            if (!data[1] || !data[1].trim()) {
              throw new Error("El 'Apellido' del alumno es un dato obligatorio.");
            }
            // En la importación de alumnos, el email no es necesario (se puede omitir u obviar validación estricta)
            let emailValue = (data[4] || '').trim();
            if (emailValue && !emailValue.includes('@')) {
              emailValue = '';
            }

            const instNameValue = (data[19] || '').trim();
            if (!instNameValue) {
              throw new Error("El campo 'Nombre de Institución' es obligatorio (columna 20).");
            }

            // Find institution by name (commercialName, legalName, or general name)
            const matchedInst = institutions.find(inst => 
              (inst.name && inst.name.toLowerCase() === instNameValue.toLowerCase()) ||
              (inst.commercialName && inst.commercialName.toLowerCase() === instNameValue.toLowerCase()) ||
              (inst.legalName && inst.legalName.toLowerCase() === instNameValue.toLowerCase())
            );

            let instId: number;
            if (matchedInst) {
              instId = matchedInst.id;
            } else {
              // Safe fallback for numeric IDs if old sheets are used
              const numericId = Number(instNameValue);
              const matchedById = !isNaN(numericId) && institutions.find(inst => inst.id === numericId);
              if (matchedById) {
                instId = matchedById.id;
              } else {
                throw new Error(
                  `No se encontró ninguna institución registrada con el nombre o ID '${instNameValue}'. Asegúrate de registrar la institución primero.`
                );
              }
            }

            addStudent({
              name: data[0] || '',
              lastName: data[1] || '',
              preferredName: data[2] || undefined,
              gender: data[3] || undefined,
              email: emailValue,
              phone: data[5] || undefined,
              birthDate: data[6] || undefined,
              nationality: data[7] || undefined,
              passport: data[8] || undefined,
              address: data[9] || undefined,
              city: data[10] || undefined,
              state: data[11] || undefined,
              zipCode: data[12] || undefined,
              country: data[13] || undefined,
              parentName: data[14] || undefined,
              parentLastName: data[15] || undefined,
              parentEmail: data[16] || undefined,
              parentPhone: data[17] || undefined,
              parentRelation: data[18] || undefined,
              institutionId: instId,
              status: (data[20] || 'Activo') as any,
              studentCustomId: data[21] || undefined,
              modality: data[22] || undefined,
              schoolYear: data[23] || undefined
            });
            break;
          }
          case "Clases": {
            if (!data[0] || !data[0].trim()) {
              throw new Error("El 'Nombre de la Clase' es obligatorio.");
            }
            addClass({
              name: data[0] || 'Clase',
              code: data[1] || '',
              creditType: (data[2] ? (data[2].includes('Medio') || data[2].includes('Half') ? (data[2].includes('AP') ? 'Half Credit AP' : 'Half Credit') : (data[2].includes('AP') ? 'Full Credit AP' : 'Full Credit')) : 'Full Credit') as any,
              syllabus: data[3] || '',
              validity: data[4] || '',
              providerId: data[5] ? Number(data[5]) : undefined
            });
            break;
          }
          case "Inscripciones": {
            const studentInfo = (data[0] || '').trim();
            if (!studentInfo) {
              throw new Error("El campo 'Alumno_ID_o_Email' (columna 1) es obligatorio.");
            }

            const numericStudentId = Number(studentInfo);
            const matchedStudent = students.find(s => 
              (!isNaN(numericStudentId) && s.id === numericStudentId) ||
              (s.email && s.email.toLowerCase() === studentInfo.toLowerCase()) ||
              (s.studentCustomId && s.studentCustomId.toLowerCase() === studentInfo.toLowerCase()) ||
              (`${s.name} ${s.lastName || ''}`.trim().toLowerCase() === studentInfo.toLowerCase()) ||
              (s.name && s.name.toLowerCase() === studentInfo.toLowerCase())
            );

            if (!matchedStudent) {
              throw new Error(`No se encontró ningún alumno con 'ID, Email, o Nombre' igual a '${studentInfo}'.`);
            }

            const classInfo = (data[2] || '').trim();
            if (!classInfo) {
              throw new Error("El campo 'Clave_o_Nombre_Clase' (columna 3) es obligatorio.");
            }

            const numericClassId = Number(classInfo);
            const matchedClass = classes.find(c =>
              (!isNaN(numericClassId) && c.id === numericClassId) ||
              (c.code && c.code.toLowerCase() === classInfo.toLowerCase()) ||
              (c.name && c.name.toLowerCase() === classInfo.toLowerCase())
            );

            if (!matchedClass) {
              throw new Error(`No se encontró ninguna clase con 'ID, Clave, o Nombre' igual a '${classInfo}'.`);
            }

            let pId = matchedClass.providerId;
            if (data[10] && data[10].trim()) {
              const provVal = data[10].trim();
              const numericProvId = Number(provVal);
              const matchedProvider = providers.find(p =>
                (!isNaN(numericProvId) && p.id === numericProvId) ||
                (p.commercialName && p.commercialName.toLowerCase() === provVal.toLowerCase()) ||
                (p.legalName && p.legalName.toLowerCase() === provVal.toLowerCase())
              );
              if (matchedProvider) {
                pId = matchedProvider.id;
              } else if (!isNaN(numericProvId)) {
                pId = numericProvId;
              }
            }
            let priceVal = 0;

            if (data[8] && !isNaN(Number(data[8]))) {
              priceVal = Number(data[8]);
            } else {
              // Try to resolve credit prices
              const inst = matchedStudent.institutionId ? institutions.find(i => i.id === matchedStudent.institutionId) : null;
              const resolvedPrices = resolveCreditPrices(
                inst?.tarifasId,
                catalogs,
                pId ? Number(pId) : undefined,
                providerProductServices
              );

              let priceStr = "";
              const cType = matchedClass.creditType;
              if (cType === "Half Credit" || cType === "Medio Crédito") {
                priceStr = resolvedPrices.priceHalfCredit;
              } else if (cType === "Full Credit AP" || cType === "Crédito completo AP") {
                priceStr = resolvedPrices.priceFullApCredit;
              } else if (cType === "Half Credit AP" || cType === "Medio Crédito AP") {
                priceStr = resolvedPrices.priceHalfApCredit;
              } else {
                priceStr = resolvedPrices.priceFullCredit;
              }

              let resolvedPriceNum = NaN;
              if (priceStr) {
                const cleaned = priceStr.replace(/[^0-9.-]+/g, "");
                resolvedPriceNum = parseFloat(cleaned);
              }

              if (!isNaN(resolvedPriceNum)) {
                priceVal = resolvedPriceNum;
              } else {
                // Fallback to student country / institution country custom rates
                const studentCountry = inst?.country?.trim() || matchedStudent?.country?.trim();
                let rateForCountry = null;
                if (studentCountry && (matchedClass as any).countryRates) {
                  rateForCountry = (matchedClass as any).countryRates[studentCountry];
                  if (!rateForCountry) {
                    const matchKey = Object.keys((matchedClass as any).countryRates || {}).find(
                      (k) => k.toLowerCase() === studentCountry.toLowerCase()
                    );
                    if (matchKey) {
                      rateForCountry = (matchedClass as any).countryRates[matchKey];
                    }
                  }
                }

                if (rateForCountry && rateForCountry.price) {
                  priceVal = parseFloat(rateForCountry.price.replace(/[^0-9.-]+/g, "") || "0");
                } else {
                  priceVal = parseFloat((matchedClass.price || "0").replace(/[^0-9.-]+/g, "") || "0");
                }
              }
            }

            addEnrollment({
              studentId: matchedStudent.id,
              classId: matchedClass.id,
              providerId: pId,
              enrollmentDate: data[4] || new Date().toISOString().split('T')[0],
              activationDate: data[5] || new Date().toISOString().split('T')[0],
              startDate: data[5] || new Date().toISOString().split('T')[0],
              endDate: data[6] || '',
              status: (data[7] || 'Active') as any,
              price: priceVal,
              notes: data[9] || undefined
            });

            addActivity({
              institutionId: matchedStudent.institutionId || 1,
              studentId: matchedStudent.id,
              date: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
              description: `Historial Académico: Inscripción importada masivamente para la clase "${matchedClass.name}".`,
            });
            break;
          }
          case "Pagos": {
            const targetValue = (data[0] || '').trim();
            if (!targetValue) {
              throw new Error("El campo 'Instituto/Alumno' es obligatorio.");
            }

            let matchedStudent = null;
            let matchedInstitution = null;

            // Search in students
            const numericStudentId = Number(targetValue);
            matchedStudent = students.find(s => 
              (!isNaN(numericStudentId) && s.id === numericStudentId) ||
              (s.email && s.email.toLowerCase() === targetValue.toLowerCase()) ||
              (s.studentCustomId && s.studentCustomId.toLowerCase() === targetValue.toLowerCase()) ||
              (`${s.name} ${s.lastName || ''}`.trim().toLowerCase() === targetValue.toLowerCase()) ||
              (s.name && s.name.toLowerCase() === targetValue.toLowerCase())
            );

            if (matchedStudent) {
              // Found student, resolve institution from student
              if (matchedStudent.institutionId) {
                matchedInstitution = institutions.find(i => i.id === Number(matchedStudent.institutionId));
              }
            } else {
              // Try to search directly on institutions
              const numericInstId = Number(targetValue);
              matchedInstitution = institutions.find(inst => 
                (!isNaN(numericInstId) && inst.id === numericInstId) ||
                (inst.name && inst.name.toLowerCase() === targetValue.toLowerCase()) ||
                (inst.commercialName && inst.commercialName.toLowerCase() === targetValue.toLowerCase()) ||
                (inst.legalName && inst.legalName.toLowerCase() === targetValue.toLowerCase())
              );
            }

            if (!matchedStudent && !matchedInstitution) {
              throw new Error(`No se encontró ningún Alumno ni Institución con la identificación '${targetValue}'.`);
            }

            // Resilient Category Mapping
            const catInput = (data[1] || '').trim();
            let categoryId = 'cat_ingreso_servicios'; // Standard default income category

            if (catInput) {
              const cleanCat = catInput.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Accent-insensitive

              const matchedCat = catalogs['Categorías']?.find(c => {
                const cleanId = c.id.toLowerCase();
                const cleanName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return cleanId === cleanCat || 
                       cleanName === cleanCat || 
                       cleanCat.includes(cleanName) || 
                       cleanName.includes(cleanCat);
              });

              if (matchedCat) {
                categoryId = matchedCat.id;
              } else {
                // Heuristics for standard names if not matched directly
                if (cleanCat.includes('ingreso') || cleanCat.includes('servicio') || cleanCat.includes('coleg') || cleanCat.includes('inscrip')) {
                  categoryId = 'cat_ingreso_servicios';
                } else if (cleanCat.includes('socio') || cleanCat.includes('aport')) {
                  categoryId = 'cat_aportacion_socios';
                } else if (cleanCat.includes('operat') || cleanCat.includes('gasto op')) {
                  categoryId = 'cat_gastos_operativos';
                } else if (cleanCat.includes('admin') || cleanCat.includes('gasto ad')) {
                  categoryId = 'cat_gastos_administrativos';
                } else if (cleanCat.includes('vent')) {
                  categoryId = 'cat_gastos_venta';
                } else if (cleanCat.includes('sueld') || cleanCat.includes('salar') || cleanCat.includes('nomin')) {
                  categoryId = 'cat_sueldos_salarios';
                } else if (cleanCat.includes('impuest') || cleanCat.includes('sat') || cleanCat.includes('iva') || cleanCat.includes('isr')) {
                  categoryId = 'cat_impuestos';
                } else if (cleanCat.includes('banc')) {
                  categoryId = 'cat_bancos';
                } else if (cleanCat.includes('activ')) {
                  categoryId = 'cat_activos';
                } else if (cleanCat.includes('reembols')) {
                  categoryId = 'cat_reembolso';
                } else {
                  categoryId = catInput;
                }
              }
            }

            // Resilient Subcategory Mapping
            const subInput = (data[2] || '').trim();
            let subcategory = 'sub_cursos_ingreso';

            if (subInput) {
              const cleanSub = subInput.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

              // First try under the resolved categoryId
              let matchedSub = catalogs['Subcategorías']?.find(s => {
                const cleanId = s.id.toLowerCase();
                const cleanName = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return s.parentId === categoryId && (
                  cleanId === cleanSub || 
                  cleanName === cleanSub ||
                  cleanSub.includes(cleanName) || 
                  cleanName.includes(cleanSub)
                );
              });

              // Fallback to match globally
              if (!matchedSub) {
                matchedSub = catalogs['Subcategorías']?.find(s => {
                  const cleanId = s.id.toLowerCase();
                  const cleanName = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  return cleanId === cleanSub || 
                         cleanName === cleanSub ||
                         cleanSub.includes(cleanName) || 
                         cleanName.includes(cleanSub);
                });
              }

              if (matchedSub) {
                subcategory = matchedSub.id;
              } else {
                // Heuristics for standard subcategories
                if (cleanSub.includes('curs') || cleanSub.includes('clase') || cleanSub.includes('tall')) {
                  subcategory = categoryId === 'cat_pago_servicios' ? 'sub_cursos_pago' : 'sub_cursos_ingreso';
                } else if (cleanSub.includes('membres')) {
                  subcategory = 'sub_membresia';
                } else if (cleanSub.includes('agua')) {
                  subcategory = 'sub_agua';
                } else if (cleanSub.includes('internet') || cleanSub.includes('tel') || cleanSub.includes('wifi')) {
                  subcategory = 'sub_internet_tel';
                } else if (cleanSub.includes('renta') || cleanSub.includes('alquil')) {
                  subcategory = 'sub_renta';
                } else if (cleanSub.includes('comision') || cleanSub.includes('vend')) {
                  subcategory = 'sub_comisiones_vend';
                } else if (cleanSub.includes('sueld') || cleanSub.includes('nomin')) {
                  subcategory = 'sub_sueldo';
                } else if (cleanSub.includes('reembols')) {
                  subcategory = 'sub_reembolso';
                } else {
                  subcategory = subInput;
                }
              }
            }

            const paymentMethod = (data[3] || 'Transferencia').trim();

            const accountInput = (data[4] || '').trim();
            let bankAccountId: string | number = '';
            if (accountInput) {
              const numericAccId = Number(accountInput);
              const matchedAcc = bankAccounts?.find(b => 
                (!isNaN(numericAccId) && b.id === numericAccId) ||
                (b.bankName && b.bankName.toLowerCase().includes(accountInput.toLowerCase())) ||
                (b.accountName && b.accountName.toLowerCase().includes(accountInput.toLowerCase())) ||
                (b.accountNumber && b.accountNumber.includes(accountInput))
              );
              if (matchedAcc) {
                bankAccountId = matchedAcc.id;
              } else {
                bankAccountId = accountInput;
              }
            }

            const description = (data[5] || 'Pago Importado').trim();
            
            // Resilient Date parsing (handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.)
            const rawDate = (data[6] || '').trim();
            let date = new Date().toISOString().split('T')[0];
            if (rawDate) {
              const matchedSlash = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
              if (matchedSlash) {
                // We have DD/MM/YYYY or DD-MM-YYYY
                const [, day, month, year] = matchedSlash;
                date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else {
                const matchedIso = rawDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
                if (matchedIso) {
                  // We have YYYY-MM-DD
                  const [, year, month, day] = matchedIso;
                  date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                } else {
                  // Fallback to JS parsing
                  try {
                    const parsed = new Date(rawDate);
                    if (!isNaN(parsed.getTime())) {
                      date = parsed.toISOString().split('T')[0];
                    } else {
                      date = rawDate;
                    }
                  } catch (e) {
                    date = rawDate;
                  }
                }
              }
            }

            const taxId = (data[7] || '').trim();

            const amtRaw = (data[8] || '').trim().replace(/[^0-9.-]/g, '');
            const amt = parseFloat(amtRaw);
            if (isNaN(amt) || amt < 0) {
              throw new Error(`El Monto '${data[8]}' debe ser un número válido.`);
            }

            // Determine if the imported CSV template has the 'Moneda' column by examining headers
            const headerLower = Array.isArray(headers) ? headers.map(h => (h || '').toLowerCase().trim()) : [];
            const hasMonedaField = headerLower.some(h => h.includes('moneda'));

            const matchedAcc = bankAccounts?.find(b => b.id === Number(bankAccountId) || b.id.toString() === bankAccountId.toString());
            let transCurrency = 'MXN';
            let ivaRaw = '';
            let rateRaw = '';

            if (hasMonedaField) {
              const csvCurrency = (data[9] || '').trim().toUpperCase();
              transCurrency = csvCurrency || matchedAcc?.currency || 'MXN';
              ivaRaw = data[10] || '';
              rateRaw = data[11] || '';
            } else {
              // Old template format mapping
              transCurrency = matchedAcc?.currency || 'MXN';
              ivaRaw = data[9] || '';
              rateRaw = data[10] || '';
            }

            // Parse Estado column if present
            const estadoColIdx = headerLower.findIndex(h => h.includes('estado'));
            let statusVal: 'Pagado' | 'Pendiente' | 'Programado' | 'Aplicado' = 'Pagado';
            if (estadoColIdx !== -1 && data[estadoColIdx]) {
              const csvEstado = data[estadoColIdx].trim().toLowerCase();
              if (csvEstado.includes('pendiente')) {
                statusVal = 'Pendiente';
              } else if (csvEstado.includes('programado')) {
                statusVal = 'Programado';
              } else if (csvEstado.includes('pagado')) {
                statusVal = 'Pagado';
              } else if (csvEstado.includes('aplicado')) {
                statusVal = 'Aplicado';
              }
            }

            // IVA calculation
            const isIvaEnabled = matchedInstitution?.payWithIva === true;
            let ivaValue = undefined;
            if (ivaRaw && ivaRaw.trim() !== '') {
              const cleanedIva = ivaRaw.trim().replace(/[^0-9.-]/g, '');
              const parsedIva = parseFloat(cleanedIva);
              if (!isNaN(parsedIva)) {
                ivaValue = parsedIva;
              }
            }
            if (ivaValue === undefined && isIvaEnabled) {
              ivaValue = amt * 0.16;
            }

            let rate = 1.0;
            if (rateRaw && rateRaw.trim() !== '') {
              const cleanedRate = rateRaw.trim().replace(/[^0-9.-]/g, '');
              const parsedRate = parseFloat(cleanedRate);
              if (!isNaN(parsedRate) && parsedRate > 0) {
                rate = parsedRate;
              }
            } else {
              if (transCurrency === 'USD') {
                rate = 18.5;
              }
            }

            const totalWithIva = amt + (ivaValue || 0);

            let finAmt = transCurrency === 'MXN' ? (amt / rate) : amt;
            let amtMxn = transCurrency === 'MXN' ? amt : (amt * rate);

            if (transCurrency === 'MXN') {
              amtMxn = totalWithIva;
              finAmt = totalWithIva / rate;
            } else {
              amtMxn = totalWithIva * rate;
              finAmt = totalWithIva;
            }

            // 1. Add legacy/student Payment if we matched a student
            if (matchedStudent) {
              addPayment({
                studentId: matchedStudent.id,
                date: date,
                amount: amt,
                tax: ivaValue || 0,
                finalAmount: transCurrency === 'MXN' ? totalWithIva : amt,
                exchangeRate: rate,
                concept: description,
                reference: taxId || undefined,
                bankAccountId: bankAccountId
              });
            }

            // 2. Add Financial Transaction
            addFinancialTransaction({
              type: 'income',
              date: date,
              description: description,
              amount: transCurrency === 'MXN' ? totalWithIva : amt,
              currency: transCurrency as any,
              exchangeRate: rate,
              amountMXN: amtMxn,
              finalAmount: finAmt,
              status: statusVal,
              categoryId: categoryId,
              subcategory: subcategory,
              paymentMethod: paymentMethod,
              bankAccountId: bankAccountId,
              institutionId: matchedInstitution?.id,
              studentId: matchedStudent?.id,
              taxId: taxId,
              agentId: currentUser?.id,
              iva: ivaValue,
              originalAmount: amt,
              originalCurrency: (transCurrency || 'MXN') as any,
            } as any);

            break;
          }
          case "Proveedores": {
            if (!data[0] || !data[0].trim()) {
              throw new Error("El 'Nombre Comercial' del proveedor es obligatorio.");
            }
            addProvider({
              commercialName: data[0] || '',
              legalName: data[1] || '',
              rfc: data[2] || '',
              phone: data[3] || '',
              email: data[4] || '',
              category: data[5] || '',
              subcategory: data[6] || '',
              street: data[7] || '',
              neighborhood: data[8] || '',
              city: data[9] || '',
              state: data[10] || '',
              zipCode: data[11] || '',
              country: data[12] || 'México',
              status: (data[13] || 'Activo') as any
            });
            break;
          }
        }
        
        let identifier = "";
        let details = "";
        switch (type) {
          case "Instituciones": {
            identifier = (data[0] || '').trim();
            details = (data[2] || '').trim() ? `RFC: ${(data[2] || '').trim()}` : '';
            break;
          }
          case "Alumnos": {
            identifier = `${data[0] || ''} ${data[1] || ''}`.trim();
            details = (data[4] || '').trim() ? `Email: ${(data[4] || '').trim()}` : '';
            break;
          }
          case "Clases": {
            identifier = (data[0] || '').trim();
            details = (data[1] || '').trim() ? `Máx. Alumnos: ${(data[1] || '').trim()}` : '';
            break;
          }
          case "Inscripciones": {
            identifier = `Matrícula: ${data[0] || ''} ➔ ${data[1] || ''}`;
            details = (data[2] || '').trim() ? `Fecha: ${(data[2] || '').trim()}` : '';
            break;
          }
          case "Pagos": {
            identifier = (data[0] || '').trim();
            const amtStr = (data[8] || '').trim();
            const conceptStr = (data[5] || 'Pago').trim();
            details = `${conceptStr} - Monto: ${amtStr}`;
            break;
          }
          case "Proveedores": {
            identifier = (data[0] || '').trim();
            details = (data[2] || '').trim() ? `RFC: ${(data[2] || '').trim()}` : '';
            break;
          }
        }

        collectedResults.push({
          rowNum,
          status: 'success',
          data: data.slice(0, 5).join(', ') + (data.length > 5 ? "..." : ""),
          identifier,
          details
        });
        currentSuccess++;
      } catch (err: any) {
        currentErrorCount++;
        const errMsg = err?.message || "Error al parsear el registro.";
        collectedErrors.push({
          rowNum,
          msg: errMsg,
          data: data.length > 0 ? data.slice(0, 3).join(', ') + (data.length > 3 ? "..." : "") : "Fila vacía"
        });

        let identifier = (data[0] || 'Fila Vacía/Inválida').trim();
        let details = "";
        if (type === "Pagos") {
          const amtStr = (data[8] || '').trim();
          const conceptStr = (data[5] || '').trim();
          details = conceptStr || amtStr ? `${conceptStr} - Monto: ${amtStr}` : "Datos de pago incompletos";
        } else if (type === "Alumnos") {
          identifier = `${data[0] || ''} ${data[1] || ''}`.trim() || 'Fila de Alumno Inválida';
        }

        collectedResults.push({
          rowNum,
          status: 'error',
          msg: errMsg,
          data: data.length > 0 ? data.slice(0, 5).join(', ') + (data.length > 5 ? "..." : "") : "Fila vacía",
          identifier,
          details
        });
      }

      setImportState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progress: Math.round(((i + 1) / totalRecords) * 100), // scaling beautifully
          rowNumber: i + 1,
          success: currentSuccess,
          errorCount: currentErrorCount,
          errors: [...collectedErrors],
          results: [...collectedResults]
        };
      });
    }

    setImportState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        progress: 100
      };
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processText = (text: string) => {
      // Split by newline while pruning trailing carriage returns safely
      const rawRows = text.split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);
      if (rawRows.length === 0) {
        alert("El archivo no contiene suficientes registros para importar.");
        return;
      }

      // Dynamically detect delimiter based on first line character frequency
      const firstLine = rawRows[0];
      let delimiter = ",";
      const numTabs = (firstLine.match(/\t/g) || []).length;
      const numSemicolons = (firstLine.match(/;/g) || []).length;
      const numCommas = (firstLine.match(/,/g) || []).length;

      if (numTabs > numSemicolons && numTabs > numCommas) {
        delimiter = "\t";
      } else if (numSemicolons > numCommas && numSemicolons > numTabs) {
        delimiter = ";";
      }

      // Helper to parse line according to delimiter while respecting quotes
      const splitRow = (line: string, delim: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delim && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(cell => cell.replace(/^"|"$/g, "").trim());
      };

      const rows = rawRows
        .map(row => splitRow(row, delimiter))
        .filter(row => row.length > 0 && row.some(cell => cell !== ""));

      if (rows.length <= 1) {
        alert("El archivo no contiene suficientes registros para importar.");
        return;
      }

      setPreviewState({
        type,
        headers: rows[0],
        rows: rows.slice(1)
      });
    };

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Detect if text contains replacement characters \uFFFD (telltale sign of ISO-8859-1 decoded prematurely as UTF-8)
      if (text.includes('\uFFFD')) {
        const reReader = new FileReader();
        reReader.onload = (reEvent) => {
          const latinText = reEvent.target?.result as string;
          if (latinText) {
            processText(latinText);
          }
        };
        reReader.readAsText(file, "ISO-8859-1");
        return;
      }

      processText(text);
    };

    // Attempt reading via UTF-8 first
    reader.readAsText(file, "UTF-8");
    e.target.value = ""; // Reset
  };

  const downloadTemplate = (type: string) => {
    let headers = "";
    let filename = "";

    switch(type) {
      case "Instituciones":
        headers = "Nombre Legal de la Institución,Nombre Comercial,Dirección,Ciudad,Estado,Código Postal,País,Teléfono Institucional,Correo electrónico General,Nombre Contacto Principal,Puesto Contacto Principal,Correo Contacto Principal,Teléfono Contacto Principal,Tipo de Institución,Modalidad,Tarifas,Proveedor Principal,Membresía,Vigencia (Expiración),Pago con IVA,Método de Pago,Cuenta Pago,Observaciones comerciales\nColegio San Patricio S.C.,San Patricio,Av. de las Ciencias 150,San Pedro Garza García,Nuevo León,66220,México,+52 81 1234 5678,administracion@sanpatricio.edu.mx,Sofía Garza,Directora General,sgarza@sanpatricio.edu.mx,+52 81 8765 4321,Privado,Anual,Tarifa-MX-01,1,Premium,2027-12-31,Si,Transferencia,BANCOMER 5432,Descuento por volumen";
        filename = "plantilla_instituciones.csv";
        break;
      case "Alumnos":
        headers = "Nombre,Apellidos,NombrePreferido,Género,Email,Teléfono,FechaNacimiento(YYYY-MM-DD),Nacionalidad,Pasaporte,Dirección,Ciudad,Estado,CódigoPostal,País,NombrePadre,ApellidoPadre,EmailPadre,TeléfonoPadre,Parentesco,Nombre_Institución,Estatus,ID_Personalizado,Modalidad(Anual/Semestral),AñoEscolar\nJuan,Pérez,Juanito,Masculino,juan@example.com,5555555,2008-05-15,Mexicana,A1234567,Av Siempre Viva,CDMX,CDMX,01000,México,Pedro,Pérez,pedro@example.com,5554444,Padre,Colegio San Patricio S.C.,Activo,ALUM-001,Anual,10º Grado";
        filename = "plantilla_alumnos.csv";
        break;
      case "Clases":
        headers = "Nombre Clase,Clave,Tipo de Crédito,SyllabusURL,Vigencia,ProveedorID(Número)\nÁlgebra I,ALG101,Full Credit,https://ejemplo.com/syllabus.pdf,2026,1";
        filename = "plantilla_clases.csv";
        break;
      case "Inscripciones":
        headers = "Alumno_ID_o_Email,Nombre_Alumno,Clave_o_Nombre_Clase,Nombre_Clase,Fecha_Inscripción(YYYY-MM-DD),Fecha_Activación(YYYY-MM-DD),Fecha_Fin(YYYY-MM-DD),Estatus(Active/Completed/On hold/Withdrawn),Precio_Pactado,Notas,Proveedor\njuan@example.com,Juan Pérez,ALG101,Álgebra I,2026-05-01,2026-05-15,2027-05-15,Active,1500,Inscripción importada,1";
        filename = "plantilla_inscripciones.csv";
        break;
      case "Pagos":
        headers = "Instituto/Alumno,Categoria,Subcategoria,Metodo Pago,Cuenta Pago,CONCEPTO,FECHA DE PAGO,Folio,Monto,Moneda,IVA,Tipo Cambio,TOTAL MXN,Estado\nColegio San Patricio S.C.,cat_ingreso_servicios,sub_cursos_ingreso,Transferencia,BANCOMER 5432,Colegiatura Mayo 2026,2026-05-15,REF1002,1500,MXN,,18.5,27750,Pagado";
        filename = "plantilla_pagos.csv";
        break;
      case "Proveedores":
        headers = "Nombre Comercial,Razón Social Legal,RFC,Teléfono,Correo Electrónico,Categoría,Subcategoría,Calle y Número,Colonia,Ciudad,Estado,Código Postal,País,Estado(Status)\nTransportes ABC,Grupo Transportista ABC S.A.,SABC123456,555-0100,contacto@abc.com,Transporte,Autobuses,Calle 1,Centro,CDMX,CDMX,01000,México,Activo";
        filename = "plantilla_proveedores.csv";
        break;
    }

    if (headers) {
      const blob = new Blob(["\uFEFF"+headers], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-1 space-y-2 shrink-0">
          <button 
            onClick={() => setActiveTab("Empresa")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Empresa' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Building className={`h-4 w-4 mr-3 ${activeTab === 'Empresa' ? '' : 'opacity-70'}`} />
            Info Empresa
          </button>
          <button 
            onClick={() => setActiveTab("Documentos")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Documentos' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <FileText className={`h-4 w-4 mr-3 ${activeTab === 'Documentos' ? '' : 'opacity-70'}`} />
            Documentos
          </button>
          <button 
            onClick={() => setActiveTab("Usuarios")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Usuarios' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Users className={`h-4 w-4 mr-3 ${activeTab === 'Usuarios' ? '' : 'opacity-70'}`} />
            Usuarios del Sistema
          </button>
           <button 
            onClick={() => setActiveTab("Importacion")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Importacion' ? 'bg-indigo-50 border border-indigo-150 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <FileSpreadsheet className={`h-4 w-4 mr-3 ${activeTab === 'Importacion' ? '' : 'opacity-70'}`} />
            Plantillas Import/Export
          </button>
          <button 
            onClick={() => setActiveTab("Respaldos")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Respaldos' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Database className={`h-4 w-4 mr-3 ${activeTab === 'Respaldos' ? '' : 'opacity-70'}`} />
            Respaldos de Datos
          </button>
          <button 
            onClick={() => setActiveTab("MonitorBD")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'MonitorBD' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Database className={`h-4 w-4 mr-3 ${activeTab === 'MonitorBD' ? '' : 'opacity-70'}`} />
            Monitor Acceso BD
          </button>
          <button 
            onClick={() => setActiveTab("Roles")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Roles' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Shield className={`h-4 w-4 mr-3 ${activeTab === 'Roles' ? '' : 'opacity-70'}`} />
            Roles y Permisos
          </button>
          <button 
            onClick={() => setActiveTab("Preferencias")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Preferencias' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Settings className={`h-4 w-4 mr-3 ${activeTab === 'Preferencias' ? '' : 'opacity-70'}`} />
            Preferencias Generales
          </button>
          <button 
            onClick={() => setActiveTab("Notificaciones")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Notificaciones' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell className={`h-4 w-4 mr-3 ${activeTab === 'Notificaciones' ? '' : 'opacity-70'}`} />
            Notificaciones
          </button>
          <button 
            onClick={() => setActiveTab("SLA")}
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'SLA' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Clock className={`h-4 w-4 mr-3 ${activeTab === 'SLA' ? '' : 'opacity-70'}`} />
            Acuerdos SLA (CRM / Inst / Alum)
          </button>
        </div>
        
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          {activeTab === "Empresa" && (
            <div className="flex-1 overflow-auto bg-slate-50 relative p-6">
              <div className="max-w-3xl mx-auto pb-10">
                <form onSubmit={handleCompanySubmit} className="space-y-6">
                  {/* Logotipo de la Empresa */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Logotipo de la Empresa</h3>
                          <p className="text-xs text-slate-500">Se mostrará en la pantalla de inicio de sesión, reportes oficiales y navegación.</p>
                        </div>
                      </div>
                      {companyForm.logoUrl && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 mr-1 text-emerald-600" /> Logotipo Activo
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Logo Preview Container */}
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 min-h-[140px] text-center relative overflow-hidden group">
                        {companyForm.logoUrl ? (
                          <div className="relative w-full h-28 flex items-center justify-center">
                            <img
                              src={companyForm.logoUrl}
                              alt="Logotipo de la empresa"
                              className="max-h-24 max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 text-slate-400">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2 text-slate-400 border border-slate-200">
                              <Building className="w-6 h-6 opacity-60" />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">Sin logotipo cargado</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Se mostrará el ícono institucional</span>
                          </div>
                        )}
                      </div>

                      {/* Upload & Controls */}
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className={`cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition ${isUploadingLogo ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {isUploadingLogo ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Procesando imagen...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {companyForm.logoUrl ? 'Reemplazar Logotipo' : 'Subir Logotipo'}
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={handleLogoFileUpload}
                              disabled={isUploadingLogo}
                              className="hidden"
                            />
                          </label>

                          {companyForm.logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="inline-flex items-center px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Quitar Logo
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                            className="inline-flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                          >
                            <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                            {showLogoUrlInput ? 'Ocultar Enlace Web' : 'Enlazar por URL'}
                          </button>
                        </div>

                        {showLogoUrlInput && (
                          <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-200">
                            <input
                              type="url"
                              value={tempLogoUrl}
                              onChange={(e) => setTempLogoUrl(e.target.value)}
                              placeholder="https://ejemplo.com/logo.png"
                              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleApplyLogoUrl}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                            >
                              Aplicar
                            </button>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Formatos admitidos: <strong>PNG, JPG, WebP o SVG</strong> (máx. 5MB). Se optimiza automáticamente para mantener el rendimiento y la sincronización en tiempo real.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* General */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Información General</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre Comercial</label>
                        <input
                          type="text"
                          value={companyForm.commercialName}
                          onChange={(e) => setCompanyForm({ ...companyForm, commercialName: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nombre Legal</label>
                        <input
                          type="text"
                          value={companyForm.legalName}
                          onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">RFC / Tax ID</label>
                        <input
                          type="text"
                          value={companyForm.rfc}
                          onChange={(e) => setCompanyForm({ ...companyForm, rfc: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Moneda Base</label>
                        <select
                          value={companyForm.baseCurrency}
                          onChange={(e) => setCompanyForm({ ...companyForm, baseCurrency: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="MXN">MXN</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Zona Horaria</label>
                        <select
                          value={companyForm.timezone}
                          onChange={(e) => setCompanyForm({ ...companyForm, timezone: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="America/Mexico_City">America/Mexico_City</option>
                          <option value="America/Cancun">America/Cancun</option>
                          <option value="America/Tijuana">America/Tijuana</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Correo de Contacto</label>
                        <input
                          type="email"
                          value={companyForm.contactEmail}
                          onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Direccion */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Dirección Física</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Calle y Número</label>
                        <input
                          type="text"
                          value={companyForm.address.street}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, street: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Colonia</label>
                        <input
                          type="text"
                          value={companyForm.address.neighborhood}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, neighborhood: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ciudad</label>
                        <input
                          type="text"
                          value={companyForm.address.city}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, city: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado</label>
                        <input
                          type="text"
                          value={companyForm.address.state}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, state: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Código Postal</label>
                        <input
                          type="text"
                          value={companyForm.address.zipCode}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, zipCode: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">País</label>
                        <input
                          type="text"
                          value={companyForm.address.country}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, country: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Redes */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Redes Sociales y Web</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sitio Web</label>
                        <input
                          type="text"
                          value={companyForm.socialLinks.website}
                          onChange={(e) => setCompanyForm({ ...companyForm, socialLinks: { ...companyForm.socialLinks, website: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Instagram</label>
                        <input
                          type="text"
                          value={companyForm.socialLinks.instagram}
                          onChange={(e) => setCompanyForm({ ...companyForm, socialLinks: { ...companyForm.socialLinks, instagram: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Facebook</label>
                        <input
                          type="text"
                          value={companyForm.socialLinks.facebook}
                          onChange={(e) => setCompanyForm({ ...companyForm, socialLinks: { ...companyForm.socialLinks, facebook: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">LinkedIn</label>
                        <input
                          type="text"
                          value={companyForm.socialLinks.linkedin}
                          onChange={(e) => setCompanyForm({ ...companyForm, socialLinks: { ...companyForm.socialLinks, linkedin: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">TikTok</label>
                        <input
                          type="text"
                          value={companyForm.socialLinks.tiktok}
                          onChange={(e) => setCompanyForm({ ...companyForm, socialLinks: { ...companyForm.socialLinks, tiktok: e.target.value } })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition uppercase tracking-wider flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "Documentos" && (
            <>
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-sm">Documentos de la Empresa</h3>
                <button 
                  onClick={() => setDocModalOpen(true)}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                >
                  + Subir Documento
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 relative p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                  {companyDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No hay documentos registrados aún.</p>
                    </div>
                  ) : (
                    companyDocuments.map(doc => (
                      <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                            <div className="text-xs text-slate-500 mt-1 flex space-x-4">
                              <span>Fecha: {doc.date}</span>
                              <span>Vigencia: {doc.validity}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider font-medium">
                              Subido por {doc.uploadedBy} el {new Date(doc.uploadedAt).toLocaleDateString()}
                              {doc.updatedAt && ` (Modificado el ${new Date(doc.updatedAt).toLocaleDateString()})`}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 shrink-0">
                          {(doc.fileData || doc.url) && (
                            <button
                              onClick={() => setViewingCompanyDoc(doc)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Visualizar documento"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {doc.url && !doc.fileData && !doc.url.startsWith('data:') && (
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Descargar/Abrir enlace"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {doc.fileData && (
                            <button 
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.fileData!;
                                link.download = doc.fileName || doc.name + '.pdf';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Descargar archivo"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setDeleteConfirm({
                                title: "Eliminar Documento de Empresa",
                                message: `¿Estás seguro de que deseas eliminar permanentemente el archivo "${doc.fileName || doc.name}" de la empresa? Esta acción borrará de forma irreversible el registro del sistema y removerá el archivo de las bases de almacenamiento.`,
                                onConfirm: () => {
                                  if (doc.url && doc.url.startsWith('blob:')) {
                                    try {
                                      URL.revokeObjectURL(doc.url);
                                    } catch (e) {
                                      console.error("Error revoking object URL:", e);
                                    }
                                  }
                                  deleteCompanyDocument(doc.id);
                                  console.log(`Payload binario del documento de empresa ID ${doc.id} purgado de la base de almacenamiento.`);
                                }
                              });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "Usuarios" && (
            <>
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-sm">Usuarios Activos</h3>
                <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                >
                  + Añadir Usuario
                </button>
              </div>
              
              <div className="p-6 space-y-3 flex-1 overflow-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition bg-slate-50/50 group">
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{user.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {user.teamId && (() => {
                        const userTeam = teams.find(t => t.id === user.teamId);
                        return userTeam ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold tracking-wider uppercase border border-indigo-100 flex items-center gap-1">
                            👥 {userTeam.name}
                          </span>
                        ) : null;
                      })()}
                      <span className="px-2 py-0.5 bg-slate-200/50 text-slate-700 rounded text-[10px] font-bold tracking-widest uppercase border border-slate-200">
                        {user.role}
                      </span>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenWelcomeEmailModal(user)} 
                          className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Enviar correo de bienvenida con credenciales"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditUser(user)} className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "Importacion" && (
            <>
              <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex justify-between items-center bg-white flex-col sm:flex-row gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Plantillas, Importación y Exportación de Datos</h3>
                  <p className="text-xs text-slate-500 mt-1">Descarga plantillas CSV, importa registros o exporta listados del sistema a CSV/PDF para reportes externos.</p>
                </div>
                {importState && (
                  <button 
                    onClick={() => {
                      setImportState(null);
                      setImportFilter('all');
                      setImportSearch('');
                      setExpandedRawRows({});
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold transition-all"
                  >
                    Clear / Nueva Importación
                  </button>
                )}
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-auto bg-slate-50/50">
                {/* Visual Progress Bar & Error Counter Dashboard */}
                {importState && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-4xl mx-auto">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                          Importación Activa: {importState.type}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-2 flex items-center">
                          {importState.progress === 100 ? (
                            <span className="text-emerald-600 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" /> Importación Completada ✓
                            </span>
                          ) : (
                            <span className="text-indigo-600 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-ping" /> Procesando Registros en tiempo real... ({importState.rowNumber}/{importState.total})
                            </span>
                          )}
                        </h4>
                      </div>
                      <span className="font-mono text-2xl font-black text-indigo-600">
                        {Math.min(importState.progress, 100)}%
                      </span>
                    </div>

                    {/* Progress bar track */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${importState.progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                        style={{ width: `${Math.min(importState.progress, 100)}%` }}
                      ></div>
                    </div>

                    {/* Interactive counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Filas Detectadas</span>
                        <span className="text-xl font-mono font-black text-slate-700 mt-1">{importState.total}</span>
                      </div>
                      <div className="bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-150 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">Guardadas con Éxito</span>
                        <span className="text-xl font-mono font-black text-emerald-700 mt-1">{importState.success}</span>
                      </div>
                      <div className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${importState.errorCount > 0 ? 'bg-rose-50/30 border-rose-200' : 'bg-slate-50/50 border-slate-200'}`}>
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest ${importState.errorCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Errores Encontrados</span>
                        <span className={`text-xl font-mono font-black mt-1 ${importState.errorCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{importState.errorCount}</span>
                      </div>
                    </div>

                    {/* Detailed row-by-row results logger with filter tabs and search */}
                    {(() => {
                      const list = importState.results || [];
                      const filteredList = list.filter(item => {
                        // 1. Tab filter
                        if (importFilter === 'success' && item.status !== 'success') return false;
                        if (importFilter === 'error' && item.status !== 'error') return false;
                        
                        // 2. Search query filter
                        if (importSearch) {
                          const query = importSearch.toLowerCase();
                          const idText = (item.identifier || '').toLowerCase();
                          const detailText = (item.details || '').toLowerCase();
                          const rowText = `fila #${item.rowNum}`;
                          const rawData = (item.data || '').toLowerCase();
                          const errorText = (item.msg || '').toLowerCase();
                          
                          return idText.includes(query) || 
                                 detailText.includes(query) || 
                                 rowText.includes(query) || 
                                 rawData.includes(query) ||
                                 errorText.includes(query);
                        }
                        
                        return true;
                      });

                      const totalCount = list.length;
                      const successCount = list.filter(item => item.status === 'success').length;
                      const errorCount = list.filter(item => item.status === 'error').length;

                      return (
                        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden mt-5 shadow-sm animate-fadeIn">
                          {/* Section Header */}
                          <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                              <span className="text-xs font-bold text-slate-805 uppercase tracking-wider flex items-center gap-1.5">
                                <FileSpreadsheet className="w-4 h-4 text-indigo-550 shrink-0" />
                                Bitácora de Registro Fila por Fila
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Listado completo con estado e indicadores de guardado para la verificación de registros.
                              </p>
                            </div>
                            
                            {/* Stats mini badge */}
                            <div className="flex gap-1.5 self-stretch md:self-auto">
                              <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-full px-2.5 py-1">
                                Procesado: {importState.rowNumber} / {importState.total}
                              </span>
                            </div>
                          </div>

                          {/* Control Bar: Tabs & Search input */}
                          <div className="p-4 border-b border-slate-150 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white text-xs">
                            {/* Tabs selector */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                              <button
                                type="button"
                                onClick={() => setImportFilter('all')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                                  importFilter === 'all'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Todos
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${
                                  importFilter === 'all' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-505'
                                }`}>
                                  {totalCount}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setImportFilter('success')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                                  importFilter === 'success'
                                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Éxitos
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${
                                  importFilter === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-505'
                                }`}>
                                  {successCount}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setImportFilter('error')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer ${
                                  importFilter === 'error'
                                    ? 'bg-white text-rose-800 shadow-sm border border-rose-100'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Errores
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${
                                  importFilter === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-505'
                                }`}>
                                  {errorCount}
                                </span>
                              </button>
                            </div>

                            {/* Search bar */}
                            <div className="relative flex-1 md:max-w-xs">
                              <input
                                type="text"
                                value={importSearch}
                                onChange={(e) => setImportSearch(e.target.value)}
                                placeholder="Buscar concepto, error..."
                                className="w-full bg-slate-50 border border-slate-200 text-slate-750 py-1.5 pl-8 pr-3.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white placeholder-slate-400 transition-all shadow-inner"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                              {importSearch && (
                                <button
                                  onClick={() => setImportSearch('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>

                          {/* List of row results */}
                          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto font-sans bg-slate-55/15">
                            {filteredList.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2.5 text-slate-350 opacity-50 stroke-1" />
                                No se encontraron filas procesadas con estos filtros.
                              </div>
                            ) : (
                              filteredList.map((item) => {
                                const isSuccess = item.status === 'success';
                                const isExpanded = !!expandedRawRows[item.rowNum];
                                return (
                                  <div
                                    key={item.rowNum}
                                    className={`p-3 hover:bg-slate-50/60 transition-colors text-xs border-l-4 ${
                                      isSuccess ? 'border-l-emerald-500 bg-emerald-50/5' : 'border-l-rose-500 bg-rose-50/5'
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-slate-750 bg-slate-800 text-slate-100 text-[9px] px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                          Fila #{item.rowNum}
                                        </span>
                                        
                                        <div className="flex flex-col">
                                          <span className="text-slate-800 font-bold leading-none">
                                            {item.identifier || 'Datos del registro'}
                                          </span>
                                          {item.details && (
                                            <span className="text-[10px] mt-0.5 text-slate-500">
                                              {item.details}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                        {/* State badge */}
                                        {isSuccess ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle className="w-2.5 h-2.5 mr-1 text-emerald-555" /> Guardado ✓
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-rose-555" /> Falló ✗
                                          </span>
                                        )}

                                        {/* Toggle Original Raw CSV row details */}
                                        <button
                                          type="button"
                                          onClick={() => setExpandedRawRows(prev => ({ ...prev, [item.rowNum]: !isExpanded }))}
                                          className="text-[9px] text-indigo-650 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100/70 border border-indigo-150 rounded px-1.5 py-0.5 font-bold transition-all shrink-0 cursor-pointer"
                                        >
                                          {isExpanded ? "Ocultar CSV" : "Ver CSV"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Error Message if failed */}
                                    {!isSuccess && item.msg && (
                                      <div className="mt-2 bg-rose-50 border border-rose-150 text-rose-900 rounded-lg p-2.5 text-[11px] leading-relaxed">
                                        <strong className="font-bold text-rose-700 block mb-0.5 text-[9px] tracking-wider uppercase">Motivo del fallo:</strong>
                                        {item.msg}
                                      </div>
                                    )}

                                    {/* Collapsed view of raw cells */}
                                    {isExpanded && (
                                      <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-lg p-2.5 mt-2.5 font-mono text-[10px] overflow-x-auto whitespace-pre animate-fadeIn">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1 bg-slate-900">
                                          <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider">Celdas CSV Originales</span>
                                        </div>
                                        <span className="text-slate-333 text-[10px] leading-relaxed text-slate-300">{item.data}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          
                          {/* Footer help line */}
                          <div className="bg-slate-50/80 border-t border-slate-150 px-4 py-2 flex justify-between items-center text-[10px] text-slate-400">
                            <span>* El procesamiento asíncrono no detiene la navegación.</span>
                            {errorCount > 0 && (
                              <span className="text-rose-600 font-semibold">
                                Se detectaron errores corregibles en algunas filas.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="max-w-4xl mx-auto space-y-4">
                  {[
                    { title: "Instituciones", desc: "Plantilla para importar colegios y universidades" },
                    { title: "Alumnos", desc: "Plantilla para importar alumnos vinculados a instituciones" },
                    { title: "Clases", desc: "Plantilla para crear clases extraescolares y créditos" },
                    { title: "Inscripciones", desc: "Plantilla para inscribir alumnos a clases específicas de forma masiva" },
                    { title: "Pagos", desc: "Plantilla para cargar historial de pagos y cobros" },
                    { title: "Proveedores", desc: "Plantilla para importar proveedores de servicios" },
                  ].map((template) => (
                    <div key={template.title} className="flex justify-between items-center p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition bg-white group shadow-sm">
                      <div>
                        <p className="font-bold text-slate-900 text-xs flex items-center">
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-500 group-hover:scale-110 transition-transform" /> 
                          {template.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">{template.desc}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                         <button 
                           onClick={() => downloadTemplate(template.title)}
                           className="text-slate-600 hover:text-indigo-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg flex items-center text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-200"
                         >
                           <Download className="w-3.5 h-3.5 mr-1 text-slate-400 group-hover:text-indigo-550" />
                           Plantilla
                         </button>
                         <label className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex items-center text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm hover:shadow-md">
                           <Upload className="w-3.5 h-3.5 mr-1" />
                           Importar
                           <input type="file" className="hidden" accept=".csv" onChange={(e) => handleUpload(e, template.title)} />
                         </label>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Módulo de Extracción y Reportes Rápidos */}
                <div className="max-w-4xl mx-auto border-t border-slate-200/80 my-8 pt-8 space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                      <Download className="w-4 h-4 mr-2 text-indigo-600 animate-bounce" />
                      Módulo de Extracción y Reportes Rápidos
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Elige el listado del sistema que deseas consultar para generar un archivo descargable de inmediato.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { type: "Instituciones", desc: "Colegios, campus, convenios de membresía, fecha de registro y estatus actual.", count: institutions.length },
                      { type: "Alumnos", desc: "Matrícula total de alumnos con información de contacto, grupo de sangre y correos.", count: students.length },
                      { type: "Clases", desc: "Catálogo de talleres extraescolares, créditos académicos, profesores y precios asignados.", count: classes.length },
                      { type: "Proveedores", desc: "Pabellones, partners de servicios, datos de facturación e información fiscal.", count: providers.length },
                      { type: "Inscripciones", desc: "Registros históricos y activos de alumnos asignados a clases con sus tarifas pactadas.", count: enrollments?.length || 0 },
                      { type: "Transacciones", desc: "Libro mayor y reporte contable de ingresos, egresos y referencias de transacciones reales.", count: financialTransactions?.filter(t => !(typeof t.id === 'string' && t.id.startsWith('tx-init-'))).length || 0 },
                    ].map((item) => (
                      <div key={item.type} className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm hover:shadow hover:border-slate-350 transition flex flex-col justify-between space-y-3.5 group">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">{item.type}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-mono">
                              {item.count} {item.count === 1 ? 'registro' : 'registros'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleExportList(item.type, 'csv')}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold uppercase tracking-wider py-1.5 rounded-lg text-[9px] transition flex items-center justify-center cursor-pointer font-sans"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                            Exportar CSV
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleExportList(item.type, 'pdf')}
                            className="flex-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 font-bold uppercase tracking-wider py-1.5 rounded-lg text-[9px] transition flex items-center justify-center cursor-pointer font-sans"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-600 shrink-0" />
                            Generar PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {activeTab === "Roles" && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Roles y Permisos</h3>
                  <p className="text-xs text-slate-500 mt-1">Configura el acceso a los diferentes módulos del sistema.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRestoreDefaultRoles}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition border border-slate-200"
                  >
                    Restaurar por Defecto
                  </button>
                  <button 
                    onClick={() => setIsRoleModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                  >
                    + Nuevo Rol
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto flex flex-col md:flex-row">
                <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 p-4 shrink-0 overflow-y-auto">
                  <div className="flex justify-between items-center mb-3 px-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lista de Roles</h4>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      Cloud DB Sincronizado
                    </span>
                  </div>
                  <div className="space-y-1">
                    {roles.map(role => (
                      <div 
                        key={role.id}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${selectedRoleId === role.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <button 
                          onClick={() => setSelectedRoleId(role.id)}
                          className="flex-1 text-left"
                        >
                          {role.name}
                        </button>
                        {/* Allow deleting custom roles created beyond the default base roles */}
                        {!['1', '2', '3', '4', '5', '6'].includes(role.id) && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`¿Estás seguro de eliminar el rol personalizado "${role.name}"?`)) {
                                try {
                                  await deleteSystemRole(role.id);
                                  setSelectedRoleId('1');
                                  triggerToast(`Rol "${role.name}" eliminado de la base de datos`);
                                } catch (err) {
                                  triggerToast("Error al eliminar rol", "error");
                                }
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 transition"
                            title="Eliminar rol personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:w-2/3 p-4 sm:p-6 overflow-y-auto">
                  {selectedRoleData && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{selectedRoleData.name} - Permisos</h4>
                          <span className="text-[10px] text-slate-400">Los cambios se guardan globalmente para toda la empresa en Firestore</span>
                        </div>
                        <button 
                          onClick={handleSavePermissions}
                          disabled={isSavingRoles}
                          className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-wider px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSavingRoles ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Guardando en Nube...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Guardar Cambios
                            </>
                          )}
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500">Módulo</th>
                              <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 text-center">Ver</th>
                              <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 text-center">Crear</th>
                              <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 text-center">Editar</th>
                              <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 text-center">Borrar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {menus.map(menu => {
                              const perms = selectedRoleData.permissions[menu] || { view: false, create: false, edit: false, delete: false };
                              return (
                                <tr key={menu} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-800 text-xs">{menu}</td>
                                  <td className="px-4 py-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                      checked={perms.view}
                                      onChange={() => togglePermission(selectedRoleData.id, menu, 'view')}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                      checked={perms.create}
                                      disabled={!perms.view}
                                      onChange={() => togglePermission(selectedRoleData.id, menu, 'create')}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                      checked={perms.edit}
                                      disabled={!perms.view}
                                      onChange={() => togglePermission(selectedRoleData.id, menu, 'edit')}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                                      checked={perms.delete}
                                      disabled={!perms.view}
                                      onChange={() => togglePermission(selectedRoleData.id, menu, 'delete')}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-4 italic text-center">Los permisos de Crear, Editar y Borrar requieren primero habilitar el permiso de Ver.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Preferencias" && (
            <div className="flex flex-col h-full overflow-y-auto">
               <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-slate-800 text-sm">Preferencias Generales</h3>
                   <p className="text-xs text-slate-500 mt-1">Configura los ajustes globales del sistema.</p>
                 </div>
                 <button 
                   onClick={handlePreferencesSave}
                   className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                 >
                   Guardar
                 </button>
               </div>
               <div className="p-6 space-y-6">
                 <div>
                   <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Interfáz</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Idioma del Sistema</label>
                       <select 
                         value={preferences.language}
                         onChange={e => setPreferences({ ...preferences, language: e.target.value })}
                         className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                       >
                         <option value="es">Español (México)</option>
                         <option value="en">English (US)</option>
                         <option value="fr">Français</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tema</label>
                       <select 
                         value={preferences.theme}
                         onChange={e => setPreferences({ ...preferences, theme: e.target.value })}
                         className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                       >
                         <option value="light">Claro</option>
                         <option value="dark">Oscuro</option>
                         <option value="system">Sistema</option>
                       </select>
                     </div>
                   </div>
                 </div>

                 <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Región y Formatos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zona Horaria</label>
                        <select 
                          value={preferences.timezone}
                          onChange={e => setPreferences({ ...preferences, timezone: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                        >
                          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                          <option value="America/Cancun">Cancún (GMT-5)</option>
                          <option value="America/Tijuana">Tijuana (GMT-8)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Moneda Principal</label>
                        <select 
                          value={preferences.currency}
                          onChange={e => setPreferences({ ...preferences, currency: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                        >
                          <option value="MXN">Peso Mexicano (MXN)</option>
                          <option value="USD">Dólar Estadounidense (USD)</option>
                          <option value="EUR">Euro (EUR)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Formato de Fecha</label>
                        <select 
                          value={preferences.dateFormat}
                          onChange={e => setPreferences({ ...preferences, dateFormat: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Formato de Hora</label>
                        <select 
                          value={preferences.timeFormat}
                          onChange={e => setPreferences({ ...preferences, timeFormat: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                        >
                          <option value="12h">12 horas (05:00 PM)</option>
                          <option value="24h">24 horas (17:00)</option>
                        </select>
                      </div>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Alertas Financieras</h4>
                    
                    <div className="space-y-6">
                      {/* Alerta 1: Pago Excedido */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex space-x-3">
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 shrink-0">
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-805 text-slate-800 text-sm">Pago de Alumno Superior a Umbral</h5>
                              <p className="text-xs text-slate-500 mt-0.5">Envía alertas automáticas cuando un alumno realice un pago que supere el monto configurado.</p>
                            </div>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input 
                              type="checkbox" 
                              checked={preferences.paymentExceededEnabled}
                              onChange={(e) => setPreferences({ ...preferences, paymentExceededEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        {preferences.paymentExceededEnabled && (
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto del Umbral (Mínimo)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={preferences.paymentThreshold}
                                  onChange={(e) => setPreferences({ ...preferences, paymentThreshold: Number(e.target.value) })}
                                  className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm font-mono"
                                  placeholder="5000"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Canales de Alerta</label>
                              <div className="flex flex-col space-y-2 mt-1">
                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                  <input 
                                    type="checkbox"
                                    checked={preferences.paymentEmailChannel}
                                    onChange={(e) => setPreferences({ ...preferences, paymentEmailChannel: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span>Notificar por Correo Electrónico</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                  <input 
                                    type="checkbox"
                                    checked={preferences.paymentSystemChannel}
                                    onChange={(e) => setPreferences({ ...preferences, paymentSystemChannel: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span>Notificar en el Sistema</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Alerta 2: Factura Pagada */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex space-x-3">
                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">Factura Pagada Exitosamente</h5>
                              <p className="text-xs text-slate-500 mt-0.5">Envía una confirmación inmediata cuando se registre el cobro de una factura comercial.</p>
                            </div>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input 
                              type="checkbox" 
                              checked={preferences.invoicePaidEnabled}
                              onChange={(e) => setPreferences({ ...preferences, invoicePaidEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        {preferences.invoicePaidEnabled && (
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Detalles del Evento</label>
                              <p className="text-xs text-slate-400 leading-relaxed mt-1">Se genera un log en el módulo financiero y se dispara un aviso automático a los administradores asignados.</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Canales de Alerta</label>
                              <div className="flex flex-col space-y-2 mt-1">
                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                  <input 
                                    type="checkbox"
                                    checked={preferences.invoiceEmailChannel}
                                    onChange={(e) => setPreferences({ ...preferences, invoiceEmailChannel: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span>Notificar por Correo Electrónico</span>
                                </label>
                                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                  <input 
                                    type="checkbox"
                                    checked={preferences.invoiceSystemChannel}
                                    onChange={(e) => setPreferences({ ...preferences, invoiceSystemChannel: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                  <span>Notificar en el Sistema</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === "Notificaciones" && (
            <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50">
              {/* Header de Notificaciones */}
              <div className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-indigo-600 animate-bounce" />
                      Remitente y Notificaciones de Pagos
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Gestiona las alertas preventivas y recordatorios de cobro atrasado para Alumnos e Instituciones.
                    </p>
                  </div>
                  
                  {/* Selector de sub-sección */}
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center border border-slate-200">
                    <button
                      onClick={() => setNotifSubtab("config")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
                        notifSubtab === "config"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Configurar Campañas
                    </button>
                    <button
                      onClick={() => setNotifSubtab("pending")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                        notifSubtab === "pending"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Bandeja de Envíos
                      <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold">
                        {Math.max(1, (students.length > 0 ? 2 : 1) + (institutions.filter(i => i.status === 'Pendiente' || i.status === 'Atrasado').length || 1))}
                      </span>
                    </button>
                    <button
                      onClick={() => setNotifSubtab("history")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${
                        notifSubtab === "history"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Bitácora de Envíos
                    </button>
                    <button
                      onClick={() => setNotifSubtab("rules")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                        notifSubtab === "rules"
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Reglas de Recordatorio
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold">
                        {customRules.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido según Selección */}
              <div className="p-6 flex-1">
                {notifSubtab === "config" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 text-xs text-indigo-900 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-bold mb-1">Automatización Inteligente de Cobranza</p>
                        <p className="leading-relaxed opacity-90">
                          Las notificaciones se programan para enviarse de forma automática vía Correo Electrónico y Push de la App. Utiliza las variables dinámicas en las plantillas para personalizar cada de mensaje con los datos reales de facturación de cada destinatario.
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta de Configuración de Credenciales de Correo (SMTP) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                            <Send className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Controles de Envío y Servidor de Correo (SMTP)</h3>
                            <p className="text-[10px] text-slate-500">Configura tu servidor de correo para despachar credenciales de usuario y notificaciones reales.</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Sincronizado con la Nube
                        </span>
                      </div>

                      {/* Helper Banner for Gmail / Custom SMTP */}
                      <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                        <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Guía de Configuración Rápida para Gmail / Google Workspace:
                        </div>
                        <ol className="list-decimal pl-4 space-y-1 text-amber-800">
                          <li><strong>Servidor:</strong> <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono">smtp.gmail.com</code> | <strong>Puerto:</strong> <code className="bg-amber-100/60 px-1 py-0.5 rounded font-mono">587</code> (o 465).</li>
                          <li>Google requiere activar la <strong>Verificación en 2 pasos</strong> en tu cuenta de Google.</li>
                          <li>Genera una <strong>Contraseña de Aplicación de 16 caracteres</strong> en: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold hover:text-indigo-800">myaccount.google.com/apppasswords</a> y pégala en el campo Contraseña abajo (sin espacios).</li>
                          <li><em>Si dejas los campos vacíos o usas valores de prueba, el sistema operará en <strong>Modo Simulación Inteligente</strong> registrando todos los envíos sin generar errores.</em></li>
                        </ol>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Servidor SMTP (Host)</label>
                          <input
                            type="text"
                            placeholder="smtp.gmail.com"
                            value={smtpConfig.host}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Puerto</label>
                          <input
                            type="text"
                            placeholder="587"
                            value={smtpConfig.port}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Remitente</label>
                          <input
                            type="text"
                            placeholder="Instituto de Humanidades y Ciencias"
                            value={smtpConfig.fromName}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Remitente</label>
                          <input
                            type="email"
                            placeholder="tu-correo@gmail.com"
                            value={smtpConfig.fromEmail}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usuario SMTP / Correo</label>
                          <input
                            type="text"
                            placeholder="tu-correo@gmail.com"
                            value={smtpConfig.user}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contraseña de Aplicación / Clave</label>
                          <input
                            type="password"
                            placeholder="Contraseña de aplicación de 16 letras"
                            value={smtpConfig.pass}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="email"
                            placeholder="correo-destino@ejemplo.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 w-52 font-sans"
                          />
                          <button
                            type="button"
                            disabled={isTestingSmtp}
                            onClick={async () => {
                              if (!testEmail.trim()) {
                                triggerToast("Ingresa un correo de prueba.", "error");
                                return;
                              }
                              setIsTestingSmtp(true);
                              try {
                                const res = await fetch("/api/send-email", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    smtpHost: smtpConfig.host,
                                    smtpPort: smtpConfig.port,
                                    smtpUser: smtpConfig.user,
                                    smtpPass: smtpConfig.pass,
                                    smtpFromEmail: smtpConfig.fromEmail || testEmail,
                                    smtpFromName: smtpConfig.fromName || "IHS Sistema",
                                    to: testEmail,
                                    subject: "Prueba de Servidor de Correo SMTP - Sistema IHS",
                                    body: "Este es un correo electrónico de prueba enviado para verificar la correcta integración de tus credenciales de correo (SMTP) en el sistema IHS.\n\n¡Felicidades, la configuración funciona perfectamente!",
                                    allowFallback: false
                                  })
                                });
                                const { isJson, data } = await safeParseJsonResponse(res);
                                if (!res.ok || !isJson || !data || data.success === false) {
                                  throw new Error((data && data.error) || "Error al conectar con el servidor SMTP.");
                                }
                                if (data.simulated) {
                                  triggerToast("¡Correo de prueba generado en Modo Simulación!");
                                } else {
                                  triggerToast("¡Correo de prueba despachado con éxito a tu bandeja!");
                                }
                              } catch (err: any) {
                                alert("Resultado de prueba SMTP:\n" + err.message);
                              } finally {
                                setIsTestingSmtp(false);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isTestingSmtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Probando...</span>
                              </>
                            ) : (
                              <span>Enviar Correo de Prueba</span>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={handleDeleteSmtpRemitente}
                              className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 font-bold text-rose-700 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Borrar datos del remitente y servidor SMTP (Solo Super Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Borrar Remitente</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem("smtp_credentials", JSON.stringify(smtpConfig));
                              updateCompanyInfo({
                                ...companyInfo,
                                smtpConfig: smtpConfig
                              } as any);
                              triggerToast("¡Credenciales de SMTP guardadas y sincronizadas con la nube!");
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar y Sincronizar en la Nube</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta de Configuración de API de WhatsApp */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Controles de Envío e Integración de WhatsApp API</h3>
                          <p className="text-[10px] text-slate-500">Configura tu proveedor de WhatsApp (Meta Cloud API oficial, Twilio o Gateway personalizado) para enviar de forma complementaria recordatorios automáticos.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor / Gateway</label>
                          <select
                            value={whatsappConfig.provider}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 bg-white"
                          >
                            <option value="meta">Meta WhatsApp Cloud API (Oficial)</option>
                            <option value="twilio">Twilio WhatsApp Business API</option>
                            <option value="custom">Gateway Personalizado (Custom HTTP POST API)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {whatsappConfig.provider === "meta" && "URL Base de Graph API"}
                            {whatsappConfig.provider === "twilio" && "Número Remitente Twilio (whatsapp:+...)"}
                            {whatsappConfig.provider === "custom" && "API Endpoint URL (POST)"}
                          </label>
                          <input
                            type="text"
                            placeholder={
                              whatsappConfig.provider === "meta" ? "https://graph.facebook.com/v19.0" :
                              whatsappConfig.provider === "twilio" ? "whatsapp:+14155238886" : "https://mi-servidor.com/webhook-whatsapp"
                            }
                            value={whatsappConfig.apiUrl}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {whatsappConfig.provider === "meta" && "ID de Teléfono (Phone Number ID)"}
                            {whatsappConfig.provider === "twilio" && "Account SID"}
                            {whatsappConfig.provider === "custom" && "Identificador de Canal (Opcional)"}
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. 1029384756..."
                            value={whatsappConfig.phoneNumberId || ""}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {whatsappConfig.provider === "meta" && "TOKEN de Acceso Permanente (Meta Bearer)"}
                            {whatsappConfig.provider === "twilio" && "Auth Token (Twilio)"}
                            {whatsappConfig.provider === "custom" && "Token de Seguridad / API Key (Opcional)"}
                          </label>
                          <input
                            type="password"
                            placeholder="Token de acceso para autorización"
                            value={whatsappConfig.accessToken || ""}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="tel"
                            placeholder="+52 5512345678"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 w-48 font-mono"
                          />
                          <button
                            type="button"
                            disabled={isTestingWhatsapp}
                            onClick={async () => {
                              if (!testPhone.trim()) {
                                triggerToast("Ingresa un número telefónico de prueba (con código de país).");
                                return;
                              }
                              setIsTestingWhatsapp(true);
                              try {
                                const res = await sendRealNotificationWhatsApp(testPhone, "Prueba de Integración WhatsApp - Sistema IHS. ¡Felicidades! La sincronización automática de Whatsapps está lista y configurada para tus flujos.");
                                if (res.success) {
                                  if (res.simulated) {
                                    triggerToast("¡Simulación de WhatsApp enviada con éxito! Revisa consola del servidor para ver el mensaje.");
                                  } else {
                                    triggerToast("¡Mensaje de WhatsApp real enviado exitosamente!");
                                  }
                                } else {
                                  throw new Error(res.error || "Fallo en despacho");
                                }
                              } catch (err: any) {
                                alert("Error al enviar WhatsApp de prueba: " + err.message);
                              } finally {
                                setIsTestingWhatsapp(false);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-105 rounded-xl hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingWhatsapp ? "Despachando..." : "Enviar WhatsApp de Prueba"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={handleDeleteWhatsappRemitente}
                              className="px-3.5 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 font-bold text-rose-700 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Borrar credenciales y remitente de WhatsApp (Solo Super Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Borrar Remitente</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem("whatsapp_credentials", JSON.stringify(whatsappConfig));
                              triggerToast("¡Credenciales de WhatsApp guardadas exitosamente!");
                            }}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                          >
                            Guardar Configuración
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* NUEVO MÓDULO: Configuración de Notificaciones Automáticas de Tareas CRM y Vencimientos */}
                    <div className="bg-white border border-indigo-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-50 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
                            <CheckSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-850 text-sm">Alertas Automáticas de Tareas CRM y Vencimientos</h3>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black uppercase tracking-wider font-mono">
                                Email & WhatsApp
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Configura el envío de alertas automáticas para notificar a los responsables cuando se les asigna una tarea o cuando su fecha límite está próxima.
                            </p>
                          </div>
                        </div>

                        {/* Botón Escanear Vencimientos Ahora */}
                        <button
                          type="button"
                          disabled={isScanningDeadlines}
                          onClick={async () => {
                            setIsScanningDeadlines(true);
                            try {
                              const result = await triggerDeadlineScan(true);
                              if (result.notifiedTasks.length > 0) {
                                triggerToast(`¡Escaneo exitoso! Se enviaron ${result.notifiedTasks.length} alertas de fecha límite a los responsables.`);
                              } else {
                                triggerToast(`Escaneo completado: ${result.scannedCount} tareas pendientes revisadas. No hubo tareas por vencer hoy sin notificar.`);
                              }
                            } catch (err: any) {
                              alert("Error al escanear vencimientos: " + err.message);
                            } finally {
                              setIsScanningDeadlines(false);
                            }
                          }}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                        >
                          {isScanningDeadlines ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                              <span>Escaneando Tareas...</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Escanear y Notificar Vencimientos Ahora</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Master Toggles Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Box 1: Assignment Toggles */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-slate-800">Al Asignar una Nueva Tarea en CRM</h4>
                          </div>
                          <p className="text-[10.5px] text-slate-500">
                            Avisa inmediatamente al usuario responsable seleccionado en cuanto se crea o reasigna la tarea.
                          </p>

                          <div className="space-y-2 pt-1 border-t border-slate-200/60">
                            <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 hover:bg-white rounded-lg transition">
                              <span className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Notificar por Correo Electrónico (SMTP)</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={taskNotifConfig.notifyAssignmentEmail}
                                onChange={(e) => {
                                  const updated = { ...taskNotifConfig, notifyAssignmentEmail: e.target.checked };
                                  setTaskNotifConfig(updated);
                                  saveTaskNotificationConfig(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 hover:bg-white rounded-lg transition">
                              <span className="flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Notificar por WhatsApp (Oficial / Twilio)</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={taskNotifConfig.notifyAssignmentWhatsApp}
                                onChange={(e) => {
                                  const updated = { ...taskNotifConfig, notifyAssignmentWhatsApp: e.target.checked };
                                  setTaskNotifConfig(updated);
                                  saveTaskNotificationConfig(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Box 2: Deadline Toggles */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <h4 className="text-xs font-bold text-slate-800">Al Aproximarse la Fecha Límite</h4>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10.5px] text-slate-500">
                              Anticipación para el aviso automático:
                            </p>
                            <select
                              value={taskNotifConfig.deadlineHoursThreshold}
                              onChange={(e) => {
                                const updated = { ...taskNotifConfig, deadlineHoursThreshold: Number(e.target.value) };
                                setTaskNotifConfig(updated);
                                saveTaskNotificationConfig(updated);
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="12">12 horas antes</option>
                              <option value="24">24 horas antes (1 día)</option>
                              <option value="48">48 horas antes (2 días)</option>
                              <option value="72">72 horas antes (3 días)</option>
                            </select>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-200/60">
                            <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 hover:bg-white rounded-lg transition">
                              <span className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Recordatorio por Correo Electrónico</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={taskNotifConfig.notifyDeadlineEmail}
                                onChange={(e) => {
                                  const updated = { ...taskNotifConfig, notifyDeadlineEmail: e.target.checked };
                                  setTaskNotifConfig(updated);
                                  saveTaskNotificationConfig(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 hover:bg-white rounded-lg transition">
                              <span className="flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Recordatorio por WhatsApp</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={taskNotifConfig.notifyDeadlineWhatsApp}
                                onChange={(e) => {
                                  const updated = { ...taskNotifConfig, notifyDeadlineWhatsApp: e.target.checked };
                                  setTaskNotifConfig(updated);
                                  saveTaskNotificationConfig(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Plantillas y Variables dinámicas */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-slate-800">Editor de Plantillas de Notificación</h4>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setActiveTemplateTab("assignment")}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                                activeTemplateTab === "assignment"
                                  ? "bg-white text-indigo-700 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              🔔 Asignación de Tarea
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTemplateTab("deadline")}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                                activeTemplateTab === "deadline"
                                  ? "bg-white text-amber-700 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              ⏰ Vencimiento Próximo
                            </button>
                          </div>
                        </div>

                        {/* Available dynamic tag chips */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Variables Disponibles (Se reemplazan automáticamente en tiempo real):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { tag: "{nombre_responsable}", label: "Nombre Responsable" },
                              { tag: "{titulo_tarea}", label: "Título de la Tarea" },
                              { tag: "{fecha_limite}", label: "Fecha Límite" },
                              { tag: "{prioridad}", label: "Prioridad" },
                              { tag: "{tipo_tarea}", label: "Tipo (Llamada, Correo, etc.)" },
                              { tag: "{institucion}", label: "Institución / Prospecto" },
                              { tag: "{asignado_por}", label: "Asignado Por" },
                              { tag: "{notas}", label: "Notas / Instrucciones" },
                              { tag: "{tiempo_restante}", label: "Tiempo Restante (Horas/Días)" },
                            ].map(item => (
                              <span
                                key={item.tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-medium border border-slate-200 select-all"
                                title={`Etiqueta: ${item.tag}`}
                              >
                                {item.tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Template Content for Assignment */}
                        {activeTemplateTab === "assignment" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Email Template */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                                <Mail className="w-3.5 h-3.5" />
                                <span>Plantilla de Correo Electrónico (Asignación)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Asunto del correo"
                                value={taskNotifConfig.assignmentTemplateEmail.subject}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    assignmentTemplateEmail: {
                                      ...taskNotifConfig.assignmentTemplateEmail,
                                      subject: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                              />
                              <textarea
                                rows={8}
                                value={taskNotifConfig.assignmentTemplateEmail.body}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    assignmentTemplateEmail: {
                                      ...taskNotifConfig.assignmentTemplateEmail,
                                      body: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              />
                            </div>

                            {/* WhatsApp Template */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Plantilla de Mensaje de WhatsApp (Asignación)</span>
                              </label>
                              <textarea
                                rows={10}
                                value={taskNotifConfig.assignmentTemplateWhatsApp}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    assignmentTemplateWhatsApp: e.target.value
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              />
                            </div>
                          </div>
                        )}

                        {/* Template Content for Deadline */}
                        {activeTemplateTab === "deadline" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Email Template */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                <Mail className="w-3.5 h-3.5" />
                                <span>Plantilla de Correo Electrónico (Vencimiento)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Asunto del correo"
                                value={taskNotifConfig.deadlineTemplateEmail.subject}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    deadlineTemplateEmail: {
                                      ...taskNotifConfig.deadlineTemplateEmail,
                                      subject: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                              />
                              <textarea
                                rows={8}
                                value={taskNotifConfig.deadlineTemplateEmail.body}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    deadlineTemplateEmail: {
                                      ...taskNotifConfig.deadlineTemplateEmail,
                                      body: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              />
                            </div>

                            {/* WhatsApp Template */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Plantilla de Mensaje de WhatsApp (Vencimiento)</span>
                              </label>
                              <textarea
                                rows={10}
                                value={taskNotifConfig.deadlineTemplateWhatsApp}
                                onChange={(e) => {
                                  setTaskNotifConfig({
                                    ...taskNotifConfig,
                                    deadlineTemplateWhatsApp: e.target.value
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              />
                            </div>
                          </div>
                        )}

                        {/* Botones Guardar Plantillas y Restaurar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setTaskNotifConfig(DEFAULT_TASK_NOTIFICATION_CONFIG);
                              saveTaskNotificationConfig(DEFAULT_TASK_NOTIFICATION_CONFIG);
                              triggerToast("Plantillas restablecidas a sus valores por defecto");
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition underline cursor-pointer"
                          >
                            Restablecer Plantillas por Defecto
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              saveTaskNotificationConfig(taskNotifConfig);
                              triggerToast("¡Plantillas y reglas de notificación de tareas guardadas!");
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar Configuración de Tareas</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Test Panel */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800">Probar Despacho de Notificación de Tarea (Simulación o Real)</h4>
                        </div>
                        <p className="text-[10.5px] text-slate-500">
                          Envía una tarea de prueba inmediata con datos de ejemplo para verificar la llegada del correo o mensaje de WhatsApp.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                          <input
                            type="email"
                            placeholder="correo-destino@ejemplo.com"
                            value={taskTestRecipientEmail}
                            onChange={(e) => setTaskTestRecipientEmail(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                          />
                          <input
                            type="tel"
                            placeholder="+52 55 1234 5678"
                            value={taskTestRecipientPhone}
                            onChange={(e) => setTaskTestRecipientPhone(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                          />
                          <button
                            type="button"
                            disabled={isTestingTaskNotif || (!taskTestRecipientEmail.trim() && !taskTestRecipientPhone.trim())}
                            onClick={async () => {
                              setIsTestingTaskNotif(true);
                              try {
                                const sampleTask = {
                                  id: 99999,
                                  title: "Reunión de seguimiento comercial - Presentación de Propuesta",
                                  dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                                  status: "Pendiente" as const,
                                  type: "Llamada" as const,
                                  priority: "Alta" as const,
                                  notes: "Llamar al director académico para resolver dudas sobre el convenio anual.",
                                  requestedBy: currentUser?.name || "Admin Principal"
                                };
                                const sampleUser = {
                                  id: 99999,
                                  name: "Usuario de Prueba",
                                  role: "Coordinador",
                                  email: taskTestRecipientEmail.trim(),
                                  phone: taskTestRecipientPhone.trim()
                                };

                                const res = await sendTaskAssignmentNotification(sampleTask, sampleUser, {
                                  forceEmail: !!taskTestRecipientEmail.trim(),
                                  forceWhatsApp: !!taskTestRecipientPhone.trim()
                                });

                                if (res.errors.length > 0) {
                                  alert("Resultado del test:\n" + res.errors.join("\n"));
                                } else {
                                  triggerToast("¡Prueba de notificación de tarea ejecutada con éxito!");
                                }
                              } catch (err: any) {
                                alert("Error al probar: " + err.message);
                              } finally {
                                setIsTestingTaskNotif(false);
                              }
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingTaskNotif ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Despachando Prueba...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Enviar Notificación de Prueba</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Header de Campañas y Botón Nueva Notificación */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <span>Plantillas y Campañas de Notificaciones de Pagos</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-150">
                            {reminderTemplates.length} activas
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">Recordatorios de colegiaturas escolares y facturas de convenio con variables automáticas.</p>
                      </div>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={handleOpenCreateReminderTemplate}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nueva Notificación de Pago</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {reminderTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden ${
                            tpl.enabled ? "border-slate-200" : "border-slate-200 opacity-60"
                          }`}
                        >
                          {/* Badge de destinatario */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  tpl.target === "Alumno"
                                    ? "bg-teal-50 text-teal-700 border border-teal-100"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                }`}
                              >
                                {tpl.target}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  tpl.type === "Preventivo"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}
                              >
                                {tpl.type}
                              </span>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={tpl.enabled}
                                onChange={(e) => {
                                  const updated = reminderTemplates.map((t) =>
                                    t.id === tpl.id ? { ...t, enabled: e.target.checked } : t
                                  );
                                  saveReminderTemplates(updated);
                                  triggerToast(
                                    `Campaña ${tpl.title} ${e.target.checked ? "activada" : "desactivada"}`
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <h4 className="font-bold text-slate-850 text-slate-800 text-sm mb-1">{tpl.title}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 pb-3 mb-3 border-b border-slate-100 text-[11px] text-slate-500">
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {tpl.type === "Preventivo" ? "Antes del vencimiento:" : "Después de vencido:"} <strong>&nbsp;{tpl.triggerDays} días</strong>
                            </span>
                            <span className="flex items-center">
                              <Send className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              Canal: <strong>&nbsp;{tpl.channel}</strong>
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asunto del Correo</span>
                              <p className="text-xs font-semibold text-slate-700 mt-1">{tpl.subject}</p>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contenido del Mensaje</span>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                                {tpl.body}
                              </p>
                            </div>
                          </div>

                          {/* Botones de acción (Editar y Borrar para Super Admin) */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReminderTemplate(tpl.id, tpl.title)}
                                title="Eliminar Notificación de Pago (Super Admin)"
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Borrar</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingTemplateId(tpl.id);
                                setTemplateForm({ ...tpl });
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-200 transition-all flex items-center ml-auto cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                              Editar Plantilla y Tiempos
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notifSubtab === "pending" && (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-1">Bandeja de Recordatorios Sugeridos (Cola Manual / Ejecución)</p>
                        <p className="leading-relaxed opacity-90">
                          Abajo se listan los alumnos del sistema e instituciones que coinciden actualmente con los criterios de pagos pendientes sin saldo cubierto. Haz clic en <strong>"Enviar Recordatorio"</strong> para ejecutar y previsualizar la plantilla antes del despacho final.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Destinatarios con Pagos Pendientes Detectados</span>
                        <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2.5 py-1 rounded-full">
                          En tiempo real
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="px-6 py-3.5">Destinatario</th>
                              <th className="px-6 py-3.5">Tipo</th>
                              <th className="px-6 py-3.5">Concepto del Cobro</th>
                              <th className="px-6 py-3.5">Monto de Adeudo</th>
                              <th className="px-6 py-3.5">Fecha Vencimiento</th>
                              <th className="px-6 py-3.5">Criterio / Alerta</th>
                              <th className="px-6 py-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {/* Alumno 1 */}
                            {!dismissedPendingIds.includes("pending_student_0") && (
                            <tr className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">
                                  {students.length > 0 ? `${students[0].name} ${students[0].lastName}` : "Sofía Martínez"}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {students.length > 0 ? students[0].email : "sofia.martinez@ejemplo.com"}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 uppercase border border-teal-100">
                                  Alumno
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-semibold">Mensualidad Mayo (Clases)</td>
                              <td className="px-6 py-4 text-slate-850 font-bold font-mono text-emerald-600">$3,200.00</td>
                              <td className="px-6 py-4 text-slate-500">05/06/2026</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Preventivo (Falta 1 día)
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDismissPendingNotif("pending_student_0", students.length > 0 ? `${students[0].name} ${students[0].lastName}` : "Sofía Martínez")}
                                      title="Descartar y borrar notificación de la bandeja (Super Admin)"
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      const studentName = students.length > 0 ? `${students[0].name} ${students[0].lastName}` : "Sofía Martínez";
                                      const limit = "05/06/2026";
                                      const amount = "$3,200.00";
                                      
                                      const actualStudent = students.find(s => s.id === (students[0]?.id || 0)) || students[0];
                                      const isAlumnoActive = actualStudent?.notificationPayment ? actualStudent.notificationPayment.alumno : true;
                                      
                                      if (!isAlumnoActive) {
                                        const activeAlternatives = [];
                                        if (actualStudent?.notificationPayment?.instituto) activeAlternatives.push("Instituto");
                                        if (actualStudent?.notificationPayment?.agente) activeAlternatives.push("Agente");
                                        
                                        alert(
                                          `⚠️ ENVÍO DIRIGIDO FILTRADO:\n` +
                                          `Este alumno tiene DESACTIVADA la opción 'Alumno' para recibir 'Notificación de Pago' en su perfil.\n\n` +
                                          `Por lo tanto, no se le enviará directamente de forma digital a ${studentName}.\n` +
                                          `La notificación ha sido redirigida a los receptores designados activos: ${activeAlternatives.join(", ") || "Ninguno (Sin envío)"}.`
                                        );
                                        if (activeAlternatives.length === 0) {
                                          triggerToast("No se envió: sin receptores activos");
                                          return;
                                        }
                                      }

                                      // Populated message mock
                                      const template = reminderTemplates.find(t => t.id === 'student_pre');
                                      let body = template?.body || "";
                                      body = body.replace("{nombre_alumno}", studentName).replace("{monto}", amount).replace("{fecha_limite}", limit);
                                      
                                      const subject = template?.subject || "Aviso de Pago";
                                      
                                      const confirmSend = confirm(
                                        `PREVISUALIZACIÓN DEL CORREO PARA EL ALUMNO:\n\n` +
                                        `Para: ${studentName}\n` +
                                        `Asunto: ${subject}\n` +
                                        `Mensaje:\n"${body}"\n\n` +
                                        `¿Deseas enviar esta notificación ahora?`
                                      );
                                      
                                      if(confirmSend) {
                                        const actualStudentObj = students.find(s => s.id === (students[0]?.id || 0)) || students[0];
                                        const emailTarget = actualStudentObj?.email || "colegio-prueba@ejemplo.com"; const phoneTarget = actualStudentObj?.phone || "+52 55 4567 8901"; sendRealNotificationWhatsApp(phoneTarget, body).then(wa => { if (wa.success) triggerToast(wa.simulated ? "¡WhatsApp simulado con éxito!" : "¡Notificación de WhatsApp enviada!"); });
                                        
                                        sendRealNotificationEmail(emailTarget, studentName, subject, body).then((res) => {
                                          if (res.success) {
                                            triggerToast("¡Recordatorio preventivo enviado vía SMTP real con éxito!");
                                          } else {
                                            triggerToast("¡Recordatorio registrado en el portal! (Configura tus credenciales SMTP para envío real en vivo)");
                                          }
                                        });

                                        addActivity({
                                          institutionId: actualStudentObj?.institutionId || 0,
                                          date: new Date().toISOString(),
                                          description: `Recordatorio preventivo enviado por correo a Alumno: ${studentName} por ${amount}.`
                                        });
                                        
                                        addNotifHistoryEntry({
                                          id: generateUniqueId(),
                                          date: new Date().toISOString(),
                                          recipient: `${studentName} (Alumno)`,
                                          target: "Alumno",
                                          type: "Preventivo",
                                          campaignName: "Recordatorio de Pago de Colegiatura",
                                          channel: "Email & Push",
                                          subject: subject,
                                          amount: amount
                                        });
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-indigo-600 font-bold text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    Enviar Alerta
                                  </button>
                                </div>
                              </td>
                            </tr>
                            )}

                            {/* Alumno 2 */}
                            {students.length > 1 && !dismissedPendingIds.includes("pending_student_1") && (
                              <tr className="hover:bg-slate-50/50 transition">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">
                                    {`${students[1].name} ${students[1].lastName}`}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {students[1].email || "alumno2@ejemplo.com"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 uppercase border border-teal-100">
                                    Alumno
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-semibold">Adeudo Extemporáneo de Matrícula</td>
                                <td className="px-6 py-4 text-slate-850 font-bold font-mono text-rose-600">$1,500.00</td>
                                <td className="px-6 py-4 text-slate-500">25/05/2026</td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-750 border border-rose-100 text-rose-700">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Atrasado (Vencido hace 3 días)
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleDismissPendingNotif("pending_student_1", `${students[1].name} ${students[1].lastName}`)}
                                        title="Descartar y borrar notificación de la bandeja (Super Admin)"
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        const studentName = `${students[1].name} ${students[1].lastName}`;
                                        const limit = "25/05/2026";
                                        const amount = "$1,500.00";
                                        
                                        const actualStudent = students[1];
                                        const isAlumnoActive = actualStudent?.notificationPayment ? actualStudent.notificationPayment.alumno : true;
                                        
                                        if (!isAlumnoActive) {
                                          const activeAlternatives = [];
                                          if (actualStudent?.notificationPayment?.instituto) activeAlternatives.push("Instituto");
                                          if (actualStudent?.notificationPayment?.agente) activeAlternatives.push("Agente");
                                          
                                          alert(
                                            `⚠️ RECLAMACIÓN FILTRADA:\n` +
                                            `Este alumno tiene DESACTIVADA la opción 'Alumno' para recibir 'Notificación de Pago' en su perfil.\n\n` +
                                            `Por lo tanto, no se le enviará directamente a ${studentName}.\n` +
                                            `La alerta ha sido redirigida a los receptores designados activos: ${activeAlternatives.join(", ") || "Ninguno (Sin envío)"}.`
                                          );
                                          if (activeAlternatives.length === 0) {
                                            triggerToast("No se envió: sin receptores activos");
                                            return;
                                          }
                                        }

                                        const template = reminderTemplates.find(t => t.id === 'student_post');
                                        let body = template?.body || "";
                                        body = body.replace("{nombre_alumno}", studentName).replace("{monto}", amount).replace("{fecha_limite}", limit);
                                        
                                        const subject = template?.subject || "Urgente: Colegiatura Vencida";
                                        
                                        const confirmSend = confirm(
                                          `PREVISUALIZACIÓN DE ALERTA DE COBRO EXTEMPORÁNEO:\n\n` +
                                          `Para: ${studentName}\n` +
                                          `Asunto: ${subject}\n` +
                                          `Mensaje:\n"${body}"\n\n` +
                                          `¿Deseas enviar esta notificación ahora?`
                                        );
                                        
                                        if(confirmSend) {
                                          const emailTarget = students[1]?.email || "colegio-prueba@ejemplo.com"; const phoneTarget = students[1]?.phone || "+52 81 2345 6789"; sendRealNotificationWhatsApp(phoneTarget, body).then(wa => { if (wa.success) triggerToast(wa.simulated ? "¡Reclamación WhatsApp simulada!" : "¡Reclamación por WhatsApp enviada!"); });
                                          
                                          sendRealNotificationEmail(emailTarget, studentName, subject, body).then((res) => {
                                            if (res.success) {
                                              triggerToast("¡Reclamación de Alumno enviada vía SMTP real con éxito!");
                                            } else {
                                              triggerToast("¡Reclamación registrada en el portal! (Configura tus credenciales SMTP para envío real en vivo)");
                                            }
                                          });

                                          addActivity({
                                            institutionId: actualStudent?.institutionId || 0,
                                            date: new Date().toISOString(),
                                            description: `Notificación de adeudo atrasado despachada a Alumno: ${studentName} por ${amount}.`
                                          });
                                          
                                          addNotifHistoryEntry({
                                            id: generateUniqueId(),
                                            date: new Date().toISOString(),
                                            recipient: `${studentName} (Alumno)`,
                                            target: "Alumno",
                                            type: "Cobro Atrasado",
                                            campaignName: "Reclamación de Colegiatura Atrasada",
                                            channel: "Email, WhatsApp & Push",
                                            subject: subject,
                                            amount: amount
                                          });
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-rose-600 font-bold text-white rounded-lg hover:bg-rose-750 transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                                    >
                                      <Send className="w-3 h-3" />
                                      Enviar Reclamación
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Instituciones de la DB */}
                            {institutions
                              .filter(i => (i.status === 'Pendiente' || i.status === 'Atrasado') && !dismissedPendingIds.includes(`pending_inst_${i.id}`))
                              .map((inst) => {
                              const calculatedAmount = (inst as any).billingAmount ? `${Number((inst as any).billingAmount).toLocaleString()}` : "$45,000.00";
                              return (
                                <tr key={inst.id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{inst.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {inst.country} • Convenio
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase border border-indigo-100">
                                      Institución
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 font-semibold font-sans">Suscripción de Convenio de Créditos</td>
                                  <td className="px-6 py-4 text-slate-850 font-bold font-mono text-rose-600">{calculatedAmount}</td>
                                  <td className="px-6 py-4 text-slate-500">24/05/2026</td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-750 border border-rose-100 text-rose-700">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {inst.status === 'Atrasado' ? 'Abono Atrasado' : 'Pendiente de cobro'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {isSuperAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => handleDismissPendingNotif(`pending_inst_${inst.id}`, inst.name)}
                                          title="Descartar y borrar notificación de la bandeja (Super Admin)"
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          const template = reminderTemplates.find(t => t.id === 'inst_post');
                                          let body = template?.body || "";
                                          body = body.replace("{nombre_institucion}", inst.name).replace("{monto}", calculatedAmount).replace("{fecha_limite}", "24/05/2026");
                                          
                                          const subject = template?.subject || "Urgente: Factura de Convenio Vencida";
                                          
                                          const confirmSend = confirm(
                                            `PREVISUALIZACIÓN DE RECLAMACIÓN PARA LA INSTITUCIÓN:\n\n` +
                                            `Institución: ${inst.name}\n` +
                                            `Asunto: ${subject}\n` +
                                            `Mensaje:\n"${body}"\n\n` +
                                            `¿Deseas despachar esta alerta de cobro institucional por correo electrónico?`
                                          );
                                          
                                          if(confirmSend) {
                                            const emailTarget = (inst as any).email || "coordinador@ejemplo.com"; const phoneTarget = inst.phone || "+52 55 1122 3344"; sendRealNotificationWhatsApp(phoneTarget, body).then(wa => { if (wa.success) triggerToast(wa.simulated ? "¡Reclamación de WhatsApp simulada!" : "¡Reclamación institucional por WhatsApp enviada!"); });
                                            
                                            sendRealNotificationEmail(emailTarget, inst.name, subject, body).then((res) => {
                                              if (res.success) {
                                                triggerToast("¡Reclamación de Institución enviada vía SMTP real con éxito!");
                                              } else {
                                                triggerToast("¡Reclamación registrada en el portal! (Configura tus credenciales SMTP para envío real en vivo)");
                                              }
                                            });

                                            addActivity({
                                              institutionId: inst.id,
                                              date: new Date().toISOString(),
                                              description: `Enviar Reclamación de Facturación Vencida a Coordinador de ${inst.name} por ${calculatedAmount}.`
                                            });
                                            
                                            addNotifHistoryEntry({
                                              id: generateUniqueId(),
                                              date: new Date().toISOString(),
                                              recipient: `${inst.name} (Coordinador)`,
                                              target: "Institución",
                                              type: "Cobro Atrasado",
                                              campaignName: "Cobro de Factura Vencida",
                                              channel: "Email & Teléfono",
                                              subject: subject,
                                              amount: calculatedAmount
                                            });
                                          }
                                        }}
                                        className="px-3.5 py-1.5 bg-rose-600 font-bold text-white rounded-lg hover:bg-rose-750 transition flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                                      >
                                        <Send className="w-3 h-3" />
                                        Enviar Reclamación
                                      </button>
                                    </div>
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

                {notifSubtab === "history" && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bitácora Oficial de Envíos</span>
                          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            Inmutable / Auditoría
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold font-mono">
                          {notifHistory.length} {notifHistory.length === 1 ? "despacho registrado" : "despachos registrados"}
                        </span>
                      </div>

                      <div className="overflow-x-auto font-sans text-xs">
                        {notifHistory.length === 0 ? (
                          <div className="p-10 text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                              <Bell className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="font-bold text-slate-700 text-sm">Bitácora iniciada de cero</p>
                            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                              No hay despachos previos registrados. Cada notificación de pago despachada manual o automáticamente quedará asentada aquí de forma permanente e inalterable para trazabilidad y auditoría (no se puede borrar).
                            </p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-3.5">Fecha y Hora</th>
                                <th className="px-6 py-3.5">Destinatario</th>
                                <th className="px-6 py-3.5">Tipo de Notificación</th>
                                <th className="px-6 py-3.5">Nombre Campaña</th>
                                <th className="px-6 py-3.5">Canal</th>
                                <th className="px-6 py-3.5">Sobre el Monto</th>
                                <th className="px-6 py-3.5">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {notifHistory.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-6 py-4 font-mono text-slate-500">
                                    {new Date(h.date).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-800">
                                    {h.recipient}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        h.type === "Preventivo"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                          : "bg-rose-50 text-rose-700 border-rose-100"
                                      }`}
                                    >
                                      {h.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 font-semibold">
                                    {h.campaignName}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-slate-500">
                                    {h.channel}
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                    {h.amount}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                                      <Check className="w-3.5 h-3.5 mr-1" />
                                      Enviado
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {notifSubtab === "rules" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Banner de Éxito Persistente de Reglas */}
                    {ruleSuccessBanner && (
                      <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl p-4 text-xs font-sans relative flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
                        <div className="flex-1 pr-6">
                          <p className="font-extrabold text-sm text-emerald-850">¡Operación Ejecutada con Éxito!</p>
                          <p className="mt-1 font-medium">{ruleSuccessBanner}</p>
                        </div>
                        <button 
                          onClick={() => setRuleSuccessBanner(null)}
                          className="absolute top-3.5 right-3.5 text-emerald-500 hover:text-emerald-700 font-bold p-1 hover:bg-emerald-100 rounded-lg cursor-pointer transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Explicación de Configuración Avanzada */}
                    <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                        <Settings className="w-64 h-64 translate-x-12 translate-y-12 animate-spin-slow" />
                      </div>
                      <div className="max-w-xl space-y-2 relative z-10 font-sans">
                        <span className="bg-indigo-805 text-indigo-200 text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-lg uppercase bg-indigo-800">
                          Reglas de Recordatorio
                        </span>
                        <h4 className="text-lg font-black tracking-tight">Reglas de Recordatorio de Cobranza Personalizadas</h4>
                        <p className="text-xs text-indigo-200 leading-relaxed">
                          Crea y gestiona reglas de recordatorio basadas en el saldo vencido de los alumnos e instituciones. Define la mora mínima del saldo, la tolerancia y el canal de notificación ideal (Email, WhatsApp de alta entrega, Push, etc.).
                        </p>
                      </div>
                    </div>

                    {/* Barra de Filtros y Creación de Regla */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
                        {/* Buscador */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar reglas..."
                            value={ruleSearchQuery}
                            onChange={(e) => setRuleSearchQuery(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 font-semibold text-slate-800"
                          />
                        </div>

                        {/* Filtro Rol */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase shrink-0 font-mono">Rol Target:</span>
                          <select
                            value={ruleRoleFilter}
                            onChange={(e) => setRuleRoleFilter(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          >
                            <option value="Todos">Todos</option>
                            <option value="Alumno">Alumno</option>
                            <option value="Coordinador">Coordinador</option>
                            <option value="Finanzas">Finanzas</option>
                            <option value="Academia">Academia</option>
                          </select>
                        </div>

                        {/* Filtro Canal */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase shrink-0 font-mono">Canal:</span>
                          <select
                            value={ruleChannelFilter}
                            onChange={(e) => setRuleChannelFilter(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          >
                            <option value="Todos">Todos</option>
                            <option value="Email">Email</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Push">Push Notification</option>
                            <option value="SMS">SMS / Celular</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingRuleId(null);
                          setRuleForm({
                            name: "",
                            financialState: "Pendiente",
                            minAmount: 500,
                            allowedRoles: ["Alumno"],
                            channel: "Email",
                            triggerDays: 3,
                            subject: "Recordatorio de Pago de Saldo Pendiente",
                            body: "Hola, te informamos que tu cuenta tiene saldo pendiente de {monto}."
                          });
                          setRuleModalOpen(true);
                        }}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 uppercase tracking-wider"
                      >
                        <Sparkles className="w-4 h-4" /> Crear Nueva Regla
                      </button>
                    </div>

                    {/* Resultados de Test de Regla */}
                    {ruleTestedResults && (
                      <div className="bg-indigo-50 border-2 border-indigo-200 text-indigo-950 rounded-2xl p-5 text-xs font-sans space-y-3 shadow-sm animate-in zoom-in-95 duration-200 select-none">
                        <div className="flex justify-between items-center border-b border-indigo-150 pb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-indigo-600" />
                            <p className="font-extrabold text-sm text-indigo-900">Simulación / Consulta de Destinatarios Activos</p>
                          </div>
                          <button 
                            onClick={() => setRuleTestedResults(null)}
                            className="text-indigo-500 hover:text-indigo-800 bg-indigo-100 hover:bg-indigo-200 font-bold p-1 rounded-full transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-indigo-700 font-semibold">
                          Regla Probada: <strong className="text-indigo-950 font-extrabold">{ruleTestedResults.ruleName}</strong>. 
                          Se han consultado los registros con transacciones vigentes con este perfil:
                        </p>
                        <div className="bg-white border border-indigo-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {ruleTestedResults.matches.map((match, i) => (
                            <div key={i} className="p-3 flex items-center justify-between gap-4 font-mono text-[10.5px]">
                              <div>
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mr-1.5">
                                  {match.type}
                                </span>
                                <strong className="text-slate-900 font-bold">{match.name}</strong>
                              </div>
                              <div className="text-right">
                                <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-extrabold mr-2">
                                  {match.status}
                                </span>
                                <strong className="text-slate-950 font-extrabold">{match.balance}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-indigo-500 italic">
                          * Esta consulta es en tiempo real. En un despacho real de recordatorio, el sistema agendará estos {ruleTestedResults.matches.length} envíos para despacharse vía el canal configurado.
                        </p>
                      </div>
                    )}

                    {/* Listado de Reglas de Recordatorios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 font-sans">
                      {customRules
                        .filter(rule => {
                          const matchesKeyword = rule.name.toLowerCase().includes(ruleSearchQuery.toLowerCase()) || 
                                                 rule.subject.toLowerCase().includes(ruleSearchQuery.toLowerCase());
                          
                          const matchesRole = ruleRoleFilter === "Todos" || rule.allowedRoles.includes(ruleRoleFilter);
                          const matchesChannel = ruleChannelFilter === "Todos" || rule.channel.toLowerCase().includes(ruleChannelFilter.toLowerCase());
                          return matchesKeyword && matchesRole && matchesChannel;
                        })
                        .map((rule) => (
                          <div 
                            key={rule.id}
                            className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden flex flex-col justify-between ${
                              rule.enabled ? "border-slate-200" : "border-slate-150 opacity-60 bg-slate-50/20"
                            }`}
                          >
                            <div>
                              {/* Header Card */}
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="space-y-1">
                                  <h5 className="font-extrabold text-slate-800 text-sm">{rule.name}</h5>
                                  <p className="text-[11px] text-slate-500 font-mono">ID: {rule.id}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    onChange={() => {
                                      const updated = customRules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r);
                                      setCustomRules(updated);
                                      localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                                      triggerToast(rule.enabled ? `Regla "${rule.name}" desactivada` : `Regla "${rule.name}" activada`);
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                              </div>

                              {/* Atributos / Filtros de la regla */}
                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs space-y-2 mb-4">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Estado de Deuda:</span>
                                  <span className="bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-lg text-[10.5px]">
                                    {rule.financialState}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Monto Mínimo:</span>
                                  <span className="text-slate-850 font-extrabold font-mono text-[11px]">
                                    ${Number(rule.minAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Días de Gracia / Tolerancia:</span>
                                  <span className="text-slate-800 font-extrabold">
                                    {rule.triggerDays} Días hábiles
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Filtro de Rol(es):</span>
                                  <div className="flex flex-wrap gap-1">
                                    {rule.allowedRoles.map((role) => (
                                      <span key={role} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] font-mono">Canal Comunicación:</span>
                                  <span className="bg-amber-50 border border-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-lg text-[10px] uppercase">
                                    {rule.channel}
                                  </span>
                                </div>
                              </div>

                              {/* Plantilla Mensaje */}
                              <div className="space-y-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px]">
                                <p className="font-bold text-slate-700">Asunto:</p>
                                <p className="text-slate-800 font-medium font-sans mb-1">{rule.subject}</p>
                                <p className="font-bold text-slate-700">Mensaje:</p>
                                <p className="text-slate-550 font-mono text-[10.5px] leading-relaxed italic">"{rule.body}"</p>
                              </div>
                            </div>

                            {/* Controles Acciones */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 gap-2">
                              {/* Botón Probar Regla */}
                              <button
                                onClick={() => {
                                  const matches: Array<{ name: string; status: string; balance: string; type: string }> = [];
                                  if (rule.allowedRoles.includes("Alumno")) {
                                    students.forEach(s => {
                                      const sStatus = s.status || "Pendiente";
                                      let isMatch = false;
                                      if (rule.financialState === "Pendiente" && (sStatus === "Pendiente" || sStatus === "Activo")) isMatch = true;
                                      if (rule.financialState === "Atrasado" && (sStatus === "Atrasado" || sStatus === "Suspendido")) isMatch = true;
                                      if (rule.financialState === "Vencido / Mora" && (sStatus === "Atrasado" || sStatus === "En Mora")) isMatch = true;
                                      if (rule.financialState === "Parcialmente Pagado" && sStatus === "Regularizado") isMatch = true;
                                      if (isMatch) {
                                         matches.push({
                                           name: `${s.name} ${s.lastName || ''}`,
                                           status: sStatus,
                                           balance: `$${(rule.minAmount + 350).toLocaleString()}.00`,
                                           type: "Alumno"
                                         });
                                      }
                                    });
                                  }
                                  if (rule.allowedRoles.includes("Coordinador")) {
                                    institutions.forEach(i => {
                                      const iStatus = i.status || "Pendiente";
                                      let isMatch = false;
                                      if (rule.financialState === "Pendiente" && iStatus === "Pendiente") isMatch = true;
                                      if (rule.financialState === "Atrasado" && iStatus === "Atrasado") isMatch = true;
                                      if (rule.financialState === "Vencido / Mora" && iStatus === "Atrasado") isMatch = true;
                                      if (isMatch) {
                                        matches.push({
                                          name: i.name,
                                          status: iStatus,
                                          balance: `$${(rule.minAmount + 1500).toLocaleString()}.00`,
                                          type: "Institución (Coordinador)"
                                        });
                                      }
                                    });
                                  }
                                  if (matches.length === 0) {
                                    matches.push({
                                      name: "Sofía Martínez (Simulado)",
                                      status: rule.financialState,
                                      balance: `$${(rule.minAmount + 400).toLocaleString()}.00`,
                                      type: "Alumno"
                                    });
                                  }
                                  setRuleTestedResults({
                                    ruleName: rule.name,
                                    matches: matches.slice(0, 5)
                                  });
                                  triggerToast("Test de cobro dinámico completado con éxito.");
                                }}
                                className="px-3 py-1.5 text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                              >
                                <Send className="w-3.5 h-3.5 text-indigo-600" /> Probar Consulta
                              </button>

                              <div className="flex gap-1.5 shrink-0">
                                {/* Duplicar regla */}
                                <button
                                  onClick={() => {
                                    const duplicated = {
                                      ...rule,
                                      id: `rule_${generateUniqueId()}`,
                                      name: `${rule.name} (Copia)`,
                                      enabled: false
                                    };
                                    const updated = [...customRules, duplicated];
                                    setCustomRules(updated);
                                    localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                                    triggerToast(`Regla "${rule.name}" duplicada con éxito`);
                                  }}
                                  title="Duplicar Regla"
                                  className="text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg cursor-pointer transition"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Editar regla */}
                                <button
                                  onClick={() => {
                                    setEditingRuleId(rule.id);
                                    setRuleForm({
                                      name: rule.name,
                                      financialState: rule.financialState,
                                      minAmount: rule.minAmount,
                                      allowedRoles: rule.allowedRoles,
                                      channel: rule.channel,
                                      triggerDays: rule.triggerDays,
                                      subject: rule.subject,
                                      body: rule.body
                                    });
                                    setRuleModalOpen(true);
                                  }}
                                  title="Editar Parámetros"
                                  className="text-slate-400 hover:text-indigo-650 bg-slate-100 hover:bg-indigo-50 p-1.5 rounded-lg cursor-pointer transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Eliminar regla */}
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la regla "${rule.name}"?`)) {
                                        const updated = customRules.filter(r => r.id !== rule.id);
                                        setCustomRules(updated);
                                        localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                                        triggerToast("Regla de cobro eliminada con éxito");
                                      }
                                    }}
                                    title="Eliminar regla de cobranza (Super Admin)"
                                    className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg cursor-pointer transition border border-rose-200"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal de Creación / Edición de Plantillas de Cobro */}
              {editingTemplateId && templateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                          {editingTemplateId === "new" ? "Nueva Plantilla de Cobranza" : `Campaña • ${templateForm.target}`}
                        </span>
                        <h3 className="font-bold text-base text-slate-800">
                          {editingTemplateId === "new" ? "Crear Notificación de Pago" : templateForm.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTemplateId(null);
                          setTemplateForm(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingTemplateId === "new") {
                          saveReminderTemplates([...reminderTemplates, { ...templateForm }]);
                          triggerToast("Nueva notificación de pago creada con éxito");
                        } else {
                          saveReminderTemplates(
                            reminderTemplates.map((t) =>
                              t.id === templateForm.id ? { ...templateForm } : t
                            )
                          );
                          triggerToast("Plantilla de campaña guardada con éxito");
                        }
                        setEditingTemplateId(null);
                        setTemplateForm(null);
                      }}
                      className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
                    >
                      {/* Título de la Campaña */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Título de la Notificación de Pago <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={templateForm.title}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, title: e.target.value })
                          }
                          placeholder="Ej: Recordatorio Preventivo de Mensualidad"
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Destinatario Target
                          </label>
                          <select
                            value={templateForm.target}
                            onChange={(e) =>
                              setTemplateForm({ ...templateForm, target: e.target.value })
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="Alumno">Alumno</option>
                            <option value="Institución">Institución</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Tipo de Alerta
                          </label>
                          <select
                            value={templateForm.type}
                            onChange={(e) =>
                              setTemplateForm({ ...templateForm, type: e.target.value })
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="Preventivo">Preventivo (Antes de vencer)</option>
                            <option value="Cobro Atrasado">Cobro Atrasado (Después de vencer)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            {templateForm.type === "Preventivo" ? "Días Antes del Vencimiento" : "Días Después de Vencido"}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              required
                              value={templateForm.triggerDays}
                              onChange={(e) =>
                                setTemplateForm({
                                  ...templateForm,
                                  triggerDays: Number(e.target.value)
                                })
                              }
                              className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider font-bold text-slate-400">
                              Días
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Canal de Envío</label>
                          <select
                            value={templateForm.channel}
                            onChange={(e) =>
                              setTemplateForm({ ...templateForm, channel: e.target.value })
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="Email & Push">Email & Push</option>
                            <option value="Email">Solo Email</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email & WhatsApp">Email & WhatsApp</option>
                            <option value="Email, WhatsApp & Push">Email, WhatsApp & Push</option>
                            <option value="Email & Teléfono">Email & Teléfono</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Asunto del Mensaje</label>
                        <input
                          type="text"
                          required
                          value={templateForm.subject}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, subject: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap justify-between items-center gap-1 mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cuerpo del Mensaje</label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Variables: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;nombre_alumno&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;nombre_institucion&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;monto&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;fecha_limite&#125;</code>
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          required
                          value={templateForm.body}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, body: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                      </div>

                      <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                        {isSuperAdmin && editingTemplateId !== "new" ? (
                          <button
                            type="button"
                            onClick={() => {
                              const tplId = templateForm.id;
                              const tplTitle = templateForm.title;
                              setEditingTemplateId(null);
                              setTemplateForm(null);
                              handleDeleteReminderTemplate(tplId, tplTitle);
                            }}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar Notificación
                          </button>
                        ) : <div />}
                        <div className="flex items-center gap-3 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplateId(null);
                              setTemplateForm(null);
                            }}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                          >
                            {editingTemplateId === "new" ? "Crear Notificación" : "Guardar Cambios"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal de Creación / Edición de Regla Avanzada */}
              {ruleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                          Configuración de Cobranza Avanzada
                        </span>
                        <h3 className="font-extrabold text-base text-slate-800">
                          {editingRuleId ? "Editar Parámetros de Regla" : "Definir Nueva Regla de Recordatorio"}
                        </h3>
                      </div>
                      <button
                        onClick={() => setRuleModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-150 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (ruleForm.allowedRoles.length === 0) {
                          alert("Por favor, selecciona al menos un rol de destino para filtrar.");
                          return;
                        }
                        setRuleConfirmOpen(true);
                      }}
                      className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nombre Descriptivo de la Regla <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Recordatorio Especial de Mora para Colegiaturas"
                          value={ruleForm.name}
                          onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Estado Financiero Pendiente <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={ruleForm.financialState}
                            onChange={(e) => setRuleForm({ ...ruleForm, financialState: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Atrasado">Atrasado</option>
                            <option value="Vencido / Mora">Vencido / Mora</option>
                            <option value="Parcialmente Pagado">Parcialmente Pagado</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1.5 text-slate-700">
                            Monto Mínimo de Deuda ($) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Monto mínimo para aplicar alerta"
                            value={ruleForm.minAmount}
                            onChange={(e) => setRuleForm({ ...ruleForm, minAmount: Math.max(0, Number(e.target.value)) })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Canal de Comunicación <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={ruleForm.channel}
                            onChange={(e) => setRuleForm({ ...ruleForm, channel: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="Email">Email</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Push Notification">Push Notification</option>
                            <option value="SMS">SMS / Mensaje de texto</option>
                            <option value="Llamada Automática">Llamada Automática</option>
                            <option value="WhatsApp & Push">WhatsApp & Push (Multi-canal)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Días hábiles transcurridos <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Días transcurridos"
                            value={ruleForm.triggerDays}
                            onChange={(e) => setRuleForm({ ...ruleForm, triggerDays: Math.max(0, Number(e.target.value)) })}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Filtros de roles de Destino */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Filtrar por Rol Target de Destinatario <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {["Alumno", "Coordinador", "Finanzas", "Academia", "Ventas"].map((role) => {
                            const isSelected = ruleForm.allowedRoles.includes(role);
                            return (
                              <button
                                type="button"
                                key={role}
                                onClick={() => {
                                  if (isSelected) {
                                    setRuleForm({
                                      ...ruleForm,
                                      allowedRoles: ruleForm.allowedRoles.filter(r => r !== role)
                                    });
                                  } else {
                                    setRuleForm({
                                      ...ruleForm,
                                      allowedRoles: [...ruleForm.allowedRoles, role]
                                    });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 border-indigo-755 text-white"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-708 uppercase tracking-wider mb-1.5 text-slate-700">
                          Asunto del Recordatorio <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Balance pendiente en su cuenta"
                          value={ruleForm.subject}
                          onChange={(e) => setRuleForm({ ...ruleForm, subject: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-709 uppercase tracking-wider text-slate-700">
                            Cuerpo del Mensaje de la Alerta <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            Variables válidas: <code className="bg-slate-100 text-indigo-700 px-1 rounded">&#123;monto&#125;</code> <code className="bg-slate-100 text-indigo-700 px-1 rounded">&#123;nombre_alumno&#125;</code> <code className="bg-slate-100 text-indigo-700 px-1 rounded">&#123;nombre_institucion&#125;</code>
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          required
                          placeholder="Hola {nombre_alumno}, le recordamos que presenta un estado de cuenta {estado} con un balance de {monto}..."
                          value={ruleForm.body}
                          onChange={(e) => setRuleForm({ ...ruleForm, body: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                      </div>

                      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setRuleModalOpen(false)}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-slate-650 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                        >
                          Siguiente: Definir Regla
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Confirmación de Doble Seguridad para Rules */}
              {ruleConfirmOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
                    <div className="p-5 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm uppercase">Confirmar Registro de Regla de Cobro</h4>
                        <p className="text-[10px] text-slate-500">Operación de Configuración Administrativa</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                        <p>
                          Estás a punto de aplicar la siguiente regla avanzada para los recordatorios de cobranza automática:
                        </p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-800 space-y-1">
                          <p>• <strong>Regla:</strong> {ruleForm.name}</p>
                          <p>• <strong>Estado Target:</strong> {ruleForm.financialState}</p>
                          <p>• <strong>Mora Mínima:</strong> ${Number(ruleForm.minAmount).toLocaleString()}.00</p>
                          <p>• <strong>Rol Target:</strong> {ruleForm.allowedRoles.join(", ")}</p>
                          <p>• <strong>Canal Envío:</strong> {ruleForm.channel}</p>
                        </div>
                        <p className="font-bold text-slate-805 text-slate-800">
                          ¿Deseas guardar los cambios y habilitar el monitoreo automático bajo esta regla?
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setRuleConfirmOpen(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                        >
                          No, Modificar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingRuleId) {
                              const updated = customRules.map(r => r.id === editingRuleId ? { ...ruleForm, id: editingRuleId, enabled: r.enabled } : r);
                              setCustomRules(updated);
                              localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                              setRuleSuccessBanner(`Se ha modificado con éxito la regla de cobro avanzada "${ruleForm.name}".`);
                            } else {
                              const newRuleObj = {
                                ...ruleForm,
                                id: `rule_${generateUniqueId()}`,
                                enabled: true
                              };
                              const updated = [...customRules, newRuleObj];
                              setCustomRules(updated);
                              localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                              setRuleSuccessBanner(`Se ha creado e implementado de forma exitosa la nueva regla "${ruleForm.name}".`);
                            }
                            setRuleConfirmOpen(false);
                            setRuleModalOpen(false);
                            triggerToast("Cambios confirmados y guardados de forma exitosa");
                          }}
                          className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition"
                        >
                          Sí, Confirmar y Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Respaldos" && (
            <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50">
              {/* Header de Respaldos */}
              <div className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center">
                      <Cloud className="w-5 h-5 mr-2 text-indigo-600" />
                      Respaldos de Datos y Google Drive
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Gestiona copias de seguridad automáticas programables (semanales, diarias o mensuales) y sincronízalas en Google Drive o almacenamiento local.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {driveConnectedEmail ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Drive Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Drive Desconectado
                      </span>
                    )}

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      backupSchedule.enabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {backupSchedule.enabled 
                        ? `Auto: ${backupSchedule.frequency === 'daily' ? 'Diario' : backupSchedule.frequency === 'weekly' ? 'Semanal' : backupSchedule.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}`
                        : 'Auto Desactivado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="p-6 space-y-6 max-w-5xl">
                {/* 1. Tarjeta de Conexión con Google Drive */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base">Almacenamiento en la Nube con Google Drive</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                            OAuth Seguro
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                          Conecta tu cuenta de Google para almacenar automáticamente respaldos cifrados en formato JSON dentro de tu unidad en la carpeta <strong className="text-slate-700 font-mono">IHS_Respaldos_Sistema</strong>. El alcance solicitado se limita exclusivamente a archivos creados por esta aplicación.
                        </p>

                        {driveConnectedEmail && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg w-fit">
                            <span className="text-slate-400 font-medium">Cuenta vinculada:</span>
                            <span className="font-bold text-slate-800 font-mono">{driveConnectedEmail}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Activo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
                      {!driveConnectedEmail ? (
                        <button
                          type="button"
                          disabled={isConnectingDrive}
                          onClick={async () => {
                            setIsConnectingDrive(true);
                            try {
                              const res = await connectGoogleDrive();
                              setIsDriveTokenValid(true);
                              setDriveConnectedEmail(res.user.email || null);
                              triggerToast(`Google Drive conectado con éxito (${res.user.email})`);
                              await refreshDriveFiles();
                            } catch (err: any) {
                              console.error(err);
                              triggerToast(err.message || "Error al conectar con Google Drive", "error");
                            } finally {
                              setIsConnectingDrive(false);
                            }
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition hover:shadow cursor-pointer"
                        >
                          {isConnectingDrive ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              <span>Conectando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                              <span>Conectar con Google Drive</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={refreshDriveFiles}
                            disabled={isLoadingDriveFiles}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="Recargar respaldos de Drive"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                            <span>Actualizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("¿Deseas desconectar la cuenta de Google Drive para los respaldos?")) {
                                disconnectGoogleDrive();
                                setIsDriveTokenValid(false);
                                setDriveConnectedEmail(null);
                                setDriveBackupsList([]);
                                triggerToast("Cuenta de Google Drive desconectada");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            <span>Desconectar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Programación Automática y Personalizable de Respaldos (Para Administradores) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Programación de Respaldo Periódico (Administradores)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Configura la frecuencia, día y hora en la que el sistema realizará la copia íntegra de la base de datos automáticamente.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedForm.enabled}
                        onChange={(e) => setSchedForm({ ...schedForm, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2.5 text-xs font-bold text-slate-700">
                        {schedForm.enabled ? "Respaldo Activo" : "Desactivado"}
                      </span>
                    </label>
                  </div>

                  {/* Formulario de Configuración de Programación */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${schedForm.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Frecuencia de Ejecución
                      </label>
                      <select
                        value={schedForm.frequency}
                        onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value as any })}
                        className="w-full text-xs font-bold rounded-xl border-slate-300 bg-white py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs cursor-pointer"
                      >
                        <option value="daily">Diaria (Todos los días)</option>
                        <option value="weekly">Semanal (Una vez por semana)</option>
                        <option value="biweekly">Quincenal (Cada 14 días)</option>
                        <option value="monthly">Mensual (Cada 30 días)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Día de la Semana
                      </label>
                      <select
                        disabled={schedForm.frequency === 'daily'}
                        value={schedForm.dayOfWeek}
                        onChange={(e) => setSchedForm({ ...schedForm, dayOfWeek: e.target.value })}
                        className="w-full text-xs font-bold rounded-xl border-slate-300 bg-white py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="Lunes">Lunes</option>
                        <option value="Martes">Martes</option>
                        <option value="Miércoles">Miércoles</option>
                        <option value="Jueves">Jueves</option>
                        <option value="Viernes">Viernes</option>
                        <option value="Sábado">Sábado</option>
                        <option value="Domingo">Domingo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Hora Programada
                      </label>
                      <input
                        type="time"
                        value={schedForm.timeOfDay}
                        onChange={(e) => setSchedForm({ ...schedForm, timeOfDay: e.target.value })}
                        className="w-full text-xs font-bold rounded-xl border-slate-300 bg-white py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Destino del Respaldo
                      </label>
                      <select
                        value={schedForm.destination}
                        onChange={(e) => setSchedForm({ ...schedForm, destination: e.target.value as any })}
                        className="w-full text-xs font-bold rounded-xl border-slate-300 bg-white py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-2xs cursor-pointer"
                      >
                        <option value="google_drive">Google Drive (Nube Drive)</option>
                        <option value="cloud_and_local">Google Drive + Copia Local</option>
                        <option value="local_only">Solo Archivo Local</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">Historial a retener:</span>
                      <select
                        value={schedForm.retentionCount || 10}
                        onChange={(e) => setSchedForm({ ...schedForm, retentionCount: Number(e.target.value) })}
                        className="text-xs font-bold rounded-lg border-slate-200 bg-slate-50 py-1 px-2.5 focus:ring-indigo-500 outline-none"
                      >
                        <option value={5}>Últimos 5 respaldos</option>
                        <option value={10}>Últimos 10 respaldos (Recomendado)</option>
                        <option value={20}>Últimos 20 respaldos</option>
                        <option value={50}>Últimos 50 respaldos</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        updateBackupSchedule(schedForm);
                        triggerToast("¡Programación de respaldos guardada y actualizada con éxito!");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Programación</span>
                    </button>
                  </div>

                  {/* Resumen del último respaldo */}
                  {backupSchedule.lastBackupDate && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-slate-600">
                          Último respaldo ejecutado: <strong className="text-slate-800">{new Date(backupSchedule.lastBackupDate).toLocaleString()}</strong>
                          {backupSchedule.lastBackupSize && <span className="text-slate-400 font-mono ml-1.5">({backupSchedule.lastBackupSize})</span>}
                        </span>
                      </div>

                      {backupSchedule.lastBackupDriveLink && (
                        <a
                          href={backupSchedule.lastBackupDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-[11px]"
                        >
                          <span>Ver en Google Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Panel de Acciones Manuales e Instantáneas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Respaldo Manual a Google Drive */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Respaldar en Google Drive Ahora</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                          Empaqueta toda la base de datos (instituciones, alumnos, finanzas, CRM y configuraciones) y la sube de inmediato a tu Google Drive.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isBackingUpToDrive || !driveConnectedEmail}
                        onClick={async () => {
                          if (!isGoogleDriveTokenAvailable()) {
                            triggerToast("Primero conecta tu cuenta de Google Drive para subir el respaldo", "error");
                            return;
                          }
                          setIsBackingUpToDrive(true);
                          try {
                            const res = await triggerGoogleDriveBackup('Manual');
                            triggerToast(`¡Respaldo subido a Google Drive con éxito! (${res.size})`);
                            await refreshDriveFiles();
                          } catch (err: any) {
                            console.error(err);
                            triggerToast(err.message || "Error al subir respaldo a Google Drive", "error");
                          } finally {
                            setIsBackingUpToDrive(false);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isBackingUpToDrive ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Subiendo a Google Drive...</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-4 h-4" />
                            <span>Respaldar y Subir a Google Drive</span>
                          </>
                        )}
                      </button>

                      {!driveConnectedEmail && (
                        <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium">
                          * Requiere conectar Google Drive primero en la sección superior
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Respaldo Manual Local (JSON) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Descargar Copia JSON Local</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                          Descarga un archivo JSON plano con todos los registros actuales de forma local a tu computadora.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={backupGenerating}
                        onClick={async () => {
                          setBackupGenerating(true);
                          try {
                            const result = await triggerFullBackup('Manual', false);
                            triggerToast(`Copia de seguridad descargada con éxito (${result.size})`);
                          } catch (err) {
                            triggerToast("Error al generar copia de seguridad", "error");
                          } finally {
                            setBackupGenerating(false);
                          }
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {backupGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generando Respaldo...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Respaldar y Descargar JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Explorador de Respaldos en Google Drive */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-indigo-600" />
                        <span>Respaldos Almacenados en Google Drive</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Archivos disponibles en la carpeta remota <span className="font-mono text-slate-600">IHS_Respaldos_Sistema</span> de tu cuenta.
                      </p>
                    </div>

                    {driveConnectedEmail && (
                      <button
                        type="button"
                        onClick={refreshDriveFiles}
                        disabled={isLoadingDriveFiles}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                      </button>
                    )}
                  </div>

                  {!driveConnectedEmail ? (
                    <div className="p-8 text-center space-y-2">
                      <Cloud className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Google Drive no está conectado</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Haz clic en "Conectar con Google Drive" arriba para visualizar, descargar o restaurar copias guardadas en la nube.
                      </p>
                    </div>
                  ) : isLoadingDriveFiles ? (
                    <div className="p-8 text-center space-y-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 mx-auto animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Consultando archivos en Google Drive...</p>
                    </div>
                  ) : driveBackupsList.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Cloud className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No se encontraron archivos de respaldo en Google Drive</p>
                      <p className="text-[10px] text-slate-400">
                        Haz clic en "Respaldar y Subir a Google Drive" para generar tu primer archivo en la nube.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Nombre del Archivo</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Fecha de Creación</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Tamaño</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400 text-center">Acciones en la Nube</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {driveBackupsList.map((file) => (
                            <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-bold text-slate-800 text-xs font-mono">{file.name}</div>
                                {file.description && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-md">{file.description}</div>
                                )}
                              </td>
                              <td className="px-5 py-3 text-[11px] font-semibold text-slate-600">
                                {new Date(file.createdTime).toLocaleString()}
                              </td>
                              <td className="px-5 py-3 text-[11px] font-mono text-slate-500">
                                {file.size}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {file.webViewLink && (
                                    <a
                                      href={file.webViewLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                                      title="Abrir en Google Drive"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Ver</span>
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        triggerToast("Descargando archivo desde Google Drive...");
                                        const content = await downloadGoogleDriveBackup(file.id);
                                        const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = file.name;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                        triggerToast("Descarga completada");
                                      } catch (err: any) {
                                        triggerToast(err.message || "Error al descargar desde Drive", "error");
                                      }
                                    }}
                                    className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                                    title="Descargar copia JSON a tu equipo"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Descargar</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isFetchingDriveRestore}
                                    onClick={async () => {
                                      setIsFetchingDriveRestore(true);
                                      try {
                                        triggerToast("Obteniendo respaldo desde Google Drive...");
                                        const payload = await downloadGoogleDriveBackup(file.id);
                                        setDriveFileToRestore({ file, data: payload });
                                      } catch (err: any) {
                                        triggerToast(err.message || "Error al leer respaldo de Drive", "error");
                                      } finally {
                                        setIsFetchingDriveRestore(false);
                                      }
                                    }}
                                    className="p-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                                    title="Restaurar base de datos con este respaldo"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restaurar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDriveFileToDelete(file)}
                                    className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                                    title="Eliminar archivo de Google Drive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. Restaurar Sistema desde Archivo Local (JSON) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Restaurar Sistema desde Archivo Local (JSON)</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                        Carga una copia de seguridad local (archivo en formato JSON) para restablecer todos tus datos. <span className="text-rose-600 font-bold">¡Atención! Esta acción sobrescribirá y reemplazará absolutamente todos los registros actuales en el sistema.</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div 
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-400/80 bg-slate-50 hover:bg-indigo-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200"
                      onClick={() => document.getElementById('backup-file-input')?.click()}
                    >
                      <input
                        type="file"
                        id="backup-file-input"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const parsed = JSON.parse(event.target?.result as string);
                              if (!parsed || (typeof parsed !== 'object')) {
                                triggerToast("El archivo seleccionado no es un respaldo de datos válido.", "error");
                                return;
                              }
                              setBackupRestoreFile(file);
                              setRestorePayload(parsed);
                              setIsRestoreConfirmOpen(true);
                              e.target.value = '';
                            } catch (err) {
                              triggerToast("Error al procesar el archivo JSON de respaldo.", "error");
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <Upload className="w-8 h-8 mx-auto text-indigo-500 mb-2.5 opacity-85" />
                      <p className="font-extrabold text-slate-800 text-xs">Arrastra o haz clic para seleccionar archivo JSON</p>
                      <p className="text-[10px] text-slate-400 mt-1">Soporta archivos de respaldo creados por la función de "Respaldar y Descargar JSON"</p>
                    </div>
                  </div>
                </div>

                {/* 6. Bitácora Local de Puntos de Respaldo */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Bitácora de Puntos de Respaldo Registrados</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Historial sincronizado en la nube para control administrativo.</p>
                    </div>
                  </div>

                  {backups.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Database className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No hay registros de respaldos generados todavía</p>
                      <p className="text-[10px] text-slate-400">Las copias de seguridad de datos aparecerán listadas aquí una vez generadas.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Fecha de Creación</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Tipo de Respaldo</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Registros Totales</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Peso Estimado</th>
                            <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {backups.map((bk) => (
                            <tr key={bk.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3 text-[11px] font-semibold text-slate-700">
                                {new Date(bk.date).toLocaleString()}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${bk.type === 'Automático' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                                  {bk.type}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-[11px] font-medium text-slate-600">
                                {bk.records} registros
                              </td>
                              <td className="px-5 py-3 text-[11px] font-mono text-slate-500">
                                {bk.size}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteBackup(bk.id);
                                    triggerToast("Registro de respaldo eliminado con éxito");
                                  }}
                                  className="p-1 px-2.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Borrar Log</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "MonitorBD" && (
            <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center animate-pulse">
                      <Database className="w-5 h-5 mr-2 text-indigo-600" />
                      Monitor de Acceso a Base de Datos
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Telemetría en tiempo real de operaciones de red, optimización de caché IndexedDB y estado de sincronización con Firestore.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6 max-w-5xl flex-1">
                {/* Resumen de Eficiencia */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
                    <Database className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300">Diagnóstico de Rendimiento</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ● Motor Optimizado de Red
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h2 className="text-3xl font-black font-sans tracking-tight">
                          {((dbMetrics.readsCached + dbMetrics.savesBypassed) / Math.max(1, dbMetrics.readsTotal + dbMetrics.savesBypassed) * 100).toFixed(1)}%
                        </h2>
                        <p className="text-xs font-semibold text-indigo-200 mt-1 uppercase tracking-wider">Eficiencia de Tráfico Salvado</p>
                        <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-normal">
                          Nuestra arquitectura local intercepta lecturas repetidas e ignora escrituras redundantes, protegiendo las cuotas de Firestore de forma automática.
                        </p>
                      </div>
                      <div className="border-l border-white/10 pl-6 space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Caché Local Segura (Anti-Quota RAM):</span>
                          <span className="font-mono font-bold text-emerald-300">ACTIVO</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Bypass de Escrituras Redundantes:</span>
                          <span className="font-mono font-bold text-indigo-300">HABILITADO</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Lotes de Escritura Atómica (max 500):</span>
                          <span className="font-mono font-bold text-indigo-300">HABILITADO</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de Métricas de Operación */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Lecturas de Caché</span>
                    <span className="text-xl font-bold text-slate-800 font-mono block">{dbMetrics.readsCached}</span>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline shrink-0" />
                      0% impacto de cuota
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Lecturas de Servidor</span>
                    <span className="text-xl font-bold text-indigo-600 font-mono block">{dbMetrics.readsServer}</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-tight">
                      Llamadas reales de red realizadas a la nube.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-xl font-bold text-slate-800 font-mono block">
                      {dbMetrics.writesTotal} <span className="text-xs font-normal text-slate-400">({dbMetrics.writesBatched} lotes)</span>
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mt-1">Escrituras Ejecutadas</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-tight">
                      Sincronizadas de forma atómica en bloques.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Evitadas por Checksum</span>
                    <span className="text-xl font-bold text-slate-800 font-mono block">{dbMetrics.savesBypassed}</span>
                    <p className="text-[10px] text-indigo-600 font-bold mt-1.5">
                      Peticiones redundantes bloqueadas
                    </p>
                  </div>
                </div>

                {/* Detalles de la Sincronización de Colecciones */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Estado de Colecciones Sincronizadas</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Control de documentos y latencia por cada tabla de datos en el sistema.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetDbMetrics}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer"
                      >
                        Reiniciar Contador
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Colección</th>
                          <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Documentos</th>
                          <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400">Última Sincronización</th>
                          <th className="px-5 py-3 text-[9px] uppercase tracking-wider font-bold text-slate-400 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(dbMetrics.activeCollectionSyncs).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-xs font-bold text-slate-400">
                              Iniciando monitor... Genera interacciones o navega por el sistema para registrar lecturas y escrituras.
                            </td>
                          </tr>
                        ) : (
                          Object.entries(dbMetrics.activeCollectionSyncs).map(([name, status]: [string, any]) => (
                            <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-2.5 text-[11px] font-bold text-slate-700 font-mono">
                                {name}
                              </td>
                              <td className="px-5 py-2.5 text-[11px] font-medium text-slate-600 font-mono">
                                {status.docCount} docs
                              </td>
                              <td className="px-5 py-2.5 text-[11px] text-slate-500 font-mono">
                                {status.lastSynced}
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  status.status === 'synced' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  status.status === 'syncing' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {status.status === 'synced' ? 'Sincronizado' : status.status === 'syncing' ? 'Sincronizando' : 'Error'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Diagnósticos del Estado del Sistema */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detalles Técnicos y Estado de Cuotas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Cuota del Servidor:</span>
                        {typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__ ? (
                          <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px]">EXCEDIDA (Modo Local-Only)</span>
                        ) : (
                          <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">SALDO SEGURO</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ID del Proyecto:</span>
                        <span className="font-mono font-bold text-slate-700 font-mono">ai-studio-6f563df9</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Modo de Caché Local:</span>
                        <span className="font-bold text-indigo-600">Memoria Segura (Anti-Cuota)</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Última Operación:</span>
                        <span className="font-mono font-bold text-slate-800">{dbMetrics.lastOperationTime || 'Ninguna registrada'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Tipo:</span>
                        <span className="font-bold text-slate-600 font-mono text-[10px] uppercase">{dbMetrics.lastOperationType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Estado de Transmisión:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          dbMetrics.lastOperationStatus === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' :
                          dbMetrics.lastOperationStatus === 'ERROR' ? 'text-rose-700 bg-rose-50 border border-rose-100' :
                          'text-slate-500 bg-slate-50'
                        }`}>{dbMetrics.lastOperationStatus || 'STANDBY'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "SLA" && (
            <div className="flex-1 overflow-auto bg-slate-50 relative p-6">
              <div className="max-w-6xl mx-auto pb-12 space-y-6">
                
                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">Acuerdos de Nivel de Servicio (SLA)</h2>
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-indigo-100 text-indigo-700">
                            Multimódulo
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                          Define y calibra los tiempos máximos tolerables de atención, semáforos de inactividad y políticas de escalamiento automático para los flujos operativos de <strong className="text-slate-700">CRM & Prospectos</strong>, <strong className="text-slate-700">Instituciones Socias</strong> y <strong className="text-slate-700">Alumnos</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetSlaDefaults}
                        className="inline-flex items-center px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-xs"
                        title="Restaura y sincroniza los SLAs recomendados de fábrica para los 3 módulos"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Restablecer Recomendados
                      </button>

                      <div className="relative inline-flex items-center">
                        <button
                          type="button"
                          onClick={handleExportSlaMatrixCSV}
                          className="inline-flex items-center px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-l-xl transition shadow-xs"
                          title="Descargar matriz completa en formato CSV"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          CSV
                        </button>
                        <button
                          type="button"
                          onClick={handleExportSlaMatrixPDF}
                          className="inline-flex items-center px-3 py-2 text-xs font-bold text-slate-700 bg-white border-t border-b border-r border-slate-200 hover:bg-slate-50 rounded-r-xl transition shadow-xs"
                          title="Generar vista para imprimir / guardar PDF"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          PDF
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateSla(slaModuleTab === "todos" ? "crm" : slaModuleTab)}
                        className="inline-flex items-center px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Nueva Regla SLA
                      </button>
                    </div>
                  </div>

                  {/* Operational KPI Metric Strip */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total SLAs</span>
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xl font-black text-slate-800">{normalizedSlaList.length}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Reglas parametrizadas</div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                      <div className="flex items-center justify-between text-indigo-500 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">CRM / Leads</span>
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xl font-black text-indigo-900">
                        {normalizedSlaList.filter(s => s.module === 'crm').length}
                      </div>
                      <div className="text-[10px] text-indigo-600/80 font-medium">Fases de prospección</div>
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                      <div className="flex items-center justify-between text-emerald-600 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Instituciones</span>
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xl font-black text-emerald-900">
                        {normalizedSlaList.filter(s => s.module === 'instituciones').length}
                      </div>
                      <div className="text-[10px] text-emerald-700/80 font-medium">Convenios y sedes</div>
                    </div>

                    <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3">
                      <div className="flex items-center justify-between text-sky-600 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Alumnos</span>
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xl font-black text-sky-900">
                        {normalizedSlaList.filter(s => s.module === 'alumnos').length}
                      </div>
                      <div className="text-[10px] text-sky-700/80 font-medium">Académico y kárdex</div>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 col-span-2 md:col-span-1">
                      <div className="flex items-center justify-between text-rose-500 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Críticos (≤3d)</span>
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xl font-black text-rose-800">
                        {normalizedSlaList.filter(s => s.priority === 'alta' || (s.slaDays !== null && s.slaDays <= 3)).length}
                      </div>
                      <div className="text-[10px] text-rose-600/80 font-medium">Atención inmediata</div>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Module Filter Tabs */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSlaModuleTab("todos")}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition ${
                        slaModuleTab === "todos"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>Todos los Módulos</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${slaModuleTab === "todos" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
                        {normalizedSlaList.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlaModuleTab("crm")}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition ${
                        slaModuleTab === "crm"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                      <span>CRM & Prospectos</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${slaModuleTab === "crm" ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-600"}`}>
                        {normalizedSlaList.filter(s => s.module === 'crm').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlaModuleTab("instituciones")}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition ${
                        slaModuleTab === "instituciones"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                      <span>Instituciones Socias</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${slaModuleTab === "instituciones" ? "bg-emerald-700 text-emerald-100" : "bg-slate-100 text-slate-600"}`}>
                        {normalizedSlaList.filter(s => s.module === 'instituciones').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlaModuleTab("alumnos")}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition ${
                        slaModuleTab === "alumnos"
                          ? "bg-sky-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                      <span>Alumnos & Académico</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${slaModuleTab === "alumnos" ? "bg-sky-700 text-sky-100" : "bg-slate-100 text-slate-600"}`}>
                        {normalizedSlaList.filter(s => s.module === 'alumnos').length}
                      </span>
                    </button>
                  </div>

                  {/* Active Context Helper */}
                  <div className="text-right px-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Mostrando {normalizedSlaList.filter(s => {
                        if (slaModuleTab !== "todos" && s.module !== slaModuleTab) return false;
                        if (slaPriorityFilter !== "todas" && s.priority !== slaPriorityFilter) return false;
                        if (slaStatusFilter === "activos" && s.isActive === false) return false;
                        if (slaStatusFilter === "pausados" && s.isActive !== false) return false;
                        if (slaSearchQuery.trim()) {
                          const q = slaSearchQuery.toLowerCase();
                          return (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.responsibleRole || '').toLowerCase().includes(q);
                        }
                        return true;
                      }).length} de {normalizedSlaList.length} reglas
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={slaSearchQuery}
                        onChange={(e) => setSlaSearchQuery(e.target.value)}
                        placeholder="Buscar por fase, criterio o rol responsable..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400 bg-slate-50/50"
                      />
                      {slaSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSlaSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <div className="relative">
                        <select
                          value={slaPriorityFilter}
                          onChange={(e) => setSlaPriorityFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50"
                        >
                          <option value="todas">Todas las prioridades</option>
                          <option value="alta">Prioridad Alta / Crítica</option>
                          <option value="media">Prioridad Normal / Media</option>
                          <option value="baja">Prioridad Baja / Informativa</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <select
                        value={slaStatusFilter}
                        onChange={(e) => setSlaStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50"
                      >
                        <option value="todos">Todos los estados</option>
                        <option value="activos">Solo Reglas Activas</option>
                        <option value="pausados">Solo Reglas Pausadas</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateSla(slaModuleTab === "todos" ? "crm" : slaModuleTab)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Añadir en {slaModuleTab === "instituciones" ? "Inst." : slaModuleTab === "alumnos" ? "Alum." : "CRM"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main SLA Rules Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-4">Fase / Proceso Operativo</th>
                          <th className="py-3.5 px-3">Módulo</th>
                          <th className="py-3.5 px-3 text-center">Límite SLA</th>
                          <th className="py-3.5 px-3">Prioridad</th>
                          <th className="py-3.5 px-3">Área / Rol Responsable</th>
                          <th className="py-3.5 px-3">Acción al Vencer</th>
                          <th className="py-3.5 px-3 text-center">Estado</th>
                          <th className="py-3.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {normalizedSlaList
                          .filter(s => {
                            if (slaModuleTab !== "todos" && s.module !== slaModuleTab) return false;
                            if (slaPriorityFilter !== "todas" && s.priority !== slaPriorityFilter) return false;
                            if (slaStatusFilter === "activos" && s.isActive === false) return false;
                            if (slaStatusFilter === "pausados" && s.isActive !== false) return false;
                            if (slaSearchQuery.trim()) {
                              const q = slaSearchQuery.toLowerCase();
                              return (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.responsibleRole || '').toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .map((item) => {
                            const isCrm = item.module === "crm";
                            const isInst = item.module === "instituciones";
                            const isAlum = item.module === "alumnos";

                            return (
                              <tr 
                                key={item.id} 
                                className={`hover:bg-slate-50/70 transition-colors ${item.isActive === false ? "opacity-60 bg-slate-50/30" : ""}`}
                              >
                                {/* Fase y Criterio */}
                                <td className="py-3.5 px-4 max-w-xs">
                                  <div className="flex items-start space-x-2.5">
                                    <div className="mt-0.5">
                                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                        <span>{item.name}</span>
                                        <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                          {item.id}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                        {item.description || "Sin descripción de proceso"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Módulo */}
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  {isCrm && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      <Users className="w-3 h-3 mr-1 text-indigo-500" />
                                      CRM Leads
                                    </span>
                                  )}
                                  {isInst && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Building className="w-3 h-3 mr-1 text-emerald-600" />
                                      Institución
                                    </span>
                                  )}
                                  {isAlum && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                      <GraduationCap className="w-3 h-3 mr-1 text-sky-600" />
                                      Alumno
                                    </span>
                                  )}
                                </td>

                                {/* Límite SLA con botones rápidos */}
                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                  {item.slaDays !== null && item.slaDays !== undefined ? (
                                    <div className="inline-flex items-center space-x-1.5 bg-amber-50/70 border border-amber-200 rounded-lg px-2 py-1 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickDaysUpdate(item, -1)}
                                        title="Reducir en 1 día"
                                        className="w-5 h-5 flex items-center justify-center rounded text-amber-700 hover:bg-amber-200 font-black text-xs transition"
                                      >
                                        -
                                      </button>
                                      <span className="font-black text-amber-900 text-xs px-1">
                                        ⏱️ {item.slaDays} {item.slaDays === 1 ? 'día' : 'días'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickDaysUpdate(item, 1)}
                                        title="Aumentar en 1 día"
                                        className="w-5 h-5 flex items-center justify-center rounded text-amber-700 hover:bg-amber-200 font-black text-xs transition"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                      Sin límite
                                    </span>
                                  )}
                                </td>

                                {/* Prioridad */}
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  {item.priority === 'alta' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                                      Alta / Crítica
                                    </span>
                                  ) : item.priority === 'baja' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                                      Baja
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                                      Normal
                                    </span>
                                  )}
                                </td>

                                {/* Responsable */}
                                <td className="py-3.5 px-3">
                                  <div className="font-bold text-slate-700 text-xs truncate max-w-[130px]" title={item.responsibleRole}>
                                    {item.responsibleRole || "Operaciones"}
                                  </div>
                                </td>

                                {/* Acción al Vencer */}
                                <td className="py-3.5 px-3">
                                  <div className="space-y-1 max-w-[210px]">
                                    {item.actionOnAlert === "Enviar correo a contacto" ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                                          <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                          <span className="truncate">Enviar correo</span>
                                        </div>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-bold block truncate" title={item.emailTemplateTitle || item.emailTemplateId || "Plantilla SLA"}>
                                          📄 {item.emailTemplateTitle || item.emailTemplateId || "Recordatorio SLA"}
                                        </span>
                                      </div>
                                    ) : item.actionOnAlert === "Mover a otra etapa" ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                                          <ArrowRightCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>Mover a otra etapa</span>
                                        </div>
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-mono font-bold block truncate" title={item.targetStage || "Futuro"}>
                                          Etapa: {item.targetStage || "Futuro"}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] font-semibold text-slate-700 truncate" title={item.actionOnAlert}>
                                        {item.actionOnAlert || "Alerta en Dashboard"}
                                      </div>
                                    )}

                                    {/* Segunda acción encadenada si existe */}
                                    {item.hasSecondaryAction && item.secondaryAction && (
                                      <div className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md" title={`Acción Adicional: ${item.secondaryAction}`}>
                                        <Zap className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                        <span className="truncate">
                                          + {item.secondaryAction === "Mover a otra etapa" ? `Mover a ${item.secondaryTargetStage || 'otra etapa'}` : item.secondaryAction === "Enviar correo" ? `Correo (${item.secondaryEmailTemplateTitle || 'Plantilla'})` : item.secondaryAction}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Estado Activo / Pausado */}
                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlaActive(item)}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold transition cursor-pointer ${
                                      item.isActive !== false
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                        : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isActive !== false ? "bg-emerald-500" : "bg-slate-400"}`} />
                                    {item.isActive !== false ? "Activo" : "Pausado"}
                                  </button>
                                </td>

                                {/* Acciones */}
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSla(item)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                      title="Editar configuración de SLA"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSla(item)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Eliminar regla SLA"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                        {normalizedSlaList.filter(s => {
                          if (slaModuleTab !== "todos" && s.module !== slaModuleTab) return false;
                          if (slaPriorityFilter !== "todas" && s.priority !== slaPriorityFilter) return false;
                          if (slaStatusFilter === "activos" && s.isActive === false) return false;
                          if (slaStatusFilter === "pausados" && s.isActive !== false) return false;
                          if (slaSearchQuery.trim()) {
                            const q = slaSearchQuery.toLowerCase();
                            return (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.responsibleRole || '').toLowerCase().includes(q);
                          }
                          return true;
                        }).length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Clock className="w-8 h-8 text-slate-300" />
                                <div className="text-sm font-bold text-slate-600">No se encontraron acuerdos SLA coincidentes</div>
                                <p className="text-xs text-slate-400 max-w-sm">
                                  Prueba ajustando el término de búsqueda o cambia el filtro de módulo o prioridad.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Interactive SLA Semaphor Simulator Sandbox */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">Simulador y Verificador de Semáforos SLA</h3>
                        <p className="text-xs text-slate-500">Prueba cómo responde el algoritmo de inactividad según los días transcurridos sin atención.</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Modo Diagnóstico
                    </span>
                  </div>

                  {(() => {
                    const activeRule = normalizedSlaList.find(s => s.id === slaSimulatorSelectedId) || normalizedSlaList[0];
                    const limit = (activeRule && activeRule.slaDays !== null && activeRule.slaDays !== undefined) ? activeRule.slaDays : 3;
                    
                    let simStatus: 'en_tiempo' | 'por_vencer' | 'vencido' = 'en_tiempo';
                    let overdue = 0;
                    if (slaSimulatorDays > limit) {
                      simStatus = 'vencido';
                      overdue = slaSimulatorDays - limit;
                    } else if (slaSimulatorDays >= Math.max(1, Math.floor(limit * 0.65))) {
                      simStatus = 'por_vencer';
                    } else {
                      simStatus = 'en_tiempo';
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
                        {/* Selector de Regla y Slider de Días */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Fase o Proceso a Simular
                            </label>
                            <select
                              value={slaSimulatorSelectedId || activeRule?.id || ""}
                              onChange={(e) => setSlaSimulatorSelectedId(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                            >
                              {normalizedSlaList.map(s => (
                                <option key={s.id} value={s.id}>
                                  [{s.module?.toUpperCase()}] {s.name} ({s.slaDays ? `${s.slaDays}d` : 'Sin límite'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Días Inactivo Transcurridos
                              </label>
                              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                {slaSimulatorDays} {slaSimulatorDays === 1 ? 'día' : 'días'}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(30, limit * 2)}
                              value={slaSimulatorDays}
                              onChange={(e) => setSlaSimulatorDays(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                              <span>0 días</span>
                              <span>SLA Límite: {limit}d</span>
                              <span>{Math.max(30, limit * 2)} días</span>
                            </div>
                          </div>
                        </div>

                        {/* Vista previa de la Tarjeta de Semáforo */}
                        <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Resultado Calculado en Tiempo Real:
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-900 text-sm">{activeRule?.name}</span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {activeRule?.module}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Límite acordado: <strong className="text-slate-700">{limit} días</strong> • Responsable: <strong className="text-slate-700">{activeRule?.responsibleRole}</strong>
                              </p>
                            </div>

                            <div className="flex flex-col items-start sm:items-end space-y-1 shrink-0">
                              {simStatus === 'vencido' ? (
                                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                                  Inactiva ({slaSimulatorDays}d / {limit}d - {overdue}d retraso)
                                </div>
                              ) : simStatus === 'por_vencer' ? (
                                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                  Por vencer ({slaSimulatorDays}d / {limit}d)
                                </div>
                              ) : (
                                <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                  Al día ({slaSimulatorDays}d / {limit}d)
                                </div>
                              )}

                              <div className="text-[10px] text-right font-medium text-slate-500 space-y-0.5">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <span className="font-bold text-slate-700">Acción:</span>
                                  <span>{activeRule?.actionOnAlert || 'Alerta en Dashboard'}</span>
                                  {activeRule?.actionOnAlert === "Enviar correo a contacto" && (activeRule.emailTemplateTitle || activeRule.emailTemplateId) && (
                                    <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded text-[9px] font-mono">
                                      {activeRule.emailTemplateTitle || activeRule.emailTemplateId}
                                    </span>
                                  )}
                                  {activeRule?.actionOnAlert === "Mover a otra etapa" && activeRule.targetStage && (
                                    <span className="bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                                      {activeRule.targetStage}
                                    </span>
                                  )}
                                </div>
                                {activeRule?.hasSecondaryAction && activeRule.secondaryAction && (
                                  <div className="flex items-center justify-end gap-1 text-emerald-700 text-[9.5px] font-bold">
                                    <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>+ {activeRule.secondaryAction === "Mover a otra etapa" ? `Mover a ${activeRule.secondaryTargetStage || 'otra etapa'}` : activeRule.secondaryAction === "Enviar correo" ? `Correo: ${activeRule.secondaryEmailTemplateTitle || 'Plantilla'}` : activeRule.secondaryAction}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUserSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email <span className="text-rose-500">*</span></label>
                  <input 
                    type="email" 
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rol de Sistema <span className="text-rose-500">*</span></label>
                  <select 
                    required
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setUserForm({
                        ...userForm,
                        role: newRole,
                        studentId: newRole === 'Alumno' ? (students[0]?.id || undefined) : undefined,
                        institutionId: newRole === 'Coordinador' ? (institutions[0]?.id || undefined) : undefined,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                  >
                    <option value="" disabled>Selecciona un rol...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Equipo de Trabajo (Opcional)</label>
                  <select 
                    value={userForm.teamId || ''}
                    onChange={(e) => setUserForm({...userForm, teamId: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                  >
                    <option value="">Sin equipo asignado</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>👥 {t.name}</option>
                    ))}
                  </select>
                </div>

                {userForm.role === 'Alumno' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Asociar al Alumno <span className="text-rose-500">*</span></label>
                    <select 
                      required
                      value={userForm.studentId || ''}
                      onChange={(e) => setUserForm({...userForm, studentId: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="" disabled>Selecciona un alumno...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {userForm.role === 'Coordinador' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Asociar a la Institución <span className="text-rose-500">*</span></label>
                    <select 
                      required
                      value={userForm.institutionId || ''}
                      onChange={(e) => setUserForm({...userForm, institutionId: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="" disabled>Selecciona una institución...</option>
                      {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingUserId && (
                  <div className="flex items-start bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-4">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        id="autoGeneratePassword"
                        type="checkbox"
                        checked={autoGeneratePassword}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoGeneratePassword(val);
                          if (val) {
                            setRequirePasswordChange(true);
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs">
                      <label htmlFor="autoGeneratePassword" className="font-bold text-slate-800 cursor-pointer">
                        Generar contraseña automáticamente
                      </label>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        El sistema generará una clave aleatoria provisional (ej: IHS-K8AJ) y obligará al usuario a cambiarla en su primer acceso.
                      </p>
                    </div>
                  </div>
                )}

                {/* Custom password field if not auto-generating or when editing */}
                {(!autoGeneratePassword || editingUserId) && (
                  <div className="space-y-1.5 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {editingUserId ? "Establecer Nueva Contraseña" : "Contraseña Personalizada"} {!editingUserId && <span className="text-rose-500">*</span>}
                    </label>
                    <input 
                      type="text"
                      required={!editingUserId}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      placeholder={editingUserId ? "Dejar vacío para no modificar contraseña" : "Ingresa contraseña para el usuario"}
                    />
                  </div>
                )}

                {/* Additional Access Security Options */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 mt-4 space-y-3">
                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Configuración de Seguridad en Primer Acceso</h5>
                  
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={requirePasswordChange}
                      disabled={!editingUserId && autoGeneratePassword} // Forced to true if auto-generated
                      onChange={(e) => setRequirePasswordChange(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5 disabled:opacity-55"
                    />
                    <div>
                      <span>Forzar cambio de contraseña en primer ingreso</span>
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">El usuario deberá actualizar su clave antes de ver el panel administrativo.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 pt-1 border-t border-slate-100">
                    <input
                      type="checkbox"
                      checked={requireEmailVerification}
                      onChange={(e) => setRequireEmailVerification(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span>Requerir confirmar/verificar correo electrónico</span>
                      <p className="text-[10px] font-normal text-slate-400 mt-0.5">Si ingresa por credenciales o por OTP, se le enviará un código para confirmar que el buzón es real.</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  {editingUserId ? 'Guardar Cambios' : 'Añadir Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedPassInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <Key className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">¡Contraseña Inicial Generada!</h3>
            <p className="text-xs text-slate-500 mb-4 px-1">
              Las credenciales temporales están listas. Puedes enviarlas directamente o copiarlas para compartirlas por cualquier medio.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Usuario / Correo:</span>
                <span className="text-xs font-bold text-slate-700 block select-all font-mono break-all">{generatedPassInfo.email}</span>
              </div>
              <div className="relative">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Contraseña Temporal:</span>
                <div className="flex items-center justify-between mt-1 bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-sm font-black text-slate-800 font-mono tracking-wider select-all">{generatedPassInfo.pass}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassInfo.pass);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`p-1.5 rounded-md transition-colors ${copied ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    title="Copiar contraseña"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  const fullText = `Acceso al Sistema IHS\nPortal: ${window.location.origin}\nUsuario: ${generatedPassInfo.email}\nContraseña Provisional: ${generatedPassInfo.pass}`;
                  navigator.clipboard.writeText(fullText);
                  triggerToast("¡Credenciales completas copiadas al portapapeles!");
                }}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Todo</span>
              </button>
              
              <a
                href={`mailto:${encodeURIComponent(generatedPassInfo.email)}?subject=${encodeURIComponent("Tus credenciales de acceso para IHS")}&body=${encodeURIComponent(`Hola,\n\nSe ha creado tu cuenta en el sistema de IHS.\n\nAquí tienes tus credenciales provisionales para ingresar:\n• Portal: ${window.location.origin}\n• Correo: ${generatedPassInfo.email}\n• Contraseña temporal: ${generatedPassInfo.pass}\n\nSaludos,\nEquipo IHS`)}`}
                className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 text-center"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Abrir en mi Correo</span>
              </a>
            </div>

            {/* SMTP Sending Section */}
            <div className="mb-5">
              {credentialsEmailResult ? (
                <div className={`p-3 rounded-xl text-xs font-semibold text-left flex items-start gap-2 ${credentialsEmailResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                  {credentialsEmailResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />}
                  <span>{credentialsEmailResult.msg}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSendingCredentialsEmail}
                  onClick={handleSendCredentialsEmail}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSendingCredentialsEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Despachando correo...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar por Servidor de Correo (SMTP)</span>
                    </>
                  )}
                </button>
              )}
            </div>
 
            <button
              type="button"
              onClick={() => {
                setGeneratedPassInfo(null);
                setCredentialsEmailResult(null);
                setIsUserModalOpen(false);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-slate-800/10"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      )}

      {isWelcomeEmailModalOpen && selectedUserForEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">
                  Enviar Correo de Bienvenida
                </h3>
              </div>
              <button 
                onClick={() => setIsWelcomeEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Destinatario:</span>
                  <span className="text-xs font-bold text-slate-700 block">{selectedUserForEmail.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Correo Electrónico:</span>
                  <span className="text-xs font-mono font-semibold text-slate-600 block break-all">{selectedUserForEmail.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contraseña Provisional a Incluir
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={welcomePasswordToInclude}
                    onChange={(e) => {
                      const newPass = e.target.value;
                      setWelcomePasswordToInclude(newPass);
                      
                      // Regenerate body dynamically
                      const updatedBody = `Hola ${selectedUserForEmail.name || "Usuario"},\n\nTe damos una cordial bienvenida al sistema de IHS (Instituto de Humanidades y Ciencias).\n\nSe ha configurado tu acceso para tu primer ingreso con las siguientes credenciales:\n• Portal: ${window.location.origin}\n• Correo electrónico: ${selectedUserForEmail.email}\n• Contraseña provisional: ${newPass}\n\nPor favor, ingresa a la plataforma utilizando el enlace anterior.\n\nNota: Por motivos de seguridad, te sugerimos actualizar tu contraseña después de tu primer ingreso en la sección de Perfil/Configuración.\n\nSaludos cordiales,\nEquipo IHS`;
                      setWelcomeEmailBody(updatedBody);
                    }}
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="Contraseña del usuario"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                      let randomPart = '';
                      for (let i = 0; i < 4; i++) {
                        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      const generated = `IHS-${randomPart}`;
                      setWelcomePasswordToInclude(generated);
                      
                      const updatedBody = `Hola ${selectedUserForEmail.name || "Usuario"},\n\nTe damos una cordial bienvenida al sistema de IHS (Instituto de Humanidades y Ciencias).\n\nSe ha configurado tu acceso para tu primer ingreso con las siguientes credenciales:\n• Portal: ${window.location.origin}\n• Correo electrónico: ${selectedUserForEmail.email}\n• Contraseña provisional: ${generated}\n\nPor favor, ingresa a la plataforma utilizando el enlace anterior.\n\nNota: Por motivos de seguridad, te sugerimos actualizar tu contraseña después de tu primer ingreso en la sección de Perfil/Configuración.\n\nSaludos cordiales,\nEquipo IHS`;
                      setWelcomeEmailBody(updatedBody);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0"
                    title="Generar nueva clave"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Generar Clave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Asunto del Correo</label>
                <input 
                  type="text" 
                  value={welcomeEmailSubject}
                  onChange={(e) => setWelcomeEmailSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mensaje de Bienvenida</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(welcomeEmailBody);
                        setCopiedWelcomeBody(true);
                        setTimeout(() => setCopiedWelcomeBody(false), 2000);
                        triggerToast("¡Cuerpo del mensaje copiado!");
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      {copiedWelcomeBody ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWelcomeBody ? "Copiado" : "Copiar Texto"}</span>
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(selectedUserForEmail.email)}?subject=${encodeURIComponent(welcomeEmailSubject)}&body=${encodeURIComponent(welcomeEmailBody)}`}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Abrir en mi Correo</span>
                    </a>
                  </div>
                </div>
                <textarea 
                  value={welcomeEmailBody}
                  onChange={(e) => setWelcomeEmailBody(e.target.value)}
                  rows={6}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm resize-none whitespace-pre-wrap leading-relaxed"
                />
              </div>

              {welcomeEmailResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${welcomeEmailResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {welcomeEmailResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span>{welcomeEmailResult.msg}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <a
                href={`mailto:${encodeURIComponent(selectedUserForEmail.email)}?subject=${encodeURIComponent(welcomeEmailSubject)}&body=${encodeURIComponent(welcomeEmailBody)}`}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Abrir en Aplicación de Correo</span>
              </a>

              <div className="flex space-x-2">
                <button 
                  type="button"
                  disabled={isSendingWelcomeEmail}
                  onClick={() => setIsWelcomeEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cerrar
                </button>
                <button 
                  type="button"
                  disabled={isSendingWelcomeEmail}
                  onClick={handleSendWelcomeEmail}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingWelcomeEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar vía SMTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                Nuevo Rol
              </h3>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRole} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Rol <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="Ej. Marketing"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Crear Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                Subir Documento
              </h3>
              <button 
                onClick={() => {
                  setDocModalOpen(false);
                  setSelectedDocFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDocSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Origen del Documento</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDocUploadType("file")}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                        docUploadType === "file" 
                          ? "bg-white text-indigo-950 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Subir archivo (.pdf, .png, .jpg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocUploadType("url")}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                        docUploadType === "url" 
                          ? "bg-white text-indigo-950 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Enlace / URL de Internet
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Documento <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    placeholder="Ej. Acta Constitutiva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Fecha del Doc.</label>
                    <input 
                      type="date"
                      value={newDoc.date}
                      onChange={(e) => setNewDoc({ ...newDoc, date: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm md:text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Vigencia</label>
                    <input 
                      type="date"
                      value={newDoc.validity}
                      onChange={(e) => setNewDoc({ ...newDoc, validity: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm md:text-xs"
                    />
                  </div>
                </div>
                {docUploadType === "url" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">URL del Archivo <span className="text-rose-500">*</span></label>
                    <input 
                      type="url" 
                      required
                      value={newDoc.url}
                      onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                      placeholder="https://ejemplo.com/documento.pdf"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Archivo Adjunto <span className="text-rose-500">*</span></label>
                    {selectedDocFile ? (
                      <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="p-2 bg-indigo-100 text-indigo-700-600 rounded-lg shrink-0">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{selectedDocFile.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{(selectedDocFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDocFile(null)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-750 bg-red-105 border border-red-200 rounded px-2.5 py-1.5 transition ml-3 cursor-pointer shrink-0"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="file" 
                        required
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedDocFile(file);
                            if (!newDoc.name) {
                              const idx = file.name.lastIndexOf('.');
                              const baseName = idx !== -1 ? file.name.substring(0, idx) : file.name;
                              setNewDoc({ ...newDoc, name: baseName });
                            }
                          }
                        }}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white font-mono"
                      />
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setDocModalOpen(false);
                    setSelectedDocFile(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Guardar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Visualizar Documento de la Empresa */}
      {viewingCompanyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white rounded-2xl w-full ${
            viewingCompanyDoc.fileData?.startsWith('data:application/pdf') || viewingCompanyDoc.url?.toLowerCase().endsWith('.pdf') ? 'max-w-4xl' : 'max-w-xl'
          } shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-700`}>
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                Visualizador de Documentos de Empresa
              </h3>
              <button 
                onClick={() => setViewingCompanyDoc(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-3 text-xs">
                <FileText className="w-10 h-10 text-indigo-500 shrink-0 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-slate-900 truncate text-sm">{viewingCompanyDoc.name}</h5>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingCompanyDoc.fileName || 'Enlace Externo'}</p>
                  <div className="flex space-x-4 mt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Fecha: {viewingCompanyDoc.date || 'Sin Fecha'}</span>
                    <span>Vigencia: {viewingCompanyDoc.validity || 'Sin Límite'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[300px]">
                {viewingCompanyDoc.fileData?.startsWith('data:image/') || viewingCompanyDoc.url?.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                  <img src={viewingCompanyDoc.fileData || viewingCompanyDoc.url} alt={viewingCompanyDoc.name} className="max-h-[350px] object-contain rounded hover:scale-101 transition p-2" referrerPolicy="no-referrer" />
                ) : viewingCompanyDoc.fileData?.startsWith('data:application/pdf') || viewingCompanyDoc.url?.toLowerCase().endsWith('.pdf') ? (() => {
                  const companyPdfUrl = activeCompanyPdfUrl || viewingCompanyDoc.fileData || viewingCompanyDoc.url;
                  return (
                    <div className="w-full flex flex-col space-y-3">
                      {/* Barra de herramientas para asegurar que visualicen el PDF si el iframe se bloquea */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm text-xs">
                        <div className="flex items-center space-x-2.5 text-left">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">Previsualizador de PDF</p>
                            <p className="text-[10px] text-slate-400">Si el visor no carga en tu dispositivo, haz clic en el botón de la derecha para abrirlo.</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          {companyPdfUrl && (
                            <a 
                              href={companyPdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold transition flex items-center space-x-1 border border-indigo-200"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span>Pantalla Completa</span>
                            </a>
                          )}
                          <button 
                            type="button" 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = companyPdfUrl;
                              link.download = viewingCompanyDoc.fileName || viewingCompanyDoc.name + '.pdf';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition flex items-center space-x-1 border border-slate-200"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Descargar</span>
                          </button>
                        </div>
                      </div>

                      {/* Visor integrado confiable con etiqueta object y fallback iframe */}
                      <div className="w-full h-[550px] rounded-lg border border-slate-250 overflow-hidden bg-white shadow-inner relative">
                        <object
                          data={companyPdfUrl}
                          type="application/pdf"
                          className="w-full h-full border-0"
                        >
                          <iframe
                            src={companyPdfUrl}
                            className="w-full h-full border-0"
                            title={`PDF ${viewingCompanyDoc.name}`}
                          />
                        </object>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-10 flex flex-col items-center justify-center space-y-3">
                    <svg className="w-12 h-12 text-slate-300" xmlns="http://www.w3.org/2050/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-bold text-slate-600">Previsualización Segura</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">El visualizador soporta imágenes cargadas o enlaces directos a documentos PDF.</p>
                      {viewingCompanyDoc.url && !viewingCompanyDoc.fileData && (
                        <p className="text-[10px] text-indigo-600 mt-1.5 font-bold">
                          Enlace: <a href={viewingCompanyDoc.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">{viewingCompanyDoc.url}</a>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                {(viewingCompanyDoc.fileData || viewingCompanyDoc.url) && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingCompanyDoc.fileData || viewingCompanyDoc.url;
                      link.download = viewingCompanyDoc.fileName || viewingCompanyDoc.name + '.pdf';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }} 
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold uppercase transition flex items-center shrink-0 border border-emerald-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Descargar Archivo
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setViewingCompanyDoc(null)} 
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold uppercase transition border-0 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {previewState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider mb-1">
                  Vista previa de datos a importar
                </span>
                <h3 className="font-bold text-lg text-slate-800 mt-1">
                  Confirmar importación de {previewState.type}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewState(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto min-h-0 bg-slate-50/40">
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3.5 rounded-xl leading-relaxed mb-4 flex items-start">
                <span className="text-base mr-2">⚠️</span>
                <div>
                  <p className="font-bold">Por favor revisa la información de la tabla antes de continuar.</p>
                  <p className="mt-0.5 opacity-90">Se han detectado <strong>{previewState.rows.length}</strong> registros en el archivo CSV. Haz clic en "Confirmar e Importar" para agregarlos al sistema.</p>
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto max-h-[48vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-slate-50 text-center min-w-[50px] border-r border-slate-200">
                        Fila
                      </th>
                      {previewState.headers.map((hdr, idx) => (
                        <th key={idx} className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-slate-50 min-w-[150px] border-r border-slate-100">
                          {hdr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-sans">
                    {previewState.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-400 bg-slate-50/50 text-center border-r border-slate-200">
                          {rowIdx + 2}
                        </td>
                        {previewState.headers.map((_, colIdx) => (
                          <td key={colIdx} className="px-4 py-2.5 text-slate-700 border-r border-slate-150 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs font-mono text-[11px]" title={row[colIdx]?.toString() || ""}>
                            {row[colIdx] !== undefined && row[colIdx] !== "" ? row[colIdx] : <span className="text-slate-300 italic">vacío</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total a procesar: {previewState.rows.length} filas
              </span>
              <div className="flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setPreviewState(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const { type, headers, rows } = previewState;
                    setPreviewState(null);
                    startImporting(type, headers, rows);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Confirmar e Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRestoreConfirmOpen && backupRestoreFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            <div className="p-5 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 animate-bounce" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase">¡Atención! Confirmar Restauración</h4>
                <p className="text-[10px] text-slate-500">Esta acción es irreversible y sobrescribirá la base de datos</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                <p>
                  Estás a punto de restaurar el sistema utilizando el siguiente respaldo local:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-800 space-y-1">
                  <p>• <strong>Archivo:</strong> {backupRestoreFile.name}</p>
                  <p>• <strong>Tamaño:</strong> {(backupRestoreFile.size / 1024).toFixed(1)} KB</p>
                  <p>• <strong>Fecha de Carga:</strong> {new Date().toLocaleString()}</p>
                </div>
                <p className="font-bold text-rose-600">
                  ⚠️ ADVERTENCIA: Al confirmar, todos tus datos actuales (alumnos, matrículas, profesores, pagos y configuraciones) serán reemplazados por completo con los registros contenidos en este archivo de respaldo.
                </p>
                <p className="font-medium text-slate-700">
                  ¿Estás completamente seguro de que deseas proceder con la restauración de datos?
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRestoreConfirmOpen(false);
                    setBackupRestoreFile(null);
                    setRestorePayload(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const success = restoreBackup(restorePayload);
                      if (success) {
                        triggerToast("¡Base de datos restaurada de forma exitosa!");
                      } else {
                        triggerToast("Ocurrió un error al procesar la restauración.", "error");
                      }
                    } catch (err) {
                      triggerToast("Error crítico durante la restauración.", "error");
                    } finally {
                      setIsRestoreConfirmOpen(false);
                      setBackupRestoreFile(null);
                      setRestorePayload(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition"
                >
                  Sí, Sobrescribir y Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Restauración desde Google Drive */}
      {driveFileToRestore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            <div className="p-5 border-b border-slate-100 bg-amber-50/60 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 animate-bounce" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase">Restaurar desde Google Drive</h4>
                <p className="text-[10px] text-slate-500">Sobrescribirá toda la base de datos activa</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                <p>
                  Estás a punto de restaurar la base de datos completa con el respaldo descargado desde Google Drive:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-[11px] text-slate-800 space-y-1">
                  <p>• <strong>Archivo:</strong> {driveFileToRestore.file.name}</p>
                  <p>• <strong>Tamaño:</strong> {driveFileToRestore.file.size}</p>
                  <p>• <strong>Fecha Drive:</strong> {new Date(driveFileToRestore.file.createdTime).toLocaleString()}</p>
                </div>
                <p className="font-bold text-rose-600">
                  ⚠️ ADVERTENCIA: Esta acción reemplazará de inmediato todos los datos actuales del sistema con los registros de este respaldo en la nube.
                </p>
                <p className="font-medium text-slate-700">
                  ¿Confirmas que deseas proceder con la restauración total?
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDriveFileToRestore(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const success = restoreBackup(driveFileToRestore.data);
                      if (success) {
                        triggerToast("¡Base de datos restaurada de forma exitosa desde Google Drive!");
                      } else {
                        triggerToast("Error al procesar la restauración.", "error");
                      }
                    } catch (err: any) {
                      triggerToast("Error crítico durante la restauración: " + (err.message || ''), "error");
                    } finally {
                      setDriveFileToRestore(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md transition cursor-pointer"
                >
                  Sí, Sobrescribir y Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Archivo en Google Drive */}
      {driveFileToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
            <div className="p-5 border-b border-slate-100 bg-rose-50/60 flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-rose-600 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase">Eliminar de Google Drive</h4>
                <p className="text-[10px] text-slate-500">Esta acción borrará el archivo en tu unidad</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>¿Estás seguro de que deseas eliminar permanentemente este archivo de respaldo de tu Google Drive?</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-slate-800 space-y-1">
                  <p className="truncate"><strong>Archivo:</strong> {driveFileToDelete.name}</p>
                  <p><strong>Tamaño:</strong> {driveFileToDelete.size}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingDriveFile}
                  onClick={() => setDriveFileToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingDriveFile}
                  onClick={async () => {
                    setIsDeletingDriveFile(true);
                    try {
                      await deleteGoogleDriveBackup(driveFileToDelete.id);
                      setDriveBackupsList(prev => prev.filter(f => f.id !== driveFileToDelete.id));
                      triggerToast("Archivo eliminado de Google Drive exitosamente");
                      setDriveFileToDelete(null);
                    } catch (err: any) {
                      triggerToast(err.message || "Error al eliminar de Google Drive", "error");
                    } finally {
                      setIsDeletingDriveFile(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isDeletingDriveFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Eliminación</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {slaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingSlaId ? 'Editar Acuerdo SLA' : 'Nuevo Acuerdo SLA'}
                  </h3>
                  <p className="text-xs text-slate-500">Parámetros de inactividad, escalamiento y tiempos de atención</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSlaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSla} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre de la Fase o Regla SLA <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slaForm.name}
                    onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })}
                    placeholder="Ej. Revisión de Convenio Marco o Examen de Inglés"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Módulo Operativo <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={slaForm.module}
                    onChange={(e) => setSlaForm({ ...slaForm, module: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="crm">CRM & Prospectos</option>
                    <option value="instituciones">Instituciones Socias</option>
                    <option value="alumnos">Alumnos & Académico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Límite SLA (Días Permitidos)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      disabled={slaForm.slaDays === null}
                      value={slaForm.slaDays === null ? "" : slaForm.slaDays}
                      onChange={(e) => setSlaForm({ ...slaForm, slaDays: e.target.value === "" ? 1 : Math.max(1, parseInt(e.target.value) || 1) })}
                      placeholder={slaForm.slaDays === null ? "Ilimitado" : "Días"}
                      className="w-28 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <label className="inline-flex items-center text-xs text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slaForm.slaDays === null}
                        onChange={(e) => setSlaForm({ ...slaForm, slaDays: e.target.checked ? null : 3 })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-1.5"
                      />
                      Sin límite
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nivel de Prioridad
                  </label>
                  <select
                    value={slaForm.priority}
                    onChange={(e) => setSlaForm({ ...slaForm, priority: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="alta">Alta / Atención Inmediata</option>
                    <option value="media">Normal / Intermedia</option>
                    <option value="baja">Baja / Informativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Área o Rol Responsable
                  </label>
                  <input
                    type="text"
                    value={slaForm.responsibleRole}
                    onChange={(e) => setSlaForm({ ...slaForm, responsibleRole: e.target.value })}
                    placeholder="Ej. Ventas, Admisiones, Control Escolar"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Acción Principal al Vencer SLA <span className="text-rose-500">*</span></span>
                      {slaForm.actionOnAlert === "Enviar correo a contacto" && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                          Plantilla requerida
                        </span>
                      )}
                    </label>
                    <select
                      value={slaForm.actionOnAlert}
                      onChange={(e) => setSlaForm({ ...slaForm, actionOnAlert: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-2xs"
                    >
                      <option value="Enviar correo a contacto">📧 Enviar correo a contacto</option>
                      <option value="Mover a otra etapa">🔄 Mover a otra etapa</option>
                      <option value="Alerta en Dashboard y Correo al Ejecutivo">🔔 Alerta en Dashboard y Correo al Responsable</option>
                      <option value="Alerta Inmediata y Notificación WhatsApp">💬 Alerta Inmediata y Notificación WhatsApp</option>
                      <option value="Alerta Crítica y Notificación a Dirección">⚠️ Alerta Crítica y Notificación a Dirección</option>
                      <option value="Escalamiento Directo a Dirección General">🚀 Escalamiento Directo a Dirección General</option>
                      <option value="Alerta a Finanzas y Correo a Escuela">💳 Alerta a Finanzas y Correo a la Escuela</option>
                      <option value="Notificación de Calificación Lista">🎓 Notificación de Calificación Lista</option>
                      <option value="Monitoreo Periódico">👁️ Monitoreo Periódico</option>
                    </select>
                  </div>

                  {/* Subsección: Template Selector cuando la acción es Enviar Correo a Contacto */}
                  {slaForm.actionOnAlert === "Enviar correo a contacto" && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                          Plantilla de Correo a Utilizar (Template) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-indigo-700 font-mono font-semibold">
                          {availableSlaTemplates.length} plantillas disponibles
                        </span>
                      </div>

                      <select
                        value={slaForm.emailTemplateId}
                        onChange={(e) => {
                          const tpl = availableSlaTemplates.find(t => t.id === e.target.value);
                          setSlaForm({
                            ...slaForm,
                            emailTemplateId: e.target.value,
                            emailTemplateTitle: tpl?.title || e.target.value
                          });
                        }}
                        className="w-full border border-indigo-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                      >
                        {availableSlaTemplates.map(t => (
                          <option key={t.id} value={t.id}>
                            [{t.category || "General"}] {t.title}
                          </option>
                        ))}
                      </select>

                      {/* Preview de la plantilla seleccionada */}
                      {(() => {
                        const currentTpl = availableSlaTemplates.find(t => t.id === slaForm.emailTemplateId) || availableSlaTemplates[0];
                        if (!currentTpl) return null;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-indigo-100 text-[11px] space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">Asunto del Correo:</span>
                              <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[9px] px-2 py-0.2 rounded-full">
                                {currentTpl.category}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-xs truncate">
                              {currentTpl.subject || "Sin asunto definido"}
                            </p>
                            {currentTpl.body && (
                              <p className="text-[10.5px] text-slate-500 line-clamp-2 italic border-t border-slate-100 pt-1.5">
                                "{currentTpl.body}"
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Subsección: Etapa de Destino cuando la acción es Mover a Otra Etapa */}
                  {slaForm.actionOnAlert === "Mover a otra etapa" && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                        Mover a la Etapa: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={slaForm.targetStage}
                        onChange={(e) => setSlaForm({ ...slaForm, targetStage: e.target.value })}
                        className="w-full border border-amber-300 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs cursor-pointer"
                      >
                        {slaForm.module === 'crm' ? (
                          <>
                            <optgroup label="📱 Redes Sociales">
                              {getRedesSocialesStages().map(st => (
                                <option key={`redes-${st}`} value={st}>📱 {st}</option>
                              ))}
                            </optgroup>
                            <optgroup label="🏢 Instituciones (Pipeline Principal)">
                              {getInstitucionesStages().map(st => (
                                <option key={`inst-${st}`} value={st}>🏢 {st}</option>
                              ))}
                            </optgroup>
                            <optgroup label="🎓 Personas Potenciales / Particulares">
                              {getParticularesStages().filter(st => !getInstitucionesStages().includes(st)).map(st => (
                                <option key={`part-${st}`} value={st}>🎓 {st}</option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          getAvailableStagesForModule(slaForm.module).map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))
                        )}
                      </select>
                      <p className="text-[10.5px] text-amber-800/80">
                        Al superar el límite de días, el registro avanzará o se moverá automáticamente a esta fase.
                      </p>
                    </div>
                  )}

                  {/* SEGUNDA ACCION A REALIZAR: OPCION PARA OTRA ACCION */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slaForm.hasSecondaryAction}
                        onChange={(e) => setSlaForm({ ...slaForm, hasSecondaryAction: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>¿Ejecutar otra acción adicional al vencer SLA?</span>
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.2 rounded uppercase">Encadenada</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 block">
                          Si activas esta opción, se abrirá un menú secundario para realizar una segunda acción simultánea (ej. Mover a otra etapa o Enviar correo).
                        </span>
                      </div>
                    </label>

                    {/* MENU SECUNDARIO QUE SE ABRE SI SÍ */}
                    {slaForm.hasSecondaryAction && (
                      <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Seleccionar Segunda Acción a Realizar <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={slaForm.secondaryAction}
                            onChange={(e) => setSlaForm({ ...slaForm, secondaryAction: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-2xs"
                          >
                            <option value="Mover a otra etapa">🔄 Mover a otra etapa</option>
                            <option value="Enviar correo">📧 Enviar correo a contacto</option>
                            <option value="Alerta en Dashboard y Correo al Ejecutivo">🔔 Alerta en Dashboard y Correo al Responsable</option>
                            <option value="Alerta Inmediata y Notificación WhatsApp">💬 Alerta Inmediata y Notificación WhatsApp</option>
                            <option value="Alerta Crítica y Notificación a Dirección">⚠️ Alerta Crítica y Notificación a Dirección</option>
                            <option value="Escalamiento Directo a Dirección General">🚀 Escalamiento Directo a Dirección General</option>
                            <option value="Alerta a Finanzas y Correo a Escuela">💳 Alerta a Finanzas y Correo a la Escuela</option>
                            <option value="Notificación de Calificación Lista">🎓 Notificación de Calificación Lista</option>
                            <option value="Monitoreo Periódico">👁️ Monitoreo Periódico</option>
                          </select>
                        </div>

                        {/* Si la acción secundaria es Mover a otra etapa */}
                        {slaForm.secondaryAction === "Mover a otra etapa" && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              Etapa de Destino Adicional:
                            </label>
                            <select
                              value={slaForm.secondaryTargetStage}
                              onChange={(e) => setSlaForm({ ...slaForm, secondaryTargetStage: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                              {slaForm.module === 'crm' ? (
                                <>
                                  <optgroup label="📱 Redes Sociales">
                                    {getRedesSocialesStages().map(st => (
                                      <option key={`sec-redes-${st}`} value={st}>📱 {st}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="🏢 Instituciones (Pipeline Principal)">
                                    {getInstitucionesStages().map(st => (
                                      <option key={`sec-inst-${st}`} value={st}>🏢 {st}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="🎓 Personas Potenciales / Particulares">
                                    {getParticularesStages().filter(st => !getInstitucionesStages().includes(st)).map(st => (
                                      <option key={`sec-part-${st}`} value={st}>🎓 {st}</option>
                                    ))}
                                  </optgroup>
                                </>
                              ) : (
                                getAvailableStagesForModule(slaForm.module).map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))
                              )}
                            </select>
                            <p className="text-[10px] text-slate-400">
                              El registro se reubicará automáticamente en esta fase.
                            </p>
                          </div>
                        )}

                        {/* Si la acción secundaria es Enviar correo */}
                        {(slaForm.secondaryAction === "Enviar correo" || slaForm.secondaryAction === "Enviar correo a contacto") && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                Plantilla de Correo Secundaria (Template):
                              </label>
                              <span className="text-[9.5px] text-indigo-600 font-mono font-semibold">
                                {availableSlaTemplates.length} disponibles
                              </span>
                            </div>
                            <select
                              value={slaForm.secondaryEmailTemplateId}
                              onChange={(e) => {
                                const tpl = availableSlaTemplates.find(t => t.id === e.target.value);
                                setSlaForm({
                                  ...slaForm,
                                  secondaryEmailTemplateId: e.target.value,
                                  secondaryEmailTemplateTitle: tpl?.title || e.target.value
                                });
                              }}
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              {availableSlaTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                  [{t.category || "General"}] {t.title}
                                </option>
                              ))}
                            </select>
                            {(() => {
                              const secTpl = availableSlaTemplates.find(t => t.id === slaForm.secondaryEmailTemplateId) || availableSlaTemplates[0];
                              if (!secTpl) return null;
                              return (
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[10.5px] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">Asunto:</span>
                                    <span className="bg-indigo-50 text-indigo-700 font-bold text-[8.5px] px-1.5 py-0.2 rounded">
                                      {secTpl.category}
                                    </span>
                                  </div>
                                  <p className="font-bold text-slate-800 truncate">{secTpl.subject}</p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descripción del Proceso y Criterio de Medición
                  </label>
                  <textarea
                    rows={3}
                    value={slaForm.description}
                    onChange={(e) => setSlaForm({ ...slaForm, description: e.target.value })}
                    placeholder="Describe qué actividad marca el inicio del SLA y qué resultado concluye el proceso..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={slaForm.isActive}
                      onChange={(e) => setSlaForm({ ...slaForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Regla Activa y Monitoreo Habilitado</span>
                      <span className="text-[10px] text-slate-500 block">Los semáforos y contadores de días se calcularán activamente con esta regla</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSlaModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
                >
                  {editingSlaId ? 'Actualizar Regla SLA' : 'Crear Regla SLA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-250" id="custom-delete-confirm-config">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-slate-950">{deleteConfirm.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{deleteConfirm.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                id="config-delete-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                id="config-delete-confirm"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 text-white text-xs font-bold uppercase tracking-wider px-5 py-3.5 rounded-xl shadow-xl flex items-center animate-in fade-in slide-in-from-bottom-2 duration-300 ${toast.type === 'success' ? 'bg-[#1e293b] border border-emerald-500/20' : 'bg-rose-900/90 border border-rose-500/20'}`}>
          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
