import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { solicitarRecuperacionClave, restablecerClave } from "../../services/api";
import Alert from "../../components/common/Alert";
import { claveEsValida, MENSAJE_REGLAS_CLAVE, LONGITUD_MINIMA_CLAVE } from "../../utils/password";
import type { EstadoAlerta } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function RecoverPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [correo, setCorreo] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenSimulado, setTokenSimulado] = useState<string | null>(null);

  useEffect(() => {
    const tokenUrl = searchParams.get("token");
    if (tokenUrl) {
      setToken(tokenUrl);
      setAlert({
        type: "ok",
        message: "Enlace validado. Ingresa tu nueva contraseña a continuación.",
      });
    }
  }, [searchParams]);

  const handleSolicitarCorreo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await solicitarRecuperacionClave(correo.trim());
      setTokenSimulado(res?.token_simulado || null);
      setAlert(
        res?.token_simulado
          ? { type: "ok", message: "Listo. Revisa el correo simulado que aparece abajo." }
          : {
              type: "error",
              message: "No se generó ningún enlace: el correo no está registrado o la cuenta está inactiva.",
            }
      );
    } catch (err) {
      setAlert({
        type: "error",
        message: mensajeError(err, "Ocurrió un error al procesar la solicitud."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestablecerClave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setAlert({
        type: "error",
        message: "Falta el token de recuperación. Por favor abre el enlace que enviamos a tu correo.",
      });
      return;
    }

    if (!claveEsValida(claveNueva)) {
      setAlert({
        type: "error",
        message: MENSAJE_REGLAS_CLAVE,
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      await restablecerClave(token, claveNueva);
      setAlert({
        type: "ok",
        message: "¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1600);
    } catch (err) {
      setAlert({
        type: "error",
        message: mensajeError(err, "No se pudo actualizar la contraseña. El enlace puede haber expirado."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pantalla-login" style={{ padding: "40px 16px" }}>
      <div className="caja-formulario con-foto-superior">
        <img
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=700&q=80"
          alt="Surcos de cultivo en el campo"
          className="foto-formulario"
        />

        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

        {!token ? (
          <div>
            <h2>Recuperar Contraseña</h2>
            <p>
              Ingrese el correo asociado a su cuenta. Se generará un enlace de recuperación válido por 15 minutos.
              <br />
              <small>
                <strong>Modo demostración:</strong> no se envía ningún correo real; el enlace aparecerá en pantalla.
              </small>
            </p>

            <form onSubmit={handleSolicitarCorreo}>
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

              <div className="accion-formulario">
                <button type="submit" className="btn-verde" disabled={loading}>
                  {loading ? "Generando enlace..." : "Enviar enlace de recuperación"}
                </button>
              </div>
            </form>

            {tokenSimulado && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "14px",
                  border: "1px dashed #2e7d32",
                  borderRadius: "8px",
                  background: "#f1f8e9",
                }}
              >
                <strong>📧 Correo simulado</strong>
                <p style={{ margin: "8px 0" }}>
                  Como es una simulación, no se envió ningún correo real. Haz clic
                  para abrir el enlace de recuperación como si lo hubieras recibido:
                </p>
                <button
                  type="button"
                  className="btn-verde"
                  onClick={() => {
                    setAlert(null);
                    setTokenSimulado(null);
                    setToken(tokenSimulado);
                  }}
                >
                  Abrir enlace de recuperación
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2>Establecer Nueva Contraseña</h2>
            <p>Ingrese su nueva contraseña para actualizar el acceso a su cuenta.</p>

            <form onSubmit={handleRestablecerClave}>
              <div className="campo-grupo">
                <label htmlFor="campo-nueva-clave">Nueva contraseña</label>
                <input
                  type="password"
                  id="campo-nueva-clave"
                  className="campo-input"
                  placeholder="Mínimo 8 caracteres, mayúscula, número y símbolo"
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  required
                  minLength={LONGITUD_MINIMA_CLAVE}
                />
              </div>

              <div className="accion-formulario">
                <button type="submit" className="btn-verde" disabled={loading}>
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="pie-form" style={{ marginTop: "20px", textAlign: "center" }}>
          <Link to="/login">← Volver al inicio de sesión</Link>
        </div>
      </div>
    </main>
  );
}
