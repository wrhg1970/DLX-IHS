import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Building2, 
  BookOpen, 
  Truck, 
  GraduationCap, 
  Download, 
  X, 
  ChevronRight, 
  ChevronDown, 
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  Mail,
  Send,
  Check,
  Users,
  User,
  Copy,
  Eye,
  MessageSquare,
  AlertCircle,
  UserCheck,
  CheckSquare,
  Square,
  BellRing
} from 'lucide-react';
import { useAppContext, Enrollment } from '../context/AppContext';
import { normalizeDateToISO, getTodayISODate } from '../utils/enrollmentStatus';
import { 
  getSentCriticalEmailRecords, 
  markMultipleCriticalEmailsAsSent, 
  buildCriticalEmailPayload, 
  notifyPendingCriticalEmails, 
  SentCriticalEmailRecord,
  CriticalEmailPayload 
} from '../utils/extensionCriticalEmails';
import { dispatchRealtimeNotification } from '../utils/realtimeNotifications';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storage';

export function AlumnosExtension() {
  const navigate = useNavigate();
  const { 
    enrollments, 
    students, 
    classes, 
    institutions, 
    providers, 
    contacts,
    updateEnrollment, 
    addActivity,
    currentUser 
  } = useAppContext();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'upcoming' | 'expired' | 'pending_email'>('all');
  const [extensionStatusFilter, setExtensionStatusFilter] = useState<'all' | 'without_extension' | 'with_extension'>('all');
  const [sortBy, setSortBy] = useState<'exp_asc' | 'exp_desc' | 'student_asc' | 'inst_asc'>('exp_asc');

  // Selection state for bulk operations
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);

  // Modal for managing individual class extension
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    enrollment: Enrollment;
    student: any;
    cls: any;
    provider: any;
    institution: any;
    academicContact: {
      id: number;
      name: string;
      lastName?: string;
      email: string;
      position?: string;
      area?: string;
      phone?: string;
      institutionId: number;
    } | null;
    diffDays: number;
    effectiveExpDate: string;
  } | null>(null);

  const [modalForm, setModalForm] = useState({
    hasExtension: false,
    extensionDate: '',
    notes: '',
  });
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  // Bulk Email Reminder Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientTarget, setRecipientTarget] = useState<'student' | 'school' | 'both'>('student');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showRecipientList, setShowRecipientList] = useState(false);

  // Critical Automated Email State
  const [sentCriticalMap, setSentCriticalMap] = useState<Record<number, SentCriticalEmailRecord>>(() => getSentCriticalEmailRecords());
  const [isCriticalEmailModalOpen, setIsCriticalEmailModalOpen] = useState(false);
  const [selectedCriticalItemForPreview, setSelectedCriticalItemForPreview] = useState<CriticalEmailPayload | null>(null);
  const [isDispatchingCritical, setIsDispatchingCritical] = useState(false);
  const [autoSendCritical, setAutoSendCritical] = useState<boolean>(() => safeLocalStorageGet('ihs_auto_send_critical_emails', false));

  const todayStr = getTodayISODate();
  const todayTime = new Date(todayStr + 'T00:00:00').getTime();

  // Helper date calculations
  const addDaysToDate = (baseDateStr: string, days: number): string => {
    const iso = normalizeDateToISO(baseDateStr) || todayStr;
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Base list of active students with classes expiring in 30 days or less OR expired up to 30 days ago
  const expiringEnrollments = useMemo(() => {
    return enrollments
      .map(env => {
        const student = students.find(s => s.id === env.studentId);
        // Student must exist and be active
        if (!student) return null;
        if (currentUser?.role === 'Coordinador' && currentUser.institutionId) {
          if (student.institutionId !== currentUser.institutionId) return null;
        }
        const isStudentActive = !student.status || 
          student.status.toLowerCase().includes('act') || 
          student.status === 'Activo';
        if (!isStudentActive) return null;

        // Skip Withdrawn or already Completed classes
        if (env.status === 'Withdrawn') return null;
        if (env.gradeOutcome === 'Pass' || env.gradeOutcome === 'Fail') return null;

        // Determine expiration date
        const originalEndDate = env.endDate;
        if (!originalEndDate) return null;

        const effectiveExpDate = env.hasExtension && env.extensionDate 
          ? env.extensionDate 
          : originalEndDate;

        const expISO = normalizeDateToISO(effectiveExpDate);
        if (!expISO) return null;

        const expTime = new Date(expISO + 'T00:00:00').getTime();
        const diffDays = Math.round((expTime - todayTime) / (1000 * 60 * 60 * 24));

        // Range constraint: máximo 30 días de haber vencido (-30) o 30 días antes de vencer (+30)
        if (diffDays < -30 || diffDays > 30) return null;

        const cls = classes.find(c => c.id === env.classId);
        const provider = providers.find(p => p.id === (env.providerId || cls?.providerId));
        const institution = institutions.find(i => i.id === student.institutionId);

        // Academic contact resolution for the school
        const academicContact = (() => {
          if (!student.institutionId) return null;
          const instContacts = (contacts || []).filter(c => c.institutionId === student.institutionId);
          // Priority 1: academic position or area
          const academic = instContacts.find(c => {
            const txt = `${c.position || ''} ${c.area || ''}`.toLowerCase();
            return (
              txt.includes('acad') || 
              txt.includes('coord') || 
              txt.includes('direc') || 
              txt.includes('escolar') || 
              txt.includes('docen') ||
              txt.includes('tutor')
            ) && Boolean(c.email);
          });
          if (academic) {
            return {
              id: academic.id,
              name: academic.name,
              lastName: academic.lastName,
              email: academic.email,
              position: academic.position || 'Contacto Académico',
              area: academic.area || 'Académica',
              phone: academic.phone,
              institutionId: academic.institutionId
            };
          }

          // Priority 2: any contact with email
          const anyWithEmail = instContacts.find(c => Boolean(c.email));
          if (anyWithEmail) {
            return {
              id: anyWithEmail.id,
              name: anyWithEmail.name,
              lastName: anyWithEmail.lastName,
              email: anyWithEmail.email,
              position: anyWithEmail.position || 'Contacto Institucional',
              area: anyWithEmail.area || 'Coordinación',
              phone: anyWithEmail.phone,
              institutionId: anyWithEmail.institutionId
            };
          }

          // Priority 3: institution email
          if (institution?.contactEmail || institution?.email) {
            return {
              id: 0,
              name: institution.contact || institution.name,
              lastName: '',
              email: institution.contactEmail || institution.email || '',
              position: institution.contactPosition || 'Contacto Institucional',
              area: 'Dirección Escolar',
              phone: institution.contactPhone || institution.phone || '',
              institutionId: institution.id
            };
          }

          return null;
        })();

        return {
          enrollment: env,
          student,
          cls,
          provider,
          institution,
          academicContact,
          diffDays,
          originalEndDate,
          effectiveExpDate: expISO,
          hasExtension: Boolean(env.hasExtension),
          extensionDate: env.extensionDate || '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [enrollments, students, classes, providers, institutions, contacts, currentUser, todayTime]);

  // Overall metric counts: Critico <= 15d, Proximas 15-30d, Vencidas <= 30d
  const metrics = useMemo(() => {
    const total = expiringEnrollments.length;
    const critical = expiringEnrollments.filter(e => e.diffDays <= 15 && e.diffDays >= 0).length;
    const expired = expiringEnrollments.filter(e => e.diffDays < 0 && e.diffDays >= -30).length;
    const upcoming = expiringEnrollments.filter(e => e.diffDays > 15 && e.diffDays <= 30).length;
    const withExtension = expiringEnrollments.filter(e => e.hasExtension).length;
    const withoutExtension = total - withExtension;

    return { total, critical, expired, upcoming, withExtension, withoutExtension };
  }, [expiringEnrollments]);

  // Pending Critical Emails list (classes in critical status diffDays <= 15 that haven't received their single email)
  const pendingCriticalList = useMemo(() => {
    return expiringEnrollments.filter(e => e.diffDays <= 15 && e.diffDays >= 0 && !sentCriticalMap[e.enrollment.id]);
  }, [expiringEnrollments, sentCriticalMap]);

  // Dispatch real-time notification to inform user of pending critical emails
  useEffect(() => {
    if (pendingCriticalList.length > 0) {
      notifyPendingCriticalEmails(pendingCriticalList.length);
    }
  }, [pendingCriticalList.length]);

  // Filter and sort the list
  const filteredList = useMemo(() => {
    let list = [...expiringEnrollments];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(item => {
        const studentName = `${item.student.name} ${item.student.lastName || ''}`.toLowerCase();
        const customId = (item.student.studentCustomId || '').toLowerCase();
        const email = (item.student.email || '').toLowerCase();
        const className = (item.cls?.name || '').toLowerCase();
        const classCode = (item.cls?.code || '').toLowerCase();
        const instName = (item.institution?.name || '').toLowerCase();
        const provName = ((item.provider?.commercialName || item.provider?.legalName) || '').toLowerCase();
        const contactName = (item.academicContact?.name || '').toLowerCase();
        const contactEmail = (item.academicContact?.email || '').toLowerCase();

        return (
          studentName.includes(q) ||
          customId.includes(q) ||
          email.includes(q) ||
          className.includes(q) ||
          classCode.includes(q) ||
          instName.includes(q) ||
          provName.includes(q) ||
          contactName.includes(q) ||
          contactEmail.includes(q)
        );
      });
    }

    // Institution filter
    if (selectedInstitution !== 'all') {
      const instId = Number(selectedInstitution);
      list = list.filter(item => item.institution?.id === instId);
    }

    // Provider filter
    if (selectedProvider !== 'all') {
      const provId = Number(selectedProvider);
      list = list.filter(item => item.provider?.id === provId);
    }

    // Urgency filter: Crítico <= 15 días, Próximas 15 - 30 días, Vencidas <= 30 días, Correos Pendientes
    if (urgencyFilter === 'critical') {
      list = list.filter(item => item.diffDays <= 15 && item.diffDays >= 0);
    } else if (urgencyFilter === 'upcoming') {
      list = list.filter(item => item.diffDays > 15 && item.diffDays <= 30);
    } else if (urgencyFilter === 'expired') {
      list = list.filter(item => item.diffDays < 0 && item.diffDays >= -30);
    } else if (urgencyFilter === 'pending_email') {
      list = list.filter(item => item.diffDays <= 15 && item.diffDays >= 0 && !sentCriticalMap[item.enrollment.id]);
    }

    // Extension status filter
    if (extensionStatusFilter === 'without_extension') {
      list = list.filter(item => !item.hasExtension);
    } else if (extensionStatusFilter === 'with_extension') {
      list = list.filter(item => item.hasExtension);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'exp_asc') {
        return a.diffDays - b.diffDays;
      }
      if (sortBy === 'exp_desc') {
        return b.diffDays - a.diffDays;
      }
      if (sortBy === 'student_asc') {
        const nameA = `${a.student.name} ${a.student.lastName || ''}`.toLowerCase();
        const nameB = `${b.student.name} ${b.student.lastName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'inst_asc') {
        const instA = (a.institution?.name || '').toLowerCase();
        const instB = (b.institution?.name || '').toLowerCase();
        return instA.localeCompare(instB);
      }
      return 0;
    });

    return list;
  }, [
    expiringEnrollments, 
    searchTerm, 
    selectedInstitution, 
    selectedProvider, 
    urgencyFilter, 
    extensionStatusFilter, 
    sortBy
  ]);

  // Default templates generator
  const getDefaultTemplates = (target: 'student' | 'school' | 'both') => {
    if (target === 'student') {
      return {
        subject: 'Recordatorio Académico: Próximo vencimiento de tu clase {clase} - IHS',
        body: `Hola {alumno},

Esperamos que te encuentres muy bien. Te enviamos este recordatorio académico referente a tu periodo de estudio:

• Alumno: {alumno}
• Institución: {institucion}
• Materia: {clase}
• Proveedor / Plataforma: {proveedor}
• Fecha de Expiración: {fecha_vencimiento} ({dias_restantes})

Te sugerimos verificar tu avance, entregar todas las tareas y presentar los exámenes pendientes antes de la fecha límite para concluir exitosamente tu acreditación académica.

Si consideras que requerirás tiempo adicional, por favor ponte en contacto con la coordinación académica de tu escuela para evaluar una prórroga o extensión de periodo.

Saludos cordiales,
Coordinación Académica
International High School (IHS)`
      };
    } else if (target === 'school') {
      return {
        subject: 'Aviso Académico: Vencimiento de periodos lectivos - {institucion} / IHS',
        body: `Estimado(a) {destinatario},

Nos comunicamos desde la Coordinación Académica de International High School (IHS) para solicitar su apoyo con el seguimiento académico del siguiente estudiante:

• Alumno: {alumno}
• Institución: {institucion}
• Materia: {clase}
• Proveedor / Plataforma: {proveedor}
• Fecha Límite de Expiración: {fecha_vencimiento} ({dias_restantes})

Le solicitamos su apoyo para dar seguimiento con el estudiante y asegurar la entrega oportuna de sus evaluaciones y proyectos antes de la fecha señalada, o en su defecto gestionar oportunamente una prórroga o extensión de periodo.

Quedamos a su entera disposición para cualquier soporte o solicitud que requiera.

Atentamente,
Coordinación Académica
International High School (IHS)`
      };
    } else {
      return {
        subject: 'Recordatorio Académico: Vencimiento de periodo lectivo - {alumno} ({clase})',
        body: `Estimados {destinatario},

Por medio del presente aviso de International High School (IHS), enviamos un recordatorio conjunto respecto al periodo de estudio de la siguiente materia:

• Alumno: {alumno}
• Institución: {institucion}
• Materia: {clase}
• Proveedor / Plataforma: {proveedor}
• Fecha Límite de Expiración: {fecha_vencimiento} ({dias_restantes})

Recordamos la importancia de concluir satisfactoriamente las actividades académicas previas a la fecha límite o bien gestionar una prórroga de periodo a la brevedad.

Atentamente,
Coordinación Académica
International High School (IHS)`
      };
    }
  };

  // Interpolate dynamic template placeholders
  const interpolateTemplate = (
    text: string, 
    item: typeof expiringEnrollments[0], 
    target: 'student' | 'school' | 'both' = recipientTarget
  ) => {
    let destName = '';
    if (target === 'student') {
      destName = `${item.student.name} ${item.student.lastName || ''}`.trim();
    } else if (target === 'school') {
      destName = item.academicContact?.name 
        ? `${item.academicContact.name} ${item.academicContact.lastName || ''} (${item.academicContact.position || 'Coordinación'})`
        : `Coordinación Académica de ${item.institution?.name || 'la Escuela'}`;
    } else {
      destName = `${item.student.name} y Coordinación de ${item.institution?.name || 'la Escuela'}`;
    }

    let diasTxt = '';
    if (item.diffDays < 0) {
      diasTxt = `Venció hace ${Math.abs(item.diffDays)} días`;
    } else if (item.diffDays === 0) {
      diasTxt = 'Vence Hoy';
    } else {
      diasTxt = `Vence en ${item.diffDays} días`;
    }

    return text
      .replace(/{alumno}/gi, `${item.student.name} ${item.student.lastName || ''}`.trim())
      .replace(/{estudiante}/gi, `${item.student.name} ${item.student.lastName || ''}`.trim())
      .replace(/{clase}/gi, item.cls?.name || 'Clase')
      .replace(/{materia}/gi, item.cls?.name || 'Clase')
      .replace(/{institucion}/gi, item.institution?.name || 'Institución')
      .replace(/{escuela}/gi, item.institution?.name || 'Escuela')
      .replace(/{proveedor}/gi, item.provider?.commercialName || item.provider?.legalName || 'Proveedor')
      .replace(/{fecha_vencimiento}/gi, item.effectiveExpDate)
      .replace(/{fecha}/gi, item.effectiveExpDate)
      .replace(/{dias_restantes}/gi, diasTxt)
      .replace(/{destinatario}/gi, destName);
  };

  // Resolve target email addresses according to recipient mode
  const getResolvedEmailsForItem = (
    item: typeof expiringEnrollments[0], 
    target: 'student' | 'school' | 'both' = recipientTarget
  ): string[] => {
    const emails: string[] = [];
    if (target === 'student' || target === 'both') {
      if (item.student.email && item.student.email.trim()) {
        emails.push(item.student.email.trim());
      }
    }
    if (target === 'school' || target === 'both') {
      if (item.academicContact?.email && item.academicContact.email.trim()) {
        emails.push(item.academicContact.email.trim());
      }
    }
    return Array.from(new Set(emails));
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    const filteredIds = filteredList.map(item => item.enrollment.id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedEnrollmentIds.includes(id));
    
    if (areAllSelected) {
      setSelectedEnrollmentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedEnrollmentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectOne = (id: number) => {
    setSelectedEnrollmentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedEnrollmentIds([]);
  };

  const handleSelectAllFiltered = () => {
    setSelectedEnrollmentIds(filteredList.map(item => item.enrollment.id));
  };

  const handleSelectOnlyVencidas = () => {
    const expiredIds = filteredList.filter(item => item.diffDays < 0).map(item => item.enrollment.id);
    setSelectedEnrollmentIds(expiredIds);
  };

  const handleSelectOnlyCriticas = () => {
    const critIds = filteredList.filter(item => item.diffDays >= 0 && item.diffDays <= 15).map(item => item.enrollment.id);
    setSelectedEnrollmentIds(critIds);
  };

  // Selected items for bulk email
  const selectedItemsForEmail = useMemo(() => {
    return filteredList.filter(item => selectedEnrollmentIds.includes(item.enrollment.id));
  }, [filteredList, selectedEnrollmentIds]);

  // Open Bulk Email Modal
  const handleOpenBulkEmailModal = (customItems?: typeof filteredList) => {
    if (customItems && customItems.length > 0) {
      setSelectedEnrollmentIds(customItems.map(item => item.enrollment.id));
    }
    const tpl = getDefaultTemplates(recipientTarget);
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
    setEmailSuccessMsg(null);
    setShowRecipientList(false);
    setIsEmailModalOpen(true);
  };

  const handleOpenSingleEmailModal = (item: typeof filteredList[0]) => {
    setSelectedEnrollmentIds([item.enrollment.id]);
    const tpl = getDefaultTemplates(recipientTarget);
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
    setEmailSuccessMsg(null);
    setShowRecipientList(false);
    setIsEmailModalOpen(true);
  };

  const handleChangeRecipientTarget = (newTarget: 'student' | 'school' | 'both') => {
    setRecipientTarget(newTarget);
    const tpl = getDefaultTemplates(newTarget);
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
  };

  // Execute sending bulk emails
  const handleExecuteSendEmails = () => {
    if (selectedItemsForEmail.length === 0) return;
    setIsSendingEmail(true);

    const targetItemsWithEmails = selectedItemsForEmail.map(item => ({
      item,
      emails: getResolvedEmailsForItem(item, recipientTarget)
    })).filter(entry => entry.emails.length > 0);

    // Record activity in AppContext
    targetItemsWithEmails.forEach(({ item, emails }) => {
      const interpSubj = interpolateTemplate(emailSubject, item, recipientTarget);
      addActivity({
        institutionId: item.institution?.id || 0,
        date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        description: `Recordatorio académico enviado (${recipientTarget === 'student' ? 'Correo Alumno' : recipientTarget === 'school' ? 'Contacto Académico Escuela' : 'Alumno y Contacto Académico'}) a: [${emails.join(', ')}] para ${item.student.name} ${item.student.lastName || ''} - Materia: ${item.cls?.name || 'Clase'} (Vence: ${item.effectiveExpDate}). Asunto: "${interpSubj}".`
      });
    });

    setTimeout(() => {
      setIsSendingEmail(false);
      const totalRecipientsCount = targetItemsWithEmails.reduce((acc, curr) => acc + curr.emails.length, 0);
      setEmailSuccessMsg(`¡Se despacharon con éxito los recordatorios para ${targetItemsWithEmails.length} materias seleccionadas (${totalRecipientsCount} correos enviados)!`);
    }, 650);
  };

  const handleOpenMailto = () => {
    const allEmails: string[] = [];
    selectedItemsForEmail.forEach(item => {
      const em = getResolvedEmailsForItem(item, recipientTarget);
      allEmails.push(...em);
    });
    const uniqueEmails = Array.from(new Set(allEmails));
    const firstItem = selectedItemsForEmail[0];
    const sampleSubj = firstItem ? interpolateTemplate(emailSubject, firstItem, recipientTarget) : emailSubject;
    const sampleBody = firstItem ? interpolateTemplate(emailBody, firstItem, recipientTarget) : emailBody;

    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(uniqueEmails.join(','))}&subject=${encodeURIComponent(sampleSubj)}&body=${encodeURIComponent(sampleBody)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyEmails = () => {
    const allEmails: string[] = [];
    selectedItemsForEmail.forEach(item => {
      const em = getResolvedEmailsForItem(item, recipientTarget);
      allEmails.push(...em);
    });
    const uniqueEmails = Array.from(new Set(allEmails));
    navigator.clipboard.writeText(uniqueEmails.join(', '));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Aliases and state helpers for Email Modal
  const emailRecipientsList = useMemo(() => {
    return selectedItemsForEmail.length > 0 ? selectedItemsForEmail : filteredList;
  }, [selectedItemsForEmail, filteredList]);

  const computedEmails = useMemo(() => {
    const all: string[] = [];
    emailRecipientsList.forEach(item => {
      all.push(...getResolvedEmailsForItem(item, recipientTarget));
    });
    return Array.from(new Set(all));
  }, [emailRecipientsList, recipientTarget]);

  const sampleItem = emailRecipientsList[0] || null;
  const copySuccess = copiedNotification;
  const showRecipientDetails = showRecipientList;
  const setShowRecipientDetails = setShowRecipientList;
  const handleCopyRecipients = handleCopyEmails;
  const handleOpenMailClient = handleOpenMailto;
  const handleSendEmails = handleExecuteSendEmails;

  // Handler for bulk dispatching automatic critical emails (1 time per class)
  const handleExecuteDispatchCriticalEmails = (itemsToDispatch: typeof pendingCriticalList) => {
    if (itemsToDispatch.length === 0) return;
    setIsDispatchingCritical(true);

    const recordsToSave: SentCriticalEmailRecord[] = [];
    const nowIso = new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let homeschoolCount = 0;
    let schoolCount = 0;

    itemsToDispatch.forEach(item => {
      // Strictly enforce: Solo se envia 1 vez por clase
      if (sentCriticalMap[item.enrollment.id]) return;

      const payload = buildCriticalEmailPayload(item);
      if (payload.recipientRole === 'alumno') {
        homeschoolCount++;
      } else {
        schoolCount++;
      }

      const rec: SentCriticalEmailRecord = {
        enrollmentId: payload.enrollmentId,
        classId: payload.classId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        className: payload.className,
        modality: payload.modality,
        recipientEmail: payload.recipientEmail,
        recipientName: payload.recipientName,
        recipientRole: payload.recipientRole,
        sentAt: nowIso,
        subject: payload.subject
      };

      recordsToSave.push(rec);

      // Register activity in AppContext
      addActivity({
        institutionId: item.institution?.id || 0,
        date: nowIso,
        description: `Correo crítico enviado automáticamente (≤ 15 días) a ${payload.recipientRole === 'alumno' ? 'Estudiante Homeschool' : 'Coordinador de Escuela'} [${payload.recipientEmail || 'Sin correo'}] para el alumno ${payload.studentName} en la materia "${payload.className}". Asunto: "${payload.subject}".`
      });
    });

    markMultipleCriticalEmailsAsSent(recordsToSave);
    const updatedMap = getSentCriticalEmailRecords();
    setSentCriticalMap(updatedMap);

    setTimeout(() => {
      setIsDispatchingCritical(false);
      setIsCriticalEmailModalOpen(false);
      setSelectedCriticalItemForPreview(null);

      dispatchRealtimeNotification({
        title: "Correos Críticos Despachados",
        message: `Se enviaron exitosamente ${recordsToSave.length} correos críticos (${homeschoolCount} a estudiantes Homeschool y ${schoolCount} a coordinadores de escuela).`,
        type: 'task',
        team: 'Extensión Académica',
        actionUrl: '/alumnos/extension'
      });

      setEmailSuccessMsg(
        `¡Se despacharon con éxito ${recordsToSave.length} correos críticos! (${homeschoolCount} a alumnos Homeschool y ${schoolCount} a coordinadores de escuela). Cada clase quedó registrada y no se volverá a enviar.`
      );
    }, 600);
  };

  // Automated dispatch trigger when autoSendCritical is enabled
  useEffect(() => {
    if (autoSendCritical && pendingCriticalList.length > 0 && !isDispatchingCritical) {
      handleExecuteDispatchCriticalEmails(pendingCriticalList);
    }
  }, [autoSendCritical, pendingCriticalList.length, isDispatchingCritical]);

  const handleOpenSingleCriticalEmailModal = (item: typeof expiringEnrollments[0]) => {
    const payload = buildCriticalEmailPayload(item);
    setSelectedCriticalItemForPreview(payload);
    setIsCriticalEmailModalOpen(true);
  };

  // Handlers for individual extension modal
  const handleOpenExtensionModal = (item: typeof filteredList[0]) => {
    setSelectedItem(item);
    setModalForm({
      hasExtension: !!item.hasExtension,
      extensionDate: item.extensionDate || addDaysToDate(item.effectiveExpDate, 30),
      notes: item.extensionNotes || '',
    });
    setModalSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updatedEnrollment: Partial<Enrollment> = {
      hasExtension: modalForm.hasExtension,
      extensionDate: modalForm.hasExtension ? modalForm.extensionDate : undefined,
      extensionNotes: modalForm.notes.trim() || undefined,
    };

    updateEnrollment(selectedItem.enrollment.id, updatedEnrollment);

    addActivity({
      institutionId: selectedItem.institution?.id || 0,
      date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      description: `Se ${modalForm.hasExtension ? 'actualizó o aplicó prórroga hasta el ' + modalForm.extensionDate : 'removió la prórroga'} para el alumno ${selectedItem.student.name} ${selectedItem.student.lastName || ''} en la materia "${selectedItem.cls?.name || 'Clase'}". Notas: ${modalForm.notes || 'Sin notas'}.`
    });

    setModalSuccessMsg('¡Prórroga guardada exitosamente!');
    setTimeout(() => {
      setIsModalOpen(false);
      setModalSuccessMsg(null);
    }, 1200);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    
    const headers = [
      'ID Matrícula',
      'Alumno',
      'Email Alumno',
      'ID Institución',
      'Institución',
      'Contacto Académico',
      'Email Contacto Académico',
      'Clase',
      'Código Clase',
      'Proveedor',
      'Fecha Expiración Original',
      'Tiene Prórroga',
      'Fecha Prórroga',
      'Fecha Vigente',
      'Días Restantes',
      'Estatus Urgencia',
      'Notas Prórroga'
    ];

    const rows = filteredList.map(item => {
      let urgencia = 'Normal';
      if (item.diffDays < 0) urgencia = 'Vencida (≤30d)';
      else if (item.diffDays <= 15) urgencia = 'Crítica (≤15d)';
      else if (item.diffDays <= 30) urgencia = 'Próxima (15-30d)';

      return [
        `"${item.student.studentCustomId || item.student.id}"`,
        `"${item.student.name} ${item.student.lastName || ''}"`,
        `"${item.student.email || ''}"`,
        `"${item.institution?.id || ''}"`,
        `"${item.institution?.name || ''}"`,
        `"${item.academicContact ? item.academicContact.name + ' ' + (item.academicContact.lastName || '') : ''}"`,
        `"${item.academicContact?.email || ''}"`,
        `"${item.cls?.name || ''}"`,
        `"${item.cls?.code || ''}"`,
        `"${item.provider?.commercialName || item.provider?.legalName || ''}"`,
        `"${item.enrollment.expirationDate || ''}"`,
        `"${item.hasExtension ? 'SÍ' : 'NO'}"`,
        `"${item.extensionDate || ''}"`,
        `"${item.effectiveExpDate || ''}"`,
        `"${item.diffDays}"`,
        `"${urgencia}"`,
        `"${(item.extensionNotes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Extensiones_Alumnos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="alumnos-extension-page" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Gestión Académica</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Extensión de Clases
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Estudiantes activos con materias cuya fecha de expiración tenga <strong>máximo 30 días de haber vencido o 30 días antes de vencer</strong>.
            Selecciona varios estudiantes para enviarles recordatorios masivos por correo (al alumno o al contacto académico del colegio) o tramitar prórrogas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Email button */}
          <button
            id="open-bulk-email-btn"
            onClick={() => handleOpenBulkEmailModal()}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            title="Enviar recordatorio masivo por correo a alumnos o contactos académicos"
          >
            <Mail className="w-4 h-4" />
            <span>
              {selectedEnrollmentIds.length > 0 
                ? `Enviar Recordatorio (${selectedEnrollmentIds.length})` 
                : 'Enviar Recordatorio Masivo'}
            </span>
          </button>

          {/* Export to CSV */}
          <button
            id="export-extension-csv-btn"
            onClick={handleExportCSV}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar Lista ({filteredList.length})</span>
          </button>
        </div>
      </div>

      {/* Critical Automated Email Alert Banner */}
      {pendingCriticalList.length > 0 ? (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border-2 border-rose-300 rounded-2xl p-4.5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                  Correos por Enviar: {pendingCriticalList.length} {pendingCriticalList.length === 1 ? 'materia en Estado Crítico (≤ 15 días)' : 'materias en Estado Crítico (≤ 15 días)'}
                </h3>
                <span className="bg-rose-500 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full animate-pulse">
                  {pendingCriticalList.length} PENDIENTES
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Materias que vencen en 15 días o menos. El sistema enviará automáticamente al <strong>coordinador de la escuela</strong> si es modalidad escolar o al <strong>estudiante</strong> si es modalidad Homeschool. <span className="font-semibold text-rose-700">Solo se envía 1 vez por clase.</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  🎓 A Alumnos (Homeschool): <strong className="text-indigo-700">{pendingCriticalList.filter(e => (e.student.modality || '').trim().toLowerCase() === 'homeschool').length}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  🏫 A Coordinadores (Escuelas): <strong className="text-amber-800">{pendingCriticalList.filter(e => (e.student.modality || '').trim().toLowerCase() !== 'homeschool').length}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
            <label 
              className="flex items-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs select-none"
              title="Al activar, el sistema enviará automáticamente el correo en cuanto una materia llegue a estado crítico"
            >
              <input
                type="checkbox"
                checked={autoSendCritical}
                onChange={(e) => {
                  setAutoSendCritical(e.target.checked);
                  safeLocalStorageSet('ihs_auto_send_critical_emails', e.target.checked);
                }}
                className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Envío automático</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setSelectedCriticalItemForPreview(null);
                setIsCriticalEmailModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Revisar Lista ({pendingCriticalList.length})
            </button>
            <button
              type="button"
              disabled={isDispatchingCritical}
              onClick={() => handleExecuteDispatchCriticalEmails(pendingCriticalList)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isDispatchingCritical ? "Despachando..." : `Despachar ${pendingCriticalList.length} Correos`}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-emerald-800 font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Todos los correos de estado crítico (≤ 15 días) han sido enviados. No hay correos pendientes.</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-mono">
            {Object.keys(sentCriticalMap).length} clases noticiadas (1 vez)
          </span>
        </div>
      )}

      {/* KPI Cards: 5 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total en Ventana (+/- 30 días) */}
        <div 
          onClick={() => { setUrgencyFilter('all'); setExtensionStatusFilter('all'); }}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            urgencyFilter === 'all' && extensionStatusFilter === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total en Ventana</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.total}</p>
          <span className="text-[10px] text-slate-500 font-medium">±30 días respecto a hoy</span>
        </div>

        {/* Crítico <= 15 días */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'critical' ? 'all' : 'critical')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            urgencyFilter === 'critical'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Crítico (≤ 15 días)</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{metrics.critical}</p>
          <span className="text-[10px] text-rose-600 font-medium">Igual o menor de 15 días</span>
        </div>

        {/* Próximas 15 - 30 días */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'upcoming' ? 'all' : 'upcoming')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            urgencyFilter === 'upcoming'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Próximas (15 - 30 días)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{metrics.upcoming}</p>
          <span className="text-[10px] text-amber-600 font-medium">De 15 a 30 días restantes</span>
        </div>

        {/* Vencidas (menor o igual a 30 días) */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'expired' ? 'all' : 'expired')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            urgencyFilter === 'expired'
              ? 'border-slate-800 ring-2 ring-slate-800/20 bg-slate-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vencidas (≤ 30 días)</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-700 font-mono">{metrics.expired}</p>
          <span className="text-[10px] text-slate-500 font-medium">Menor o igual a 30 días</span>
        </div>

        {/* Con Extensión Activa */}
        <div 
          onClick={() => setExtensionStatusFilter(extensionStatusFilter === 'with_extension' ? 'all' : 'with_extension')}
          className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            extensionStatusFilter === 'with_extension'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Con Extensión</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 font-mono">{metrics.withExtension}</p>
          <span className="text-[10px] text-indigo-600 font-medium">Prórroga ya otorgada</span>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Main search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="extension-search-input"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por alumno, correo, clase, contacto académico o institución..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Institution selector */}
          <div className="w-full md:w-56">
            <select
              id="extension-inst-select"
              value={selectedInstitution}
              onChange={e => setSelectedInstitution(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">🏫 Todas las Instituciones</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          {/* Provider selector */}
          <div className="w-full md:w-52">
            <select
              id="extension-provider-select"
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">📦 Todos los Proveedores</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
              ))}
            </select>
          </div>

          {/* Sorting selector */}
          <div className="w-full md:w-48">
            <select
              id="extension-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="exp_asc">📅 Más próxima primero</option>
              <option value="exp_desc">📅 Más lejana primero</option>
              <option value="student_asc">👤 Alumno (A-Z)</option>
              <option value="inst_asc">🏫 Institución (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Filtrar por:
          </span>

          <button
            onClick={() => setUrgencyFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              urgencyFilter === 'all' 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos (±30 días)
          </button>

          <button
            onClick={() => setUrgencyFilter('critical')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              urgencyFilter === 'critical' 
                ? 'bg-rose-600 text-white border-rose-600' 
                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
          >
            🚨 Crítico (≤ 15 días)
          </button>

          {pendingCriticalList.length > 0 && (
            <button
              onClick={() => setUrgencyFilter(urgencyFilter === 'pending_email' ? 'all' : 'pending_email')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                urgencyFilter === 'pending_email' 
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs' 
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>📬 Correos por Enviar ({pendingCriticalList.length})</span>
            </button>
          )}

          <button
            onClick={() => setUrgencyFilter('upcoming')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              urgencyFilter === 'upcoming' 
                ? 'bg-amber-600 text-white border-amber-600' 
                : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
            }`}
          >
            ⏳ Próximas (15 - 30 días)
          </button>

          <button
            onClick={() => setUrgencyFilter('expired')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              urgencyFilter === 'expired' 
                ? 'bg-slate-700 text-white border-slate-700' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚠️ Vencidas (≤ 30 días)
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setExtensionStatusFilter('without_extension')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              extensionStatusFilter === 'without_extension' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            Sin Extensión ({metrics.withoutExtension})
          </button>

          <button
            onClick={() => setExtensionStatusFilter('with_extension')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              extensionStatusFilter === 'with_extension' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            Con Extensión Activa ({metrics.withExtension})
          </button>

          {(searchTerm || selectedInstitution !== 'all' || selectedProvider !== 'all' || urgencyFilter !== 'all' || extensionStatusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedInstitution('all');
                setSelectedProvider('all');
                setUrgencyFilter('all');
                setExtensionStatusFilter('all');
              }}
              className="ml-auto text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Selection Action Bar */}
      {selectedEnrollmentIds.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-indigo-700/50 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-inner">
              {selectedEnrollmentIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedEnrollmentIds.length === 1 ? '1 alumno / clase seleccionado' : `${selectedEnrollmentIds.length} alumnos / clases seleccionados`}</span>
                <span className="text-[10px] bg-indigo-700/60 text-indigo-200 px-2 py-0.5 rounded-full">
                  Acción Masiva
                </span>
              </p>
              <p className="text-[11px] text-indigo-200">
                Puedes enviar un correo de recordatorio masivo a los alumnos o a los contactos académicos de sus escuelas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleSelectOnlyVencidas}
              className="px-2.5 py-1.5 text-[11px] font-bold bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              Solo Vencidas
            </button>
            <button
              onClick={handleSelectOnlyCriticas}
              className="px-2.5 py-1.5 text-[11px] font-bold bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              Solo Críticas
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              Deseleccionar todo
            </button>
            <button
              onClick={() => handleOpenBulkEmailModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-400 hover:bg-indigo-300 text-indigo-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-indigo-900" />
              <span>Enviar Correo Masivo ({selectedEnrollmentIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container with required columns: alumnos, Institucion, clase, proveedor, fecha de expiracion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="alumnos-extension-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {/* Select All Checkbox */}
                <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los estudiantes visibles"
                    checked={filteredList.length > 0 && filteredList.every(item => selectedEnrollmentIds.includes(item.enrollment.id))}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Alumnos</th>
                <th className="py-3.5 px-4">Institución</th>
                <th className="py-3.5 px-4">Clase</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4 text-center">Fecha de Expiración</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        No hay materias en ventana de 30 días
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        No se encontraron estudiantes activos con clases que tengan máximo 30 días de haber vencido o 30 días antes de vencer con los filtros aplicados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const student = item.student;
                  const cls = item.cls;
                  const prov = item.provider;
                  const inst = item.institution;
                  const academicContact = item.academicContact;
                  const diffDays = item.diffDays;
                  const isSelected = selectedEnrollmentIds.includes(item.enrollment.id);
                  const studentInitials = `${student.name?.[0] || 'A'}${student.lastName?.[0] || ''}`.toUpperCase();

                  // Expiration badge styling
                  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  let statusText = `En ${diffDays} días`;

                  if (diffDays < 0) {
                    badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200 font-black';
                    statusText = `Venció hace ${Math.abs(diffDays)}d`;
                  } else if (diffDays === 0) {
                    badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse';
                    statusText = '¡Vence Hoy! (Crítico)';
                  } else if (diffDays <= 15) {
                    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                    statusText = `Crítico (${diffDays}d)`;
                  } else if (diffDays <= 30) {
                    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
                    statusText = `Próxima (${diffDays}d)`;
                  } else {
                    badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200 font-medium';
                    statusText = `Vence en ${diffDays} días`;
                  }

                  return (
                    <tr 
                      key={item.enrollment.id}
                      className={`transition-colors group ${
                        isSelected 
                          ? 'bg-indigo-50/60 hover:bg-indigo-50/80' 
                          : 'hover:bg-indigo-50/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${student.name}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.enrollment.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* 1. Alumnos */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                            {studentInitials}
                          </div>
                          <div className="leading-tight">
                            <button
                              onClick={() => navigate(`/alumnos/${student.id}`)}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left font-sans block cursor-pointer"
                            >
                              {student.name} {student.lastName || ''}
                            </button>
                            <div className="flex items-center space-x-2 mt-0.5">
                              {student.studentCustomId && (
                                <span className="font-mono text-[9px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                                  {student.studentCustomId}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={student.email}>
                                {student.email || 'Sin correo registrado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Institución */}
                      <td className="py-3.5 px-4">
                        {inst ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <button
                                onClick={() => navigate(`/instituciones/${inst.id}`)}
                                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors text-left truncate max-w-[180px] cursor-pointer"
                                title={inst.name}
                              >
                                {inst.name}
                              </button>
                            </div>
                            
                            {/* Academic contact badge */}
                            {academicContact ? (
                              <div className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100/80 max-w-[180px] truncate" title={`Contacto Académico: ${academicContact.name} ${academicContact.lastName || ''} (${academicContact.email})`}>
                                <UserCheck className="w-3 h-3 shrink-0 text-indigo-500" />
                                <span className="truncate">{academicContact.name}: {academicContact.email}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                Sin contacto académico
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin Institución</span>
                        )}
                      </td>

                      {/* 3. Clase */}
                      <td className="py-3.5 px-4">
                        {cls ? (
                          <div>
                            <button
                              onClick={() => navigate(`/clases/${cls.id}`)}
                              className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-left block leading-tight truncate max-w-[200px] cursor-pointer"
                              title={cls.name}
                            >
                              {cls.name}
                            </button>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              {cls.code && (
                                <span className="font-mono text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {cls.code}
                                </span>
                              )}
                              {cls.area && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {cls.area}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Clase ID: #{item.enrollment.classId}</span>
                        )}
                      </td>

                      {/* 4. Proveedor */}
                      <td className="py-3.5 px-4">
                        {prov ? (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-lg border border-slate-200">
                              <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{prov.commercialName || prov.legalName}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin Proveedor</span>
                        )}
                      </td>

                      {/* 5. Fecha de Expiración */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center space-y-1">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {item.effectiveExpDate}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] border leading-none ${badgeStyle}`}>
                            {statusText}
                          </span>
                          {item.hasExtension && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md mt-0.5">
                              <Clock className="w-2.5 h-2.5" /> Prórroga Activa
                            </span>
                          )}
                          {/* Estado del correo crítico (solo 1 vez por clase) */}
                          {item.diffDays <= 15 && item.diffDays >= 0 && (
                            sentCriticalMap[item.enrollment.id] ? (
                              <span 
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md mt-0.5"
                                title={`Correo de estado crítico ya enviado el ${sentCriticalMap[item.enrollment.id].sentAt} a ${sentCriticalMap[item.enrollment.id].recipientEmail} (${sentCriticalMap[item.enrollment.id].recipientRole === 'alumno' ? 'Estudiante Homeschool' : 'Coordinador de Escuela'}). Solo se envía 1 vez por clase.`}
                              >
                                <Check className="w-2.5 h-2.5 text-emerald-600" /> Correo enviado (1 vez)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSingleCriticalEmailModal(item);
                                }}
                                className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-md mt-0.5 cursor-pointer shadow-2xs animate-pulse"
                                title="Materia en estado crítico (≤ 15 días). Correo urgente pendiente por enviar. Clic para previsualizar y enviar."
                              >
                                <Mail className="w-2.5 h-2.5 text-rose-600" /> Correo por enviar
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botón directo de despacho de correo crítico si está en estado crítico y no ha sido enviado */}
                          {item.diffDays <= 15 && item.diffDays >= 0 && !sentCriticalMap[item.enrollment.id] && (
                            <button
                              id={`send-critical-email-btn-${item.enrollment.id}`}
                              onClick={() => handleOpenSingleCriticalEmailModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
                              title={`Enviar correo crítico a ${item.student.modality?.trim().toLowerCase() === 'homeschool' ? 'Estudiante Homeschool' : 'Coordinador de Escuela'} (Solo se envía 1 vez)`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Enviar Crítico</span>
                            </button>
                          )}

                          {/* Send email button */}
                          <button
                            id={`send-email-btn-${item.enrollment.id}`}
                            onClick={() => handleOpenSingleEmailModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-indigo-300 cursor-pointer"
                            title="Enviar correo recordatorio a este alumno o a su escuela"
                          >
                            <Mail className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="hidden xl:inline">Recordatorio</span>
                          </button>

                          {/* Manage extension button */}
                          <button
                            id={`manage-ext-btn-${item.enrollment.id}`}
                            onClick={() => handleOpenExtensionModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-bold transition-all border border-indigo-200 hover:border-indigo-600 cursor-pointer shadow-2xs"
                            title="Gestionar o aplicar extensión a esta clase"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.hasExtension ? 'Prórroga' : 'Extender'}</span>
                          </button>
                          
                          <button
                            onClick={() => navigate(`/alumnos/${student.id}`)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver perfil completo del alumno"
                          >
                            <ChevronRight className="w-4 h-4" />
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

        {/* Footer info bar */}
        <div className="bg-slate-50/70 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong>{filteredList.length}</strong> de <strong>{expiringEnrollments.length}</strong> materias (máx. 30 días de haber vencido o 30 días antes de vencer)
            </span>
            {selectedEnrollmentIds.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                {selectedEnrollmentIds.length} seleccionados
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> ≤ 15 días crítico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Vencidas ≤ 30 días
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Con prórroga
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Gestionar Extensión */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-sm tracking-wide">
                  Gestión de Extensión / Prórroga
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveExtension} className="p-6 space-y-4 text-left">
              {modalSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {modalSuccessMsg}
                </div>
              )}

              {/* Course & Student Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Alumno</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedItem.student.name} {selectedItem.student.lastName || ''}
                    </p>
                    {selectedItem.student.studentCustomId && (
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                        {selectedItem.student.studentCustomId}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Institución</span>
                    <p className="font-semibold text-slate-800 text-xs truncate max-w-[150px]">
                      {selectedItem.institution?.name || 'Sin institución'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Clase: </span>
                    <span className="font-bold text-slate-800">{selectedItem.cls?.name || 'Materia'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Vence orig: </span>
                    <span className="font-mono font-bold text-slate-700">{selectedItem.originalEndDate}</span>
                  </div>
                </div>
              </div>

              {/* Extension Toggle */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalForm.hasExtension}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setModalForm(prev => ({
                        ...prev,
                        hasExtension: checked,
                        extensionDate: checked 
                          ? (prev.extensionDate || addDaysToDate(selectedItem.originalEndDate, 30))
                          : prev.extensionDate
                      }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-indigo-950 text-xs block">
                      Activar Extensión de Periodo
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Al conceder una extensión, el estatus dinámico de la clase pasará automáticamente a <strong>"Extended"</strong> mientras la fecha actual sea previa al nuevo vencimiento.
                    </span>
                  </div>
                </label>

                {modalForm.hasExtension && (
                  <div className="space-y-3 pt-3 border-t border-indigo-100 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1.5 font-sans">
                        Nueva Fecha de Extensión
                      </label>
                      <input
                        type="date"
                        required={modalForm.hasExtension}
                        value={modalForm.extensionDate}
                        onChange={(e) => setModalForm(prev => ({ ...prev, extensionDate: e.target.value }))}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                      />
                    </div>

                    {/* Preset buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Rápido:</span>
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, extensionDate: addDaysToDate(selectedItem.originalEndDate, 30) }))}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-200 transition-colors cursor-pointer"
                      >
                        +30 días
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, extensionDate: addDaysToDate(selectedItem.originalEndDate, 45) }))}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-200 transition-colors cursor-pointer"
                      >
                        +45 días (Keystone)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, extensionDate: addDaysToDate(selectedItem.originalEndDate, 60) }))}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-200 transition-colors cursor-pointer"
                      >
                        +60 días
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                  Observaciones / Justificación de la Extensión
                </label>
                <textarea
                  rows={2}
                  value={modalForm.notes}
                  onChange={(e) => setModalForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ej. Solicitud enviada por el colegio, pendiente autorización de pago de prórroga..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Guardar Extensión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enviar Correo Masivo de Recordatorio */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide text-white">
                    Enviar Correo Recordatorio de Vencimiento
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    {emailRecipientsList.length} materias / alumnos seleccionados para notificación
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              
              {/* Success alert */}
              {emailSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{emailSuccessMsg}</span>
                </div>
              )}

              {/* Copy alert */}
              {copySuccess && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>¡Direcciones de correo copiadas al portapapeles!</span>
                </div>
              )}

              {/* Recipient Target Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  ¿A quién deseas enviar el recordatorio?
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Correo del Alumno */}
                  <label 
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      recipientTarget === 'student'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Correo del Alumno
                      </span>
                      <input
                        type="radio"
                        name="recipientTarget"
                        value="student"
                        checked={recipientTarget === 'student'}
                        onChange={() => setRecipientTarget('student')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Envío directo al estudiante para que concluya sus actividades a tiempo.
                    </p>
                  </label>

                  {/* Option 2: Contacto Académico */}
                  <label 
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      recipientTarget === 'school'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        Contacto Escolar
                      </span>
                      <input
                        type="radio"
                        name="recipientTarget"
                        value="school"
                        checked={recipientTarget === 'school'}
                        onChange={() => setRecipientTarget('school')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Envío al contacto académico / coordinador de la institución.
                    </p>
                  </label>

                  {/* Option 3: Ambos */}
                  <label 
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      recipientTarget === 'both'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        Ambos
                      </span>
                      <input
                        type="radio"
                        name="recipientTarget"
                        value="both"
                        checked={recipientTarget === 'both'}
                        onChange={() => setRecipientTarget('both')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Copia tanto al alumno como al contacto académico de su escuela.
                    </p>
                  </label>
                </div>
              </div>

              {/* Resolved recipient count & expandable details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-800">
                      Destinatarios calculados:
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold rounded-md text-[11px]">
                      {computedEmails.length} correos únicos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyRecipients}
                      disabled={computedEmails.length === 0}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="w-3 h-3" /> Copiar correos
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecipientDetails(!showRecipientDetails)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{showRecipientDetails ? 'Ocultar desglose' : 'Ver desglose'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRecipientDetails ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded list of recipients */}
                {showRecipientDetails && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                    {emailRecipientsList.map((item, idx) => {
                      const itemEmails = getResolvedEmailsForItem(item);
                      return (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-800">{item.student.name} {item.student.lastName || ''}</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-600">{item.cls?.name || 'Clase'}</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-500">{item.institution?.name || 'Escuela'}</span>
                          </div>
                          <div className="text-right">
                            {itemEmails.length > 0 ? (
                              <span className="font-mono text-indigo-600 font-medium text-[10px]">
                                {itemEmails.join(', ')}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold text-[10px] flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Sin correo
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Asunto del Correo
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Recordatorio: Próximo vencimiento de materia..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Mensaje / Plantilla
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Etiquetas dinámicas disponibles: {'{alumno}'}, {'{clase}'}, {'{institucion}'}, {'{fecha_vencimiento}'}, {'{dias_restantes}'}
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {/* Live Preview of first recipient */}
              {sampleItem && (
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-indigo-900 font-bold">
                    <span>Vista previa para: <strong>{sampleItem.student.name} {sampleItem.student.lastName || ''}</strong></span>
                    <span className="font-mono text-[10px] text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      {interpolateTemplate(emailSubject, sampleItem)}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-indigo-100/80 text-[11px] text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                    {interpolateTemplate(emailBody, sampleItem)}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleOpenMailClient}
                disabled={computedEmails.length === 0}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Abrir tu cliente predeterminado (Outlook, Gmail, Thunderbird)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en app de correo</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSendEmails}
                  disabled={isSendingEmail || computedEmails.length === 0}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSendingEmail 
                      ? 'Enviando recordatorios...' 
                      : `Enviar Recordatorio (${computedEmails.length} correos)`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Despacho y Revisión de Correos de Estado Crítico (≤ 15 días) */}
      {isCriticalEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <BellRing className="w-5 h-5 text-rose-100" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide text-white">
                    {selectedCriticalItemForPreview 
                      ? "Vista Previa de Correo Crítico (≤ 15 días)" 
                      : `Correos por Enviar: Clases en Estado Crítico (${pendingCriticalList.length})`}
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    Solo se envía 1 vez por clase • Al coordinador escolar (modalidad no Homeschool) o al estudiante (Homeschool)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCriticalEmailModalOpen(false);
                  setSelectedCriticalItemForPreview(null);
                }}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {/* If previewing single critical item */}
              {selectedCriticalItemForPreview ? (
                <div className="space-y-4">
                  {/* Recipient resolution explanation */}
                  <div className={`p-4 rounded-xl border ${
                    selectedCriticalItemForPreview.recipientRole === 'alumno'
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">
                        {selectedCriticalItemForPreview.recipientRole === 'alumno' ? '🎓' : '🏫'}
                      </span>
                      <span className="font-black text-xs uppercase tracking-wider">
                        {selectedCriticalItemForPreview.recipientRole === 'alumno' 
                          ? 'Modalidad Homeschool detectada: Correo dirigido al Estudiante'
                          : 'Modalidad Regular / Escolar: Correo dirigido al Coordinador de la Escuela'}
                      </span>
                    </div>
                    <div className="text-xs space-y-0.5 mt-2">
                      <p><strong>Destinatario:</strong> {selectedCriticalItemForPreview.recipientName} ({selectedCriticalItemForPreview.recipientEmail || 'Sin correo registrado'})</p>
                      <p><strong>Alumno:</strong> {selectedCriticalItemForPreview.studentName} • <strong>Modalidad:</strong> {selectedCriticalItemForPreview.modality}</p>
                      <p><strong>Institución:</strong> {selectedCriticalItemForPreview.institutionName} • <strong>Materia:</strong> {selectedCriticalItemForPreview.className}</p>
                      <p><strong>Fecha Límite:</strong> {selectedCriticalItemForPreview.effectiveExpDate} ({selectedCriticalItemForPreview.diffDays <= 0 ? '¡Vence hoy!' : `Quedan ${selectedCriticalItemForPreview.diffDays} días`})</p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Asunto
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedCriticalItemForPreview.subject}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  {/* Body textarea */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contenido del Mensaje
                    </label>
                    <textarea
                      rows={10}
                      readOnly
                      value={selectedCriticalItemForPreview.body}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 outline-none leading-relaxed"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Este correo quedará registrado en el historial de actividades y se marcará como notificado para esta clase (<strong>1 sola vez por clase</strong>).
                    </span>
                  </div>
                </div>
              ) : (
                /* Full list view */
                <div className="space-y-4">
                  {/* Summary badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Total por Enviar</span>
                      <p className="text-xl font-black text-rose-900 font-mono mt-0.5">{pendingCriticalList.length}</p>
                      <span className="text-[10px] text-rose-600 font-medium">Clases en estado crítico (≤ 15 días)</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">A Coordinadores de Escuela</span>
                      <p className="text-xl font-black text-amber-900 font-mono mt-0.5">
                        {pendingCriticalList.filter(e => (e.student.modality || '').trim().toLowerCase() !== 'homeschool').length}
                      </p>
                      <span className="text-[10px] text-amber-700 font-medium">Modalidad distinta a Homeschool</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">A Alumnos Homeschool</span>
                      <p className="text-xl font-black text-indigo-900 font-mono mt-0.5">
                        {pendingCriticalList.filter(e => (e.student.modality || '').trim().toLowerCase() === 'homeschool').length}
                      </p>
                      <span className="text-[10px] text-indigo-700 font-medium">Modalidad Homeschool</span>
                    </div>
                  </div>

                  {pendingCriticalList.length === 0 ? (
                    <div className="py-12 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-800">¡No hay correos críticos por enviar!</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Todas las materias críticas ya recibieron su notificación única o no hay materias venciendo en ≤ 15 días.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">Alumno & Modalidad</th>
                            <th className="py-2.5 px-3">Destinatario Asignado</th>
                            <th className="py-2.5 px-3">Materia & Institución</th>
                            <th className="py-2.5 px-3 text-center">Días Restantes</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingCriticalList.map(item => {
                            const isHome = (item.student.modality || '').trim().toLowerCase() === 'homeschool';
                            const payload = buildCriticalEmailPayload(item);
                            return (
                              <tr key={item.enrollment.id} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-slate-900">{item.student.name} {item.student.lastName || ''}</p>
                                  <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                                    isHome ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {isHome ? 'Homeschool' : (item.student.modality || 'Escolar')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                                    <span>{isHome ? '🎓' : '🏫'}</span>
                                    <span className="truncate max-w-[140px]">{payload.recipientName}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                                    {payload.recipientEmail || 'Sin correo'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-slate-800 truncate max-w-[150px]">{item.cls?.name || 'Materia'}</p>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.institution?.name || 'Escuela'}</p>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    {item.diffDays <= 0 ? 'Vence hoy' : `${item.diffDays}d`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCriticalItemForPreview(payload)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-md text-[11px] font-bold border border-slate-200 cursor-pointer"
                                  >
                                    Ver correo
                                  </button>
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

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              {selectedCriticalItemForPreview ? (
                <button
                  type="button"
                  onClick={() => setSelectedCriticalItemForPreview(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  ← Volver a la lista
                </button>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  {pendingCriticalList.length} correos pendientes para envío único
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCriticalEmailModalOpen(false);
                    setSelectedCriticalItemForPreview(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                {selectedCriticalItemForPreview ? (
                  <button
                    type="button"
                    disabled={isDispatchingCritical}
                    onClick={() => {
                      const itemToDispatch = pendingCriticalList.find(e => e.enrollment.id === selectedCriticalItemForPreview.enrollmentId);
                      if (itemToDispatch) {
                        handleExecuteDispatchCriticalEmails([itemToDispatch]);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatchingCritical ? "Despachando..." : "Despachar este Correo Ahora"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isDispatchingCritical || pendingCriticalList.length === 0}
                    onClick={() => handleExecuteDispatchCriticalEmails(pendingCriticalList)}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isDispatchingCritical 
                        ? "Despachando correos..." 
                        : `Despachar los ${pendingCriticalList.length} Correos Ahora`}
                    </span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

