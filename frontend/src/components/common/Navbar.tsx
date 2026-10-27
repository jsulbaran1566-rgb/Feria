import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContexto";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const getPanelLink = () => {
    if (!user) return "/";
    if (user.rol === "Administrador") return "/admin";
    if (user.rol === "Productor") return "/productor";
    if (user.rol === "Comprador") return "/comprador";
    return "/";
  };

  return (
    <nav id="nav-principal">
      <Link to="/" style={{ textDecoration: "none", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
        <strong style={{ fontSize: "1.2rem", letterSpacing: "0.03em", color: "#ffffff" }}>🌾 AGRODIRECTO</strong>
      </Link>
      <div className="links-nav">
        <Link to="/">Inicio</Link>
        <Link to="/nosotros">Nosotros</Link>
        <Link to="/contacto">Contacto</Link>

        {isAuthenticated ? (
          <>
            <Link to={getPanelLink()} style={{ fontWeight: "bold", color: "var(--dorado-claro, #F3DFB0)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              📊 Mi Panel ({user?.rol})
            </Link>
            <span style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.92)" }}>
              Hola, <strong>{user?.nombre}</strong>
            </span>
            <Link
              to="/notificaciones"
              className="btn-notificaciones-nav"
              title="Notificaciones"
            >
              🔔 Notificaciones
            </Link>
            <button
              onClick={handleLogout}
              className="btn-salir"
              style={{ cursor: "pointer" }}
            >
              🚪 Cerrar Sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secundario-nav">
              Iniciar Sesión
            </Link>
            <Link to="/registro" className="btn-verde" style={{ padding: "6px 14px", textDecoration: "none" }}>
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
