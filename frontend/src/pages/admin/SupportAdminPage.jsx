import React, { useState, useEffect } from "react";
import {
  obtenerTicketsSoporte,
  actualizarEstadoSoporte,
  eliminarTicketSoporte,
} from "../../services/api";
import Alert from "../../components/common/Alert";
import Modal from "../../components/common/Modal";
import { useDialogos } from "../../context/dialogosContexto";

export default function SupportAdminPage() {
  const { confirmar } = useDialogos();
  const [tickets, setTickets] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);

  const cargarTickets = async () => {
    try {
      const res = await obtenerTicketsSoporte();
      setTickets(Array.isArray(res) ? res : []);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar tickets de soporte." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTickets();
  }, []);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await actualizarEstadoSoporte(id, nuevoEstado);
      setAlert({ type: "ok", message: `Ticket #${id} actualizado a ${nuevoEstado}.` });
      cargarTickets();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo actualizar el ticket." });
    }
  };

  const handleEliminar = async (id) => {
    if (!(await confirmar("¿Seguro que deseas eliminar este ticket?"))) return;
    try {
      await eliminarTicketSoporte(id);
      setAlert({ type: "ok", message: "Ticket eliminado." });
      cargarTickets();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar el ticket." });
    }
  };

  const verDetalleSoporte = (ticket) => {
    setTicketSeleccionado(ticket);
    setModalOpen(true);
  };

  const cerrarDetalleSoporte = () => {
    setModalOpen(false);
    setTicketSeleccionado(null);
  };

  const truncar = (texto, largo = 60) => {
    if (!texto) return '';
    return texto.length > largo ? texto.slice(0, largo) + '…' : texto;
  };

  const filtrados = tickets.filter((t) => {
    const coincideTexto =
      !filtroTexto ||
      (t.asunto && t.asunto.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (t.mensaje && t.mensaje.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (t.usuario_nombre && t.usuario_nombre.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (t.nombre && t.nombre.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (t.usuario_correo && t.usuario_correo.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (t.correo && t.correo.toLowerCase().includes(filtroTexto.toLowerCase()));

    const coincideEstado = !filtroEstado || t.estado === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  const limpiarFiltroSoporte = () => {
      setFiltroTexto("");
      setFiltroEstado("");
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Centro de Soporte <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Errores y consultas enviados por usuarios de la plataforma</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="📨">
          <div className="stat-numero">{loading ? "—" : tickets.length}</div>
          <div className="stat-etiqueta">Total de Mensajes</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="🕓">
          <div className="stat-numero">
            {loading ? "—" : tickets.filter((t) => t.estado === "Pendiente").length}
          </div>
          <div className="stat-etiqueta">Pendientes</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🔄">
          <div className="stat-numero">
            {loading ? "—" : tickets.filter((t) => t.estado === "En proceso").length}
          </div>
          <div className="stat-etiqueta">En Proceso</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="✅">
          <div className="stat-numero">
            {loading ? "—" : tickets.filter((t) => t.estado === "Resuelto").length}
          </div>
          <div className="stat-etiqueta">Resueltos</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="barra-filtro margen-top-32">
        <input
          type="text"
          className="campo-input"
          placeholder="Buscar por nombre, correo o mensaje..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
        <select
          className="campo-input input-angosto"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En proceso">En proceso</option>
          <option value="Resuelto">Resuelto</option>
        </select>
        <button className="btn-verde btn-borde" onClick={limpiarFiltroSoporte}>Limpiar</button>
      </div>

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Mensaje</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="celda-vacia">Cargando tickets...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="7" className="celda-vacia">No hay mensajes de soporte</td></tr>
            ) : (
              filtrados.map((t) => (
                <tr key={t.id}>
                  <td><strong>#{t.id}</strong></td>
                  <td>{t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleString('es-CO') : "Reciente"}</td>
                  <td>{t.nombre || t.usuario_nombre || "Usuario"}</td>
                  <td>{t.correo || t.usuario_correo}</td>
                  <td>{truncar(t.mensaje)}</td>
                  <td>
                    <select 
                      className="campo-input" 
                      style={{ padding: "4px 8px" }} 
                      value={t.estado}
                      onChange={(e) => handleCambiarEstado(t.id, e.target.value)}
                    >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Resuelto">Resuelto</option>
                    </select>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                        <button
                          className="btn-tabla btn-editar"
                          onClick={() => verDetalleSoporte(t)}
                        >
                          Ver
                        </button>
                        <button
                          className="btn-tabla btn-eliminar"
                          onClick={() => handleEliminar(t.id)}
                        >
                          Eliminar
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ver Mensaje Completo */}
      <Modal
        isOpen={modalOpen}
        onClose={cerrarDetalleSoporte}
        title="Mensaje de Soporte"
      >
        {ticketSeleccionado && (
            <div>
                <p><strong>Nombre:</strong> <span>{ticketSeleccionado.nombre || ticketSeleccionado.usuario_nombre}</span></p>
                <p><strong>Correo:</strong> <span>{ticketSeleccionado.correo || ticketSeleccionado.usuario_correo}</span></p>
                <p><strong>Fecha:</strong> <span>{ticketSeleccionado.fecha_creacion ? new Date(ticketSeleccionado.fecha_creacion).toLocaleString('es-CO') : ''}</span></p>
                <p><strong>Estado:</strong> <span>{ticketSeleccionado.estado}</span></p>
                <p style={{ marginTop: "12px" }}><strong>Mensaje:</strong></p>
                <p style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "10px", borderRadius: "5px" }}>{ticketSeleccionado.mensaje}</p>
                
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn-verde btn-borde" onClick={cerrarDetalleSoporte}>Cerrar</button>
                </div>
            </div>
        )}
      </Modal>
    </>
  );
}
