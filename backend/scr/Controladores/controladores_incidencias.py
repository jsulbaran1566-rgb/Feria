from fastapi import Depends, Query
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_lotes import ErrorLoteNoEncontrado
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok
from Utilidades.ids import siguiente_id
from Esquemas.Esquemas import IncidenciaCrear
from Dependencias.dependencias import requiere_rol
from Controladores.controladores_notificaciones import crear_notificacion


def _serializar_incidencia(i: models.Incidencia) -> dict:
    return {
        "id":          i.id,
        "lote_id":     i.lote_id,
        "producto":    i.lote.producto if i.lote else None,
        "tipo":        i.tipo,
        "descripcion": i.descripcion,
        "fecha":       str(i.fecha),
    }


# ── POST /incidencias ─────────────────────────────────────────────────────────
# RF-14: el Productor dueño del lote reporta un evento negativo (plaga,
# helada, etc.). RF-37: dispara una notificación a cada comprador con
# reserva activa sobre ese lote.

def crear_incidencia(
    datos: IncidenciaCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    lote = db.query(models.Lote).filter(models.Lote.id == datos.lote_id).first()
    if not lote:
        raise ErrorLoteNoEncontrado(datos.lote_id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    nueva = models.Incidencia(
        id=siguiente_id(db, models.Incidencia),
        lote_id=lote.id,
        tipo=datos.tipo,
        descripcion=datos.descripcion,
    )
    db.add(nueva)

    db.add(models.HistorialSeguimiento(
        accion=f"Incidencia reportada: {datos.tipo} — {datos.descripcion}",
        lote=lote.id,
        producto=lote.producto,
    ))

    # RF-37: notificar a cada comprador con reserva activa sobre este lote.
    compradores_activos = (
        db.query(models.Reserva.comprador_id)
        .filter(
            models.Reserva.lote_id == lote.id,
            models.Reserva.estado.in_(["Pendiente", "Confirmada", "Pagada", "En tránsito"]),
        )
        .distinct()
        .all()
    )
    for (comprador_id,) in compradores_activos:
        crear_notificacion(
            db, comprador_id, "AlertaIncidencia",
            f"El productor reportó '{datos.tipo}' en el cultivo '{lote.producto}' que reservaste: {datos.descripcion}",
            entidad_tipo="lote", entidad_id=lote.id,
        )

    db.commit()
    db.refresh(nueva)

    return respuesta_ok(
        message="Incidencia registrada y compradores notificados",
        data=_serializar_incidencia(nueva),
        status_code=201,
    )


# ── GET /incidencias ──────────────────────────────────────────────────────────
# Público, igual que el resto de endpoints de lote (historial, calificaciones)
# — el comprador debe poder ver por qué su cultivo tuvo un problema.

def obtener_incidencias(
    lote_id: int = Query(..., description="Id del lote"),
    db: Session = Depends(get_db),
):
    incidencias = (
        db.query(models.Incidencia)
        .filter(models.Incidencia.lote_id == lote_id)
        .order_by(models.Incidencia.fecha.desc())
        .all()
    )
    return respuesta_ok(
        message="Incidencias obtenidas correctamente",
        data=[_serializar_incidencia(i) for i in incidencias],
    )
