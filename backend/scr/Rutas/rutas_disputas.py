from fastapi import APIRouter
from Controladores.controladores_disputas import crear_disputa, obtener_disputas, actualizar_disputa

router = APIRouter(prefix="/disputas", tags=["Disputas"])

router.post(
    "",
    summary="Abrir una disputa",
    description="El Comprador abre una disputa sobre su propia reserva. Máximo una disputa por reserva.",
)(crear_disputa)

router.get(
    "",
    summary="Listar disputas",
    description="Administrador ve todas; Comprador ve solo las suyas.",
)(obtener_disputas)

router.put(
    "/{id}",
    summary="Resolver una disputa",
    description="Solo un Administrador puede cambiar el estado o registrar la resolución.",
)(actualizar_disputa)
