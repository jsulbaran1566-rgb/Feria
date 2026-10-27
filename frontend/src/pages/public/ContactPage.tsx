import { useState } from "react";
import type { FormEvent } from "react";
import { enviarSoporte } from "../../services/api";
import Alert from "../../components/common/Alert";
import type { EstadoAlerta } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "",
    mensaje: "",
  });
  const [alert, setAlert] = useState<EstadoAlerta | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      // El backend exige nombre y correo; asunto y teléfono se incluyen en el mensaje
      await enviarSoporte({
        nombre: formData.nombre.trim(),
        correo: formData.correo.trim(),
        mensaje: `[${formData.asunto.trim()}] ${formData.mensaje}${
          formData.telefono.trim() ? ` (Tel: ${formData.telefono.trim()})` : ""
        }`,
      });
      setAlert({
        type: "ok",
        message: "¡Mensaje recibido! Nos pondremos en contacto contigo a la mayor brevedad posible.",
      });
      setFormData({ nombre: "", correo: "", telefono: "", asunto: "", mensaje: "" });
    } catch (err) {
      setAlert({
        type: "error",
        message: mensajeError(err, "No se pudo enviar el mensaje en este momento."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section id="seccion-hero" className="hero-con-imagen hero-contacto-img">
        <span className="badge-hero">&#10022; Soporte 24/7</span>
        <h1>Centro de Soporte</h1>
        <p>Estamos para ayudar a tecnificar su proceso de comercialización. Contáctenos por el canal que prefiera.</p>
      </section>

      <main className="contenedor-principal">
        <div className="titulo-seccion">
          <h2>Canales Oficiales</h2>
          <p>Elija la forma más cómoda de comunicarse con nosotros</p>
        </div>

        <div className="cuadricula-contacto">
          <div className="elemento-contacto">
            <span className="icono-contacto">💬</span>
            <div>
              <h4>WhatsApp</h4>
              <p>
                <a href="https://wa.me/573000000000" target="_blank" rel="noreferrer">
                  +57 300 000 0000
                </a>
              </p>
              <p>Lunes a Viernes &bull; 8 am a 6 pm</p>
            </div>
          </div>
          <div className="elemento-contacto">
            <span className="icono-contacto">📧</span>
            <div>
              <h4>Correo Electrónico</h4>
              <p>
                <a href="mailto:soporte@agrodirecto.com">soporte@agrodirecto.com</a>
              </p>
              <p>Respuesta en menos de 24 horas</p>
            </div>
          </div>
          <div className="elemento-contacto">
            <span className="icono-contacto">📍</span>
            <div>
              <h4>Ubicación</h4>
              <p>Sedes regionales en Medellín, Bogotá y Cali</p>
            </div>
          </div>
          <div className="elemento-contacto">
            <span className="icono-contacto">📞</span>
            <div>
              <h4>Línea Telefónica</h4>
              <p>
                <a href="tel:+576014000000">601 400 0000</a>
              </p>
              <p>Atención nacional</p>
            </div>
          </div>
        </div>

        <div className="titulo-seccion mt-32">
          <h2>Del Campo a su Mesa</h2>
          <p>Conozca un poco más sobre dónde y cómo trabajamos</p>
        </div>

        <div className="galeria-contacto">
          <figure className="foto-contacto">
            <img
              src="https://img.magnific.com/foto-gratis/fondo-frutas-aguacate_23-2151932284.jpg?semt=ais_hybrid&w=740&q=80"
              alt="Aguacates frescos"
            />
            <figcaption>Aguacates</figcaption>
          </figure>
          <figure className="foto-contacto">
            <img
              src="https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=600&q=80"
              alt="Verduras frescas variadas"
            />
            <figcaption>Verduras Frescas</figcaption>
          </figure>
          <figure className="foto-contacto">
            <img
              src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80"
              alt="Frutas frescas variadas"
            />
            <figcaption>Frutas</figcaption>
          </figure>
          <figure className="foto-contacto">
            <img
              src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80"
              alt="Granos y cereales"
            />
            <figcaption>Granos y Cereales</figcaption>
          </figure>
        </div>

        <div className="titulo-seccion mt-32">
          <h2>Envíenos un Mensaje</h2>
        </div>

        <div className="contenedor-formulario tarjeta-completa">
          <form onSubmit={handleSubmit}>
            <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

            <div className="fila-formulario">
              <div className="campo-grupo">
                <label htmlFor="contactNombre">Nombre</label>
                <input
                  type="text"
                  id="contactNombre"
                  className="campo-input"
                  placeholder="Su nombre completo"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="campo-grupo">
                <label htmlFor="contactTelefono">Teléfono</label>
                <input
                  type="tel"
                  id="contactTelefono"
                  className="campo-input"
                  placeholder="+57 300 000 0000"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="campo-grupo">
              <label htmlFor="contactCorreo">Correo electrónico</label>
              <input
                type="email"
                id="contactCorreo"
                className="campo-input"
                placeholder="usted@correo.com"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                required
              />
            </div>

            <div className="campo-grupo">
              <label htmlFor="contactAsunto">Asunto</label>
              <input
                type="text"
                id="contactAsunto"
                className="campo-input"
                placeholder="Motivo del contacto"
                value={formData.asunto}
                onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                required
              />
            </div>

            <div className="campo-grupo">
              <label htmlFor="contactMensaje">Mensaje</label>
              <textarea
                id="contactMensaje"
                className="campo-input"
                rows={4}
                placeholder="¿En qué podemos ayudarle?"
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                required
              ></textarea>
            </div>

            <div className="accion-formulario">
              <button type="submit" className="btn-verde" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Mensaje"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
