import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2, Check, Download, PenTool } from 'lucide-react';

interface SignaturePadProps {
  initialImage?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  height?: number;
}

export function SignaturePad({ initialImage, onSave, onClear, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e3a8a'); // Default: Azul notarial
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);

  // Set up canvas with high DPI for crisp strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear and draw baseline
    ctx.clearRect(0, 0, rect.width, height);

    if (initialImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, height);
        setHasDrawn(true);
        // Save initial state
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setStrokeHistory([initialData]);
      };
      img.src = initialImage;
    } else {
      // Save blank state
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setStrokeHistory([initialData]);
    }
  }, [height]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Push new history state
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-15), currentData]);

    // Export current drawing
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleUndo = () => {
    if (strokeHistory.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = strokeHistory.slice(0, -1);
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setStrokeHistory(newHistory);

    if (newHistory.length <= 1) {
      setHasDrawn(false);
      onClear?.();
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    const emptyData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory([emptyData]);
    onClear?.();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'mi-firma-electronica-ihs.png';
    a.click();
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Controles superiores: colores y grosores */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-indigo-600" />
            Tinta:
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Azul Notarial', color: '#1e3a8a' },
              { label: 'Negro Carbón', color: '#0f172a' },
              { label: 'Azul Real', color: '#2563eb' }
            ].map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => setStrokeColor(c.color)}
                title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition transform cursor-pointer ${
                  strokeColor === c.color ? 'scale-115 border-indigo-600 ring-2 ring-indigo-200' : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <span className="text-xs font-bold text-slate-700">Trazo:</span>
          <div className="flex items-center gap-1">
            {[
              { label: 'Fino', width: 1.8 },
              { label: 'Medio', width: 2.8 },
              { label: 'Grueso', width: 4.0 }
            ].map((w) => (
              <button
                key={w.width}
                type="button"
                onClick={() => setStrokeWidth(w.width)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  strokeWidth === w.width
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeHistory.length <= 1}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
            title="Deshacer último trazo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
            title="Borrar lienzo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>

          {hasDrawn && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
              title="Descargar firma transparente"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas interactivo */}
      <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition rounded-2xl bg-white overflow-hidden shadow-xs">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full touch-none cursor-crosshair block"
          style={{ height: `${height}px` }}
        />

        {/* Línea guía de firma con 'X' */}
        <div className="pointer-events-none absolute bottom-5 left-6 right-6 flex items-center text-slate-400 select-none">
          <span className="font-serif font-bold text-sm text-slate-400 mr-2">X</span>
          <div className="flex-1 border-b border-dashed border-slate-300" />
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 ml-3">
            Firme sobre la línea
          </span>
        </div>

        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-350 select-none">
            <span className="text-xs font-medium bg-slate-50/90 px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
              ✍️ Dibuja tu firma aquí con el ratón o en pantalla táctil
            </span>
          </div>
        )}
      </div>

      {hasDrawn && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <Check className="w-3.5 h-3.5" />
            Trazo digital registrado (alta resolución)
          </span>
          <span className="text-slate-400">Se guardará automáticamente como imagen PNG transparente</span>
        </div>
      )}
    </div>
  );
}
