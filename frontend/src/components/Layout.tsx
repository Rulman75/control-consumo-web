import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { APP_VERSION, GIT_HASH } from '../version';

interface LayoutProps {
  username: string;
  role: string;
  roleLabel: string;
  sector: string;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ username, role, roleLabel, sector, onLogout }) => {
  const [mostrarCambioClave, setMostrarCambioClave] = React.useState(false);
  const [esCambioObligatorio, setEsCambioObligatorio] = React.useState(false);
  const [claveActual, setClaveActual] = React.useState('');
  const [claveNueva, setClaveNueva] = React.useState('');
  const [claveConfirmar, setClaveConfirmar] = React.useState('');
  const [msgCambioClave, setMsgCambioClave] = React.useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [guardandoClave, setGuardandoClave] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.status === 'ok' && d.user?.debeCambiarClave) {
          setEsCambioObligatorio(true);
          setMostrarCambioClave(true);
        }
      })
      .catch(() => {});
  }, [username]);

  const esAdmin = String(role || 'A').trim().toUpperCase() === 'A' || ['rc', 'consumo'].includes(String(username || '').toLowerCase());

  const handleGuardarCambioClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgCambioClave(null);
    if (claveNueva.length < 6) {
      setMsgCambioClave({ tipo: 'err', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (claveNueva !== claveConfirmar) {
      setMsgCambioClave({ tipo: 'err', texto: 'La confirmación de la nueva contraseña no coincide.' });
      return;
    }
    setGuardandoClave(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordActual: claveActual,
          passwordNueva: claveNueva
        })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        setMsgCambioClave({ tipo: 'err', texto: data.message || 'No se pudo actualizar la contraseña.' });
      } else {
        setMsgCambioClave({ tipo: 'ok', texto: data.message || 'Contraseña actualizada correctamente.' });
        setEsCambioObligatorio(false);
        setClaveActual('');
        setClaveNueva('');
        setClaveConfirmar('');
        setTimeout(() => {
          setMostrarCambioClave(false);
          setMsgCambioClave(null);
        }, 1200);
      }
    } catch {
      setMsgCambioClave({ tipo: 'err', texto: 'Error de conexión con el servidor.' });
    } finally {
      setGuardandoClave(false);
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 py-2.5 px-3 rounded-lg transition-colors text-sm font-semibold ${
      isActive
        ? 'bg-[#39BABD] text-white shadow-sm'
        : 'text-white/90 hover:bg-white/10'
    }`;

  return (
    <div className="flex h-screen bg-[#f4f7f6] text-[#1e293b] font-sans overflow-hidden print:bg-white">
      {/* Sidebar Corporativo CMDS (Estilo update-sistema-archivo) */}
      <aside className="w-[265px] bg-[#016098] text-white flex flex-col justify-between shadow-lg z-20 shrink-0 print:hidden">
        <div className="p-4 overflow-y-auto flex-1">
          {/* Logo Grande Centrado y Encabezado */}
          <div className="flex flex-col items-center pb-5 mb-5 border-b border-white/20 text-center">
            <img
              src="/logo.png"
              alt="Logo CMDS"
              className="max-w-[90px] h-auto mb-2 bg-white p-2 rounded-lg shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span
              title={GIT_HASH ? `Commit: ${GIT_HASH}` : undefined}
              className="text-[10px] font-mono font-semibold tracking-wider bg-white/15 text-blue-100 px-2.5 py-0.5 rounded-full mb-2 border border-white/15"
            >
              v{APP_VERSION}
            </span>
            <h4 className="text-[1.05rem] font-bold tracking-wide m-0 leading-tight">
              Control de Consumos
            </h4>
            <p className="text-[0.72rem] text-blue-200 mt-0.5">
              Suministros y Facturación CMDS
            </p>

            {username && (
              <div
                title={`${roleLabel}${sector ? ` · ${sector}` : ''}`}
                className="mt-3 bg-[#024a8d] px-3 py-1.5 rounded-full text-xs font-medium text-blue-100 flex items-center gap-1.5 border border-white/10 shadow-inner"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="truncate max-w-[130px]">{username}</span>
                <span className="text-[10px] bg-blue-800 px-1.5 py-0.5 rounded text-blue-200 uppercase">
                  {role}
                </span>
              </div>
            )}
          </div>

          {/* Navegación Principal */}
          <nav className="space-y-1 text-sm">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Principal
            </div>

            <NavLink to="/" end className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Inicio (Dashboard)</span>
            </NavLink>

            <div className="pt-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Mantención Operativa
            </div>

            <NavLink to="/mantencion/documentos" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Documentos y Facturación</span>
            </NavLink>

            <NavLink to="/mantencion/clientes" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Clientes / Medidores (NIC)</span>
            </NavLink>

            <NavLink to="/mantencion/servicios" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Empresas de Servicios</span>
            </NavLink>

            <div className="pt-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Procesos y Contabilidad
            </div>

            <NavLink to="/procesos/nominas" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Generar / Autorizar Nómina</span>
            </NavLink>

            <NavLink to="/procesos/pagos" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Pagos Masivos Nómina</span>
            </NavLink>

            <NavLink to="/procesos/softland" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Captura Archivo Softland</span>
            </NavLink>

            <div className="pt-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
              Reportes e Imprimibles
            </div>

            <NavLink to="/informes" className={navClass}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Informes y Presupuesto</span>
            </NavLink>

            {esAdmin && (
              <>
                <div className="pt-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
                  Seguridad y Usuarios
                </div>
                <NavLink to="/mantencion/usuarios" className={navClass}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Usuarios y Seguridad</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Botones Cambiar Contraseña y Cerrar Sesión */}
        <div className="p-4 border-t border-white/15 shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => {
              setMsgCambioClave(null);
              setClaveActual('');
              setClaveNueva('');
              setClaveConfirmar('');
              setMostrarCambioClave(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-blue-100 text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
          >
            <span>🔑</span>
            <span>Cambiar Mi Contraseña</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#EB567F] hover:bg-[#d6416a] text-white text-xs font-bold shadow transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f4f7f6] p-5 md:p-7 print:p-0 print:bg-white">
          <Outlet />
        </main>
      </div>

      {mostrarCambioClave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
          onClick={() => {
            if (!esCambioObligatorio) setMostrarCambioClave(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#016098] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">
                  {esCambioObligatorio ? '⚠️ Actualización Obligatoria de Contraseña' : '🔑 Cambiar Mi Contraseña'}
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">Usuario: {username}</p>
              </div>
              {!esCambioObligatorio && (
                <button
                  type="button"
                  onClick={() => setMostrarCambioClave(false)}
                  className="text-white/80 hover:text-white font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarCambioClave} className="p-6 space-y-4 text-xs">
              {esCambioObligatorio && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg text-amber-900 font-medium">
                  El Administrador ha solicitado que defina una nueva contraseña personal antes de continuar.
                </div>
              )}
              {msgCambioClave && (
                <div
                  className={`p-3 rounded-lg font-bold ${
                    msgCambioClave.tipo === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {msgCambioClave.texto}
                </div>
              )}
              <div>
                <label className="block font-bold text-[#334155] mb-1">Contraseña Actual *</label>
                <input
                  type="password"
                  required
                  value={claveActual}
                  onChange={e => setClaveActual(e.target.value)}
                  className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg bg-[#f8fafc]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#334155] mb-1">Nueva Contraseña (mín. 6 caracteres) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={claveNueva}
                  onChange={e => setClaveNueva(e.target.value)}
                  className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg bg-[#f8fafc]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#334155] mb-1">Confirmar Nueva Contraseña *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={claveConfirmar}
                  onChange={e => setClaveConfirmar(e.target.value)}
                  className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg bg-[#f8fafc]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                {!esCambioObligatorio && (
                  <button
                    type="button"
                    onClick={() => setMostrarCambioClave(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={guardandoClave}
                  className="px-5 py-2 bg-[#016098] hover:bg-[#014b78] text-white font-bold rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {guardandoClave ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
