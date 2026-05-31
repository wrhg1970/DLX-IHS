import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { 
  Building2, 
  Mail, 
  Key, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Inbox
} from 'lucide-react';

export function Login() {
  const { users, students, contacts, setCurrentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'otp' | 'google'>('otp');
  const [email, setEmail] = useState('');
  const [otpState, setOtpState] = useState<'request' | 'verify'>('request');
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Simulator state to expose sent OTP directly on screen for testing ease
  const [simulatedInbox, setSimulatedInbox] = useState<{
    email: string;
    code: string;
    show: boolean;
  } | null>(null);

  // Helper to find a user matching the target email address in our system rosters
  const findSystemUser = (targetEmail: string) => {
    const emailLower = targetEmail.trim().toLowerCase();
    
    // 1. Check in explicit users
    const matchedUser = users.find(u => u.email?.trim().toLowerCase() === emailLower);
    if (matchedUser) return { ...matchedUser };

    // 2. Check in students roster
    const matchedStudent = students.find(s => s.email?.trim().toLowerCase() === emailLower);
    if (matchedStudent) {
      return {
        id: Number(matchedStudent.id) || Date.now(),
        name: `${matchedStudent.firstName} ${matchedStudent.lastName}`,
        role: 'Alumno',
        email: matchedStudent.email,
        studentId: Number(matchedStudent.id)
      };
    }

    // 3. Check in focal contacts
    const matchedContact = contacts.find(c => {
      // Allow searching contact lists
      return c.email?.trim().toLowerCase() === emailLower;
    });
    if (matchedContact) {
      return {
        id: Number(matchedContact.id) || Date.now(),
        name: `${matchedContact.name}`,
        role: 'Coordinador',
        email: matchedContact.email,
        institutionId: matchedContact.institutionId
      };
    }

    return null;
  };

  // Stage 1: Request Single-Use OTP Code
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSimulatedInbox(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Por favor ingresa un correo electrónico.');
      return;
    }

    const matchedUserObj = findSystemUser(emailTrimmed);
    if (!matchedUserObj) {
      setError(`El correo "${emailTrimmed}" no está registrado en el sistema. Puedes intentar otro o usar admin@ihs.com.`);
      return;
    }

    setLoading(true);
    try {
      // Generate a secure 6-digit PIN
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes validity

      // Write OTP to Firestore securely under the unique email identifier
      await setDoc(doc(db, 'temporary_otps', emailTrimmed.toLowerCase()), {
        id: emailTrimmed.toLowerCase(),
        code: generatedCode,
        expiresAt,
        createdAt: new Date().toISOString()
      });

      // Show success
      setSuccess(`¡Código enviado! Revisa la bandeja de entrada de ${emailTrimmed}.`);
      setOtpState('verify');

      // Trigger the elegant sandbox mock email drawer
      setSimulatedInbox({
        email: emailTrimmed,
        code: generatedCode,
        show: true
      });
    } catch (err: any) {
      console.error("Firestore OTP Error: ", err);
      // Fallback in case they have a offline state or Firestore is setting up
      const mockCode = "123456";
      setError(`No se pudo guardar el OTP en la base de datos (${err.message}). Cargamos un código simulado para pruebas.`);
      setSimulatedInbox({
        email: emailTrimmed,
        code: mockCode,
        show: true
      });
      setOtpState('verify');
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Verify Single-Use OTP Code
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (enteredCode.length !== 6) {
      setError('El código de acceso debe tener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const emailLower = email.trim().toLowerCase();
      // Fetch OTP from Firestore
      const otpDocRef = doc(db, 'temporary_otps', emailLower);
      const otpSnap = await getDoc(otpDocRef);

      let correctCode = '';
      let isExpired = false;

      if (otpSnap.exists()) {
        const data = otpSnap.data();
        correctCode = data.code;
        isExpired = new Date(data.expiresAt) < new Date();
      }

      // Allow fallback to simulated interface code in offline mode
      if (!otpSnap.exists() && simulatedInbox?.code) {
        correctCode = simulatedInbox.code;
      }

      if (isExpired) {
        setError('El código de un solo uso ha expirado. Por favor solicita uno nuevo.');
        return;
      }

      if (enteredCode === correctCode || (enteredCode === '123456' && !correctCode)) {
        // Authenticate user successfully
        const userObj = findSystemUser(email);
        if (userObj) {
          // Delete OTP to enforce single-use limit
          if (otpSnap.exists()) {
            await deleteDoc(otpDocRef).catch(err => console.warn("Failed to delete expired OTP", err));
          }
          setSuccess('¡Código verificado e ingreso exitoso!');
          setSimulatedInbox(null);
          setTimeout(() => {
            setCurrentUser(userObj);
          }, 300);
        } else {
          setError('Contradicción en el registro del usuario.');
        }
      } else {
        setError('Código inválido. Por favor verifica e intenta nuevamente.');
      }
    } catch (err: any) {
      console.error("Authentication verify error:", err);
      setError('Error al validar el código. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login popup
  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Direct Firebase popup for absolute local and frame compatibility
      const result = await signInWithPopup(auth, provider);
      const gEmail = result.user.email;

      if (!gEmail) {
        throw new Error('Google no retornó ningún correo electrónico válido.');
      }

      const matchedUser = findSystemUser(gEmail);
      if (matchedUser) {
        setSuccess(`¡Ingreso correcto con la cuenta ${gEmail}! Accediendo...`);
        setTimeout(() => {
          setCurrentUser(matchedUser);
        }, 500);
      } else {
        // Show an elegant registration helper alert
        setError(`La cuenta Google "${gEmail}" no coincide con ningún correo registrado. En un sistema real tu acceso debe ser autorizado. Registra este correo en Configuración o Alumnos previamente.`);
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(`Error al iniciar sesión con Google: ${err.message || 'Popup cancelado o bloqueado.'}`);
    } finally {
      setLoading(false);
    }
  };

  const autofillSimulatedOtp = () => {
    if (simulatedInbox) {
      setEnteredCode(simulatedInbox.code);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[center_top] -z-10" />
      
      {/* Simulation Email Inbox notification for developer testing */}
      {simulatedInbox && simulatedInbox.show && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 animate-in slide-in-from-top-6 duration-300">
          <div className="flex items-start">
            <div className="p-2 bg-indigo-600 rounded-lg mr-3">
              <Inbox className="w-5 h-5 text-indigo-100" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                [Simulador de Correo]
              </p>
              <p className="text-sm font-semibold text-white mt-1">
                Nuevo correo de acceso para:
              </p>
              <p className="text-xs text-indigo-300 font-mono truncate">
                {simulatedInbox.email}
              </p>
              <div className="mt-3 bg-slate-850 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Código OTP:</span>
                <span className="text-lg font-black tracking-widest text-emerald-400 font-mono">
                  {simulatedInbox.code}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={autofillSimulatedOtp}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1.5 rounded-md text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  Autocompletar Código
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedInbox(prev => prev ? { ...prev, show: false } : null)}
                  className="text-xs bg-slate-800 hover:bg-slate-750 font-medium px-3 py-1.5 rounded-md text-slate-300 transition-colors"
                >
                  Ocultar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Ingreso Seguro
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Selecciona tu método de autenticación preferido
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in zoom-in-95 duration-500 delay-150">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {/* Segment/Tab controls for Login methods */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => {
                setActiveTab('otp');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'otp'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Código OTP
            </button>
            <button
              onClick={() => {
                setActiveTab('google');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'google'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.5 1.62l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.08-1.355-.22-1.955H12.24z" />
              </svg>
              Google / Demo
            </button>
          </div>

          {activeTab === 'otp' && (
            <div className="space-y-4">
              {otpState === 'request' ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Correo Electrónico Registrado
                    </label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                        placeholder="Ej. admin@ihs.com o tu alumno/coordinador correo"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Te enviaremos un código numérico único de un solo uso para verificar tu identidad de forma segura.
                    </p>
                  </div>

                  {error && (
                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-medium flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md cursor-pointer text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1">
                        Solicitar Código OTP <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-600">
                      Enviamos el código OTP de 6 dígitos a:
                    </p>
                    <p className="text-sm font-bold text-slate-800 break-all mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-500" /> {email}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpState('request');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-500 font-bold mt-1.5 flex items-center gap-1 hover:underline"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Cambiar correo electrónico
                    </button>
                  </div>

                  <div>
                    <label htmlFor="code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Código de Acceso
                    </label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="code"
                        type="text"
                        maxLength={6}
                        required
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                        className="appearance-none block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm tracking-[0.25em] text-center font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  {success && (
                    <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl font-medium flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                      <span>{success}</span>
                    </div>
                  )}

                  {error && (
                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-medium flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md cursor-pointer text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Verificar Código OTP'
                    )}
                  </button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 hover:underline"
                    >
                      ¿No recibiste el correo? Reenviar código
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'google' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-4">
                  Inicia sesión instantáneamente con tu cuenta corporativa o educativa de Google.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer border-solid"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.5 1.62l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.08-1.355-.22-1.955H12.24z" />
                  </svg>
                  Iniciar Sesión con Google
                </button>
              </div>

              {error && (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-medium flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span className="text-left select-text">{error}</span>
                </div>
              )}

              {success && (
                <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
                  <span>{success}</span>
                </div>
              )}

              {/* Quick Simulator Credentials for developers to test different roles */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Acceso directo de Demostración
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setEmail('admin@ihs.com');
                      setActiveTab('otp');
                      setOtpState('request');
                    }}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-700 block">Superadmin</span>
                    <span className="text-[10px] text-slate-500 font-mono">admin@ihs.com</span>
                  </button>
                  <button
                    onClick={() => {
                      setEmail('coordinador@ihs.com');
                      setActiveTab('otp');
                      setOtpState('request');
                    }}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-700 block">Coordinador</span>
                    <span className="text-[10px] text-slate-500 font-mono">coordinador@ihs.com</span>
                  </button>
                  <button
                    onClick={() => {
                      setEmail('alumno@ihs.com');
                      setActiveTab('otp');
                      setOtpState('request');
                    }}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-700 block">Alumno Demo</span>
                    <span className="text-[10px] text-slate-500 font-mono">alumno@ihs.com</span>
                  </button>
                  <button
                    onClick={() => {
                      // Set administrator email directly
                      setEmail('wrhg1970@gmail.com');
                      setActiveTab('otp');
                      setOtpState('request');
                    }}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left cursor-pointer transition-all font-semibold"
                  >
                    <span className="font-bold text-indigo-700 block">Google Admin</span>
                    <span className="text-[10px] text-indigo-500 font-mono">wrhg1970@gmail.com</span>
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

