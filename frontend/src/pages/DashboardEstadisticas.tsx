import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const COLORS = ['#016098', '#39BABD', '#EB567F', '#eab308', '#6366f1', '#10b981', '#f97316', '#8b5cf6'];

export const DashboardEstadisticas: React.FC = () => {
  const [anios, setAnios] = useState<number[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [sectores, setSectores] = useState<string[]>(['Educacion', 'Salud', 'VTF']);

  const [filtroAnio, setFiltroAnio] = useState<string>('TODOS');
  const [filtroServicio, setFiltroServicio] = useState<string>('TODOS');
  const [filtroSector, setFiltroSector] = useState<string>('TODOS');

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/mantencion/catalogos')
      .then((res) => {
        setServicios(res.data.servicios || []);
        setSectores(res.data.sectores || ['Educacion', 'Salud', 'VTF']);
        const yrs: number[] = res.data.anios || [];
        setAnios(yrs);
        const currentYear = new Date().getFullYear();
        if (yrs.includes(currentYear)) {
          setFiltroAnio(String(currentYear));
        } else if (yrs.length > 0) {
          setFiltroAnio(String(yrs[0]));
        }
      })
      .catch((err) => console.error('Error al cargar catálogos:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/informes/dashboard', {
      params: {
        anio: filtroAnio,
        codser: filtroServicio,
        sector: filtroSector
      }
    })
      .then((res) => setData(res.data))
      .catch((err) => console.error('Error al cargar dashboard:', err))
      .finally(() => setLoading(false));
  }, [filtroAnio, filtroServicio, filtroSector]);

  const formatCLP = (val: number) => `$${Number(val || 0).toLocaleString('es-CL')}`;
  const formatNum = (val: number) => Number(val || 0).toLocaleString('es-CL');

  const kpis = data?.kpis || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Filtros */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Estadísticas e Indicadores de Consumos Básicos</h1>
          <p className="text-xs text-slate-500">
            Monitoreo ejecutivo de gasto facturado, consumo físico, nóminas emitidas y distribución por establecimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Año Emisión</label>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#016098]"
            >
              <option value="TODOS">Todos los Años</option>
              {anios.map((a) => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Servicio Básico</label>
            <select
              value={filtroServicio}
              onChange={(e) => setFiltroServicio(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#016098]"
            >
              <option value="TODOS">Todos los Servicios</option>
              {servicios.map((s) => (
                <option key={s.CodSer} value={s.NombreSer}>{s.NombreSer} ({s.CodSer})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Área / Sector</label>
            <select
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#016098]"
            >
              <option value="TODOS">Todos los Sectores</option>
              {sectores.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-[#016098]">
          <div className="text-xs font-semibold text-slate-400 uppercase">Monto Total Facturado</div>
          <div className="text-xl font-extrabold text-[#016098] mt-1">
            {loading ? '...' : formatCLP(kpis.MontoTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Excluye documentos nulos</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-[#39BABD]">
          <div className="text-xs font-semibold text-slate-400 uppercase">Total Documentos</div>
          <div className="text-xl font-extrabold text-slate-800 mt-1">
            {loading ? '...' : formatNum(kpis.TotalDocumentos)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Boletas y facturas registradas</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-indigo-500">
          <div className="text-xs font-semibold text-slate-400 uppercase">Medidores con Movimiento</div>
          <div className="text-xl font-extrabold text-slate-800 mt-1">
            {loading ? '...' : formatNum(kpis.ClientesConMovimiento)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Clientes (NIC) activos</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-400 uppercase">Nóminas Generadas</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {loading ? '...' : formatNum(kpis.TotalNominas)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Nóminas procesadas en el periodo</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-[#EB567F]">
          <div className="text-xs font-semibold text-slate-400 uppercase">Pendientes de Nómina</div>
          <div className="text-xl font-extrabold text-[#EB567F] mt-1">
            {loading ? '...' : formatNum(kpis.PendientesNomina)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Doctos con Nómina = 0</div>
        </div>
      </div>

      {/* Fila 1 de Gráficos: Evolución Mensual + Distribución por Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Evolución Mensual de Facturación ($) y Cantidad de Documentos
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.evolucionMensual || []}>
                <defs>
                  <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#016098" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#016098" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: any, name: any) =>
                    name === 'Monto Facturado' ? [formatCLP(Number(value)), name] : [formatNum(Number(value)), name]
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Monto"
                  name="Monto Facturado"
                  stroke="#016098"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMonto)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Distribución del Gasto por Área / Sector
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.porSector || []}
                  dataKey="Monto"
                  nameKey="Sector"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(data?.porSector || []).map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCLP(Number(val))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fila 2: Gasto por Servicio Básico + Top Establecimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Monto Facturado por Empresa de Servicio Básico
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.porServicio || []}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="NombreSer"
                  width={130}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={(val: any) => formatCLP(Number(val))} />
                <Bar dataKey="Monto" name="Monto Total ($)" fill="#39BABD" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Top Establecimientos / Unidades por Gasto Facturado
          </h3>
          <div className="overflow-y-auto max-h-80 flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Unidad</th>
                  <th className="py-2.5 px-3">Establecimiento</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-right">Doctos</th>
                  <th className="py-2.5 px-3 text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.topEstablecimientos || []).map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-[#016098]">{row.CodUnidad}</td>
                    <td className="py-2 px-3 font-medium text-slate-700">{row.Establecimiento}</td>
                    <td className="py-2 px-3 text-slate-500">{row.Sector}</td>
                    <td className="py-2 px-3 text-right">{formatNum(row.Documentos)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatCLP(row.Monto)}</td>
                  </tr>
                ))}
                {(!data?.topEstablecimientos || data.topEstablecimientos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Sin registros para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
