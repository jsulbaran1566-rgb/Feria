import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/authContexto";

export default function Sidebar({ onOpenSupport }: { onOpenSupport: () => void }) {
  const { user } = useAuth();
  const rol = user?.rol || "";

  const getAvatar = () => {
    if (rol === "Administrador") return "🛡️";
    if (rol === "Productor") return "🌿";
    if (rol === "Comprador") return "🏪";
    return "👤";
  };

  const getBadgeClass = () => {
    if (rol === "Administrador") return "badge-admin";
    if (rol === "Productor") return "badge-productor";
    if (rol === "Comprador") return "badge-comprador";
    return "";
  };

  return (
    <aside className="sidebar">
      <div className="perfil-sidebar">
        <div className="avatar-usuario">{getAvatar()}</div>
        <h4>{user?.nombre || "Usuario"}</h4>
        <span>
          <span className={`badge-rol ${getBadgeClass()}`.trim()}>{rol}</span>
        </span>
      </div>

      <nav className="nav-sidebar">
        {rol === "Administrador" && (
          <>
            <NavLink to="/admin" end className={({ isActive }) => (isActive ? "activo" : "")}>
              📊 Resumen
            </NavLink>
            <NavLink to="/admin/usuarios" className={({ isActive }) => (isActive ? "activo" : "")}>
              👥 Usuarios
            </NavLink>
            <NavLink to="/admin/roles" className={({ isActive }) => (isActive ? "activo" : "")}>
              🔐 Roles
            </NavLink>
            <NavLink to="/admin/proveedores" className={({ isActive }) => (isActive ? "activo" : "")}>
              🚚 Proveedores
            </NavLink>
            <NavLink to="/admin/lotes" className={({ isActive }) => (isActive ? "activo" : "")}>
              🌱 Lotes
            </NavLink>
            <NavLink to="/admin/historial" className={({ isActive }) => (isActive ? "activo" : "")}>
              📋 Historial
            </NavLink>
            <NavLink to="/admin/soporte" className={({ isActive }) => (isActive ? "activo" : "")}>
              📨 Tickets de Soporte
            </NavLink>
            <NavLink to="/disputas" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚖️ Disputas
            </NavLink>
            <NavLink to="/admin/categorias" className={({ isActive }) => (isActive ? "activo" : "")}>
              🗂️ Categorías
            </NavLink>
            <NavLink to="/admin/reportes" className={({ isActive }) => (isActive ? "activo" : "")}>
              📈 Reporte Financiero
            </NavLink>
            <NavLink to="/perfil" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚙️ Mi Perfil
            </NavLink>
          </>
        )}

        {rol === "Productor" && (
          <>
            <NavLink to="/productor" end className={({ isActive }) => (isActive ? "activo" : "")}>
              📊 Resumen
            </NavLink>
            <NavLink to="/productor/mis-cultivos" className={({ isActive }) => (isActive ? "activo" : "")}>
              🌱 Mis Cultivos
            </NavLink>
            <NavLink to="/productor/trazabilidad" className={({ isActive }) => (isActive ? "activo" : "")}>
              📍 Trazabilidad
            </NavLink>
            <NavLink to="/productor/ventas-pagos" className={({ isActive }) => (isActive ? "activo" : "")}>
              💰 Ventas y Pagos
            </NavLink>
            <NavLink to="/productor/reportes" className={({ isActive }) => (isActive ? "activo" : "")}>
              📈 Reportes
            </NavLink>
            <NavLink to="/disputas" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚖️ Disputas
            </NavLink>
            <NavLink to="/perfil" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚙️ Mi Perfil
            </NavLink>
          </>
        )}

        {rol === "Comprador" && (
          <>
            <NavLink to="/comprador" end className={({ isActive }) => (isActive ? "activo" : "")}>
              📊 Resumen
            </NavLink>
            <NavLink to="/comprador/explorar-lotes" className={({ isActive }) => (isActive ? "activo" : "")}>
              🔍 Explorar Lotes
            </NavLink>
            <NavLink to="/comprador/mis-reservas" className={({ isActive }) => (isActive ? "activo" : "")}>
              📋 Mis Reservas
            </NavLink>
            <NavLink to="/comprador/entregas" className={({ isActive }) => (isActive ? "activo" : "")}>
              🚚 Próximas Entregas
            </NavLink>
            <NavLink to="/comprador/pagos" className={({ isActive }) => (isActive ? "activo" : "")}>
              💳 Pagos y Facturas
            </NavLink>
            <NavLink to="/comprador/productores-favoritos" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⭐ Productores Favoritos
            </NavLink>
            <NavLink to="/disputas" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚖️ Disputas
            </NavLink>
            <NavLink to="/perfil" className={({ isActive }) => (isActive ? "activo" : "")}>
              ⚙️ Mi Perfil
            </NavLink>
          </>
        )}

        {onOpenSupport && (
          <button
            type="button"
            onClick={onOpenSupport}
            className="btn-soporte-sidebar"
          >
            💬 Soporte
          </button>
        )}
      </nav>
    </aside>
  );
}
