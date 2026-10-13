import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/authContexto";
import {
  obtenerLotes,
  obtenerHistorialSeguimiento,
  obtenerHistorialReservas,
  obtenerReservas,
} from "../../services/api";
import Alert from "../../components/common/Alert";

export default function TraceabilityPage() {
  const { user } = useAuth();
  const idProductor = user?.id;

  const [lotes, setLotes] = useState([]);
  const [seguimientoPropio, setSeguimientoPropio] = useState([]);
  const [historialReservasPropio, setHistorialReservasPropio] = useState([]);
  const [activeTab, setActiveTab] = useState("seguimiento");
  const [filtroLote, setFiltroLote] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const cargarTrazabilidad = useCallback(async () => {
    setLoading(true);
    try {
      const [resLotes, resCultivos, resReservasGlobal, resReservasPropias] = await Promise.allSettled([
        obtenerLotes({ productor_id: idProductor }),
        obtenerHistorialSeguimiento(),
        obtenerHistorialReservas(),
        obtenerReservas({})
      ]);

      let misLotes = [];
      if (resLotes.status === "fulfilled" && Array.isArray(resLotes.value)) {
        misLotes = resLotes.value.filter((l) => String(l.productor_id) === String(idProductor));
        setLotes(misLotes);
      }

      const idsLotes = new Set(misLotes.map((l) => l.id));

      if (resCultivos.status === "fulfilled" && Array.isArray(resCultivos.value)) {
        setSeguimientoPropio(
          resCultivos.value
            .filter(h => idsLotes.has(h.lote_id))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        );
      }

      let mapaReservaLote = {};
      let idsReservasPropias = new Set();
      if (resReservasPropias.status === "fulfilled" && Array.isArray(resReservasPropias.value)) {
        const reservas = resReservasPropias.value.filter(r => idsLotes.has(r.lote_id));
        reservas.forEach(r => { mapaReservaLote[r.id] = r.lote_id; });
        idsReservasPropias = new Set(reservas.map(r => r.id));
      }

      if (resReservasGlobal.status === "fulfilled" && Array.isArray(resReservasGlobal.value)) {
        setHistorialReservasPropio(
          resReservasGlobal.value
            .filter(h => idsReservasPropias.has(h.reserva_id))
            .map(h => ({ ...h, lote_id: mapaReservaLote[h.reserva_id] }))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        );
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar trazabilidad." });
    } finally {
      setLoading(false);
    }
  }, [idProductor]);

  useEffect(() => {
    if (idProductor) cargarTrazabilidad();
  }, [idProductor, cargarTrazabilidad]);

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';
    const f = new Date(fecha);
    if (isNaN(f)) return fecha;
    return f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const colorProgreso = (pct) => {
    if (pct >= 100) return 'progreso-rojo';
    if (pct >= 60) return 'progreso-naranja';
    return '';
  };

  const etiquetaEstado = (estado) => {
    switch (estado) {
      case 'Pendiente':   return 'etiqueta-naranja';
      case 'Confirmada':  return 'etiqueta-azul';
      case 'Pagada':      return 'etiqueta-amarillo';
      case 'En tránsito': return 'etiqueta-azul';
      case 'Entregada':   return 'etiqueta-verde';
      case 'Calificada':  return 'etiqueta-verde';
      case 'Cancelada':   return 'etiqueta-gris';
      default:            return 'etiqueta-naranja';
    }
  };

  const CICLO_CULTIVO = ['Siembra', 'Crecimiento', 'Listo', 'Cosechado'];

  const renderAvanceLotes = () => {
    const lotesActivos = lotes.filter(l => l.estado === 'Activo');
    const lotesMostrar = lotesActivos.length ? lotesActivos : lotes;

    if (!lotesMostrar.length) return <p className="celda-vacia">Aún no tiene lotes registrados.</p>;

    const hoy = new Date();

    return lotesMostrar.map(l => {
      const reservado = l.kg_reservados || l.cantidad_reservada_kg || 0;
      const total = l.cantidad || l.cantidad_total_kg || 0;
      const pct = total > 0 ? Math.min(100, Math.round((reservado / total) * 100)) : 0;
      
      const estadoCultivo = l.estado_cultivo || 'Siembra';
      const indiceCiclo = CICLO_CULTIVO.indexOf(estadoCultivo);
      const retrasado = l.fecha_cosecha && new Date(l.fecha_cosecha) < hoy && estadoCultivo !== 'Cosechado';

      const pasos = CICLO_CULTIVO.map((etapa, i) => {
        let estilo = { padding: "3px 8px", borderRadius: "12px", background: "#eee", color: "#888" };
        if (i < indiceCiclo) estilo = { padding: "3px 8px", borderRadius: "12px", background: "#c8e6c9", color: "#2e7d32" };
        else if (i === indiceCiclo) {
          estilo = retrasado
            ? { padding: "3px 8px", borderRadius: "12px", background: "#ffcdd2", color: "#c62828", fontWeight: "bold" }
            : { padding: "3px 8px", borderRadius: "12px", background: "#fff3cd", color: "#856404", fontWeight: "bold" };
        }
        return <span key={etapa} style={estilo} title={etapa}>{etapa}</span>;
      });

      return (
        <div key={l.id} className="tarjeta-progreso">
          <div className="tarjeta-progreso-titulo">
            <span>{l.producto || l.nombre_producto} <span className={`etiqueta ${l.estado === 'Activo' ? 'etiqueta-verde' : 'etiqueta-gris'}`}>{l.estado || 'Activo'}</span></span>
            <span>{pct}% reservado</span>
          </div>
          <div className="barra-progreso-fondo">
            <div className={`barra-progreso-relleno ${colorProgreso(pct)}`} style={{ width: `${pct}%`, background: pct >= 100 ? "#2e7d32" : "#4caf50", transition: "width 0.5s ease" }}></div>
          </div>
          <p>{Number(reservado).toLocaleString('es-CO')} kg reservados de {Number(total).toLocaleString('es-CO')} kg · Lote #{l.id} · {l.categoria || l.categoria_nombre}</p>

          <div className="linea-tiempo-cultivo margen-top-16" style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
            {pasos.map((p, i) => (
              <React.Fragment key={i}>
                {p}
                {i < pasos.length - 1 && <span style={{ color: "#bbb" }}>→</span>}
              </React.Fragment>
            ))}
          </div>
          {retrasado && <p className="alerta alerta-error visible margen-top-16">⚠️ Retrasado: la cosecha se estimó para {formatoFecha(l.fecha_cosecha)} y el cultivo sigue en '{estadoCultivo}'.</p>}
        </div>
      );
    });
  };

  const renderSeguimiento = () => {
    const lista = filtroLote ? seguimientoPropio.filter(h => String(h.lote_id) === filtroLote) : seguimientoPropio;
    
    if (loading) return <tr><td colSpan="4" className="celda-vacia">Cargando...</td></tr>;
    if (!lista.length) return <tr><td colSpan="4" className="celda-vacia">Sin eventos registrados para este lote</td></tr>;

    return lista.map((h, idx) => (
      <tr key={idx}>
        <td>{h.accion || h.estado || ''}</td>
        <td>{h.lote_id ? '#' + h.lote_id : '—'}</td>
        <td>{h.producto || h.observaciones || ''}</td>
        <td>{formatoFecha(h.fecha)}</td>
      </tr>
    ));
  };

  const renderHistReservas = () => {
    const lista = filtroLote ? historialReservasPropio.filter(h => String(h.lote_id) === filtroLote) : historialReservasPropio;
    
    if (loading) return <tr><td colSpan="5" className="celda-vacia">Cargando...</td></tr>;
    if (!lista.length) return <tr><td colSpan="5" className="celda-vacia">Sin cambios de estado registrados para este lote</td></tr>;

    return lista.map((h, idx) => (
      <tr key={idx}>
        <td>#{h.reserva_id}</td>
        <td>{h.producto || ''}</td>
        <td>{h.comprador || ''}</td>
        <td><span className={`etiqueta ${etiquetaEstado(h.estado_nuevo || h.estado)}`}>{h.estado_nuevo || h.estado}</span></td>
        <td>{formatoFecha(h.fecha)}</td>
      </tr>
    ));
  };

  const lotesActivos = lotes.filter(l => l.estado === 'Activo');
  const todasFechas = [...seguimientoPropio.map(h => h.fecha), ...historialReservasPropio.map(h => h.fecha)].filter(Boolean).map(f => new Date(f));
  const ultima = todasFechas.length ? new Date(Math.max(...todasFechas)) : null;

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Trazabilidad</h2>
          <p>Avance de venta de cada lote y cronología de eventos registrados sobre sus cultivos.</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🌱">
          <div className="stat-numero">{loading ? "..." : lotesActivos.length}</div>
          <div className="stat-etiqueta">Lotes en Seguimiento</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="📋">
          <div className="stat-numero">{loading ? "..." : seguimientoPropio.length}</div>
          <div className="stat-etiqueta">Eventos Registrados</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="📦">
          <div className="stat-numero">{loading ? "..." : historialReservasPropio.length}</div>
          <div className="stat-etiqueta">Cambios de Reserva</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="📅">
          <div className="stat-numero">{loading ? "..." : (ultima ? formatoFecha(ultima) : '—')}</div>
          <div className="stat-etiqueta">Última Actualización</div>
        </div>
      </div>

      <div className="margen-top-32">
        <h3 className="titulo-panel-grande">Avance de venta por lote</h3>
        <p className="texto-ayuda">Porcentaje de kilogramos ya reservados sobre el total disponible en cada lote activo.</p>
        <div className="grid-tarjetas" id="grid-avance-lotes">
          {loading ? <p className="celda-vacia">Cargando...</p> : renderAvanceLotes()}
        </div>
      </div>

      <div className="margen-top-32">
        <h3 className="titulo-panel-grande">Cronología de eventos</h3>

        <div className="tabs-historial margen-top-24">
          <button
            className={`btn-tab ${activeTab === "seguimiento" ? "activo" : ""}`}
            onClick={() => setActiveTab("seguimiento")}
          >
            🌱 Seguimiento de Cultivos
          </button>
          <button
            className={`btn-tab ${activeTab === "reservas" ? "activo" : ""}`}
            onClick={() => setActiveTab("reservas")}
          >
            📋 Estados de Reservas
          </button>
        </div>

        <div className="barra-filtro margen-top-24">
          <select
            className="campo-input"
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
          >
            <option value="">Todos los lotes</option>
            {lotes.map(l => (
              <option key={l.id} value={l.id}>#{l.id} — {l.producto || l.nombre_producto}</option>
            ))}
          </select>
        </div>

        {activeTab === "seguimiento" ? (
          <div id="seccion-seguimiento">
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>Acción Registrada</th>
                  <th>Lote (ID)</th>
                  <th>Producto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {renderSeguimiento()}
              </tbody>
            </table>
          </div>
        ) : (
          <div id="seccion-hist-reservas">
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Producto</th>
                  <th>Comprador</th>
                  <th>Estado Registrado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {renderHistReservas()}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}
