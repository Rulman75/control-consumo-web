import React, { useEffect, useState } from 'react';
import axios from 'axios';

export const MantencionServicios: React.FC = () => {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [codSer, setCodSer] = useState('');
  const [nombreSer, setNombreSer] = useState('');
  const [contacto, setContacto] = useState('');
  const [rut, setRut] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [cuenta2, setCuenta2] = useState('');
  const [descCuenta2, setDescCuenta2] = useState('');

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const cargarServicios = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/mantencion/servicios');
      setServicios(res.data || []);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const seleccionarServicio = (s: any) => {
    setCodSer(s.CodSer || '');
    setNombreSer(s.NombreSer || '');
    setContacto(s.Contacto || '');
    setRut(s.Rut || '');
    setCuenta(s.Cuenta || '');
    setCuenta2(s.Cuenta2 || '');
    setDescCuenta2(s.DescCuenta2 || '');
    setMensaje(null);
  };

  const limpiar = () => {
    setCodSer('');
    setNombreSer('');
    setContacto('');
    setRut('');
    setCuenta('');
    setCuenta2('');
    setDescCuenta2('');
    setMensaje(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      const res = await axios.post('/api/mantencion/servicios', {
        CodSer: codSer,
        NombreSer: nombreSer,
        Contacto: contacto,
        Rut: rut,
        Cuenta: cuenta,
        Cuenta2: cuenta2,
        DescCuenta2: descCuenta2
      });
      setMensaje({ tipo: 'ok', texto: res.data.message });
      cargarServicios();
    } catch (err: any) {
      setMensaje({ tipo: 'err', texto: err.response?.data?.error || 'Error al guardar el servicio' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">Mantención de Empresas de Servicios Básicos</h1>
        <p className="text-xs text-slate-500">
          Administración de códigos de servicio, RUT auxiliar de proveedor y cuentas contables para interfaz Softland.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario Frm_Servicios.vb */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#016098] border-b border-slate-100 pb-3">
            Datos del Servicio Básico
          </h2>

          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código Servicio *</label>
                <input
                  type="text"
                  value={codSer}
                  onChange={(e) => setCodSer(e.target.value)}
                  placeholder="Ej. AGUAS, ELECDA, VTR"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RUT Proveedor (Auxiliar Softland)</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="Ej. 96505760"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Empresa de Servicio *</label>
              <input
                type="text"
                value={nombreSer}
                onChange={(e) => setNombreSer(e.target.value)}
                placeholder="Ej. AGUAS ANTOFAGASTA S.A."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contacto / Glosa Procedencia</label>
              <input
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ej. Ejecutivo / Glosa de servicio"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cuenta Gasto (Debe)</label>
                <input
                  type="text"
                  value={cuenta}
                  onChange={(e) => setCuenta(e.target.value)}
                  placeholder="Ej. 5-1-02-002"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cuenta Pasivo (Haber)</label>
                <input
                  type="text"
                  value={cuenta2}
                  onChange={(e) => setCuenta2(e.target.value)}
                  placeholder="Ej. 2-1-02-002"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Cuenta Pasivo</label>
              <input
                type="text"
                value={descCuenta2}
                onChange={(e) => setDescCuenta2(e.target.value)}
                placeholder="Ej. ACREEDORES VARIOS"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#016098]"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#016098] hover:bg-[#014770] text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Grabar / Actualizar Servicio
              </button>
              <button
                type="button"
                onClick={limpiar}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de Servicios Registrados */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Catálogo de Servicios Activos ({servicios.length})
            </h2>
            <span className="text-[11px] text-slate-400">Haga clic en un servicio para editarlo</span>
          </div>

          <div className="overflow-auto max-h-[500px] border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nombre Servicio</th>
                  <th className="py-2.5 px-3">RUT Auxiliar</th>
                  <th className="py-2.5 px-3">Cta. Gasto</th>
                  <th className="py-2.5 px-3">Cta. Pasivo</th>
                  <th className="py-2.5 px-3 text-right">Medidores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Cargando servicios...</td>
                  </tr>
                ) : servicios.map((s) => (
                  <tr
                    key={s.CodSer}
                    onClick={() => seleccionarServicio(s)}
                    className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                      s.CodSer === codSer ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#016098]">{s.CodSer}</td>
                    <td className="py-2.5 px-3 text-slate-800">{s.NombreSer}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{s.Rut || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{s.Cuenta || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{s.Cuenta2 || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{s.TotalClientes || 0}</td>
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
