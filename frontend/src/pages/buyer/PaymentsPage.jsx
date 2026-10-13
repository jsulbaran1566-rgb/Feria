import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import { obtenerReservas, crearPago, obtenerPagos } from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";

const ESTADOS_PAGADOS = ["Pagada", "En tránsito", "Entregada", "Calificada"];

export default function PaymentsPage() {
  const { avisar } = useDialogos();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedReservaId = searchParams.get("pagar") || searchParams.get("reserva_id");

  // Estados principales
  const [todasFacturas, setTodasFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState(null);
  
  // Filtro
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroAplicado, setFiltroAplicado] = useState("");

  // Estadísticas
  const [stats, setStats] = useState({
    totalComprometido: 0,
    totalPagado: 0,
    totalPendiente: 0,
    numFacturas: 0
  });

  // Modal Pago
  const [modalPago, setModalPago] = useState(null); // Contiene datos de la reserva y resumen
  const [pagoLoading, setPagoLoading] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);
  const [resultadoPago, setResultadoPago] = useState("aprobado");
  const [mostrarAnticipo, setMostrarAnticipo] = useState(false);
  const [resumenPago, setResumenPago] = useState(null);
  const [esReintento, setEsReintento] = useState(false);

  const cargarFacturas = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const reservas = await obtenerReservas({ comprador_id: user.id });
      const facturas = reservas
        .filter((r) => r.estado !== "Pendiente" && r.estado !== "Cancelada")
        .map((r) => {
          const monto = r.precio_kg != null ? Number(r.cantidad) * Number(r.precio_kg) : null;
          let estadoPago = "Pendiente";

          if (ESTADOS_PAGADOS.includes(r.estado)) {
            estadoPago = "Pagado";
          }
          if (r.estado_pago === "fallido" || r.estado_pago === "Fallido" || r.estado_pago === "Pago fallido") {
            estadoPago = "Pago fallido";
          }

          return {
            reserva_id: r.id,
            numero: "FAC-" + String(r.id).padStart(4, "0"),
            producto: r.lote?.nombre_producto || r.producto || "—",
            productor: r.productor_nombre || r.productor || "—",
            fecha: r.fecha_reserva || r.fecha || "—",
            monto: monto,
            estado: estadoPago,
            ...r
          };
        });

      facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      const totalComprometido = facturas.reduce((s, f) => s + (f.monto || 0), 0);
      const totalPagado = facturas.filter((f) => f.estado === "Pagado").reduce((s, f) => s + (f.monto || 0), 0);
      const totalPendiente = facturas.filter((f) => f.estado === "Pendiente" || f.estado === "Pago fallido").reduce((s, f) => s + (f.monto || 0), 0);

      setTodasFacturas(facturas);
      setStats({
        totalComprometido,
        totalPagado,
        totalPendiente,
        numFacturas: facturas.length
      });

    } catch {
      setAlertInfo({ type: "error", message: "Error al cargar facturas." });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  const abrirModalPago = useCallback(async (factura, reintento = false) => {
    setModalPago(factura);
    setEsReintento(reintento);
    setMostrarAnticipo(false);
    setResultadoPago("aprobado");
    setModalAlert(null);
    setResumenPago(null);

    try {
      const resumen = await obtenerPagos(factura.reserva_id);
      setResumenPago({
        total: Number(resumen.monto_total_reserva) || 0,
        pagado: Number(resumen.monto_pagado) || 0,
        pendiente: Number(resumen.monto_pendiente) || 0,
        anticipo_pct: resumen.anticipo_pct,
        monto_anticipo: Number(resumen.monto_anticipo) || 0
      });
    } catch (error) {
      console.warn("No se pudo consultar el resumen del pago:", error);
    }
  }, []);

  // Abre el modal de pago de la reserva preseleccionada (solo una vez)
  const preseleccionAbierta = useRef(false);

  useEffect(() => {
    if (preseleccionAbierta.current) return;
    if (!loading && todasFacturas.length > 0 && preselectedReservaId) {
      const encontrada = todasFacturas.find(f => String(f.reserva_id) === String(preselectedReservaId));
      if (encontrada) {
        preseleccionAbierta.current = true;
        abrirModalPago(encontrada, encontrada.estado === "Pago fallido");
      }
    }
  }, [loading, todasFacturas, preselectedReservaId, abrirModalPago]);

  const facturasFiltradas = useMemo(
    () =>
      filtroAplicado
        ? todasFacturas.filter((f) => f.estado === filtroAplicado)
        : todasFacturas,
    [todasFacturas, filtroAplicado]
  );

  const filtrarFacturas = () => {
    setFiltroAplicado(filtroEstado);
  };

  const mostrarCampoAnticipo = () => {
    setMostrarAnticipo(true);
  };

  const cerrarModalPago = () => {
    setModalPago(null);
    setResumenPago(null);
    setMostrarAnticipo(false);
  };

  const ejecutarPago = async (montoParcial = null) => {
    if (!modalPago) return;
    setPagoLoading(true);
    setModalAlert(null);

    try {
      const datos = {
        reserva_id: modalPago.reserva_id,
        metodo: "Simulado - Tarjeta",
        resultado_simulado: resultadoPago,
      };

      if (montoParcial !== null && montoParcial !== undefined) {
        datos.monto = parseFloat(montoParcial);
      }

      const pago = await crearPago(datos);

      if (resultadoPago === "fallido") {
        setModalAlert({ type: "error", message: "❌ El pago fue rechazado. Puedes corregir el método o intentarlo nuevamente." });
        setTimeout(() => {
          cargarFacturas();
        }, 1500);
      } else {
        const pagoCompleto = pago && pago.reserva_completamente_pagada;
        if (pagoCompleto) {
          setModalAlert({ type: "ok", message: `✅ ¡Pago completo! Total pagado: $${Number(pago.monto_total_reserva || 0).toLocaleString("es-CO")}.` });
        } else {
          setModalAlert({ type: "ok", message: `✅ ¡Abono registrado! Pendiente: $${Number(pago.monto_pendiente || 0).toLocaleString("es-CO")}.` });
        }
        setTimeout(() => {
          cerrarModalPago();
          cargarFacturas();
        }, 1800);
      }
    } catch (err) {
      setModalAlert({ type: "error", message: "No se pudo procesar el pago: " + (err.message || "Error desconocido") });
    } finally {
      setPagoLoading(false);
    }
  };

  const descargarFactura = (numero) => {
    avisar("Comprobante " + numero + "\n\nSe ha descargado su comprobante de pago exitosamente (simulado).");
  };

  const renderFila = (f) => {
    let claseEstado = "etiqueta-naranja";
    if (f.estado === "Pagado") claseEstado = "etiqueta-verde";
    if (f.estado === "Pago fallido") claseEstado = "etiqueta-roja";

    let accion = null;
    if (f.estado === "Pagado") {
      accion = <button className="btn-tabla btn-editar" onClick={() => descargarFactura(f.numero)}>Descargar</button>;
    } else if (f.estado === "Pago fallido") {
      accion = <button className="btn-tabla btn-editar" onClick={() => abrirModalPago(f, true)}>🔄 Reintentar</button>;
    } else {
      accion = <button className="btn-tabla btn-editar" onClick={() => abrirModalPago(f, false)}>💳 Pagar ahora</button>;
    }

    return (
      <tr key={f.reserva_id}>
        <td>{f.numero}</td>
        <td>{f.producto}</td>
        <td>{f.productor}</td>
        <td>{f.fecha}</td>
        <td>{f.monto != null ? "$" + Number(f.monto).toLocaleString("es-CO") : "—"}</td>
        <td><span className={`etiqueta ${claseEstado}`}>{f.estado}</span></td>
        <td>{accion}</td>
      </tr>
    );
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Pagos y Facturas</h2>
          <p>Historial de transacciones y descarga de comprobantes</p>
        </div>
      </div>

      <Alert type={alertInfo?.type} message={alertInfo?.message} onClose={() => setAlertInfo(null)} />

      {/* Estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta stat-naranja" data-icono="💳">
          <div className="stat-numero" id="stat-total-comprometido">${stats.totalComprometido.toLocaleString("es-CO")}</div>
          <div className="stat-etiqueta">Total Comprometido</div>
        </div>
        <div className="stat-tarjeta stat-verde" data-icono="✅">
          <div className="stat-numero" id="stat-total-pagado">${stats.totalPagado.toLocaleString("es-CO")}</div>
          <div className="stat-etiqueta">Total Pagado</div>
        </div>
        <div className="stat-tarjeta" data-icono="⏳">
          <div className="stat-numero" id="stat-total-pendiente">${stats.totalPendiente.toLocaleString("es-CO")}</div>
          <div className="stat-etiqueta">Pendiente por Pagar</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="🧾">
          <div className="stat-numero" id="stat-num-facturas">{stats.numFacturas}</div>
          <div className="stat-etiqueta">Facturas Emitidas</div>
        </div>
      </div>

      {/* Historial */}
      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Historial de Facturas</h3>
        </div>

        <div className="barra-filtro">
          <select 
            id="filtro-estado-pago" 
            className="campo-input input-angosto" 
            style={{ maxWidth: "220px" }}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="Pagado">Pagado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pago fallido">Pago fallido</option>
          </select>
          <button className="btn-verde btn-borde" onClick={filtrarFacturas}>Filtrar</button>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>N° Factura</th>
              <th>Producto</th>
              <th>Productor</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="celda-vacia">Cargando facturas...</td></tr>
            ) : facturasFiltradas.length === 0 ? (
              <tr><td colSpan="7" className="celda-vacia">Sin facturas registradas</td></tr>
            ) : (
              facturasFiltradas.map(renderFila)
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Pago */}
      <Modal
        isOpen={!!modalPago}
        onClose={cerrarModalPago}
        title={`💳 ${esReintento ? "Reintentar pago de" : "Pagar"} reserva #${modalPago?.reserva_id}`}
      >
        <div>
          <p className="texto-secundario">
            {resumenPago 
              ? `Total: $${resumenPago.total.toLocaleString("es-CO")} · Pagado: $${resumenPago.pagado.toLocaleString("es-CO")} · Pendiente: $${resumenPago.pendiente.toLocaleString("es-CO")}`
              : "Consultando saldo..."}
          </p>

          <div style={{ marginTop: "18px" }}>
            <label style={{ fontWeight: "bold" }}>Resultado del pago</label>
            <select
              className="campo-input"
              style={{ width: "100%", marginTop: "8px" }}
              value={resultadoPago}
              onChange={(e) => setResultadoPago(e.target.value)}
            >
              <option value="aprobado">✅ Pago aprobado</option>
              <option value="fallido">❌ Pago fallido</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button className="btn-verde" style={{ flex: 1 }} onClick={() => ejecutarPago(null)} disabled={pagoLoading}>
              Pagar todo
            </button>
            {resumenPago?.anticipo_pct && resumenPago?.pagado === 0 && !mostrarAnticipo && (
              <button className="btn-verde btn-borde" style={{ flex: 1 }} onClick={mostrarCampoAnticipo} disabled={pagoLoading}>
                Abonar anticipo
              </button>
            )}
          </div>

          {mostrarAnticipo && resumenPago && (
            <div style={{ marginTop: "16px" }}>
              <p className="texto-secundario">
                El productor configuró un anticipo del {resumenPago.anticipo_pct}%: ${resumenPago.monto_anticipo.toLocaleString("es-CO")}. El resto se paga como saldo antes de la entrega.
              </p>
              <button className="btn-verde" onClick={() => ejecutarPago(resumenPago.monto_anticipo)} disabled={pagoLoading}>
                Pagar anticipo
              </button>
            </div>
          )}

          {modalAlert && (
            <div className={`alerta ${modalAlert.type === 'error' ? 'alerta-error' : 'alerta-ok'} visible`} style={{ marginTop: "16px" }}>
              {modalAlert.message}
            </div>
          )}
        </div>
      </Modal>

    </>
  );
}
