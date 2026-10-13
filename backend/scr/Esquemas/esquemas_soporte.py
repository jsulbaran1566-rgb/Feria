from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ================= SOPORTE =================

ESTADOS_SOPORTE_VALIDOS = ["Pendiente", "En proceso", "Resuelto"]


class SoporteCrear(BaseModel):
    usuario_id: Optional[int] = None
    nombre: str
    correo: EmailStr
    mensaje: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("mensaje")
    @classmethod
    def mensaje_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El mensaje no puede estar vacío")
        return v.strip()


class SoporteActualizar(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ESTADOS_SOPORTE_VALIDOS:
            raise ValueError(f"El estado debe ser uno de: {', '.join(ESTADOS_SOPORTE_VALIDOS)}")
        return v
