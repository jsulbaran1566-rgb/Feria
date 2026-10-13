from fastapi import APIRouter
from Controladores.controladores_historial import (
    ver_historial_seguimiento,
    ver_compras,
    ver_ventas,
    ver_historial_reservas,
)

router = APIRouter(tags=["Historial y Reportes"])

router.get("/historial_seguimiento")(ver_historial_seguimiento)
router.get("/compras")(ver_compras)
router.get("/ventas")(ver_ventas)
router.get("/historial_reservas")(ver_historial_reservas)