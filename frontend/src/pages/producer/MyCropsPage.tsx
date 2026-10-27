import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../context/authContexto";
import {
  obtenerLotes,
  obtenerCategorias,
  registrarLote,
  editarLoteApi,
  eliminarLoteApi,
  actualizarEstadoCultivo,
  crearIncidencia,
} from "../../services/api";
import Modal from "../../components/common/Modal";
import Alert from "../../components/common/Alert";
import { useDialogos } from "../../context/dialogosContexto";
import type { Categoria, EstadoAlerta, Lote } from "../../types";
import { mensajeError } from "../../utils/errores";

export default function MyCropsPage() {
  const { confirmar, avisar } = useDialogos();
  const { user } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [misLotesFiltrados, setMisLotesFiltrados] = useState<Lote[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState<EstadoAlerta | null>(null);

  // Pagination
  const POR_PAGINA = 5;
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtro
  const [filtroCultivo, setFiltroCultivo] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIncidenciaOpen, setModalIncidenciaOpen] = useState(false);

  // Lote form
  const [loteEditando, setLoteEditando] = useState<Lote | null>(null);
  const [formData, setFormData] = useState({
    nombre_producto: "",
    cantidad_total_kg: "",
    categoria: "",
    fecha_cosecha_estimada: "",
    precio_kg: "",
    anticipo_porcentaje: "",
    horas_limite_pago: "",
    foto_url: "",
    estado: "Activo"
  });

  // Incidencia form
  const [incidenciaData, setIncidenciaData] = useState({
    lote_id: null as number | null,
    tipo: "Plaga",
    descripcion: ""
  });

  const [modalAlert, setModalAlert] = useState<EstadoAlerta | null>(null);
  const [incidenciaAlert, setIncidenciaAlert] = useState<EstadoAlerta | null>(null);
  const [saving, setSaving] = useState(false);

  const CICLO_CULTIVO = ['Siembra', 'Crecimiento', 'Listo', 'Cosechado'];

  const cargarLotes = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [resLotes, resCats] = await Promise.allSettled([
        obtenerLotes({ productor_id: user.id }),
        obtenerCategorias(),
      ]);

      if (resCats.status === "fulfilled" && Array.isArray(resCats.value)) {
        setCategorias(resCats.value);
        if (resCats.value.length > 0) {
          setFormData((prev) =>
            prev.categoria ? prev : { ...prev, categoria: resCats.value[0].nombre }
          );
        }
      }

      if (resLotes.status === "fulfilled" && Array.isArray(resLotes.value)) {
        const lotesUsuario = resLotes.value.filter((l) => String(l.productor_id) === String(user.id));
        setLotes(lotesUsuario);
        setMisLotesFiltrados(lotesUsuario);
      }
    } catch (err) {
      setAlertMsg({ type: "error", message: mensajeError(err, "Error al cargar cultivos.") });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  const irPagina = (pagina: number) => {
    const totalPaginas = Math.max(1, Math.ceil(misLotesFiltrados.length / POR_PAGINA));
    setPaginaActual(Math.min(Math.max(1, pagina), totalPaginas));
  };

  const filtrarLotes = () => {
    const q = filtroCultivo.toLowerCase();
    const filtrados = lotes.filter((l) =>
      !q || (l.producto || "").toLowerCase().includes(q)
    );
    setMisLotesFiltrados(filtrados);
    setPaginaActual(1);
  };

  const avanzarEstadoCultivo = async (loteId: number, nuevoEstado: string) => {
    if (!(await confirmar(`¿Marcar este cultivo como "${nuevoEstado}"? Esta acción queda registrada en el historial de trazabilidad.`))) return;
    try {
      await actualizarEstadoCultivo(loteId, nuevoEstado);
      await cargarLotes();
      setAlertMsg({ type: "ok", message: `Estado actualizado a ${nuevoEstado}` });
    } catch (e) {
      setAlertMsg({ type: "error", message: 'No se pudo actualizar el estado del cultivo: ' + (mensajeError(e, 'Error desconocido')) });
    }
  };

  const abrirModalIncidencia = (loteId: number) => {
    setIncidenciaData({
      lote_id: loteId,
      tipo: "Plaga",
      descripcion: ""
    });
    setIncidenciaAlert(null);
    setModalIncidenciaOpen(true);
  };

  const enviarIncidencia = async () => {
    if (incidenciaData.lote_id === null) return;
    if (!incidenciaData.descripcion.trim()) {
      setIncidenciaAlert({ type: "error", message: "Describe qué pasó." });
      return;
    }
    try {
      await crearIncidencia({
        lote_id: incidenciaData.lote_id,
        tipo: incidenciaData.tipo,
        descripcion: incidenciaData.descripcion.trim(),
      });
      setIncidenciaAlert({ type: "ok", message: "¡Incidencia reportada! Se notificó a los compradores." });
      setTimeout(() => setModalIncidenciaOpen(false), 1200);
    } catch (e) {
      setIncidenciaAlert({ type: "error", message: 'No se pudo reportar: ' + (mensajeError(e, 'Error desconocido')) });
    }
  };

  const abrirModal = (lote: Lote | null = null) => {
    setLoteEditando(lote);
    if (lote) {
      setFormData({
        nombre_producto: lote.producto || "",
        cantidad_total_kg: lote.cantidad != null ? String(lote.cantidad) : "",
        categoria: lote.categoria || categorias[0]?.nombre || "",
        fecha_cosecha_estimada: lote.fecha_cosecha || "",
        precio_kg: lote.precio_kg != null ? String(lote.precio_kg) : "",
        anticipo_porcentaje: lote.anticipo_pct != null ? String(lote.anticipo_pct) : "",
        horas_limite_pago: lote.horas_limite_pago != null ? String(lote.horas_limite_pago) : "",
        foto_url: lote.imagen_url || "",
        estado: lote.estado || "Activo"
      });
    } else {
      setFormData({
        nombre_producto: "",
        cantidad_total_kg: "",
        categoria: categorias[0]?.nombre || "",
        fecha_cosecha_estimada: "",
        precio_kg: "",
        anticipo_porcentaje: "",
        horas_limite_pago: "",
        foto_url: "",
        estado: "Activo"
      });
    }
    setModalAlert(null);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
  };

  const guardarLote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setModalAlert(null);

    if (!user) {
      setSaving(false);
      return;
    }

    const cantidad = Number(formData.cantidad_total_kg);
    const anticipo = formData.anticipo_porcentaje ? Number(formData.anticipo_porcentaje) : null;
    const horasLimite = formData.horas_limite_pago ? Number(formData.horas_limite_pago) : null;

    if (!formData.nombre_producto.trim() || cantidad < 1) {
      setModalAlert({ type: "error", message: "Producto y cantidad son obligatorios." });
      setSaving(false);
      return;
    }

    if (horasLimite && !anticipo) {
      setModalAlert({ type: "error", message: "Para poner un plazo límite de pago, primero define el % de anticipo." });
      setSaving(false);
      return;
    }

    // Campos que acepta el backend (LoteCrear / LoteEditar)
    const datos = {
      producto: formData.nombre_producto.trim(),
      cantidad,
      categoria: formData.categoria,
      estado: formData.estado,
      fecha_cosecha: formData.fecha_cosecha_estimada || null,
      precio_kg: formData.precio_kg ? Number(formData.precio_kg) : null,
      imagen_url: formData.foto_url || null,
      anticipo_pct: anticipo,
      horas_limite_pago: horasLimite,
    };

    try {
      if (loteEditando) {
        await editarLoteApi(loteEditando.id, datos);
        setAlertMsg({ type: "ok", message: "Lote actualizado exitosamente." });
      } else {
        await registrarLote({ ...datos, productor_id: user.id });
        setAlertMsg({ type: "ok", message: "Lote creado exitosamente." });
      }

      cerrarModal();
      cargarLotes();
    } catch (err) {
      setModalAlert({ type: "error", message: mensajeError(err, "Error al guardar el cultivo.") });
    } finally {
      setSaving(false);
    }
  };

  const eliminarLote = async (id: number) => {
    if (!(await confirmar("¿Eliminar este lote?"))) return;
    try {
      const resultado = (await eliminarLoteApi(id)) as { eliminado?: boolean } | null;
      if (resultado && resultado.eliminado === false) {
        await avisar('Este lote ya tiene reservas asociadas, así que no se puede borrar sin perder ese historial. Se ocultó del marketplace en su lugar (estado Inactivo).');
      } else {
        setAlertMsg({ type: "ok", message: "Lote eliminado correctamente." });
      }
      cargarLotes();
    } catch (err) {
      await avisar('Error al eliminar el lote: ' + (mensajeError(err, 'Error desconocido')));
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(misLotesFiltrados.length / POR_PAGINA));
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const pagina = misLotesFiltrados.slice(inicio, inicio + POR_PAGINA);

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Mis Cultivos</h2>
          <p>Registre nuevos lotes indicando cantidad (kg), categoria y fecha de cosecha.</p>
        </div>
        <button type="button" className="btn-verde" onClick={() => abrirModal()}>
          + Nuevo Lote
        </button>
      </div>

      <Alert type={alertMsg?.type} message={alertMsg?.message} onClose={() => setAlertMsg(null)} />

      <div className="margen-top-32">
        <div className="fila-titulo-panel">
          <h3 className="titulo-panel">Mis Lotes / Cultivos</h3>
        </div>
        
        <div className="barra-filtro">
          <input 
            type="text" 
            id="filtro-cultivo" 
            className="campo-input" 
            placeholder="Buscar cultivo..."
            value={filtroCultivo}
            onChange={(e) => setFiltroCultivo(e.target.value)}
          />
          <button className="btn-verde btn-borde" onClick={filtrarLotes}>Filtrar</button>
        </div>

        <table className="tabla-datos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cultivo</th>
              <th>Kg Totales</th>
              <th>Kg Reservados</th>
              <th>Ingreso Proyectado</th>
              <th>Categoria</th>
              <th>Fecha Cosecha</th>
              <th>Cultivo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="celda-vacia">Cargando...</td></tr>
            ) : pagina.length === 0 ? (
              <tr><td colSpan={10} className="celda-vacia">Sin lotes registrados</td></tr>
            ) : (
              pagina.map((lote) => {
                const indice = CICLO_CULTIVO.indexOf(lote.estado_cultivo || 'Siembra');
                const siguiente = CICLO_CULTIVO[indice + 1];
                const reservado = Number(lote.kg_reservados || 0);
                const total = Number(lote.cantidad || 0);
                const ingreso_proyectado = lote.ingreso_proyectado_total != null ? lote.ingreso_proyectado_total : null;
                const catName = lote.categoria || "N/A";
                const estadoLote = lote.estado || 'Activo';

                return (
                  <tr key={lote.id}>
                    <td>{lote.id}</td>
                    <td>{lote.producto}</td>
                    <td>{total.toLocaleString('es-CO')} kg</td>
                    <td>{reservado} kg</td>
                    <td>{ingreso_proyectado != null ? `$${ingreso_proyectado.toLocaleString('es-CO')}` : '—'}</td>
                    <td>{catName}</td>
                    <td>{lote.fecha_cosecha || '—'}</td>
                    <td><span className="etiqueta etiqueta-azul">{lote.estado_cultivo || 'Siembra'}</span></td>
                    <td><span className={`etiqueta ${estadoLote === 'Activo' ? 'etiqueta-verde' : 'etiqueta-gris'}`}>{estadoLote}</span></td>
                    <td>
                      <div className="acciones-tabla">
                        {siguiente && (
                          <button 
                            className="btn-tabla btn-editar" 
                            onClick={() => avanzarEstadoCultivo(lote.id, siguiente)} 
                            title={`Marcar como '${siguiente}'`}
                          >
                            → {siguiente}
                          </button>
                        )}
                        <button className="btn-tabla btn-editar" onClick={() => abrirModalIncidencia(lote.id)} title="Reportar plaga/helada/etc.">⚠️</button>
                        <button className="btn-tabla btn-editar" onClick={() => abrirModal(lote)}>Editar</button>
                        <button className="btn-tabla btn-eliminar" onClick={() => eliminarLote(lote.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {misLotesFiltrados.length > 0 && (
          <div className="paginacion" id="paginacion-lotes" style={{display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginTop: '16px'}}>
            <button className="btn-verde btn-borde" onClick={() => irPagina(paginaActual - 1)} disabled={paginaActual <= 1}>← Anterior</button>
            <span id="texto-pagina">Página {paginaActual} de {totalPaginas}</span>
            <button className="btn-verde btn-borde" onClick={() => irPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas}>Siguiente →</button>
          </div>
        )}
      </div>

      {/* MODAL NUEVO/EDITAR LOTE */}
      <Modal
        isOpen={modalOpen}
        onClose={cerrarModal}
        title={loteEditando ? "Editar Lote" : "Nuevo Lote"}
        maxWidth="640px"
      >
        <form onSubmit={guardarLote}>
          <Alert type={modalAlert?.type} message={modalAlert?.message} onClose={() => setModalAlert(null)} />
          
          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Producto / Cultivo</label>
              <input
                type="text"
                className="campo-input"
                placeholder="Ej: Tomate Chonto"
                value={formData.nombre_producto}
                onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
              />
            </div>
            <div className="campo-grupo">
              <label>Cantidad (kg)</label>
              <input
                type="number"
                className="campo-input"
                placeholder="Ej: 2000"
                min="1"
                value={formData.cantidad_total_kg}
                onChange={(e) => setFormData({ ...formData, cantidad_total_kg: e.target.value })}
              />
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Categoria</label>
              <select
                className="campo-input"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                {categorias.length > 0 ? categorias.map((c) => (
                  <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                )) : (
                  <>
                    <option value="Hortaliza">Hortaliza</option>
                    <option value="Fruta">Fruta</option>
                    <option value="Tuberculo">Tuberculo</option>
                    <option value="Cereal">Cereal</option>
                    <option value="Leguminosa">Leguminosa</option>
                  </>
                )}
              </select>
            </div>
            <div className="campo-grupo">
              <label>Fecha Estimada de Cosecha</label>
              <input
                type="date"
                className="campo-input"
                value={formData.fecha_cosecha_estimada}
                onChange={(e) => setFormData({ ...formData, fecha_cosecha_estimada: e.target.value })}
              />
            </div>
          </div>

          <div className="fila-campos">
            <div className="campo-grupo">
              <label>Precio por kg</label>
              <input
                type="number"
                className="campo-input"
                placeholder="Ej: 2800"
                min="0"
                step="0.01"
                value={formData.precio_kg}
                onChange={(e) => setFormData({ ...formData, precio_kg: e.target.value })}
              />
            </div>
            <div className="campo-grupo">
              <label>Anticipo (%) — opcional</label>
              <input
                type="number"
                className="campo-input"
                placeholder="Ej: 30 (vacío = sin anticipo)"
                min="1"
                max="99"
                value={formData.anticipo_porcentaje}
                onChange={(e) => setFormData({ ...formData, anticipo_porcentaje: e.target.value })}
              />
            </div>
          </div>

          <div className="campo-grupo">
            <label>Plazo límite para pagar el anticipo (horas) — opcional, requiere anticipo</label>
            <input
              type="number"
              className="campo-input"
              placeholder="Ej: 24 (vacío = sin plazo)"
              min="1"
              value={formData.horas_limite_pago}
              onChange={(e) => setFormData({ ...formData, horas_limite_pago: e.target.value })}
            />
            <p className="texto-secundario" style={{marginTop: '4px'}}>Si lo defines, el comprador tiene ese tiempo desde que reserva para pagar el anticipo — si no paga, la reserva se cancela sola y el cupo se libera.</p>
          </div>

          <div className="campo-grupo">
            <label>Imagen del lote (URL) — opcional</label>
            <input
              type="text"
              className="campo-input"
              placeholder="https://..."
              value={formData.foto_url}
              onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
            />
          </div>

          <div className="campo-grupo">
            <label>Estado</label>
            <select
              className="campo-input"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="fila-botones" style={{marginTop: '20px'}}>
            <button type="submit" className="btn-verde" disabled={saving}>Guardar</button>
            <button type="button" className="btn-verde btn-borde" onClick={cerrarModal}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* MODAL INCIDENCIA */}
      <Modal
        isOpen={modalIncidenciaOpen}
        onClose={() => setModalIncidenciaOpen(false)}
        title="⚠️ Reportar Incidencia"
      >
        <p className="texto-secundario">Se notificará automáticamente a los compradores con reserva activa sobre este cultivo.</p>
        <div className="campo-grupo margen-top-16">
          <label>Tipo</label>
          <select 
            className="campo-input"
            value={incidenciaData.tipo}
            onChange={(e) => setIncidenciaData({...incidenciaData, tipo: e.target.value})}
          >
            <option value="Plaga">Plaga</option>
            <option value="Helada">Helada</option>
            <option value="Sequía">Sequía</option>
            <option value="Inundación">Inundación</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="campo-grupo">
          <label>Descripción</label>
          <textarea 
            className="campo-input" 
            rows={3} 
            placeholder="Qué pasó y cómo afecta el cultivo..."
            value={incidenciaData.descripcion}
            onChange={(e) => setIncidenciaData({...incidenciaData, descripcion: e.target.value})}
          />
        </div>
        <Alert type={incidenciaAlert?.type} message={incidenciaAlert?.message} onClose={() => setIncidenciaAlert(null)} />
        <div className="fila-botones margen-top-16">
          <button className="btn-verde" onClick={enviarIncidencia}>Reportar y Notificar</button>
          <button className="btn-verde btn-borde" onClick={() => setModalIncidenciaOpen(false)}>Cancelar</button>
        </div>
      </Modal>
    </>
  );
}
