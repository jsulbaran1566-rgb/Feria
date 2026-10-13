# imports agregados/ajustados al inicio del archivo
from datetime import datetime, timezone
from fastapi import Depends, Header
from Utilidades.lista_negra import revocar_token, token_esta_revocado
from sqlalchemy.orm import Session
from Conexion.database import get_db
import Modelos.models as models
from Esquemas.Esquemas import LoginEntrada, RecuperarClaveEntrada, RestablecerClaveEntrada, CambiarClaveEntrada
from Dependencias.dependencias import obtener_usuario_actual
from Excepciones.excepciones_auth import ErrorCredencialesInvalidas, ErrorTokenRecuperacionInvalido
from Utilidades.respuesta import respuesta_ok, respuesta_error
from Utilidades.seguridad import (
    verificar_clave,
    crear_token,
    leer_token,
    hashear_clave,
    MINUTOS_EXPIRACION_RECUPERACION,
)

# ── POST /auth/logout ─────────────────────────────────────────────────────────
def cerrar_sesion(
    authorization: str = Header(default=None),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        payload = leer_token(token)
        if payload and payload.get("exp"):
            expira = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            revocar_token(token, expira)

    return respuesta_ok(message="Sesión cerrada correctamente.")
# ── POST /auth/login ─────────────────────────────────────────────────────────
# Recibe correo y clave, verifica contra la base de datos y devuelve un token.

def iniciar_sesion(
    datos: LoginEntrada,
    db: Session = Depends(get_db),
):
    # 1. Buscar el usuario por correo
    usuario = db.query(models.Usuario).filter(models.Usuario.correo == datos.correo).first()

    # 2. Si no existe, o la clave no coincide, o esta inactivo -> mismo error
    #    (no decimos cual de las tres cosas fallo, por seguridad)
    if not usuario or not verificar_clave(datos.clave, usuario.clave):
        raise ErrorCredencialesInvalidas()

    if usuario.estado != "Activo":
        raise ErrorCredencialesInvalidas()

    # 3. Crear el token con los datos minimos necesarios
    token = crear_token({
        "sub":    str(usuario.id),
        "correo": usuario.correo,
        "rol":    usuario.rol_rel.nombre if usuario.rol_rel else None,
    })

    # 4. Responder con el token y los datos basicos del usuario
    return respuesta_ok(
        message="Inicio de sesión exitoso",
        data={
            "token": token,
            "usuario": {
                "id":     usuario.id,
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "rol":    usuario.rol_rel.nombre if usuario.rol_rel else None,
            },
        },
    )


# ── POST /auth/recuperar-clave ────────────────────────────────────────────────
# RECUPERACIÓN SIMULADA: este proyecto NO envía correos.
#
# Genera un token de recuperación de vida corta (15 min) y lo devuelve en la
# respuesta (`token_recuperacion`). El frontend lo muestra en un recuadro de
# "correo simulado" con un botón que hace de enlace del correo, y luego usa
# ese mismo token en /auth/restablecer-clave, que sí cambia la clave real
# en la base de datos.
#
# Si el correo no existe o el usuario está inactivo no se devuelve token y el
# mensaje es el mismo, así el endpoint no confirma qué correos están
# registrados (aunque en modo simulado la ausencia del token lo delata).
#
# En un entorno real este endpoint NUNCA debería devolver el token: debería
# enviarlo solo al correo del usuario.

def solicitar_recuperacion(
    datos: RecuperarClaveEntrada,
    db: Session = Depends(get_db),
):
    usuario = db.query(models.Usuario).filter(models.Usuario.correo == datos.correo).first()

    mensaje = (
        "Si el correo ingresado corresponde a una cuenta registrada y activa, "
        f"se generó un enlace de recuperación válido por {MINUTOS_EXPIRACION_RECUPERACION} minutos "
        "(modo simulado: no se envía ningún correo real)."
    )

    data = {
        "enviado": True,
        "simulado": True,
        "mensaje": mensaje,
    }

    if usuario and usuario.estado == "Activo":
        data["token_recuperacion"] = crear_token(
            {"sub": str(usuario.id), "tipo": "recuperacion"},
            minutos=MINUTOS_EXPIRACION_RECUPERACION,
        )

    return respuesta_ok(message=mensaje, data=data)


# ── POST /auth/restablecer-clave ──────────────────────────────────────────────
# Valida el token de recuperación y guarda la nueva clave (hasheada).
# El token es de un solo uso: al restablecer la clave queda invalidado.

def restablecer_clave(
    datos: RestablecerClaveEntrada,
    db: Session = Depends(get_db),
):
    if token_esta_revocado(datos.token):
        raise ErrorTokenRecuperacionInvalido()

    payload = leer_token(datos.token)
    if not payload or payload.get("tipo") != "recuperacion":
        raise ErrorTokenRecuperacionInvalido()

    usuario_id = payload.get("sub")
    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    if not usuario or usuario.estado != "Activo":
        raise ErrorTokenRecuperacionInvalido()

    usuario.clave = hashear_clave(datos.clave_nueva)
    db.commit()

    # Invalidar el token para que no pueda reutilizarse
    if payload.get("exp"):
        revocar_token(datos.token, datetime.fromtimestamp(payload["exp"], tz=timezone.utc))

    return respuesta_ok(message="Clave actualizada correctamente. Ya puedes iniciar sesión.")


# ── POST /auth/cambiar-clave ──────────────────────────────────────────────────
# El usuario con sesión activa cambia su propia clave. Exige la clave actual
# (si no, cualquiera con una sesión abierta podría cambiarla sin conocerla).
# Responde 400 (no 401) cuando la clave actual es incorrecta, para que el
# frontend no lo confunda con una sesión vencida.

def cambiar_clave(
    datos: CambiarClaveEntrada,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual),
):
    if not verificar_clave(datos.clave_actual, usuario_actual.clave):
        return respuesta_error("La contraseña actual no es correcta.", status_code=400)

    if verificar_clave(datos.clave_nueva, usuario_actual.clave):
        return respuesta_error("La nueva contraseña debe ser diferente a la actual.", status_code=400)

    usuario_actual.clave = hashear_clave(datos.clave_nueva)
    db.commit()

    return respuesta_ok(message="Contraseña actualizada correctamente.")
