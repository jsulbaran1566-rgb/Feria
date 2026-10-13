from fastapi import APIRouter
from Controladores.controladores_categorias import (
    obtener_categorias,
    obtener_lotes_por_categoria,
    agregar_categoria,
    editar_categoria,
    eliminar_categoria,
)

router = APIRouter(prefix="/categorias", tags=["Categorías"])

router.get(
    "",
    summary="Listar categorías",
    description="Retorna todas las categorías disponibles en el sistema.",
)(obtener_categorias)

router.get(
    "/{nombre}/lotes",
    summary="Lotes por categoría",
    description=(
        "Lista los lotes de una categoría. "
        "Filtros opcionales: cantidad_min, solo_activos. "
        "Soporta paginación con 'limite' y orden por cantidad con 'ordenar'."
    ),
)(obtener_lotes_por_categoria)

router.post(
    "",
    summary="Crear categoría",
    description="Agrega una nueva categoría al catálogo.",
)(agregar_categoria)

router.put(
    "/{nombre}",
    summary="Renombrar categoría",
    description="Cambia el nombre de una categoría. La FK con CASCADE actualiza los lotes automáticamente.",
)(editar_categoria)

router.delete(
    "/{nombre}",
    summary="Eliminar categoría",
    description="Elimina una categoría. Falla si tiene lotes asociados (FK RESTRICT).",
)(eliminar_categoria)