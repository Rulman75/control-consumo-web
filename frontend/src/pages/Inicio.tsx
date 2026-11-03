import React from 'react';
import { Link } from 'react-router-dom';

export const Inicio: React.FC = () => {
  const accesosRapidos = [
    {
      titulo: 'Documentos y Facturación',
      subtitulo: 'Ingreso de boletas/facturas, lecturas de medidor e historial por NIC',
      ruta: '/mantencion/documentos',
      color: 'border-t-[#016098]',
      badge: 'Mantención'
    },
    {
      titulo: 'Clientes y Medidores (NIC)',
      subtitulo: 'Administración de números de cliente por unidad, servicio y traslado de NIC',
      ruta: '/mantencion/clientes',
      color: 'border-t-[#39BABD]',
      badge: 'Mantención'
    },
    {
      titulo: 'Empresas de Servicios Básicos',
      subtitulo: 'Catálogo de proveedores (Aguas Antofagasta, CGE, Elecda, Movistar, VTR, etc.)',
      ruta: '/mantencion/servicios',
      color: 'border-t-indigo-600',
      badge: 'Mantención'
    },
    {
      titulo: 'Generar y Autorizar Nóminas',
      subtitulo: 'Agrupación de documentos pendientes, correlativo automático y autorización',
      ruta: '/procesos/nominas',
      color: 'border-t-amber-500',
      badge: 'Procesos'
    },
    {
      titulo: 'Pagos Masivos y Softland',
      subtitulo: 'Imputación de comprobantes de pago y descarga de archivo Softland (52 columnas)',
      ruta: '/procesos/softland',
      color: 'border-t-[#EB567F]',
      badge: 'Contabilidad'
    },
    {
      titulo: 'Centro de Informes y Presupuesto',
      subtitulo: 'Reportes por Servicio, Cliente, Nómina, Consolidado Anual y Planilla de Presupuesto',
      ruta: '/informes',
      color: 'border-t-emerald-600',
      badge: 'Informes'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner Institucional Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#016098]/5 pointer-events-none"></div>
        <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-[#39BABD]/10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-28 h-28 bg-slate-50 rounded-2xl shadow-sm flex items-center justify-center p-4 border border-slate-100 shrink-0">
            <img
              src="/logo.png"
              alt="Logo CMDS"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div className="text-center md:text-left flex-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#016098]/10 text-[#016098] mb-3">
              Corporación Municipal de Desarrollo Social · Antofagasta
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">
              Sistema de Control de Consumos Básicos
            </h1>
            <p className="text-slate-500 text-sm md:text-base max-w-3xl leading-relaxed">
              Gestione de forma centralizada la facturación de suministros básicos (Agua Potable, Electricidad, Telecomunicaciones y Servicios), el control de medidores por establecimiento, la emisión y autorización de nóminas de pago y la interfaz contable hacia Softland.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/estadisticas"
              className="inline-flex items-center gap-2 bg-[#016098] hover:bg-[#014770] text-white font-semibold px-5 py-3 rounded-xl shadow-md transition-all text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Ver Dashboard Estadístico</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tarjetas de Acceso Directo */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 px-1">
          Módulos del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accesosRapidos.map((item) => (
            <Link
              key={item.ruta}
              to={item.ruta}
              className={`bg-white rounded-xl p-6 shadow-sm border border-slate-100 border-t-4 ${item.color} hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-[#016098] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-[#016098] transition-colors mb-1.5">
                  {item.titulo}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.subtitulo}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
