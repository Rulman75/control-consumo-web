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
          </nav>
        </div>

        {/* Botón Cerrar Sesión */}
        <div className="p-4 border-t border-white/15 shrink-0">
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
    </div>
  );
};
