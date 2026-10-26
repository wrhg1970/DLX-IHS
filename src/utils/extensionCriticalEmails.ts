import { safeLocalStorageGet, safeLocalStorageSet } from "./storage";
import { dispatchRealtimeNotification } from "./realtimeNotifications";

export interface SentCriticalEmailRecord {
  enrollmentId: number;
  classId: number;
  studentId: number;
  studentName: string;
  className: string;
  modality: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'coordinador' | 'alumno';
  sentAt: string;
  subject: string;
}

const STORAGE_KEY = 'ihs_extension_sent_critical_emails_v1';
const LAST_NOTIFIED_KEY = 'ihs_last_pending_critical_count_v1';

export function getSentCriticalEmailRecords(): Record<number, SentCriticalEmailRecord> {
  return safeLocalStorageGet<Record<number, SentCriticalEmailRecord>>(STORAGE_KEY, {});
}

export function isCriticalEmailSentForEnrollment(enrollmentId: number): boolean {
  const records = getSentCriticalEmailRecords();
  return Boolean(records[enrollmentId]);
}

export function markCriticalEmailAsSent(record: SentCriticalEmailRecord): void {
  const records = getSentCriticalEmailRecords();
  records[record.enrollmentId] = record;
  safeLocalStorageSet(STORAGE_KEY, records);
}

export function markMultipleCriticalEmailsAsSent(recordsList: SentCriticalEmailRecord[]): void {
  const records = getSentCriticalEmailRecords();
  recordsList.forEach(rec => {
    records[rec.enrollmentId] = rec;
  });
  safeLocalStorageSet(STORAGE_KEY, records);
}

export interface CriticalEmailPayload {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  className: string;
  classId: number;
  providerName: string;
  institutionName: string;
  modality: string;
  diffDays: number;
  effectiveExpDate: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'coordinador' | 'alumno';
  subject: string;
  body: string;
}

export function buildCriticalEmailPayload(item: {
  enrollment: { id: number; classId: number; };
  student: { id: number; name: string; lastName?: string; email?: string; modality?: string; };
  cls?: { id: number; name: string; };
  provider?: { legalName?: string; commercialName?: string; };
  institution?: { id: number; name: string; contact?: string; contactEmail?: string; email?: string; };
  academicContact?: { id: number; name: string; lastName?: string; email: string; position?: string; area?: string; } | null;
  diffDays: number;
  effectiveExpDate: string;
}): CriticalEmailPayload {
  const student = item.student;
  const studentName = `${student.name} ${student.lastName || ''}`.trim();
  const clsName = item.cls?.name || 'Materia Académica';
  const instName = item.institution?.name || 'Institución';
  const providerName = item.provider?.commercialName || item.provider?.legalName || 'Proveedor';
  const modality = student.modality || 'Estándar';
  const isHomeschool = modality.trim().toLowerCase() === 'homeschool';

  let recipientRole: 'coordinador' | 'alumno' = 'coordinador';
  let recipientEmail = '';
  let recipientName = '';
  let subject = '';
  let body = '';

  const diasRestantesText = item.diffDays === 0 
    ? 'Vence hoy' 
    : item.diffDays === 1 
      ? 'Queda 1 día' 
      : `Quedan ${item.diffDays} días`;

  if (isHomeschool) {
    recipientRole = 'alumno';
    recipientEmail = student.email?.trim() || '';
    recipientName = studentName;
    subject = `🚨 Alerta Crítica (≤ 15 días): Tu materia ${clsName} está próxima a vencer - IHS Homeschool`;
    body = `Hola ${studentName},

Te enviamos este aviso urgente de la Coordinación Académica de International High School (IHS) Homeschool para notificarte que tu materia se encuentra en ESTADO CRÍTICO (≤ 15 días para concluir):

• Materia: ${clsName}
• Proveedor / Plataforma: ${providerName}
• Fecha Límite de Expiración: ${item.effectiveExpDate}
• Días Restantes: ${diasRestantesText}

Te recomendamos ingresar de inmediato a la plataforma para completar y entregar todas tus tareas pendientes, proyectos y presentar tus exámenes finales antes de la fecha límite para acreditar satisfactoriamente tu curso.

Si requieres más tiempo para concluir tu materia, por favor solicita una extensión o prórroga con tu asesor o agente académico antes de que venza el plazo.

¡Mucho éxito en el cierre de tu materia!

Saludos cordiales,
Coordinación Académica IHS Homeschool
International High School`;
  } else {
    recipientRole = 'coordinador';
    const ac = item.academicContact;
    recipientEmail = ac?.email?.trim() || item.institution?.contactEmail?.trim() || item.institution?.email?.trim() || '';
    recipientName = ac?.name 
      ? `${ac.name} ${ac.lastName || ''}`.trim() 
      : (item.institution?.contact || `Coordinación de ${instName}`);
    
    subject = `🚨 Alerta Crítica (≤ 15 días): Vencimiento de Materia - ${studentName} (${clsName}) - ${instName}`;
    body = `Estimado(a) ${recipientName},
Coordinación Académica de ${instName}:

Nos comunicamos desde International High School (IHS) para informarle que la siguiente materia ha entrado en ESTADO CRÍTICO al restarle 15 días o menos de periodo lectivo:

• Alumno: ${studentName}
• Modalidad: ${modality}
• Institución: ${instName}
• Materia: ${clsName}
• Proveedor / Plataforma: ${providerName}
• Fecha Límite de Expiración: ${item.effectiveExpDate}
• Días Restantes: ${diasRestantesText} (Estado Crítico ≤ 15 días)

Le solicitamos su oportuno apoyo para dar seguimiento con el estudiante y asegurar la entrega oportuna de sus evaluaciones y proyectos antes de la fecha señalada, o en su defecto gestionar oportunamente una prórroga o extensión de periodo lectivo a través de nuestra plataforma.

Quedamos a su entera disposición para cualquier soporte o solicitud que requiera.

Atentamente,
Coordinación Académica
International High School (IHS)`;
  }

  return {
    enrollmentId: item.enrollment.id,
    studentId: student.id,
    studentName,
    className: clsName,
    classId: item.cls?.id || item.enrollment.classId,
    providerName,
    institutionName: instName,
    modality,
    diffDays: item.diffDays,
    effectiveExpDate: item.effectiveExpDate,
    recipientEmail,
    recipientName,
    recipientRole,
    subject,
    body
  };
}

/**
 * Dispatches a notification if there are pending critical emails that have not been notified in this session
 */
export function notifyPendingCriticalEmails(pendingCount: number, force: boolean = false): void {
  if (pendingCount <= 0) return;

  try {
    const lastNotifiedCountStr = sessionStorage.getItem(LAST_NOTIFIED_KEY);
    const lastNotifiedCount = lastNotifiedCountStr ? parseInt(lastNotifiedCountStr, 10) : null;

    if (!force && lastNotifiedCount === pendingCount) {
      return; // already notified in this session for this specific count
    }

    sessionStorage.setItem(LAST_NOTIFIED_KEY, String(pendingCount));

    dispatchRealtimeNotification({
      title: "Correos por Enviar (Extensión Crítica)",
      message: `Hay ${pendingCount} ${pendingCount === 1 ? 'materia' : 'materias'} en estado crítico (≤ 15 días) con correo pendiente para coordinador o estudiante.`,
      type: 'task',
      team: 'Extensión Académica',
      actionUrl: '/alumnos/extension'
    });
  } catch (e) {
    console.error("Error dispatching pending critical emails notification:", e);
  }
}

/**
 * Computes the number of enrollments currently in critical status (<= 15 days)
 * whose single notification email has not yet been sent.
 */
export function getPendingCriticalEnrollmentCount(
  enrollments: any[],
  students: any[]
): number {
  if (!enrollments || !students) return 0;
  const sentMap = getSentCriticalEmailRecords();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTime = new Date(todayStr + 'T00:00:00').getTime();

  let count = 0;
  for (const env of enrollments) {
    if (env.status === 'Withdrawn') continue;
    if (env.gradeOutcome === 'Pass' || env.gradeOutcome === 'Fail') continue;
    
    // Check if already sent (only 1 time per class)
    if (sentMap[env.id]) continue;

    const student = students.find((s: any) => s.id === env.studentId);
    if (!student) continue;
    const isStudentActive = !student.status || 
      student.status.toLowerCase().includes('act') || 
      student.status === 'Activo';
    if (!isStudentActive) continue;

    const effectiveExpDate = env.hasExtension && env.extensionDate 
      ? env.extensionDate 
      : env.endDate;
    if (!effectiveExpDate) continue;

    const expTime = new Date(effectiveExpDate.split('T')[0] + 'T00:00:00').getTime();
    if (isNaN(expTime)) continue;

    const diffDays = Math.round((expTime - todayTime) / (1000 * 60 * 60 * 24));
    // Critical: igual o menor de 15 días (diffDays <= 15 && diffDays >= 0)
    if (diffDays <= 15 && diffDays >= 0) {
      count++;
    }
  }
  return count;
}
