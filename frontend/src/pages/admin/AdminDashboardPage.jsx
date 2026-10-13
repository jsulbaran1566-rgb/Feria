import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  obtenerUsuarios,
  obtenerRoles,
  obtenerProveedores,
  obtenerLotes,
  obtenerComision,
  actualizarComision
} from "../../services/api";
import Alert from "../../components/common/Alert";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ usuarios: 0, roles: 0, proveedores: 0, lotes: 0 });
  const [usuariosRecientes, setUsuariosRecientes] = useState([]);
  const [proveedoresRecientes, setProveedoresRecientes] = useState([]);
  const [comision, setComision] = useState(5);
  const [guardandoComision, setGuardandoComision] = useState(false);
  const [comisionAlert, setComisionAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [u, r, p, l, c] = await Promise.allSettled([
          obtenerUsuarios(),
          obtenerRoles(),
          obtenerProveedores(),
          obtenerLotes(),
          obtenerComision(),
        ]);

        const listU = u.status === "fulfilled" && Array.isArray(u.value) ? u.value : [];
        const listR = r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [];
        const listP = p.status === "fulfilled" && Array.isArray(p.value) ? p.value : [];
        const listL = l.status === "fulfilled" && Array.isArray(l.value) ? l.value : [];

        setStats({
          usuarios: listU.length,
          roles: listR.length,
          proveedores: listP.length,
          lotes: listL.filter(lote => lote.estado === "Activo" || lote.estado === "Publicado").length,
        });

        setUsuariosRecientes(listU.slice(0, 5));
        setProveedoresRecientes(listP.slice(0, 5));

        if (c.status === "fulfilled" && c.value != null) {
          const valor = typeof c.value === "object" ? (c.value.comision_pct ?? c.value.porcentaje_comision) : c.value;
          if (valor != null) setComision(Number(valor));
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);


  const handleGuardarComision = async () => {
    setGuardandoComision(true);
    setComisionAlert(null);
    try {
      await actualizarComision(Number(comision));
      setComisionAlert({ type: "ok", message: `Comisión actualizada a ${comision}%. Se aplica a los pagos nuevos.` });
    } catch (err) {
      setComisionAlert({ type: "error", message: err.message || "Error al actualizar la comisión." });
    } finally {
      setGuardandoComision(false);
    }
  };

  return (
    <>
      <div className="banner-panel banner-admin">
        <span>🌱 AgroDirecto &mdash; Consola de Administración y Monitoreo Global</span>
      </div>

      <div className="cabecera-panel">
        <div>
          <h2>
            Panel de Administración <span className="badge-rol badge-admin">ADMIN</span>
          </h2>
          <p>Métricas generales del ecosistema agrícola</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="fila-stats">
        <div className="stat-tarjeta" data-icono="👥">
          <div className="stat-numero">{loading ? "..." : stats.usuarios}</div>
          <div className="stat-etiqueta">Usuarios Totales</div>
        </div>
        <div className="stat-tarjeta stat-marron" data-icono="🔐">
          <div className="stat-numero">{loading ? "..." : stats.roles}</div>
          <div className="stat-etiqueta">Roles Definidos</div>
        </div>
        <div className="stat-tarjeta stat-naranja" data-icono="🚚">
          <div className="stat-numero">{loading ? "..." : stats.proveedores}</div>
          <div className="stat-etiqueta">Proveedores Logísticos</div>
        </div>
        <div className="stat-tarjeta stat-azul" data-icono="🌱">
          <div className="stat-numero">{loading ? "..." : stats.lotes}</div>
          <div className="stat-etiqueta">Lotes Activos</div>
        </div>
      </div>

      {/* Tarjetas de Accesos y Comisión */}
      <div className="grid-tarjetas margen-top-24">
        <div className="tarjeta tarjeta-azul">
          <h3>👥 Gestión de Usuarios</h3>
          <p>Cree, modifique y active cuentas de productores, compradores y administradores.</p>
          <div className="margen-top-16">
            <Link to="/admin/usuarios" className="btn-verde">
              Ir a Usuarios
            </Link>
          </div>
        </div>

        <div className="tarjeta tarjeta-marron">
          <h3>🔐 Gestión de Roles</h3>
          <p>Administre los roles del sistema y la distribución de cuentas asignadas.</p>
          <div className="margen-top-16">
            <Link to="/admin/roles" className="btn-verde btn-borde">
              Ir a Roles
            </Link>
          </div>
        </div>

        <div className="tarjeta tarjeta-naranja">
          <h3>🚚 Proveedores</h3>
          <p>Supervise proveedores de fletes, semillas e insumos agrícolas.</p>
          <div className="margen-top-16">
            <Link to="/admin/proveedores" className="btn-verde btn-borde">
              Ir a Proveedores
            </Link>
          </div>
        </div>

        <div className="tarjeta">
          <h3>💰 Comisión de la Plataforma</h3>
          <p>Porcentaje deducido automáticamente de cada pago aprobado.</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
            <input
              type="number"
              className="campo-input"
              min="0"
              max="100"
              style={{ width: "80px" }}
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />
            <span>%</span>
            <button
              type="button"
              className="btn-verde"
              onClick={handleGuardarComision}
              disabled={guardandoComision}
            >
              {guardandoComision ? "..." : "Guardar"}
            </button>
          </div>
          <div style={{ marginTop: "8px" }}>
            <Alert type={comisionAlert?.type} message={comisionAlert?.message} onClose={() => setComisionAlert(null)} />
          </div>
        </div>
      </div>

      {/* Usuarios Recientes */}
      <div className="contenedor-tabla margen-top-32" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 className="titulo-panel">Usuarios Recientes</h3>
          <Link to="/admin/usuarios" className="btn-verde btn-borde" style={{ fontSize: "0.85rem" }}>
            Ver todos los usuarios
          </Link>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="celda-vacia">Cargando...</td></tr>
            ) : usuariosRecientes.map((u) => (
              <tr key={u.id}>
                <td><strong>#{u.id}</strong></td>
                <td>{u.nombre}</td>
                <td>{u.rol_rel?.nombre || u.rol || "Usuario"}</td>
                <td>
                  <span className={`badge ${u.estado === "Activo" ? "badge-verde" : "badge-rojo"}`}>
                    {u.estado}
                  </span>
                </td>
                <td>
                  <Link to="/admin/usuarios" className="btn-tabla btn-editar">
                    Ver todos
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proveedores Recientes */}
      <div className="contenedor-tabla margen-top-32" style={{ background: "#fff", padding: "20px", borderRadius: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 className="titulo-panel">Proveedores Registrados</h3>
          <Link to="/admin/proveedores" className="btn-verde btn-borde" style={{ fontSize: "0.85rem" }}>
            Ver todos →
          </Link>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="celda-vacia">Cargando...</td></tr>
            ) : proveedoresRecientes.map((p) => (
              <tr key={p.id}>
                <td><strong>#{p.id}</strong></td>
                <td>{p.nombre}</td>
                <td>{p.tipo_servicio || p.tipo || "Transporte"}</td>
                <td>
                  <span className={`badge ${p.estado === "Activo" ? "badge-verde" : "badge-rojo"}`}>
                    {p.estado || "Activo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  );
}
