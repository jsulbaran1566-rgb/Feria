import { useState, useEffect } from "react";
import { obtenerReporteAdmin, exportarCSV } from "../../services/api";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";
import type { EstadoAlerta, Filtros, ReporteAdmin } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function ReportsAdminPage() {
  const { avisar } = useDialogos();
  const [reporte, setReporte] = useState<ReporteAdmin | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);

  const cargarReporte = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const params: Filtros = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const res = await obtenerReporteAdmin(params);
      setReporte(res);
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "No se pudo generar el reporte.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, []); // eslint-disable-line

  const handleExportarCSV = async () => {
    if (!reporte) {
      await avisar("Primero genera el reporte.");
      return;
    }
    const r = reporte;
    const filas = [{
      desde: r.rango?.desde || "inicio",
      hasta: r.rango?.hasta || "hoy",
      transacciones_aprobadas: r.volumen_transacciones,
      volumen_total: r.monto_total_transacciones,
      comision_plataforma: r.comision_total_plataforma,
      total_disputas: r.total_disputas,
      ...Object.fromEntries(Object.entries(r.disputas_por_estado || {}).map(([k, v]) => [`disputas_${k}`, v])),
      total_usuarios_activos: r.total_usuarios_activos,
      ...Object.fromEntries(Object.entries(r.usuarios_activos_por_rol || {}).map(([k, v]) => [`usuarios_${k}`, v])),
    }];
    if (!exportarCSV(`reporte-financiero-${new Date().toISOString().slice(0,10)}.csv`, filas)) {
      await avisar("No hay datos para exportar.");
    }
  };

  return (
    <>
      <div className="banner-panel banner-historial" style={{ marginBottom: "20px", padding: "12px", background: "#f0f4f8", borderRadius: "8px" }}>
        <span>📈 Volumen de transacciones, comisiones, disputas y usuarios activos</span>
      </div>

      <div className="cabecera-panel">
        <div>
          <h2>Reporte Financiero <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>RF-41 — vista general de la salud financiera de la plataforma</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-verde btn-borde" onClick={handleExportarCSV}>
            ⬇️ Exportar CSV
          </button>
          <button className="btn-verde btn-borde" onClick={() => window.print()}>
            🖨️ Exportar PDF
          </button>
        </div>
      </div>

      <div className="barra-filtro margen-top-16" style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "20px" }}>
        <div className="campo-grupo" style={{ marginBottom: 0 }}>
          <label>Desde</label>
          <input
            type="date"
            className="campo-input"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className="campo-grupo" style={{ marginBottom: 0 }}>
          <label>Hasta</label>
          <input
            type="date"
            className="campo-input"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
        <button className="btn-verde" onClick={cargarReporte}>
          Filtrar
        </button>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {loading ? (
        <p className="celda-vacia" style={{ padding: "40px" }}>Generando reporte...</p>
      ) : !reporte ? (
        <p className="celda-vacia">No hay datos para el periodo seleccionado.</p>
      ) : (
        <>
          <div className="fila-stats margen-top-16">
            <div className="stat-tarjeta" data-icono="💳">
              <div className="stat-numero">{reporte.volumen_transacciones || 0}</div>
              <div className="stat-etiqueta">Transacciones Aprobadas</div>
            </div>
            <div className="stat-tarjeta stat-naranja" data-icono="💰">
              <div className="stat-numero">
                ${Math.round(reporte.monto_total_transacciones || 0).toLocaleString("es-CO")}
              </div>
              <div className="stat-etiqueta">Volumen Total</div>
            </div>
            <div className="stat-tarjeta stat-marron" data-icono="🏦">
              <div className="stat-numero">
                ${Math.round(reporte.comision_total_plataforma || 0).toLocaleString("es-CO")}
              </div>
              <div className="stat-etiqueta">Comisión de la Plataforma</div>
            </div>
            <div className="stat-tarjeta" data-icono="⚖️">
              <div className="stat-numero">{reporte.total_disputas || 0}</div>
              <div className="stat-etiqueta">Disputas Totales</div>
            </div>
          </div>

          <div className="margen-top-32" style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div className="tarjeta" style={{ flex: 1, minWidth: "280px" }}>
              <h3>Disputas por estado</h3>
              <div className="margen-top-16">
                {reporte.disputas_por_estado && Object.keys(reporte.disputas_por_estado).length > 0 ? (
                  Object.entries(reporte.disputas_por_estado).map(([estado, n]) => (
                    <p key={estado} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0", margin: 0, display: "flex", justifyContent: "space-between" }}>
                      <span>{estado}</span>
                      <strong>{n}</strong>
                    </p>
                  ))
                ) : (
                  <p className="celda-vacia">Sin disputas registradas</p>
                )}
              </div>
            </div>
            <div className="tarjeta" style={{ flex: 1, minWidth: "280px" }}>
              <h3>Usuarios activos por rol</h3>
              <div className="margen-top-16">
                {reporte.usuarios_activos_por_rol && Object.keys(reporte.usuarios_activos_por_rol).length > 0 ? (
                  Object.entries(reporte.usuarios_activos_por_rol).map(([rol, n]) => (
                    <p key={rol} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0", margin: 0, display: "flex", justifyContent: "space-between" }}>
                      <span>{rol}</span>
                      <strong>{n}</strong>
                    </p>
                  ))
                ) : (
                  <p className="celda-vacia">Sin usuarios activos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
