from fastapi import APIRouter
from Controladores.controladores_incidencias import crear_incidencia, obtener_incidencias

router = APIRouter(prefix="/incidencias", tags=["Incidencias"])

router.post(
    "",
    summary="Reportar una incidencia (RF-14)",
    description="El Productor dueño del lote reporta plaga/helada/etc. Notifica automáticamente a los compradores con reserva activa (RF-37).",
)(crear_incidencia)

router.get(
    "",
    summary="Ver incidencias de un lote",
    description="Historial de incidencias reportadas sobre un lote. Público.",
)(obtener_incidencias)
