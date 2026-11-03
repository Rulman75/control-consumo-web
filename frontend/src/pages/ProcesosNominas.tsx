import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export const ProcesosNominas: React.FC = () => {
  const [servicios, setServicios] = useState<any[]>([]);
  const [codser, setCodser] = useState('');
  const [tipo, setTipo] = useState('FI');
  const [sector, setSector] = useState('Educacion');

  const [pendientes, setPendientes] = useState<any[]>([]);
  const [recientes, setRecientes] = useState<any[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [loadingRecientes, setLoadingRecientes] = useState(false);

  const [nominaGenerada, setNominaGenerada] = useState<number | null>(null);
  const [nominaAutorizarInput, setNominaAutorizarInput] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const cargarRecientes = async () => {
    setLoadingRecientes(true);
    try {
      const res = await axios.get('/api/procesos/nominas/recientes');
      setRecientes(res.data || []);
    } catch (err) {
      console.error('Error al cargar nóminas recientes:', err);
    } finally {
      setLoadingRecientes(false);
    }
  };

  useEffect(() => {
    axios.get('/api/mantencion/catalogos').then((res) => {
      const srvs = res.data.servicios || [];
      setServicios(srvs);
      if (srvs.length > 0) {
        setCodser(srvs[0].NombreSer);
      }
    });
    cargarRecientes();
  }, []);

  const buscarPendientes = async (qSrv = codser, qTipo = tipo, qSec = sector) => {
    if (!qSrv) return;
    setLoadingPendientes(true);
    setMensaje(null);
    try {
      const res = await axios.get('/api/procesos/nominas/pendientes', {
        params: { codser: qSrv, tipo: qTipo, sector: qSec }
      });
      setPendientes(res.data || []);
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al buscar documentos pendientes.' });
    } finally {
      setLoadingPendientes(false);
    }
  };

  const handleGenerarNomina = async () => {
    if (pendientes.length === 0) {
      setMensaje({ tipo: 'err', texto: 'Primero busque y verifique que existan documentos pendientes (Nómina = 0).' });
      return;
    }
    if (!window.confirm(`¿Confirmar generación de nueva Nómina para ${pendientes.length} documentos de ${codser} (${sector} - ${tipo})?`)) {
      return;
    }
    setMensaje(null);
    try {
      const res = await axios.post('/api/procesos/nominas/generar', { codser, tipo, sector });
      setNominaGenerada(res.data.nomina);
      setNominaAutorizarInput(String(res.data.nomina));
      setMensaje({ tipo: 'ok', texto: res.data.message });
      setPendientes([]);
      cargarRecientes();
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al generar la nómina.' });
    }
  };

  const handleAutorizarNomina = async (numNomina: number | string) => {
    if (!numNomina) {
      setMensaje({ tipo: 'err', texto: 'Ingrese un Nº de Nómina válido para autorizar.' });
      return;
    }
    setMensaje(null);
    try {
      const res = await axios.post('/api/procesos/nominas/autorizar', { nomina: Number(numNomina) });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      cargarRecientes();
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al autorizar la nómina.' });
    }
  };

  const totalPendientesMonto = pendientes.reduce((acc, r) => acc + (r.Monto || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Generación de Nóminas y Autorización Softland</h1>
          <p className="text-xs text-slate-500">
            Agrupe documentos pendientes sin nómina (<code>Nomina = 0</code>), genere el correlativo automático y autorice su traspaso contable.
          </p>
        </div>

        {/* Autorización Rápida por Nº Nómina (Autorizar.vb) */}
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-600 pl-1">Autorizar Nómina Nº:</span>
          <input
            type="number"
            value={nominaAutorizarInput}
            onChange={(e) => setNominaAutorizarInput(e.target.value)}
            placeholder="Ej. 10710"
            className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
          />
          <button
            type="button"
            onClick={() => handleAutorizarNomina(nominaAutorizarInput)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Autorizar Softland
          </button>
        </div>
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

      {/* Panel de Generación de Nómina (GeneraNomina.vb) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Documento</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50"
              >
                <option value="FI">FI — Factura</option>
                <option value="OT">OT — Boleta / Otro</option>
                <option value="NC">NC — Nota de Crédito</option>
                <option value="ND">ND — Nota de Débito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Área / Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50"
              >
                <option value="Educacion">Educacion</option>
                <option value="Salud">Salud</option>
                <option value="VTF">VTF</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Servicio Básico</label>
              <select
                value={codser}
                onChange={(e) => setCodser(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50"
              >
                {servicios.map((s) => (
                  <option key={s.CodSer} value={s.NombreSer}>
                    {s.NombreSer} (Cód. {s.CodSer})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => buscarPendientes(codser, tipo, sector)}
              className="px-5 py-2.5 bg-[#016098] hover:bg-[#014770] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
            >
              Buscar Pendientes (Nómina = 0)
            </button>
            <button
              type="button"
              onClick={handleGenerarNomina}
              disabled={pendientes.length === 0}
              className="px-5 py-2.5 bg-[#39BABD] hover:bg-[#2da3a6] disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
            >
              Generar Nómina ({pendientes.length})
            </button>
          </div>
        </div>

        {nominaGenerada && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase text-[#016098]">Última Nómina Creada en esta Sesión:</span>
              <span className="ml-2 text-lg font-extrabold text-[#016098]">Nº {nominaGenerada}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAutorizarNomina(nominaGenerada)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Autorizar Nómina Nº {nominaGenerada}
              </button>
              <Link
                to={`/procesos/softland?nomina=${nominaGenerada}`}
                className="px-3 py-1.5 bg-[#016098] hover:bg-[#014770] text-white rounded-lg text-xs font-bold"
              >
                Ver en Softland
              </Link>
            </div>
          </div>
        )}

        {/* Tabla de Documentos Pendientes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Documentos Pendientes de Asignar Nómina ({pendientes.length})
            </h3>
            <span className="text-xs font-bold text-[#016098]">
              Total Selección: ${totalPendientesMonto.toLocaleString('es-CL')}
            </span>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="py-2 px-3">Unidad</th>
                  <th className="py-2 px-3">Establecimiento</th>
                  <th className="py-2 px-3">NIC</th>
                  <th className="py-2 px-3">Nº Docto</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">F. Emisión</th>
                  <th className="py-2 px-3 text-right">Consumo</th>
                  <th className="py-2 px-3 text-right">Monto ($)</th>
                  <th className="py-2 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingPendientes ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">Buscando documentos pendientes...</td>
                  </tr>
                ) : pendientes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Sin documentos pendientes para los criterios seleccionados. Presione "Buscar Pendientes".
                    </td>
                  </tr>
                ) : (
                  pendientes.map((p, idx) => (
                    <tr key={`${p.NDocto}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-700">{p.codunidad}</td>
                      <td className="py-2 px-3 text-slate-700">{p.unidadDescripcion}</td>
                      <td className="py-2 px-3 font-semibold text-[#016098]">{p.ncliente}</td>
                      <td className="py-2 px-3 font-bold">{p.NDocto}</td>
                      <td className="py-2 px-3">{p.Tipo}</td>
                      <td className="py-2 px-3">
                        {p.FechaEmision ? new Date(p.FechaEmision).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td className="py-2 px-3 text-right">{Number(p.Consumo || 0).toLocaleString('es-CL')}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        ${Number(p.Monto || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-2 px-3">{p.Estado}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historial de Últimas Nóminas Emitidas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Últimas Nóminas Generadas en el Sistema
            </h2>
            <p className="text-xs text-slate-400">
              Controle el estado de autorización y acceda directamente al pago masivo o descarga Softland.
            </p>
          </div>
          <button
            type="button"
            onClick={cargarRecientes}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Actualizar Lista
          </button>
        </div>

        <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Nº Nómina</th>
                <th className="py-2.5 px-3">Servicio</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">Doctos</th>
                <th className="py-2.5 px-3 text-right">Monto Total</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Autorización</th>
                <th className="py-2.5 px-3">Nº Cpbte Pago</th>
                <th className="py-2.5 px-3 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingRecientes ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">Cargando historial de nóminas...</td>
                </tr>
              ) : (
                recientes.map((n) => (
                  <tr key={n.Nomina} className="hover:bg-blue-50/40">
                    <td className="py-2.5 px-3 font-extrabold text-[#016098]">Nº {n.Nomina}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {n.NombreSer || n.Codser}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{n.Sector}</td>
                    <td className="py-2.5 px-3 font-mono">{n.Tipo}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{n.TotalDocumentos}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      ${Number(n.MontoTotal || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-2.5 px-3">{n.Estado}</td>
                    <td className="py-2.5 px-3">
                      {n.Autorizada === 1 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Autorizada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {n.NCpbte && n.NCpbte !== '0' ? n.NCpbte : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      {n.Autorizada !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleAutorizarNomina(n.Nomina)}
                          className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Autorizar
                        </button>
                      )}
                      <Link
                        to={`/procesos/pagos?nomina=${n.Nomina}`}
                        className="text-[11px] font-bold text-[#016098] hover:underline"
                      >
                        Pagos
                      </Link>
                      <Link
                        to={`/procesos/softland?nomina=${n.Nomina}`}
                        className="text-[11px] font-bold text-[#EB567F] hover:underline"
                      >
                        Softland
                      </Link>
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
