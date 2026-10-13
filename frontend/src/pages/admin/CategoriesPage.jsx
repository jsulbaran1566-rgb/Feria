import React, { useState, useEffect } from "react";
import {
  obtenerCategorias,
  registrarCategoria,
  editarCategoriaApi,
  eliminarCategoriaApi,
  obtenerLotesPorCategoria
} from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";

export default function CategoriesPage() {
  const { confirmar } = useDialogos();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [catEditando, setCatEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    cantidad_minima_reserva_kg: 10,
  });
  const [modalAlert, setModalAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargarCategorias = async () => {
    try {
      const res = await obtenerCategorias();
      const catList = Array.isArray(res) ? res : [];
      
      const datos = await Promise.all(
        catList.map(async (categoria) => {
          let lotesCount = 0;
          try {
            const result = await obtenerLotesPorCategoria(categoria.nombre);
            lotesCount = Array.isArray(result) ? result.length : (result.lotes || []).length;
          } catch {
            lotesCount = 0;
          }
          return { ...categoria, lotes: lotesCount };
        })
      );
      
      setCategorias(datos);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar categorías." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const abrirCrear = () => {
    setCatEditando(null);
    setFormData({ nombre: "", descripcion: "", cantidad_minima_reserva_kg: 10 });
    setModalAlert(null);
    setModalOpen(true);
  };

  const abrirEditar = (c) => {
    setCatEditando(c);
    setFormData({
      nombre: c.nombre || "",
      descripcion: c.descripcion || "",
      cantidad_minima_reserva_kg: c.cantidad_minima_reserva_kg || 10,
    });
    setModalAlert(null);
    setModalOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalAlert(null);

    const payload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      cantidad_minima_reserva_kg: Number(formData.cantidad_minima_reserva_kg),
    };

    try {
      if (catEditando) {
        await editarCategoriaApi(catEditando.nombre, payload);
        setAlert({ type: "ok", message: "Categoría actualizada correctamente." });
      } else {
        await registrarCategoria(payload);
        setAlert({ type: "ok", message: "Categoría registrada con éxito." });
      }
      setModalOpen(false);
      cargarCategorias();
    } catch (err) {
      setModalAlert({ type: "error", message: err.message || "Error al guardar la categoría." });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (nombre) => {
    if (!(await confirmar(`¿Seguro que deseas eliminar la categoría "${nombre}"?`))) return;
    try {
      await eliminarCategoriaApi(nombre);
      setAlert({ type: "ok", message: "Categoría eliminada." });
      cargarCategorias();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar la categoría." });
    }
  };

  const filtrados = categorias.filter(
    (c) => !filtroTexto || c.nombre.toLowerCase().includes(filtroTexto.toLowerCase())
  );
  
  const totalLotes = categorias.reduce((total, c) => total + (c.lotes || 0), 0);
  const mayor = categorias.length > 0 ? categorias.reduce((prev, current) => (prev.lotes > current.lotes) ? prev : current) : null;

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Gestión de Categorías <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Cree, modifique y elimine las categorías de productos agrícolas.</p>
        </div>
        <button type="button" className="btn-verde" onClick={abrirCrear}>
          + Nueva Categoría
        </button>
      </div>

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🗂️">
            <div className="stat-numero">{loading ? "—" : categorias.length}</div>
            <div className="stat-etiqueta">Categorías</div>
        </div>

        <div className="stat-tarjeta stat-marron" data-icono="🌱">
            <div className="stat-numero">{loading ? "—" : totalLotes}</div>
            <div className="stat-etiqueta">Lotes Registrados</div>
        </div>

        <div className="stat-tarjeta stat-naranja" data-icono="📦">
            <div className="stat-numero">{loading ? "—" : (mayor ? mayor.nombre : "—")}</div>
            <div className="stat-etiqueta">Categoría con más lotes</div>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="tarjeta margen-top-32" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <div className="campo-grupo">
            <label htmlFor="buscador-categoria">🔎 Buscar categoría</label>
            <input 
              type="text" 
              id="buscador-categoria" 
              className="campo-input"
              placeholder="Escribe el nombre de una categoría..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
        </div>
      </div>

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <div className="fila-titulo-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div>
                <h3 className="titulo-panel">Categorías Registradas</h3>
                <p>Lista de categorías disponibles para los productos y lotes.</p>
            </div>
            <button className="btn-verde btn-borde" onClick={cargarCategorias}>🔄 Actualizar</button>
        </div>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>#</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Mínimo (kg)</th>
              <th>Lotes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="celda-vacia">Cargando categorías...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="6" className="celda-vacia">No hay categorías registradas.</td></tr>
            ) : (
              filtrados.map((c, index) => (
                <tr key={c.nombre}>
                  <td>{index + 1}</td>
                  <td><strong>🗂️ {c.nombre}</strong></td>
                  <td>{c.descripcion || "Sin descripción"}</td>
                  <td>{c.cantidad_minima_reserva_kg || 1} kg</td>
                  <td>
                    <span className="etiqueta etiqueta-verde">
                        {c.lotes} {c.lotes === 1 ? "lote" : "lotes"}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      <button
                        type="button"
                        className="btn-tabla btn-editar"
                        onClick={() => abrirEditar(c)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-tabla btn-eliminar"
                        onClick={() => handleEliminar(c.nombre)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={catEditando ? `Editar Categoría` : "Nueva Categoría"}
      >
        <p>{catEditando ? "Modifica los datos de la categoría." : "Registra una nueva categoría de productos agrícolas."}</p>
        <form onSubmit={handleGuardar}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />

          <div className="campo-grupo">
            <label>Nombre de la Categoría *</label>
            <input
              type="text"
              className="campo-input"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              disabled={!!catEditando}
            />
          </div>

          <div className="campo-grupo">
            <label>Cantidad Mínima de Reserva (kg) *</label>
            <input
              type="number"
              min="1"
              className="campo-input"
              value={formData.cantidad_minima_reserva_kg}
              onChange={(e) => setFormData({ ...formData, cantidad_minima_reserva_kg: e.target.value })}
              required
            />
          </div>

          <div className="campo-grupo">
            <label>Descripción</label>
            <textarea
              className="campo-input"
              rows="3"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            ></textarea>
          </div>

          <div className="accion-formulario" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn-verde btn-borde"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-verde" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
