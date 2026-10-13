from fastapi import APIRouter
from Controladores.controladores_proveedores import (
    obtener_proveedores,
    obtener_proveedor_por_id,
    agregar_proveedor,
    editar_proveedor,
    eliminar_proveedor,
)

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

router.get(
    "",
    summary="Listar proveedores",
    description="Obtiene todos los proveedores registrados en el sistema.",
)(obtener_proveedores)

router.get(
    "/{id}",
    summary="Obtener proveedor por id",
    description="Retorna un proveedor específico según su id.",
)(obtener_proveedor_por_id)

router.post(
    "",
    summary="Registrar proveedor",
    description="Crea un nuevo proveedor en el sistema.",
)(agregar_proveedor)

router.put(
    "/{id}",
    summary="Editar proveedor",
    description="Actualiza los datos de un proveedor.",
)(editar_proveedor)

router.delete(
    "/{id}",
    summary="Eliminar proveedor",
    description="Elimina un proveedor. Requiere ?confirmar=true.",
)(eliminar_proveedor)
