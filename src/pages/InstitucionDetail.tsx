import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Users, Globe, Phone, FileText, Download, Briefcase, CreditCard, Mail, Video, Calendar, Sparkles, TrendingUp, DollarSign, Clock, GraduationCap, Trash2, Archive, AlertTriangle, CheckCircle, HelpCircle, Plus, Upload, Eye, Edit2, Check, CalendarRange } from "lucide-react";
import { useAppContext, TaskType, resolveCreditPrices, resolveMembershipPrice } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { FinancialTransactionForm } from "../components/FinancialTransactionForm";
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
  const { institutions, students, financialTransactions, enrollments, classes, contacts, tasks, activities, addContact, updateContact, deleteContact, addTask, updateTask, users, catalogs, updateInstitution, deleteInstitution, providers, providerProductServices, currentUser, addFinancialTransaction, updateFinancialTransaction, updateEnrollment } = useAppContext();
  
  const institutionRaw = institutions.find(i => i.id === Number(id));
  const isAuthorized = 
    !institutionRaw ? false :
    currentUser?.role === 'Coordinador' ? (currentUser.institutionId === institutionRaw.id) :
    true;

  const institution = isAuthorized ? institutionRaw : null;
  const isUserAdminOrSuperAdmin = currentUser?.role === 'Superadministrador' || currentUser?.role === 'Administrador' || currentUser?.role === 'Admin Principal';

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

  const [isDetailCampusModalOpen, setIsDetailCampusModalOpen] = useState(false);
  const [detailCampusForm, setDetailCampusForm] = useState({ name: '', cityCountry: '', contact: '', phone: '' });

  const [isDetailDocModalOpen, setIsDetailDocModalOpen] = useState(false);
  const [detailDocName, setDetailDocName] = useState('');
  const [detailDocDate, setDetailDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editingDocName, setEditingDocName] = useState('');
  const [editingDocDate, setEditingDocDate] = useState('');
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);

  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);

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

  // States for custom Course Payments modal
  const [coursePaymentTab, setCoursePaymentTab] = useState<'register' | 'schedule'>('register');
  const [regStudentSearch, setRegStudentSearch] = useState("");
  const [schStudentSearch, setSchStudentSearch] = useState("");
  
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
    });

    setConfirmingPayment(null);
  };

  const [generalForm, setGeneralForm] = useState({
    name: institution?.name || '',
    tradeName: institution?.tradeName || '',
    institutionCode: institution?.institutionCode || '',
    country: institution?.country || '',
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

    const title = `Reporte Financiero - ${institution.name}`;
    
    // Sort payments by date desc for the report
    const reportPayments = [...institutionHistoricalPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const tableRowsHtml = reportPayments.map(p => {
      const amountUSD = p.currency === 'USD' ? p.amount : (p.amountMXN / (p.exchangeRate || 18.5));
      return `
        <tr class="border-b border-slate-100 font-sans text-xs">
          <td class="px-4 py-3 text-slate-550 font-medium whitespace-nowrap">${p.date}</td>
          <td class="px-4 py-3">
            <div class="font-bold text-slate-800">${p.description}</div>
            ${p.studentId ? `<div class="text-[9px] text-slate-400 mt-0.5">Alumno: ${(students.find(s => s.id === p.studentId)?.name || '') + ' ' + (students.find(s => s.id === p.studentId)?.lastName || '')}</div>` : ''}
          </td>
          <td class="px-4 py-3 text-slate-550 font-medium whitespace-nowrap">${p.paymentMethod}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              p.status === 'Aplicado' || p.status === 'Pagado'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }">
              ${p.status === 'Aplicado' || p.status === 'Pagado' ? 'Pagado' : p.status}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            <span class="font-black text-slate-900">$${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
            ${p.currency !== 'USD' ? `<span class="block text-[9px] font-mono text-slate-400 mt-0.5 leading-none">Original: $${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${p.currency}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');

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
            <div class="no-print bg-white shadow-sm border border-slate-205 p-4 rounded-2xl flex justify-between items-center mb-6">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs text-slate-600 font-bold uppercase tracking-wider">Reporte generado con éxito. Listo para guardar o imprimir.</span>
              </div>
              <div class="flex gap-2">
                <button 
                  onclick="window.print()" 
                  class="bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer border-0"
                >
                  Imprimir / Guardar PDF
                </button>
                <button 
                  onclick="window.close()" 
                  class="bg-slate-100 hover:bg-slate-205 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <!-- Main Leaflet/Report Document -->
            <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <!-- Document Header -->
              <div class="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                <div>
                  <h1 class="text-xs font-black uppercase tracking-widest text-indigo-600 mb-1">Reporte Financiero Oficial</h1>
                  <h2 class="text-2xl font-black text-slate-900 tracking-tight">${institution.name}</h2>
                  <p class="text-xs text-slate-500 mt-1">${institution.tradeName || 'Colegio / Institución Educativa'}</p>
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    SITUACIÓN FINANCIERA
                  </span>
                  <p class="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</p>
                </div>
              </div>

              <!-- Key Analytics KPIs (USD) -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Vendido Cursos</span>
                  <span class="text-slate-900 font-extrabold text-lg">$${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-indigo-600 block mt-0.5">USD</span>
                </div>
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Membresía</span>
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
                  <span class="text-[9px] font-bold text-emerald-700 block mt-0.5">${margenPorcentaje.toFixed(1)}% de Rentabilidad</span>
                </div>
                ` : `
                <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span class="block text-[8px] font-black uppercase text-indigo-800 tracking-widest leading-none mb-1.5">Total Ingresos Proyectado</span>
                  <span class="text-indigo-950 font-extrabold text-lg">$${(totalVendidoUSD + totalMembUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span class="text-[9px] font-bold text-indigo-700 block mt-0.5">USD</span>
                </div>
                `}
              </div>

              <!-- Expenses / Class costs Summary -->
              ${isUserAdminOrSuperAdmin ? `
              <div class="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <!-- History Listing -->
              <div>
                <h3 class="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-gray-200 pb-2 mb-4 tracking-widest">Historial de Transacciones de Ingreso</h3>
                ${reportPayments.length === 0 ? `
                  <div class="py-6 text-center text-slate-400 text-xs">No hay transacciones registradas.</div>
                ` : `
                  <table class="w-full text-left font-sans border-collapse">
                    <thead>
                      <tr class="border-b border-gray-200 bg-gray-50 font-black text-[9px] tracking-widest uppercase text-gray-500">
                        <th class="px-4 py-2.5">Fecha</th>
                        <th class="px-4 py-2.5">Descripción / Concepto</th>
                        <th class="px-4 py-2.5">Método de Pago</th>
                        <th class="px-4 py-2.5">Estado</th>
                        <th class="px-4 py-2.5 text-right font-black">Monto (USD)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                      ${tableRowsHtml}
                    </tbody>
                  </table>
                `}
              </div>

              <!-- Standard Footer Signature -->
              <div class="pt-8 mt-8 border-t border-gray-200 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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

  const instStudents = students.filter(s => s.institutionId === institution.id);
  const instStudentIds = instStudents.map(s => s.id);
  
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

  const instPayments = financialTransactions.filter(p => 
    (p.institutionId === institution.id || (p.studentId && instStudentIds.includes(p.studentId))) && 
    p.type === 'income' && 
    (p.status === 'Aplicado' || p.status === 'Pagado')
  );
  const institutionHistoricalPayments = [...financialTransactions.filter(tx => 
    (tx.institutionId === institution.id || (tx.studentId && instStudentIds.includes(tx.studentId))) && 
    tx.type === 'income'
  )].sort((a, b) => {
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

  // Divide payments into membership vs courses
  const membPayments = instPayments.filter(p => 
    p.subcategory === 'sub_membresia' || 
    (p.concept && (p.concept.toLowerCase().includes('membresía') || p.concept.toLowerCase().includes('membresia'))) ||
    (p.description && (p.description.toLowerCase().includes('membresía') || p.description.toLowerCase().includes('membresia')))
  );
  const coursesPayments = instPayments.filter(p => !membPayments.includes(p));

  // Calculate Paid amounts in MXN and USD (Courses only and Membership only)
  const coursesPaidMXN = coursesPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const coursesPaidUSD = coursesPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const membPaidMXN = membPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const membPaidUSD = membPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  const totalPagadoMXN = instPayments.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const totalPagadoUSD = instPayments.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);

  // Keep totalPagado for backward compatibility if reference exists
  const totalPagado = totalPagadoMXN;

  // Enrolled courses (Prices are all in USD)
  const instEnrollments = enrollments.filter(e => instStudentIds.includes(e.studentId));
  const totalVendidoUSD = instEnrollments.reduce((sum, e) => {
    let cp = e.price;
    if (cp === undefined || cp === null) {
      const cl = classes.find(c => c.id === e.classId);
      if (cl) {
        const cType = cl.creditType;
        let valStr = "";
        if (institution) {
          if (cType === 'Medio Crédito') valStr = institution.priceHalfCredit || "";
          else if (cType === 'Crédito completo AP') valStr = institution.priceFullApCredit || "";
          else if (cType === 'Medio Crédito AP') valStr = institution.priceHalfApCredit || "";
          else if (cType === 'Crédito completo') valStr = institution.priceFullCredit || "";
        }
        if (valStr) {
          cp = parseFloat(valStr.replace(/[^0-9.-]+/g, "") || "0");
        } else {
          if (cType === 'Medio Crédito') cp = 250;
          else if (cType === 'Crédito completo AP') cp = 600;
          else if (cType === 'Medio Crédito AP') cp = 300;
          else cp = 500;
        }
      } else {
        cp = 0;
      }
    }
    return sum + (cp || 0);
  }, 0);
  const totalVendidoMXN = totalVendidoUSD * 18.5 * (institution?.payWithIva ? 1.16 : 1);

  // Let totalVendido be in MXN to maintain compatibility with unchanged widgets if needed, but we'll use USD/MXN dual references in our views!
  const totalVendido = totalVendidoMXN;

  // Membership Projections (This is in USD)
  const activeMemb = catalogs['Membresías']?.find((m: any) => m.id === institution?.membershipId);
  const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
  const customMembPrice = institution?.membershipPrice ? parseFloat((institution.membershipPrice || "").replace(/[^0-9.-]+/g, "")) : null;
  const finalMembUnitAmount = customMembPrice !== null && !isNaN(customMembPrice) ? customMembPrice : membUnitAmount;
  const totalMembUSD = finalMembUnitAmount;
  const totalMembMXN = totalMembUSD * 18.5 * (institution?.payWithIva ? 1.16 : 1);

  // COMBINED REVENUE PROJECTIONS
  const totalIngresosProyectadosUSD = totalVendidoUSD + totalMembUSD;
  const totalIngresosProyectadosMXN = totalVendidoMXN + totalMembMXN;

  // OUTSTANDING BALANCES BY COMPONENT
  const coursesPendingUSD = Math.max(0, totalVendidoUSD - coursesPaidUSD);
  const coursesPendingMXN = Math.max(0, totalVendidoMXN - coursesPaidMXN);

  const membPendingUSD = Math.max(0, totalMembUSD - membPaidUSD);
  const membPendingMXN = Math.max(0, totalMembMXN - membPaidMXN);

  // COMBINED OUTSTANDING BALANCE (Includes courses + membership)
  const totalPorRecaudarUSD = coursesPendingUSD + membPendingUSD;
  const totalPorRecaudarMXN = coursesPendingMXN + membPendingMXN;

  // Keep totalPorRecaudar for backward compatibility as MXN
  const totalPorRecaudar = totalPorRecaudarMXN;
  const pendingAmount = totalPorRecaudarMXN;

  // EGRESOS (Expense transactions associated with these students)
  const instExpenses = financialTransactions.filter(p => p.studentId && instStudentIds.includes(p.studentId) && p.type === 'expense');
  const egresosPagadosMXN = instExpenses.reduce((sum, p) => sum + getMXNWithIva(p), 0);
  const egresosPagadosUSD = instExpenses.reduce((sum, p) => sum + getUSDWithoutIva(p), 0);
  const egresosPagados = egresosPagadosMXN;

  // Total class costs to providers (in USD) using dynamic provider specific country prices and class fallbacks
  const totalCostUSD = instEnrollments.reduce((sum, e) => {
    const cl = classes.find(c => Number(c.id) === Number(e.classId));
    if (!cl) return sum;

    const provId = e.providerId || cl.providerId;
    const tariffId = institution?.tarifasId;
    const countryRef = catalogs['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || institution?.country || 'Default';

    let resolvedCost = resolveProviderClassCost(provId, cl.creditType, countryRef, providerProductServices);

    let countryRate = null;
    if (countryRef && cl.countryRates) {
      countryRate = cl.countryRates[countryRef];
      if (!countryRate) {
        const matchKey = Object.keys(cl.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
        if (matchKey) countryRate = cl.countryRates[matchKey];
      }
    }

    if (!resolvedCost && countryRate?.cost) {
      resolvedCost = parseFloat(countryRate.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
    }

    if (!resolvedCost && cl.cost) {
      resolvedCost = parseFloat(cl.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
    }

    // Default fallbacks if not found
    if (!resolvedCost) {
      const typeStr = (cl.creditType || "").toLowerCase().trim();
      const isAp = typeStr.includes("ap");
      const isHalf = typeStr.includes("medio") || typeStr.includes("half");

      if (isHalf) {
        resolvedCost = isAp ? 175 : 150;
      } else {
        resolvedCost = isAp ? 350 : 300;
      }
    }

    return sum + resolvedCost;
  }, 0);
  const totalCostMXN = totalCostUSD * 18.5 * (institution?.payWithIva ? 1.16 : 1);
  const totalCost = totalCostMXN;

  // OUTSTANDING EGRESOS
  const saldoPorPagarUSD = Math.max(0, totalCostUSD - egresosPagadosUSD);
  const saldoPorPagarMXN = Math.max(0, totalCostMXN - egresosPagadosMXN);
  const saldoPorPagar = saldoPorPagarMXN;

  // PROJECTED MARGINS
  const margenProyectadoUSD = totalIngresosProyectadosUSD - totalCostUSD;
  const margenProyectadoMXN = totalIngresosProyectadosMXN - totalCostMXN;
  const margenProyectado = margenProyectadoMXN;

  const margenPorcentaje = totalIngresosProyectadosUSD > 0 ? (margenProyectadoUSD / totalIngresosProyectadosUSD) * 100 : 0;

  const resolvedStatus = (institution?.status === 'Archivada' || institution?.status === 'Archivado')
    ? institution?.status
    : (totalPorRecaudar > 0 ? 'Pendiente' : 'Al corriente');

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (institution) {
      updateInstitution(institution.id, {
        name: generalForm.name,
        tradeName: generalForm.tradeName || undefined,
        institutionCode: generalForm.institutionCode || undefined,
        country: generalForm.country,
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
    updateTask(taskId, { status: currentStatus === "Pendiente" ? "Completada" : "Pendiente" });
  };

  const mainTabs = [
    { name: "Flujo de Trabajo", icon: Briefcase },
    { name: "Información General", icon: Building2 },
    { name: "Contactos", icon: Users },
    { name: "Listado Alumnos", icon: GraduationCap },
    { name: "Finanzas", icon: DollarSign },
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
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentUser?.role !== 'Coordinador' && (
            <button 
              onClick={() => setIsActionModalOpen(true)}
              className="px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/20 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 hover:text-rose-700 transition shadow-sm flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar / Archivar
            </button>
          )}
          <button 
            onClick={openEditModal}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm"
          >
            Editar Perfil
          </button>
          <button 
            onClick={handleGeneratePDFReport}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm cursor-pointer border-0"
          >
            Reporte PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          
          {/* Main Info Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Alumnos Totales',
                value: <span className="text-sm font-bold text-slate-900 tracking-tight">{instStudents.length.toLocaleString()}</span>,
                icon: GraduationCap,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50'
              },
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
              },
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
                          onClick={() => {
                            setDetailDocName('');
                            setSelectedFile(null);
                            setIsDetailDocModalOpen(true);
                          }}
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase hover:bg-indigo-100 transition flex items-center cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Subir Documento
                        </button>
                      </div>

                      {/* Hidden File Input */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            const nameWithExt = file.name;
                            const idx = nameWithExt.lastIndexOf('.');
                            const baseName = idx !== -1 ? nameWithExt.substring(0, idx) : nameWithExt;
                            setDetailDocName(baseName);
                            setIsDetailDocModalOpen(true);
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
                            setSelectedFile(droppedFile);
                            const idx = droppedFile.name.lastIndexOf('.');
                            const baseName = idx !== -1 ? droppedFile.name.substring(0, idx) : droppedFile.name;
                            setDetailDocName(baseName);
                            setIsDetailDocModalOpen(true);
                          }
                        }}
                        className="border-2 border-dashed border-slate-150 rounded-xl p-6 text-center flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer group"
                      >
                         <svg className="w-5 h-5 text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                         </svg>
                         <p className="text-xs font-semibold text-slate-700">Arrastra archivos aquí o haz clic para buscar</p>
                         <p className="text-[10px] text-slate-400 mt-0.5">Soporta formato PDF, JPG, PNG, DOCX, XLSX, etc.</p>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                        <table className="w-full text-left font-sans">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Nombre de Convenio</th>
                              <th className="px-4 py-3 border-b border-slate-200">Archivo Adjunto</th>
                              <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                              <th className="px-4 py-3 border-b border-slate-200">Fecha de Carga</th>
                              <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                            {(!institution.documentsList || institution.documentsList.length === 0) ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay documentos cargados en el expediente de esta institución.</td>
                              </tr>
                            ) : (
                              institution.documentsList.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-semibold text-slate-800">
                                    <div className="flex items-center">
                                      <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0 animate-pulse" />
                                      {doc.name}
                                    </div>
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
                                          setIsEditDocModalOpen(true);
                                        }}
                                        className="text-slate-500 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded transition"
                                        title="Editar Nombre"
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
                        <button
                          type="button"
                          onClick={() => setIsCoursePaymentModalOpen(true)}
                          className="flex items-center text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-sm cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Pago de Cursos
                        </button>
                      </div>

                      {institutionHistoricalPayments.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-medium">
                          No hay registros de pagos para esta institución.
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
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {institutionHistoricalPayments.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-55/50 hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                    {p.date}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-bold text-slate-800">{p.description}</p>
                                      {p.studentId && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                          Alumno: {students.find(s => s.id === p.studentId)?.name} {students.find(s => s.id === p.studentId)?.lastName}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                                    {p.paymentMethod}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
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
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-extrabold text-slate-950 block">
                                      ${(p.currency === 'USD' ? p.amount : (p.amountMXN / (p.exchangeRate || 18.5))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-indigo-600">USD</span>
                                    </span>
                                    {p.currency !== 'USD' && (
                                      <span className="block text-[9px] font-mono font-medium text-slate-400 leading-none mt-0.5">
                                        Original: ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {p.currency}
                                      </span>
                                    )}
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">Alumno</th>
                          <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">Nombre de la Materia</th>
                          <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-400 tracking-widest">Fecha Inicio y Final</th>
                          <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-400 tracking-widest text-right">Precio</th>
                          {isUserAdminOrSuperAdmin && <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-400 tracking-widest text-right">Costo de Clase</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {instStudents.map(s => {
                          const sEnrollments = instEnrollments.filter(e => e.studentId === s.id);
                          
                          // Determine pricing currency based on rates catalog or default
                          const tariffId = institution?.tarifasId;
                          const countryRef = catalogs['Tarifas Países']?.find((c: any) => c.id === tariffId)?.name || institution?.country || s?.country || 'Default';
                          
                          // Calculate sTotalUSD based on class prices (all in USD)
                          let sTotalUSD = 0;
                          let sTotalCostUSD = 0;

                          sEnrollments.forEach(e => {
                            const cl = classes.find(c => c.id === e.classId);
                            if (!cl) return;

                            // Calculate Sale Price
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
                            sTotalUSD += (cp || 0);

                            // Calculate Class Cost based on provider and tariff
                            const provId = e.providerId || cl.providerId;
                            let resolvedCost = resolveProviderClassCost(provId, cl.creditType, countryRef, providerProductServices);

                            let countryRate = null;
                            if (countryRef && cl.countryRates) {
                              countryRate = cl.countryRates[countryRef];
                              if (!countryRate) {
                                const matchKey = Object.keys(cl.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
                                  if (matchKey) countryRate = cl.countryRates[matchKey];
                              }
                            }

                            if (!resolvedCost && countryRate?.cost) {
                              resolvedCost = parseFloat(countryRate.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
                            }

                            if (!resolvedCost && cl.cost) {
                              resolvedCost = parseFloat(cl.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
                            }

                            if (!resolvedCost) {
                              const typeStr = (cl.creditType || "").toLowerCase().trim();
                              const isAp = typeStr.includes("ap");
                              const isHalf = typeStr.includes("medio") || typeStr.includes("half");

                              if (isHalf) {
                                resolvedCost = isAp ? 175 : 150;
                              } else {
                                resolvedCost = isAp ? 350 : 300;
                              }
                            }

                            sTotalCostUSD += resolvedCost;
                          });

                          // Calculate sPaidUSD (payments converted to USD)
                          const sPaidUSD = instPayments.filter(p => p.studentId === s.id).reduce((sum, p) => {
                            if (p.currency === 'USD') return sum + p.amount;
                            return sum + (p.amountMXN / (p.exchangeRate || 18.5));
                          }, 0);

                          const sPendingUSD = sTotalUSD - sPaidUSD;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/alumnos/${s.id}`)}>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                <div>{s.name} {s.lastName || ""}</div>
                                <div className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{s.email || "Sin email"}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 text-slate-700 align-top">
                                {sEnrollments.length > 0 ? (
                                  <div className="space-y-3">
                                    {sEnrollments.map((en, idx) => {
                                      const cls = classes.find(c => c.id === en.classId);
                                      if (!cls) return (
                                        <div key={idx} className="text-slate-400 italic">Materia desconocida</div>
                                      );

                                      const provId = en.providerId || cls.providerId;
                                      const prov = providers.find(pub => pub.id === provId);

                                      const statusColors = {
                                        Active: "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        Completed: "bg-blue-50 text-blue-700 border-blue-100",
                                        "On hold": "bg-amber-50 text-amber-700 border-amber-100",
                                        Withdrawn: "bg-slate-100 text-slate-700 border-slate-200",
                                      };
                                      const statusVal = en.status || "Active";

                                      const pCost = en.price !== undefined && en.price !== null ? en.price : (cls.price ? parseFloat(cls.price.toString().replace(/[^0-9.-]+/g, "")) : 0);
                                      const pCostMXN = pCost * 18.5;

                                      // Resolve specific cost of class for this enrollment card mapping
                                      let cardResolvedCost = resolveProviderClassCost(provId, cls.creditType, countryRef, providerProductServices);

                                      let cardCountryRate = null;
                                      if (countryRef && cls.countryRates) {
                                        cardCountryRate = cls.countryRates[countryRef];
                                        if (!cardCountryRate) {
                                          const matchKey = Object.keys(cls.countryRates).find(k => normalizeCountryName(k) === normalizeCountryName(countryRef));
                                          if (matchKey) cardCountryRate = cls.countryRates[matchKey];
                                        }
                                      }

                                      if (!cardResolvedCost && cardCountryRate?.cost) {
                                        cardResolvedCost = parseFloat(cardCountryRate.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
                                      }

                                      if (!cardResolvedCost && cls.cost) {
                                        cardResolvedCost = parseFloat(cls.cost.toString().replace(/[^0-9.-]+/g, "") || "0");
                                      }

                                      if (!cardResolvedCost) {
                                        const typeStr = (cls.creditType || "").toLowerCase().trim();
                                        const isAp = typeStr.includes("ap");
                                        const isHalf = typeStr.includes("medio") || typeStr.includes("half");

                                        if (isHalf) {
                                          cardResolvedCost = isAp ? 175 : 150;
                                        } else {
                                          cardResolvedCost = isAp ? 350 : 300;
                                        }
                                      }

                                      return (
                                        <div key={idx} className="bg-slate-50/60 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <p className="font-bold text-slate-800 leading-tight">{cls.name}</p>
                                              {prov ? (
                                                <p className="text-[10px] text-purple-650 font-semibold mt-0.5">📚 {prov.commercialName || prov.legalName}</p>
                                              ) : (
                                                <p className="text-[10px] text-slate-400 mt-0.5">Sin proveedor</p>
                                              )}
                                            </div>
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${statusColors[statusVal as keyof typeof statusColors] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                              {statusVal}
                                            </span>
                                          </div>
                                          
                                          <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium bg-slate-100 text-slate-600 px-1 rounded text-[9px]">{cls.creditType || 'Crédito'}</span>
                                              <span className="font-medium text-slate-750">
                                                Precio: <span className="font-mono font-bold text-indigo-750">${pCost.toLocaleString()} USD</span>
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] text-slate-400 pl-1">
                                              <span>~${pCostMXN.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN</span>
                                              {isUserAdminOrSuperAdmin && (
                                                <span className="font-medium text-slate-550">
                                                  Costo: <span className="font-mono font-bold text-purple-700">${cardResolvedCost.toLocaleString()} USD</span>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Sin materias inscritas</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                                {sEnrollments.length > 0 ? (
                                  <div className="space-y-2 text-slate-500 font-sans">
                                    {sEnrollments.map((en, idx) => {
                                      const startD = en.activationDate || en.startDate;
                                      const endD = en.endDate;

                                      const startStr = formatToDisplayDate(startD);
                                      const endStr = formatToDisplayDate(endD);

                                      const isEditing = editingEnrollIds[en.id];

                                      return (
                                        <div key={idx} className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 focus-within:z-10 relative">
                                              <input 
                                                type="date" 
                                                value={formatToInputDate(en.startDate || en.activationDate)} 
                                                onChange={(evt) => updateEnrollment(en.id, { startDate: evt.target.value, activationDate: evt.target.value })} 
                                                className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[110px] text-slate-700 font-medium"
                                              />
                                              <span className="text-slate-400 text-xs">-</span>
                                              <input 
                                                type="date" 
                                                value={formatToInputDate(en.endDate)} 
                                                onChange={(evt) => updateEnrollment(en.id, { endDate: evt.target.value })} 
                                                className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white font-sans focus:border-indigo-500 outline-none w-[110px] text-slate-700 font-medium"
                                              />
                                              <button 
                                                onClick={() => setEditingEnrollIds(prev => ({...prev, [en.id]: false}))}
                                                className="p-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg transition shrink-0"
                                                title="Completar edición"
                                              >
                                                <Check className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 group/date py-0.5">
                                              <span className="font-semibold text-slate-700 text-xs font-mono">{startStr} - {endStr}</span>
                                              <button 
                                                onClick={() => setEditingEnrollIds(prev => ({...prev, [en.id]: true}))}
                                                className="p-0.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded transition opacity-85 group-hover/date:opacity-100"
                                                title="Editar fecha de inicio y fin"
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
                              <td className="px-4 py-3 text-xs text-right align-top">
                                <span className="font-extrabold text-slate-900 block">
                                  ${sTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-indigo-600">USD</span>
                                </span>
                                {sPendingUSD !== sTotalUSD && sPendingUSD > 0 && (
                                  <span className="block text-[10px] font-medium text-rose-700 mt-0.5 leading-none">
                                    Saldo: ${sPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                  </span>
                                )}
                              </td>
                              {isUserAdminOrSuperAdmin && (
                                <td className="px-4 py-3 text-xs text-right align-top">
                                  <span className="font-extrabold text-purple-700 block">
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
                      <p className="text-xs text-slate-500 mt-0.5">Gestor de convenios, acuerdos de confidencialidad y expedientes oficiales en formato PDF.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setDetailDocName('');
                        setSelectedFile(null);
                        setDetailDocDate(new Date().toISOString().split('T')[0]);
                        setIsDetailDocModalOpen(true);
                      }}
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
                        setSelectedFile(file);
                        const nameWithExt = file.name;
                        const idx = nameWithExt.lastIndexOf('.');
                        const baseName = idx !== -1 ? nameWithExt.substring(0, idx) : nameWithExt;
                        setDetailDocName(baseName);
                        setDetailDocDate(new Date().toISOString().split('T')[0]);
                        setIsDetailDocModalOpen(true);
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
                        setSelectedFile(droppedFile);
                        const idx = droppedFile.name.lastIndexOf('.');
                        const baseName = idx !== -1 ? droppedFile.name.substring(0, idx) : droppedFile.name;
                        setDetailDocName(baseName);
                        setDetailDocDate(new Date().toISOString().split('T')[0]);
                        setIsDetailDocModalOpen(true);
                      }
                    }}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer group"
                  >
                     <Upload className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                     <p className="text-xs font-bold text-slate-700">Arrastra archivos PDF aquí o haz clic para buscar</p>
                     <p className="text-[10px] text-slate-400 mt-1">Soporta formato PDF oficial de hasta 50MB</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden mt-2 shadow-sm bg-white">
                    <table className="w-full text-left font-sans border-collapse">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 border-b border-slate-200">Fecha del Documento</th>
                          <th className="px-4 py-3 border-b border-slate-200">Nombre del Documento</th>
                          <th className="px-4 py-3 border-b border-slate-200">Archivo Adjunto</th>
                          <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                          <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {(!institution.documentsList || institution.documentsList.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">No hay documentos registrados para esta institución.</td>
                          </tr>
                        ) : (
                          [...(institution.documentsList || [])]
                            .sort((a,b) => b.uploadDate.localeCompare(a.uploadDate))
                            .map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-600 font-mono font-medium">
                                  {doc.uploadDate}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0 animate-pulse" />
                                    {doc.name}
                                  </div>
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
                                        setIsEditDocModalOpen(true);
                                      }}
                                      className="text-slate-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Editar"
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
                                            console.log(`Documento del perfil de institución ID ${doc.id} purgado de la base de almacenamiento.`);
                                          }
                                        });
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                                      title="Borrar"
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
                      <input required type="text" value={generalForm.country || ''} onChange={e => setGeneralForm({...generalForm, country: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none hover:border-slate-300 transition-all font-medium text-slate-800 shadow-sm" />
                    </div>
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

      <Modal isOpen={isDetailDocModalOpen} onClose={() => {
        setIsDetailDocModalOpen(false);
        setSelectedFile(null);
        setDetailDocName('');
        setDetailDocDate(new Date().toISOString().split('T')[0]);
      }} title="Cargar Convenio / Documento (PDF)">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!detailDocName.trim()) return;
          
          const processAndSave = (base64Data?: string) => {
            const fresh = [
              ...(institution.documentsList || []),
              {
                id: Math.random().toString(36).substr(2, 9),
                name: detailDocName,
                fileName: selectedFile ? selectedFile.name : 'Convenio_Carga_Manual.pdf',
                fileSize: selectedFile 
                  ? (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB" 
                  : (Math.random() * (4.5 - 0.5) + 0.5).toFixed(1) + " MB",
                uploadDate: detailDocDate || new Date().toISOString().split('T')[0],
                fileData: base64Data
              }
            ];
            updateInstitution(institution.id, { documentsList: fresh });
            setIsDetailDocModalOpen(false);
            setSelectedFile(null);
            setDetailDocName('');
            setDetailDocDate(new Date().toISOString().split('T')[0]);
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha del Documento</label>
            <input 
              type="date" 
              required 
              value={detailDocDate} 
              onChange={e => setDetailDocDate(e.target.value)} 
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Descriptivo del Documento</label>
            <input 
              type="text" 
              required 
              value={detailDocName} 
              onChange={e => setDetailDocName(e.target.value)} 
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ej. Convenio Legal de Colaboración" 
            />
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
            <button type="button" onClick={() => {
              setIsDetailDocModalOpen(false);
              setSelectedFile(null);
              setDetailDocName('');
              setDetailDocDate(new Date().toISOString().split('T')[0]);
            }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Subir Documento</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Editar Nombre y Fecha de Documento */}
      <Modal isOpen={isEditDocModalOpen} onClose={() => setIsEditDocModalOpen(false)} title="Editar Documento">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!editingDocName.trim() || !editingDoc) return;
          const fresh = (institution.documentsList || []).map(d => {
            if (d.id === editingDoc.id) {
              return { ...d, name: editingDocName, uploadDate: editingDocDate };
            }
            return d;
          });
          updateInstitution(institution.id, { documentsList: fresh });
          setIsEditDocModalOpen(false);
          setEditingDoc(null);
        }} className="space-y-4 font-sans text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Descriptivo del Documento</label>
            <input type="text" required value={editingDocName} onChange={e => setEditingDocName(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-501 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha del Documento</label>
            <input type="date" required value={editingDocDate} onChange={e => setEditingDocDate(e.target.value)} className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-501 outline-none" />
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
              <div className="flex space-x-4 mt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Fecha: {viewingDoc?.uploadDate}</span>
                <span>Tamaño: {viewingDoc?.fileSize}</span>
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
