from fastapi import APIRouter
from Controladores.controladores_calificaciones import crear_calificacion, obtener_calificaciones

router = APIRouter(prefix="/calificaciones", tags=["Calificaciones"])

router.post(
    "",
    summary="Calificar una reserva entregada",
    description="El Comprador califica (1-5 estrellas) una reserva en estado 'Entregada'. Una sola vez por reserva.",
)(crear_calificacion)

router.get(
    "",
    summary="Ver calificaciones de un productor",
    description="Lista pública de calificaciones y promedio de un productor (reputación).",
)(obtener_calificaciones)
