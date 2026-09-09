import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Building2, 
  ShieldCheck, 
  Lock, 
  Calendar, 
  User, 
  CreditCard, 
  GraduationCap, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Landmark,
  FileSpreadsheet,
  Layers,
  FileText,
  BadgeCheck,
  Receipt,
  PieChart
} from 'lucide-react';
import { 
  calculateInstitutionFinancials, 
  resolveCreditPrices, 
  resolveMembershipPrice 
} from '../context/AppContext';
import { PaymentAttachmentsBadges } from './PaymentAttachmentsManager';

interface InstitutionFinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: any;
  students: any[];
  enrollments: any[];
  classes: any[];
  catalogs: any;
  providerProductServices: any[];
  providers: any[];
  financialTransactions: any[];
  users: any[];
  companyInfo: any;
  bankAccounts: any[];
  isUserAdminOrSuperAdmin: boolean;
  initialType?: 'institucion' | 'interno';
}

export function InstitutionFinancialReportModal({
  isOpen,
  onClose,
  institution,
  students,
  enrollments,
  classes,
  catalogs,
  providerProductServices,
  providers,
  financialTransactions,
  users,
  companyInfo,
  bankAccounts,
  isUserAdminOrSuperAdmin,
  initialType = 'institucion'
}: InstitutionFinancialReportModalProps) {
  const [reportType, setReportType] = useState<'institucion' | 'interno'>(
    initialType === 'interno' ? 'interno' : 'institucion'
  );
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sync state whenever the modal is opened or initialType changes
  React.useEffect(() => {
    if (isOpen) {
      setReportType(initialType === 'interno' ? 'interno' : 'institucion');
    }
  }, [isOpen, initialType]);

  // Filter options for calculation
  const dateOptions = dateFilterMode === 'custom' && (startDate || endDate) 
    ? { payFilterStartDate: startDate, payFilterEndDate: endDate }
    : undefined;

  // Compute unified financial metrics
  const financialMetrics = calculateInstitutionFinancials(
    institution,
    students,
    enrollments,
    classes,
    catalogs,
    providerProductServices,
    financialTransactions,
    dateOptions
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
    numActiveHalfCredits
  } = financialMetrics;

  // Filtered student list for this institution
  const instStudents = useMemo(() => {
    if (!institution?.id) return [];
    return (students || []).filter(s => String(s.institutionId) === String(institution?.id));
  }, [students, institution?.id]);

  const instStudentIds = useMemo(() => instStudents.map(s => Number(s.id)), [instStudents]);

  // Payment transactions for this institution
  const instPayments = useMemo(() => {
    if (!institution?.id) return [];
    const instId = Number(institution?.id);
    let list = (financialTransactions || []).filter(t => {
      const matchInst = Number(t.institutionId) === instId || (t.studentId && instStudentIds.includes(Number(t.studentId)));
      const isIncome = t.type === 'Ingreso' || t.type === 'income';
      const isPaid = t.status === 'Aplicado' || t.status === 'Pagado';
      return matchInst && isIncome && isPaid;
    });
    if (dateFilterMode === 'custom') {
      if (startDate) {
        list = list.filter(t => t.date >= startDate);
      }
      if (endDate) {
        list = list.filter(t => t.date <= endDate);
      }
    }
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialTransactions, institution?.id, instStudentIds, dateFilterMode, startDate, endDate]);

  const isMembershipPayment = (tx: any) => {
    const isMembSub = tx.subcategory === 'sub_membresia';
    const c = (tx.concept || '').toLowerCase();
    const d = (tx.description || '').toLowerCase();
    return isMembSub || c.includes('membresía') || c.includes('membresia') || d.includes('membresía') || d.includes('membresia') || d.includes('membership');
  };

  const getPaymentUSD = (p: any) => {
    return p.finalAmount !== undefined 
      ? p.finalAmount 
      : (p.currency === 'USD' ? p.amount : (p.amountMXN / (p.exchangeRate || 18.5)));
  };

  const getPaymentMXN = (p: any) => {
    return p.currency === 'MXN' ? p.amount : (p.amount * (p.exchangeRate || 18.5));
  };

  const coursesPayments = instPayments.filter(p => !isMembershipPayment(p));
  const membershipPayments = instPayments.filter(p => isMembershipPayment(p));

  // Resolved membership
  const membershipPlan = catalogs?.['Membresías']?.find((m: any) => m.id === institution?.membershipId);
  const agentUser = users?.find((u: any) => u.id === institution?.agentId);

  // Detailed student enrollment rows for breakdown
  const studentEnrollmentDetails = useMemo(() => {
    if (!institution) return [];
    const rows: any[] = [];
    instStudents.forEach(st => {
      const studentEns = (enrollments || []).filter(e => e.studentId === st.id && e.status !== 'Baja' && e.status !== 'Inactivo');
      studentEns.forEach(en => {
        const cls = (classes || []).find(c => c.id === en.classId);
        if (cls) {
          const prov = (providers || []).find(p => p.id === (cls.providerId || institution.mainProviderId));
          const prices = resolveCreditPrices(institution?.tarifasId || institution?.pricingCountryId, catalogs, institution?.mainProviderId, providerProductServices);
          const parsePrice = (strVal: string) => {
            if (!strVal) return 0;
            const clean = strVal.replace(/[^0-9.]/g, '');
            return parseFloat(clean) || 0;
          };
          const isAp = (cls.creditType || '').toLowerCase().includes('ap');
          const isHalf = (cls.creditType || '').toLowerCase().includes('medio') || (cls.creditType || '').toLowerCase().includes('half');
          
          let salePrice = 0;
          if (isAp) {
            salePrice = isHalf ? parsePrice(prices.priceHalfApCredit) : parsePrice(prices.priceFullApCredit);
          } else {
            salePrice = isHalf ? parsePrice(prices.priceHalfCredit) : parsePrice(prices.priceFullCredit);
          }

          rows.push({
            studentId: st.id,
            studentName: `${st.name || ''} ${st.lastName || ''}`.trim(),
            studentCode: st.studentCode || `ALU-${st.id}`,
            gradeLevel: st.gradeLevel || 'N/A',
            className: cls.name,
            creditType: isHalf ? '0.5 Half Credit' : '1.0 Full Credit',
            providerName: prov?.commercialName || prov?.legalName || 'Proveedor General',
            salePriceUSD: salePrice,
            status: en.status || 'Activo',
            startDate: en.startDate || en.activationDate || 'N/A'
          });
        }
      });
    });
    return rows;
  }, [instStudents, enrollments, classes, providers, institution, catalogs, providerProductServices]);

  // Account status label
  const isUpToDate = totalPorRecaudarUSD <= 0.01;
  const resolvedStatus = isUpToDate ? 'Al Corriente' : 'Saldo Pendiente';

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Tipo de Concepto',
      'Descripción / Alumno',
      'Método de Pago',
      'Folio / Referencia',
      'Monto USD',
      'Monto MXN',
      'Estatus'
    ];

    const dataRows = instPayments.map(p => {
      const isMemb = isMembershipPayment(p);
      const amtUSD = getPaymentUSD(p);
      const amtMXN = getPaymentMXN(p);
      const studentObj = p.studentId ? students.find(s => String(s.id) === String(p.studentId)) : null;
      const stName = studentObj ? `${studentObj.name} ${studentObj.lastName || ''}`.trim() : '';
      return [
        `"${p.date || ''}"`,
        `"${isMemb ? 'Membresía' : 'Cursos'}"`,
        `"${(p.description || '') + (stName ? ` - Alumno: ${stName}` : '')}"`,
        `"${p.paymentMethod || 'Transferencia'}"`,
        `"${p.taxId || p.receiptNumber || p.id || ''}"`,
        amtUSD.toFixed(2),
        amtMXN.toFixed(2),
        `"${p.status || 'Pagado'}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [
      `"ESTADO DE CUENTA - ${institution.name.toUpperCase()}"`,
      `"Tipo de Reporte: ${reportType === 'interno' ? 'Uso Interno (ERP)' : 'Para la Institución (Cliente)'}"`,
      `"Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}"`,
      `"Total Facturado USD: $${totalIngresosProyectadosUSD.toFixed(2)}"`,
      `"Total Pagado USD: $${totalPagadoUSD.toFixed(2)}"`,
      `"Saldo Pendiente USD: $${totalPorRecaudarUSD.toFixed(2)}"`,
      '',
      headers.join(','),
      ...dataRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Estado_Cuenta_${institution.name.replace(/[^a-zA-Z0-9]/g, '_')}_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate & Print in standalone popup
  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes (pop-ups) para generar la impresión del estado de cuenta.');
      return;
    }

    const docTitle = reportType === 'interno'
      ? `Reporte Ejecutivo Financiero (Uso Interno) - ${institution.name}`
      : `Estado de Cuenta Oficial - ${institution.name}`;

    const isInternal = reportType === 'interno';

    const renderPrintPaymentRows = (list: any[], badgeText: string, badgeBg: string, badgeColor: string) => {
      if (list.length === 0) {
        return `<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 9.5px; background-color: #f8fafc;">No se registraron movimientos en este apartado.</td></tr>`;
      }
      return list.map((p, idx) => {
        const amtUSD = getPaymentUSD(p);
        const amtMXN = getPaymentMXN(p);
        const studentObj = p.studentId ? students.find(s => String(s.id) === String(p.studentId)) : null;
        const studentName = studentObj ? `${studentObj.name} ${studentObj.lastName || ''}`.trim() : '';
        const bgZebra = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        const attachPills: string[] = [];
        if (p.invoicePdfUrl) attachPills.push('<span style="background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3; padding: 1px 4px; border-radius: 3px; font-size: 7.5px; font-weight: 700;">PDF Factura</span>');
        if (p.invoiceXmlUrl) attachPills.push('<span style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 3px; font-size: 7.5px; font-weight: 700;">XML CFDI</span>');
        if (p.receiptPdfUrl || p.attachmentUrl) attachPills.push('<span style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 1px 4px; border-radius: 3px; font-size: 7.5px; font-weight: 700;">Comprobante</span>');
        const attachHtml = attachPills.length > 0 
          ? `<div style="display: flex; gap: 3px; justify-content: center; flex-wrap: wrap;">${attachPills.join('')}</div>`
          : '<span style="color: #cbd5e1; font-size: 8px;">-</span>';

        return `
          <tr style="background-color: ${bgZebra}; border-bottom: 1px solid #e2e8f0; font-size: 10px;">
            <td style="padding: 6px 10px; color: #64748b; font-family: monospace; white-space: nowrap;">${p.date || 'N/A'}</td>
            <td style="padding: 6px 10px; color: #1e293b;">
              <div style="font-weight: 700;">${p.description || 'Pago Registrado'}</div>
              ${studentName ? `<div style="font-size: 8.5px; color: #475569;">Alumno: <strong>${studentName}</strong></div>` : ''}
            </td>
            <td style="padding: 6px 10px; color: #475569; white-space: nowrap;">${p.paymentMethod || 'Transferencia'}</td>
            <td style="padding: 6px 10px; text-align: center; white-space: nowrap;">
              <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 700; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                ${p.status || 'Pagado'}
              </span>
            </td>
            <td style="padding: 6px 10px; text-align: center; white-space: nowrap;">
              ${attachHtml}
            </td>
            <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">
              $${amtUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              <div style="font-size: 8.5px; color: #64748b; font-weight: normal;">~$${amtMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
            </td>
          </tr>
        `;
      }).join('');
    };

    const renderAcademicRows = () => {
      if (studentEnrollmentDetails.length === 0) {
        return `<tr><td colspan="5" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 9.5px; background-color: #f8fafc;">No hay materias activas registradas en este período.</td></tr>`;
      }
      return studentEnrollmentDetails.slice(0, 100).map((row, idx) => {
        const bgZebra = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `
          <tr style="background-color: ${bgZebra}; border-bottom: 1px solid #e2e8f0; font-size: 10px;">
            <td style="padding: 5px 8px; color: #64748b; font-family: monospace;">${idx + 1}</td>
            <td style="padding: 5px 8px; font-weight: 700; color: #1e293b;">
              ${row.studentName}
              <span style="font-size: 8.5px; color: #64748b; font-weight: normal; margin-left: 4px;">(${row.studentCode})</span>
            </td>
            <td style="padding: 5px 8px; color: #334155;">
              ${row.className}
              <span style="display: inline-block; margin-left: 4px; padding: 1px 4px; background: #e0e7ff; color: #3730a3; border-radius: 3px; font-size: 8px; font-weight: 700;">${row.creditType}</span>
            </td>
            ${isInternal ? `<td style="padding: 5px 8px; color: #475569; font-size: 9px;">${row.providerName}</td>` : ''}
            <td style="padding: 5px 8px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">
              $${row.salePriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </td>
          </tr>
        `;
      }).join('');
    };

    const bankAccountsHtml = bankAccounts && bankAccounts.length > 0
      ? bankAccounts.map(ba => `
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #1e293b; font-size: 9.5px;">${ba.bankName || 'Banco'}</strong>
            <span style="font-size: 8.5px; padding: 1px 5px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-weight: 700;">${ba.currency || 'USD / MXN'}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px; color: #475569;">
            <div><strong>Titular:</strong> ${ba.ownerName || companyInfo?.legalName || companyInfo?.commercialName || 'IHS Education'}</div>
            <div><strong>Cuenta:</strong> <span style="font-family: monospace;">${ba.accountNumber || 'N/A'}</span></div>
            ${ba.clabe ? `<div><strong>CLABE Interbancaria:</strong> <span style="font-family: monospace;">${ba.clabe}</span></div>` : ''}
            ${ba.swift ? `<div><strong>SWIFT / BIC:</strong> <span style="font-family: monospace;">${ba.swift}</span></div>` : ''}
          </div>
        </div>
      `).join('')
      : `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; font-size: 9px; color: #64748b;">
          Para transferencias electrónicas, contactar directamente a la administración de ${companyInfo?.commercialName || 'IHS Education'}.
        </div>
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${docTitle}</title>
          <style>
            * { box-sizing: border-box; }
            @page {
              size: letter;
              margin: 8mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 16px;
              font-size: 10px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              body {
                background-color: #ffffff !important;
                padding: 0 !important;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .report-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
            }
            .container {
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              padding: 24px;
            }
            .action-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 16px;
              box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);
            }
            .btn {
              padding: 6px 14px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-radius: 6px;
              cursor: pointer;
              border: none;
              transition: all 0.15s;
            }
            .btn-primary { background-color: #4f46e5; color: #ffffff; }
            .btn-primary:hover { background-color: #4338ca; }
            .btn-secondary { background-color: #f1f5f9; color: #475569; }
            .btn-secondary:hover { background-color: #e2e8f0; }
            .doc-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid ${isInternal ? '#dc2626' : '#4f46e5'};
              padding-bottom: 14px;
              margin-bottom: 14px;
            }
            .company-name {
              font-size: 13px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-title {
              font-size: 15px;
              font-weight: 900;
              color: ${isInternal ? '#991b1b' : '#312e81'};
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .tag {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 8.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .tag-internal { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            .tag-external { background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
            .tag-status-ok { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .tag-status-debt { background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
            .info-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 12px;
              box-shadow: 0 1px 2px 0 rgba(0,0,0,0.02);
            }
            .kpi-card {
              border-radius: 8px;
              padding: 10px 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04);
            }
            .kpi-label { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .kpi-value { font-size: 13px; font-weight: 900; line-height: 1.1; }
            .kpi-sub { font-size: 8.5px; margin-top: 2px; }
            .table-wrap {
              width: 100%;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
              margin-top: 6px;
              box-shadow: 0 1px 2px 0 rgba(0,0,0,0.03);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
            }
            th {
              background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
              border-bottom: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 8.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
            }
            tfoot tr {
              background-color: #f1f5f9;
              border-top: 2px solid #cbd5e1;
              font-weight: 800;
              font-size: 10px;
            }
            .sec-title {
              font-size: 9.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-top: 12px;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .footer-sign {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 28px;
              padding-top: 12px;
            }
            .sign-line {
              border-top: 1px solid #94a3b8;
              text-align: center;
              padding-top: 4px;
              font-size: 8.5px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="no-print action-bar" style="max-width: 820px; margin: 0 auto 12px auto;">
            <div>
              <span style="font-weight: 800; font-size: 11px; color: #0f172a;">Vista de Impresión Oficial</span>
              <span style="font-size: 9.5px; color: #64748b; margin-left: 8px;">(${isInternal ? 'Documento Ejecutivo de Uso Interno' : 'Estado de Cuenta para la Institución'})</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="window.print()" class="btn btn-primary">🖨️ Imprimir / Guardar PDF</button>
              <button onclick="window.close()" class="btn btn-secondary">Cerrar</button>
            </div>
          </div>

          <div class="container">
            <!-- Header -->
            <div class="doc-header">
              <div>
                <div class="company-name">${companyInfo?.commercialName || 'IHS EDUCATION PLATFORM'}</div>
                <div class="doc-title">${isInternal ? 'Reporte Financiero Ejecutivo (Uso Interno)' : 'Estado de Cuenta Institucional'}</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
                  ${companyInfo?.legalName ? `${companyInfo.legalName} &bull; ` : ''}
                  ${companyInfo?.rfc ? `RFC: ${companyInfo.rfc} &bull; ` : ''}
                  ${companyInfo?.email || 'administracion@ihseducation.com'}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="tag ${isInternal ? 'tag-internal' : 'tag-external'}">
                  ${isInternal ? '🔒 CONFIDENCIAL &bull; USO INTERNO' : '🏢 COPIA OFICIAL PARA INSTITUCIÓN'}
                </span>
                <div style="font-size: 8.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
                  Folio: EST-${institution.id}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}
                </div>
                <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">
                  Emisión: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>

            <!-- Institution & Period Info Grid -->
            <div class="grid-2" style="margin-bottom: 12px;">
              <div class="info-box">
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 3px;">
                  Datos de la Institución Educativa
                </div>
                <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${institution.name}</div>
                ${institution.tradeName ? `<div style="font-size: 9px; color: #475569; font-weight: 600;">${institution.tradeName}</div>` : ''}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; font-size: 8.5px; color: #475569;">
                  <div><strong>Contacto:</strong> ${institution.contact || 'No especificado'}</div>
                  <div><strong>Cargo:</strong> ${institution.contactPosition || 'Dirección / Administración'}</div>
                  <div><strong>Email:</strong> ${institution.contactEmail || institution.email || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> ${institution.contactPhone || institution.phone || 'N/A'}</div>
                  <div><strong>País / Ubicación:</strong> ${institution.country || 'N/A'} ${institution.city ? `(${institution.city})` : ''}</div>
                  <div><strong>Código / ID:</strong> ${institution.institutionCode || `INST-${institution.id}`}</div>
                </div>
              </div>

              <div class="info-box">
                <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 3px;">
                  Estatus de Cuenta y Período Académico
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="tag ${isUpToDate ? 'tag-status-ok' : 'tag-status-debt'}">
                    ${resolvedStatus.toUpperCase()}
                  </span>
                  <span style="font-size: 8.5px; font-weight: 700; color: #475569;">
                    Plan: <strong style="color: #0f172a;">${membershipPlan?.name || 'Membresía Estándar'}</strong>
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px; color: #475569;">
                  <div><strong>Alumnos Matriculados:</strong> ${instStudents.length}</div>
                  <div><strong>Materias Activas:</strong> ${numActiveEnrollments} (${numActiveFullCredits} Full / ${numActiveHalfCredits} Half)</div>
                  <div><strong>Vigencia Membresía:</strong> ${institution.membershipExpiration || 'Indefinida / Activa'}</div>
                  <div><strong>Modalidad de Pago:</strong> ${institution.payWithIva ? 'Con IVA (16%)' : 'Neto sin IVA'}</div>
                  ${isInternal && agentUser ? `<div><strong>Agente Gestor:</strong> ${agentUser.name}</div>` : ''}
                  <div><strong>Corte al:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
                </div>
              </div>
            </div>

            <!-- Financial Summary Cards (Sombreado) -->
            ${!isInternal ? `
              <!-- Client Facing Summary (Para la Institución) -->
              <div class="grid-3" style="margin-bottom: 12px;">
                <div class="kpi-card" style="background-color: #f8fafc; border-color: #cbd5e1;">
                  <div class="kpi-label" style="color: #475569;">Total Facturado (Cargos)</div>
                  <div class="kpi-value" style="color: #0f172a;">$${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; font-weight: 700; color: #4f46e5;">USD</span></div>
                  <div class="kpi-sub" style="color: #64748b;">~$${totalIngresosProyectadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                </div>
                <div class="kpi-card" style="background-color: #ecfdf5; border-color: #a7f3d0;">
                  <div class="kpi-label" style="color: #047857;">Total Acreditado (Pagado)</div>
                  <div class="kpi-value" style="color: #065f46;">$${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; font-weight: 700; color: #059669;">USD</span></div>
                  <div class="kpi-sub" style="color: #047857;">~$${totalPagadoMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                </div>
                <div class="kpi-card" style="background-color: ${isUpToDate ? '#f0fdf4' : '#fff1f2'}; border-color: ${isUpToDate ? '#bbf7d0' : '#fecdd3'};">
                  <div class="kpi-label" style="color: ${isUpToDate ? '#166534' : '#9f1239'};">Saldo Pendiente a Liquidar</div>
                  <div class="kpi-value" style="color: ${isUpToDate ? '#15803d' : '#be123c'};">$${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; font-weight: 700; color: ${isUpToDate ? '#16a34a' : '#e11d48'};">USD</span></div>
                  <div class="kpi-sub" style="color: ${isUpToDate ? '#166534' : '#be123c'};">~$${totalPorRecaudarMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</div>
                </div>
              </div>
            ` : `
              <!-- Internal ERP Executive Summary (Uso Interno) -->
              <div class="grid-4" style="margin-bottom: 12px;">
                <div class="kpi-card" style="background-color: #f8fafc; border-color: #cbd5e1;">
                  <div class="kpi-label" style="color: #475569;">Ingresos Facturados</div>
                  <div class="kpi-value" style="color: #0f172a;">$${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; color: #4f46e5;">USD</span></div>
                  <div class="kpi-sub" style="color: #64748b;">Cobrado: $${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                </div>
                <div class="kpi-card" style="background-color: #fff1f2; border-color: #fecdd3;">
                  <div class="kpi-label" style="color: #9f1239;">Costos Proveedor (Egresos)</div>
                  <div class="kpi-value" style="color: #991b1b;">$${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; color: #dc2626;">USD</span></div>
                  <div class="kpi-sub" style="color: #be123c;">Por pagar prov: $${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                </div>
                <div class="kpi-card" style="background-color: #ecfdf5; border-color: #a7f3d0;">
                  <div class="kpi-label" style="color: #047857;">Margen Bruto Proyectado</div>
                  <div class="kpi-value" style="color: #065f46;">$${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; color: #059669;">USD</span></div>
                  <div class="kpi-sub" style="color: #047857; font-weight: 700;">Rentabilidad: ${margenPorcentaje.toFixed(1)}%</div>
                </div>
                <div class="kpi-card" style="background-color: #eef2ff; border-color: #c7d2fe;">
                  <div class="kpi-label" style="color: #3730a3;">Saldo por Cobrar (Cliente)</div>
                  <div class="kpi-value" style="color: #312e81;">$${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 9px; color: #4338ca;">USD</span></div>
                  <div class="kpi-sub" style="color: #4338ca;">${isUpToDate ? 'Al corriente' : 'Acción de Cobranza'}</div>
                </div>
              </div>
            `}

            <!-- SECTION 1: Concept Breakdown (Cursos vs Membresía) -->
            <div class="sec-title">
              <span>1. Concentrado de Conceptos Facturados (Cursos y Membresía)</span>
              <span style="font-size: 8.5px; font-weight: 700; color: #64748b;">
                Cursos: $${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD &bull; Membresía: $${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
              </span>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 25px;">#</th>
                    <th>Concepto / Rubro</th>
                    <th>Detalle / Especificación</th>
                    <th style="text-align: right;">Total Facturado (USD)</th>
                    <th style="text-align: right;">Acreditado (USD)</th>
                    <th style="text-align: right;">Saldo (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; color: #64748b; font-family: monospace;">1</td>
                    <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">
                      📚 Matrícula y Cuotas por Cursos Académicos
                    </td>
                    <td style="padding: 6px 8px; color: #475569; font-size: 9px;">
                      ${numActiveEnrollments} materias activas (${numActiveFullCredits} Full Credit, ${numActiveHalfCredits} Half Credit) en ${instStudents.length} alumnos
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a;">
                      $${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #047857;">
                      $${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${coursesPendingUSD > 0.01 ? '#be123c' : '#047857'};">
                      $${coursesPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px; color: #64748b; font-family: monospace;">2</td>
                    <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">
                      ⭐ Cuota Anual de Membresía Institucional
                    </td>
                    <td style="padding: 6px 8px; color: #475569; font-size: 9px;">
                      Plan ${membershipPlan?.name || 'Membresía'} &bull; Vigencia: ${institution.membershipExpiration || 'Activa'}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a;">
                      $${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #047857;">
                      $${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${membPendingUSD > 0.01 ? '#be123c' : '#047857'};">
                      $${membPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 6px 8px; text-transform: uppercase; font-size: 9px; color: #334155;">
                      Gran Total Consolidado:
                    </td>
                    <td style="padding: 6px 8px; text-align: right; color: #0f172a;">
                      $${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                    <td style="padding: 6px 8px; text-align: right; color: #047857;">
                      $${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                    <td style="padding: 6px 8px; text-align: right; color: ${totalPorRecaudarUSD > 0.01 ? '#be123c' : '#047857'};">
                      $${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- SECTION 2: Payments History (Historial de Pagos Realizados) -->
            <div class="sec-title">
              <span>2. Historial de Pagos y Abonos Registrados</span>
              <span style="font-size: 8.5px; font-weight: 700; color: #059669;">
                Total Acreditado: $${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (${instPayments.length} abonos)
              </span>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 75px;">Fecha</th>
                    <th>Concepto / Alumno</th>
                    <th style="width: 95px;">Método</th>
                    <th style="text-align: center; width: 65px;">Estado</th>
                    <th style="text-align: center; width: 85px;">Comprobante</th>
                    <th style="text-align: right; width: 110px;">Importe (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderPrintPaymentRows(instPayments, 'Pago', 'bg-indigo-50', 'text-indigo-700')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" style="padding: 6px 10px; text-transform: uppercase; font-size: 9px; color: #334155;">
                      Total Pagos Acreditados (${instPayments.length} movimientos):
                    </td>
                    <td style="padding: 6px 10px; text-align: right; color: #047857;">
                      $${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            ${!isInternal ? `
              <!-- Banking / Payment Instructions for Client -->
              <div class="sec-title">
                <span>3. Cuentas Bancarias e Instrucciones de Pago</span>
                <span style="font-size: 8px; color: #64748b;">Transferencia Electrónica Directa</span>
              </div>
              <div style="margin-top: 6px;">
                ${bankAccountsHtml}
              </div>

              <!-- Notes and Signatures for Client -->
              <div style="margin-top: 14px; padding: 8px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 8.5px; color: #64748b; line-height: 1.4;">
                <strong>Aclaraciones y Comprobantes:</strong> Favor de enviar su comprobante de pago con el nombre de la institución a <strong style="color: #334155;">${companyInfo?.email || 'cobranza@ihseducation.com'}</strong> para su acreditación inmediata. Los saldos pendientes deben cubrirse de acuerdo con el calendario acordado en el convenio institucional.
              </div>

              <div class="footer-sign">
                <div class="sign-line">
                  <div>${companyInfo?.commercialName || 'IHS Education'}</div>
                  <div style="font-size: 7.5px; color: #94a3b8; font-weight: normal; margin-top: 2px;">Dirección de Administración y Finanzas</div>
                </div>
                <div class="sign-line">
                  <div>${institution.name}</div>
                  <div style="font-size: 7.5px; color: #94a3b8; font-weight: normal; margin-top: 2px;">Representante / Dirección Institucional</div>
                </div>
              </div>
            ` : `
              <!-- Internal Financial Breakdown (Uso Interno) -->
              <div class="sec-title">
                <span>3. Análisis de Costos a Proveedores y Márgenes de Rentabilidad</span>
                <span style="font-size: 8px; font-weight: 700; color: #dc2626;">Egresos Directos IHS</span>
              </div>

              <div class="grid-3" style="margin-top: 6px;">
                <div class="info-box">
                  <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">Costo Clases (Proveedores)</div>
                  <div style="font-size: 12px; font-weight: 900; color: #991b1b;">$${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">~$${totalCostMXN.toLocaleString(undefined, { minimumFractionDigits: 2 })} MXN</div>
                </div>
                <div class="info-box">
                  <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">Dispersado a Proveedor</div>
                  <div style="font-size: 12px; font-weight: 900; color: #047857;">$${egresosPagadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Saldo pendiente: $${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                </div>
                <div class="info-box">
                  <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">Utilidad Bruta Proyectada</div>
                  <div style="font-size: 12px; font-weight: 900; color: #065f46;">$${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <div style="font-size: 8.5px; color: #047857; font-weight: 700; margin-top: 2px;">Margen Neto: ${margenPorcentaje.toFixed(1)}%</div>
                </div>
              </div>

              <div class="footer-sign">
                <div class="sign-line">
                  <div>Dirección de Operaciones</div>
                  <div style="font-size: 7.5px; color: #94a3b8; font-weight: normal; margin-top: 2px;">Control Presupuestal y Proveedores</div>
                </div>
                <div class="sign-line">
                  <div>Auditoría Financiera Interna</div>
                  <div style="font-size: 7.5px; color: #94a3b8; font-weight: normal; margin-top: 2px;">IHS Manager Platform ERP</div>
                </div>
              </div>
            `}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!isOpen || !institution) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-5xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-4 max-h-[94vh] animate-in zoom-in-95 duration-150">
        
        {/* Modal Top Control Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              reportType === 'interno' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                  {reportType === 'interno' ? 'Reporte Ejecutivo Financiero' : 'Estado de Cuenta Institucional'}
                </h3>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                  reportType === 'interno' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {reportType === 'interno' ? 'Uso Interno ERP' : 'Para la Institución'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {institution.name} &bull; Folio EST-{institution.id}
              </p>
            </div>
          </div>

          {/* Type Toggle Pills & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Version Switcher Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
              <button
                type="button"
                onClick={() => setReportType('institucion')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                  reportType === 'institucion'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Para la Institución</span>
              </button>

              {isUserAdminOrSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setReportType('interno')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                    reportType === 'interno'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Uso Interno (ERP)</span>
                </button>
              )}
            </div>

            {/* Quick Export Actions */}
            <button
              type="button"
              onClick={handleExportCSV}
              title="Descargar CSV / Excel"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDocument}
              title="Imprimir o Guardar PDF"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow inline-flex items-center gap-1.5 cursor-pointer border-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-0 bg-transparent ml-1"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider">Período:</span>
            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer border-0 ${
                dateFilterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todo el Historial
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('custom')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer border-0 ${
                dateFilterMode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Personalizado
            </button>

            {dateFilterMode === 'custom' && (
              <div className="inline-flex items-center gap-1.5 ml-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-700 outline-none"
                  placeholder="Desde"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-700 outline-none"
                  placeholder="Hasta"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>{instPayments.length} pagos registrados</span>
            <span>&bull;</span>
            <span>{numActiveEnrollments} materias activas</span>
          </div>
        </div>

        {/* Live Document Preview Scrollable Sheet */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60 flex justify-center">
          <div className="bg-white w-full max-w-4xl p-5 sm:p-8 rounded-xl shadow-md border border-slate-300/40 text-slate-800 space-y-4 text-[10px] font-sans">
            
            {/* Header with Reduced Font and Shading */}
            <div className={`pb-3.5 border-b-2 flex justify-between items-start ${
              reportType === 'interno' ? 'border-rose-600' : 'border-indigo-600'
            }`}>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                  {companyInfo?.commercialName || 'IHS EDUCATION PLATFORM'}
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {reportType === 'interno' ? 'Reporte Ejecutivo Financiero y Rentabilidad' : 'Estado de Cuenta Institucional'}
                </h1>
                <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">
                  {companyInfo?.legalName ? `${companyInfo.legalName} • ` : ''}
                  {companyInfo?.rfc ? `RFC: ${companyInfo.rfc} • ` : ''}
                  {companyInfo?.email || 'administracion@ihseducation.com'}
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider border shadow-xs ${
                  reportType === 'interno'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {reportType === 'interno' ? '🔒 Documento Interno Confidencial' : '🏢 Copia Oficial Institución'}
                </span>
                <div className="text-[8.5px] font-mono text-slate-400 mt-1">
                  Folio: EST-{institution.id}-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}
                </div>
                <div className="text-[8.5px] font-mono text-slate-400">
                  Emisión: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Institution Metadata Grid with Soft Shading */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">
                  Institución Educativa
                </span>
                <div className="text-xs font-black text-slate-900 leading-tight">{institution.name}</div>
                {institution.tradeName && (
                  <div className="text-[9px] text-slate-600 font-semibold">{institution.tradeName}</div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[8.5px] text-slate-600 border-t border-slate-200/60 mt-1">
                  <div><strong>Contacto:</strong> {institution.contact || 'N/A'}</div>
                  <div><strong>Cargo:</strong> {institution.contactPosition || 'Dirección'}</div>
                  <div><strong>Email:</strong> {institution.contactEmail || institution.email || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> {institution.contactPhone || institution.phone || 'N/A'}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Estatus Financiero
                  </span>
                  <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    isUpToDate ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {resolvedStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[8.5px] text-slate-600">
                  <div><strong>Plan de Membresía:</strong> {membershipPlan?.name || 'Estándar'}</div>
                  <div><strong>Vigencia:</strong> {institution.membershipExpiration || 'Activa'}</div>
                  <div><strong>Alumnos Inscritos:</strong> {instStudents.length}</div>
                  <div><strong>Materias Activas:</strong> {numActiveEnrollments} ({numActiveFullCredits}F / {numActiveHalfCredits}H)</div>
                  {reportType === 'interno' && agentUser && (
                    <div className="col-span-2"><strong>Agente Asignado:</strong> {agentUser.name}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary Highlight Cards with Shading & Compact Numbers */}
            {reportType === 'institucion' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 shadow-xs">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Total Facturado (Cargos)</span>
                  <div className="text-sm font-black text-slate-900">
                    ${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] font-bold text-indigo-600">USD</span>
                  </div>
                  <span className="text-[8.5px] text-slate-500 font-medium block">~${totalIngresosProyectadosMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-b from-emerald-50/60 to-emerald-100/40 border border-emerald-200/80 shadow-xs">
                  <span className="text-[8px] font-black uppercase text-emerald-800 tracking-wider block mb-0.5">Total Acreditado (Pagado)</span>
                  <div className="text-sm font-black text-emerald-800">
                    ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] font-bold text-emerald-600">USD</span>
                  </div>
                  <span className="text-[8.5px] text-emerald-700 font-medium block">~${totalPagadoMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                </div>

                <div className={`p-3 rounded-lg border shadow-xs ${
                  isUpToDate 
                    ? 'bg-gradient-to-b from-emerald-50/40 to-emerald-100/30 border-emerald-200' 
                    : 'bg-gradient-to-b from-rose-50/70 to-rose-100/50 border-rose-200'
                }`}>
                  <span className={`text-[8px] font-black uppercase tracking-wider block mb-0.5 ${
                    isUpToDate ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    Saldo Pendiente a Liquidar
                  </span>
                  <div className={`text-sm font-black ${isUpToDate ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] font-bold">USD</span>
                  </div>
                  <span className={`text-[8.5px] font-medium block ${isUpToDate ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ~${totalPorRecaudarMXN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </span>
                </div>
              </div>
            ) : (
              /* Internal Executive Cards */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
                  <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider block">Ingreso Facturado</span>
                  <div className="text-xs font-black text-slate-900">${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <span className="text-[8px] text-slate-400">Cobrado: ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 shadow-xs">
                  <span className="text-[7.5px] font-black uppercase text-rose-700 tracking-wider block">Costos Proveedor</span>
                  <div className="text-xs font-black text-rose-800">${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <span className="text-[8px] text-rose-600">Por pagar: ${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 shadow-xs">
                  <span className="text-[7.5px] font-black uppercase text-emerald-800 tracking-wider block">Margen Bruto</span>
                  <div className="text-xs font-black text-emerald-900">${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <span className="text-[8px] text-emerald-700 font-bold">Rentabilidad: {margenPorcentaje.toFixed(1)}%</span>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 shadow-xs">
                  <span className="text-[7.5px] font-black uppercase text-indigo-800 tracking-wider block">Saldo por Cobrar</span>
                  <div className="text-xs font-black text-indigo-950">${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  <span className="text-[8px] text-indigo-600">{isUpToDate ? 'Al corriente' : 'Por cobrar'}</span>
                </div>
              </div>
            )}

            {/* SECTION 1: Concentrado Cursos vs Membresía Table */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  1. Desglose y Concentrado de Conceptos Facturados
                </h4>
                <span className="text-[8.5px] text-slate-500 font-semibold">
                  Cursos: ${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD | Membresía: ${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse text-[9.5px]">
                  <thead>
                    <tr className="bg-gradient-to-b from-slate-50 to-slate-100/80 border-b border-slate-200 text-[8px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="px-3 py-1.5 w-6">#</th>
                      <th className="px-3 py-1.5">Concepto / Rubro</th>
                      <th className="px-3 py-1.5">Detalle / Especificación</th>
                      <th className="px-3 py-1.5 text-right">Facturado (USD)</th>
                      <th className="px-3 py-1.5 text-right">Acreditado (USD)</th>
                      <th className="px-3 py-1.5 text-right">Saldo (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-slate-400">1</td>
                      <td className="px-3 py-2 font-bold text-slate-800">
                        📚 Cuotas por Materias Académicas
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[9px]">
                        {numActiveEnrollments} materias ({numActiveFullCredits} Full / {numActiveHalfCredits} Half) en {instStudents.length} alumnos
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                        ${totalVendidoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">
                        ${coursesPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${coursesPendingUSD > 0.01 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ${coursesPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-400">2</td>
                      <td className="px-3 py-2 font-bold text-slate-800">
                        ⭐ Membresía Institucional
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[9px]">
                        Plan {membershipPlan?.name || 'Membresía'} &bull; Vence: {institution.membershipExpiration || 'Activa'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                        ${totalMembUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">
                        ${membPaidUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${membPendingUSD > 0.01 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ${membPendingUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-[9.5px]">
                      <td colSpan={3} className="px-3 py-1.5 uppercase text-slate-700 text-[8.5px] font-black">
                        Total General Facturado vs Acreditado:
                      </td>
                      <td className="px-3 py-1.5 text-right font-black text-slate-900">
                        ${totalIngresosProyectadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </td>
                      <td className="px-3 py-1.5 text-right font-black text-emerald-700">
                        ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </td>
                      <td className={`px-3 py-1.5 text-right font-black ${totalPorRecaudarUSD > 0.01 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        ${totalPorRecaudarUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 2: Payments History Table with Zebra Shading */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  2. Historial de Pagos y Abonos Registrados ({instPayments.length} transacciones)
                </h4>
                <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Total Pagado: ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>

              {instPayments.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg text-center text-slate-400 text-[9.5px]">
                  No se han registrado pagos en este período.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs max-h-60">
                  <table className="w-full text-left border-collapse text-[9.5px]">
                    <thead>
                      <tr className="bg-gradient-to-b from-slate-50 to-slate-100/80 border-b border-slate-200 text-[8px] font-black text-slate-600 uppercase tracking-wider sticky top-0">
                        <th className="px-3 py-1.5 w-20">Fecha</th>
                        <th className="px-3 py-1.5">Concepto / Alumno</th>
                        <th className="px-3 py-1.5 w-24">Método</th>
                        <th className="px-3 py-1.5 text-center w-16">Estado</th>
                        <th className="px-3 py-1.5 text-center w-28">Comprobantes</th>
                        <th className="px-3 py-1.5 text-right w-28">Monto (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {instPayments.map((p, idx) => {
                        const amtUSD = getPaymentUSD(p);
                        const isMemb = isMembershipPayment(p);
                        const studentObj = p.studentId ? students.find(s => String(s.id) === String(p.studentId)) : null;
                        const studentName = studentObj ? `${studentObj.name} ${studentObj.lastName || ''}`.trim() : '';
                        return (
                          <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/40 hover:bg-slate-50'}>
                            <td className="px-3 py-1.5 font-mono text-slate-500 whitespace-nowrap text-[9px]">{p.date}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[7.5px] font-extrabold uppercase ${
                                  isMemb ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {isMemb ? 'Membresía' : 'Cursos'}
                                </span>
                                <span className="font-bold text-slate-800">{p.description}</span>
                              </div>
                              {studentName && (
                                <div className="text-[8px] text-slate-500 mt-0.5">
                                  Alumno: <strong className="text-slate-700">{studentName}</strong>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 font-medium whitespace-nowrap">{p.paymentMethod || 'Transferencia'}</td>
                            <td className="px-3 py-1.5 text-center whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {p.status || 'Pagado'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center whitespace-nowrap">
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
                            <td className="px-3 py-1.5 text-right font-black text-slate-900 whitespace-nowrap">
                              ${amtUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-[9.5px]">
                        <td colSpan={5} className="px-3 py-1.5 uppercase text-slate-700 text-[8.5px] font-black">
                          Total Pagos Registrados:
                        </td>
                        <td className="px-3 py-1.5 text-right font-black text-emerald-800">
                          ${totalPagadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Section: Bank Accounts (Client) or Cost & Profitability Breakdown (Internal) */}
            {reportType === 'institucion' ? (
              <div className="space-y-1.5 pt-1">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Landmark className="w-3 h-3 text-indigo-600" />
                  3. Datos Bancarios e Instrucciones de Pago
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {bankAccounts && bankAccounts.length > 0 ? (
                    bankAccounts.slice(0, 2).map((ba: any) => (
                      <div key={ba.id} className="p-2.5 bg-slate-50/90 rounded-lg border border-slate-200 text-[8.5px] text-slate-600 space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                          <span>{ba.bankName}</span>
                          <span className="text-indigo-600 font-mono text-[8px]">{ba.currency || 'USD/MXN'}</span>
                        </div>
                        <div><strong>Titular:</strong> {ba.ownerName || companyInfo?.legalName || 'IHS Education'}</div>
                        <div><strong>Cuenta:</strong> <span className="font-mono">{ba.accountNumber || 'N/A'}</span></div>
                        {ba.clabe && <div><strong>CLABE:</strong> <span className="font-mono">{ba.clabe}</span></div>}
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[8.5px] text-slate-500">
                      Para datos de transferencia, favor de comunicarse a {companyInfo?.email || 'administracion@ihseducation.com'}.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Internal Cost & Margin Analysis */
              <div className="space-y-1.5 pt-1">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-rose-800 border-b border-rose-200 pb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-rose-600" />
                  3. Análisis Ejecutivo de Costos a Proveedores y Utilidad Bruta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 bg-rose-50/50 rounded-lg border border-rose-100 text-[8.5px] space-y-0.5">
                    <span className="text-[7.5px] font-black uppercase text-rose-700 block">Costo Total Clases (Proveedores)</span>
                    <div className="text-xs font-black text-rose-900">${totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                    <div className="text-[8px] text-rose-600">Dispersado: ${egresosPagadosUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                  </div>

                  <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100 text-[8.5px] space-y-0.5">
                    <span className="text-[7.5px] font-black uppercase text-amber-700 block">Saldo por Pagar a Proveedor</span>
                    <div className="text-xs font-black text-amber-900">${saldoPorPagarUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                    <div className="text-[8px] text-amber-600">Cuentas por pagar activas</div>
                  </div>

                  <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-[8.5px] space-y-0.5">
                    <span className="text-[7.5px] font-black uppercase text-emerald-700 block">Margen Bruto Proyectado</span>
                    <div className="text-xs font-black text-emerald-900">${margenProyectadoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                    <div className="text-[8px] text-emerald-700 font-bold">Rentabilidad: {margenPorcentaje.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 uppercase tracking-wider font-bold">
              <span>{companyInfo?.commercialName || 'IHS Education Platform'} &bull; Sistema ERP</span>
              <span>{reportType === 'interno' ? 'USO INTERNO EXCLUSIVO' : 'COPIA AUTORIZADA PARA CLIENTE'}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="font-semibold">Modo actual:</span>
            <span className="font-bold text-slate-800">
              {reportType === 'interno' ? 'Reporte Financiero Interno (ERP & Dirección)' : 'Estado de Cuenta para la Institución'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition cursor-pointer border-0"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer border-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
