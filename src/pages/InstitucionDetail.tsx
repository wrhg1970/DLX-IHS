import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Users, Globe, Phone, FileText, Download, Briefcase, CreditCard, Mail, Video, Calendar, Sparkles, TrendingUp, DollarSign, Clock, GraduationCap, Trash2, Archive, AlertTriangle, CheckCircle, HelpCircle, Plus, Upload, Eye, Edit2, Check, CalendarRange, X, BookOpen, CheckCircle2, XCircle, Search, Filter, FileSpreadsheet, Printer, Award, BarChart2, ChevronDown, ChevronUp, SlidersHorizontal, CheckCheck, UserCheck, AlertCircle, Key, ExternalLink, Shield } from "lucide-react";
import { useAppContext, TaskType, resolveCreditPrices, resolveMembershipPrice, calculateInstitutionFinancials, CourseGradeOutcome, isColombia, InstitutionDocument, InstitutionDocumentCategory } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { hasPermission } from "../utils/permissionCheck";
import { FinancialTransactionForm } from "../components/FinancialTransactionForm";
import { PaymentAttachmentsManager, PaymentAttachmentsBadges, PaymentAttachmentsData } from "../components/PaymentAttachmentsManager";
import { InstitutionFinancialReportModal } from "../components/InstitutionFinancialReportModal";
import { motion, AnimatePresence } from "motion/react";

const normalizeCountryName = (c: string) => {
  return (c || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // removes accents
    .replace(/ñ/g, "n")
    .trim();
};

const resolveProviderClassCost = (
  providerId: any,
  creditType: string | undefined,
  countryRef: string,
  providerProductServices: any[] | undefined
) => {
  if (!providerId || !providerProductServices) return 0;
  
  // Find product service for Classes (could be plural "clases" or singular "clase")
  const serviceClass = providerProductServices.find(
    ps => Number(ps.providerId) === Number(providerId) &&
      ['clase', 'clases'].includes((ps.productType || "").toLowerCase().trim())
  );
  
  if (!serviceClass || !serviceClass.countryPrices) return 0;
  
  // Find matching country
  const normCountryRef = normalizeCountryName(countryRef);
  const cpData = serviceClass.countryPrices.find(
    (p: any) => normalizeCountryName(p.country) === normCountryRef
  );
  
  if (!cpData) return 0;
  
  const typeStr = (creditType || "").toLowerCase().trim();
  const isAp = typeStr.includes("ap");
  
  let costStr = "0";
  if (typeStr.includes("medio") || typeStr.includes("half")) {
    costStr = isAp ? cpData.costHalfApCredit : cpData.costHalfCredit;
  } else {
    // defaults to Full/Completo
    costStr = isAp ? cpData.costFullApCredit : cpData.costFullCredit;
  }
  
  return parseFloat(String(costStr || "0").replace(/[^0-9.-]+/g, "") || "0");
};

export function InstitucionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { institutions, students, financialTransactions, enrollments, classes, contacts, tasks, activities, addContact, updateContact, deleteContact, addTask, updateTask, users, catalogs, updateInstitution, deleteInstitution, providers, providerProductServices, currentUser, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction, updateEnrollment, companyInfo, addActivity, bankAccounts, getInstitutionSLA } = useAppContext();
  
  const institutionRaw = institutions.find(i => i.id === Number(id));
  const isAuthorized = 
    !institutionRaw ? false :
    currentUser?.role === 'Coordinador' ? (currentUser.institutionId === institutionRaw.id) :
    true;

  const institution = isAuthorized ? institutionRaw : null;
  const canViewFinancialsData = 
    hasPermission(currentUser?.role, "Finanzas", "view") || 
    hasPermission(currentUser?.role, "Administración", "view");

  const isUserAdminOrSuperAdmin = 
    currentUser?.role?.trim().toLowerCase() === 'superadministrador' || 
    currentUser?.role?.trim().toLowerCase() === 'super administrador' || 
    currentUser?.role?.trim().toLowerCase() === 'super admin' || 
    currentUser?.role?.trim().toLowerCase() === 'admin principal' || 
    currentUser?.role?.trim().toLowerCase() === 'director' ||
    hasPermission(currentUser?.role, "Administración", "view") ||
    hasPermission(currentUser?.role, "Finanzas", "view");

  const isSuperAdminOnly = 
    currentUser?.role?.trim().toLowerCase() === 'superadministrador' ||
    currentUser?.role?.trim().toLowerCase() === 'super administrador' ||
    currentUser?.role?.trim().toLowerCase() === 'super admin' ||
    currentUser?.role?.trim().toLowerCase() === 'admin principal' ||
    currentUser?.role?.trim().toLowerCase()?.includes('super') ||
    currentUser?.role?.trim().toLowerCase() === 'director';

  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("Flujo de Trabajo");
  const [editingEnrollIds, setEditingEnrollIds] = useState<Record<number, boolean>>({});
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditGeneralOpen, setIsEditGeneralOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'generales' | 'membresia' | 'precios'>('generales');
  const [infoSubTab, setInfoSubTab] = useState<'generales' | 'membresia' | 'precios' | 'campus' | 'documentos'>('generales');

  // Interactive addition in details view
  const [paySortField, setPaySortField] = useState<'date' | 'description' | 'amount'>('date');
  const [paySortOrder, setPaySortOrder] = useState<'asc' | 'desc'>('desc');
  const [payFilterStartDate, setPayFilterStartDate] = useState('');
  const [payFilterEndDate, setPayFilterEndDate] = useState('');

  const [isDetailCampusModalOpen, setIsDetailCampusModalOpen] = useState(false);
  const [detailCampusForm, setDetailCampusForm] = useState({ name: '', cityCountry: '', contact: '', phone: '' });

  const [isDetailDocModalOpen, setIsDetailDocModalOpen] = useState(false);
  const [isFinancialReportModalOpen, setIsFinancialReportModalOpen] = useState(false);
  const [financialReportInitialType, setFinancialReportInitialType] = useState<'institucion' | 'interno'>('institucion');
  const [detailDocName, setDetailDocName] = useState('');
  const [detailDocDate, setDetailDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailDocCategory, setDetailDocCategory] = useState<InstitutionDocumentCategory>('Legal');
  const [detailDocHasExpiration, setDetailDocHasExpiration] = useState(false);
  const [detailDocExpirationDate, setDetailDocExpirationDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editingDoc, setEditingDoc] = useState<InstitutionDocument | null>(null);
  const [editingDocName, setEditingDocName] = useState('');
  const [editingDocDate, setEditingDocDate] = useState('');
  const [editingDocCategory, setEditingDocCategory] = useState<InstitutionDocumentCategory>('Legal');
  const [editingDocHasExpiration, setEditingDocHasExpiration] = useState(false);
  const [editingDocExpirationDate, setEditingDocExpirationDate] = useState('');
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [docCategoryFilter, setDocCategoryFilter] = useState<'Todos' | InstitutionDocumentCategory>('Todos');

  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);

  const handleOpenUploadDocModal = (file?: File) => {
    if (file) {
      setSelectedFile(file);
      const nameWithExt = file.name;
      const idx = nameWithExt.lastIndexOf('.');
      const baseName = idx !== -1 ? nameWithExt.substring(0, idx) : nameWithExt;
      setDetailDocName(baseName);
    } else {
      setSelectedFile(null);
      setDetailDocName('');
    }
    setDetailDocDate(new Date().toISOString().split('T')[0]);
    setDetailDocCategory('Legal');
    setDetailDocHasExpiration(false);
    setDetailDocExpirationDate('');
    setIsDetailDocModalOpen(true);
  };

  const handleCloseUploadDocModal = () => {
    setIsDetailDocModalOpen(false);
    setSelectedFile(null);
    setDetailDocName('');
    setDetailDocDate(new Date().toISOString().split('T')[0]);
    setDetailDocCategory('Legal');
    setDetailDocHasExpiration(false);
    setDetailDocExpirationDate('');
  };

  const getDocExpirationBadge = (doc: InstitutionDocument) => {
    if (!doc.hasExpiration || !doc.expirationDate) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Clock className="w-3 h-3 text-slate-300 shrink-0" />
          Sin vencimiento
        </span>
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(doc.expirationDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
            Vencido hace {Math.abs(diffDays)}d
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{doc.expirationDate}</span>
        </div>
      );
    }
    if (diffDays <= 30) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            Vence en {diffDays} {diffDays === 1 ? 'día' : 'días'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{doc.expirationDate}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          Vigente ({diffDays}d)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">{doc.expirationDate}</span>
      </div>
    );
  };

  const getDocCategoryBadge = (category?: string) => {
    const cat = category || 'Administrativo';
    if (cat === 'Legal') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Shield className="w-3 h-3 text-purple-500 shrink-0" />
          Legal
        </span>
      );
    }
    if (cat === 'Académico') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <GraduationCap className="w-3 h-3 text-blue-500 shrink-0" />
          Académico
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <FileSpreadsheet className="w-3 h-3 text-slate-500 shrink-0" />
        Administrativo
      </span>
    );
  };

  React.useEffect(() => {
    if (viewingDoc?.fileData?.startsWith('data:application/pdf')) {
      try {
        const parts = viewingDoc.fileData.split(',');
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setActivePdfUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Error creating PDF blob URL:", e);
        setActivePdfUrl(viewingDoc.fileData);
      }
    } else {
      setActivePdfUrl(null);
    }
  }, [viewingDoc]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [isCoursePaymentModalOpen, setIsCoursePaymentModalOpen] = useState(false);
  const [instPaymentConceptFilter, setInstPaymentConceptFilter] = useState<'all' | 'courses' | 'membership'>('all');

  // States for payment details and editing
  const [selectedDetailPayment, setSelectedDetailPayment] = useState<any | null>(null);
  const [isDetailPaymentModalOpen, setIsDetailPaymentModalOpen] = useState(false);
  const [isEditPaymentMode, setIsEditPaymentMode] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState({
    date: '',
    description: '',
    amount: '',
    currency: 'MXN',
    exchangeRate: '18.5',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    status: 'Pagado',
    taxId: '',
    paymentLink: '',
    invoicePdfUrl: '',
    invoicePdfName: '',
    invoiceXmlUrl: '',
    invoiceXmlName: '',
    receiptPdfUrl: '',
    receiptPdfName: '',
    attachmentUrl: '',
  });

  // States for Email Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmailPayment, setSelectedEmailPayment] = useState<any | null>(null);
  const [emailRecipientContactId, setEmailRecipientContactId] = useState<string>("");
  const [emailManualContactName, setEmailManualContactName] = useState("");
  const [emailManualContactEmail, setEmailManualContactEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBankAccountId, setEmailBankAccountId] = useState<string>("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");

  // States for custom Course Payments modal
  const [coursePaymentTab, setCoursePaymentTab] = useState<'register' | 'schedule'>('register');
  const [regStudentSearch, setRegStudentSearch] = useState("");
  const [schStudentSearch, setSchStudentSearch] = useState("");

  // States for Students, Classes, Prices & Pass/Fail Report
  const [alumnosSubTab, setAlumnosSubTab] = useState<'cursos' | 'servicios_plataformas'>('cursos');
  const [serviciosSearch, setServiciosSearch] = useState("");
  const [serviciosCategoryFilter, setServiciosCategoryFilter] = useState<'all' | 'platform' | 'certification' | 'admission' | 'other'>('all');
  const [serviciosStatusFilter, setServiciosStatusFilter] = useState<string>('all');
  const [studentReportSearch, setStudentReportSearch] = useState("");
  const [studentReportGradeFilter, setStudentReportGradeFilter] = useState<'All' | 'Pass' | 'Fail' | 'Pendiente'>('All');
  const [studentReportCreditFilter, setStudentReportCreditFilter] = useState<'All' | 'Full' | 'Half'>('All');
  const [studentReportStatusFilter, setStudentReportStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'On hold' | 'Withdrawn'>('All');
  const [studentReportViewMode, setStudentReportViewMode] = useState<'report' | 'grouped'>('report');
  const [selectedEnrollmentForGrade, setSelectedEnrollmentForGrade] = useState<any | null>(null);
  const [gradeModalForm, setGradeModalForm] = useState<{
    gradeOutcome: CourseGradeOutcome;
    finalGrade: string;
    gradeDate: string;
    gradeNotes: string;
  }>({
    gradeOutcome: 'Pass',
    finalGrade: '',
    gradeDate: new Date().toISOString().split('T')[0],
    gradeNotes: ''
  });
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  
  const generateEmailBody = (p: any, contactName: string, bankAcc: any) => {
    const exchangeRate = Number(p.exchangeRate || 18.5);
    const amount = Number(p.originalAmount !== undefined ? p.originalAmount : (p.amount || 0));
    const currency = p.originalCurrency || p.currency || 'MXN';
    
    let baseAmountUSD = 0;
    if (currency === 'USD') {
      baseAmountUSD = amount;
    } else {
      baseAmountUSD = amount / exchangeRate;
    }
    
    // Check if the payment has iva
    const hasIva = p.iva !== undefined ? p.iva > 0 : (institution?.payWithIva === true);
    
    let ivaUSD = 0;
    if (p.iva !== undefined) {
      const paymentCurrency = p.originalCurrency || p.currency || 'MXN';
      if (paymentCurrency === 'USD') {
        ivaUSD = Number(p.iva);
      } else {
        ivaUSD = Number(p.iva) / exchangeRate;
      }
    } else if (hasIva) {
      ivaUSD = baseAmountUSD * 0.16;
    }
      
    const totalUSD = baseAmountUSD + ivaUSD;
    const totalMXN = totalUSD * exchangeRate;

    const montoStr = baseAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const ivaStr = hasIva ? `${ivaUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : 'No aplica';
    
    const totalUSDStr = `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    const totalMXPStr = `$${totalMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXP`;

    // Check payment method
    const isFlywire = p.paymentMethod?.toLowerCase().includes('flywire');

    let paymentMethodDetails = "";
    if (isFlywire) {
      paymentMethodDetails = `Favor de realizar su pago a través de la plataforma Flywire utilizando la siguiente liga de pago y enviar comprobante:

LIGA DE PAGO FLYWIRE: ${p.paymentLink || 'https://payment.flywire.com/'}`;
    } else {
      // Bank Account fields from catalog item
      const bancoName = bankAcc ? bankAcc.name : '{Nombre Cuenta}';
      const cuentaNum = bankAcc ? bankAcc.accountNumber : '{Cuenta}';
      const clabeNum = bankAcc ? bankAcc.clabe : '{CLABE}';
      const empresaName = bankAcc ? (bankAcc.companyName || companyInfo?.legalName || 'DLX - International High School') : '{Nombre Empresa}';
      
      const swiftLine = bankAcc?.swift ? `SWIFT: ${bankAcc.swift}\n` : '';
      const abaLine = bankAcc?.aba ? `ABA: ${bankAcc.aba}\n` : '';

      paymentMethodDetails = `Favor de transferir a la siguiente cuenta bancaria y enviar comprobante:

${empresaName}
BANCO: ${bancoName}
CUENTA: ${cuentaNum} 
CLABE: ${clabeNum} 
${swiftLine}${abaLine}`;
    }

    return `Estimada ${contactName}

Esperando se encuentre bien, me comunico con usted para informar el importe correspondiente a la ${p.description || 'colegiatura'}, servicios y plataforma, deberá pagarse a más tardar el ${p.date || 'fecha límite'}, favor de enviar comprobante de pago.

Descripcíon del Pago 
CONCEPTO: ${p.description || 'colegiatura'}
IMPORTE: ${montoStr} USD 
(X) TIPO DE CAMBIO: ${exchangeRate}
IVA: ${ivaStr}
TOTAL A PAGAR (USD): ${totalUSDStr}
TOTAL A PAGAR (MXP): ${totalMXPStr}

${paymentMethodDetails}

Quedo a sus órdenes cualquier comentario o pregunta.

Saludos cordiales.

Administración
DLX - International High School`;
  };

  const handleOpenEmailModal = (p: any) => {
    setSelectedEmailPayment(p);
    
    const defaultContact = instContacts.find(c => c.email) || instContacts[0];
    const initialContactId = defaultContact ? defaultContact.id.toString() : "manual";
    
    const catalogBankAccounts = catalogs['Cuentas bancarias'] || [];
    const matchingBank = catalogBankAccounts.find((b: any) => b.currency === p.originalCurrency) || catalogBankAccounts[0];
    const initialBankId = matchingBank ? matchingBank.id.toString() : "";
    
    setEmailRecipientContactId(initialContactId);
    setEmailManualContactName(defaultContact ? `${defaultContact.name} ${defaultContact.lastName}` : "");
    setEmailManualContactEmail(defaultContact ? defaultContact.email || "" : "");
    setEmailBankAccountId(initialBankId);
    setEmailCc("");
    setEmailBcc("");

    const contactName = defaultContact ? `${defaultContact.name} ${defaultContact.lastName}` : "{Nombre del Contacto de la Institucion}";
    const bodyText = generateEmailBody(p, contactName, matchingBank);
    
    setEmailSubject(`Notificación de Pago Pendiente - ${institution?.name || ''} - ${p.description}`);
    setEmailBody(bodyText);
    setIsEmailModalOpen(true);
  };

  const handleEmailContactChange = (contactId: string, bankId: string) => {
    if (!selectedEmailPayment) return;
    setEmailRecipientContactId(contactId);
    
    let contactName = "";
    if (contactId === "manual") {
      contactName = emailManualContactName || "{Nombre del Contacto de la Institucion}";
    } else {
      const c = instContacts.find(x => x.id.toString() === contactId);
      contactName = c ? `${c.name} ${c.lastName}` : "{Nombre del Contacto de la Institucion}";
    }

    const catalogBankAccounts = catalogs['Cuentas bancarias'] || [];
    const bankAcc = catalogBankAccounts.find((b: any) => b.id.toString() === bankId);
    const bodyText = generateEmailBody(selectedEmailPayment, contactName, bankAcc);
    setEmailBody(bodyText);
  };

  const handleEmailBankChange = (bankId: string, contactId: string) => {
    if (!selectedEmailPayment) return;
    setEmailBankAccountId(bankId);
    
    let contactName = "";
    if (contactId === "manual") {
      contactName = emailManualContactName || "{Nombre del Contacto de la Institucion}";
    } else {
      const c = instContacts.find(x => x.id.toString() === contactId);
      contactName = c ? `${c.name} ${c.lastName}` : "{Nombre del Contacto de la Institucion}";
    }

    const catalogBankAccounts = catalogs['Cuentas bancarias'] || [];
    const bankAcc = catalogBankAccounts.find((b: any) => b.id.toString() === bankId);
    const bodyText = generateEmailBody(selectedEmailPayment, contactName, bankAcc);
    setEmailBody(bodyText);
  };

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmailPayment) return;

    let recipientEmail = "";
    let recipientName = "";
    if (emailRecipientContactId === "manual") {
      recipientEmail = emailManualContactEmail;
      recipientName = emailManualContactName;
    } else {
      const c = instContacts.find(x => x.id.toString() === emailRecipientContactId);
      recipientEmail = c?.email || "";
      recipientName = c ? `${c.name} ${c.lastName}` : "";
    }

    if (!recipientEmail) {
      alert("Por favor especifica un correo electrónico para el destinatario.");
      return;
    }

    addActivity({
      institutionId: institution!.id,
      date: new Date().toISOString(),
      description: `Correo de cobro enviado a ${recipientName} (${recipientEmail}) por concepto: ${selectedEmailPayment.description}.`,
    });

    let mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    if (emailCc) {
      mailtoUrl += `&cc=${encodeURIComponent(emailCc)}`;
    }
    if (emailBcc) {
      mailtoUrl += `&bcc=${encodeURIComponent(emailBcc)}`;
    }
    window.location.href = mailtoUrl;

    setIsEmailModalOpen(false);
    setSelectedEmailPayment(null);
  };

  // Tab 1: Live Payment Register Form
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'MXN',
    exchangeRate: '18.5',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    description: 'Pago de Cursos',
    taxId: '',
    studentId: '',
    studentIds: [] as string[],
  });

  // Tab 2: Scheduled Payment Form
  const [schForm, setSchForm] = useState({
    concepto: 'Cursos', // 'Cursos' | 'Membresía'
    numPayments: '3',
    startDate: new Date().toISOString().split('T')[0],
    periodicity: 'monthly-first', // 'monthly-first', 'monthly-same', 'biweekly', 'weekly'
    amountPerPayment: '',
    currency: 'MXN',
    exchangeRate: '18.5',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    description: 'Pago Programado de Cursos',
    studentId: '',
    studentIds: [] as string[],
    paymentLink: '',
  });

  // Confirm Scheduled Payment Form
  const [confirmingPayment, setConfirmingPayment] = useState<any | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'MXN',
    exchangeRate: '18.5',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    description: '',
    taxId: '',
    paymentLink: '',
    invoicePdfUrl: '',
    invoicePdfName: '',
    invoiceXmlUrl: '',
    invoiceXmlName: '',
    receiptPdfUrl: '',
    receiptPdfName: '',
    attachmentUrl: '',
  });

  const handleOpenConfirmPaymentModal = (p: any) => {
    setConfirmingPayment(p);
    setConfirmForm({
      date: new Date().toISOString().split('T')[0],
      amount: p.amount?.toString() || '',
      currency: p.currency || 'MXN',
      exchangeRate: p.exchangeRate?.toString() || '18.5',
      paymentMethod: p.paymentMethod || 'Transferencia',
      bankAccountId: p.bankAccountId?.toString() || '',
      description: p.description || '',
      taxId: p.taxId || '',
      paymentLink: p.paymentLink || '',
      invoicePdfUrl: p.invoicePdfUrl || '',
      invoicePdfName: p.invoicePdfName || '',
      invoiceXmlUrl: p.invoiceXmlUrl || '',
      invoiceXmlName: p.invoiceXmlName || '',
      receiptPdfUrl: p.receiptPdfUrl || p.attachmentUrl || '',
      receiptPdfName: p.receiptPdfName || (p.attachmentUrl ? p.attachmentUrl.split('/').pop() : '') || '',
      attachmentUrl: p.attachmentUrl || '',
    });
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;

    const amt = parseFloat(regForm.amount);
    if (!amt || isNaN(amt)) return;

    const rate = parseFloat(regForm.exchangeRate) || 1;
    const finAmt = regForm.currency === 'MXN' ? (amt / rate) : amt;
    const amtMxn = regForm.currency === 'MXN' ? amt : (amt * rate);

    const targetStudentIds = regForm.studentIds.length > 0 ? regForm.studentIds : [regForm.studentId];

    targetStudentIds.forEach(stIdStr => {
      addFinancialTransaction({
        type: 'income',
        date: regForm.date,
        description: regForm.description,
        amount: amt,
        currency: regForm.currency as any,
        exchangeRate: rate,
        amountMXN: amtMxn,
        finalAmount: finAmt,
        status: 'Pagado',
        categoryId: 'cat_ingreso_servicios',
        subcategory: 'sub_cursos_ingreso',
        paymentMethod: regForm.paymentMethod,
        bankAccountId: regForm.bankAccountId,
        institutionId: institution.id,
        studentId: stIdStr ? Number(stIdStr) : undefined,
        taxId: regForm.taxId,
        agentId: currentUser?.id,
        originalAmount: amt,
        originalCurrency: regForm.currency as any,
      });
    });

    // Reset Form
    setRegForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      currency: 'MXN',
      exchangeRate: '18.5',
      paymentMethod: 'Transferencia',
      bankAccountId: '',
      description: 'Pago de Cursos',
      taxId: '',
      studentId: '',
      studentIds: [],
    });
    setRegStudentSearch("");
    setIsCoursePaymentModalOpen(false);
  };

  const handleSchedulePayments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;

    const num = parseInt(schForm.numPayments) || 1;
    const baseAmt = parseFloat(schForm.amountPerPayment);
    if (!baseAmt || isNaN(baseAmt)) return;

    const rate = parseFloat(schForm.exchangeRate) || 18.5;

    const isMembValue = schForm.concepto === 'Membresía';
    const dynamicSubcat = isMembValue ? 'sub_membresia' : 'sub_cursos_ingreso';

    const targetStudentIds = schForm.studentIds.length > 0 ? schForm.studentIds : [schForm.studentId];

    targetStudentIds.forEach(stIdStr => {
      for (let i = 1; i <= num; i++) {
        const pDate = getScheduledDate(schForm.startDate, schForm.periodicity, i - 1);
        
        const finAmt = schForm.currency === 'MXN' ? (baseAmt / rate) : baseAmt;
        const amtMxn = schForm.currency === 'MXN' ? baseAmt : (baseAmt * rate);

        addFinancialTransaction({
          type: 'income',
          date: pDate,
          description: `${schForm.description} ${i}/${num}`,
          amount: baseAmt,
          currency: schForm.currency as any,
          exchangeRate: rate,
          amountMXN: amtMxn,
          finalAmount: finAmt,
          status: 'Programado',
          categoryId: 'cat_ingreso_servicios',
          subcategory: dynamicSubcat,
          paymentMethod: schForm.paymentMethod,
          bankAccountId: schForm.bankAccountId,
          institutionId: institution.id,
          studentId: stIdStr ? Number(stIdStr) : undefined,
          agentId: currentUser?.id,
          originalAmount: baseAmt,
          originalCurrency: schForm.currency as any,
          paymentLink: schForm.paymentLink,
        });
      }
    });

    // Reset Form
    setSchForm({
      concepto: 'Cursos',
      numPayments: '3',
      startDate: new Date().toISOString().split('T')[0],
      periodicity: 'monthly-first',
      amountPerPayment: '',
      currency: 'MXN',
      exchangeRate: '18.5',
      paymentMethod: 'Transferencia',
      bankAccountId: '',
      description: 'Pago Programado de Cursos',
      studentId: '',
      studentIds: [],
      paymentLink: '',
    });
    setSchStudentSearch("");
    setIsCoursePaymentModalOpen(false);
  };

  const handleConfirmPaymentReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingPayment) return;

    const amt = parseFloat(confirmForm.amount) || confirmingPayment.amount;
    const rate = parseFloat(confirmForm.exchangeRate) || confirmingPayment.exchangeRate;
    const finAmt = confirmForm.currency === 'MXN' ? (amt / rate) : amt;
    const amtMxn = confirmForm.currency === 'MXN' ? amt : (amt * rate);

    updateFinancialTransaction(confirmingPayment.id, {
      status: 'Pagado',
      date: confirmForm.date,
      amount: amt,
      currency: confirmForm.currency as any,
      exchangeRate: rate,
      amountMXN: amtMxn,
      finalAmount: finAmt,
      paymentMethod: confirmForm.paymentMethod,
      bankAccountId: confirmForm.bankAccountId,
      description: confirmForm.description,
      taxId: confirmForm.taxId,
      originalAmount: amt,
      originalCurrency: confirmForm.currency as any,
      paymentLink: confirmForm.paymentLink,
      invoicePdfUrl: confirmForm.invoicePdfUrl || undefined,
      invoicePdfName: confirmForm.invoicePdfName || undefined,
      invoiceXmlUrl: confirmForm.invoiceXmlUrl || undefined,
      invoiceXmlName: confirmForm.invoiceXmlName || undefined,
      receiptPdfUrl: confirmForm.receiptPdfUrl || undefined,
      receiptPdfName: confirmForm.receiptPdfName || undefined,
      attachmentUrl: confirmForm.receiptPdfName || confirmForm.attachmentUrl || undefined,
    });

    setConfirmingPayment(null);
  };

  const handleEditPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailPayment) return;

    const amt = parseFloat(editPaymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Por favor ingresa un monto válido");
      return;
    }

    const rate = parseFloat(editPaymentForm.exchangeRate) || 18.5;
    const originalCurrency = editPaymentForm.currency;

    updateFinancialTransaction(selectedDetailPayment.id, {
      date: editPaymentForm.date,
      description: editPaymentForm.description,
      amount: amt,
      currency: editPaymentForm.currency as any,
      exchangeRate: rate,
      paymentMethod: editPaymentForm.paymentMethod,
      bankAccountId: editPaymentForm.bankAccountId,
      status: editPaymentForm.status as any,
      taxId: editPaymentForm.taxId,
      originalAmount: amt,
      originalCurrency: originalCurrency as any,
      paymentLink: editPaymentForm.paymentLink,
      invoicePdfUrl: editPaymentForm.invoicePdfUrl || undefined,
      invoicePdfName: editPaymentForm.invoicePdfName || undefined,
      invoiceXmlUrl: editPaymentForm.invoiceXmlUrl || undefined,
      invoiceXmlName: editPaymentForm.invoiceXmlName || undefined,
      receiptPdfUrl: editPaymentForm.receiptPdfUrl || undefined,
      receiptPdfName: editPaymentForm.receiptPdfName || undefined,
      attachmentUrl: editPaymentForm.receiptPdfName || editPaymentForm.attachmentUrl || undefined,
    });

    setIsDetailPaymentModalOpen(false);
    setSelectedDetailPayment(null);
    setIsEditPaymentMode(false);
  };

  const [generalForm, setGeneralForm] = useState({
    name: institution?.name || '',
    tradeName: institution?.tradeName || '',
    institutionCode: institution?.institutionCode || '',
    country: institution?.country || '',
    colombiaCalendar: institution?.colombiaCalendar || '',
    contact: institution?.contact || '',
    contactPhone: institution?.contactPhone || '',
    institutionTypeId: institution?.institutionTypeId || '',
    status: institution?.status || '',
    membershipId: institution?.membershipId || '',
    membershipExpiration: institution?.membershipExpiration || '',
    agentId: institution?.agentId || '',
    modality: institution?.modality || '',
    membershipPrice: institution?.membershipPrice || '',
    priceFullCredit: institution?.priceFullCredit || '',
    priceHalfCredit: institution?.priceHalfCredit || '',
    priceFullApCredit: institution?.priceFullApCredit || '',
    priceHalfApCredit: institution?.priceHalfApCredit || '',
    payWithIva: institution?.payWithIva || false,
    isCorporativo: institution?.isCorporativo || false,
    active: institution?.active !== false,
    paymentMethod: institution?.paymentMethod || '',
    paymentAccount: institution?.paymentAccount || '',
    membershipPaymentMethod: institution?.membershipPaymentMethod || '',
    membershipPaymentAccount: institution?.membershipPaymentAccount || '',
    membershipPaymentCount: institution?.membershipPaymentCount || '',
    membershipPaymentStartDate: institution?.membershipPaymentStartDate || '',
    coursePaymentMethod: institution?.coursePaymentMethod || '',
    coursePaymentAccount: institution?.coursePaymentAccount || '',
    coursePaymentCount: institution?.coursePaymentCount || '',
    coursePaymentStartDate: institution?.coursePaymentStartDate || '',
    priceObservations: institution?.priceObservations || '',
    address: institution?.address || '',
    city: institution?.city || '',
    state: institution?.state || '',
    zipCode: institution?.zipCode || '',
    phone: institution?.phone || '',
    email: institution?.email || '',
    contactEmail: institution?.contactEmail || '',
    contactPosition: institution?.contactPosition || '',
    tarifasId: institution?.tarifasId || '',
    mainProviderId: institution?.mainProviderId || ''
  });

  const openEditModal = () => {
    if (institution) {
      setGeneralForm({
        name: institution.name,
        tradeName: institution.tradeName || '',
        institutionCode: institution.institutionCode || '',
        country: institution.country,
        colombiaCalendar: institution.colombiaCalendar || '',
        contact: institution.contact,
        contactPhone: institution.contactPhone || '',
        contactPosition: institution.contactPosition || '',
        institutionTypeId: institution.institutionTypeId || '',
        status: institution.status,
        membershipId: institution.membershipId || '',
        membershipExpiration: institution.membershipExpiration || '',
        agentId: institution.agentId || '',
        modality: institution.modality || '',
        membershipPrice: institution.membershipPrice || '',
        priceFullCredit: institution.priceFullCredit || '',
        priceHalfCredit: institution.priceHalfCredit || '',
        priceFullApCredit: institution.priceFullApCredit || '',
        priceHalfApCredit: institution.priceHalfApCredit || '',
        payWithIva: institution.payWithIva || false,
        isCorporativo: institution.isCorporativo || false,
        active: institution.active !== false,
        paymentMethod: institution.paymentMethod || '',
        paymentAccount: institution.paymentAccount || '',
        membershipPaymentMethod: institution.membershipPaymentMethod || '',
        membershipPaymentAccount: institution.membershipPaymentAccount || '',
        membershipPaymentCount: institution.membershipPaymentCount || '',
        membershipPaymentStartDate: institution.membershipPaymentStartDate || '',
        coursePaymentMethod: institution.coursePaymentMethod || '',
        coursePaymentAccount: institution.coursePaymentAccount || '',
        coursePaymentCount: institution.coursePaymentCount || '',
        coursePaymentStartDate: institution.coursePaymentStartDate || '',
        priceObservations: institution.priceObservations || '',
        address: institution.address || '',
        city: institution.city || '',
        state: institution.state || '',
        zipCode: institution.zipCode || '',
        phone: institution.phone || '',
        email: institution.email || '',
        contactEmail: institution.contactEmail || '',
        tarifasId: institution.tarifasId || '',
        mainProviderId: institution.mainProviderId || ''
      });
      setActiveEditTab('generales');
      setIsEditGeneralOpen(true);
    }
  };

  const handleGeneratePDFReport = () => {
    if (!institution) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes (pop-ups) para descargar el reporte en PDF.');
      return;
    }

    const title = `Reporte Concentrado de Pagos (Cursos vs Membresía) - ${institution.name}`;
    
    // Sort payments by date desc for the report
    const reportPayments = [...institutionHistoricalPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Separate payments
    const coursesPayments = reportPayments.filter(p => !isMembershipPayment(p));
    const membershipPayments = reportPayments.filter(p => isMembershipPayment(p));

    const getPaymentUSD = (p: any) => p.finalAmount !== undefined ? p.finalAmount : (p.currency === 'USD' ? p.amount : (p.amountMXN / (p.exchangeRate || 18.5)));
    const getPaymentMXN = (p: any) => p.currency === 'MXN' ? p.amount : (p.amount * (p.exchangeRate || 18.5));

    const coursesCount = coursesPayments.length;
    const coursesPaidUSD = coursesPayments.reduce((sum, p) => sum + getPaymentUSD(p), 0);
    const coursesPaidMXN = coursesPayments.reduce((sum, p) => sum + getPaymentMXN(p), 0);

    const membCount = membershipPayments.length;
    const membPaidUSD = membershipPayments.reduce((sum, p) => sum + getPaymentUSD(p), 0);
    const membPaidMXN = membershipPayments.reduce((sum, p) => sum + getPaymentMXN(p), 0);

    const totalCount = coursesCount + membCount;
    const totalPaidUSD = coursesPaidUSD + membPaidUSD;
    const totalPaidMXN = coursesPaidMXN + membPaidMXN;

    const coursesPct = totalPaidUSD > 0 ? (coursesPaidUSD / totalPaidUSD) * 100 : 0;
    const membPct = totalPaidUSD > 0 ? (membPaidUSD / totalPaidUSD) * 100 : 0;

    const renderPaymentRows = (list: any[], badgeText: string, badgeBg: string, badgeColor: string) => {
      return list.map((p, idx) => {
        const amountUSD = getPaymentUSD(p);
        const hasOriginalDiff = p.originalCurrency !== undefined ? p.originalCurrency !== 'USD' : p.currency !== 'USD';
        const origAmt = p.originalAmount !== undefined ? p.originalAmount : p.amount;
        const origCurr = p.originalCurrency || p.currency;
        const studentObj = p.studentId ? students.find(s => String(s.id) === String(p.studentId)) : null;
        const studentName = studentObj ? `${studentObj.name} ${studentObj.lastName || ''}` : '';

        return `
          <tr class="border-b border-slate-100 font-sans text-xs ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}">
            <td class="px-4 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">${p.date}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeBg} ${badgeColor}">${badgeText}</span>
                <span class="font-bold text-slate-800">${p.description}</span>
              </div>
              ${studentName ? `<div class="text-[10px] text-slate-500 font-semibold mt-0.5">Alumno: <span class="text-slate-700 font-bold">${studentName}</span></div>` : ''}
            </td>
            <td class="px-4 py-2.5 text-slate-600 font-medium whitespace-nowrap">${p.paymentMethod || 'Transferencia'}</td>
            <td class="px-4 py-2.5 whitespace-nowrap">
              <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                p.status === 'Aplicado' || p.status === 'Pagado'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }">
                ${p.status === 'Aplicado' || p.status === 'Pagado' ? 'Pagado' : (p.status || 'Pagado')}
              </span>
            </td>
            <td class="px-4 py-2.5 text-right whitespace-nowrap">
              <span class="font-black text-slate-900 text-xs">$${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              ${hasOriginalDiff ? `<span class="block text-[9px] font-mono text-slate-400 mt-0.5 leading-none">Orig: $${origAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${origCurr}</span>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { padding: 1cm; background-color: #fff !important; }
              .no-print { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          </style>
        </head>
        <body class="bg-gray-50 p-8">
          <div class="max-w-4xl mx-auto space-y-6">
            
            <!-- Quick Actions Bar (hidden when printing) -->
            <div class="no-print bg-white shadow-sm border border-slate-200 p-4 rounded-2xl flex justify-between items-center mb-6">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs text-slate-600 font-bold uppercase tracking-wider">Reporte financiero concentrado listo para guardar o imprimir.</span>
              </div>
              <div class="flex gap-2">
                <button 
                  onclick="window.print()" 
                  class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer border-0"
                >
                  Imprimir / Guardar PDF
                </button>
                <button 
                  onclick="window.close()" 
                  class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <!-- Main Leaflet/Report Document -->
            <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
              <!-- Document Header -->
              <div class="flex justify-between items-start border-b border-gray-200 pb-6">
                <div>
                  <h1 class="text-xs font-black uppercase tracking-widest text-indigo-600 mb-1">\${(companyInfo?.commercialName || 'Reporte Financiero Oficial').toUpperCase()}</h1>
                  <h2 class="text-2xl font-black text-slate-900 tracking-tight">${institution.name}</h2>
                  <p class="text-xs text-slate-500 mt-1">${institution.tradeName || 'Colegio / Institución Educativa'}</p>
                  <p class="text-[11px] font-semibold text-slate-600 mt-0.5">Alumnos Inscritos: <strong>${instStudents.length}</strong> &bull; Materias Activas: <strong>${numActiveEnrollments}</strong> (${numActiveClasses} distintas: ${numActiveFullCredits} Full Credit, ${numActiveHalfCredits} Half Credit)</p>
                  ${(payFilterStartDate || payFilterEndDate) ? `<p class="text-[10px] font-bold text-indigo-700 mt-1">Filtro de período: ${payFilterStartDate || 'Inicio'} al ${payFilterEndDate || 'Hoy'}</p>` : ''}
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    CONCENTRADO CURSOS VS MEMBRESÍA
                  </span>
                  <p class="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</p>
                </div>
              </div>

              <!-- Concentrated KPI Breakdown (Cursos vs Membresía vs Total) -->
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Concentrado de Ingresos Recaudados (Cursos vs Membresía)</div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Cursos Card -->
                  <div class="p-4 bg-gradient-to-br from-indigo-50/60 to-blue-50/40 border border-indigo-100 rounded-2xl">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[9px] font-black uppercase text-indigo-800 tracking-widest">📚 Pago por Cursos</span>
                      <span class="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">${coursesPct.toFixed(1)}%</span>
                    </div>
                    <div class="text-xl font-black text-indigo-950">$${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="text-xs font-bold text-indigo-600">USD</span></div>
                    <div class="text-[11px] font-semibold text-slate-500 mt-0.5">~$${coursesPaidMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                    <div class="text-[10px] font-bold text-indigo-700 mt-2 pt-2 border-t border-indigo-100/60">${coursesCount} pagos registrados</div>
                  </div>

                  <!-- Membresia Card -->
                  <div class="p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-100 rounded-2xl">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[9px] font-black uppercase text-amber-800 tracking-widest">⭐ Pago por Membresía</span>
                      <span class="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">${membPct.toFixed(1)}%</span>
                    </div>
                    <div class="text-xl font-black text-amber-950">$${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="text-xs font-bold text-amber-600">USD</span></div>
                    <div class="text-[11px] font-semibold text-slate-500 mt-0.5">~$${membPaidMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                    <div class="text-[10px] font-bold text-amber-700 mt-2 pt-2 border-t border-amber-100/60">${membCount} pagos registrados</div>
                  </div>

                  <!-- Total Recaudado Card -->
                  <div class="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100 rounded-2xl">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[9px] font-black uppercase text-emerald-800 tracking-widest">💰 Total Recaudado</span>
                      <span class="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">100%</span>
                    </div>
                    <div class="text-xl font-black text-emerald-950">$${totalPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="text-xs font-bold text-emerald-600">USD</span></div>
                    <div class="text-[11px] font-semibold text-slate-500 mt-0.5">~$${totalPaidMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                    <div class="text-[10px] font-bold text-emerald-700 mt-2 pt-2 border-t border-emerald-100/60">${totalCount} transacciones de ingreso</div>
                  </div>
                </div>
              </div>

              <!-- General Financial Context Grid -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Vendido Cursos</span>
                  <span class="text-slate-900 font-extrabold text-lg">$${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-indigo-600 block mt-0.5">USD</span>
                </div>
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Cargo Membresía Total</span>
                  <span class="text-slate-900 font-extrabold text-lg">$${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-indigo-600 block mt-0.5">USD</span>
                </div>
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Monto por Recaudar</span>
                  <span class="text-rose-600 font-extrabold text-lg">$${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-rose-500 block mt-0.5">USD</span>
                </div>
                ${isUserAdminOrSuperAdmin ? `
                <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-emerald-800 tracking-widest leading-none mb-1.5">Margen Proyectado</span>
                  <span class="text-emerald-950 font-extrabold text-lg">$${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-emerald-700 block mt-0.5">${margenPorcentaje.toFixed(1)}% Rentabilidad</span>
                </div>
                ` : `
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-indigo-800 tracking-widest leading-none mb-1.5">Total Ingresos Proyectado</span>
                  <span class="text-indigo-950 font-extrabold text-lg">$${(totalVendidoUSD + totalMembUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-indigo-700 block mt-0.5">USD</span>
                </div>
                `}
              </div>

              <!-- Expenses Summary (if admin) -->
              ${isUserAdminOrSuperAdmin ? `
              <div class="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest block mb-1">Estatus del Proveedor (Egresos)</span>
                  <div class="text-slate-700 text-xs font-semibold">
                    Costo Total Clases: <span class="font-bold text-slate-900">$${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </div>
                </div>
                <div class="text-left md:text-right">
                  <span class="text-[10px] font-extrabold text-rose-800 uppercase tracking-widest block mb-1">Saldo por Pagar (Pendiente de Pago)</span>
                  <span class="text-rose-700 font-black text-sm">$${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
              </div>
              ` : ''}

              <!-- SECTION 1: COURSES PAYMENTS -->
              <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h3 class="text-xs font-black uppercase tracking-wider text-slate-800">1. Concentrado y Desglose de Pagos por Cursos</h3>
                  </div>
                  <span class="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    Subtotal Cursos: $${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (${coursesCount} pagos)
                  </span>
                </div>

                ${coursesPayments.length === 0 ? `
                  <div class="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">No hay pagos registrados para cursos en este período.</div>
                ` : `
                  <div class="overflow-x-auto rounded-xl border border-slate-200">
                    <table class="w-full text-left font-sans border-collapse">
                      <thead>
                        <tr class="border-b border-gray-200 bg-gray-50 font-black text-[9px] tracking-widest uppercase text-gray-500">
                          <th class="px-4 py-2.5">Fecha</th>
                          <th class="px-4 py-2.5">Concepto / Alumno</th>
                          <th class="px-4 py-2.5">Método</th>
                          <th class="px-4 py-2.5">Estado</th>
                          <th class="px-4 py-2.5 text-right font-black">Monto (USD)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        ${renderPaymentRows(coursesPayments, 'Cursos', 'bg-indigo-50 text-indigo-700 border border-indigo-100', '')}
                      </tbody>
                      <tfoot>
                        <tr class="bg-indigo-50/50 border-t border-indigo-100 font-bold text-xs">
                          <td colspan="4" class="px-4 py-2.5 text-slate-700 uppercase tracking-wider text-[10px] font-black">Total Cobrado por Cursos (${coursesCount} pagos):</td>
                          <td class="px-4 py-2.5 text-right font-black text-indigo-950 whitespace-nowrap">
                            $${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                `}
              </div>

              <!-- SECTION 2: MEMBERSHIP PAYMENTS -->
              <div class="space-y-3 pt-4">
                <div class="flex items-center justify-between border-b border-amber-100 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h3 class="text-xs font-black uppercase tracking-wider text-slate-800">2. Concentrado y Desglose de Pagos por Membresía</h3>
                  </div>
                  <span class="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                    Subtotal Membresía: $${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (${membCount} pagos)
                  </span>
                </div>

                ${membershipPayments.length === 0 ? `
                  <div class="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">No hay pagos registrados para membresía en este período.</div>
                ` : `
                  <div class="overflow-x-auto rounded-xl border border-slate-200">
                    <table class="w-full text-left font-sans border-collapse">
                      <thead>
                        <tr class="border-b border-gray-200 bg-gray-50 font-black text-[9px] tracking-widest uppercase text-gray-500">
                          <th class="px-4 py-2.5">Fecha</th>
                          <th class="px-4 py-2.5">Concepto / Alumno</th>
                          <th class="px-4 py-2.5">Método</th>
                          <th class="px-4 py-2.5">Estado</th>
                          <th class="px-4 py-2.5 text-right font-black">Monto (USD)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        ${renderPaymentRows(membershipPayments, 'Membresía', 'bg-amber-50 text-amber-700 border border-amber-100', '')}
                      </tbody>
                      <tfoot>
                        <tr class="bg-amber-50/50 border-t border-amber-100 font-bold text-xs">
                          <td colspan="4" class="px-4 py-2.5 text-slate-700 uppercase tracking-wider text-[10px] font-black">Total Cobrado por Membresía (${membCount} pagos):</td>
                          <td class="px-4 py-2.5 text-right font-black text-amber-950 whitespace-nowrap">
                            $${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                `}
              </div>

              <!-- SECTION 3: RECONCILIATION SUMMARY -->
              <div class="space-y-3 pt-4">
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-gray-200 pb-2">3. Conciliación y Resumen General de Cobranza</h3>
                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div class="flex justify-between items-center text-xs py-1 border-b border-slate-200/60">
                    <span class="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-indigo-600"></span> Pagos por Cursos (${coursesCount} transacciones):
                    </span>
                    <span class="font-bold text-slate-900">$${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span class="text-slate-400 font-normal">(${coursesPct.toFixed(1)}%)</span></span>
                  </div>
                  <div class="flex justify-between items-center text-xs py-1 border-b border-slate-200/60">
                    <span class="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-amber-500"></span> Pagos por Membresía (${membCount} transacciones):
                    </span>
                    <span class="font-bold text-slate-900">$${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span class="text-slate-400 font-normal">(${membPct.toFixed(1)}%)</span></span>
                  </div>
                  <div class="flex justify-between items-center text-sm py-2 pt-2 font-black text-emerald-950">
                    <span class="flex items-center gap-1.5 uppercase tracking-wider text-xs">
                      <span class="w-2 h-2 rounded-full bg-emerald-600"></span> Gran Total Recaudado (${totalCount} transacciones):
                    </span>
                    <span class="text-base text-emerald-700 font-black">$${totalPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span class="text-xs text-slate-500 font-semibold">(~$${totalPaidMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN)</span></span>
                  </div>
                </div>
              </div>

              <!-- Standard Footer Signature -->
              <div class="pt-6 mt-6 border-t border-gray-200 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>IHS MANAGER PLATFORM</span>
                <span>Copias autorizadas para uso interno</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const [contactForm, setContactForm] = useState({
    name: '', lastName: '', position: '', area: '', email: '', phone: '', systemAccess: false
  });

  const [taskForm, setTaskForm] = useState({
    title: '', dueDate: '', userId: '', type: 'Llamada' as TaskType
  });

  const taskTypeOptions: { type: TaskType; label: string; icon: any; color: string }[] = [
    { type: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-blue-600' },
    { type: 'Correo', label: 'Correo', icon: Mail, color: 'text-amber-600' },
    { type: 'Visita', label: 'Visita', icon: MapPin, color: 'text-rose-600' },
    { type: 'Meet', label: 'Meet', icon: Video, color: 'text-indigo-600' },
    { type: 'Otro', label: 'Otro', icon: FileText, color: 'text-slate-600' },
  ];

  if (!institution) {
    return <div className="p-8 text-center text-slate-500 font-medium whitespace-pre-line">Institución no encontrada o Acceso no autorizado</div>;
  }

  const formatToInputDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return "";
    const trimmed = dateStr.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
      const [_, day, month, year] = slashMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const yyyySlashMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyySlashMatch) {
      const [_, year, month, day] = yyyySlashMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {}
    return "";
  };

  const formatToDisplayDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return "-";
    const trimmed = dateStr.trim();
    if (!trimmed) return "-";
    const inputDate = formatToInputDate(trimmed);
    if (inputDate) {
      const parts = inputDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return trimmed;
  };

  const instStudents = students.filter(s => s.institutionId !== undefined && s.institutionId !== null && Number(s.institutionId) === Number(institution.id));
  const instStudentIds = instStudents.map(s => String(s.id));
  
  const getScheduledDate = (baseDate: string, periodicity: string, index: number) => {
    let d = new Date(baseDate + 'T12:00:00');
    if (periodicity === 'monthly-first') {
      const addMonths = d.getDate() > 1 ? index + 1 : index;
      d.setMonth(d.getMonth() + addMonths);
      d.setDate(1);
    } else if (periodicity === 'monthly-same') {
      d.setMonth(d.getMonth() + index);
    } else if (periodicity === 'biweekly') {
      d.setDate(d.getDate() + (index * 15));
    } else if (periodicity === 'weekly') {
      d.setDate(d.getDate() + (index * 7));
    }
    return d.toISOString().split('T')[0];
  };

  // Helper to categorize payment as Membership or Courses
  const isMembershipPayment = (tx: any) => {
    return (
      tx.subcategory === 'sub_membresia' ||
      (tx.concept && (tx.concept.toLowerCase().includes('membresía') || tx.concept.toLowerCase().includes('membresia'))) ||
      (tx.description && (tx.description.toLowerCase().includes('membresía') || tx.description.toLowerCase().includes('membresia')))
    );
  };

  const rawInstPayments = financialTransactions.filter(p => 
    ((p.institutionId !== undefined && p.institutionId !== null && Number(p.institutionId) === Number(institution.id)) || 
     (p.studentId !== undefined && p.studentId !== null && instStudentIds.includes(String(p.studentId)))) && 
    p.type === 'income' && 
    (p.status === 'Aplicado' || p.status === 'Pagado')
  );
  const instPayments = rawInstPayments.filter(p => {
    if (payFilterStartDate && p.date < payFilterStartDate) return false;
    if (payFilterEndDate && p.date > payFilterEndDate) return false;
    return true;
  });
  const unfilteredHistoricalPayments = financialTransactions.filter(tx => 
    ((tx.institutionId !== undefined && tx.institutionId !== null && Number(tx.institutionId) === Number(institution.id)) || 
     (tx.studentId !== undefined && tx.studentId !== null && instStudentIds.includes(String(tx.studentId)))) && 
    tx.type === 'income'
  );
  const institutionHistoricalPayments = [...unfilteredHistoricalPayments.filter(tx => {
    if (payFilterStartDate && tx.date < payFilterStartDate) return false;
    if (payFilterEndDate && tx.date > payFilterEndDate) return false;
    return true;
  })].sort((a, b) => {
    let compA: any;
    let compB: any;

    if (paySortField === 'date') {
      compA = new Date(a.date).getTime();
      compB = new Date(b.date).getTime();
    } else if (paySortField === 'description') {
      compA = (a.description || '').toLowerCase();
      compB = (b.description || '').toLowerCase();
    } else if (paySortField === 'amount') {
      compA = a.currency === 'USD' ? a.amount : (a.amountMXN / (a.exchangeRate || 18.5));
      compB = b.currency === 'USD' ? b.amount : (b.amountMXN / (b.exchangeRate || 18.5));
    } else {
      compA = 0;
      compB = 0;
    }

    if (compA < compB) return paySortOrder === 'asc' ? -1 : 1;
    if (compA > compB) return paySortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Separated statistics for Customer Payments (Cursos vs Membresía)
  const instPaymentConcentrationStats = useMemo(() => {
    let coursesCount = 0;
    let coursesAmountMXN = 0;
    let coursesAmountUSD = 0;

    let membCount = 0;
    let membAmountMXN = 0;
    let membAmountUSD = 0;

    institutionHistoricalPayments.forEach(tx => {
      const rate = (tx.exchangeRate && tx.exchangeRate > 1) ? tx.exchangeRate : 18.5;
      const finalUSD = tx.finalAmount !== undefined ? tx.finalAmount : (tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rate));
      const finalMXN = tx.currency === 'MXN' ? tx.amount : (tx.amount * rate);

      if (isMembershipPayment(tx)) {
        membCount++;
        membAmountUSD += finalUSD;
        membAmountMXN += finalMXN;
      } else {
        coursesCount++;
        coursesAmountUSD += finalUSD;
        coursesAmountMXN += finalMXN;
      }
    });

    const totalCount = coursesCount + membCount;
    const totalAmountUSD = coursesAmountUSD + membAmountUSD;
    const totalAmountMXN = coursesAmountMXN + membAmountMXN;

    const coursesPct = totalAmountUSD > 0 ? (coursesAmountUSD / totalAmountUSD) * 100 : 0;
    const membPct = totalAmountUSD > 0 ? (membAmountUSD / totalAmountUSD) * 100 : 0;

    return {
      courses: {
        count: coursesCount,
        amountUSD: coursesAmountUSD,
        amountMXN: coursesAmountMXN,
        percentage: coursesPct,
      },
      membership: {
        count: membCount,
        amountUSD: membAmountUSD,
        amountMXN: membAmountMXN,
        percentage: membPct,
      },
      total: {
        count: totalCount,
        amountUSD: totalAmountUSD,
        amountMXN: totalAmountMXN,
      }
    };
  }, [institutionHistoricalPayments]);

  const displayedInstPayments = useMemo(() => {
    if (instPaymentConceptFilter === 'courses') {
      return institutionHistoricalPayments.filter(tx => !isMembershipPayment(tx));
    }
    if (instPaymentConceptFilter === 'membership') {
      return institutionHistoricalPayments.filter(tx => isMembershipPayment(tx));
    }
    return institutionHistoricalPayments;
  }, [institutionHistoricalPayments, instPaymentConceptFilter]);
  const instContacts = contacts.filter(c => c.institutionId === institution.id);
  const instTasks = tasks.filter(t => t.institutionId === institution.id);
  const instActivities = activities.filter(a => a.institutionId === institution.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Helper to sum MXN with IVA (and convert USD without IVA to MXN with IVA if payWithIva is true)
  const getMXNWithIva = (p: { currency: string; amount: number; amountMXN?: number; exchangeRate?: number }) => {
    if (p.currency === 'USD') {
      const rate = p.exchangeRate || 18.5;
      const baseMXN = p.amount * rate;
      return institution?.payWithIva ? baseMXN * 1.16 : baseMXN;
    } else {
      const amtMXN = p.amountMXN !== undefined ? p.amountMXN : p.amount;
      return amtMXN;
    }
  };

  // Helper to get USD without IVA (and convert MXN with IVA to USD without IVA if payWithIva is true)
  const getUSDWithoutIva = (p: { currency: string; amount: number; amountMXN?: number; exchangeRate?: number }) => {
    if (p.currency === 'USD') {
      return p.amount;
    } else {
      const amtMXN = p.amountMXN !== undefined ? p.amountMXN : p.amount;
      const baseMXNWithoutIva = institution?.payWithIva ? amtMXN / 1.16 : amtMXN;
      const rate = (p.exchangeRate && p.exchangeRate !== 1) ? p.exchangeRate : (Math.abs(baseMXNWithoutIva - 3768) < 5 ? 18.84 : 18.5);
      return baseMXNWithoutIva / rate;
    }
  };

  // Calculate unified metrics via centralized calculateInstitutionFinancials
  const financialMetrics = calculateInstitutionFinancials(
    institution,
    students,
    enrollments,
    classes,
    catalogs,
    providerProductServices,
    financialTransactions,
    { payFilterStartDate, payFilterEndDate }
  );

  const {
    totalVendidoUSD,
    totalVendidoMXN,
    totalMembUSD,
    totalMembMXN,
    totalIngresosProyectadosUSD,
    totalIngresosProyectadosMXN,
    coursesPaidUSD,
    coursesPaidMXN,
    membPaidUSD,
    membPaidMXN,
    totalPagadoUSD,
    totalPagadoMXN,
    coursesPendingUSD,
    coursesPendingMXN,
    membPendingUSD,
    membPendingMXN,
    totalPorRecaudarUSD,
    totalPorRecaudarMXN,
    totalCostUSD,
    totalCostMXN,
    egresosPagadosUSD,
    egresosPagadosMXN,
    saldoPorPagarUSD,
    saldoPorPagarMXN,
    margenProyectadoUSD,
    margenProyectadoMXN,
    margenPorcentaje,
    numActiveEnrollments,
    numActiveClasses,
    numActiveFullCredits,
    numActiveHalfCredits,
    numDistinctFullCredits,
    numDistinctHalfCredits
  } = financialMetrics;

  const totalVendido = totalVendidoMXN;
  const totalPagado = totalPagadoMXN;
  const totalPorRecaudar = totalPorRecaudarMXN;
  const pendingAmount = totalPorRecaudarMXN;
  const egresosPagados = egresosPagadosMXN;
  const totalCost = totalCostMXN;
  const saldoPorPagar = saldoPorPagarMXN;
  const margenProyectado = margenProyectadoMXN;

  // Active Enrollments & Materias
  const rawInstEnrollments = enrollments.filter(e => instStudentIds.includes(String(e.studentId)));
  const instEnrollments = rawInstEnrollments.filter(e => {
    if (e.status === 'Withdrawn') return false;
    const d = e.startDate || e.enrollmentDate;
    if (!d) return true;
    if (payFilterStartDate && d < payFilterStartDate) return false;
    if (payFilterEndDate && d > payFilterEndDate) return false;
    return true;
  });
  const instActiveEnrollments = rawInstEnrollments.filter(e => e.status === 'Active' || e.status === 'Extended' || (!e.status && (e.status !== 'Completed' && e.status !== 'Withdrawn' && e.status !== 'Ended')));
  const instActiveClassIds = new Set(instActiveEnrollments.map(e => e.classId));

  // Helper to recognize platform licenses, language centers, admissions and external certifications
  const isExtraServiceClass = (name: string) => {
    if (!name) return false;
    const n = name.trim().toLowerCase();
    return (
      n.startsWith("servicio extra -") ||
      n.startsWith("servicio extra") ||
      n.includes("certificación de inglés") ||
      n.includes("certificación ingles") ||
      n.includes("certificacion de ingles") ||
      n.includes("certificacion ingles") ||
      n.includes("university admission") ||
      n.includes("centro de idiomas digital") ||
      n.includes("schmoop") ||
      n.includes("iivvo")
    );
  };

  const getServiceCategory = (name: string): { label: string; category: 'platform' | 'certification' | 'admission' | 'other'; badgeColor: string } => {
    const n = (name || '').toLowerCase();
    if (n.includes('certificación') || n.includes('certificacion') || n.includes('toefl') || n.includes('ielts') || n.includes('ingles') || n.includes('inglés')) {
      return { label: 'Certificación Externa', category: 'certification', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (n.includes('university admission') || n.includes('admision') || n.includes('admisiones')) {
      return { label: 'Admisión Universitaria', category: 'admission', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (n.includes('idiomas') || n.includes('schmoop') || n.includes('iivvo') || n.includes('plataforma')) {
      return { label: 'Plataforma Digital', category: 'platform', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: 'Servicio Extra', category: 'other', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  // Memoized enriched student enrollments with prices, classes, and pass/fail data
  const studentEnrollmentsReport = useMemo(() => {
    const tariffId = institution?.tarifasId;
    const countryRef = catalogs['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || institution?.country || 'Default';

    const items: Array<{
      enrollment: any;
      student: any;
      cls: any;
      provider: any;
      salePriceUSD: number;
      salePriceMXN: number;
      costUSD: number;
      scholarshipDiscountUSD: number;
      gradeOutcome: CourseGradeOutcome;
      finalGrade: string;
      gradeDate: string;
      status: string;
      creditTypeCategory: 'Full' | 'Half' | 'Other';
    }> = [];

    instStudents.forEach(s => {
      const sEnrolls = rawInstEnrollments.filter(e => e.studentId === s.id);
      
      // Calculate student total raw USD for scholarship calculations
      let sTotalRawUSD = 0;
      sEnrolls.forEach(e => {
        const cl = classes.find(c => c.id === e.classId);
        if (!cl || isExtraServiceClass(cl.name)) return;
        let cp = e.price;
        if (cp === undefined || cp === null) {
          let rate = null;
          if (countryRef && cl.countryRates) {
            rate = cl.countryRates[countryRef];
            if (!rate) {
              const matchKey = Object.keys(cl.countryRates).find(k => k.toLowerCase() === countryRef.toLowerCase());
              if (matchKey) rate = cl.countryRates[matchKey];
            }
          }
          cp = parseFloat((rate?.price || cl.price || "0").toString().replace(/[^0-9.-]+/g, "") || "0");
        }
        sTotalRawUSD += (cp || 0);
      });

      let sScholarshipTotalUSD = 0;
      if (s.hasScholarship && s.scholarshipTarget === 'Escuela') {
        const val = s.scholarshipValue || 0;
        if (s.scholarshipType === 'Porcentaje') {
          sScholarshipTotalUSD = sTotalRawUSD * (val / 100);
        } else {
          sScholarshipTotalUSD = val;
        }
        sScholarshipTotalUSD = Math.min(sTotalRawUSD, sScholarshipTotalUSD);
      }

      sEnrolls.forEach(en => {
        const cls = classes.find(c => c.id === en.classId);
        // Exclude extra service classes from standard academic report so they appear cleanly in the new tab
        if (cls && isExtraServiceClass(cls.name)) {
          return;
        }
        const provId = en.providerId || cls?.providerId;
        const provider = providers.find(p => p.id === provId);

        // Price calculation
        let pCost = en.price;
        if (pCost === undefined || pCost === null) {
          let rate = null;
          if (countryRef && cls?.countryRates) {
            rate = cls.countryRates[countryRef];
            if (!rate) {
              const matchKey = Object.keys(cls.countryRates).find(k => k.toLowerCase() === countryRef.toLowerCase());
              if (matchKey) rate = cls.countryRates[matchKey];
            }
          }
          pCost = parseFloat((rate?.price || cls?.price || "0").toString().replace(/[^0-9.-]+/g, "") || "0");
        }
        const salePriceUSD = pCost || 0;
        const salePriceMXN = salePriceUSD * 18.5;

        // Pro-rated scholarship discount if applicable
        const propScholarship = sTotalRawUSD > 0 ? (salePriceUSD / sTotalRawUSD) * sScholarshipTotalUSD : 0;

        // Resolved provider cost
        let cardResolvedCost = resolveProviderClassCost(provId, cls?.creditType, countryRef, providerProductServices);
        let cardCountryRate = null;
        if (countryRef && cls?.countryRates) {
          cardCountryRate = cls.countryRates[countryRef];
          if (!cardCountryRate) {
            const matchKey = Object.keys(cls.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
            if (matchKey) cardCountryRate = cls.countryRates[matchKey];
          }
        }
        if (!cardResolvedCost && cardCountryRate?.cost) {
          cardResolvedCost = parseFloat(cardCountryRate.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
        }
        if (!cardResolvedCost && cls?.cost) {
          cardResolvedCost = parseFloat(cls.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
        }
        if (!cardResolvedCost && cls) {
          const typeStr = (cls.creditType || "").toLowerCase().trim();
          const isAp = typeStr.includes("ap");
          const isHalf = typeStr.includes("medio") || typeStr.includes("half");
          if (isHalf) {
            cardResolvedCost = isAp ? 175 : 150;
          } else {
            cardResolvedCost = isAp ? 350 : 300;
          }
        }

        const creditTypeStr = (cls?.creditType || "").toLowerCase();
        let creditTypeCategory: 'Full' | 'Half' | 'Other' = 'Other';
        if (creditTypeStr.includes('medio') || creditTypeStr.includes('half') || creditTypeStr.includes('0.5')) {
          creditTypeCategory = 'Half';
        } else {
          creditTypeCategory = 'Full';
        }

        items.push({
          enrollment: en,
          student: s,
          cls: cls || { id: en.classId, name: `Materia ID: ${en.classId}`, creditType: 'Crédito' },
          provider,
          salePriceUSD,
          salePriceMXN,
          costUSD: cardResolvedCost || 0,
          scholarshipDiscountUSD: propScholarship,
          gradeOutcome: (en.gradeOutcome as CourseGradeOutcome) || 'Pendiente',
          finalGrade: en.finalGrade || '',
          gradeDate: en.gradeDate || '',
          status: en.status || 'Active',
          creditTypeCategory
        });
      });
    });

    return items;
  }, [instStudents, rawInstEnrollments, classes, catalogs, institution, providers, providerProductServices]);

  // Filtered dataset
  const filteredStudentEnrollments = useMemo(() => {
    return studentEnrollmentsReport.filter(item => {
      // Search
      if (studentReportSearch) {
        const q = studentReportSearch.toLowerCase().trim();
        const studentName = `${item.student.name || ''} ${item.student.lastName || ''}`.toLowerCase();
        const studentEmail = (item.student.email || '').toLowerCase();
        const studentCurp = (item.student.curp || item.enrollment.curp || '').toLowerCase();
        const className = (item.cls.name || '').toLowerCase();
        const provName = (item.provider?.commercialName || item.provider?.legalName || '').toLowerCase();
        if (!studentName.includes(q) && !studentEmail.includes(q) && !studentCurp.includes(q) && !className.includes(q) && !provName.includes(q)) {
          return false;
        }
      }

      // Grade outcome
      if (studentReportGradeFilter !== 'All') {
        if (item.gradeOutcome !== studentReportGradeFilter) return false;
      }

      // Credit type
      if (studentReportCreditFilter !== 'All') {
        if (item.creditTypeCategory !== studentReportCreditFilter) return false;
      }

      // Status
      if (studentReportStatusFilter !== 'All') {
        if (item.status !== studentReportStatusFilter) return false;
      }

      return true;
    });
  }, [studentEnrollmentsReport, studentReportSearch, studentReportGradeFilter, studentReportCreditFilter, studentReportStatusFilter]);

  // Summary KPIs for the report
  const studentReportStats = useMemo(() => {
    const totalEnrollments = studentEnrollmentsReport.length;
    const passCount = studentEnrollmentsReport.filter(e => e.gradeOutcome === 'Pass').length;
    const failCount = studentEnrollmentsReport.filter(e => e.gradeOutcome === 'Fail').length;
    const pendingCount = studentEnrollmentsReport.filter(e => !e.gradeOutcome || e.gradeOutcome === 'Pendiente').length;
    const evaluatedCount = passCount + failCount;
    const passRate = evaluatedCount > 0 ? (passCount / evaluatedCount) * 100 : 0;
    const failRate = evaluatedCount > 0 ? (failCount / evaluatedCount) * 100 : 0;

    const totalFullCredits = studentEnrollmentsReport.filter(e => e.creditTypeCategory === 'Full').length;
    const totalHalfCredits = studentEnrollmentsReport.filter(e => e.creditTypeCategory === 'Half').length;

    const totalSaleUSD = studentEnrollmentsReport.reduce((acc, curr) => acc + curr.salePriceUSD, 0);
    const totalSaleMXN = totalSaleUSD * 18.5;
    const totalCostUSD = studentEnrollmentsReport.reduce((acc, curr) => acc + curr.costUSD, 0);

    return {
      totalStudents: instStudents.length,
      totalEnrollments,
      passCount,
      failCount,
      pendingCount,
      evaluatedCount,
      passRate,
      failRate,
      totalFullCredits,
      totalHalfCredits,
      totalSaleUSD,
      totalSaleMXN,
      totalCostUSD
    };
  }, [studentEnrollmentsReport, instStudents]);

  // Extra Services, Platforms & Certifications data for this institution
  const instExtraServicesData = useMemo(() => {
    const items: Array<{
      id: string;
      student: any;
      serviceName: string;
      categoryInfo: { label: string; category: 'platform' | 'certification' | 'admission' | 'other'; badgeColor: string };
      provider: any;
      enrollment?: any;
      extraService?: any;
      status: string;
      startDate: string;
      endDate: string;
      usuario?: string;
      contrasena?: string;
      lugar?: string;
      area?: string;
      destino?: string;
      resultadoUrl?: string;
      resultadoFileName?: string;
      finalGrade?: string;
      gradeOutcome?: string;
      price?: number;
    }> = [];

    instStudents.forEach(student => {
      // 1. Check student enrollments that are extra services
      const studentEnvs = rawInstEnrollments.filter(e => e.studentId === student.id);
      studentEnvs.forEach(env => {
        const cls = classes.find(c => c.id === env.classId);
        if (cls && isExtraServiceClass(cls.name)) {
          const provId = env.providerId || cls.providerId;
          const provider = providers.find(p => p.id === provId);
          const cleanName = cls.name.replace(/^Servicio Extra -\s*/i, '').trim();
          items.push({
            id: `env_${env.id}`,
            student,
            serviceName: cleanName,
            categoryInfo: getServiceCategory(cleanName),
            provider,
            enrollment: env,
            status: env.status || 'Active',
            startDate: env.activationDate || env.startDate || env.enrollmentDate || '-',
            endDate: env.endDate || '-',
            usuario: env.usuario,
            contrasena: env.contrasena,
            lugar: env.lugar,
            area: env.area,
            destino: env.destino,
            resultadoUrl: env.resultadoUrl,
            resultadoFileName: env.resultadoFileName,
            finalGrade: env.finalGrade,
            gradeOutcome: env.gradeOutcome,
            price: env.price,
          });
        }
      });

      // 2. Check student.extraServices
      if (student.extraServices && Array.isArray(student.extraServices)) {
        student.extraServices.forEach((es: any) => {
          const alreadyAdded = items.some(it => 
            it.student.id === student.id && 
            it.serviceName.toLowerCase() === es.name.toLowerCase()
          );
          if (!alreadyAdded) {
            const provider = providers.find(p => p.id === es.providerId);
            items.push({
              id: `extra_${student.id}_${es.id}`,
              student,
              serviceName: es.name,
              categoryInfo: getServiceCategory(es.name),
              provider,
              extraService: es,
              status: es.active !== false ? 'Active' : 'Ended',
              startDate: '-',
              endDate: '-',
              price: es.priceUSD,
            });
          }
        });
      }
    });

    return items;
  }, [instStudents, rawInstEnrollments, classes, providers]);

  const serviciosStats = useMemo(() => {
    const totalEnrollments = instExtraServicesData.length;
    const uniqueStudentIds = new Set(instExtraServicesData.map(i => i.student.id));
    const totalStudents = uniqueStudentIds.size;
    const activeCount = instExtraServicesData.filter(i => i.status === 'Active' || i.status === 'Extended').length;
    const certificationsCount = instExtraServicesData.filter(i => i.categoryInfo.category === 'certification').length;
    const platformsCount = instExtraServicesData.filter(i => i.categoryInfo.category === 'platform').length;
    const admissionsCount = instExtraServicesData.filter(i => i.categoryInfo.category === 'admission').length;

    return {
      totalEnrollments,
      totalStudents,
      activeCount,
      certificationsCount,
      platformsCount,
      admissionsCount
    };
  }, [instExtraServicesData]);

  const filteredExtraServices = useMemo(() => {
    return instExtraServicesData.filter(item => {
      if (serviciosSearch.trim()) {
        const q = serviciosSearch.toLowerCase().trim();
        const studentName = `${item.student.name || ''} ${item.student.lastName || ''}`.toLowerCase();
        const email = (item.student.email || '').toLowerCase();
        const customId = (item.student.studentCustomId || '').toLowerCase();
        const curp = (item.student.curp || item.enrollment?.curp || '').toLowerCase();
        const service = item.serviceName.toLowerCase();
        const providerName = (item.provider?.commercialName || item.provider?.legalName || '').toLowerCase();
        const user = (item.usuario || '').toLowerCase();

        const matches = studentName.includes(q) ||
          email.includes(q) ||
          customId.includes(q) ||
          curp.includes(q) ||
          service.includes(q) ||
          providerName.includes(q) ||
          user.includes(q);
        if (!matches) return false;
      }

      if (serviciosCategoryFilter !== 'all') {
        if (item.categoryInfo.category !== serviciosCategoryFilter) return false;
      }

      if (serviciosStatusFilter !== 'all') {
        if (item.status !== serviciosStatusFilter) return false;
      }

      return true;
    });
  }, [instExtraServicesData, serviciosSearch, serviciosCategoryFilter, serviciosStatusFilter]);

  const handleExportServiciosCSV = () => {
    const headers = [
      'Alumno',
      'Matrícula/ID',
      'Correo',
      'CURP',
      'Servicio/Plataforma',
      'Categoría',
      'Proveedor',
      'Estatus',
      'Fecha Inicio',
      'Fecha Vencimiento',
      'Usuario',
      'Lugar',
      'Resultado/Nota'
    ];

    const rows = filteredExtraServices.map(item => [
      `"${item.student.name || ''} ${item.student.lastName || ''}"`,
      `"${item.student.studentCustomId || ''}"`,
      `"${item.student.email || ''}"`,
      `"${item.student.curp || item.enrollment?.curp || ''}"`,
      `"${item.serviceName}"`,
      `"${item.categoryInfo.label}"`,
      `"${item.provider?.commercialName || item.provider?.legalName || 'Sin Proveedor'}"`,
      `"${item.status}"`,
      `"${item.startDate}"`,
      `"${item.endDate}"`,
      `"${item.usuario || ''}"`,
      `"${item.lugar || ''}"`,
      `"${item.finalGrade || item.gradeOutcome || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Servicios_Plataformas_${institution?.name || 'Institucion'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStudentsCSV = () => {
    if (!institution) return;
    const headers = [
      "ID Alumno",
      "Nombre Alumno",
      "Apellidos Alumno",
      "Email Alumno",
      "CURP / ID",
      "ID Materia",
      "Nombre de Materia",
      "Tipo de Crédito",
      "Proveedor",
      "Fecha Inicio",
      "Fecha Fin",
      "Estatus Inscripción",
      "Precio USD",
      "Precio Aprox MXN",
      "Descuento Beca USD",
      "Costo Proveedor USD",
      "Resultado Académico (Pass/Fail)",
      "Calificación Final",
      "Fecha Calificación"
    ];

    const rows = filteredStudentEnrollments.map(item => {
      const s = item.student;
      const cls = item.cls;
      const en = item.enrollment;
      const prov = item.provider;
      return [
        `"${s.id || ''}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.lastName || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.curp || en.curp || '').replace(/"/g, '""')}"`,
        `"${cls.id || ''}"`,
        `"${(cls.name || '').replace(/"/g, '""')}"`,
        `"${cls.creditType || (item.creditTypeCategory === 'Full' ? 'Crédito Completo' : 'Medio Crédito')}"`,
        `"${((prov?.commercialName || prov?.legalName) || '').replace(/"/g, '""')}"`,
        `"${en.startDate || en.activationDate || ''}"`,
        `"${en.endDate || ''}"`,
        `"${item.status}"`,
        `"${item.salePriceUSD.toFixed(2)}"`,
        `"${item.salePriceMXN.toFixed(2)}"`,
        `"${item.scholarshipDiscountUSD.toFixed(2)}"`,
        `"${item.costUSD.toFixed(2)}"`,
        `"${item.gradeOutcome}"`,
        `"${(item.finalGrade || '').replace(/"/g, '""')}"`,
        `"${item.gradeDate || ''}"`
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanInstName = institution.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `Reporte_Alumnos_Clases_Precios_PassFail_${cleanInstName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintStudentsReport = () => {
    if (!institution) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes (pop-ups) para generar la vista de impresión.');
      return;
    }

    const title = `Reporte de Alumnos, Materias, Precios y Acreditación (Pass/Fail) - ${institution.name}`;
    const reportDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const rowsHtml = filteredStudentEnrollments.map((item, idx) => {
      const s = item.student;
      const cls = item.cls;
      const en = item.enrollment;
      const prov = item.provider;
      const outcome = item.gradeOutcome;

      let outcomeBadge = '';
      if (outcome === 'Pass') {
        outcomeBadge = '<span style="background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:2px 8px;border-radius:9999px;font-weight:700;font-size:10px;">PASS / APROBADO</span>';
      } else if (outcome === 'Fail') {
        outcomeBadge = '<span style="background-color:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:2px 8px;border-radius:9999px;font-weight:700;font-size:10px;">FAIL / REPROBADO</span>';
      } else {
        outcomeBadge = '<span style="background-color:#fffbeb;color:#b45309;border:1px solid #fde68a;padding:2px 8px;border-radius:9999px;font-weight:700;font-size:10px;">PENDIENTE</span>';
      }

      const creditBadge = item.creditTypeCategory === 'Full' 
        ? '<span style="background-color:#ecfdf5;color:#065f46;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">Full Credit</span>'
        : '<span style="background-color:#fffbeb;color:#92400e;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">Half Credit</span>';

      return `
        <tr style="border-bottom:1px solid #f1f5f9;font-size:11px;">
          <td style="padding:8px;font-weight:600;color:#334155;">${idx + 1}</td>
          <td style="padding:8px;">
            <div style="font-weight:700;color:#0f172a;">${s.name || ''} ${s.lastName || ''}</div>
            <div style="font-size:9px;color:#64748b;">${s.email || 'Sin email'} ${s.curp ? `&bull; CURP: ${s.curp}` : ''}</div>
          </td>
          <td style="padding:8px;">
            <div style="font-weight:600;color:#1e293b;">${cls.name}</div>
            <div style="margin-top:2px;">${creditBadge} ${prov ? `<span style="font-size:9px;color:#7c3aed;margin-left:4px;">&bull; ${prov.commercialName || prov.legalName}</span>` : ''}</div>
          </td>
          <td style="padding:8px;color:#475569;font-family:monospace;font-size:10px;white-space:nowrap;">
            ${en.startDate || en.activationDate || 'N/A'} - ${en.endDate || 'N/A'}
          </td>
          <td style="padding:8px;text-align:right;font-weight:700;color:#0f172a;white-space:nowrap;">
            $${item.salePriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            <div style="font-size:9px;color:#64748b;font-weight:normal;">~$${item.salePriceMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
          </td>
          <td style="padding:8px;text-align:center;white-space:nowrap;">
            ${outcomeBadge}
          </td>
          <td style="padding:8px;text-align:center;font-weight:700;color:#1e293b;">
            ${item.finalGrade ? `<span style="font-size:12px;font-family:monospace;color:#4338ca;">${item.finalGrade}</span>` : '<span style="color:#94a3b8;font-size:10px;">-</span>'}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body { padding: 10mm; background-color: #fff !important; }
              .no-print { display: none !important; }
              @page { size: landscape; margin: 10mm; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .kpi-label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
            .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; }
            .kpi-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background-color: #f1f5f9; padding: 8px 10px; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; }
            .signatures { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 20px; }
            .sig-line { width: 220px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 10px; font-weight: 700; color: #475569; }
            .btn-print { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <span style="font-size:10px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:1px;">Reporte Institucional Académico & Financiero</span>
                <h1 style="margin:4px 0 0 0;font-size:20px;font-weight:800;color:#0f172a;">${institution.name}</h1>
                <p style="margin:2px 0 0 0;font-size:11px;color:#64748b;">${institution.tradeName ? `${institution.tradeName} &bull; ` : ''}${institution.country || 'México'}${institution.colombiaCalendar ? ` (${institution.colombiaCalendar})` : ''} ${institution.institutionCode ? `&bull; Código: ${institution.institutionCode}` : ''}</p>
              </div>
              <div style="text-align:right;">
                <button class="btn-print no-print" onclick="window.print()">Imprimir / Guardar PDF</button>
                <div style="font-size:10px;color:#64748b;margin-top:8px;"><strong>Fecha:</strong> ${reportDate}</div>
                <div style="font-size:10px;color:#64748b;"><strong>Emisor:</strong> ${currentUser?.name || 'Administración'}</div>
              </div>
            </div>

            <div class="kpis">
              <div class="kpi-card">
                <div class="kpi-label">Total Alumnos</div>
                <div class="kpi-value">${studentReportStats.totalStudents}</div>
                <div class="kpi-sub">Alumnos vinculados</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Materias Inscritas</div>
                <div class="kpi-value">${studentReportStats.totalEnrollments}</div>
                <div class="kpi-sub">${studentReportStats.totalFullCredits} Full &bull; ${studentReportStats.totalHalfCredits} Half</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total Facturación</div>
                <div class="kpi-value" style="color:#059669;">$${studentReportStats.totalSaleUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size:11px;">USD</span></div>
                <div class="kpi-sub">~$${studentReportStats.totalSaleMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
              </div>
              <div class="kpi-card" style="background:#ecfdf5;border-color:#a7f3d0;">
                <div class="kpi-label" style="color:#065f46;">Aprobados (Pass)</div>
                <div class="kpi-value" style="color:#047857;">${studentReportStats.passCount} <span style="font-size:12px;font-weight:600;">(${studentReportStats.passRate.toFixed(1)}%)</span></div>
                <div class="kpi-sub" style="color:#047857;">Tasa de Aprobación</div>
              </div>
              <div class="kpi-card" style="background:#fff1f2;border-color:#fecdd3;">
                <div class="kpi-label" style="color:#9f1239;">Reprobados (Fail)</div>
                <div class="kpi-value" style="color:#be123c;">${studentReportStats.failCount} <span style="font-size:12px;font-weight:600;">(${studentReportStats.failRate.toFixed(1)}%)</span></div>
                <div class="kpi-sub" style="color:#be123c;">${studentReportStats.pendingCount} pendientes</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:30px;">#</th>
                  <th>Alumno</th>
                  <th>Materia & Crédito</th>
                  <th>Periodo</th>
                  <th style="text-align:right;">Precio</th>
                  <th style="text-align:center;">Pass / Fail</th>
                  <th style="text-align:center;">Nota</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:800;border-top:2px solid #cbd5e1;font-size:11px;">
                  <td colspan="4" style="padding:10px 8px;text-align:right;color:#334155;">TOTALES DEL REPORTE:</td>
                  <td style="padding:10px 8px;text-align:right;color:#0f172a;font-size:12px;">$${filteredStudentEnrollments.reduce((acc, curr) => acc + curr.salePriceUSD, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</td>
                  <td style="padding:10px 8px;text-align:center;color:#047857;">${filteredStudentEnrollments.filter(e => e.gradeOutcome === 'Pass').length} Pass / ${filteredStudentEnrollments.filter(e => e.gradeOutcome === 'Fail').length} Fail</td>
                  <td style="padding:10px 8px;text-align:center;color:#64748b;">${filteredStudentEnrollments.length} regs</td>
                </tr>
              </tfoot>
            </table>

            <div class="signatures">
              <div class="sig-line">
                Dirección Académica<br>
                <span style="font-size:9px;color:#94a3b8;font-weight:normal;">Coordinación Institucional</span>
              </div>
              <div class="sig-line">
                Administración & Finanzas<br>
                <span style="font-size:9px;color:#94a3b8;font-weight:normal;">Control Escolar & Facturación</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenGradeModal = (item: any) => {
    setSelectedEnrollmentForGrade(item);
    setGradeModalForm({
      gradeOutcome: item.gradeOutcome || 'Pass',
      finalGrade: item.finalGrade || '',
      gradeDate: item.gradeDate || new Date().toISOString().split('T')[0],
      gradeNotes: item.enrollment?.gradeNotes || ''
    });
    setIsGradeModalOpen(true);
  };

  const handleSaveGradeOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentForGrade) return;

    updateEnrollment(selectedEnrollmentForGrade.enrollment.id, {
      gradeOutcome: gradeModalForm.gradeOutcome,
      finalGrade: gradeModalForm.finalGrade || undefined,
      gradeDate: gradeModalForm.gradeDate || undefined,
      gradeNotes: gradeModalForm.gradeNotes || undefined
    });

    if (institution) {
      addActivity({
        institutionId: institution.id,
        date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        description: `Académico: Se registró calificación (${gradeModalForm.gradeOutcome}${gradeModalForm.finalGrade ? ` - Nota: ${gradeModalForm.finalGrade}` : ''}) para alumno ${selectedEnrollmentForGrade.student.name} ${selectedEnrollmentForGrade.student.lastName || ''} en materia ${selectedEnrollmentForGrade.cls.name}.`,
      });
    }

    setIsGradeModalOpen(false);
    setSelectedEnrollmentForGrade(null);
  };

  const handleQuickSetOutcome = (enrollmentId: number, outcome: CourseGradeOutcome) => {
    updateEnrollment(enrollmentId, {
      gradeOutcome: outcome,
      gradeDate: outcome !== 'Pendiente' ? new Date().toISOString().split('T')[0] : undefined
    });

    if (institution) {
      addActivity({
        institutionId: institution.id,
        date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        description: `Académico: Se actualizó estatus de acreditación a "${outcome}" en inscripción ID #${enrollmentId}.`,
      });
    }
  };

  const resolvedStatus = (institution?.status === 'Archivada' || institution?.status === 'Archivado')
    ? institution?.status
    : (totalPorRecaudar > 0 ? 'Pendiente' : 'Al corriente');

  const slaInfo = getInstitutionSLA(institution);

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (institution) {
      updateInstitution(institution.id, {
        name: generalForm.name,
        tradeName: generalForm.tradeName || undefined,
        institutionCode: generalForm.institutionCode || undefined,
        country: generalForm.country,
        colombiaCalendar: isColombia(generalForm.country) ? (generalForm.colombiaCalendar as any || undefined) : undefined,
        contact: generalForm.contact,
        contactPhone: generalForm.contactPhone || undefined,
        institutionTypeId: generalForm.institutionTypeId || undefined,
        status: generalForm.status,
        membershipId: generalForm.membershipId,
        membershipExpiration: generalForm.membershipExpiration,
        agentId: generalForm.agentId ? Number(generalForm.agentId) : undefined,
        modality: generalForm.modality,
        payWithIva: generalForm.payWithIva,
        isCorporativo: generalForm.isCorporativo,
        active: generalForm.active,
        paymentMethod: generalForm.paymentMethod,
        paymentAccount: generalForm.paymentAccount,
        membershipPaymentMethod: generalForm.membershipPaymentMethod || undefined,
        membershipPaymentAccount: generalForm.membershipPaymentAccount || undefined,
        membershipPaymentCount: generalForm.membershipPaymentCount ? Number(generalForm.membershipPaymentCount) : undefined,
        membershipPaymentStartDate: generalForm.membershipPaymentStartDate || undefined,
        coursePaymentMethod: generalForm.coursePaymentMethod || undefined,
        coursePaymentAccount: generalForm.coursePaymentAccount || undefined,
        coursePaymentCount: generalForm.coursePaymentCount ? Number(generalForm.coursePaymentCount) : undefined,
        coursePaymentStartDate: generalForm.coursePaymentStartDate || undefined,
        priceObservations: generalForm.priceObservations,
        address: generalForm.address,
        city: generalForm.city,
        state: generalForm.state,
        zipCode: generalForm.zipCode,
        phone: generalForm.phone,
        email: generalForm.email,
        contactEmail: generalForm.contactEmail,
        contactPosition: generalForm.contactPosition,
        tarifasId: generalForm.tarifasId,
        mainProviderId: generalForm.mainProviderId ? Number(generalForm.mainProviderId) : undefined
      });
      setIsEditGeneralOpen(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContact({ ...contactForm, institutionId: institution.id });
    setIsContactModalOpen(false);
    setContactForm({ name: '', lastName: '', position: '', area: '', email: '', phone: '', systemAccess: false });
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({ 
      ...taskForm, 
      institutionId: institution.id, 
      status: 'Pendiente',
      userId: taskForm.userId ? Number(taskForm.userId) : undefined
    });
    setIsTaskModalOpen(false);
    setTaskForm({ title: '', dueDate: '', userId: '', type: 'Llamada' });
  };

  const toggleTaskStatus = (taskId: number, currentStatus: "Pendiente" | "Completada") => {
    const taskObj = tasks.find(t => t.id === taskId);
    if (!taskObj) return;

    const isSuperAdmin = currentUser?.role === 'Superadministrador' || currentUser?.role === 'Admin Principal';
    const isAssigned = taskObj.userId !== undefined && taskObj.userId !== null && Number(taskObj.userId) === Number(currentUser?.id);

    if (!isSuperAdmin && !isAssigned) {
      alert("Solo el usuario asignado a esta tarea o el super administrador pueden cambiar su estado de finalización.");
      return;
    }

    updateTask(taskId, { status: currentStatus === "Pendiente" ? "Completada" : "Pendiente" });
  };

  React.useEffect(() => {
    if (activeTab === "Finanzas" && !canViewFinancialsData) {
      setActiveTab("Información General");
    }
  }, [activeTab, canViewFinancialsData]);

  const mainTabs = [
    { name: "Flujo de Trabajo", icon: Briefcase },
    { name: "Información General", icon: Building2 },
    { name: "Contactos", icon: Users },
    { name: "Listado Alumnos", icon: GraduationCap },
    ...(canViewFinancialsData ? [{ name: "Finanzas", icon: DollarSign }] : []),
    { name: "Documentos", icon: FileText },
    { name: "Bitácora", icon: Globe },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Back Header */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/instituciones')}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1">
              {institution.tradeName ? `${institution.tradeName} (${institution.name})` : institution.name}
            </h2>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {institution.country}</span>
              {isColombia(institution.country) && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[8px] font-extrabold uppercase tracking-wider shadow-2xs">
                    🇨🇴 {institution.colombiaCalendar || 'Sin Calendario'}
                  </span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className={`px-2 py-0.5 rounded border ${
                resolvedStatus === 'Al corriente' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
              } uppercase tracking-widest text-[8px] font-bold`}>
                {resolvedStatus}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className={`px-2 py-0.5 rounded border ${
                institution.active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
              } uppercase tracking-widest text-[8px] font-bold`}>
                {institution.active !== false ? 'Activa' : 'Inactiva'}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span 
                className={`px-2 py-0.5 rounded-full border ${slaInfo.badgeBgClass} ${slaInfo.badgeTextClass} ${slaInfo.badgeBorderClass} text-[8px] font-bold flex items-center gap-1.5 shadow-2xs`}
                title={`Alerta SLA: ${slaInfo.label} | Fase: ${slaInfo.indicatorName}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${slaInfo.dotColorClass} animate-pulse`} />
                <span>SLA ({slaInfo.indicatorName}): {slaInfo.label}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentUser?.role !== 'Coordinador' && hasPermission(currentUser?.role, "Instituciones", "delete") && (
            <button 
              onClick={() => setIsActionModalOpen(true)}
              className="px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/20 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 hover:text-rose-700 transition shadow-sm flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar / Archivar
            </button>
          )}
          {hasPermission(currentUser?.role, "Instituciones", "edit") && (
            <button 
              onClick={openEditModal}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm"
            >
              Editar Perfil
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => navigate(`/instituciones/notificaciones?institutionId=${institution.id}`)}
              className="px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50/50 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 hover:text-indigo-900 transition shadow-xs flex items-center gap-1.5"
              title="Redactar notificación oficial a esta institución"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Notificar</span>
            </button>
            <button 
              onClick={() => {
                setFinancialReportInitialType('institucion');
                setIsFinancialReportModalOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm cursor-pointer border-0 inline-flex items-center gap-1.5"
              title="Estado de Cuenta Oficial para la Institución"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Reporte Institución</span>
            </button>

            {isUserAdminOrSuperAdmin && (
              <button 
                onClick={() => {
                  setFinancialReportInitialType('interno');
                  setIsFinancialReportModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-100 transition shadow-sm cursor-pointer inline-flex items-center gap-1"
                title="Reporte Financiero y Rentabilidad (Uso Interno)"
              >
                <span>Reporte Interno</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          
          {/* Main Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                label: 'Alumnos Totales',
                value: <span className="text-sm font-bold text-slate-900 tracking-tight">{instStudents.length.toLocaleString()}</span>,
                icon: GraduationCap,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50'
              },
              {
                label: 'Materias Activas',
                value: (
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-blue-700 tracking-tight">
                      {numActiveEnrollments.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-semibold leading-none">
                      <span className="text-emerald-700 font-bold" title="Materias con Crédito Completo">{numActiveFullCredits} Full</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-700 font-bold" title="Materias con Medio Crédito">{numActiveHalfCredits} Half</span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 leading-none">
                      {numActiveClasses} {numActiveClasses === 1 ? 'distinta' : 'distintas'}
                    </p>
                  </div>
                ),
                icon: BookOpen,
                color: 'text-blue-600',
                bg: 'bg-blue-50'
              },
              ...(canViewFinancialsData ? [
                {
                  label: 'Ingresos Totales',
                  value: (
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 tracking-tight">
                        ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[9px] text-slate-500 font-semibold uppercase font-sans">USD</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 leading-none">
                        ~${totalPagadoMXN.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[8px] text-slate-400 font-sans font-bold uppercase">MXN</span>
                      </p>
                    </div>
                  ),
                  icon: DollarSign,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50'
                },
                {
                  label: 'Pendiente',
                  value: (
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-extrabold text-amber-650 tracking-tight">
                        ${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[9px] text-amber-600/80 font-semibold uppercase font-sans">USD</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 leading-none">
                        ~${totalPorRecaudarMXN.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span className="text-[8px] text-slate-400 font-sans font-bold uppercase">MXN</span>
                      </p>
                    </div>
                  ),
                  icon: Clock,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50'
                }
              ] : [
                {
                  label: 'Modalidad Académica',
                  value: (
                    <p className="text-xs font-bold text-slate-800 tracking-tight truncate">
                      {institution.modality || 'Dual Diploma'}
                    </p>
                  ),
                  icon: GraduationCap,
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50'
                },
                {
                  label: 'Membresía / Nivel',
                  value: (
                    <p className="text-xs font-bold text-indigo-700 tracking-tight truncate">
                      {catalogs['Membresías']?.find(m => m.id === institution.membershipId)?.name || institution.membershipId || 'Convenio Estándar'}
                    </p>
                  ),
                  icon: Award,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50'
                }
              ]),
              {
                label: 'Expira',
                value: <span className="text-sm font-bold text-slate-900 tracking-tight">{institution.membershipExpiration ? new Date(institution.membershipExpiration).toLocaleDateString() : 'N/A'}</span>,
                icon: Calendar,
                color: 'text-rose-600',
                bg: 'bg-rose-50'
              },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                <div className={`w-8 h-8 ${kpi.bg} ${kpi.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{kpi.label}</p>
                  <div className="mt-0.5">{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-56 space-y-1.5 shrink-0">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[11px] font-bold transition-all ${
                      isSelected
                        ? "bg-[#0a0a0a] text-white shadow-xl"
                        : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panel */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6 h-full overflow-auto"
            >
              {activeTab === "Flujo de Trabajo" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-slate-800">Tareas y Seguimiento</h3>
                    <button 
                      onClick={() => setIsTaskModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition"
                    >
                      + Nueva Tarea
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instTasks.map(task => (
                      <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${task.status === 'Completada' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {task.status === 'Completada' ? <Clock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${task.status === 'Completada' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Vence: {new Date(task.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleTaskStatus(task.id, task.status as any)}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                            task.status === 'Completada' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {task.status === 'Completada' ? 'Reabrir' : 'Completar'}
                        </button>
                      </div>
                    ))}
                    {instTasks.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-medium">No hay tareas pendientes.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "Información General" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Segmented Sub-tabs */}
                  <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl max-w-2xl mb-4 overflow-x-auto">
                    {[
                      { id: 'generales', label: 'Datos Generales' },
                      { id: 'membresia', label: 'Membresía' },
                      { id: 'precios', label: 'Tarifas & Precios' },
                      ...((institution.isCorporativo || institution.institutionTypeId === '4') ? [{ id: 'campus', label: 'Campus' }] : []),
                      { id: 'documentos', label: 'Documentos' }
                    ].map((sub) => {
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setInfoSubTab(sub.id as any)}
                          className={`flex-1 min-w-[90px] py-1.5 text-center text-xs font-bold rounded-lg transition-all relative ${
                            infoSubTab === sub.id
                              ? "bg-[#0f172a] text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {infoSubTab === 'generales' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Estructura y Datos Generales</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Ubicación, modalidad, tarifas y agente gestor asignado.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Nombre Institución</p>
                          <p className="text-sm font-bold text-slate-900">{institution.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Nombre Comercial</p>
                          <p className="text-sm font-bold text-indigo-700">{institution.tradeName || <span className="text-slate-400 italic">No registrado</span>}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Código Institución</p>
                          <p className="text-sm font-bold text-emerald-700">{institution.institutionCode || <span className="text-slate-400 italic">No especificado</span>}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Tipo de Institución</p>
                          <p className="text-sm font-bold text-slate-800">
                            {catalogs['Tipos de Institución']?.find(ti => ti.id === institution.institutionTypeId)?.name || (
                              <span className="text-slate-400 italic">No registrado</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">País</p>
                          <p className="text-sm font-bold text-slate-700">{institution.country || <span className="text-slate-400 italic">No especificado</span>}</p>
                        </div>
                        {isColombia(institution.country) && (
                          <div>
                            <p className="text-[10px] text-amber-800 uppercase font-black tracking-widest mb-1.5">Calendario Escolar</p>
                            {institution.colombiaCalendar ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                  🇨🇴 {institution.colombiaCalendar}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {institution.colombiaCalendar === 'Calendario A' ? '(Ene/Feb - Nov)' : '(Ago/Sep - Jun)'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic">
                                Sin especificar (Calendario A / B)
                              </span>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Modalidad</p>
                          <p className="text-sm font-bold text-slate-700">{institution.modality || <span className="text-slate-400 italic font-medium">No especificada</span>}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Tarifas (Tarifas Países)</p>
                          <p className="text-sm font-bold text-slate-700">
                            {catalogs['Tarifas Países']?.find(tp => tp.id === institution.tarifasId)?.name || (
                              <span className="text-slate-450 italic font-semibold">Sin Tarifa Asignada</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Agente / Gestor Responsable</p>
                          <p className="text-sm font-bold text-[#4f46e5]">
                            {users.find(u => u.id === institution.agentId)?.name || (
                              <span className="text-slate-400 italic font-semibold">Sin Agente Asignado</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Proveedor Principal</p>
                          <p className="text-sm font-bold text-slate-800">
                            {providers.find(p => p.id === institution.mainProviderId)?.commercialName || (
                              providers.find(p => p.id === institution.mainProviderId)?.legalName
                            ) || (
                              <span className="text-slate-400 italic">No asignado</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Alumnos Inscritos</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{instStudents.length} {instStudents.length === 1 ? 'alumno' : 'alumnos'}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Materias Activas</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-blue-700">{numActiveEnrollments} {numActiveEnrollments === 1 ? 'materia activa' : 'materias activas'}</span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/80">
                              {numActiveFullCredits} Full Credit
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/80">
                              {numActiveHalfCredits} Half Credit
                            </span>
                            {numActiveClasses > 0 && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/80">
                                {numActiveClasses} {numActiveClasses === 1 ? 'distinta' : 'distintas'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Estatus Sistema</p>
                          <div>
                            <span className={`inline-flex text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                              resolvedStatus === 'Al corriente' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {resolvedStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dirección Física</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-3">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Dirección</p>
                            <p className="text-sm font-semibold text-slate-800">{institution.address || <span className="text-slate-350 italic">No registrada</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Ciudad</p>
                            <p className="text-sm font-semibold text-slate-800">{institution.city || <span className="text-slate-350 italic">No registrada</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Estado / Provincia</p>
                            <p className="text-sm font-semibold text-slate-800">{institution.state || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Código Postal</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{institution.zipCode || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Datos de Comunicación</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Teléfono Institucional</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{institution.phone || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Correo Electrónico General</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{institution.email || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contacto Principal</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Nombre Contacto</p>
                            <p className="text-sm font-bold text-slate-900">{institution.contact}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Puesto del Contacto Principal</p>
                            <p className="text-sm font-semibold text-slate-800">{institution.contactPosition || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Correo Contacto Principal</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{institution.contactEmail || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Teléfono Contacto Principal</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono">{institution.contactPhone || <span className="text-slate-350 italic">No registrado</span>}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {infoSubTab === 'membresia' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Membresía y Suscripción</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Control de planes anuales, costo y fecha de renovación.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Membresía Activa</p>
                          <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-150">
                            {catalogs['Membresías']?.find(m => m.id === institution.membershipId)?.name || 'Sin Asignar'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Membresía (Costo)</p>
                          <p className="text-sm font-extrabold text-slate-805 text-slate-800">{institution.membershipPrice || <span className="text-slate-400 italic font-medium">No registrado</span>}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Expiración de Membresía</p>
                          <div className="flex items-center space-x-2 text-xs text-slate-700 font-semibold bg-slate-50 border border-slate-150 rounded-xl px-4 py-3">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>
                              {institution.membershipExpiration ? new Date(institution.membershipExpiration).toLocaleDateString() : <span className="text-slate-400 italic font-medium">No registrada</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {infoSubTab === 'precios' && (() => {
                    const resolvedPrices = resolveCreditPrices(institution.tarifasId, catalogs, institution.mainProviderId, providerProductServices);
                    const resolvedMembCost = resolveMembershipPrice(institution.membershipId, catalogs);

                    return (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Estructura Tarifaria y Cobros (Dinámicos)</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">Precios determinados de forma automática según Membresía y Tarifas País asignada.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Costo de Membresía</p>
                            <p className="text-sm font-extrabold text-slate-800">{resolvedMembCost}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Precio Crédito Completo</p>
                            <p className="text-sm font-bold text-slate-800">{resolvedPrices.priceFullCredit}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Precio Medio Crédito</p>
                            <p className="text-sm font-bold text-slate-800">{resolvedPrices.priceHalfCredit}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Precio Crédito AP</p>
                            <p className="text-sm font-bold text-slate-800">{resolvedPrices.priceFullApCredit}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Precio Medio Crédito AP</p>
                            <p className="text-sm font-bold text-slate-800">{resolvedPrices.priceHalfApCredit}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Pago con IVA</p>
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${
                              institution.payWithIva 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {institution.payWithIva ? 'SÍ (CON IVA)' : 'NO (SIN IVA)'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Método de Pago</p>
                            <p className="text-sm font-bold text-slate-800">{institution.paymentMethod || <span className="text-slate-400 italic font-medium">No registrado</span>}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Cuenta Pago</p>
                            <p className="text-sm font-bold text-slate-800">{institution.paymentAccount || <span className="text-slate-400 italic font-medium">No registrado</span>}</p>
                          </div>

                          {/* Nueva sección: Forma de Pago */}
                          <div className="sm:col-span-2 md:col-span-3 border-t border-slate-100 pt-5 mt-2 space-y-4 font-sans">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Forma de Pago Detallada</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-2xl border border-slate-150">
                              {/* Membresía */}
                              <div className="space-y-3.5">
                                <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wider pl-1.5 border-l-2 border-indigo-500">Forma de Pago Membresía</p>
                                <div className="space-y-2.5 text-xs">
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Forma de pago:</span>
                                    <span className="font-semibold text-slate-800 font-sans">{institution.membershipPaymentMethod || <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Cuenta de cobro:</span>
                                    <span className="font-semibold text-slate-800 font-sans">{institution.membershipPaymentAccount || <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Número de pagos:</span>
                                    <span className="font-bold text-slate-800 font-mono">{institution.membershipPaymentCount || <span className="text-slate-400 italic font-medium font-sans">No registrado</span>}</span>
                                  </div>
                                  <div className="flex justify-between pb-0.5">
                                    <span className="text-slate-500 font-medium font-sans">Fecha de inicio:</span>
                                    <span className="font-bold text-slate-800 font-mono">
                                      {institution.membershipPaymentStartDate ? new Date(institution.membershipPaymentStartDate + "T00:00:00").toLocaleDateString() : <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Cursos */}
                              <div className="space-y-3.5">
                                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider pl-1.5 border-l-2 border-amber-500">Forma de Pago Cursos</p>
                                <div className="space-y-2.5 text-xs">
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Forma de pago:</span>
                                    <span className="font-semibold text-slate-800 font-sans">{institution.coursePaymentMethod || <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Cuenta de cobro:</span>
                                    <span className="font-semibold text-slate-800 font-sans">{institution.coursePaymentAccount || <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500 font-medium font-sans">Número de pagos:</span>
                                    <span className="font-bold text-slate-800 font-mono">{institution.coursePaymentCount || <span className="text-slate-400 italic font-medium font-sans">No registrado</span>}</span>
                                  </div>
                                  <div className="flex justify-between pb-0.5">
                                    <span className="text-slate-500 font-medium font-sans">Fecha de inicio:</span>
                                    <span className="font-bold text-slate-800 font-mono">
                                      {institution.coursePaymentStartDate ? new Date(institution.coursePaymentStartDate + "T00:00:00").toLocaleDateString() : <span className="text-slate-400 italic font-medium font-sans">No registrada</span>}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="sm:col-span-2 md:col-span-3">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Observaciones Comerciales</p>
                            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed font-sans">
                              {institution.priceObservations || <span className="text-slate-400 italic font-medium">Sin observaciones registradas</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {infoSubTab === 'campus' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Campus Asociados de la Institución</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Sedes, planteles, campus o sucursales vinculadas.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setDetailCampusForm({ name: '', cityCountry: '', contact: '', phone: '' });
                            setIsDetailCampusModalOpen(true);
                          }}
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase hover:bg-indigo-100 transition flex items-center cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Añadir Campus
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden animate-in fade-in">
                        <table className="w-full text-left font-sans">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Nombre del Campus</th>
                              <th className="px-4 py-3 border-b border-slate-200">Ciudad / País</th>
                              <th className="px-4 py-3 border-b border-slate-200">Contacto Principal</th>
                              <th className="px-4 py-3 border-b border-slate-200 font-mono">Teléfono</th>
                              <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {(!institution.campusList || institution.campusList.length === 0) ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay campus secundarios registrados aún. Haz clic en "+ Añadir Campus".</td>
                              </tr>
                            ) : (
                              institution.campusList.map((camp) => (
                                <tr key={camp.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-semibold text-slate-805 text-slate-800">{camp.name}</td>
                                  <td className="px-4 py-3 text-slate-700">{camp.cityCountry}</td>
                                  <td className="px-4 py-3 text-slate-650">{camp.contact}</td>
                                  <td className="px-4 py-3 font-mono text-slate-500">{camp.phone}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button 
                                      onClick={() => {
                                        const fresh = (institution.campusList || []).filter(c => c.id !== camp.id);
                                        updateInstitution(institution.id, { campusList: fresh });
                                      }}
                                      className="text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {infoSubTab === 'documentos' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200 font-sans">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Repositorio de Documentos</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Gestor de convenios, acuerdos de confidencialidad y actas constitutivas.</p>
                        </div>
                        <button 
                          onClick={() => handleOpenUploadDocModal()}
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase hover:bg-indigo-100 transition flex items-center cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Subir Documento
                        </button>
                      </div>

                      {/* Hidden File Input */}
                      <input 
                        type="file" 
                        accept=".pdf"
                        ref={fileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleOpenUploadDocModal(file);
                          }
                        }} 
                        className="hidden" 
                      />

                      {/* Clickable Drag & Drop Zone */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault();
                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            const droppedFile = files[0];
                            handleOpenUploadDocModal(droppedFile);
                          }
                        }}
                        className="border-2 border-dashed border-slate-150 rounded-xl p-6 text-center flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer group"
                      >
                         <svg className="w-5 h-5 text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                         </svg>
                         <p className="text-xs font-semibold text-slate-700">Arrastra archivos PDF aquí o haz clic para buscar</p>
                         <p className="text-[10px] text-slate-400 mt-0.5">Soporta formato PDF oficial con categorización y vigencia</p>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                        <table className="w-full text-left font-sans">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Nombre del Documento</th>
                              <th className="px-4 py-3 border-b border-slate-200">Categoría</th>
                              <th className="px-4 py-3 border-b border-slate-200">Vencimiento</th>
                              <th className="px-4 py-3 border-b border-slate-200">Archivo Adjunto</th>
                              <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                              <th className="px-4 py-3 border-b border-slate-200">Fecha de Carga</th>
                              <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                            {(!institution.documentsList || institution.documentsList.length === 0) ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay documentos cargados en el expediente de esta institución.</td>
                              </tr>
                            ) : (
                              institution.documentsList.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-semibold text-slate-800">
                                    <div className="flex items-center">
                                      <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                                      {doc.name}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {getDocCategoryBadge(doc.category)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {getDocExpirationBadge(doc)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 italic max-w-[140px] truncate">
                                    {doc.fileName || 'Carga Directa'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 font-mono">{doc.fileSize}</td>
                                  <td className="px-4 py-3 text-slate-500 font-mono">{doc.uploadDate}</td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end items-center space-x-1.5">
                                      <button 
                                        onClick={() => setViewingDoc(doc)}
                                        className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded transition"
                                        title="Ver Documento"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setEditingDoc(doc);
                                          setEditingDocName(doc.name);
                                          setEditingDocDate(doc.uploadDate || new Date().toISOString().split('T')[0]);
                                          setEditingDocCategory(doc.category || 'Legal');
                                          setEditingDocHasExpiration(!!doc.hasExpiration);
                                          setEditingDocExpirationDate(doc.expirationDate || '');
                                          setIsEditDocModalOpen(true);
                                        }}
                                        className="text-slate-500 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded transition"
                                        title="Editar Documento"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          let dataUrl = doc.fileData;
                                          if (!dataUrl) {
                                            const content = 'Contenido del documento: ' + doc.name + '\nCargado el: ' + doc.uploadDate;
                                            const blob = new Blob([content], { type: 'text/plain' });
                                            dataUrl = URL.createObjectURL(blob);
                                          }
                                          link.href = dataUrl;
                                          link.download = doc.fileName || doc.name + '.txt';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="text-slate-500 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded transition"
                                        title="Descargar"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setDeleteConfirm({
                                            title: "Eliminar Documento",
                                            message: `¿Estás seguro de que deseas eliminar permanentemente el archivo "${doc.fileName || doc.name}"? Esta acción borrará el registro oficial de forma irreversible y purgará el archivo físico del almacenamiento digital.`,
                                            onConfirm: () => {
                                              if (doc.fileData && doc.fileData.startsWith('blob:')) {
                                                try {
                                                  URL.revokeObjectURL(doc.fileData);
                                                } catch (e) {
                                                  console.error("Error revoking Object URL:", e);
                                                }
                                              }
                                              const fresh = (institution.documentsList || []).filter(d => d.id !== doc.id);
                                              updateInstitution(institution.id, { documentsList: fresh });
                                              console.log(`Documento institucional ID ${doc.id} purgado con éxito de la base de almacenamiento.`);
                                            }
                                          });
                                        }}
                                        className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                                        title="Borrar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
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
                  )}
                </div>
              )}
              {activeTab === "Finanzas" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Margen Highlight Section */}
                  {isUserAdminOrSuperAdmin ? (
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-slate-300 uppercase font-bold tracking-widest mb-1">Margen Institucional (Proyectado)</p>
                          <p className="text-3xl font-black text-emerald-400">
                            ${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-xs font-semibold text-emerald-200/80">(Sin IVA)</span>
                            <span className="text-sm font-semibold text-emerald-200/95 block md:inline md:ml-3">
                              (~ ${margenProyectadoMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-xs font-medium text-emerald-300">(Con IVA)</span>)
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                            <p className="text-[9px] text-slate-300 uppercase font-semibold tracking-wider">Porcentaje de Margen</p>
                            <p className="text-xl font-extrabold text-white text-right">{margenPorcentaje.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                      {/* Progress indicator */}
                      <div className="mt-4">
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, Math.max(0, margenPorcentaje))}%` }}
                          ></div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] text-slate-400 mt-2 gap-1 font-medium font-mono">
                          <span>Costo: ${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (Sin IVA) (~ ${totalCostMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN (Con IVA))</span>
                          <span>Ingresos: ${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (Sin IVA) (~ ${totalIngresosProyectadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN (Con IVA))</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-slate-300 uppercase font-bold tracking-widest mb-1">Total de Ingresos Proyectado</p>
                          <p className="text-3xl font-black text-emerald-400">
                            ${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-xs font-semibold text-emerald-200/80">(Sin IVA)</span>
                            <span className="text-sm font-semibold text-emerald-200/95 block md:inline md:ml-3">
                              (~ ${totalIngresosProyectadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-xs font-medium text-emerald-300">(Con IVA)</span>)
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={isUserAdminOrSuperAdmin ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
                    {/* Sección Ingresos */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Ingresos</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 italic font-mono font-medium">1 USD = 18.5 MXN</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start py-1">
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-500 font-medium block">Total Recaudado (Pagado)</span>
                            <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                              Cursos: ${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD | Membresía: ${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 block">${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">(Sin IVA)</span></span>
                            <span className="text-[10px] text-slate-450 font-mono font-medium block text-emerald-600">~${totalPagadoMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">(Con IVA)</span></span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-start py-1 border-t border-slate-50">
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-505 font-medium block text-amber-700">Total por Recaudar (Por Cobrar)</span>
                            <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                              Cursos: ${coursesPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD | Membresía: ${membPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-600 block">${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tight">(Sin IVA)</span></span>
                            <span className="text-[10px] text-slate-450 font-mono font-medium block text-amber-600">~${totalPorRecaudarMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-[9px] font-bold text-amber-650 uppercase tracking-tight">(Con IVA)</span></span>
                          </div>
                        </div>

                        <div className="flex justify-between items-start py-2 border-t border-slate-100 font-bold bg-emerald-50/40 px-3 rounded-lg mt-1">
                          <div className="space-y-0.5">
                            <span className="text-xs text-emerald-800 block">Total de Ingresos Proyectado</span>
                            <span className="text-[9px] text-emerald-650 font-medium block leading-tight">
                              Cursos: ${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD | Membresía (Cargo Único): ${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-emerald-950 block">${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-tight">(Sin IVA)</span></span>
                            <span className="text-[9px] text-emerald-600 font-mono leading-tight block">~${totalIngresosProyectadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-[8px] font-bold text-emerald-605 uppercase tracking-tight">(Con IVA)</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sección Egresos */}
                    {isUserAdminOrSuperAdmin && (
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Egresos</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-slate-500 font-medium">Total por Pagar (Costos de Clases)</span>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-slate-900 block">${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">(Sin IVA)</span></span>
                              <span className="text-[10px] text-slate-500 font-mono block">~${totalCostMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">(Con IVA)</span></span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center py-1 border-t border-slate-50">
                            <span className="text-xs text-slate-500 font-medium">Pagado (Dispersión de Gastos)</span>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-emerald-700 block">${egresosPagadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">(Sin IVA)</span></span>
                              <span className="text-[10px] text-slate-500 font-mono block">~${egresosPagadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">(Con IVA)</span></span>
                            </div>
                          </div>
                          <div className="flex justify-between items-start py-2 border-t border-slate-100 font-bold bg-rose-50/40 px-3 rounded-lg mt-1">
                            <span className="text-xs text-rose-800">Saldo por Pagar (Remanente)</span>
                            <div className="text-right">
                              <span className="text-xs text-rose-900 block">${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-[9px] font-bold text-rose-700 uppercase tracking-tight">(Sin IVA)</span></span>
                              <span className="text-[9px] text-rose-700 font-mono block">~${saldoPorPagarMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN <span className="text-[8px] font-bold text-rose-600 uppercase tracking-tight">(Con IVA)</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {institution.modality !== "Homeschool" && (
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Historial de Pagos de la Institución</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setFinancialReportInitialType('institucion');
                              setIsFinancialReportModalOpen(true);
                            }}
                            className="flex items-center text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer border border-slate-200"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Estado de Cuenta (Reporte)
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCoursePaymentModalOpen(true)}
                            className="flex items-center text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-sm cursor-pointer border-0"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Pago de Cursos
                          </button>
                        </div>
                      </div>

                      {unfilteredHistoricalPayments.length > 0 && (
                        <div className="space-y-4">
                          {/* Concentrated Cards for Payments: Cursos vs Membresía */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setInstPaymentConceptFilter(prev => prev === 'courses' ? 'all' : 'courses')}
                              className={`p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                                instPaymentConceptFilter === 'courses'
                                  ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500 shadow-sm'
                                  : 'bg-slate-50/60 hover:bg-indigo-50/40 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">📚 Pagos por Cursos</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  {instPaymentConcentrationStats.courses.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-base font-black text-slate-900">
                                ${instPaymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-indigo-600">USD</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                ~${instPaymentConcentrationStats.courses.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-indigo-700">
                                <span>{instPaymentConcentrationStats.courses.count} transacciones</span>
                                <span className="text-[9px] uppercase font-semibold text-slate-400">
                                  {instPaymentConceptFilter === 'courses' ? 'Filtro Activo ✓' : 'Clic para filtrar'}
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setInstPaymentConceptFilter(prev => prev === 'membership' ? 'all' : 'membership')}
                              className={`p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                                instPaymentConceptFilter === 'membership'
                                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500 shadow-sm'
                                  : 'bg-slate-50/60 hover:bg-amber-50/40 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">⭐ Pagos Membresía</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  {instPaymentConcentrationStats.membership.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-base font-black text-slate-900">
                                ${instPaymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-amber-600">USD</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                ~${instPaymentConcentrationStats.membership.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-amber-700">
                                <span>{instPaymentConcentrationStats.membership.count} transacciones</span>
                                <span className="text-[9px] uppercase font-semibold text-slate-400">
                                  {instPaymentConceptFilter === 'membership' ? 'Filtro Activo ✓' : 'Clic para filtrar'}
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setInstPaymentConceptFilter('all')}
                              className={`p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                                instPaymentConceptFilter === 'all'
                                  ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500 shadow-sm'
                                  : 'bg-slate-50/60 hover:bg-emerald-50/40 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">💰 Total Cobrado</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  100%
                                </span>
                              </div>
                              <p className="text-base font-black text-slate-900">
                                ${instPaymentConcentrationStats.total.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-600">USD</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                ~${instPaymentConcentrationStats.total.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-emerald-700">
                                <span>{instPaymentConcentrationStats.total.count} transacciones</span>
                                <span className="text-[9px] uppercase font-semibold text-slate-400">
                                  {instPaymentConceptFilter === 'all' ? 'Viendo Todos ✓' : 'Ver Todos'}
                                </span>
                              </div>
                            </button>
                          </div>

                          {/* Filter bar: Concept tabs & Dates */}
                          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInstPaymentConceptFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  instPaymentConceptFilter === 'all'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Todos ({instPaymentConcentrationStats.total.count})
                              </button>
                              <button
                                type="button"
                                onClick={() => setInstPaymentConceptFilter('courses')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  instPaymentConceptFilter === 'courses'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                              >
                                📚 Cursos ({instPaymentConcentrationStats.courses.count})
                              </button>
                              <button
                                type="button"
                                onClick={() => setInstPaymentConceptFilter('membership')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  instPaymentConceptFilter === 'membership'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                ⭐ Membresía ({instPaymentConcentrationStats.membership.count})
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <div className="flex items-center gap-1">
                                <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Desde</span>
                                <input
                                  type="date"
                                  value={payFilterStartDate}
                                  onChange={(e) => setPayFilterStartDate(e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Hasta</span>
                                <input
                                  type="date"
                                  value={payFilterEndDate}
                                  onChange={(e) => setPayFilterEndDate(e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm outline-none"
                                />
                              </div>
                              {(payFilterStartDate || payFilterEndDate) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayFilterStartDate('');
                                    setPayFilterEndDate('');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-all shadow-xs cursor-pointer border-0"
                                >
                                  <X className="w-3 h-3" />
                                  Limpiar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {unfilteredHistoricalPayments.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-medium">
                          No hay registros de pagos para esta institución.
                        </div>
                      ) : displayedInstPayments.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-3">
                          <p>No se encontraron pagos con los filtros seleccionados.</p>
                          <div className="flex items-center justify-center gap-2">
                            {instPaymentConceptFilter !== 'all' && (
                              <button
                                type="button"
                                onClick={() => setInstPaymentConceptFilter('all')}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition border-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                Ver todos los conceptos
                              </button>
                            )}
                            {(payFilterStartDate || payFilterEndDate) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayFilterStartDate('');
                                  setPayFilterEndDate('');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition border-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                Quitar fechas
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-2xl">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest select-none">
                                <th 
                                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => {
                                    if (paySortField === 'date') {
                                      setPaySortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setPaySortField('date');
                                      setPaySortOrder('desc');
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    Fecha
                                    {paySortField === 'date' && (
                                      <span>{paySortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => {
                                    if (paySortField === 'description') {
                                      setPaySortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setPaySortField('description');
                                      setPaySortOrder('asc');
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    Descripción / Concepto
                                    {paySortField === 'description' && (
                                      <span>{paySortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                                <th className="px-4 py-3">Método</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-center">Comprobantes</th>
                                <th 
                                  className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => {
                                    if (paySortField === 'amount') {
                                      setPaySortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setPaySortField('amount');
                                      setPaySortOrder('desc');
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    Monto (USD)
                                    {paySortField === 'amount' && (
                                      <span>{paySortOrder === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {displayedInstPayments.map((p) => (
                                <tr 
                                  key={p.id} 
                                  onClick={() => {
                                    setSelectedDetailPayment(p);
                                    setEditPaymentForm({
                                      date: p.date || '',
                                      description: p.description || '',
                                      amount: (p.originalAmount !== undefined ? p.originalAmount : p.amount)?.toString() || '',
                                      currency: p.originalCurrency || p.currency || 'MXN',
                                      exchangeRate: p.exchangeRate?.toString() || '18.5',
                                      paymentMethod: p.paymentMethod || 'Transferencia',
                                      bankAccountId: p.bankAccountId?.toString() || '',
                                      status: p.status || 'Pagado',
                                      taxId: p.taxId || '',
                                      paymentLink: p.paymentLink || '',
                                      invoicePdfUrl: p.invoicePdfUrl || '',
                                      invoicePdfName: p.invoicePdfName || '',
                                      invoiceXmlUrl: p.invoiceXmlUrl || '',
                                      invoiceXmlName: p.invoiceXmlName || '',
                                      receiptPdfUrl: p.receiptPdfUrl || p.attachmentUrl || '',
                                      receiptPdfName: p.receiptPdfName || (p.attachmentUrl ? p.attachmentUrl.split('/').pop() : '') || '',
                                      attachmentUrl: p.attachmentUrl || '',
                                    });
                                    setIsEditPaymentMode(false);
                                    setIsDetailPaymentModalOpen(true);
                                  }}
                                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                >
                                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                    {p.date}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isMembershipPayment(p) ? (
                                          <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                            ⭐ Membresía
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                            📚 Cursos
                                          </span>
                                        )}
                                        <p className="font-bold text-slate-800">{p.description}</p>
                                      </div>
                                      {p.studentId && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                          Alumno: {students.find(s => String(s.id) === String(p.studentId))?.name} {students.find(s => String(s.id) === String(p.studentId))?.lastName}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                                    {p.paymentMethod}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        p.status === 'Aplicado' || p.status === 'Pagado'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                          : p.status === 'Programado'
                                          ? 'bg-amber-50 text-amber-700 border-amber-100 font-bold'
                                          : 'bg-slate-100 border-slate-200 text-slate-600'
                                      }`}>
                                        {p.status === 'Aplicado' || p.status === 'Pagado' ? 'Pagado' : p.status}
                                      </span>
                                      
                                      {p.status === 'Programado' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenConfirmPaymentModal(p);
                                          }}
                                          title="Confirmar recepción del pago"
                                          className="inline-flex items-center text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap leading-none border-0"
                                        >
                                          <Check className="w-2.5 h-2.5 mr-1" />
                                          Confirmar
                                        </button>
                                      )}
                                      {p.status === 'Pendiente' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEmailModal(p);
                                          }}
                                          title="Enviar correo de pago pendiente"
                                          className="inline-flex items-center text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap leading-none border-0 animate-in fade-in zoom-in duration-200"
                                        >
                                          <Mail className="w-2.5 h-2.5 mr-1" />
                                          Enviar Correo
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <PaymentAttachmentsBadges
                                      invoicePdfUrl={p.invoicePdfUrl}
                                      invoicePdfName={p.invoicePdfName}
                                      invoiceXmlUrl={p.invoiceXmlUrl}
                                      invoiceXmlName={p.invoiceXmlName}
                                      receiptPdfUrl={p.receiptPdfUrl}
                                      receiptPdfName={p.receiptPdfName}
                                      attachmentUrl={p.attachmentUrl}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-extrabold text-slate-950 block">
                                      ${(p.finalAmount !== undefined ? p.finalAmount : (p.currency === 'USD' ? p.amount : (p.amountMXN / (p.exchangeRate || 18.5)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-indigo-600">USD</span>
                                    </span>
                                    {(p.originalCurrency !== undefined ? p.originalCurrency !== 'USD' : p.currency !== 'USD') && (
                                      <span className="block text-[9px] font-mono font-medium text-slate-400 leading-none mt-0.5">
                                        Original: ${(p.originalAmount !== undefined ? p.originalAmount : p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {p.originalCurrency || p.currency}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedDetailPayment(p);
                                          setEditPaymentForm({
                                            date: p.date || '',
                                            description: p.description || '',
                                            amount: (p.originalAmount !== undefined ? p.originalAmount : p.amount)?.toString() || '',
                                            currency: p.originalCurrency || p.currency || 'MXN',
                                            exchangeRate: p.exchangeRate?.toString() || '18.5',
                                            paymentMethod: p.paymentMethod || 'Transferencia',
                                            bankAccountId: p.bankAccountId?.toString() || '',
                                            status: p.status || 'Pagado',
                                            taxId: p.taxId || '',
                                            paymentLink: p.paymentLink || '',
                                          });
                                          setIsEditPaymentMode(false);
                                          setIsDetailPaymentModalOpen(true);
                                        }}
                                        title="Ver Detalle"
                                        className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center animate-in fade-in zoom-in duration-200"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {p.status === 'Pendiente' && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEmailModal(p)}
                                          title="Enviar Correo de Cobro"
                                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center animate-in fade-in zoom-in duration-200"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {isUserAdminOrSuperAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedDetailPayment(p);
                                            setEditPaymentForm({
                                              date: p.date || '',
                                              description: p.description || '',
                                              amount: (p.originalAmount !== undefined ? p.originalAmount : p.amount)?.toString() || '',
                                              currency: p.originalCurrency || p.currency || 'MXN',
                                              exchangeRate: p.exchangeRate?.toString() || '18.5',
                                              paymentMethod: p.paymentMethod || 'Transferencia',
                                              bankAccountId: p.bankAccountId?.toString() || '',
                                              status: p.status || 'Pagado',
                                              taxId: p.taxId || '',
                                              paymentLink: p.paymentLink || '',
                                              invoicePdfUrl: p.invoicePdfUrl || '',
                                              invoicePdfName: p.invoicePdfName || '',
                                              invoiceXmlUrl: p.invoiceXmlUrl || '',
                                              invoiceXmlName: p.invoiceXmlName || '',
                                              receiptPdfUrl: p.receiptPdfUrl || p.attachmentUrl || '',
                                              receiptPdfName: p.receiptPdfName || (p.attachmentUrl ? p.attachmentUrl.split('/').pop() : '') || '',
                                              attachmentUrl: p.attachmentUrl || '',
                                            });
                                            setIsEditPaymentMode(true);
                                            setIsDetailPaymentModalOpen(true);
                                          }}
                                          title="Editar Pago"
                                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center animate-in fade-in zoom-in duration-200"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {isSuperAdminOnly && (
                                        <button
                                          type="button"
                                          onClick={() => setPaymentToDelete(p.id)}
                                          title="Eliminar Pago (Superadministrador)"
                                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center animate-in fade-in zoom-in duration-200"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Listado Alumnos" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Segmented Sub-tabs: Cursos Académicos vs Servicios de Plataformas y Certificaciones Externas */}
                  <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl max-w-2xl mb-4 overflow-x-auto shadow-2xs">
                    <button
                      type="button"
                      id="subtab-cursos-academicos"
                      onClick={() => setAlumnosSubTab('cursos')}
                      className={`flex-1 min-w-[170px] py-2 px-3.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        alumnosSubTab === 'cursos'
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Cursos Académicos</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        alumnosSubTab === 'cursos' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {studentReportStats.totalEnrollments}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="subtab-servicios-plataformas"
                      onClick={() => setAlumnosSubTab('servicios_plataformas')}
                      className={`flex-1 min-w-[280px] py-2 px-3.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        alumnosSubTab === 'servicios_plataformas'
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Servicios de Plataformas y Certificaciones Externas</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        alumnosSubTab === 'servicios_plataformas' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {serviciosStats.totalEnrollments}
                      </span>
                    </button>
                  </div>

                  {alumnosSubTab === 'cursos' && (
                    <div className="space-y-4">
                      {/* KPI Summary Header Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alumnos</span>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900">{studentReportStats.totalStudents}</div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">En esta institución</p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inscripciones</span>
                      </div>
                      <div className="text-xl font-extrabold text-slate-900">{studentReportStats.totalEnrollments}</div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        <span className="text-emerald-700 font-bold">{studentReportStats.totalFullCredits} Full</span> &bull; <span className="text-amber-700 font-bold">{studentReportStats.totalHalfCredits} Half</span>
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Facturación</span>
                      </div>
                      <div className="text-base font-extrabold text-slate-900 truncate">
                        ${studentReportStats.totalSaleUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-[10px] text-emerald-600 font-bold">USD</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">~${studentReportStats.totalSaleMXN.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN</p>
                    </div>

                    <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-emerald-700 mb-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Pass</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">{studentReportStats.passRate.toFixed(0)}%</span>
                      </div>
                      <div className="text-xl font-extrabold text-emerald-900">{studentReportStats.passCount}</div>
                      <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5">Materias acreditadas</p>
                    </div>

                    <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between text-rose-700 mb-1">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Fail</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded-full">{studentReportStats.failRate.toFixed(0)}%</span>
                      </div>
                      <div className="text-xl font-extrabold text-rose-900">{studentReportStats.failCount}</div>
                      <p className="text-[10px] text-rose-700/80 font-medium mt-0.5">No acreditadas</p>
                    </div>

                    <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl shadow-xs">
                      <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">En Curso</span>
                      </div>
                      <div className="text-xl font-extrabold text-amber-900">{studentReportStats.pendingCount}</div>
                      <p className="text-[10px] text-amber-700/80 font-medium mt-0.5">Pendiente de nota</p>
                    </div>
                  </div>

                  {/* Filter & Toolbar Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar alumno, materia..."
                          value={studentReportSearch}
                          onChange={(e) => setStudentReportSearch(e.target.value)}
                          className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        />
                        {studentReportSearch && (
                          <button
                            type="button"
                            onClick={() => setStudentReportSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Pass/Fail Filter */}
                      <select
                        value={studentReportGradeFilter}
                        onChange={(e) => setStudentReportGradeFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value="All">Todos (Pass/Fail)</option>
                        <option value="Pass">Solo Pass (Aprobado)</option>
                        <option value="Fail">Solo Fail (Reprobado)</option>
                        <option value="Pendiente">Solo Pendiente</option>
                      </select>

                      {/* Credit Type Filter */}
                      <select
                        value={studentReportCreditFilter}
                        onChange={(e) => setStudentReportCreditFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value="All">Todos los Créditos</option>
                        <option value="Full">Full Credit</option>
                        <option value="Half">Half Credit</option>
                      </select>

                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setStudentReportViewMode('report')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            studentReportViewMode === 'report'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Vista Reporte
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentReportViewMode('grouped')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            studentReportViewMode === 'grouped'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Por Alumno
                        </button>
                      </div>
                    </div>

                    {/* Action buttons: Print & CSV Export */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrintStudentsReport}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Imprimir o generar PDF oficial del reporte"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Imprimir Reporte</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportStudentsCSV}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-600/20"
                        title="Descargar datos en formato Excel / CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Exportar CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Report Table (Tabular Detailed View) */}
                  {studentReportViewMode === 'report' ? (
                    <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80">
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Alumno</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Materia & Crédito</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Periodo</th>
                            {canViewFinancialsData && (
                              <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-right">Precio</th>
                            )}
                            {canViewFinancialsData && isUserAdminOrSuperAdmin && (
                              <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-right">Costo Proveedor</th>
                            )}
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-center">Resultado (Pass/Fail)</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-center">Calificación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredStudentEnrollments.length === 0 ? (
                            <tr>
                              <td colSpan={canViewFinancialsData ? (isUserAdminOrSuperAdmin ? 7 : 6) : 5} className="px-4 py-12 text-center text-slate-400">
                                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="font-bold text-slate-600">No se encontraron inscripciones con los filtros actuales</p>
                                <p className="text-xs text-slate-400 mt-1">Prueba cambiando los términos de búsqueda o los filtros de crédito y resultado.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredStudentEnrollments.map((item, idx) => {
                              const s = item.student;
                              const cls = item.cls;
                              const en = item.enrollment;
                              const prov = item.provider;
                              const isEditing = editingEnrollIds[en.id];

                              return (
                                <tr key={en.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                                  {/* Student */}
                                  <td className="px-4 py-3 align-middle">
                                    <div 
                                      className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer inline-block"
                                      onClick={() => navigate(`/alumnos/${s.id}`)}
                                    >
                                      {s.name} {s.lastName || ""}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono font-normal">
                                      {s.email || "Sin email"}
                                      {s.curp && <span className="ml-1 text-slate-400">&bull; {s.curp}</span>}
                                    </div>
                                  </td>

                                  {/* Class & Credit */}
                                  <td className="px-4 py-3 align-middle">
                                    <div className="font-semibold text-slate-800">{cls.name}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {item.creditTypeCategory === 'Full' ? (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                                          Full Credit
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80">
                                          Half Credit
                                        </span>
                                      )}
                                      {prov && (
                                        <span className="text-[10px] text-purple-700 font-medium truncate max-w-[140px]" title={prov.commercialName || prov.legalName}>
                                          &bull; {prov.commercialName || prov.legalName}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Dates (inline editable) */}
                                  <td className="px-4 py-3 align-middle whitespace-nowrap">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="date"
                                          value={formatToInputDate(en.startDate || en.activationDate)}
                                          onChange={(evt) => updateEnrollment(en.id, { startDate: evt.target.value, activationDate: evt.target.value })}
                                          className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[105px] text-slate-700 font-medium"
                                        />
                                        <span className="text-slate-400 text-xs">-</span>
                                        <input
                                          type="date"
                                          value={formatToInputDate(en.endDate)}
                                          onChange={(evt) => updateEnrollment(en.id, { endDate: evt.target.value })}
                                          className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[105px] text-slate-700 font-medium"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setEditingEnrollIds(prev => ({ ...prev, [en.id]: false }))}
                                          className="p-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-md transition cursor-pointer"
                                          title="Guardar fechas"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 group/date">
                                        <span className="font-mono text-slate-600 text-[11px]">
                                          {formatToDisplayDate(en.startDate || en.activationDate)} - {formatToDisplayDate(en.endDate)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingEnrollIds(prev => ({ ...prev, [en.id]: true }))}
                                          className="p-0.5 text-indigo-600 hover:bg-indigo-50 rounded transition opacity-60 group-hover/date:opacity-100 cursor-pointer"
                                          title="Editar fechas de curso"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Price */}
                                  {canViewFinancialsData && (
                                    <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                      <div className="font-extrabold text-slate-900">
                                        ${item.salePriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-indigo-600 font-bold">USD</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        ~${item.salePriceMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                      </div>
                                      {item.scholarshipDiscountUSD > 0 && (
                                        <div className="text-[9px] font-bold text-emerald-600">
                                          Beca: -${item.scholarshipDiscountUSD.toFixed(2)} USD
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  {/* Provider Cost (Admin only) */}
                                  {canViewFinancialsData && isUserAdminOrSuperAdmin && (
                                    <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                      <span className="font-extrabold text-purple-700 font-mono text-xs">
                                        ${item.costUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-purple-500">USD</span>
                                      </span>
                                    </td>
                                  )}

                                  {/* Academic Result (Pass / Fail / Pendiente) */}
                                  <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      {item.gradeOutcome === 'Pass' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          Pass
                                        </span>
                                      )}
                                      {item.gradeOutcome === 'Fail' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                          Fail
                                        </span>
                                      )}
                                      {(!item.gradeOutcome || item.gradeOutcome === 'Pendiente') && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                                          Pendiente
                                        </span>
                                      )}

                                      {/* Quick toggle outcome dropdown / buttons */}
                                      <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickSetOutcome(en.id, 'Pass')}
                                          className={`p-1 rounded transition cursor-pointer ${
                                            item.gradeOutcome === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-700'
                                          }`}
                                          title="Marcar como Pass (Aprobado)"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickSetOutcome(en.id, 'Fail')}
                                          className={`p-1 rounded transition cursor-pointer ${
                                            item.gradeOutcome === 'Fail' ? 'bg-rose-100 text-rose-800' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-700'
                                          }`}
                                          title="Marcar como Fail (Reprobado)"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickSetOutcome(en.id, 'Pendiente')}
                                          className={`p-1 rounded transition cursor-pointer ${
                                            item.gradeOutcome === 'Pendiente' ? 'bg-amber-100 text-amber-800' : 'hover:bg-amber-50 text-slate-400 hover:text-amber-700'
                                          }`}
                                          title="Marcar como Pendiente"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Final Grade & Edit Action */}
                                  <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-2">
                                      {item.finalGrade ? (
                                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                          {item.finalGrade}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-xs font-mono">-</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenGradeModal(item)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                                        title="Registrar o editar calificación y notas"
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
                        {filteredStudentEnrollments.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
                              <td colSpan={3} className="px-4 py-3 text-slate-700">
                                Totales ({filteredStudentEnrollments.length} inscripciones de {new Set(filteredStudentEnrollments.map(e => e.student.id)).size} alumnos):
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900 font-extrabold">
                                ${filteredStudentEnrollments.reduce((sum, e) => sum + e.salePriceUSD, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-indigo-600">USD</span>
                              </td>
                              {isUserAdminOrSuperAdmin && (
                                <td className="px-4 py-3 text-right text-purple-700 font-extrabold font-mono">
                                  ${filteredStudentEnrollments.reduce((sum, e) => sum + e.costUSD, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-purple-500">USD</span>
                                </td>
                              )}
                              <td className="px-4 py-3 text-center">
                                <span className="text-emerald-700 font-extrabold">{filteredStudentEnrollments.filter(e => e.gradeOutcome === 'Pass').length} Pass</span> / <span className="text-rose-700 font-extrabold">{filteredStudentEnrollments.filter(e => e.gradeOutcome === 'Fail').length} Fail</span>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-400 text-[10px]">
                                {filteredStudentEnrollments.filter(e => Boolean(e.finalGrade)).length} con nota
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  ) : (
                    /* Grouped View by Student */
                    <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80">
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Alumno</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Materias, Precios y Pass/Fail</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider">Periodo (Fechas)</th>
                            <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-right">Total Alumno</th>
                            {isUserAdminOrSuperAdmin && (
                              <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-wider text-right">Costo Total</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {instStudents.map(s => {
                            const sEnrollments = studentEnrollmentsReport.filter(e => e.student.id === s.id);
                            const tariffId = institution?.tarifasId;
                            const countryRef = catalogs['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || institution?.country || s?.country || 'Default';

                            let sTotalUSD = sEnrollments.reduce((acc, curr) => acc + curr.salePriceUSD, 0);
                            const sTotalCostUSD = sEnrollments.reduce((acc, curr) => acc + curr.costUSD, 0);

                            const sPaidUSD = instPayments.filter(p => p.studentId === s.id).reduce((sum, p) => {
                              if (p.currency === 'USD') return sum + p.amount;
                              return sum + (p.amountMXN / (p.exchangeRate || 18.5));
                            }, 0);

                            const sTotalUSD_raw = sTotalUSD;
                            let sScholarshipDiscount = 0;
                            if (s.hasScholarship && s.scholarshipTarget === 'Escuela') {
                              const val = s.scholarshipValue || 0;
                              if (s.scholarshipType === 'Porcentaje') {
                                sScholarshipDiscount = sTotalUSD_raw * (val / 100);
                              } else {
                                sScholarshipDiscount = val;
                              }
                              sScholarshipDiscount = Math.min(sTotalUSD_raw, sScholarshipDiscount);
                              sTotalUSD = Math.max(0, sTotalUSD_raw - sScholarshipDiscount);
                            }

                            const sPendingUSD = sTotalUSD - sPaidUSD;

                            return (
                              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-xs font-bold text-slate-700 align-top">
                                  <div 
                                    className="cursor-pointer hover:text-indigo-600"
                                    onClick={() => navigate(`/alumnos/${s.id}`)}
                                  >
                                    {s.name} {s.lastName || ""}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{s.email || "Sin email"}</div>
                                  {s.curp && <div className="text-[9px] text-slate-400 font-mono font-normal">CURP: {s.curp}</div>}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-700 align-top">
                                  {sEnrollments.length > 0 ? (
                                    <div className="space-y-2.5">
                                      {sEnrollments.map((item, idx) => {
                                        const en = item.enrollment;
                                        const cls = item.cls;
                                        const prov = item.provider;

                                        return (
                                          <div key={idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <p className="font-bold text-slate-800 leading-tight">{cls.name}</p>
                                                {prov ? (
                                                  <p className="text-[10px] text-purple-700 font-semibold mt-0.5">📚 {prov.commercialName || prov.legalName}</p>
                                                ) : (
                                                  <p className="text-[10px] text-slate-400 mt-0.5">Sin proveedor</p>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {item.gradeOutcome === 'Pass' && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    Pass
                                                  </span>
                                                )}
                                                {item.gradeOutcome === 'Fail' && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                                    <XCircle className="w-3 h-3 text-rose-600" />
                                                    Fail
                                                  </span>
                                                )}
                                                {(!item.gradeOutcome || item.gradeOutcome === 'Pendiente') && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                    Pendiente
                                                  </span>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenGradeModal(item)}
                                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                                  title="Editar Pass/Fail y Calificación"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>

                                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                                              <div className="flex items-center gap-1.5">
                                                {item.creditTypeCategory === 'Full' ? (
                                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 text-[9px]">Full Credit</span>
                                                ) : (
                                                  <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 text-[9px]">Half Credit</span>
                                                )}
                                                {item.finalGrade && (
                                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[9px]">
                                                    Nota: {item.finalGrade}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="font-medium text-slate-700">
                                                Precio: <span className="font-mono font-bold text-indigo-700">${item.salePriceUSD.toLocaleString()} USD</span>
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Sin materias inscritas</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600 font-mono text-[10px] align-top" onClick={(e) => e.stopPropagation()}>
                                  {sEnrollments.length > 0 ? (
                                    <div className="space-y-3 font-sans">
                                      {sEnrollments.map((item, idx) => {
                                        const en = item.enrollment;
                                        const startD = en.activationDate || en.startDate;
                                        const endD = en.endDate;
                                        const isEditing = editingEnrollIds[en.id];

                                        return (
                                          <div key={idx} className="whitespace-nowrap py-1">
                                            {isEditing ? (
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="date"
                                                  value={formatToInputDate(en.startDate || en.activationDate)}
                                                  onChange={(evt) => updateEnrollment(en.id, { startDate: evt.target.value, activationDate: evt.target.value })}
                                                  className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[105px] text-slate-700 font-medium"
                                                />
                                                <span className="text-slate-400 text-xs">-</span>
                                                <input
                                                  type="date"
                                                  value={formatToInputDate(en.endDate)}
                                                  onChange={(evt) => updateEnrollment(en.id, { endDate: evt.target.value })}
                                                  className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[105px] text-slate-700 font-medium"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingEnrollIds(prev => ({ ...prev, [en.id]: false }))}
                                                  className="p-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-md transition cursor-pointer"
                                                  title="Completar edición"
                                                >
                                                  <Check className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 group/date">
                                                <span className="font-semibold text-slate-700 text-xs font-mono">{formatToDisplayDate(startD)} - {formatToDisplayDate(endD)}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingEnrollIds(prev => ({ ...prev, [en.id]: true }))}
                                                  className="p-0.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded transition opacity-80 group-hover/date:opacity-100 cursor-pointer"
                                                  title="Editar fechas"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-right align-top whitespace-nowrap">
                                  <span className="font-extrabold text-slate-900 block">
                                    ${sTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-indigo-600">USD</span>
                                  </span>
                                  {s.hasScholarship && s.scholarshipTarget === 'Escuela' && (
                                    <span className="block text-[9px] font-bold text-emerald-600 mt-0.5" title="Beca de Institución">
                                      Beca: -${sScholarshipDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                    </span>
                                  )}
                                  {sPendingUSD !== sTotalUSD && sPendingUSD > 0 && (
                                    <span className="block text-[10px] font-medium text-rose-700 mt-0.5">
                                      Saldo: ${sPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                    </span>
                                  )}
                                </td>
                                {isUserAdminOrSuperAdmin && (
                                  <td className="px-4 py-3 text-xs text-right align-top whitespace-nowrap">
                                    <span className="font-extrabold text-purple-700 block font-mono">
                                      ${sTotalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-purple-500">USD</span>
                                    </span>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                    </div>
                  )}

                  {alumnosSubTab === 'servicios_plataformas' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      {/* Header Banner / Info */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 backdrop-blur-xs shrink-0">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">
                              Servicios de Plataformas y Certificaciones Externas
                            </h3>
                            <p className="text-xs text-slate-300">
                              Estudiantes inscritos en licencias digitales, preparación, admisiones universitarias y certificaciones oficiales.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                          <button
                            type="button"
                            onClick={handleExportServiciosCSV}
                            disabled={filteredExtraServices.length === 0}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exportar CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/proveedores/servicios-extras')}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Inscribir en Servicio</span>
                          </button>
                        </div>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alumnos</span>
                          </div>
                          <div className="text-xl font-extrabold text-slate-900">{serviciosStats.totalStudents}</div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Con servicios asignados</p>
                        </div>

                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Inscripciones</span>
                          </div>
                          <div className="text-xl font-extrabold text-slate-900">{serviciosStats.totalEnrollments}</div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total asignaciones</p>
                        </div>

                        <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Plataformas</span>
                          </div>
                          <div className="text-xl font-extrabold text-emerald-900">{serviciosStats.platformsCount}</div>
                          <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5">Idiomas, Schmoop, IIVVO</p>
                        </div>

                        <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">Certificaciones</span>
                          </div>
                          <div className="text-xl font-extrabold text-blue-900">{serviciosStats.certificationsCount}</div>
                          <p className="text-[10px] text-blue-700/80 font-medium mt-0.5">Inglés y evaluaciones</p>
                        </div>

                        <div className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-purple-700 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">Admisiones</span>
                          </div>
                          <div className="text-xl font-extrabold text-purple-900">{serviciosStats.admissionsCount}</div>
                          <p className="text-[10px] text-purple-700/80 font-medium mt-0.5">University Admission</p>
                        </div>

                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Activas</span>
                          </div>
                          <div className="text-xl font-extrabold text-emerald-700">{serviciosStats.activeCount}</div>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vigentes actualmente</p>
                        </div>
                      </div>

                      {/* Filter & Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                          {/* Search Input */}
                          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar alumno, servicio, proveedor, usuario..."
                              value={serviciosSearch}
                              onChange={(e) => setServiciosSearch(e.target.value)}
                              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            />
                            {serviciosSearch && (
                              <button
                                type="button"
                                onClick={() => setServiciosSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Category Filter */}
                          <select
                            value={serviciosCategoryFilter}
                            onChange={(e) => setServiciosCategoryFilter(e.target.value as any)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="all">Todas las Categorías</option>
                            <option value="platform">Plataformas Digitales</option>
                            <option value="certification">Certificaciones Externas</option>
                            <option value="admission">Admisiones Universitarias</option>
                            <option value="other">Otros Servicios</option>
                          </select>

                          {/* Status Filter */}
                          <select
                            value={serviciosStatusFilter}
                            onChange={(e) => setServiciosStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="all">Todos los Estatus</option>
                            <option value="Active">Activo / Vigente</option>
                            <option value="Extended">Extendido</option>
                            <option value="Completed">Completado</option>
                            <option value="Ended">Finalizado / Vencido</option>
                          </select>
                        </div>

                        <div className="text-xs text-slate-500 font-semibold">
                          Mostrando <span className="font-bold text-slate-900">{filteredExtraServices.length}</span> de <span className="font-bold text-slate-900">{instExtraServicesData.length}</span> registros
                        </div>
                      </div>

                      {/* Table View */}
                      {filteredExtraServices.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mb-1">
                            {instExtraServicesData.length === 0
                              ? "No hay alumnos inscritos en plataformas o certificaciones"
                              : "No se encontraron registros con los filtros seleccionados"}
                          </h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                            {instExtraServicesData.length === 0
                              ? "Inscribe a los estudiantes de esta institución en plataformas como Schmoop, Centro de Idiomas Digital, IIVVO o certificaciones externas."
                              : "Prueba a cambiar el término de búsqueda o restablecer los filtros."}
                          </p>
                          {instExtraServicesData.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => navigate('/proveedores/servicios-extras')}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Inscribir en Servicios Extras</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setServiciosSearch("");
                                setServiciosCategoryFilter("all");
                                setServiciosStatusFilter("all");
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Restablecer Filtros</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  <th className="py-3 px-4">Alumno</th>
                                  <th className="py-3 px-3">Servicio / Plataforma</th>
                                  <th className="py-3 px-3">Categoría</th>
                                  <th className="py-3 px-3">Proveedor</th>
                                  <th className="py-3 px-3">Credenciales & Acceso</th>
                                  <th className="py-3 px-3">Modalidad / Lugar</th>
                                  <th className="py-3 px-3">Periodo / Fechas</th>
                                  <th className="py-3 px-3">Estatus</th>
                                  <th className="py-3 px-3">Resultado / Nota</th>
                                  <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredExtraServices.map((item) => {
                                  const studentInitials = `${(item.student.name || '').charAt(0)}${(item.student.lastName || '').charAt(0)}`.toUpperCase() || 'AL';
                                  const provName = item.provider ? (item.provider.commercialName || item.provider.legalName) : "Sin Proveedor";

                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                      {/* Alumno */}
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {studentInitials}
                                          </div>
                                          <div>
                                            <button
                                              type="button"
                                              onClick={() => navigate(`/alumnos/${item.student.id}`)}
                                              className="font-bold text-slate-900 hover:text-indigo-600 transition text-left cursor-pointer flex items-center gap-1"
                                            >
                                              <span>{item.student.name} {item.student.lastName || ''}</span>
                                            </button>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                              {item.student.studentCustomId && (
                                                <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-semibold">
                                                  ID: {item.student.studentCustomId}
                                                </span>
                                              )}
                                              {item.student.email && (
                                                <span className="truncate max-w-[150px]">{item.student.email}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Servicio / Plataforma */}
                                      <td className="py-3 px-3">
                                        <span className="font-bold text-slate-900 block">
                                          {item.serviceName}
                                        </span>
                                        {item.area && (
                                          <span className="text-[10px] text-slate-400 block mt-0.5">Área: {item.area}</span>
                                        )}
                                      </td>

                                      {/* Categoría */}
                                      <td className="py-3 px-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.categoryInfo.badgeColor}`}>
                                          {item.categoryInfo.label}
                                        </span>
                                      </td>

                                      {/* Proveedor */}
                                      <td className="py-3 px-3">
                                        <span className="font-semibold text-slate-700 block">
                                          {provName}
                                        </span>
                                      </td>

                                      {/* Credenciales & Acceso */}
                                      <td className="py-3 px-3">
                                        {item.usuario ? (
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-800">
                                              <span className="text-slate-400 text-[10px]">User:</span>
                                              <span className="font-semibold bg-slate-100 px-1.5 py-0.2 rounded">{item.usuario}</span>
                                            </div>
                                            {item.contrasena && (
                                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                                                <span className="text-slate-400 text-[10px]">Pass:</span>
                                                <span className="bg-slate-50 px-1.5 py-0.2 rounded text-slate-700 font-semibold">{item.contrasena}</span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-[11px] font-mono">-</span>
                                        )}
                                      </td>

                                      {/* Modalidad / Lugar */}
                                      <td className="py-3 px-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          item.lugar === 'Casa' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {item.lugar || item.student.modality || "Escuela"}
                                        </span>
                                      </td>

                                      {/* Fechas / Periodo */}
                                      <td className="py-3 px-3">
                                        <div className="text-[11px] text-slate-700 font-medium">
                                          <div><span className="text-slate-400 text-[10px]">Inicio:</span> {item.startDate}</div>
                                          {item.endDate && item.endDate !== '-' && (
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                              <span className="text-slate-400 text-[10px]">Vence:</span> {item.endDate}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* Estatus */}
                                      <td className="py-3 px-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                          item.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          item.status === 'Extended' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                          item.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                          {item.status === 'Active' ? 'Activo' :
                                           item.status === 'Extended' ? 'Extendido' :
                                           item.status === 'Completed' ? 'Completado' :
                                           item.status === 'Ended' ? 'Finalizado' : item.status}
                                        </span>
                                      </td>

                                      {/* Resultado / Nota */}
                                      <td className="py-3 px-3">
                                        {item.resultadoUrl ? (
                                          <a
                                            href={item.resultadoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-bold text-[10px] transition cursor-pointer"
                                          >
                                            <FileText className="w-3 h-3" />
                                            <span>Certificado</span>
                                          </a>
                                        ) : item.finalGrade ? (
                                          <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                            {item.finalGrade}
                                          </span>
                                        ) : item.gradeOutcome ? (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                            item.gradeOutcome === 'Pass' ? 'bg-emerald-50 text-emerald-700' :
                                            item.gradeOutcome === 'Fail' ? 'bg-rose-50 text-rose-700' :
                                            'bg-amber-50 text-amber-700'
                                          }`}>
                                            {item.gradeOutcome}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-[10px]">Sin resultado</span>
                                        )}
                                      </td>

                                      {/* Acciones */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/alumnos/${item.student.id}`)}
                                            title="Ver Alumno"
                                            className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Contactos" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">Directorio</h3>
                    <button onClick={() => setIsContactModalOpen(true)} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition">+ Añadir</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {instContacts.map(c => (
                      <div key={c.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-none mb-1">{c.name} {c.lastName}</p>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-normal">{c.position}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setDeleteConfirm({
                                title: "Eliminar Contacto",
                                message: `¿Estás seguro de que deseas eliminar permanentemente a "${c.name} ${c.lastName}" de los contactos de esta institución?`,
                                onConfirm: () => {
                                  deleteContact(c.id);
                                }
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar Contacto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex flex-col space-y-1.5 text-[11px] text-slate-500 font-medium mb-4">
                          <p className="flex items-center"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> {c.email}</p>
                          <p className="flex items-center"><Phone className="w-3.5 h-3.5 mr-2 text-slate-400" /> {c.phone}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                          <span className="text-[11px] font-bold text-slate-600">Acceso al sistema</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !c.systemAccess;
                              updateContact(c.id, { systemAccess: nextVal });
                            }}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              c.systemAccess ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                c.systemAccess ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "Documentos" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-800">Repositorio de Documentos</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Gestor de convenios, expedientes legales, documentos académicos y administrativos.</p>
                    </div>
                    <button 
                      onClick={() => handleOpenUploadDocModal()}
                      className="text-xs font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl uppercase hover:bg-indigo-700 transition flex items-center cursor-pointer font-sans shadow-sm border-0 self-start sm:self-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Subir Documento (PDF)
                    </button>
                  </div>

                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    accept=".pdf"
                    id="main-tab-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.name.toLowerCase().endsWith('.pdf')) {
                          alert("Por favor, selecciona un archivo en formato PDF.");
                          return;
                        }
                        handleOpenUploadDocModal(file);
                      }
                    }} 
                    className="hidden" 
                  />

                  {/* Clickable Drag & Drop Zone */}
                  <div 
                    onClick={() => {
                      const el = document.getElementById('main-tab-file-input');
                      if (el) el.click();
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const droppedFile = files[0];
                        if (!droppedFile.name.toLowerCase().endsWith('.pdf')) {
                          alert("Por favor, arrastra un archivo en formato PDF.");
                          return;
                        }
                        handleOpenUploadDocModal(droppedFile);
                      }
                    }}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer group"
                  >
                     <Upload className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                     <p className="text-xs font-bold text-slate-700">Arrastra archivos PDF aquí o haz clic para buscar</p>
                     <p className="text-[10px] text-slate-400 mt-1">Soporta formato PDF oficial con categorización (Legal, Académico, Administrativo) y control de vigencia</p>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['Todos', 'Legal', 'Académico', 'Administrativo'] as const).map(cat => {
                        const isSelected = docCategoryFilter === cat;
                        const count = cat === 'Todos' 
                          ? (institution.documentsList || []).length 
                          : (institution.documentsList || []).filter(d => (d.category || 'Administrativo') === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setDocCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>{cat}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                              isSelected ? 'bg-indigo-800/60 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Mostrando {
                        [...(institution.documentsList || [])].filter(doc => docCategoryFilter === 'Todos' || (doc.category || 'Administrativo') === docCategoryFilter).length
                      } documentos
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left font-sans border-collapse">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 border-b border-slate-200">Fecha de Carga</th>
                          <th className="px-4 py-3 border-b border-slate-200">Nombre del Documento</th>
                          <th className="px-4 py-3 border-b border-slate-200">Categoría</th>
                          <th className="px-4 py-3 border-b border-slate-200">Vencimiento</th>
                          <th className="px-4 py-3 border-b border-slate-200">Archivo Adjunto</th>
                          <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                          <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {(!institution.documentsList || institution.documentsList.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">No hay documentos registrados para esta institución.</td>
                          </tr>
                        ) : (
                          (() => {
                            const docs = [...(institution.documentsList || [])]
                              .filter(doc => docCategoryFilter === 'Todos' || (doc.category || 'Administrativo') === docCategoryFilter)
                              .sort((a,b) => b.uploadDate.localeCompare(a.uploadDate));
                            
                            if (docs.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                                    No hay documentos bajo la categoría "{docCategoryFilter}".
                                  </td>
                                </tr>
                              );
                            }

                            return docs.map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-600 font-mono font-medium">
                                  {doc.uploadDate}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                                    {doc.name}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {getDocCategoryBadge(doc.category)}
                                </td>
                                <td className="px-4 py-3">
                                  {getDocExpirationBadge(doc)}
                                </td>
                                <td className="px-4 py-3 text-slate-500 italic max-w-[140px] truncate">
                                  {doc.fileName || 'Carga Directa'}
                                </td>
                                <td className="px-4 py-3 text-slate-550 font-mono">{doc.fileSize}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end items-center space-x-1.5">
                                    <button 
                                      onClick={() => setViewingDoc(doc)}
                                      className="text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Ver Documento"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingDoc(doc);
                                        setEditingDocName(doc.name);
                                        setEditingDocDate(doc.uploadDate || new Date().toISOString().split('T')[0]);
                                        setEditingDocCategory(doc.category || 'Legal');
                                        setEditingDocHasExpiration(!!doc.hasExpiration);
                                        setEditingDocExpirationDate(doc.expirationDate || '');
                                        setIsEditDocModalOpen(true);
                                      }}
                                      className="text-slate-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Editar Documento"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        let dataUrl = doc.fileData;
                                        if (!dataUrl) {
                                          const content = 'Contenido del documento: ' + doc.name + '\nCargado el: ' + doc.uploadDate;
                                          const blob = new Blob([content], { type: 'text/plain' });
                                          dataUrl = URL.createObjectURL(blob);
                                        }
                                        link.href = dataUrl;
                                        link.download = doc.fileName || doc.name + '.txt';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="text-slate-500 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Descargar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setDeleteConfirm({
                                          title: "Eliminar Documento",
                                          message: `¿Estás seguro de que deseas eliminar permanentemente el archivo "${doc.fileName || doc.name}" del perfil de esta institución? Esta acción borrará el registro oficial de forma irreversible y purgará el archivo físico del almacenamiento digital.`,
                                          onConfirm: () => {
                                            if (doc.fileData && doc.fileData.startsWith('blob:')) {
                                              try {
                                                URL.revokeObjectURL(doc.fileData);
                                              } catch (e) {
                                                console.error("Error revoking Object URL:", e);
                                              }
                                            }
                                            const fresh = (institution.documentsList || []).filter(d => d.id !== doc.id);
                                            updateInstitution(institution.id, { documentsList: fresh });
                                            console.log(`Documento institucional ID ${doc.id} purgado con éxito de la base de almacenamiento.`);
                                          }
                                        });
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Borrar Documento"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Bitácora" && (
                <div className="space-y-8">
                  {instActivities.length > 0 ? (
                    <div className="relative pl-6 space-y-6">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100"></div>
                      {instActivities.map((act) => (
                        <div key={act.id} className="relative pl-6">
                          <div className="absolute left-[-25px] top-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-white shadow-sm"></div>
                          <p className="text-[10px] text-slate-400 font-mono mb-1">
                            {new Date(act.date).toLocaleDateString()}
                            {act.userName && <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase tracking-widest text-[8px]">{act.userName}</span>}
                          </p>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium text-center py-12">No hay registros en la bitácora.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Borrar / Archivar Modal */}
      <Modal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
        title={`Confirmar Acción: ${institution.name}`}
      >
        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="border border-slate-200/85 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Análisis de la Institución</h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <p className="text-slate-400 font-medium">Alumnos Vinculados:</p>
                <p className="font-extrabold text-slate-800 text-sm">{instStudents.length} alumnos</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-medium">Contactos Registrados:</p>
                <p className="font-extrabold text-slate-800 text-sm">{instContacts.length} contactos</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-medium">Tareas de Seguimiento:</p>
                <p className="font-extrabold text-slate-800 text-sm">{instTasks.length} tareas</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-medium">Estatus Actual:</p>
                <p className="font-extrabold text-slate-800 text-sm uppercase">{institution.status}</p>
              </div>
            </div>

            <div className="pt-2.5 mt-2.5 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
              <div className="space-y-0.5">
                <p className="text-slate-400 font-medium">Saldos por Cobrar (Venta):</p>
                <p className={`font-extrabold ${totalPorRecaudar > 0 ? "text-amber-600" : "text-slate-700"}`}>
                  ${totalPorRecaudar.toLocaleString()} MXN
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-400 font-medium font-semibold">Saldos por Pagar (Costos):</p>
                <p className={`font-extrabold ${saldoPorPagar > 0 ? "text-rose-600" : "text-slate-700"}`}>
                  ${saldoPorPagar.toLocaleString()} MXN
                </p>
              </div>
            </div>
          </div>

          {/* Business Logic evaluation */}
          {(totalPorRecaudar > 0 || saldoPorPagar > 0) ? (
            /* Case 1: Pending balance -> Only Archiving allowed */
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-250 space-y-2">
              <div className="flex items-start gap-2 text-amber-850">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700">Acción Requerida: Archivar</p>
                  <p className="font-medium mt-1 leading-relaxed text-slate-705">
                    Esta institución tiene <strong>pagos o cargos pendientes</strong> de liquidar (${totalPorRecaudar.toLocaleString()} MXN de ingresos y/o ${saldoPorPagar.toLocaleString()} MXN de egresos).
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                    Para asegurar la consistencia del balance fiscal e histórico, no se puede eliminar de forma definitiva. Debe guardarse en el histórico contable a través de la acción de **Archivar**.
                  </p>
                </div>
              </div>
            </div>
          ) : (instStudents.length > 0 || instContacts.length > 0 || instTasks.length > 0) ? (
            /* Case 2: Associated records exist -> Choice allowed between Delete or Archive (with safe warnings) */
            <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 space-y-2">
              <div className="flex items-start gap-2 text-indigo-850">
                <HelpCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">Apto para Borrar o Archivar</p>
                  <p className="font-medium mt-1 leading-relaxed text-slate-705">
                    No hay saldos pendientes de cobrar ni de pagar, pero la institución cuenta con <strong>{instStudents.length} alumnos</strong> o <strong>{instContacts.length} contactos</strong> activos.
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                    • Si decides <strong>archivarla</strong>, pasará a estatus histórico conservando integrados todos sus alumnos y contactos.
                  </p>
                  <p className="mt-1 leading-relaxed text-rose-700 font-bold">
                    • Si decides <strong>eliminarla por completo</strong>, esos registros quedarán desvinculados de forma irrevocable.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Case 3: Empty and clean -> Full delete is 100% safe and recommended */
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-250 space-y-2">
              <div className="flex items-start gap-2 text-emerald-850">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Apto para Eliminar</p>
                  <p className="font-medium mt-1 leading-relaxed text-slate-705">
                    Esta institución no tiene alumnos, contactos ni deudas registradas en absoluto.
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 font-semibold">
                    Es seguro eliminar permanentemente la institución de la base de datos de manera definitiva.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
            {(totalPorRecaudar > 0 || saldoPorPagar > 0) ? (
              <button
                type="button"
                onClick={() => {
                  updateInstitution(institution.id, { status: "Archivada" });
                  setIsActionModalOpen(false);
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archivar Institución (Mantener Historial Contable)
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    updateInstitution(institution.id, { status: "Archivada" });
                    setIsActionModalOpen(false);
                  }}
                  className="w-full border border-slate-200 hover:border-slate-305 text-slate-700 hover:bg-slate-50 rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archivar en su lugar (Recomendado)
                </button>
                {isSuperAdminOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteInstitution(institution.id);
                      setIsActionModalOpen(false);
                      navigate("/instituciones");
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar por Completo de la Base de Datos
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsActionModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditGeneralOpen} onClose={() => setIsEditGeneralOpen(false)} title="Editar Información General" size="3xl">
        <form onSubmit={handleGeneralSubmit} className="space-y-5">
          {/* Sub-pestañas para compactar formulario sin scroll */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200 shrink-0">
            {[
              { id: 'generales', label: 'Datos Generales' },
              { id: 'membresia', label: 'Membresía & Gestión' },
              { id: 'precios', label: 'Esquema de Precios' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveEditTab(tab.id as any)}
                className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeEditTab === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {activeEditTab === 'generales' && (
              <div className="space-y-5 animate-in fade-in duration-200 font-sans">
                {/* 1. Datos Principales */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identificadores Principales</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Nombre Legal de la Institución</label>
                      <input required type="text" value={generalForm.name} onChange={e => setGeneralForm({...generalForm, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5 font-sans">Nombre Comercial</label>
                      <input type="text" value={generalForm.tradeName} onChange={e => setGeneralForm({...generalForm, tradeName: e.target.value})} className="w-full border border-indigo-100 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-200 transition-all font-semibold text-indigo-900 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Código Institución</label>
                      <input type="text" value={generalForm.institutionCode} onChange={e => setGeneralForm({...generalForm, institutionCode: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" placeholder="Código de la institución" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Tipo de Institución (Catálogo)</label>
                      <select value={generalForm.institutionTypeId} onChange={e => setGeneralForm({...generalForm, institutionTypeId: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm cursor-pointer">
                        <option value="">Seleccionar tipo...</option>
                        {catalogs['Tipos de Institución']?.map(ti => (
                          <option key={ti.id} value={ti.id}>{ti.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center h-full pt-4 md:pt-6">
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={generalForm.isCorporativo || false} 
                            onChange={(e) => setGeneralForm({...generalForm, isCorporativo: e.target.checked})} 
                          />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${generalForm.isCorporativo ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                          <div className={`dot absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ${generalForm.isCorporativo ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-sans">¿Es Corporativo?</span>
                      </label>
                    </div>
                    <div className="flex items-center h-full pt-4 md:pt-6">
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={generalForm.active !== false} 
                            onChange={(e) => setGeneralForm({...generalForm, active: e.target.checked})} 
                          />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${generalForm.active !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                          <div className={`dot absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ${generalForm.active !== false ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-sans">Activa</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* 2. Ubicación y Dirección */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ubicación y Dirección</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Dirección</label>
                      <input type="text" value={generalForm.address || ''} onChange={e => setGeneralForm({...generalForm, address: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Ciudad</label>
                      <input type="text" value={generalForm.city || ''} onChange={e => setGeneralForm({...generalForm, city: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-1 border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Estado / Prov.</label>
                      <input type="text" value={generalForm.state || ''} onChange={e => setGeneralForm({...generalForm, state: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">CP</label>
                      <input type="text" value={generalForm.zipCode || ''} onChange={e => setGeneralForm({...generalForm, zipCode: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-mono font-medium text-slate-800 shadow-sm animate-in" />
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">País</label>
                      <input 
                        required 
                        type="text" 
                        value={generalForm.country || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setGeneralForm({
                            ...generalForm, 
                            country: val,
                            colombiaCalendar: !isColombia(val) ? '' : generalForm.colombiaCalendar
                          });
                        }} 
                        className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" 
                      />
                    </div>
                    {isColombia(generalForm.country) && (
                      <div className="col-span-2 md:col-span-4 bg-amber-50/90 border border-amber-300 rounded-xl p-4 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                            🇨🇴 Calendario Escolar (Colombia)
                          </label>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                            Requerido para Colombia
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label 
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              generalForm.colombiaCalendar === 'Calendario A'
                                ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-500/30'
                                : 'bg-white border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="detailColombiaCalendar"
                              value="Calendario A"
                              checked={generalForm.colombiaCalendar === 'Calendario A'}
                              onChange={e => setGeneralForm({ ...generalForm, colombiaCalendar: e.target.value as any })}
                              className="mt-0.5 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="text-xs font-black text-slate-900">Calendario A</div>
                              <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">Ciclo estándar: inicia en Enero/Febrero y concluye en Noviembre.</div>
                            </div>
                          </label>
                          <label 
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              generalForm.colombiaCalendar === 'Calendario B'
                                ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-500/30'
                                : 'bg-white border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="detailColombiaCalendar"
                              value="Calendario B"
                              checked={generalForm.colombiaCalendar === 'Calendario B'}
                              onChange={e => setGeneralForm({ ...generalForm, colombiaCalendar: e.target.value as any })}
                              className="mt-0.5 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="text-xs font-black text-slate-900">Calendario B</div>
                              <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">Ciclo internacional: inicia en Agosto/Septiembre y concluye en Junio.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Datos de Comunicación */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                      <Globe className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Comunicación & Catálogos</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Teléfono Inst.</label>
                      <input type="tel" value={generalForm.phone || ''} onChange={e => setGeneralForm({...generalForm, phone: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono hover:border-slate-300 transition-all shadow-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Correo Gral.</label>
                      <input type="email" value={generalForm.email || ''} onChange={e => setGeneralForm({...generalForm, email: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Modalidad</label>
                      <select value={generalForm.modality || ''} onChange={e => setGeneralForm({...generalForm, modality: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm bg-white font-medium text-slate-700">
                        <option value="">Seleccionar...</option>
                        {catalogs['Modalidades']?.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans font-medium">Tarifas (País)</label>
                      <select value={generalForm.tarifasId || ''} onChange={e => setGeneralForm({...generalForm, tarifasId: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm bg-white font-medium text-slate-700">
                        <option value="">Seleccionar...</option>
                        {catalogs['Tarifas Países']?.map(tp => (
                          <option key={tp.id} value={tp.id}>{tp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans font-medium">Proveedor Principal</label>
                      <select 
                        value={generalForm.mainProviderId || ''} 
                        onChange={e => setGeneralForm({...generalForm, mainProviderId: e.target.value ? Number(e.target.value) : ''})} 
                        className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm bg-white font-medium text-slate-700"
                      >
                        <option value="">Seleccionar...</option>
                        {providers.filter(p => !p.providerType || p.providerType === "Curriculum Académico").map(p => (
                          <option key={p.id} value={p.id}>{p.commercialName || p.legalName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Contacto Principal */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contacto Principal</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Nombre Contacto</label>
                      <input required type="text" value={generalForm.contact || ''} onChange={e => setGeneralForm({...generalForm, contact: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Puesto del Contacto</label>
                      <input type="text" value={generalForm.contactPosition || ''} onChange={e => setGeneralForm({...generalForm, contactPosition: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans font-medium">Correo de Contacto</label>
                      <input type="email" value={generalForm.contactEmail || ''} onChange={e => setGeneralForm({...generalForm, contactEmail: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Teléfono Contacto</label>
                      <input type="tel" value={generalForm.contactPhone || ''} onChange={e => setGeneralForm({...generalForm, contactPhone: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono hover:border-slate-300 transition-all shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="bg-slate-100/80 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado de Cuenta</span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">Calculado en base a adeudos académicos de facturación</span>
                  </div>
                  <span className={`text-[11px] font-extrabold uppercase px-3.5 py-1 rounded-xl shadow-xs tracking-wider border ${
                    resolvedStatus === 'Al corriente' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {resolvedStatus}
                  </span>
                </div>
              </div>
            )}

            {activeEditTab === 'membresia' && (
              <div className="space-y-5 animate-in fade-in duration-200 font-sans">
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuración del Plan de Membresía</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plan de Membresía</label>
                      <select value={generalForm.membershipId || ''} onChange={e => setGeneralForm({...generalForm, membershipId: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-slate-300 transition-all font-medium shadow-sm bg-white text-slate-700">
                        <option value="">Ninguna</option>
                        {catalogs['Membresías']?.map(m => (
                          <option key={m.id} value={m.id}>{m.name} {m.amount ? `($${m.amount} ${m.currency})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vigencia Membresía</label>
                      <input type="date" value={generalForm.membershipExpiration || ''} onChange={e => setGeneralForm({...generalForm, membershipExpiration: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono hover:border-slate-300 transition-all shadow-sm text-slate-700" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agente / Gestor Asignado</label>
                    <select value={generalForm.agentId || ''} onChange={e => setGeneralForm({...generalForm, agentId: e.target.value ? Number(e.target.value) : ''})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:border-slate-300 transition-all font-medium shadow-sm bg-white text-slate-700">
                      <option value="">Ninguno / Sin Asignar</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeEditTab === 'precios' && (
              <div className="space-y-5 animate-in fade-in duration-200 font-sans">
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                    <div className="p-1 bg-amber-50 text-amber-600 rounded">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Esquema de Precios Dinámico</h3>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 leading-relaxed font-medium flex items-start gap-2.5">
                    <span className="text-base select-none leading-none">💡</span>
                    <div>
                      <p className="font-bold text-amber-950 mb-0.5">Precios Dinámicos por Membresía y País</p>
                      Los costos se calculan de manera automática para estudiantes inscritos con base en la membresía y el catálogo de tarifas por país seleccionados para esta institución.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-center">
                    <div className="bg-white p-3 border border-slate-200 rounded-xl flex flex-col justify-center shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Membresía</p>
                      <p className="font-extrabold text-xs text-slate-800">
                        {resolveMembershipPrice(generalForm.membershipId, catalogs)}
                      </p>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl flex flex-col justify-center shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-medium">C. Completo</p>
                      <p className="font-bold text-xs text-indigo-700">
                        {resolveCreditPrices(generalForm.tarifasId, catalogs, generalForm.mainProviderId, providerProductServices).priceFullCredit}
                      </p>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl flex flex-col justify-center shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-medium">Medio C.</p>
                      <p className="font-bold text-xs text-indigo-700">
                        {resolveCreditPrices(generalForm.tarifasId, catalogs, generalForm.mainProviderId, providerProductServices).priceHalfCredit}
                      </p>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl flex flex-col justify-center shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-semibold">C. AP</p>
                      <p className="font-bold text-xs text-emerald-700">
                        {resolveCreditPrices(generalForm.tarifasId, catalogs, generalForm.mainProviderId, providerProductServices).priceFullApCredit}
                      </p>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl flex flex-col justify-center shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 font-semibold">Medio AP</p>
                      <p className="font-bold text-xs text-emerald-700">
                        {resolveCreditPrices(generalForm.tarifasId, catalogs, generalForm.mainProviderId, providerProductServices).priceHalfApCredit}
                      </p>
                    </div>
                  </div>

                  {/* hidden old values state preservation */}
                  <div style={{ display: 'none' }}>
                    <input type="text" value={generalForm.membershipPrice} onChange={e => setGeneralForm({...generalForm, membershipPrice: e.target.value})} />
                    <input type="text" value={generalForm.priceFullCredit} onChange={e => setGeneralForm({...generalForm, priceFullCredit: e.target.value})} />
                    <input type="text" value={generalForm.priceHalfCredit} onChange={e => setGeneralForm({...generalForm, priceHalfCredit: e.target.value})} />
                    <input type="text" value={generalForm.priceFullApCredit} onChange={e => setGeneralForm({...generalForm, priceFullApCredit: e.target.value})} />
                    <input type="text" value={generalForm.priceHalfApCredit} onChange={e => setGeneralForm({...generalForm, priceHalfApCredit: e.target.value})} />
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={generalForm.payWithIva || false} 
                          onChange={(e) => setGeneralForm({...generalForm, payWithIva: e.target.checked})} 
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${generalForm.payWithIva ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ${generalForm.payWithIva ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Facturación con cobro de IVA</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Método de Pago Preferido</label>
                      <select 
                        value={generalForm.paymentMethod || ''} 
                        onChange={e => setGeneralForm({...generalForm, paymentMethod: e.target.value})} 
                        className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="">Seleccionar método...</option>
                        {catalogs['Métodos de Pago']?.map(mp => (
                          <option key={mp.id} value={mp.name}>{mp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cuenta de Cobro / Referencia</label>
                      <select 
                        value={generalForm.paymentAccount || ''} 
                        onChange={e => setGeneralForm({...generalForm, paymentAccount: e.target.value})} 
                        className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="">Seleccionar cuenta...</option>
                        {catalogs['Cuentas bancarias']?.map(cb => {
                          const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                          return <option key={cb.id} value={cb.name}>{label}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Nueva sección: Forma de Pago */}
                  <div className="border-t border-slate-200/80 pt-4 mt-2 space-y-4 font-sans">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-dashed border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <span>💳</span> Forma de Pago
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-150/85">
                      {/* Forma de pago membresía */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-widest pl-1 border-l-2 border-indigo-600">Forma de Pago Membresía</p>
                        
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Forma de Pago</label>
                            <select 
                              value={generalForm.membershipPaymentMethod || ''} 
                              onChange={e => setGeneralForm({...generalForm, membershipPaymentMethod: e.target.value})} 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Métodos de Pago']?.map(mp => (
                                <option key={mp.id} value={mp.name}>{mp.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cuenta de cobro</label>
                            <select 
                              value={generalForm.membershipPaymentAccount || ''} 
                              onChange={e => setGeneralForm({...generalForm, membershipPaymentAccount: e.target.value})} 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Cuentas bancarias']?.map(cb => {
                                const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                                return <option key={cb.id} value={cb.name}>{label}</option>;
                              })}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Número de pagos</label>
                              <input 
                                type="number" 
                                min="1"
                                placeholder="Ej. 1"
                                value={generalForm.membershipPaymentCount || ""} 
                                onChange={e => setGeneralForm({...generalForm, membershipPaymentCount: e.target.value ? Number(e.target.value) : ""})} 
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-700 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Fecha de inicio</label>
                              <input 
                                type="date" 
                                value={generalForm.membershipPaymentStartDate || ''} 
                                onChange={e => setGeneralForm({...generalForm, membershipPaymentStartDate: e.target.value})} 
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-705 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Forma de pago cursos */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-widest pl-1 border-l-2 border-amber-600">Forma de Pago Cursos</p>
                        
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Forma de Pago</label>
                            <select 
                              value={generalForm.coursePaymentMethod || ''} 
                              onChange={e => setGeneralForm({...generalForm, coursePaymentMethod: e.target.value})} 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Métodos de Pago']?.map(mp => (
                                <option key={mp.id} value={mp.name}>{mp.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cuenta de cobro</label>
                            <select 
                              value={generalForm.coursePaymentAccount || ''} 
                              onChange={e => setGeneralForm({...generalForm, coursePaymentAccount: e.target.value})} 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              {catalogs['Cuentas bancarias']?.map(cb => {
                                const label = cb.companyName ? `${cb.name} (${cb.companyName})` : cb.name;
                                return <option key={cb.id} value={cb.name}>{label}</option>;
                              })}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Número de pagos</label>
                              <input 
                                type="number" 
                                min="1"
                                placeholder="Ej. 1"
                                value={generalForm.coursePaymentCount || ""} 
                                onChange={e => setGeneralForm({...generalForm, coursePaymentCount: e.target.value ? Number(e.target.value) : ""})} 
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-700 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Fecha de inicio</label>
                              <input 
                                type="date" 
                                value={generalForm.coursePaymentStartDate || ''} 
                                onChange={e => setGeneralForm({...generalForm, coursePaymentStartDate: e.target.value})} 
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-705 font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Observaciones de Tarifario y Facturación</label>
                    <textarea value={generalForm.priceObservations || ''} onChange={e => setGeneralForm({...generalForm, priceObservations: e.target.value})} rows={3} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all shadow-sm resize-none text-slate-800" placeholder="Ingresa notas adicionales o especificaciones arancelarias particulares..."></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100 shrink-0">
            <button type="button" onClick={() => setIsEditGeneralOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition uppercase tracking-wider shadow-md shadow-indigo-600/10 cursor-pointer">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title="Añadir Contacto">
        <form onSubmit={handleContactSubmit} className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre</label>
               <input required type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Apellido</label>
               <input required type="text" value={contactForm.lastName} onChange={e => setContactForm({...contactForm, lastName: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Puesto</label>
               <input required type="text" value={contactForm.position} onChange={e => setContactForm({...contactForm, position: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Área</label>
               <input required type="text" value={contactForm.area} onChange={e => setContactForm({...contactForm, area: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
             </div>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
             <input required type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono</label>
             <input required type="text" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col font-sans">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Acceso al sistema</span>
                <span className="text-[10px] text-slate-500 font-medium">Habilitar usuario con rol Coordinador (sólo ver su institución)</span>
              </div>
              <button
                type="button"
                onClick={() => setContactForm(prev => ({ ...prev, systemAccess: !prev.systemAccess }))}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  contactForm.systemAccess ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    contactForm.systemAccess ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="hidden">
           </div>
           <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
             <button type="button" onClick={() => setIsContactModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
             <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm">Guardar</button>
           </div>
        </form>
      </Modal>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Nueva Tarea">
        <form onSubmit={handleTaskSubmit} className="space-y-4">
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título de la Tarea</label>
             <input required type="text" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Llamar para seguimiento" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Tipo de Tarea</label>
             <div className="grid grid-cols-5 gap-2">
               {taskTypeOptions.map((opt) => {
                 const Icon = opt.icon;
                 const isSelected = taskForm.type === opt.type;
                 return (
                   <button
                     key={opt.type}
                     type="button"
                     onClick={() => setTaskForm({...taskForm, type: opt.type})}
                     className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                   >
                     <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>{opt.label}</span>
                   </button>
                 );
               })}
             </div>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de vencimiento</label>
             <input required type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asignar a Usuario (Opcional)</label>
             <select value={taskForm.userId} onChange={e => setTaskForm({...taskForm, userId: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
               <option value="">Ninguno</option>
               {users.map(u => (
                 <option key={u.id} value={u.id}>{u.name}</option>
               ))}
             </select>
           </div>
           <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
             <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm">Crear Tarea</button>
            </div>
         </form>
       </Modal>
      {/* Detail view custom modals injected inline */}
      <Modal isOpen={isDetailCampusModalOpen} onClose={() => setIsDetailCampusModalOpen(false)} title="Añadir Campus Secundario">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fresh = [
            ...(institution.campusList || []),
            {
              ...detailCampusForm,
              id: Math.random().toString(36).substr(2, 9)
            }
          ];
          updateInstitution(institution.id, { campusList: fresh });
          setIsDetailCampusModalOpen(false);
        }} className="space-y-4 font-sans text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Comercial del Campus</label>
            <input type="text" required value={detailCampusForm.name} onChange={e => setDetailCampusForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Campus Monterrey Sur" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ciudad / País</label>
            <input type="text" required value={detailCampusForm.cityCountry} onChange={e => setDetailCampusForm(prev => ({ ...prev, cityCountry: e.target.value }))} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-505 outline-none" placeholder="Ej. Monterrey, México" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contacto del Campus</label>
            <input type="text" required value={detailCampusForm.contact} onChange={e => setDetailCampusForm(prev => ({ ...prev, contact: e.target.value }))} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-505 outline-none" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Teléfono Directo</label>
            <input type="tel" required value={detailCampusForm.phone} onChange={e => setDetailCampusForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-505 outline-none font-mono" placeholder="+52 ..." />
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsDetailCampusModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Añadir Campus</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDetailDocModalOpen} onClose={handleCloseUploadDocModal} title="Cargar Convenio / Documento (PDF)">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!detailDocName.trim()) return;
          
          const processAndSave = (base64Data?: string) => {
            const fresh: InstitutionDocument[] = [
              ...(institution.documentsList || []),
              {
                id: Math.random().toString(36).substr(2, 9),
                name: detailDocName,
                fileName: selectedFile ? selectedFile.name : 'Convenio_Carga_Manual.pdf',
                fileSize: selectedFile 
                  ? (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB" 
                  : (Math.random() * (4.5 - 0.5) + 0.5).toFixed(1) + " MB",
                uploadDate: detailDocDate || new Date().toISOString().split('T')[0],
                fileData: base64Data,
                category: detailDocCategory,
                hasExpiration: detailDocHasExpiration,
                expirationDate: detailDocHasExpiration ? detailDocExpirationDate : undefined
              }
            ];
            updateInstitution(institution.id, { documentsList: fresh });
            handleCloseUploadDocModal();
          };

          if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              processAndSave(evt.target?.result as string);
            };
            reader.readAsDataURL(selectedFile);
          } else {
            processAndSave();
          }
        }} className="space-y-4 font-sans text-left">
          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Legal' as const, label: 'Legal', icon: Shield, desc: 'Convenios, actas' },
                { id: 'Académico' as const, label: 'Académico', icon: GraduationCap, desc: 'Acreditaciones, planes' },
                { id: 'Administrativo' as const, label: 'Administrativo', icon: FileSpreadsheet, desc: 'Oficios, facturas' },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = detailDocCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDetailDocCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-start cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{cat.label}</span>
                    </div>
                    <span className={`text-[10px] line-clamp-1 ${isSelected ? 'text-indigo-700/80' : 'text-slate-400'}`}>{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Descriptivo del Documento</label>
            <input 
              type="text" 
              required 
              value={detailDocName} 
              onChange={e => setDetailDocName(e.target.value)} 
              className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ej. Convenio Marco de Cooperación 2025" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha del Documento</label>
            <input 
              type="date" 
              required 
              value={detailDocDate} 
              onChange={e => setDetailDocDate(e.target.value)} 
              className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>

          {/* Fecha de Vencimiento Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Fecha de Vencimiento</span>
                <span className="text-[11px] text-slate-500">¿El documento tiene vigencia o fecha límite?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold ${detailDocHasExpiration ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {detailDocHasExpiration ? 'Sí' : 'No'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={detailDocHasExpiration}
                  onClick={() => {
                    const next = !detailDocHasExpiration;
                    setDetailDocHasExpiration(next);
                    if (next && !detailDocExpirationDate) {
                      const nextYear = new Date();
                      nextYear.setFullYear(nextYear.getFullYear() + 1);
                      setDetailDocExpirationDate(nextYear.toISOString().split('T')[0]);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    detailDocHasExpiration ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      detailDocHasExpiration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {detailDocHasExpiration && (
              <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Especificar Fecha de Vencimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required={detailDocHasExpiration}
                  value={detailDocExpirationDate}
                  onChange={e => setDetailDocExpirationDate(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Archivo Adjunto (Solo PDF)</label>
            {selectedFile ? (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 bg-indigo-100/60 text-indigo-700 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase bg-red-50 hover:bg-red-100 border border-red-100 rounded px-2.5 py-1.5 transition ml-3 shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <input 
                type="file" 
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                      alert("Por favor, selecciona un archivo en formato PDF.");
                      return;
                    }
                    setSelectedFile(file);
                    if (!detailDocName) {
                      const idx = file.name.lastIndexOf('.');
                      const baseName = idx !== -1 ? file.name.substring(0, idx) : file.name;
                      setDetailDocName(baseName);
                    }
                  }
                }}
                className="block w-full text-xs text-slate-500 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
              />
            )}
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={handleCloseUploadDocModal} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Subir Documento</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Editar Documento */}
      <Modal isOpen={isEditDocModalOpen} onClose={() => setIsEditDocModalOpen(false)} title="Editar Documento">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!editingDocName.trim() || !editingDoc) return;
          const fresh = (institution.documentsList || []).map(d => {
            if (d.id === editingDoc.id) {
              return { 
                ...d, 
                name: editingDocName, 
                uploadDate: editingDocDate,
                category: editingDocCategory,
                hasExpiration: editingDocHasExpiration,
                expirationDate: editingDocHasExpiration ? editingDocExpirationDate : undefined
              };
            }
            return d;
          });
          updateInstitution(institution.id, { documentsList: fresh });
          setIsEditDocModalOpen(false);
          setEditingDoc(null);
        }} className="space-y-4 font-sans text-left">
          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Legal' as const, label: 'Legal', icon: Shield, desc: 'Convenios, actas' },
                { id: 'Académico' as const, label: 'Académico', icon: GraduationCap, desc: 'Acreditaciones, planes' },
                { id: 'Administrativo' as const, label: 'Administrativo', icon: FileSpreadsheet, desc: 'Oficios, facturas' },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = editingDocCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEditingDocCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-start cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{cat.label}</span>
                    </div>
                    <span className={`text-[10px] line-clamp-1 ${isSelected ? 'text-indigo-700/80' : 'text-slate-400'}`}>{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Descriptivo del Documento</label>
            <input type="text" required value={editingDocName} onChange={e => setEditingDocName(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha del Documento</label>
            <input type="date" required value={editingDocDate} onChange={e => setEditingDocDate(e.target.value)} className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* Fecha de Vencimiento Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Fecha de Vencimiento</span>
                <span className="text-[11px] text-slate-500">¿El documento tiene vigencia o fecha límite?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold ${editingDocHasExpiration ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {editingDocHasExpiration ? 'Sí' : 'No'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editingDocHasExpiration}
                  onClick={() => {
                    const next = !editingDocHasExpiration;
                    setEditingDocHasExpiration(next);
                    if (next && !editingDocExpirationDate) {
                      const nextYear = new Date();
                      nextYear.setFullYear(nextYear.getFullYear() + 1);
                      setEditingDocExpirationDate(nextYear.toISOString().split('T')[0]);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editingDocHasExpiration ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      editingDocHasExpiration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {editingDocHasExpiration && (
              <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Especificar Fecha de Vencimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required={editingDocHasExpiration}
                  value={editingDocExpirationDate}
                  onChange={e => setEditingDocExpirationDate(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditDocModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Visualizar Documento */}
      <Modal 
        isOpen={viewingDoc !== null} 
        onClose={() => setViewingDoc(null)} 
        title={`Visualizador de Documentos: ${viewingDoc?.name || ''}`}
        size={viewingDoc?.fileData?.startsWith('data:application/pdf') || viewingDoc?.fileName?.toLowerCase().endsWith('.pdf') ? '4xl' : 'lg'}
      >
        <div className="space-y-4 font-sans text-left pb-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
            <FileText className="w-10 h-10 text-indigo-500 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-slate-900 truncate text-sm">{viewingDoc?.name}</h5>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingDoc?.fileName || 'Carga Directa'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider items-center">
                <span>Fecha: <strong className="text-slate-700">{viewingDoc?.uploadDate}</strong></span>
                <span>Tamaño: <strong className="text-slate-700">{viewingDoc?.fileSize}</strong></span>
                <span className="flex items-center gap-1">Categoría: {getDocCategoryBadge(viewingDoc?.category)}</span>
                <span className="flex items-center gap-1">Vigencia: {viewingDoc ? getDocExpirationBadge(viewingDoc) : '—'}</span>
              </div>
            </div>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[300px]">
            {viewingDoc?.fileData?.startsWith('data:image/') ? (
              <img src={viewingDoc.fileData} alt={viewingDoc.name} className="max-h-[350px] object-contain rounded hover:scale-101 transition p-2" referrerPolicy="no-referrer" />
            ) : (viewingDoc?.fileData?.startsWith('data:application/pdf') || viewingDoc?.fileName?.toLowerCase().endsWith('.pdf')) ? (() => {
              const rTitle = viewingDoc.name || "Documento Administrativo";
              const rFileName = viewingDoc.fileName || `${rTitle.replace(/\s+/g, '_')}.pdf`;
              const rDate = viewingDoc.uploadDate || new Date().toISOString().split('T')[0];
              const rSize = viewingDoc.fileSize || "1.4 MB";
              const rId = viewingDoc.id ? `ID-DOC-${viewingDoc.id}` : "REG-GENERIC-99";
              
              const pdfUrl = activePdfUrl || "data:text/html;charset=utf-8," + encodeURIComponent(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>${rTitle}</title>
                    <style>
                      body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        background: #f8fafc;
                        color: #1e293b;
                        padding: 30px;
                        display: flex;
                        justify-content: center;
                        margin: 0;
                      }
                      .page {
                        background: white;
                        width: 100%;
                        max-width: 750px;
                        min-height: 950px;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 50px;
                        box-sizing: border-box;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                      }
                      .watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-28deg);
                        font-size: 40px;
                        font-weight: 900;
                        color: rgba(79, 70, 229, 0.05);
                        letter-spacing: 0.15em;
                        text-transform: uppercase;
                        white-space: nowrap;
                        pointer-events: none;
                        user-select: none;
                      }
                      .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #f1f5f9;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                      }
                      .brand h1 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 800;
                        color: #4f46e5;
                        letter-spacing: -0.02em;
                      }
                      .brand p {
                        margin: 2px 0 0 0;
                        font-size: 11px;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 600;
                      }
                      .meta {
                        text-align: right;
                        font-size: 11px;
                        color: #64748b;
                        line-height: 1.4;
                      }
                      .meta p { margin: 0; }
                      .meta strong { color: #0f172a; }
                      .badge {
                        display: inline-block;
                        background: #eef2ff;
                        color: #4f46e5;
                        padding: 3px 8px;
                        border-radius: 6px;
                        font-size: 9px;
                        font-weight: 700;
                        text-transform: uppercase;
                        margin-bottom: 12px;
                        letter-spacing: 0.025em;
                      }
                      .title {
                        font-size: 20px;
                        font-weight: 850;
                        color: #0f172a;
                        letter-spacing: -0.025em;
                        margin: 0 0 15px 0;
                      }
                      .line {
                        height: 1px;
                        background: #f1f5f9;
                        margin: 25px 0;
                      }
                      .section-title {
                        font-size: 11px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #64748b;
                        margin-bottom: 10px;
                      }
                      .doc-text {
                        font-size: 13px;
                        line-height: 1.6;
                        color: #334155;
                      }
                      table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11.5px;
                        margin: 20px 0;
                      }
                      th {
                        text-align: left;
                        padding: 8px 12px;
                        background: #f8fafc;
                        color: #475569;
                        font-weight: 700;
                        border-bottom: 1px solid #e2e8f0;
                      }
                      td {
                        padding: 10px 12px;
                        border-bottom: 1px solid #f1f5f9;
                        color: #334155;
                      }
                      .stamp-container {
                        margin-top: auto;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        padding-top: 40px;
                      }
                      .seal {
                        border: 2px dashed #4f46e5;
                        padding: 10px;
                        border-radius: 8px;
                        color: #4f46e5;
                        font-size: 9px;
                        font-weight: bold;
                        text-align: center;
                        width: 120px;
                        transform: rotate(-3deg);
                      }
                      .footer {
                        text-align: center;
                        font-size: 10px;
                        color: #94a3b8;
                        border-top: 1px dashed #e2e8f0;
                        padding-top: 15px;
                        margin-top: 25px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="page">
                      <div class="watermark">VISTA PREVIA DE AUDITORÍA</div>
                      <div class="header">
                        <div class="brand">
                          <h1>EDULINK DIGITAL</h1>
                          <p>Gestor de Documentación Oficial</p>
                        </div>
                        <div class="meta">
                          <p>Código Ref: <strong>${rId}</strong></p>
                          <p>Fecha Carga: <strong>${rDate}</strong></p>
                          <p>Dimensión: <strong>${rSize}</strong></p>
                        </div>
                      </div>
                      
                      <div class="badge">Expediente Validado</div>
                      <h2 class="title">${rTitle}</h2>
                      
                      <p class="doc-text">
                        Este archivo PDF representa el resguardo digital oficial del documento ingresado como <strong>"${rTitle}"</strong>. 
                        Este visor integrado simula con precisión la estructura formal del expediente almacenado, garantizando que el documento se encuentre respaldado bajo las políticas de resguardo institucional de la plataforma.
                      </p>
                      
                      <div class="line"></div>
                      
                      <div class="section-title">Detalles Técnicos del Almacenamiento</div>
                      <table>
                        <thead>
                          <tr>
                            <th>Módulo / Meta-etiqueta</th>
                            <th>Valor Certificado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Denominación del Documento</strong></td>
                            <td>${rTitle}</td>
                          </tr>
                          <tr>
                            <td><strong>Nombre de Archivo Original</strong></td>
                            <td style="font-family: monospace; color: #4f46e5;">${rFileName}</td>
                          </tr>
                          <tr>
                            <td><strong>Fecha Oficial de Carga</strong></td>
                            <td>${rDate}</td>
                          </tr>
                          <tr>
                            <td><strong>Tamaño Registrado</strong></td>
                            <td>${rSize}</td>
                          </tr>
                          <tr>
                            <td><strong>Estado del Almacenamiento</strong></td>
                            <td><span style="color: #10b981; font-weight: bold;">✓ ACTIVO Y CONCILIADO</span></td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <p class="doc-text" style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 15px;">
                        * Nota de Seguridad: Para previsualizar o desplegar este archivo fuera del portal seguro, use la opción "Descargar Archivo" en la esquina inferior. Toda descarga física es firmada digitalmente con un hash MD5 de autenticidad.
                      </p>
                      
                      <div class="stamp-container">
                        <div style="font-size: 11px; color: #64748b;">
                          <p style="margin: 0; font-weight: bold; color: #334155;">EDULINK PLATFORM V3</p>
                          <p style="margin: 2px 0 0 0;">Control de Auditoría Documental</p>
                        </div>
                        <div class="seal">
                          Sello de Seguridad<br>
                          SOPORTE PDF OK
                        </div>
                      </div>
                      
                      <div class="footer">
                        Este documento es confidencial y para uso exclusivo del personal de EduLink.
                      </div>
                    </div>
                  </body>
                </html>
              `);

              return (
                <div className="w-full flex flex-col space-y-3 animate-in fade-in duration-300">
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
                      {(activePdfUrl || pdfUrl) && (
                        <a 
                          href={activePdfUrl || pdfUrl} 
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
                          link.href = activePdfUrl || pdfUrl;
                          link.download = rFileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition flex items-center space-x-1 border border-slate-200"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Descargar PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Visor integrado confiable con etiqueta object y fallback iframe */}
                  <div className="w-full h-[550px] rounded-lg border border-slate-250 overflow-hidden bg-white shadow-inner relative">
                    <object
                      data={activePdfUrl || pdfUrl}
                      type="application/pdf"
                      className="w-full h-full border-0"
                    >
                      <iframe
                        src={activePdfUrl || pdfUrl}
                        className="w-full h-full border-0"
                        title={`PDF ${rTitle}`}
                      />
                    </object>
                  </div>
                </div>
              );
            })() : (
              <div className="p-10 flex flex-col items-center justify-center space-y-3">
                <svg className="w-12 h-12 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-bold text-slate-600">Previsualización Segura</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">El visualizador oficial es ideal para imágenes y firmas integradas o documentos PDF.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => {
                if (viewingDoc) {
                  const link = document.createElement('a');
                  let dataUrl = viewingDoc.fileData;
                  if (!dataUrl) {
                    const content = 'Contenido del documento: ' + viewingDoc.name + '\nCargado el: ' + viewingDoc.uploadDate;
                    const blob = new Blob([content], { type: 'text/plain' });
                    dataUrl = URL.createObjectURL(blob);
                  }
                  link.href = dataUrl;
                  link.download = viewingDoc.fileName || viewingDoc.name + '.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }} 
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold uppercase transition flex items-center shrink-0 border border-emerald-200 border-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Descargar Archivo
            </button>
            <button type="button" onClick={() => setViewingDoc(null)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold uppercase transition border-0 cursor-pointer">Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Modal para Registrar / Programar Pago de Cursos */}
      <Modal 
        isOpen={isCoursePaymentModalOpen} 
        onClose={() => setIsCoursePaymentModalOpen(false)} 
        title={`Pago de Cursos - ${institution.name}`} 
        size="2xl"
      >
        <div className="p-1">
          {/* Tabs header */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/50">
            <button
              type="button"
              onClick={() => setCoursePaymentTab('register')}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                coursePaymentTab === 'register' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dar de Alta Pago
            </button>
            <button
              type="button"
              onClick={() => setCoursePaymentTab('schedule')}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                coursePaymentTab === 'schedule' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Programar Pago
            </button>
          </div>

          {/* TAB 1: Dar de alta un pago */}
          {coursePaymentTab === 'register' && (
            <div className="mt-2">
              <FinancialTransactionForm 
                fixedInstitutionId={institution.id} 
                initialType="income" 
                onSuccess={() => { 
                  setIsCoursePaymentModalOpen(false); 
                }} 
              />
            </div>
          )}

          {/* TAB 2: Programar un pago */}
          {coursePaymentTab === 'schedule' && (() => {
            const activeMemb = catalogs['Membresías']?.find((m: any) => m.id === institution?.membershipId);
            const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
            const customMembPrice = institution?.membershipPrice ? parseFloat((institution.membershipPrice || "").replace(/[^0-9.-]+/g, "")) : null;
            const finalMembUnitAmount = customMembPrice !== null && !isNaN(customMembPrice) ? customMembPrice : membUnitAmount;
            const membCurrency = activeMemb ? (activeMemb.currency || 'USD') : 'USD';
            const totalMembAmountValue = finalMembUnitAmount;

            return (
              <form onSubmit={handleSchedulePayments} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Concepto de Cobro</label>
                    <select
                      value={schForm.concepto}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSchForm(prev => ({
                          ...prev,
                          concepto: value,
                          description: value === 'Membresía' ? 'Pago Programado de Membresía' : 'Pago Programado de Cursos'
                        }));
                      }}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="Cursos">Cursos</option>
                      <option value="Membresía">Membresía</option>
                    </select>
                  </div>

                  {schForm.concepto === 'Membresía' && (
                    <div className="col-span-1 md:col-span-2 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/65 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black text-amber-800 tracking-widest">Detalle de Membresía de Institución</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                          {activeMemb?.name || 'Membresía No Asignada'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Costo Membresía</p>
                          <p className="text-xs font-black text-slate-800 mt-1">{finalMembUnitAmount > 0 ? `$${finalMembUnitAmount.toLocaleString()} ${membCurrency}` : 'Sin costo'}</p>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Tipo Cargo</p>
                          <p className="text-xs font-black text-slate-800 mt-1">Cargo Único</p>
                        </div>
                        <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/20">
                          <p className="text-[9px] text-indigo-900 font-black uppercase tracking-wider">Monto Total a Pagar</p>
                          <p className="text-xs font-black text-indigo-950 mt-1">${totalMembAmountValue.toLocaleString()} {membCurrency}</p>
                        </div>
                      </div>

                      {totalMembAmountValue > 0 && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSchForm(prev => ({
                                ...prev,
                                amountPerPayment: totalMembAmountValue.toString(),
                                currency: membCurrency
                              }));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider border-0 shadow-sm cursor-pointer transition-all"
                          >
                            Usar este Monto Total
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha de Comienzo</label>
                  <input
                    type="date"
                    required
                    value={schForm.startDate}
                    onChange={(e) => setSchForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Periodicidad de Cobro</label>
                  <select
                    value={schForm.periodicity}
                    onChange={(e) => setSchForm(prev => ({ ...prev, periodicity: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="monthly-first">Primer día de cada mes (Mensual Diferida)</option>
                    <option value="monthly-same">Mismo día de cada mes (Mensual Directa)</option>
                    <option value="biweekly">Cada 15 días (Quincenal)</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Número Total de Pagos</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={schForm.numPayments}
                    onChange={(e) => setSchForm(prev => ({ ...prev, numPayments: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Monto por Pago</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Monto de cada pago individual"
                    value={schForm.amountPerPayment}
                    onChange={(e) => setSchForm(prev => ({ ...prev, amountPerPayment: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Moneda</label>
                  <select
                    value={schForm.currency}
                    onChange={(e) => setSchForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                    <option value="USD">Dólares Americanos (USD)</option>
                  </select>
                </div>

                {schForm.currency === 'MXN' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Cambio</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={schForm.exchangeRate}
                      onChange={(e) => setSchForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {schForm.amountPerPayment && schForm.currency === 'MXN' && (
                  <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-indigo-800 uppercase tracking-widest leading-none">Monto Final por Pago</span>
                      <span className="text-slate-500 text-[9px] mt-0.5 block font-medium">Monto / Tipo de Cambio</span>
                    </div>
                    <span className="text-sm font-black text-indigo-900">
                      ${(Number(schForm.amountPerPayment) / (parseFloat(schForm.exchangeRate) || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Forma de Pago sugerida</label>
                  <select
                    value={schForm.paymentMethod}
                    onChange={(e) => setSchForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {catalogs['Métodos de Pago']?.map((m: any) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    )) || (
                      <>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta de Credito">Tarjeta de Crédito</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Efectivo">Efectivo</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuenta de Recepción de Pago sugerida</label>
                  <select
                    value={schForm.bankAccountId}
                    onChange={(e) => setSchForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">No aplica / Sin especificar</option>
                    {catalogs['Cuentas bancarias']?.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name} {b.companyName ? `(${b.companyName})` : ''}</option>
                    )) || (
                      <>
                        <option value="Banorte">Banorte</option>
                        <option value="WellsFargo USA">WellsFargo USA</option>
                      </>
                    )}
                  </select>
                </div>

                {schForm.paymentMethod?.toLowerCase().includes('flywire') && (
                  <div className="col-span-1 md:col-span-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-center w-full animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black uppercase text-indigo-900 tracking-wider mb-1">Liga de Pago Flywire (para los pagos programados)</label>
                      <input
                        type="text"
                        value={schForm.paymentLink || ''}
                        onChange={e => setSchForm(prev => ({ ...prev, paymentLink: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono"
                        placeholder="https://payment.flywire.com/..."
                      />
                    </div>
                  </div>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Alumnos Asociados (Opcional - Selecciona uno o varios)</label>
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Buscar alumno..."
                        className="flex-1 rounded-lg border-slate-200 bg-white text-xs px-2.5 py-1.5 focus:border-indigo-500 focus:ring-indigo-500 outline-none"
                        value={schStudentSearch}
                        onChange={(e) => setSchStudentSearch(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = instStudents
                            .filter(s => `${s.name} ${s.lastName}`.toLowerCase().includes(schStudentSearch.toLowerCase()))
                            .map(s => s.id.toString());
                          setSchForm(prev => {
                            const union = Array.from(new Set([...prev.studentIds, ...filteredIds]));
                            return { ...prev, studentIds: union };
                          });
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border-0 cursor-pointer"
                      >
                        Seleccionar filtrados
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchForm(prev => ({ ...prev, studentIds: [] }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg border-0 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 border-t border-slate-200/50 pt-2">
                      {instStudents.filter(s => `${s.name} ${s.lastName}`.toLowerCase().includes(schStudentSearch.toLowerCase())).length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic block py-1">No se encontraron alumnos</span>
                      ) : (
                        instStudents
                          .filter(s => `${s.name} ${s.lastName}`.toLowerCase().includes(schStudentSearch.toLowerCase()))
                          .map((s) => {
                            const isChecked = schForm.studentIds.includes(s.id.toString());
                            return (
                              <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200/50 cursor-pointer transition text-xs text-slate-705">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSchForm(prev => {
                                      const exists = prev.studentIds.includes(s.id.toString());
                                      const nextIds = exists
                                        ? prev.studentIds.filter(id => id !== s.id.toString())
                                        : [...prev.studentIds, s.id.toString()];
                                      return { ...prev, studentIds: nextIds };
                                    });
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <span className="font-semibold text-slate-700">{s.name} {s.lastName}</span>
                                <span className="text-[9px] text-slate-400 font-mono ml-auto">({s.email || 'sin email'})</span>
                              </label>
                            );
                          })
                      )}
                    </div>
                    {schForm.studentIds.length > 0 && (
                      <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/50 px-2.5 py-1 rounded-lg inline-block">
                        {schForm.studentIds.length} {schForm.studentIds.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Concepto Base</label>
                  <input
                    type="text"
                    required
                    value={schForm.description}
                    onChange={(e) => setSchForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Preview schedule sequence */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none block">Secuencia de Pagos a Generar (Vista Previa)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {Array.from({ length: Math.min(6, parseInt(schForm.numPayments) || 0) }).map((_, i) => (
                    <div key={i} className="bg-white p-2 rounded-lg border border-slate-200/50 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-indigo-700">Pago {i + 1}/{schForm.numPayments}</span>
                      <span className="text-[10px] font-black text-slate-800 mt-1 leading-none">
                        {getScheduledDate(schForm.startDate, schForm.periodicity, i)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                        ${(Number(schForm.amountPerPayment) || 0).toLocaleString()} <span className="text-[8px]">{schForm.currency}</span>
                      </span>
                    </div>
                  ))}
                  {(parseInt(schForm.numPayments) || 0) > 6 && (
                    <div className="flex items-center justify-center p-2 text-slate-400 bg-white border border-dashed border-slate-200 rounded-lg text-[10px] font-bold">
                      + {(parseInt(schForm.numPayments) || 0) - 6} pagos más...
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoursePaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all border-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all border-0 cursor-pointer"
                >
                  Programar Pagos
                </button>
              </div>
            </form>
          ); })()}
        </div>
      </Modal>

      {/* Modal para Confirmar Recepción de Pago Programado */}
      <Modal
        isOpen={confirmingPayment !== null}
        onClose={() => setConfirmingPayment(null)}
        title="Confirmar Recepción de Pago"
        size="lg"
      >
        {confirmingPayment && (
          <form onSubmit={handleConfirmPaymentReceipt} className="space-y-4">
            <div className="p-1 space-y-3">
              <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-200/60 flex items-start gap-2.5">
                <CalendarRange className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900 text-xs">Datos del Pago Programado Original</h5>
                  <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                    {confirmingPayment.description} de <span className="font-bold">${confirmingPayment.amount?.toLocaleString()} {confirmingPayment.currency}</span> programado para el <span className="font-bold">{confirmingPayment.date}</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha de Recepción Real</label>
                  <input
                    type="date"
                    required
                    value={confirmForm.date}
                    onChange={(e) => setConfirmForm(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Concepto de Recepción</label>
                  <input
                    type="text"
                    required
                    value={confirmForm.description}
                    onChange={(e) => setConfirmForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Monto Recibido</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={confirmForm.amount}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Moneda</label>
                    <select
                      value={confirmForm.currency}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="MXN">Pesos Mexicanos (MXN)</option>
                      <option value="USD">Dólares Americanos (USD)</option>
                    </select>
                  </div>
                </div>

                {confirmForm.currency === 'MXN' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Cambio del Día</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={confirmForm.exchangeRate}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {confirmForm.amount && confirmForm.currency === 'MXN' && (
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-none">Monto Final Aplicado</span>
                      <span className="text-slate-500 text-[9px] mt-0.5 block font-medium">Monto / Tipo de Cambio</span>
                    </div>
                    <span className="text-xs font-black text-emerald-900">
                      ${(Number(confirmForm.amount) / (parseFloat(confirmForm.exchangeRate) || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Forma de Pago del Recibo</label>
                    <select
                      value={confirmForm.paymentMethod}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {catalogs['Métodos de Pago']?.map((m: any) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      )) || (
                        <>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta de Credito">Tarjeta de Crédito</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Efectivo">Efectivo</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuenta Bancaria de Depósito</label>
                    <select
                      value={confirmForm.bankAccountId}
                      onChange={(e) => setConfirmForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                      className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">No aplica / Sin especificar</option>
                      {catalogs['Cuentas bancarias']?.map((b: any) => (
                        <option key={b.id} value={b.name}>{b.name} {b.companyName ? `(${b.companyName})` : ''}</option>
                      )) || (
                        <>
                          <option value="Banorte">Banorte</option>
                          <option value="WellsFargo USA">WellsFargo USA</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">ID de Factura / Tax ID (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-99052"
                    value={confirmForm.taxId}
                    onChange={(e) => setConfirmForm(prev => ({ ...prev, taxId: e.target.value }))}
                    className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <PaymentAttachmentsManager
                    data={{
                      invoicePdfUrl: confirmForm.invoicePdfUrl,
                      invoicePdfName: confirmForm.invoicePdfName,
                      invoiceXmlUrl: confirmForm.invoiceXmlUrl,
                      invoiceXmlName: confirmForm.invoiceXmlName,
                      receiptPdfUrl: confirmForm.receiptPdfUrl || confirmForm.attachmentUrl,
                      receiptPdfName: confirmForm.receiptPdfName,
                    }}
                    onChange={(newData) => {
                      setConfirmForm(prev => ({
                        ...prev,
                        invoicePdfUrl: newData.invoicePdfUrl || '',
                        invoicePdfName: newData.invoicePdfName || '',
                        invoiceXmlUrl: newData.invoiceXmlUrl || '',
                        invoiceXmlName: newData.invoiceXmlName || '',
                        receiptPdfUrl: newData.receiptPdfUrl || '',
                        receiptPdfName: newData.receiptPdfName || '',
                        attachmentUrl: newData.receiptPdfName || '',
                      }));
                    }}
                    onExtractTaxId={(uuid) => {
                      if (uuid && !confirmForm.taxId) {
                        setConfirmForm(prev => ({ ...prev, taxId: uuid }));
                      }
                    }}
                  />
                </div>

                {confirmForm.paymentMethod?.toLowerCase().includes('flywire') && (
                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-center w-full animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black uppercase text-indigo-900 tracking-wider mb-1">Liga de Pago Flywire</label>
                      <input
                        type="text"
                        value={confirmForm.paymentLink || ''}
                        onChange={e => setConfirmForm(prev => ({ ...prev, paymentLink: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono"
                        placeholder="https://payment.flywire.com/..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingPayment(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all border-0 cursor-pointer"
              >
                Confirmar Recepción
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal 
        isOpen={isDetailPaymentModalOpen} 
        onClose={() => {
          setIsDetailPaymentModalOpen(false);
          setSelectedDetailPayment(null);
          setIsEditPaymentMode(false);
        }} 
        title={isEditPaymentMode ? "Editar Detalle de Pago" : "Detalle del Pago"}
        size="2xl"
      >
        {selectedDetailPayment && (
          <div className="space-y-6">
            {!isEditPaymentMode ? (
              // View Mode
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 border border-indigo-100 text-indigo-700">
                      Transacción de Ingreso
                    </span>
                    <h3 className="text-lg font-bold text-slate-800">{selectedDetailPayment.description}</h3>
                    {selectedDetailPayment.studentId && (
                      <p className="text-xs text-slate-500 font-medium">
                        Alumno asociado: <span className="font-bold text-slate-700">{students.find(s => String(s.id) === String(selectedDetailPayment.studentId))?.name} {students.find(s => String(s.id) === String(selectedDetailPayment.studentId))?.lastName}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                      selectedDetailPayment.status === 'Aplicado' || selectedDetailPayment.status === 'Pagado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : selectedDetailPayment.status === 'Programado'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      {selectedDetailPayment.status === 'Aplicado' || selectedDetailPayment.status === 'Pagado' ? 'Pagado' : selectedDetailPayment.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Monto en USD (Equivalente)</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      ${(selectedDetailPayment.finalAmount !== undefined ? selectedDetailPayment.finalAmount : (selectedDetailPayment.currency === 'USD' ? selectedDetailPayment.amount : (selectedDetailPayment.amountMXN / (selectedDetailPayment.exchangeRate || 18.5)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Monto Original</span>
                    <span className="text-base font-bold text-slate-700">
                      ${(selectedDetailPayment.originalAmount !== undefined ? selectedDetailPayment.originalAmount : selectedDetailPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedDetailPayment.originalCurrency || selectedDetailPayment.currency || 'MXN'}
                    </span>
                  </div>

                  {(selectedDetailPayment.originalCurrency !== undefined ? selectedDetailPayment.originalCurrency !== 'USD' : selectedDetailPayment.currency !== 'USD') && (
                    <div>
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Tipo de Cambio</span>
                      <span className="text-base font-mono font-medium text-slate-700">
                        ${selectedDetailPayment.exchangeRate || '18.5'} MXN
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Fecha</span>
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatToDisplayDate(selectedDetailPayment.date)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Método de Pago</span>
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDetailPayment.paymentMethod || 'No especificado'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Cuenta de Depósito</span>
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDetailPayment.bankAccountId || 'No aplica / Sin especificar'}
                    </span>
                  </div>

                  {selectedDetailPayment.taxId && (
                    <div className="col-span-2">
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">ID de Factura / Tax ID</span>
                      <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100/30">
                        {selectedDetailPayment.taxId}
                      </span>
                    </div>
                  )}

                  <div className="col-span-2 md:col-span-3 pt-2">
                    <PaymentAttachmentsManager
                      data={{
                        invoicePdfUrl: selectedDetailPayment.invoicePdfUrl,
                        invoicePdfName: selectedDetailPayment.invoicePdfName,
                        invoiceXmlUrl: selectedDetailPayment.invoiceXmlUrl,
                        invoiceXmlName: selectedDetailPayment.invoiceXmlName,
                        receiptPdfUrl: selectedDetailPayment.receiptPdfUrl || selectedDetailPayment.attachmentUrl,
                        receiptPdfName: selectedDetailPayment.receiptPdfName,
                      }}
                      readOnly={true}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-2.5">
                  <div>
                    {isSuperAdminOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentToDelete(selectedDetailPayment.id);
                          setIsDetailPaymentModalOpen(false);
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        Eliminar Pago
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailPaymentModalOpen(false);
                        setSelectedDetailPayment(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
                    >
                      Cerrar
                    </button>
                    {isUserAdminOrSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditPaymentMode(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-1.5 border-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form onSubmit={handleEditPaymentSubmit} className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Descripción / Concepto del Pago</label>
                    <input
                      type="text"
                      required
                      value={editPaymentForm.description}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Monto</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editPaymentForm.amount}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Moneda</label>
                    <select
                      value={editPaymentForm.currency}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Tipo de Cambio</label>
                    <input
                      type="number"
                      step="any"
                      required={editPaymentForm.currency === 'MXN'}
                      disabled={editPaymentForm.currency === 'USD'}
                      value={editPaymentForm.currency === 'USD' ? '1.0' : editPaymentForm.exchangeRate}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={formatToInputDate(editPaymentForm.date)}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Método de Pago</label>
                    <select
                      value={editPaymentForm.paymentMethod}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    >
                      {catalogs['Métodos de Pago']?.map((m: any) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      )) || (
                        <>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta de Credito">Tarjeta de Crédito</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Efectivo">Efectivo</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Cuenta Bancaria</label>
                    <select
                      value={editPaymentForm.bankAccountId}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    >
                      <option value="">No aplica / Sin especificar</option>
                      {catalogs['Cuentas bancarias']?.map((b: any) => (
                        <option key={b.id} value={b.name}>{b.name} {b.companyName ? `(${b.companyName})` : ''}</option>
                      )) || (
                        <>
                          <option value="Banorte">Banorte</option>
                          <option value="WellsFargo USA">WellsFargo USA</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Estado de Pago</label>
                    <select
                      value={editPaymentForm.status}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    >
                      <option value="Pagado">Pagado</option>
                      <option value="Aplicado">Aplicado (Pagado)</option>
                      <option value="Programado">Programado (Pendiente)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">ID de Factura / Tax ID</label>
                    <input
                      type="text"
                      placeholder="Ej. FAC-99052"
                      value={editPaymentForm.taxId}
                      onChange={(e) => setEditPaymentForm(prev => ({ ...prev, taxId: e.target.value }))}
                      className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    />
                  </div>

                  {editPaymentForm.paymentMethod?.toLowerCase().includes('flywire') && (
                    <div className="col-span-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-center w-full animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black uppercase text-indigo-900 tracking-wider mb-1">Liga de Pago Flywire</label>
                        <input
                          type="text"
                          value={editPaymentForm.paymentLink || ''}
                          onChange={e => setEditPaymentForm(prev => ({ ...prev, paymentLink: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-mono"
                          placeholder="https://payment.flywire.com/..."
                        />
                      </div>
                      {editPaymentForm.paymentLink && (
                        <a
                          href={editPaymentForm.paymentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 sm:mt-0 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition"
                        >
                          Probar
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <PaymentAttachmentsManager
                    data={{
                      invoicePdfUrl: editPaymentForm.invoicePdfUrl,
                      invoicePdfName: editPaymentForm.invoicePdfName,
                      invoiceXmlUrl: editPaymentForm.invoiceXmlUrl,
                      invoiceXmlName: editPaymentForm.invoiceXmlName,
                      receiptPdfUrl: editPaymentForm.receiptPdfUrl || editPaymentForm.attachmentUrl,
                      receiptPdfName: editPaymentForm.receiptPdfName,
                    }}
                    onChange={(newData) => {
                      setEditPaymentForm(prev => ({
                        ...prev,
                        invoicePdfUrl: newData.invoicePdfUrl || '',
                        invoicePdfName: newData.invoicePdfName || '',
                        invoiceXmlUrl: newData.invoiceXmlUrl || '',
                        invoiceXmlName: newData.invoiceXmlName || '',
                        receiptPdfUrl: newData.receiptPdfUrl || '',
                        receiptPdfName: newData.receiptPdfName || '',
                        attachmentUrl: newData.receiptPdfName || '',
                      }));
                    }}
                    onExtractTaxId={(uuid) => {
                      if (uuid && !editPaymentForm.taxId) {
                        setEditPaymentForm(prev => ({ ...prev, taxId: uuid }));
                      }
                    }}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-2">
                  <div>
                    {isSuperAdminOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentToDelete(selectedDetailPayment.id);
                          setIsDetailPaymentModalOpen(false);
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        Eliminar Pago
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditPaymentMode(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer border-0"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setSelectedEmailPayment(null);
        }}
        title="Enviar Notificación de Cobro por Correo"
        size="2xl"
      >
        {selectedEmailPayment && (
          <form onSubmit={handleSendEmailSubmit} className="space-y-5">
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
              Configura y previsualiza el correo de cobro que se enviará al contacto de la institución <strong className="text-slate-800">{institution?.name}</strong>. Al hacer clic en enviar, se abrirá tu cliente de correo predeterminado y se guardará el registro en la bitácora de la institución.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Destinatario (Contacto del Colegio)</label>
                <select
                  value={emailRecipientContactId}
                  onChange={(e) => handleEmailContactChange(e.target.value, emailBankAccountId)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                >
                  {instContacts.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name} {c.lastName} ({c.email || 'Sin correo'})
                    </option>
                  ))}
                  <option value="manual">-- Ingresar correo manualmente --</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Cuenta Bancaria para Transferencia</label>
                <select
                  value={emailBankAccountId}
                  onChange={(e) => handleEmailBankChange(e.target.value, emailRecipientContactId)}
                  className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                >
                  <option value="">-- Sin especificar / Usar plantilla --</option>
                  {(catalogs['Cuentas bancarias'] || []).map((b: any) => (
                    <option key={b.id} value={b.id.toString()}>
                      {b.name} {b.companyName ? `(${b.companyName})` : ''} ({b.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">CC (Con copia para...)</label>
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="ejemplo@colegio.com, otro@colegio.com"
                  className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">CCO / BCC (Con copia oculta para...)</label>
                <input
                  type="text"
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                  placeholder="oculto@colegio.com"
                  className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                />
              </div>
            </div>

            {emailRecipientContactId === "manual" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-800 tracking-wider mb-1">Nombre del Destinatario</label>
                  <input
                    type="text"
                    required
                    value={emailManualContactName}
                    onChange={(e) => {
                      setEmailManualContactName(e.target.value);
                      const catalogBankAccounts = catalogs['Cuentas bancarias'] || [];
                      const bankAcc = catalogBankAccounts.find((b: any) => b.id.toString() === emailBankAccountId);
                      const body = generateEmailBody(selectedEmailPayment, e.target.value, bankAcc);
                      setEmailBody(body);
                    }}
                    placeholder="Ej. Juan Pérez"
                    className="w-full rounded-xl border-amber-200 bg-white text-xs focus:border-amber-500 focus:ring-amber-500 p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-800 tracking-wider mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={emailManualContactEmail}
                    onChange={(e) => setEmailManualContactEmail(e.target.value)}
                    placeholder="ejemplo@colegio.com"
                    className="w-full rounded-xl border-amber-200 bg-white text-xs focus:border-amber-500 focus:ring-amber-500 p-2.5"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Asunto del Correo</label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-2.5 font-bold text-slate-800"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuerpo del Correo</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(emailBody);
                    alert("Cuerpo del correo copiado al portapapeles.");
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer border-0 bg-transparent flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Copiar Cuerpo
                </button>
              </div>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={14}
                className="w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 p-3 font-mono leading-relaxed"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setSelectedEmailPayment(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer border-0 flex items-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Abrir en Cliente de Correo
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={paymentToDelete !== null}
        onClose={() => setPaymentToDelete(null)}
        title="Confirmar eliminación de registro de pago institucional"
      >
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-rose-800">
            <Trash2 className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-bold leading-snug">¿Está seguro de que desea eliminar permanentemente este registro de pago?</p>
              <p className="text-[11px] text-rose-600/80">Esta acción no se puede deshacer y afectará el balance y estado de cuenta de la institución.</p>
            </div>
          </div>

          {paymentToDelete && (() => {
            const tx = financialTransactions.find(t => String(t.id) === String(paymentToDelete));
            if (!tx) return null;
            const studentObj = tx.studentId ? students.find(s => String(s.id) === String(tx.studentId)) : null;

            return (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">ID Pago:</span>
                  <span className="font-mono font-bold text-slate-800">TRX-{String(tx.id).slice(-4)} ({tx.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Concepto:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[260px] truncate">{tx.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Monto:</span>
                  <span className="font-black font-mono text-sm text-slate-900">
                    ${(tx.finalAmount !== undefined ? tx.finalAmount : (tx.originalAmount !== undefined ? tx.originalAmount : tx.amount)).toLocaleString()} {tx.originalCurrency || tx.currency || 'USD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Fecha:</span>
                  <span className="font-mono text-slate-700">{tx.date}</span>
                </div>
                {studentObj && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Alumno Asociado:</span>
                    <span className="font-bold text-slate-800">{studentObj.name} {studentObj.lastName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">Método:</span>
                  <span className="font-bold text-slate-700">{tx.paymentMethod || 'Transferencia'}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaymentToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-0"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (paymentToDelete) {
                  deleteFinancialTransaction(paymentToDelete);
                  if (institution) {
                    addActivity({
                      institutionId: institution.id,
                      date: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                      description: `Finanzas: Se eliminó el pago con ID TRX-${String(paymentToDelete).slice(-4)} previa confirmación.`,
                    });
                  }
                  setPaymentToDelete(null);
                  setSelectedDetailPayment(null);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 inline-flex items-center gap-1.5 cursor-pointer border-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Sí, eliminar permanentemente
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Calificación y Estatus Académico (Pass / Fail) */}
      <Modal
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false);
          setSelectedEnrollmentForGrade(null);
        }}
        title="Registrar Resultado Académico (Pass / Fail)"
        size="lg"
      >
        {selectedEnrollmentForGrade && (
          <form onSubmit={handleSaveGradeOutcome} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Alumno</span>
                <span className="text-xs font-bold text-slate-800">{selectedEnrollmentForGrade.student.name} {selectedEnrollmentForGrade.student.lastName || ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Materia</span>
                <span className="text-xs font-bold text-indigo-700">{selectedEnrollmentForGrade.cls.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo de Crédito</span>
                <span className="text-xs font-semibold text-slate-600">
                  {selectedEnrollmentForGrade.creditTypeCategory === 'Full' ? 'Full Credit (1.0 Crédito)' : 'Half Credit (0.5 Crédito)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Resultado Académico (Pass / Fail) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGradeModalForm(prev => ({ ...prev, gradeOutcome: 'Pass' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    gradeModalForm.gradeOutcome === 'Pass'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold">Pass (Aprobado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradeModalForm(prev => ({ ...prev, gradeOutcome: 'Fail' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    gradeModalForm.gradeOutcome === 'Fail'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span className="text-xs font-bold">Fail (Reprobado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradeModalForm(prev => ({ ...prev, gradeOutcome: 'Pendiente' }))}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                    gradeModalForm.gradeOutcome === 'Pendiente'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold">En Curso / Pendiente</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Calificación Numérica / Letra (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 9.5, 95%, A+, etc."
                  value={gradeModalForm.finalGrade}
                  onChange={(e) => setGradeModalForm(prev => ({ ...prev, finalGrade: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Calificación / Emisión
                </label>
                <input
                  type="date"
                  value={gradeModalForm.gradeDate}
                  onChange={(e) => setGradeModalForm(prev => ({ ...prev, gradeDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observaciones / Notas Académicas
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre el desempeño, entrega de certificados, etc."
                value={gradeModalForm.gradeNotes}
                onChange={(e) => setGradeModalForm(prev => ({ ...prev, gradeNotes: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsGradeModalOpen(false);
                  setSelectedEnrollmentForGrade(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 cursor-pointer border-0"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar Resultado
              </button>
            </div>
          </form>
        )}
      </Modal>

      <InstitutionFinancialReportModal
        isOpen={isFinancialReportModalOpen}
        onClose={() => setIsFinancialReportModalOpen(false)}
        institution={institution}
        students={students}
        enrollments={enrollments}
        classes={classes}
        catalogs={catalogs}
        providerProductServices={providerProductServices}
        providers={providers}
        financialTransactions={financialTransactions}
        users={users}
        companyInfo={companyInfo}
        bankAccounts={bankAccounts}
        isUserAdminOrSuperAdmin={isUserAdminOrSuperAdmin}
        initialType={financialReportInitialType}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-250" id="custom-delete-confirm-inst">
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
                id="inst-delete-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                id="inst-delete-confirm"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
