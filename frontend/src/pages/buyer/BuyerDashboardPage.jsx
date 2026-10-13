import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import { obtenerReservas, obtenerFavoritos } from "../../services/api";

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ reservas: 0, kgCamino: 0, gasto: 0, favoritos: 0 });
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const [resReservas, resFavs] = await Promise.allSettled([
          obtenerReservas({ comprador_id: user.id }),
          obtenerFavoritos(user.id),
        ]);

        let cantReservas = 0;
        let kg = 0;
        let total = 0;

        if (resReservas.status === "fulfilled" && Array.isArray(resReservas.value)) {
          cantReservas = resReservas.value.length;
          resReservas.value.forEach((r) => {
            kg += Number(r.cantidad_reservada_kg || r.cantidad || 0);
            total += Number(r.precio_total_estimado || 0);
          });
          if (total === 0 && kg > 0) total = kg * 2800; // fallback like HTML
        }

        const favList = resFavs.status === "fulfilled" && Array.isArray(resFavs.value) ? resFavs.value : [];
        setFavoritos(favList);

        setStats({
          reservas: cantReservas,
          kgCamino: kg,
          gasto: total,
          favoritos: favList.length,
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
            Bienvenido <span className="badge-rol badge-comprador">COMPRADOR</span>
          </h2>
          <p>Productos frescos con origen certificado</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/comprador/explorar-lotes" className="btn-verde">
            🔍 Explorar Lotes
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="📋">
          <div className="stat-numero">{loading ? "..." : stats.reservas}</div>
          <div className="stat-etiqueta">Reservas Activas</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="⚖️">
          <div className="stat-numero">{loading ? "..." : `${stats.kgCamino} kg`}</div>
          <div className="stat-etiqueta">Kg en Camino</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="💳">
          <div className="stat-numero">
            {loading ? "..." : `$${stats.gasto.toLocaleString()}`}
          </div>
          <div className="stat-etiqueta">Comprometido</div>
        </div>
        <div className="stat-tarjeta stat-verde" data-icono="⭐">
          <div className="stat-numero">{loading ? "..." : stats.favoritos}</div>
          <div className="stat-etiqueta">Productores Favoritos</div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid-tarjetas" style={{ marginTop: "24px" }}>
        <div className="tarjeta">
          <h3>🔍 Explorar Lotes</h3>
          <p>Busque cultivos disponibles filtrando por tipo de producto, fecha de cosecha y región.</p>
          <div className="margen-top-16">
            <Link to="/comprador/explorar-lotes" className="btn-verde">
              Explorar ahora
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>📋 Mis Reservas</h3>
          <p>Gestione sus reservas activas y comuníquese con el productor directamente.</p>
          <div className="margen-top-16">
            <Link to="/comprador/mis-reservas" className="btn-verde btn-borde">
              Ver mis reservas
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>🚚 Próximas Entregas</h3>
          <p>Consulte el calendario de entregas y coordine la recepción en su establecimiento.</p>
          <div className="margen-top-16">
            <Link to="/comprador/entregas" className="btn-verde btn-borde">
              Ver entregas
            </Link>
          </div>
        </div>
        <div className="tarjeta">
          <h3>💳 Pagos y Facturas</h3>
          <p>Consulte el historial de transacciones y descargue comprobantes.</p>
          <div className="margen-top-16">
            <Link to="/comprador/pagos" className="btn-verde btn-borde">
              Ver pagos
            </Link>
          </div>
        </div>
      </div>

      {/* Productores favoritos */}
      <div className="margen-top-32">
        <h3 className="titulo-panel-grande">Productores Favoritos</h3>
        {favoritos.length === 0 ? (
          <p className="celda-vacia" style={{ padding: "16px", background: "#fff", borderRadius: "8px" }}>
            Aún no tienes productores favoritos guardados. Explora lotes y agrega productores con la estrella ⭐.
          </p>
        ) : (
          <div className="grid-tarjetas">
            {favoritos.map((fav) => (
              <div key={fav.id} className="tarjeta">
                <h4>{fav.productor_nombre || `Productor #${fav.productor_id}`}</h4>
                <p>Ubicación: {fav.productor_ciudad || "Colombia"}</p>
                <div className="margen-top-16">
                  <Link to={`/perfil-publico/${fav.productor_id}`} className="btn-verde btn-borde" style={{ fontSize: "0.85rem" }}>
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
