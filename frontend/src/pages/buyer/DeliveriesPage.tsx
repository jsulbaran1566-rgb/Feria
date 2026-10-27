import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../context/authContexto";
import {
  obtenerReservas,
  actualizarEntrega,
  obtenerEntregas,
  obtenerDisputas,
  crearCalificacion,
  crearDisputa
} from "../../services/api";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import type { Disputa, Entrega, EstadoAlerta } from "../../types";
import { mensajeError } from "../../utils/errores";

// Una reserva vista como entrega programada
interface EntregaItem {
  reserva_id: number;
  producto: string;
  productor: string;
  productor_id: number | null;
  kg: number;
  fecha: string;
  dias: number;
  estado: string;
  estado_api: string;
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const [todasEntregas, setTodasEntregas] = useState<EntregaItem[]>([]);
  const [disputas, setDisputas] = useState<Disputa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);

  // Modals state
  const [modalRecepcion, setModalRecepcion] = useState<EntregaItem | null>(null);
  const [modalSeguimiento, setModalSeguimiento] = useState<EntregaItem | null>(null);
  const [modalCalificacion, setModalCalificacion] = useState<EntregaItem | null>(null);
  const [modalDisputa, setModalDisputa] = useState<EntregaItem | null>(null);

  // Modal forms
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
  
  const [estrellas, setEstrellas] = useState(0);
  const [comentarioCalificacion, setComentarioCalificacion] = useState("");
  
  const [descripcionDisputa, setDescripcionDisputa] = useState("");

  const [modalAlert, setModalAlert] = useState<EstadoAlerta | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [seguimientoData, setSeguimientoData] = useState<Entrega | null>(null);

  const diasRestantes = (fechaStr: string | null | undefined) => {
    if (!fechaStr) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr);
    fecha.setHours(0, 0, 0, 0);
    return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const estadoEntregaCalc = (dias: number) => {
    if (dias < 0) return "vencida";
    if (dias <= 7) return "proxima";
    return "pendiente";
  };

  const cargarEntregas = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await obtenerReservas({ comprador_id: user.id });
      
      let disputasRes: Disputa[] = [];
      try {
        disputasRes = await obtenerDisputas();
      } catch (e) {
        console.warn("No se pudieron consultar las disputas:", e);
      }
      setDisputas(disputasRes);

      const ESTADOS_CON_ENTREGA = ["Pagada", "En tránsito", "Entregada", "Calificada"];
      
      const lista = Array.isArray(res)
        ? res
            .filter((r) => ESTADOS_CON_ENTREGA.includes(r.estado))
            .map((r) => {
              const fechaEntrega = r.fecha_cosecha || r.fecha;
              const dias = diasRestantes(fechaEntrega);
              return {
                reserva_id: r.id,
                producto: r.producto || `Lote #${r.lote_id}`,
                productor: r.productor || "—",
                productor_id: r.productor_id || null,
                kg: Number(r.cantidad) || 0,
                fecha: fechaEntrega || "",
                dias,
                estado: estadoEntregaCalc(dias),
                estado_api: r.estado
              };
            })
            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        : [];
        
      setTodasEntregas(lista);
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "Error al cargar entregas.") });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarEntregas();
  }, [cargarEntregas]);

  const tieneDisputa = (reservaId: number) => {
    return disputas.some((d) => Number(d.reserva_id) === Number(reservaId));
  };

  // --- Handlers ---
  const handleConfirmarRecepcion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalRecepcion || !codigoConfirmacion.trim()) return;

    setActionLoading(true);
    setModalAlert(null);

    try {
      const entregas = await obtenerEntregas(modalRecepcion.reserva_id);
      const registro = entregas.find((en) => en.estado === "En tránsito");
      
      if (!registro) {
          throw new Error("Esta reserva aún no tiene una entrega despachada por el productor.");
      }

      await actualizarEntrega(registro.id, {
        codigo_confirmacion: codigoConfirmacion.trim(),
      });

      setModalAlert({ type: "ok", message: "¡Recepción confirmada con éxito!" });
      setTimeout(() => {
        setModalRecepcion(null);
        setCodigoConfirmacion("");
        cargarEntregas();
      }, 1000);
    } catch (err) {
      setModalAlert({
        type: "error",
        message: "No se pudo confirmar: " + (mensajeError(err, "código incorrecto"))
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarCalificacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalCalificacion) return;
    if (!estrellas) {
      setModalAlert({ type: "error", message: "Seleccione una calificación." });
      return;
    }
    setActionLoading(true);
    setModalAlert(null);
    try {
      await crearCalificacion({
        reserva_id: modalCalificacion.reserva_id,
        estrellas,
        comentario: comentarioCalificacion
      });
      setModalAlert({ type: "ok", message: "¡Calificación guardada!" });
      setTimeout(() => {
        setModalCalificacion(null);
        setEstrellas(0);
        setComentarioCalificacion("");
        cargarEntregas();
      }, 1000);
    } catch (err) {
      setModalAlert({ type: "error", message: mensajeError(err, "Error al guardar calificación.") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarDisputa = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalDisputa || !descripcionDisputa.trim()) return;
    setActionLoading(true);
    setModalAlert(null);
    try {
      await crearDisputa({
        reserva_id: modalDisputa.reserva_id,
        descripcion: descripcionDisputa.trim()
      });
      setModalAlert({ type: "ok", message: "Disputa registrada." });
      setTimeout(() => {
        setModalDisputa(null);
        setDescripcionDisputa("");
        cargarEntregas();
      }, 1000);
    } catch (err) {
      setModalAlert({ type: "error", message: mensajeError(err, "Error al crear disputa.") });
    } finally {
      setActionLoading(false);
    }
  };


  const abrirModalSeguimiento = async (item: EntregaItem) => {
      setModalSeguimiento(item);
      setSeguimientoData(null);
      setModalAlert(null);
      try {
          const entregasRes = await obtenerEntregas(item.reserva_id);
          const entrega = entregasRes.find((e) => e.estado === "En tránsito");
          if (!entrega || entrega.latitud_actual == null) {
              setModalAlert({ type: "error", message: "El productor todavía no ha compartido la ubicación de este envío." });
              return;
          }
          setSeguimientoData(entrega);
      } catch(err) {
          setModalAlert({ type: "error", message: "No se pudo cargar la ubicación: " + mensajeError(err) });
      }
  };

  const entregasFiltradas = todasEntregas.filter((e) => {
    if (!filtro) return true;
    return e.estado === filtro;
  });

  const kgTotal = todasEntregas.reduce((s, e) => s + e.kg, 0);
  const proximos7 = todasEntregas.filter((e) => e.estado === "proxima").length;

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Próximas Entregas</h2>
          <p>Calendario y seguimiento de las entregas de sus reservas activas</p>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🚚">
          <div className="stat-numero">{loading ? "..." : todasEntregas.length}</div>
          <div className="stat-etiqueta">Entregas Programadas</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="⏳">
          <div className="stat-numero">{loading ? "..." : proximos7}</div>
          <div className="stat-etiqueta">En los próximos 7 días</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="⚖️">
          <div className="stat-numero">
            {loading ? "..." : `${kgTotal.toLocaleString("es-CO")}`}
          </div>
          <div className="stat-etiqueta">Kg Totales en Camino</div>
        </div>
      </div>

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Calendario de Entregas</h3>
        </div>

        <div className="barra-filtro">
          <select
            className="campo-input input-angosto"
            style={{ maxWidth: "220px" }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="proxima">Próxima (7 días)</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Productor</th>
              <th>Kg</th>
              <th>Fecha de Entrega</th>
              <th>Días Restantes</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="celda-vacia">Cargando...</td>
              </tr>
            ) : entregasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="celda-vacia">No tiene entregas programadas</td>
              </tr>
            ) : (
              entregasFiltradas.map((item) => {
                let statusBadge;
                if (item.estado_api === "Calificada" || item.estado_api === "Entregada") {
                    statusBadge = <Badge>{item.estado_api}</Badge>;
                } else if (item.estado_api === "En tránsito") {
                    statusBadge = <Badge>En tránsito</Badge>;
                } else if (item.estado_api === "Pagada") {
                    statusBadge = <Badge>Pagada — sin despachar</Badge>;
                } else {
                    statusBadge = <Badge>{item.estado_api || "—"}</Badge>;
                }

                return (
                  <tr key={item.reserva_id}>
                    <td>{item.producto}</td>
                    <td>{item.productor}</td>
                    <td>{item.kg.toLocaleString("es-CO")} kg</td>
                    <td>{item.fecha || "—"}</td>
                    <td>{item.dias >= 0 ? `${item.dias} días` : `Vencida hace ${Math.abs(item.dias)} días`}</td>
                    <td>{statusBadge}</td>
                    <td>
                      <div className="acciones-entrega" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {item.estado_api === "En tránsito" && (
                          <>
                            <button className="btn-tabla btn-editar" onClick={() => { setModalRecepcion(item); setModalAlert(null); }}>
                              Confirmar recepción
                            </button>
                            <button className="btn-tabla btn-editar" onClick={() => abrirModalSeguimiento(item)}>
                              📍 Ver ubicación
                            </button>
                          </>
                        )}
                        {item.estado_api === "Entregada" && (
                          <button className="btn-tabla btn-editar" onClick={() => { setModalCalificacion(item); setModalAlert(null); }}>
                            ⭐ Calificar entrega
                          </button>
                        )}
                        {(item.estado_api === "En tránsito" || item.estado_api === "Entregada") && !tieneDisputa(item.reserva_id) && (
                          <button className="btn-tabla btn-editar" onClick={() => { setModalDisputa(item); setModalAlert(null); }}>
                            🚨 Reportar problema
                          </button>
                        )}
                        {item.estado_api === "Pagada" && (
                          <span>Esperando despacho</span>
                        )}
                        {item.estado_api === "Calificada" && (
                          <>
                            <span className="texto-secundario">Entrega calificada</span>
                            {tieneDisputa(item.reserva_id) ? (
                              <span className="texto-secundario"><br/>🚨 Disputa registrada</span>
                            ) : (
                              <button className="btn-tabla btn-editar" onClick={() => { setModalDisputa(item); setModalAlert(null); }}>
                                🚨 Reportar problema
                              </button>
                            )}
                          </>
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

      {/* Modal Recepcion */}
      <Modal isOpen={!!modalRecepcion} onClose={() => setModalRecepcion(null)} title="Confirmar Recepción">
        <form onSubmit={handleConfirmarRecepcion}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
          <div className="campo-grupo">
            <label>Producto</label>
            <input type="text" className="campo-input" readOnly value={modalRecepcion?.producto || ""} />
          </div>
          <div className="campo-grupo">
            <label>Código de confirmación</label>
            <input type="text" className="campo-input" maxLength={6} inputMode="numeric" placeholder="6 dígitos que le compartió el productor" value={codigoConfirmacion} onChange={(e) => setCodigoConfirmacion(e.target.value)} required />
          </div>
          <div className="fila-botones" style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button type="submit" className="btn-verde" disabled={actionLoading}>Confirmar Recepción</button>
            <button type="button" className="btn-verde btn-borde" onClick={() => setModalRecepcion(null)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Seguimiento */}
      <Modal isOpen={!!modalSeguimiento} onClose={() => setModalSeguimiento(null)} title="📍 Ubicación del envío">
        <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
        {seguimientoData ? (
          <div>
            <p className="texto-secundario">
                Actualizado: {seguimientoData.ubicacion_actualizada ? new Date(seguimientoData.ubicacion_actualizada).toLocaleString("es-CO") : "—"}
            </p>
            <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(Number(seguimientoData.latitud_actual))},${encodeURIComponent(Number(seguimientoData.longitud_actual))}&output=embed`}
                width="100%"
                height="260"
                style={{ border: 0, borderRadius: "8px", marginTop: "8px" }}
                loading="lazy">
            </iframe>
            <p className="texto-secundario margen-top-16">
                📍 Ubicación reportada manualmente por el productor — no es GPS en vivo de un transportista.
            </p>
          </div>
        ) : !modalAlert && <p className="celda-vacia">Cargando...</p>}
      </Modal>

      {/* Modal Calificacion */}
      <Modal isOpen={!!modalCalificacion} onClose={() => setModalCalificacion(null)} title="⭐ Calificar entrega">
        <form onSubmit={handleGuardarCalificacion}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
          <p className="modal-descripcion">Califica de 1 a 5 estrellas y deja un comentario para ayudar a la reputación del productor.</p>
          <div className="campo-grupo">
            <label>Producto</label>
            <input type="text" className="campo-input" readOnly value={modalCalificacion?.producto || ""} />
          </div>
          <div className="campo-grupo">
            <label>Calificación</label>
            <div className="estrellas-calificacion" style={{ display: "flex", gap: "10px", fontSize: "1.5rem", cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setEstrellas(star)} style={{ color: estrellas >= star ? "#ffc107" : "#ccc" }}>★</span>
              ))}
            </div>
            <div className="texto-estrellas" style={{ marginTop: "5px" }}>
              {estrellas === 1 && "⭐ Muy mala"}
              {estrellas === 2 && "⭐⭐ Mala"}
              {estrellas === 3 && "⭐⭐⭐ Regular"}
              {estrellas === 4 && "⭐⭐⭐⭐ Buena"}
              {estrellas === 5 && "⭐⭐⭐⭐⭐ Excelente"}
              {!estrellas && "Seleccione una calificación"}
            </div>
          </div>
          <div className="campo-grupo">
            <label>Comentario (opcional)</label>
            <textarea className="campo-input" rows={4} maxLength={500} placeholder="Cuéntanos cómo fue tu experiencia con el productor..." value={comentarioCalificacion} onChange={(e) => setComentarioCalificacion(e.target.value)}></textarea>
          </div>
          <div className="fila-botones" style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button type="submit" className="btn-verde" disabled={actionLoading}>⭐ Guardar calificación</button>
            <button type="button" className="btn-verde btn-borde" onClick={() => setModalCalificacion(null)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Disputa */}
      <Modal isOpen={!!modalDisputa} onClose={() => setModalDisputa(null)} title="🚨 Reportar problema">
        <form onSubmit={handleGuardarDisputa}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
          <p className="modal-descripcion">Abre un ticket de disputa si el producto llegó incompleto, presenta problemas de calidad o no llegó.</p>
          <div className="campo-grupo">
            <label>Producto</label>
            <input type="text" className="campo-input" readOnly value={modalDisputa?.producto || ""} />
          </div>
          <div className="campo-grupo">
            <label>Descripción del problema</label>
            <textarea className="campo-input" rows={6} maxLength={1000} placeholder="Describe detalladamente el problema ocurrido..." value={descripcionDisputa} onChange={(e) => setDescripcionDisputa(e.target.value)} required></textarea>
          </div>
          <div className="fila-botones" style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button type="submit" className="btn-verde" disabled={actionLoading}>🚨 Reportar problema</button>
            <button type="button" className="btn-verde btn-borde" onClick={() => setModalDisputa(null)}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
