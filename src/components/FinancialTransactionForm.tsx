import React, { useState, useEffect } from 'react';
import { useAppContext, TransactionType, CurrencyCode } from '../context/AppContext';
import { Save, UploadCloud } from 'lucide-react';

interface FinancialTransactionFormProps {
  initialType?: TransactionType;
  initialData?: any;
  onSuccess: () => void;
  fixedStudentId?: number;
  fixedProviderId?: number;
  fixedInstitutionId?: number;
}

export function FinancialTransactionForm({ initialType = 'income', initialData, onSuccess, fixedStudentId, fixedProviderId, fixedInstitutionId }: FinancialTransactionFormProps) {
  const { 
    currentUser, addFinancialTransaction, updateFinancialTransaction, 
    catalogs, providers, students, institutions, bankAccounts
  } = useAppContext();

  const [formType, setFormType] = useState<TransactionType>(initialType);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    currency: 'MXN' as CurrencyCode,
    exchangeRate: '1.0',
    categoryId: initialType === 'income' ? 'cat_ingreso_servicios' : '',
    subcategory: initialType === 'income' ? 'sub_cursos_ingreso' : '',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    studentId: fixedStudentId?.toString() || '',
    providerId: fixedProviderId?.toString() || '',
    status: 'Aplicado' as 'Aplicado' | 'Pendiente' | 'Pagado' | 'Programado',
    taxId: '',
    attachmentUrl: ''
  });

  const selectedStudent = formType === 'income' && formData.studentId ? students.find(s => s.id === Number(formData.studentId)) : null;
  const currentInstitutionId = fixedInstitutionId || selectedStudent?.institutionId || initialData?.institutionId;
  const currentInstitution = currentInstitutionId ? institutions.find(i => i.id === Number(currentInstitutionId)) : null;
  const hasIvaEnabled = currentInstitution?.payWithIva === true;

  const isWellsFargo = formData.bankAccountId?.toString().toLowerCase().includes('wellsfargo') ||
                       formData.bankAccountId?.toString().toLowerCase().includes('wells fargo') ||
                       formData.bankAccountId?.toString().toLowerCase().includes('wf') ||
                       formData.bankAccountId === '2';

  const selectedAccount = bankAccounts?.find(
    a => a.id === Number(formData.bankAccountId) || 
         a.bankName === formData.bankAccountId ||
         (formData.bankAccountId === "Banorte" && a.currency === "MXN") ||
         (formData.bankAccountId === "WellsFargo USA" && a.currency === "USD")
  );
  const accountCurrency = isWellsFargo ? 'USD' : (selectedAccount ? (selectedAccount.currency || 'MXN') : formData.currency);

  useEffect(() => {
    if (initialData) {
      setFormType(initialData.type || initialType);
      setFormData({
        date: initialData.date || new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        amount: initialData.originalAmount !== undefined ? initialData.originalAmount.toString() : (initialData.amount ? initialData.amount.toString() : ''),
        currency: initialData.originalCurrency || initialData.currency || 'MXN',
        exchangeRate: initialData.exchangeRate ? initialData.exchangeRate.toString() : '18.5',
        categoryId: initialData.categoryId || '',
        subcategory: initialData.subcategory || '',
        paymentMethod: initialData.paymentMethod || 'Transferencia',
        bankAccountId: initialData.bankAccountId || '',
        studentId: (initialData.studentId || fixedStudentId)?.toString() || '',
        providerId: (initialData.providerId || fixedProviderId)?.toString() || '',
        status: initialData.status || 'Aplicado',
        taxId: initialData.taxId || '',
        attachmentUrl: initialData.attachmentUrl || ''
      });
    }
  }, [initialData, initialType, fixedStudentId, fixedProviderId]);

  useEffect(() => {
    if (!initialData) {
      if (formType === 'income') {
        setFormData(prev => ({
          ...prev,
          categoryId: prev.categoryId || 'cat_ingreso_servicios',
          subcategory: prev.subcategory || 'sub_cursos_ingreso'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          categoryId: prev.categoryId === 'cat_ingreso_servicios' ? '' : prev.categoryId,
          subcategory: prev.subcategory === 'sub_cursos_ingreso' ? '' : prev.subcategory
        }));
      }
    }
  }, [formType, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseAmount = Number(formData.amount || 0);
    const rate = formData.currency === 'MXN' ? 1 : Number(formData.exchangeRate || 18.00);
    const formCurrency = formData.currency;

    // Convert base amounts
    const baseAmountUSD = formCurrency === 'USD' ? baseAmount : (rate !== 0 ? baseAmount / rate : 0);
    const baseAmountMXN = formCurrency === 'MXN' ? baseAmount : baseAmount * rate;

    // Calculate IVA
    const ivaUSD = hasIvaEnabled ? baseAmountUSD * 0.16 : 0;
    const ivaMXN = hasIvaEnabled ? baseAmountMXN * 0.16 : 0;

    // Total amounts (with IVA)
    const totalUSD = baseAmountUSD + ivaUSD;
    const totalMXN = baseAmountMXN + ivaMXN;

    const isWellsFargo = formData.bankAccountId?.toString().toLowerCase().includes('wellsfargo') ||
                         formData.bankAccountId?.toString().toLowerCase().includes('wells fargo') ||
                         formData.bankAccountId?.toString().toLowerCase().includes('wf') ||
                         formData.bankAccountId === '2';

    let registeredAmount = baseAmount;
    let registeredCurrency = formCurrency;
    let registeredRate = rate;
    let registeredIva = hasIvaEnabled ? baseAmount * 0.16 : undefined;

    if (isWellsFargo) {
      registeredAmount = baseAmountUSD;
      registeredCurrency = 'USD';
      registeredRate = 1.0;
      registeredIva = hasIvaEnabled ? ivaUSD : undefined;
    } else {
      // Find account and determine account currency
      const selectedAccount = bankAccounts?.find(
        a => a.id === Number(formData.bankAccountId) || 
             a.bankName === formData.bankAccountId ||
             (formData.bankAccountId === "Banorte" && a.currency === "MXN") ||
             (formData.bankAccountId === "WellsFargo USA" && a.currency === "USD")
      );
      const accountCurrency = selectedAccount ? (selectedAccount.currency || 'MXN') : formCurrency;

      if (accountCurrency === 'MXN') {
        // Si la cuenta es en MXN el monto que se registra es en MXN incluyendo el IVA.
        registeredAmount = totalMXN;
        registeredCurrency = 'MXN';
        registeredRate = rate;
        registeredIva = hasIvaEnabled ? ivaMXN : undefined;
      } else {
        // Si la cuenta es en USD el monto que se registra es en USD sin el IVA.
        registeredAmount = baseAmountUSD;
        registeredCurrency = 'USD';
        registeredRate = rate;
        registeredIva = hasIvaEnabled ? ivaUSD : undefined;
      }
    }

    const commonFields = {
      date: formData.date,
      description: formData.description,
      amount: registeredAmount,
      currency: registeredCurrency as any,
      exchangeRate: registeredRate,
      categoryId: formData.categoryId,
      subcategory: formData.subcategory,
      paymentMethod: formData.paymentMethod,
      type: formType,
      bankAccountId: formData.bankAccountId,
      status: formData.status,
      taxId: formData.taxId,
      attachmentUrl: formData.attachmentUrl,
      providerId: formType === 'expense' && formData.providerId ? Number(formData.providerId) : undefined,
      studentId: formType === 'income' && formData.studentId ? Number(formData.studentId) : undefined,
      institutionId: currentInstitutionId ? Number(currentInstitutionId) : undefined,
      iva: registeredIva,
      originalAmount: baseAmount,
      originalCurrency: formCurrency as any,
    };

    if (initialData?.id) {
      updateFinancialTransaction(initialData.id, commonFields);
    } else {
      addFinancialTransaction({
        ...commonFields,
        agentId: currentUser?.id,
      });
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setFormType('income')}
          className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
        >
          Pago de Cliente (+)
        </button>
        <button
          type="button"
          onClick={() => setFormType('expense')}
          className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
        >
          Pago de Proveedor (-)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado *</label>
          <select 
            required 
            value={formData.status} 
            onChange={e => setFormData({...formData, status: e.target.value as any})}
            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold"
          >
            <option value="Aplicado">Aplicado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
            <option value="Programado">Programado</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha *</label>
          <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Concepto *</label>
          <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Pago parcial de colegiatura" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría *</label>
          <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value, subcategory: ''})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="">Seleccionar...</option>
            {catalogs['Categorías']?.filter(c => !c.type || c.type === 'anual' || c.type === formType).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subcategoría</label>
          <select value={formData.subcategory} onChange={e => setFormData({...formData, subcategory: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" disabled={!formData.categoryId}>
            <option value="">Seleccionar...</option>
            {catalogs['Subcategorías']?.filter(s => s.parentId === formData.categoryId).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {formType === 'income' ? (
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alumno / Cliente (Opcional)</label>
            <select value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" disabled={!!fixedStudentId}>
              <option value="">Ninguno</option>
              {[...students]
                .filter(s => !fixedInstitutionId || s.institutionId === Number(fixedInstitutionId))
                .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }))
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.lastName}</option>
                ))}
            </select>
          </div>
        ) : (
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proveedor (Opcional)</label>
            <select value={formData.providerId} onChange={e => setFormData({...formData, providerId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" disabled={!!fixedProviderId}>
              <option value="">Ninguno</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.legalName}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className={`p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 ${accountCurrency === 'USD' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 mt-4`}>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto de Operación *</label>
          <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Moneda del Pago</label>
          <select required value={formData.currency} onChange={e => {
              const newCurr = e.target.value as CurrencyCode;
              setFormData({...formData, currency: newCurr, exchangeRate: newCurr === 'MXN' ? '1' : '18.00'});
            }} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold">
            <option value="MXN">MXN - Pesos</option>
            <option value="USD">USD - Dólares</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Tipo de Cambio">Tipo Cambio *</label>
          <input required type="number" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" disabled={formData.currency === 'MXN'} />
        </div>
        {accountCurrency !== 'USD' && (
          <div className="flex flex-col justify-end">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {formData.currency === 'USD' ? 'Monto Equivalente (MXN)' : 'Monto de Pago'}
            </div>
            <div className="font-black text-indigo-600 text-lg">
              ${(formData.currency === 'USD' ? Number(formData.amount || 0) * Number(formData.exchangeRate || 18.00) : Number(formData.amount || 0)).toFixed(2)} MXN
            </div>
          </div>
        )}
      </div>
      
      {hasIvaEnabled && (
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">IVA (16% Calculado)</label>
            <input 
              type="text" 
              readOnly 
              value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.currency }).format(Number(formData.amount || 0) * 0.16)} 
              className="w-full border border-emerald-200 rounded-lg p-2.5 text-sm bg-white font-extrabold text-emerald-800 tracking-wide outline-none cursor-not-allowed" 
            />
          </div>
          <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">Fijación de IVA Requerida</span>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-semibold">
              La institución <strong className="font-extrabold text-slate-700">{currentInstitution?.name}</strong> tiene habilitada la opción de pago con IVA. Se aplica el 16% automaticamente.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
         <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Método de Pago</label>
          <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta de Credito">Tarjeta de Crédito</option>
            <option value="Cheque">Cheque</option>
            <option value="Efectivo">Efectivo</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta de Pago</label>
          <select value={formData.bankAccountId} onChange={e => setFormData({...formData, bankAccountId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="">No aplica / Otra</option>
            {bankAccounts?.map(a => (
              <option key={a.id} value={a.id}>
                {a.bankName} - {a.accountName} ({a.currency || 'MXN'})
              </option>
            ))}
            {catalogs['Cuentas bancarias']?.filter(c => !bankAccounts?.some(a => a.bankName === c.name)).map(c => (
              <option key={c.id} value={c.name}>
                {c.name} {c.companyName ? `(${c.companyName})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Folio Fiscal</label>
          <input type="text" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="UUID / Folio" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comprobante de Pago</label>
          <div className="relative">
            <input 
              type="file" 
              onChange={(e) => {
                const fileName = e.target.files?.[0]?.name || '';
                setFormData({...formData, attachmentUrl: fileName});
              }} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <div className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 flex items-center text-slate-500">
              <UploadCloud className="w-4 h-4 mr-2" />
              <span className="truncate">{formData.attachmentUrl || 'Subir archivo...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen detallado de Registro Contable */}
      <div className="p-4 bg-slate-55 bg-indigo-50/30 border border-slate-200/60 rounded-xl space-y-3 mt-4">
        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-100/50 pb-1.5">Detalle Contable del Pago</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-405 text-[10px] uppercase font-bold text-slate-500 block">Cuenta Destino</span>
            <span className="font-extrabold text-slate-800">
              {selectedAccount ? `${selectedAccount.bankName} (${accountCurrency})` : `Sin cuenta vinculada (${accountCurrency})`}
            </span>
          </div>
          <div>
            <span className="text-slate-405 text-[10px] uppercase font-bold text-slate-500 block">Estatus de IVA</span>
            <span className={`font-extrabold ${hasIvaEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
              {hasIvaEnabled ? '16% IVA Aplicable' : 'Exento / Sin IVA'}
            </span>
          </div>
          
          <div className="col-span-2 pt-2 border-t border-slate-200/50 flex flex-wrap justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <span className="text-slate-405 text-[9px] uppercase font-bold text-indigo-600 block">Monto total a Registrar en Cuenta ({accountCurrency})</span>
              <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                {accountCurrency === 'MXN' 
                  ? 'La cuenta es en MXN: se registra la cantidad con el IVA incluido.' 
                  : 'La cuenta es en USD: se registra la cantidad sin el IVA.'
                }
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-indigo-700 block text-lg">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: accountCurrency }).format(
                  accountCurrency === 'MXN'
                    ? (formData.currency === 'MXN' ? Number(formData.amount || 0) * (hasIvaEnabled ? 1.16 : 1) : Number(formData.amount || 0) * (hasIvaEnabled ? 1.16 : 1) * Number(formData.exchangeRate || 18))
                    : (formData.currency === 'USD' ? Number(formData.amount || 0) : Number(formData.amount || 0) / Number(formData.exchangeRate || 18))
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button type="submit" className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md ${formType === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}>
          <Save className="w-4 h-4 mr-2 inline-block" />
          {initialData?.id ? 'Actualizar Registro' : 'Completar Registro'}
        </button>
      </div>
    </form>
  );
}
