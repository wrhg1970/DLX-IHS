import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Trash2 } from "lucide-react";
import { pruneLocalStorageBloat } from "../../utils/storage";

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isQuotaError: false
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isQuota = 
      error?.name === 'QuotaExceededError' ||
      (typeof error?.message === 'string' && 
        (error.message.toLowerCase().includes('quota') || error.message.includes('setItem')));
    return { hasError: true, error, errorInfo: null, isQuotaError: isQuota };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    const isQuota = 
      error?.name === 'QuotaExceededError' ||
      (typeof error?.message === 'string' && 
        (error.message.toLowerCase().includes('quota') || error.message.includes('setItem')));
    
    if (isQuota) {
      pruneLocalStorageBloat();
    }

    this.setState({ errorInfo, isQuotaError: isQuota });
  }

  private handleReset = () => {
    if (this.state.isQuotaError) {
      pruneLocalStorageBloat();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleCleanAndRecover = () => {
    pruneLocalStorageBloat();
    this.setState({ hasError: false, error: null, errorInfo: null, isQuotaError: false });
  };

  private handleGoHome = () => {
    if (this.state.isQuotaError) {
      pruneLocalStorageBloat();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800">
                {this.state.isQuotaError ? "Límite de Almacenamiento Local" : "Se detectó una incidencia"}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {this.state.isQuotaError 
                  ? "El navegador llenó su cuota de almacenamiento temporal con documentos previos. Se ha activado la auto-reparación para liberar memoria."
                  : "El sistema encontró una excepción en la vista. Toda la información sincronizada permanece a salvo."}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <p className="text-[11px] font-mono text-rose-600 font-semibold break-words">
                  {this.state.error.message || "Error desconocido"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {this.state.isQuotaError ? (
                <button
                  type="button"
                  onClick={this.handleCleanAndRecover}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Liberar y Continuar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              )}
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
