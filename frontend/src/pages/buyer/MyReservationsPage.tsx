import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import {
  obtenerReservas,
  editarEstadoReserva,
  crearDisputa,
  crearCalificacion,
  obtenerPagos,
  crearPago
} from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import type { DatosPago, EstadoAlerta, Reserva } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function MyReservationsPage() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  // Fecha de referencia fija durante la vida de la página (no cambia en cada render)
  const [hoy] = useState(() => new Date());
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);

  // Modal Cancelar
  const [modalCancelar, setModalCancelar] = useState<Reserva | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal Disputa
  const [modalDisputa, setModalDisputa] = useState<Reserva | null>(null);
  const [motivoDisputa, setMotivoDisputa] = useState("");
  const [disputaLoading, setDisputaLoading] = useState(false);

  // Modal Calificar
  const [modalCalificar, setModalCalificar] = useState<Reserva | null>(null);
  const [calificacionPuntos, setCalificacionPuntos] = useState(5);
  const [calificacionComentario, setCalificacionComentario] = useState("");
  const [calificarLoading, setCalificarLoading] = useState(false);

  // Modal Timeline
  const [modalTimeline, setModalTimeline] = useState<Reserva | null>(null);

  // Modal Pago
  const [modalPago, setModalPago] = useState<Reserva | null>(null);
  const [pagoResumen, setPagoResumen] = useState("");
  const [montoAnticipoActual, setMontoAnticipoActual] = useState<number | null>(null);
  const [mostrarAnticipo, setMostrarAnticipo] = useState(false);
  const [mostrarBotonAnticipo, setMostrarBotonAnticipo] = useState(false);
  const [textoAnticipo, setTextoAnticipo] = useState("");

  const cargarReservas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await obtenerReservas({ comprador_id: user.id });
      setReservas(Array.isArray(res) ? res : []);
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "Error al cargar reservas.") });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const handleConfirmarCancelacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalCancelar) return;
    if (!motivoCancelacion.trim()) {
        setAlert({ type: "error", message: "Escribe el motivo antes de confirmar." });
        return;
    }

    setCancelLoading(true);
    try {
      await editarEstadoReserva(modalCancelar.id, {
        estado: "Cancelada",
        motivo_cancelacion: motivoCancelacion.trim(),
      });
      setAlert({ type: "ok", message: "Reserva cancelada correctamente." });
      setModalCancelar(null);
      setMotivoCancelacion("");
      cargarReservas();
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "No se pudo cancelar la reserva.") });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleEnviarDisputa = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalDisputa) return;
    if (!motivoDisputa.trim()) {
        setAlert({ type: "error", message: "Describe el problema antes de enviar." });
        return;
    }

    setDisputaLoading(true);
    try {
      await crearDisputa({
        reserva_id: modalDisputa.id,
        descripcion: motivoDisputa.trim(),
      });
      setAlert({ type: "ok", message: "¡Disputa reportada! Un administrador la revisará pronto." });
      setModalDisputa(null);
      setMotivoDisputa("");
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "No se pudo reportar: error desconocido") });
    } finally {
      setDisputaLoading(false);
    }
  };

  const handleEnviarCalificacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalCalificar) return;
    setCalificarLoading(true);
    try {
      await crearCalificacion({
        reserva_id: modalCalificar.id,
        estrellas: Number(calificacionPuntos),
        comentario: calificacionComentario.trim(),
      });
      setAlert({ type: "ok", message: "¡Gracias por calificar al productor!" });
      setModalCalificar(null);
      setCalificacionComentario("");
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "No se pudo registrar la calificación.") });
    } finally {
      setCalificarLoading(false);
    }
  };

  // RF-16: Línea de tiempo
  const CICLO_CULTIVO = ['Siembra', 'Crecimiento', 'Listo', 'Cosechado'];

  const mostrarLineaTiempo = (r: Reserva) => {
    setModalTimeline(r);
  };

  const renderLineaTiempo = () => {
    if (!modalTimeline) return null;
    const reserva = modalTimeline;
    const estadoActual = reserva.estado_cultivo || 'Siembra';
    const indiceActual = CICLO_CULTIVO.indexOf(estadoActual);
    const retrasado = reserva.fecha_cosecha && new Date(reserva.fecha_cosecha) < hoy && estadoActual !== 'Cosechado';

    return (
      <div id="timeline-contenedor" className="margen-top-16">
        {CICLO_CULTIVO.map((etapa, i) => {
          let clase = 'pendiente';
          let icono = '○';
          if (i < indiceActual) { clase = 'ok'; icono = '✓'; }
          else if (i === indiceActual) {
            clase = retrasado ? 'retraso' : 'ok';
            icono = retrasado ? '⚠' : '●';
          }
          const nota = (i === indiceActual && retrasado)
            ? <p style={{ color: "#c62828", fontSize: "0.85rem" }}>Se estimaba para el {reserva.fecha_cosecha} y todavía no llega aquí.</p>
            : null;
          return (
            <div className="paso-timeline" key={etapa} style={{ display: "flex", gap: "14px", position: "relative", paddingBottom: "24px" }}>
              <div className={`punto-timeline ${clase}`} style={{
                  width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", color: "#fff", zIndex: 1,
                  background: clase === 'ok' ? '#2e7d32' : clase === 'retraso' ? '#c62828' : '#bbb'
              }}>{icono}</div>
              <div>
                <strong>{etapa}</strong>
                {nota}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const abrirModalPago = async (r: Reserva) => {
    setModalPago(r);
    setMontoAnticipoActual(null);
    setMostrarAnticipo(false);
    setMostrarBotonAnticipo(false);
    setPagoResumen('Consultando saldo...');
    try {
        const resumen = await obtenerPagos(r.id);
        setPagoResumen(`Total: $${resumen.monto_total_reserva.toLocaleString('es-CO')} · Pagado: $${resumen.monto_pagado.toLocaleString('es-CO')} · Pendiente: $${resumen.monto_pendiente.toLocaleString('es-CO')}`);
        if (resumen.anticipo_pct && resumen.monto_pagado === 0) {
            setMontoAnticipoActual(resumen.monto_anticipo);
            setTextoAnticipo(`El productor configuró un anticipo del ${resumen.anticipo_pct}%: $${resumen.monto_anticipo.toLocaleString('es-CO')}. El resto se paga como saldo antes de la entrega.`);
            setMostrarBotonAnticipo(true);
        }
    } catch {
        setPagoResumen('');
    }
  };

  const ejecutarPago = async (montoParcial: number | null) => {
    if (!modalPago) return;
    const datos: DatosPago = { reserva_id: modalPago.id, metodo: 'Simulado - Tarjeta' };
    if (montoParcial) datos.monto = montoParcial;
    try {
        const pago = await crearPago(datos);
        const msj = pago.reserva_completamente_pagada
            ? `¡Pago completo! Total pagado: $${pago.monto_total_reserva.toLocaleString('es-CO')}.`
            : `¡Abono de $${pago.monto.toLocaleString('es-CO')} registrado! Pendiente: $${pago.monto_pendiente.toLocaleString('es-CO')}.`;
        setAlert({ type: "ok", message: msj });
        setTimeout(() => {
            setModalPago(null);
            cargarReservas();
        }, 1800);
    } catch (e) {
        setAlert({ type: "error", message: 'No se pudo procesar el pago: ' + (mensajeError(e, 'Error desconocido')) });
    }
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Mis Reservas Activas</h2>
          <p>Gestione sus reservas y comuniquese con el productor directamente.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-verde btn-borde" onClick={() => window.print()}>🖨️ Exportar PDF</button>
            <Link to="/comprador/explorar-lotes" className="btn-verde">🔍 Explorar Lotes</Link>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
            <h3 className="titulo-panel">Mis Reservas Activas</h3>
        </div>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Productor</th>
              <th>Kg</th>
              <th>Entrega Est.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="celda-vacia">Cargando...</td>
              </tr>
            ) : reservas.length === 0 ? (
              <tr>
                <td colSpan={6} className="celda-vacia">Sin reservas activas</td>
              </tr>
            ) : (
              reservas.map((r) => {
                const isCancelable = ["Pendiente", "Confirmada"].includes(r.estado);
                const canPay = r.estado === "Confirmada";
                const isDisputable = ["Entregada", "Calificada"].includes(r.estado);

                return (
                  <tr key={r.id}>
                    <td>{r.producto || '—'}</td>
                    <td>{r.productor || '—'}</td>
                    <td>{r.cantidad} kg</td>
                    <td>{r.fecha_cosecha || r.fecha || '—'}</td>
                    <td>
                      <span className="etiqueta etiqueta-azul">{r.estado}</span>
                    </td>
                    <td>
                      <div className="acciones-tabla" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button className="btn-tabla btn-editar" onClick={() => mostrarLineaTiempo(r)}>📊 Línea de tiempo</button>
                        {canPay && (
                            <button className="btn-tabla btn-editar" onClick={() => abrirModalPago(r)}>💳 Pagar</button>
                        )}
                        {isCancelable && (
                            <button className="btn-tabla btn-eliminar" onClick={() => {
                                setModalCancelar(r);
                                setMotivoCancelacion("");
                            }}>Cancelar</button>
                        )}
                        {isDisputable && (
                            <button className="btn-tabla btn-editar" onClick={() => {
                                setModalDisputa(r);
                                setMotivoDisputa("");
                            }}>🚩 Disputar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Cancelar */}
      <Modal
        isOpen={!!modalCancelar}
        onClose={() => setModalCancelar(null)}
        title="Cancelar reserva"
      >
        <form onSubmit={handleConfirmarCancelacion}>
          <p className="texto-secundario">
            Cuéntanos por qué cancelas — le ayuda al productor a entender qué pasó.
          </p>
          <div className="campo-grupo margen-top-16">
            <label>Motivo</label>
            <textarea
              className="campo-input campo-textarea"
              rows={3}
              placeholder="Ej: encontré el producto más barato en otro lado, cambié de planes, etc."
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="fila-botones margen-top-16">
            <button
              type="submit"
              className="btn-verde"
              disabled={cancelLoading}
            >
              {cancelLoading ? "Confirmando..." : "Confirmar cancelación"}
            </button>
            <button
              type="button"
              className="btn-verde btn-borde"
              onClick={() => setModalCancelar(null)}
            >
              Volver
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Disputa */}
      <Modal
        isOpen={!!modalDisputa}
        onClose={() => setModalDisputa(null)}
        title="🚩 Reportar Disputa"
      >
        <form onSubmit={handleEnviarDisputa}>
          <p className="texto-secundario">
            Úsalo si hubo un problema con esta entrega (producto incompleto, dañado, no coincide con lo reservado, etc.). Un administrador la revisará.
          </p>
          <div className="campo-grupo margen-top-16">
            <label>Descripción del problema</label>
            <textarea
              className="campo-input"
              rows={4}
              placeholder="Cuéntanos qué pasó..."
              value={motivoDisputa}
              onChange={(e) => setMotivoDisputa(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="fila-botones margen-top-16">
            <button type="submit" className="btn-verde" disabled={disputaLoading}>
              {disputaLoading ? "Enviando..." : "Reportar Disputa"}
            </button>
            <button
              type="button"
              className="btn-verde btn-borde"
              onClick={() => setModalDisputa(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Timeline */}
      <Modal
        isOpen={!!modalTimeline}
        onClose={() => setModalTimeline(null)}
        title={`📊 Línea de Tiempo — ${modalTimeline?.producto || ''}`}
      >
        <p className="texto-secundario">En rojo, los pasos que se pasaron de la fecha estimada.</p>
        {renderLineaTiempo()}
      </Modal>

      {/* Modal Pago */}
      <Modal
        isOpen={!!modalPago}
        onClose={() => setModalPago(null)}
        title={`💳 Pagar reserva #${modalPago?.id || ''}`}
      >
        <p className="texto-secundario">{pagoResumen}</p>
        
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button className="btn-verde" onClick={() => ejecutarPago(null)} style={{ flex: 1 }}>Pagar todo</button>
            {mostrarBotonAnticipo && (
                <button className="btn-verde btn-borde" onClick={() => setMostrarAnticipo(true)} style={{ flex: 1 }}>Abonar anticipo</button>
            )}
        </div>

        {mostrarAnticipo && (
            <div style={{ marginTop: "16px" }}>
                <p className="texto-secundario">{textoAnticipo}</p>
                <button className="btn-verde" onClick={() => ejecutarPago(montoAnticipoActual)}>Pagar anticipo</button>
            </div>
        )}
      </Modal>

      {/* Modal Calificar */}
      <Modal
        isOpen={!!modalCalificar}
        onClose={() => setModalCalificar(null)}
        title="Calificar Entrega y Productor"
      >
        <form onSubmit={handleEnviarCalificacion}>
          <div className="campo-grupo">
            <label>Puntuación (1 a 5 estrellas)</label>
            <select
              className="campo-input"
              value={calificacionPuntos}
              onChange={(e) => setCalificacionPuntos(Number(e.target.value))}
            >
              <option value="5">⭐⭐⭐⭐⭐ 5 - Excelente calidad y puntualidad</option>
              <option value="4">⭐⭐⭐⭐ 4 - Muy buena</option>
              <option value="3">⭐⭐⭐ 3 - Aceptable</option>
              <option value="2">⭐⭐ 2 - Regular</option>
              <option value="1">⭐ 1 - Mala experiencia</option>
            </select>
          </div>
          <div className="campo-grupo">
            <label>Comentario u observaciones</label>
            <textarea
              className="campo-input"
              rows={3}
              placeholder="¿Qué tal estuvo la frescura y presentación del producto?"
              value={calificacionComentario}
              onChange={(e) => setCalificacionComentario(e.target.value)}
            ></textarea>
          </div>
          <div className="accion-formulario">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => setModalCalificar(null)}
            >
              Cerrar
            </button>
            <button type="submit" className="btn-verde" disabled={calificarLoading}>
              {calificarLoading ? "Guardando..." : "Enviar Calificación"}
            </button>
          </div>
        </form>
      </Modal>

    </>
  );
}
