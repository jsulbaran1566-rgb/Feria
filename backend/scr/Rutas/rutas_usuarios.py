from fastapi import APIRouter
from Controladores.controladores_usuarios import (
    obtener_usuarios,
    obtener_compradores,
    obtener_productores,
    obtener_usuario_por_nombre,
    agregar_usuario,
    editar_usuario,
    eliminar_usuario,
    obtener_perfil_publico,
    obtener_mi_perfil,
    obtener_resumen_publico,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

router.get(
    "",
    summary="Listar usuarios",
    description="Obtiene todos los usuarios con todos sus datos. Solo Administrador. Filtros opcionales: rol, estado.",
)(obtener_usuarios)

router.get(
    "/me",
    summary="Mi perfil",
    description="Datos completos del usuario con sesión activa.",
)(obtener_mi_perfil)

router.get(
    "/resumen-publico",
    summary="Resumen público",
    description="Cantidad de compradores y productores activos. Sin datos personales ni sesión.",
)(obtener_resumen_publico)

router.get(
    "/compradores",
    summary="Listar compradores",
    description="Obtiene todos los usuarios con rol Comprador. Filtro opcional: estado.",
)(obtener_compradores)

router.get(
    "/productores",
    summary="Listar productores",
    description="Productores con datos públicos (sin correo ni teléfono). Sin sesión. Filtro opcional: estado.",
)(obtener_productores)

router.get(
    "/{nombre}",
    summary="Buscar usuario por nombre",
    description="Retorna usuario(s) cuyo nombre coincida parcialmente (insensible a mayúsculas).",
)(obtener_usuario_por_nombre)

router.post(
    "",
    summary="Registrar usuario",
    description="Crea un nuevo usuario en el sistema.",
)(agregar_usuario)

router.put(
    "/{id}",
    summary="Editar usuario",
    description="Actualiza nombre, teléfono, dirección, ciudad, rol y/o estado de un usuario.",
)(editar_usuario)

router.delete(
    "/{id}",
    summary="Eliminar usuario",
    description="Elimina un usuario. Requiere ?confirmar=true. Falla si tiene lotes activos.",
)(eliminar_usuario)

router.get(
    "/{id}/perfil-publico",
    summary="Perfil público del productor (RF-48)",
    description="Nombre de finca, cultivos, GPS, calificación y puntaje de un Productor. Público, sin sesión.",
)(obtener_perfil_publico)