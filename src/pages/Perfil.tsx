import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SignaturePad } from '../components/SignaturePad';
import { sendRealNotificationEmail } from '../utils/notifications';
import { 
  User, 
  Mail, 
  Shield, 
  Save, 
  PenTool, 
  Phone, 
  Building, 
  Briefcase, 
  Globe, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Type, 
  Eye, 
  Send, 
  CreditCard, 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  Check, 
  Camera, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Award,
  Hash
} from 'lucide-react';

export function Perfil() {
  const { currentUser, updateUser, setCurrentUser } = useAppContext();
  
  // Active Tab: 'info' | 'signature' | 'security' | 'banking'
  const [activeTab, setActiveTab] = useState<'info' | 'signature' | 'security' | 'banking'>('info');

  // Form states for Personal / Professional Info
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    title: currentUser?.title || '',
    department: currentUser?.department || '',
    phone: currentUser?.phone || '',
    rfc: currentUser?.rfc || '',
    address: currentUser?.address || '',
    bio: currentUser?.bio || '',
    avatarUrl: currentUser?.avatarUrl || '',
  });

  // Form states for Electronic Signature
  const [signatureData, setSignatureData] = useState({
    includeSignatureInEmails: currentUser?.includeSignatureInEmails !== false,
    signatureType: currentUser?.signatureType || ('drawn' as 'drawn' | 'typed' | 'image'),
    signatureImage: currentUser?.signatureImage || '',
    signatureText: currentUser?.signatureText || currentUser?.name || '',
    signatureFont: currentUser?.signatureFont || 'Dancing Script',
    signaturePhone: currentUser?.signaturePhone || currentUser?.phone || '',
    signatureWebsite: currentUser?.signatureWebsite || 'www.ihs-edu.com',
    signatureDisclaimer: currentUser?.signatureDisclaimer || 
      'AVISO DE CONFIDENCIALIDAD: Este mensaje y cualquier archivo anexo son para uso exclusivo del destinatario y pueden contener información confidencial o privilegiada. Si usted no es el destinatario indicado, queda estrictamente prohibida su copia, distribución o uso indebido. Por favor notifique al remitente y elimine el mensaje de inmediato.',
  });

  // Calligraphic typed signature state
  const [typedPenColor, setTypedPenColor] = useState('#1e3a8a');

  // Security password state
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // New Bank Account Modal/Form state
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountNumber: '',
    clabe: '',
    beneficiary: currentUser?.name || '',
    type: 'Débito / Nómina' as 'Débito / Nómina' | 'Cheques' | 'Fiscal',
  });
  const [showAddBank, setShowAddBank] = useState(false);

  // Notification / Test email states
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);

  // Sync state if currentUser changes from outside
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        title: currentUser.title || '',
        department: currentUser.department || '',
        phone: currentUser.phone || '',
        rfc: currentUser.rfc || '',
        address: currentUser.address || '',
        bio: currentUser.bio || '',
        avatarUrl: currentUser.avatarUrl || '',
      });
      setSignatureData({
        includeSignatureInEmails: currentUser.includeSignatureInEmails !== false,
        signatureType: currentUser.signatureType || 'drawn',
        signatureImage: currentUser.signatureImage || '',
        signatureText: currentUser.signatureText || currentUser.name || '',
        signatureFont: currentUser.signatureFont || 'Dancing Script',
        signaturePhone: currentUser.signaturePhone || currentUser.phone || '',
        signatureWebsite: currentUser.signatureWebsite || 'www.ihs-edu.com',
        signatureDisclaimer: currentUser.signatureDisclaimer || 
          'AVISO DE CONFIDENCIALIDAD: Este mensaje y cualquier archivo anexo son para uso exclusivo del destinatario y pueden contener información confidencial o privilegiada. Si usted no es el destinatario indicado, queda estrictamente prohibida su copia, distribución o uso indebido. Por favor notifique al remitente y elimine el mensaje de inmediato.',
      });
    }
  }, [currentUser?.id]);

  if (!currentUser) return null;

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let score = 0;
    if (formData.name) score += 20;
    if (formData.email) score += 15;
    if (formData.title) score += 15;
    if (formData.department) score += 10;
    if (formData.phone) score += 10;
    if (signatureData.signatureImage || signatureData.signatureText) score += 20;
    if (formData.avatarUrl) score += 10;
    return Math.min(score, 100);
  };
  const completionPercentage = calculateCompletion();

  // Handle saving personal info
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, formData);
    showFeedback('Información de perfil actualizada con éxito.');
  };

  // Handle saving signature configuration
  const handleSaveSignature = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // If typed signature is selected but signatureImage is empty or needs regenerating
    let finalImage = signatureData.signatureImage;
    if (signatureData.signatureType === 'typed') {
      finalImage = generateCalligraphicCanvas(signatureData.signatureText || formData.name, signatureData.signatureFont, typedPenColor);
    }

    const payload = {
      ...signatureData,
      signatureImage: finalImage,
    };

    updateUser(currentUser.id, payload);
    setSignatureData(prev => ({ ...prev, signatureImage: finalImage }));
    showFeedback('Configuración de firma electrónica guardada correctamente. Se incluirá en los correos que envíes.');
  };

  // Helper to generate a transparent calligraphic PNG from text and font
  const generateCalligraphicCanvas = (text: string, fontName: string, color: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `italic 56px "${fontName}", cursive, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || currentUser.name, 325, 80);
    return canvas.toDataURL('image/png');
  };

  const applyTypedSignature = (font: string) => {
    setSignatureData(prev => {
      const img = generateCalligraphicCanvas(prev.signatureText || formData.name, font, typedPenColor);
      return {
        ...prev,
        signatureFont: font,
        signatureType: 'typed',
        signatureImage: img
      };
    });
  };

  // Handle image upload from file picker
  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setSignatureData(prev => ({
          ...prev,
          signatureType: 'image',
          signatureImage: reader.result as string
        }));
        showFeedback('Imagen de firma cargada. Haz clic en "Guardar Firma" para confirmar.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
        updateUser(currentUser.id, { avatarUrl: reader.result as string });
        showFeedback('Foto de perfil actualizada con éxito.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle password change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordState.newPassword) {
      setPasswordError('Ingresa la nueva contraseña.');
      return;
    }
    if (passwordState.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    updateUser(currentUser.id, { 
      password: passwordState.newPassword,
      requirePasswordChange: false 
    });

    setPasswordSuccess('Contraseña actualizada con éxito.');
    setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // Handle adding bank account
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.bankName || !newBank.clabe) return;

    const newAccount = {
      id: `bank_${Date.now()}`,
      bankName: newBank.bankName,
      accountNo: newBank.accountNumber || newBank.clabe.slice(-4),
      clabe: newBank.clabe,
      currency: 'MXN',
      beneficiary: newBank.beneficiary || currentUser.name,
      type: newBank.type
    };

    const updatedAccounts = [...(currentUser.bankAccounts || []), newAccount];
    updateUser(currentUser.id, { bankAccounts: updatedAccounts });
    setNewBank({
      bankName: '',
      accountNumber: '',
      clabe: '',
      beneficiary: currentUser.name,
      type: 'Débito / Nómina'
    });
    setShowAddBank(false);
    showFeedback('Cuenta bancaria agregada exitosamente.');
  };

  const handleRemoveBankAccount = (accountId: string) => {
    const updated = (currentUser.bankAccounts || []).filter(a => a.id !== accountId);
    updateUser(currentUser.id, { bankAccounts: updated });
    showFeedback('Cuenta bancaria eliminada.');
  };

  // Test Email with Signature
  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailResult(null);

    const testSignature = {
      enabled: signatureData.includeSignatureInEmails,
      name: formData.name || currentUser.name,
      title: formData.title || 'Director / Coordinador',
      department: formData.department || 'Dirección de Admisiones',
      phone: signatureData.signaturePhone || formData.phone,
      email: formData.email || currentUser.email,
      website: signatureData.signatureWebsite,
      signatureImage: signatureData.signatureImage,
      signatureType: signatureData.signatureType,
      signatureText: signatureData.signatureText || formData.name,
      signatureFont: signatureData.signatureFont,
      disclaimer: signatureData.signatureDisclaimer
    };

    const res = await sendRealNotificationEmail(
      formData.email || currentUser.email,
      formData.name || currentUser.name,
      `Prueba de Firma Electrónica - ${formData.name}`,
      `Estimado(a) ${formData.name},\n\nEste es un correo de comprobación emitido desde el Sistema de Gestión IHS.\n\nEl propósito de este mensaje es verificar cómo se renderiza tu firma electrónica oficial en los correos enviados desde la plataforma a colegios, alumnos y prospectos.\n\nA continuación se muestra tu rúbrica digital y datos de contacto oficiales.\n\nSaludos cordiales,`,
      true,
      testSignature
    );

    setIsSendingTestEmail(false);
    if (res.success) {
      setTestEmailResult({
        success: true,
        message: res.simulated
          ? `[Simulación exitosa] Correo de prueba con tu firma generado para <${formData.email}>. (Configura SMTP en Ajustes para entrega directa a tu bandeja).`
          : `¡Correo de prueba enviado con éxito a <${formData.email}>! Revisa tu bandeja de entrada.`
      });
    } else {
      setTestEmailResult({
        success: false,
        message: res.error || 'No se pudo enviar el correo de prueba.'
      });
    }
  };

  const showFeedback = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 pb-16 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Perfil de Usuario & Credenciales
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Cuenta Activa
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Mi Perfil y Firma Electrónica
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl mt-1">
                Administra tu identidad digital institucional, configura tu firma electrónica para correos del CRM y gestiona tu información de contacto.
              </p>
            </div>

            {/* Quick Completion Gauge */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 min-w-[220px]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200">Completitud del Perfil</span>
                <span className="font-mono font-extrabold text-indigo-300">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
                <span>{signatureData.signatureImage ? '✓ Firma configurada' : 'Firma pendiente'}</span>
                <span>{formData.title ? '✓ Cargo registrado' : 'Cargo pendiente'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative">
        {/* Profile Card Header with Avatar & Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center text-2xl font-black shadow-md border-4 border-white cursor-pointer overflow-hidden transition group-hover:opacity-90"
                  title="Haz clic para cambiar tu foto de perfil"
                >
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt={formData.name} className="w-full h-full object-cover" />
                  ) : (
                    formData.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 text-white rounded-lg shadow border-2 border-white hover:bg-indigo-700 transition cursor-pointer"
                  title="Subir foto de perfil"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900">{formData.name}</h2>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-extrabold uppercase">
                    {currentUser.role}
                  </span>
                  {signatureData.includeSignatureInEmails && signatureData.signatureImage && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Firma Activa en Correos
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {formData.email}
                  </span>
                  {formData.title && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {formData.title}
                    </span>
                  )}
                  {formData.department && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {formData.department}
                    </span>
                  )}
                  {formData.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {formData.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('signature')}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                <span>Configurar Firma</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center space-x-2 border-t border-slate-100 mt-6 pt-4 overflow-x-auto hide-scrollbar">
            {[
              { id: 'info', label: 'Información Personal', icon: User },
              { id: 'signature', label: 'Firma Electrónica para Correos', icon: PenTool, badge: signatureData.signatureImage ? '✓' : 'Pendiente' },
              { id: 'security', label: 'Seguridad & Contraseña', icon: Shield },
              { id: 'banking', label: 'Cuentas & Datos Bancarios', icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      tab.badge === '✓' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Success Notification */}
        {successNotice && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: INFORMACIÓN PERSONAL & PROFESIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Datos Personales e Institucionales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta información aparece en tus documentos generados, propuestas escolares y cotizaciones oficiales.
              </p>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="Ej. Dr. Alejandro Morales Guzmán"
                    />
                  </div>
                </div>

                {/* Correo Electrónico Institucional */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 bg-slate-50 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" /> Por seguridad, contacta al Administrador Principal para cambiar tu correo.
                  </p>
                </div>

                {/* Cargo / Puesto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cargo o Puesto Institucional
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="Ej. Director de Admisiones y Convenios"
                    />
                  </div>
                </div>

                {/* Departamento / Área */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Departamento o Área
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="Ej. Relaciones Internacionales / Académico"
                    />
                  </div>
                </div>

                {/* Teléfono / WhatsApp Directo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Teléfono Celular / WhatsApp Directo
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="Ej. +52 55 1234 5678"
                    />
                  </div>
                </div>

                {/* RFC / Cédula Fiscal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    RFC o Identificación Fiscal
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 uppercase focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      placeholder="Ej. MOGA850312XX1"
                    />
                  </div>
                </div>
              </div>

              {/* Sede / Dirección */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dirección o Campus Asignado
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="Ej. Campus Central - Ciudad de México"
                />
              </div>

              {/* Biografía / Presentación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Biografía o Resumen Profesional
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="Describe brevemente tu trayectoria, área de especialidad y rol en el programa de Bachillerato Dual..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Los cambios se guardan de forma inmediata en tu sesión y en la base institucional.
                </span>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Información</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FIRMA ELECTRÓNICA PARA CORREOS */}
        {/* ========================================================================= */}
        {activeTab === 'signature' && (
          <div className="space-y-6">
            {/* Banner de Introducción y Master Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <PenTool className="w-5 h-5" />
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Firma Electrónica Institucional para Correos
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    Personaliza la rúbrica y sello digital que acompañará todos los correos enviados desde el CRM,
                    comunicados oficiales a directivos, envío de propuestas académicas y notificaciones a padres de familia.
                  </p>
                </div>

                {/* Master Switch */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">
                      Adjuntar firma en correos
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {signatureData.includeSignatureInEmails ? 'Activada en todos los envíos' : 'Desactivada temporalmente'}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signatureData.includeSignatureInEmails}
                      onChange={(e) => {
                        const updated = e.target.checked;
                        setSignatureData(prev => ({ ...prev, includeSignatureInEmails: updated }));
                        updateUser(currentUser.id, { includeSignatureInEmails: updated });
                        showFeedback(updated ? 'Firma activada para envíos de correo.' : 'Firma desactivada.');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Selector de Método de Creación de Firma */}
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  1. Selecciona cómo deseas crear o actualizar tu firma digital:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'drawn', label: 'Dibujar a Mano Alzada', desc: 'Con el ratón o pantalla táctil', icon: PenTool },
                    { id: 'typed', label: 'Firma Tipográfica Estilizada', desc: 'Estilos caligráficos elegantes', icon: Type },
                    { id: 'image', label: 'Subir Imagen o Sello Digital', desc: 'Archivo PNG transparente o JPG', icon: UploadCloud },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = signatureData.signatureType === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setSignatureData(prev => ({ ...prev, signatureType: method.id as any }));
                          if (method.id === 'typed') {
                            applyTypedSignature(signatureData.signatureFont);
                          }
                        }}
                        className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-100 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{method.label}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{method.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área de Entrada del Método Seleccionado */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                {/* MODO 1: DIBUJAR A MANO ALZADA */}
                {signatureData.signatureType === 'drawn' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-indigo-600" />
                        Lienzo Digital Interactivo
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Dibuja tu trazo personal con precisión notarial
                      </span>
                    </div>

                    <SignaturePad
                      initialImage={signatureData.signatureImage}
                      onSave={(dataUrl) => {
                        setSignatureData(prev => ({ ...prev, signatureImage: dataUrl }));
                      }}
                      onClear={() => {
                        setSignatureData(prev => ({ ...prev, signatureImage: '' }));
                      }}
                      height={200}
                    />
                  </div>
                )}

                {/* MODO 2: TIPOGRÁFICA ESTILIZADA */}
                {signatureData.signatureType === 'typed' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Texto o Nombre para la Rúbrica
                        </label>
                        <input
                          type="text"
                          value={signatureData.signatureText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSignatureData(prev => {
                              const img = generateCalligraphicCanvas(val, prev.signatureFont, typedPenColor);
                              return { ...prev, signatureText: val, signatureImage: img };
                            });
                          }}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                          placeholder="Ej. Dr. Alejandro Morales G."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Color de Tinta Caligráfica
                        </label>
                        <div className="flex items-center gap-3 pt-1">
                          {[
                            { label: 'Azul Notarial', color: '#1e3a8a' },
                            { label: 'Negro Carbón', color: '#0f172a' },
                            { label: 'Azul Real', color: '#2563eb' },
                            { label: 'Vino Notarial', color: '#831843' }
                          ].map(c => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => {
                                setTypedPenColor(c.color);
                                const img = generateCalligraphicCanvas(signatureData.signatureText, signatureData.signatureFont, c.color);
                                setSignatureData(prev => ({ ...prev, signatureImage: img }));
                              }}
                              className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                                typedPenColor === c.color ? 'ring-2 ring-indigo-300 scale-110 border-white' : 'border-slate-200'
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Selecciona un Estilo Caligráfico:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { name: 'Dancing Script', label: 'Cursiva Dinámica', sampleFont: 'Dancing Script' },
                          { name: 'Great Vibes', label: 'Caligrafía Clásica', sampleFont: 'Great Vibes' },
                          { name: 'Playfair Display', label: 'Elegancia Formal', sampleFont: 'Playfair Display' },
                        ].map(f => {
                          const isCurrent = signatureData.signatureFont === f.name;
                          return (
                            <div
                              key={f.name}
                              onClick={() => applyTypedSignature(f.name)}
                              className={`p-4 border rounded-2xl cursor-pointer transition text-center ${
                                isCurrent 
                                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100' 
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <p 
                                className="text-2xl text-slate-800 py-3 truncate"
                                style={{ fontFamily: `"${f.sampleFont}", cursive, serif`, fontStyle: 'italic', color: typedPenColor }}
                              >
                                {signatureData.signatureText || formData.name}
                              </p>
                              <span className="text-[11px] font-bold text-slate-500 block border-t border-slate-100 pt-2">
                                {f.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* MODO 3: SUBIR IMAGEN O SELLO */}
                {signatureData.signatureType === 'image' && (
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={imageUploadRef}
                      onChange={handleSignatureImageUpload}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    <div
                      onClick={() => imageUploadRef.current?.click()}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">
                        Haz clic para seleccionar tu firma escaneada o sello
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md">
                        Recomendamos un archivo PNG con fondo transparente o JPG de alta resolución (máx. 5MB).
                      </p>
                    </div>

                    {signatureData.signatureImage && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-white border border-slate-200 rounded-xl max-w-[180px] max-h-[80px] overflow-hidden flex items-center justify-center">
                            <img 
                              src={signatureData.signatureImage} 
                              alt="Firma cargada" 
                              className="max-h-16 max-w-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Archivo de firma digital cargado</p>
                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3" /> Listo para incrustar en correos
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSignatureData(prev => ({ ...prev, signatureImage: '' }))}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Configuración de Datos Institucionales de la Firma y Leyenda Legal */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  2. Datos Complementarios del Pie de Firma y Cláusula Legal
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Estos datos acompañan a la rúbrica para conformar el bloque de firma institucional certificado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Teléfono Directo para la Firma
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={signatureData.signaturePhone}
                      onChange={(e) => setSignatureData({ ...signatureData, signaturePhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="Ej. +52 55 1234 5678 ext. 102"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sitio Web Institucional
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={signatureData.signatureWebsite}
                      onChange={(e) => setSignatureData({ ...signatureData, signatureWebsite: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="Ej. www.ihs-edu.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cláusula de Confidencialidad y Descargo de Responsabilidad (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSignatureData(prev => ({
                      ...prev,
                      signatureDisclaimer: 'AVISO DE CONFIDENCIALIDAD: Este mensaje y cualquier archivo anexo son para uso exclusivo del destinatario y pueden contener información confidencial o privilegiada. Si usted no es el destinatario indicado, queda estrictamente prohibida su copia, distribución o uso indebido. Por favor notifique al remitente y elimine el mensaje de inmediato.'
                    }))}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                  >
                    Restaurar texto estándar
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={signatureData.signatureDisclaimer}
                  onChange={(e) => setSignatureData({ ...signatureData, signatureDisclaimer: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  placeholder="Texto legal que se insertará al calce del correo..."
                />
              </div>

              {/* Botón de Guardar Firma */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSignature()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Aplicar Firma</span>
                </button>
              </div>
            </div>

            {/* VISTA PREVIA EN VIVO (Simulador de Correo Saliente) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    Vista Previa en Vivo: ¿Cómo verá el destinatario tu correo?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Así se presentará tu firma al final de cada mensaje enviado a directivos, alumnos o contactos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Enviar un correo de prueba a tu dirección"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isSendingTestEmail ? 'Enviando prueba...' : 'Enviar Correo de Prueba con mi Firma'}</span>
                </button>
              </div>

              {testEmailResult && (
                <div className={`mb-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  testEmailResult.success 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{testEmailResult.message}</span>
                </div>
              )}

              {/* Ventana Simulada de Correo (Gmail / Outlook Style) */}
              <div className="border border-slate-250 rounded-2xl overflow-hidden bg-slate-50 shadow-xs">
                {/* Cabecera del correo */}
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-500 w-16">De:</span>
                    <span className="font-semibold text-slate-800">{formData.name} &lt;{formData.email}&gt;</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-500 w-16">Para:</span>
                    <span className="text-slate-600">Director General &lt;director@colegio-asociado.edu&gt;</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-500 w-16">Asunto:</span>
                    <span className="font-bold text-slate-900">Propuesta Oficial de Bachillerato Dual IHS</span>
                  </div>
                </div>

                {/* Cuerpo del correo */}
                <div className="p-6 bg-white space-y-4">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Estimado Consejo Directivo,
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Agradecemos su interés en el programa de doble titulación oficial internacional. Adjunto a este mensaje encontrarán el convenio de colaboración y el folleto informativo detallado para su institución.
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Quedo a su entera disposición para agendar la sesión informativa.
                  </p>

                  {/* BLOQUE DE FIRMA ELECTRONICA */}
                  {signatureData.includeSignatureInEmails ? (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      {/* Rúbrica o Trazo */}
                      {signatureData.signatureImage ? (
                        <div className="mb-3">
                          <img
                            src={signatureData.signatureImage}
                            alt="Firma Digital"
                            className="max-h-16 max-w-[220px] object-contain block"
                          />
                        </div>
                      ) : signatureData.signatureText ? (
                        <div 
                          className="text-2xl mb-3 text-indigo-950 italic font-semibold"
                          style={{ fontFamily: `"${signatureData.signatureFont}", cursive, serif` }}
                        >
                          {signatureData.signatureText}
                        </div>
                      ) : null}

                      {/* Tarjeta de Contacto con Barra Lateral */}
                      <div className="flex items-start space-x-3">
                        <div className="w-1 self-stretch bg-indigo-600 rounded-full shrink-0" />
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {formData.name}
                          </h4>
                          {(formData.title || formData.department) && (
                            <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                              {formData.title}
                              {formData.department && <span className="text-slate-400 font-normal"> • {formData.department}</span>}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                            <span>✉️ {formData.email}</span>
                            {(signatureData.signaturePhone || formData.phone) && (
                              <span>📞 {signatureData.signaturePhone || formData.phone}</span>
                            )}
                            {signatureData.signatureWebsite && (
                              <span>🌐 {signatureData.signatureWebsite}</span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Firma Electrónica Verificada por Plataforma IHS
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cláusula de Confidencialidad */}
                      {signatureData.signatureDisclaimer && (
                        <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] text-slate-400 italic leading-relaxed">
                          🔒 <strong>Confidencialidad:</strong> {signatureData.signatureDisclaimer}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Has desactivado el adjunto de firma. Los correos se enviarán con el remitente plano sin rúbrica.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SEGURIDAD Y CONTRASEÑA */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  Seguridad de la Cuenta y Cambio de Contraseña
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Protege tu acceso al sistema y mantén tus credenciales seguras.
                </p>
              </div>

              {passwordSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordState.currentPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordState.newPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordState.confirmPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Actualizar Contraseña</span>
                </button>
              </form>
            </div>

            {/* Auditoría de Acceso y Sesión */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Auditoría y Sesión Actual
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold">Rol Asignado</span>
                  <span className="font-extrabold text-slate-900 text-sm">{currentUser.role}</span>
                  <p className="text-[10px] text-slate-500 mt-1">Permisos completos de plataforma</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold">Último Inicio de Sesión</span>
                  <span className="font-bold text-slate-900 text-sm">Hoy, en sesión activa</span>
                  <p className="text-[10px] text-slate-500 mt-1">Conexión cifrada vía HTTPS</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block mb-1 font-semibold">Dispositivo Conectado</span>
                  <span className="font-bold text-slate-900 text-sm">Navegador Web Actual</span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> En línea
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CUENTAS BANCARIAS & COMISIONES */}
        {/* ========================================================================= */}
        {activeTab === 'banking' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    Cuentas Bancarias Registradas
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Cuentas para la dispersión de honorarios, viáticos de representación o comisiones de matrícula.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddBank(!showAddBank)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Cuenta</span>
                </button>
              </div>

              {/* Formulario para agregar cuenta bancaria */}
              {showAddBank && (
                <form onSubmit={handleAddBankAccount} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 space-y-4 animate-in fade-in">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Nueva Cuenta Bancaria
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Institución Bancaria *</label>
                      <input
                        type="text"
                        value={newBank.bankName}
                        onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white outline-none focus:border-indigo-600"
                        placeholder="Ej. BBVA, Santander, Banorte..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CLABE Interbancaria (18 dígitos) *</label>
                      <input
                        type="text"
                        maxLength={18}
                        value={newBank.clabe}
                        onChange={(e) => setNewBank({ ...newBank, clabe: e.target.value.replace(/\D/g, '') })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold bg-white outline-none focus:border-indigo-600"
                        placeholder="18 dígitos numéricos"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Titular</label>
                      <input
                        type="text"
                        value={newBank.beneficiary}
                        onChange={(e) => setNewBank({ ...newBank, beneficiary: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                      <select
                        value={newBank.type}
                        onChange={(e) => setNewBank({ ...newBank, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white outline-none focus:border-indigo-600"
                      >
                        <option value="Débito / Nómina">Débito / Nómina</option>
                        <option value="Cheques">Cheques</option>
                        <option value="Fiscal">Fiscal</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBank(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 cursor-pointer"
                    >
                      Guardar Cuenta
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de cuentas existentes */}
              {currentUser.bankAccounts && currentUser.bankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentUser.bankAccounts.map((account) => (
                    <div key={account.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{account.bankName}</h4>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                            {account.type || 'Débito'}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                          CLABE: {account.clabe}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Titular: {account.beneficiary || currentUser.name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBankAccount(account.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No hay cuentas bancarias registradas</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Agrega una cuenta para recepción de pagos o viáticos institucionales.</p>
                </div>
              )}
            </div>

            {/* Comisiones Asignadas (si las tiene) */}
            {currentUser.extraCommissions && currentUser.extraCommissions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Esquema de Comisiones Especiales
                </h3>
                <div className="space-y-2">
                  {currentUser.extraCommissions.map((c, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{c.concept}</span>
                      <span className="font-mono font-extrabold text-emerald-700">
                        {c.type === 'percentage' ? `${c.value}%` : `$${c.value.toLocaleString()} USD`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
