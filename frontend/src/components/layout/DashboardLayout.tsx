import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import Sidebar from "../common/Sidebar";
import Modal from "../common/Modal";
import Alert from "../common/Alert";
import { enviarSoporte, obtenerNotificaciones } from "../../services/api";
import { mensajeError } from "../../utils/errores";
import type { EstadoAlerta } from "../../types";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportData, setSupportData] = useState({ asunto: "", mensaje: "" });
  const [supportAlert, setSupportAlert] = useState<EstadoAlerta | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchNotifs = async () => {
      try {
        const res = await obtenerNotificaciones();
        if (mounted) setUnreadCount(res.no_leidas ?? 0);
      } catch {
        // silencioso
      }
    };
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const getPageClass = () => {
    if (user?.rol === "Administrador") return "pagina-admin";
    if (user?.rol === "Productor") return "pagina-productor";
    if (user?.rol === "Comprador") return "pagina-comprador";
    return "";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSendSupport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSupportLoading(true);
    setSupportAlert(null);
    try {
      if (!user) return;
      // El backend exige nombre y correo; el asunto se antepone al mensaje
      await enviarSoporte({
        usuario_id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        mensaje: supportData.asunto.trim()
          ? `[${supportData.asunto.trim()}] ${supportData.mensaje}`
          : supportData.mensaje,
      });
      setSupportAlert({ type: "ok", message: "Tu ticket de soporte ha sido enviado con éxito." });
      setSupportData({ asunto: "", mensaje: "" });
      setTimeout(() => {
        setSupportOpen(false);
        setSupportAlert(null);
      }, 1500);
    } catch (err) {
      setSupportAlert({ type: "error", message: mensajeError(err, "No se pudo enviar el ticket.") });
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className={`app-dashboard ${getPageClass()}`.trim()} style={{ minHeight: "100vh" }}>
      {/* Barra superior */}
      <nav id="nav-principal">
        <Link to="/" style={{ textDecoration: "none", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ fontSize: "1.2rem", letterSpacing: "0.03em", color: "#ffffff" }}>🌾 AGRODIRECTO</strong>
        </Link>
        <div className="links-nav">
          <span style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.92)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span>👤 {user?.nombre}</span>
            <span className="badge-rol-nav">{user?.rol}</span>
          </span>
          <Link
            to="/notificaciones"
            className="btn-notificaciones-nav"
            title="Ver notificaciones"
          >
            🔔 Notificaciones
            {unreadCount > 0 && (
              <span className="badge-notif-contador">{unreadCount}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-salir"
            style={{ cursor: "pointer" }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenedor del panel y sidebar */}
      <div className="layout-panel">
        <Sidebar onOpenSupport={() => setSupportOpen(true)} />
        <div className="zona-contenido">
          <Outlet />
        </div>
      </div>

      {/* Modal de soporte transversal */}
      <Modal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Enviar Mensaje a Soporte"
      >
        <form onSubmit={handleSendSupport}>
          <Alert
            type={supportAlert?.type}
            message={supportAlert?.message}
            onClose={() => setSupportAlert(null)}
          />

          <div className="campo-grupo">
            <label>Asunto</label>
            <input
              type="text"
              className="campo-input"
              value={supportData.asunto}
              onChange={(e) => setSupportData({ ...supportData, asunto: e.target.value })}
              placeholder="Ej: Problema con una reserva o pago"
              required
            />
          </div>

          <div className="campo-grupo">
            <label>Descripción detallada</label>
            <textarea
              className="campo-input"
              rows={4}
              value={supportData.mensaje}
              onChange={(e) => setSupportData({ ...supportData, mensaje: e.target.value })}
              placeholder="Describe detalladamente tu consulta o incidencia..."
              required
            ></textarea>
          </div>

          <div className="accion-formulario">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => setSupportOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-verde"
              disabled={supportLoading}
            >
              {supportLoading ? "Enviando..." : "Enviar Ticket"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
