from datetime import datetime, timedelta
from fastapi import Depends
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_notificaciones import ErrorNotificacionNoEncontrada
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok
from Utilidades.ids import siguiente_id
from Utilidades.logger import logger
from Dependencias.dependencias import obtener_usuario_actual


# ── Helper interno — lo usan otros controladores, no es un endpoint ───────────
# (crear_reserva, actualizar_estado_cultivo, crear_pago, etc.)

def crear_notificacion(
    db: Session,
    usuario_id: int,
    tipo: str,
    mensaje: str,
    entidad_tipo: str = None,
    entidad_id: int = None,
) -> None:
    db.add(models.Notificacion(
        id=siguiente_id(db, models.Notificacion),
        usuario_id=usuario_id,
        tipo=tipo,
        mensaje=mensaje,
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
    ))


def _obtener_comprador_relacionado(db: Session, n: models.Notificacion):
    """
    Encuentra el comprador (id y nombre) involucrado en la reserva que
    originó esta notificación, cuando aplica. Se usa para el filtro
    "Comprador" en notificaciones.html — solo tiene sentido para
    notificaciones que le llegan al Productor sobre acciones de SUS
    compradores (ej: "Juan reservó 50kg de Papa"), así que si el comprador
    de la reserva es el mismo usuario que recibe la notificación (o no hay
    una reserva relacionada), no devolvemos nada.
    """
    reserva = None

    if n.entidad_tipo == "reserva" and n.entidad_id:
        reserva = db.query(models.Reserva).filter(models.Reserva.id == n.entidad_id).first()
    elif n.entidad_tipo == "entrega" and n.entidad_id:
        entrega = db.query(models.Entrega).filter(models.Entrega.id == n.entidad_id).first()
        reserva = entrega.reserva if entrega else None
    elif n.entidad_tipo == "pago" and n.entidad_id:
        pago = db.query(models.Pago).filter(models.Pago.id == n.entidad_id).first()
        reserva = pago.reserva if pago else None

    if not reserva or not reserva.comprador:
        return None, None
    if reserva.comprador_id == n.usuario_id:
        # Es el propio comprador viendo su notificación — no hay "otro
        # comprador" con quien haya interactuado, así que no aplica.
        return None, None

    return reserva.comprador_id, reserva.comprador.nombre


def _serializar_notificacion(n: models.Notificacion, db: Session = None) -> dict:
    comprador_id = comprador_nombre = None
    if db is not None:
        comprador_id, comprador_nombre = _obtener_comprador_relacionado(db, n)

    return {
        "id":               n.id,
        "tipo":             n.tipo,
        "mensaje":          n.mensaje,
        "leida":            n.leida,
        "fecha":            n.fecha.isoformat(),
        "entidad_tipo":     n.entidad_tipo,
        "entidad_id":       n.entidad_id,
        # RF: filtro "Comprador con el que he interactuado" — null cuando
        # esta notificación no está asociada a ningún comprador (ej. avisos
        # que recibe el propio comprador sobre su propia reserva).
        "comprador_id":     comprador_id,
        "comprador_nombre": comprador_nombre,
    }


# ── RF-36: recordatorio de entrega próxima ────────────────────────────────────
# No hay scheduler/cron en este proyecto, así que este recordatorio no se
# "dispara" solo en segundo plano. En su lugar, cada vez que un usuario
# consulta sus notificaciones, revisamos si alguna de SUS entregas pendientes
# entra en la ventana de 48h y, si no se le avisó antes, se lo notificamos en
# ese momento (lazy trigger). Es una simplificación honesta del RF-36.

def _generar_recordatorios_entrega(db: Session, usuario_id: int) -> None:
    limite = datetime.now() + timedelta(hours=48)

    entregas_proximas = (
        db.query(models.Entrega)
        .join(models.Reserva, models.Entrega.reserva_id == models.Reserva.id)
        .filter(
            models.Entrega.estado != "Entregada",
            models.Entrega.fecha_estimada != None,  # noqa: E711
            models.Entrega.fecha_estimada <= limite.date(),
        )
        .all()
    )

    for entrega in entregas_proximas:
        reserva = entrega.reserva
        destinatarios = {reserva.comprador_id, reserva.lote.productor_id}
        if usuario_id not in destinatarios:
            continue

        ya_avisado = (
            db.query(models.Notificacion)
            .filter(
                models.Notificacion.usuario_id == usuario_id,
                models.Notificacion.tipo == "RecordatorioEntrega",
                models.Notificacion.entidad_tipo == "entrega",
                models.Notificacion.entidad_id == entrega.id,
            )
            .first()
        )
        if ya_avisado:
            continue

        crear_notificacion(
            db, usuario_id, "RecordatorioEntrega",
            f"La entrega de la reserva #{reserva.id} ({reserva.lote.producto}) está programada para "
            f"el {entrega.fecha_estimada} — menos de 48h.",
            entidad_tipo="entrega", entidad_id=entrega.id,
        )


# ── GET /notificaciones ────────────────────────────────────────────────────────

def obtener_notificaciones(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    try:
        _generar_recordatorios_entrega(db, usuario_actual.id)
        db.commit()
    except Exception:
        # Si el chequeo de recordatorios falla, no debe tumbar la consulta
        # de notificaciones normales — solo lo dejamos en el log.
        db.rollback()
        logger.exception("Fallo generando recordatorios de entrega (RF-36)")

    notificaciones = (
        db.query(models.Notificacion)
        .filter(models.Notificacion.usuario_id == usuario_actual.id)
        .order_by(models.Notificacion.fecha.desc())
        .all()
    )
    no_leidas = sum(1 for n in notificaciones if not n.leida)

    return respuesta_ok(
        message="Notificaciones obtenidas correctamente",
        data={
            "no_leidas": no_leidas,
            "notificaciones": [_serializar_notificacion(n, db) for n in notificaciones],
        },
    )


# ── PUT /notificaciones/{id}/leer ────────────────────────────────────────────

def marcar_notificacion_leida(
    id: int,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    notificacion = db.query(models.Notificacion).filter(models.Notificacion.id == id).first()
    if not notificacion:
        raise ErrorNotificacionNoEncontrada(id)
    if notificacion.usuario_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    notificacion.leida = True
    db.commit()

    return respuesta_ok(message="Notificación marcada como leída", data=_serializar_notificacion(notificacion, db))


# ── PUT /notificaciones/leer-todas ───────────────────────────────────────────

def marcar_todas_leidas(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    db.query(models.Notificacion).filter(
        models.Notificacion.usuario_id == usuario_actual.id,
        models.Notificacion.leida == False,  # noqa: E712
    ).update({"leida": True})
    db.commit()

    return respuesta_ok(message="Todas las notificaciones fueron marcadas como leídas")