import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/authContexto";
import {
  obtenerLotes,
  obtenerReservas,
  editarEstadoReserva,
  crearEntrega,
  obtenerPagos,
  obtenerEntregas,
  actualizarUbicacionEntrega
} from "../../services/api";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";

export default function SalesAndPaymentsPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [pagosRecibidos, setPagosRecibidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // States for modals
  const [modalInformacionReserva, setModalInformacionReserva] = useState(null);
  const [modalDespacho, setModalDespacho] = useState(null);
  const [modalMotivoCancelacion, setModalMotivoCancelacion] = useState(null);
  const [modalUbicacion, setModalUbicacion] = useState(null);

  // Despacho state
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [medioTransporte, setMedioTransporte] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [despachando, setDespachando] = useState(false);
  const [modalDespachoAlert, setModalDespachoAlert] = useState(null);

  // Cancelacion state
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [modalCancelacionAlert, setModalCancelacionAlert] = useState(null);

  // Ubicacion state
  const [entregaId, setEntregaId] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [modalUbicacionAlert, setModalUbicacionAlert] = useState(null);

  const cargarVentas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [resLotes, resReservas] = await Promise.allSettled([
        obtenerLotes({ productor_id: user.id }),
        obtenerReservas(),
      ]);

      let misLotes = [];
      if (resLotes.status === "fulfilled" && Array.isArray(resLotes.value)) {
        misLotes = resLotes.value.filter((l) => String(l.productor_id) === String(user.id));
      }

      const misLotesMap = new Map(misLotes.map((l) => [l.id, l]));
      let misReservas = [];

      if (resReservas.status === "fulfilled" && Array.isArray(resReservas.value)) {
        misReservas = resReservas.value
          .filter((r) => String(r.productor_id) === String(user.id) || misLotesMap.has(r.lote_id))
          .map((r) => {
            const loteAsociado = misLotesMap.get(r.lote_id);
            const productoNombre = r.producto || loteAsociado?.producto || loteAsociado?.nombre_producto || `Lote #${r.lote_id}`;
            const compradorNombre = r.comprador || r.comprador_nombre || `Comprador #${r.comprador_id}`;
            const cantidadKg = r.cantidad ?? r.cantidad_reservada_kg ?? 0;
            const precioKg = r.precio_kg ?? loteAsociado?.precio_kg ?? 0;
            const totalEstimado = precioKg && cantidadKg ? precioKg * cantidadKg : (r.precio_total_estimado || 0);

            return {
              ...r,
              lote: loteAsociado || r.lote || null,
              producto_nombre: productoNombre,
              comprador_nombre: compradorNombre,
              cantidad_kg: cantidadKg,
              precio_total: totalEstimado,
              fecha_formateada: r.fecha || r.fecha_reserva || null,
            };
          });
        setVentas(misReservas);
      }

      // Cargar pagos de las reservas
      const promesas = misReservas.map((r) => obtenerPagos(r.id).catch(() => []));
      const resPagos = await Promise.allSettled(promesas);
      const todos = [];
      resPagos.forEach((p) => {
        if (p.status === "fulfilled" && Array.isArray(p.value)) {
          todos.push(...p.value);
        }
      });
      setPagosRecibidos(todos);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar ventas y pagos." });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // Funciones solicitadas
  const renderReservasRecibidas = () => {
    return ventas.map((v) => {
      const fechaStr = v.fecha_formateada || v.fecha || v.fecha_reserva;
      let fechaDisplay = "N/A";
      if (fechaStr) {
        try {
          const dateObj = new Date(fechaStr.includes("T") ? fechaStr : `${fechaStr}T00:00:00`);
          fechaDisplay = isNaN(dateObj.getTime()) ? fechaStr : dateObj.toLocaleDateString("es-CO");
        } catch {
          fechaDisplay = fechaStr;
        }
      }

      return (
        <tr key={v.id}>
          <td><strong>#{v.id}</strong></td>
          <td>{v.comprador_nombre || v.comprador || `Comprador #${v.comprador_id}`}</td>
          <td>{v.producto_nombre || v.producto || `Lote #${v.lote_id}`}</td>
          <td><strong>{v.cantidad_kg ?? v.cantidad ?? 0}</strong> kg</td>
          <td>{fechaDisplay}</td>
          <td><Badge>{v.estado}</Badge></td>
          <td>
            <div className="acciones-tabla">
              <button
                type="button"
                className="btn-tabla btn-editar"
                onClick={() => verInformacionReserva(v)}
              >
                ℹ️ Info
              </button>
              {v.estado === "Pendiente" && (
                <>
                  <button
                    type="button"
                    className="btn-tabla btn-confirmar"
                    onClick={() => confirmarReservaProductor(v.id)}
                  >
                    ✓ Confirmar
                  </button>
                  <button
                    type="button"
                    className="btn-tabla btn-eliminar"
                    onClick={() => cancelarReservaProductor(v)}
                  >
                    ✕ Cancelar
                  </button>
                </>
              )}
              {v.estado === "Pagada" && (
                <button
                  type="button"
                  className="btn-tabla btn-confirmar"
                  onClick={() => abrirModalDespachar(v)}
                >
                  🚚 Despachar
                </button>
              )}
              {["En camino", "En tránsito", "Entregada"].includes(v.estado) && (
                <button
                  type="button"
                  className="btn-tabla btn-editar"
                  onClick={() => abrirModalUbicacion(v.id)}
                >
                  📍 Ubicación
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  const verInformacionReserva = (reserva) => {
    setModalInformacionReserva(reserva);
  };

  const cerrarModalInformacion = () => {
    setModalInformacionReserva(null);
  };

  const confirmarReservaProductor = async (id) => {
    try {
      await editarEstadoReserva(id, { estado: "Confirmada" });
      setAlert({ type: "ok", message: "Reserva confirmada exitosamente." });
      cargarVentas();
    } catch (e) {
      setAlert({ type: "error", message: "No se pudo confirmar la reserva: " + (e.message || "Error desconocido") });
    }
  };

  const cancelarReservaProductor = (reserva) => {
    setModalMotivoCancelacion(reserva);
    setMotivoCancelacion("");
    setModalCancelacionAlert(null);
  };

  const cerrarModalCancelacion = () => {
    setModalMotivoCancelacion(null);
  };

  const confirmarCancelacionProductor = async (e) => {
    e.preventDefault();
    if (!motivoCancelacion.trim()) {
      setModalCancelacionAlert({ type: "error", message: "Escribe el motivo antes de confirmar." });
      return;
    }
    if (!modalMotivoCancelacion) return;

    try {
      await editarEstadoReserva(modalMotivoCancelacion.id, { 
        estado: "Cancelada",
        motivo_cancelacion: motivoCancelacion
      });
      cerrarModalCancelacion();
      cargarVentas();
      setAlert({ type: "ok", message: "Reserva cancelada correctamente." });
    } catch (e) {
      setModalCancelacionAlert({ type: "error", message: "No se pudo cancelar: " + (e.message || "Error desconocido") });
    }
  };

  const abrirModalDespachar = (reserva) => {
    setModalDespacho(reserva);
    setMedioTransporte("");
    setFechaEstimada(new Date().toISOString().split("T")[0]);
    setModalDespachoAlert(null);
    setCodigoGenerado("");
  };

  const cerrarModalDespachar = () => {
    setModalDespacho(null);
  };

  const confirmarDespacho = async (e) => {
    e.preventDefault();
    if (!medioTransporte.trim()) {
      setModalDespachoAlert({ type: "error", message: "Indica el medio de transporte." });
      return;
    }
    if (!modalDespacho) return;

    setDespachando(true);
    try {
      const entrega = await crearEntrega({
        reserva_id: modalDespacho.id,
        medio: medioTransporte,
        fecha_estimada: fechaEstimada
      });

      const codigo = entrega.codigo_confirmacion || entrega.codigo || "No disponible";
      setCodigoGenerado(codigo);
      setModalDespachoAlert({
        type: "ok",
        message: `¡Despachado! Código de confirmación para el comprador: ${codigo}`,
      });

      setTimeout(() => {
        cerrarModalDespachar();
        cargarVentas();
      }, 3000);
    } catch (e) {
      setModalDespachoAlert({ type: "error", message: "No se pudo despachar: " + (e.message || "Error desconocido") });
    } finally {
      setDespachando(false);
    }
  };

  const abrirModalUbicacion = async (reservaId) => {
    setModalUbicacionAlert(null);
    setLatitud("");
    setLongitud("");
    setEntregaId("");
    setModalUbicacion(true);

    try {
      const entregas = await obtenerEntregas(reservaId);
      const entrega = entregas.find(e => ["En tránsito", "En camino"].includes(e.estado));
      
      if (!entrega) {
        setModalUbicacionAlert({ type: "error", message: "No se encontró un envío en tránsito para esta reserva." });
        return;
      }

      setEntregaId(entrega.id);
      if (entrega.latitud_actual != null) setLatitud(entrega.latitud_actual);
      if (entrega.longitud_actual != null) setLongitud(entrega.longitud_actual);
    } catch (e) {
      setModalUbicacionAlert({ type: "error", message: "No se pudo cargar la entrega: " + (e.message || "Error desconocido") });
    }
  };

  const cerrarModalUbicacion = () => {
    setModalUbicacion(false);
  };

  const usarMiUbicacionEnvio = () => {
    if (!navigator.geolocation) {
      setModalUbicacionAlert({ type: "error", message: "Tu navegador no soporta geolocalización." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude.toFixed(6));
        setLongitud(pos.coords.longitude.toFixed(6));
      },
      () => {
        setModalUbicacionAlert({ type: "error", message: "No se pudo obtener tu ubicación. Ingresa los datos manualmente." });
      }
    );
  };

  const confirmarUbicacion = async (e) => {
    e.preventDefault();
    const lat = parseFloat(latitud);
    const lon = parseFloat(longitud);

    if (isNaN(lat) || isNaN(lon)) {
      setModalUbicacionAlert({ type: "error", message: "Ingresa latitud y longitud válidas." });
      return;
    }
    if (!entregaId) {
      setModalUbicacionAlert({ type: "error", message: "No se encontró el ID de la entrega." });
      return;
    }

    try {
      await actualizarUbicacionEntrega(entregaId, lat, lon);
      setModalUbicacionAlert({ type: "ok", message: "¡Ubicación actualizada!" });
      setTimeout(() => {
        cerrarModalUbicacion();
      }, 1200);
    } catch (e) {
      setModalUbicacionAlert({ type: "error", message: "No se pudo actualizar: " + (e.message || "Error desconocido") });
    }
  };
  
  const totalMontoPagado = pagosRecibidos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const pendientesCount = ventas.filter((v) => v.estado === "Pendiente").length;

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Ventas y Pagos Recibidos</h2>
          <p>Supervise pedidos, confirme reservas de compradores y gestione despachos</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Resumen de estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="📦">
          <div className="stat-numero">{loading ? "..." : ventas.length}</div>
          <div className="stat-etiqueta">Total Reservas</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="⏳">
          <div className="stat-numero">{loading ? "..." : pendientesCount}</div>
          <div className="stat-etiqueta">Pendientes de Confirmar</div>
        </div>
        <div className="stat-tarjeta stat-verde" data-icono="💰">
          <div className="stat-numero">
            {loading ? "..." : `$${totalMontoPagado.toLocaleString("es-CO")}`}
          </div>
          <div className="stat-etiqueta">Total Pagos Recibidos</div>
        </div>
      </div>

      {/* Tabla de Reservas/Ventas */}
      <div className="contenedor-tabla margen-top-24">
        <h3 className="titulo-panel" style={{ marginBottom: "16px" }}>Pedidos y Reservas de Clientes</h3>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Comprador</th>
              <th>Producto</th>
              <th>Cantidad (kg)</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="celda-vacia">Cargando ventas...</td></tr>
            ) : ventas.length === 0 ? (
              <tr><td colSpan="7" className="celda-vacia">Aún no has recibido reservas de compradores.</td></tr>
            ) : (
              renderReservasRecibidas()
            )}
          </tbody>
        </table>
      </div>

      {/* Historial de Pagos Recibidos */}
      <div className="contenedor-tabla margen-top-32">
        <h3 className="titulo-panel" style={{ marginBottom: "16px" }}>Historial de Pagos Verificados</h3>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID Pago</th>
              <th>Reserva</th>
              <th>Monto Abonado</th>
              <th>Monto Neto</th>
              <th>Método</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="celda-vacia">Cargando pagos...</td></tr>
            ) : pagosRecibidos.length === 0 ? (
              <tr><td colSpan="8" className="celda-vacia">No hay pagos procesados en tus reservas todavía.</td></tr>
            ) : (
              pagosRecibidos.map((p) => {
                let fechaPagoDisplay = "N/A";
                if (p.fecha) {
                  try {
                    const d = new Date(p.fecha);
                    fechaPagoDisplay = isNaN(d.getTime()) ? p.fecha : d.toLocaleDateString("es-CO");
                  } catch {
                    fechaPagoDisplay = p.fecha;
                  }
                }
                return (
                  <tr key={p.id}>
                    <td><strong>#{p.id}</strong></td>
                    <td>Reserva #{p.reserva_id}</td>
                    <td style={{ fontWeight: "bold", color: "var(--verde-oscuro, #1F4D33)" }}>
                      ${Number(p.monto || 0).toLocaleString("es-CO")}
                    </td>
                    <td style={{ fontWeight: "600", color: "#3A362E" }}>
                      ${Number(p.monto_neto ?? p.monto ?? 0).toLocaleString("es-CO")}
                    </td>
                    <td>{p.metodo || p.metodo_pago || "Transferencia"}</td>
                    <td>{p.tipo || p.tipo_pago || "Total"}</td>
                    <td><Badge>{p.estado || "Aprobado"}</Badge></td>
                    <td>{fechaPagoDisplay}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Información Reserva */}
      <Modal
        isOpen={!!modalInformacionReserva}
        onClose={cerrarModalInformacion}
        title="Información de la Reserva"
      >
        {modalInformacionReserva && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p><strong>ID Reserva:</strong> #{modalInformacionReserva.id}</p>
            <p><strong>Comprador:</strong> {modalInformacionReserva.comprador_nombre || modalInformacionReserva.comprador || `Comprador #${modalInformacionReserva.comprador_id}`}</p>
            <p><strong>Producto:</strong> {modalInformacionReserva.producto_nombre || modalInformacionReserva.producto || `Lote #${modalInformacionReserva.lote_id}`}</p>
            <p><strong>Cantidad:</strong> {modalInformacionReserva.cantidad_kg ?? modalInformacionReserva.cantidad ?? 0} kg</p>
            <p><strong>Total Estimado:</strong> ${Number(modalInformacionReserva.precio_total || modalInformacionReserva.precio_total_estimado || 0).toLocaleString("es-CO")}</p>
            <p><strong>Estado:</strong> <Badge>{modalInformacionReserva.estado}</Badge></p>
            {modalInformacionReserva.fecha_limite_pago && (
              <p><strong>Plazo Límite de Pago:</strong> {new Date(modalInformacionReserva.fecha_limite_pago).toLocaleString("es-CO")}</p>
            )}
            {modalInformacionReserva.motivo_cancelacion && (
              <p style={{ color: "var(--rojo, #B23A2E)" }}><strong>Motivo Cancelación:</strong> {modalInformacionReserva.motivo_cancelacion}</p>
            )}
            <div className="fila-botones" style={{ marginTop: "16px", justifyContent: "flex-end" }}>
              <button type="button" className="btn-verde btn-borde" onClick={cerrarModalInformacion}>Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Despachar Entrega */}
      <Modal
        isOpen={!!modalDespacho}
        onClose={cerrarModalDespachar}
        title="Despachar Reserva"
      >
        <form onSubmit={confirmarDespacho}>
          <Alert type={modalDespachoAlert?.type} message={modalDespachoAlert?.message} onClose={() => setModalDespachoAlert(null)} />
          <p style={{ color: "#555", fontSize: "0.95rem" }}>
            Al registrar el despacho, se generará el código de seguridad que el comprador te deberá confirmar para dar por completada la venta.
          </p>
          <div className="campo-grupo">
            <label>Medio de Transporte *</label>
            <input
              type="text"
              className="campo-input"
              value={medioTransporte}
              onChange={(e) => setMedioTransporte(e.target.value)}
              placeholder="Ej: Camión placa XYZ-123"
              required
            />
          </div>
          <div className="campo-grupo">
            <label>Fecha Estimada de Entrega *</label>
            <input
              type="date"
              className="campo-input"
              value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
              required
            />
          </div>

          {codigoGenerado && (
            <div style={{ background: "#f0f8f0", padding: "16px", borderRadius: "8px", margin: "16px 0", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#555" }}>Código de confirmación generado:</span>
              <div style={{ fontSize: "1.8rem", fontWeight: "bold", letterSpacing: "4px", color: "var(--verde-oscuro, #2e7d32)", marginTop: "4px" }}>
                {codigoGenerado}
              </div>
            </div>
          )}

          <div className="accion-formulario">
            <button type="button" className="btn-secundario" onClick={cerrarModalDespachar}>Cancelar</button>
            <button type="submit" className="btn-verde" disabled={despachando}>
              {despachando ? "Guardando..." : "Confirmar Despacho"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cancelar Reserva */}
      <Modal
        isOpen={!!modalMotivoCancelacion}
        onClose={cerrarModalCancelacion}
        title="Motivo de Cancelación"
      >
        <form onSubmit={confirmarCancelacionProductor}>
          <Alert type={modalCancelacionAlert?.type} message={modalCancelacionAlert?.message} onClose={() => setModalCancelacionAlert(null)} />
          <div className="campo-grupo">
            <label>¿Por qué cancelas esta reserva?</label>
            <textarea
              className="campo-input"
              rows="3"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Ej: No tengo stock suficiente..."
              required
            ></textarea>
          </div>
          <div className="accion-formulario">
            <button type="button" className="btn-secundario" onClick={cerrarModalCancelacion}>Cerrar</button>
            <button type="submit" className="btn-verde" style={{ background: "#d32f2f" }}>Cancelar Reserva</button>
          </div>
        </form>
      </Modal>

      {/* Modal Ubicación */}
      <Modal
        isOpen={!!modalUbicacion}
        onClose={cerrarModalUbicacion}
        title="Actualizar Ubicación de Entrega"
      >
        <form onSubmit={confirmarUbicacion}>
          <Alert type={modalUbicacionAlert?.type} message={modalUbicacionAlert?.message} onClose={() => setModalUbicacionAlert(null)} />
          <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: "16px" }}>
            Actualiza la ubicación actual del envío en tránsito.
          </p>
          <div className="campo-grupo">
            <label>Latitud *</label>
            <input
              type="text"
              className="campo-input"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
              required
            />
          </div>
          <div className="campo-grupo">
            <label>Longitud *</label>
            <input
              type="text"
              className="campo-input"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              required
            />
          </div>
          <button type="button" className="btn-secundario" style={{ marginBottom: "16px", width: "100%" }} onClick={usarMiUbicacionEnvio}>
            📍 Usar Mi Ubicación Actual
          </button>
          <div className="accion-formulario">
            <button type="button" className="btn-secundario" onClick={cerrarModalUbicacion}>Cancelar</button>
            <button type="submit" className="btn-verde">Actualizar Ubicación</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
