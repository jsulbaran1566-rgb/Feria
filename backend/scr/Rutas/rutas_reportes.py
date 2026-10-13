from fastapi import APIRouter
from Controladores.controladores_reportes import reporte_productor, reporte_comprador, reporte_admin

router = APIRouter(prefix="/reportes", tags=["Reportes"])

router.get(
    "/productor",
    summary="Reporte de ventas del productor (RF-39)",
    description="Total kg vendidos, ingresos, lotes activos y calificación. El Productor ve el suyo; Administrador puede pasar ?productor_id=.",
)(reporte_productor)

router.get(
    "/comprador",
    summary="Reporte de compras del comprador (RF-40)",
    description="Historial de compras con montos pagados. El Comprador ve el suyo; Administrador puede pasar ?comprador_id=.",
)(reporte_comprador)

router.get(
    "/admin",
    summary="Reporte financiero de la plataforma (RF-41)",
    description="Volumen de transacciones, comisiones, disputas y usuarios activos. Solo Administrador.",
)(reporte_admin)
