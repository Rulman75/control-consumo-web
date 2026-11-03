import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const toInputDate = (val: any) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  const d = new Date(val);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1905) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

export const ProcesosPagos: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [nominaInput, setNominaInput] = useState(searchParams.get('nomina') || '');

  const [resumen, setResumen] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [fechaPago, setFechaPago] = useState(toInputDate(new Date()));
  const [ncpbte, setNcpbte] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const consultarNomina = async (num = nominaInput) => {
    if (!num.trim()) return;
    setLoading(true);
    setMensaje(null);
    try {
      const res = await axios.get(`/api/procesos/pagos/${num.trim()}`);
      setResumen(res.data.resumen);
      setDocumentos(res.data.documentos || []);
      if (res.data.resumen?.fechaPagoActual) {
        setFechaPago(toInputDate(res.data.resumen.fechaPagoActual));
      }
      if (res.data.resumen?.ncpbteActual && res.data.resumen.ncpbteActual !== '0') {
        setNcpbte(res.data.resumen.ncpbteActual);
      } else {
        setNcpbte('');
      }
    } catch (err: any) {
      setResumen(null);
      setDocumentos([]);
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Nómina no encontrada.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qNom = searchParams.get('nomina');
    if (qNom) {
      setNominaInput(qNom);
      consultarNomina(qNom);
    }
  }, [searchParams]);

  const handleGrabarPagos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumen?.nomina) return;
    setMensaje(null);
    try {
      const res = await axios.post('/api/procesos/pagos', {
        nomina: resumen.nomina,
        fechaPago,
        ncpbte
      });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      consultarNomina(String(resumen.nomina));
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al registrar pagos masivos.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">Ingreso de Pagos Masivos por Nómina</h1>
        <p className="text-xs text-slate-500">
          Impute masivamente la Fecha de Pago y el Nº de Comprobante Contable (<code>NCpbte</code>) a todos los documentos de una nómina.
        </p>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="text-xs font-bold underline ml-4">Cerrar</button>
        </div>
      )}

      {/* Buscador e Imputación Masiva (IngresoPagos.vb) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Nómina a Consultar</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={nominaInput}
                onChange={(e) => setNominaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && consultarNomina()}
                placeholder="Ej. 10710"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-[#016098]"
              />
              <button
                type="button"
                onClick={() => consultarNomina()}
                className="px-4 py-2 bg-[#016098] hover:bg-[#014770] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Buscar Nómina
              </button>
            </div>
          </div>

          {resumen && (
            <form onSubmit={handleGrabarPagos} className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Pago *</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nº Comprobante (NCpbte) *</label>
                <input
                  type="text"
                  value={ncpbte}
                  onChange={(e) => setNcpbte(e.target.value)}
                  placeholder="Ej. 45892"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Grabar Pago a toda la Nómina
              </button>
            </form>
          )}
        </div>

        {/* Resumen de la Nómina */}
        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-[10px] font-bold uppercase text-slate-400">Servicio Básico</div>
              <div className="text-sm font-extrabold text-[#016098] mt-0.5">
                {resumen.nombreServicio || resumen.codser}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-[10px] font-bold uppercase text-slate-400">Área / Sector</div>
              <div className="text-sm font-bold text-slate-700 mt-0.5">{resumen.sector}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-[10px] font-bold uppercase text-slate-400">Tipo Docto</div>
              <div className="text-sm font-bold text-slate-700 mt-0.5">{resumen.tipo}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-[10px] font-bold uppercase text-slate-400">Cantidad Doctos</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{resumen.totalDocumentos}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-[10px] font-bold uppercase text-[#016098]">Monto Total Nómina</div>
              <div className="text-sm font-extrabold text-[#016098] mt-0.5">
                ${Number(resumen.montoTotal || 0).toLocaleString('es-CL')}
              </div>
            </div>
          </div>
        )}

        {/* Grilla de Documentos de la Nómina */}
        <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Nº Docto</th>
                <th className="py-2.5 px-3">Nº Cliente (NIC)</th>
                <th className="py-2.5 px-3">Unidad</th>
                <th className="py-2.5 px-3">Establecimiento</th>
                <th className="py-2.5 px-3">Fecha Emisión</th>
                <th className="py-2.5 px-3 text-right">Monto ($)</th>
                <th className="py-2.5 px-3">Fecha Pago</th>
                <th className="py-2.5 px-3">Nº Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Cargando documentos de la nómina...</td>
                </tr>
              ) : documentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Ingrese un Nº de Nómina para visualizar sus documentos e imputar el pago.
                  </td>
                </tr>
              ) : (
                documentos.map((d, idx) => (
                  <tr key={`${d.NDocto}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-[#016098]">{d.NDocto}</td>
                    <td className="py-2 px-3 font-semibold">{d.NCliente}</td>
                    <td className="py-2 px-3 font-bold text-slate-700">{d.codunidad}</td>
                    <td className="py-2 px-3 text-slate-600">{d.unidadDescripcion}</td>
                    <td className="py-2 px-3">
                      {d.FechaEmision ? new Date(d.FechaEmision).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">
                      ${Number(d.Monto || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-2 px-3">
                      {d.FechaPago && new Date(d.FechaPago).getFullYear() > 1905
                        ? new Date(d.FechaPago).toLocaleDateString('es-CL')
                        : '—'}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                      {d.NCpbte && d.NCpbte !== '0' ? d.NCpbte : 'Sin comprobante'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
