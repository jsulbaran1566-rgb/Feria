from fastapi import APIRouter
from Controladores.controladores_favoritos import (
    obtener_favoritos,
    agregar_favorito,
    eliminar_favorito,
)

router = APIRouter(prefix="/favoritos", tags=["Favoritos"])

router.get(
    "",
    summary="Listar favoritos de un comprador",
    description="Obtiene los productores favoritos de un comprador. Requiere el parámetro comprador_id.",
)(obtener_favoritos)

router.post(
    "",
    summary="Agregar productor a favoritos",
    description="Marca un productor como favorito de un comprador.",
)(agregar_favorito)

router.delete(
    "/{comprador_id}/{productor_id}",
    summary="Quitar productor de favoritos",
    description="Elimina un productor de la lista de favoritos de un comprador. Requiere ?confirmar=true.",
)(eliminar_favorito)