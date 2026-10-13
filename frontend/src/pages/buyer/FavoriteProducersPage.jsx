import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import {
  obtenerFavoritos,
  agregarFavorito,
  eliminarFavoritoApi,
  obtenerProductoresPublicos,
} from "../../services/api";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";

export default function FavoriteProducersPage() {
  const { confirmar } = useDialogos();
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState([]);
  const [productores, setProductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const cargarTodo = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [resFavs, resUsers] = await Promise.allSettled([
        obtenerFavoritos(user.id),
        obtenerProductoresPublicos(),
      ]);

      if (resFavs.status === "fulfilled" && Array.isArray(resFavs.value)) {
        setFavoritos(resFavs.value);
      }
      if (resUsers.status === "fulfilled" && Array.isArray(resUsers.value)) {
        setProductores(resUsers.value);
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar favoritos." });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const marcarFavorito = async (productorId) => {
    try {
      await agregarFavorito(user.id, productorId);
      setAlert({ type: "ok", message: "Productor agregado a tus favoritos." });
      cargarTodo();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo agregar a favoritos." });
    }
  };

  const quitarFavorito = async (favId, isProductorId = false) => {
    if (!(await confirmar('¿Quitar este productor de tus favoritos?'))) return;
    try {
      const idToDel = isProductorId ? favoritos.find(f => String(f.productor_id) === String(favId))?.id : favId;
      if (idToDel) {
        await eliminarFavoritoApi(idToDel);
        setAlert({ type: "ok", message: "Productor removido de favoritos." });
        cargarTodo();
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar el favorito." });
    }
  };

  const renderFavoritos = () => {
    if (loading) return <p className="celda-vacia">Cargando...</p>;
    if (!favoritos.length) return <p className="celda-vacia">Aún no tienes productores favoritos. Agrega uno abajo.</p>;

    return (
      <div className="grid-tarjetas">
        {favoritos.map((f) => (
          <div key={f.id} className="tarjeta texto-centrado tarjeta-sm">
            <h3>{f.productor_nombre || f.productor || `Productor #${f.productor_id}`}</h3>
            <p>{f.productor_ciudad || f.ciudad || "Ciudad no registrada"}</p>
            <p className="estrellas">★★★★★</p>
            <div className="margen-top-16">
              <Link to={`/explorar-lotes`} className="btn-verde btn-borde">Ver lotes</Link>
              <button className="btn-tabla btn-eliminar" onClick={() => quitarFavorito(f.id)} style={{marginLeft: "8px"}}>Quitar</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProductores = () => {
    if (loading) return <tr><td colSpan="4" className="celda-vacia">Cargando...</td></tr>;
    if (!productores.length) return <tr><td colSpan="4" className="celda-vacia">No hay productores registrados</td></tr>;

    const idsFavoritos = new Set(favoritos.map((f) => String(f.productor_id)));

    return productores.map((p) => {
      const yaEsFav = idsFavoritos.has(String(p.id));
      return (
        <tr key={p.id}>
          <td>{p.nombre}</td>
          <td>{p.ciudad || "—"}</td>
          <td>
            <span className={`etiqueta ${p.estado === 'Activo' ? 'etiqueta-verde' : 'etiqueta-gris'}`}>
              {p.estado || 'Activo'}
            </span>
          </td>
          <td>
            <div className="acciones-tabla">
              {yaEsFav ? (
                <span className="etiqueta etiqueta-azul">Ya es favorito</span>
              ) : (
                <button className="btn-tabla btn-verde" onClick={() => marcarFavorito(p.id)}>⭐ Agregar</button>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Productores Favoritos</h2>
          <p>Guarde acceso rápido a los productores con los que más trabaja.</p>
        </div>
        <div>
          <Link to="/comprador/explorar-lotes" className="btn-verde">🔍 Explorar Lotes</Link>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Mis Favoritos</h3>
        </div>
        {renderFavoritos()}
      </div>

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Agregar Productor</h3>
        </div>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Productor</th>
              <th>Ciudad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {renderProductores()}
          </tbody>
        </table>
      </div>

    </>
  );
}
