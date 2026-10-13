from fastapi import Depends, Query, Request, Header
from sqlalchemy.orm import Session

from datetime import datetime, timedelta

import hashlib
import hmac
import os

from Conexion.database import get_db
import Modelos.models as models

from Utilidades.ids import siguiente_id
from Utilidades.respuesta import respuesta_ok, respuesta_error

from Controladores.controladores_notificaciones import crear_notificacion
from Controladores.controladores_configuracion import obtener_configuracion

from Excepciones.excepciones_pagos import (
    ErrorPagoNoEncontrado,
    ErrorReservaNoPagable,
)
from Excepciones.excepciones_reservas import ErrorReservaNoEncontrada
from Excepciones.excepciones_auth import ErrorNoAutorizado

from Esquemas.Esquemas import PagoCrear, PagoWebhook

from Dependencias.dependencias import (
    requiere_rol,
    obtener_usuario_actual,
)


def _serializar_pago(p: models.Pago) -> dict:
    return {
        "id": p.id,
        "reserva_id": p.reserva_id,
        "subtotal": float(p.subtotal),
        "costo_envio": float(p.costo_envio),
        "monto": float(p.monto),
        "estado": p.estado,
        "tipo": p.tipo,
        "referencia_ext": p.referencia_ext,
        "metodo": p.metodo,
        "fecha": p.fecha.isoformat() if p.fecha else None,

        # RF-46
        "comision_pct": p.comision_pct,
        "comision_monto": float(p.comision_monto),
        "monto_neto": float(p.monto_neto),
    }


def _calcular_totales_reserva(
    reserva: models.Reserva,
) -> dict:
    """
    Calcula el subtotal y el costo de envío de una reserva completa.

    El costo de envío se calcula una sola vez sobre el subtotal total,
    para evitar cobrarlo nuevamente cuando el comprador realiza pagos
    parciales.

    RF-27: el envío se cobra completo en el primer abono.
    """

    precio_kg = reserva.lote.precio_kg or 0

    subtotal = round(
        float(precio_kg) * reserva.cantidad,
        2,
    )

    if subtotal <= 0:
        subtotal = 0.01

    # Costo de envío simplificado.
    # Se calcula como 5% del subtotal con mínimo de $3.00.
    costo_envio = max(
        round(subtotal * 0.05, 2),
        3.00,
    )

    return {
        "subtotal": subtotal,
        "costo_envio": costo_envio,
        "total": round(
            subtotal + costo_envio,
            2,
        ),
    }


def _monto_pagado(
    db: Session,
    reserva_id: int,
) -> float:
    """
    Obtiene la suma de todos los pagos aprobados
    asociados a una reserva.
    """

    pagos_aprobados = (
        db.query(models.Pago)
        .filter(
            models.Pago.reserva_id == reserva_id,
            models.Pago.estado == "Aprobado",
        )
        .all()
    )

    return round(
        sum(
            float(p.monto)
            for p in pagos_aprobados
        ),
        2,
    )


def _validar_monto_pago(
    datos_monto,
    reserva: models.Reserva,
    totales: dict,
    pagado_hasta_ahora: float,
    pendiente: float,
):
    """
    RF-27.

    El anticipo es configurado por el productor mediante
    Lote.anticipo_pct.

    Solo se permiten:

    1. Pagar todo el saldo pendiente.
    2. Realizar el anticipo exacto configurado.

    Si no existe anticipo configurado, no se permiten pagos
    parciales.
    """

    # Si no se especifica monto o se paga exactamente todo
    # lo pendiente, el pago es válido.
    if (
        datos_monto is None
        or round(datos_monto, 2) == pendiente
    ):
        return None

    # El lote no tiene anticipo configurado.
    if reserva.lote.anticipo_pct is None:
        return (
            "Este lote no tiene anticipo configurado por "
            "el productor — solo se puede pagar el total."
        )

    # Ya existe un pago aprobado.
    if pagado_hasta_ahora > 0:
        return (
            "Ya se pagó el anticipo de esta reserva. "
            f"El siguiente pago debe ser el saldo completo: "
            f"${pendiente:,.2f}."
        )

    monto_anticipo_esperado = round(
        totales["total"]
        * reserva.lote.anticipo_pct
        / 100,
        2,
    )

    if round(datos_monto, 2) != monto_anticipo_esperado:
        return (
            f"El anticipo configurado por el productor es "
            f"{reserva.lote.anticipo_pct}% "
            f"(${monto_anticipo_esperado:,.2f}). "
            f"Envía ese monto exacto, o el total "
            f"(${pendiente:,.2f})."
        )

    return None


def _distribuir_monto_pago(
    monto: float,
    pagado_hasta_ahora: float,
    totales: dict,
) -> tuple:
    """
    Distribuye el monto del pago entre producto y envío.

    El costo de envío se cobra completamente en el primer pago.
    Los siguientes pagos corresponden solamente al producto.
    """

    envio_ya_cobrado = (
        pagado_hasta_ahora
        >= totales["costo_envio"]
    )

    if envio_ya_cobrado:
        return monto, 0.0

    costo_envio_este_pago = min(
        monto,
        totales["costo_envio"],
    )

    return (
        round(
            monto - costo_envio_este_pago,
            2,
        ),
        costo_envio_este_pago,
    )


def _tipo_de_pago(
    monto: float,
    pagado_hasta_ahora: float,
    total: float,
) -> str:
    """
    Clasifica el pago como:

    - Completo
    - Anticipo
    - Saldo
    """

    es_pago_total = (
        round(
            pagado_hasta_ahora + monto,
            2,
        )
        >= total
    )

    if pagado_hasta_ahora > 0:
        return "Saldo"

    return (
        "Completo"
        if es_pago_total
        else "Anticipo"
    )


# ============================================================
# HELPERS RF-23 / RF-24
# ============================================================

WEBHOOK_SECRET = os.getenv(
    "PAGOS_WEBHOOK_SECRET",
    "agro-directo-webhook-demo",
)


def _firma_webhook_valida(
    payload_bytes: bytes,
    firma: str | None,
) -> bool:
    """
    Verifica la firma HMAC-SHA256 enviada por la pasarela
    de pagos.
    """

    if not firma:
        return False

    esperada = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    firma_limpia = (
        firma
        .removeprefix("sha256=")
        .strip()
    )

    return hmac.compare_digest(
        esperada,
        firma_limpia,
    )


def _fecha_limite_reintento(
    db: Session,
    reserva_id: int,
) -> datetime | None:
    """
    RF-24.

    El primer pago rechazado abre una ventana de
    24 horas para volver a intentar el pago.

    Se toma el primer rechazo y no el último para evitar
    que cada intento reinicie artificialmente el plazo.
    """

    primer_rechazo = (
        db.query(models.Pago)
        .filter(
            models.Pago.reserva_id == reserva_id,
            models.Pago.estado == "Rechazado",
        )
        .order_by(
            models.Pago.fecha.asc()
        )
        .first()
    )

    if (
        not primer_rechazo
        or not primer_rechazo.fecha
    ):
        return None

    return primer_rechazo.fecha + timedelta(
        hours=24
    )


def _reserva_pagada_si_corresponde(
    db: Session,
    reserva: models.Reserva,
) -> bool:
    """
    Comprueba si la suma de los pagos aprobados cubre
    completamente el valor de la reserva.

    Si está completamente pagada, cambia su estado a Pagada.
    """

    totales = _calcular_totales_reserva(
        reserva
    )

    pagado = _monto_pagado(
        db,
        reserva.id,
    )

    if round(pagado, 2) < round(
        totales["total"],
        2,
    ):
        return False

    if reserva.estado != "Pagada":
        reserva.estado = "Pagada"

        db.add(
            models.HistorialReserva(
                reserva_id=reserva.id,
                estado="Pagada",
            )
        )

    return True


# ============================================================
# POST /pagos
# ============================================================

def crear_pago(
    datos: PagoCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(
        requiere_rol("Comprador")
    ),
):
    """
    Crea un pago simulado para una reserva confirmada.

    RF-27:
    Permite pago completo o anticipo configurado por el productor.

    RF-46:
    Calcula y guarda la comisión de la plataforma.

    RF-24:
    Permite reintentar un pago rechazado durante 24 horas.
    """

    reserva = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.id
            == datos.reserva_id
        )
        .first()
    )

    if not reserva:
        raise ErrorReservaNoEncontrada(
            datos.reserva_id
        )

    # Verificar que el comprador sea dueño
    # de la reserva.
    if (
        reserva.comprador_id
        != usuario_actual.id
    ):
        raise ErrorNoAutorizado(
            ["Administrador"]
        )

    # Solo las reservas confirmadas pueden pagarse.
    if reserva.estado != "Confirmada":
        raise ErrorReservaNoPagable(
            reserva.estado
        )

    totales = _calcular_totales_reserva(
        reserva
    )

    pagado_hasta_ahora = _monto_pagado(
        db,
        reserva.id,
    )

    pendiente = round(
        totales["total"]
        - pagado_hasta_ahora,
        2,
    )

    # RF-24:
    # Verificar ventana de reintento.
    limite_reintento = _fecha_limite_reintento(
        db,
        reserva.id,
    )

    if (
        limite_reintento
        and datetime.now() > limite_reintento
    ):
        return respuesta_error(
            "El periodo de gracia de 24 horas "
            "para reintentar el pago ya venció.",
            status_code=410,
        )

    if pendiente <= 0:
        raise ErrorReservaNoPagable(
            reserva.estado
        )

    # Validar monto.
    error_monto = _validar_monto_pago(
        datos.monto,
        reserva,
        totales,
        pagado_hasta_ahora,
        pendiente,
    )

    if error_monto:
        return respuesta_error(
            error_monto,
            status_code=400,
        )

    # Si no se proporciona monto, se cobra
    # todo lo pendiente.
    monto = (
        round(datos.monto, 2)
        if datos.monto is not None
        else pendiente
    )

    if monto <= 0:
        return respuesta_error(
            "El monto del pago debe ser mayor a 0.",
            status_code=400,
        )

    if monto > pendiente:
        return respuesta_error(
            f"El monto (${monto:,.2f}) supera "
            f"lo pendiente (${pendiente:,.2f}) "
            "de esta reserva.",
            status_code=400,
        )

    tipo_pago = _tipo_de_pago(
        monto,
        pagado_hasta_ahora,
        totales["total"],
    )

    (
        subtotal_este_pago,
        costo_envio_este_pago,
    ) = _distribuir_monto_pago(
        monto,
        pagado_hasta_ahora,
        totales,
    )

    nuevo_id = siguiente_id(
        db,
        models.Pago,
    )

    # RF-46:
    # Obtener configuración vigente.
    config = obtener_configuracion(
        db
    )

    comision_monto = round(
        monto
        * config.comision_pct
        / 100,
        2,
    )

    monto_neto = round(
        monto - comision_monto,
        2,
    )

    # Simulación académica.
    estado_inicial = (
        "Rechazado"
        if datos.resultado_simulado
        == "fallido"
        else "Aprobado"
    )

    nuevo = models.Pago(
        id=nuevo_id,
        reserva_id=reserva.id,
        subtotal=subtotal_este_pago,
        costo_envio=costo_envio_este_pago,
        monto=monto,
        estado=estado_inicial,
        tipo=tipo_pago,
        referencia_ext=(
            f"SIM-{reserva.id}-{nuevo_id}"
        ),
        metodo=datos.metodo,
        comision_pct=config.comision_pct,
        comision_monto=comision_monto,
        monto_neto=monto_neto,
    )

    db.add(nuevo)

    # ========================================================
    # PAGO RECHAZADO
    # ========================================================

    if estado_inicial == "Rechazado":

        crear_notificacion(
            db,
            reserva.comprador_id,
            "PagoFallido",
            (
                f"El pago de la reserva #{reserva.id} "
                f"({reserva.lote.producto}) fue rechazado. "
                "Puedes reintentarlo durante las "
                "próximas 24 horas."
            ),
            entidad_tipo="reserva",
            entidad_id=reserva.id,
        )

        db.commit()
        db.refresh(nuevo)

        return respuesta_error(
            (
                "El pago fue rechazado. "
                "Puedes reintentarlo dentro de "
                "las próximas 24 horas."
            ),
            status_code=402,
            error="PagoRechazado",
        )

    # ========================================================
    # PAGO APROBADO
    # ========================================================

    es_pago_completo = (
        round(
            pagado_hasta_ahora + monto,
            2,
        )
        >= totales["total"]
    )

    if es_pago_completo:

        reserva.estado = "Pagada"

        db.add(
            models.HistorialReserva(
                reserva_id=reserva.id,
                estado="Pagada",
            )
        )

        mensaje_notif = (
            f"Se confirmó el pago completo de "
            f"${totales['total']:,.2f} por la "
            f"reserva #{reserva.id} "
            f"({reserva.lote.producto})."
        )

    else:

        nuevo_pendiente = round(
            totales["total"]
            - pagado_hasta_ahora
            - monto,
            2,
        )

        mensaje_notif = (
            f"Se recibió un abono de "
            f"${monto:,.2f} por la reserva "
            f"#{reserva.id} "
            f"({reserva.lote.producto}). "
            f"Quedan ${nuevo_pendiente:,.2f} "
            "pendientes."
        )

    # RF-35:
    # Notificar al productor.
    crear_notificacion(
        db,
        reserva.lote.productor_id,
        "PagoRecibido",
        mensaje_notif,
        entidad_tipo="reserva",
        entidad_id=reserva.id,
    )

    db.commit()
    db.refresh(nuevo)

    return respuesta_ok(
        message=(
            "Pago simulado y aprobado "
            "correctamente. La reserva quedó "
            "en estado 'Pagada'."
            if es_pago_completo
            else (
                f"Abono registrado. Pendiente: "
                f"${round(totales['total'] - pagado_hasta_ahora - monto, 2):,.2f}."
            )
        ),
        data={
            **_serializar_pago(nuevo),

            "monto_total_reserva":
                totales["total"],

            "monto_pendiente":
                round(
                    max(
                        totales["total"]
                        - pagado_hasta_ahora
                        - monto,
                        0,
                    ),
                    2,
                ),

            "reserva_completamente_pagada":
                es_pago_completo,
        },
        status_code=201,
    )


# ============================================================
# POST /pagos/webhook
# ============================================================

async def procesar_webhook_pago(
    datos: PagoWebhook,
    request: Request,
    x_webhook_signature: str | None = Header(
        default=None,
        alias="X-Webhook-Signature",
    ),
    db: Session = Depends(get_db),
):
    """
    Procesa la confirmación de una pasarela de pagos.

    RF-23:
    Utiliza una firma HMAC-SHA256 para verificar que
    el webhook proviene de una fuente autorizada.
    """

    payload_bytes = await request.body()

    # Verificar firma.
    if not _firma_webhook_valida(
        payload_bytes,
        x_webhook_signature,
    ):
        return respuesta_error(
            "Firma de webhook inválida.",
            status_code=401,
        )

    # Buscar pago.
    pago = (
        db.query(models.Pago)
        .filter(
            models.Pago.referencia_ext
            == datos.referencia_ext
        )
        .first()
    )

    if not pago:
        return respuesta_error(
            (
                "No se encontró un pago con "
                f"referencia '{datos.referencia_ext}'."
            ),
            status_code=404,
        )

    # Idempotencia.
    if pago.estado == datos.estado:
        return respuesta_ok(
            (
                "Webhook recibido previamente; "
                "no se realizaron cambios."
            ),
            data=_serializar_pago(pago),
        )

    # Validar monto recibido.
    if (
        datos.monto is not None
        and round(float(datos.monto), 2)
        != round(float(pago.monto), 2)
    ):
        return respuesta_error(
            (
                "El monto recibido por webhook "
                "no coincide con el pago registrado."
            ),
            status_code=400,
        )

    reserva = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.id
            == pago.reserva_id
        )
        .first()
    )

    if not reserva:
        raise ErrorReservaNoEncontrada(
            pago.reserva_id
        )

    # Actualizar estado.
    pago.estado = datos.estado

    # ========================================================
    # WEBHOOK RECHAZADO
    # ========================================================

    if datos.estado == "Rechazado":

        crear_notificacion(
            db,
            reserva.comprador_id,
            "PagoFallido",
            (
                f"La pasarela rechazó el pago "
                f"de la reserva #{reserva.id} "
                f"({reserva.lote.producto}). "
                "Puedes reintentarlo dentro "
                "del periodo de gracia."
            ),
            entidad_tipo="reserva",
            entidad_id=reserva.id,
        )

        db.commit()

        return respuesta_ok(
            "Pago rechazado registrado.",
            data=_serializar_pago(pago),
        )

    # ========================================================
    # WEBHOOK APROBADO
    # ========================================================

    es_pago_completo = (
        _reserva_pagada_si_corresponde(
            db,
            reserva,
        )
    )

    if es_pago_completo:

        crear_notificacion(
            db,
            reserva.lote.productor_id,
            "PagoRecibido",
            (
                "La pasarela confirmó el pago "
                "completo de "
                f"${_calcular_totales_reserva(reserva)['total']:,.2f} "
                f"por la reserva #{reserva.id} "
                f"({reserva.lote.producto})."
            ),
            entidad_tipo="reserva",
            entidad_id=reserva.id,
        )

    else:

        crear_notificacion(
            db,
            reserva.lote.productor_id,
            "PagoRecibido",
            (
                f"La pasarela confirmó un pago de "
                f"${float(pago.monto):,.2f} "
                f"por la reserva #{reserva.id} "
                f"({reserva.lote.producto}). "
                "Aún queda saldo pendiente."
            ),
            entidad_tipo="reserva",
            entidad_id=reserva.id,
        )

    db.commit()
    db.refresh(pago)

    return respuesta_ok(
        (
            "Webhook procesado correctamente; "
            "la reserva fue actualizada."
        ),
        data={
            **_serializar_pago(pago),

            "reserva_completamente_pagada":
                es_pago_completo,

            "reserva_estado":
                reserva.estado,
        },
    )


# ============================================================
# GET /pagos
# ============================================================

def obtener_pagos(
    reserva_id: int = Query(
        ...,
        description="Id de la reserva",
    ),
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(
        obtener_usuario_actual
    ),
):
    """
    Obtiene el historial de pagos de una reserva.

    Pueden consultar:

    - El comprador dueño de la reserva.
    - El productor dueño del lote.
    - Un Administrador.
    """

    reserva = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.id
            == reserva_id
        )
        .first()
    )

    if not reserva:
        raise ErrorReservaNoEncontrada(
            reserva_id
        )

    rol = (
        usuario_actual.rol_rel.nombre
        if usuario_actual.rol_rel
        else None
    )

    es_dueño = (
        (
            rol == "Comprador"
            and reserva.comprador_id
            == usuario_actual.id
        )
        or
        (
            rol == "Productor"
            and reserva.lote.productor_id
            == usuario_actual.id
        )
    )

    if (
        rol != "Administrador"
        and not es_dueño
    ):
        raise ErrorNoAutorizado(
            ["Administrador"]
        )

    pagos = (
        db.query(models.Pago)
        .filter(
            models.Pago.reserva_id
            == reserva_id
        )
        .order_by(
            models.Pago.fecha.desc()
        )
        .all()
    )

    # RF-27:
    # Resumen del saldo.
    totales = _calcular_totales_reserva(
        reserva
    )

    pagado = _monto_pagado(
        db,
        reserva_id,
    )

    anticipo_pct = (
        reserva.lote.anticipo_pct
    )

    return respuesta_ok(
        message="Pagos obtenidos correctamente",
        data={
            "monto_total_reserva":
                totales["total"],

            "monto_pagado":
                pagado,

            "monto_pendiente":
                round(
                    max(
                        totales["total"]
                        - pagado,
                        0,
                    ),
                    2,
                ),

            "anticipo_pct":
                anticipo_pct,

            "monto_anticipo":
                (
                    round(
                        totales["total"]
                        * anticipo_pct
                        / 100,
                        2,
                    )
                    if anticipo_pct
                    else None
                ),

            "pagos": [
                _serializar_pago(p)
                for p in pagos
            ],
        },
    )