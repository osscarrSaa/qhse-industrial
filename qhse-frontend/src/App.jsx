import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function App() {
  const [seguridadTipo, setSeguridadTipo] = useState({});
  const [seguridadSector, setSeguridadSector] = useState([]);
  const [calidadResumen, setCalidadResumen] = useState({ por_origen: {}, por_estado: {} });
  const [listaIncidentes, setListaIncidentes] = useState([]);
  const [listaCalidad, setListaCalidad] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroGravedad, setFiltroGravedad] = useState('Todos');
  const [filtroOrigenCal, setFiltroOrigenCal] = useState('Todos');

  const [sectorIdSeg, setSectorIdSeg] = useState('');
  const [sectorIdCal, setSectorIdCal] = useState('');
  const [tipoEvento, setTipoEvento] = useState('Condición Insegura');
  const [gravedad, setGravedad] = useState('Baja');
  const [descripcionSeg, setDescripcionSeg] = useState('');
  const [origenCalidad, setOrigenCalidad] = useState('Interno');
  const [tipoDefecto, setTipoDefecto] = useState('Dimensional');
  const [cantidadAfectada, setCantidadAfectada] = useState('1');
  const [descripcionCal, setDescripcionCal] = useState('');

  // ESTADOS PARA EL MODAL DE GESTIÓN (PLAN DE ACCIÓN)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null); // Guarda el objeto a gestionar
  const [tipoSeleccionado, setTipoSeleccionado] = useState(''); // 'seguridad' o 'calidad'
  const [gestionEstado, setGestionEstado] = useState('Abierto');
  const [gestionResponsable, setGestionResponsable] = useState('');
  const [gestionAccion, setGestionAccion] = useState('');

  const fetchAllData = async () => {
    try {
      const resTipo = await axios.get('http://127.0.0.1:8000/api/v1/analytics/seguridad/por-tipo');
      const resSector = await axios.get('http://127.0.0.1:8000/api/v1/analytics/seguridad/por-sector');
      const resCalidad = await axios.get('http://127.0.0.1:8000/api/v1/analytics/calidad/resumen');
      const resListaSeg = await axios.get('http://127.0.0.1:8000/api/v1/seguridad/incidentes');
      const resListaCal = await axios.get('http://127.0.0.1:8000/api/v1/calidad/reportes');
      const resSectores = await axios.get('http://127.0.0.1:8000/api/v1/sectores');

      setSeguridadTipo(resTipo.data || {});
      setSeguridadSector(Array.isArray(resSector.data) ? resSector.data : []);
      setCalidadResumen(resCalidad.data || { por_origen: {}, por_estado: {} });
      setListaIncidentes(Array.isArray(resListaSeg.data) ? resListaSeg.data : []);
      setListaCalidad(Array.isArray(resListaCal.data) ? resListaCal.data : []);
      
      const listaDeSectores = Array.isArray(resSectores.data) ? resSectores.data : [];
      setSectores(listaDeSectores);

      if (listaDeSectores.length > 0) {
        setSectorIdSeg(listaDeSectores[0].id.toString());
        setSectorIdCal(listaDeSectores[0].id.toString());
      }
      setLoading(false);
    } catch (error) {
      console.error("Error al sincronizar datos:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSubmitIncidente = async (e) => {
    e.preventDefault();
    if (!descripcionSeg.trim()) return alert("Por favor, escribí una descripción");
    try {
      await axios.post('http://127.0.0.1:8000/api/v1/seguridad/incidentes', {
        sector_id: parseInt(sectorIdSeg),
        tipo_evento: tipoEvento,
        gravedad: gravedad,
        descripcion: descripcionSeg,
        // Agregamos estos tres campos por defecto para que el backend acepte el registro:
        estado: "Abierto",
        responsable: "No Asignado",
        accion_correctiva: ""
      });
      alert("¡Incidente reportado!");
      setDescripcionSeg('');
      fetchAllData(); // Esto va a revivir los gráficos al instante
    } catch (error) {
      console.error(error);
      alert("Error al guardar incidente. Revisá la consola del backend.");
    }
  };

  const handleSubmitCalidad = async (e) => {
    e.preventDefault();
    if (!descripcionCal.trim()) return alert("Por favor, describí el desvío");
    try {
      await axios.post('http://127.0.0.1:8000/api/v1/calidad/reportes', {
        sector_id: parseInt(sectorIdCal),
        origen: origenCalidad,
        tipo_defecto: tipoDefecto,
        descripcion: descripcionCal,
        cantidad_afectada: parseInt(cantidadAfectada),
        // Campos obligatorios para el backend de estreno:
        estado: "Abierto",
        responsable: "No Asignado",
        accion_correctiva: ""
      });
      alert("¡Reporte de Calidad asentado!");
      setDescripcionCal('');
      setCantidadAfectada('1');
      fetchAllData();
    } catch (error) {
      console.error(error);
      alert("Error al guardar reporte de calidad.");
    }
  };

  // CONTROLADOR PARA ABRIR MODAL CON DATOS
  const abrirGestion = (item, tipo) => {
    setItemSeleccionado(item);
    setTipoSeleccionado(tipo);
    setGestionEstado(item.estado || 'Abierto');
    setGestionResponsable(item.responsable === 'No Asignado' ? '' : item.responsable || '');
    setGestionAccion(item.accion_correctiva || '');
    setModalAbierto(true);
  };

  // CONTROLADOR PARA ENVIAR ACTUALIZACIÓN AL BACKEND
  const handleGuardarGestion = async (e) => {
    e.preventDefault();
    const url = tipoSeleccionado === 'seguridad' 
      ? `http://127.0.0.1:8000/api/v1/seguridad/incidentes/${itemSeleccionado.id}`
      : `http://127.0.0.1:8000/api/v1/calidad/reportes/${itemSeleccionado.id}`;

    try {
      await axios.put(url, {
        estado: gestionEstado,
        responsable: gestionResponsable.trim() || 'No Asignado',
        accion_correctiva: gestionAccion.trim()
      });
      alert("Gestión guardada y registrada con éxito.");
      setModalAbierto(false);
      fetchAllData();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar la gestión en el servidor.");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-sans text-xl">Sincronizando paneles con Tailwind...</div>;

  const incidentesFiltrados = listaIncidentes.filter(item => filtroGravedad === 'Todos' || item.gravedad === filtroGravedad);
  const calidadFiltrada = listaCalidad.filter(item => filtroOrigenCal === 'Todos' || item.origen === filtroOrigenCal);

  const seguridadLabels = Object.keys(seguridadTipo || {});
  const pieData = {
    labels: seguridadLabels.length ? seguridadLabels : ["Sin datos"],
    datasets: [{ data: seguridadLabels.length ? Object.values(seguridadTipo) : [0], backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6'] }]
  };

  const obtenerNombreSector = (id) => {
    const sec = sectores.find(s => s.id === id);
    return sec ? sec.nombre : `Sector ${id}`;
  };

  const barData = {
    labels: seguridadSector.map(item => item.sector || `Sector ${item.sector_id}`),
    datasets: [{ label: 'Cantidad de Incidentes', data: seguridadSector.map(item => item.cantidad || 0), backgroundColor: '#3b82f6' }]
  };

  // FUNCIÓN AUXILIAR PARA DISEÑO DE ETIQUETAS DE ESTADO
  const renderBadgeEstado = (estado) => {
    if (estado === 'Cerrado') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (estado === 'En Proceso' || estado === 'Pendiente') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6" translate="no" lang="es">
      {/* HEADER */}
      <header className="border-b border-slate-800 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Panel de Control Industrial (QHSE)</h1>
          <p className="text-slate-400 text-sm mt-1">Monitoreo operativo y gestión preventiva en tiempo real</p>
        </div>
        <span className="bg-slate-800 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono border border-slate-700">Sistemas Online</span>
      </header>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Calidad (Interna)</h3>
          <p className="text-4xl font-black mt-2 text-emerald-400">{calidadResumen?.por_origen?.Interno || 0}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Reclamos Clientes</h3>
          <p className="text-4xl font-black mt-2 text-amber-400">{calidadResumen?.por_origen?.Cliente || 0}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Incidentes Registrados</h3>
          <p className="text-4xl font-black mt-2 text-red-400">{seguridadSector.reduce((acc, item) => acc + (item.cantidad || 0), 0)}</p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold mb-4 text-slate-200">🟢 Distribución de Incidentes</h3>
          <div className="max-w-[260px] mx-auto">
            <Pie data={pieData} options={{ plugins: { legend: { labels: { color: '#cbd5e1' } } } }} />
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold mb-4 text-slate-200">📊 Ranking por Sector</h3>
          <div className="max-w-full overflow-x-auto">
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { x: { grid: { color: '#334155' }, ticks: { color: '#cbd5e1' } }, y: { grid: { color: '#334155' }, ticks: { color: '#cbd5e1' } } } }} />
          </div>
        </div>
      </div>

      {/* FORMULARIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Formulario Seguridad */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-red-400 mb-4">🚨 Registrar Incidente</h2>
          <form onSubmit={handleSubmitIncidente} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Sector:</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500" value={sectorIdSeg} onChange={(e) => setSectorIdSeg(e.target.value)}>
                {sectores.map(sec => <option key={sec.id} value={sec.id}>{sec.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tipo:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none" value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)}>
                  <option value="Condición Insegura">Condición Insegura</option>
                  <option value="Casi-Accidente">Casi-Accidente</option>
                  <option value="Accidente">Accidente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Gravedad:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none" value={gravedad} onChange={(e) => setGravedad(e.target.value)}>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descripción:</label>
              <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 h-20 resize-none" value={descripcionSeg} onChange={(e) => setDescripcionSeg(e.target.value)} placeholder="Describa la anomalía física..." />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 font-bold p-3 rounded-lg text-sm transition-colors uppercase tracking-wider">Enviar Reporte Seguridad</button>
          </form>
        </div>

        {/* Formulario Calidad */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-blue-400 mb-4">📋 No Conformidad / Desvío</h2>
          <form onSubmit={handleSubmitCalidad} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Sector:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none" value={sectorIdCal} onChange={(e) => setSectorIdCal(e.target.value)}>
                  {sectores.map(sec => <option key={sec.id} value={sec.id}>{sec.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Origen:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none" value={origenCalidad} onChange={(e) => setOrigenCalidad(e.target.value)}>
                  <option value="Interno">Interno</option>
                  <option value="Cliente">Cliente</option>
                  <option value="Proveedor">Proveedor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tipo de Defecto:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none" value={tipoDefecto} onChange={(e) => setTipoDefecto(e.target.value)}>
                  <option value="Dimensional">Dimensional</option>
                  <option value="Estético">Estético</option>
                  <option value="Funcional">Funcional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Cantidad:</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200" value={cantidadAfectada} onChange={(e) => setCantidadAfectada(e.target.value)} min="1" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descripción de la Falla:</label>
              <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 h-20 resize-none" value={descripcionCal} onChange={(e) => setDescripcionCal(e.target.value)} placeholder="Detalle técnico..." />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold p-3 rounded-lg text-sm transition-colors uppercase tracking-wider">Registrar Falla Calidad</button>
          </form>
        </div>
      </div>

      {/* TABLAS DETALLADAS CON GESTIÓN INTEGRADA */}
      <div className="space-y-6">
        {/* Historial Seguridad */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-red-400">📋 Historial de Incidentes (Seguridad)</h2>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-slate-400 font-medium">Gravedad:</span>
              {['Todos', 'Baja', 'Media', 'Alta'].map(g => (
                <button key={g} onClick={() => setFiltroGravedad(g)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${filtroGravedad === g ? 'bg-red-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}>{g}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900 text-slate-400 uppercase text-xs font-bold">
                  <th className="p-3">ID</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Tipo de Evento</th>
                  <th className="p-3">Gravedad</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Acción Correctiva</th>
                  <th className="p-3 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {incidentesFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="p-3 text-slate-500 font-mono">#{item.id}</td>
                    <td className="p-3 font-semibold text-slate-200">{obtenerNombreSector(item.sector_id)}</td>
                    <td className="p-3 text-slate-300">{item.tipo_evento}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${item.gravedad === 'Alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : item.gravedad === 'Media' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {item.gravedad}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 max-w-[200px] truncate" title={item.descripcion}>{item.descripcion}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${renderBadgeEstado(item.estado)}`}>
                        {item.estado || 'Abierto'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{item.responsable || 'No Asignado'}</td>
                    <td className="p-3 text-slate-400 max-w-[150px] truncate" title={item.accion_correctiva}>{item.accion_correctiva || '---'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => abrirGestion(item, 'seguridad')} className="bg-slate-900 border border-slate-700 hover:border-red-500 hover:text-red-400 text-slate-300 text-xs font-bold px-2.5 py-1 rounded transition-colors">
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial Calidad */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-xl font-bold text-blue-400">📋 Historial de No Conformidades (Calidad)</h2>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-slate-400 font-medium">Origen:</span>
              {['Todos', 'Interno', 'Cliente', 'Proveedor'].map(o => (
                <button key={o} onClick={() => setFiltroOrigenCal(o)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${filtroOrigenCal === o ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}>{o}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900 text-slate-400 uppercase text-xs font-bold">
                  <th className="p-3">ID</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Origen</th>
                  <th className="p-3">Tipo Defecto</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Acción Correctiva</th>
                  <th className="p-3 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {calidadFiltrada.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="p-3 text-slate-500 font-mono">#{item.id}</td>
                    <td className="p-3 font-semibold text-slate-200">{obtenerNombreSector(item.sector_id)}</td>
                    <td className="p-3 text-slate-300 font-medium">{item.origen}</td>
                    <td className="p-3 text-slate-400">{item.tipo_defecto}</td>
                    <td className="p-3 text-blue-400 font-mono font-bold">{item.cantidad_afectada} u.</td>
                    <td className="p-3 text-slate-400 max-w-[180px] truncate" title={item.descripcion}>{item.descripcion}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${renderBadgeEstado(item.estado)}`}>
                        {item.estado || 'Abierto'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{item.responsable || 'No Asignado'}</td>
                    <td className="p-3 text-slate-400 max-w-[150px] truncate" title={item.accion_correctiva}>{item.accion_correctiva || '---'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => abrirGestion(item, 'calidad')} className="bg-slate-900 border border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-300 text-xs font-bold px-2.5 py-1 rounded transition-colors">
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL FLOTANTE DE GESTIÓN (PLAN DE ACCIÓN - CAPA) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-xl p-6 shadow-2xl relative">
            <header className="mb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                📂 Gestionar {tipoSeleccionado === 'seguridad' ? 'Incidente' : 'No Conformidad'} #{itemSeleccionado?.id}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Asigne un responsable y el plan de acción técnica.</p>
            </header>

            <form onSubmit={handleGuardarGestion} className="space-y-4">
              {/* CAMPO ESTADO */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Estado Operativo:</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none" value={gestionEstado} onChange={(e) => setGestionEstado(e.target.value)}>
                  <option value="Abierto">🔴 Abierto (Pendiente)</option>
                  <option value="En Proceso">🟡 En Proceso (Asignado)</option>
                  <option value="Cerrado">🟢 Cerrado / Solucionado</option>
                </select>
              </div>

              {/* CAMPO RESPONSABLE */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Responsable de Ejecución:</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" value={gestionResponsable} onChange={(e) => setGestionResponsable(e.target.value)} placeholder="Ej: Ing. Juan Pérez" required />
              </div>

              {/* CAMPO ACCIÓN CORRECTIVA */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Plan de Acción / Medida Correctiva:</label>
                <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 h-24 resize-none focus:outline-none focus:border-blue-500" value={gestionAccion} onChange={(e) => setGestionAccion(e.target.value)} placeholder="Detalle la acción correctiva ejecutada o planificada para mitigar el desvío..." />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)} className="bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-md">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;