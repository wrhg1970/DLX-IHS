import { Task, User, Institution, Team } from "../context/AppContext";

export interface TaskNotificationConfig {
  notifyAssignmentEmail: boolean;
  notifyAssignmentWhatsApp: boolean;
  notifyDeadlineEmail: boolean;
  notifyDeadlineWhatsApp: boolean;
  deadlineHoursThreshold: number; // e.g., 24 or 48 hours
  assignmentTemplateEmail: {
    subject: string;
    body: string;
  };
  assignmentTemplateWhatsApp: string;
  deadlineTemplateEmail: {
    subject: string;
    body: string;
  };
  deadlineTemplateWhatsApp: string;
}

export const DEFAULT_TASK_NOTIFICATION_CONFIG: TaskNotificationConfig = {
  notifyAssignmentEmail: true,
  notifyAssignmentWhatsApp: true,
  notifyDeadlineEmail: true,
  notifyDeadlineWhatsApp: true,
  deadlineHoursThreshold: 24,
  assignmentTemplateEmail: {
    subject: "🔔 Nueva Tarea Asignada en CRM: {titulo_tarea}",
    body: `Hola {nombre_responsable},

Se te ha asignado una nueva tarea en el CRM del Sistema IHS:

📌 Tarea: {titulo_tarea}
📅 Fecha Límite / Realización: {fecha_limite}
⚡ Prioridad: {prioridad}
🏷️ Tipo de Tarea: {tipo_tarea}
🏢 Prospecto / Institución: {institucion}
👥 Equipo / Asignados: {equipo}
👤 Asignado por: {asignado_por}

📝 Notas / Instrucciones:
"{notas}"

Por favor ingresa a la plataforma para gestionar el seguimiento y registrar tus avances.`
  },
  assignmentTemplateWhatsApp: `🔔 *NUEVA TAREA ASIGNADA EN EL CRM*

Hola *{nombre_responsable}*, se te ha asignado una nueva tarea en el sistema:

📌 *Tarea:* {titulo_tarea}
📅 *Fecha Límite:* {fecha_limite}
⚡ *Prioridad:* {prioridad}
🏷️ *Tipo:* {tipo_tarea}
🏢 *Institución / Prospecto:* {institucion}
👥 *Equipo:* {equipo}
👤 *Asignado por:* {asignado_por}

📝 *Notas:* {notas}

👉 Ingresa al CRM para dar seguimiento oportuno.`,
  deadlineTemplateEmail: {
    subject: "⏰ Recordatorio de Vencimiento: {titulo_tarea} (Vence {fecha_limite})",
    body: `Hola {nombre_responsable},

Te recordamos que tienes una tarea pendiente en el CRM cuya fecha límite se aproxima o vence hoy:

📌 Tarea: {titulo_tarea}
📅 Fecha Límite: {fecha_limite} ({tiempo_restante})
⚡ Prioridad: {prioridad}
🏷️ Tipo de Tarea: {tipo_tarea}
🏢 Prospecto / Institución: {institucion}
👥 Equipo: {equipo}

📝 Notas / Contexto:
"{notas}"

Por favor realiza la actividad y actualiza su estado en el CRM para mantener al día el seguimiento comercial.`
  },
  deadlineTemplateWhatsApp: `⏰ *ALERTA DE VENCIMIENTO PRÓXIMO - CRM*

Hola *{nombre_responsable}*, te recordamos que tienes una tarea pendiente próxima a vencer:

📌 *Tarea:* {titulo_tarea}
📅 *Fecha Límite:* {fecha_limite} ({tiempo_restante})
⚡ *Prioridad:* {prioridad}
🏢 *Institución:* {institucion}
👥 *Equipo:* {equipo}

📝 *Notas:* {notas}

👉 Ingresa al sistema para registrar la interacción o marcar la tarea como completada.`
};

// Retrieve configured settings from localStorage
export function getTaskNotificationConfig(): TaskNotificationConfig {
  try {
    const saved = localStorage.getItem("crm_task_notifications_config_v1");
    if (saved) {
      return { ...DEFAULT_TASK_NOTIFICATION_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error("Error reading task notification config:", err);
  }
  return DEFAULT_TASK_NOTIFICATION_CONFIG;
}

// Save configuration to localStorage
export function saveTaskNotificationConfig(config: Partial<TaskNotificationConfig>): TaskNotificationConfig {
  const current = getTaskNotificationConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem("crm_task_notifications_config_v1", JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving task notification config:", err);
  }
  return updated;
}

// Retrieve SMTP configuration
export function getSmtpCredentials() {
  try {
    const saved = localStorage.getItem("smtp_credentials");
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error("Error reading smtp_credentials:", err);
  }
  return {
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "Sistema IHS - Notificaciones"
  };
}

// Retrieve WhatsApp configuration
export function getWhatsAppCredentials() {
  try {
    const saved = localStorage.getItem("whatsapp_credentials");
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error("Error reading whatsapp_credentials:", err);
  }
  return {
    provider: "meta",
    apiUrl: "https://graph.facebook.com/v19.0",
    phoneNumberId: "",
    accessToken: "",
    testPhone: ""
  };
}

// Helper to get active user's electronic signature
export function getActiveUserSignature(): any | null {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && user.includeSignatureInEmails !== false && (user.signatureImage || user.signatureText || user.title || user.signaturePhone)) {
      return {
        enabled: true,
        name: user.name,
        title: user.title,
        department: user.department,
        phone: user.signaturePhone || user.phone,
        email: user.email,
        website: user.signatureWebsite,
        signatureImage: user.signatureImage,
        signatureType: user.signatureType || "drawn",
        signatureText: user.signatureText,
        signatureFont: user.signatureFont,
        disclaimer: user.signatureDisclaimer
      };
    }
  } catch (err) {
    console.warn("Error reading currentUser for signature:", err);
  }
  return null;
}

/**
 * Safely parses fetch responses as JSON without throwing SyntaxError on HTML/text error pages.
 */
export async function safeParseJsonResponse(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text();
    if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
      try {
        const data = JSON.parse(rawText);
        return { isJson: true, data, rawText };
      } catch {
        // Fall through if JSON.parse fails
      }
    }
    return { isJson: false, data: null, rawText };
  } catch (err: any) {
    return { isJson: false, data: null, rawText: err?.message || "" };
  }
}

// Dispatch Email Notification via backend API
export async function sendRealNotificationEmail(
  toEmail: string,
  toName: string,
  subject: string,
  body: string,
  allowFallback = true,
  customSenderSignature?: any
): Promise<{ success: boolean; simulated?: boolean; message?: string; warning?: string; error?: string }> {
  try {
    const smtp = getSmtpCredentials();
    const resolvedSignature = customSenderSignature !== undefined ? customSenderSignature : getActiveUserSignature();

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtpHost: smtp.host,
        smtpPort: smtp.port,
        smtpUser: smtp.user,
        smtpPass: smtp.pass,
        smtpFromEmail: smtp.fromEmail || "notificaciones@sistema.ihs",
        smtpFromName: smtp.fromName || "Sistema IHS - CRM",
        to: toEmail,
        subject: subject,
        body: body,
        allowFallback: allowFallback,
        senderSignature: resolvedSignature
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
        error: data.error
      };
    }

    // Handled non-JSON response (e.g. HTML error from proxy or Vite)
    if (res.status === 413 || rawText.includes("PayloadTooLargeError")) {
      return { success: false, error: "El correo o los archivos adjuntos exceden el tamaño máximo permitido." };
    }

    if (allowFallback) {
      console.warn("sendRealNotificationEmail: respuesta no JSON recibida del servidor, activando simulación preventiva.");
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
    console.error("sendRealNotificationEmail error:", err);
    return { success: false, error: err.message || "Error al enviar el correo." };
  }
}

// Dispatch WhatsApp Notification via backend API
export async function sendRealNotificationWhatsApp(
  toPhone: string,
  message: string
): Promise<{ success: boolean; simulated?: boolean; message?: string; error?: string }> {
  try {
    const wa = getWhatsAppCredentials();
    const res = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: wa.provider,
        apiUrl: wa.apiUrl,
        phoneNumberId: wa.phoneNumberId,
        accessToken: wa.accessToken,
        to: toPhone,
        message: message
      })
    });

    const { isJson, data, rawText } = await safeParseJsonResponse(res);

    if (isJson && data) {
      if (!res.ok && !data.simulated) {
        throw new Error(data.error || "Error de red al enviar mensaje de WhatsApp");
      }
      return {
        success: data.success !== false,
        simulated: data.simulated,
        message: data.message
      };
    }

    return {
      success: true,
      simulated: true,
      message: `[Simulación] Mensaje WhatsApp registrado para <${toPhone}>.`
    };
  } catch (err: any) {
    console.error("sendRealNotificationWhatsApp error:", err);
    return { success: false, error: err.message || "Error al enviar mensaje de WhatsApp." };
  }
}

// Helper to replace dynamic template placeholders
export function replaceTaskTemplateVariables(
  template: string,
  task: Task,
  user: User | null | undefined,
  extra: {
    institutionName?: string;
    requestedByName?: string;
    remainingTimeText?: string;
    teamName?: string;
    assignedUserNames?: string;
  }
): string {
  const userName = user?.name || "Responsable";
  const title = task.title || "Tarea CRM";
  const dueDate = task.dueDate || "Sin fecha";
  const priority = task.priority || "Media";
  const type = task.type || "General";
  const notes = task.notes || "Sin observaciones adicionales.";
  const institution = extra.institutionName || "General / Sin asignar";
  const assignedBy = extra.requestedByName || task.requestedBy || "Sistema IHS";
  const remaining = extra.remainingTimeText || "Próxima a vencer";
  const teamName = extra.teamName || (task.teamId ? `Equipo #${task.teamId}` : "Sin equipo asignado");
  const assignedUsers = extra.assignedUserNames || userName;

  return template
    .replace(/{nombre_responsable}/g, userName)
    .replace(/{titulo_tarea}/g, title)
    .replace(/{fecha_limite}/g, dueDate)
    .replace(/{prioridad}/g, priority)
    .replace(/{tipo_tarea}/g, type)
    .replace(/{institucion}/g, institution)
    .replace(/{asignado_por}/g, assignedBy)
    .replace(/{notas}/g, notes)
    .replace(/{equipo}/g, teamName)
    .replace(/{nombre_equipo}/g, teamName)
    .replace(/{asignados}/g, assignedUsers)
    .replace(/{tiempo_restante}/g, remaining);
}

// Helper to resolve institution name from task
export function resolveTaskInstitutionName(
  task: Task,
  institutions?: Institution[],
  leads?: Array<{ id: string | number; name: string }>
): string {
  if (task.institutionId && institutions) {
    const inst = institutions.find(i => i.id === task.institutionId);
    if (inst) return inst.name;
  }
  if (task.leadId && leads) {
    const lead = leads.find(l => String(l.id) === String(task.leadId));
    if (lead) return lead.name;
  }
  // Try reading from localStorage CRM leads if not provided
  try {
    const saved = localStorage.getItem("crm_leads_v1");
    if (saved) {
      const parsedLeads = JSON.parse(saved);
      const lead = parsedLeads.find((l: any) => String(l.id) === String(task.leadId));
      if (lead) return lead.name;
    }
  } catch (e) {
    // Ignore
  }
  return "General / Prospecto CRM";
}

export interface TaskNotificationResult {
  emailDispatched: boolean;
  emailSuccess?: boolean;
  emailSimulated?: boolean;
  emailMessage?: string;
  whatsappDispatched: boolean;
  whatsappSuccess?: boolean;
  whatsappSimulated?: boolean;
  whatsappMessage?: string;
  errors: string[];
}

// High-level: Send Assignment Notification to the responsible user
export async function sendTaskAssignmentNotification(
  task: Task,
  user: User | null | undefined,
  context?: {
    institutions?: Institution[];
    leads?: Array<{ id: string | number; name: string }>;
    requestedByName?: string;
    teamName?: string;
    assignedUserNames?: string;
    forceEmail?: boolean;
    forceWhatsApp?: boolean;
  }
): Promise<TaskNotificationResult> {
  const result: TaskNotificationResult = {
    emailDispatched: false,
    whatsappDispatched: false,
    errors: []
  };

  if (!user) {
    result.errors.push("No se encontró usuario responsable para notificar.");
    return result;
  }

  const config = getTaskNotificationConfig();
  const shouldEmail = context?.forceEmail ?? config.notifyAssignmentEmail;
  const shouldWhatsApp = context?.forceWhatsApp ?? config.notifyAssignmentWhatsApp;

  const institutionName = resolveTaskInstitutionName(task, context?.institutions, context?.leads);
  const extraVars = {
    institutionName,
    teamName: context?.teamName,
    assignedUserNames: context?.assignedUserNames,
    requestedByName: context?.requestedByName || task.requestedBy || "Sistema IHS"
  };

  // 1. Email notification
  if (shouldEmail && user.email) {
    result.emailDispatched = true;
    const subject = replaceTaskTemplateVariables(config.assignmentTemplateEmail.subject, task, user, extraVars);
    const body = replaceTaskTemplateVariables(config.assignmentTemplateEmail.body, task, user, extraVars);
    
    const emailRes = await sendRealNotificationEmail(user.email, user.name, subject, body);
    result.emailSuccess = emailRes.success;
    result.emailSimulated = emailRes.simulated;
    result.emailMessage = emailRes.message || (emailRes.success ? "Correo enviado con éxito" : emailRes.error);
    if (!emailRes.success && emailRes.error) {
      result.errors.push(`Email: ${emailRes.error}`);
    }
  } else if (shouldEmail && !user.email) {
    result.errors.push(`El responsable ${user.name} no tiene correo electrónico registrado.`);
  }

  // 2. WhatsApp notification
  if (shouldWhatsApp && user.phone) {
    result.whatsappDispatched = true;
    const msg = replaceTaskTemplateVariables(config.assignmentTemplateWhatsApp, task, user, extraVars);
    
    const waRes = await sendRealNotificationWhatsApp(user.phone, msg);
    result.whatsappSuccess = waRes.success;
    result.whatsappSimulated = waRes.simulated;
    result.whatsappMessage = waRes.message || (waRes.success ? "WhatsApp enviado con éxito" : waRes.error);
    if (!waRes.success && waRes.error) {
      result.errors.push(`WhatsApp: ${waRes.error}`);
    }
  } else if (shouldWhatsApp && !user.phone) {
    result.errors.push(`El responsable ${user.name} no tiene teléfono registrado para WhatsApp.`);
  }

  return result;
}

// Calculate remaining time text helper
export function calculateRemainingTime(dueDateStr: string): { hoursRemaining: number; isOverdue: boolean; text: string } {
  if (!dueDateStr) {
    return { hoursRemaining: 9999, isOverdue: false, text: "Sin fecha definida" };
  }

  const now = new Date();
  const [year, month, day] = dueDateStr.split("-").map(Number);
  const due = new Date(year, month - 1, day, 23, 59, 59);

  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      hoursRemaining: diffHours,
      isOverdue: true,
      text: overdueDays <= 0 ? "Vence hoy / Vencida" : `Vencida hace ${overdueDays} día${overdueDays > 1 ? "s" : ""}`
    };
  }

  if (diffHours <= 24) {
    return {
      hoursRemaining: diffHours,
      isOverdue: false,
      text: "Vence hoy (en menos de 24 horas)"
    };
  }

  if (diffDays === 1) {
    return {
      hoursRemaining: diffHours,
      isOverdue: false,
      text: "Vence mañana"
    };
  }

  return {
    hoursRemaining: diffHours,
    isOverdue: false,
    text: `Vence en ${diffDays} días`
  };
}

// High-level: Send Deadline Alert Notification to the responsible user
export async function sendTaskDeadlineNotification(
  task: Task,
  user: User | null | undefined,
  context?: {
    institutions?: Institution[];
    leads?: Array<{ id: string | number; name: string }>;
    teamName?: string;
    forceEmail?: boolean;
    forceWhatsApp?: boolean;
  }
): Promise<TaskNotificationResult> {
  const result: TaskNotificationResult = {
    emailDispatched: false,
    whatsappDispatched: false,
    errors: []
  };

  if (!user) {
    result.errors.push("No se encontró usuario asignado a esta tarea.");
    return result;
  }

  const config = getTaskNotificationConfig();
  const shouldEmail = context?.forceEmail ?? config.notifyDeadlineEmail;
  const shouldWhatsApp = context?.forceWhatsApp ?? config.notifyDeadlineWhatsApp;

  const remaining = calculateRemainingTime(task.dueDate);
  const institutionName = resolveTaskInstitutionName(task, context?.institutions, context?.leads);
  const extraVars = {
    institutionName,
    teamName: context?.teamName,
    remainingTimeText: remaining.text
  };

  // 1. Email
  if (shouldEmail && user.email) {
    result.emailDispatched = true;
    const subject = replaceTaskTemplateVariables(config.deadlineTemplateEmail.subject, task, user, extraVars);
    const body = replaceTaskTemplateVariables(config.deadlineTemplateEmail.body, task, user, extraVars);

    const emailRes = await sendRealNotificationEmail(user.email, user.name, subject, body);
    result.emailSuccess = emailRes.success;
    result.emailSimulated = emailRes.simulated;
    result.emailMessage = emailRes.message || (emailRes.success ? "Recordatorio de correo enviado" : emailRes.error);
    if (!emailRes.success && emailRes.error) {
      result.errors.push(`Email: ${emailRes.error}`);
    }
  }

  // 2. WhatsApp
  if (shouldWhatsApp && user.phone) {
    result.whatsappDispatched = true;
    const msg = replaceTaskTemplateVariables(config.deadlineTemplateWhatsApp, task, user, extraVars);

    const waRes = await sendRealNotificationWhatsApp(user.phone, msg);
    result.whatsappSuccess = waRes.success;
    result.whatsappSimulated = waRes.simulated;
    result.whatsappMessage = waRes.message || (waRes.success ? "Recordatorio de WhatsApp enviado" : waRes.error);
    if (!waRes.success && waRes.error) {
      result.errors.push(`WhatsApp: ${waRes.error}`);
    }
  }

  return result;
}

// Track sent deadline alerts so we avoid spamming within the same day per user/task
export function hasDeadlineAlertBeenSentToday(taskId: number, userId?: number): boolean {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `task_deadline_alerts_log`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const log = JSON.parse(saved);
      const logKey = userId ? `${taskId}_${userId}_${today}` : `${taskId}_${today}`;
      return log[logKey] === true || log[`${taskId}_${today}`] === true;
    }
  } catch (err) {
    console.error(err);
  }
  return false;
}

export function recordDeadlineAlertSentToday(taskId: number, userId?: number): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `task_deadline_alerts_log`;
    const saved = localStorage.getItem(key);
    const log = saved ? JSON.parse(saved) : {};
    if (userId) {
      log[`${taskId}_${userId}_${today}`] = true;
    }
    log[`${taskId}_${today}`] = true;
    localStorage.setItem(key, JSON.stringify(log));
  } catch (err) {
    console.error(err);
  }
}

// Scan pending tasks and notify upcoming deadlines automatically
export async function checkAndNotifyUpcomingDeadlines(
  tasks: Task[],
  users: User[],
  institutions?: Institution[],
  leads?: Array<{ id: string | number; name: string }>,
  options?: { forceAll?: boolean; teams?: Team[] }
): Promise<{
  scannedCount: number;
  notifiedTasks: Array<{ task: Task; user: User; result: TaskNotificationResult }>;
}> {
  const config = getTaskNotificationConfig();
  const thresholdHours = config.deadlineHoursThreshold || 24;
  const notifiedTasks: Array<{ task: Task; user: User; result: TaskNotificationResult }> = [];

  const pendingTasks = tasks.filter(t => t.status === "Pendiente" && t.dueDate);

  for (const task of pendingTasks) {
    // Collect all assignees for this task
    let targetUserIds: number[] = task.userIds ? [...task.userIds] : [];
    if (task.teamId) {
      const teamUsers = users.filter(u => u.teamId === task.teamId).map(u => u.id);
      targetUserIds = Array.from(new Set([...targetUserIds, ...teamUsers]));
    }
    if (task.userId && !targetUserIds.includes(task.userId)) {
      targetUserIds.push(task.userId);
    }

    if (targetUserIds.length === 0) continue;

    const assignedUsers = users.filter(u => targetUserIds.includes(u.id));
    if (assignedUsers.length === 0) continue;

    const remaining = calculateRemainingTime(task.dueDate);
    // Trigger if remaining hours are within threshold or overdue
    const isDueSoon = remaining.hoursRemaining <= thresholdHours || remaining.isOverdue;

    if (isDueSoon) {
      const teamObj = task.teamId && options?.teams ? options.teams.find(tm => tm.id === task.teamId) : undefined;

      for (const user of assignedUsers) {
        const alreadySent = !options?.forceAll && hasDeadlineAlertBeenSentToday(task.id, user.id);
        if (!alreadySent) {
          const res = await sendTaskDeadlineNotification(task, user, { 
            institutions, 
            leads,
            teamName: teamObj?.name 
          });
          if (res.emailDispatched || res.whatsappDispatched) {
            recordDeadlineAlertSentToday(task.id, user.id);
            notifiedTasks.push({ task, user, result: res });
          }
        }
      }
    }
  }

  return {
    scannedCount: pendingTasks.length,
    notifiedTasks
  };
}
