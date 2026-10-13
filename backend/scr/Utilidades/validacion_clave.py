# Regla única de contraseña segura (la misma que valida el frontend):
# mínimo 8 caracteres, una mayúscula, un número y un carácter especial.

import re

LONGITUD_MINIMA_CLAVE = 8

MENSAJE_REGLAS_CLAVE = (
    "La contraseña debe tener al menos 8 caracteres, una mayúscula, "
    "un número y un carácter especial."
)

_REGEX_MAYUS = re.compile(r"[A-Z]")
_REGEX_NUMERO = re.compile(r"[0-9]")
_REGEX_ESPECIAL = re.compile(r"""[!@#$%^&*(),.?":{}|<>_\-+=/\\\[\]~`;']""")


def clave_es_segura(clave: str) -> bool:
    return (
        len(clave) >= LONGITUD_MINIMA_CLAVE
        and bool(_REGEX_MAYUS.search(clave))
        and bool(_REGEX_NUMERO.search(clave))
        and bool(_REGEX_ESPECIAL.search(clave))
    )


def validar_clave_segura(clave: str) -> str:
    """Para usar dentro de un field_validator de Pydantic."""
    if not clave_es_segura(clave):
        raise ValueError(MENSAJE_REGLAS_CLAVE)
    return clave
