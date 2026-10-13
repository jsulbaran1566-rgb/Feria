from fastapi import APIRouter
from Controladores.controladores_tipos_documento import (
    obtener_tipos_documento,
    obtener_tipo_documento_por_codigo,
    agregar_tipo_documento,
    editar_tipo_documento,
    eliminar_tipo_documento,
)

router = APIRouter(prefix="/tipos_documento", tags=["Tipos de Documento"])

router.get(
    "",
    summary="Listar tipos de documento",
    description="Obtiene todos los tipos de documento registrados en el sistema.",
)(obtener_tipos_documento)

router.get(
    "/{codigo}",
    summary="Obtener tipo de documento por código",
    description="Retorna un tipo de documento específico según su código (CC, NIT, CE, PP...).",
)(obtener_tipo_documento_por_codigo)

router.post(
    "",
    summary="Registrar tipo de documento",
    description="Crea un nuevo tipo de documento en el sistema.",
)(agregar_tipo_documento)

router.put(
    "/{codigo}",
    summary="Editar tipo de documento",
    description="Actualiza el nombre de un tipo de documento.",
)(editar_tipo_documento)

router.delete(
    "/{codigo}",
    summary="Eliminar tipo de documento",
    description="Elimina un tipo de documento. Requiere ?confirmar=true. Falla si tiene usuarios asignados.",
)(eliminar_tipo_documento)