import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

type TipoInforme = 'servicio' | 'cliente' | 'nomina' | 'consolidado' | 'presupuesto';

const formatFecha = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1905) return '—';
  return d.toLocaleDateString('es-CL');
};

export const InformesConsumos: React.FC = () => {
  const [tab, setTab] = useState<TipoInforme>('nomina');
  const [servicios, setServicios] = useState<any[]>([]);
  const [anios, setAnios] = useState<number[]>([]);

  // Parámetros de filtro
  const [codser, setCodser] = useState('');
  const [ncliente, setNcliente] = useState('');
  const [nomina, setNomina] = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [sector, setSector] = useState('TODOS');
  const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`);
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/mantencion/catalogos').then((res) => {
      const srvs = res.data.servicios || [];
      const yrs: number[] = res.data.anios || [];
      setServicios(srvs);
      setAnios(yrs);
      if (srvs.length > 0) setCodser(srvs[0].NombreSer);
      const currentYear = new Date().getFullYear();
      if (yrs.includes(currentYear)) {
        setAnio(String(currentYear));
      } else if (yrs.length > 0) {
        setAnio(String(yrs[0]));
      }
    });
  }, []);

  const handleGenerarInforme = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResultados([]);

    try {
      if (tab === 'servicio') {
        const res = await axios.get('/api/informes/por-servicio', { params: { codser, desde, hasta } });
        setResultados(res.data || []);
      } else if (tab === 'cliente') {
        const res = await axios.get('/api/informes/por-cliente', { params: { ncliente, desde, hasta } });
        setResultados(res.data || []);
      } else if (tab === 'nomina') {
        const res = await axios.get('/api/informes/por-nomina', { params: { nomina } });
        setResultados(res.data || []);
      } else if (tab === 'consolidado') {
        const res = await axios.get('/api/informes/consolidado', { params: { codser, anio, sector } });
        setResultados(res.data || []);
      } else if (tab === 'presupuesto') {
        const res = await axios.get('/api/informes/presupuesto', { params: { codser, desde, hasta, sector } });
        setResultados(res.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al generar el informe solicitado.');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (resultados.length === 0) return;
    let exportRows: any[] = [];

    if (tab === 'servicio') {
      exportRows = resultados.map((r) => ({
        'Nº Cliente': r.ncliente,
        'Unidad': r.codunidad,
        'Establecimiento': r.Descripcion,
        'Nº Documento': r.NDocto,
        'Tipo': r.Tipo,
        'Monto ($)': r.Monto,
        'Última Lectura': r.ULectura,
        'Lectura Anterior': r.ALectura,
        'Fecha Lectura': formatFecha(r.FechaLectura),
        'Consumo': r.Consumo,
        'Fecha Emisión': formatFecha(r.FechaEmision),
        'Fecha Recepción': formatFecha(r.FechaRecep),
        'Nº Nómina': r.Nomina
      }));
    } else if (tab === 'cliente') {
      exportRows = resultados.map((r) => ({
        'Nº Cliente': r.NCliente,
        'Unidad': r.codunidad,
        'Establecimiento': r.unidadDescripcion,
        'Servicio': r.Codser,
        'Nº Documento': r.NDocto,
        'Tipo': r.Tipo,
        'Monto ($)': r.Monto,
        'Última Lectura': r.ULectura,
        'Lectura Anterior': r.ALectura,
        'Fecha Lectura': formatFecha(r.FechaLectura),
        'Consumo': r.Consumo,
        'Fecha Emisión': formatFecha(r.FechaEmision),
        'Fecha Pago': formatFecha(r.FechaPago),
        'Nº Cpbte': r.NCpbte,
        'Nº Nómina': r.Nomina
      }));
    } else if (tab === 'nomina') {
      exportRows = resultados.map((r) => ({
        'Sector': r.CodSector,
        'Tipo': r.Tipo,
        'Unidad': r.Descripcion,
        'Cód. Unidad / Cenco': r.CodCenco || r.codunidad,
        'Domicilio': r.Domicilio,
        'Nº Cliente': r.ncliente,
        'Nº Docto': r.NDocto,
        'SubTotal': r.SubTotal,
        'Intereses': r.Intereses,
        'Otros': r.Otro,
        'Monto ($)': r.Monto,
        'Fecha Lectura': formatFecha(r.FechaLectura),
        'Fecha Próx. Lec.': formatFecha(r.FechaProxLec),
        'Fecha Emisión': formatFecha(r.FechaEmision),
        'Fecha Recepción': formatFecha(r.FechaRecep),
        'Fecha Venc.': formatFecha(r.FechaVen),
        'Nº Cpbte': r.NCpbte,
        'Fecha Pago': formatFecha(r.FechaPago),
        'Nº Nómina': r.Nomina
      }));
    } else if (tab === 'consolidado') {
      exportRows = resultados.map((r) => ({
        'Año': r.anio,
        'Mes Nº': r.mes,
        'Mes': r.mesDescripcion,
        'NIC': r.ncliente,
        'Cód. Unidad': r.codunidad,
        'Establecimiento': r.unidadDescripcion,
        'Sector': r.sector,
        'Nº Docto': r.NDocto,
        'Consumo': r.Consumo,
        'Monto ($)': r.Monto,
        'Servicio': r.NombreSer || r.Codser
      }));
    } else if (tab === 'presupuesto') {
      exportRows = resultados.map((r) => ({
        'Nº': r.correlativoFila,
        'Fecha Emisión': formatFecha(r.FechaEmision),
        'Procedencia / Servicio': r.Contacto || r.NombreSer,
        'Unidad / Cenco': r.CodCenco || r.codunidad,
        'Establecimiento': r.Descripcion,
        'Tipo': r.Tipo,
        'Nº Docto': r.NDocto,
        'Nº Cpbte': r.NCpbte,
        'Monto Parcial ($)': r.Monto,
        'Monto Acumulado ($)': r.MontoAcumulado,
        'Financiamiento': r.financiamiento,
        'Nº Nómina': r.Nomina
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Informe_${tab}`);
    XLSX.writeFile(wb, `Informe_Consumos_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalMonto = resultados.reduce((acc, r) => acc + (r.Monto || 0), 0);
  const totalConsumo = resultados.reduce((acc, r) => acc + (r.Consumo || 0), 0);

  const titulosInforme: Record<TipoInforme, string> = {
    nomina: 'COMPROBANTES DE CONSUMO — INFORME POR NÓMINA',
    servicio: 'COMPROBANTES DE CONSUMO — DOCUMENTOS POR SERVICIO',
    cliente: 'HISTORIAL DE CONSUMO POR CLIENTE (NIC)',
    consolidado: 'CONSOLIDADO ANUAL DE CONSUMOS MENSUALES',
    presupuesto: 'PLANILLA DE CONTROL PRESUPUESTARIO — CONSUMOS BÁSICOS'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Selector de Tipo de Informe (Oculto al imprimir) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Centro de Informes Oficiales y Presupuesto</h1>
            <p className="text-xs text-slate-500">
              Genere, imprima o exporte a Excel todos los reportes operativos del Sistema de Control de Consumos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={resultados.length === 0}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={exportarExcel}
              disabled={resultados.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Exportar a Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Pestañas de los 5 Informes */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'nomina', label: 'Doctos por Nómina' },
            { id: 'servicio', label: 'Doctos por Servicio' },
            { id: 'cliente', label: 'Doctos por Cliente (NIC)' },
            { id: 'consolidado', label: 'Consolidado Anual' },
            { id: 'presupuesto', label: 'Planilla Presupuesto' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id as TipoInforme);
                setResultados([]);
                setError(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === item.id
                  ? 'bg-[#016098] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Filtros dinámicos según el informe seleccionado */}
        <form onSubmit={handleGenerarInforme} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          {(tab === 'servicio' || tab === 'consolidado' || tab === 'presupuesto') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Servicio Básico</label>
              <select
                value={codser}
                onChange={(e) => setCodser(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                {servicios.map((s) => (
                  <option key={s.CodSer} value={s.NombreSer}>
                    {s.NombreSer} (Cód. {s.CodSer})
                  </option>
                ))}
              </select>
            </div>
          )}

          {tab === 'cliente' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Cliente (NIC) *</label>
              <input
                type="number"
                value={ncliente}
                onChange={(e) => setNcliente(e.target.value)}
                placeholder="Ej. 566702"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold"
                required
              />
            </div>
          )}

          {tab === 'nomina' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Nómina *</label>
              <input
                type="number"
                value={nomina}
                onChange={(e) => setNomina(e.target.value)}
                placeholder="Ej. 10710"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-[#016098]"
                required
              />
            </div>
          )}

          {tab === 'consolidado' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Año Emisión *</label>
              <select
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                {anios.map((a) => (
                  <option key={a} value={String(a)}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {(tab === 'consolidado' || tab === 'presupuesto') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sector (Opcional)</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="TODOS">Todos los Sectores</option>
                <option value="Educacion">Educacion</option>
                <option value="Salud">Salud</option>
                <option value="VTF">VTF</option>
              </select>
            </div>
          )}

          {(tab === 'servicio' || tab === 'cliente' || tab === 'presupuesto') && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Recepción Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Recepción Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </>
          )}

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#016098] hover:bg-[#014770] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
            >
              Generar Informe
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium print:hidden">
          {error}
        </div>
      )}

      {/* Hoja de Reporte Institucional (Imprimible) */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
        {/* Membrete Institucional */}
        <div className="flex items-center justify-between border-b-2 border-[#016098] pb-4 mb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="CMDS" className="w-14 h-14 object-contain" />
            <div>
              <div className="text-xs font-bold uppercase text-[#016098]">
                Corporación Municipal de Desarrollo Social de Antofagasta
              </div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800">
                {titulosInforme[tab]}
              </h2>
              <div className="text-xs text-slate-500">
                {tab === 'nomina' && resultados[0] && (
                  <span>
                    NÓMINA Nº <strong>{resultados[0].Nomina}</strong> · SERVICIO:{' '}
                    <strong>{resultados[0].NombreSer || resultados[0].Codser}</strong>
                  </span>
                )}
                {tab === 'servicio' && (
                  <span>
                    SERVICIO: <strong>{codser}</strong> · PERIODO: {desde} al {hasta}
                  </span>
                )}
                {tab === 'cliente' && resultados[0] && (
                  <span>
                    CLIENTE NIC: <strong>{resultados[0].NCliente}</strong> · UNIDAD:{' '}
                    <strong>{resultados[0].codunidad} ({resultados[0].unidadDescripcion})</strong> · SERVICIO:{' '}
                    <strong>{resultados[0].NombreSer || resultados[0].Codser}</strong>
                  </span>
                )}
                {tab === 'consolidado' && (
                  <span>
                    SERVICIO: <strong>{codser}</strong> · AÑO: <strong>{anio}</strong>
                  </span>
                )}
                {tab === 'presupuesto' && (
                  <span>
                    SERVICIO: <strong>{codser}</strong> · PERIODO: {desde} al {hasta}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Fecha Emisión Reporte: {new Date().toLocaleDateString('es-CL')}</div>
            <div className="font-bold text-slate-700 mt-0.5">Registros: {resultados.length}</div>
          </div>
        </div>

        {/* Tabla del Informe */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Generando informe...</div>
          ) : resultados.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Configure los filtros superiores y presione <strong>Generar Informe</strong>.
            </div>
          ) : tab === 'nomina' ? (
            /* INFORME 1: DOCTOS POR NÓMINA (InformeNomina2.rdlc / Informe_presupuesto.rdlc) */
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
                <tr>
                  <th className="py-2 px-2">Sector</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">Unidad / Establecimiento</th>
                  <th className="py-2 px-2">Cód. Cenco</th>
                  <th className="py-2 px-2">Nº Cliente</th>
                  <th className="py-2 px-2">Nº Docto</th>
                  <th className="py-2 px-2">F. Lectura</th>
                  <th className="py-2 px-2">F. Próx. Lec</th>
                  <th className="py-2 px-2">F. Emisión</th>
                  <th className="py-2 px-2">F. Recep.</th>
                  <th className="py-2 px-2">F. Venc.</th>
                  <th className="py-2 px-2 text-right">Monto ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resultados.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2">{r.CodSector}</td>
                    <td className="py-1.5 px-2 font-semibold">{r.Tipo}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-800">{r.Descripcion}</td>
                    <td className="py-1.5 px-2 font-mono">{r.CodCenco || r.codunidad}</td>
                    <td className="py-1.5 px-2 font-bold text-[#016098]">{r.ncliente}</td>
                    <td className="py-1.5 px-2 font-bold">{r.NDocto}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaLectura)}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaProxLec)}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaEmision)}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaRecep)}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaVen)}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                      ${Number(r.Monto || 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={11} className="py-2.5 px-2 text-right uppercase">
                    Total Nómina Nº {resultados[0]?.Nomina}:
                  </td>
                  <td className="py-2.5 px-2 text-right text-[#016098] text-xs">
                    ${totalMonto.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : tab === 'servicio' || tab === 'cliente' ? (
            /* INFORME 2 y 3: POR SERVICIO (Informe_presupuesto3.rdlc) Y POR CLIENTE (InformePorCliente2.rdlc) */
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
                <tr>
                  <th className="py-2 px-2">Nº Cliente</th>
                  <th className="py-2 px-2">Unidad / Establecimiento</th>
                  <th className="py-2 px-2">Nº Documento</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">F. Emisión</th>
                  <th className="py-2 px-2 text-right">Últ. Lectura</th>
                  <th className="py-2 px-2 text-right">Ant. Lectura</th>
                  <th className="py-2 px-2">F. Lectura</th>
                  <th className="py-2 px-2 text-right">Consumo</th>
                  <th className="py-2 px-2 text-right">Monto ($)</th>
                  <th className="py-2 px-2 text-center">Nómina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resultados.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-bold text-[#016098]">{r.ncliente || r.NCliente}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-800">
                      {r.Descripcion || r.unidadDescripcion || r.codunidad}
                    </td>
                    <td className="py-1.5 px-2 font-bold">{r.NDocto}</td>
                    <td className="py-1.5 px-2">{r.Tipo}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaEmision)}</td>
                    <td className="py-1.5 px-2 text-right">{r.ULectura}</td>
                    <td className="py-1.5 px-2 text-right">{r.ALectura}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaLectura)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold">
                      {Number(r.Consumo || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                      ${Number(r.Monto || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold">{r.Nomina}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={8} className="py-2.5 px-2 text-right uppercase">Totales del Periodo:</td>
                  <td className="py-2.5 px-2 text-right">{totalConsumo.toLocaleString('es-CL')}</td>
                  <td className="py-2.5 px-2 text-right text-[#016098]">
                    ${totalMonto.toLocaleString('es-CL')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : tab === 'consolidado' ? (
            /* INFORME 4: CONSOLIDADO ANUAL (consolidado.rdlc) */
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
                <tr>
                  <th className="py-2 px-2">Mes</th>
                  <th className="py-2 px-2">Descripción Mes</th>
                  <th className="py-2 px-2">NIC</th>
                  <th className="py-2 px-2">Cód. Unidad</th>
                  <th className="py-2 px-2">Establecimiento</th>
                  <th className="py-2 px-2">Sector</th>
                  <th className="py-2 px-2">Nº Docto</th>
                  <th className="py-2 px-2 text-right">Consumo</th>
                  <th className="py-2 px-2 text-right">Monto ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resultados.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-bold">{r.mes}</td>
                    <td className="py-1.5 px-2 uppercase font-semibold text-slate-700">{r.mesDescripcion}</td>
                    <td className="py-1.5 px-2 font-bold text-[#016098]">{r.ncliente}</td>
                    <td className="py-1.5 px-2 font-bold">{r.codunidad}</td>
                    <td className="py-1.5 px-2">{r.unidadDescripcion}</td>
                    <td className="py-1.5 px-2">{r.sector}</td>
                    <td className="py-1.5 px-2 font-mono">{r.NDocto}</td>
                    <td className="py-1.5 px-2 text-right">{Number(r.Consumo || 0).toLocaleString('es-CL')}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                      ${Number(r.Monto || 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={7} className="py-2.5 px-2 text-right uppercase">Total Consolidado {anio}:</td>
                  <td className="py-2.5 px-2 text-right">{totalConsumo.toLocaleString('es-CL')}</td>
                  <td className="py-2.5 px-2 text-right text-[#016098]">
                    ${totalMonto.toLocaleString('es-CL')}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* INFORME 5: PLANILLA DE PRESUPUESTO (Informe_presupuesto2.rdlc) */
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
                <tr>
                  <th className="py-2 px-2">Nº</th>
                  <th className="py-2 px-2">F. Emisión</th>
                  <th className="py-2 px-2">Procedencia</th>
                  <th className="py-2 px-2">Detalle / Cenco</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">Nº Docto</th>
                  <th className="py-2 px-2">Nº Cpbte</th>
                  <th className="py-2 px-2 text-right">Parcial ($)</th>
                  <th className="py-2 px-2 text-right">Acumulado ($)</th>
                  <th className="py-2 px-2">Financiamiento</th>
                  <th className="py-2 px-2 text-center">Nº Nómina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resultados.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-500">{r.correlativoFila}</td>
                    <td className="py-1.5 px-2">{formatFecha(r.FechaEmision)}</td>
                    <td className="py-1.5 px-2 font-semibold">{r.Contacto || r.NombreSer}</td>
                    <td className="py-1.5 px-2">
                      <span className="font-bold text-[#016098]">{r.CodCenco || r.codunidad}</span> — {r.Descripcion}
                    </td>
                    <td className="py-1.5 px-2">{r.Tipo}</td>
                    <td className="py-1.5 px-2 font-bold">{r.NDocto}</td>
                    <td className="py-1.5 px-2 font-mono">{r.NCpbte}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-800">
                      ${Number(r.Monto || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-[#016098]">
                      ${Number(r.MontoAcumulado || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1.5 px-2">{r.financiamiento}</td>
                    <td className="py-1.5 px-2 text-center font-bold">{r.Nomina}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={7} className="py-2.5 px-2 text-right uppercase">Total Presupuesto Ejecutado:</td>
                  <td className="py-2.5 px-2 text-right text-[#016098]">
                    ${totalMonto.toLocaleString('es-CL')}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Pie de Firma Oficial (Presente en Informe_presupuesto / Nómina) */}
        {resultados.length > 0 && (
          <div className="mt-16 pt-8 flex justify-end">
            <div className="text-center border-t border-slate-400 pt-2 w-64">
              <div className="text-xs font-extrabold text-slate-800">ENCARGADO CONSUMOS BÁSICOS</div>
              <div className="text-[11px] text-slate-500">Corporación Municipal de Desarrollo Social</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
