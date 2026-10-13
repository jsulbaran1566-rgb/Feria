import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  obtenerLotes,
  obtenerCategorias,
  obtenerResumenPublico,
  obtenerProveedores,
} from "../../services/api";

export default function HomePage() {
  const [stats, setStats] = useState({
    lotes: "—",
    compradores: "—",
    categorias: "—",
    proveedores: "—",
  });
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      img: "https://www.finagro.com.co/sites/default/files/2025-05/WhatsApp%20Image%202025-05-16%20at%208.40.55%20AM.jpeg",
      caption: "Campos de cultivo — Región Andina",
    },
    {
      img: "https://www.sanisidrosca.com/img/galeria/2025/08/agricultura-ecolgica.jpg",
      caption: "Cosecha directa del productor",
    },
    {
      img: "https://www.bbva.com/wp-content/uploads/2021/09/BBVA-biotecnologi%CC%81a-agri%CC%81cola-sostenibilidad-cultivo-agricultura-innovacion-terrenos.jpg",
      caption: "Trazabilidad desde la siembra",
    },
    {
      img: "https://www.bbva.com/wp-content/uploads/2024/07/Sostenibilidad-Agricultura-intensiva-extensiva-BBVA.jpg",
      caption: "Producción tecnificada y sostenible",
    },
    {
      img: "https://lanotaeconomica.com.co/wp-content/uploads/elementor/thumbs/Cultivos-2-rgxk9ssqlm79rpxsyqja9jd5pgs2jwq3kdf00ph01o.png",
      caption: "Del campo directo a su negocio",
    },
  ];

  const totalSlides = slides.length;

  const irA = (idx) => {
    setSlide((idx + totalSlides) % totalSlides);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(timer);
  }, [totalSlides]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [lotes, usuarios, categorias, proveedores] = await Promise.allSettled([
          obtenerLotes({}),
          obtenerResumenPublico(),
          obtenerCategorias(),
          obtenerProveedores({}),
        ]);

        const lotesData = lotes.status === "fulfilled" && Array.isArray(lotes.value) ? lotes.value : [];
        const resumen = usuarios.status === "fulfilled" && usuarios.value ? usuarios.value : {};
        const catsData = categorias.status === "fulfilled" && Array.isArray(categorias.value) ? categorias.value : [];
        const provsData = proveedores.status === "fulfilled" && Array.isArray(proveedores.value) ? proveedores.value : [];

        setStats({
          lotes: lotesData.filter((l) => l.estado === "Activo").length || lotesData.length,
          compradores: resumen.compradores || 0,
          categorias: catsData.length,
          proveedores: provsData.filter((p) => p.estado === "Activo").length || provsData.length,
        });
      } catch (e) {
        console.warn("No se pudieron cargar las estadísticas:", e.message);
      }
    }
    loadStats();
  }, []);

  return (
    <>
      <header id="seccion-hero" className="hero-con-imagen hero-inicio-img">
        <span className="badge-seccion">&#10022; AGRODIRECTO</span>
        <h1>Cosecha Anticipada para su Negocio</h1>
        <p>
          Asegure precios estables comprando directamente al productor agrícola. Sin intermediarios, con trazabilidad completa desde la siembra hasta su negocio.
        </p>
        <div className="hero-botones">
          <Link to="/registro" className="btn-verde">
            Crear Perfil
          </Link>
          <Link to="/nosotros" className="btn-verde btn-borde">
            Conocer más
          </Link>
        </div>
      </header>

      <main className="contenido-pagina">
        {/* CÓMO FUNCIONA */}
        <div className="titulo-seccion margen-top-32">
          <h2>¿Cómo funciona AgroDirecto?</h2>
          <p>Un proceso simple para conectar el campo con su negocio</p>
        </div>

        <div className="grid-tarjetas">
          <div className="tarjeta">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOAVA_pPIrCpbIRPInHjemq8sFBUoa1dpPsPj9QXo4sDGwut-u0CBuL1g&s=10"
              alt=""
              className="miniatura-tarjeta"
            />
            <h3>1. Explore Lotes</h3>
            <p>
              Filtre por categoría de cultivo y fecha estimada de cosecha. Encuentre el productor ideal para su negocio en todo el territorio nacional.
            </p>
          </div>
          <div className="tarjeta">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFBSCGf2hI5MG_GAY8nIbgR02VfrU_Kvd0l8m_rt_-q0kBeBX63rvfeXk&s=10"
              alt=""
              className="miniatura-tarjeta"
            />
            <h3>2. Reserve Cupos</h3>
            <p>
              Aparte su producto antes de la recolección oficial con precio pactado y condiciones claras. Sin sorpresas.
            </p>
          </div>
          <div className="tarjeta">
            <img
              src="https://sembralia.com/cdn/shop/articles/agricultura_digital_600x600_crop_center.jpg?v=1694946946"
              alt=""
              className="miniatura-tarjeta"
            />
            <h3>3. Trazabilidad</h3>
            <p>
              Siga el ciclo vital de su pedido: siembra, crecimiento y cosecha en tiempo real directamente desde la aplicación.
            </p>
          </div>
          <div className="tarjeta">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSx67Nckohlt9Ao2j2ndnosJRlQTmzYhqfdglYVZXDj05PN09DkPzez9EI&s=10"
              alt=""
              className="miniatura-tarjeta"
            />
            <h3>4. Conexión Directa</h3>
            <p>
              Sin intermediarios. El margen que antes se perdía ahora beneficia al productor y a su negocio por igual.
            </p>
          </div>
        </div>

        {/* SLIDER DE GALERÍA */}
        <div className="titulo-seccion margen-top-32">
          <h2>El Campo en Imágenes</h2>
          <p>Así luce la agricultura que conectamos con su negocio</p>
        </div>

        <div className="slider-galeria" id="sliderGaleria" style={{ position: "relative", overflow: "hidden", borderRadius: "12px" }}>
          <div
            className="slider-pista"
            id="sliderPista"
            style={{
              display: "flex",
              transform: `translateX(-${slide * 100}%)`,
              transition: "transform 0.5s ease-in-out",
            }}
          >
            {slides.map((item, idx) => (
              <div key={idx} className="slider-diapositiva" style={{ minWidth: "100%", position: "relative" }}>
                <img
                  src={item.img}
                  alt={item.caption}
                  style={{ width: "100%", height: "400px", objectFit: "cover", display: "block" }}
                />
                <div className="slider-caption">{item.caption}</div>
              </div>
            ))}
          </div>

          {/* Controles */}
          <button
            type="button"
            className="slider-btn slider-btn-prev"
            id="sliderPrev"
            aria-label="Anterior"
            onClick={() => irA(slide - 1)}
          >
            &#8249;
          </button>
          <button
            type="button"
            className="slider-btn slider-btn-next"
            id="sliderNext"
            aria-label="Siguiente"
            onClick={() => irA(slide + 1)}
          >
            &#8250;
          </button>

          {/* Puntos indicadores */}
          <div className="slider-puntos" id="sliderPuntos">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`slider-punto ${idx === slide ? "activo" : ""}`}
                aria-label={`Ir a imagen ${idx + 1}`}
                onClick={() => irA(idx)}
              />
            ))}
          </div>
        </div>

        {/* PARA QUIÉN ES AGRODIRECTO */}
        <div className="titulo-seccion margen-top-32">
          <h2>¿Para quién es AgroDirecto?</h2>
          <p>Dos perfiles, una sola plataforma</p>
        </div>

        <div className="grid-tarjetas">
          <div className="tarjeta tarjeta-marron tarjeta-md">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80"
              alt="Productor agrícola"
              className="miniatura-tarjeta"
            />
            <h3>🌾 Para Productores</h3>
            <p>
              Venda su cosecha antes de cosecharla. Planifique sus finanzas, obtenga el precio justo y lleve trazabilidad completa de sus lotes.
            </p>
            <ul className="lista-tarjeta">
              <li>Registro de lotes y cultivos</li>
              <li>Actualización de estados de cosecha</li>
              <li>Ventas anticipadas con precio fijo</li>
              <li>Reportes de ingresos proyectados</li>
            </ul>
            <div className="margen-top-16">
              <Link to="/registro" className="btn-verde btn-borde">
                Registrarse como productor
              </Link>
            </div>
          </div>

          <div className="tarjeta tarjeta-md">
            <img
              src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=600&q=80"
              alt="Canasta de frutas y verduras frescas"
              className="miniatura-tarjeta"
            />
            <h3>🏪 Para Compradores</h3>
            <p>
              Restaurantes, hoteles y distribuidores: acceda a producto fresco con origen certificado, directo del campo.
            </p>
            <ul className="lista-tarjeta">
              <li>Exploración de lotes disponibles</li>
              <li>Reservas con precio garantizado</li>
              <li>Seguimiento de entregas en tiempo real</li>
              <li>Historial de compras y facturas</li>
            </ul>
            <div className="margen-top-16">
              <Link to="/registro" className="btn-verde">
                Registrarse como comprador
              </Link>
            </div>
          </div>
        </div>

        {/* EL PROBLEMA QUE RESOLVEMOS */}
        <div className="titulo-seccion margen-top-32">
          <h2>El Problema que Resolvemos</h2>
        </div>
        <div className="grid-tarjetas">
          <div className="tarjeta tarjeta-rojo">
            <h3>🔴 Sin AgroDirecto</h3>
            <p>
              La intermediación reduce el margen del productor hasta un <strong>70%</strong>. El agricultor recibe una fracción del precio final.
            </p>
          </div>
          <div className="tarjeta">
            <h3>🟢 Con AgroDirecto</h3>
            <p>
              Conexión directa B2B. El productor fija su precio, el comprador paga justo. La plataforma garantiza transparencia.
            </p>
          </div>
        </div>

        {/* ESTADÍSTICAS EN TIEMPO REAL */}
        <div className="titulo-seccion margen-top-32">
          <h2>Estadísticas en Tiempo Real</h2>
          <p>Conoce el crecimiento y alcance de nuestra red agroalimentaria</p>
        </div>

        <div className="fila-stats fila-stats-landing">
          <div className="stat-tarjeta" data-icono="🌱">
            <div className="stat-numero" id="totalLotes">{stats.lotes}</div>
            <div className="stat-etiqueta">Lotes Activos</div>
          </div>
          <div className="stat-tarjeta stat-azul" data-icono="🏪">
            <div className="stat-numero" id="totalCompradores">{stats.compradores}</div>
            <div className="stat-etiqueta">Compradores Registrados</div>
          </div>
          <div className="stat-tarjeta stat-marron" data-icono="📦">
            <div className="stat-numero" id="totalCategorias">{stats.categorias}</div>
            <div className="stat-etiqueta">Categorías Disponibles</div>
          </div>
          <div className="stat-tarjeta stat-naranja" data-icono="🚚">
            <div className="stat-numero" id="totalProveedores">{stats.proveedores}</div>
            <div className="stat-etiqueta">Proveedores Logísticos</div>
          </div>
        </div>
      </main>
    </>
  );
}
