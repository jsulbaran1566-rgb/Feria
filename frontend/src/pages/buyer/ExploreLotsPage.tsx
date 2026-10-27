import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../context/authContexto";
import { obtenerLotes, obtenerCategorias, crearReserva } from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import type { Categoria, EstadoAlerta, Lote } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function ExploreLotsPage() {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [cosechaDesde, setCosechaDesde] = useState("");
  const [cosechaHasta, setCosechaHasta] = useState("");
  const [radioKm, setRadioKm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal de reserva
  const [loteModal, setLoteModal] = useState<Lote | null>(null);
  const [cantidadReserva, setCantidadReserva] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [modalAlert, setModalAlert] = useState<EstadoAlerta | null>(null);
  const [reservaLoading, setReservaLoading] = useState(false);

  // Feedback general
  const [generalAlert, setGeneralAlert] = useState<EstadoAlerta | null>(null);

  useEffect(() => {
    cargarLotes();
  }, []);

  async function cargarLotes() {
    setLoading(true);
    try {
      const [resLotes, resCats] = await Promise.allSettled([
        obtenerLotes({ estado: "Activo" }),
        obtenerCategorias(),
      ]);
      if (resLotes.status === "fulfilled" && Array.isArray(resLotes.value)) {
        setLotes(resLotes.value);
      }
      if (resCats.status === "fulfilled" && Array.isArray(resCats.value)) {
        setCategorias(resCats.value);
      }
    } finally {
      setLoading(false);
    }
  }

  const abrirModalReserva = (lote: Lote) => {
    setLoteModal(lote);
    setCantidadReserva("");
    setFechaEntrega(lote.fecha_cosecha || "");
    setModalAlert(null);
  };

  const cerrarModalReserva = () => {
    setLoteModal(null);
  };

  const confirmarReserva = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loteModal || !user?.id) return;

    const cant = Number(cantidadReserva);
    const disponible = Number(loteModal.cantidad || 0) - Number(loteModal.kg_reservados || 0);

    if (cant <= 0 || cant > disponible) {
      setModalAlert({
        type: "error",
        message: `Ingrese una cantidad valida. Maximo disponible: ${disponible} kg.`,
      });
      return;
    }

    setReservaLoading(true);
    setModalAlert(null);

    try {
      await crearReserva({
        lote_id: loteModal.id,
        comprador_id: user.id,
        cantidad: cant,
      });

      setModalAlert({ type: "ok", message: "¡Reserva creada con exito!" });
      
      setTimeout(async () => {
        cerrarModalReserva();
        await cargarLotes();
      }, 1200);
    } catch (err) {
      setModalAlert({ type: "error", message: mensajeError(err, "Error al crear la reserva.") });
    } finally {
      setReservaLoading(false);
    }
  };

  const lotesFiltrados = lotes.filter((l) => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q || (l.producto || "").toLowerCase().includes(q) || (l.productor || "").toLowerCase().includes(q);
    const coincideCat = !categoriaSeleccionada || (l.categoria) === categoriaSeleccionada;
    
    const pMin = parseFloat(precioMin);
    const pMax = parseFloat(precioMax);
    const coincidePrecioMin = isNaN(pMin) || l.precio_kg >= pMin;
    const coincidePrecioMax = isNaN(pMax) || l.precio_kg <= pMax;

    const fCosecha = l.fecha_cosecha;
    const coincideDesde = !cosechaDesde || (fCosecha && fCosecha >= cosechaDesde);
    const coincideHasta = !cosechaHasta || (fCosecha && fCosecha <= cosechaHasta);

    return coincideBusqueda && coincideCat && coincidePrecioMin && coincidePrecioMax && coincideDesde && coincideHasta;
  });

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Explorar Lotes Disponibles</h2>
          <p>Busque cultivos disponibles y reserve directamente con el productor.</p>
        </div>
      </div>

      <Alert type={generalAlert?.type} message={generalAlert?.message} onClose={() => setGeneralAlert(null)} />

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Lotes Disponibles</h3>
        </div>
        <div className="barra-filtro">
          <input
            type="text"
            className="campo-input"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="campo-input input-angosto"
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          >
            <option value="">Todas las categorias</option>
            {categorias.map((c) => (
              <option key={c.nombre} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
          <input type="number" className="campo-input input-angosto" placeholder="Precio mín $/kg" min="0" value={precioMin} onChange={e => setPrecioMin(e.target.value)} />
          <input type="number" className="campo-input input-angosto" placeholder="Precio máx $/kg" min="0" value={precioMax} onChange={e => setPrecioMax(e.target.value)} />
          <input type="date" className="campo-input input-angosto" title="Cosecha desde" value={cosechaDesde} onChange={e => setCosechaDesde(e.target.value)} />
          <input type="date" className="campo-input input-angosto" title="Cosecha hasta" value={cosechaHasta} onChange={e => setCosechaHasta(e.target.value)} />
          <select className="campo-input input-angosto" title="Distancia" value={radioKm} onChange={e => setRadioKm(e.target.value)}>
             <option value="">Cualquier distancia</option>
             <option value="20">Hasta 20 km</option>
             <option value="50">Hasta 50 km</option>
          </select>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Productor</th>
              <th>Kg Disponibles</th>
              <th>Categoria</th>
              <th>Cosecha Est.</th>
              <th>Estado</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="celda-vacia">Cargando...</td></tr>
            ) : lotesFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="celda-vacia">Sin lotes disponibles</td></tr>
            ) : (
              lotesFiltrados.map((lote) => {
                const total = Number(lote.cantidad || 0);
                const reservado = Number(lote.kg_reservados || 0);
                const disponible = total - reservado;
                return (
                  <tr key={lote.id}>
                    <td>{lote.producto}</td>
                    <td>{lote.productor || '—'}</td>
                    <td>{disponible.toLocaleString('es-CO')} kg</td>
                    <td>{lote.categoria}</td>
                    <td>{lote.fecha_cosecha || '—'}</td>
                    <td><span className="etiqueta etiqueta-verde">{lote.estado || 'Activo'}</span></td>
                    <td>
                      <button className="btn-tabla btn-editar" onClick={() => abrirModalReserva(lote)}>Reservar</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Reserva */}
      <Modal
        isOpen={!!loteModal}
        onClose={cerrarModalReserva}
        title="Crear Reserva"
      >
        {loteModal && (
          <form onSubmit={confirmarReserva}>
            <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
            
            {loteModal.imagen_url ? (
              <img src={loteModal.imagen_url} alt="Producto" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", marginBottom: "12px" }} />
            ) : null}

            <div className="campo-grupo">
              <label>Producto</label>
              <input type="text" className="campo-input" readOnly value={loteModal.producto} />
            </div>
            
            <div className="campo-grupo">
              <label>Productor</label>
              <input type="text" className="campo-input" readOnly value={loteModal.productor || '—'} />
            </div>

            <div className="campo-grupo">
              <label>Cantidad (kg)</label>
              <input
                type="number"
                className="campo-input"
                placeholder="Ej: 50"
                min="1"
                value={cantidadReserva}
                onChange={(e) => setCantidadReserva(e.target.value)}
                required
              />
            </div>
            
            <div className="campo-grupo">
              <label>Fecha de Entrega Deseada</label>
              <input type="date" className="campo-input" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>

            <div className="fila-botones">
              <button type="submit" className="btn-verde" disabled={reservaLoading}>Confirmar Reserva</button>
              <button type="button" className="btn-verde btn-borde" onClick={cerrarModalReserva}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>

    </>
  );
}
