from fastapi import APIRouter
from Controladores.controladores_entregas import (
    crear_entrega,
    actualizar_entrega,
    obtener_entregas,
    actualizar_ubicacion_entrega,
)

router = APIRouter(prefix="/entregas", tags=["Entregas"])

router.post(
    "",
    summary="Despachar una reserva pagada",
    description="El Productor registra el envío de una reserva 'Pagada' y genera un código de confirmación.",
)(crear_entrega)

router.put(
    "/{id}",
    summary="Actualizar/confirmar una entrega",
    description="El Comprador confirma la recepción con el código; el Productor puede actualizar el estado.",
)(actualizar_entrega)

router.put(
    "/{id}/ubicacion",
    summary="Actualizar ubicación del envío (RF-32)",
    description="El Productor reporta manualmente dónde va el envío mientras está 'En tránsito' (sin API de transportista real).",
)(actualizar_ubicacion_entrega)

router.get(
    "",
    summary="Ver entregas de una reserva",
    description="Consulta la entrega asociada a una reserva. Solo comprador dueño, productor del lote o Administrador.",
)(obtener_entregas)
