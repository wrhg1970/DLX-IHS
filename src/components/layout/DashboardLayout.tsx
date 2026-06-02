import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState, useEffect } from "react";
import { Database } from "lucide-react";

export function DashboardLayout() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined' && (window as any).__firestore_quota_exceeded__) {
      setQuotaExceeded(true);
    }

    const handleQuota = () => {
      setQuotaExceeded(true);
    };

    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuota);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {quotaExceeded && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md relative z-50 animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 animate-pulse text-amber-100" />
              <span>
                <strong>Modo Offline Temporal Activo:</strong> El servidor de base de datos Firebase ha agotado su cuota gratuita de escritura diaria. Toda tu información se está guardando localmente en tu navegador de forma segura. ¡Puedes seguir operando con normalidad!
              </span>
            </div>
            <button 
              onClick={() => setQuotaExceeded(false)}
              className="text-white hover:text-amber-100 font-extrabold focus:outline-none transition-colors px-2"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}
        <Header />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
