import React, { useEffect } from 'react';

export interface MensajeAlerta {
  tipo: 'ok' | 'err';
  texto: string;
}

interface ToastNotificationProps {
  mensaje: MensajeAlerta | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ mensaje, onClose }) => {
  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [mensaje, onClose]);

  if (!mensaje) return null;

  const isOk = mensaje.tipo === 'ok';

  return (
    <>
      {/* 1. Notificación Flotante (Siempre visible aunque el usuario haya hecho scroll abajo) */}
      <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-bounce-once print:hidden">
        <div
          className={`p-4 rounded-xl shadow-2xl border-l-4 flex items-start gap-3 ${
            isOk
              ? 'bg-emerald-700 border-emerald-300 text-white'
              : 'bg-red-700 border-red-300 text-white'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {isOk ? (
              <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-extrabold uppercase tracking-wider opacity-90">
              {isOk ? 'Operación Exitosa' : 'Error / Atención'}
            </div>
            <div className="text-sm font-semibold mt-0.5 leading-snug">
              {mensaje.texto}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-black/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Banner Integrado en la Página */}
      <div
        className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm print:hidden ${
          isOk
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-red-50 border-red-300 text-red-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOk ? (
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{mensaje.texto}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold underline ml-4 cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </>
  );
};
