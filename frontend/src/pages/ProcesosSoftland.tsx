import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';

export const ProcesosSoftland: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [nominaInput, setNominaInput] = useState(searchParams.get('nomina') || '');

  const [vista, setVista] = useState<'contable' | 'sabana52'>('contable');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultarSoftland = async (num = nominaInput) => {
    if (!num.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/procesos/softland/${num.trim()}`);
      setData(res.data);
    } catch (err: any) {
      setData(null);
      setError(err.response?.data?.error || 'Error al consultar la nómina para Softland.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qNom = searchParams.get('nomina');
    if (qNom) {
      setNominaInput(qNom);
      consultarSoftland(qNom);
    }
  }, [searchParams]);

  const autorizarDirecto = async () => {
    if (!data?.resumen?.nomina) return;
    try {
      await axios.post('/api/procesos/nominas/autorizar', { nomina: data.resumen.nomina });
      consultarSoftland(String(data.resumen.nomina));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al autorizar la nómina.');
    }
  };

  const descargarExcelSoftland52 = () => {
    if (!data?.softlandHeaders || !data?.softlandMatrix) return;
    const aoa = [data.softlandHeaders, ...data.softlandMatrix];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Nomina_${data.resumen.nomina}`);
    XLSX.writeFile(
      wb,
      `CapturaSoftland_${data.resumen.tipo}_Nomina_${data.resumen.nomina}.xlsx`
    );
  };

  const resumen = data?.resumen;
  const detalles = data?.detalles || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Captura y Descarga de Archivo Softland</h1>
          <p className="text-xs text-slate-500">
            Generación de asientos contables (Boletas <code>OT</code> y Facturas <code>FI</code>) y descarga en plantilla oficial de 52 columnas de Softland.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={nominaInput}
            onChange={(e) => setNominaInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && consultarSoftland()}
            placeholder="Nº Nómina (Ej. 10710)"
            className="w-44 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-[#016098]"
          />
          <button
            type="button"
            onClick={() => consultarSoftland()}
            className="px-4 py-2 bg-[#016098] hover:bg-[#014770] text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Consultar Nómina
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {resumen && !resumen.autorizada && (
        <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="text-sm font-bold">
            ⚠️ {resumen.mensajeAutorizacion} (En el sistema antiguo la descarga requería autorización previa).
          </div>
          <button
            type="button"
            onClick={autorizarDirecto}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
          >
            Autorizar Nómina Nº {resumen.nomina} Ahora
          </button>
        </div>
      )}

      {resumen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-5">
          {/* Tarjetas Resumen Contable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Nómina / Estado</div>
              <div className="text-sm font-extrabold text-[#016098] mt-0.5">
                Nº {resumen.nomina} · {resumen.autorizada ? 'Autorizada' : 'Sin Autorizar'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Proveedor / RUT Auxiliar</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                {resumen.nombreServicio} ({resumen.rutProveedor})
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Cta. Gasto (Debe)</div>
              <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">{resumen.cuentaGasto}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Cta. Pasivo (Haber)</div>
              <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">{resumen.cuentaPasivo}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] font-bold uppercase text-slate-400">Formato RDLC / Softland</div>
              <div className="text-xs font-bold text-indigo-700 mt-0.5">{resumen.formatoSoftland}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-[10px] font-bold uppercase text-[#016098]">
                Total ({resumen.totalDocumentos} Doctos)
              </div>
              <div className="text-sm font-extrabold text-[#016098] mt-0.5">
                ${Number(resumen.montoTotal || 0).toLocaleString('es-CL')}
              </div>
            </div>
          </div>

          {/* Barra de Acciones y Selector de Vista */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setVista('contable')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  vista === 'contable' ? 'bg-[#016098] text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                Vista Contable (Grilla CapturaSoftland)
              </button>
              <button
                type="button"
                onClick={() => setVista('sabana52')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  vista === 'sabana52' ? 'bg-[#016098] text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                Previsualizar Sábana 52 Columnas ({data.softlandMatrix?.length || 0} filas)
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={descargarExcelSoftland52}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Descargar Excel Softland (52 Columnas)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Imprimir Vista Contable
              </button>
            </div>
          </div>

          {/* VISTA 1: Grilla Contable de CapturaSoftland.vb */}
          {vista === 'contable' && (
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Cuenta Debe</th>
                    <th className="py-2.5 px-3">Servicio</th>
                    <th className="py-2.5 px-3">C. Costo (Expr1)</th>
                    <th className="py-2.5 px-3">Auxiliar (RUT)</th>
                    <th className="py-2.5 px-3">Unidad / Cenco</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Nº Docto</th>
                    <th className="py-2.5 px-3">F. Emisión</th>
                    <th className="py-2.5 px-3 text-right">Monto ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((r: any, idx: number) => (
                    <tr key={`${r.NDocto}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-[#016098]">{r.Expr2}</td>
                      <td className="py-2 px-3">{r.NombreSer}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">{r.Expr1}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.Expr3}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-700">{r.codunidad}</span>
                        {r.CodCenco && <span className="text-slate-400 ml-1">({r.CodCenco})</span>}
                      </td>
                      <td className="py-2 px-3 font-semibold">{r.Tipo}</td>
                      <td className="py-2 px-3 font-bold">{r.NDocto}</td>
                      <td className="py-2 px-3">
                        {r.FechaEmision ? new Date(r.FechaEmision).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        ${Number(r.Monto || 0).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                  {/* Fila de Contrapartida al Haber */}
                  <tr className="bg-blue-50/60 font-bold text-slate-800 border-t-2 border-blue-200">
                    <td className="py-2.5 px-3 font-mono text-[#EB567F]">{resumen.cuentaPasivo}</td>
                    <td className="py-2.5 px-3" colSpan={2}>
                      CONTRAPARTIDA HABER: {resumen.descCuentaPasivo || 'PROVEEDORES / ACREEDORES'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{resumen.rutProveedor}</td>
                    <td className="py-2.5 px-3" colSpan={4}>
                      NÓMINA Nº {resumen.nomina} — {resumen.nombreServicio}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#016098]">
                      ${Number(resumen.montoTotal || 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 2: Sábana Oficial de 52 Columnas de Softland */}
          {vista === 'sabana52' && (
            <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-lg">
              <table className="text-[11px] text-left whitespace-nowrap">
                <thead className="bg-slate-800 text-white sticky top-0">
                  <tr>
                    {data.softlandHeaders.map((h: string, i: number) => (
                      <th key={i} className="py-2 px-2.5 border-r border-slate-700">
                        <div className="text-[9px] text-slate-400">Col {i + 1}</div>
                        <div>{h}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.softlandMatrix.map((row: any[], rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-blue-50/40">
                      {row.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className="py-1.5 px-2.5 border-r border-slate-100 font-mono">
                          {cell !== '' && cell !== null && cell !== undefined ? String(cell) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !resumen && !error && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
          Ingrese un Nº de Nómina arriba y presione <strong>Consultar Nómina</strong> para generar los asientos contables y descargar el archivo Softland.
        </div>
      )}
    </div>
  );
};
