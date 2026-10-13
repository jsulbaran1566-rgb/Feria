from fastapi import APIRouter
from Controladores.controladores_lotes import (
    obtener_lotes,
    obtener_lote_por_producto,
    agregar_lote,
    editar_lote,
    eliminar_lote,
    actualizar_estado_cultivo,
    obtener_historial_lote,
)

router = APIRouter(prefix="/lotes", tags=["Lotes"])

router.get(
    "",
    summary="Listar lotes",
    description="Obtiene todos los lotes. Filtros opcionales: categoria, estado, productor_id.",
)(obtener_lotes)

router.get(
    "/{producto}",
    summary="Buscar lote por nombre de producto",
    description="Retorna lote(s) cuyo nombre de producto coincida parcialmente.",
)(obtener_lote_por_producto)

router.post(
    "",
    summary="Crear lote",
    description="Registra un nuevo lote. El productor_id debe ser un usuario con rol 'Productor'.",
)(agregar_lote)

router.put(
    "/{id}",
    summary="Editar lote",
    description="Actualiza producto, cantidad, categoría, precio_kg, estado, fecha_siembra y/o fecha_cosecha.",
)(editar_lote)

router.delete(
    "/{id}",
    summary="Eliminar lote",
    description="Elimina un lote. Requiere ?confirmar=true. Falla si tiene reservas activas.",
)(eliminar_lote)

router.put(
    "/{id}/estado-cultivo",
    summary="Avanzar el estado del cultivo (RF-13)",
    description="El Productor dueño avanza Siembra → Crecimiento → Listo → Cosechado, un paso a la vez.",
)(actualizar_estado_cultivo)

router.get(
    "/{id}/historial",
    summary="Historial de trazabilidad del lote (RF-15)",
    description="Vista cronológica de todos los eventos registrados sobre el lote.",
)(obtener_historial_lote)