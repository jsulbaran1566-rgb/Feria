import React, { useState, useEffect } from "react";
import {
  obtenerUsuarios,
  obtenerRoles,
  obtenerTiposDocumento,
  registrarUsuario,
  editarUsuarioApi,
  eliminarUsuarioApi,
} from "../../services/api";
import { claveEsValida, MENSAJE_REGLAS_CLAVE } from "../../utils/password";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";

export default function UsersPage() {
  const { confirmar } = useDialogos();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    rol_id: 1,
    tipo_documento: "CC",
    numero_documento: "",
    estado: "Activo",
    clave: "",
  });
  const [modalAlert, setModalAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      const [u, r, td] = await Promise.allSettled([
        obtenerUsuarios(),
        obtenerRoles(),
        obtenerTiposDocumento(),
      ]);

      if (u.status === "fulfilled" && Array.isArray(u.value)) setUsuarios(u.value);
      if (r.status === "fulfilled" && Array.isArray(r.value)) setRoles(r.value);
      if (td.status === "fulfilled" && Array.isArray(td.value)) setTiposDoc(td.value);
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Error al cargar usuarios." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirCrear = () => {
    setUsuarioEditando(null);
    setFormData({
      nombre: "",
      correo: "",
      telefono: "",
      rol_id: roles[0]?.id || 1,
      tipo_documento: tiposDoc[0]?.codigo || "CC",
      numero_documento: "",
      estado: "Activo",
      clave: "",
    });
    setModalAlert(null);
    setModalOpen(true);
  };

  const abrirEditar = (u) => {
    setUsuarioEditando(u);
    setFormData({
      nombre: u.nombre || "",
      correo: u.correo || "",
      telefono: u.telefono || "",
      rol_id: u.rol_id || u.rol_rel?.id || roles.find(r => r.nombre === u.rol)?.id || 1,
      tipo_documento: u.tipo_documento || "CC",
      numero_documento: u.numero_documento || "",
      estado: u.estado || "Activo",
      clave: "",
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
      correo: formData.correo.trim(),
      telefono: formData.telefono.trim(),
      rol_id: Number(formData.rol_id),
      tipo_documento: formData.tipo_documento,
      numero_documento: formData.numero_documento.trim(),
      estado: formData.estado,
    };

    if (formData.clave.trim()) {
      if (!claveEsValida(formData.clave.trim())) {
        setModalAlert({ type: "error", message: MENSAJE_REGLAS_CLAVE });
        setSaving(false);
        return;
      }
      payload.clave = formData.clave.trim();
    }

    try {
      if (usuarioEditando) {
        await editarUsuarioApi(usuarioEditando.id, payload);
        setAlert({ type: "ok", message: "Usuario actualizado correctamente." });
      } else {
        if (!formData.clave.trim()) {
          setModalAlert({ type: "error", message: "La contraseña es obligatoria para nuevos usuarios." });
          setSaving(false);
          return;
        }
        await registrarUsuario(payload);
        setAlert({ type: "ok", message: "Usuario creado exitosamente." });
      }

      setModalOpen(false);
      cargarDatos();
    } catch (err) {
      setModalAlert({ type: "error", message: err.message || "Error al procesar usuario." });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!(await confirmar("¿Seguro que deseas eliminar este usuario?"))) return;
    try {
      await eliminarUsuarioApi(id);
      setAlert({ type: "ok", message: "Usuario eliminado." });
      cargarDatos();
    } catch (err) {
      setAlert({ type: "error", message: err.message || "No se pudo eliminar el usuario." });
    }
  };

  const filtrados = usuarios.filter((u) => {
    const coincideTexto =
      !filtroTexto ||
      u.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (u.correo || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (u.numero_documento && u.numero_documento.includes(filtroTexto));

    const coincideRol = !filtroRol || String(u.rol_id) === String(filtroRol) || u.rol_rel?.nombre === filtroRol || u.rol === filtroRol;

    return coincideTexto && coincideRol;
  });

  const limpiarFiltro = () => {
      setFiltroTexto("");
      setFiltroRol("");
  };

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Gestión de Usuarios <span className="badge-rol badge-admin">ADMIN</span></h2>
          <p>Crear, modificar y eliminar cuentas del sistema</p>
        </div>
        <button type="button" className="btn-verde" onClick={abrirCrear}>
          + Nuevo Usuario
        </button>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="👥">
            <div className="stat-numero">{loading ? "—" : usuarios.length}</div>
            <div className="stat-etiqueta">Total Usuarios</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🛡️">
            <div className="stat-numero">{loading ? "—" : usuarios.filter(u => u.rol === 'Administrador').length}</div>
            <div className="stat-etiqueta">Administradores</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="🌱">
            <div className="stat-numero">{loading ? "—" : usuarios.filter(u => u.rol === 'Productor').length}</div>
            <div className="stat-etiqueta">Productores</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="🏪">
            <div className="stat-numero">{loading ? "—" : usuarios.filter(u => u.rol === 'Comprador').length}</div>
            <div className="stat-etiqueta">Compradores</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="barra-filtro margen-top-32">
        <input
          type="text"
          className="campo-input"
          placeholder="Buscar por nombre o correo..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
        <select
          className="campo-input input-angosto"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.nombre}>
              {r.nombre}
            </option>
          ))}
          {roles.length === 0 && (
              <>
                  <option value="Administrador">Administrador</option>
                  <option value="Productor">Productor</option>
                  <option value="Comprador">Comprador</option>
              </>
          )}
        </select>
        <button className="btn-verde btn-borde" onClick={limpiarFiltro}>Limpiar</button>
      </div>

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo Doc.</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="celda-vacia">Cargando usuarios...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="8" className="celda-vacia">Sin usuarios registrados</td></tr>
            ) : (
              filtrados.map((u) => (
                <tr key={u.id}>
                  <td><strong>#{u.id}</strong></td>
                  <td><strong>{u.tipo_documento || "—"}</strong></td>
                  <td>{u.nombre}</td>
                  <td>{u.correo || "—"}</td>
                  <td>
                    <span className={`chip-rol chip-${(u.rol_rel?.nombre || u.rol || "Usuario").toLowerCase()}`}>
                        {u.rol_rel?.nombre || u.rol || "Usuario"}
                    </span>
                  </td>
                  <td>{u.telefono || "—"}</td>
                  <td>
                    <span className={`etiqueta ${u.estado === 'Activo' ? 'etiqueta-verde' : 'etiqueta-gris'}`}>
                        {u.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      <button
                        type="button"
                        className="btn-tabla btn-editar"
                        onClick={() => abrirEditar(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-tabla btn-eliminar"
                        onClick={() => handleEliminar(u.id)}
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

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={usuarioEditando ? "Editar Usuario" : "Nuevo Usuario"}
        maxWidth="600px"
      >
        <form onSubmit={handleGuardar}>
          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Tipo de Documento</label>
              <select
                className="campo-input"
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                required
              >
                <option value="">— Seleccionar —</option>
                {tiposDoc.map((td) => (
                  <option key={td.codigo || td.id} value={td.codigo || td.id}>{td.nombre || td.descripcion || td.id}</option>
                ))}
              </select>
            </div>
            <div className="campo-grupo">
              <label>Nombre / Razon Social</label>
              <input
                type="text"
                className="campo-input"
                placeholder="Ej: Finca El Paraiso"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Correo Electronico</label>
              <input
                type="email"
                className="campo-input"
                placeholder="correo@empresa.com"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                required
              />
            </div>
            <div className="campo-grupo">
              <label>Telefono</label>
              <input
                type="tel"
                className="campo-input"
                placeholder="+57 300 000 0000"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Rol</label>
              <select
                className="campo-input"
                value={formData.rol_id}
                onChange={(e) => setFormData({ ...formData, rol_id: e.target.value })}
                required
              >
                <option value="">— Seleccionar —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
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
          </div>

          <div className="campo-grupo">
            <label>Contrasena {usuarioEditando && "(dejar vacio para no cambiar)"}</label>
            <input
              type="password"
              className="campo-input"
              placeholder={usuarioEditando ? "••••••••" : "Nueva contrasena"}
              value={formData.clave}
              onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
              minLength={6}
            />
          </div>

          <div className="fila-botones" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn-verde" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-verde btn-borde"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
          </div>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
        </form>
      </Modal>
    </>
  );
}
