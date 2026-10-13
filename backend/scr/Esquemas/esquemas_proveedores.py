from typing import Optional
from pydantic import BaseModel, field_validator


# ================= PROVEEDORES =================

class ProveedorCrear(BaseModel):
    id:       int
    nombre:   str
    tipo:     str
    ciudad:   Optional[str] = None
    telefono: Optional[str] = None
    correo:   Optional[str] = None
    estado:   str = "Activo"

    @field_validator("id")
    @classmethod
    def id_positivo(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El id debe ser un número positivo")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("Activo", "Inactivo"):
            raise ValueError("El estado debe ser 'Activo' o 'Inactivo'")
        return v


class ProveedorEditar(BaseModel):
    nombre:   Optional[str] = None
    tipo:     Optional[str] = None
    ciudad:   Optional[str] = None
    telefono: Optional[str] = None
    correo:   Optional[str] = None
    estado:   Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("Activo", "Inactivo"):
            raise ValueError("El estado debe ser 'Activo' o 'Inactivo'")
        return v
