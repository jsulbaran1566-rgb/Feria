from fastapi import APIRouter
from Controladores.controladores_roles import (
    obtener_roles,
    obtener_rol_por_id,
    agregar_rol,
    editar_rol,
    eliminar_rol,
)

router = APIRouter(prefix="/roles", tags=["Roles"])

router.get(
    "",
    summary="Listar roles",
    description="Obtiene todos los roles registrados en el sistema.",
)(obtener_roles)

router.get(
    "/{id}",
    summary="Obtener rol por id",
    description="Retorna un rol específico según su id.",
)(obtener_rol_por_id)

router.post(
    "",
    summary="Registrar rol",
    description="Crea un nuevo rol en el sistema.",
)(agregar_rol)

router.put(
    "/{id}",
    summary="Editar rol",
    description="Actualiza nombre, descripción y/o permisos de un rol.",
)(editar_rol)

router.delete(
    "/{id}",
    summary="Eliminar rol",
    description="Elimina un rol. Requiere ?confirmar=true. Falla si tiene usuarios asignados.",
)(eliminar_rol)