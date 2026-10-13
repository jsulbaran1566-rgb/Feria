import React, { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContexto";
import Alert from "../../components/common/Alert";

const panelPorRol = (rol) => {
  if (rol === "Administrador") return "/admin";
  if (rol === "Productor") return "/productor";
  return "/comprador";
};

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const usuario = await login(correo.trim(), clave);
      const from = location.state?.from?.pathname;
      navigate(from || panelPorRol(usuario?.rol), { replace: true });
    } catch (err) {
      setAlert({
        type: "error",
        message: err.message || "Credenciales incorrectas o usuario inactivo.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Si ya hay sesión activa, no tiene sentido mostrar el formulario
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || panelPorRol(user?.rol)} replace />;
  }

  return (
    <main className="pantalla-login" style={{ padding: "40px 16px" }}>
      <div className="caja-formulario con-foto-superior">
        <img
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=700&q=80"
          alt="Surcos de cultivo en el campo"
          className="foto-formulario"
        />

        <h2>Iniciar Sesión</h2>
        <p>Ingrese sus credenciales para gestionar sus cultivos o reservas.</p>

        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

        <form onSubmit={handleSubmit}>
          <div className="campo-grupo">
            <label htmlFor="campo-correo">Correo Electrónico</label>
            <input
              type="email"
              id="campo-correo"
              className="campo-input"
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="campo-grupo">
            <label htmlFor="campo-clave">Contraseña</label>
            <div className="contenedor-password" style={{ display: "flex", position: "relative" }}>
              <input
                type={verClave ? "text" : "password"}
                id="campo-clave"
                className="campo-input"
                placeholder="Mínimo 6 caracteres"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
              <button
                type="button"
                id="btn-ver-clave"
                onClick={() => setVerClave(!verClave)}
                title="Mostrar/ocultar contraseña"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span className="material-symbols-outlined">
                  {verClave ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="accion-formulario">
            <button type="submit" className="btn-verde" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>

        <div className="pie-form" style={{ marginTop: "16px", textAlign: "center" }}>
          <Link to="/recuperar-clave">¿Olvidó su contraseña?</Link>
        </div>

        <div className="pie-form" style={{ marginTop: "8px", textAlign: "center" }}>
          ¿No tiene cuenta? <Link to="/registro">Regístrese aquí</Link>
        </div>
      </div>
    </main>
  );
}
