import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  obtenerRoles,
  obtenerUsuarios,
  registrarRol,
  editarRolApi,
  eliminarRolApi,
} from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";
import type { EstadoAlerta, Rol, Usuario } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function RolesPage() {
  const { confirmar } = useDialogos();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [rolEditando, setRolEditando] = useState<Rol | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    permisos: "",
  });
  const [modalAlert, setModalAlert] = useState<EstadoAlerta | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      const [resRoles, resUsuarios] = await Promise.allSettled([
        obtenerRoles(),
        obtenerUsuarios(),
      ]);

      setRoles(resRoles.status === "fulfilled" && Array.isArray(resRoles.value) ? resRoles.value : []);
      setUsuarios(resUsuarios.status === "fulfilled" && Array.isArray(resUsuarios.value) ? resUsuarios.value : []);
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "Error al cargar datos de roles.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirCrear = () => {
    setRolEditando(null);
    setFormData({ nombre: "", descripcion: "", permisos: "Ver" });
    setModalAlert(null);
    setModalOpen(true);
  };

  const abrirEditar = (r: Rol) => {
    setRolEditando(r);
    setFormData({
      nombre: r.nombre || "",
      descripcion: r.descripcion || "",
      permisos: r.permisos || "Ver",
    });
    setModalAlert(null);
    setModalOpen(true);
  };

  const handleGuardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setModalAlert({ type: "error", message: "El nombre del rol es obligatorio." });
      return;
    }
    setSaving(true);
    setModalAlert(null);

    try {
      if (rolEditando) {
        await editarRolApi(rolEditando.id, formData);
        setAlert({ type: "ok", message: "Rol actualizado correctamente." });
      } else {
        // El backend exige el id: se usa el siguiente disponible
        const nuevoId = roles.reduce((max, r) => Math.max(max, r.id), 0) + 1;
        await registrarRol({ id: nuevoId, ...formData });
        setAlert({ type: "ok", message: "Rol creado exitosamente." });
      }
      setModalOpen(false);
      cargarDatos();
    } catch (err) {
      setModalAlert({ type: "error", message: mensajeError(err, "No se pudo guardar el rol.") });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!(await confirmar("¿Seguro que deseas eliminar este rol?"))) return;
    try {
      await eliminarRolApi(id);
      setAlert({ type: "ok", message: "Rol eliminado." });
      cargarDatos();
    } catch (err) {
      setAlert({ type: "error", message: mensajeError(err, "No se pudo eliminar el rol.") });
    }
  };

  const contarAsignados = (nombreRol: string) => {
    return usuarios.filter((u) => u.rol === nombreRol).length;
  };

  return (
    <>
      <div className="banner-panel banner-roles">
        <span>🔐 Roles y permisos del equipo AgroDirecto</span>
      </div>

      <div className="cabecera-panel">
        <div>
          <h2>
            Gestión de Roles <span className="badge-rol badge-admin">ADMIN</span>
          </h2>
          <p>Define los roles y permisos del sistema</p>
        </div>
        <button type="button" className="btn-verde" onClick={abrirCrear}>
          + Nuevo Rol
        </button>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      <div className="contenedor-tabla margen-top-24" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del Rol</th>
              <th>Descripción</th>
              <th>Permisos</th>
              <th>Usuarios Asignados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="celda-vacia">Cargando...</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={6} className="celda-vacia">Sin roles registrados.</td></tr>
            ) : (
              roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><strong>{r.nombre}</strong></td>
                  <td>{r.descripcion || "—"}</td>
                  <td>{r.permisos || "Ver"}</td>
                  <td>
                    <span className="badge badge-azul">{contarAsignados(r.nombre)}</span>
                  </td>
                  <td>
                    <div className="acciones-tabla">
                      <button
                        type="button"
                        className="btn-tabla btn-editar"
                        onClick={() => abrirEditar(r)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-tabla btn-eliminar"
                        onClick={() => handleEliminar(r.id)}
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
        title={rolEditando ? `Editar Rol #${rolEditando.id}` : "Nuevo Rol"}
      >
        <form onSubmit={handleGuardar}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />

          <div className="campo-grupo">
            <label>Nombre del Rol *</label>
            <input
              type="text"
              className="campo-input"
              placeholder="Ej: Supervisor"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="campo-grupo">
            <label>Descripción</label>
            <textarea
              className="campo-input"
              rows={3}
              placeholder="Qué puede hacer este rol..."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            ></textarea>
          </div>

          <div className="campo-grupo">
            <label>Permisos (separados por coma)</label>
            <input
              type="text"
              className="campo-input"
              placeholder="Ver, Crear, Editar, Eliminar"
              value={formData.permisos}
              onChange={(e) => setFormData({ ...formData, permisos: e.target.value })}
            />
          </div>

          <div className="fila-botones" style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
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
        </form>
      </Modal>
    </>
  );
}
