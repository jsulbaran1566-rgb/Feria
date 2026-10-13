# Lista negra de tokens invalidados (logout)
#
# Los tokens de sesion son JWT sin estado: por diseño, un JWT sigue siendo
# "valido" para el algoritmo hasta que expira, aunque el navegador ya no lo
# tenga guardado. Para que "Cerrar sesión" apague realmente el token en el
# servidor (y no solo en el navegador), lo agregamos aqui cuando el usuario
# cierra sesion, y lo rechazamos en cada peticion mientras no haya expirado.
#
# NOTA: esta lista vive en memoria (se vacia si el servidor se reinicia), lo
# cual es aceptable para este proyecto academico. En produccion esto se
# guardaria en algo compartido entre instancias (ej. Redis) con TTL igual al
# tiempo restante del token, para que se limpie solo.

from datetime import datetime, timezone

_tokens_revocados: dict[str, datetime] = {}


def revocar_token(token: str, expira: datetime) -> None:
    """Marca un token como invalidado hasta su fecha de expiración original."""
    _tokens_revocados[token] = expira
    _purgar_expirados()


def token_esta_revocado(token: str) -> bool:
    """True si el token fue cerrado (logout) y todavia no expiraba por si solo."""
    return token in _tokens_revocados


def _purgar_expirados() -> None:
    """Limpia tokens ya vencidos para no acumular memoria indefinidamente."""
    ahora = datetime.now(timezone.utc)
    vencidos = [t for t, exp in _tokens_revocados.items() if exp <= ahora]
    for t in vencidos:
        del _tokens_revocados[t]

