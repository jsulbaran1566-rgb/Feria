from fastapi import APIRouter
from Controladores.controladores_configuracion import ver_comision, actualizar_comision

router = APIRouter(prefix="/configuracion", tags=["Configuración"])

router.get(
    "/comision",
    summary="Ver la comisión actual de la plataforma",
    description="Público — el productor puede consultar qué % le cobra la plataforma antes de publicar.",
)(ver_comision)

router.put(
    "/comision",
    summary="Actualizar la comisión de la plataforma (RF-46)",
    description="Solo Administrador. Aplica a los pagos nuevos; los ya procesados conservan la comisión con la que se hicieron.",
)(actualizar_comision)
