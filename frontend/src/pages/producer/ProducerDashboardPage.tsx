import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import { obtenerLotes, obtenerReservas } from "../../services/api";
import type { Lote } from "../../types";

export default function ProducerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lotes: 0, kgReservados: 0, ingresos: 0, compradores: 0 });
  const [lotesRecientes, setLotesRecientes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const [resLotes, resReservas] = await Promise.allSettled([
          obtenerLotes({ productor_id: user.id }),
          obtenerReservas(),
        ]);

        let cantLotes = 0;
        let misLotes: Lote[] = [];
        let kgRes = 0;
        let dinero = 0;
        const compradoresSet = new Set<number>();

        if (resLotes.status === "fulfilled" && Array.isArray(resLotes.value)) {
          misLotes = resLotes.value.filter(
            (l) => String(l.productor_id) === String(user.id)
          );
          cantLotes = misLotes.length;
          setLotesRecientes(misLotes.slice(0, 4));
        }

        if (resReservas.status === "fulfilled" && Array.isArray(resReservas.value)) {
          const misLotesMap = new Map(misLotes.map((l) => [l.id, l]));
          resReservas.value.forEach((r) => {
            if (misLotesMap.has(r.lote_id) || String(r.productor_id) === String(user.id)) {
              const cant = Number(r.cantidad ?? 0);
              const lote = misLotesMap.get(r.lote_id);
              const precio = Number(r.precio_kg ?? lote?.precio_kg ?? 0);
              kgRes += cant;
              dinero += precio * cant;
              if (r.comprador_id) compradoresSet.add(r.comprador_id);
            }
          });
        }

        setStats({
          lotes: cantLotes,
          kgReservados: kgRes,
          ingresos: dinero,
          compradores: compradoresSet.size,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>
            Bienvenido <span className="badge-rol badge-productor">PRODUCTOR</span>
          </h2>
          <p>Resumen de su operación agrícola y estado de cosechas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/productor/mis-cultivos" className="btn-verde">
            + Nuevo Cultivo / Lote
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🌱">
          <div className="stat-numero">{loading ? "..." : stats.lotes}</div>
          <div className="stat-etiqueta">Cultivos Activos</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="⚖️">
          <div className="stat-numero">{loading ? "..." : `${stats.kgReservados} kg`}</div>
          <div className="stat-etiqueta">Kg Reservados</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="💰">
          <div className="stat-numero">
            {loading ? "..." : `$${stats.ingresos.toLocaleString()}`}
          </div>
          <div className="stat-etiqueta">Ingresos Proyectados</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🏪">
          <div className="stat-numero">{loading ? "..." : stats.compradores}</div>
          <div className="stat-etiqueta">Compradores Activos</div>
        </div>
      </div>

      {/* Accesos directos */}
      <div className="grid-tarjetas" style={{ marginTop: "24px" }}>
        <div className="tarjeta">
          <h3>🌱 Mis Cultivos</h3>
          <p>Registre nuevos lotes indicando cantidad (kg), variedad y fecha estimada de cosecha.</p>
          <div className="margen-top-16">
            <Link to="/productor/mis-cultivos" className="btn-verde btn-borde">
              Gestionar Cultivos
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>📍 Trazabilidad</h3>
          <p>Actualice el ciclo de vida (siembra, floración, cosecha) para notificar a los compradores.</p>
          <div className="margen-top-16">
            <Link to="/productor/trazabilidad" className="btn-verde btn-borde">
              Actualizar Estados
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>💰 Ventas y Pagos</h3>
          <p>Confirme reservas recibidas, verifique anticipos y coordine los despachos.</p>
          <div className="margen-top-16">
            <Link to="/productor/ventas-pagos" className="btn-verde btn-borde">
              Ver Ventas
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>📈 Reportes</h3>
          <p>Visualice el balance financiero, comisiones retenidas e ingresos netos liquidados.</p>
          <div className="margen-top-16">
            <Link to="/productor/reportes" className="btn-verde btn-borde">
              Ver Reportes
            </Link>
          </div>
        </div>
      </div>

      {/* Lotes recientes */}
      <div className="margen-top-32">
        <h3 className="titulo-panel-grande">Cultivos Registrados Recientemente</h3>
        {lotesRecientes.length === 0 ? (
          <p className="celda-vacia" style={{ background: "#fff", padding: "20px", borderRadius: "8px" }}>
            No tienes cultivos registrados actualmente. Pulsa "+ Nuevo Cultivo" para publicar tu primera cosecha.
          </p>
        ) : (
          <div className="grid-tarjetas">
            {lotesRecientes.map((lote) => (
              <div key={lote.id} className="tarjeta">
                <h4>{lote.producto}</h4>
                <p>Categoría: {lote.categoria || "Estándar"}</p>
                <p>Total: {lote.cantidad} kg &bull; Reservado: {lote.kg_reservados ?? 0} kg</p>
                <p><strong>Precio:</strong> ${Number(lote.precio_kg || 0).toLocaleString('es-CO')} / kg</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
