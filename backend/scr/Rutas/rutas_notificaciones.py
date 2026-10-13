from fastapi import APIRouter
from Controladores.controladores_notificaciones import (
    obtener_notificaciones,
    marcar_notificacion_leida,
    marcar_todas_leidas,
)

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

router.get(
    "",
    summary="Ver mis notificaciones",
    description="Lista las notificaciones del usuario autenticado (RF-33 a RF-38), más recientes primero.",
)(obtener_notificaciones)

router.put(
    "/{id}/leer",
    summary="Marcar una notificación como leída",
)(marcar_notificacion_leida)

router.put(
    "/leer-todas",
    summary="Marcar todas las notificaciones como leídas",
)(marcar_todas_leidas)
