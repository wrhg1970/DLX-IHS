import React, { useMemo, useState } from "react";
import { 
  BarChart as BarIcon, 
  PieChart as PieIcon, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Building, 
  Calendar, 
  Download, 
  Search, 
  X, 
  ArrowUpDown,
  DollarSign,
  GraduationCap,
  Percent,
  FileText,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  Briefcase,
  Printer,
  Crown,
  CreditCard,
  BookCheck,
  Filter,
  FileSpreadsheet,
  Lock
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAppContext, Institution } from "../context/AppContext";
import { InstitutionFinancialReportModal } from "../components/InstitutionFinancialReportModal";

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#312e81', '#4338ca'];

type ReportTab = 
  | 'Dashboard' 
  | 'Pagos de Clientes' 
  | 'Pagos a Proveedores' 
  | '% Comisiones' 
  | 'Estado de Cuenta' 
  | 'Facturas' 
  | 'Cash Flow' 
  | 'Estado de Resultados';

export function Reportes() {
  const { 
    institutions, 
    students, 
    classes, 
    enrollments, 
    payments, 
    financialTransactions, 
    bankAccounts, 
    providers,
    users,
    updateFinancialTransaction,
    catalogs,
    companyInfo,
    providerProductServices,
    currentUser
  } = useAppContext();

  // Selected institution for financial report modal
  const [instReportModal, setInstReportModal] = useState<Institution | null>(null);
  const [instReportType, setInstReportType] = useState<'institucion' | 'interno'>('institucion');

  const [activeTab, setActiveTab] = useState<ReportTab>('Dashboard');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [studentFilter, setStudentFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const [dateRange, setDateRange] = useState("year");

  // Selection state for Operation Detail modal (Ver Operación)
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<any>(null);

  // Invoicing helper state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [inputTaxId, setInputTaxId] = useState('');

  // Facturas sub-filter
  const [activeFacturaFilter, setActiveFacturaFilter] = useState<'Todas' | 'Solicitadas' | 'Facturadas'>('Todas');

  // Print Preview state
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Concept Filter state for customer payments report (Cursos vs Membresía)
  const [paymentConceptFilter, setPaymentConceptFilter] = useState<'all' | 'courses' | 'membership'>('all');

  // Print Payment Report modal state
  const [isPrintPaymentReportOpen, setIsPrintPaymentReportOpen] = useState(false);

  // Helper to categorize payment as Membership or Courses
  const isMembershipPayment = (tx: any) => {
    return (
      tx.subcategory === 'sub_membresia' ||
      (tx.concept && (tx.concept.toLowerCase().includes('membresía') || tx.concept.toLowerCase().includes('membresia'))) ||
      (tx.description && (tx.description.toLowerCase().includes('membresía') || tx.description.toLowerCase().includes('membresia')))
    );
  };

  // --- EXCHANGE RATE COMPENSATIONS ---
  const averageExchangeRate = useMemo(() => {
    const validRates = financialTransactions
      .filter(tx => tx.exchangeRate && tx.exchangeRate > 1)
      .map(tx => tx.exchangeRate);
    if (validRates.length === 0) return 18.5; // default fallback
    const sum = validRates.reduce((acc, r) => acc + r, 0);
    return sum / validRates.length;
  }, [financialTransactions]);

  const isUSDOrWellsFargoAccount = (ba: any) => {
    if (!ba) return false;
    const name = ba.bankName?.toLowerCase() || '';
    return name.includes('wellsfargo') || name.includes('wells fargo') || ba.currency === 'USD';
  };

  // --- DYNAMIC DATA COMPUTATIONS FOR THE DASHBOARD TAB ---
  const dashboardTxs = useMemo(() => {
    if (dateRange === "all") return financialTransactions;

    const baseDate = new Date("2026-06-10");
    
    return financialTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return true;
      
      const diffTime = baseDate.getTime() - txDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (dateRange === "month") {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (dateRange === "quarter") {
        return diffDays >= 0 && diffDays <= 90;
      }
      if (dateRange === "year") {
        return txDate.getFullYear() === baseDate.getFullYear();
      }
      return true;
    });
  }, [financialTransactions, dateRange]);

  const dashboardKPIs = useMemo(() => {
    let totalIncomeMXN = 0;
    let totalIncomeUSD = 0;
    let totalExpenseMXN = 0;
    let totalExpenseUSD = 0;

    dashboardTxs.forEach(tx => {
      const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
      const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
      const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

      const finalMXNVal = isUSDAcc
        ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
        : tx.amountMXN;

      const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);

      if (tx.type === "income") {
        totalIncomeMXN += finalMXNVal;
        totalIncomeUSD += amountUSD;
      } else if (tx.type === "expense") {
        totalExpenseMXN += finalMXNVal;
        totalExpenseUSD += amountUSD;
      }
    });

    const netMarginMXN = totalIncomeMXN - totalExpenseMXN;
    const netMarginUSD = totalIncomeUSD - totalExpenseUSD;

    return {
      totalIncomeMXN,
      totalIncomeUSD,
      totalExpenseMXN,
      totalExpenseUSD,
      netMarginMXN,
      netMarginUSD
    };
  }, [dashboardTxs, bankAccounts, averageExchangeRate]);

  const financialMonthlyData = useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const incomeCounts: Record<string, number> = {};
    const expenseCounts: Record<string, number> = {};

    financialTransactions.forEach(tx => {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === 2026) {
          const m = months[d.getMonth()];
          const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
          const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
          const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

          const finalMXNVal = isUSDAcc
            ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
            : tx.amountMXN;

          if (tx.type === "income") {
            incomeCounts[m] = (incomeCounts[m] || 0) + finalMXNVal;
          } else if (tx.type === "expense") {
            expenseCounts[m] = (expenseCounts[m] || 0) + finalMXNVal;
          }
        }
      }
    });

    return months.map(m => ({
      mes: m,
      Ingresos: incomeCounts[m] || 0,
      Egresos: expenseCounts[m] || 0
    }));
  }, [financialTransactions, bankAccounts, averageExchangeRate]);

  // KPI Cards
  const totalStudents = students.length;
  const totalInstitutions = institutions.length;
  const totalClasses = classes.length;
  const totalRevenue = payments.reduce((acc, p) => acc + p.finalAmount, 0);

  // Alumnos por País (Basado en alumnos y sus instituciones)
  const studentsByCountry = useMemo(() => {
    const data: Record<string, number> = {};
    students.forEach(st => {
      const inst = institutions.find(i => Number(i.id) === Number(st.institutionId));
      const countryName = inst?.country || st.country || 'Desconocido';
      data[countryName] = (data[countryName] || 0) + 1;
    });
    return Object.keys(data).map(key => ({ name: key, count: data[key] })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [students, institutions]);

  // Inscripciones por Clase (Basado en matrículas reales)
  const classEnrollmentData = useMemo(() => {
    return classes.map(c => {
      const liveEnrolled = enrollments.filter(e => Number(e.classId) === Number(c.id)).length;
      return {
        name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
        Inscritos: liveEnrolled
      };
    }).sort((a, b) => b.Inscritos - a.Inscritos).slice(0, 5);
  }, [classes, enrollments]);

  // Inscripciones Mensuales (Dinámico desde matrículas)
  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const counts: Record<string, number> = {};
    enrollments.forEach(e => {
      const d = new Date(e.startDate || e.enrollmentDate || '');
      if (!isNaN(d.getTime())) {
        const m = months[d.getMonth()];
        counts[m] = (counts[m] || 0) + 1;
      }
    });
    return months.map(m => ({ mes: m, Inscripciones: counts[m] || 0 }));
  }, [enrollments]);

  // General filter & sort for standard customer payment list
  const filteredPayments = useMemo(() => {
    const type = activeTab === 'Pagos de Clientes' ? 'income' : 'expense';
    let result = financialTransactions.filter(tx => tx.type === type);

    if (dateRangeFilter.start) {
      result = result.filter(tx => tx.date >= dateRangeFilter.start);
    }
    if (dateRangeFilter.end) {
      result = result.filter(tx => tx.date <= dateRangeFilter.end);
    }
    if (studentFilter) {
      result = result.filter(tx => tx.studentId?.toString() === studentFilter);
    }
    if (institutionFilter) {
      result = result.filter(tx => {
        const student = students.find(s => s.id === tx.studentId);
        return student?.institutionId?.toString() === institutionFilter;
      });
    }
    if (statusFilter) {
      result = result.filter(tx => tx.status === statusFilter);
    }
    if (accountFilter) {
      if (accountFilter === 'caja') {
        result = result.filter(tx => !tx.bankAccountId);
      } else {
        result = result.filter(tx => tx.bankAccountId?.toString() === accountFilter);
      }
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(tx => {
        const student = students.find(s => s.id === tx.studentId);
        const institution = institutions.find(i => i.id === student?.institutionId);
        const provider = providers.find(p => p.id === tx.providerId);
        const bankAc = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
        
        return tx.description.toLowerCase().includes(lowerSearch) || 
               student?.name.toLowerCase().includes(lowerSearch) ||
               student?.lastName?.toLowerCase().includes(lowerSearch) ||
               institution?.name.toLowerCase().includes(lowerSearch) ||
               provider?.commercialName?.toLowerCase().includes(lowerSearch) ||
               provider?.legalName?.toLowerCase().includes(lowerSearch) ||
               tx.paymentMethod?.toLowerCase().includes(lowerSearch) ||
               bankAc?.bankName?.toLowerCase().includes(lowerSearch) ||
               tx.bankAccountId?.toString().toLowerCase().includes(lowerSearch);
      });
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = (a as any)[sortConfig.key];
        let bValue: any = (b as any)[sortConfig.key];
        
        if (sortConfig.key === 'date') {
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [financialTransactions, activeTab, dateRangeFilter, studentFilter, institutionFilter, statusFilter, accountFilter, searchTerm, sortConfig, students, institutions, providers, bankAccounts]);

  // Separated statistics for Customer Payments (Cursos vs Membresía)
  const paymentConcentrationStats = useMemo(() => {
    let coursesCount = 0;
    let coursesAmountMXN = 0;
    let coursesAmountUSD = 0;

    let membCount = 0;
    let membAmountMXN = 0;
    let membAmountUSD = 0;

    filteredPayments.forEach(tx => {
      const ba = bankAccounts.find(account => account.id.toString() === tx.bankAccountId?.toString());
      const isUSDAcc = isUSDOrWellsFargoAccount(ba);
      const rate = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

      // Monto MXN calculation
      const finalMXNVal = isUSDAcc 
        ? (tx.currency === 'USD' ? tx.amount * rate : tx.amountMXN) 
        : tx.amountMXN;

      // Monto USD calculation
      const finalUSDVal = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rate);

      if (isMembershipPayment(tx)) {
        membCount++;
        membAmountMXN += finalMXNVal;
        membAmountUSD += finalUSDVal;
      } else {
        coursesCount++;
        coursesAmountMXN += finalMXNVal;
        coursesAmountUSD += finalUSDVal;
      }
    });

    const totalCount = coursesCount + membCount;
    const totalAmountMXN = coursesAmountMXN + membAmountMXN;
    const totalAmountUSD = coursesAmountUSD + membAmountUSD;

    const coursesPct = totalAmountUSD > 0 ? (coursesAmountUSD / totalAmountUSD) * 100 : 0;
    const membPct = totalAmountUSD > 0 ? (membAmountUSD / totalAmountUSD) * 100 : 0;

    return {
      courses: {
        count: coursesCount,
        amountMXN: coursesAmountMXN,
        amountUSD: coursesAmountUSD,
        percentage: coursesPct,
      },
      membership: {
        count: membCount,
        amountMXN: membAmountMXN,
        amountUSD: membAmountUSD,
        percentage: membPct,
      },
      total: {
        count: totalCount,
        amountMXN: totalAmountMXN,
        amountUSD: totalAmountUSD,
      }
    };
  }, [filteredPayments, bankAccounts, averageExchangeRate]);

  // Payments to display in the table based on active tab & concept sub-filter
  const displayedPayments = useMemo(() => {
    if (activeTab !== 'Pagos de Clientes') return filteredPayments;
    if (paymentConceptFilter === 'courses') {
      return filteredPayments.filter(tx => !isMembershipPayment(tx));
    }
    if (paymentConceptFilter === 'membership') {
      return filteredPayments.filter(tx => isMembershipPayment(tx));
    }
    return filteredPayments;
  }, [filteredPayments, activeTab, paymentConceptFilter]);

  const reportStats = useMemo(() => {
    const count = filteredPayments.length;
    let totalAmountMXN = 0;
    let totalAmountUSD = 0;

    filteredPayments.forEach(tx => {
      const ba = bankAccounts.find(account => account.id.toString() === tx.bankAccountId?.toString());
      const isUSDAcc = isUSDOrWellsFargoAccount(ba);
      const rate = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

      // Monto MXN calculation
      const finalMXNVal = isUSDAcc 
        ? (tx.currency === 'USD' ? tx.amount * rate : tx.amountMXN) 
        : tx.amountMXN;

      // Monto USD calculation
      const finalUSDVal = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rate);

      totalAmountMXN += finalMXNVal;
      totalAmountUSD += finalUSDVal;
    });

    return { count, totalAmountMXN, totalAmountUSD };
  }, [filteredPayments, bankAccounts, averageExchangeRate]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const instStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    institutions.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [institutions]);

  const clearReportFilters = () => {
    setDateRangeFilter({ start: '', end: '' });
    setStudentFilter('');
    setInstitutionFilter('');
    setStatusFilter('');
    setAccountFilter('');
    setAgentFilter('');
    setSearchTerm('');
    setPaymentConceptFilter('all');
  };

  // --- DYNAMIC HELPERS FOR % COMISIONES ---
  const commissionSummary = useMemo(() => {
    const rowsMap: Record<string, {
      institutionId: number;
      institutionName: string;
      agentId: number;
      agentName: string;
      generated: number;
      paid: number;
    }> = {};

    // First risk-free processing of all institutions that have an assigned agent
    institutions.forEach(inst => {
      const agId = inst.agentId;
      if (!agId) return;

      // Filter dropdowns if any
      if (institutionFilter && inst.id.toString() !== institutionFilter) return;
      if (agentFilter && agId.toString() !== agentFilter) return;

      const key = `${inst.id}_${agId}`;
      const agentObj = users.find(u => u.id === agId);

      if (!rowsMap[key]) {
        rowsMap[key] = {
          institutionId: inst.id,
          institutionName: inst.name,
          agentId: agId,
          agentName: agentObj?.name || `Agente #${agId}`,
          generated: 0,
          paid: 0
        };
      }

      // Calculate generated commission for each student in this institution
      const instStudents = students.filter(s => s.institutionId === inst.id);
      
      instStudents.forEach(student => {
        // Gather transaction histories for this student
        const studentTxs = financialTransactions.filter(tx => tx.studentId === student.id);

        // Date range filter
        const filteredStudentTxs = studentTxs.filter(tx => {
          if (dateRangeFilter.start && tx.date < dateRangeFilter.start) return false;
          if (dateRangeFilter.end && tx.date > dateRangeFilter.end) return false;
          return true;
        });

        if (filteredStudentTxs.length === 0 && studentTxs.length > 0) {
          // Skip if transactions exist but not in date selection
        }

        // 1. MEMBERSHIP
        // Expected Membership Price
        const rawMembPrice = inst.membershipPrice || "0";
        const expectedMembership = parseFloat(rawMembPrice.replace(/[^0-9.-]+/g, "") || "0");
        
        // Paid Membership (applied income transactions for this student where subcategory is sub_membresia)
        const paidMembership = studentTxs
          .filter(tx => tx.type === 'income' && (tx.status === 'Aplicado' || tx.status === 'Pagado') && tx.subcategory === 'sub_membresia')
          .reduce((sum, tx) => sum + tx.amount, 0);

        let membrCommGen = 0;
        // Commissions generated only once paid in full
        if (expectedMembership > 0 && paidMembership >= expectedMembership) {
          if (inst.membershipCommissionType === 'percentage') {
            membrCommGen = expectedMembership * ((inst.membershipCommissionValue || 0) / 100);
          } else if (inst.membershipCommissionType === 'fixed') {
            membrCommGen = inst.membershipCommissionValue || 0;
          }
        }

        // 2. COURSES
        // Expected Course Prices (sum of enrollments)
        const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
        const expectedCourseTotal = studentEnrollments.reduce((sum, e) => {
          let cp = e.price;
          if (cp === undefined || cp === null) {
            const cl = classes.find(c => c.id === e.classId);
            if (cl) {
              cp = parseFloat((cl.price || "0").replace(/[^0-9.-]+/g, "") || "0");
            } else {
              cp = 0;
            }
          }
          return sum + (cp || 0);
        }, 0);

        // Paid Courses (applied income transactions where student matches and subcategory is not sub_membresia)
        const paidCourse = studentTxs
          .filter(tx => tx.type === 'income' && (tx.status === 'Aplicado' || tx.status === 'Pagado') && tx.subcategory !== 'sub_membresia')
          .reduce((sum, tx) => sum + tx.amount, 0);

        let courseCommGen = 0;
        // Commissions generated only once paid in full
        if (expectedCourseTotal > 0 && paidCourse >= expectedCourseTotal) {
          if (inst.courseCommissionType === 'percentage') {
            courseCommGen = expectedCourseTotal * ((inst.courseCommissionValue || 0) / 100);
          } else if (inst.courseCommissionType === 'fixed') {
            courseCommGen = inst.courseCommissionValue || 0;
          } else if (inst.courseCommissionType === 'per_course') {
            courseCommGen = studentEnrollments.length * (inst.courseCommissionValue || 0);
          }
        }

        rowsMap[key].generated += (membrCommGen + courseCommGen);
      });
    });

    // Commission Paid: Expense transactions that represent commission payout
    financialTransactions.forEach(tx => {
      if (dateRangeFilter.start && tx.date < dateRangeFilter.start) return;
      if (dateRangeFilter.end && tx.date > dateRangeFilter.end) return;

      const agId = tx.agentId;
      if (!agId) return;

      let instId = tx.institutionId;
      if (!instId && tx.studentId) {
        const student = students.find(s => s.id === tx.studentId);
        if (student) {
          instId = student.institutionId;
        }
      }

      if (agId && instId) {
        if (institutionFilter && instId.toString() !== institutionFilter) return;
        if (agentFilter && agId.toString() !== agentFilter) return;

        const key = `${instId}_${agId}`;
        
        // Commission Paid: Expense transactions representing commission payout
        if (
          tx.type === 'expense' && 
          (tx.categoryId === 'cat_gastos_venta' || 
           tx.subcategory === 'sub_comisiones_rep' || 
           tx.subcategory === 'sub_comisiones_vend' || 
           tx.description.toLowerCase().includes('comisi'))
        ) {
          if (!rowsMap[key]) {
            const instObj = institutions.find(i => i.id === instId);
            const agentObj = users.find(u => u.id === agId);
            rowsMap[key] = {
              institutionId: instId,
              institutionName: instObj?.name || `Institución #${instId}`,
              agentId: agId,
              agentName: agentObj?.name || `Agente #${agId}`,
              generated: 0,
              paid: 0
            };
          }
          rowsMap[key].paid += tx.amountMXN;
        }
      }
    });

    const rows = Object.values(rowsMap).map(r => ({
      ...r,
      balance: r.generated - r.paid
    }));

    const totalGeneratedSum = rows.reduce((s, r) => s + r.generated, 0);
    const totalPaidSum = rows.reduce((s, r) => s + r.paid, 0);
    const totalBalanceSum = totalGeneratedSum - totalPaidSum;

    return { rows, totalGeneratedSum, totalPaidSum, totalBalanceSum };
  }, [financialTransactions, students, institutions, users, enrollments, classes, dateRangeFilter, institutionFilter, agentFilter]);

  // --- GET EXPECTED ENROLLMENT VALUE FOR ESTADO DE CUENTA ---
  const expectedEnrollmentValues = useMemo(() => {
    const studentMap: Record<number, number> = {};
    students.forEach(s => {
      const studentEnrollments = enrollments.filter(e => e.studentId === s.id);
      studentMap[s.id] = studentEnrollments.reduce((sum, e) => {
        let cp = e.price;
        if (cp === undefined || cp === null) {
          const cl = classes.find(c => c.id === e.classId);
          if (cl) {
            cp = parseFloat((cl.price || "0").replace(/[^0-9.-]+/g, "") || "0");
          } else {
            cp = 0;
          }
        }
        return sum + (cp || 0);
      }, 0);
    });
    return studentMap;
  }, [students, enrollments, classes]);

  // --- DYNAMIC HELPERS FOR ESTADO DE CUENTA ---
  const estadoDeCuentaRows = useMemo(() => {
    let list = financialTransactions.map(tx => {
      let instId = 0;
      let instName = "Global / Administrativo";
      let expectedIncomeMXN = 0;

      if (tx.studentId) {
        const student = students.find(s => s.id === tx.studentId);
        if (student) {
          instId = student.institutionId || tx.institutionId || 0;
          const instObj = institutions.find(i => i.id === instId);
          instName = instObj?.name || `Institución #${instId}`;
          
          // Expected is the student's enrollment cost
          expectedIncomeMXN = expectedEnrollmentValues[tx.studentId] || 0;
        }
      } else if (tx.institutionId) {
        instId = tx.institutionId;
        const instObj = institutions.find(i => i.id === instId);
        instName = instObj?.name || `Institución #${instId}`;
      }

      const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
      const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
      const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

      const finalMXNVal = isUSDAcc
        ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
        : tx.amountMXN;

      const finalUSDVal = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);

      const expectedIncomeUSD = expectedIncomeMXN / rateUsed;

      const realIncomeMXN = tx.type === 'income' ? finalMXNVal : 0;
      const realIncomeUSD = tx.type === 'income' ? finalUSDVal : 0;

      const expenseMXN = tx.type === 'expense' ? finalMXNVal : 0;
      const expenseUSD = tx.type === 'expense' ? finalUSDVal : 0;
      
      // Represent 10% commission of the income transaction if agent is present
      const commissionMXN = tx.type === 'income' ? finalMXNVal * 0.10 : 0;
      const commissionUSD = realIncomeUSD * 0.10;

      const marginMXN = realIncomeMXN - expenseMXN - commissionMXN;
      const marginUSD = realIncomeUSD - expenseUSD - commissionUSD;

      return {
        id: tx.id,
        date: tx.date,
        institutionName: instName,
        institutionId: instId,
        bankAccountId: tx.bankAccountId,
        status: tx.status || 'Aplicado',
        expectedIncomeMXN,
        expectedIncomeUSD,
        realIncomeMXN,
        realIncomeUSD,
        expenseMXN,
        expenseUSD,
        commissionMXN,
        commissionUSD,
        marginMXN,
        marginUSD,
        description: tx.description
      };
    });

    // Apply filters
    if (dateRangeFilter.start) {
      list = list.filter(r => r.date >= dateRangeFilter.start);
    }
    if (dateRangeFilter.end) {
      list = list.filter(r => r.date <= dateRangeFilter.end);
    }
    if (institutionFilter) {
      list = list.filter(r => r.institutionId?.toString() === institutionFilter);
    }
    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    if (accountFilter) {
      if (accountFilter === 'caja') {
        list = list.filter(r => !r.bankAccountId);
      } else {
        list = list.filter(r => r.bankAccountId?.toString() === accountFilter);
      }
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.institutionName.toLowerCase().includes(lower) || 
        r.description.toLowerCase().includes(lower)
      );
    }

    // Sorting
    if (sortConfig) {
      list.sort((a, b) => {
        let aValue = (a as any)[sortConfig.key];
        let bValue = (b as any)[sortConfig.key];
        if (sortConfig.key === 'date') {
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Sort by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return list;
  }, [financialTransactions, students, institutions, expectedEnrollmentValues, dateRangeFilter, institutionFilter, statusFilter, accountFilter, searchTerm, sortConfig, bankAccounts, averageExchangeRate]);

  // --- TOTALS FOR ESTADO DE CUENTA ---
  const estadoDeCuentaTotals = useMemo(() => {
    let expectedMXN = 0;
    let expectedUSD = 0;
    let realMXN = 0;
    let realUSD = 0;
    let expenseMXN = 0;
    let expenseUSD = 0;
    let commissionMXN = 0;
    let commissionUSD = 0;
    let marginMXN = 0;
    let marginUSD = 0;

    estadoDeCuentaRows.forEach(row => {
      expectedMXN += row.expectedIncomeMXN || 0;
      expectedUSD += row.expectedIncomeUSD || 0;
      realMXN += row.realIncomeMXN || 0;
      realUSD += row.realIncomeUSD || 0;
      expenseMXN += row.expenseMXN || 0;
      expenseUSD += row.expenseUSD || 0;
      commissionMXN += row.commissionMXN || 0;
      commissionUSD += row.commissionUSD || 0;
      marginMXN += row.marginMXN || 0;
      marginUSD += row.marginUSD || 0;
    });

    return {
      expectedMXN, expectedUSD,
      realMXN, realUSD,
      expenseMXN, expenseUSD,
      commissionMXN, commissionUSD,
      marginMXN, marginUSD
    };
  }, [estadoDeCuentaRows]);

  // --- DYNAMIC HELPERS FOR FACTURAS ---
  const facturasRows = useMemo(() => {
    // Both income and expense can have invoice requests, but primarily incomes/payments
    let list = financialTransactions.map(tx => {
      let clientOrProvider = "N/A";
      let instName = "N/A";
      let instId = tx.institutionId;
      
      if (tx.studentId) {
        const student = students.find(s => s.id === tx.studentId);
        if (student) {
          clientOrProvider = `${student.name} ${student.lastName || ''}`;
          instId = student.institutionId || tx.institutionId;
          const instObj = institutions.find(i => i.id === instId);
          instName = instObj?.name || 'Global';
        }
      } else if (tx.institutionId) {
        instId = tx.institutionId;
        const instObj = institutions.find(i => i.id === instId);
        clientOrProvider = instObj?.name || 'Institución Directa';
        instName = instObj?.name || 'Global';
      } else if (tx.providerId) {
        const provider = providers.find(p => p.id === tx.providerId);
        if (provider) {
          clientOrProvider = provider.commercialName || provider.legalName;
        }
      }

      const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / (tx.exchangeRate || 18.0));

      return {
        id: tx.id,
        date: tx.date,
        clientOrProvider,
        institutionId: instId,
        institutionName: instName,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency,
        amountMXN: tx.amountMXN,
        amountUSD,
        taxId: tx.taxId,
        invoiceRequested: !!tx.invoiceRequested,
        categoryId: tx.categoryId,
        type: tx.type
      };
    });

    // Sub-selector filter
    if (activeFacturaFilter === 'Solicitadas') {
      list = list.filter(r => r.invoiceRequested && !r.taxId);
    } else if (activeFacturaFilter === 'Facturadas') {
      list = list.filter(r => !!r.taxId);
    }

    // General search & date filters
    if (dateRangeFilter.start) {
      list = list.filter(r => r.date >= dateRangeFilter.start);
    }
    if (dateRangeFilter.end) {
      list = list.filter(r => r.date <= dateRangeFilter.end);
    }
    if (institutionFilter) {
      list = list.filter(r => r.institutionId?.toString() === institutionFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.clientOrProvider.toLowerCase().includes(lower) || 
        r.description.toLowerCase().includes(lower) || 
        r.taxId?.toLowerCase().includes(lower)
      );
    }

    return list;
  }, [financialTransactions, students, institutions, providers, activeFacturaFilter, dateRangeFilter, institutionFilter, searchTerm]);

  // Handle invoice request trigger
  const handleToggleInvoiceRequest = (txId: string, current: boolean) => {
    updateFinancialTransaction(txId, { invoiceRequested: !current });
  };

  // Handle setting taxId Folio
  const handleSaveTaxId = (txId: string) => {
    updateFinancialTransaction(txId, { taxId: inputTaxId, invoiceRequested: false });
    setEditingTxId(null);
    setInputTaxId('');
  };

  // --- DYNAMIC HELPERS FOR CASH FLOW ---
  const cashFlowRows = useMemo(() => {
    let list = financialTransactions.map(tx => {
      let studentName = "N/A";
      let instName = "Global / Administrativo";
      let instId = tx.institutionId || 0;
      
      if (tx.studentId) {
        const student = students.find(s => s.id === tx.studentId);
        if (student) {
          studentName = `${student.name} ${student.lastName || ''}`;
          instId = student.institutionId || tx.institutionId || 0;
          const instObj = institutions.find(i => i.id === instId);
          instName = instObj?.name || 'Global';
        }
      } else if (tx.institutionId) {
        instId = tx.institutionId;
        const instObj = institutions.find(i => i.id === instId);
        studentName = instObj?.name || 'Institución Directa';
        instName = instObj?.name || 'Global';
      }

      const bankAcc = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
      const accountLabel = bankAcc ? `${bankAcc.bankName} (${bankAcc.accountNumber})` : "Caja General";

      const isUSDAcc = isUSDOrWellsFargoAccount(bankAcc);
      const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;

      const finalMXNVal = isUSDAcc
        ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
        : tx.amountMXN;

      return {
        id: tx.id,
        date: tx.date,
        studentName,
        institutionId: instId,
        institutionName: instName,
        accountName: accountLabel,
        bankAccountId: tx.bankAccountId,
        status: tx.status || 'Aplicado',
        paymentMethod: tx.paymentMethod || "Transferencia",
        income: tx.type === 'income' ? tx.amount : 0,
        exchangeRate: rateUsed,
        amountMXN: finalMXNVal,
        expense: tx.type === 'expense' ? tx.amount : 0,
        currency: tx.currency
      };
    });

    // Filters
    if (dateRangeFilter.start) {
      list = list.filter(r => r.date >= dateRangeFilter.start);
    }
    if (dateRangeFilter.end) {
      list = list.filter(r => r.date <= dateRangeFilter.end);
    }
    if (institutionFilter) {
      list = list.filter(r => r.institutionId?.toString() === institutionFilter);
    }
    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    if (accountFilter) {
      if (accountFilter === 'caja') {
        list = list.filter(r => !r.bankAccountId);
      } else {
        list = list.filter(r => r.bankAccountId?.toString() === accountFilter);
      }
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.studentName.toLowerCase().includes(lower) || 
        r.institutionName.toLowerCase().includes(lower) || 
        r.accountName.toLowerCase().includes(lower) || 
        r.paymentMethod.toLowerCase().includes(lower) ||
        r.id.toLowerCase().includes(lower)
      );
    }

    // Sort by Date descending by default
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [financialTransactions, students, institutions, bankAccounts, dateRangeFilter, institutionFilter, statusFilter, accountFilter, searchTerm, averageExchangeRate]);

  // Client-side Cash Flow export to CSV
  const handleExportCashFlowCSV = () => {
    const headers = [
      'Fecha', 
      'No. Transaccion', 
      'Alumno', 
      'Instituto', 
      'Cuenta Pago', 
      'Metodo Pago', 
      'Ingreso', 
      'Tipo Cambio', 
      'Monto MXN', 
      'Egreso'
    ];

    const rows = cashFlowRows.map(r => [
      r.date,
      r.id,
      r.studentName,
      r.institutionName,
      r.accountName,
      r.paymentMethod,
      r.income > 0 ? `${r.income} ${r.currency}` : '-',
      r.exchangeRate,
      r.amountMXN,
      r.expense > 0 ? `${r.expense} ${r.currency}` : '-'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cash_flow_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DYNAMIC HELPERS FOR ESTADO DE RESULTADOS ---
  const erStatement = useMemo(() => {
    const filterByDateRange = (dateStr: string) => {
      if (dateRangeFilter.start && dateStr < dateRangeFilter.start) return false;
      if (dateRangeFilter.end && dateStr > dateRangeFilter.end) return false;
      return true;
    };

    const txs = financialTransactions.filter(tx => filterByDateRange(tx.date));

    // Helper to extract sum of category matching both pre-defined ID or catalog name
    const getCategorySum = (categoryId: string) => {
      return txs
        .filter(tx => {
          if (tx.categoryId === categoryId) return true;
          // resillience fallback name matching
          const catCatalog = catalogs['Categorías']?.find(c => c.id === tx.categoryId);
          if (catCatalog) {
            const normCatalog = catCatalog.name.toLowerCase().replace(/[^a-z]/g, '');
            const normSearch = categoryId.toLowerCase().replace(/[^a-z]/g, '');
            if (normCatalog.includes(normSearch) || normSearch.includes(normCatalog)) return true;
          }
          return false;
        })
        .reduce((sum, tx) => sum + tx.amountMXN, 0);
    };

    // 1. general income base
    const rawIngresosVal = txs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amountMXN, 0);

    // 2. pago servicios
    const paymentServiciosVal = getCategorySum('cat_pago_servicios');

    // 3. gastos ventas
    const indexGastosVentaVal = getCategorySum('cat_gastos_venta');

    // 4. reembolsos
    const indexReembolsosVal = getCategorySum('cat_reembolso');

    // Margen utilidad
    const margenUtilidadVal = rawIngresosVal - paymentServiciosVal - indexGastosVentaVal - indexReembolsosVal;

    // Gastos Generales
    // 5. Gastos Operativos
    const indexGastosOperativosVal = getCategorySum('cat_gastos_operativos');

    // 6. Gastos Administrativos
    const indexGastosAdministrativosVal = getCategorySum('cat_gastos_administrativos');

    // 7. Sueldos y salarios
    const indexSueldosSalariosVal = getCategorySum('cat_sueldos_salarios');

    // Subtotal Gastos
    const subtotalGastosVal = indexGastosOperativosVal + indexGastosAdministrativosVal + indexSueldosSalariosVal;

    // Margen Bruto
    const margenBrutoVal = margenUtilidadVal - subtotalGastosVal;

    // 8. Impuestos
    const impuestosVal = getCategorySum('cat_impuestos');

    // Margen Neto
    const margenNetoVal = margenBrutoVal - impuestosVal;

    return {
      ingresos: rawIngresosVal,
      pagoServicios: paymentServiciosVal,
      gastosVenta: indexGastosVentaVal,
      reembolsos: indexReembolsosVal,
      margenUtilidad: margenUtilidadVal,
      gastosOperativos: indexGastosOperativosVal,
      gastosAdministrativos: indexGastosAdministrativosVal,
      sueldosSalarios: indexSueldosSalariosVal,
      subtotalGastos: subtotalGastosVal,
      margenBruto: margenBrutoVal,
      impuestos: impuestosVal,
      margenNeto: margenNetoVal
    };
  }, [financialTransactions, dateRangeFilter, catalogs]);

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 overflow-y-auto p-8 bg-slate-50/50">
      
      {/* Title */}
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reportes y Analíticas</h2>
        <p className="text-sm text-slate-500 font-medium">Control financiero, comisiones, cuentas y flujos generales.</p>
      </div>

      {/* Tab Switcher - Responsive compact row */}
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto max-w-full mb-8 shrink-0 scrollbar-none border border-slate-200/50 shadow-sm">
        {([
          'Dashboard', 
          'Pagos de Clientes', 
          'Pagos a Proveedores', 
          '% Comisiones', 
          'Estado de Cuenta', 
          'Facturas', 
          'Cash Flow', 
          'Estado de Resultados'
        ] as ReportTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              clearReportFilters();
            }}
            className={`px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/30 font-black"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters bar for report tabs except dashboard & results */}
      {activeTab !== 'Dashboard' && activeTab !== 'Estado de Resultados' && (
        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm mb-6 shrink-0 space-y-4">
          <div className="flex flex-wrap items-end gap-3.5">
            {/* General Description Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Búsqueda General</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Date start */}
            <div className="w-36">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fecha Inicio</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateRangeFilter.start}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Date end */}
            <div className="w-36">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fecha Fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateRangeFilter.end}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Institute Filter (applicable to multiple reports) */}
            <div className="w-48">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Institución</label>
              <select
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todas las instituciones</option>
                {[...institutions].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter - Dynamic for Payments */}
            {(activeTab === 'Pagos de Clientes' || activeTab === 'Pagos a Proveedores' || activeTab === 'Estado de Cuenta' || activeTab === 'Cash Flow') && (
              <div className="w-40">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Estado Pago</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer animate-in fade-in slide-in-from-top-1"
                >
                  <option value="">Todos los estados</option>
                  <option value="Aplicado">Aplicado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Programado">Programado</option>
                </select>
              </div>
            )}

            {/* Account Filter - Dynamic for Payments */}
            {(activeTab === 'Pagos de Clientes' || activeTab === 'Pagos a Proveedores' || activeTab === 'Estado de Cuenta' || activeTab === 'Cash Flow') && (
              <div className="w-48">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cuenta Origen/Destino</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer animate-in fade-in slide-in-from-top-1"
                >
                  <option value="">Todas las cuentas</option>
                  <option value="caja">Caja General</option>
                  {bankAccounts.map(ba => (
                    <option key={ba.id} value={ba.id}>{ba.bankName} ({ba.accountNumber})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Agent filter - Dynamic for % Comisiones */}
            {activeTab === '% Comisiones' && (
              <div className="w-48">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vendedor / Agente</label>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Todos los agentes</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear filters trigger */}
            <button
              onClick={clearReportFilters}
              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === 'Dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-4 shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Métricas clave e inscripción</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="month">Último mes</option>
                <option value="quarter">Último trimestre</option>
                <option value="year">Este año</option>
                <option value="all">Todo el tiempo</option>
              </select>
            </div>
          </div>

          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
            {/* Ingresos Globales */}
            <div className="bg-emerald-50/70 border border-emerald-100 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-100">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ingresos Totales ({dateRange === 'all' ? 'Consolidado' : dateRange === 'year' ? 'Año' : dateRange === 'quarter' ? 'Trimestre' : 'Mes'})</p>
                <p className="text-xl font-black text-slate-800 leading-tight">
                  ${dashboardKPIs.totalIncomeMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  (${dashboardKPIs.totalIncomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                </p>
              </div>
            </div>

            {/* Egresos Globales */}
            <div className="bg-rose-50/70 border border-rose-100 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-100">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Egresos Totales ({dateRange === 'all' ? 'Consolidado' : dateRange === 'year' ? 'Año' : dateRange === 'quarter' ? 'Trimestre' : 'Mes'})</p>
                <p className="text-xl font-black text-slate-800 leading-tight">
                  ${dashboardKPIs.totalExpenseMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  (${dashboardKPIs.totalExpenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                </p>
              </div>
            </div>

            {/* Margen Neto */}
            <div className={`p-5 rounded-2xl flex items-center space-x-4 shadow-sm border ${
              dashboardKPIs.netMarginMXN >= 0 ? 'bg-indigo-50/70 border-indigo-100' : 'bg-amber-50/70 border-amber-100'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                dashboardKPIs.netMarginMXN >= 0 ? 'bg-indigo-600 shadow-indigo-100' : 'bg-amber-600 shadow-amber-100'
              }`}>
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  dashboardKPIs.netMarginMXN >= 0 ? 'text-indigo-650 text-indigo-700' : 'text-amber-650 text-amber-700'
                }`}>
                  Utilidad Neta / Margen ({dateRange === 'all' ? 'Consolidado' : dateRange === 'year' ? 'Año' : dateRange === 'quarter' ? 'Trimestre' : 'Mes'})
                </p>
                <p className="text-xl font-black text-slate-800 leading-tight">
                  ${dashboardKPIs.netMarginMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  (${dashboardKPIs.netMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                </p>
              </div>
            </div>
          </div>

          {/* Operational KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Alumnos</p>
                <p className="text-lg font-black text-slate-800">{totalStudents.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instituciones</p>
                <p className="text-lg font-black text-slate-800">{totalInstitutions}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clases</p>
                <p className="text-lg font-black text-slate-800">{totalClasses}</p>
              </div>
            </div>
          </div>

          {/* Charts Grid - Bento Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Flujo de Ingresos vs Egresos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Flujo Mensual de Ingresos y Egresos</h3>
                  <p className="text-xs text-slate-500">Comparativa mensual de entradas y salidas en MXN (Año 2026)</p>
                </div>
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 block"></span>
                    <span className="text-slate-600">Ingresos</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500 block"></span>
                    <span className="text-slate-600">Egresos</span>
                  </div>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialMonthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      dx={-10}
                      tickFormatter={(value) => `$${(value / 1000).toLocaleString()}k`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`$${parseFloat(value).toLocaleString()} MXN`]}
                    />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Evolución de Inscripciones */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Evolución de Inscripciones</h3>
                  <p className="text-xs text-slate-500">Volumen mensual de nuevas altas</p>
                </div>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line type="monotone" dataKey="Inscripciones" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Alumnos por País */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Alumnos por País</h3>
                  <p className="text-xs text-slate-500">Distribución geográfica (Top 5)</p>
                </div>
                <BarIcon className="w-5 h-5 text-slate-400" />
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentsByCountry} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dx={-10} width={80} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={24} name="Alumnos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOMER PAYMENT REVIEWS (WITH CONCENTRATED BREAKDOWN FOR COURSES VS MEMBERSHIP) */}
      {activeTab === 'Pagos de Clientes' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          
          {/* Header Action & Concentrator Cards */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Concentrado de Pagos: Cursos vs Membresía
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Resumen financiero concentrado y separado de ingresos por programas académicos y membresías institucionales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrintPaymentReportOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-sm cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte Concentrado (PDF)</span>
            </button>
          </div>

          {/* 3 Interactive Concentration KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Pagos por Cursos */}
            <div 
              onClick={() => setPaymentConceptFilter(prev => prev === 'courses' ? 'all' : 'courses')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                paymentConceptFilter === 'courses'
                  ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                      📚 Cursos e Inscripciones
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">Pagos de Cursos</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-lg">
                    {paymentConcentrationStats.courses.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Monto USD:</span>
                  <span className="text-base font-black text-indigo-950 font-mono">
                    ${paymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Equivalente MXN:</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    ${paymentConcentrationStats.courses.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transacciones:</span>
                  <span className="text-xs font-black text-indigo-600 font-mono">
                    {paymentConcentrationStats.courses.count} {paymentConcentrationStats.courses.count === 1 ? 'pago' : 'pagos'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Pagos por Membresía */}
            <div 
              onClick={() => setPaymentConceptFilter(prev => prev === 'membership' ? 'all' : 'membership')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                paymentConceptFilter === 'membership'
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-100">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                      ⭐ Membresías
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">Pagos de Membresía</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                    {paymentConcentrationStats.membership.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Monto USD:</span>
                  <span className="text-base font-black text-amber-950 font-mono">
                    ${paymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Equivalente MXN:</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    ${paymentConcentrationStats.membership.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transacciones:</span>
                  <span className="text-xs font-black text-amber-700 font-mono">
                    {paymentConcentrationStats.membership.count} {paymentConcentrationStats.membership.count === 1 ? 'pago' : 'pagos'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Total General Consolidado */}
            <div 
              onClick={() => setPaymentConceptFilter('all')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                paymentConceptFilter === 'all'
                  ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-100">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      💳 Consolidado Total
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">Total Recaudado</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                    100%
                  </span>
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Total USD:</span>
                  <span className="text-base font-black text-emerald-950 font-mono">
                    ${paymentConcentrationStats.total.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Total MXN:</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    ${paymentConcentrationStats.total.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registros:</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    {paymentConcentrationStats.total.count} transacciones
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Sub-Filter Concept Switcher */}
          <div className="flex items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPaymentConceptFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentConceptFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos los Pagos ({paymentConcentrationStats.total.count})
              </button>
              <button
                type="button"
                onClick={() => setPaymentConceptFilter('courses')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentConceptFilter === 'courses'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                <span>📚 Solo Cursos ({paymentConcentrationStats.courses.count})</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">
                  ${paymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentConceptFilter('membership')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paymentConceptFilter === 'membership'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                <span>⭐ Solo Membresía ({paymentConcentrationStats.membership.count})</span>
                <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  ${paymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                </span>
              </button>
            </div>

            <div className="text-[11px] font-bold text-slate-400 px-3 hidden sm:block">
              Mostrando {displayedPayments.length} de {filteredPayments.length} operaciones
            </div>
          </div>

          {/* Customer Payments Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-slate-100">
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4">
                      <button onClick={() => handleSort('date')} className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Fecha <ArrowUpDown className="w-3 h-3 ml-1.5" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Concepto</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sujeto</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Institución</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cuenta</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto Original</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto USD</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto MXN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {displayedPayments.map((tx) => {
                    const student = students.find(s => s.id === tx.studentId);
                    const institution = institutions.find(i => i.id === (student?.institutionId || tx.institutionId));
                    const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
                    const isMemb = isMembershipPayment(tx);
                    
                    const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
                    const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;
                    
                    const finalMXNVal = isUSDAcc 
                      ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
                      : tx.amountMXN;

                    const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);
                    
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="hover:bg-indigo-50/40 transition-colors text-xs font-semibold cursor-pointer group"
                        title="Haga clic para ver el detalle de la operación"
                      >
                        <td className="px-6 py-4 font-mono font-normal text-slate-400 group-hover:text-indigo-600 transition-colors">{tx.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isMemb ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                              ⭐ Membresía
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              📚 Cursos
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex flex-col">
                            <span className="group-hover:text-indigo-600 transition-colors font-bold text-slate-800">
                              {student ? `${student.name} ${student.lastName || ''}` : institution ? institution.name : "Cliente Global"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium font-mono">ID: {tx.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-normal text-slate-600">
                          {institution?.name || 'Administración'}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isUSDAcc ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600'
                          }`}>
                            {bankAccount?.bankName || "Caja General"} {isUSDAcc && "(USD)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500">{tx.paymentMethod}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border ${
                            tx.status === 'Aplicado' || tx.status === 'Pagado'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {tx.status || 'Aplicado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-500">
                          {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.currency}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                          ${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-950">
                          <div className="flex flex-col items-end">
                            <span>${finalMXNVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                            {isUSDAcc && (
                              <span className="text-[9px] text-indigo-550 text-indigo-600 font-bold leading-none mt-0.5">
                                *(T.C. {rateUsed.toFixed(4)})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedPayments.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center">
                        <p className="text-slate-400 text-xs font-bold">No se encontraron transacciones bajo este concepto o filtro.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROVIDER PAYMENT REVIEWS */}
      {activeTab === 'Pagos a Proveedores' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="flex flex-wrap gap-4 mb-1">
            <div className="bg-indigo-50 px-5 py-3 rounded-2xl flex items-center space-x-3 border border-indigo-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider leading-none mb-1">Transacciones</p>
                <p className="text-lg font-black text-indigo-900 leading-none">{reportStats.count}</p>
              </div>
            </div>
            <div className="bg-emerald-50 px-5 py-3 rounded-2xl flex items-center space-x-3 border border-emerald-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider leading-none mb-1">Total MXN</p>
                <p className="text-lg font-black text-emerald-900 leading-none">${reportStats.totalAmountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</p>
              </div>
            </div>
            <div className="bg-sky-50 px-5 py-3 rounded-2xl flex items-center space-x-3 border border-sky-100">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-sky-400 uppercase tracking-wider leading-none mb-1">Total USD Proyectado</p>
                <p className="text-lg font-black text-sky-900 leading-none">${reportStats.totalAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-slate-100">
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4">
                      <button onClick={() => handleSort('date')} className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Fecha <ArrowUpDown className="w-3 h-3 ml-1.5" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Proveedor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cuenta</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto Original</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto USD</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto MXN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredPayments.map((tx) => {
                    const provider = providers.find(p => p.id === tx.providerId);
                    const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
                    
                    const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
                    const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;
                    
                    const finalMXNVal = isUSDAcc 
                      ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN)
                      : tx.amountMXN;

                    const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);
                    
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="hover:bg-indigo-50/40 transition-colors text-xs font-semibold cursor-pointer group"
                        title="Haga clic para ver el detalle de la operación"
                      >
                        <td className="px-6 py-4 font-mono font-normal text-slate-400 group-hover:text-indigo-600 transition-colors">{tx.date}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex flex-col">
                            <span className="group-hover:text-indigo-600 transition-colors font-bold text-slate-800">
                              {provider ? (provider.commercialName || provider.legalName) : "Proveedor General"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium font-mono">ID: {tx.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isUSDAcc ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600'
                          }`}>
                            {bankAccount?.bankName || "Caja General"} {isUSDAcc && "(USD)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500">{tx.paymentMethod}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border ${
                            tx.status === 'Aplicado' || tx.status === 'Pagado'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {tx.status || 'Aplicado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-500">
                          {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.currency}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                          ${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-950">
                          <div className="flex flex-col items-end">
                            <span>${finalMXNVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                            {isUSDAcc && (
                              <span className="text-[9px] text-indigo-550 text-indigo-600 font-bold leading-none mt-0.5">
                                *(T.C. {rateUsed.toFixed(4)})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <p className="text-slate-400 text-xs font-bold">No se encontraron transacciones de egreso representadas bajo esta categoría.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* % COMISIONES TAB */}
      {activeTab === '% Comisiones' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1.5">Comisiones Generadas</p>
                <p className="text-2xl font-black text-indigo-900">${commissionSummary.totalGeneratedSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN</p>
              </div>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">Comisiones Pagadas</p>
                <p className="text-2xl font-black text-emerald-900">${commissionSummary.totalPaidSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN</p>
              </div>
            </div>

            <div className={`rounded-2xl p-5 flex items-center space-x-4 border ${
              commissionSummary.totalBalanceSum >= 0 
                ? 'bg-amber-50 border-amber-100 text-amber-900' 
                : 'bg-rose-50 border-rose-100 text-rose-900'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                commissionSummary.totalBalanceSum >= 0 ? 'bg-amber-500' : 'bg-rose-500'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 opacity-70">Saldo de comisiones</p>
                <p className="text-2xl font-black">
                  ${commissionSummary.totalBalanceSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Instituto</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Agente / Vendedor</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Comisiones Generadas (10%)</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Comisiones Pagadas</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commissionSummary.rows.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/40 transition-colors font-semibold">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.institutionName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.agentName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">
                        ${row.generated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-650">
                        ${row.paid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className={`px-2.5 py-1 rounded-lg font-black ${
                          row.balance >= 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          ${row.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {commissionSummary.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                        No hay registros de comisiones activas para la combinación seleccionada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO DE CUENTA TAB */}
      {activeTab === 'Estado de Cuenta' && (
        <div className="space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Consolidado del Estado de Cuenta</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Mostrando <span className="text-indigo-600 font-black">{estadoDeCuentaRows.length}</span> operaciones según filtros seleccionados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Institutional Reports Trigger */}
              {institutionFilter && (() => {
                const targetInst = institutions.find(i => String(i.id) === institutionFilter);
                if (!targetInst) return null;
                return (
                  <div className="flex items-center gap-2 mr-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInstReportModal(targetInst);
                        setInstReportType('institucion');
                      }}
                      className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Ver Estado de Cuenta Oficial para esta institución"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>Reporte Institución ({targetInst.name.slice(0, 18)}...)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInstReportModal(targetInst);
                        setInstReportType('interno');
                      }}
                      className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Ver Reporte Financiero y Rentabilidad Interno (ERP)"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Reporte Interno</span>
                    </button>
                  </div>
                );
              })()}

              <button
                onClick={() => setIsPrintPreviewOpen(true)}
                className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Resumen Global (PDF)</span>
              </button>
            </div>
          </div>

          {/* Quick Totals Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-xs">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso Esperado</span>
              <div className="text-sm font-black text-slate-700">${estadoDeCuentaTotals.expectedMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
              <div className="text-[9px] font-bold text-slate-400">(${estadoDeCuentaTotals.expectedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-xs">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso Real</span>
              <div className="text-sm font-black text-emerald-600">${estadoDeCuentaTotals.realMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
              <div className="text-[9px] font-bold text-slate-400">(${estadoDeCuentaTotals.realUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-xs">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Egreso Total</span>
              <div className="text-sm font-black text-rose-600">${estadoDeCuentaTotals.expenseMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
              <div className="text-[9px] font-bold text-slate-400">(${estadoDeCuentaTotals.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-xs">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comisión (10%)</span>
              <div className="text-sm font-black text-purple-600">${estadoDeCuentaTotals.commissionMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
              <div className="text-[9px] font-bold text-slate-400">(${estadoDeCuentaTotals.commissionUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-xs col-span-2 md:col-span-1">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margen Consolidado</span>
              <div className={`text-sm font-black ${estadoDeCuentaTotals.marginMXN >= 0 ? 'text-indigo-600' : 'text-rose-700'}`}>
                ${estadoDeCuentaTotals.marginMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
              </div>
              <div className="text-[9px] font-bold text-slate-400">(${estadoDeCuentaTotals.marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-[11px] md:text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider w-24">Fecha</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Instituto</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Ingreso Esperado</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Ingreso Real</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Egreso</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Comisión</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {estadoDeCuentaRows.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-400">{row.date}</td>
                      <td className="px-5 py-3.5 text-slate-800 break-words max-w-xs">{row.description}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-bold">{row.institutionName}</td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.expectedIncomeMXN > 0 ? (
                          <div className="leading-tight">
                            <div className="text-slate-700 font-bold">${row.expectedIncomeMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                            <div className="text-[10px] text-slate-400 font-medium">(${row.expectedIncomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.realIncomeMXN > 0 ? (
                          <div className="leading-tight">
                            <div className="text-emerald-600 font-bold">${row.realIncomeMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                            <div className="text-[10px] text-slate-400 font-medium">(${row.realIncomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.expenseMXN > 0 ? (
                          <div className="leading-tight">
                            <div className="text-rose-600 font-bold">${row.expenseMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                            <div className="text-[10px] text-slate-400 font-medium">(${row.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.commissionMXN > 0 ? (
                          <div className="leading-tight">
                            <div className="text-purple-600 font-bold">${row.commissionMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                            <div className="text-[10px] text-slate-400 font-medium">(${row.commissionUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        <div className="leading-tight">
                          <div className={`font-black ${row.marginMXN >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            ${row.marginMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            (${row.marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {estadoDeCuentaRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                        No hay datos que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FACTURAS TAB */}
      {activeTab === 'Facturas' && (
        <div className="space-y-6">
          {/* Sub Tab Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-200/60 p-1 rounded-xl w-fit">
            {(['Todas', 'Solicitadas', 'Facturadas'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFacturaFilter(filter)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeFacturaFilter === filter
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter === 'Todas' ? 'Todas las Operaciones' : filter === 'Solicitadas' ? 'Facturas Solicitadas' : 'Facturados'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider w-24">Fecha</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Cliente / Proveedor</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Institución</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Monto</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Folio Fiscal (UUID)</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {facturasRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400">{row.date}</td>
                      <td className="px-6 py-4 text-slate-900 font-bold">{row.clientOrProvider}</td>
                      <td className="px-6 py-4 text-slate-500">{row.institutionName}</td>
                      <td className="px-6 py-4 text-slate-650 font-normal">{row.description}</td>
                      <td className="px-6 py-4 text-right font-mono whitespace-nowrap">
                        <div className="leading-tight font-black text-slate-900">
                          ${row.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          (${row.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700">
                        {editingTxId === row.id ? (
                          <input
                            type="text"
                            value={inputTaxId}
                            onChange={(e) => setInputTaxId(e.target.value)}
                            placeholder="Ingrese UUID"
                            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                          />
                        ) : (
                          row.taxId || <span className="text-slate-350 italic text-[11px]">No facturado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.taxId ? (
                          <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                            Facturado
                          </span>
                        ) : row.invoiceRequested ? (
                          <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                            Pendiente / Solicitado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                            Sin solicitud
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {editingTxId === row.id ? (
                          <div className="flex justify-center space-x-1.5">
                            <button
                              onClick={() => handleSaveTaxId(row.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingTxId(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingTxId(row.id);
                                setInputTaxId(row.taxId || '');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-black"
                            >
                              {row.taxId ? 'Editar Folio' : 'Facturar'}
                            </button>
                            {!row.taxId && (
                              <button
                                onClick={() => handleToggleInvoiceRequest(row.id, row.invoiceRequested)}
                                className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded transition ${
                                  row.invoiceRequested 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                {row.invoiceRequested ? 'Quitar Solicitud' : 'Solicitar'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {facturasRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                        No se encontraron registros de facturación con esta selección.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASH FLOW TAB */}
      {activeTab === 'Cash Flow' && (
        <div className="space-y-4">
          <div className="flex justify-end shrink-0">
            <button
              onClick={handleExportCashFlowCSV}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-sm flex items-center"
            >
              <Download className="w-3.5 h-3.5 mr-2" /> Exportar Cash Flow CSV
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-[11px] md:text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider w-24">Fecha</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Nº Transacción</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Alumno</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Instituto</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Cuenta Pago</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider">Método Pago</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Ingreso</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-center">Tipo Cambio</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Monto MXN</th>
                    <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-wider text-right">Egreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {cashFlowRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-400 font-normal leading-tight">{row.date}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 italic max-w-[100px] truncate">{row.id}</td>
                      <td className="px-5 py-3.5 text-slate-900 font-bold">{row.studentName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.institutionName}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-normal">{row.accountName}</td>
                      <td className="px-5 py-3.5 text-slate-500">{row.paymentMethod}</td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.income > 0 ? (
                          <div className="leading-tight">
                            <div className="text-emerald-600 font-bold">
                              {row.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {row.currency}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {row.currency === 'USD' 
                                ? `($${row.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN)` 
                                : `($${(row.amountMXN / row.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)`
                              }
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-normal text-slate-400">
                        {row.exchangeRate > 1 ? `${row.exchangeRate}` : '18.0'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        <div className="text-slate-900 font-black">
                          ${row.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
                        {row.expense > 0 ? (
                          <div className="leading-tight">
                            <div className="text-rose-600 font-bold">
                              {row.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {row.currency}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {row.currency === 'USD' 
                                ? `($${row.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN)` 
                                : `($${(row.amountMXN / row.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)`
                              }
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                  {cashFlowRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                        No hay movimientos de caja registrados bajo esta combinación de filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO DE RESULTADOS TAB */}
      {activeTab === 'Estado de Resultados' && (
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Header Controls */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Rango del Estado Financiero</p>
              <p className="text-xs font-medium text-slate-600 leading-tight">
                {dateRangeFilter.start || dateRangeFilter.end 
                  ? `Mostrando desde ${dateRangeFilter.start || 'inicio'} hasta ${dateRangeFilter.end || 'hoy'}` 
                  : 'Mostrando acumulados consolidados totales'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={dateRangeFilter.start}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Inicio"
                title="Fecha Inicio"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={dateRangeFilter.end}
                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Fin"
                title="Fecha Fin"
              />
              <button
                onClick={clearReportFilters}
                className="p-1 px-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 text-xs hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Statement Sheets */}
          <div className="bg-white border border-slate-300 rounded-[2.5rem] shadow-md overflow-hidden font-sans relative p-12 space-y-8">
            {/* Branding/Watermark header */}
            <div className="border-b border-slate-200 pb-6 flex justify-between items-start">
              <div>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mb-1">{companyInfo?.commercialName || 'Reporte Financiero Oficial'}</p>
                <h3 className="text-xl font-black text-slate-900 leading-none">Estado de Resultados</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Sincronizado con balance general y transacciones de caja.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Moneda Base</p>
                <p className="text-xs text-slate-800 font-black font-mono">MXN ($)</p>
              </div>
            </div>

            {/* Income statement flow */}
            <div className="space-y-6 text-sm">
              
              {/* SECTION 1: INGRESOS GENERALES */}
              <div>
                <div className="border-b border-slate-900 pb-2 mb-3">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">Ingresos Generales</h4>
                </div>
                <div className="space-y-2.5 px-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">+ Ingresos</span>
                    <span className="font-mono font-semibold text-slate-800">${erStatement.ingresos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Pago Servicios</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.pagoServicios.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Gastos Venta</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.gastosVenta.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Reembolsos</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.reembolsos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-slate-300 font-bold bg-slate-50/60 px-3 rounded-lg">
                    <span className="text-slate-900">= Margen Utilidad</span>
                    <span className="font-mono text-slate-950">${erStatement.margenUtilidad.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: GASTOS GENERALES */}
              <div className="pt-2">
                <div className="border-b border-slate-900 pb-2 mb-3">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">Gastos Generales</h4>
                </div>
                <div className="space-y-2.5 px-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Gastos Operativos</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.gastosOperativos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Gastos Administrativos</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.gastosAdministrativos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Sueldos y salarios</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.sueldosSalarios.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-slate-300 font-bold bg-slate-50/60 px-3 rounded-lg">
                    <span className="text-slate-900">= Subtotal Gastos</span>
                    <span className="font-mono text-slate-950">(${erStatement.subtotalGastos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                </div>
              </div>

              {/* OUTCOMES: BRUTO VS NETO */}
              <div className="pt-4 border-t border-slate-300 space-y-4">
                
                <div className="flex justify-between items-center py-2.5 border-b border-dashed border-slate-300 px-3">
                  <div>
                    <span className="font-black text-xs uppercase tracking-wider text-slate-950">Margen Bruto</span>
                    <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Margen Utilidad - Subtotal Gastos</p>
                  </div>
                  <span className={`font-mono text-sm font-black ${
                    erStatement.margenBruto >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    ${erStatement.margenBruto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>

                <div className="space-y-2.5 px-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium pl-2">- Impuestos</span>
                    <span className="font-mono font-semibold text-slate-800">(${erStatement.impuestos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                  </div>
                </div>

                {/* DOUBLE UNDERLINE / PROFESSIONAL BOLD MARGEN NETO */}
                <div className="pt-3 border-t-2 border-slate-950">
                  <div className="bg-slate-950 text-white rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="font-black text-xs uppercase tracking-wider block">Margen Neto</span>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Margen Bruto - Impuestos</p>
                    </div>
                    <span className={`font-mono text-base font-black ${
                      erStatement.margenNeto >= 0 ? "text-emerald-455 color-emerald-400" : "text-rose-400"
                    }`}>
                      ${erStatement.margenNeto.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETALLE DE OPERACIÓN MODAL */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-[2rem] border border-slate-100 shadow-2xl p-7 relative animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button 
              onClick={() => setSelectedTxForDetail(null)} 
              className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-none">Detalle de la Operación</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Transacción #{selectedTxForDetail.id}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha</span>
                  <span className="text-slate-800 font-bold">{selectedTxForDetail.date}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border ${
                    selectedTxForDetail.status === 'Aplicado' || selectedTxForDetail.status === 'Pagado'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {selectedTxForDetail.status || 'Aplicado'}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Monto Original Capturado</span>
                <span className="text-sm font-black text-slate-900 block">
                  {selectedTxForDetail.currency === 'USD' ? 'USD' : '$'} {selectedTxForDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedTxForDetail.currency}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-sans">Monto Registrado en Cuenta (MXN)</span>
                <span className="text-sm font-black text-indigo-600 leading-tight block">
                  ${selectedTxForDetail.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tipo de Cambio / Conversión</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  1 USD = {(selectedTxForDetail.exchangeRate || averageExchangeRate).toFixed(4)} MXN
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Monto en Pesos (MXN)</span>
                <span className="text-base font-black text-slate-900">
                  ${(selectedTxForDetail.currency === 'USD' 
                    ? selectedTxForDetail.amount * (selectedTxForDetail.exchangeRate || averageExchangeRate) 
                    : selectedTxForDetail.amountMXN
                  ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[9px] text-slate-400 font-semibold italic mt-1">* Calculado utilizando el Tipo de Cambio registrado</p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">IVA en USD</span>
                <span className="text-sm font-black text-slate-800 block">
                  USD {( (selectedTxForDetail.currency === 'USD' ? selectedTxForDetail.amount : (selectedTxForDetail.amountMXN / (selectedTxForDetail.exchangeRate || averageExchangeRate))) * 0.16 ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Additional useful details */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Método de Pago</span>
                  <span className="text-slate-700 font-bold block">{selectedTxForDetail.paymentMethod}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cuenta Bancaria</span>
                  <span className="text-slate-700 font-bold block">
                    {(() => {
                      const ba = bankAccounts.find(account => account.id.toString() === selectedTxForDetail.bankAccountId?.toString());
                      return ba ? `${ba.bankName} (${ba.accountNumber})` : "Caja General";
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end">
              <button 
                onClick={() => setSelectedTxForDetail(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PREVIA E IMPRESIÓN DE ESTADO DE CUENTA */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          {/* Inject dynamic print styles */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Hide everything from regular layout */
              body * {
                visibility: hidden !important;
              }
              /* Show ONLY print area */
              #printable-report-content, #printable-report-content * {
                visibility: visible !important;
              }
              #printable-report-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                font-family: 'Inter', system-ui, sans-serif !important;
              }
              /* Standard letter page constraints */
              html, body {
                height: auto !important;
                overflow: visible !important;
                background: white !important;
              }
              @page {
                size: letter;
                margin: 15mm;
              }
            }
          `}} />

          <div className="bg-slate-100 w-full max-w-5xl rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-none">Vista Previa del Reporte PDF</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Estado de Cuenta Consolidado</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrintPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Cerrar Vista Previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Document Area */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200/50">
              <div 
                id="printable-report-content" 
                className="bg-white w-full max-w-[210mm] p-12 shadow-md border border-slate-300/30 rounded-lg flex flex-col justify-between text-xs text-slate-800 font-sans"
              >
                {/* Document Header */}
                <div>
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                    <div>
                      <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{companyInfo?.commercialName || 'Mi Empresa S.A.'}</h1>
                      <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">Sistema de Gestión Financiera Centralizada</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-sm font-black text-indigo-600 tracking-wider uppercase">Estado de Cuenta</h2>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">Generado: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-[9px] text-slate-400 font-mono">Hora: {new Date().toLocaleTimeString('es-MX')}</p>
                    </div>
                  </div>

                  {/* Filter Metadata */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-[10px] font-semibold text-slate-600">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rango de Fechas</span>
                      <span className="text-slate-800">
                        {dateRangeFilter.start ? `Desde: ${dateRangeFilter.start}` : 'Todo el historial'} {dateRangeFilter.end ? `Hasta: ${dateRangeFilter.end}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Institución Seleccionada</span>
                      <span className="text-slate-800">
                        {institutionFilter ? (institutions.find(i => i.id.toString() === institutionFilter)?.name || `ID #${institutionFilter}`) : 'Todas las instituciones'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cuenta Bancaria / Caja</span>
                      <span className="text-slate-800">
                        {accountFilter ? (accountFilter === 'caja' ? 'Caja General' : bankAccounts.find(ba => ba.id.toString() === accountFilter)?.bankName || `ID #${accountFilter}`) : 'Todas las cuentas'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Estado de Transacción</span>
                      <span className="text-slate-800">
                        {statusFilter || 'Todos los estados'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="mb-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Resumen de Cuenta Consolidado</h3>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Esperado (MXN)</span>
                        <div className="text-xs font-black text-slate-800">${estadoDeCuentaTotals.expectedMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-[8px] text-slate-400">(${estadoDeCuentaTotals.expectedUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso Real</span>
                        <div className="text-xs font-black text-emerald-700">${estadoDeCuentaTotals.realMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-[8px] text-slate-400">(${estadoDeCuentaTotals.realUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Egresos Totales</span>
                        <div className="text-xs font-black text-rose-700">${estadoDeCuentaTotals.expenseMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-[8px] text-slate-400">(${estadoDeCuentaTotals.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Comisión (10%)</span>
                        <div className="text-xs font-black text-purple-700">${estadoDeCuentaTotals.commissionMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-[8px] text-slate-400">(${estadoDeCuentaTotals.commissionUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</div>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center">
                        <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Margen Neto</span>
                        <div className="text-xs font-black text-indigo-700">${estadoDeCuentaTotals.marginMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-[8px] text-indigo-500 font-bold">(${estadoDeCuentaTotals.marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD)</div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Detalle de Operaciones</h3>
                    <table className="w-full text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-700">
                          <th className="px-3 py-2 font-black uppercase tracking-wider w-20">Fecha</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Concepto</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Institución</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Ingr. Esperado</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Ingr. Real</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Egreso</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Comisión</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                        {estadoDeCuentaRows.map((row, index) => (
                          <tr key={row.id || index} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono text-slate-500">{row.date}</td>
                            <td className="px-3 py-2 text-slate-900 max-w-[150px] break-words">{row.description}</td>
                            <td className="px-3 py-2 text-slate-800">{row.institutionName}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.expectedIncomeMXN > 0 ? (
                                <div>
                                  <div className="text-slate-800 font-bold">${row.expectedIncomeMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[8px] text-slate-400">(${row.expectedIncomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.realIncomeMXN > 0 ? (
                                <div>
                                  <div className="text-emerald-700 font-bold">${row.realIncomeMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[8px] text-slate-400">(${row.realIncomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.expenseMXN > 0 ? (
                                <div>
                                  <div className="text-rose-700 font-bold">${row.expenseMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[8px] text-slate-400">(${row.expenseUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.commissionMXN > 0 ? (
                                <div>
                                  <div className="text-purple-700 font-bold">${row.commissionMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="text-[8px] text-slate-400">(${row.commissionUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              <div>
                                <div className={`font-black ${row.marginMXN >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                                  ${row.marginMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[8px] text-slate-400">
                                  (${row.marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {estadoDeCuentaRows.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-12 text-center text-slate-400">
                              No hay registros cargados para los filtros seleccionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Section of sheet */}
                <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between items-end text-[8px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                  <div>
                    <span>Documento de Control Financiero Interno - Confidencial</span>
                  </div>
                  <div>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-white border-t border-slate-200 px-8 py-4 flex justify-between shrink-0">
              <button 
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Confirmar Impresión / Exportar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL FOR CONCENTRATED CUSTOMER PAYMENTS (CURSOS VS MEMBRESÍA) */}
      {isPrintPaymentReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Navigation Header */}
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide uppercase text-indigo-200">Vista de Impresión</h3>
                  <p className="text-xs text-slate-400 font-medium">Reporte Concentrado de Pagos: Cursos vs Membresía</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button 
                  onClick={() => setIsPrintPaymentReportOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100/70 flex justify-center">
              <div className="w-full max-w-4xl bg-white p-8 md:p-12 shadow-sm rounded-3xl border border-slate-200 flex flex-col justify-between print:border-none print:shadow-none print:p-0">
                
                <div className="space-y-8">
                  {/* Top Company Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
                    <div>
                      {companyInfo?.logoUrl ? (
                        <img src={companyInfo.logoUrl} alt="Logo" className="h-12 w-auto object-contain mb-2" />
                      ) : (
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                            EDU
                          </div>
                          <span className="text-lg font-black text-slate-900 tracking-tight">
                            {companyInfo?.commercialName || companyInfo?.legalName || "Global Education Systems"}
                          </span>
                        </div>
                      )}
                      <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                        {typeof companyInfo?.address === 'object' && companyInfo.address ? `${companyInfo.address.street}, ${companyInfo.address.city}, ${companyInfo.address.state}` : "Av. Corporativa #500, Ciudad de México"}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 leading-tight">
                        RFC: {companyInfo?.rfc || "GES180420ABC"} | Correo: {companyInfo?.contactEmail || "contacto@ejemplo.com"}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-full text-[10px] font-black tracking-widest uppercase mb-1">
                        Reporte Concentrado
                      </span>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">REPORTE DE PAGOS DE CLIENTES</h2>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        Emisión: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      {institutionFilter && (
                        <p className="text-[10px] text-indigo-600 font-bold mt-0.5">
                          Institución: {institutions.find(i => String(i.id) === institutionFilter)?.name}
                        </p>
                      )}
                      {(dateRangeFilter.start || dateRangeFilter.end) && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          Periodo: {dateRangeFilter.start || 'Inicio'} al {dateRangeFilter.end || 'Hoy'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Concentrated Executive Summary Box */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Resumen Concentrado de Ingresos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">📚 Pagos de Cursos</span>
                          <span className="text-[10px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded">
                            {paymentConcentrationStats.courses.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-base font-black text-indigo-950 font-mono">
                          ${paymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          ${paymentConcentrationStats.courses.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
                        </div>
                        <div className="text-[9px] text-indigo-600 font-bold mt-1">
                          {paymentConcentrationStats.courses.count} transacciones
                        </div>
                      </div>

                      <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">⭐ Pagos de Membresía</span>
                          <span className="text-[10px] font-black text-amber-700 bg-white px-1.5 py-0.5 rounded">
                            {paymentConcentrationStats.membership.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-base font-black text-amber-950 font-mono">
                          ${paymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          ${paymentConcentrationStats.membership.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
                        </div>
                        <div className="text-[9px] text-amber-700 font-bold mt-1">
                          {paymentConcentrationStats.membership.count} transacciones
                        </div>
                      </div>

                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">💳 Gran Total Recaudado</span>
                          <span className="text-[10px] font-black text-emerald-700 bg-white px-1.5 py-0.5 rounded">
                            100%
                          </span>
                        </div>
                        <div className="text-base font-black text-emerald-950 font-mono">
                          ${paymentConcentrationStats.total.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          ${paymentConcentrationStats.total.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN
                        </div>
                        <div className="text-[9px] text-emerald-700 font-bold mt-1">
                          {paymentConcentrationStats.total.count} transacciones totales
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 1: DETALLE DE PAGOS POR CURSOS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        1. Concentrado y Detalle de Pagos por Cursos
                      </h3>
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        Subtotal: ${paymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>

                    <table className="w-full text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="border-b-2 border-indigo-200 bg-indigo-50/60 text-indigo-950">
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Fecha</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Alumno / Sujeto</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Institución</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Descripción</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Método</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Estado</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Monto USD</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Monto MXN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {filteredPayments.filter(tx => !isMembershipPayment(tx)).map((tx) => {
                          const student = students.find(s => s.id === tx.studentId);
                          const institution = institutions.find(i => i.id === (student?.institutionId || tx.institutionId));
                          const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
                          const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
                          const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;
                          const finalMXNVal = isUSDAcc ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN) : tx.amountMXN;
                          const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {student ? `${student.name} ${student.lastName || ''}` : institution ? institution.name : 'Cliente'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{institution?.name || 'Administración'}</td>
                              <td className="px-3 py-2 text-slate-700 max-w-[150px] truncate">{tx.description || tx.concept || 'Pago de Curso'}</td>
                              <td className="px-3 py-2 text-slate-500">{tx.paymentMethod}</td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  {tx.status || 'Aplicado'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                ${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-950">
                                ${finalMXNVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredPayments.filter(tx => !isMembershipPayment(tx)).length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-slate-400 italic">
                              No hay registros de pagos por cursos en el periodo seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-indigo-200 bg-indigo-50/40 font-black text-[9px] text-indigo-950">
                          <td colSpan={6} className="px-3 py-2 text-right uppercase tracking-wider">
                            Subtotal Pagos por Cursos:
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-indigo-900">
                            ${paymentConcentrationStats.courses.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-indigo-950">
                            ${paymentConcentrationStats.courses.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* SECTION 2: DETALLE DE PAGOS POR MEMBRESÍA */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        2. Concentrado y Detalle de Pagos por Membresía
                      </h3>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        Subtotal: ${paymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>

                    <table className="w-full text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="border-b-2 border-amber-200 bg-amber-50/60 text-amber-950">
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Fecha</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Institución / Titular</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Descripción</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Método</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Cuenta</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider">Estado</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Monto USD</th>
                          <th className="px-3 py-2 font-black uppercase tracking-wider text-right">Monto MXN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {filteredPayments.filter(tx => isMembershipPayment(tx)).map((tx) => {
                          const student = students.find(s => s.id === tx.studentId);
                          const institution = institutions.find(i => i.id === (student?.institutionId || tx.institutionId));
                          const bankAccount = bankAccounts.find(ba => ba.id.toString() === tx.bankAccountId?.toString());
                          const isUSDAcc = isUSDOrWellsFargoAccount(bankAccount);
                          const rateUsed = tx.exchangeRate && tx.exchangeRate > 1 ? tx.exchangeRate : averageExchangeRate;
                          const finalMXNVal = isUSDAcc ? (tx.currency === 'USD' ? tx.amount * rateUsed : tx.amountMXN) : tx.amountMXN;
                          const amountUSD = tx.currency === 'USD' ? tx.amount : (tx.amountMXN / rateUsed);

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {institution ? institution.name : student ? `${student.name} ${student.lastName || ''}` : 'Membresía'}
                              </td>
                              <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate">{tx.description || tx.concept || 'Pago de Membresía'}</td>
                              <td className="px-3 py-2 text-slate-500">{tx.paymentMethod}</td>
                              <td className="px-3 py-2 text-slate-500">{bankAccount?.bankName || "Caja General"}</td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  {tx.status || 'Aplicado'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                ${amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-950">
                                ${finalMXNVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredPayments.filter(tx => isMembershipPayment(tx)).length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-slate-400 italic">
                              No hay registros de pagos por membresía en el periodo seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-amber-200 bg-amber-50/40 font-black text-[9px] text-amber-950">
                          <td colSpan={6} className="px-3 py-2 text-right uppercase tracking-wider">
                            Subtotal Pagos por Membresía:
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-amber-900">
                            ${paymentConcentrationStats.membership.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-amber-950">
                            ${paymentConcentrationStats.membership.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* SECTION 3: RESUMEN FINANCIERO CONSOLIDADO */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-black block mb-0.5">
                          Consolidación Final
                        </span>
                        <h4 className="text-sm font-black tracking-tight">
                          Gran Total de Ingresos Recibidos (Cursos + Membresía)
                        </h4>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Total USD</span>
                          <span className="text-xl font-black text-emerald-400 font-mono">
                            ${paymentConcentrationStats.total.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                        </div>
                        <div className="border-l border-slate-700 pl-6">
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Total MXN</span>
                          <span className="text-xl font-black text-white font-mono">
                            ${paymentConcentrationStats.total.amountMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Section of sheet */}
                <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between items-end text-[8px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                  <div>
                    <span>Documento de Reporte Financiero Concentrado - Generado por Sistema ERP</span>
                  </div>
                  <div>
                    <span>Página 1 de 1</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-white border-t border-slate-200 px-8 py-4 flex justify-between shrink-0">
              <button 
                onClick={() => setIsPrintPaymentReportOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Confirmar Impresión / Exportar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {instReportModal && (
        <InstitutionFinancialReportModal
          isOpen={!!instReportModal}
          onClose={() => setInstReportModal(null)}
          institution={instReportModal}
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
          isUserAdminOrSuperAdmin={true}
          initialType={instReportType}
        />
      )}

    </div>
  );
}
