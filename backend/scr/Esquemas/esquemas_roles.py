from typing import Optional
from pydantic import BaseModel, field_validator


# ================= ROLES =================

class RolCrear(BaseModel):
    id:          int
    nombre:      str
    descripcion: Optional[str] = None
    permisos:    Optional[str] = None

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
            raise ValueError("El nombre del rol no puede estar vacío")
        return v.strip()


class RolEditar(BaseModel):
    nombre:      Optional[str] = None
    descripcion: Optional[str] = None
    permisos:    Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("El nombre del rol no puede estar vacío")
        return v.strip() if v else v
