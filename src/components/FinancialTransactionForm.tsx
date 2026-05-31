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
    catalogs, providers, students 
  } = useAppContext();

  const [formType, setFormType] = useState<TransactionType>(initialType);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    currency: 'MXN' as CurrencyCode,
    exchangeRate: '18.5',
    categoryId: '',
    subcategory: '',
    paymentMethod: 'Transferencia',
    bankAccountId: '',
    studentId: fixedStudentId?.toString() || '',
    providerId: fixedProviderId?.toString() || '',
    status: 'Aplicado' as 'Aplicado' | 'Pendiente' | 'Pagado' | 'Programado',
    taxId: '',
    attachmentUrl: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormType(initialData.type || initialType);
      setFormData({
        date: initialData.date || new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        amount: initialData.amount ? initialData.amount.toString() : '',
        currency: initialData.currency || 'MXN',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commonFields = {
      date: formData.date,
      description: formData.description,
      amount: Number(formData.amount),
      currency: formData.currency,
      exchangeRate: Number(formData.exchangeRate),
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
      institutionId: fixedInstitutionId ? Number(fixedInstitutionId) : (initialData?.institutionId || undefined),
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
              {students.map(s => (
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
      
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto *</label>
          <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
          <select required value={formData.currency} onChange={e => {
              const newCurr = e.target.value as CurrencyCode;
              setFormData({...formData, currency: newCurr, exchangeRate: newCurr === 'USD' ? '1' : formData.exchangeRate});
            }} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold">
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Tipo de Cambio">Tipo Cambio *</label>
          <input required type="number" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" disabled={formData.currency === 'USD'} />
        </div>
        <div className="flex flex-col justify-end">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Final (USD)</div>
          <div className="font-black text-indigo-600 text-lg">
            ${(formData.currency === 'USD' ? Number(formData.amount || 0) : (Number(formData.exchangeRate) !== 0 ? Number(formData.amount || 0) / Number(formData.exchangeRate) : 0)).toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-4">
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
            <option value="Banorte">Banorte</option>
            <option value="WellsFargo USA">WellsFargo USA</option>
            {catalogs['Cuentas bancarias']?.map(c => (
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

      <div className="pt-4 flex justify-end">
        <button type="submit" className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md ${formType === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}>
          <Save className="w-4 h-4 mr-2 inline-block" />
          {initialData?.id ? 'Actualizar Registro' : 'Completar Registro'}
        </button>
      </div>
    </form>
  );
}
