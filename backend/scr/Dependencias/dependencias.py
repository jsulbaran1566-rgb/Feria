# Dependencias de autenticación y autorización (RBAC)
# Se usan con Depends() en las rutas para exigir sesión y/o rol específico.

from fastapi import Header, Depends
from sqlalchemy.orm import Session
from Utilidades.lista_negra import token_esta_revocado

from Conexion.database import get_db
import Modelos.models as models
from Excepciones.excepciones_auth import ErrorTokenInvalido, ErrorNoAutorizado
from Utilidades.seguridad import leer_token


# ── Nivel 1: exige sesión válida (cualquier rol) ───────────────────────────────
# Uso: def mi_ruta(usuario: models.Usuario = Depends(obtener_usuario_actual)): ...

def obtener_usuario_actual(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Usuario:
    if not authorization or not authorization.startswith("Bearer "):
        raise ErrorTokenInvalido()

    token = authorization.removeprefix("Bearer ").strip()

    # Si el token ya fue cerrado con /auth/logout, no sirve más aunque
    # todavía no haya expirado por sí solo.
    if token_esta_revocado(token):
        raise ErrorTokenInvalido()

    payload = leer_token(token)
    if payload is None:
        raise ErrorTokenInvalido()

    usuario_id = payload.get("sub")
    if usuario_id is None:
        raise ErrorTokenInvalido()

    # Un token de recuperación de clave (tipo="recuperacion") NUNCA debe
    # servir para autenticarse como el usuario — solo para restablecer_clave.
    if payload.get("tipo") is not None:
        raise ErrorTokenInvalido()

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    if not usuario or usuario.estado != "Activo":
        raise ErrorTokenInvalido()

    return usuario


# ── Nivel 2: exige sesión + rol específico ─────────────────────────────────────
# Uso: def mi_ruta(usuario: models.Usuario = Depends(requiere_rol("Productor"))): ...
# Varios roles: Depends(requiere_rol("Productor", "Administrador"))

def requiere_rol(*roles_permitidos: str):
    def _verificar(usuario: models.Usuario = Depends(obtener_usuario_actual)) -> models.Usuario:
        rol_usuario = usuario.rol_rel.nombre if usuario.rol_rel else None
        if rol_usuario not in roles_permitidos:
            raise ErrorNoAutorizado(list(roles_permitidos))
        return usuario

    return _verificar
