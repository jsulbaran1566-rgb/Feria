from typing import Optional
from pydantic import BaseModel, field_validator


# ================= TIPOS DOCUMENTO =================

class TipoDocumentoCrear(BaseModel):
    codigo: str
    nombre: str

    @field_validator("codigo")
    @classmethod
    def codigo_valido(cls, v: str) -> str:
        v = v.strip().upper()
        if not v or len(v) > 4:
            raise ValueError("El código debe tener entre 1 y 4 caracteres")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class TipoDocumentoEditar(BaseModel):
    nombre: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v
