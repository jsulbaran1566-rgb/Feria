from pydantic import BaseModel, field_validator


# ================= CATEGORIAS =================

class CategoriaCrear(BaseModel):
    nombre: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre de la categoría no puede estar vacío")
        return v.strip().capitalize()


class CategoriaEditar(BaseModel):
    nombre_nuevo: str

    @field_validator("nombre_nuevo")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nuevo nombre no puede estar vacío")
        return v.strip().capitalize()
