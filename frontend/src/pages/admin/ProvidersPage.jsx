import React, { useState, useEffect, useMemo } from "react";
import {
  obtenerProveedores,
  registrarProveedor,
  editarProveedorApi,
  eliminarProveedorApi,
} from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import Badge from "../../components/common/Badge";
import { useDialogos } from "../../context/dialogosContexto";

export default function ProvidersPage() {
  const { confirmar } = useDialogos();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [provEditando, setProvEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_servicio: "Logistica",
    ciudad: "",
    telefono: "",
    correo: "",
    estado: "Activo",
  });
  const [modalAlert, setModalAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargarProveedores = async () => {
    try {
      const res = await obtenerProveedores();
      setProveedores(Array.isArray(res) ? res : []);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar proveedores." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  // Stats calculados
  const stats = useMemo(() => {
    const total = proveedores.length;
    const logistica = proveedores.filter(
      (p) => (p.tipo_servicio || p.tipo || "").toLowerCase() === "logistica" || (p.tipo_servicio || p.tipo || "").toLowerCase() === "logística"
    ).length;
    const insumos = proveedores.filter(
      (p) => (p.tipo_servicio || p.tipo || "").toLowerCase() === "insumos"
    ).length;
    const activos = proveedores.filter((p) => p.estado === "Activo" || !p.estado).length;
    return { total, logistica, insumos, activos };
  }, [proveedores]);

  // Proveedores filtrados
  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((p) => {
      const texto = busqueda.toLowerCase().trim();
      const matchBusqueda =
        !texto ||
        (p.nombre || "").toLowerCase().includes(texto) ||
        (p.ciudad || "").toLowerCase().includes(texto);

      const tipoProv = (p.tipo_servicio || p.tipo || "").toLowerCase();
      const matchTipo = !filtroTipo || tipoProv === filtroTipo.toLowerCase();

      return matchBusqueda && matchTipo;
    });
  }, [proveedores, busqueda, filtroTipo]);

  const abrirCrear = () => {
    setProvEditando(null);
    setFormData({
      nombre: "",
      tipo_servicio: "Logistica",
      ciudad: "",
      telefono: "",
      correo: "",
      estado: "Activo",
    });
    setModalAlert(null);
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    setProvEditando(p);
    setFormData({
      nombre: p.nombre || "",
      tipo_servicio: p.tipo_servicio || p.tipo || "Logistica",
      ciudad: p.ciudad || "",
      telefono: p.telefono || "",
      correo: p.correo || "",
      estado: p.estado || "Activo",
    });
    setModalAlert(null);
    setModalOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalAlert(null);

    try {
      if (provEditando) {
        await editarProveedorApi(provEditando.id, formData);
        setAlert({ type: "ok", message: "Proveedor actualizado con éxito." });
      } else {
        await registrarProveedor(formData);
        setAlert({ type: "ok", message: "Proveedor registrado con éxito." });
      }
      setModalOpen(false);
      cargarProveedores();
    } catch (err) {
      setModalAlert({ type: "error", message: err.message || "Error al guardar proveedor." });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!(await confirmar("¿Deseas eliminar este proveedor?"))) return;
    try {
      await eliminarProveedorApi(id);
      setAlert({ type: "ok", message: "Proveedor eliminado con éxito." });
      cargarProveedores();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar el proveedor." });
    }
  };

  const limpiarFiltro = () => {
    setBusqueda("");
    setFiltroTipo("");
  };

  return (
    <>
      <div className="banner-panel banner-proveedores">
        <span>🚚 Red logística que conecta el campo con su negocio</span>
      </div>

      <div className="cabecera-panel">
        <div>
          <h2>
            Gestión de Proveedores <span className="badge-rol badge-admin">ADMIN</span>
          </h2>
          <p>Proveedores logísticos e insumos vinculados a la plataforma</p>
        </div>
        <button type="button" className="btn-verde" onClick={abrirCrear}>
          + Nuevo Proveedor
        </button>
      </div>

      {/* FILA STATS */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="🚚">
          <div className="stat-numero" id="stat-total">{stats.total}</div>
          <div className="stat-etiqueta">Total Proveedores</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="📦">
          <div className="stat-numero" id="stat-logistica">{stats.logistica}</div>
          <div className="stat-etiqueta">Logística</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="🌿">
          <div className="stat-numero" id="stat-insumos">{stats.insumos}</div>
          <div className="stat-etiqueta">Insumos</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="✅">
          <div className="stat-numero" id="stat-activos">{stats.activos}</div>
          <div className="stat-etiqueta">Activos</div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="barra-filtro margen-top-24">
        <input
          type="text"
          className="campo-input"
          placeholder="Buscar por nombre o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="campo-input input-angosto"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="Logistica">Logística</option>
          <option value="Insumos">Insumos</option>
          <option value="Empaque">Empaque</option>
          <option value="Refrigeracion">Refrigeración</option>
        </select>
        <button type="button" className="btn-verde btn-borde" onClick={limpiarFiltro}>
          Limpiar
        </button>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Ciudad</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="celda-vacia">Cargando...</td></tr>
            ) : proveedoresFiltrados.length === 0 ? (
              <tr><td colSpan="7" className="celda-vacia">No se encontraron proveedores.</td></tr>
            ) : (
              proveedoresFiltrados.map((p) => (
                <tr key={p.id}>
                  <td><strong>#{p.id}</strong></td>
                  <td>{p.nombre}</td>
                  <td>
                    <Badge variant="categoria">{p.tipo_servicio || p.tipo || "Logística"}</Badge>
                  </td>
                  <td>{p.ciudad || "Nacional"}</td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      {p.telefono && <div>📞 {p.telefono}</div>}
                      {p.correo && <div>✉️ {p.correo}</div>}
                      {!p.telefono && !p.correo && "—"}
                    </div>
                  </td>
                  <td>
                    <Badge>{p.estado || "Activo"}</Badge>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      <button
                        type="button"
                        className="btn-tabla btn-editar"
                        onClick={() => abrirEditar(p)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-tabla btn-eliminar"
                        onClick={() => handleEliminar(p.id)}
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

      {/* Modal Proveedor */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={provEditando ? `Editar Proveedor #${provEditando.id}` : "Nuevo Proveedor"}
      >
        <form onSubmit={handleGuardar}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Nombre / Razón Social *</label>
              <input
                type="text"
                className="campo-input"
                placeholder="Ej: TransCarga SAS"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
            <div className="campo-grupo">
              <label>Tipo de Servicio</label>
              <select
                className="campo-input"
                value={formData.tipo_servicio}
                onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value })}
              >
                <option value="Logistica">Logística</option>
                <option value="Insumos">Insumos</option>
                <option value="Empaque">Empaque</option>
                <option value="Refrigeracion">Refrigeración</option>
              </select>
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Ciudad</label>
              <input
                type="text"
                className="campo-input"
                placeholder="Medellín"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              />
            </div>
            <div className="campo-grupo">
              <label>Teléfono de Contacto</label>
              <input
                type="tel"
                className="campo-input"
                placeholder="+57 300 000 0000"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="campo-grupo">
            <label>Correo de Contacto</label>
            <input
              type="email"
              className="campo-input"
              placeholder="contacto@empresa.com"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />
          </div>

          <div className="campo-grupo">
            <label>Estado</label>
            <select
              className="campo-input"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="fila-botones">
            <button type="submit" className="btn-verde" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" className="btn-verde btn-borde" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
