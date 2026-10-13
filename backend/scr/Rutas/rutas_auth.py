from fastapi import APIRouter
from Controladores.controladores_auth import (
    iniciar_sesion,
    cerrar_sesion,
    solicitar_recuperacion,
    restablecer_clave,
    cambiar_clave,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

router.post(
    "/login",
    summary="Iniciar sesión",
    description="Valida correo y clave, y devuelve un token JWT junto con los datos del usuario.",
)(iniciar_sesion)

router.post(
    "/recuperar-clave",
    summary="Solicitar recuperación de clave",
    description="RECUPERACIÓN SIMULADA: genera un token de recuperación de 15 min y lo devuelve en la respuesta (token_recuperacion). No se envía ningún correo.",
)(solicitar_recuperacion)

router.post(
    "/restablecer-clave",
    summary="Restablecer clave con el token de recuperación",
    description="Recibe el token de recuperación y la nueva clave; la actualiza si el token es válido.",
)(restablecer_clave)

router.post(
    "/logout",
    summary="Cerrar sesión",
    description="Invalida el token actual en el servidor, para que no pueda volver a usarse aunque no haya expirado.",
)(cerrar_sesion)

router.post(
    "/cambiar-clave",
    summary="Cambiar la clave propia",
    description="Requiere sesión. Recibe la clave actual y la nueva; solo cambia si la actual es correcta.",
)(cambiar_clave)
