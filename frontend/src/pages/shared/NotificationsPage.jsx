import React, { useState, useEffect, useMemo } from "react";
import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../../services/api";
import Alert from "../../components/common/Alert";

const ICONOS = {
  NuevaReserva: "🛒",
  CambioEstadoCultivo: "🌱",
  PagoRecibido: "💰",
  RecordatorioEntrega: "🚚",
  AlertaIncidencia: "⚠️",
  ReembolsoProcesado: "↩️",
};

function tiempoRelativo(fechaISO) {
  if (!fechaISO) return "reciente";
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const minutos = Math.floor(diffMs / 60000);

  if (minutos < 1) return "justo ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} día(s)`;
}

export default function NotificationsPage() {
  const [todasLasNotificaciones, setTodasLasNotificaciones] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroComprador, setFiltroComprador] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const cargarNotificaciones = async () => {
    try {
      const res = await obtenerNotificaciones();
      const lista = Array.isArray(res)
        ? res
        : Array.isArray(res?.notificaciones)
        ? res.notificaciones
        : [];
      setTodasLasNotificaciones(lista);
    } catch (err) {
      setAlert({
        type: "error",
        message: `No se pudieron cargar las notificaciones: ${err.message || "error desconocido"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const handleMarcarLeida = async (id) => {
    try {
      await marcarNotificacionLeida(id);
      setTodasLasNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch {
      // Error silencioso
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setTodasLasNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setAlert({
        type: "ok",
        message: "Todas las notificaciones fueron marcadas como leídas.",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: `No se pudo actualizar: ${err.message || "error desconocido"}`,
      });
    }
  };

  const compradores = useMemo(() => {
    const mapa = new Map();
    todasLasNotificaciones.forEach((n) => {
      if (n.comprador_id && n.comprador_nombre) {
        mapa.set(String(n.comprador_id), n.comprador_nombre);
      }
    });
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [todasLasNotificaciones]);

  const filtradas = useMemo(() => {
    return todasLasNotificaciones.filter((n) => {
      if (filtroTipo && n.tipo !== filtroTipo) return false;
      if (filtroComprador && String(n.comprador_id) !== filtroComprador) return false;
      return true;
    });
  }, [todasLasNotificaciones, filtroTipo, filtroComprador]);

  return (
    <div className="pagina-notificaciones">
      <div className="cabecera-notificaciones" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>🔔 Notificaciones</h2>
        <button
          type="button"
          className="btn-verde btn-borde"
          onClick={handleMarcarTodas}
        >
          Marcar todas como leídas
        </button>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="filtros-notificaciones margen-top-16" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div className="campo-grupo filtro-notificacion" style={{ minWidth: "220px" }}>
          <label htmlFor="filtro-tipo">Tipo</label>
          <select
            id="filtro-tipo"
            className="campo-input"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="NuevaReserva">🛒 Nueva reserva</option>
            <option value="CambioEstadoCultivo">🌱 Cambio de estado de cultivo</option>
            <option value="PagoRecibido">💰 Pago recibido</option>
            <option value="RecordatorioEntrega">🚚 Recordatorio de entrega</option>
            <option value="AlertaIncidencia">⚠️ Alerta de incidencia</option>
            <option value="ReembolsoProcesado">↩️ Reembolso procesado</option>
          </select>
        </div>

        {compradores.length > 0 && (
          <div className="campo-grupo filtro-notificacion" style={{ minWidth: "220px" }}>
            <label htmlFor="filtro-comprador">Comprador</label>
            <select
              id="filtro-comprador"
              className="campo-input"
              value={filtroComprador}
              onChange={(e) => setFiltroComprador(e.target.value)}
            >
              <option value="">Todos los compradores</option>
              {compradores.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="lista-notificaciones margen-top-16">
        {loading ? (
          <p className="celda-vacia">Cargando...</p>
        ) : filtradas.length === 0 ? (
          <p className="celda-vacia">
            {todasLasNotificaciones.length
              ? "Ninguna notificación coincide con el filtro seleccionado."
              : "No tienes notificaciones todavía."}
          </p>
        ) : (
          filtradas.map((n) => (
            <div
              key={n.id}
              className={`tarjeta notificacion-item ${
                n.leida ? "notificacion-leida" : "notificacion-no-leida"
              }`}
              style={{
                cursor: "pointer",
                marginBottom: "12px",
                padding: "16px",
                borderLeft: n.leida ? "4px solid #cbd5e1" : "4px solid #2e7d32",
                background: n.leida ? "#fff" : "#f0fdf4",
              }}
              onClick={() => handleMarcarLeida(n.id)}
            >
              <div className="contenido-notificacion" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span className="icono-notificacion" style={{ fontSize: "1.5rem" }}>
                  {ICONOS[n.tipo] || "🔔"}
                </span>
                <div className="texto-notificacion" style={{ flex: 1 }}>
                  <p className="mensaje-notificacion" style={{ margin: "0 0 4px 0", fontWeight: n.leida ? "normal" : "600" }}>
                    {n.mensaje}
                  </p>
                  <p className="texto-secundario" style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                    {tiempoRelativo(n.fecha || n.fecha_creacion)}
                    {n.leida ? "" : " · sin leer"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
