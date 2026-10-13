import React, { useState, useEffect } from "react";
import { obtenerLotes, obtenerCategorias, obtenerUsuarios, eliminarLoteApi, registrarLote, editarLoteApi } from "../../services/api";
import Alert from "../../components/common/Alert";
import Modal from "../../components/common/Modal";
import { useDialogos } from "../../context/dialogosContexto";

export default function LotsAdminPage() {
  const { confirmar } = useDialogos();
  const [lotes, setLotes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [loteEditando, setLoteEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre_producto: "",
    cantidad_total_kg: "",
    categoria_nombre: "Hortaliza",
    productor_id: "",
    fecha_cosecha_estimada: "",
    estado: "Activo"
  });
  const [modalAlert, setModalAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      const [l, c, u] = await Promise.allSettled([obtenerLotes(), obtenerCategorias(), obtenerUsuarios()]);
      if (l.status === "fulfilled" && Array.isArray(l.value)) setLotes(l.value);
      if (c.status === "fulfilled" && Array.isArray(c.value)) setCategorias(c.value);
      if (u.status === "fulfilled" && Array.isArray(u.value)) setUsuarios(u.value.filter(us => us.rol === 'Productor'));
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar lotes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleEliminar = async (id) => {
    if (!(await confirmar("¿Seguro que deseas eliminar este lote del sistema?"))) return;
    try {
      await eliminarLoteApi(id);
      setAlert({ type: "ok", message: "Lote eliminado correctamente." });
      cargarDatos();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar el lote." });
    }
  };

  const abrirModal = (lote = null) => {
    setLoteEditando(lote);
    if (lote) {
      setFormData({
        nombre_producto: lote.nombre_producto || lote.producto || "",
        cantidad_total_kg: lote.cantidad_total_kg || lote.cantidad || "",
        categoria_nombre: lote.categoria_nombre || lote.categoria || "Hortaliza",
        productor_id: lote.productor_id || "",
        fecha_cosecha_estimada: lote.fecha_cosecha_estimada || lote.fecha_cosecha || "",
        estado: lote.estado || "Activo"
      });
    } else {
      setFormData({
        nombre_producto: "",
        cantidad_total_kg: "",
        categoria_nombre: categorias[0]?.nombre || "Hortaliza",
        productor_id: usuarios[0]?.id || "",
        fecha_cosecha_estimada: "",
        estado: "Activo"
      });
    }
    setModalAlert(null);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
  };

  const guardarLote = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalAlert(null);

    const datos = {
        producto: formData.nombre_producto.trim(),
        cantidad: parseInt(formData.cantidad_total_kg) || 0,
        categoria: formData.categoria_nombre,
        productor_id: parseInt(formData.productor_id),
        fecha_cosecha: formData.fecha_cosecha_estimada || "",
        estado: formData.estado,
        kg_reservados: loteEditando ? (loteEditando.cantidad_reservada_kg || 0) : 0
    };

    if (!datos.producto || datos.cantidad < 1) {
        setModalAlert({ type: "error", message: "Producto y cantidad son obligatorios." });
        setSaving(false);
        return;
    }

    try {
        if (loteEditando) {
            await editarLoteApi(loteEditando.id, datos);
            setAlert({ type: "ok", message: "Lote actualizado." });
        } else {
            await registrarLote(datos);
            setAlert({ type: "ok", message: "Lote creado." });
        }
        cerrarModal();
        cargarDatos();
    } catch (err) {
        setModalAlert({ type: "error", message: err.message || "Error al guardar el lote." });
    } finally {
        setSaving(false);
    }
  };

  const filtrados = lotes.filter((l) => {
    const coincideTexto =
      !filtroTexto ||
      (l.nombre_producto || l.producto || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (l.productor_nombre || l.productor || "").toLowerCase().includes(filtroTexto.toLowerCase());

    const coincideCat =
      !filtroCategoria ||
      (l.categoria_nombre || l.categoria) === filtroCategoria ||
      String(l.categoria_id) === String(filtroCategoria);

    const coincideEstado =
      !filtroEstado ||
      l.estado === filtroEstado;

    return coincideTexto && coincideCat && coincideEstado;
  });

  const activos = lotes.filter(l => l.estado === 'Activo').length;
  const kgTotal = lotes.reduce((s, l) => s + (l.cantidad_total_kg || l.cantidad || 0), 0);
  const cats = new Set(lotes.map(l => l.categoria_nombre || l.categoria)).size;

  const limpiarFiltro = () => {
    setFiltroTexto("");
    setFiltroCategoria("");
    setFiltroEstado("");
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Gestión de Lotes <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Todos los cultivos registrados en la plataforma</p>
        </div>
        <button className="btn-verde" onClick={() => abrirModal()}>+ Nuevo Lote</button>
      </div>

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🌱">
            <div className="stat-numero">{loading ? "—" : lotes.length}</div>
            <div className="stat-etiqueta">Total Lotes</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="✅">
            <div className="stat-numero">{loading ? "—" : activos}</div>
            <div className="stat-etiqueta">Activos</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="⚖️">
            <div className="stat-numero">{loading ? "—" : kgTotal.toLocaleString('es-CO') + ' kg'}</div>
            <div className="stat-etiqueta">Kg Totales</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="📦">
            <div className="stat-numero">{loading ? "—" : cats}</div>
            <div className="stat-etiqueta">Categorías</div>
        </div>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Filtros */}
      <div className="barra-filtro margen-top-24">
        <input
          type="text"
          className="campo-input"
          placeholder="Buscar producto..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
        <select
          className="campo-input input-angosto"
          style={{ maxWidth: "160px" }}
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id || c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select
          className="campo-input input-angosto"
          style={{ maxWidth: "140px" }}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="En cosecha">En cosecha</option>
          <option value="Finalizado">Finalizado</option>
        </select>
        <button className="btn-verde btn-borde" onClick={limpiarFiltro}>Limpiar</button>
      </div>

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Productor</th>
              <th>Kg Totales</th>
              <th>Kg Reservados</th>
              <th>Precio/Kg</th>
              <th>Categoría</th>
              <th>Cosecha Est.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="celda-vacia">Cargando lotes...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="10" className="celda-vacia">Sin lotes registrados</td></tr>
            ) : (
              filtrados.map((lote) => (
                <tr key={lote.id}>
                  <td><strong>#{lote.id}</strong></td>
                  <td><strong>{lote.nombre_producto || lote.producto}</strong></td>
                  <td>{lote.productor_nombre || lote.productor || `—`}</td>
                  <td>{(lote.cantidad_total_kg || lote.cantidad || 0).toLocaleString('es-CO')} kg</td>
                  <td>{(lote.cantidad_reservada_kg || lote.kg_reservados || 0).toLocaleString('es-CO')} kg</td>
                  <td>${Number(lote.precio_por_kg || lote.precio_kg || 0).toLocaleString('es-CO')}</td>
                  <td>{lote.categoria_nombre || lote.categoria}</td>
                  <td>{lote.fecha_cosecha_estimada || lote.fecha_cosecha || "—"}</td>
                  <td>
                    <span className={`etiqueta ${lote.estado === 'Activo' ? 'etiqueta-verde' : 'etiqueta-gris'}`}>
                        {lote.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                        <button
                        className="btn-tabla btn-editar"
                        onClick={() => abrirModal(lote)}
                        >
                        Editar
                        </button>
                        <button
                        className="btn-tabla btn-eliminar"
                        onClick={() => handleEliminar(lote.id)}
                        >
                        Eliminar
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={cerrarModal}
        title={loteEditando ? "Editar Lote" : "Nuevo Lote"}
        maxWidth="600px"
      >
        <form onSubmit={guardarLote}>
            <div className="fila-campos">
                <div className="campo-grupo">
                    <label>Producto</label>
                    <input 
                        type="text" 
                        className="campo-input" 
                        placeholder="Ej: Tomate Chonto"
                        value={formData.nombre_producto}
                        onChange={(e) => setFormData({...formData, nombre_producto: e.target.value})}
                    />
                </div>
                <div className="campo-grupo">
                    <label>Cantidad (kg)</label>
                    <input 
                        type="number" 
                        className="campo-input" 
                        placeholder="Ej: 2000" 
                        min="1"
                        value={formData.cantidad_total_kg}
                        onChange={(e) => setFormData({...formData, cantidad_total_kg: e.target.value})}
                    />
                </div>
            </div>
            <div className="fila-campos">
                <div className="campo-grupo">
                    <label>Categoría</label>
                    <select 
                        className="campo-input"
                        value={formData.categoria_nombre}
                        onChange={(e) => setFormData({...formData, categoria_nombre: e.target.value})}
                    >
                        {categorias.map(c => (
                            <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                        ))}
                        {categorias.length === 0 && (
                            <>
                            <option value="Hortaliza">Hortaliza</option>
                            <option value="Fruta">Fruta</option>
                            <option value="Tuberculo">Tuberculo</option>
                            <option value="Cereal">Cereal</option>
                            <option value="Leguminosa">Leguminosa</option>
                            </>
                        )}
                    </select>
                </div>
                <div className="campo-grupo">
                    <label>Productor</label>
                    <select 
                        className="campo-input"
                        value={formData.productor_id}
                        onChange={(e) => setFormData({...formData, productor_id: e.target.value})}
                    >
                        <option value="">-- Seleccionar --</option>
                        {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="fila-campos">
                <div className="campo-grupo">
                    <label>Fecha Cosecha</label>
                    <input 
                        type="date" 
                        className="campo-input"
                        value={formData.fecha_cosecha_estimada}
                        onChange={(e) => setFormData({...formData, fecha_cosecha_estimada: e.target.value})}
                    />
                </div>
                <div className="campo-grupo">
                    <label>Estado</label>
                    <select 
                        className="campo-input"
                        value={formData.estado}
                        onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="En cosecha">En cosecha</option>
                        <option value="Finalizado">Finalizado</option>
                    </select>
                </div>
            </div>
            
            <div className="fila-botones" style={{ marginTop: "20px" }}>
                <button type="submit" className="btn-verde" disabled={saving}>Guardar</button>
                <button type="button" className="btn-verde btn-borde" onClick={cerrarModal}>Cancelar</button>
            </div>
            <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
        </form>
      </Modal>
    </>
  );
}
