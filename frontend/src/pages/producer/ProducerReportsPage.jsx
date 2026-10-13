import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContexto";
import { obtenerReporteProductor, exportarCSV, obtenerLotes, obtenerReservas } from "../../services/api";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";

const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function etiquetaMes(clave) {
  const [anio, mes] = clave.split("-");
  return NOMBRES_MES[parseInt(mes) - 1] + " " + anio;
}

export default function ProducerReportsPage() {
  const { avisar } = useDialogos();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [stats, setStats] = useState({
    cultivosActivos: 0,
    kgReservados: 0,
    ingresosEstimados: 0,
    comisionTotal: 0,
    ingresosNetos: 0,
    puntaje: "—",
    reservasParaExportar: [],
    itemsCategoria: [],
    itemsMes: [],
    clavesOrdenadas: [],
    reservasPorMes: {},
    kgPorMes: {},
    ingresoPorMes: {}
  });

  
  function claveMes(fecha) {
    const f = new Date(fecha);
    return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0");
  }

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const idProductor = user.id;
        const [misLotes, todasReservas] = await Promise.all([
          obtenerLotes({ productor_id: idProductor }).catch(() => []),
          obtenerReservas({}).catch(() => [])
        ]);

        const idsLotes = new Set(misLotes.map((l) => l.id));
        const mapaLotes = {};
        misLotes.forEach((l) => { mapaLotes[l.id] = l; });
        
        const reservasRecibidas = todasReservas.filter((r) => idsLotes.has(r.lote_id));
        const reservasParaExportar = reservasRecibidas;

        const kgReservados = misLotes.reduce((s, l) => s + (l.kg_reservados || 0), 0);
        const cultivosActivos = misLotes.filter(l => l.estado === "Activo").length;

        let reporteRep = null;
        let ingresosEst = 0;
        let comisionTot = 0;
        let ingresosNet = 0;
        let puntajeRep = "—";

        try {
          reporteRep = await obtenerReporteProductor();
          ingresosEst = reporteRep.ingresos_totales || 0;
          comisionTot = reporteRep.comision_total || 0;
          ingresosNet = reporteRep.ingresos_netos || 0;
          if (reporteRep.calificacion && reporteRep.calificacion.puntaje != null) {
            puntajeRep = reporteRep.calificacion.puntaje;
          }
        } catch {
          reservasRecibidas.forEach((r) => {
            const lote = mapaLotes[r.lote_id];
            const precio = (lote && lote.precio_kg) || 2800;
            ingresosEst += r.cantidad * precio;
          });
        }

        const kgPorCategoria = {};
        misLotes.forEach((l) => {
          kgPorCategoria[l.categoria] = (kgPorCategoria[l.categoria] || 0) + (l.cantidad || 0);
        });
        const itemsCategoria = Object.entries(kgPorCategoria).map(([cat, kg]) => ({
          etiqueta: cat,
          valor: kg
        })).sort((a, b) => b.valor - a.valor);

        const ingresoPorMes = {};
        const kgPorMes = {};
        const reservasPorMes = {};

        reservasRecibidas.forEach((r) => {
          const clave = claveMes(r.fecha);
          const lote = mapaLotes[r.lote_id];
          const precio = (lote && lote.precio_kg) || 2800;
          ingresoPorMes[clave] = (ingresoPorMes[clave] || 0) + (r.cantidad * precio);
          kgPorMes[clave] = (kgPorMes[clave] || 0) + r.cantidad;
          reservasPorMes[clave] = (reservasPorMes[clave] || 0) + 1;
        });

        const clavesOrdenadas = Object.keys(ingresoPorMes).sort();
        const ultimosSeisMeses = clavesOrdenadas.slice(-6);
        const itemsMes = ultimosSeisMeses.map((clave) => ({
          etiqueta: etiquetaMes(clave),
          valor: Math.round(ingresoPorMes[clave])
        }));

        setStats({
          cultivosActivos,
          kgReservados,
          ingresosEstimados: ingresosEst,
          comisionTotal: comisionTot,
          ingresosNetos: ingresosNet,
          puntaje: puntajeRep,
          reservasParaExportar,
          itemsCategoria,
          itemsMes,
          clavesOrdenadas,
          reservasPorMes,
          kgPorMes,
          ingresoPorMes
        });
      } catch (err) {
        setAlert({ type: "error", message: err.message || "Error al cargar reportes." });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const handleExportarCSV = async () => {
    const filas = stats.reservasParaExportar.map(r => ({
      reserva_id: r.id,
      comprador: r.comprador,
      producto: r.producto,
      cantidad_kg: r.cantidad,
      precio_kg: r.precio_kg ?? "",
      fecha: r.fecha,
      estado: r.estado
    }));
    if (!exportarCSV(`reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv`, filas)) {
      await avisar("No hay datos para exportar.");
    }
  };

  const renderBarChart = (items, color = "#4caf50", isCurrency = false) => {
    if (!items || items.length === 0) return <p className="celda-vacia">Aún no hay datos.</p>;
    const maxVal = Math.max(...items.map(i => i.valor), 1);
    
    return (
      <div style={{ display: "flex", alignItems: "flex-end", height: "200px", gap: "20px", marginTop: "20px", borderBottom: "1px solid #ccc", paddingBottom: "10px", width: "100%", overflowX: "auto" }}>
        {items.map((item, idx) => {
          const percent = (item.valor / maxVal) * 100;
          return (
            <div key={idx} style={{ flex: 1, minWidth: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <span style={{ fontSize: "12px", color: "#666", marginBottom: "4px", whiteSpace: "nowrap" }}>
                {isCurrency ? `$${item.valor.toLocaleString("es-CO")}` : `${item.valor.toLocaleString("es-CO")} kg`}
              </span>
              <div style={{ width: "100%", maxWidth: "60px", height: `${percent}%`, backgroundColor: color, borderRadius: "4px 4px 0 0" }}></div>
              <span style={{ fontSize: "12px", marginTop: "8px", textAlign: "center", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: "80px" }}>{item.etiqueta}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Reportes</h2>
          <p>Ingresos proyectados, producción por categoría y comparativa mes a mes.</p>
        </div>
        <div className="acciones-reporte" style={{ display: "flex", gap: "8px" }}>
          <button className="btn-verde btn-borde" onClick={handleExportarCSV}>
            ⬇️ Exportar CSV
          </button>
          <button className="btn-verde btn-borde" onClick={() => window.print()}>
            🖨️ Exportar PDF
          </button>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {loading ? (
        <p className="celda-vacia" style={{ padding: "40px" }}>Cargando reportes...</p>
      ) : (
        <>
          <div className="fila-stats">
            <div className="stat-tarjeta" data-icono="🌱">
              <div className="stat-numero">{stats.cultivosActivos}</div>
              <div className="stat-etiqueta">Cultivos Activos</div>
            </div>
            <div className="stat-tarjeta stat-marron" data-icono="⚖️">
              <div className="stat-numero">{stats.kgReservados.toLocaleString("es-CO")}</div>
              <div className="stat-etiqueta">Kg Reservados</div>
            </div>
            <div className="stat-tarjeta stat-naranja" data-icono="💰">
              <div className="stat-numero">
                ${Math.round(stats.ingresosEstimados).toLocaleString("es-CO")}
              </div>
              <div className="stat-etiqueta">Ingresos Brutos</div>
              {stats.comisionTotal > 0 && (
                <div className="texto-secundario" style={{ fontSize: "12px", marginTop: "4px", color: "#666" }}>
                  − ${Math.round(stats.comisionTotal).toLocaleString("es-CO")} comisión → neto: ${Math.round(stats.ingresosNetos).toLocaleString("es-CO")}
                </div>
              )}
            </div>
            <div className="stat-tarjeta" data-icono="⭐">
              <div className="stat-numero">{stats.puntaje}</div>
              <div className="stat-etiqueta">Puntaje de Reputación</div>
            </div>
          </div>

          <div className="margen-top-32">
            <h3 className="titulo-panel-grande">Producción por categoría</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>Kilogramos totales de sus lotes, agrupados por categoría.</p>
            <div className="grafica-contenedor">
              {renderBarChart(stats.itemsCategoria, "#795548", false)}
            </div>
          </div>

          <div className="margen-top-32">
            <h3 className="titulo-panel-grande">Ingresos por mes</h3>
            <p style={{ color: "#666", marginBottom: "16px" }}>Valor estimado de las reservas recibidas en los últimos 6 meses.</p>
            <div className="grafica-contenedor">
              {renderBarChart(stats.itemsMes, "#4caf50", true)}
            </div>
          </div>

          <div className="margen-top-32">
            <h3 className="titulo-panel-grande">Comparativa mes a mes</h3>
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Reservas recibidas</th>
                  <th>Kg reservados</th>
                  <th>Ingreso estimado</th>
                </tr>
              </thead>
              <tbody>
                {stats.clavesOrdenadas.length > 0 ? (
                  stats.clavesOrdenadas.map((clave) => (
                    <tr key={clave}>
                      <td>{etiquetaMes(clave)}</td>
                      <td>{stats.reservasPorMes[clave]}</td>
                      <td>{stats.kgPorMes[clave].toLocaleString("es-CO")} kg</td>
                      <td>${Math.round(stats.ingresoPorMes[clave]).toLocaleString("es-CO")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="celda-vacia">Aún no ha recibido reservas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
