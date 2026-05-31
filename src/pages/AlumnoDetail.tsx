import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Check,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  BookOpen,
  FileText,
  Globe,
  Flag,
  Hash,
  Edit2,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Edit3,
  ClipboardList,
  Eye,
  Download,
  GraduationCap,
  DollarSign,
  Bell,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { useAppContext, resolveCreditPrices } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";
import { FinancialTransactionForm } from "../components/FinancialTransactionForm";

export function AlumnoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    students,
    institutions,
    enrollments,
    classes,
    financialTransactions,
    deleteFinancialTransaction,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
    addActivity,
    activities,
    currentUser,
    updateStudent,
    deleteStudent,
    providers,
    catalogs,
    providerProductServices,
    addFinancialTransaction,
    updateFinancialTransaction,
  } = useAppContext();

  const studentRaw = students.find((s) => s.id === Number(id));
  
  const isEmailOrNameMatch = () => {
    if (!studentRaw || !currentUser) return false;
    const isEmailOk = currentUser.email && studentRaw.email && (currentUser.email.trim().toLowerCase() === studentRaw.email.trim().toLowerCase());
    const isNameOk = currentUser.name && studentRaw.name && (currentUser.name.trim().toLowerCase() === `${studentRaw.name} ${studentRaw.lastName || ''}`.trim().toLowerCase());
    return Boolean(isEmailOk || isNameOk);
  };

  const isAuthorized = 
    !studentRaw ? false :
    currentUser?.role === 'Alumno' ? (currentUser.studentId === studentRaw.id || isEmailOrNameMatch()) :
    currentUser?.role === 'Coordinador' ? (currentUser.institutionId === studentRaw.institutionId) :
    true;

  const student = isAuthorized ? studentRaw : null;
  const institution = student ? institutions.find((i) => i.id === student.institutionId) : null;

  const isHomeschool = student?.modality === "Homeschool";

  // States for custom Homeschool Course Payments modal (like institutions)
  const [isCoursePaymentModalOpen, setIsCoursePaymentModalOpen] = useState(false);
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
    studentId: student?.id?.toString() || '',
    studentIds: (student ? [student.id.toString()] : []) as string[],
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
    studentId: student?.id?.toString() || '',
    studentIds: (student ? [student.id.toString()] : []) as string[],
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
    if (!student) return;

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
        exchangeRate: regForm.currency === 'USD' ? 1 : rate,
        amountMXN: amtMxn,
        finalAmount: finAmt,
        status: 'Pagado',
        categoryId: 'cat_ingreso_servicios',
        subcategory: 'sub_cursos_ingreso',
        paymentMethod: regForm.paymentMethod,
        bankAccountId: regForm.bankAccountId,
        institutionId: student.institutionId || undefined,
        studentId: stIdStr ? Number(stIdStr) : undefined,
        taxId: regForm.taxId,
        agentId: currentUser?.id,
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
      studentId: student.id.toString(),
      studentIds: [student.id.toString()],
    });
    setRegStudentSearch("");
    setIsCoursePaymentModalOpen(false);
  };

  const handleSchedulePayments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

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
          exchangeRate: schForm.currency === 'USD' ? 1 : rate,
          amountMXN: amtMxn,
          finalAmount: finAmt,
          status: 'Programado',
          categoryId: 'cat_ingreso_servicios',
          subcategory: dynamicSubcat,
          paymentMethod: schForm.paymentMethod,
          bankAccountId: schForm.bankAccountId,
          institutionId: student.institutionId || undefined,
          studentId: stIdStr ? Number(stIdStr) : undefined,
          agentId: currentUser?.id,
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
      studentId: student.id.toString(),
      studentIds: [student.id.toString()],
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
      exchangeRate: confirmForm.currency === 'USD' ? 1 : rate,
      amountMXN: amtMxn,
      finalAmount: finAmt,
      paymentMethod: confirmForm.paymentMethod,
      bankAccountId: confirmForm.bankAccountId,
      description: confirmForm.description,
      taxId: confirmForm.taxId,
    });

    setConfirmingPayment(null);
  };

  const [activeTab, setActiveTab] = useState("Datos Generales");
  const [activeSubTab, setActiveSubTab] = useState("Información Personal");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<any>(null);

  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [extraForm, setExtraForm] = useState({
    name: "",
    cost: "",
    currency: "USD",
    notes: "",
  });

  const [isEditingCustomId, setIsEditingCustomId] = useState(false);
  const [newCustomId, setNewCustomId] = useState("");

  const [enrollForm, setEnrollForm] = useState({
    providerId: "",
    classId: "",
    enrollmentDate: "",
    activationDate: "",
    endDate: "",
    status: "Active" as "Active" | "Completed" | "On hold" | "Withdrawn",
    price: 0,
    notes: "",
  });

  const [newActivityText, setNewActivityText] = useState("");

  // Document management states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detailDocName, setDetailDocName] = useState("");
  const [isDetailDocModalOpen, setIsDetailDocModalOpen] = useState(false);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editingDocName, setEditingDocName] = useState("");
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveCustomId = () => {
    if (!student) return;
    updateStudent(student.id, { studentCustomId: newCustomId.trim() });
    addActivity({
      institutionId: student.institutionId || 1,
      studentId: student.id,
      date:
        new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }) +
        " " +
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      description: `Datos Generales: Se modificó el ID del estudiante a "${newCustomId.trim()}".`,
    });
    setIsEditingCustomId(false);
  };

  const handleSaveExtraService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !extraForm.name) return;

    const currentExtras = student.extraServices || [];
    let updatedExtras;
    if (editingExtraId) {
      updatedExtras = currentExtras.map((ex) =>
        ex.id === editingExtraId
          ? {
              ...ex,
              name: extraForm.name,
              cost: Number(extraForm.cost) || 0,
              currency: extraForm.currency,
              notes: extraForm.notes,
            }
          : ex,
      );
    } else {
      updatedExtras = [
        ...currentExtras,
        {
          id: Date.now().toString(),
          name: extraForm.name,
          cost: Number(extraForm.cost) || 0,
          currency: extraForm.currency,
          notes: extraForm.notes,
        },
      ];
    }

    updateStudent(student.id, { extraServices: updatedExtras });

    addActivity({
      institutionId: student.institutionId || 1,
      studentId: student.id,
      date:
        new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }) +
        " " +
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      description: `Servicios Extras: Se ${editingExtraId ? "actualizó" : "agregó"} el servicio extra "${extraForm.name}".`,
    });

    setIsExtraModalOpen(false);
    setExtraForm({ name: "", cost: "", currency: "USD", notes: "" });
    setEditingExtraId(null);
  };

  const handleDeleteExtraService = (exId: string) => {
    if (!student) return;
    const currentExtras = student.extraServices || [];
    const exService = currentExtras.find((ex) => ex.id === exId);
    if (!exService) return;
    const updatedExtras = currentExtras.filter((ex) => ex.id !== exId);
    updateStudent(student.id, { extraServices: updatedExtras });

    addActivity({
      institutionId: student.institutionId || 1,
      studentId: student.id,
      date:
        new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }) +
        " " +
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      description: `Servicios Extras: Se eliminó el servicio extra "${exService.name}".`,
    });
  };

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">Alumno no encontrado o Acceso no autorizado</div>
    );
  }

  // Calculations
  const studentEnrollments = enrollments.filter(
    (e) => e.studentId === student.id,
  );
  const enrolledClasses = studentEnrollments
    .map((e) => classes.find((c) => c.id === e.classId))
    .filter(Boolean);

  const totalCredits = enrolledClasses.reduce(
    (sum, c) => {
      let val = 0;
      if (c?.creditType === 'Medio Crédito' || c?.creditType === 'Medio Crédito AP') val = 0.5;
      else if (c?.creditType === 'Crédito completo' || c?.creditType === 'Crédito completo AP') val = 1.0;
      else val = Number(c?.credits) || 0;
      return sum + val;
    },
    0,
  );
  const extraServicesTotal = (student.extraServices || []).reduce(
    (sum, ex) => sum + (ex.cost || 0),
    0,
  );
  const totalPrograma =
    studentEnrollments.reduce((sum, e) => {
      let cp = e.price;
      if (cp === undefined || cp === null) {
        const cl = classes.find((c) => c.id === e.classId);
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
            // Default fallbacks
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
    }, 0) + extraServicesTotal;

  const studentPayments = financialTransactions.filter(
    (p) => p.studentId === student.id && p.type === "income",
  );
  const pagado = studentPayments.reduce((sum, p) => sum + p.amountMXN, 0); // Assuming MXN context for total
  const pendiente = totalPrograma - pagado;

  const openPaymentModal = (payment?: any) => {
    setEditingPayment(payment || null);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const handleActivationDateChange = (dateVal: string) => {
    if (!dateVal) {
      setEnrollForm((prev) => ({ ...prev, activationDate: dateVal }));
      return;
    }
    const d = new Date(dateVal + "T12:00:00");
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 1);
      const calculatedEnd = d.toISOString().split("T")[0];
      setEnrollForm((prev) => ({
        ...prev,
        activationDate: dateVal,
        endDate: calculatedEnd,
      }));
    } else {
      setEnrollForm((prev) => ({ ...prev, activationDate: dateVal }));
    }
  };

  const getAgreedPrice = (classId: string, providerId: string) => {
    const cCls = classes.find((c) => c.id.toString() === classId);
    if (!cCls) return 0;

    // Resolve specific prices from rate catalogs of the institution and provider
    const resolvedPrices = resolveCreditPrices(
      institution?.tarifasId,
      catalogs,
      providerId ? Number(providerId) : undefined,
      providerProductServices,
    );

    let priceStr = "";
    if (cCls.creditType === "Medio Crédito") {
      priceStr = resolvedPrices.priceHalfCredit;
    } else if (cCls.creditType === "Crédito completo AP") {
      priceStr = resolvedPrices.priceFullApCredit;
    } else if (cCls.creditType === "Medio Crédito AP") {
      priceStr = resolvedPrices.priceHalfApCredit;
    } else {
      priceStr = resolvedPrices.priceFullCredit;
    }

    if (priceStr) {
      const cleaned = priceStr.replace(/[^0-9.-]+/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }

    // Fallback if no rate in custom tariff, use class default or class countryRates
    const studentCountry =
      institution?.country?.trim() || student?.country?.trim();
    let rateForCountry = null;
    if (studentCountry && cCls.countryRates) {
      rateForCountry = cCls.countryRates[studentCountry];
      if (!rateForCountry) {
        const matchKey = Object.keys(cCls.countryRates).find(
          (k) => k.toLowerCase() === studentCountry.toLowerCase(),
        );
        if (matchKey) {
          rateForCountry = cCls.countryRates[matchKey];
        }
      }
    }

    if (rateForCountry && rateForCountry.price) {
      return parseFloat(rateForCountry.price.replace(/[^0-9.-]+/g, "") || "0");
    }

    return parseFloat(cCls.price?.replace(/[^0-9.-]+/g, "") || "0");
  };

  const handleProviderChange = (pId: string) => {
    setEnrollForm((prev) => {
      const cls = classes.find((c) => c.id.toString() === prev.classId);
      const keepClass = cls && cls.providerId?.toString() === pId;
      const targetClassId = keepClass ? prev.classId : "";
      return {
        ...prev,
        providerId: pId,
        classId: targetClassId,
        price: targetClassId ? getAgreedPrice(targetClassId, pId) : 0,
      };
    });
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.classId) return;

    const payload = {
      classId: Number(enrollForm.classId),
      providerId: enrollForm.providerId
        ? Number(enrollForm.providerId)
        : undefined,
      enrollmentDate: enrollForm.enrollmentDate,
      activationDate: enrollForm.activationDate,
      startDate: enrollForm.activationDate,
      endDate: enrollForm.endDate,
      status: enrollForm.status,
      price: Number(enrollForm.price),
      notes: enrollForm.notes,
    };

    if (editingEnrollment) {
      updateEnrollment(editingEnrollment.id, payload);
      addActivity({
        institutionId: student.institutionId || 1,
        studentId: student.id,
        date:
          new Date().toLocaleDateString("es-MX", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }) +
          " " +
          new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        description: `Historial Académico: Se actualizó la inscripción para la clase "${classes.find((c) => c.id === Number(enrollForm.classId))?.name}".`,
      });
    } else {
      addEnrollment({
        studentId: student.id,
        ...payload,
      });
      addActivity({
        institutionId: student.institutionId || 1,
        studentId: student.id,
        date:
          new Date().toLocaleDateString("es-MX", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }) +
          " " +
          new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        description: `Historial Académico: Inscripción en la clase "${classes.find((c) => c.id === Number(enrollForm.classId))?.name}" realizada.`,
      });
    }
    setIsEnrollModalOpen(false);
    setEnrollForm({
      providerId: "",
      classId: "",
      enrollmentDate: "",
      activationDate: "",
      endDate: "",
      status: "Active",
      price: 0,
      notes: "",
    });
    setEditingEnrollment(null);
  };

  const handleOpenEnrollForEdit = (env: any) => {
    const classItem = classes.find((c) => c.id === env.classId);
    const resolvedProviderId = env.providerId || classItem?.providerId || "";

    setEditingEnrollment(env);
    setEnrollForm({
      providerId: String(resolvedProviderId),
      classId: env.classId.toString(),
      enrollmentDate: env.enrollmentDate || "",
      activationDate: env.activationDate || env.startDate || "",
      endDate: env.endDate || "",
      status: env.status || "Active",
      price: env.price || 0,
      notes: env.notes || "",
    });
    setIsEnrollModalOpen(true);
  };

  const handleOpenEnrollForCreate = () => {
    setEditingEnrollment(null);
    const defaultProvId = institution?.mainProviderId ? institution.mainProviderId.toString() : "";
    setEnrollForm({
      providerId: defaultProvId,
      classId: "",
      enrollmentDate: "",
      activationDate: "",
      endDate: "",
      status: "Active",
      price: 0,
      notes: "",
    });
    setIsEnrollModalOpen(true);
  };

  const handleDeleteEnrollment = (envId: number) => {
    const env = enrollments.find((e) => e.id === envId);
    if (!env) return;
    const cName = classes.find((c) => c.id === env.classId)?.name || "Clase";
    deleteEnrollment(envId);
    addActivity({
      institutionId: student.institutionId || 1,
      studentId: student.id,
      date:
        new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }) +
        " " +
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      description: `Historial Académico: Se eliminó la inscripción para la clase "${cName}".`,
    });
    setIsEnrollModalOpen(false);
    setEditingEnrollment(null);
  };

  const canEditAcademicHistory =
    currentUser?.role === "Superadministrador" ||
    currentUser?.role === "Academia" ||
    currentUser?.role === "Coordinador";

  const canDeletePayment =
    currentUser?.role === "Superadministrador" ||
    currentUser?.role === "Finanzas";

  // Ensure active tab is valid
  React.useEffect(() => {
    if (activeTab === "Pagos" && !isHomeschool) {
      setActiveTab("Datos Generales");
    }
  }, [activeTab, isHomeschool]);

  const mainTabs = [
    { name: "Datos Generales", icon: User },
    { name: "Historial Académico", icon: BookOpen },
    ...(isHomeschool ? [{ name: "Pagos", icon: CreditCard }] : []),
    { name: "Documentos", icon: FileText },
    { name: "Bitácora", icon: ClipboardList },
    { name: "Actividad", icon: Clock },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Back Header */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={() => navigate('/alumnos')}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1">
              {student.name} {student.lastName || ""}
            </h2>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium whitespace-nowrap overflow-x-auto hide-scrollbar">
              <span className="text-indigo-600 font-mono font-bold tracking-wider uppercase">
                {student.studentCustomId || `STU-108${student.id.toString().padStart(2, "0")}`}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
              <span className="flex items-center"><GraduationCap className="w-3 h-3 mr-1" /> {institution?.name || "Desconocida"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
              <span className={`px-2 py-0.5 rounded border ${
                student.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
              } uppercase tracking-widest text-[8px] font-bold`}>
                {student.status || 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentUser?.role !== 'Alumno' && (
            <>
              <button 
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Está seguro de que desea cambiar el estado de este alumno a "Archivado"?`)) {
                    updateStudent(student.id, { status: "Archivado" });
                  }
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition shadow-sm cursor-pointer"
              >
                Archivar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Está seguro de que desea eliminar permanentemente a este estudiante?`)) {
                    deleteStudent(student.id);
                    navigate("/alumnos");
                  }
                }}
                className="px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/20 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 hover:text-rose-700 transition shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </>
          )}
          <button 
            type="button"
            onClick={() => navigate(`/alumnos/editar/${student.id}`)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            Editar Perfil
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* KPIs Indicators Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {isHomeschool && (
              <>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Total Programa</p>
                    <p className="text-sm font-bold text-slate-900 tracking-tight">${totalPrograma.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">USD</span></p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Pagado</p>
                    <p className="text-sm font-bold text-emerald-600 tracking-tight">${pagado.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">USD</span></p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Pendiente</p>
                    <p className="text-sm font-bold text-amber-600 tracking-tight">${pendiente.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">USD</span></p>
                  </div>
                </div>
              </>
            )}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-650 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Créditos</p>
                <p className="text-sm font-bold text-slate-900 tracking-tight">{totalCredits} <span className="text-[10px] font-medium text-slate-400">CR</span></p>
              </div>
            </div>
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
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
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
                  {activeTab === "Datos Generales" && (
            <div className="animate-in fade-in duration-300">
              {/* Sub Tabs Pill Menu */}
              <div className="flex space-x-2 mb-8">
                {["Información Personal", "Tutores y Emergencia", "Notificaciones"].map(
                  (subTab) => (
                    <button
                      key={subTab}
                      onClick={() => setActiveSubTab(subTab)}
                      className={`px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                        activeSubTab === subTab
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {subTab}
                    </button>
                  ),
                )}
              </div>

              {activeSubTab === "Información Personal" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
                  {/* Column 1: Identidad */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">
                      Identidad
                    </h3>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Nombres
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Apellidos
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.lastName || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Preferred Name
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.preferredName || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Sexo
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.gender || "No especificado"}
                        </p>
                      </div>
                    </div>
                    {/* ID Estudiante */}
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-200 text-indigo-600">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          ID Estudiante
                        </p>
                        {isEditingCustomId ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="text"
                              value={newCustomId}
                              onChange={(e) => setNewCustomId(e.target.value)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono w-32"
                            />
                            <button
                              onClick={handleSaveCustomId}
                              className="bg-indigo-600 text-white rounded px-2 py-1 text-[10px] font-bold hover:bg-indigo-750 transition"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setIsEditingCustomId(false)}
                              className="text-slate-400 hover:text-slate-600 text-[10px]"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                            <span>
                              {student.studentCustomId ||
                                `STU-108${student.id.toString().padStart(2, "0")}`}
                            </span>
                            <button
                              onClick={() => {
                                setIsEditingCustomId(true);
                                setNewCustomId(
                                  student.studentCustomId ||
                                    `STU-108${student.id.toString().padStart(2, "0")}`,
                                );
                              }}
                              className="text-indigo-600 hover:text-indigo-805 p-0.5 transition"
                              title="Editar ID"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Modalidad */}
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-200 text-purple-600">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Modalidad
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.modality || "No especificada"}
                        </p>
                      </div>
                    </div>
                    {/* Año Escolar */}
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-200 text-amber-600">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Año Escolar
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.schoolYear || "No especificado"}
                        </p>
                      </div>
                    </div>
                    {/* Status */}
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-200 text-green-600">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Status
                        </p>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 ${
                          student.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {student.status || "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Contacto Y Nacimiento */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">
                      Contacto y Nacimiento
                    </h3>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Correo Electrónico
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.email || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Teléfono Movil
                        </p>
                        <p className="text-sm font-semibold text-slate-900 font-mono">
                          {student.phone || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Fecha Nacimiento
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.birthDate || "No especificada"}{" "}
                          <span className="text-xs text-slate-500 ml-1 font-normal"></span>
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <Flag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Nacionalidad
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.nationality || "No especificada"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Pasaporte / ID
                        </p>
                        <p className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                          {student.passport || "No especificado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Dirección */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">
                      Dirección
                    </h3>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100 text-amber-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Calle y Número
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.address || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Ciudad
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.city || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Estado
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.state || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Código Postal (CP)
                        </p>
                        <p className="text-sm font-semibold text-slate-900 font-mono">
                          {student.zipCode || "No especificado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          País
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {student.country || "No especificado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "Tutores y Emergencia" && (
                <div className="animate-in fade-in max-w-2xl">
                  {student.parentName || student.parentLastName ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center space-x-4 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center font-bold text-lg">
                          {student.parentName?.[0] || "T"}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800">
                            {student.parentName} {student.parentLastName}
                          </h4>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase mt-1 inline-block">
                            {student.parentRelation || "Tutor / Emergencia"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                          <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                              Correo Electrónico
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {student.parentEmail || "No especificado"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                              Teléfono Celular
                            </p>
                            <p className="text-sm font-semibold text-slate-900 font-mono">
                              {student.parentPhone || "No especificado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-slate-500 font-medium">
                        No se ha registrado información de padres o tutores.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === "Notificaciones" && (
                <div className="animate-in fade-in max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Bell className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Preferencias de Notificaciones
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define los destinatarios configurados para las alertas de este alumno.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Notificación de Pago */}
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Notificación de Pago
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Determina quién recibe comunicados y recordatorios de pago.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`p-3 border rounded-lg text-center ${student.notificationPayment?.alumno ? "bg-indigo-50/50 border-indigo-300 animate-pulse-once" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Alumno</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationPayment?.alumno ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationPayment?.alumno ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${student.notificationPayment?.instituto ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Instituto</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationPayment?.instituto ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationPayment?.instituto ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${student.notificationPayment?.agente ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Agente</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationPayment?.agente ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationPayment?.agente ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notificación académica */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Notificación Académica
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Determina quién recibe reportes y avisos de progreso académico.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`p-3 border rounded-lg text-center ${student.notificationAcademic?.alumno ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Alumno</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationAcademic?.alumno ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationAcademic?.alumno ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${student.notificationAcademic?.instituto ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Instituto</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationAcademic?.instituto ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationAcademic?.instituto ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${student.notificationAcademic?.agente ? "bg-indigo-50/50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}>
                          <p className="text-xs font-bold text-slate-800">Agente</p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-2 ${student.notificationAcademic?.agente ? "bg-emerald-100 text-emerald-850 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                            {student.notificationAcademic?.agente ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Pagos" && (() => {
            const instStudents = student ? [student] : [];
            return (
              <div className="animate-in fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Historial de Pagos
                    </h3>
                    <p className="text-sm text-slate-500">
                      Registro de todas las transacciones del estudiante
                    </p>
                  </div>
                  {currentUser?.role !== 'Alumno' && (
                    <button
                      onClick={() => {
                        // Pre-fill forms with student details before opening modal
                        const defaultIdStr = student?.id?.toString() || '';
                        setRegForm(prev => ({
                          ...prev,
                          studentId: defaultIdStr,
                          studentIds: [defaultIdStr],
                        }));
                        setSchForm(prev => ({
                          ...prev,
                          studentId: defaultIdStr,
                          studentIds: [defaultIdStr],
                        }));
                        setIsCoursePaymentModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center shadow-sm hover:shadow-indigo-100 transition duration-250 cursor-pointer border-0"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Pago de Cursos
                    </button>
                  )}
                </div>

                {studentPayments.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            ID/TRX
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Fecha de Pago
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Concepto
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Método
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                            Estado
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                            Cantidad Original
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                            Monto (MXN)
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-28">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentPayments.map((p) => {
                          const isProgramado = p.status === 'Programado';
                          return (
                            <tr
                              key={p.id}
                              onClick={() => {
                                if (isProgramado) {
                                  handleOpenConfirmPaymentModal(p);
                                } else {
                                  openPaymentModal(p);
                                }
                              }}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4">
                                <span className="font-mono text-xs text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg font-bold">
                                  TRX-{p.id.toString().slice(-4)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                  {p.date}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium text-slate-600">
                                  {p.description}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-slate-550 font-medium">
                                  {p.paymentMethod || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                                  p.status === 'Aplicado' || p.status === 'Pagado'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : isProgramado
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                  {p.status === 'Aplicado' || p.status === 'Pagado' ? 'Pagado' : p.status || 'Aplicado'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm text-slate-600 font-mono font-bold">
                                  ${p.amount?.toLocaleString()} <span className="text-[10px] font-semibold text-slate-400">{p.currency}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-bold text-slate-900 font-mono">
                                  ${p.amountMXN?.toLocaleString()} MXN
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  {isProgramado && (
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
                                  {canDeletePayment ? (
                                    <button
                                      onClick={() => setPaymentToDelete(p.id)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center border-0 cursor-pointer"
                                      title="Eliminar Pago"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-1 rounded" title="Solo Superadministrador o Finanzas pueden borrar pagos">
                                      Bloqueado
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                      <CreditCard className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 font-medium mb-1">
                      Sin pagos registrados
                    </p>
                    <p className="text-xs text-slate-400">
                      No se ha registrado ningún pago para este estudiante.
                    </p>
                  </div>
                )}

                {/* Modal para Registrar / Programar Pago de Cursos (Integrado) */}
                <Modal 
                  isOpen={isCoursePaymentModalOpen} 
                  onClose={() => setIsCoursePaymentModalOpen(false)} 
                  title={`Pago de Cursos - ${student.name} ${student.lastName || ''}`} 
                  size="2xl"
                >
                  <div className="p-1 text-left">
                    {/* Tabs header */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setCoursePaymentTab('register')}
                        className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          coursePaymentTab === 'register' 
                            ? 'bg-white text-indigo-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
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
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >
                        Programar Pago
                      </button>
                    </div>

                    {/* Tab 1: Dar de Alta Pago */}
                    {coursePaymentTab === 'register' && (
                      <form onSubmit={handleRegisterPayment} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha de Pago</label>
                            <input
                              type="date"
                              value={regForm.date}
                              onChange={(e) => setRegForm(prev => ({ ...prev, date: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Monto Total</label>
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={regForm.amount}
                                onChange={(e) => setRegForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono font-bold"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Moneda</label>
                              <select
                                value={regForm.currency}
                                onChange={(e) => setRegForm(prev => ({ ...prev, currency: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-bold"
                              >
                                <option value="MXN">MXN</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          </div>

                          {regForm.currency === 'MXN' && (
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Cambio (USD/MXN)</label>
                              <input
                                type="number"
                                step="any"
                                value={regForm.exchangeRate}
                                onChange={(e) => setRegForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                required
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Método de Pago</label>
                            <select
                              value={regForm.paymentMethod}
                              onChange={(e) => setRegForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            >
                              <option value="">-- Seleccionar --</option>
                              {catalogs['Métodos de Pago']?.map((m: any) => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuenta Bancaria Destino</label>
                            <select
                              value={regForm.bankAccountId}
                              onChange={(e) => setRegForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            >
                              <option value="">-- Seleccionar Cuenta --</option>
                              {catalogs['Cuentas bancarias']?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name || c.bankName}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Descripción del Pago</label>
                            <input
                              type="text"
                              value={regForm.description}
                              onChange={(e) => setRegForm(prev => ({ ...prev, description: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>

                          {/* Seccion Alumno */}
                          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40 col-span-1 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Alumno a Aplicar Pago</span>
                            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white shadow-xs">
                              <span className="font-extrabold text-slate-800 text-xs">{student.name} {student.lastName || ''}</span>
                              <span className="text-[10px] text-slate-400 font-medium font-mono ml-auto">({student.email || 'sin email'})</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">ID de Factura / Tax ID (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ej. FAC-99052"
                              value={regForm.taxId}
                              onChange={(e) => setRegForm(prev => ({ ...prev, taxId: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCoursePaymentModalOpen(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 shadow-sm transition"
                          >
                            Registrar Pago Activo
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Tab 2: Programar Pago */}
                    {coursePaymentTab === 'schedule' && (() => {
                      const activeMemb = catalogs['Membresías']?.find((m: any) => m.id === institution?.membershipId);
                      const membUnitAmount = activeMemb ? Number(activeMemb.amount || 0) : 0;
                      const membCurrency = activeMemb ? (activeMemb.currency || 'USD') : 'USD';
                      const totalStudents = instStudents.length;
                      const totalMembAmountValue = membUnitAmount * totalStudents;

                      return (
                        <form onSubmit={handleSchedulePayments} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Concepto de Programación</label>
                              <div className="flex gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setSchForm(prev => ({ 
                                    ...prev, 
                                    concepto: 'Cursos',
                                    description: 'Pago Programado de Cursos'
                                  }))}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
                                    schForm.concepto === 'Cursos'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold'
                                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                                  }`}
                                >
                                  Cursos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSchForm(prev => ({ 
                                    ...prev, 
                                    concepto: 'Membresía',
                                    description: `Pago Programado de Membresía ${activeMemb ? activeMemb.name : ''}`.trim(),
                                    amountPerPayment: membUnitAmount > 0 ? membUnitAmount.toString() : prev.amountPerPayment,
                                    currency: membCurrency
                                  }))}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
                                    schForm.concepto === 'Membresía'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold'
                                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                                  }`}
                                >
                                  Membresía {activeMemb && `($${membUnitAmount} ${membCurrency})`}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Frecuencia / Periodicidad</label>
                              <select
                                value={schForm.periodicity}
                                onChange={(e) => setSchForm(prev => ({ ...prev, periodicity: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                required
                              >
                                <option value="monthly-first">Mensual - Día 1 de cada mes</option>
                                <option value="monthly-same">Mensual - Mismo día de inicio</option>
                                <option value="biweekly">Quincenal (Cada 15 días)</option>
                                <option value="weekly">Semanal (Cada 7 días)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Número de Pagos (Parcialidades)</label>
                              <input
                                type="number"
                                min="1"
                                max="24"
                                value={schForm.numPayments}
                                onChange={(e) => setSchForm(prev => ({ ...prev, numPayments: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono font-bold"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Primer Fecha de Vencimiento</label>
                              <input
                                type="date"
                                value={schForm.startDate}
                                onChange={(e) => setSchForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Importe por Pago (Unitario)</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={schForm.amountPerPayment}
                                  onChange={(e) => setSchForm(prev => ({ ...prev, amountPerPayment: e.target.value }))}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono font-black"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Moneda</label>
                                <select
                                  value={schForm.currency}
                                  onChange={(e) => setSchForm(prev => ({ ...prev, currency: e.target.value }))}
                                  disabled={schForm.concepto === 'Membresía'}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-bold disabled:opacity-70"
                                >
                                  <option value="MXN">MXN</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            </div>

                            {schForm.currency === 'MXN' && (
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Cambio Proyectado (USD/MXN)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={schForm.exchangeRate}
                                  onChange={(e) => setSchForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                  required
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Método Sugerido</label>
                              <select
                                value={schForm.paymentMethod}
                                onChange={(e) => setSchForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                                required
                              >
                                <option value="">-- Seleccionar --</option>
                                {catalogs['Métodos de Pago']?.map((m: any) => (
                                  <option key={m.id} value={m.name}>{m.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuenta Bancaria Destino</label>
                              <select
                                value={schForm.bankAccountId}
                                onChange={(e) => setSchForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                                required
                              >
                                <option value="">-- Seleccionar Cuenta --</option>
                                {catalogs['Cuentas bancarias']?.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.name || c.bankName}</option>
                                ))}
                              </select>
                            </div>

                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/40 col-span-1 sm:col-span-2">
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Alumno Programado</span>
                              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white shadow-xs">
                                <span className="font-extrabold text-slate-800 text-xs">{student.name} {student.lastName || ''}</span>
                                <span className="text-[10px] text-slate-400 font-medium font-mono ml-auto">({student.email || 'sin email'})</span>
                              </div>
                            </div>

                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Concepto Base en Registro (Descripción)</label>
                              <input
                                type="text"
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
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 shadow-sm transition"
                            >
                              Confirmar Programación ({schForm.numPayments} Pagos)
                            </button>
                          </div>
                        </form>
                      );
                    })()}
                  </div>
                </Modal>

                {/* Modal para Confirmar Recepción de Pago Programado (Integrado) */}
                <Modal
                  isOpen={confirmingPayment !== null}
                  onClose={() => setConfirmingPayment(null)}
                  title="Confirmar Recepción de Pago"
                  size="lg"
                >
                  {confirmingPayment && (
                    <form onSubmit={handleConfirmPaymentReceipt} className="space-y-4 text-left">
                      <div className="p-1 space-y-3">
                        <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-200/60 flex items-start gap-2.5">
                          <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold text-amber-900 text-xs">Datos del Pago Programado Original</h5>
                            <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                              {confirmingPayment.description} de <span className="font-bold">${confirmingPayment.amount?.toLocaleString()} {confirmingPayment.currency}</span> programado para el <span className="font-bold">{confirmingPayment.date}</span>.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Fecha Real de Cobro</label>
                              <input
                                type="date"
                                value={confirmForm.date}
                                onChange={(e) => setConfirmForm(prev => ({ ...prev, date: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Importe Recibido</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={confirmForm.amount}
                                  onChange={(e) => setConfirmForm(prev => ({ ...prev, amount: e.target.value }))}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono font-black"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Moneda</label>
                                <select
                                  value={confirmForm.currency}
                                  onChange={(e) => setConfirmForm(prev => ({ ...prev, currency: e.target.value }))}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-bold"
                                >
                                  <option value="MXN">MXN</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {confirmForm.currency === 'MXN' && (
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Cambio Real</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={confirmForm.exchangeRate}
                                  onChange={(e) => setConfirmForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                                  className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                  required
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Método de Pago</label>
                              <select
                                value={confirmForm.paymentMethod}
                                onChange={(e) => setConfirmForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                required
                              >
                                {catalogs['Métodos de Pago']?.map((m: any) => (
                                  <option key={m.id} value={m.name}>{m.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cuenta Destino Real</label>
                              <select
                                value={confirmForm.bankAccountId}
                                onChange={(e) => setConfirmForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500 font-semibold"
                                required
                              >
                                <option value="">-- Seleccionar Cuenta --</option>
                                {catalogs['Cuentas bancarias']?.map((c: any) => (
                                  <option key={c.id} value={c.id}>{c.name || c.bankName}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">ID de Factura / Tax ID (Opcional)</label>
                              <input
                                type="text"
                                value={confirmForm.taxId}
                                onChange={(e) => setConfirmForm(prev => ({ ...prev, taxId: e.target.value }))}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Descripción Confirmante</label>
                            <input
                              type="text"
                              value={confirmForm.description}
                              onChange={(e) => setConfirmForm(prev => ({ ...prev, description: e.target.value }))}
                              className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50/50 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="Ej. Recibido completo de colegiatura"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingPayment(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-0 shadow-sm transition"
                        >
                          Confirmar Recepción
                        </button>
                      </div>
                    </form>
                  )}
                </Modal>
              </div>
            );
          })()}

          {activeTab === "Historial Académico" && (
            <div className="animate-in fade-in flex flex-col h-full">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Historial Académico
                    </h3>
                    {!canEditAcademicHistory && (
                      <span className="bg-slate-150 text-slate-600 font-bold uppercase text-[9px] px-2 py-0.5 rounded tracking-wider">
                        Solo Lectura
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clases inscritas por el estudiante.{" "}
                    {canEditAcademicHistory
                      ? "Haz clic en una clase para editarla o cancelarla."
                      : "Haz clic para ver detalles detallados."}
                  </p>
                </div>
                {canEditAcademicHistory && (
                  <button
                    onClick={handleOpenEnrollForCreate}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm hover:bg-slate-800 transition self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Clase
                  </button>
                )}
              </div>

              {studentEnrollments.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left table-auto">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Proveedor / Clase
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Línea de Tiempo
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                          Status
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                          Créditos
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                          Precio
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentEnrollments.map((env) => {
                        const c = classes.find((cls) => cls.id === env.classId);
                        if (!c) return null;
                        const provId = env.providerId || c.providerId;
                        const prov = providers.find((p) => p.id === provId);

                        const statusColors = {
                          Active: "bg-emerald-50 text-emerald-700 border-emerald-100",
                          Completed: "bg-blue-50 text-blue-700 border-blue-100",
                          "On hold": "bg-amber-50 text-amber-700 border-amber-100",
                          Withdrawn: "bg-slate-100 text-slate-700 border-slate-200",
                        };

                        const statusLabel = {
                          Active: "Active",
                          Completed: "Completed",
                          "On hold": "On hold",
                          Withdrawn: "Withdrawn",
                        };

                        const statusVal = env.status || "Active";

                        return (
                          <tr
                            key={env.id}
                            onClick={() => handleOpenEnrollForEdit(env)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              {prov ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-150 uppercase tracking-wider mb-1">
                                  📚 {prov.commercialName || prov.legalName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider mb-1">
                                  Sin Proveedor
                                </span>
                              )}
                              <p className="text-sm font-semibold text-slate-900 leading-tight">
                                {c.name}
                              </p>
                              {c.code && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {c.code}
                                </p>
                              )}
                              {env.notes && (
                                <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-100/50 rounded px-2 py-0.5 border border-slate-100 inline-block">
                                  {env.notes}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-0.5 text-xs">
                                {env.enrollmentDate && (
                                  <p className="text-slate-500">
                                    <span className="font-semibold text-slate-700">
                                      Inscripción:
                                    </span>{" "}
                                    <span className="font-mono">
                                      {env.enrollmentDate}
                                    </span>
                                  </p>
                                )}
                                <p className="text-slate-500">
                                  <span className="font-semibold text-slate-700">
                                    Activación:
                                  </span>{" "}
                                  <span className="font-mono">
                                    {env.activationDate || env.startDate || "-"}
                                  </span>
                                </p>
                                <p className="text-slate-500">
                                  <span className="font-semibold text-slate-700">
                                    Expiración:
                                  </span>{" "}
                                  <span className="font-mono">
                                    {env.endDate || "-"}
                                  </span>
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  statusColors[statusVal as keyof typeof statusColors] ||
                                  "bg-slate-50 text-slate-600 border-slate-100"
                                }`}
                              >
                                {statusLabel[statusVal as keyof typeof statusLabel] ||
                                  statusVal}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5 text-xs font-bold tracking-widest uppercase">
                                {c.creditType || `${c.credits} Cr`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-bold text-slate-900 font-mono">
                                ${(env.price || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 group-hover:underline">
                                {canEditAcademicHistory
                                  ? "Editar / Cambiar"
                                  : "Ver Detalle"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-medium mb-1">
                    Sin historial académico
                  </p>
                  <p className="text-xs text-slate-400">
                    El estudiante no ha sido inscrito a ninguna clase aún.
                  </p>
                </div>
              )}

              {/* SERVICIOS EXTRAS SECTION */}
              <div className="mt-12 pt-8 border-t border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Servicios Extras
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Servicios de valor agregado asignados al estudiante
                      (seguros adicionales, tutorías especiales, transportación,
                      etc.)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingExtraId(null);
                      setExtraForm({
                        name: "",
                        cost: "",
                        currency: "USD",
                        notes: "",
                      });
                      setIsExtraModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm hover:bg-slate-900 transition self-start sm:self-auto font-sans"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Servicio Extra
                  </button>
                </div>

                {(student.extraServices || []).length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Servicio
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Notas
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                            Costo
                          </th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(student.extraServices || []).map((ex) => (
                          <tr
                            key={ex.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900 text-sm">
                              {ex.name}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {ex.notes || "-"}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 text-sm">
                              ${ex.cost ? ex.cost.toLocaleString() : "0.00"}{" "}
                              {ex.currency}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingExtraId(ex.id);
                                    setExtraForm({
                                      name: ex.name,
                                      cost: ex.cost.toString(),
                                      currency: ex.currency,
                                      notes: ex.notes || "",
                                    });
                                    setIsExtraModalOpen(true);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-805 font-bold uppercase tracking-wide"
                                >
                                  Editar
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        `¿Estás seguro de eliminar el servicio "${ex.name}"?`,
                                      )
                                    ) {
                                      handleDeleteExtraService(ex.id);
                                    }
                                  }}
                                  className="text-xs text-rose-600 hover:text-rose-805 font-bold uppercase tracking-wide"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium text-xs mb-1">
                      Sin servicios extras registrados
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Asigne servicios de valor añadido como programas de
                      extensión o seguros.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Bitácora" && (
            <div className="animate-in fade-in flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-500 animate-pulse" />
                    Bitácora de Seguimiento Estudiantil
                  </h3>
                  <p className="text-xs text-slate-500">
                    Historial de incidencias, notas de profesores, reportes de
                    academia y tutoría.
                  </p>
                </div>
              </div>

              {/* Form to record a new comment/event */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm transition hover:shadow-md">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center">
                  <MessageSquare className="w-4 h-4 text-emerald-500 mr-2" />
                  Registrar Nota Académica o Reporte
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newActivityText.trim()) return;
                    addActivity({
                      institutionId: student.institutionId || 1,
                      studentId: student.id,
                      description: newActivityText.trim(),
                      date:
                        new Date().toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }) +
                        " " +
                        new Date().toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      userName: currentUser
                        ? `${currentUser.role} (Usuario)`
                        : "Academia",
                    });
                    setNewActivityText("");
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={newActivityText}
                    onChange={(e) => setNewActivityText(e.target.value)}
                    placeholder="Escriba aquí los detalles del seguimiento (por ejemplo: 'Se contactó a tutores por inasistencias', 'Dificultades técnicas resueltas', 'Entregó documentación pendiente')..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 outline-none min-h-[90px] leading-relaxed transition-all shadow-inner"
                    rows={3}
                    required
                  />
                  <div className="flex justify-end/between items-center">
                    <p className="text-[10px] text-slate-400 italic">
                      Registrado bajo sesión de{" "}
                      {currentUser?.role || "Academia"}
                    </p>
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm ml-auto transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Registrar en Bitácora
                    </button>
                  </div>
                </form>
              </div>

              {/* Chronicle list */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Línea de Vida e Historial
                </h4>

                {activities.filter((a) => a.studentId === student.id).length >
                0 ? (
                  <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-4">
                    {activities
                      .filter((a) => a.studentId === student.id)
                      .slice()
                      .reverse() // Newest first
                      .map((act) => (
                        <div
                          key={act.id}
                          className="relative animate-in slide-in-from-left-4 duration-300"
                        >
                          {/* Circle indicator bullet */}
                          <span className="absolute -left-[30px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-white border-2 border-indigo-500 text-indigo-600 shadow-sm">
                            <Clock className="w-2 h-2" />
                          </span>
                          <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm hover:border-indigo-100 hover:shadow-md transition">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                {act.userName || "Sistema"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                {act.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                              {act.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-16 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 flex flex-col items-center justify-center">
                    <ClipboardList className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-xs text-slate-600 font-medium">
                      La bitácora de este estudiante está vacía
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm">
                      Aún no se han registrado anotaciones manuales. Se guardará
                      un log automático cuando se realicen inscripciones.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Actividad" && (
            <div className="animate-in fade-in flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Registro de Actividad Estudiantil
                  </h3>
                  <p className="text-xs text-slate-500">
                    Historial completo de auditoría y actividades de este
                    estudiante. Esta sección es de solo lectura y no se puede
                    editar.
                  </p>
                </div>
                <span className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] px-2.5 py-1 rounded-md tracking-wider self-start md:self-auto border border-slate-200">
                  Solo Lectura
                </span>
              </div>

              {/* Chronicle list */}
              <div className="space-y-4">
                {activities.filter((a) => a.studentId === student.id).length >
                0 ? (
                  <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-4">
                    {activities
                      .filter((a) => a.studentId === student.id)
                      .slice()
                      .reverse() // Newest first
                      .map((act) => (
                        <div
                          key={act.id}
                          className="relative animate-in slide-in-from-left-4 duration-300"
                        >
                          {/* Circle indicator bullet */}
                          <span className="absolute -left-[30px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-slate-50 border-2 border-slate-305 text-slate-400 shadow-sm">
                            <Clock className="w-2 h-2" />
                          </span>
                          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded-md">
                                {act.userName || "Sistema"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                {act.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
                              {act.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-16 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 flex flex-col items-center justify-center">
                    <Clock className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-xs text-slate-600 font-medium">
                      No hay actividades de este estudiante registradas en el
                      sistema
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm">
                      Cualquier cambio de inscripción o nota correspondiente
                      aparecerá aquí automáticamente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "Documentos" && student && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200 font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Expediente de Documentos</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Gestión de actas, pasaportes, visas y boletas académicas.</p>
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
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Nombre del Documento</th>
                      <th className="px-4 py-3 border-b border-slate-200">Archivo Adjunto</th>
                      <th className="px-4 py-3 border-b border-slate-200">Tamaño</th>
                      <th className="px-4 py-3 border-b border-slate-200">Fecha de Carga</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(!student.documentsList || student.documentsList.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay documentos registrados para este estudiante.</td>
                      </tr>
                    ) : (
                      student.documentsList.map((doc: any) => (
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
                                  if (confirm(`¿Seguro de borrar el documento: ${doc.name}?`)) {
                                    const fresh = (student.documentsList || []).filter((d: any) => d.id !== doc.id);
                                    updateStudent(student.id, { documentsList: fresh });
                                    
                                    // Log this activity
                                    addActivity({
                                      institutionId: student.institutionId || 1,
                                      studentId: student.id,
                                      date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
                                      description: `Documentos: Se eliminó el documento "${doc.name}".`
                                    });
                                  }
                                }}
                                className="text-slate-500 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition"
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

          {!mainTabs.some((t) => t.name === activeTab) && (
            <div className="h-full min-h-[300px] flex items-center justify-center text-center animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">
                  {activeTab}
                </h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Esta sección contendrá la información detallada para este
                  alumno. En desarrollo activo.
                </p>
              </div>
            </div>
          )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        title={editingPayment ? "Editar Pago" : "Registrar Pago"}
      >
        <FinancialTransactionForm
          initialType="income"
          initialData={editingPayment}
          fixedStudentId={student.id}
          onSuccess={closePaymentModal}
        />
      </Modal>

      <Modal
        isOpen={paymentToDelete !== null}
        onClose={() => setPaymentToDelete(null)}
        title="Confirmar eliminación de pago"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600">
            ¿Está seguro de que desea eliminar permanentemente este registro de pago? Esta acción no se puede deshacer y afectará el balance del alumno.
          </p>
          {paymentToDelete && (() => {
            const tx = studentPayments.find(t => t.id === paymentToDelete);
            if (!tx) return null;
            return (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-rose-800">
                  <span className="font-semibold text-rose-400">ID Pago:</span>
                  <span className="font-mono">{tx.id}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-800">
                  <span className="font-semibold text-rose-400">Descripción:</span>
                  <span className="font-semibold">{tx.description}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-800">
                  <span className="font-semibold text-rose-400">Monto:</span>
                  <span className="font-bold font-mono">${tx.amount.toLocaleString()} {tx.currency}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-800">
                  <span className="font-semibold text-rose-400">Fecha:</span>
                  <span className="font-mono">{tx.date}</span>
                </div>
              </div>
            );
          })()}
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setPaymentToDelete(null)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (paymentToDelete) {
                  deleteFinancialTransaction(paymentToDelete);
                  // Add an activity for audit log
                  addActivity({
                    studentId: student.id,
                    type: "academic",
                    date: new Date().toISOString().split("T")[0] + " " + new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
                    description: `Procesos Financieros: Se eliminó el pago con ID TRX-${paymentToDelete.slice(-4)} previa confirmación.`,
                  });
                  setPaymentToDelete(null);
                }
              }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center shadow-sm shadow-rose-600/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Eliminar Permanentemente
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setEditingEnrollment(null);
        }}
        title={editingEnrollment ? "Detalles de Inscripción" : "Añadir Clase"}
      >
        <form onSubmit={handleEnrollSubmit} className="space-y-4">
          {!canEditAcademicHistory && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium">
              Tu rol ({currentUser?.role || "Sin Rol"}) solo tiene permisos de
              lectura para el historial académico de los alumnos. No puedes
              guardar cambios.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Proveedor de Contenido Académico
            </label>
            <select
              required
              disabled={!canEditAcademicHistory}
              value={enrollForm.providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Seleccionar Proveedor...</option>
              {providers
                .filter(
                  (p) =>
                    !p.providerType ||
                    p.providerType === "Curriculum Académico",
                )
                .map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.commercialName || p.legalName}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Clase del Catálogo
            </label>
            <select
              required
              disabled={!canEditAcademicHistory || !enrollForm.providerId}
              value={enrollForm.classId}
              onChange={(e) => {
                const cId = e.target.value;
                const clsPrice = getAgreedPrice(cId, enrollForm.providerId);
                setEnrollForm({ ...enrollForm, classId: cId, price: clsPrice });
              }}
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              {!enrollForm.providerId ? (
                <option value="">-- Seleccionar Proveedor Primero --</option>
              ) : (
                <>
                  <option value="">Seleccionar clase...</option>
                  {classes
                    .filter(
                      (c) => c.providerId?.toString() === enrollForm.providerId,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name} ({c.code || "SIN CLAVE"})
                      </option>
                    ))}
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Inscripción
              </label>
              <input
                required
                type="date"
                disabled={!canEditAcademicHistory}
                value={enrollForm.enrollmentDate}
                onChange={(e) =>
                  setEnrollForm({
                    ...enrollForm,
                    enrollmentDate: e.target.value,
                  })
                }
                className="w-full border border-slate-200 bg-white rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Activación
              </label>
              <input
                required
                type="date"
                disabled={!canEditAcademicHistory}
                value={enrollForm.activationDate}
                onChange={(e) => handleActivationDateChange(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Término
              </label>
              <input
                required
                type="date"
                disabled={!canEditAcademicHistory}
                value={enrollForm.endDate}
                onChange={(e) =>
                  setEnrollForm({ ...enrollForm, endDate: e.target.value })
                }
                className="w-full border border-slate-200 bg-white rounded p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                disabled={!canEditAcademicHistory}
                value={enrollForm.status}
                onChange={(e) =>
                  setEnrollForm({
                    ...enrollForm,
                    status: e.target.value as any,
                  })
                }
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On hold">On hold</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Precio Acordado (USD)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                disabled={!canEditAcademicHistory}
                value={enrollForm.price}
                onChange={(e) =>
                  setEnrollForm({
                    ...enrollForm,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notas de Inscripción
            </label>
            <textarea
              disabled={!canEditAcademicHistory}
              value={enrollForm.notes}
              onChange={(e) =>
                setEnrollForm({
                  ...enrollForm,
                  notes: e.target.value,
                })
              }
              rows={3}
              placeholder="Ej. Beca, observaciones académicas o comerciales..."
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <div>
              {canEditAcademicHistory && editingEnrollment && (
                <button
                  type="button"
                  onClick={() => handleDeleteEnrollment(editingEnrollment.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition flex items-center gap-1 uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Inscripción
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsEnrollModalOpen(false);
                  setEditingEnrollment(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
              >
                Cerrar
              </button>
              {canEditAcademicHistory && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition uppercase tracking-wider shadow-sm flex items-center"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />{" "}
                  {editingEnrollment ? "Crear o Actualizar" : "Inscribir"}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL SERVICIOS EXTRAS */}
      <Modal
        isOpen={isExtraModalOpen}
        onClose={() => {
          setIsExtraModalOpen(false);
          setEditingExtraId(null);
        }}
        title={
          editingExtraId ? "Editar Servicio Extra" : "Añadir Servicio Extra"
        }
      >
        <form onSubmit={handleSaveExtraService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Servicio *
            </label>
            <input
              required
              type="text"
              placeholder="Ej. Seguro de Viaje, Tutoría Privada, etc."
              value={extraForm.name}
              onChange={(e) =>
                setExtraForm({ ...extraForm, name: e.target.value })
              }
              className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Costo *
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={extraForm.cost}
                onChange={(e) =>
                  setExtraForm({ ...extraForm, cost: e.target.value })
                }
                className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Moneda
              </label>
              <select
                value={extraForm.currency}
                onChange={(e) =>
                  setExtraForm({ ...extraForm, currency: e.target.value })
                }
                className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="USD">USD - Dólar</option>
                <option value="MXN">MXN - Peso</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notas / Detalles
            </label>
            <textarea
              rows={3}
              placeholder="Detalles sobre coberturas, proveedor, o plazos de entrega..."
              value={extraForm.notes}
              onChange={(e) =>
                setExtraForm({ ...extraForm, notes: e.target.value })
              }
              className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsExtraModalOpen(false);
                setEditingExtraId(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-xs font-bold uppercase tracking-wider shadow-sm transition"
            >
              Guardar Servicio
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para Cargar Documento del Alumno */}
      <Modal isOpen={isDetailDocModalOpen} onClose={() => {
        setIsDetailDocModalOpen(false);
        setSelectedFile(null);
        setDetailDocName('');
      }} title="Cargar Documento Escolar">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!detailDocName.trim() || !student) return;
          
          const processAndSave = (base64Data?: string) => {
            const fresh = [
              ...(student.documentsList || []),
              {
                id: Math.random().toString(36).substr(2, 9),
                name: detailDocName.trim(),
                fileName: selectedFile ? selectedFile.name : 'Documento_Carga_Manual.pdf',
                fileSize: selectedFile 
                  ? (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB" 
                  : (Math.random() * (2.5 - 0.2) + 0.2).toFixed(1) + " MB",
                uploadDate: new Date().toISOString().split('T')[0],
                fileData: base64Data
              }
            ];
            updateStudent(student.id, { documentsList: fresh });
            setIsDetailDocModalOpen(false);
            setSelectedFile(null);
            setDetailDocName('');

            // Log activity
            addActivity({
              institutionId: student.institutionId || 1,
              studentId: student.id,
              date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
              description: `Documentos: Se cargó el documento "${detailDocName.trim()}".`
            });
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
        }} className="space-y-4 font-sans text-left text-xs text-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Técnico / Descriptivo del Documento</label>
            <input 
              type="text" 
              required 
              value={detailDocName} 
              onChange={e => setDetailDocName(e.target.value)} 
              className="w-full border border-slate-200 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
              placeholder="Ej. Identificación Oficial, Acta de Nacimiento" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Archivo Adjunto</label>
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    if (!detailDocName) {
                      const idx = file.name.lastIndexOf('.');
                      const baseName = idx !== -1 ? file.name.substring(0, idx) : file.name;
                      setDetailDocName(baseName);
                    }
                  }
                }}
                className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            )}
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => {
              setIsDetailDocModalOpen(false);
              setSelectedFile(null);
              setDetailDocName('');
            }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition border-0 cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Cargar Documento</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Editar Nombre de Documento de Alumno */}
      <Modal isOpen={isEditDocModalOpen} onClose={() => setIsEditDocModalOpen(false)} title="Editar Nombre del Documento">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!editingDocName.trim() || !editingDoc || !student) return;
          const fresh = (student.documentsList || []).map((d: any) => {
            if (d.id === editingDoc.id) {
              return { ...d, name: editingDocName.trim() };
            }
            return d;
          });
          updateStudent(student.id, { documentsList: fresh });
          setIsEditDocModalOpen(false);
          setEditingDoc(null);

          // Log activity
          addActivity({
            institutionId: student.institutionId || 1,
            studentId: student.id,
            date: new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX"),
            description: `Documentos: Se cambió el nombre del documento de "${editingDoc.name}" a "${editingDocName.trim()}".`
          });
        }} className="space-y-4 font-sans text-left text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Descriptivo</label>
            <input type="text" required value={editingDocName} onChange={e => setEditingDocName(e.target.value)} className="w-full border border-slate-250 bg-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-850" />
          </div>
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsEditDocModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition border-0 cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition uppercase tracking-wider shadow-sm cursor-pointer border-0">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      {/* Modal para Visualizar Documento de Alumno */}
      <Modal isOpen={viewingDoc !== null} onClose={() => setViewingDoc(null)} title={`Visualizador: ${viewingDoc?.name || ''}`}>
        <div className="space-y-4 font-sans text-left pb-2 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
            <FileText className="w-10 h-10 text-indigo-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-slate-900 truncate text-sm">{viewingDoc?.name}</h5>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingDoc?.fileName || 'Carga Directa'}</p>
              <div className="flex space-x-4 mt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Fecha: {viewingDoc?.uploadDate}</span>
                <span>Tamaño: {viewingDoc?.fileSize}</span>
              </div>
            </div>
          </div>
          
          <div className="border border-slate-205 rounded-lg p-5 bg-slate-50/50 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
            {viewingDoc?.fileData?.startsWith('data:image/') ? (
              <img src={viewingDoc.fileData} alt={viewingDoc.name} className="max-h-[220px] object-contain rounded hover:scale-105 transition" referrerPolicy="no-referrer" />
            ) : (
              <>
                <svg className="w-12 h-12 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-bold text-slate-600">Previsualización Segura</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">El visualizador oficial es ideal para imágenes y firmas integradas.</p>
                </div>
              </>
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
                  link.download = viewingDoc.fileName || viewingDoc.name + '.txt';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }} 
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold uppercase transition flex items-center shrink-0 border border-emerald-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Descargar Archivo
            </button>
            <button type="button" onClick={() => setViewingDoc(null)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold uppercase transition border-0 cursor-pointer">Cerrar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
