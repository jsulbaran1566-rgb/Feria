import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { obtenerPerfilPublico, obtenerCalificaciones } from "../../services/api";

export default function PublicProfilePage() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get("id");

  const [perfil, setPerfil] = useState(null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError("Falta el id del productor en la URL (ej: /perfil-publico/5)");
        setLoading(false);
        return;
      }
      try {
        const [resPerfil, resCalifs] = await Promise.allSettled([
          obtenerPerfilPublico(id),
          obtenerCalificaciones(id),
        ]);

        if (resPerfil.status === "fulfilled") {
          setPerfil(resPerfil.value);
        } else {
          setError(resPerfil.reason?.message || "Productor no encontrado");
        }

        if (resCalifs.status === "fulfilled") {
          const val = resCalifs.value;
          const list = Array.isArray(val)
            ? val
            : Array.isArray(val?.calificaciones)
            ? val.calificaciones
            : [];
          setCalificaciones(list);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <p className="celda-vacia" style={{ padding: "40px" }}>Cargando perfil público...</p>;
  if (error || !perfil) {
    return (
      <div style={{ padding: "40px 20px" }}>
        <p className="alerta alerta-error visible">Error: {error || "Perfil no encontrado"}</p>
        <Link to="/comprador/explorar-lotes" className="btn-verde" style={{ display: "inline-block", marginTop: "16px" }}>
          ← Volver a Explorar Lotes
        </Link>
      </div>
    );
  }

  const estrellas = (n) => {
    if (n == null) return "Sin calificaciones aún";
    const llenas = Math.round(n);
    return "⭐".repeat(llenas) + "☆".repeat(Math.max(0, 5 - llenas)) + ` (${n}/5)`;
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 16px" }}>
      <div className="cabecera-panel">
        <div>
          <h2>Perfil del Productor</h2>
          <p>Transparencia, ubicación y reputación verificada en AgroDirecto</p>
        </div>
        <Link to="/comprador/explorar-lotes" className="btn-verde btn-borde">
          ← Explorar Cultivos
        </Link>
      </div>

      <div className="tarjeta" style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap", marginTop: "20px" }}>
        <img
          src={perfil.foto_url || "https://placehold.co/120x120?text=🌱"}
          alt={perfil.nombre}
          style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: "220px" }}>
          <h2 style={{ margin: "0 0 8px 0" }}>{perfil.nombre}</h2>
          {perfil.nombre_finca && (
            <p style={{ margin: "0 0 6px 0" }}>
              🏡 <strong>{perfil.nombre_finca}</strong>
            </p>
          )}
          {perfil.cultivos_principales && (
            <p style={{ margin: "0 0 6px 0" }}>🌱 {perfil.cultivos_principales}</p>
          )}
          {perfil.ciudad && (
            <p style={{ margin: "0 0 6px 0" }}>📍 {perfil.ciudad}</p>
          )}
          <p style={{ color: "#777", fontSize: "0.85rem", margin: "8px 0 0 0" }}>
            Miembro desde {perfil.miembro_desde || "2026"}
          </p>
          {perfil.descripcion && (
            <p className="margen-top-16" style={{ fontStyle: "italic", color: "#444" }}>
              {perfil.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Reputación */}
      <div className="fila-stats margen-top-16">
        <div className="stat-tarjeta" data-icono="⭐">
          <div className="stat-numero">{perfil.promedio_calificacion ?? "—"}</div>
          <div className="stat-etiqueta">{estrellas(perfil.promedio_calificacion)}</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="📦">
          <div className="stat-numero">
            {perfil.tasa_cumplimiento != null ? `${perfil.tasa_cumplimiento}%` : "—"}
          </div>
          <div className="stat-etiqueta">Entregas Cumplidas</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="🏆">
          <div className="stat-numero">{perfil.puntaje ?? "—"}</div>
          <div className="stat-etiqueta">Puntaje de Reputación</div>
        </div>
        <div className="stat-tarjeta" data-icono="🌾">
          <div className="stat-numero">{perfil.lotes_activos ?? 0}</div>
          <div className="stat-etiqueta">Cultivos Activos</div>
        </div>
      </div>

      {/* Mapa de ubicación si tiene coordenadas */}
      {perfil.latitud != null && perfil.longitud != null && (
        <div className="margen-top-16">
          <iframe
            src={`https://www.google.com/maps?q=${perfil.latitud},${perfil.longitud}&output=embed`}
            width="100%"
            height="220"
            style={{ border: 0, borderRadius: "8px" }}
            loading="lazy"
            title="Ubicación de la finca"
          ></iframe>
        </div>
      )}

      {/* Calificaciones */}
      <div className="margen-top-32">
        <h3 className="titulo-panel-grande">Calificaciones recientes</h3>
        <div className="margen-top-16">
          {calificaciones.length === 0 ? (
            <p className="celda-vacia">Este productor aún no tiene calificaciones.</p>
          ) : (
            calificaciones.map((c, idx) => {
              const numEstrellas = c.estrellas || c.calificacion || 5;
              return (
                <div key={c.id || idx} className="tarjeta margen-top-16">
                  <p>
                    {"⭐".repeat(numEstrellas) + "☆".repeat(Math.max(0, 5 - numEstrellas))} —{" "}
                    <strong>{c.comprador || c.comprador_nombre || "Comprador"}</strong>
                  </p>
                  {c.comentario && <p>{c.comentario}</p>}
                  <p className="texto-secundario">{c.fecha || c.fecha_creacion || "Reciente"}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
