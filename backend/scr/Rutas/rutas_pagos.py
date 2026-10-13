from fastapi import APIRouter
from Controladores.controladores_pagos import crear_pago, obtener_pagos, procesar_webhook_pago

router = APIRouter(prefix="/pagos", tags=["Pagos"])

router.post(
    "",
    summary="Registrar intento de pago",
    description=(
        "Registra un pago o intento de pago. Mientras no exista una pasarela real, "
        "el proyecto puede simular aprobado/fallido. En producción, la confirmación "
        "definitiva puede llegar por el webhook /pagos/webhook."
    ),
)(crear_pago)

router.post(
    "/webhook",
    summary="Webhook de confirmación de pago",
    description=(
        "Recibe la confirmación de una pasarela externa, valida la firma HMAC, "
        "actualiza el pago y, cuando corresponde, cambia la reserva a Pagada y "
        "notifica al productor (RF-23)."
    ),
)(procesar_webhook_pago)

router.get(
    "",
    summary="Ver pagos de una reserva",
    description="Lista el historial de pagos de una reserva. Solo el comprador dueño, el productor del lote o un Administrador.",
)(obtener_pagos)
