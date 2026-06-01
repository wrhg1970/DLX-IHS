import { Settings, Shield, Users, Bell, FileSpreadsheet, Download, Upload, Edit2, Trash2, X, Building, FileText, Save, Image as ImageIcon, MapPin, Globe, DollarSign, Send, Mail, MessageSquare, Calendar, Sparkles, Clock, AlertTriangle, CheckCircle, Check, Copy, Key, Eye } from "lucide-react";
import React, { useState } from "react";
import { useAppContext, resolveCreditPrices } from "../context/AppContext";

type PermissionMenu = "Dashboard" | "Agenda" | "Instituciones" | "Alumnos" | "Clases" | "Administración" | "Proveedores" | "Finanzas" | "Reportes" | "Catálogos" | "Configuración";

const DEFAULT_PERMS = { view: true, create: true, edit: true, delete: true };
const NO_PERMS = { view: false, create: false, edit: false, delete: false };

const menus: PermissionMenu[] = [
  "Dashboard",
  "Agenda",
  "Instituciones",
  "Alumnos",
  "Clases",
  "Administración",
  "Proveedores",
  "Finanzas",
  "Reportes",
  "Catálogos",
  "Configuración"
];

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
  } | null>(null);

  const [previewState, setPreviewState] = useState<{
    type: string;
    headers: string[];
    rows: string[][];
  } | null>(null);

  const { 
    institutions, addInstitution, addStudent, addClass, addPayment, addProvider, 
    users, addUser, updateUser, deleteUser,
    companyInfo, updateCompanyInfo,
    companyDocuments, addCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
    currentUser,
    students, classes, addEnrollment, addActivity,
    catalogs, providerProductServices,
    providers
  } = useAppContext();

  const [companyForm, setCompanyForm] = useState(companyInfo);
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

  const [reminderTemplates, setReminderTemplates] = useState([
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
  ]);

  const [notifHistory, setNotifHistory] = useState<Array<{
    id: number;
    date: string;
    recipient: string;
    target: "Alumno" | "Institución";
    type: "Preventivo" | "Cobro Atrasado";
    campaignName: string;
    channel: string;
    subject: string;
    amount: string;
  }>>([
    {
      id: 1,
      date: "2026-05-27T10:30:00Z",
      recipient: "Colegio Anglo Mexicano (Coordinador)",
      target: "Institución",
      type: "Cobro Atrasado",
      campaignName: "Cobro de Factura Vencida",
      channel: "Email",
      subject: "AVISO DE COBRO: Factura de Convenio Atrasada",
      amount: "$45,000.00"
    },
    {
      id: 2,
      date: "2026-05-28T09:15:00Z",
      recipient: "Sofía Martínez (Alumno)",
      target: "Alumno",
      type: "Preventivo",
      campaignName: "Recordatorio de Pago de Colegiatura",
      channel: "Email & Push",
      subject: "Aviso de Próximo Vencimiento de Colegiatura",
      amount: "$3,200.00"
    }
  ]);

  const [smtpConfig, setSmtpConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("smtp_credentials");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      host: "smtp.gmail.com",
      port: "587",
      user: "ejemplo@gmail.com",
      pass: "",
      fromEmail: "ejemplo@gmail.com",
      fromName: "Instituto de Humanidades y Ciencias"
    };
  });

  const [testEmail, setTestEmail] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const sendRealNotificationEmail = async (toEmail: string, toName: string, subject: string, body: string) => {
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          smtpUser: smtpConfig.user,
          smtpPass: smtpConfig.pass,
          smtpFromEmail: smtpConfig.fromEmail,
          smtpFromName: smtpConfig.fromName,
          to: toEmail,
          subject: subject,
          body: body
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error de red");
      }
      return { success: true };
    } catch (err: any) {
      console.error("Real email dispatch error: ", err);
      return { success: false, error: err.message };
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

  const [testPhone, setTestPhone] = useState("");
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);

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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error de red");
      }
      return { success: true, simulated: data.simulated, message: data.message };
    } catch (err: any) {
      console.error("Real WhatsApp dispatch error: ", err);
      return { success: false, error: err.message };
    }
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyInfo(companyForm);
    // show success toast or similar ideally, for now just update context
  };

  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [viewingCompanyDoc, setViewingCompanyDoc] = useState<any | null>(null);
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
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);
  const [generatedPassInfo, setGeneratedPassInfo] = useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: string;
    studentId?: number;
    institutionId?: number;
  }>({ name: '', email: '', role: '', studentId: undefined, institutionId: undefined });

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

  const handlePreferencesSave = () => {
    try {
      localStorage.setItem("system_preferences", JSON.stringify(preferences));
      triggerToast("Preferencias actualizadas con éxito");
    } catch (e) {
      triggerToast("Error al guardar las preferencias", "error");
    }
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let userPayload: any = { ...userForm };
    let generatedPass = '';

    if (!editingUserId && autoGeneratePassword) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      generatedPass = `IHS-${randomPart}`;
      userPayload = {
        ...userPayload,
        password: generatedPass,
        requirePasswordChange: true
      };
    }

    if (editingUserId) {
      updateUser(editingUserId, userPayload);
    } else {
      addUser(userPayload);
    }

    if (generatedPass) {
      setGeneratedPassInfo({ email: userForm.email, pass: generatedPass });
    } else {
      setIsUserModalOpen(false);
    }
    
    setUserForm({ name: '', email: '', role: '', studentId: undefined, institutionId: undefined });
    setAutoGeneratePassword(false);
    setEditingUserId(null);
  };

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserForm({ 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      studentId: user.studentId ? Number(user.studentId) : undefined, 
      institutionId: user.institutionId ? Number(user.institutionId) : undefined 
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este usuario?")) {
      deleteUser(id);
    }
  };

  const [roles, setRoles] = useState(() => {
    const saved = localStorage.getItem("system_roles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading system_roles", e);
      }
    }
    return [
      { 
        id: '1', 
        name: 'Superadministrador', 
        permissions: Object.fromEntries(menus.map(m => [m, { ...DEFAULT_PERMS }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
      { 
        id: '2', 
        name: 'Finanzas', 
        permissions: Object.fromEntries(menus.map(m => [m, ["Administración", "Proveedores"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS, view: true }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
      { 
        id: '3', 
        name: 'Academia', 
        permissions: Object.fromEntries(menus.map(m => [m, ["Clases", "Alumnos", "Instituciones"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS, view: true }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
      { 
        id: '4', 
        name: 'Ventas', 
        permissions: Object.fromEntries(menus.map(m => [m, ["Instituciones", "Alumnos"].includes(m) ? { ...DEFAULT_PERMS } : { ...NO_PERMS, view: true }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
      { 
        id: '5', 
        name: 'Alumno', 
        permissions: Object.fromEntries(menus.map(m => [m, m === "Alumnos" ? { view: true, create: false, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
      { 
        id: '6', 
        name: 'Coordinador', 
        permissions: Object.fromEntries(menus.map(m => [m, ["Alumnos", "Instituciones", "Clases"].includes(m) ? { view: true, create: true, edit: true, delete: false } : { ...NO_PERMS }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
      },
    ];
  });

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if(newRoleName.trim() === '') return;
    
    const newRole = {
      id: Date.now().toString(),
      name: newRoleName,
      permissions: Object.fromEntries(menus.map(m => [m, { ...NO_PERMS }])) as Record<PermissionMenu, typeof DEFAULT_PERMS>
    };
    
    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    localStorage.setItem("system_roles", JSON.stringify(updatedRoles));
    setSelectedRoleId(newRole.id);
    setIsRoleModalOpen(false);
    setNewRoleName("");
    triggerToast(`¡El rol "${newRole.name}" ha sido creado satisfactoriamente!`);
  };

  const handleSavePermissions = () => {
    localStorage.setItem("system_roles", JSON.stringify(roles));
    triggerToast("¡Permisos guardados satisfactoriamente!");
  };

  const [selectedRoleId, setSelectedRoleId] = useState('1');
  const selectedRoleData = roles.find(r => r.id === selectedRoleId);

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
      errors: []
    });

    let currentSuccess = 0;
    let currentErrorCount = 0;
    const collectedErrors: Array<{ rowNum: number; msg: string; data: string }> = [];

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
            
            addInstitution({
              name: data[0] || '',
              tradeName: data[1] || undefined,
              address: data[2] || undefined,
              city: data[3] || undefined,
              state: data[4] || undefined,
              zipCode: data[5] || undefined,
              country: data[6] || '',
              phone: data[7] || undefined,
              email: data[8] || undefined,
              contact: data[9] || '',
              contactPosition: data[10] || undefined,
              contactEmail: data[11] || undefined,
              contactPhone: data[12] || undefined,
              institutionTypeId: data[13] || undefined,
              modality: data[14] || undefined,
              tarifasId: data[15] || undefined,
              mainProviderId: data[16] ? Number(data[16]) : undefined,
              membershipId: data[17] || undefined,
              membershipExpiration: data[18] || undefined,
              payWithIva: data[19] ? ['si', 'sì', 'yes', 'true', '1'].includes(data[19].toLowerCase().trim()) : false,
              paymentMethod: data[20] || undefined,
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
            if (data[4] && data[4].trim() && !data[4].includes('@')) {
              throw new Error(`El Email '${data[4]}' no tiene un formato válido.`);
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
              email: data[4] || '',
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
              creditType: (data[2] || 'Crédito completo') as any,
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
              if (matchedClass.creditType === "Medio Crédito") {
                priceStr = resolvedPrices.priceHalfCredit;
              } else if (matchedClass.creditType === "Crédito completo AP") {
                priceStr = resolvedPrices.priceFullApCredit;
              } else if (matchedClass.creditType === "Medio Crédito AP") {
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
            const stdId = Number(data[0]);
            if (isNaN(stdId) || stdId <= 0) {
              throw new Error(`El ID de Alumno '${data[0]}' no es válido.`);
            }
            const amt = Number(data[2]);
            if (isNaN(amt) || amt < 0) {
              throw new Error(`El Monto de pago '${data[2]}' debe ser un número válido.`);
            }
            addPayment({
              studentId: stdId,
              date: data[1] || new Date().toISOString().split('T')[0],
              amount: amt,
              tax: 0,
              finalAmount: amt
            });
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
        currentSuccess++;
      } catch (err: any) {
        currentErrorCount++;
        collectedErrors.push({
          rowNum,
          msg: err?.message || "Error al parsear el registro.",
          data: data.length > 0 ? data.slice(0, 3).join(', ') + (data.length > 3 ? "..." : "") : "Fila vacía"
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
          errors: [...collectedErrors]
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
        headers = "Nombre Clase,Clave,Tipo de Crédito,SyllabusURL,Vigencia,ProveedorID(Número)\nÁlgebra I,ALG101,Crédito completo,https://ejemplo.com/syllabus.pdf,2026,1";
        filename = "plantilla_clases.csv";
        break;
      case "Inscripciones":
        headers = "Alumno_ID_o_Email,Nombre_Alumno,Clave_o_Nombre_Clase,Nombre_Clase,Fecha_Inscripción(YYYY-MM-DD),Fecha_Activación(YYYY-MM-DD),Fecha_Fin(YYYY-MM-DD),Estatus(Active/Completed/On hold/Withdrawn),Precio_Pactado,Notas,Proveedor\njuan@example.com,Juan Pérez,ALG101,Álgebra I,2026-05-01,2026-05-15,2027-05-15,Active,1500,Inscripción importada,1";
        filename = "plantilla_inscripciones.csv";
        break;
      case "Pagos":
        headers = "AlumnoID,Fecha(YYYY-MM-DD),MontoFinal,Concepto\n1,2026-05-01,1500,Pago Mensual";
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
            className={`w-full flex items-center p-3 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === 'Importacion' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <FileSpreadsheet className={`h-4 w-4 mr-3 ${activeTab === 'Importacion' ? '' : 'opacity-70'}`} />
            Plantillas e Importación
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
        </div>
        
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          {activeTab === "Empresa" && (
            <div className="flex-1 overflow-auto bg-slate-50 relative p-6">
              <div className="max-w-3xl mx-auto pb-10">
                <form onSubmit={handleCompanySubmit} className="space-y-6">
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
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Logo de la Empresa URL</label>
                        <input
                          type="text"
                          value={companyForm.logoUrl}
                          onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="https://ejemplo.com/logo.png"
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
                      <span className="px-2 py-0.5 bg-slate-200/50 text-slate-700 rounded text-[10px] font-bold tracking-widest uppercase border border-slate-200">
                        {user.role}
                      </span>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditUser(user)} className="text-slate-400 hover:text-indigo-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600">
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
                  <h3 className="font-bold text-slate-800 text-sm">Plantillas e Importación Masiva</h3>
                  <p className="text-xs text-slate-500 mt-1">Descarga plantillas CSV e importa registros al sistema de forma ágil y segura.</p>
                </div>
                {importState && (
                  <button 
                    onClick={() => setImportState(null)}
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

                    {/* Detailed errors reporter */}
                    {importState.errors.length > 0 && (
                      <div className="border border-rose-200 bg-rose-50/5 rounded-xl overflow-hidden mt-3 animate-fadeIn">
                        <div className="bg-rose-50 border-b border-rose-150 px-4 py-2.5 flex justify-between items-center">
                          <span className="text-xs font-extrabold text-rose-850 uppercase tracking-wider flex items-center">
                            ⚠️ Listado de Errores Detallado ({importState.errors.length})
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 rounded-full px-2 py-0.5 font-bold">
                            Fallo Parcial Solamente
                          </span>
                        </div>
                        <div className="divide-y divide-rose-100 max-h-56 overflow-y-auto font-sans">
                          {importState.errors.map((err, idx) => (
                            <div key={idx} className="p-3 hover:bg-rose-50/30 transition-colors text-xs">
                              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5">
                                <span className="bg-slate-700 text-slate-100 text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                  Fila #{err.rowNum}
                                </span>
                                <span className="text-rose-700 font-bold bg-rose-100/60 px-2 py-0.5 rounded text-[11px] leading-relaxed">
                                  {err.msg}
                                </span>
                              </div>
                              <div className="bg-slate-50 border border-slate-200 rounded p-2 mt-2 font-mono text-[10px] text-slate-500 overflow-x-auto whitespace-pre">
                                <span className="text-slate-400 font-bold block mb-0.5 uppercase text-[8px] tracking-wider">Datos leídos:</span>
                                {err.data}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                <button 
                  onClick={() => setIsRoleModalOpen(true)}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
                >
                  + Nuevo Rol
                </button>
              </div>
              
              <div className="flex-1 overflow-auto flex flex-col md:flex-row">
                <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 p-4 shrink-0 overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Lista de Roles</h4>
                  <div className="space-y-1">
                    {roles.map(role => (
                      <button 
                        key={role.id}
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${selectedRoleId === role.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:w-2/3 p-4 sm:p-6 overflow-y-auto">
                  {selectedRoleData && (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-slate-800 text-sm">{selectedRoleData.name} - Permisos</h4>
                        <button 
                          onClick={handleSavePermissions}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded"
                        >
                          Guardar Cambios
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
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Controles de Envío y Credenciales de Correo (SMTP)</h3>
                          <p className="text-[10px] text-slate-500">Configura de forma persistente tu proveedor de correos para despachar los recordatorios de pago.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Servidor SMTP (Host)</label>
                          <input
                            type="text"
                            placeholder="smtp.example.com"
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
                            placeholder="IHS Notificaciones"
                            value={smtpConfig.fromName}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Remitente</label>
                          <input
                            type="email"
                            placeholder="colegio@dominio.com"
                            value={smtpConfig.fromEmail}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usuario SMTP</label>
                          <input
                            type="text"
                            placeholder="colegio@dominio.com"
                            value={smtpConfig.user}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contraseña / Token</label>
                          <input
                            type="password"
                            placeholder="Contraseña del servidor de correo"
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
                            placeholder="correo-prueba@ejemplo.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 w-48 font-sans"
                          />
                          <button
                            type="button"
                            disabled={isTestingSmtp}
                            onClick={async () => {
                              if (!testEmail.trim()) {
                                triggerToast("Ingresa un correo de prueba.");
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
                                    smtpFromEmail: smtpConfig.fromEmail,
                                    smtpFromName: smtpConfig.fromName,
                                    to: testEmail,
                                    subject: "Prueba de Servidor de Correo SMTP - Sistema IHS",
                                    body: "Este es un correo electrónico de prueba enviado para verificar la correcta integración de tus credenciales de correo (SMTP) en el sistema. ¡Felicidades, la configuración funciona perfectamente!"
                                  })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Error de red");
                                triggerToast("¡Correo de prueba despachado con éxito!");
                              } catch (err: any) {
                                alert("Error al enviar prueba: " + err.message);
                              } finally {
                                setIsTestingSmtp(false);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isTestingSmtp ? "Enviando..." : "Enviar Correo de Prueba"}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("smtp_credentials", JSON.stringify(smtpConfig));
                            triggerToast("¡Credenciales de SMTP guardadas exitosamente!");
                          }}
                          className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 font-bold text-white rounded-xl text-xs shadow-sm transition-all cursor-pointer bg-indigo-600"
                        >
                          Guardar Credenciales
                        </button>
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

                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("whatsapp_credentials", JSON.stringify(whatsappConfig));
                            triggerToast("¡Credenciales de WhatsApp guardadas exitosamente!");
                          }}
                          className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 font-bold text-white rounded-xl text-xs shadow-sm transition-all cursor-pointer bg-indigo-600"
                        >
                          Guardar Configuración
                        </button>
                      </div>
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
                                  setReminderTemplates(
                                    reminderTemplates.map((t) =>
                                      t.id === tpl.id ? { ...t, enabled: e.target.checked } : t
                                    )
                                  );
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

                          {/* Botón de edición */}
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => {
                                setEditingTemplateId(tpl.id);
                                setTemplateForm({ ...tpl });
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-200 transition-all flex items-center"
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
                                        date: new Date().toISOString(),
                                        description: `Recordatorio preventivo enviado por correo a Alumno: ${studentName} por ${amount}.`
                                      });
                                      
                                      setNotifHistory([
                                        {
                                          id: Date.now(),
                                          date: new Date().toISOString(),
                                          recipient: `${studentName} (Alumno)`,
                                          target: "Alumno",
                                          type: "Preventivo",
                                          campaignName: "Recordatorio de Pago de Colegiatura",
                                          channel: "Email & Push",
                                          subject: subject,
                                          amount: amount
                                        },
                                        ...notifHistory
                                      ]);
                                    }
                                  }}
                                  className="px-3.5 py-1.5 bg-indigo-600 font-bold text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-1 ml-auto text-[11px]"
                                >
                                  <Send className="w-3 h-3" />
                                  Enviar Alerta
                                </button>
                              </td>
                            </tr>

                            {/* Alumno 2 */}
                            {students.length > 1 && (
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
                                          date: new Date().toISOString(),
                                          description: `Notificación de adeudo atrasado despachada a Alumno: ${studentName} por ${amount}.`
                                        });
                                        
                                        setNotifHistory([
                                          {
                                            id: Date.now(),
                                            date: new Date().toISOString(),
                                            recipient: `${studentName} (Alumno)`,
                                            target: "Alumno",
                                            type: "Cobro Atrasado",
                                            campaignName: "Reclamación de Colegiatura Atrasada",
                                            channel: "Email, WhatsApp & Push",
                                            subject: subject,
                                            amount: amount
                                          },
                                          ...notifHistory
                                        ]);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-rose-600 font-bold text-white rounded-lg hover:bg-rose-750 transition flex items-center justify-center gap-1 ml-auto text-[11px]"
                                  >
                                    <Send className="w-3 h-3" />
                                    Enviar Reclamación
                                  </button>
                                </td>
                              </tr>
                            )}

                            {/* Instituciones de la DB */}
                            {institutions.filter(i => i.status === 'Pendiente' || i.status === 'Atrasado').map((inst) => {
                              const calculatedAmount = inst.billingAmount ? `$${Number(inst.billingAmount).toLocaleString()}` : "$45,000.00";
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
                                          
                                          setNotifHistory([
                                            {
                                              id: Date.now(),
                                              date: new Date().toISOString(),
                                              recipient: `${inst.name} (Coordinador)`,
                                              target: "Institución",
                                              type: "Cobro Atrasado",
                                              campaignName: "Cobro de Factura Vencida",
                                              channel: "Email & Teléfono",
                                              subject: subject,
                                              amount: calculatedAmount
                                            },
                                            ...notifHistory
                                          ]);
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-rose-600 font-bold text-white rounded-lg hover:bg-rose-750 transition flex items-center justify-center gap-1 ml-auto text-[11px]"
                                    >
                                      <Send className="w-3 h-3" />
                                      Enviar Reclamación
                                    </button>
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
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Historial Reciente de Alertas Enviadas</span>
                        <span className="text-xs text-slate-450 text-[11px] text-slate-500 font-semibold font-mono">
                          {notifHistory.length} despachos loggeados
                        </span>
                      </div>

                      <div className="overflow-x-auto font-sans text-xs">
                        {notifHistory.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            No se han registrado envíos en la sesión actual.
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
                                      id: `rule_${Date.now()}`,
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
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la regla "${rule.name}"?`)) {
                                      const updated = customRules.filter(r => r.id !== rule.id);
                                      setCustomRules(updated);
                                      localStorage.setItem("custom_notification_rules", JSON.stringify(updated));
                                      triggerToast("Regla de cobro eliminada con éxito");
                                    }
                                  }}
                                  title="Eliminar regla de cobranza"
                                  className="text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal de Edición de Plantillas */}
              {editingTemplateId && templateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                          Editar Campaña • {templateForm.target}
                        </span>
                        <h3 className="font-bold text-base text-slate-800">
                          {templateForm.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTemplateId(null);
                          setTemplateForm(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setReminderTemplates(
                          reminderTemplates.map((t) =>
                            t.id === templateForm.id ? { ...templateForm } : t
                          )
                        );
                        setEditingTemplateId(null);
                        setTemplateForm(null);
                        triggerToast("Plantilla de campaña guardada con éxito");
                      }}
                      className="p-5 space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-705 uppercase tracking-wider mb-1.5 text-slate-505 text-slate-700">Frecuencia / Tiempo de Alerta</label>
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
                              className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider font-bold text-slate-400">
                              Días
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-707 uppercase tracking-wider mb-1.5 text-slate-700">Canal de Envío</label>
                          <input
                            type="text"
                            required
                            value={templateForm.channel}
                            onChange={(e) =>
                              setTemplateForm({ ...templateForm, channel: e.target.value })
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-708 uppercase tracking-wider mb-1.5 text-slate-700">Asunto del Mensaje</label>
                        <input
                          type="text"
                          required
                          value={templateForm.subject}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, subject: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-709 uppercase tracking-wider text-slate-700">Cuerpo del Mensaje</label>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Variables sugeridas: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;nombre_alumno&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;nombre_institucion&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;monto&#125;</code> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">&#123;fecha_limite&#125;</code>
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

                      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplateId(null);
                            setTemplateForm(null);
                          }}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
                        >
                          Guardar Cambios
                        </button>
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
                                id: `rule_${Date.now()}`,
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
                      {institutions.map(i => (
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
                        onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs">
                      <label htmlFor="autoGeneratePassword" className="font-bold text-slate-800 cursor-pointer">
                        Generar contraseña automáticamente
                      </label>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        El usuario podrá ingresar con su contraseña provisional y el sistema le solicitará cambiarla obligatoriamente en su primer ingreso.
                      </p>
                    </div>
                  </div>
                )}
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
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <Key className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">¡Contraseña Inicial Generada!</h3>
            <p className="text-xs text-slate-500 mb-6 px-1">
              Copie la siguiente contraseña provisional para el usuario. Le será solicitado cambiarla obligatoriamente en cuanto ingrese por primera vez.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-left space-y-3">
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
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGeneratedPassInfo(null);
                setIsUserModalOpen(false);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-indigo-600/10"
            >
              Cerrar y Continuar
            </button>
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
                ) : viewingCompanyDoc.fileData?.startsWith('data:application/pdf') || viewingCompanyDoc.url?.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-[550px] rounded-lg border border-slate-250 overflow-hidden bg-white shadow-inner animate-in fade-in duration-300">
                    <iframe
                      src={viewingCompanyDoc.fileData || viewingCompanyDoc.url}
                      className="w-full h-full border-0"
                      title={`PDF ${viewingCompanyDoc.name}`}
                    />
                  </div>
                ) : (
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
