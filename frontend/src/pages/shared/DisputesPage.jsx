import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContexto";
import { obtenerDisputas, actualizarDisputa } from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";

export default function DisputesPage() {
  const { user } = useAuth();
  const esAdmin = user?.rol === "Administrador" || user?.rol_id === 1;

  const [disputas, setDisputas] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Modal resolver
  const [modalResolver, setModalResolver] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("En revisión");
  const [resolucion, setResolucion] = useState("");
  const [reembolso, setReembolso] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);

  const cargarDisputas = async () => {
    try {
      const res = await obtenerDisputas();
      setDisputas(Array.isArray(res) ? res : []);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar disputas." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDisputas();
  }, []);

  const claseEstadoDisputa = (estado) => {
    if (estado === 'Resuelta' || estado === 'Cerrada') return 'badge-comprador';
    if (estado === 'En revisión') return 'badge-productor';
    return 'badge-admin';
  };

  const actualizarStatsDisputas = (lista) => {
    return {
      total: lista.length,
      abiertas: lista.filter(d => d.estado === 'Abierta').length,
      revision: lista.filter(d => d.estado === 'En revisión').length,
      resueltas: lista.filter(d => d.estado === 'Resuelta' || d.estado === 'Cerrada').length
    };
  };

  const filtrarDisputas = () => {
    return filtroEstado ? disputas.filter(d => d.estado === filtroEstado) : disputas;
  };

  const abrirModalDisputa = (d) => {
    setModalResolver(d);
    setNuevoEstado(d.estado === 'Abierta' ? 'En revisión' : d.estado);
    setResolucion(d.resolucion || "");
    setReembolso(false);
  };

  const cerrarModalDisputa = () => {
    setModalResolver(null);
  };

  const guardarResolucionDisputa = async (e) => {
    e.preventDefault();
    if (!modalResolver) return;

    setResolviendo(true);
    try {
      await actualizarDisputa(modalResolver.id, {
        estado: nuevoEstado,
        resolucion: resolucion.trim() || null,
        reembolsar: reembolso,
      });
      setAlert({ type: "ok", message: "Disputa actualizada y resolución procesada." });
      cerrarModalDisputa();
      cargarDisputas();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo actualizar la disputa." });
    } finally {
      setResolviendo(false);
    }
  };

  const stats = actualizarStatsDisputas(disputas);
  const disputasFiltradas = filtrarDisputas();

  const renderTablaDisputas = () => {
    if (loading) return <tr><td colSpan="6" className="celda-vacia">Cargando...</td></tr>;
    if (disputasFiltradas.length === 0) return <tr><td colSpan="6" className="celda-vacia">No hay disputas registradas</td></tr>;
    
    return disputasFiltradas.map((d) => (
      <tr key={d.id}>
        <td>{d.id}</td>
        <td>#{d.reserva_id}</td>
        <td>{d.fecha_apertura || d.fecha_creacion || "Reciente"}</td>
        <td style={{ whiteSpace: "pre-wrap" }}>
          {(d.descripcion || d.motivo || '').slice(0, 60)}
          {(d.descripcion || d.motivo || '').length > 60 ? '…' : ''}
        </td>
        <td><span className={`badge-rol ${claseEstadoDisputa(d.estado)}`}>{d.estado}</span></td>
        <td>
          {esAdmin ? (
            <button className="btn-tabla btn-editar" onClick={() => abrirModalDisputa(d)}>Gestionar</button>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "#666" }}>{d.resolucion || "En mediación"}</span>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <>
      <div className="banner-panel banner-historial">
        <span>⚖️ Disputas abiertas por compradores sobre sus reservas</span>
      </div>

      <div className="cabecera-panel">
        <div>
          <h2>Gestión de Disputas <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Revisa el reclamo, resuelve, y procesa el reembolso si corresponde (RF-25)</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="⚖️">
          <div className="stat-numero">{loading ? "..." : stats.total}</div>
          <div className="stat-etiqueta">Total</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="🕓">
          <div className="stat-numero">{loading ? "..." : stats.abiertas}</div>
          <div className="stat-etiqueta">Abiertas</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🔄">
          <div className="stat-numero">{loading ? "..." : stats.revision}</div>
          <div className="stat-etiqueta">En Revisión</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="✅">
          <div className="stat-numero">{loading ? "..." : stats.resueltas}</div>
          <div className="stat-etiqueta">Resueltas/Cerradas</div>
        </div>
      </div>

      <div className="barra-filtro margen-top-32">
        <select
          className="campo-input input-angosto"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Abierta">Abierta</option>
          <option value="En revisión">En revisión</option>
          <option value="Resuelta">Resuelta</option>
          <option value="Cerrada">Cerrada</option>
        </select>
      </div>

      <table className="tabla-datos">
        <thead>
          <tr>
            <th>ID</th>
            <th>Reserva</th>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {renderTablaDisputas()}
        </tbody>
      </table>

      {/* Modal Resolver Disputa */}
      <Modal
        isOpen={!!modalResolver}
        onClose={cerrarModalDisputa}
        title={`Resolver Disputa #${modalResolver?.id}`}
      >
        {modalResolver && (
          <form onSubmit={guardarResolucionDisputa}>
            <p><strong>Reserva:</strong> #{modalResolver.reserva_id}</p>
            <p style={{ marginTop: "8px" }}><strong>Reclamo del comprador:</strong></p>
            <p style={{ whiteSpace: "pre-wrap" }}>{modalResolver.descripcion || modalResolver.motivo}</p>

            <div className="campo-grupo margen-top-16">
              <label>Nuevo estado</label>
              <select
                className="campo-input"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
              >
                <option value="En revisión">En revisión</option>
                <option value="Resuelta">Resuelta</option>
                <option value="Cerrada">Cerrada</option>
              </select>
            </div>

            <div className="campo-grupo">
              <label>Resolución (se le muestra al comprador)</label>
              <textarea
                className="campo-input"
                rows="3"
                placeholder="Explica qué se decidió y por qué..."
                value={resolucion}
                onChange={(e) => setResolucion(e.target.value)}
              ></textarea>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <input
                type="checkbox"
                checked={reembolso}
                onChange={(e) => setReembolso(e.target.checked)}
              />
              Procesar reembolso al comprador (RF-25) — marca el pago como "Reembolsado" y cancela la reserva
            </label>

            <div className="fila-botones margen-top-16">
              <button type="submit" className="btn-verde" disabled={resolviendo}>Guardar</button>
              <button type="button" className="btn-verde btn-borde" onClick={cerrarModalDisputa}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
