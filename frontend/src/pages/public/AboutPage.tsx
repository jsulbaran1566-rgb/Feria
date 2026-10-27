
export default function AboutPage() {
  return (
    <>
      <section id="seccion-hero" className="hero-con-imagen hero-nosotros-img">
        <span className="badge-seccion">&#10022; El Equipo</span>
        <h1>Sobre AgroDirecto</h1>
        <p>Un equipo enfocado en profesionalizar la relación campo-ciudad.</p>
        <p>
          <strong>Integrantes:</strong> Jesús Sulbarán, Valentina Realpe, Danna Menco y Valeria Delgado.
        </p>
      </section>

      <main className="contenido-pagina">
        <div className="titulo-seccion">
          <h2>El Contexto</h2>
          <p>Entendemos el problema desde adentro</p>
        </div>

        <div className="grid-tarjetas">
          <div className="tarjeta tarjeta-md tarjeta-con-foto">
            <img
              src="https://www.ceupe.com/images/easyblog_articles/2484/b2ap3_amp_intermediarios-logsticos-en-el-transporte.jpeg"
              alt="Intermediarios"
              className="foto-tarjeta"
            />
            <h3>🔴 El Problema</h3>
            <p>
              La intermediación reduce el margen del productor hasta en un <strong>70%</strong>. El agricultor recibe una fracción del precio final mientras que los intermediarios capturan la mayor parte del valor.
            </p>
          </div>
          <div className="tarjeta tarjeta-md tarjeta-con-foto">
            <img
              src="https://media.istockphoto.com/id/1901542091/es/foto/tractor-pulverizando-campo-de-cultivos-de-soja.jpg?s=612x612&w=0&k=20&c=EOKR7NRsOrQCZffZv8YRSAaMlsocON95gAhWyU7EQLw="
              alt="Solucion"
              className="foto-tarjeta"
            />
            <h3>🟢 Nuestra Solución</h3>
            <p>
              Una plataforma formal <strong>B2B</strong> que asegura ventas futuras y elimina intermediarios, conectando directamente al productor con restaurantes, hoteles y distribuidores.
            </p>
          </div>
        </div>

        <div className="titulo-seccion margen-top-32">
          <h2>Nuestros Servicios</h2>
          <p>Soluciones integrales diseñadas para optimizar la cadena de suministro agrícola</p>
        </div>

        <div className="grid-tarjetas">
          <div className="tarjeta tarjeta-md tarjeta-con-foto">
            <img
              src="https://www.syngenta.com.co/sites/g/files/kgtney501/files/styles/main_media_large/public/media/image/2017/12/15/14dic_mitos_700x400.jpg?itok=wFzz4N83"
              alt="Comercializacion"
              className="foto-tarjeta"
            />
            <h3>🌾 Comercialización Anticipada</h3>
            <p>
              Permitimos la negociación y venta previa de cosechas de manera directa, garantizando estabilidad en los precios y reduciendo la incertidumbre para el productor.
            </p>
          </div>
          <div className="tarjeta tarjeta-md tarjeta-con-foto">
            <img
              src="https://img.magnific.com/foto-gratis/estilo-vida-personas-ecologicas_23-2149125222.jpg?semt=ais_hybrid&w=740&q=80"
              alt="Logistica"
              className="foto-tarjeta"
            />
            <h3>🚚 Conexión Logística</h3>
            <p>
              Facilitamos el enlace directo con proveedores de transporte calificados para coordinar el traslado seguro y eficiente de los productos agrícolas desde el origen.
            </p>
          </div>
          <div className="tarjeta tarjeta-md tarjeta-con-foto">
            <img
              src="https://afincamundorural.com/wp-content/uploads/2025/12/Trazabilidad-con-Blockchain-en-el-Sector-Agroalimentario-Garantizando-la-Calida.webp"
              alt="Trazabilidad"
              className="foto-tarjeta"
            />
            <h3>🔍 Trazabilidad de Lotes</h3>
            <p>
              Ofrecemos herramientas digitales avanzadas para registrar, monitorear y certificar el origen y estado de los cultivos, aportando total transparencia al comprador.
            </p>
          </div>
        </div>

        <div className="titulo-seccion margen-top-32">
          <h2>El Equipo</h2>
          <p>Las personas detrás del proyecto</p>
        </div>

        <div className="grid-tarjetas">
          <div className="tarjeta texto-centrado tarjeta-xs">
            <div className="icono-equipo" style={{ fontSize: "2rem" }}>👨‍💻</div>
            <h3>Jesús Sulbarán</h3>
            <p>Desarrollo y Arquitectura</p>
          </div>
          <div className="tarjeta texto-centrado tarjeta-xs">
            <div className="icono-equipo" style={{ fontSize: "2rem" }}>🎨</div>
            <h3>Valentina Realpe</h3>
            <p>Diseño y UX</p>
          </div>
          <div className="tarjeta texto-centrado tarjeta-xs">
            <div className="icono-equipo" style={{ fontSize: "2rem" }}>📊</div>
            <h3>Danna Menco</h3>
            <p>Producto y Negocio</p>
          </div>
          <div className="tarjeta texto-centrado tarjeta-xs">
            <div className="icono-equipo" style={{ fontSize: "2rem" }}>🔬</div>
            <h3>Valeria Delgado</h3>
            <p>Investigación y Datos</p>
          </div>
        </div>
      </main>
    </>
  );
}
