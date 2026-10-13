# AgroMercado API — punto de entrada principal
# pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic[email]
# cd C:\Users\SENA\Downloads\fastapi\scr uvicorn main:app --reload

import time
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from Utilidades.logger import logger

# Variables de entorno (backend/.env). Debe cargarse antes de importar los módulos que usan os.getenv.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from Conexion.database import engine, Base
import Modelos.models as models

from Utilidades.respuesta import respuesta_error

# ── Excepciones ───────────────────────────────────────────────────────────────

from Excepciones.excepciones_usuarios import (
    ErrorUsuarioNoExiste,
    ErrorUsuarioYaExiste,
    ErrorRolInvalido,
)
from Excepciones.excepciones_lotes import (
    ErrorLoteNoEncontrado,
    ErrorLoteYaExiste,
    ErrorCantidadInvalida,
    ErrorCategoriaInvalidaEnLote,
)
from Excepciones.excepciones_categorias import (
    ErrorCategoriaNoEncontrada,
    ErrorCategoriaYaExiste,
    ErrorCantidadMinNegativa,
    ErrorCategoriaConLotes,
)
from Excepciones.excepciones_reservas import (
    ErrorReservaNoEncontrada,
    ErrorReservaYaExiste,
    ErrorReservaNoEliminable,
    ErrorStockInsuficiente,
    ErrorProductoNoEncontrado,
    ErrorEstadoInvalido,
)
from Excepciones.excepciones_auth import (
    ErrorCredencialesInvalidas,
    ErrorTokenInvalido,
    ErrorNoAutorizado,
    ErrorTokenRecuperacionInvalido,
)
from Excepciones.excepciones_proveedores import (
    ErrorProveedorNoEncontrado,
    ErrorProveedorYaExiste,
)
from Excepciones.excepciones_favoritos import (
    ErrorFavoritoYaExiste,
    ErrorFavoritoNoEncontrado,
)
from Excepciones.excepciones_soporte import ErrorSoporteNoEncontrado
from Excepciones.excepciones_pagos import ErrorPagoNoEncontrado, ErrorReservaNoPagable
from Excepciones.excepciones_entregas import (
    ErrorEntregaNoEncontrada,
    ErrorReservaNoEnviable,
    ErrorEntregaYaExiste,
    ErrorCodigoConfirmacionInvalido,
)
from Excepciones.excepciones_calificaciones import (
    ErrorCalificacionNoEncontrada,
    ErrorCalificacionYaExiste,
    ErrorReservaNoCalificable,
)
from Excepciones.excepciones_disputas import ErrorDisputaNoEncontrada, ErrorDisputaYaExiste
from Excepciones.excepciones_notificaciones import ErrorNotificacionNoEncontrada
from Excepciones.excepciones_incidencias import ErrorIncidenciaNoEncontrada

# ── Rutas ─────────────────────────────────────────────────────────────────────

from Rutas import (
    rutas_usuarios,
    rutas_lotes,
    rutas_reservas,
    rutas_categorias,
    rutas_historial,
    rutas_roles,
    rutas_tipos_documento,
    rutas_auth,
    rutas_proveedores,
    rutas_favoritos,
    rutas_soporte,
    rutas_pagos,
    rutas_entregas,
    rutas_calificaciones,
    rutas_disputas,
    rutas_reportes,
    rutas_notificaciones,
    rutas_incidencias,
    rutas_configuracion,
)

# Crea las tablas al arrancar si no existen
Base.metadata.create_all(bind=engine)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AgroMercado API",
    version="4.0",
    description="API para la comercialización de productos agrícolas entre productores y compradores.",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# En vez de una lista fija de puertos (que se rompe si Live Server, por lo
# que sea, abre en 5501/5502 en vez de 5500), permitimos cualquier puerto de
# localhost/127.0.0.1. Sigue siendo seguro: solo cubre el propio computador
# del desarrollador, nunca un dominio externo.

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost)(:\d+)?",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Middleware de logging ─────────────────────────────────────────────────────

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        inicio    = time.time()
        response  = await call_next(request)
        duracion  = time.time() - inicio

        mensaje = f"[{response.status_code}] {request.method} {request.url.path} — {duracion:.3f}s"
        if response.status_code >= 500:
            logger.error(mensaje)
        elif response.status_code >= 400:
            logger.warning(mensaje)
        else:
            logger.info(mensaje)

        return response

app.add_middleware(LoggingMiddleware)

# ── Manejador global de errores no controlados ────────────────────────────────

@app.exception_handler(Exception)
async def manejar_error_generico(request: Request, error: Exception):
    # Guardamos el traceback completo en el log — es lo único que permite
    # depurar un 500 después de que ya pasó, en vez de solo saber que pasó.
    logger.exception(f"Error no controlado en {request.method} {request.url.path}")

    # OJO: este handler corre en el ServerErrorMiddleware, que está POR ENCIMA
    # de CORSMiddleware en el stack de Starlette. Por eso las respuestas de
    # este handler nunca pasan por CORS y el navegador reporta "blocked by
    # CORS policy" en vez de mostrar el verdadero error 500. Se agregan los
    # headers CORS a mano para que el frontend pueda leer el mensaje real.
    # Usa la misma regla que CORSMiddleware (cualquier puerto de
    # localhost/127.0.0.1), para no mantener dos listas de orígenes.
    import re
    origen = request.headers.get("origin", "")
    origen_permitido = bool(re.fullmatch(r"http://(127\.0\.0\.1|localhost)(:\d+)?", origen))

    response = JSONResponse(
        status_code=500,
        content={
            "ok":      False,
            "message": "Error interno del servidor",
            "error":   str(error),
            "data":    None,
        },
    )

    if origen_permitido:
        response.headers["Access-Control-Allow-Origin"] = origen
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response


# ================================================================
# MANEJADORES DE EXCEPCIONES — USUARIOS
# ================================================================

@app.exception_handler(ErrorUsuarioNoExiste)
async def manejar_usuario_no_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorUsuarioYaExiste)
async def manejar_usuario_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorRolInvalido)
async def manejar_rol_invalido(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — LOTES
# ================================================================

@app.exception_handler(ErrorLoteNoEncontrado)
async def manejar_lote_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorLoteYaExiste)
async def manejar_lote_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorCantidadInvalida)
async def manejar_cantidad_invalida(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorCategoriaInvalidaEnLote)
async def manejar_categoria_invalida_en_lote(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — CATEGORÍAS
# ================================================================

@app.exception_handler(ErrorCategoriaNoEncontrada)
async def manejar_categoria_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorCategoriaYaExiste)
async def manejar_categoria_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorCantidadMinNegativa)
async def manejar_cantidad_min_negativa(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorCategoriaConLotes)
async def manejar_categoria_con_lotes(request, error):
    return respuesta_error(message=error.mensaje, status_code=409, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — RESERVAS
# ================================================================

@app.exception_handler(ErrorReservaNoEncontrada)
async def manejar_reserva_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorReservaYaExiste)
async def manejar_reserva_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorReservaNoEliminable)
async def manejar_reserva_no_eliminable(request, error):
    return respuesta_error(message=error.mensaje, status_code=409, error=error.mensaje)

@app.exception_handler(ErrorStockInsuficiente)
async def manejar_stock_insuficiente(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorProductoNoEncontrado)
async def manejar_producto_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorEstadoInvalido)
async def manejar_estado_invalido(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — AUTENTICACIÓN
# ================================================================

@app.exception_handler(ErrorCredencialesInvalidas)
async def manejar_credenciales_invalidas(request, error):
    return respuesta_error(message=error.mensaje, status_code=401, error=error.mensaje)

@app.exception_handler(ErrorTokenInvalido)
async def manejar_token_invalido(request, error):
    return respuesta_error(message=error.mensaje, status_code=401, error=error.mensaje)

@app.exception_handler(ErrorNoAutorizado)
async def manejar_no_autorizado(request, error):
    return respuesta_error(message=error.mensaje, status_code=403, error=error.mensaje)

@app.exception_handler(ErrorTokenRecuperacionInvalido)
async def manejar_token_recuperacion_invalido(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — PROVEEDORES
# ================================================================

@app.exception_handler(ErrorProveedorNoEncontrado)
async def manejar_proveedor_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorProveedorYaExiste)
async def manejar_proveedor_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — FAVORITOS
# ================================================================

@app.exception_handler(ErrorFavoritoYaExiste)
async def manejar_favorito_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorFavoritoNoEncontrado)
async def manejar_favorito_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — SOPORTE
# ================================================================

@app.exception_handler(ErrorSoporteNoEncontrado)
async def manejar_soporte_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — PAGOS
# ================================================================

@app.exception_handler(ErrorPagoNoEncontrado)
async def manejar_pago_no_encontrado(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorReservaNoPagable)
async def manejar_reserva_no_pagable(request, error):
    return respuesta_error(message=error.mensaje, status_code=409, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — ENTREGAS
# ================================================================

@app.exception_handler(ErrorEntregaNoEncontrada)
async def manejar_entrega_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorReservaNoEnviable)
async def manejar_reserva_no_enviable(request, error):
    return respuesta_error(message=error.mensaje, status_code=409, error=error.mensaje)

@app.exception_handler(ErrorEntregaYaExiste)
async def manejar_entrega_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorCodigoConfirmacionInvalido)
async def manejar_codigo_confirmacion_invalido(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — CALIFICACIONES
# ================================================================

@app.exception_handler(ErrorCalificacionNoEncontrada)
async def manejar_calificacion_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorCalificacionYaExiste)
async def manejar_calificacion_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)

@app.exception_handler(ErrorReservaNoCalificable)
async def manejar_reserva_no_calificable(request, error):
    return respuesta_error(message=error.mensaje, status_code=409, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — DISPUTAS
# ================================================================

@app.exception_handler(ErrorDisputaNoEncontrada)
async def manejar_disputa_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorDisputaYaExiste)
async def manejar_disputa_ya_existe(request, error):
    return respuesta_error(message=error.mensaje, status_code=400, error=error.mensaje)


# ================================================================
# MANEJADORES DE EXCEPCIONES — NOTIFICACIONES
# ================================================================

@app.exception_handler(ErrorNotificacionNoEncontrada)
async def manejar_notificacion_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)

@app.exception_handler(ErrorIncidenciaNoEncontrada)
async def manejar_incidencia_no_encontrada(request, error):
    return respuesta_error(message=error.mensaje, status_code=404, error=error.mensaje)


# ================================================================
# REGISTRO DE RUTAS
# ================================================================

app.include_router(rutas_usuarios.router)
app.include_router(rutas_lotes.router)
app.include_router(rutas_reservas.router)
app.include_router(rutas_categorias.router)
app.include_router(rutas_historial.router)
app.include_router(rutas_roles.router)
app.include_router(rutas_tipos_documento.router)
app.include_router(rutas_auth.router)
app.include_router(rutas_proveedores.router)
app.include_router(rutas_favoritos.router)
app.include_router(rutas_soporte.router)
app.include_router(rutas_pagos.router)
app.include_router(rutas_entregas.router)
app.include_router(rutas_calificaciones.router)
app.include_router(rutas_disputas.router)
app.include_router(rutas_reportes.router)
app.include_router(rutas_notificaciones.router)
app.include_router(rutas_incidencias.router)
app.include_router(rutas_configuracion.router)