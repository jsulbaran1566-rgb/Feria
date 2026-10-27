import { Link } from "react-router-dom";

// El año se calcula una sola vez al cargar la aplicación
const ANIO_ACTUAL = new Date().getFullYear();

export default function Footer() {
  return (
    <footer id="pie-pagina">
      <div className="pie-contenido">
        <div className="pie-marca">
          <strong>AgroDirecto</strong>
          <p>Del campo a su negocio, sin rodeos.</p>
        </div>

        <nav className="pie-enlaces" aria-label="Enlaces del pie de página">
          <Link to="/">Inicio</Link>
          <Link to="/nosotros">Nosotros</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/registro">Registrarse</Link>
        </nav>
      </div>

      <p className="pie-derechos">
        &copy; {ANIO_ACTUAL} AgroDirecto. Todos los derechos reservados.
      </p>
    </footer>
  );
}
