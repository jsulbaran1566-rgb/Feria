from fastapi import APIRouter
from Controladores.controladores_soporte import (
    crear_soporte,
    obtener_soporte,
    actualizar_estado_soporte,
    eliminar_soporte,
)

router = APIRouter(prefix="/soporte", tags=["Soporte"])

router.post(
    "",
    summary="Enviar mensaje de soporte",
    description="Guarda en la base de datos un mensaje de soporte enviado desde cualquier panel.",
)(crear_soporte)

router.get(
    "",
    summary="Listar tickets de soporte",
    description="Lista todos los mensajes de soporte registrados. Uso administrativo.",
)(obtener_soporte)

router.put(
    "/{soporte_id}/estado",
    summary="Actualizar estado de un ticket",
    description="Cambia el estado de un ticket de soporte (Pendiente, En proceso, Resuelto).",
)(actualizar_estado_soporte)

router.delete(
    "/{soporte_id}",
    summary="Eliminar ticket de soporte",
    description="Elimina un ticket de soporte. Requiere ?confirmar=true.",
)(eliminar_soporte)
