from pydantic import BaseModel, EmailStr, field_validator

from Utilidades.validacion_clave import validar_clave_segura


# ================= AUTENTICACION =================

class LoginEntrada(BaseModel):
    correo: EmailStr
    clave: str

    @field_validator("clave")
    @classmethod
    def clave_no_vacia(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("La clave no puede estar vacía")
        return v


class RecuperarClaveEntrada(BaseModel):
    correo: EmailStr


class RestablecerClaveEntrada(BaseModel):
    token: str
    clave_nueva: str

    @field_validator("clave_nueva")
    @classmethod
    def clave_valida(cls, v: str) -> str:
        return validar_clave_segura(v)


class CambiarClaveEntrada(BaseModel):
    clave_actual: str
    clave_nueva: str

    @field_validator("clave_actual")
    @classmethod
    def actual_no_vacia(cls, v: str) -> str:
        if not v:
            raise ValueError("Debes escribir tu contraseña actual")
        return v

    @field_validator("clave_nueva")
    @classmethod
    def clave_valida(cls, v: str) -> str:
        return validar_clave_segura(v)
