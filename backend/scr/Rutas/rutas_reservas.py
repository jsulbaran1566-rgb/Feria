from fastapi import APIRouter
from Controladores.controladores_reservas import (
    obtener_reservas,
    obtener_reservas_por_fecha,
    crear_reserva,
    actualizar_estado_reserva,
    eliminar_reserva,
)

router = APIRouter(prefix="/reservas", tags=["Reservas"])

router.get(
    "",
    summary="Listar reservas",
    description=(
        "Obtiene todas las reservas. Filtros opcionales: estado, comprador_id, lote_id, "
        "fecha_desde y fecha_hasta (formato YYYY-MM-DD)."
    ),
)(obtener_reservas)

router.get(
    "/fechas",
    summary="Buscar reservas por rango de fechas",
    description="Retorna las reservas cuya fecha esté entre fecha_desde y fecha_hasta (YYYY-MM-DD). Ambos parámetros son obligatorios.",
)(obtener_reservas_por_fecha)

router.post(
    "",
    summary="Crear reserva",
    description="Crea una nueva reserva. Descuenta kg del lote y registra estado inicial en historial.",
)(crear_reserva)

router.put(
    "/{id}/estado",
    summary="Editar reserva",
    description="Actualiza comprador_id, fecha y/o estado de la reserva. Si cambia el estado, guarda bitácora.",
)(actualizar_estado_reserva)

router.delete(
    "/{id}",
    summary="Eliminar reserva",
    description="Elimina una reserva. Solo se permite si el estado es 'Cancelada'. Requiere ?confirmar=true.",
)(eliminar_reserva)