import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const toInputDate = (val: any) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  const d = new Date(val);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1905) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const formatDisplayDate = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1905) return '—';
  return d.toLocaleDateString('es-CL');
};

export const MantencionDocumentos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'historial' | 'facturacion'>('historial');

  const [servicios, setServicios] = useState<any[]>([]);
  const [anios, setAnios] = useState<number[]>([]);

  // Datos compartidos del Cliente seleccionado
  const [codser, setCodser] = useState('');
  const [ncliente, setNcliente] = useState('');
  const [clienteInfo, setClienteInfo] = useState<any>(null);

  // Pestaña 1: Historial (Grilla1)
  const [filtroAnio, setFiltroAnio] = useState('TODOS');
  const [documentosCliente, setDocumentosCliente] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Pestaña 2: Detalle Facturación (GroupBox3 en Documentos.vb)
  const [ndocto, setNdocto] = useState('');
  const [ndoctoOriginal, setNdoctoOriginal] = useState('');
  const [nclienteOriginal, setNclienteOriginal] = useState('');
  const [tipo, setTipo] = useState('FI');
  const [estado, setEstado] = useState('Vigente');
  const [fechaEmision, setFechaEmision] = useState(toInputDate(new Date()));
  const [uLectura, setULectura] = useState('0');
  const [aLectura, setALectura] = useState('0');
  const [fechaLectura, setFechaLectura] = useState(toInputDate(new Date()));
  const [consumo, setConsumo] = useState('0');
  const [fechaProxLec, setFechaProxLec] = useState(toInputDate(new Date()));
  const [fechaVen, setFechaVen] = useState(toInputDate(new Date()));
  const [demanda, setDemanda] = useState('0');
  const [iva, setIva] = useState('0');
  const [intereses, setIntereses] = useState('0');
  const [otro, setOtro] = useState('0');
  const [fechaPago, setFechaPago] = useState(toInputDate(new Date()));
  const [ncpbte, setNcpbte] = useState('0');
  const [monto, setMonto] = useState('0');
  const [nomina, setNomina] = useState('0');
  const [alertaNomina, setAlertaNomina] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  useEffect(() => {
    axios.get('/api/mantencion/catalogos').then((res) => {
      const srvs = res.data.servicios || [];
      setServicios(srvs);
      setAnios(res.data.anios || []);
      if (srvs.length > 0) {
        setCodser(srvs[0].NombreSer);
      }
    });
  }, []);

  const consultarClienteHistorial = async (qServicio = codser, qCliente = ncliente, qAnio = filtroAnio) => {
    if (!qCliente.trim()) {
      setMensaje({ tipo: 'err', texto: 'Ingrese un Nº de Cliente (NIC) para buscar.' });
      return;
    }
    setLoadingHistorial(true);
    setMensaje(null);
    try {
      const res = await axios.get('/api/mantencion/documentos/cliente', {
        params: { codser: qServicio, ncliente: qCliente.trim(), anio: qAnio }
      });
      setClienteInfo(res.data.cliente);
      setCodser(res.data.cliente.codser);
      setNcliente(String(res.data.cliente.ncliente));
      setDocumentosCliente(res.data.documentos || []);
    } catch (err: any) {
      setClienteInfo(null);
      setDocumentosCliente([]);
      setMensaje({
        tipo: 'err',
        texto: err.response?.data?.error || 'Cliente no existe para el servicio seleccionado.'
      });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const cargarDocumentoEnFormulario = (doc: any, cli?: any) => {
    if (cli) {
      setClienteInfo(cli);
      setCodser(cli.codser);
      setNcliente(String(cli.ncliente));
    }
    setNdocto(String(doc.NDocto || '').trim());
    setNdoctoOriginal(String(doc.NDocto || '').trim());
    setNclienteOriginal(String(doc.NCliente || ncliente).trim());
    setTipo(doc.Tipo || 'FI');
    setEstado(doc.Estado || 'Vigente');
    setFechaEmision(toInputDate(doc.FechaEmision));
    setULectura(String(doc.ULectura ?? '0'));
    setALectura(String(doc.ALectura ?? '0'));
    setFechaLectura(toInputDate(doc.FechaLectura));
    setConsumo(String(doc.Consumo ?? 0));
    setFechaProxLec(toInputDate(doc.FechaProxLec));
    setFechaVen(toInputDate(doc.FechaVen));
    setDemanda(String(doc.Demanda ?? 0));
    setIva(String(doc.Iva ?? 0));
    setIntereses(String(doc.Intereses ?? 0));
    setOtro(String(doc.Otro ?? 0));
    setFechaPago(toInputDate(doc.FechaPago));
    setNcpbte(String(doc.NCpbte ?? '0'));
    setMonto(String(doc.Monto ?? 0));
    setNomina(String(doc.Nomina ?? 0));
    setAlertaNomina(
      doc.Nomina && Number(doc.Nomina) !== 0
        ? `Precaución: Esta Boleta o Factura está ingresada en la nómina Nº ${doc.Nomina}`
        : null
    );
    setActiveTab('facturacion');
  };

  const buscarDocumentoPorNumero = async () => {
    if (!ndocto.trim()) {
      setMensaje({ tipo: 'err', texto: 'Ingrese el Nº de Documento (Boleta o Factura) a buscar.' });
      return;
    }
    setMensaje(null);
    try {
      const res = await axios.get('/api/mantencion/documentos/buscar', {
        params: { ndocto: ndocto.trim(), codser, ncliente: ncliente.trim() || undefined }
      });
      const d = res.data.documento;
      cargarDocumentoEnFormulario(d, {
        ncliente: d.NCliente,
        codunidad: d.codunidad,
        unidadDescripcion: d.unidadDescripcion,
        nombre: d.nombre,
        nmedidor: d.nmedidor,
        codser: d.codser,
        nombreServicio: d.nombreServicio,
        sector: d.sector
      });
      setMensaje({ tipo: 'ok', texto: `Documento Nº ${d.NDocto} cargado para edición.` });
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'No existe el documento consultado.' });
    }
  };

  const limpiarFacturacion = () => {
    setNdocto('');
    setNdoctoOriginal('');
    setNclienteOriginal('');
    setTipo('FI');
    setEstado('Vigente');
    const hoy = toInputDate(new Date());
    setFechaEmision(hoy);
    setULectura('0');
    setALectura('0');
    setFechaLectura(hoy);
    setConsumo('0');
    setFechaProxLec(hoy);
    setFechaVen(hoy);
    setDemanda('0');
    setIva('0');
    setIntereses('0');
    setOtro('0');
    setFechaPago(hoy);
    setNcpbte('0');
    setMonto('0');
    setNomina('0');
    setAlertaNomina(null);
    setMensaje(null);
  };

  const handleGuardarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      const res = await axios.post('/api/mantencion/documentos', {
        NDocto: ndocto,
        NCliente: ncliente,
        Monto: Number(monto) || 0,
        Estado: estado,
        Tipo: tipo,
        ULectura: uLectura,
        ALectura: aLectura,
        FechaLectura: fechaLectura,
        Consumo: Number(consumo) || 0,
        FechaEmision: fechaEmision,
        FechaPago: fechaPago,
        NCpbte: ncpbte,
        Demanda: Number(demanda) || 0,
        Iva: Number(iva) || 0,
        Intereses: Number(intereses) || 0,
        Otro: Number(otro) || 0,
        FechaVen: fechaVen,
        FechaProxLec: fechaProxLec,
        Nomina: Number(nomina) || 0,
        NDoctoOriginal: ndoctoOriginal || undefined,
        NClienteOriginal: nclienteOriginal || undefined
      });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      setNdoctoOriginal(ndocto.trim());
      setNclienteOriginal(ncliente.trim());
      if (ncliente.trim()) {
        consultarClienteHistorial(codser, ncliente, filtroAnio);
      }
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al guardar el documento.' });
    }
  };

  const handleEliminarDocumento = async () => {
    if (!ndocto.trim() || !ncliente.trim()) {
      setMensaje({ tipo: 'err', texto: 'Seleccione o busque primero un documento válido para eliminar.' });
      return;
    }
    if (!window.confirm(`¿Está seguro que desea eliminar el documento Nº ${ndocto} del cliente NIC ${ncliente}?`)) {
      return;
    }
    setMensaje(null);
    try {
      const res = await axios.delete('/api/mantencion/documentos', {
        params: { ndocto: ndocto.trim(), ncliente: ncliente.trim(), nomina: Number(nomina) || 0 }
      });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      limpiarFacturacion();
      if (ncliente.trim()) {
        consultarClienteHistorial(codser, ncliente, filtroAnio);
      }
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al eliminar el documento.' });
    }
  };

  const exportarHistorialExcel = () => {
    if (documentosCliente.length === 0) return;
    const rows = documentosCliente.map((d) => ({
      'Nº Cliente': d.NCliente,
      'Unidad': clienteInfo?.codunidad || '',
      'Establecimiento': clienteInfo?.nombre || '',
      'Servicio': clienteInfo?.codser || codser,
      'Nº Docto': d.NDocto,
      'Tipo': d.Tipo,
      'Fecha Emisión': formatDisplayDate(d.FechaEmision),
      'Monto ($)': d.Monto,
      'Consumo': d.Consumo,
      'Últ. Lectura': d.ULectura,
      'Ant. Lectura': d.ALectura,
      'Fecha Lectura': formatDisplayDate(d.FechaLectura),
      'Fecha Venc.': formatDisplayDate(d.FechaVen),
      'Fecha Pago': formatDisplayDate(d.FechaPago),
      'Nº Cpbte': d.NCpbte,
      'Estado': d.Estado,
      'Nº Nómina': d.Nomina
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Consumo');
    XLSX.writeFile(wb, `Historial_NIC_${ncliente}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalMontoHistorial = documentosCliente.reduce((acc, d) => acc + (d.Monto || 0), 0);
  const totalConsumoHistorial = documentosCliente.reduce((acc, d) => acc + (d.Consumo || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Selector de Pestañas (TabControl1 de Documentos.vb) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Documentos y Detalle de Facturación</h1>
          <p className="text-xs text-slate-500">
            Consulta histórica de consumos por medidor (NIC) e ingreso, modificación o eliminación de boletas y facturas.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-[#016098] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Datos Servicio e Historial (NIC)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facturacion')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'facturacion'
                ? 'bg-[#016098] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Detalle Facturación (Ingreso / Edición)
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between print:hidden ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="text-xs font-bold underline ml-4">Cerrar</button>
        </div>
      )}

      {/* Barra Superior de Identificación del Cliente / Medidor */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Servicio Básico</label>
            <select
              value={codser}
              onChange={(e) => setCodser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#016098]"
            >
              {servicios.map((s) => (
                <option key={s.CodSer} value={s.NombreSer}>
                  {s.NombreSer} (Cód. {s.CodSer})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Nº de Cliente (NIC)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ncliente}
                onChange={(e) => setNcliente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && consultarClienteHistorial(codser, ncliente, filtroAnio)}
                placeholder="Ej. 566702"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-[#016098] focus:outline-none focus:ring-2 focus:ring-[#016098]"
              />
              <button
                type="button"
                onClick={() => consultarClienteHistorial(codser, ncliente, filtroAnio)}
                className="px-4 py-2 bg-[#016098] hover:bg-[#014770] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer print:hidden"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Unidad</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 truncate">
              {clienteInfo ? `${clienteInfo.codunidad} (${clienteInfo.sector})` : '—'}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Establecimiento</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 truncate">
              {clienteInfo?.nombre || clienteInfo?.unidadDescripcion || '—'}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nº Medidor</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 truncate">
              {clienteInfo?.nmedidor || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑA 1: HISTORIAL DE DOCUMENTOS POR NIC (TabPage1 de Documentos.vb) */}
      {activeTab === 'historial' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600">Filtrar por Año Emisión:</label>
              <select
                value={filtroAnio}
                onChange={(e) => {
                  setFiltroAnio(e.target.value);
                  if (ncliente.trim()) {
                    consultarClienteHistorial(codser, ncliente, e.target.value);
                  }
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50"
              >
                <option value="TODOS">Todos los Años</option>
                {anios.map((a) => (
                  <option key={a} value={String(a)}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  limpiarFacturacion();
                  setActiveTab('facturacion');
                }}
                className="px-4 py-2 bg-[#39BABD] hover:bg-[#2da3a6] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                + Ingresar Nuevo Documento
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={documentosCliente.length === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Imprimir Historial
              </button>
              <button
                type="button"
                onClick={exportarHistorialExcel}
                disabled={documentosCliente.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Nº Docto</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">F. Emisión</th>
                  <th className="py-2.5 px-3 text-right">Monto ($)</th>
                  <th className="py-2.5 px-3 text-right">Consumo</th>
                  <th className="py-2.5 px-3 text-right">Últ. Lec.</th>
                  <th className="py-2.5 px-3 text-right">Ant. Lec.</th>
                  <th className="py-2.5 px-3">F. Lectura</th>
                  <th className="py-2.5 px-3">F. Venc.</th>
                  <th className="py-2.5 px-3">F. Pago</th>
                  <th className="py-2.5 px-3">Nº Cpbte</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-center">Nómina</th>
                  <th className="py-2.5 px-3 text-center print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistorial ? (
                  <tr>
                    <td colSpan={14} className="py-10 text-center text-slate-400">
                      Consultando historial de documentos...
                    </td>
                  </tr>
                ) : documentosCliente.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-10 text-center text-slate-400">
                      Seleccione un Servicio e ingrese un Nº de Cliente (NIC) para visualizar su historial de facturación.
                    </td>
                  </tr>
                ) : (
                  documentosCliente.map((d, idx) => (
                    <tr key={`${d.NDocto}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-[#016098]">{d.NDocto}</td>
                      <td className="py-2 px-3 font-semibold">{d.Tipo}</td>
                      <td className="py-2 px-3">{formatDisplayDate(d.FechaEmision)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        ${Number(d.Monto || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {Number(d.Consumo || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">{d.ULectura}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{d.ALectura}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDisplayDate(d.FechaLectura)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDisplayDate(d.FechaVen)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatDisplayDate(d.FechaPago)}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{d.NCpbte}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.Estado === 'Autorizada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : d.Estado === 'Enviada'
                              ? 'bg-blue-100 text-blue-700'
                              : d.Estado === 'Nulo'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {d.Estado}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-700">{d.Nomina || 0}</td>
                      <td className="py-2 px-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => cargarDocumentoEnFormulario(d)}
                          className="text-xs font-bold text-[#016098] hover:underline cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {documentosCliente.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                      Totales ({documentosCliente.length} doctos):
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#016098]">
                      ${totalMontoHistorial.toLocaleString('es-CL')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {totalConsumoHistorial.toLocaleString('es-CL')}
                    </td>
                    <td colSpan={9}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: DETALLE DE FACTURACIÓN - INGRESO / EDICIÓN / ELIMINACIÓN (TabPage2 de Documentos.vb) */}
      {activeTab === 'facturacion' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-5">
          {alertaNomina && (
            <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm font-bold flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{alertaNomina}</span>
            </div>
          )}

          <form onSubmit={handleGuardarDocumento} className="space-y-5">
            {/* Bloque 1: Datos principales del documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nº Documento (Boleta / Factura) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ndocto}
                    onChange={(e) => setNdocto(e.target.value)}
                    placeholder="Ej. 1928374"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#016098]"
                    required
                  />
                  <button
                    type="button"
                    onClick={buscarDocumentoPorNumero}
                    className="px-3 py-2 bg-[#39BABD] hover:bg-[#2da3a6] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Buscar Docto
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Emisión *</label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo Documento *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="FI">FI — Factura</option>
                  <option value="OT">OT — Boleta / Otro</option>
                  <option value="NC">NC — Nota de Crédito</option>
                  <option value="ND">ND — Nota de Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Enviada">Enviada</option>
                  <option value="Autorizada">Autorizada</option>
                  <option value="Nulo">Nulo</option>
                </select>
              </div>
            </div>

            {/* Bloque 2: Lecturas y Fechas de Medición */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#016098] mb-3">
                Registro de Lecturas y Consumo Físico
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Última Lectura</label>
                  <input
                    type="text"
                    value={uLectura}
                    onChange={(e) => {
                      const val = e.target.value;
                      setULectura(val);
                      const u = Number(val);
                      const a = Number(aLectura);
                      if (!isNaN(u) && !isNaN(a) && u >= a) {
                        setConsumo(String(u - a));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Anterior Lectura</label>
                  <input
                    type="text"
                    value={aLectura}
                    onChange={(e) => {
                      const val = e.target.value;
                      setALectura(val);
                      const u = Number(uLectura);
                      const a = Number(val);
                      if (!isNaN(u) && !isNaN(a) && u >= a) {
                        setConsumo(String(u - a));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Consumo Calculado</label>
                  <input
                    type="number"
                    value={consumo}
                    onChange={(e) => setConsumo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-blue-50/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Lectura</label>
                  <input
                    type="date"
                    value={fechaLectura}
                    onChange={(e) => setFechaLectura(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Próxima Lectura</label>
                  <input
                    type="date"
                    value={fechaProxLec}
                    onChange={(e) => setFechaProxLec(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVen}
                    onChange={(e) => setFechaVen(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bloque 3: Montos, Cargos, Pago y Nómina */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#016098] mb-3">
                Valores Facturados, Comprobante de Pago y Nómina
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Demanda ($)</label>
                  <input
                    type="number"
                    value={demanda}
                    onChange={(e) => setDemanda(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">IVA ($)</label>
                  <input
                    type="number"
                    value={iva}
                    onChange={(e) => setIva(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Intereses ($)</label>
                  <input
                    type="number"
                    value={intereses}
                    onChange={(e) => setIntereses(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Otros Cargos ($)</label>
                  <input
                    type="number"
                    value={otro}
                    onChange={(e) => setOtro(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nº Comprobante (NCpbte)</label>
                  <input
                    type="text"
                    value={ncpbte}
                    onChange={(e) => setNcpbte(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nº Nómina Asignada</label>
                  <input
                    type="number"
                    value={nomina}
                    onChange={(e) => setNomina(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#016098] mb-1">MONTO TOTAL FACTURADO ($) *</label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#016098] rounded-lg text-base font-extrabold text-[#016098] bg-blue-50/30"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botonera Inferior (Grabar, Limpiar, Eliminar) */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#016098] hover:bg-[#014770] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Grabar / Actualizar Documento
                </button>
                <button
                  type="button"
                  onClick={limpiarFacturacion}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Limpiar Campos
                </button>
              </div>

              <button
                type="button"
                onClick={handleEliminarDocumento}
                className="px-5 py-2.5 bg-[#EB567F] hover:bg-[#d6456d] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Eliminar Documento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
