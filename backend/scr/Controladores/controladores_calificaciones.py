from fastapi import Depends, Query
from sqlalchemy import func
from Utilidades.ids import siguiente_id
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_calificaciones import (
    ErrorCalificacionYaExiste,
    ErrorReservaNoCalificable,
)
from Excepciones.excepciones_reservas import ErrorReservaNoEncontrada
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok
from Esquemas.Esquemas import CalificacionCrear
from Dependencias.dependencias import requiere_rol



def _serializar_calificacion(c: models.Calificacion) -> dict:
    return {
        "id":           c.id,
        "reserva_id":   c.reserva_id,
        "comprador_id": c.comprador_id,
        "comprador":    c.comprador.nombre if c.comprador else None,
        "productor_id": c.productor_id,
        "estrellas":    c.estrellas,
        "comentario":   c.comentario,
        "fecha":        c.fecha.isoformat() if c.fecha else None,
    }


# ── POST /calificaciones ──────────────────────────────────────────────────────
# El Comprador califica una reserva ya "Entregada", una sola vez. Al calificar,
# la reserva pasa a "Calificada" (fin del ciclo de vida).

def crear_calificacion(
    datos: CalificacionCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Comprador")),
):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == datos.reserva_id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(datos.reserva_id)

    if reserva.comprador_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    if reserva.estado != "Entregada":
        raise ErrorReservaNoCalificable(reserva.estado)

    if db.query(models.Calificacion).filter(models.Calificacion.reserva_id == datos.reserva_id).first():
        raise ErrorCalificacionYaExiste(datos.reserva_id)

    nueva = models.Calificacion(
        id=siguiente_id(db, models.Calificacion),
        reserva_id=reserva.id,
        comprador_id=usuario_actual.id,
        productor_id=reserva.lote.productor_id,
        estrellas=datos.estrellas,
        comentario=datos.comentario,
    )
    db.add(nueva)

    reserva.estado = "Calificada"
    db.add(models.HistorialReserva(reserva_id=reserva.id, estado="Calificada"))

    db.commit()
    db.refresh(nueva)

    return respuesta_ok(
        message="Calificación registrada correctamente",
        data=_serializar_calificacion(nueva),
        status_code=201,
    )


def _resumen_calificaciones(db: Session, productor_id: int) -> dict:
    """
    Calcula el promedio de estrellas, la tasa de cumplimiento de entregas y
    el puntaje compuesto (RF-47) de un productor. Se usa tanto en
    GET /calificaciones como en GET /usuarios/{id}/perfil-publico, para no
    duplicar la lógica en dos controladores.
    """
    promedio = (
        db.query(func.avg(models.Calificacion.estrellas))
        .filter(models.Calificacion.productor_id == productor_id)
        .scalar()
    )
    total = (
        db.query(models.Calificacion)
        .filter(models.Calificacion.productor_id == productor_id)
        .count()
    )

    # Cumplimiento: de las reservas que el productor confirmó (o sea, que se
    # comprometió a vender), ¿cuántas terminaron entregadas/calificadas en
    # vez de quedarse a medias?
    reservas_confirmadas = (
        db.query(models.Reserva)
        .join(models.Lote, models.Reserva.lote_id == models.Lote.id)
        .filter(
            models.Lote.productor_id == productor_id,
            models.Reserva.estado.in_(["Confirmada", "Pagada", "En tránsito", "Entregada", "Calificada"]),
        )
        .count()
    )
    reservas_entregadas = (
        db.query(models.Reserva)
        .join(models.Lote, models.Reserva.lote_id == models.Lote.id)
        .filter(
            models.Lote.productor_id == productor_id,
            models.Reserva.estado.in_(["Entregada", "Calificada"]),
        )
        .count()
    )
    tasa_cumplimiento = (reservas_entregadas / reservas_confirmadas) if reservas_confirmadas else None

    puntaje = None
    if promedio is not None or tasa_cumplimiento is not None:
        calif_normalizada = (float(promedio) / 5 * 100) if promedio is not None else None
        if calif_normalizada is not None and tasa_cumplimiento is not None:
            puntaje = round(0.7 * calif_normalizada + 0.3 * tasa_cumplimiento * 100, 1)
        elif calif_normalizada is not None:
            puntaje = round(calif_normalizada, 1)
        else:
            puntaje = round(tasa_cumplimiento * 100, 1)

    return {
        "promedio": round(float(promedio), 2) if promedio else None,
        "total": total,
        "tasa_cumplimiento": round(tasa_cumplimiento * 100, 1) if tasa_cumplimiento is not None else None,
        "puntaje": puntaje,
    }


# ── GET /calificaciones ───────────────────────────────────────────────────────
# Público: cualquiera puede ver las calificaciones de un productor (reputación).
# RF-47: además del promedio de estrellas, se calcula un "puntaje" compuesto
# que combina calificación (70%) y cumplimiento de entregas (30%) — un
# productor que confirma reservas pero no las entrega no debería verse igual
# de bien que uno que sí cumple, aunque ambos tengan buenas estrellas.

def obtener_calificaciones(
    productor_id: int = Query(..., description="Id del productor"),
    db: Session = Depends(get_db),
):
    calificaciones = (
        db.query(models.Calificacion)
        .filter(models.Calificacion.productor_id == productor_id)
        .order_by(models.Calificacion.fecha.desc())
        .all()
    )

    resumen = _resumen_calificaciones(db, productor_id)

    return respuesta_ok(
        message="Calificaciones obtenidas correctamente",
        data={
            **resumen,
            "calificaciones": [_serializar_calificacion(c) for c in calificaciones],
        },
    )
