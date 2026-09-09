import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  FileCode, 
  Receipt, 
  UploadCloud, 
  Eye, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  ExternalLink,
  Sparkles,
  Printer,
  Maximize2
} from 'lucide-react';

export interface PaymentAttachmentsData {
  invoicePdfUrl?: string;
  invoicePdfName?: string;
  invoiceXmlUrl?: string;
  invoiceXmlName?: string;
  receiptPdfUrl?: string;
  receiptPdfName?: string;
  attachmentUrl?: string; // Legacy compatibility
}

interface PaymentAttachmentsManagerProps {
  data: PaymentAttachmentsData;
  onChange?: (updated: PaymentAttachmentsData) => void;
  readOnly?: boolean;
  onExtractTaxId?: (taxId: string) => void;
  layout?: 'grid' | 'compact' | 'stacked';
  title?: string;
}

export function downloadAttachment(url?: string, fileName?: string, defaultName = 'documento.pdf') {
  if (!url) return;
  
  try {
    const finalFileName = fileName || defaultName;
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error al descargar archivo:', err);
    window.open(url, '_blank');
  }
}

export function openAttachmentPreview(url?: string, fileName?: string) {
  if (!url) return;
  
  if (url.startsWith('data:')) {
    const win = window.open();
    if (win) {
      if (url.startsWith('data:application/pdf') || url.startsWith('data:image/')) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName || 'Vista previa de archivo'}</title>
              <style>
                body { margin: 0; background-color: #0f172a; display: flex; flex-direction: column; height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
                .toolbar { background: #1e293b; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
                .btn { background: #6366f1; color: white; border: none; padding: 7px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 13px; transition: background 0.2s; }
                .btn:hover { background: #4f46e5; }
                .content { flex: 1; border: none; width: 100%; height: calc(100vh - 55px); background: #334155; }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span style="font-size:14px; font-weight:700;">📄 ${fileName || 'Vista Previa'}</span>
                <a href="${url}" download="${fileName || 'archivo'}" class="btn">Descargar Archivo</a>
              </div>
              <iframe class="content" src="${url}"></iframe>
            </body>
          </html>
        `);
      } else {
        win.location.href = url;
      }
    } else {
      downloadAttachment(url, fileName);
    }
  } else {
    window.open(url, '_blank');
  }
}

export function parseXmlString(xmlText: string) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Look for CFDI UUID / TimbreFiscalDigital
    let uuid = '';
    const timbre = xmlDoc.getElementsByTagName('tfd:TimbreFiscalDigital')[0] || 
                   xmlDoc.getElementsByTagName('TimbreFiscalDigital')[0];
    if (timbre) {
      uuid = timbre.getAttribute('UUID') || timbre.getAttribute('uuid') || '';
    }

    // Emisor / Receptor / Total
    const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] || xmlDoc.getElementsByTagName('Comprobante')[0];
    const emisor = xmlDoc.getElementsByTagName('cfdi:Emisor')[0] || xmlDoc.getElementsByTagName('Emisor')[0];
    const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0] || xmlDoc.getElementsByTagName('Receptor')[0];

    return {
      uuid: uuid || comprobante?.getAttribute('Folio') || '',
      folio: comprobante?.getAttribute('Folio') || '',
      serie: comprobante?.getAttribute('Serie') || '',
      total: comprobante?.getAttribute('Total') || '',
      subTotal: comprobante?.getAttribute('SubTotal') || '',
      fecha: comprobante?.getAttribute('Fecha') || '',
      moneda: comprobante?.getAttribute('Moneda') || '',
      tipoDeComprobante: comprobante?.getAttribute('TipoDeComprobante') || '',
      emisorRfc: emisor?.getAttribute('Rfc') || '',
      emisorNombre: emisor?.getAttribute('Nombre') || '',
      receptorRfc: receptor?.getAttribute('Rfc') || '',
      receptorNombre: receptor?.getAttribute('Nombre') || ''
    };
  } catch {
    return null;
  }
}

/**
 * Universal In-App Document Viewer Modal for PDFs, XMLs and Receipt Images
 */
export function DocumentPreviewModal({
  isOpen,
  onClose,
  title = 'Visor Oficial de Documentos y Facturación',
  initialTab = 'pdf',
  attachments
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialTab?: 'pdf' | 'xml' | 'receipt';
  attachments: PaymentAttachmentsData;
}) {
  const effectiveReceipt = attachments.receiptPdfUrl || attachments.attachmentUrl;
  const effectiveReceiptName = attachments.receiptPdfName || (attachments.attachmentUrl ? attachments.attachmentUrl.split('/').pop() : 'Comprobante.pdf');

  // Determine available tabs
  const availableTabs: ('pdf' | 'xml' | 'receipt')[] = [];
  if (attachments.invoicePdfUrl) availableTabs.push('pdf');
  if (attachments.invoiceXmlUrl) availableTabs.push('xml');
  if (effectiveReceipt) availableTabs.push('receipt');

  const defaultTab = availableTabs.includes(initialTab) 
    ? initialTab 
    : (availableTabs[0] || 'pdf');

  const [activeTab, setActiveTab] = useState<'pdf' | 'xml' | 'receipt'>(defaultTab);
  const [copied, setCopied] = useState(false);
  const [decodedXml, setDecodedXml] = useState<string>('');
  const [parsedXmlInfo, setParsedXmlInfo] = useState<any>(null);

  // Decode XML if available
  useEffect(() => {
    if (attachments.invoiceXmlUrl) {
      try {
        if (attachments.invoiceXmlUrl.startsWith('data:')) {
          const base64Content = attachments.invoiceXmlUrl.split(',')[1];
          const decoded = decodeURIComponent(escape(atob(base64Content)));
          setDecodedXml(decoded);
          setParsedXmlInfo(parseXmlString(decoded));
        } else {
          fetch(attachments.invoiceXmlUrl)
            .then(res => res.text())
            .then(text => {
              setDecodedXml(text);
              setParsedXmlInfo(parseXmlString(text));
            })
            .catch(() => {
              setDecodedXml('');
              setParsedXmlInfo(null);
            });
        }
      } catch {
        setDecodedXml('');
        setParsedXmlInfo(null);
      }
    }
  }, [attachments.invoiceXmlUrl]);

  // Keep active tab in sync when opening
  useEffect(() => {
    if (isOpen) {
      const valid = availableTabs.includes(initialTab) ? initialTab : (availableTabs[0] || 'pdf');
      setActiveTab(valid);
    }
  }, [isOpen, initialTab, attachments.invoicePdfUrl, attachments.invoiceXmlUrl, effectiveReceipt]);

  if (!isOpen) return null;

  const handleCopyXml = () => {
    if (decodedXml) {
      navigator.clipboard.writeText(decodedXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentUrl = activeTab === 'pdf' 
    ? attachments.invoicePdfUrl 
    : activeTab === 'receipt' 
    ? effectiveReceipt 
    : attachments.invoiceXmlUrl;

  const currentFileName = activeTab === 'pdf' 
    ? (attachments.invoicePdfName || 'Factura.pdf')
    : activeTab === 'receipt' 
    ? (effectiveReceiptName || 'Comprobante.pdf')
    : (attachments.invoiceXmlName || 'Factura_CFDI.xml');

  const isImageReceipt = effectiveReceipt && (
    effectiveReceipt.startsWith('data:image/') || 
    /\.(jpg|jpeg|png|webp|gif)$/i.test(effectiveReceiptName || '')
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>{title}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">
                Archivo activo: <span className="font-mono text-indigo-300 font-semibold">{currentFileName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUrl && (
              <button
                type="button"
                onClick={() => downloadAttachment(currentUrl, currentFileName)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-xs"
                title="Descargar archivo"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Descargar</span>
              </button>
            )}

            {currentUrl && (
              <button
                type="button"
                onClick={() => openAttachmentPreview(currentUrl, currentFileName)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer border-0 shadow-xs"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pestaña Nueva</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer border-0 bg-transparent ml-1"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {attachments.invoicePdfUrl && (
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer border-0 ${
                  activeTab === 'pdf'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Factura PDF</span>
              </button>
            )}

            {attachments.invoiceXmlUrl && (
              <button
                type="button"
                onClick={() => setActiveTab('xml')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer border-0 ${
                  activeTab === 'xml'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Factura XML (CFDI)</span>
              </button>
            )}

            {effectiveReceipt && (
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer border-0 ${
                  activeTab === 'receipt'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Comprobante / Recibo</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
            {availableTabs.length} {availableTabs.length === 1 ? 'documento adjunto' : 'documentos adjuntos'}
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70 min-h-[420px] flex flex-col">
          
          {/* TAB 1: PDF FACTURA */}
          {activeTab === 'pdf' && (
            attachments.invoicePdfUrl ? (
              <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-300 shadow-sm bg-slate-800">
                <iframe
                  src={attachments.invoicePdfUrl}
                  title="Factura PDF"
                  className="w-full flex-1 min-h-[520px] border-0"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No hay factura en formato PDF adjuntada</p>
              </div>
            )
          )}

          {/* TAB 2: XML CFDI */}
          {activeTab === 'xml' && (
            attachments.invoiceXmlUrl ? (
              <div className="space-y-4 flex-1 flex flex-col">
                {/* CFDI Summary Card */}
                {parsedXmlInfo && (
                  <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <div>
                      <span className="block text-[9px] font-black uppercase text-amber-700 tracking-wider">Folio Fiscal (UUID)</span>
                      <span className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                        {parsedXmlInfo.uuid || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase text-amber-700 tracking-wider">Total CFDI</span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        ${parsedXmlInfo.total} {parsedXmlInfo.moneda || 'MXN'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase text-amber-700 tracking-wider">Emisor (RFC)</span>
                      <span className="text-xs font-bold text-slate-800 block truncate" title={parsedXmlInfo.emisorNombre}>
                        {parsedXmlInfo.emisorRfc || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {parsedXmlInfo.emisorNombre}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase text-amber-700 tracking-wider">Receptor (RFC)</span>
                      <span className="text-xs font-bold text-slate-800 block truncate" title={parsedXmlInfo.receptorNombre}>
                        {parsedXmlInfo.receptorRfc || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {parsedXmlInfo.receptorNombre}
                      </span>
                    </div>
                  </div>
                )}

                {/* Raw XML Box */}
                <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 text-slate-100 shadow-sm">
                  <div className="px-4 py-2.5 bg-slate-950 flex items-center justify-between border-b border-slate-800 shrink-0">
                    <span className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-amber-400" />
                      Estructura CFDI XML Original
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyXml}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? '¡Copiado!' : 'Copiar XML'}</span>
                    </button>
                  </div>
                  <div className="p-4 overflow-auto max-h-[460px] font-mono text-xs text-amber-300/90 whitespace-pre leading-relaxed select-all">
                    {decodedXml || 'Cargando contenido XML...'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileCode className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No hay factura en formato XML adjuntada</p>
              </div>
            )
          )}

          {/* TAB 3: RECEIPT / COMPROBANTE */}
          {activeTab === 'receipt' && (
            effectiveReceipt ? (
              <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-slate-300 shadow-sm bg-slate-800">
                {isImageReceipt ? (
                  <div className="flex-1 flex items-center justify-center p-4 bg-slate-900/60 min-h-[500px]">
                    <img 
                      src={effectiveReceipt} 
                      alt="Comprobante de pago" 
                      className="max-h-[520px] max-w-full object-contain rounded-xl shadow-2xl border border-slate-700 bg-white"
                    />
                  </div>
                ) : (
                  <iframe
                    src={effectiveReceipt}
                    title="Comprobante de Pago"
                    className="w-full flex-1 min-h-[520px] border-0"
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Receipt className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No hay comprobante de pago adjuntado</p>
              </div>
            )
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            {activeTab === 'pdf' && 'Documento Factura en PDF para validez contable e impresión'}
            {activeTab === 'xml' && 'Archivo CFDI XML con timbre digital del SAT'}
            {activeTab === 'receipt' && 'Comprobante bancario o ficha de depósito adjunta al pago'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer border-0"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

export function PaymentAttachmentsManager({
  data,
  onChange,
  readOnly = false,
  onExtractTaxId,
  layout = 'grid',
  title = 'Documentos y Facturación del Pago'
}: PaymentAttachmentsManagerProps) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; initialTab: 'pdf' | 'xml' | 'receipt' }>({
    isOpen: false,
    initialTab: 'pdf'
  });
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const invoicePdfInputRef = useRef<HTMLInputElement>(null);
  const invoiceXmlInputRef = useRef<HTMLInputElement>(null);
  const receiptPdfInputRef = useRef<HTMLInputElement>(null);

  // Normalize effective receipt file
  const effectiveReceiptUrl = data.receiptPdfUrl || data.attachmentUrl;
  const effectiveReceiptName = data.receiptPdfName || (data.attachmentUrl ? (data.attachmentUrl.split('/').pop() || 'Comprobante_Pago.pdf') : '');

  const handleFileUpload = (type: 'invoicePdf' | 'invoiceXml' | 'receiptPdf', file: File) => {
    if (!file || readOnly || !onChange) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      if (type === 'invoicePdf') {
        onChange({
          ...data,
          invoicePdfUrl: result,
          invoicePdfName: file.name
        });
      } else if (type === 'invoiceXml') {
        // Read text to inspect CFDI data
        const textReader = new FileReader();
        textReader.onload = (te) => {
          const xmlText = te.target?.result as string;
          const parsed = parseXmlString(xmlText);
          if (parsed?.uuid && onExtractTaxId) {
            onExtractTaxId(parsed.uuid);
          }
        };
        textReader.readAsText(file);

        onChange({
          ...data,
          invoiceXmlUrl: result,
          invoiceXmlName: file.name
        });
      } else if (type === 'receiptPdf') {
        onChange({
          ...data,
          receiptPdfUrl: result,
          receiptPdfName: file.name,
          attachmentUrl: file.name // keep legacy synchronized
        });
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type: 'invoicePdf' | 'invoiceXml' | 'receiptPdf') => {
    if (readOnly || !onChange) return;

    if (type === 'invoicePdf') {
      onChange({
        ...data,
        invoicePdfUrl: undefined,
        invoicePdfName: undefined
      });
      if (invoicePdfInputRef.current) invoicePdfInputRef.current.value = '';
    } else if (type === 'invoiceXml') {
      onChange({
        ...data,
        invoiceXmlUrl: undefined,
        invoiceXmlName: undefined
      });
      if (invoiceXmlInputRef.current) invoiceXmlInputRef.current.value = '';
    } else if (type === 'receiptPdf') {
      onChange({
        ...data,
        receiptPdfUrl: undefined,
        receiptPdfName: undefined,
        attachmentUrl: undefined
      });
      if (receiptPdfInputRef.current) receiptPdfInputRef.current.value = '';
    }
  };

  const hasAnyAttachment = !!(data.invoicePdfUrl || data.invoiceXmlUrl || effectiveReceiptUrl);

  return (
    <div className="space-y-3" id="payment-attachments-manager">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">{title}</span>
            {hasAnyAttachment && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Adjuntos cargados
              </span>
            )}
          </div>
          {!readOnly && (
            <span className="text-[10px] text-slate-400 font-medium">Formatos: PDF, XML e Imágenes</span>
          )}
        </div>
      )}

      <div className={
        layout === 'stacked' 
          ? 'space-y-3' 
          : 'grid grid-cols-1 md:grid-cols-3 gap-3'
      }>
        {/* 1. Factura en PDF */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragOverKey('invoicePdf'); }}
          onDragLeave={() => setDragOverKey(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverKey(null);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload('invoicePdf', e.dataTransfer.files[0]);
            }
          }}
          className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
            data.invoicePdfUrl
              ? 'bg-rose-50/40 border-rose-200/80 shadow-xs'
              : dragOverKey === 'invoicePdf'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  data.invoicePdfUrl ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-100 text-rose-700'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 leading-tight">Factura (PDF)</h5>
                  <span className="text-[10px] font-bold text-slate-400 block">Archivo imprimible</span>
                </div>
              </div>

              {data.invoicePdfUrl ? (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  Cargado
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Pendiente
                </span>
              )}
            </div>

            {data.invoicePdfUrl ? (
              <div className="bg-white/80 rounded-xl p-2.5 border border-rose-100/80 my-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={data.invoicePdfName || 'Factura.pdf'}>
                    {data.invoicePdfName || 'Factura_Fiscal.pdf'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 my-2 line-clamp-2">
                {readOnly ? 'Sin factura en PDF adjuntada.' : 'Arrastra aquí la factura oficial en PDF o haz clic para subirla.'}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100">
            {data.invoicePdfUrl ? (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, initialTab: 'pdf' })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Ver en visor integrado"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachment(data.invoicePdfUrl, data.invoicePdfName, 'Factura_Fiscal.pdf')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Descargar archivo"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Bajar</span>
                  </button>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('invoicePdf')}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition border-0 bg-transparent cursor-pointer"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              !readOnly && (
                <>
                  <input
                    ref={invoicePdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload('invoicePdf', e.target.files[0]);
                    }}
                    className="hidden"
                    id="input-factura-pdf"
                  />
                  <button
                    type="button"
                    onClick={() => invoicePdfInputRef.current?.click()}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider rounded-xl transition inline-flex items-center justify-center gap-1.5 border border-rose-200/80 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Adjuntar PDF
                  </button>
                </>
              )
            )}
          </div>
        </div>

        {/* 2. Factura en XML */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragOverKey('invoiceXml'); }}
          onDragLeave={() => setDragOverKey(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverKey(null);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload('invoiceXml', e.dataTransfer.files[0]);
            }
          }}
          className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
            data.invoiceXmlUrl
              ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
              : dragOverKey === 'invoiceXml'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  data.invoiceXmlUrl ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-100 text-amber-700'
                }`}>
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 leading-tight">Factura (XML)</h5>
                  <span className="text-[10px] font-bold text-slate-400 block">Comprobante Fiscal CFDI</span>
                </div>
              </div>

              {data.invoiceXmlUrl ? (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Cargado
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Pendiente
                </span>
              )}
            </div>

            {data.invoiceXmlUrl ? (
              <div className="bg-white/80 rounded-xl p-2.5 border border-amber-100/80 my-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={data.invoiceXmlName || 'Factura.xml'}>
                    {data.invoiceXmlName || 'Factura_CFDI.xml'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 my-2 line-clamp-2">
                {readOnly ? 'Sin archivo XML adjuntado.' : 'Sube el archivo XML (CFDI 4.0/3.3). Permite lectura y extracción del UUID.'}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100">
            {data.invoiceXmlUrl ? (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, initialTab: 'xml' })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Ver contenido XML"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachment(data.invoiceXmlUrl, data.invoiceXmlName, 'Factura_CFDI.xml')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Descargar archivo XML"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Bajar</span>
                  </button>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('invoiceXml')}
                    className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition border-0 bg-transparent cursor-pointer"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              !readOnly && (
                <>
                  <input
                    ref={invoiceXmlInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload('invoiceXml', e.target.files[0]);
                    }}
                    className="hidden"
                    id="input-factura-xml"
                  />
                  <button
                    type="button"
                    onClick={() => invoiceXmlInputRef.current?.click()}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-wider rounded-xl transition inline-flex items-center justify-center gap-1.5 border border-amber-200/80 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Adjuntar XML
                  </button>
                </>
              )
            )}
          </div>
        </div>

        {/* 3. Comprobante de Pago en PDF */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragOverKey('receiptPdf'); }}
          onDragLeave={() => setDragOverKey(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverKey(null);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload('receiptPdf', e.dataTransfer.files[0]);
            }
          }}
          className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
            effectiveReceiptUrl
              ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
              : dragOverKey === 'receiptPdf'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  effectiveReceiptUrl ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 leading-tight">Comprobante de Pago</h5>
                  <span className="text-[10px] font-bold text-slate-400 block">Ficha bancaria o recibo PDF</span>
                </div>
              </div>

              {effectiveReceiptUrl ? (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Cargado
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Pendiente
                </span>
              )}
            </div>

            {effectiveReceiptUrl ? (
              <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100/80 my-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={effectiveReceiptName || 'Comprobante_Pago.pdf'}>
                    {effectiveReceiptName || 'Comprobante_Transferencia.pdf'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 my-2 line-clamp-2">
                {readOnly ? 'Sin comprobante bancario adjuntado.' : 'Sube la ficha de depósito, comprobante SPEI o recibo en PDF o imagen.'}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100">
            {effectiveReceiptUrl ? (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, initialTab: 'receipt' })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Ver comprobante"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachment(effectiveReceiptUrl, effectiveReceiptName, 'Comprobante_Pago.pdf')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition border-0 cursor-pointer"
                    title="Descargar comprobante"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Bajar</span>
                  </button>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('receiptPdf')}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition border-0 bg-transparent cursor-pointer"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              !readOnly && (
                <>
                  <input
                    ref={receiptPdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload('receiptPdf', e.target.files[0]);
                    }}
                    className="hidden"
                    id="input-comprobante-pdf"
                  />
                  <button
                    type="button"
                    onClick={() => receiptPdfInputRef.current?.click()}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition inline-flex items-center justify-center gap-1.5 border border-emerald-200/80 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Adjuntar Comprobante
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Viewer Modal */}
      <DocumentPreviewModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, initialTab: 'pdf' })}
        initialTab={modalState.initialTab}
        attachments={data}
      />
    </div>
  );
}

/**
 * Compact Badges component to show in lists and tables (Historial de pagos)
 * Features direct view modal on click so users can inspect invoices and receipts instantly.
 */
export function PaymentAttachmentsBadges({
  invoicePdfUrl,
  invoicePdfName,
  invoiceXmlUrl,
  invoiceXmlName,
  receiptPdfUrl,
  receiptPdfName,
  attachmentUrl,
  onClick,
  showEmptyState = true
}: {
  invoicePdfUrl?: string;
  invoicePdfName?: string;
  invoiceXmlUrl?: string;
  invoiceXmlName?: string;
  receiptPdfUrl?: string;
  receiptPdfName?: string;
  attachmentUrl?: string;
  onClick?: (e: React.MouseEvent) => void;
  showEmptyState?: boolean;
}) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; tab: 'pdf' | 'xml' | 'receipt' }>({
    isOpen: false,
    tab: 'pdf'
  });

  const effectiveReceipt = receiptPdfUrl || attachmentUrl;
  const hasAny = !!(invoicePdfUrl || invoiceXmlUrl || effectiveReceipt);

  if (!hasAny) {
    if (!showEmptyState) return null;
    return (
      <span className="text-[10px] text-slate-350 italic select-none">Sin adjuntos</span>
    );
  }

  const handleOpenModal = (tab: 'pdf' | 'xml' | 'receipt', e: React.MouseEvent) => {
    e.stopPropagation();
    setModalState({ isOpen: true, tab });
  };

  return (
    <>
      <div 
        className="inline-flex items-center gap-1.5 flex-wrap justify-center" 
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
      >
        {/* FACTURA PDF BADGE */}
        {invoicePdfUrl && (
          <button
            type="button"
            onClick={(e) => handleOpenModal('pdf', e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 hover:bg-rose-100 hover:scale-105 active:scale-95 border border-rose-200/80 transition-all cursor-pointer shadow-2xs group"
            title={`Ver Factura PDF: ${invoicePdfName || 'Factura.pdf'}`}
          >
            <FileText className="w-3 h-3 text-rose-600 shrink-0 group-hover:animate-pulse" />
            <span className="font-extrabold">Factura PDF</span>
          </button>
        )}

        {/* FACTURA XML BADGE */}
        {invoiceXmlUrl && (
          <button
            type="button"
            onClick={(e) => handleOpenModal('xml', e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 hover:bg-amber-100 hover:scale-105 active:scale-95 border border-amber-200/80 transition-all cursor-pointer shadow-2xs group"
            title={`Ver Factura CFDI XML: ${invoiceXmlName || 'Factura.xml'}`}
          >
            <FileCode className="w-3 h-3 text-amber-600 shrink-0 group-hover:animate-pulse" />
            <span className="font-extrabold">XML CFDI</span>
          </button>
        )}

        {/* COMPROBANTE DE PAGO BADGE */}
        {effectiveReceipt && (
          <button
            type="button"
            onClick={(e) => handleOpenModal('receipt', e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:scale-105 active:scale-95 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs group"
            title={`Ver Comprobante: ${receiptPdfName || attachmentUrl || 'Comprobante.pdf'}`}
          >
            <Receipt className="w-3 h-3 text-emerald-600 shrink-0 group-hover:animate-pulse" />
            <span className="font-extrabold">Comprobante</span>
          </button>
        )}
      </div>

      {/* Embedded Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, tab: 'pdf' })}
        initialTab={modalState.tab}
        attachments={{
          invoicePdfUrl,
          invoicePdfName,
          invoiceXmlUrl,
          invoiceXmlName,
          receiptPdfUrl: effectiveReceipt,
          receiptPdfName: receiptPdfName || (attachmentUrl ? attachmentUrl.split('/').pop() : 'Comprobante.pdf'),
          attachmentUrl
        }}
      />
    </>
  );
}
