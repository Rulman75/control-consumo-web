import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export const MantencionClientes: React.FC = () => {
  const [servicios, setServicios] = useState<any[]>([]);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros de tabla
  const [search, setSearch] = useState('');
  const [filtroCodser, setFiltroCodser] = useState('');
  const [filtroSector, setFiltroSector] = useState('');

  // Formulario Cliente (Frm_clientes.vb)
  const [ncliente, setNcliente] = useState('');
  const [nombre, setNombre] = useState('');
  const [codunidad, setCodunidad] = useState('');
  const [nmedidor, setNmedidor] = useState('');
  const [codser, setCodser] = useState('');
  const [sector, setSector] = useState('Educacion');
  const [nclienteAntiguo, setNclienteAntiguo] = useState<number>(0);

  // Modal / Panel Trasladar NIC
  const [showTraslado, setShowTraslado] = useState(false);
  const [nclienteNuevo, setNclienteNuevo] = useState('');
  const [trasladarDocs, setTrasladarDocs] = useState(true);

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  useEffect(() => {
    axios.get('/api/mantencion/catalogos').then((res) => {
      setServicios(res.data.servicios || []);
      setEstablecimientos(res.data.establecimientos || []);
      if (res.data.servicios?.length > 0) {
        setCodser(res.data.servicios[0].NombreSer);
      }
      if (res.data.establecimientos?.length > 0) {
        setCodunidad(String(res.data.establecimientos[0].CodUnidad));
      }
    });
    cargarClientes();
  }, []);

  const cargarClientes = async (qSearch = search, qServicio = filtroCodser, qSector = filtroSector) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/mantencion/clientes', {
        params: { search: qSearch, codser: qServicio, sector: qSector }
      });
      setClientes(res.data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const buscarPorNIC = async () => {
    if (!ncliente.trim()) return;
    setMensaje(null);
    try {
      const res = await axios.get(`/api/mantencion/clientes/${ncliente.trim()}`);
      const c = res.data;
      setNcliente(String(c.ncliente));
      setNombre(c.nombre || '');
      setCodunidad(c.codunidad || '');
      setNmedidor(c.nmedidor || '');
      setCodser(c.codser || '');
      setSector(c.sector || 'Educacion');
      setNclienteAntiguo(c.nclienteAntiguo || 0);
      setMensaje({ tipo: 'ok', texto: `Cliente NIC ${c.ncliente} cargado en el formulario.` });
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Cliente no encontrado. Puede ingresarlo como nuevo.' });
    }
  };

  const seleccionarFila = (c: any) => {
    setNcliente(String(c.ncliente));
    setNombre(c.nombre || '');
    setCodunidad(c.codunidad || '');
    setNmedidor(c.nmedidor || '');
    setCodser(c.codser || '');
    setSector(c.sector || 'Educacion');
    setNclienteAntiguo(c.nclienteAntiguo || 0);
    setMensaje(null);
  };

  const limpiarFormulario = () => {
    setNcliente('');
    setNombre('');
    setNmedidor('');
    setNclienteAntiguo(0);
    setShowTraslado(false);
    setNclienteNuevo('');
    setMensaje(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      const res = await axios.post('/api/mantencion/clientes', {
        ncliente,
        nombre,
        codunidad,
        nmedidor,
        codser,
        sector
      });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      cargarClientes();
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al guardar cliente' });
    }
  };

  const handleTrasladarNIC = async () => {
    if (!ncliente || !nclienteNuevo) {
      setMensaje({ tipo: 'err', texto: 'Debe indicar el NIC actual y el nuevo NIC numérico.' });
      return;
    }
    setMensaje(null);
    try {
      const res = await axios.post('/api/mantencion/clientes/trasladar', {
        nclienteActual: ncliente,
        nclienteNuevo,
        trasladarDocumentos: trasladarDocs
      });
      setMensaje({
        tipo: 'ok',
        texto: `${res.data.message} (${res.data.docsActualizados} documentos asociados trasladados).`
      });
      setNclienteAntiguo(Number(ncliente));
      setNcliente(nclienteNuevo);
      setNclienteNuevo('');
      setShowTraslado(false);
      cargarClientes();
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al trasladar NIC' });
    }
  };

  const exportarExcel = () => {
    const rows = clientes.map((c) => ({
      'Nº Cliente (NIC)': c.ncliente,
      'NIC Antiguo': c.nclienteAntiguo || '',
      'Nombre / Descripción': c.nombre,
      'Cód. Unidad': c.codunidad,
      'Establecimiento': c.unidadDescripcion,
      'Centro Costo': c.ccosto,
      'Nº Medidor': c.nmedidor,
      'Cód. Servicio': c.codser,
      'Servicio': c.nombreServicio,
      'Sector': c.sector
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes_NIC');
    XLSX.writeFile(wb, `Clientes_Medidores_CMDS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mantención de Clientes y Medidores (NIC)</h1>
          <p className="text-xs text-slate-500">
            Ingresar, actualizar o trasladar Números de Identificación de Clientes (NIC) asociados a cada Unidad y Servicio.
          </p>
        </div>
        <button
          onClick={exportarExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <span>Exportar Catálogo Excel</span>
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Formulario Frm_clientes */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#016098]">
              Ficha del Cliente / Medidor
            </h2>
            {nclienteAntiguo > 0 && (
              <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                NIC Antiguo: {nclienteAntiguo}
              </span>
            )}
          </div>

          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Cliente (NIC) *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={ncliente}
                  onChange={(e) => setNcliente(e.target.value)}
                  placeholder="Ej. 566702"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                  required
                />
                <button
                  type="button"
                  onClick={buscarPorNIC}
                  className="px-4 py-2 bg-[#39BABD] hover:bg-[#2da3a6] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Buscar NIC
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Identificación del Suministro *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. LICEO A-15 / CESFAM NORTE"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unidad / Establecimiento</label>
                <select
                  value={codunidad}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCodunidad(val);
                    const est = establecimientos.find((x) => String(x.CodUnidad) === val);
                    if (est && !nombre.trim()) {
                      setNombre(est.Descripcion);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#016098]"
                >
                  <option value="">-- Seleccione Unidad --</option>
                  {establecimientos.map((est) => (
                    <option key={`${est.Rol}-${est.CodUnidad}`} value={String(est.CodUnidad)}>
                      {est.CodUnidad} — {est.Descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Medidor</label>
                <input
                  type="text"
                  value={nmedidor}
                  onChange={(e) => setNmedidor(e.target.value)}
                  placeholder="Ej. 1094821"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Empresa de Servicio *</label>
                <select
                  value={codser}
                  onChange={(e) => setCodser(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#016098]"
                  required
                >
                  {servicios.map((s) => (
                    <option key={s.CodSer} value={s.NombreSer}>
                      {s.NombreSer} (Cód. {s.CodSer})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sector *</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#016098]"
                >
                  <option value="Educacion">Educacion</option>
                  <option value="Salud">Salud</option>
                  <option value="VTF">VTF</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#016098] hover:bg-[#014770] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Grabar / Actualizar Cliente
              </button>
              <button
                type="button"
                onClick={limpiarFormulario}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setShowTraslado(!showTraslado)}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Trasladar NIC
              </button>
            </div>
          </form>

          {/* Panel desplegable de Trasladar NIC (Button1_Click en Frm_clientes.vb) */}
          {showTraslado && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="text-xs font-bold text-amber-900 uppercase">
                Traslado de Número de Cliente (NIC)
              </div>
              <p className="text-[11px] text-amber-800">
                Reemplaza el NIC actual (<strong>{ncliente || '—'}</strong>) por un nuevo NIC y conserva el NIC anterior en el campo histórico <code>NclienteAntiguo</code>.
              </p>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Nuevo Nº de Cliente (NIC)</label>
                <input
                  type="number"
                  value={nclienteNuevo}
                  onChange={(e) => setNclienteNuevo(e.target.value)}
                  placeholder="Ingrese el nuevo NIC numérico"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trasladarDocs}
                  onChange={(e) => setTrasladarDocs(e.target.checked)}
                />
                <span>Actualizar también los documentos históricos al nuevo NIC</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTrasladarNIC}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Confirmar Traslado de NIC
                </button>
                <button
                  type="button"
                  onClick={() => setShowTraslado(false)}
                  className="px-3 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Listado y Buscador de Clientes */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                cargarClientes(e.target.value, filtroCodser, filtroSector);
              }}
              placeholder="Buscar por NIC, nombre, unidad o medidor..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#016098]"
            />
            <select
              value={filtroCodser}
              onChange={(e) => {
                setFiltroCodser(e.target.value);
                cargarClientes(search, e.target.value, filtroSector);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
            >
              <option value="">Todos los Servicios</option>
              {servicios.map((s) => (
                <option key={s.CodSer} value={s.NombreSer}>{s.NombreSer}</option>
              ))}
            </select>
            <select
              value={filtroSector}
              onChange={(e) => {
                setFiltroSector(e.target.value);
                cargarClientes(search, filtroCodser, e.target.value);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
            >
              <option value="">Todos los Sectores</option>
              <option value="Educacion">Educacion</option>
              <option value="Salud">Salud</option>
              <option value="VTF">VTF</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 mb-2">
            Mostrando {clientes.length} clientes registrados · Haga clic en una fila para editarla.
          </div>

          <div className="overflow-auto max-h-[500px] border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">NIC</th>
                  <th className="py-2.5 px-3">Unidad</th>
                  <th className="py-2.5 px-3">Nombre / Establecimiento</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Medidor</th>
                  <th className="py-2.5 px-3">Sector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">Cargando clientes...</td>
                  </tr>
                ) : clientes.map((c) => (
                  <tr
                    key={`${c.ncliente}-${c.codser}`}
                    onClick={() => seleccionarFila(c)}
                    className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                      String(c.ncliente) === ncliente ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-[#016098]">{c.ncliente}</td>
                    <td className="py-2 px-3 font-medium text-slate-700">{c.codunidad}</td>
                    <td className="py-2 px-3 text-slate-700">
                      <div>{c.nombre}</div>
                      {c.unidadDescripcion && c.unidadDescripcion !== c.nombre && (
                        <div className="text-[10px] text-slate-400">{c.unidadDescripcion}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{c.codser}</td>
                    <td className="py-2 px-3 text-slate-500">{c.nmedidor}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {c.sector}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
