import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarUsuario, obtenerRoles, obtenerTiposDocumento } from "../../services/api";
import Alert from "../../components/common/Alert";
import Modal from "../../components/common/Modal";
import { evaluarClave, claveEsValida } from "../../utils/password";
import type { EstadoAlerta, Rol, TipoDocumento } from "../../types";
import { mensajeError } from "../../utils/errores";


export default function RegisterPage() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Rol[]>([]);
  const [tiposDoc, setTiposDoc] = useState<TipoDocumento[]>([]);
  const [formData, setFormData] = useState({
    tipo_documento: "CC",
    numero_documento: "",
    nombre: "",
    correo: "",
    telefono: "",
    rol_nombre: "",
    clave: "",
    clave2: "",
    acepta_terminos: false,
  });

  const [verClave, setVerClave] = useState(false);
  const [verClave2, setVerClave2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);
  const [modalDatos, setModalDatos] = useState(false);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [rolesRes, tiposRes] = await Promise.allSettled([
          obtenerRoles(),
          obtenerTiposDocumento(),
        ]);
        if (rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value)) {
          setRoles(rolesRes.value);
        }
        if (tiposRes.status === "fulfilled" && Array.isArray(tiposRes.value)) {
          setTiposDoc(tiposRes.value);
        }
      } catch {
        // Fallback
      }
    }
    loadCatalogs();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);

    if (!formData.tipo_documento) {
        setAlert({ type: "error", message: "Por favor seleccione un tipo de documento." });
        return;
    }
    
    if (!formData.rol_nombre) {
        setAlert({ type: "error", message: "Por favor seleccione un rol." });
        return;
    }

    if (!claveEsValida(formData.clave)) {
        setAlert({ type: "error", message: "La contraseña debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial." });
        return;
    }

    if (formData.clave !== formData.clave2) {
      setAlert({ type: "error", message: "Las contraseñas no coinciden." });
      return;
    }

    const numeroDocOriginal = formData.numero_documento.trim();
    const numeroDoc = numeroDocOriginal.replace(/\D/g, '');

    if (!numeroDoc || !numeroDocOriginal) {
        setAlert({ type: "error", message: "El número de identificación no es válido." });
        return;
    }

    if (!formData.acepta_terminos) {
        setAlert({ type: "error", message: "Debe autorizar el Tratamiento de Datos Personales para continuar." });
        return;
    }

    const rolObj = roles.find((r) => r.nombre === formData.rol_nombre);
    if (!rolObj) {
      setAlert({
        type: "error",
        message: "No se pudieron cargar los roles. Recarga la página e inténtalo de nuevo.",
      });
      return;
    }
    const rol_id = rolObj.id;

    setLoading(true);

    try {
      await registrarUsuario({
        id: parseInt(numeroDoc, 10),
        tipo_documento: formData.tipo_documento,
        numero_documento: numeroDocOriginal,
        nombre: formData.nombre.trim(),
        correo: formData.correo.trim(),
        telefono: formData.telefono.trim(),
        rol_id: rol_id,
        estado: 'Activo',
        clave: formData.clave,
      });

      setAlert({
        type: "ok",
        message: "¡Cuenta creada con éxito! Redirigiendo al login...",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setAlert({
        type: "error",
        message: mensajeError(err, "No se pudo crear la cuenta."),
      });
    } finally {
      setLoading(false);
    }
  };

  const reqClave = evaluarClave(formData.clave);

  return (
    <main className="pantalla-login" style={{ padding: "40px 16px" }}>
      <div className="caja-formulario caja-formulario-grande con-foto-superior" style={{ maxWidth: "600px" }}>
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=700&q=80"
          alt="Campo de cultivo al amanecer"
          className="foto-formulario"
        />

        <h2>Crear Cuenta</h2>
        <p>Unase a la plataforma de comercio agricola directo en Colombia.</p>

        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

        <form onSubmit={handleSubmit}>
          <div className="fila-campos" style={{ display: "flex", gap: "16px" }}>
            <div className="campo-grupo" style={{ flex: 1 }}>
              <label>Tipo de Documento <span className="obligatorio">*</span></label>
              <select
                className="campo-input"
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                required
              >
                <option value="">— Seleccione —</option>
                {tiposDoc.length > 0 ? (
                  tiposDoc.map((td) => (
                    <option key={td.codigo} value={td.codigo}>
                      {td.nombre} ({td.codigo})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PP">Pasaporte</option>
                  </>
                )}
              </select>
            </div>

            <div className="campo-grupo" style={{ flex: 2 }}>
              <label>Numero de Identificacion <span className="obligatorio">*</span></label>
              <input
                type="text"
                className="campo-input"
                placeholder="Ej: 1234567890"
                value={formData.numero_documento}
                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="campo-grupo">
            <label>Nombre Completo / Razon Social <span className="obligatorio">*</span></label>
            <input
              type="text"
              className="campo-input"
              placeholder="Ej: Finca El Paraiso SAS"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="campo-grupo">
            <label>Correo Electronico <span className="obligatorio">*</span></label>
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
            <label>Telefono / WhatsApp <span className="obligatorio">*</span></label>
            <input
              type="tel"
              className="campo-input"
              placeholder="+57 300 000 0000"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              required
            />
          </div>

          <div className="campo-grupo">
            <label>Yo soy un... <span className="obligatorio">*</span></label>
            <select
              className="campo-input"
              value={formData.rol_nombre}
              onChange={(e) => setFormData({ ...formData, rol_nombre: e.target.value })}
              required
            >
              <option value="">— Seleccione su perfil —</option>
              <option value="Productor">🌾 Productor — Gestionar fincas y lotes</option>
              <option value="Comprador">🏪 Comprador — Restaurante / Hotel / Distribuidor</option>
            </select>
          </div>

          <div className="campo-grupo">
            <label>Contraseña <span className="obligatorio">*</span></label>
            <div className="contenedor-password" style={{ position: "relative" }}>
              <input
                type={verClave ? "text" : "password"}
                className="campo-input"
                placeholder="Minimo 8 caracteres"
                value={formData.clave}
                onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                required
                minLength={8}
                style={{ width: "100%", paddingRight: "48px" }}
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                title="Mostrar/ocultar contrasena"
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer", color: "#8fa5b8", height: "100%", width: "46px"
                }}
              >
                <span className="material-symbols-outlined">{verClave ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            <ul className="req-clave" id="req-clave" style={{ fontSize: "0.85rem", marginTop: "8px", listStyle: "none", padding: 0 }}>
                <li style={{ color: reqClave.longitud ? "#2e7d32" : "#c62828" }}>{reqClave.longitud ? "✓" : "✗"} Minimo 8 caracteres</li>
                <li style={{ color: reqClave.mayus ? "#2e7d32" : "#c62828" }}>{reqClave.mayus ? "✓" : "✗"} Una letra mayuscula</li>
                <li style={{ color: reqClave.numero ? "#2e7d32" : "#c62828" }}>{reqClave.numero ? "✓" : "✗"} Un numero</li>
                <li style={{ color: reqClave.especial ? "#2e7d32" : "#c62828" }}>{reqClave.especial ? "✓" : "✗"} Un caracter especial (!@#$%)</li>
            </ul>
          </div>

          <div className="campo-grupo">
            <label>Confirmar Contraseña <span className="obligatorio">*</span></label>
            <div className="contenedor-password" style={{ position: "relative" }}>
              <input
                type={verClave2 ? "text" : "password"}
                className="campo-input"
                placeholder="Repita su contraseña"
                value={formData.clave2}
                onChange={(e) => setFormData({ ...formData, clave2: e.target.value })}
                required
                minLength={8}
                style={{ width: "100%", paddingRight: "48px" }}
              />
              <button
                type="button"
                onClick={() => setVerClave2(!verClave2)}
                title="Mostrar/ocultar contrasena"
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer", color: "#8fa5b8", height: "100%", width: "46px"
                }}
              >
                <span className="material-symbols-outlined">{verClave2 ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <div className="campo-check">
            <input
              type="checkbox"
              id="reg-datos"
              checked={formData.acepta_terminos}
              onChange={(e) => setFormData({ ...formData, acepta_terminos: e.target.checked })}
              required
            />
            <label htmlFor="reg-datos">
              He leido y autorizo el{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setModalDatos(true); }}>Tratamiento de Datos Personales</a>{" "}
              de AgroDirecto, de acuerdo con la Ley 1581 de 2012. <span className="obligatorio">*</span>
            </label>
          </div>

          <div className="accion-formulario">
            <button type="submit" className="btn-verde" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear mi Cuenta"}
            </button>
          </div>
        </form>

        <div className="pie-form" style={{ marginTop: "16px", textAlign: "center" }}>
          Ya tiene cuenta? <Link to="/login">Inicie sesion aqui</Link>
        </div>
      </div>

      <Modal isOpen={modalDatos} onClose={() => setModalDatos(false)} title="Autorizacion para el Tratamiento de Datos Personales">
        <div style={{ fontSize: "0.95rem", color: "#444", lineHeight: "1.6" }}>
            <p>En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la Republica de Colombia, AgroDirecto informa que los datos personales suministrados en este formulario seran incorporados a una base de datos de responsabilidad de AgroDirecto.</p>
            <p><strong>Finalidad:</strong> estos datos se usaran unicamente para la creacion y gestion de su cuenta, la operacion de la plataforma de comercio agricola y el envio de notificaciones.</p>
            <p><strong>Derechos del titular:</strong> usted podra en cualquier momento conocer, actualizar, rectificar o solicitar la eliminacion de sus datos.</p>
            <p>Al marcar la casilla de aceptacion, usted declara que ha leido este aviso y autoriza de manera libre el tratamiento de sus datos personales.</p>
        </div>
        <div className="fila-botones margen-top-16">
            <button className="btn-verde" onClick={() => setModalDatos(false)}>Cerrar</button>
        </div>
      </Modal>
    </main>
  );
}
