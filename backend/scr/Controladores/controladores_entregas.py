import random
from fastapi import Depends, Query
from datetime import date, datetime
from Utilidades.ids import siguiente_id
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_entregas import (
    ErrorEntregaNoEncontrada,
    ErrorReservaNoEnviable,
    ErrorEntregaYaExiste,
    ErrorCodigoConfirmacionInvalido,
)
from Excepciones.excepciones_reservas import ErrorReservaNoEncontrada
from Excepciones.excepciones_auth import ErrorNoAutorizado
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Esquemas.Esquemas import EntregaCrear, EntregaActualizar, UbicacionActualizar
from Dependencias.dependencias import requiere_rol, obtener_usuario_actual



def _generar_codigo() -> str:
    return str(random.randint(100000, 999999))


def _serializar_entrega(e: models.Entrega, incluir_codigo: bool = False) -> dict:
    data = {
        "id":              e.id,
        "reserva_id":      e.reserva_id,
        "medio":           e.medio,
        "estado":          e.estado,
        "fecha_estimada":  e.fecha_estimada.isoformat() if e.fecha_estimada else None,
        "fecha_real":      e.fecha_real.isoformat() if e.fecha_real else None,
        "latitud_actual":  float(e.latitud_actual) if e.latitud_actual is not None else None,
        "longitud_actual": float(e.longitud_actual) if e.longitud_actual is not None else None,
        "ubicacion_actualizada": e.ubicacion_actualizada.isoformat() if e.ubicacion_actualizada else None,
    }
    if incluir_codigo:
        data["codigo_confirmacion"] = e.codigo_confirmacion
    return data


# ── POST /entregas ────────────────────────────────────────────────────────────
# El Productor despacha una reserva "Pagada": genera un código de confirmación
# de 6 dígitos que debe entregarle al comprador para que este confirme la
# recepción. La reserva pasa a "En tránsito".

def crear_entrega(
    datos: EntregaCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == datos.reserva_id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(datos.reserva_id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and reserva.lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    if db.query(models.Entrega).filter(models.Entrega.reserva_id == datos.reserva_id).first():
        raise ErrorEntregaYaExiste(datos.reserva_id)

    if reserva.estado != "Pagada":
        raise ErrorReservaNoEnviable(reserva.estado)

    nueva = models.Entrega(
        id=siguiente_id(db, models.Entrega),
        reserva_id=reserva.id,
        medio=datos.medio,
        codigo_confirmacion=_generar_codigo(),
        estado="En tránsito",
        fecha_estimada=datos.fecha_estimada,
    )
    db.add(nueva)

    reserva.estado = "En tránsito"
    db.add(models.HistorialReserva(reserva_id=reserva.id, estado="En tránsito"))

    db.commit()
    db.refresh(nueva)

    return respuesta_ok(
        message="Entrega registrada. Comparte el código de confirmación con el comprador.",
        data=_serializar_entrega(nueva, incluir_codigo=True),
        status_code=201,
    )


# ── PUT /entregas/{id} ────────────────────────────────────────────────────────
# El Comprador confirma la recepción mandando el código; el Productor puede
# actualizar el estado (p. ej. reintentar envío).

def actualizar_entrega(
    id: int,
    datos: EntregaActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    entrega = db.query(models.Entrega).filter(models.Entrega.id == id).first()
    if not entrega:
        raise ErrorEntregaNoEncontrada(id)

    reserva = entrega.reserva
    rol = usuario_actual.rol_rel.nombre if usuario_actual.rol_rel else None

    if rol == "Comprador":
        if reserva.comprador_id != usuario_actual.id:
            raise ErrorNoAutorizado(["Administrador"])
        if not datos.codigo_confirmacion:
            raise ErrorNoAutorizado(["Productor", "Administrador"])
        if datos.codigo_confirmacion != entrega.codigo_confirmacion:
            raise ErrorCodigoConfirmacionInvalido()
        entrega.estado = "Entregada"
        entrega.fecha_real = date.today()
        reserva.estado = "Entregada"
    elif rol == "Productor":
        if reserva.lote.productor_id != usuario_actual.id:
            raise ErrorNoAutorizado(["Administrador"])
        if datos.estado is not None:
            entrega.estado = datos.estado
    elif rol != "Administrador":
        raise ErrorNoAutorizado(["Productor", "Comprador", "Administrador"])
    else:
        if datos.estado is not None:
            entrega.estado = datos.estado
        if datos.codigo_confirmacion and datos.codigo_confirmacion == entrega.codigo_confirmacion:
            entrega.estado = "Entregada"
            entrega.fecha_real = date.today()
            reserva.estado = "Entregada"

    if reserva.estado == "Entregada":
        db.add(models.HistorialReserva(reserva_id=reserva.id, estado="Entregada"))

    db.commit()
    db.refresh(entrega)

    return respuesta_ok(
        message="Entrega actualizada correctamente",
        data=_serializar_entrega(entrega),
    )


# ── GET /entregas ─────────────────────────────────────────────────────────────

def obtener_entregas(
    reserva_id: int = Query(..., description="Id de la reserva"),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == reserva_id).first()
    if not reserva:
        raise ErrorReservaNoEncontrada(reserva_id)

    rol = usuario_actual.rol_rel.nombre if usuario_actual.rol_rel else None
    es_dueño = (
        (rol == "Comprador" and reserva.comprador_id == usuario_actual.id)
        or (rol == "Productor" and reserva.lote.productor_id == usuario_actual.id)
    )
    if rol != "Administrador" and not es_dueño:
        raise ErrorNoAutorizado(["Administrador"])

    entregas = db.query(models.Entrega).filter(models.Entrega.reserva_id == reserva_id).all()

    # El código de confirmación solo se expone al comprador (quien lo debe dar
    # al mensajero) y al administrador — el productor no debería necesitarlo.
    incluir_codigo = rol in ("Comprador", "Administrador")

    return respuesta_ok(
        message="Entregas obtenidas correctamente",
        data=[_serializar_entrega(e, incluir_codigo=incluir_codigo) for e in entregas],
    )


# ── PUT /entregas/{id}/ubicacion ──────────────────────────────────────────────
# RF-32: el Productor (dueño) reporta manualmente dónde va el envío mientras
# está "En tránsito". No hay integración con transportista real — el propio
# RF lo contempla ("...si el transportista tiene API de tracking"), así que
# esta es la alternativa honesta cuando no la hay.

def actualizar_ubicacion_entrega(
    id: int,
    datos: UbicacionActualizar,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(requiere_rol("Productor", "Administrador")),
):
    entrega = db.query(models.Entrega).filter(models.Entrega.id == id).first()
    if not entrega:
        raise ErrorEntregaNoEncontrada(id)

    es_admin = usuario_actual.rol_rel and usuario_actual.rol_rel.nombre == "Administrador"
    if not es_admin and entrega.reserva.lote.productor_id != usuario_actual.id:
        raise ErrorNoAutorizado(["Administrador"])

    if entrega.estado != "En tránsito":
        return respuesta_error(
            f"Solo se puede actualizar la ubicación de un envío 'En tránsito' (estado actual: '{entrega.estado}').",
            status_code=409,
        )

    entrega.latitud_actual = datos.latitud
    entrega.longitud_actual = datos.longitud
    entrega.ubicacion_actualizada = datetime.now()
    db.commit()
    db.refresh(entrega)

    return respuesta_ok(
        message="Ubicación del envío actualizada correctamente",
        data=_serializar_entrega(entrega),
    )
