import React, { useState, useEffect } from "react";
import {
  obtenerHistorialSeguimiento,
  obtenerHistorialReservas,
} from "../../services/api";
import Alert from "../../components/common/Alert";

export default function HistoryAdminPage() {
  const [activeTab, setActiveTab] = useState("seguimiento");
  const [seguimiento, setSeguimiento] = useState([]);
  const [reservasHist, setReservasHist] = useState([]);
  
  const [filtroSeguimiento, setFiltroSeguimiento] = useState("");
  const [filtroHistReserva, setFiltroHistReserva] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  async function cargarHistorial() {
    setLoading(true);
    try {
      const [resSeg, resRes] = await Promise.allSettled([
        obtenerHistorialSeguimiento(),
        obtenerHistorialReservas(),
      ]);

      if (resSeg.status === "fulfilled" && Array.isArray(resSeg.value)) {
        setSeguimiento(resSeg.value);
      }
      if (resRes.status === "fulfilled" && Array.isArray(resRes.value)) {
        setReservasHist(resRes.value);
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar historial." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cambiarTab = (tab) => {
    setActiveTab(tab);
  };

  const limpiarFiltroSeg = () => {
    setFiltroSeguimiento("");
  };

  const segFiltrado = seguimiento.filter((s) => {
    const q = filtroSeguimiento.toLowerCase();
    return !q || (s.accion && s.accion.toLowerCase().includes(q)) || (s.producto && s.producto.toLowerCase().includes(q));
  });

  const resFiltradas = reservasHist.filter((r) => {
    const q = filtroHistReserva.toLowerCase();
    return !q || (r.estado && r.estado.toLowerCase().includes(q)) || (r.estado_nuevo && r.estado_nuevo.toLowerCase().includes(q));
  });

  const hoy = new Date().toISOString().slice(0, 10);
  const registrosHoy = seguimiento.filter(s => s.fecha && s.fecha.startsWith(hoy)).length;

  const renderSeguimiento = () => (
    <div id="seccion-seguimiento">
      <div className="barra-filtro margen-top-24">
        <input type="text" className="campo-input" placeholder="Buscar por producto o accion..." value={filtroSeguimiento} onChange={e => setFiltroSeguimiento(e.target.value)} />
        <button className="btn-verde btn-borde" onClick={limpiarFiltroSeg}>Limpiar</button>
      </div>
      <table className="tabla-datos">
        <thead>
          <tr>
            <th>ID</th>
            <th>Accion Registrada</th>
            <th>Lote (ID)</th>
            <th>Producto</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="5" className="celda-vacia">Cargando...</td></tr>
          ) : segFiltrado.length === 0 ? (
            <tr><td colSpan="5" className="celda-vacia">Sin registros</td></tr>
          ) : (
            segFiltrado.map((h) => (
              <tr key={h.id}>
                <td>{h.id}</td>
                <td>{h.accion || h.estado || ''}</td>
                <td>{h.lote_id || h.lote ? `Lote #${h.lote_id || h.lote}` : '—'}</td>
                <td>{h.producto || h.observaciones || ''}</td>
                <td>{h.fecha || ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderHistReservas = () => (
    <div id="seccion-hist-reservas">
      <div className="barra-filtro margen-top-24">
        <input type="text" className="campo-input" placeholder="Buscar por estado..." value={filtroHistReserva} onChange={e => setFiltroHistReserva(e.target.value)} />
      </div>
      <table className="tabla-datos">
        <thead>
          <tr>
            <th>ID</th>
            <th>Reserva ID</th>
            <th>Estado Registrado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="4" className="celda-vacia">Cargando...</td></tr>
          ) : resFiltradas.length === 0 ? (
            <tr><td colSpan="4" className="celda-vacia">Sin registros</td></tr>
          ) : (
            resFiltradas.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.reserva_id || r.reservaId || ''}</td>
                <td>{r.estado_nuevo || r.estado || ''}</td>
                <td>{r.fecha || ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Historial de Actividad <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Seguimiento de cultivos y estados de reservas registrados en la plataforma</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="📋">
          <div className="stat-numero">{loading ? "..." : seguimiento.length + reservasHist.length}</div>
          <div className="stat-etiqueta">Registros Totales</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🌱">
          <div className="stat-numero">{loading ? "..." : seguimiento.length}</div>
          <div className="stat-etiqueta">Seguimiento Lotes</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="📦">
          <div className="stat-numero">{loading ? "..." : reservasHist.length}</div>
          <div className="stat-etiqueta">Estados Reservas</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="📅">
          <div className="stat-numero">{loading ? "..." : registrosHoy}</div>
          <div className="stat-etiqueta">Registros Hoy</div>
        </div>
      </div>

      <div className="tabs-historial margen-top-24">
        <button
          className={`btn-tab ${activeTab === "seguimiento" ? "activo" : ""}`}
          onClick={() => cambiarTab("seguimiento")}
        >
          🌱 Seguimiento de Cultivos
        </button>
        <button
          className={`btn-tab ${activeTab === "reservas" ? "activo" : ""}`}
          onClick={() => cambiarTab("reservas")}
        >
          📋 Estados de Reservas
        </button>
      </div>

      {activeTab === "seguimiento" ? renderSeguimiento() : renderHistReservas()}

    </>
  );
}
